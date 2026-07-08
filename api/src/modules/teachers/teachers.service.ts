import { prisma } from '../../config/database.js'
import type { Prisma } from '../../generated/prisma/client.js'
import { nanoid } from 'nanoid'
import { getLevelInfo, calculateMissionTotalXP } from '../../utils/xp-calculator.js'
import { existsSync, mkdirSync } from 'fs'
import { join } from 'path'
import { randomUUID } from 'crypto'
import { generateFireRedAvatar } from '../ai/generators/avatar-firered.js'
import { AvatarServiceUnavailableError } from '../../utils/errors.js'
import { seedDefaultShopItems } from '../shop/shop.service.js'
import {
  resolveClassSettings,
  normalizeClassSettings,
  type ClassSettings,
} from '../../utils/class-settings.js'
import { saveUpload } from '../storage/storage.service.js'

const BADGES_DIR = join(process.cwd(), 'uploads', 'badges')
const COVERS_DIR = join(process.cwd(), 'uploads', 'covers')

// Ensure upload directories exist
for (const dir of [BADGES_DIR, COVERS_DIR]) {
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true })
  }
}

// Default avatar options (Greek gods)
const DEFAULT_AVATARS = [
  '/app/avatars/atenea.svg',
  '/app/avatars/odiseo.svg',
  '/app/avatars/penelope.svg',
  '/app/avatars/polifemo.svg',
  '/app/avatars/poseidon.svg',
]

// Mythological-themed nicknames
const MYTHOLOGICAL_NICKNAMES = [
  'Héroe Anónimo',
  'Guerrero de Troya',
  'Argonauta Valiente',
  'Guardián del Olimpo',
  'Explorador Épico',
  'Titan Novato',
  'Escudero de Atenea',
  'Mensajero Hermes',
  'Aprendiz de Hefesto',
  'Discípulo de Quirón',
  'Portador de la Llama',
  'Navegante Audaz',
  'Cazador de Artemisa',
  'Defensor del Ágora',
  'Sabio Itacense',
  'Forjador de Leyendas',
  'Voz del Oráculo',
  'Protector del Templo',
  'Hijo de las Musas',
  'Centinela Espartano',
  'Viajero Intrépido',
  'Guardián Secreto',
  'Buscador de Mitos',
  'Aspirante a Héroe',
  'Portador de Luz',
  'Explorador Mítico',
  'Escriba del Olimpo',
  'Valiente de Atenas',
  'Joven Estratega',
  'Aprendiz del Destino',
]

/**
 * Selects a random default avatar URL
 */
function getRandomAvatar(): string {
  return DEFAULT_AVATARS[Math.floor(Math.random() * DEFAULT_AVATARS.length)]
}

/**
 * Generates a random mythological nickname
 */
