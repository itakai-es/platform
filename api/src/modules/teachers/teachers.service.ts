import { prisma } from '../../config/database.js'
import { Prisma } from '../../generated/prisma/client.js'
import { nanoid } from 'nanoid'
import { getLevelInfo, getLevelFromXP, calculateMissionTotalXP } from '../../utils/xp-calculator.js'
import { existsSync, mkdirSync } from 'fs'
import { join } from 'path'
import { randomUUID } from 'crypto'
import { generateFireRedAvatar } from '../ai/generators/avatar-firered.js'
import {
  AvatarServiceUnavailableError,
  NotFoundError,
  ValidationError,
} from '../../utils/errors.js'
import { seedDefaultShopItems } from '../shop/shop.service.js'
import {
  resolveClassSettings,
  normalizeClassSettings,
  DEFAULT_CLASS_SETTINGS,
  type ClassSettings,
} from '../../utils/class-settings.js'
import { resolveLevelConfig, tierForLevel, type LevelConfig } from '../../utils/level-config.js'
import { saveUpload } from '../storage/storage.service.js'
import { createClassWithOwner } from '../../utils/class-owner.js'
import {
  accessibleClassesWhere,
  assertClassAccess,
  assertMissionAccess,
  CLASS_ACTION_LEVEL,
  classTeachersInclude,
  hasClassLevel,
  recordClassAction,
  summarizeClassTeachers,
  type ClassAccess,
} from '../../utils/class-access.js'
import { accountHandle } from '../../utils/identity.js'
import { participatingEnrollmentWhere } from '../../utils/enrollment.js'
import { activityActor } from '../../utils/activity.js'
import { assignableBadgesWhere, manageableBadgesWhere } from '../../utils/badge-access.js'
import {
  manageableHomeClasses,
  UNUSED_ACCOUNT_SELECT,
  unusedAccountHomeClass,
} from './class-students.service.js'
import { copyMissionInto, readMissionForCopy } from './mission-copy.js'

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
  'scheduleConfig',
] as const

/** Metadatos de la clase: cambiarlos es un ajuste, no contenido. */
const CLASS_METADATA_FIELDS = ['subject', 'language', 'educationLevel', 'province'] as const

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

  // Extract mime type and data
  const matches = base64Data.match(/^data:image\/(\w+);base64,(.+)$/)
  if (!matches) return null

  const ext = matches[1] === 'jpeg' ? 'jpg' : matches[1]
  const buffer = Buffer.from(matches[2], 'base64')

  const filename = `${randomUUID()}.${ext}`
  return saveUpload(`${subdir}/${filename}`, buffer, `image/${matches[1]}`)
}

