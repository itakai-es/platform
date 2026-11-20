import { prisma } from '../../config/database.js'
import { Prisma } from '../../generated/prisma/client.js'
import { nanoid } from 'nanoid'
import { getLevelInfo, getLevelFromXP } from '../../utils/xp-calculator.js'
import { existsSync, mkdirSync } from 'fs'
import { join } from 'path'
import { randomUUID } from 'crypto'
import { ConflictError, NotFoundError, ValidationError } from '../../utils/errors.js'
import { IMAGE_FORMAT_ERROR, parseImageDataUrl } from '../../utils/image-data-url.js'
import { seedDefaultShopItems } from '../shop/shop.service.js'
import {
  resolveClassSettings,
  normalizeClassSettings,
  DEFAULT_CLASS_SETTINGS,
  type ClassSettings,
} from '../../utils/class-settings.js'
import { resolveLevelConfig, tierForLevel, type LevelConfig } from '../../utils/level-config.js'
import { publicUploadResolver, saveUpload } from '../storage/storage.service.js'
import { createClassWithOwner } from '../../utils/class-owner.js'
import {
  assertClassAccess,
  assertClassNotInTrash,
  assertMissionAccess,
  CLASS_ACTION_LEVEL,
  classTeachersInclude,
  hasClassLevel,
  listedClassesWhere,
  recordClassAction,
  summarizeClassTeachers,
  type ClassAccess,
} from '../../utils/class-access.js'
import { accountHandle } from '../../utils/identity.js'
import { DEFAULT_AVATARS } from '../../utils/enrollment.js'
import { ACTIVITY_ACTOR_INCLUDE, WALL_ACTIVITY_WHERE, activityActor } from '../../utils/activity.js'
import { countClassesAwaitingReview } from '../../utils/pending-review.js'
import { assignableBadgesWhere, manageableBadgesWhere } from '../../utils/badge-access.js'
import {
  manageableHomeClasses,
  UNUSED_ACCOUNT_SELECT,
  unusedAccountHomeClass,
} from './class-students.service.js'
import {
  MISSION_COPY_INCLUDE,
  copyMissionInto,
  lockSourceClass,
  readMissionForCopy,
  type MissionCopyOptions,
  type MissionCopySource,
} from './mission-copy.js'
import {
  findTemplate,
  findTemplates,
  isTemplateId,
  TEMPLATE_METADATA_MAX_LENGTH,
  type TemplateFilters,
} from '../templates/templates.service.js'
import { missionRewards } from '../../utils/mission-formatter.js'
import {
  loadClassRanking,
  loadRankingContext,
  loadTeamStandings,
  rankingPeriodStart,
  splitPodium,
  statsWithoutXp,
  withoutXp,
} from '../../utils/ranking.js'
import {
  mergeRankingConfig,
  normalizeRankingSwitch,
  rankingPeriodsFor,
  resolveRankingConfig,
  resolveRankingView,
  type RankingMode,
  type RankingType,
} from '../../utils/ranking-config.js'
import { assertClassWritable } from '../../utils/class-writable.js'
import { MISSION_ORDER, nextMissionOrderIndex } from '../../utils/mission-order.js'
import {
  classPathEdges,
  lockMissionPath,
  pathOrder,
  placeAfterPrerequisites,
} from '../../utils/mission-path.js'
import { classMatrix } from '../analytics/class-matrix.js'
import { countsForProgress } from '../analytics/definitions.js'
import {
  countedMissionsByClass,
  missionCompletions,
  studentProgressByClass,
  sumProgress,
} from '../analytics/student-progress.js'

const BADGES_DIR = join(process.cwd(), 'uploads', 'badges')
const COVERS_DIR = join(process.cwd(), 'uploads', 'covers')

/** Partes que el profesor puede elegir copiar al duplicar una clase. */
export interface ClassCopyOptions {
  narrative: boolean
  features: boolean
  shop: boolean
  behaviors: boolean
  missions: boolean
}

/** Lo que se puede cambiar de una clase, para apuntar en el registro qué se tocó. */
const CLASS_UPDATE_FIELDS = [
  'name',
  'narrative',
  'schedule',
  'backgroundImage',
  'subject',
  'language',
  'educationLevel',
  'province',
  'settings',
  'levelConfig',
  'rankingConfig',
  'scheduleConfig',
] as const

/** Metadatos de la clase: cambiarlos es un ajuste, no contenido. */
const CLASS_METADATA_FIELDS = ['subject', 'language', 'educationLevel', 'province'] as const

/**
 * Largo máximo, en caracteres, de lo que se escribe en una clase y sale en
 * abierto en la ficha pública de una plantilla, con cómo se nombra en el
 * mensaje de error. Muy por encima de lo que hay guardado (en desarrollo, el
 * nombre más largo es de 86 y la historia más larga, de unos 6.500): no
 * estorban a nadie y cortan lo que no es una clase. El nombre, como al crearla
 * desde el asistente; la historia, unas 25 páginas de texto, cuando las que
 * escribe la IA rondan las 2 o 3; los metadatos, los de las listas cerradas del
 * frontend (ver `TEMPLATE_METADATA_MAX_LENGTH`).
 */
export const CLASS_TEXT_LIMITS = {
  name: { max: 200, label: 'El nombre de la clase' },
  narrative: { max: 50_000, label: 'La historia de la clase' },
  subject: { max: TEMPLATE_METADATA_MAX_LENGTH, label: 'La asignatura' },
  language: { max: TEMPLATE_METADATA_MAX_LENGTH, label: 'El idioma' },
  educationLevel: { max: TEMPLATE_METADATA_MAX_LENGTH, label: 'El nivel educativo' },
  province: { max: TEMPLATE_METADATA_MAX_LENGTH, label: 'La provincia' },
} as const

/** Lo que se añade al nombre de una clase al duplicarla o importarla. */
const COPY_SUFFIX = ' (copia)'

/**
 * Los topes cuentan caracteres de verdad: un emoji es uno, aunque en JavaScript
 * ocupe dos unidades (un par sustituto). Y al recortar no se parte ningún par,
 * que se guardaría como «�».
 */
const charLength = (value: string) => Array.from(value).length
const clipChars = (value: string, max: number) =>
  value.length <= max ? value : Array.from(value).slice(0, max).join('')

type ClassTextField = keyof typeof CLASS_TEXT_LIMITS

/**
 * Comprueba los textos y la portada que llegan para guardar en una clase, antes
 * de tocar nada. Lo que llega igual que lo guardado (`current`) pasa siempre:
 * el formulario de ajustes manda el nombre y la portada aunque no se toquen, y
 * una clase de antes de los topes, o con una portada de cuando el
 * almacenamiento era otro, no puede quedarse sin poder editar lo demás.
 *
 * La portada nueva tiene que ser una imagen subida en ese momento (una data URL,
 * que se guarda en /uploads) o un fichero público de la plataforma, como los que
 * devuelven la subida y la portada de la IA: la ficha pública no enseña otra
 * (ver `publicUploadFromUrl`), y una de fuera la pediría el navegador de cada
 * alumno. Vacía, la quita.
 */
async function assertClassFields(
  data: Partial<Record<ClassTextField | 'backgroundImage', string>>,
  current?: Partial<Record<ClassTextField | 'backgroundImage', string | null>>
) {
  for (const field of Object.keys(CLASS_TEXT_LIMITS) as ClassTextField[]) {
    const value = data[field]
    if (value === undefined || value === current?.[field]) continue
    const { max, label } = CLASS_TEXT_LIMITS[field]
    // Con menos unidades que el tope ya cabe: solo se cuentan los largos.
    if (value.length > max && charLength(value) > max) {
      throw new ValidationError(
        `${label} no puede pasar de ${max.toLocaleString('es-ES')} caracteres.`
      )
    }
  }

  const cover = data.backgroundImage
  if (!cover || cover === current?.backgroundImage || cover.startsWith('data:image/')) return
  if (!(await publicUploadResolver())(cover)) {
    throw new ValidationError('La portada tiene que ser una imagen subida a la plataforma.')
  }
}

/** El código de invitación solo lo recibe quien puede invitar alumnos a la clase. */
function visibleInvitationCode(access: ClassAccess | null, code: string) {
  return access && hasClassLevel(access, CLASS_ACTION_LEVEL['class.inviteCode']) ? code : null
}

// Ensure upload directories exist
for (const dir of [BADGES_DIR, COVERS_DIR]) {
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true })
  }
}

// Helper: Save base64 image to file and return URL. `subdir` selects the
// uploads folder (e.g. 'badges', 'covers') and the returned URL prefix.
async function saveBase64Image(base64Data: string, subdir: 'badges' | 'covers' = 'badges'): Promise<string | null> {
  if (!base64Data || !base64Data.startsWith('data:image/')) {
    return null
  }

  // Solo PNG, JPG, WebP o GIF de verdad: la extensión la pone el contenido,
  // no quien sube (ver utils/image-data-url.ts).
  const image = parseImageDataUrl(base64Data)
  if (!image) throw new ValidationError(IMAGE_FORMAT_ERROR)

  return saveUpload(`${subdir}/${randomUUID()}.${image.ext}`, image.buffer, image.mime)
}

