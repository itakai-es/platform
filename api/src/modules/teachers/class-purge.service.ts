import { prisma } from '../../config/database.js'
import type { Prisma } from '../../generated/prisma/client.js'
import {
  CLASS_ACTION_LEVEL,
  assertClassAccess,
  getClassAccess,
  hasClassLevel,
  type ClassUser,
} from '../../utils/class-access.js'
import { ConflictError, NotFoundError } from '../../utils/errors.js'
import { createSystemLog } from '../admin/system-log.service.js'
import { uploadResolver, type StoredUpload } from '../storage/storage.service.js'
import {
  UNUSED_ACCOUNT_SELECT,
  deleteUploads,
  unusedAccountHomeClass,
} from './class-students.service.js'

/**
 * Purga de una clase de la papelera: la borra de verdad, con todo lo que
 * cuelga de ella. Es una sola rutina para los tres caminos que llegan aquí: la
 * tarea que barre la papelera pasados los días (`class-trash.jobs.ts`), «Borrar
 * ya» de quien es propietario y el borrado de su cuenta, que se lleva las
 * clases que tenía en la papelera en vez de traspasarlas.
 *
 * Qué se lleva el `class.delete` de Prisma (borrado en cascada, con clave
 * ajena): el profesorado y el registro de la clase, las matrículas, la guía, la
 * tienda con sus compras y usos, los comportamientos y sus aplicaciones, las
 * solicitudes e invitaciones y las misiones, y con ellas sus documentos, sus
 * enigmas, las entregas, el progreso de enigmas y misiones.
 *
 * Qué se borra a mano, antes, porque la cascada no llega:
 *  - los avisos que hablan de la clase, de sus misiones o de sus entregas (van
 *    en `metadata`, sin clave ajena);
 *  - el historial (`Activity.classId`) y las conversaciones con el asistente
 *    (`ChatConversation.classId`/`missionId`), también sin clave ajena;
 *  - las insignias de sus misiones, con las ganadas: la clave ajena las dejaría
 *    sueltas y vivas, insignias fantasma de una clase que ya no existe;
 *  - las cuentas sin correo nacidas en ella que nunca se han usado, enteras
 *    (`unusedAccountHomeClass`, la regla de quitar a un alumno). Las usadas se
 *    quedan sin clase de origen (la clave ajena las deja en null), para quien
 *    administra la instancia.
 *
 * Los ficheros, al final y fuera de la transacción, que nunca se deshace por
 * ellos: las entregas (cada una es de una sola fila) y los documentos y las
 * portadas que ya no usa nadie más. Duplicar una clase, importar una plantilla
 * o una misión comparten la portada y los documentos con el origen (misma
 * URL), así que antes de borrar uno se busca quién más lo apunta, ya con la
 * purga confirmada, como `deleteMissionDocument`. Las imágenes de las
 * insignias no se tocan: borrar una insignia nunca ha borrado su imagen, que
 * comparten las copias. Lo que no se pueda borrar queda, con sus claves, en el
 * registro del sistema: con la clase ya borrada, nada vuelve a por ello. Para
 * que una copia a la vez no se quede apuntando a un fichero recién borrado, las
 * copias bloquean la clase de origen (`lockSourceClass`).
 *
 * El registro de la clase se va con ella: el rastro queda en el registro del
 * sistema (categoría `maintenance`), con números y sin nombres.
 */

/** Tiempo para la transacción de cada clase: el mismo margen que la copia de una clase. */
export const PURGE_TRANSACTION_TIMEOUT_MS = 30_000

/** Por qué se purga: pasaron los días, lo pidió quien es propietario o se borra su cuenta. */
export type PurgeReason = 'expired' | 'owner' | 'account_deleted'

export interface PurgeOptions {
  reason: PurgeReason
  /** Quién la purga, si es alguien (el registro lo apunta). */
  actorId?: string
  /** Solo si lleva en la papelera desde antes de esta fecha: la tarea programada. */
  olderThan?: Date
  /** Solo si esta cuenta es aún su propietaria: «Borrar ya». */
  ownerId?: string
}

/** Lo que se ha borrado de una clase, en números. Va al registro del sistema. */
export interface ClassPurgeSummary {
  students: number
  missions: number
  submissions: number
  documents: number
  shopPurchases: number
  badges: number
  studentBadges: number
  notifications: number
  activities: number
  conversations: number
  managedAccountsDeleted: number
  managedAccountsUnmanaged: number
}

/** Los ficheros que apuntaba la clase, para borrarlos tras confirmar. */
interface PurgeFiles {
  submissions: string[]
  documents: string[]
  covers: string[]
}

export interface PurgedClass {
  classId: string
  summary: ClassPurgeSummary
  files: PurgeFiles
}

