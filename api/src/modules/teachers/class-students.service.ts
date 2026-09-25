import { prisma } from '../../config/database.js'
import type { Prisma } from '../../generated/prisma/client.js'
import {
  accessibleClassesWhere,
  assertClassAccess,
  recordClassAction,
  type ClassUser,
} from '../../utils/class-access.js'
import { NotFoundError, ValidationError } from '../../utils/errors.js'
import { cleanDisplayName } from '../../utils/identity.js'
import { NICKNAME_MAX_LENGTH } from '../../utils/enrollment.js'
import { deleteUpload } from '../storage/storage.service.js'

/**
 * Lo que el profesorado hace con un alumno dentro de una clase: cambiarle el
 * alias con el que sale en ella y quitarlo de la clase. Vale para cualquier
 * alumno, tenga correo o no: es la matrícula lo que se toca, no la cuenta.
 */

/** Longitud del alias: la misma que admite el alumno cuando lo cambia él. */
export { NICKNAME_MAX_LENGTH }

/** Lo que hace falta de una cuenta para saber si está sin usar. */
export const UNUSED_ACCOUNT_SELECT = {
  accountType: true,
  homeClassId: true,
  _count: { select: { refreshTokens: true, enrollments: true } },
} satisfies Prisma.UserSelect

type UnusedAccountFacts = {
  accountType: string
  homeClassId: string | null
  _count: { refreshTokens: number; enrollments: number }
}

/**
 * Si la cuenta es una cuenta sin correo que nadie ha usado, la clase de la que
 * quitarla la borra del todo; si no, null. Sin usar es que no ha iniciado sesión
 * nunca (cada entrada deja una sesión, que al cerrarse o caducar se revoca pero
 * no se borra) y que solo está en su clase de origen: quitada de ella, sería una
 * cuenta que no gestiona nadie y que nunca ha servido para nada, típicamente
 * creada por error. Una cuenta que ha entrado alguna vez nunca se borra desde la
 * clase: se queda sin clase de origen, para la administración.
 */
export function unusedAccountHomeClass(account: UnusedAccountFacts): string | null {
  if (account.accountType !== 'managed' || !account.homeClassId) return null
  if (account._count.refreshTokens > 0 || account._count.enrollments !== 1) return null
  return account.homeClassId
}

/** La matrícula corriente del alumno en la clase; la de vista previa no cuenta. */
async function studentEnrollment(classId: string, studentId: string, tx: Prisma.TransactionClient) {
  const enrollment = await tx.classEnrollment.findUnique({
    where: { studentId_classId: { studentId, classId } },
    select: { id: true, isPreview: true },
  })
  if (!enrollment || enrollment.isPreview) {
    throw new NotFoundError('El alumno no está en esta clase')
  }
  return enrollment
}

/** Cambia el alias del alumno en la clase. Las entradas antiguas de su historial se quedan como estaban. */
export async function updateStudentNickname(
  actor: ClassUser,
  classId: string,
  studentId: string,
  nickname: string
): Promise<{ nickname: string }> {
  await assertClassAccess(classId, actor.id, 'student.nickname')

  const clean = cleanDisplayName(nickname)
  if (!clean || clean.length > NICKNAME_MAX_LENGTH) {
    throw new ValidationError(
      `El alias debe tener entre 1 y ${NICKNAME_MAX_LENGTH} caracteres`,
      'INVALID_NICKNAME'
    )
  }

  return prisma.$transaction(async tx => {
    const enrollment = await studentEnrollment(classId, studentId, tx)
    const updated = await tx.classEnrollment.update({
      where: { id: enrollment.id },
      data: { nickname: clean },
      select: { nickname: true },
    })
    // Sin el alias en metadata: el registro no guarda cómo se llama nadie.
    await recordClassAction(tx, {
      classId,
      actorId: actor.id,
      action: 'student.nickname_changed',
      entityType: 'enrollment',
      entityId: enrollment.id,
      targetUserId: studentId,
    })
    return { nickname: updated.nickname ?? clean }
  })
}

/**
 * Quita al alumno de la clase y borra lo que tenía en ella: la matrícula (con
 * su XP, nivel, monedas, maná y vidas), el progreso y las entregas de las
 * misiones de la clase, las insignias de esas misiones, las compras y usos de la
 * tienda, los comportamientos, su historial en la clase, sus conversaciones con
 * el asistente sobre la clase y los avisos que hablaban de ella o de sus
 * entregas. Lo que tenga en otras clases no se toca, ni tampoco su cuenta.
 *
 * Si la clase era la de origen de una cuenta gestionada, la cuenta se queda sin
 * clase de origen: desde aquí ya no la gestiona nadie, y queda para quien
 * administra la plataforma, que puede darle otra. Salvo que la cuenta no se haya
 * usado nunca (`unusedAccountHomeClass`): entonces se borra del todo.
 *
 * El registro de acciones de la clase se conserva: apunta al alumno por su id
 * (y, si su cuenta se borra, se queda sin él y lo dice en `accountDeleted`).
 */