const TEMPLATE_IN_TRASH = 'Restaura la clase antes de publicarla o retirarla como plantilla'
const ARCHIVE_IN_TRASH = 'Restaura la clase antes de archivarla o desarchivarla'

/** 409 si la clase está en la papelera: lo que pide hay que hacerlo después de restaurarla. */
/**
 * Deja la clase quieta hasta confirmar y lee lo que un guardado mezcla con su cambio:
 * los ajustes, el ranking y los niveles. Es el cerrojo de `lockMissionPath`
 * (`FOR NO KEY UPDATE`), que choca consigo mismo: dos guardados a la vez van uno
 * detrás de otro, y el segundo ve lo que dejó el primero. No frena lo que
 * solo cuelga de la clase (entregas, comportamientos, el registro), así que no se cruza
 * con quien tiene una matrícula bloqueada e inserta algo de la clase.
 */
async function lockClassForSettings(tx: Prisma.TransactionClient, classId: string) {
  await tx.$queryRaw`SELECT id FROM classes WHERE id = ${classId} FOR NO KEY UPDATE`
  return tx.class.findUniqueOrThrow({
    where: { id: classId },
    select: { settings: true, rankingConfig: true, levelConfig: true },
  })
}

function assertNotInTrash(cls: { deletedAt: Date | null }, message: string) {
  if (cls.deletedAt) throw new ConflictError(message, 'CLASS_IN_TRASH')
}

/**
 * Escribe en la clase solo si sigue fuera de la papelera; si no, 409. La
 * comprobación de antes no basta: la papelera puede llegar entre medias, y el
 * UPDATE condicionado espera a su bloqueo de fila y vuelve a mirar `deletedAt`.
 */
async function updateOutsideTrash(
  tx: Prisma.TransactionClient,
  classId: string,
  data: Prisma.ClassUncheckedUpdateManyInput,
  message: string
) {
  const { count } = await tx.class.updateMany({ where: { id: classId, deletedAt: null }, data })
  if (count === 0) throw new ConflictError(message, 'CLASS_IN_TRASH')
}

export class TeachersService {
  /** Clases a las que el profesor tiene acceso, con cualquier nivel, según su
   *  estado de archivo. Las de la papelera no salen en ninguno: tienen su listado. */
  private buildArchivedWhere(
    userId: string,
    archived: 'active' | 'archived' | 'all' = 'active'
  ): Prisma.ClassWhereInput {
    if (archived === 'all') {
      return listedClassesWhere(userId)
    }

    return {
      ...listedClassesWhere(userId),
      archived: archived === 'archived',
    }
  }

  // ==================== STATS ====================

  async getStats(userId: string) {
    const classes = await prisma.class.findMany({
      where: this.buildArchivedWhere(userId, 'active'),
      include: { enrollments: { where: { isPreview: false } }, missions: true },
    })

    // Count UNIQUE students across all classes (a student in 3 classes = 1 student)
    const uniqueStudentIds = new Set<string>()
    classes.forEach((c) => {
      c.enrollments.forEach((e) => uniqueStudentIds.add(e.studentId))
    })
    const totalStudents = uniqueStudentIds.size

    const activeClasses = classes.length
    const activeMissions = classes.reduce((sum, c) => sum + c.missions.filter((m) => m.status === 'activa').length, 0)

    return { totalStudents, activeClasses, activeMissions }
  }

  // ==================== CLASSES ====================

  async getClasses(userId: string, limit?: number, archived: 'active' | 'archived' | 'all' = 'active') {
    const classes = await prisma.class.findMany({
      where: this.buildArchivedWhere(userId, archived),
      include: {
        _count: { select: { enrollments: { where: { isPreview: false } }, missions: true } },
        teachers: classTeachersInclude(),
      },
      orderBy: { createdAt: 'desc' },
      ...(limit ? { take: limit } : {}),
    })
    // Cuántas misiones cuentan, en la base para todas las clases a la vez.
    const counted = await countedMissionsByClass(classes.map(c => c.id))

    return {
      classes: classes.map((c) => {
        const access = summarizeClassTeachers(c.teachers, userId)

        return {
          id: c.id,
          name: c.name,
          narrative: c.narrative,
          schedule: c.schedule,
          archived: c.archived,
          invitationCode: visibleInvitationCode(access.myAccess, c.invitationCode),
          backgroundImage: c.backgroundImage,
          subject: c.subject,
          language: c.language,
          educationLevel: c.educationLevel,
          province: c.province,
          settings: resolveClassSettings(c.settings),
          scheduleConfig: c.scheduleConfig,
          studentCount: c._count.enrollments,
          missionCount: c._count.missions,
          stats: { missionsCounted: counted.get(c.id) ?? 0 },
          createdAt: c.createdAt,
          ...access,
        }
      }),
      total: classes.length,
    }
  }

  async getClassById(userId: string, classId: string) {
    await assertClassAccess(classId, userId, 'class.view')
    const cls = await prisma.class.findUnique({
      where: { id: classId },
      include: {
        _count: { select: { enrollments: { where: { isPreview: false } }, missions: true } },
        guide: true,
        teachers: classTeachersInclude(),
      },
    })

    if (!cls) throw new NotFoundError('Clase no encontrada')
    const access = summarizeClassTeachers(cls.teachers, userId)

    // Por revisar: las de su alumnado (sin la vista previa ni quien ya no está)
    // y sin las de un enigma que esa persona ya tiene aprobado.
    const [pendingReviews, counted] = await Promise.all([
      countClassesAwaitingReview({ id: classId }),
      countedMissionsByClass([classId]),
    ])

    return {
      id: cls.id,
      name: cls.name,
      narrative: cls.narrative,
      schedule: cls.schedule,
      archived: cls.archived,
      invitationCode: visibleInvitationCode(access.myAccess, cls.invitationCode),
      backgroundImage: cls.backgroundImage,
      subject: cls.subject,
      language: cls.language,
      educationLevel: cls.educationLevel,
      province: cls.province,
      isTemplate: cls.isTemplate,
      // En la papelera desde esta fecha; null si no lo está.
      deletedAt: cls.deletedAt,
      settings: resolveClassSettings(cls.settings),
      levelConfig: resolveLevelConfig(cls.levelConfig),
      rankingConfig: resolveRankingConfig(cls.rankingConfig),
      scheduleConfig: cls.scheduleConfig,
      updatedAt: cls.updatedAt,
      studentCount: cls._count.enrollments,
      missionCount: cls._count.missions,
      stats: {
        missionsCounted: counted.get(classId) ?? 0,
        pendingReviews,
      },
      createdAt: cls.createdAt,
      ...access,
    }
  }

  async createClass(userId: string, data: { name: string; narrative?: string; schedule?: string; backgroundImage?: string; subject?: string; language?: string; educationLevel?: string; province?: string }) {
    await assertClassFields(data)
    const invitationCode = nanoid(6).toUpperCase()

    // If the teacher uploaded their own cover it arrives as a base64 data URL;
    // persist it to disk and store the path instead of the raw base64 blob.
    if (data.backgroundImage && data.backgroundImage.startsWith('data:image/')) {
      data = { ...data, backgroundImage: (await saveBase64Image(data.backgroundImage, 'covers')) || undefined }
    }

    const cls = await prisma.$transaction((tx) => createClassWithOwner(tx, { ...data, invitationCode }, userId))

    // Sembrar la tienda por defecto (el profe puede editarla/borrarla). Los
    // comportamientos no se siembran: el profe los añade desde la biblioteca.
    await seedDefaultShopItems(cls.id)

    return {
      class: {
        id: cls.id,
        name: cls.name,
        narrative: cls.narrative,
        schedule: cls.schedule,
        archived: cls.archived,
        invitationCode: cls.invitationCode,
        backgroundImage: cls.backgroundImage,
        subject: cls.subject,
        language: cls.language,
        educationLevel: cls.educationLevel,
        province: cls.province,
        ...(await this.classAccessSummary(cls.id, userId)),
      },
      message: 'Clase creada correctamente',
    }
  }