export class TeachersService {
  /** Clases a las que el profesor tiene acceso, con cualquier nivel, según su estado de archivo. */
  private buildArchivedWhere(
    userId: string,
    archived: 'active' | 'archived' | 'all' = 'active'
  ): Prisma.ClassWhereInput {
    if (archived === 'all') {
      return accessibleClassesWhere(userId)
    }

    return {
      ...accessibleClassesWhere(userId),
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
        enrollments: { where: { isPreview: false }, include: { student: true } },
        missions: { include: { progress: true } },
        teachers: classTeachersInclude(),
      },
      orderBy: { createdAt: 'desc' },
      ...(limit ? { take: limit } : {}),
    })

    return {
      classes: classes.map((c) => {
        const totalMissions = c.missions.length
        const completedProgress = c.missions.flatMap((m) => m.progress.filter((p) => p.completedAt))
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
          studentCount: c.enrollments.length,
          missionCount: totalMissions,
          stats: {
            avgProgress: this.calculateAvgProgress(c.missions),
            participation: c.enrollments.length > 0 ? Math.round((completedProgress.length / (c.enrollments.length * totalMissions)) * 100) || 0 : 0,
          },
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
        enrollments: { where: { isPreview: false }, include: { student: true } },
        missions: { include: { enigmas: true, progress: true } },
        guide: true,
        teachers: classTeachersInclude(),
      },
    })

    if (!cls) throw new NotFoundError('Clase no encontrada')
    const access = summarizeClassTeachers(cls.teachers, userId)

    // Count pending submissions for this class
    const missionIds = cls.missions.map((m) => m.id)
    const pendingReviews = await prisma.enigmaSubmission.count({
      where: {
        status: 'pendiente',
        enigma: {
          missionId: { in: missionIds },
        },
      },
    })

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
      settings: resolveClassSettings(cls.settings),
      levelConfig: resolveLevelConfig(cls.levelConfig),
      scheduleConfig: cls.scheduleConfig,
      updatedAt: cls.updatedAt,
      studentCount: cls.enrollments.length,
      missionCount: cls.missions.length,
      stats: {
        avgProgress: this.calculateAvgProgress(cls.missions),
        pendingReviews,
      },
      createdAt: cls.createdAt,
      ...access,
    }
  }

  async createClass(userId: string, data: { name: string; narrative?: string; schedule?: string; backgroundImage?: string; subject?: string; language?: string; educationLevel?: string; province?: string }) {
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
    data: { name?: string; narrative?: string; schedule?: string; backgroundImage?: string; subject?: string; language?: string; educationLevel?: string; province?: string; settings?: Partial<ClassSettings>; levelConfig?: Partial<LevelConfig>; scheduleConfig?: unknown }
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
      CLASS_METADATA_FIELDS.some(
        field => data[field] !== undefined && (data[field] || null) !== (cls[field] || null)
      )
    if (touchesSettings) access = await assertClassAccess(classId, userId, 'class.editSettings')

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

    const { settings: settingsPatch, levelConfig: levelConfigPatch, scheduleConfig: scheduleConfigPatch, ...rest } = data

    const updated = await prisma.$transaction(async tx => {
      const saved = await tx.class.update({
        where: { id: classId },
        data: {
          ...rest,
          // Merge incoming flags over current settings, then normalize dependencies so the
          // stored config is always coherent (e.g. shop off ⇒ mana off).
          ...(settingsPatch
            ? { settings: { ...normalizeClassSettings({ ...resolveClassSettings(cls.settings), ...settingsPatch }) } }
            : {}),
          // La config de niveles se normaliza (curva + tramos válidos) antes de guardar.
          ...(levelConfigPatch
            ? { levelConfig: resolveLevelConfig({ ...resolveLevelConfig(cls.levelConfig), ...levelConfigPatch }) as unknown as Prisma.InputJsonValue }
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

    if (publish) {
      const missing: string[] = []
      if (!cls.subject) missing.push('subject')
      if (!cls.educationLevel) missing.push('educationLevel')
      if (!cls.language) missing.push('language')
      if (missing.length > 0) {
        throw new Error('Completa los metadatos de la clase (asignatura, nivel e idioma) antes de publicarla como plantilla.')
      }
    }

    await prisma.$transaction(async tx => {
      await tx.class.update({ where: { id: classId }, data: { isTemplate: publish } })
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

  /** Lista las plantillas públicas del marketplace, con filtros opcionales. */
  async listTemplates(
    userId: string,
    filters: { subject?: string; educationLevel?: string; language?: string; province?: string; q?: string } = {}
  ) {
    const where: Prisma.ClassWhereInput = {
      isTemplate: true,
      archived: false,
      ...(filters.subject ? { subject: filters.subject } : {}),
      ...(filters.educationLevel ? { educationLevel: filters.educationLevel } : {}),
      ...(filters.language ? { language: filters.language } : {}),
      ...(filters.province ? { province: filters.province } : {}),
      ...(filters.q
        ? {
            OR: [
              { name: { contains: filters.q, mode: 'insensitive' } },
              { narrative: { contains: filters.q, mode: 'insensitive' } },
            ],
          }
        : {}),
    }

    const classes = await prisma.class.findMany({
      where,
      include: { teacher: { select: { name: true } }, _count: { select: { missions: true } } },
      orderBy: { updatedAt: 'desc' },
      take: 100,
    })

    return {
      templates: classes.map((c) => ({
        id: c.id,
        name: c.name,
        narrative: c.narrative,
        subject: c.subject,
        language: c.language,
        educationLevel: c.educationLevel,
        province: c.province,
        backgroundImage: c.backgroundImage,
        teacherName: c.teacher.name,
        missionCount: c._count.missions,
        isOwn: c.teacherId === userId,
      })),
      total: classes.length,
    }
  }

  /** Detalle de una plantilla del marketplace. Devuelve exactamente lo que el
   *  importe copia (portada, historia, funcionalidades, tienda, comportamientos)
   *  para que el modal de previsualización enseñe qué te llevas al importar. */
  async getTemplateDetail(userId: string, templateClassId: string) {
    const tpl = await prisma.class.findFirst({
      // Una plantilla cuya clase está archivada deja de estar disponible, como en el listado.
      where: { id: templateClassId, isTemplate: true, archived: false },
      select: {
        id: true,
        name: true,
        narrative: true,
        backgroundImage: true,
        settings: true,
        teacherId: true,
        teacher: { select: { name: true } },
        shopItems: {
          select: { id: true, name: true, description: true, price: true, kind: true, manaCost: true, usage: true, lifeRestore: true },
          orderBy: { price: 'asc' },
        },
        behaviorTemplates: {
          select: { id: true, kind: true, name: true, description: true, xpDelta: true, coinDelta: true, lifeDelta: true },
          orderBy: [{ kind: 'asc' }, { name: 'asc' }],
        },
      },
    })
    if (!tpl) throw new Error('Plantilla no encontrada')

    return {
      id: tpl.id,
      name: tpl.name,
      narrative: tpl.narrative,
      backgroundImage: tpl.backgroundImage,
      teacherName: tpl.teacher.name,
      isOwn: tpl.teacherId === userId,
      settings: tpl.settings,
      shopItems: tpl.shopItems,
      behaviorTemplates: tpl.behaviorTemplates,
    }
  }

  /** Copia una clase origen a una clase NUEVA del profesor, dentro de una
   *  transacción, eligiendo qué partes copiar con `options`:
   *   · narrative → narrativa + imagen de fondo (portada/historia)
   *   · features  → settings (funcionalidades); si no, defaults
   *   · shop      → items de la tienda
   *   · behaviors → plantillas de comportamiento
   *   · missions  → misiones + sus enigmas
   *  Siempre deja fuera lo específico del origen: guía, metadatos de filtro,
   *  alumnos y progreso. Lo comparten importar-plantilla y duplicar-clase. */
  private async copyClass(
    source: Prisma.ClassGetPayload<{ include: { shopItems: true; behaviorTemplates: true } }> & {
      missions?: Prisma.MissionGetPayload<{ include: { enigmas: true } }>[]
    },
    userId: string,
    options: ClassCopyOptions,
    /** Lo que va en la misma transacción que la copia, con la clase nueva ya creada. */
    afterCopy?: (tx: Prisma.TransactionClient, created: { id: string }) => Promise<unknown>
  ) {
    const invitationCode = nanoid(6).toUpperCase()

    return prisma.$transaction(
      async (tx) => {
        // La copia es de quien la hace: propietario único, sin el resto del
        // profesorado de la clase de origen.
        const newClass = await createClassWithOwner(
          tx,
          {
            name: `${source.name} (copia)`,
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
              lifeDelta: b.lifeDelta,
            })),
          })
        }

        // Misiones + enigmas: misión a misión (createMany no anida relaciones),
        // tal cual (estado y fecha límite incluidos) y sin documentos ni
        // insignia. Nunca se copia el progreso de alumnos ni las entregas.
        if (options.missions && source.missions && source.missions.length > 0) {
          for (const m of source.missions) {
            await copyMissionInto(tx, m, newClass.id)
          }
        }

        await afterCopy?.(tx, newClass)
        return newClass
      },
      { timeout: 30000 }
    )
  }

  /** Importa una plantilla: crea una clase NUEVA del profesor copiando el chasis
   *  reutilizable (narrativa, funcionalidades, tienda, comportamientos). Las
   *  misiones se dejan fuera a propósito (cada profe monta las suyas). */
  async importTemplate(userId: string, templateClassId: string) {
    const tpl = await prisma.class.findFirst({
      // Una plantilla cuya clase está archivada deja de estar disponible, como en el listado.
      where: { id: templateClassId, isTemplate: true, archived: false },
      include: {
        shopItems: true,
        behaviorTemplates: true,
      },
    })
    if (!tpl) throw new Error('Plantilla no encontrada')

    const created = await this.copyClass(tpl, userId, {
      narrative: true,
      features: true,
      shop: true,
      behaviors: true,
      missions: false,
    })

    return { class: { id: created.id, name: created.name }, message: 'Plantilla importada como nueva clase' }
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
        missions: { include: { enigmas: true } },
      },
    })
    if (!source) throw new NotFoundError('Clase no encontrada')

    // En la clase de origen queda quién sacó una copia; la copia ya es de otra persona.
    const created = await this.copyClass(source, userId, options, (tx, copy) =>
      recordClassAction(tx, {
        classId,
        actorId: userId,
        action: 'class.duplicated',
        entityType: 'class',
        entityId: copy.id,
        metadata: { ...options },
      })
    )

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
        })
        const copied = {
          enigmas: result.enigmas,
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
      copied: { enigmas: copy.enigmas, documents: copy.documents, badges: copy.badges },
      message: 'Misión importada',
    }
  }

  async setClassArchived(userId: string, classId: string, archived: boolean) {
    await assertClassAccess(classId, userId, 'class.archive')
    const cls = await prisma.class.findUnique({ where: { id: classId } })

    if (!cls) throw new NotFoundError('Clase no encontrada')
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
      const updated = await tx.class.update({ where: { id: classId }, data: { archived } })
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
    const totalStudents = await prisma.classEnrollment.count({
      where: { classId, isPreview: false },
    })

    const missions = await prisma.mission.findMany({
      where: { classId },
      include: { enigmas: true, progress: true },
      orderBy: { createdAt: 'desc' },
    })

    return {
      missions: missions.map((m) => ({
        id: m.id,
        title: m.title,
        description: m.description,
        status: m.status,
        rarity: m.rarity,
        deadline: m.deadline,
        backgroundImage: m.backgroundImage,
        enigmasCount: m.enigmas.length,
        xpReward: calculateMissionTotalXP(m.rarity, m.enigmas.map(e => e.xpReward)),
        coinReward: m.enigmas.reduce((sum, e) => sum + (e.coinReward || 0), 0),
        manaReward: m.enigmas.reduce((sum, e) => sum + (e.manaReward || 0), 0),
        completedCount: m.progress.filter((p) => p.completedAt).length,
        totalStudents,
      })),
      total: missions.length,
    }
  }

  async getClassRanking(userId: string, classId: string) {
    await assertClassAccess(classId, userId, 'class.view')
    // El mismo podio que ve el alumnado: sin quien aún no ha entrado nunca.
    const cls = await prisma.class.findUnique({
      where: { id: classId },
      include: {
        enrollments: {
          where: { isPreview: false, AND: [participatingEnrollmentWhere] },
          include: { student: true },
        },
      },
    })

    if (!cls) throw new NotFoundError('Clase no encontrada')

    // Get per-student mission progress
    const totalMissionsInClass = await prisma.mission.count({ where: { classId } })
    const studentProgress = await prisma.studentMissionProgress.groupBy({
      by: ['studentId'],
      where: {
        mission: { classId },
        progress: 100,
      },
      _count: true,
    })
    const completedByStudent = new Map(studentProgress.map(sp => [sp.studentId, sp._count]))
    const levelCfg = resolveLevelConfig(cls.levelConfig)

    const sorted = cls.enrollments
      .map((e) => {
        const missionsCompleted = completedByStudent.get(e.student.id) || 0
        const tier = tierForLevel(e.level, levelCfg)
        return {
          id: e.student.id,
          name: e.student.name,
          nickname: e.nickname,
          username: e.nickname || e.student.name || 'Estudiante',
          avatar: e.avatarUrl || '/app/avatars/atenea.svg',
          xp: e.xp,
          level: e.level,
          levelTitle: tier.title,
          levelColor: tier.color,
          missionsCompleted,
          missionsTotal: totalMissionsInClass,
          completionPercent: totalMissionsInClass > 0 ? Math.round((missionsCompleted / totalMissionsInClass) * 100) : 0,
        }
      })
      .sort((a, b) => b.xp - a.xp)
      .map((s, index) => ({ ...s, rank: index + 1 }))

    const totalStudents = sorted.length
    const avgXp = totalStudents > 0 ? Math.round(sorted.reduce((sum, s) => sum + s.xp, 0) / totalStudents) : 0
    const totalCompleted = sorted.reduce((sum, s) => sum + s.missionsCompleted, 0)
    const avgProgress = totalStudents > 0 ? Math.round(sorted.reduce((sum, s) => sum + s.completionPercent, 0) / totalStudents) : 0

    return {
      ranking: sorted,
      podium: sorted.slice(0, 3),
      leaderboard: sorted.slice(3),
      stats: {
        totalStudents,
        avgXp,
        avgProgress,
        avgMissions: totalStudents > 0 ? String(Math.round(totalCompleted / totalStudents)) : '0',
        participation: totalStudents > 0 ? 100 : 0,
      },
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
    const behaviorCounts = await prisma.behaviorApplication.groupBy({
      by: ['studentId', 'kind'],
      where: { classId },
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

  async generateStudentAvatar(
    userId: string,
    classId: string,
    studentId: string,
    data: { avatar_id: string; wardrobe_prompt: string; background_prompt: string }
  ) {
    await assertClassAccess(classId, userId, 'student.avatar')

    const enrollment = await prisma.classEnrollment.findUnique({
      where: { studentId_classId: { studentId, classId } },
    })
    if (!enrollment) throw new Error('El estudiante no está inscrito en esta clase')

    let fileUrl: string
    try {
      ({ fileUrl } = await generateFireRedAvatar(data))
    } catch (err) {
      console.error('[AI] Avatar customization unavailable:', err instanceof Error ? err.message : err)
      throw new AvatarServiceUnavailableError()
    }

    const updated = await prisma.$transaction(async tx => {
      const saved = await tx.classEnrollment.update({
        where: { studentId_classId: { studentId, classId } },
        data: { avatarUrl: fileUrl },
      })
      await recordClassAction(tx, {
        classId,
        actorId: userId,
        action: 'student.avatar_generated',
        entityType: 'enrollment',
        entityId: saved.id,
        targetUserId: studentId,
      })
      return saved
    })

    return { avatarUrl: updated.avatarUrl, message: 'Avatar del estudiante actualizado correctamente' }
  }

  // ==================== STUDENTS ====================

  async getStudentById(userId: string, studentId: string) {
    // Solo las clases a las que se tiene acceso y en las que está el alumno.
    const classes = await prisma.class.findMany({
      where: {
        ...accessibleClassesWhere(userId),
        enrollments: { some: { studentId, isPreview: false } },
      },
      include: {
        enrollments: {
          where: { studentId, isPreview: false },
          include: { student: true },
        },
        missions: { include: { enigmas: true, badges: { select: { id: true } } } },
        teachers: classTeachersInclude(),
      },
    })

    // Badges earned by this student (used for per-class badge count)
    const earnedBadges = await prisma.studentBadge.findMany({
      where: { studentId },
      select: { badgeId: true },
    })
    const earnedBadgeIds = new Set(earnedBadges.map((b) => b.badgeId))

    const enrolledClasses = classes.filter((c) => c.enrollments.length > 0)
    if (enrolledClasses.length === 0) {
      throw new NotFoundError('Estudiante no encontrado en tus clases')
    }

    const student = enrolledClasses[0].enrollments[0].student
    const accountFacts = await prisma.user.findUniqueOrThrow({
      where: { id: studentId },
      select: UNUSED_ACCOUNT_SELECT,
    })

    // Progreso del alumno, solo en las misiones de las clases de quien pregunta:
    // de las demás no sale ni el título ni el nombre de la clase, y las
    // estadísticas se calculan sobre ese mismo conjunto.
    const missionProgress = await prisma.studentMissionProgress.findMany({
      where: { studentId, mission: { classId: { in: enrolledClasses.map(c => c.id) } } },
      include: { mission: { include: { class: true, enigmas: { select: { xpReward: true } } } } },
    })

    // Enigma-level progress for completion rate (counts enigmas done across missions)
    const allEnigmaIds = enrolledClasses.flatMap((c) =>
      c.missions.flatMap((m) => m.enigmas.map((e) => e.id))
    )
    const enigmaProgress =
      allEnigmaIds.length > 0
        ? await prisma.studentEnigmaProgress.findMany({
            where: { studentId, enigmaId: { in: allEnigmaIds } },
            select: { enigmaId: true },
          })
        : []
    const completedEnigmaIds = new Set(enigmaProgress.map((ep) => ep.enigmaId))

    // Get recent activities — only from teacher's classes
    const teacherClassIds = enrolledClasses.map((c) => c.id)
    const activities = await prisma.activity.findMany({
      where: {
        userId: studentId,
        OR: [
          { classId: { in: teacherClassIds } },
          { classId: null }, // Include global activities (level_up, badge_unlocked, etc.)
        ],
      },
      orderBy: { createdAt: 'desc' },
      take: 10,
    })

    // Calculate stats
    const totalMissionsCompleted = missionProgress.filter((p) => p.completedAt).length
    const totalMissionsAvailable = enrolledClasses.reduce(
      (sum, c) => sum + c.missions.length,
      0
    )
    const totalEnigmas = allEnigmaIds.length
    const completedEnigmas = completedEnigmaIds.size
    // Completion rate is enigma-based, not mission-based
    const completionRate =
      totalEnigmas > 0 ? Math.round((completedEnigmas / totalEnigmas) * 100) : 0

    // Calculate average score (average progress across all missions)
    const averageScore =
      missionProgress.length > 0
        ? Math.round(missionProgress.reduce((sum, p) => sum + p.progress, 0) / missionProgress.length)
        : 0

    // Calculate streak (placeholder - would need login history for real streak)
    const streak = 0

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
        // Per-class data
        classes: enrolledClasses.map((c) => {
          const enrollment = c.enrollments[0]
          const classMissionIds = c.missions.map((m) => m.id)
          const classMissionProgress = missionProgress.filter((p) =>
            classMissionIds.includes(p.missionId)
          )
          const classCompleted = classMissionProgress.filter((p) => p.completedAt).length
          const classTotal = c.missions.length
          // Per-class progress is enigma-based as well
          const classEnigmas = c.missions.flatMap((m) => m.enigmas)
          const classEnigmaIds = classEnigmas.map((e) => e.id)
          const classCompletedEnigmas = classEnigmaIds.filter((id) =>
            completedEnigmaIds.has(id)
          ).length
          const classProgress =
            classEnigmaIds.length > 0
              ? Math.round((classCompletedEnigmas / classEnigmaIds.length) * 100)
              : 0
          const classTotalXp = classEnigmas.reduce((sum, e) => sum + (e.xpReward || 0), 0)
          // Per-class badges: those linked to missions of this class
          const classBadgeIds = c.missions.flatMap((m) => m.badges.map((b) => b.id))
          const classBadgesTotal = classBadgeIds.length
          const classBadgesEarned = classBadgeIds.filter((id) => earnedBadgeIds.has(id)).length

          return {
            id: c.id,
            name: c.name,
            archived: c.archived,
            // Qué puede hacer quien pregunta con el alumno en esta clase.
            myAccess: summarizeClassTeachers(c.teachers, userId).myAccess,
            nickname: enrollment.nickname || student.name,
            avatar: enrollment.avatarUrl || '/app/avatars/avatar-1.svg',
            level: enrollment.level || 1,
            xp: enrollment.xp || 0,
            totalXp: classTotalXp,
            coins: enrollment.coins || 0,
            mana: enrollment.mana || 0,
            lives: enrollment.lives,
            settings: resolveClassSettings(c.settings),
            progress: classProgress,
            missionsCompleted: classCompleted,
            totalMissions: classTotal,
            badgesEarned: classBadgesEarned,
            totalBadges: classBadgesTotal,
          }
        }),
        stats: {
          totalClasses: enrolledClasses.length,
          totalMissionsCompleted,
          totalMissionsAvailable,
          completionRate,
          averageScore,
          streak,
        },
        recentMissions: missionProgress
          .filter((p) => p.completedAt)
          .sort((a, b) => new Date(b.completedAt!).getTime() - new Date(a.completedAt!).getTime())
          .slice(0, 5)
          .map((p) => ({
            id: p.mission.id,
            title: p.mission.title,
            className: p.mission.class.name,
            xpEarned: calculateMissionTotalXP(p.mission.rarity, p.mission.enigmas.map(e => e.xpReward)),
            completedAt: p.completedAt!.toISOString(),
          })),
        recentActivity: activities.map((a) => {
          const metadata = a.metadata && typeof a.metadata === 'object' ? a.metadata as any : {}

          return {
            id: a.id,
            type: a.type,
            timestamp: a.createdAt.toISOString(),
            // Class-specific profile data (stored in Activity table)
            avatar: a.avatar || '/app/avatars/avatar-1.svg',
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
          include: { enrollments: { where: { isPreview: false } } },
        },
        enigmas: true,
        progress: true,
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    })

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
          enigmasCount: m.enigmas.length,
          xpReward: s.xp ? calculateMissionTotalXP(m.rarity, m.enigmas.map(e => e.xpReward)) : 0,
          coinReward: s.coins ? m.enigmas.reduce((sum, e) => sum + (e.coinReward || 0), 0) : 0,
          manaReward: s.mana ? m.enigmas.reduce((sum, e) => sum + (e.manaReward || 0), 0) : 0,
          completedCount: m.progress.filter((p) => p.completedAt).length,
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
      where: accessibleClassesWhere(userId),
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
      },
      include: { user: true },
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
          avatar: a.avatar || '/app/avatars/avatar-1.svg',
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
      include: { user: true },
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
          avatar: a.avatar || '/app/avatars/avatar-1.svg',
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
    const badges = await prisma.badge.findMany({
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
    })

    return {
      badges: badges.map((b) => ({
        id: b.id,
        name: b.name,
        description: b.description,
        imageUrl: b.imageUrl,
        rarity: b.rarity,
        category: b.category,
        isSystem: b.teacherId === null,
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

  private calculateAvgProgress(missions: any[]): number {
    if (missions.length === 0) return 0

    const totalProgress = missions.reduce((sum, m) => {
      const avgMissionProgress = m.progress?.length > 0 ? m.progress.reduce((s: number, p: any) => s + p.progress, 0) / m.progress.length : 0
      return sum + avgMissionProgress
    }, 0)

    return Math.round(totalProgress / missions.length)
  }
}

export const teachersService = new TeachersService()