function getRandomNickname(): string {
  return MYTHOLOGICAL_NICKNAMES[Math.floor(Math.random() * MYTHOLOGICAL_NICKNAMES.length)]
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
  private buildArchivedWhere(
    userId: string,
    archived: 'active' | 'archived' | 'all' = 'active'
  ) {
    if (archived === 'all') {
      return { teacherId: userId }
    }

    return {
      teacherId: userId,
      archived: archived === 'archived',
    }
  }

  // ==================== STATS ====================

  async getStats(userId: string) {
    const classes = await prisma.class.findMany({
      where: { teacherId: userId, archived: false },
      include: { enrollments: true, missions: true },
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
        enrollments: { include: { student: true } },
        missions: { include: { progress: true } },
      },
      orderBy: { createdAt: 'desc' },
      ...(limit ? { take: limit } : {}),
    })

    return {
      classes: classes.map((c) => {
        const totalMissions = c.missions.length
        const completedProgress = c.missions.flatMap((m) => m.progress.filter((p) => p.completedAt))

        return {
          id: c.id,
          name: c.name,
          narrative: c.narrative,
          schedule: c.schedule,
          archived: c.archived,
          invitationCode: c.invitationCode,
          backgroundImage: c.backgroundImage,
          subject: c.subject,
          language: c.language,
          educationLevel: c.educationLevel,
          province: c.province,
          settings: resolveClassSettings(c.settings),
          studentCount: c.enrollments.length,
          missionCount: totalMissions,
          stats: {
            avgProgress: this.calculateAvgProgress(c.missions),
            participation: c.enrollments.length > 0 ? Math.round((completedProgress.length / (c.enrollments.length * totalMissions)) * 100) || 0 : 0,
          },
          createdAt: c.createdAt,
        }
      }),
      total: classes.length,
    }
  }

  async getClassById(userId: string, classId: string) {
    const cls = await prisma.class.findFirst({
      where: { id: classId, teacherId: userId },
      include: {
        enrollments: { include: { student: true } },
        missions: { include: { enigmas: true, progress: true } },
        guide: true,
      },
    })

    if (!cls) throw new Error('Clase no encontrada')

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
      invitationCode: cls.invitationCode,
      backgroundImage: cls.backgroundImage,
      subject: cls.subject,
      language: cls.language,
      educationLevel: cls.educationLevel,
      province: cls.province,
      isTemplate: cls.isTemplate,
      settings: resolveClassSettings(cls.settings),
      updatedAt: cls.updatedAt,
      studentCount: cls.enrollments.length,
      missionCount: cls.missions.length,
      stats: {
        avgProgress: this.calculateAvgProgress(cls.missions),
        pendingReviews,
      },
      createdAt: cls.createdAt,
    }
  }

  async createClass(userId: string, data: { name: string; narrative?: string; schedule?: string; backgroundImage?: string; subject?: string; language?: string; educationLevel?: string; province?: string }) {
    const invitationCode = nanoid(6).toUpperCase()

    // If the teacher uploaded their own cover it arrives as a base64 data URL;
    // persist it to disk and store the path instead of the raw base64 blob.
    if (data.backgroundImage && data.backgroundImage.startsWith('data:image/')) {
      data = { ...data, backgroundImage: (await saveBase64Image(data.backgroundImage, 'covers')) || undefined }
    }

    const cls = await prisma.class.create({
      data: {
        ...data,
        teacherId: userId,
        invitationCode,
      },
    })

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
      },
      message: 'Clase creada correctamente',
    }
  }

  async updateClass(
    userId: string,
    classId: string,
    data: { name?: string; narrative?: string; schedule?: string; backgroundImage?: string; subject?: string; language?: string; educationLevel?: string; province?: string; settings?: Partial<ClassSettings> }
  ) {
    const cls = await prisma.class.findFirst({
      where: { id: classId, teacherId: userId },
    })

    if (!cls) throw new Error('Clase no encontrada')

    // Persist an uploaded cover (base64 data URL) to disk before storing.
    if (data.backgroundImage && data.backgroundImage.startsWith('data:image/')) {
      data = { ...data, backgroundImage: (await saveBase64Image(data.backgroundImage, 'covers')) || undefined }
    }

    const { settings: settingsPatch, ...rest } = data

    const updated = await prisma.class.update({
      where: { id: classId },
      data: {
        ...rest,
        // Merge incoming flags over current settings, then normalize dependencies so the
        // stored config is always coherent (e.g. shop off ⇒ mana off).
        ...(settingsPatch
          ? { settings: { ...normalizeClassSettings({ ...resolveClassSettings(cls.settings), ...settingsPatch }) } }
          : {}),
      },
    })

    return {
      class: {
        id: updated.id,
        name: updated.name,
        schedule: updated.schedule,
        archived: updated.archived,
        invitationCode: updated.invitationCode,
        backgroundImage: updated.backgroundImage,
        subject: updated.subject,
        language: updated.language,
        educationLevel: updated.educationLevel,
        province: updated.province,
        settings: resolveClassSettings(updated.settings),
      },
      message: 'Clase actualizada correctamente',
    }
  }

  // ==================== MARKETPLACE DE PLANTILLAS ====================

  /** Publica/retira una clase como plantilla pública. Al publicar exige metadatos
   *  mínimos (asignatura, nivel, idioma) para que el marketplace pueda filtrarla. */
  async publishTemplate(userId: string, classId: string, publish: boolean) {
    const cls = await prisma.class.findFirst({ where: { id: classId, teacherId: userId } })
    if (!cls) throw new Error('Clase no encontrada')

    if (publish) {
      const missing: string[] = []
      if (!cls.subject) missing.push('subject')
      if (!cls.educationLevel) missing.push('educationLevel')
      if (!cls.language) missing.push('language')
      if (missing.length > 0) {
        throw new Error('Completa los metadatos de la clase (asignatura, nivel e idioma) antes de publicarla como plantilla.')
      }
    }

    await prisma.class.update({ where: { id: classId }, data: { isTemplate: publish } })
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
      where: { id: templateClassId, isTemplate: true },
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

  /** Importa una plantilla: crea una clase NUEVA del profesor copiando el "chasis"
   *  reutilizable: settings (funcionalidades), narrativa, imagen de fondo, tienda
   *  y comportamientos. Deja fuera lo que es específico del profesor original:
   *  misiones + enigmas (cada profe monta los suyos), guía, metadatos de filtro,
   *  alumnos y progreso. */
  async importTemplate(userId: string, templateClassId: string) {
    const tpl = await prisma.class.findFirst({
      where: { id: templateClassId, isTemplate: true },
      include: {
        shopItems: true,
        behaviorTemplates: true,
      },
    })
    if (!tpl) throw new Error('Plantilla no encontrada')

    const invitationCode = nanoid(6).toUpperCase()

    const created = await prisma.$transaction(
      async (tx) => {
        const newClass = await tx.class.create({
          data: {
            name: `${tpl.name} (copia)`,
            narrative: tpl.narrative,
            backgroundImage: tpl.backgroundImage,
            settings: tpl.settings as Prisma.InputJsonValue,
            teacherId: userId,
            invitationCode,
            isTemplate: false,
          },
        })

        if (tpl.shopItems.length > 0) {
          await tx.shopItem.createMany({
            data: tpl.shopItems.map((s) => ({
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

        if (tpl.behaviorTemplates.length > 0) {
          await tx.behaviorTemplate.createMany({
            data: tpl.behaviorTemplates.map((b) => ({
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

        return newClass
      },
      { timeout: 20000 }
    )

    return { class: { id: created.id, name: created.name }, message: 'Plantilla importada como nueva clase' }
  }

  async setClassArchived(userId: string, classId: string, archived: boolean) {
    const cls = await prisma.class.findFirst({
      where: { id: classId, teacherId: userId },
    })

    if (!cls) throw new Error('Clase no encontrada')
    if (cls.archived && !archived) {
      const updated = await prisma.class.update({
        where: { id: classId },
        data: { archived },
      })

      return {
        class: {
          id: updated.id,
          name: updated.name,
          schedule: updated.schedule,
          archived: updated.archived,
          invitationCode: updated.invitationCode,
          backgroundImage: updated.backgroundImage,
        },
        message: 'Clase desarchivada correctamente',
      }
    }
    if (cls.archived) throw new Error('La clase ya está archivada')

    const updated = await prisma.class.update({
      where: { id: classId },
      data: { archived },
    })

    return {
      class: {
        id: updated.id,
        name: updated.name,
        narrative: updated.narrative,
        schedule: updated.schedule,
        archived: updated.archived,
        invitationCode: updated.invitationCode,
        backgroundImage: updated.backgroundImage,
      },
      message: archived ? 'Clase archivada correctamente' : 'Clase desarchivada correctamente',
    }
  }

  async getInvitationCode(userId: string, classId: string) {
    const cls = await prisma.class.findFirst({
      where: { id: classId, teacherId: userId },
    })

    if (!cls) throw new Error('Clase no encontrada')

    return { invitationCode: cls.invitationCode }
  }

  async getClassMissions(userId: string, classId: string) {
    const cls = await prisma.class.findFirst({
      where: { id: classId, teacherId: userId },
      include: { enrollments: true },
    })

    if (!cls) throw new Error('Clase no encontrada')

    const totalStudents = cls.enrollments.length

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
    const cls = await prisma.class.findFirst({
      where: { id: classId, teacherId: userId },
      include: {
        enrollments: { include: { student: true } },
      },
    })

    if (!cls) throw new Error('Clase no encontrada')

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

    const sorted = cls.enrollments
      .map((e) => {
        const missionsCompleted = completedByStudent.get(e.student.id) || 0
        return {
          id: e.student.id,
          name: e.student.name,
          nickname: e.nickname,
          username: e.nickname || e.student.name || 'Estudiante',
          avatar: e.avatarUrl || '/app/avatars/atenea.svg',
          xp: e.xp,
          level: e.level,
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

  async generateStudentAvatar(
    teacherId: string,
    classId: string,
    studentId: string,
    data: { avatar_id: string; wardrobe_prompt: string; background_prompt: string }
  ) {
    const cls = await prisma.class.findFirst({
      where: { id: classId, teacherId },
    })
    if (!cls) throw new Error('Clase no encontrada')

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

    const updated = await prisma.classEnrollment.update({
      where: { studentId_classId: { studentId, classId } },
      data: { avatarUrl: fileUrl },
    })

    return { avatarUrl: updated.avatarUrl, message: 'Avatar del estudiante actualizado correctamente' }
  }

  // ==================== STUDENTS ====================

  async getStudents(userId: string, classId?: string) {
    const whereClause: any = { teacherId: userId }

    const classes = await prisma.class.findMany({
      where: whereClause,
      include: {
        missions: {
          include: {
            enigmas: { select: { id: true, xpReward: true } },
            badges: { select: { id: true } },
          },
        },
        enrollments: {
          include: {
            student: {
              include: {
                missionProgress: true,
                enigmaProgress: { select: { enigmaId: true } },
                earnedBadges: { select: { badgeId: true } },
              },
            },
          },
        },
      },
    })

    let students = classes.flatMap((c) => {
      // Calculate totals for this class
      const totalMissions = c.missions.length
      const missionIds = c.missions.map((m) => m.id)
      const classEnigmas = c.missions.flatMap((m) => m.enigmas)
      const classEnigmaIds = classEnigmas.map((e) => e.id)
      const totalEnigmas = classEnigmaIds.length
      const classTotalXp = classEnigmas.reduce((sum, en) => sum + (en.xpReward || 0), 0)
      const classBadgeIds = c.missions.flatMap((m) => m.badges.map((b) => b.id))
      const classTotalBadges = classBadgeIds.length

      return c.enrollments.map((e) => {
        // Filter progress to only count missions from THIS class
        const completed = e.student.missionProgress.filter(
          (p) => p.completedAt && missionIds.includes(p.missionId)
        ).length
        // Progress is enigma-based: enigmas done in this class / total enigmas in this class
        const completedEnigmas = e.student.enigmaProgress.filter((ep) =>
          classEnigmaIds.includes(ep.enigmaId)
        ).length
        const progressPercentage =
          totalEnigmas > 0 ? Math.round((completedEnigmas / totalEnigmas) * 100) : 0
        // Per-class badges earned (intersect student's badges with badges linked to this class's missions)
        const earnedBadgeIdSet = new Set(e.student.earnedBadges.map((eb) => eb.badgeId))
        const classBadgesEarned = classBadgeIds.filter((id) => earnedBadgeIdSet.has(id)).length

        return {
          id: e.student.id,
          name: e.student.name,
          username: e.nickname || e.student.email.split('@')[0],
          nickname: e.nickname,
          email: e.student.email,
          avatar: e.avatarUrl,
          highestLevel: e.level,
          totalXp: e.xp,
          classTotalXp,
          classId: c.id,
          className: c.name,
          totalMissionsCompleted: completed,
          totalMissionsAvailable: totalMissions,
          totalEnigmasCompleted: completedEnigmas,
          totalEnigmasAvailable: totalEnigmas,
          overallProgress: progressPercentage,
          badgesEarned: classBadgesEarned,
          totalBadgesAvailable: classTotalBadges,
          enrolledAt: e.enrolledAt,
          createdAt: e.student.createdAt,
        }
      })
    })

    if (classId) {
      students = students.filter((s) => s.classId === classId).map((s) => ({
        ...s,
        totalXpEarned: s.totalXp,
        totalXpAvailable: s.classTotalXp,
        totalBadgesEarned: s.badgesEarned,
        totalBadgesAvailable: s.totalBadgesAvailable,
        classIds: [s.classId],
        classCount: 1,
        classProgress: [{
          classId: s.classId,
          className: s.className,
          level: s.highestLevel,
          xp: s.totalXp,
          missionsCompleted: s.totalMissionsCompleted,
          totalMissions: s.totalMissionsAvailable,
          progress: s.overallProgress,
        }],
      }))
      return { students, total: students.length }
    }

    // For "all classes" view, aggregate data per student
    const studentMap = new Map<string, any>()

    students.forEach((s) => {
      if (studentMap.has(s.id)) {
        const existing = studentMap.get(s.id)
        // Aggregate missions, enigmas, xp and badges across classes
        existing.totalMissionsCompleted += s.totalMissionsCompleted
        existing.totalMissionsAvailable += s.totalMissionsAvailable
        existing.totalEnigmasCompleted += s.totalEnigmasCompleted
        existing.totalEnigmasAvailable += s.totalEnigmasAvailable
        existing.totalXpEarned += s.totalXp
        existing.totalXpAvailable += s.classTotalXp
        existing.totalBadgesEarned += s.badgesEarned
        existing.totalBadgesAvailable += s.totalBadgesAvailable
        // Overall progress is enigma-based across all enrolled classes
        existing.overallProgress = existing.totalEnigmasAvailable > 0
          ? Math.round((existing.totalEnigmasCompleted / existing.totalEnigmasAvailable) * 100)
          : 0
        // Keep the higher level/xp for display
        if (s.totalXp > existing.totalXp) {
          existing.totalXp = s.totalXp
          existing.highestLevel = s.highestLevel
        }
        existing.badgesEarned += s.badgesEarned
        existing.classIds.push(s.classId)
        existing.classCount += 1
        existing.classProgress.push({
          classId: s.classId,
          className: s.className,
          level: s.highestLevel,
          xp: s.totalXp,
          missionsCompleted: s.totalMissionsCompleted,
          totalMissions: s.totalMissionsAvailable,
          progress: s.overallProgress,
        })
      } else {
        studentMap.set(s.id, {
          ...s,
          totalXpEarned: s.totalXp,
          totalXpAvailable: s.classTotalXp,
          totalBadgesEarned: s.badgesEarned,
          totalBadgesAvailable: s.totalBadgesAvailable,
          classIds: [s.classId],
          classCount: 1,
          classProgress: [{
            classId: s.classId,
            className: s.className,
            level: s.highestLevel,
            xp: s.totalXp,
            missionsCompleted: s.totalMissionsCompleted,
            totalMissions: s.totalMissionsAvailable,
            progress: s.overallProgress,
          }],
        })
      }
    })

    const uniqueStudents = Array.from(studentMap.values())
    return { students: uniqueStudents, total: uniqueStudents.length }
  }

  async getStudentById(userId: string, studentId: string) {
    // Verify the student is in one of the teacher's classes
    const classes = await prisma.class.findMany({
      where: { teacherId: userId },
      include: {
        enrollments: {
          where: { studentId },
          include: { student: true },
        },
        missions: { include: { enigmas: true, badges: { select: { id: true } } } },
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
      throw new Error('Estudiante no encontrado en tus clases')
    }

    const student = enrolledClasses[0].enrollments[0].student

    // Get all mission progress for this student
    const missionProgress = await prisma.studentMissionProgress.findMany({
      where: { studentId },
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

    return {
      student: {
        id: student.id,
        name: student.name,
        email: student.email,
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
          }
        }),
      },
    }
  }

  async searchStudents(userId: string, classId: string, query: string) {
    const cls = await prisma.class.findFirst({
      where: { id: classId, teacherId: userId },
    })

    if (!cls) throw new Error('Clase no encontrada')

    // Get all students not in this class
    const enrolledStudentIds = await prisma.classEnrollment.findMany({
      where: { classId },
      select: { studentId: true },
    })

    const students = await prisma.user.findMany({
      where: {
        role: 'student',
        id: { notIn: enrolledStudentIds.map((e) => e.studentId) },
        OR: [{ name: { contains: query, mode: 'insensitive' } }, { email: { contains: query, mode: 'insensitive' } }],
      },
      take: 20,
    })

    // Check for pending requests and invitations
    const pendingRequests = await prisma.joinRequest.findMany({
      where: { classId, status: 'pending' },
    })

    const pendingInvitations = await prisma.invitation.findMany({
      where: { classId, status: 'pending' },
    })

    return {
      students: students.map((s) => ({
        id: s.id,
        name: s.name,
        email: s.email,
        avatar: null, // Avatar is per-class (assigned on enrollment)
        isEnrolled: false,
        hasPendingRequest: pendingRequests.some((r) => r.studentId === s.id),
        hasPendingInvitation: pendingInvitations.some((i) => i.studentId === s.id),
      })),
      total: students.length,
    }
  }

  // ==================== ENROLLMENTS ====================

  async getPendingRequests(userId: string, classId: string) {
    const cls = await prisma.class.findFirst({
      where: { id: classId, teacherId: userId },
    })

    if (!cls) throw new Error('Clase no encontrada')

    const requests = await prisma.joinRequest.findMany({
      where: { classId, status: 'pending' },
      include: { student: true },
      orderBy: { createdAt: 'desc' },
    })

    return {
      requests: requests.map((r) => ({
        id: r.id,
        studentId: r.studentId,
        studentName: r.student.name,
        studentAvatar: null, // Avatar assigned on enrollment
        studentEmail: r.student.email,
        message: r.message,
        createdAt: r.createdAt,
      })),
      total: requests.length,
    }
  }

  async acceptJoinRequest(userId: string, classId: string, requestId: string) {
    const cls = await prisma.class.findFirst({
      where: { id: classId, teacherId: userId },
    })

    if (!cls) throw new Error('Clase no encontrada')
    if (cls.archived) throw new Error('La clase estÃ¡ archivada y no admite nuevos alumnos')

    const request = await prisma.joinRequest.findFirst({
      where: { id: requestId, classId, status: 'pending' },
    })

    if (!request) throw new Error('Solicitud no encontrada')

    // Update request status
    await prisma.joinRequest.update({
      where: { id: requestId },
      data: { status: 'accepted' },
    })

    // Create enrollment with random avatar and nickname
    const enrollment = await prisma.classEnrollment.create({
      data: {
        studentId: request.studentId,
        classId,
        avatarUrl: getRandomAvatar(),
        nickname: getRandomNickname(),
      },
    })

    // Create activity with class-specific profile
    await prisma.activity.create({
      data: {
        userId: request.studentId,
        type: 'class_joined',
        description: `Te has unido a la clase ${cls.name}`,
        // Class-specific student profile
        avatar: enrollment.avatarUrl,
        username: enrollment.nickname || 'Estudiante',
        classId,
        className: cls.name,
        metadata: { classId },
      },
    })

    // Create notification for student
    await prisma.notification.create({
      data: {
        userId: request.studentId,
        type: 'join_accepted',
        title: 'Solicitud aceptada',
        message: `Tu solicitud para unirte a ${cls.name} ha sido aceptada`,
        actionUrl: `/student/classes/${classId}`,
      },
    })

    return { success: true, message: 'Solicitud aceptada' }
  }

  async rejectJoinRequest(userId: string, classId: string, requestId: string, reason?: string) {
    const cls = await prisma.class.findFirst({
      where: { id: classId, teacherId: userId },
    })

    if (!cls) throw new Error('Clase no encontrada')

    const request = await prisma.joinRequest.findFirst({
      where: { id: requestId, classId, status: 'pending' },
    })

    if (!request) throw new Error('Solicitud no encontrada')

    await prisma.joinRequest.update({
      where: { id: requestId },
      data: { status: 'rejected', rejectionReason: reason },
    })

    // Create notification for student
    await prisma.notification.create({
      data: {
        userId: request.studentId,
        type: 'join_rejected',
        title: 'Solicitud rechazada',
        message: reason || `Tu solicitud para unirte a ${cls.name} ha sido rechazada`,
      },
    })

    return { success: true, message: 'Solicitud rechazada' }
  }

  async sendInvitation(userId: string, classId: string, studentId: string, message?: string) {
    const cls = await prisma.class.findFirst({
      where: { id: classId, teacherId: userId },
    })

    if (!cls) throw new Error('Clase no encontrada')
    if (cls.archived) throw new Error('La clase estÃ¡ archivada y no admite nuevas invitaciones')

    // Check if already enrolled
    const existingEnrollment = await prisma.classEnrollment.findUnique({
      where: { studentId_classId: { studentId, classId } },
    })

    if (existingEnrollment) throw new Error('El estudiante ya está inscrito en esta clase')

    // Check for existing pending invitation
    const existingInvitation = await prisma.invitation.findFirst({
      where: { studentId, classId, status: 'pending' },
    })

    if (existingInvitation) throw new Error('Ya existe una invitación pendiente para este estudiante')

    const invitation = await prisma.invitation.create({
      data: {
        classId,
        teacherId: userId,
        studentId,
        message,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
      },
    })

    // Create notification for student
    await prisma.notification.create({
      data: {
        userId: studentId,
        type: 'class_invitation',
        title: 'Nueva invitación',
        message: `Has sido invitado a unirte a ${cls.name}`,
        actionUrl: `/student/invitations`,
      },
    })

    return {
      invitation: { id: invitation.id, status: invitation.status },
      success: true,
      message: 'Invitación enviada correctamente',
    }
  }

  async getSentInvitations(userId: string, classId: string) {
    const cls = await prisma.class.findFirst({
      where: { id: classId, teacherId: userId },
    })

    if (!cls) throw new Error('Clase no encontrada')

    const invitations = await prisma.invitation.findMany({
      where: { classId },
      include: { student: true },
      orderBy: { createdAt: 'desc' },
    })

    return {
      invitations: invitations.map((i) => ({
        id: i.id,
        studentId: i.studentId,
        studentName: i.student.name,
        studentEmail: i.student.email,
        status: i.status,
        message: i.message,
        expiresAt: i.expiresAt,
        createdAt: i.createdAt,
      })),
      total: invitations.length,
    }
  }

  async getTotalPendingRequests(userId: string) {
    const classes = await prisma.class.findMany({
      where: { teacherId: userId },
    })

    const classIds = classes.map((c) => c.id)

    const pendingRequests = await prisma.joinRequest.count({
      where: { classId: { in: classIds }, status: 'pending' },
    })

    return { pendingRequests }
  }

  // ==================== MISSIONS ====================

  async getMissions(userId: string, classIdFilter?: string, limit = 100) {
    const whereClause: any = {}

    if (classIdFilter) {
      // Verify ownership
      const cls = await prisma.class.findFirst({
        where: { id: classIdFilter, teacherId: userId },
      })
      if (!cls) throw new Error('Clase no encontrada')
      whereClause.classId = classIdFilter
    } else {
      const classes = await prisma.class.findMany({
        where: { teacherId: userId },
      })
      whereClause.classId = { in: classes.map((c) => c.id) }
    }

    const missions = await prisma.mission.findMany({
      where: whereClause,
      include: {
        class: {
          include: { enrollments: true },
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
      where: { teacherId: userId },
    })

    const classIds = classes.map((c) => c.id)
    const classNameMap = new Map(classes.map(c => [c.id, c.name]))

    // Get student IDs from enrollments
    const enrollments = await prisma.classEnrollment.findMany({
      where: { classId: { in: classIds } },
    })

    const studentIds = enrollments.map((e) => e.studentId)

    const activities = await prisma.activity.findMany({
      where: {
        userId: { in: studentIds },
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
        }
      }),
      total: activities.length,
    }
  }

  async getClassActivities(userId: string, classId: string, limit = 10) {
    // Verify teacher owns this class
    const cls = await prisma.class.findFirst({
      where: { id: classId, teacherId: userId },
    })

    if (!cls) throw new Error('Clase no encontrada')

    // Get student IDs enrolled in this class
    const enrollments = await prisma.classEnrollment.findMany({
      where: { classId },
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
        }
      }),
      total: activities.length,
    }
  }

  // ==================== BADGES ====================

  async getBadges(userId: string) {
    const badges = await prisma.badge.findMany({
      where: { OR: [{ teacherId: userId }, { teacherId: null }] },
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
        missionId: b.missionId,
        missionTitle: b.mission?.title,
        className: b.mission?.class?.name,
        classNarrative: b.mission?.class?.narrative,
        createdAt: b.createdAt,
      })),
      total: badges.length,
    }
  }

  async createBadge(userId: string, data: { name: string; description?: string; imageUrl?: string; rarity?: string; missionId?: string }) {
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
      where: { id: badgeId, teacherId: userId },
    })

    if (!badge) throw new Error('Insignia no encontrada')

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
      where: { id: badgeId, teacherId: userId },
    })

    if (!badge) throw new Error('Insignia no encontrada')

    await prisma.badge.delete({ where: { id: badgeId } })

    return { message: 'Insignia eliminada correctamente' }
  }

  // ==================== CLASS GUIDE ====================

  async updateClassGuide(teacherId: string, classId: string, content: string) {
    // Verify teacher owns the class
    const cls = await prisma.class.findFirst({
      where: { id: classId, teacherId },
    })

    if (!cls) throw new Error('Clase no encontrada')

    // Upsert guide (create if doesn't exist, update if it does)
    const guide = await prisma.classGuide.upsert({
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