  async updateClass(
    userId: string,
    classId: string,
    data: { name?: string; narrative?: string; schedule?: string; backgroundImage?: string; subject?: string; language?: string; educationLevel?: string; province?: string; settings?: Partial<ClassSettings>; levelConfig?: Partial<LevelConfig>; rankingConfig?: { types?: RankingType[]; mode?: RankingMode; topN?: number; compare?: boolean }; scheduleConfig?: unknown }
  ) {
    // El contenido (nombre, narrativa, portada, horario) es de edición; los ajustes
    // de gamificación, los niveles y los metadatos, de administración. El
    // formulario general manda los metadatos siempre, también sin tocarlos: solo
    // cuenta como ajuste el que cambia de valor (vacío y sin especificar son lo mismo).
    let access = await assertClassAccess(classId, userId, 'class.editContent')
    const cls = await prisma.class.findUnique({ where: { id: classId } })
    if (!cls) throw new NotFoundError('Clase no encontrada')

    const touchesSettings =
      data.settings !== undefined ||
      data.levelConfig !== undefined ||
      data.rankingConfig !== undefined ||
      CLASS_METADATA_FIELDS.some(
        field => data[field] !== undefined && (data[field] || null) !== (cls[field] || null)
      )
    if (touchesSettings) access = await assertClassAccess(classId, userId, 'class.editSettings')

    await assertClassFields(data, cls)

    // Invariante del marketplace: una plantilla publicada no puede quedarse sin
    // los metadatos que exige el filtro (asignatura, nivel, idioma). Se comprueba
    // el valor efectivo (el entrante si viene en el patch, si no el actual).
    if (cls.isTemplate) {
      const required = ['subject', 'educationLevel', 'language'] as const
      const stillComplete = required.every(field =>
        field in data ? Boolean(data[field]) : Boolean(cls[field])
      )
      if (!stillComplete) {
        throw new ValidationError(
          'La clase está publicada como plantilla: no puedes dejar sin especificar la asignatura, el nivel o el idioma. Despublícala primero.'
        )
      }
    }

    // Persist an uploaded cover (base64 data URL) to disk before storing.
    if (data.backgroundImage && data.backgroundImage.startsWith('data:image/')) {
      data = { ...data, backgroundImage: (await saveBase64Image(data.backgroundImage, 'covers')) || undefined }
    }

    const {
      settings: settingsPatch,
      levelConfig: levelConfigPatch,
      rankingConfig: rankingConfigPatch,
      scheduleConfig: scheduleConfigPatch,
      ...rest
    } = data

    // Encender el mapa: el orden vuelve a cumplir el camino (con el mapa apagado
    // se ha podido ordenar sin mirarlo), dentro de esta misma transacción.
    const turnsMapOn = settingsPatch?.missionMap === true

    const updated = await prisma.$transaction(async tx => {
      // Lo que se mezcla con el cambio se lee aquí, con la clase quieta: leído antes
      // de la transacción, dos guardados a la vez se pisan el uno al otro.
      const current = await lockClassForSettings(tx, classId)
      // Las funcionalidades y el ranking no se tocan con la clase cerrada (archivada
      // o en la papelera): 409. El contenido (nombre, portada, horario, metadatos) y
      // los niveles se siguen pudiendo editar archivada, y desarchivar va por su
      // propia ruta (`setClassArchived`).
      if (rankingConfigPatch || settingsPatch) await assertClassWritable(classId, tx)
      // El camino de la clase, quieto hasta confirmar (ver `lockMissionPath`).
      if (turnsMapOn) await lockMissionPath(tx, [classId])

      // Los ajustes y el ranking se cruzan: sin ningún tipo disponible, el interruptor
      // queda apagado, se toque lo que se toque de los dos.
      const nextRanking = rankingConfigPatch
        ? mergeRankingConfig(current.rankingConfig, rankingConfigPatch)
        : resolveRankingConfig(current.rankingConfig)
      const currentSettings = resolveClassSettings(current.settings)
      const nextSettings = normalizeRankingSwitch(
        settingsPatch
          ? normalizeClassSettings({ ...currentSettings, ...settingsPatch })
          : currentSettings,
        nextRanking
      )
      const settingsChange = (Object.keys(nextSettings) as (keyof ClassSettings)[]).some(
        key => nextSettings[key] !== currentSettings[key]
      )

      const saved = await tx.class.update({
        where: { id: classId },
        data: {
          ...rest,
          // Merge incoming flags over current settings, then normalize dependencies so the
          // stored config is always coherent (e.g. shop off ⇒ mana off). Solo si cambia:
          // quien no los toca no los reescribe.
          ...(settingsChange ? { settings: { ...nextSettings } } : {}),
          // La config de niveles se normaliza (curva + tramos válidos) antes de guardar.
          ...(levelConfigPatch
            ? { levelConfig: resolveLevelConfig({ ...resolveLevelConfig(current.levelConfig), ...levelConfigPatch }) as unknown as Prisma.InputJsonValue }
            : {}),
          ...(rankingConfigPatch
            ? { rankingConfig: nextRanking as unknown as Prisma.InputJsonValue }
            : {}),
          // El horario se guarda tal cual (objeto JSON estructurado); null lo limpia.
          ...(scheduleConfigPatch !== undefined
            ? { scheduleConfig: (scheduleConfigPatch ?? Prisma.JsonNull) as Prisma.InputJsonValue }
            : {}),
        },
      })

      // Al cambiar la curva de niveles, recalculamos el nivel guardado de TODOS los
      // alumnos de la clase (si no, el ranking y el listado seguirían con el nivel
      // viejo hasta el próximo cambio de XP). El título/color se calculan al vuelo.
      if (levelConfigPatch) {
        const finalCfg = resolveLevelConfig(saved.levelConfig)
        const enrollments = await tx.classEnrollment.findMany({
          where: { classId },
          select: { studentId: true, xp: true, level: true },
        })
        // Agrupamos por nuevo nivel para hacer un updateMany por nivel en vez de N updates.
        const byLevel = new Map<number, string[]>()
        for (const e of enrollments) {
          const lvl = getLevelFromXP(e.xp, finalCfg)
          if (lvl !== e.level) {
            if (!byLevel.has(lvl)) byLevel.set(lvl, [])
            byLevel.get(lvl)!.push(e.studentId)
          }
        }
        for (const [lvl, ids] of byLevel) {
          await tx.classEnrollment.updateMany({
            where: { classId, studentId: { in: ids } },
            data: { level: lvl },
          })
        }
      }

      // Lo que iba delante de lo que pide se coloca detrás, lo justo (ver
      // `pathOrder`); si ya cumplía, no se escribe nada. Se apunta como un
      // reordenar más, para que el historial diga por qué ha cambiado el orden.
      if (turnsMapOn && resolveClassSettings(saved.settings).missionMap) {
        const moved = await placeAfterPrerequisites(tx, classId)
        if (moved > 0) {
          await recordClassAction(tx, {
            classId,
            actorId: userId,
            action: 'mission.reordered',
            entityType: 'class',
            entityId: classId,
            metadata: { count: await tx.mission.count({ where: { classId } }), moved },
          })
        }
      }

      // Qué se tocó, sin valores: los textos de la clase pueden ser largos.
      const fields = CLASS_UPDATE_FIELDS.filter(field => data[field] !== undefined)
      if (fields.length > 0) {
        await recordClassAction(tx, {
          classId,
          actorId: userId,
          action: touchesSettings ? 'class.settings_changed' : 'class.updated',
          entityType: 'class',
          entityId: classId,
          metadata: { fields },
        })
      }
      return saved
    })

    return {
      class: {
        id: updated.id,
        name: updated.name,
        schedule: updated.schedule,
        archived: updated.archived,
        invitationCode: visibleInvitationCode(access, updated.invitationCode),
        backgroundImage: updated.backgroundImage,
        subject: updated.subject,
        language: updated.language,
        educationLevel: updated.educationLevel,
        province: updated.province,
        settings: resolveClassSettings(updated.settings),
        rankingConfig: resolveRankingConfig(updated.rankingConfig),
        scheduleConfig: updated.scheduleConfig,
        ...(await this.classAccessSummary(classId, userId)),
      },
      message: 'Clase actualizada correctamente',
    }
  }

  // ==================== MARKETPLACE DE PLANTILLAS ====================

  /** Publica/retira una clase como plantilla pública. Al publicar exige metadatos
   *  mínimos (asignatura, nivel, idioma) para que el marketplace pueda filtrarla. */
  async publishTemplate(userId: string, classId: string, publish: boolean) {
    // Publicar y retirar es solo del propietario: el resto del profesorado recibe 403.
    await assertClassAccess(classId, userId, 'class.publishTemplate')
    const cls = await prisma.class.findUnique({ where: { id: classId } })
    if (!cls) throw new NotFoundError('Clase no encontrada')
    // En la papelera ya está retirada; se publica, si acaso, después de restaurarla.
    assertNotInTrash(cls, TEMPLATE_IN_TRASH)

    if (publish) {
      const missing: string[] = []
      if (!cls.subject) missing.push('subject')
      if (!cls.educationLevel) missing.push('educationLevel')
      if (!cls.language) missing.push('language')
      if (missing.length > 0) {
        throw new ValidationError('Completa los metadatos de la clase (asignatura, nivel e idioma) antes de publicarla como plantilla.')
      }
    }

    await prisma.$transaction(async tx => {
      // Condicionado a que siga fuera de la papelera: si la envían a la vez, gana
      // la papelera y no queda publicada dentro de ella. Retirarla le quita la
      // recomendación, que no vuelve sola al publicarla otra vez.
      await updateOutsideTrash(
        tx,
        classId,
        publish
          ? { isTemplate: true }
          : { isTemplate: false, recommendedAt: null, recommendedById: null },
        TEMPLATE_IN_TRASH
      )
      await recordClassAction(tx, {
        classId,
        actorId: userId,
        action: publish ? 'class.template_published' : 'class.template_unpublished',
        entityType: 'class',
        entityId: classId,
      })
    })
    return { isTemplate: publish }
  }