export async function removeStudentFromClass(
  actor: ClassUser,
  classId: string,
  studentId: string
): Promise<{ removed: true; accountDeleted: boolean }> {
  await assertClassAccess(classId, actor.id, 'student.manage')

  const { files, accountDeleted } = await prisma.$transaction(async tx => {
    const enrollment = await studentEnrollment(classId, studentId, tx)
    // Se decide antes de borrar la matrícula, que es una de las que cuenta.
    const account = await tx.user.findUniqueOrThrow({
      where: { id: studentId },
      select: UNUSED_ACCOUNT_SELECT,
    })
    const accountDeleted = unusedAccountHomeClass(account) === classId
    const files = await deleteEnrollmentData(tx, classId, studentId, enrollment.id)

    // Los mensajes se van con su conversación (borrado en cascada).
    const missionIds = (
      await tx.mission.findMany({ where: { classId }, select: { id: true } })
    ).map(m => m.id)
    await tx.chatConversation.deleteMany({
      where: { userId: studentId, OR: [{ classId }, { missionId: { in: missionIds } }] },
    })

    // La entrada va antes que el borrado de la cuenta: al borrarla, el registro
    // se queda sin ella en lugar de impedirlo.
    await recordClassAction(tx, {
      classId,
      actorId: actor.id,
      action: 'student.removed',
      entityType: 'user',
      entityId: studentId,
      targetUserId: studentId,
      ...(accountDeleted ? { metadata: { accountDeleted: true } } : {}),
    })

    if (accountDeleted) {
      await tx.user.delete({ where: { id: studentId } })
    } else {
      await tx.user.updateMany({
        where: { id: studentId, homeClassId: classId },
        data: { homeClassId: null },
      })
    }

    return { files, accountDeleted }
  })

  // Los ficheros, al final y sin tumbar nada: la base ya no los apunta.
  await deleteUploads(files)
  return { removed: true, accountDeleted }
}

/**
 * Borra una matrícula y lo que colgaba de ella en la clase: el progreso y las
 * entregas de sus misiones, las insignias de esas misiones, las compras y usos
 * de la tienda, los comportamientos, el historial y los avisos que hablaban de
 * la clase o de esas entregas. Vale también para la matrícula de vista previa
 * de un profesor al que quitan de la clase. Devuelve los ficheros de las
 * entregas, que se borran después de la transacción (`deleteUploads`).
 */
export async function deleteEnrollmentData(
  tx: Prisma.TransactionClient,
  classId: string,
  userId: string,
  enrollmentId: string
): Promise<(string | null)[]> {
  const missionIds = (await tx.mission.findMany({ where: { classId }, select: { id: true } })).map(
    m => m.id
  )
  const enigmaIds = (
    await tx.missionEnigma.findMany({
      where: { missionId: { in: missionIds } },
      select: { id: true },
    })
  ).map(e => e.id)

  const submissions = await tx.enigmaSubmission.findMany({
    where: { studentId: userId, enigmaId: { in: enigmaIds } },
    select: { id: true, fileUrl: true },
  })
  const submissionIds = submissions.map(s => s.id)

  // Avisos que hablan de esta clase: los suyos (entregas revisadas, plazos) y
  // los del profesorado sobre sus entregas, que ya no existirán.
  await tx.notification.deleteMany({
    where: {
      OR: [
        { userId, metadata: { path: ['classId'], equals: classId } },
        ...submissionIds.map(id => ({ metadata: { path: ['submissionId'], equals: id } })),
      ],
    },
  })
  await tx.enigmaSubmission.deleteMany({ where: { id: { in: submissionIds } } })
  await tx.studentEnigmaProgress.deleteMany({
    where: { studentId: userId, enigmaId: { in: enigmaIds } },
  })
  await tx.studentMissionProgress.deleteMany({
    where: { studentId: userId, missionId: { in: missionIds } },
  })
  await tx.studentBadge.deleteMany({
    where: { studentId: userId, badge: { missionId: { in: missionIds } } },
  })
  await tx.shopPurchase.deleteMany({ where: { studentId: userId, classId } })
  await tx.shopItemUse.deleteMany({ where: { studentId: userId, classId } })
  await tx.behaviorApplication.deleteMany({ where: { studentId: userId, classId } })
  await tx.activity.deleteMany({ where: { userId, classId } })
  await tx.classEnrollment.delete({ where: { id: enrollmentId } })

  return submissions.map(s => s.fileUrl)
}

/** Borra los ficheros que devolvió `deleteEnrollmentData`. */
export async function deleteUploads(files: (string | null)[]) {
  await Promise.all(files.map(url => deleteUpload(url)))
}

/**
 * De estas clases de origen, en cuáles tiene administración quien pregunta: son
 * las cuentas cuya contraseña puede restablecer. La API lo comprueba igualmente
 * al restablecer; esto es para no ofrecer lo que luego se rechazaría.
 */
export async function manageableHomeClasses(
  userId: string,
  homeClassIds: (string | null | undefined)[]
): Promise<Set<string>> {
  const ids = [...new Set(homeClassIds.filter((id): id is string => Boolean(id)))]
  if (ids.length === 0) return new Set()
  const rows = await prisma.class.findMany({
    where: { id: { in: ids }, ...accessibleClassesWhere(userId, 'admin') },
    select: { id: true },
  })
  return new Set(rows.map(r => r.id))
}