export interface ClassPurgeOutcome extends PurgedClass {
  filesDeleted: number
  filesFailed: number
  /** Documentos y portadas que se quedan porque otra clase los usa. */
  filesShared: number
}

const MESSAGE: Record<PurgeReason, string> = {
  expired: 'Pasaron los días en la papelera.',
  owner: 'La persona propietaria la ha borrado ya desde la papelera.',
  account_deleted:
    'Se ha borrado la cuenta de la persona propietaria, que la tenía en la papelera.',
}

/**
 * Purga la clase dentro de `tx`, si sigue en la papelera (y, con `olderThan` u
 * `ownerId`, si cumple también eso); si no, null y no toca nada. La fila de la
 * clase queda bloqueada hasta el final: restaurarla, cambiarla o colgarle algo
 * a la vez espera, y luego ya no la encuentra.
 */
export async function purgeClassInTx(
  tx: Prisma.TransactionClient,
  classId: string,
  options: PurgeOptions
): Promise<PurgedClass | null> {
  await tx.$queryRaw`SELECT id FROM classes WHERE id = ${classId} FOR UPDATE`
  const cls = await tx.class.findUnique({
    where: { id: classId },
    select: { deletedAt: true, backgroundImage: true },
  })
  if (!cls?.deletedAt) return null
  if (options.olderThan && cls.deletedAt >= options.olderThan) return null
  if (options.ownerId) {
    const access = await getClassAccess(classId, options.ownerId, tx)
    if (!access || !hasClassLevel(access, CLASS_ACTION_LEVEL['class.purge'])) return null
  }

  // Lo que se va a borrar, leído antes de borrar nada. Una consulta tras otra:
  // dentro de la transacción todas van por la misma conexión.
  const missions = await tx.mission.findMany({
    where: { classId },
    select: { id: true, backgroundImage: true },
  })
  const missionIds = missions.map(m => m.id)
  const documents = await tx.missionDocument.findMany({
    where: { missionId: { in: missionIds } },
    select: { fileUrl: true },
  })
  const submissions = await tx.enigmaSubmission.findMany({
    where: { enigma: { missionId: { in: missionIds } } },
    select: { id: true, fileUrl: true },
  })
  const submissionIds = submissions.map(s => s.id)
  const students = await tx.classEnrollment.count({
    where: { classId, isPreview: false },
  })
  const shopPurchases = await tx.shopPurchase.count({ where: { classId } })

  // Las cuentas nacidas aquí, bloqueadas: un inicio de sesión a la vez espera y,
  // si llega antes, ya cuenta como usada.
  await tx.$queryRaw`SELECT id FROM users WHERE home_class_id = ${classId} FOR UPDATE`
  const born = await tx.user.findMany({
    where: { homeClassId: classId, accountType: 'managed' },
    select: { id: true, ...UNUSED_ACCOUNT_SELECT },
  })
  const enrolledHere = new Set(
    (
      await tx.classEnrollment.findMany({
        where: { classId, studentId: { in: born.map(u => u.id) } },
        select: { studentId: true },
      })
    ).map(e => e.studentId)
  )
  // Igual que el aviso de impacto: se borra si su única matrícula es esta.
  const unused = born
    .filter(u => enrolledHere.has(u.id) && unusedAccountHomeClass(u) === classId)
    .map(u => u.id)

  // Avisos sobre la clase, sus misiones o sus entregas, sea de quien sea.
  const notifications = await tx.$executeRaw`
    DELETE FROM notifications
    WHERE metadata->>'classId' = ${classId}
       OR metadata->>'missionId' = ANY(${missionIds}::text[])
       OR metadata->>'submissionId' = ANY(${submissionIds}::text[])`
  const activities = await tx.activity.deleteMany({ where: { classId } })
  // Los mensajes se van con su conversación (borrado en cascada).
  const conversations = await tx.chatConversation.deleteMany({
    where: { OR: [{ classId }, { missionId: { in: missionIds } }] },
  })
  // Las ganadas se van con su insignia (borrado en cascada).
  const studentBadges = await tx.studentBadge.count({
    where: { badge: { missionId: { in: missionIds } } },
  })
  const badges = await tx.badge.deleteMany({
    where: { missionId: { in: missionIds } },
  })
  if (unused.length > 0) await tx.user.deleteMany({ where: { id: { in: unused } } })

  const summary: ClassPurgeSummary = {
    students,
    missions: missions.length,
    submissions: submissions.length,
    documents: documents.length,
    shopPurchases,
    badges: badges.count,
    studentBadges,
    notifications,
    activities: activities.count,
    conversations: conversations.count,
    managedAccountsDeleted: unused.length,
    managedAccountsUnmanaged: born.length - unused.length,
  }

  // El rastro, antes del borrado y en la misma transacción: si la purga se
  // deshace, tampoco queda. Sin nombres: ni de la clase ni de nadie.
  await createSystemLog(
    {
      level: 'info',
      category: 'maintenance',
      title: 'Clase borrada de la papelera',
      message: MESSAGE[options.reason],
      service: 'class-trash',
      metadata: {
        classId,
        reason: options.reason,
        ...(options.actorId ? { actorId: options.actorId } : {}),
        trashedAt: cls.deletedAt.toISOString(),
        ...summary,
      },
    },
    tx
  )

  await tx.class.delete({ where: { id: classId } })

  const present = (url: string | null): url is string => Boolean(url)
  return {
    classId,
    summary,
    files: {
      submissions: submissions.map(s => s.fileUrl).filter(present),
      documents: documents.map(d => d.fileUrl),
      covers: [cls.backgroundImage, ...missions.map(m => m.backgroundImage)].filter(present),
    },
  }
}