  /** Lista las plantillas públicas del marketplace, con filtros opcionales. La
   *  consulta y la lectura de los filtros viven con las del catálogo público
   *  (ver modules/templates); aquí, sin paginar: hasta 100, las recomendadas
   *  primero. Los otros órdenes los aplica la pantalla, con `updatedAt`. */
  async listTemplates(userId: string, filters: TemplateFilters = {}) {
    const templates = await findTemplates(filters, 100, userId)

    return {
      templates: templates.map(t => ({
        id: t.id,
        name: t.name,
        narrative: t.narrative,
        subject: t.subject,
        language: t.language,
        educationLevel: t.educationLevel,
        province: t.province,
        backgroundImage: t.backgroundImage,
        teacherName: t.teacherName,
        missionCount: t._count.missions,
        isOwn: t.isOwn,
        recommended: t.recommendedAt !== null,
        updatedAt: t.updatedAt,
      })),
      total: templates.length,
    }
  }

  /** Detalle de una plantilla del marketplace. Devuelve exactamente lo que el
   *  importe copia (portada, historia, funcionalidades, tienda, comportamientos)
   *  y sus misiones, que se copian si se pide, resumidas como en la ficha
   *  pública: para que el modal de previsualización enseñe qué te llevas al importar.
   *  Una plantilla cuya clase está archivada deja de estar disponible, como en el listado. */
  async getTemplateDetail(userId: string, templateClassId: string) {
    const tpl = await findTemplate(templateClassId, userId)
    if (!tpl) throw new NotFoundError('Plantilla no encontrada')

    return {
      id: tpl.id,
      name: tpl.name,
      narrative: tpl.narrative,
      backgroundImage: tpl.backgroundImage,
      teacherName: tpl.teacherName,
      isOwn: tpl.isOwn,
      recommended: tpl.recommendedAt !== null,
      settings: tpl.settings,
      shopItems: tpl.shopItems,
      behaviorTemplates: tpl.behaviorTemplates,
      missions: tpl.missions,
    }
  }

  /** Copia una clase origen a una clase NUEVA del profesor, dentro de una
   *  transacción, eligiendo qué partes copiar con `options`:
   *   · narrative → narrativa + imagen de fondo (portada/historia)
   *   · features  → settings (funcionalidades); si no, defaults
   *   · shop      → items de la tienda
   *   · behaviors → plantillas de comportamiento
   *   · missions  → misiones + sus enigmas, en el orden de `source.missions`,
   *                 que pasa a ser el orden de la progresión de la copia
   *  Siempre deja fuera lo específico del origen: guía, metadatos de filtro,
   *  alumnos y progreso. Lo comparten importar-plantilla y duplicar-clase.
   *
   *  `afterCopy` recibe, además de la clase nueva, qué misión nueva salió de
   *  cada una del origen (id del origen → id de la copia): lo que haga falta
   *  rehacer entre misiones, dentro de la misma transacción. */
  private async copyClass(
    source: Prisma.ClassGetPayload<{ include: { shopItems: true; behaviorTemplates: true } }> & {
      missions?: MissionCopySource[]
    },
    userId: string,
    options: ClassCopyOptions,
    {
      missionCopy,
      afterCopy,
    }: {
      /** Cómo se copia cada misión (ver `copyMissionInto`). Sin él, tal cual. */
      missionCopy?: MissionCopyOptions
      /** Lo que va en la misma transacción que la copia, con la clase nueva ya creada. */
      afterCopy?: (
        tx: Prisma.TransactionClient,
        created: { id: string },
        copied: { missionIds: Map<string, string> }
      ) => Promise<unknown>
    } = {}
  ) {
    const invitationCode = nanoid(6).toUpperCase()

    return prisma.$transaction(
      async (tx) => {
        // El origen, bloqueado hasta confirmar: la purga de la papelera espera
        // y ve la copia antes de borrar los ficheros que comparten.
        if (!(await lockSourceClass(tx, source.id))) throw new NotFoundError('Clase no encontrada')
        // La copia es de quien la hace: propietario único, sin el resto del
        // profesorado de la clase de origen.
        const newClass = await createClassWithOwner(
          tx,
          {
            // Recortado para que la copia quepa en el tope del nombre.
            name: `${clipChars(source.name, CLASS_TEXT_LIMITS.name.max - COPY_SUFFIX.length)}${COPY_SUFFIX}`,
            narrative: options.narrative ? source.narrative : null,
            backgroundImage: options.narrative ? source.backgroundImage : null,
            settings: (options.features
              ? source.settings
              : DEFAULT_CLASS_SETTINGS) as Prisma.InputJsonValue,
            // El sistema de niveles personalizado va con las funcionalidades; si no
            // se copian, la nueva clase arranca con la curva por defecto.
            levelConfig: (options.features && source.levelConfig
              ? source.levelConfig
              : undefined) as Prisma.InputJsonValue | undefined,
            // El ranking, igual.
            rankingConfig: (options.features && source.rankingConfig
              ? resolveRankingConfig(source.rankingConfig)
              : undefined) as unknown as Prisma.InputJsonValue | undefined,
            invitationCode,
            isTemplate: false,
          },
          userId
        )

        if (options.shop && source.shopItems.length > 0) {
          await tx.shopItem.createMany({
            data: source.shopItems.map((s) => ({
              classId: newClass.id,
              name: s.name,
              description: s.description,
              price: s.price,
              active: s.active,
              kind: s.kind,
              manaCost: s.manaCost,
              usage: s.usage,
              lifeRestore: s.lifeRestore,
            })),
          })
        }

        if (options.behaviors && source.behaviorTemplates.length > 0) {
          await tx.behaviorTemplate.createMany({
            data: source.behaviorTemplates.map((b) => ({
              classId: newClass.id,
              kind: b.kind,
              name: b.name,
              description: b.description,
              xpDelta: b.xpDelta,
              coinDelta: b.coinDelta,
              manaDelta: b.manaDelta,
              lifeDelta: b.lifeDelta,
            })),
          })
        }

        // Misiones + enigmas: misión a misión (createMany no anida relaciones),
        // como diga `missionCopy`; sin él, tal cual (estado y fecha límite
        // incluidos) y sin documentos ni insignia. Nunca se copia el progreso
        // de alumnos ni las entregas. Llegan en el orden de la progresión del
        // origen y ese es su orden en la copia, numerado desde 0.
        const missionIds = new Map<string, string>()
        if (options.missions && source.missions && source.missions.length > 0) {
          // El camino del origen (lo que pide cada misión), leído ya con el
          // origen bloqueado. Las misiones se leyeron antes: si el orden no
          // cumple el camino (alguien lo cambió entretanto), la copia va en el
          // más parecido que lo cumple.
          const sourceIds = source.missions.map(m => m.id)
          const edges = (await classPathEdges(tx, source.id)).filter(
            e => sourceIds.includes(e.missionId) && sourceIds.includes(e.requiredMissionId)
          )
          const byId = new Map(source.missions.map(m => [m.id, m]))
          const ordered = pathOrder(sourceIds, edges).map(id => byId.get(id)!)
          for (const [position, m] of ordered.entries()) {
            const copy = await copyMissionInto(tx, m, newClass.id, {
              ...missionCopy,
              orderIndex: position,
            })
            missionIds.set(m.id, copy.mission.id)
          }
          // Y el camino de la copia, entre las misiones nuevas.
          if (edges.length > 0) {
            await tx.missionPrerequisite.createMany({
              data: edges.map(e => ({
                missionId: missionIds.get(e.missionId)!,
                requiredMissionId: missionIds.get(e.requiredMissionId)!,
              })),
            })
          }
        }

        await afterCopy?.(tx, newClass, { missionIds })
        return newClass
      },
      { timeout: 30000 }
    )
  }

  /** Importa una plantilla: crea una clase NUEVA del profesor copiando el chasis
   *  reutilizable (narrativa, funcionalidades, tienda, comportamientos) y, solo
   *  si lo pide (`options.missions`), sus misiones con sus enigmas. Cada misión
   *  llega en el estado que tiene en la plantilla (activa o bloqueada), sin
   *  fecha límite (era del calendario de quien la publicó), sin documentos (son
   *  ficheros privados suyos) y sin insignia. Las funcionalidades llegan todas
   *  como estaban, también las que están en pruebas (el mapa de misiones), que la
   *  ficha no enseña: van con las demás, como al duplicar. Todo en la misma
   *  transacción: si algo falla, no queda una clase a medias.
   *
   *  Las portadas (la de la clase y las de sus misiones) solo llegan si son
   *  ficheros públicos de la plataforma, como en la ficha pública (ver
   *  `publicUploadFromUrl`): la URL la escribe quien publica, y una de fuera la
   *  pedirían los navegadores del alumnado de quien importa cada vez que las
   *  vieran. Devuelve, además, cuántas misiones ha copiado. */
  async importTemplate(
    userId: string,
    templateClassId: string,
    options: { missions: boolean } = { missions: false }
  ) {
    if (!isTemplateId(templateClassId)) throw new NotFoundError('Plantilla no encontrada')
    const tpl = await prisma.class.findFirst({
      // Una plantilla cuya clase está archivada (o en la papelera) deja de estar
      // disponible, como en el listado.
      where: { id: templateClassId, isTemplate: true, archived: false, deletedAt: null },
      include: {
        shopItems: true,
        behaviorTemplates: true,
      },
    })
    if (!tpl) throw new NotFoundError('Plantilla no encontrada')

    // En el orden de la progresión de la plantilla: la clase nueva lo conserva.
    const [missions, publicCover] = await Promise.all([
      options.missions
        ? prisma.mission.findMany({
            where: { classId: tpl.id },
            include: MISSION_COPY_INCLUDE,
            orderBy: MISSION_ORDER,
          })
        : [],
      publicUploadResolver(),
    ])

    const created = await this.copyClass(
      {
        ...tpl,
        backgroundImage: publicCover(tpl.backgroundImage),
        missions: missions.map(m => ({ ...m, backgroundImage: publicCover(m.backgroundImage) })),
      },
      userId,
      {
        narrative: true,
        features: true,
        shop: true,
        behaviors: true,
        missions: options.missions,
      },
      { missionCopy: { deadline: null } }
    )

    return {
      class: { id: created.id, name: created.name },
      missions: missions.length,
      message: 'Plantilla importada como nueva clase',
    }
  }

  /** Duplica una clase a la que el profesor tiene acceso (basta con lectura) en
   *  una clase independiente "<nombre> (copia)" de la que él es el propietario.
   *  El profesor elige en `options` qué partes copiar (narrativa,
   *  funcionalidades, tienda, comportamientos, misiones). Nunca arrastra
   *  alumnos ni progreso. */
  async duplicateClass(userId: string, classId: string, options: ClassCopyOptions) {
    await assertClassAccess(classId, userId, 'class.duplicate')
    const source = await prisma.class.findUnique({
      where: { id: classId },
      include: {
        shopItems: true,
        behaviorTemplates: true,
        // En su orden: la copia conserva el orden de la progresión.
        missions: { include: MISSION_COPY_INCLUDE, orderBy: MISSION_ORDER },
      },
    })
    if (!source) throw new NotFoundError('Clase no encontrada')

    // En la clase de origen queda quién sacó una copia; la copia ya es de otra persona.
    const created = await this.copyClass(source, userId, options, {
      afterCopy: (tx, copy) =>
        recordClassAction(tx, {
          classId,
          actorId: userId,
          action: 'class.duplicated',
          entityType: 'class',
          entityId: copy.id,
          metadata: { ...options },
        }),
    })

    return { class: { id: created.id, name: created.name }, message: 'Clase duplicada' }
  }

  /** Importa una misión de una clase a otra: una copia independiente con sus
   *  enigmas, sus documentos (compartiendo fichero con el origen) y, salvo que
   *  se pida lo contrario, su insignia, copiada como insignia nueva de quien
   *  importa. Basta con poder ver la misión de origen y editar las misiones de
   *  la clase de destino. La copia llega bloqueada y sin fecha límite, para
   *  revisarla antes de abrirla al alumnado; el origen no cambia. Queda en el
   *  registro de las dos clases: en el destino, de dónde vino; en el origen,
   *  quién se llevó una copia y adónde. */
  async importMission(
    userId: string,
    missionId: string,
    options: { targetClassId: string; copyBadge: boolean }
  ) {
    const { classId: fromClassId } = await assertMissionAccess(missionId, userId, 'mission.view')
    await assertClassAccess(options.targetClassId, userId, 'mission.edit')

    const copy = await prisma.$transaction(
      async tx => {
        // La clase de origen, bloqueada hasta confirmar (ver `lockSourceClass`).
        if (!(await lockSourceClass(tx, fromClassId))) {
          throw new NotFoundError('Misión no encontrada')
        }
        const source = await readMissionForCopy(tx, missionId)
        // Si entretanto ha pasado a otra clase, el permiso comprobado ya no vale.
        if (!source || source.classId !== fromClassId) {
          throw new NotFoundError('Misión no encontrada')
        }
        const result = await copyMissionInto(tx, source, options.targetClassId, {
          status: 'bloqueada',
          deadline: null,
          documents: true,
          badgeAuthorId: options.copyBadge ? userId : undefined,
          // Al final del orden de la clase que la recibe.
          orderIndex: await nextMissionOrderIndex(tx, options.targetClassId),
        })
        const copied = {
          enigmas: result.enigmas,
          hints: result.hints,
          documents: result.documents,
          badges: result.badges.length,
        }
        await recordClassAction(tx, {
          classId: options.targetClassId,
          actorId: userId,
          action: 'mission.imported',
          entityType: 'mission',
          entityId: result.mission.id,
          metadata: {
            title: result.mission.title,
            fromClassId,
            fromMissionId: missionId,
            ...copied,
          },
        })
        // Como al duplicar una clase, en el origen queda quién se llevó una copia
        // (con sus documentos) y adónde. Importada en la misma clase, basta una entrada.
        if (fromClassId !== options.targetClassId) {
          await recordClassAction(tx, {
            classId: fromClassId,
            actorId: userId,
            action: 'mission.exported',
            entityType: 'mission',
            entityId: missionId,
            metadata: {
              title: source.title,
              toClassId: options.targetClassId,
              toMissionId: result.mission.id,
              ...copied,
            },
          })
        }
        return result
      },
      { timeout: 30000 }
    )

    return {
      mission: {
        id: copy.mission.id,
        classId: copy.mission.classId,
        title: copy.mission.title,
        status: copy.mission.status,
        rarity: copy.mission.rarity,
        deadline: copy.mission.deadline,
        backgroundImage: copy.mission.backgroundImage,
      },
      copied: {
        enigmas: copy.enigmas,
        hints: copy.hints,
        documents: copy.documents,
        badges: copy.badges,
      },
      message: 'Misión importada',
    }
  }

  async setClassArchived(userId: string, classId: string, archived: boolean) {
    await assertClassAccess(classId, userId, 'class.archive')
    const cls = await prisma.class.findUnique({ where: { id: classId } })

    if (!cls) throw new NotFoundError('Clase no encontrada')
    // En la papelera sigue archivada hasta que se restaura.
    assertNotInTrash(cls, ARCHIVE_IN_TRASH)
    if (cls.archived && !archived) {
      const updated = await this.saveArchived(userId, classId, false)

      return {
        class: {
          id: updated.id,
          name: updated.name,
          schedule: updated.schedule,
          archived: updated.archived,
          invitationCode: updated.invitationCode,
          backgroundImage: updated.backgroundImage,
          ...(await this.classAccessSummary(classId, userId)),
        },
        message: 'Clase desarchivada correctamente',
      }
    }
    if (cls.archived) throw new Error('La clase ya está archivada')

    const updated = await this.saveArchived(userId, classId, archived)

    return {
      class: {
        id: updated.id,
        name: updated.name,
        narrative: updated.narrative,
        schedule: updated.schedule,
        archived: updated.archived,
        invitationCode: updated.invitationCode,
        backgroundImage: updated.backgroundImage,
        ...(await this.classAccessSummary(classId, userId)),
      },
      message: archived ? 'Clase archivada correctamente' : 'Clase desarchivada correctamente',
    }
  }

  /**
   * Acceso propio y profesorado de la clase, como en el listado: la pantalla
   * guarda la clase que devuelve crear, editar o archivar en sus listados y
   * decide con esto qué ofrecer.
   */
  private async classAccessSummary(classId: string, userId: string) {
    const include = classTeachersInclude()
    const rows = await prisma.classTeacher.findMany({
      where: { classId, ...include.where },
      select: include.select,
      orderBy: include.orderBy,
    })
    return summarizeClassTeachers(rows, userId)
  }

  /** Archiva o desarchiva la clase y lo apunta en su registro. */
  private saveArchived(userId: string, classId: string, archived: boolean) {
    return prisma.$transaction(async tx => {
      // Condicionado a que siga fuera de la papelera: desarchivar a la vez que se
      // envía no puede dejarla en la papelera y sin archivar.
      await updateOutsideTrash(tx, classId, { archived }, ARCHIVE_IN_TRASH)
      const updated = await tx.class.findUniqueOrThrow({ where: { id: classId } })
      await recordClassAction(tx, {
        classId,
        actorId: userId,
        action: archived ? 'class.archived' : 'class.unarchived',
        entityType: 'class',
        entityId: classId,
      })
      return updated
    })
  }