/** Carpetas de las que la purga borra cada tipo de fichero: lo demás no es suyo. */
const SUBMISSION_PREFIXES = ['submissions/']
const DOCUMENT_PREFIXES = ['documents/']
const COVER_PREFIXES = ['covers/', 'ai-generated/covers/']

type Resolve = (fileUrl: string | null | undefined) => StoredUpload | null

/**
 * ¿Lo apunta alguna fila? Se busca por el nombre del fichero y se compara la
 * clave ya normalizada: dos URL escritas distinto pueden ser el mismo fichero.
 * Mira todas las columnas donde puede acabar la URL de una imagen o un
 * documento de la plataforma, no solo la de su tipo: una portada puede ser la
 * de otra clase, de una misión o el enlace de un documento.
 */
async function uploadInUse(stored: StoredUpload, resolve: Resolve): Promise<boolean> {
  const name = stored.key.slice(stored.key.lastIndexOf('/') + 1)
  const like = { contains: name }
  const [classes, missions, documents, badges, enrollments, articles] = await Promise.all([
    prisma.class.findMany({
      where: { backgroundImage: like },
      select: { backgroundImage: true },
    }),
    prisma.mission.findMany({
      where: { backgroundImage: like },
      select: { backgroundImage: true },
    }),
    prisma.missionDocument.findMany({
      where: { fileUrl: like },
      select: { fileUrl: true },
    }),
    prisma.badge.findMany({
      where: { imageUrl: like },
      select: { imageUrl: true },
    }),
    prisma.classEnrollment.findMany({
      where: { avatarUrl: like },
      select: { avatarUrl: true },
    }),
    prisma.helpArticle.findMany({
      where: { coverImage: like },
      select: { coverImage: true },
    }),
  ])
  const urls = [
    ...classes.map(r => r.backgroundImage),
    ...missions.map(r => r.backgroundImage),
    ...documents.map(r => r.fileUrl),
    ...badges.map(r => r.imageUrl),
    ...enrollments.map(r => r.avatarUrl),
    ...articles.map(r => r.coverImage),
  ]
  return urls.some(url => {
    const other = resolve(url)
    return other?.key === stored.key && other.origin === stored.origin
  })
}

/**
 * Borra los ficheros de una clase ya purgada. Las entregas, sin más (nunca se
 * copian); los documentos y las portadas, solo si ninguna fila los apunta ya.
 * Cada tipo solo dentro de su carpeta: una portada puede apuntar a cualquier
 * imagen pública de la plataforma, y no por eso es de la clase. Devuelve las
 * claves de los que no se han podido borrar.
 */
async function deletePurgedFiles(files: PurgeFiles) {
  const resolve = await uploadResolver()
  // Por clave: la misma portada en la clase y en sus misiones se mira una vez.
  const pick = (urls: string[], prefixes: string[]) => {
    const found = new Map<string, { url: string; stored: StoredUpload }>()
    for (const url of urls) {
      const stored = resolve(url)
      if (!stored || !prefixes.some(p => stored.key.startsWith(p))) continue
      found.set(`${stored.origin}:${stored.key}`, { url, stored })
    }
    return [...found.values()]
  }

  const toDelete = pick(files.submissions, SUBMISSION_PREFIXES)
  let shared = 0
  for (const file of [
    ...pick(files.documents, DOCUMENT_PREFIXES),
    ...pick(files.covers, COVER_PREFIXES),
  ]) {
    if (await uploadInUse(file.stored, resolve)) shared++
    else toDelete.push(file)
  }

  const failed = new Set(await deleteUploads(toDelete.map(f => f.url)))
  const failedKeys = toDelete.filter(f => failed.has(f.url)).map(f => f.stored.key)
  return { deleted: toDelete.length - failedKeys.length, failedKeys, shared }
}

/**
 * Claves de los ficheros de la clase que podrían quedar sin borrar, sacadas de
 * la URL sin mirar la configuración ni la base: es lo que se apunta cuando la
 * fase de ficheros no ha podido ni empezar. Solo las de sus carpetas, que se
 * llaman con un UUID: ningún nombre de fichero original ni de nadie.
 */