  async getInvitationCode(userId: string, classId: string) {
    await assertClassAccess(classId, userId, 'class.inviteCode')
    const cls = await prisma.class.findUnique({
      where: { id: classId },
      select: { invitationCode: true },
    })

    if (!cls) throw new NotFoundError('Clase no encontrada')

    return { invitationCode: cls.invitationCode }
  }

  async getClassMissions(userId: string, classId: string) {
    await assertClassAccess(classId, userId, 'class.view')
    // Como la analítica: con la clase en la papelera, nada (404).
    await assertClassNotInTrash(classId)

    const [missions, matrix] = await Promise.all([
      prisma.mission.findMany({
        where: { classId },
        include: {
          enigmas: true,
          // Lo que pide cada una en el mapa (ver utils/mission-path.ts).
          prerequisites: {
            where: { requiredMission: { classId } },
            select: { requiredMissionId: true },
          },
        },
        // El orden de la progresión: el que ve el alumnado.
        orderBy: MISSION_ORDER,
      }),
      // Quién va por dónde, con las mismas definiciones que el panel de la clase.
      classMatrix(classId),
    ])

    const position = new Map(missions.map((m, index) => [m.id, index]))
    const inMatrix = new Map(matrix.missions.map((m, index) => [m.id, index]))
    return {
      missions: missions.map((m) => {
        // Quién la ha completado (ids, primero quien antes) y cuánta gente la lleva
        // en curso (`in_progress`: ni caducada ni cerrada), solo del alumnado de la
        // clase, sin la vista previa. Es del profesorado: los listados del alumnado
        // no lo traen.
        const index = inMatrix.get(m.id)
        const cells = matrix.students.flatMap(student => {
          const cell = index === undefined ? undefined : student.missions[index]
          return cell ? [{ studentId: student.studentId, cell }] : []
        })
        const completedStudentIds = cells
          .filter(({ cell }) => cell.state === 'completed')
          .sort(
            (a, b) =>
              (a.cell.completedAt?.getTime() ?? 0) - (b.cell.completedAt?.getTime() ?? 0) ||
              (a.studentId < b.studentId ? -1 : a.studentId > b.studentId ? 1 : 0)
          )
          .map(({ studentId }) => studentId)
        const inProgressCount = cells.filter(({ cell }) => cell.state === 'in_progress').length
        return {
          id: m.id,
          title: m.title,
          description: m.description,
          status: m.status,
          rarity: m.rarity,
          deadline: m.deadline,
          backgroundImage: m.backgroundImage,
          orderIndex: m.orderIndex,
          enigmasCount: m.enigmas.length,
          // Cuenta en «X de N misiones»: tiene enigmas y no está bloqueada a mano.
          counted: countsForProgress(m),
          ...missionRewards(m),
          completedCount: completedStudentIds.length,
          completedStudentIds,
          inProgressCount,
          totalStudents: matrix.summary.students,
          // Sin las cuentas sin estrenar: el denominador de las medias de la clase.
          participatingStudents: matrix.summary.participating,
          // Lo que pide para abrirse en el mapa (ids, en el orden de la clase),
          // aunque el mapa esté apagado.
          prerequisiteIds: m.prerequisites
            .map(p => p.requiredMissionId)
            .sort((a, b) => (position.get(a) ?? 0) - (position.get(b) ?? 0)),
        }
      }),
      total: missions.length,
    }
  }

  /**
   * El ranking de la clase para el profesorado: el mismo que el del alumnado
   * (mismo orden, mismos puestos, mismas medias), de cualquier tipo y siempre
   * completo, con el nombre real. Para él es analítica, no competición: lo ve aunque
   * el ranking esté apagado o su alumnado solo vea una parte, y como el resto de la
   * analítica, no con la clase en la papelera (404). `audience` dice qué ve su
   * alumnado, para avisárselo.
   */
  async getClassRanking(
    userId: string,
    classId: string,
    requested: { type?: unknown; period?: unknown } = {}
  ) {
    await assertClassAccess(classId, userId, 'class.view')
    await assertClassNotInTrash(classId)
    const { settings, config, studentTypes, teacherTypes } = await loadRankingContext(classId)
    const { type, period } = resolveRankingView(teacherTypes, requested)
    const since = rankingPeriodStart(period)
    const usesXp = settings.xp
    const options = {
      types: teacherTypes,
      periods: rankingPeriodsFor(type),
      usesXp,
      audience: {
        rankings: settings.rankings,
        types: studentTypes,
        mode: config.mode,
        topN: config.topN,
      },
    }
    if (type === 'teams') {
      return { type, period, options, standings: await loadTeamStandings(classId, since) }
    }

    const { ranked, stats } = await loadClassRanking(classId, { type, since })
    const rows = ranked.map(({ alias: _alias, enrollmentId: _enrollment, ...row }) => {
      const shown = { ...row, username: row.nickname || row.name || 'Estudiante' }
      return usesXp ? shown : withoutXp(shown)
    })
    const { podium, rest } = splitPodium(rows)

    return {
      type,
      period,
      options,
      ranking: rows,
      podium,
      leaderboard: rest,
      stats: period === 'all' ? (usesXp ? stats : statsWithoutXp(stats)) : null,
      total: rows.length,
    }
  }

  /**
   * Listado de alumnos de una clase con TODAS sus stats por clase (XP, nivel,
   * monedas, maná, vidas) y el recuento de comportamientos positivos/negativos.
   * Alimenta la pestaña "Alumnos" del detalle de la clase.
   */
  async getClassStudents(userId: string, classId: string) {
    await assertClassAccess(classId, userId, 'student.view')
    const cls = await prisma.class.findUnique({
      where: { id: classId },
      include: {
        enrollments: {
          where: { isPreview: false },
          include: { student: { include: { _count: UNUSED_ACCOUNT_SELECT._count } } },
        },
      },
    })

    if (!cls) throw new NotFoundError('Clase no encontrada')

    // Recuento de comportamientos por alumno (positivos / negativos) en esta clase.
    // Las recompensas libres van en la misma tabla, pero no son comportamientos.
    const behaviorCounts = await prisma.behaviorApplication.groupBy({
      by: ['studentId', 'kind'],
      where: { classId, kind: { not: 'reward' } },
      _count: { _all: true },
    })
    const positive = new Map<string, number>()
    const negative = new Map<string, number>()
    for (const b of behaviorCounts) {
      const target = b.kind === 'negative' ? negative : positive
      target.set(b.studentId, b._count._all)
    }

    // Config de niveles de la clase → título y color del tramo de cada alumno.
    const levelCfg = resolveLevelConfig(cls.levelConfig)

    // Cuentas sin correo cuya contraseña puede restablecer quien pregunta: las
    // que nacieron en una clase donde tiene administración.
    const resettable = await manageableHomeClasses(
      userId,
      cls.enrollments.map(e => e.student.homeClassId)
    )

    const students = cls.enrollments
      .map((e) => {
        const tier = tierForLevel(e.level, levelCfg)
        const managed = e.student.accountType === 'managed'
        return {
          id: e.student.id,
          // Nombre real del alumno + su alias de clase (el "@").
          name: e.student.name || 'Estudiante',
          handle: e.nickname || accountHandle(e.student),
          nickname: e.nickname,
          accountType: e.student.accountType,
          canResetPassword:
            managed && !!e.student.homeClassId && resettable.has(e.student.homeClassId),
          // Quitarlo de su clase de origen deja la cuenta sin nadie que la gestione.
          isHomeClass: managed && e.student.homeClassId === classId,
          // Aún no ha entrado con la contraseña temporal (recién creada o restablecida).
          pendingSignIn: managed && e.student.mustChangePassword,
          // Nunca se ha usado: quitarlo de aquí borra la cuenta.
          removalDeletesAccount: unusedAccountHomeClass(e.student) === classId,
          avatar: e.avatarUrl || '/app/avatars/atenea.svg',
          level: e.level,
          levelTitle: tier.title,
          levelColor: tier.color,
          xp: e.xp,
          coins: e.coins,
          mana: e.mana,
          lives: e.lives,
          positiveBehaviors: positive.get(e.student.id) || 0,
          negativeBehaviors: negative.get(e.student.id) || 0,
        }
      })
      .sort((a, b) => a.name.localeCompare(b.name))

    return {
      students,
      total: students.length,
      // Para que el front muestre solo las columnas de recursos activos.
      settings: resolveClassSettings(cls.settings),
    }
  }

  // ==================== STUDENTS ====================

  async getStudentById(userId: string, studentId: string) {
    // Solo las clases a las que se tiene acceso y en las que está el alumno.
    const classes = await prisma.class.findMany({
      where: {
        ...listedClassesWhere(userId),
        enrollments: { some: { studentId, isPreview: false } },
      },
      include: {
        enrollments: {
          where: { studentId, isPreview: false },
          include: { student: true },
        },
        teachers: classTeachersInclude(),
      },
      // Primero las vivas, por nombre: la ficha es el índice de sus clases.
      orderBy: [{ archived: 'asc' }, { name: 'asc' }],
    })

    const enrolledClasses = classes.filter((c) => c.enrollments.length > 0)
    if (enrolledClasses.length === 0) {
      throw new NotFoundError('No se ha encontrado esa cuenta de estudiante en tus clases')
    }

    const student = enrolledClasses[0].enrollments[0].student
    const accountFacts = await prisma.user.findUniqueOrThrow({
      where: { id: studentId },
      select: UNUSED_ACCOUNT_SELECT,
    })

    // Su progreso, solo en las clases de quien pregunta: de las demás no sale
    // nada, y las cifras generales se calculan sobre ese mismo conjunto.
    const teacherClassIds = enrolledClasses.map((c) => c.id)
    const progressByClass = await studentProgressByClass(studentId, teacherClassIds)
    const overall = sumProgress([...progressByClass.values()])

    // Get recent activities — only from teacher's classes
    const activities = await prisma.activity.findMany({
      where: {
        userId: studentId,
        OR: [
          { classId: { in: teacherClassIds } },
          { classId: null }, // Include global activities (level_up, badge_unlocked, etc.)
        ],
        ...WALL_ACTIVITY_WHERE,
      },
      include: ACTIVITY_ACTOR_INCLUDE,
      orderBy: { createdAt: 'desc' },
      take: 10,
    })

    // Solo quien administra la clase de origen restablece la contraseña de una
    // cuenta sin correo; la de una cuenta con correo la recupera su dueño.
    const canResetPassword =
      student.accountType === 'managed' &&
      !!student.homeClassId &&
      (await manageableHomeClasses(userId, [student.homeClassId])).has(student.homeClassId)

    return {
      student: {
        id: student.id,
        name: student.name,
        email: student.email,
        username: student.username,
        accountType: student.accountType,
        homeClassId: student.homeClassId,
        canResetPassword,
        pendingSignIn: student.accountType === 'managed' && student.mustChangePassword,
        // La clase de la que quitarlo borra la cuenta, si nunca se ha usado.
        unusedAccountHomeClassId: unusedAccountHomeClass(accountFacts),
        // Una fila por clase, lo justo para el índice: el detalle está en su página
        // dentro de cada clase.
        classes: enrolledClasses.map((c) => {
          const enrollment = c.enrollments[0]
          const progress = progressByClass.get(c.id)
          return {
            id: c.id,
            name: c.name,
            archived: c.archived,
            // Qué puede hacer quien pregunta con el alumno en esta clase.
            myAccess: summarizeClassTeachers(c.teachers, userId).myAccess,
            nickname: enrollment.nickname || student.name,
            avatar: enrollment.avatarUrl || DEFAULT_AVATARS[0]!,
            // Null si la clase no usa XP.
            level: resolveClassSettings(c.settings).xp ? enrollment.level || 1 : null,
            // «X de N misiones» (ver analytics/definitions.ts).
            missionsCompleted: progress?.missionsCompleted ?? 0,
            missionsCounted: progress?.missionsCounted ?? 0,
          }
        }),
        stats: {
          totalClasses: enrolledClasses.length,
          missionsCompleted: overall.missionsCompleted,
          missionsCounted: overall.missionsCounted,
          percent: overall.percent,
        },
        recentActivity: activities.map((a) => {
          const metadata = a.metadata && typeof a.metadata === 'object' ? a.metadata as any : {}

          return {
            id: a.id,
            type: a.type,
            timestamp: a.createdAt.toISOString(),
            // Class-specific profile data (stored in Activity table)
            avatar: a.avatar || DEFAULT_AVATARS[0]!,
            username: a.username || student.name,
            // Activity fields (some stored directly, some in metadata)
            enigmaTitle: a.enigmaTitle || metadata.enigmaTitle,
            enigmaXp: a.enigmaXp || metadata.enigmaXp,
            missionTitle: a.missionTitle ?? metadata.missionTitle,
            missionXp: a.missionXp ?? metadata.missionXp,
            newLevel: a.newLevel ?? metadata.newLevel,
            newTitle: a.newTitle ?? metadata.newTitle,
            className: a.className || metadata.className,
            achievementName: a.achievementName ?? metadata.achievementName,
            badgeName: a.badgeName ?? metadata.badgeName,
            badgeImage: a.badgeImage ?? metadata.badgeImage,
            badgeRarity: a.badgeRarity ?? metadata.badgeRarity,
            xpAmount: a.xpAmount ?? metadata.xpAmount,
            source: a.source ?? metadata.source,
            teacherName: a.teacherName ?? metadata.teacherName,
            metadata: a.metadata,
            studentId: a.userId,
            // La clase de la entrada: con el alumno, da el color de su avatar.
            classId: a.classId,
            // Quién lo hizo (aprobó, aplicó…), para el «Por …» de la tarjeta.
            actor: activityActor(a),
          }
        }),
      },
    }
  }

  // ==================== MISSIONS ====================

  async getMissions(userId: string, classIdFilter?: string, limit = 100) {
    let whereClause: Prisma.MissionWhereInput

    if (classIdFilter) {
      await assertClassAccess(classIdFilter, userId, 'class.view')
      whereClause = { classId: classIdFilter }
    } else {
      // Vista agregada: excluye las misiones de clases archivadas. Si se filtra por
      // una clase concreta (arriba) sí se muestran, porque se ha abierto a propósito.
      whereClause = { class: this.buildArchivedWhere(userId, 'active') }
    }

    const missions = await prisma.mission.findMany({
      where: whereClause,
      include: {
        class: {
          include: {
            enrollments: { where: { isPreview: false }, select: { studentId: true } },
          },
        },
        enigmas: true,
      },
      // De una clase, en el orden de la progresión. Todas juntas son «las
      // recientes» (el tope se lleva las más nuevas): la pantalla las ordena.
      orderBy: classIdFilter ? MISSION_ORDER : { createdAt: 'desc' },
      take: limit,
    })
    const { datesBy } = await missionCompletions(missions)

    return {
      missions: missions.map((m) => {
        // Hide reward amounts for resources disabled in the class.
        const s = resolveClassSettings(m.class.settings)
        return {
          id: m.id,
          title: m.title,
          description: m.description,
          className: m.class.name,
          classId: m.classId,
          status: m.status,
          rarity: m.rarity,
          deadline: m.deadline,
          backgroundImage: m.backgroundImage,
          orderIndex: m.orderIndex,
          enigmasCount: m.enigmas.length,
          ...missionRewards(m, s),
          // Solo su alumnado de ahora, como la pestaña de misiones de la clase: sin
          // la vista previa ni quien la completó en otra clase.
          completedCount: m.class.enrollments.filter(e => datesBy.get(e.studentId)?.has(m.id)).length,
          totalStudents: m.class.enrollments.length,
          createdAt: m.createdAt,
        }
      }),
      total: missions.length,
    }
  }

  // ==================== ACTIVITIES ====================

  async getActivities(userId: string, limit = 10) {
    const classes = await prisma.class.findMany({
      where: listedClassesWhere(userId),
      select: { id: true, name: true },
    })

    const classIds = classes.map((c) => c.id)
    const classNameMap = new Map(classes.map(c => [c.id, c.name]))

    // Get student IDs from enrollments
    const enrollments = await prisma.classEnrollment.findMany({
      where: { classId: { in: classIds }, isPreview: false },
    })

    const studentIds = enrollments.map((e) => e.studentId)

    // Lo que esos alumnos hacen en estas clases, más lo que no es de ninguna
    // (subir de nivel, insignias del sistema); lo de clases ajenas se queda fuera.
    const activities = await prisma.activity.findMany({
      where: {
        userId: { in: studentIds },
        OR: [{ classId: { in: classIds } }, { classId: null }],
        ...WALL_ACTIVITY_WHERE,
      },
      include: { user: true, ...ACTIVITY_ACTOR_INCLUDE },
      orderBy: { createdAt: 'desc' },
      take: limit,
    })

    return {
      activities: activities.map((a) => {
        const metadata = a.metadata && typeof a.metadata === 'object' ? a.metadata as any : {}

        return {
          id: a.id,
          type: a.type,
          timestamp: a.createdAt.toISOString(),
          // Class-specific profile data
          avatar: a.avatar || DEFAULT_AVATARS[0]!,
          username: a.username || a.user.name,
          // Activity fields (some stored directly, some in metadata)
          enigmaTitle: a.enigmaTitle || metadata.enigmaTitle,
          enigmaXp: a.enigmaXp || metadata.enigmaXp,
          missionTitle: a.missionTitle ?? metadata.missionTitle,
          missionXp: a.missionXp ?? metadata.missionXp,
          newLevel: a.newLevel ?? metadata.newLevel,
          newTitle: a.newTitle ?? metadata.newTitle,
          className: a.className || metadata.className || (a.classId ? classNameMap.get(a.classId) : undefined) || undefined,
          achievementName: a.achievementName ?? metadata.achievementName,
          badgeName: a.badgeName ?? metadata.badgeName,
          badgeImage: a.badgeImage ?? metadata.badgeImage,
          badgeRarity: a.badgeRarity ?? metadata.badgeRarity,
          xpAmount: a.xpAmount ?? metadata.xpAmount,
          source: a.source ?? metadata.source,
          teacherName: a.teacherName ?? metadata.teacherName,
          metadata: a.metadata,
          studentId: a.userId,
          // La clase de la entrada: con el alumno, da el color de su avatar.
          classId: a.classId,
          // Quién lo hizo (aprobó, aplicó…), para el «Por …» de la tarjeta.
          actor: activityActor(a),
        }
      }),
      total: activities.length,
    }
  }