function pendingKeys(files: PurgeFiles): string[] {
  const keys = new Set<string>()
  const collect = (urls: string[], prefixes: string[]) => {
    // La carpeta más larga primero: `ai-generated/covers/` antes que `covers/`.
    const longestFirst = [...prefixes].sort((a, b) => b.length - a.length)
    for (const url of urls) {
      const path = url.split(/[?#]/)[0]!
      for (const prefix of longestFirst) {
        const at = path.lastIndexOf(`/${prefix}`)
        const key = at >= 0 ? path.slice(at + 1) : path.startsWith(prefix) ? path : null
        if (!key) continue
        if (!key.slice(prefix.length).includes('/')) keys.add(key)
        break
      }
    }
  }
  collect(files.submissions, SUBMISSION_PREFIXES)
  collect(files.documents, DOCUMENT_PREFIXES)
  collect(files.covers, COVER_PREFIXES)
  return [...keys]
}

/**
 * Lo que va después de confirmar la purga: los ficheros. No lanza nunca: la
 * clase ya no está y nada vuelve a buscar sus ficheros, así que lo que no se
 * haya podido borrar (el almacenamiento externo falla, o la base al mirar quién
 * los usa) queda dicho en el registro del sistema, con sus claves, para
 * limpiarlo a mano.
 */
export async function finishClassPurge(purged: PurgedClass): Promise<ClassPurgeOutcome> {
  let files: { deleted: number; failedKeys: string[]; shared: number }
  let error: string | undefined
  try {
    files = await deletePurgedFiles(purged.files)
  } catch (err) {
    // Sin borrar ninguno: deleteUploads no lanza, así que no se ha llegado a él.
    error = err instanceof Error ? err.message : String(err)
    files = { deleted: 0, failedKeys: pendingKeys(purged.files), shared: 0 }
    console.error(`[class-trash] no se pudieron borrar los ficheros de la clase ${purged.classId}:`, error)
  }
  const filesFailed = files.failedKeys.length
  if (filesFailed > 0) {
    await createSystemLog({
      level: 'warning',
      category: 'maintenance',
      title: 'Ficheros sin borrar de una clase purgada',
      message: `No se han podido borrar ${filesFailed} fichero(s) de una clase ya borrada de la papelera.`,
      service: 'class-trash',
      metadata: {
        classId: purged.classId,
        filesFailed,
        failedKeys: files.failedKeys,
        ...(error ? { error } : {}),
      },
    }).catch(logError => {
      console.error('[class-trash] no se pudo registrar los ficheros sin borrar:', logError)
    })
  }
  return {
    ...purged,
    filesDeleted: files.deleted,
    filesFailed,
    filesShared: files.shared,
  }
}

/**
 * Purga una clase en su propia transacción y borra después sus ficheros. Null
 * si ya no toca: no está en la papelera, no ha pasado el plazo o quien lo pide
 * ya no es propietario. Es lo que hace la tarea programada, clase a clase.
 */
export async function purgeTrashedClass(
  classId: string,
  options: PurgeOptions
): Promise<ClassPurgeOutcome | null> {
  const purged = await prisma.$transaction(tx => purgeClassInTx(tx, classId, options), {
    timeout: PURGE_TRANSACTION_TIMEOUT_MS,
  })
  return purged ? finishClassPurge(purged) : null
}

/**
 * «Borrar ya»: quien es propietario borra para siempre una clase de su
 * papelera, sin esperar a la purga. Fuera de la papelera, 409.
 */
export async function purgeClassNow(actor: ClassUser, classId: string) {
  await assertClassAccess(classId, actor.id, 'class.purge')

  const purged = await prisma.$transaction(
    async tx => {
      const result = await purgeClassInTx(tx, classId, {
        reason: 'owner',
        actorId: actor.id,
        ownerId: actor.id,
      })
      if (result) return result
      // No se ha purgado: se dice por qué, con lo que hay ahora.
      const cls = await tx.class.findUnique({
        where: { id: classId },
        select: { deletedAt: true },
      })
      if (!cls) throw new NotFoundError('Clase no encontrada')
      if (!cls.deletedAt) {
        throw new ConflictError('La clase no está en la papelera', 'CLASS_NOT_IN_TRASH')
      }
      // Ha dejado de ser suya entre la comprobación y el bloqueo.
      await assertClassAccess(classId, actor.id, 'class.purge', tx)
      throw new ConflictError('La clase no se ha podido borrar', 'CLASS_NOT_PURGED')
    },
    { timeout: PURGE_TRANSACTION_TIMEOUT_MS }
  )

  const outcome = await finishClassPurge(purged)
  return {
    purged: true,
    classId,
    filesFailed: outcome.filesFailed,
    message: 'Clase borrada para siempre',
  }
}