  async getClassActivities(userId: string, classId: string, limit = 10) {
    await assertClassAccess(classId, userId, 'class.view')
    const cls = await prisma.class.findUnique({
      where: { id: classId },
      select: { name: true },
    })

    if (!cls) throw new NotFoundError('Clase no encontrada')

    // Get student IDs enrolled in this class
    const enrollments = await prisma.classEnrollment.findMany({
      where: { classId, isPreview: false },
    })

    const studentIds = enrollments.map((e) => e.studentId)

    // Get activities for students in this class only
    const activities = await prisma.activity.findMany({
      where: {
        userId: { in: studentIds },
        classId: classId, // Filter by class
      },
      include: { user: true, ...ACTIVITY_ACTOR_INCLUDE },
      orderBy: { createdAt: 'desc' },
      take: limit,
    })

    return {
      activities: activities.map((a) => {
        const metadata = a.metadata && typeof a.metadata === 'object' ? a.metadata as any : {}

        return {
          id: a.id,
          type: a.type,
          timestamp: a.createdAt.toISOString(),
          // Class-specific profile data
          avatar: a.avatar || DEFAULT_AVATARS[0]!,
          username: a.username || a.user.name,
          // Activity fields (some stored directly, some in metadata)
          enigmaTitle: a.enigmaTitle || metadata.enigmaTitle,
          enigmaXp: a.enigmaXp || metadata.enigmaXp,
          missionTitle: a.missionTitle ?? metadata.missionTitle,
          missionXp: a.missionXp ?? metadata.missionXp,
          newLevel: a.newLevel ?? metadata.newLevel,
          newTitle: a.newTitle ?? metadata.newTitle,
          className: a.className || metadata.className || cls.name,
          achievementName: a.achievementName ?? metadata.achievementName,
          badgeName: a.badgeName ?? metadata.badgeName,
          badgeImage: a.badgeImage ?? metadata.badgeImage,
          badgeRarity: a.badgeRarity ?? metadata.badgeRarity,
          xpAmount: a.xpAmount ?? metadata.xpAmount,
          source: a.source ?? metadata.source,
          teacherName: a.teacherName ?? metadata.teacherName,
          metadata: a.metadata,
          studentId: a.userId,
          // La clase de la entrada: con el alumno, da el color de su avatar.
          classId: a.classId,
          // Quién lo hizo (aprobó, aplicó…), para el «Por …» de la tarjeta.
          actor: activityActor(a),
        }
      }),
      total: activities.length,
    }
  }

  // ==================== BADGES ====================
  // Las del sistema, las propias y las vinculadas a misiones de clases donde se
  // tiene edición (ver `manageableBadgesWhere`).

  async getBadges(userId: string) {
    const [badges, manageable] = await Promise.all([
      prisma.badge.findMany({
        where: { OR: [{ teacherId: null }, manageableBadgesWhere(userId)] },
        orderBy: { createdAt: 'desc' },
        include: {
          mission: {
            select: {
              id: true,
              title: true,
              description: true,
              classId: true,
              class: { select: { id: true, name: true, narrative: true } },
            },
          },
        },
      }),
      // Las que se pueden cambiar, con la misma regla que `updateBadge` y
      // `deleteBadge`: la pantalla no lo deduce de si es del sistema.
      prisma.badge.findMany({ where: manageableBadgesWhere(userId), select: { id: true } }),
    ])
    const editable = new Set(manageable.map(b => b.id))

    return {
      badges: badges.map((b) => ({
        id: b.id,
        name: b.name,
        description: b.description,
        imageUrl: b.imageUrl,
        rarity: b.rarity,
        category: b.category,
        isSystem: b.teacherId === null,
        canEdit: editable.has(b.id),
        // Cómo se gana una del sistema (se concede sola), para explicarlo en su detalle.
        trigger:
          b.triggerType && b.triggerValue !== null
            ? { type: b.triggerType, value: b.triggerValue }
            : null,
        // Para saber a qué misiones se puede vincular: una ajena no sale de su clase.
        isMine: b.teacherId === userId,
        missionId: b.missionId,
        missionClassId: b.mission?.classId ?? null,
        missionTitle: b.mission?.title,
        className: b.mission?.class?.name,
        classNarrative: b.mission?.class?.narrative,
        createdAt: b.createdAt,
      })),
      total: badges.length,
    }
  }

  async createBadge(userId: string, data: { name: string; description?: string; imageUrl?: string; rarity?: string; missionId?: string }) {
    // Una insignia solo se vincula a una misión de una clase donde se puede editar el contenido.
    if (data.missionId) await assertMissionAccess(data.missionId, userId, 'mission.edit')

    // If imageUrl is base64, save it as a file
    let imageUrl = data.imageUrl
    if (imageUrl && imageUrl.startsWith('data:image/')) {
      imageUrl = (await saveBase64Image(imageUrl)) || undefined
    }

    const badge = await prisma.badge.create({
      data: {
        name: data.name,
        description: data.description,
        imageUrl,
        rarity: data.rarity || 'common',
        teacherId: userId,
        missionId: data.missionId || undefined,
      },
    })

    return {
      badge: {
        id: badge.id,
        name: badge.name,
        description: badge.description,
        imageUrl: badge.imageUrl,
        rarity: badge.rarity,
      },
      message: 'Insignia creada correctamente',
    }
  }

  async updateBadge(userId: string, badgeId: string, data: { name?: string; description?: string; imageUrl?: string; rarity?: string; missionId?: string }) {
    const badge = await prisma.badge.findFirst({
      where: { id: badgeId, ...manageableBadgesWhere(userId) },
    })

    if (!badge) throw new NotFoundError('Insignia no encontrada')

    // Igual que al crearla: la misión a la que se vincula tiene que ser editable
    // por quien la vincula, y la insignia, de las que se pueden usar en esa clase.
    if (data.missionId && data.missionId !== badge.missionId) {
      const { classId } = await assertMissionAccess(data.missionId, userId, 'mission.edit')
      const assignable = await prisma.badge.count({
        where: { AND: [{ id: badgeId }, assignableBadgesWhere(userId, classId)] },
      })
      if (!assignable) throw new NotFoundError('Insignia no encontrada')
    }

    // If imageUrl is base64, save it as a file
    let imageUrl = data.imageUrl
    if (imageUrl && imageUrl.startsWith('data:image/')) {
      imageUrl = (await saveBase64Image(imageUrl)) || undefined
    }

    const updated = await prisma.badge.update({
      where: { id: badgeId },
      data: {
        name: data.name,
        description: data.description,
        rarity: data.rarity,
        imageUrl: imageUrl !== undefined ? imageUrl : data.imageUrl,
        missionId: data.missionId !== undefined ? (data.missionId || null) : undefined,
      },
    })

    return {
      badge: {
        id: updated.id,
        name: updated.name,
        description: updated.description,
        imageUrl: updated.imageUrl,
        rarity: updated.rarity,
      },
      message: 'Insignia actualizada correctamente',
    }
  }

  async deleteBadge(userId: string, badgeId: string) {
    const badge = await prisma.badge.findFirst({
      where: { id: badgeId, ...manageableBadgesWhere(userId) },
    })

    if (!badge) throw new NotFoundError('Insignia no encontrada')

    await prisma.badge.delete({ where: { id: badgeId } })

    return { message: 'Insignia eliminada correctamente' }
  }

  // ==================== CLASS GUIDE ====================

  async updateClassGuide(userId: string, classId: string, content: string) {
    await assertClassAccess(classId, userId, 'class.editContent')

    // Upsert guide (create if doesn't exist, update if it does)
    const guide = await prisma.$transaction(async tx => {
      const saved = await tx.classGuide.upsert({
        where: { classId },
        update: {
          content,
          lastUpdated: new Date(),
        },
        create: {
          classId,
          content,
        },
      })
      await recordClassAction(tx, {
        classId,
        actorId: userId,
        action: 'class.guide_updated',
        entityType: 'class',
        entityId: classId,
      })
      return saved
    })

    return {
      guide: {
        content: guide.content,
        lastUpdated: guide.lastUpdated,
      },
      message: 'Guía actualizada correctamente',
    }
  }

  // ==================== HELPERS ====================

}

export const teachersService = new TeachersService()
