import { prisma } from '../../config/database.js'
import { getLevelInfo, wouldLevelUp, calculateMissionTotalXP } from '../../utils/xp-calculator.js'
import { resolveLevelConfig, tierForLevel } from '../../utils/level-config.js'
import { formatMission, getMissionStatus } from '../../utils/mission-formatter.js'
import { ensureSafeEducationalPrompt } from '../ai/ai-safety.js'
import { generateFireRedAvatar } from '../ai/generators/avatar-firered.js'
import { getAIProvider } from '../ai/providers/index.js'
import { AVATAR_PROMPTS } from '../ai/prompts/index.js'
import { AvatarServiceUnavailableError } from '../../utils/errors.js'
import { resolveClassSettings } from '../../utils/class-settings.js'
import { ForbiddenError, ValidationError } from '../../utils/errors.js'
import {
  accessibleClassesWhere,
  classTeachersInclude,
  getClassMembership,
  studentEnrollmentsWhere,
  type ClassUser,
} from '../../utils/class-access.js'
import {
  DEFAULT_AVATARS,
  enrollStudentNow,
  freeNicknamesForPreview,
  getRandomAvatar,
  participatingEnrollmentWhere,
} from '../../utils/enrollment.js'
import { activityActor } from '../../utils/activity.js'
import { assertNotManagedAccount } from '../../utils/identity-db.js'
import { changeOwnPassword } from '../../utils/password-change.js'

/** Matricularse en una clase es cosa de alumnos: el profesorado la mira con la vista previa. */
function assertStudentRole(user: ClassUser) {
  if (user.role !== 'student') {
    throw new ForbiddenError('Solo el alumnado puede unirse a una clase')
  }
}

export { AvatarServiceUnavailableError }

function hashText(content: string) {
  return Array.from(content).reduce((acc, char) => (acc * 31 + char.charCodeAt(0)) >>> 0, 7)
}

function pickAvatarFromPrompt(prompt: string) {
  const normalizedPrompt = prompt
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')

  const avatarByKeyword = [
    { keywords: ['sabiduria', 'estudio', 'ciencia', 'matematica', 'estrategia'], avatar: '/app/avatars/atenea.svg' },
    { keywords: ['aventura', 'viaje', 'mar', 'exploracion', 'odisea'], avatar: '/app/avatars/odiseo.svg' },
    { keywords: ['calma', 'paciencia', 'lectura', 'arte', 'creatividad'], avatar: '/app/avatars/penelope.svg' },
    { keywords: ['fuerza', 'reto', 'poder', 'batalla', 'desafio'], avatar: '/app/avatars/polifemo.svg' },
    { keywords: ['oceano', 'tormenta', 'agua', 'energia', 'tempestad'], avatar: '/app/avatars/poseidon.svg' },
  ]

  const matchedAvatar = avatarByKeyword.find(({ keywords }) =>
    keywords.some((keyword) => normalizedPrompt.includes(keyword))
  )

  if (matchedAvatar) {
    return matchedAvatar.avatar
  }

  return DEFAULT_AVATARS[hashText(normalizedPrompt) % DEFAULT_AVATARS.length]
}

export class StudentsService {
  // ==================== PROFILE ====================

  async getProfile(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        earnedBadges: { include: { badge: true } },
        enrollments: true, // Get all enrollments to calculate total XP
      },
    })

    if (!user) throw new Error('Cuenta no encontrada')

    // Aggregate XP across all classes for profile display
    const totalXp = user.enrollments.reduce((sum, e) => sum + e.xp, 0)
    const levelInfo = getLevelInfo(totalXp)

    return {
      id: user.id,
      email: user.email,
      username: user.username,
      accountType: user.accountType,
      name: user.name,
      firstName: user.name.split(' ')[0],
      lastName: user.name.split(' ').slice(1).join(' ') || '',
      bio: null,
      // XP/level is per-class, but for profile we show aggregated stats
      // Avatar is also per-class (in enrollment)
      badges: user.earnedBadges.map((eb) => ({
        id: eb.badge.id,
        name: eb.badge.name,
        imageUrl: eb.badge.imageUrl,
        earnedAt: eb.earnedAt,
      })),
      stats: {
        totalXp,
        totalBadges: user.earnedBadges.length,
        classesEnrolled: user.enrollments.length,
      },
    }
  }

  async updateProfile(userId: string, data: { firstName?: string; lastName?: string; bio?: string }) {
    const updateData: any = {}
    if (data.firstName || data.lastName) {
      // El nombre de una cuenta gestionada lo lleva su profesorado: es el nombre
      // con el que le identifica en clase, y aquí se rechaza cambiarlo.
      await assertNotManagedAccount(userId, 'no puede cambiar su nombre')
      updateData.name = `${data.firstName || ''} ${data.lastName || ''}`.trim()
    }

    const user = await prisma.user.update({
      where: { id: userId },
      data: updateData,
    })

    return {
      id: user.id,
      name: user.name,
      username: user.username,
    }
  }

  // Avatar is per-class, updated via enrollment
  async generateAvatar(_userId: string, prompt: string) {
    const safePrompt = ensureSafeEducationalPrompt(prompt)

    // Use DiceBear API to generate a unique avatar based on the prompt seed
    const seed = encodeURIComponent(safePrompt.slice(0, 50))
    const style = 'adventurer' // Greek/adventure style fits ITAKAI theme
    const avatarUrl = `https://api.dicebear.com/7.x/${style}/svg?seed=${seed}&backgroundColor=b6e3f4,c0aede,d1d4f9,ffd5dc,ffdfbf`

    return { avatarUrl, message: 'Avatar generado correctamente' }
  }

  /** Cambio de contraseña del alumnado; el camino es el mismo para todos (utils/password-change.ts). */
  async changePassword(
    userId: string,
    data: { currentPassword: string; newPassword: string; confirmPassword: string },
    currentTokenFamily?: string
  ) {
    if (data.newPassword !== data.confirmPassword) {
      throw new ValidationError('Las contraseñas no coinciden', 'PASSWORD_MISMATCH')
    }

    const result = await changeOwnPassword(
      userId,
      { currentPassword: data.currentPassword, newPassword: data.newPassword },
      { keepSessionFamily: currentTokenFamily }
    )

    return { message: result.message }
  }

  // ==================== CLASSES ====================

  async getClasses(user: ClassUser) {
    const enrollments = await prisma.classEnrollment.findMany({
      where: studentEnrollmentsWhere(user),
      include: {
        class: {
          include: {
            teacher: true,
            missions: true,
            enrollments: { where: { isPreview: false, AND: [participatingEnrollmentWhere] } },
          },
        },
      },
    })

    const activeEnrollments = enrollments.filter((e) => !e.class.archived)

    return {
      classes: activeEnrollments.map((e) => ({
        id: e.class.id,
        name: e.class.name,
        schedule: e.class.schedule,
        scheduleConfig: e.class.scheduleConfig,
        archived: e.class.archived,
        teacherName: e.class.teacher.name,
        backgroundImage: e.class.backgroundImage,
        settings: resolveClassSettings(e.class.settings),
        studentCount: e.class.enrollments.length,
        totalMissions: e.class.missions.length,
        coins: e.coins,
        mana: e.mana,
        lives: e.lives,
        enrolledAt: e.enrolledAt,
      })),
      total: activeEnrollments.length,
    }
  }

  async getClassById(userId: string, classId: string) {
    const enrollment = await prisma.classEnrollment.findUnique({
      where: { studentId_classId: { studentId: userId, classId } },
      include: {
        class: {
          include: {
            teacher: true,
            missions: { include: { enigmas: true } },
            enrollments: { where: { isPreview: false, AND: [participatingEnrollmentWhere] } },
            guide: true,
            teachers: classTeachersInclude(),
          },
        },
      },
    })

    if (!enrollment) throw new Error('No estás en esta clase')
    // Clase archivada: el alumno pierde el acceso aunque conserve el link.
    if (enrollment.class.archived) throw new Error('Esta clase está archivada y ya no está disponible')

    const cls = enrollment.class

    // Get student's mission progress for this class
    const missionProgress = await prisma.studentMissionProgress.findMany({
      where: {
        studentId: userId,
        mission: { classId },
      },
    })

    const missionsCompleted = missionProgress.filter((p) => p.completedAt !== null).length
    const missionsTotal = cls.missions.length

    // Calculate enigmas and XP (consistent with mission cards)
    const totalEnigmas = cls.missions.reduce((sum, m) => sum + m.enigmas.length, 0)
    const totalXpPotential = cls.missions.reduce(
      (sum, m) => sum + calculateMissionTotalXP(m.rarity, m.enigmas.map(e => e.xpReward)),
      0
    )

    // Use StudentMissionProgress.enigmasCompleted (same as mission cards)
    const completedEnigmas = missionProgress.reduce((sum, p) => sum + p.enigmasCompleted, 0)
    const completionRate = totalEnigmas > 0 ? Math.round((completedEnigmas / totalEnigmas) * 100) : 0

    // Earned XP = the per-class wallet (single source of truth, kept in sync by
    // applyXpDelta and the reward-recompute). Includes mission-completion bonuses.
    const xpEarned = enrollment.xp

    // Get class-specific badges (associated with missions in this class)
    const classBadges = await prisma.badge.count({
      where: { mission: { classId } },
    })
    const earnedClassBadges = await prisma.studentBadge.count({
      where: {
        studentId: userId,
        badge: { mission: { classId } },
      },
    })

    return {
      id: cls.id,
      name: cls.name,
      narrative: cls.narrative,
      schedule: cls.schedule,
      scheduleConfig: cls.scheduleConfig,
      teacherName: cls.teacher.name,
      // Quién imparte la clase, con su perfil; también quien está en prácticas,
      // que ve los datos del alumnado. Sin correo ni nivel de acceso.
      teachers: cls.teachers.map(t => ({
        name: t.user.name,
        profile: t.profile,
        isOwner: t.isOwner,
      })),
      archived: cls.archived,
      backgroundImage: cls.backgroundImage,
      subject: cls.subject,
      language: cls.language,
      educationLevel: cls.educationLevel,
      settings: resolveClassSettings(cls.settings),
      // Sin código de invitación: desde este lado entra también la vista previa
      // del profesorado, y el código es solo de quien administra la clase.
      studentCount: cls.enrollments.length,
      missionCount: cls.missions.length,
      coins: enrollment.coins,
      mana: enrollment.mana,
      lives: enrollment.lives,
      createdAt: cls.createdAt,
      updatedAt: cls.updatedAt,
      studentProgress: {
        completionRate,
        missionsCompleted,
        missionsTotal,
        enigmasCompleted: completedEnigmas,
        enigmasTotal: totalEnigmas,
        xpEarned,
        xpTotal: totalXpPotential,
        badgesEarned: earnedClassBadges,
        badgesTotal: classBadges,
      },
    }
  }

  async getClassMissions(userId: string, classId: string) {
    // Verify enrollment
    const enrollment = await prisma.classEnrollment.findUnique({
      where: { studentId_classId: { studentId: userId, classId } },
    })
    if (!enrollment) throw new Error('No estás en esta clase')

    const missions = await prisma.mission.findMany({
      // Si la clase está archivada, sus misiones no se listan para el alumno.
      where: { classId, class: { archived: false } },
      include: {
        enigmas: {
          include: { progress: { where: { studentId: userId } } },
        },
        progress: { where: { studentId: userId } },
        class: true,
      },
      orderBy: { createdAt: 'desc' },
    })

    return {
      missions: missions.map((m) => formatMission(m, false, resolveClassSettings(m.class.settings))),
      total: missions.length,
    }
  }

  async getClassGuide(user: ClassUser, classId: string) {
    // La guía la leen el alumnado matriculado y el profesorado de la clase.
    if (!(await getClassMembership(classId, user))) {
      throw new Error('No tienes acceso a esta clase')
    }

    // Get class guide content
    const guide = await prisma.classGuide.findUnique({
      where: { classId },
    })

    return {
      guide: guide
        ? {
            id: guide.id,
            content: guide.content,
            lastUpdated: guide.lastUpdated,
          }
        : null,
    }
  }

  async getClassGamification(userId: string, classId: string) {
    // Get user's enrollment in this class (XP/level is per-class)
    const enrollment = await prisma.classEnrollment.findUnique({
      where: { studentId_classId: { studentId: userId, classId } },
      include: {
        student: true,
        class: {
          include: {
            missions: { include: { enigmas: true } },
          },
        },
      },
    })

    if (!enrollment) throw new Error('No estás en esta clase')

    // Get mission progress to calculate completed enigmas (consistent with mission cards)
    const missionProgress = await prisma.studentMissionProgress.findMany({
      where: {
        studentId: userId,
        mission: { classId },
      },
    })

    // Calculate totals
    const totalEnigmas = enrollment.class.missions.reduce((sum, m) => sum + m.enigmas.length, 0)
    const totalXpPotential = enrollment.class.missions.reduce(
      (sum, m) => sum + calculateMissionTotalXP(m.rarity, m.enigmas.map(e => e.xpReward)),
      0
    )

    // Completed enigmas from StudentMissionProgress (same as mission cards)
    const completedEnigmas = missionProgress.reduce((sum, p) => sum + p.enigmasCompleted, 0)

    // Per-class XP is the single source of truth: it's kept in sync by
    // applyXpDelta on every approval/revocation and shared with the ranking, so
    // the header and the ranking can never disagree. Level is derived from it.
    const xpEarned = enrollment.xp

    // Get ranking in class (order by enrollment XP)
    const classStudents = await prisma.classEnrollment.findMany({
      where: { classId, isPreview: false, AND: [participatingEnrollmentWhere] },
      orderBy: { xp: 'desc' },
    })

    const rank = classStudents.findIndex((e) => e.studentId === userId) + 1
    // El nivel/título/color del alumno se calcula con la config de SU clase.
    const levelCfg = resolveLevelConfig(enrollment.class.levelConfig)
    const levelInfo = getLevelInfo(xpEarned, levelCfg)
    // Get next level title by calculating XP for next level
    const nextLevelXp = levelInfo.totalXP + levelInfo.requiredXP
    const nextLevelInfo = getLevelInfo(nextLevelXp, levelCfg)

    return {
      classId,
      xp: xpEarned,
      xpTotal: totalXpPotential,
      coins: enrollment.coins,
      lives: enrollment.lives,
      level: levelInfo.level,
      title: levelInfo.title,
      color: levelInfo.color,
      // Curva + tramos de la clase, para que el front calcule niveles/colores igual.
      levelConfig: levelCfg,
      nextTitle: nextLevelInfo.title,
      progress: levelInfo.progress,
      currentXP: levelInfo.currentXP,
      requiredXP: levelInfo.requiredXP,
      rank,
      totalStudents: classStudents.length,
      name: enrollment.student.name,
      username: enrollment.nickname,
      nickname: enrollment.nickname,
      avatar: enrollment.avatarUrl,
      // Progress info (consistent with mission cards)
      enigmasCompleted: completedEnigmas,
      enigmasTotal: totalEnigmas,
    }
  }

  async getClassRanking(userId: string, classId: string, filter?: string) {

    // Order by enrollment XP (per-class XP)
    const enrollments = await prisma.classEnrollment.findMany({
      where: { classId, isPreview: false, AND: [participatingEnrollmentWhere] },
      include: { student: true },
      orderBy: { xp: 'desc' },
    })

    // Config de niveles de la clase → título/color del tramo por alumno.
    const clsRow = await prisma.class.findUnique({ where: { id: classId }, select: { levelConfig: true } })
    const levelCfg = resolveLevelConfig(clsRow?.levelConfig)

    // Get total missions in this class
    const missionsCount = await prisma.mission.count({
      where: { classId },
    })

    // Get completed missions per student (completedAt is not null means completed)
    const completedMissionsMap = new Map<string, number>()
    const missionProgress = await prisma.studentMissionProgress.findMany({
      where: {
        mission: { classId },
        completedAt: { not: null },
      },
      select: { studentId: true },
    })
    for (const mp of missionProgress) {
      completedMissionsMap.set(mp.studentId, (completedMissionsMap.get(mp.studentId) || 0) + 1)
    }

    const leaderboard = enrollments.map((e, index) => {
      const missionsCompleted = completedMissionsMap.get(e.student.id) || 0
      const completionPercent = missionsCount > 0 ? Math.round((missionsCompleted / missionsCount) * 100) : 0

      const tier = tierForLevel(e.level, levelCfg)
      return {
        id: e.student.id,
        username: e.nickname || e.student.name,
        avatar: e.avatarUrl || '/app/avatars/atenea.svg',
        rank: index + 1,
        xp: e.xp,
        level: e.level,
        levelTitle: tier.title,
        levelColor: tier.color,
        missionsCompleted,
        missionsTotal: missionsCount,
        completionPercent,
        isCurrentUser: e.student.id === userId,
      }
    })

    const currentUserRank = leaderboard.find((l) => l.isCurrentUser)

    // Calculate stats
    const totalStudents = leaderboard.length
    const totalXp = leaderboard.reduce((sum, l) => sum + l.xp, 0)
    const avgXp = totalStudents > 0 ? Math.round(totalXp / totalStudents) : 0
    const totalProgress = leaderboard.reduce((sum, l) => sum + l.completionPercent, 0)
    const avgProgress = totalStudents > 0 ? Math.round(totalProgress / totalStudents) : 0
    const totalMissionsCompleted = leaderboard.reduce((sum, l) => sum + l.missionsCompleted, 0)
    const avgMissionsNum = totalStudents > 0 ? Math.round(totalMissionsCompleted / totalStudents) : 0
    const avgMissions = `${avgMissionsNum}/${missionsCount}`

    return {
      podium: leaderboard.slice(0, 3),
      leaderboard: leaderboard.slice(3),
      stats: {
        avgXp,
        avgProgress,
        avgMissions,
        totalXp,
        totalStudents,
      },
      filters: [
        { id: 'general', label: 'General' },
        { id: 'esta_semana', label: 'Esta Semana' },
        { id: 'misiones', label: 'Misiones' },
        { id: 'xp_ganado', label: 'XP Ganado' },
      ],
      currentUserRank,
    }
  }

  async updateClassProfile(userId: string, classId: string, data: { nickname?: string | null; avatarUrl?: string | null }) {
    // Verify enrollment
    const enrollment = await prisma.classEnrollment.findUnique({
      where: { studentId_classId: { studentId: userId, classId } },
    })

    if (!enrollment) throw new Error('No estás en esta clase')

    // Update the enrollment with new profile data (nickname and avatarUrl which can be preset or AI-generated)
    const updated = await prisma.classEnrollment.update({
      where: { studentId_classId: { studentId: userId, classId } },
      data: {
        nickname: data.nickname !== undefined ? data.nickname : enrollment.nickname,
        avatarUrl: data.avatarUrl !== undefined ? data.avatarUrl : enrollment.avatarUrl,
      },
    })

    return {
      nickname: updated.nickname,
      avatarUrl: updated.avatarUrl,
      message: 'Perfil de clase actualizado correctamente',
    }
  }

  async generateClassAvatar(
    userId: string,
    classId: string,
    data:
      | { avatar_id: string; prompt: string; wardrobe_prompt?: undefined; background_prompt?: undefined }
      | { avatar_id: string; wardrobe_prompt: string; background_prompt: string; prompt?: undefined }
  ) {
    // Fetch enrollment and class narrative in parallel
    const [enrollment, cls] = await Promise.all([
      prisma.classEnrollment.findUnique({
        where: { studentId_classId: { studentId: userId, classId } },
      }),
      prisma.class.findUnique({
        where: { id: classId },
        select: { name: true, narrative: true },
      }),
    ])

    if (!enrollment) throw new Error('No estás en esta clase')

    let wardrobe_prompt = data.wardrobe_prompt ?? ''
    let background_prompt = data.background_prompt ?? ''

    // If the caller provided a free-text prompt, use AI to split it
    // incorporating the class narrative so the avatar fits the class world
    if (data.prompt) {
      const provider = getAIProvider()

      // Build narrative context block for the AI
      const narrativeContext = cls?.narrative
        ? `CLASS NARRATIVE (the world this avatar lives in):\n${cls.narrative}`
        : ''

      const classHint = narrativeContext
        ? `\n\nIMPORTANT: The avatar must visually fit the class world described below. Use its themes, aesthetics, and setting to inform clothing and environment choices.\n${narrativeContext}`
        : ''

      const [wardrobeRaw, backgroundRaw] = await Promise.all([
        provider.generateText(data.prompt, { systemPrompt: AVATAR_PROMPTS.wardrobe(classHint) }),
        provider.generateText(data.prompt, { systemPrompt: AVATAR_PROMPTS.background(classHint) }),
      ])

      wardrobe_prompt = wardrobeRaw.trim()
      background_prompt = backgroundRaw.trim()
    }

    let fileUrl: string
    try {
      ({ fileUrl } = await generateFireRedAvatar({
        avatar_id: data.avatar_id,
        wardrobe_prompt,
        background_prompt,
      }))
    } catch (err) {
      const detail = err instanceof Error ? err.message : String(err)
      console.error('[AI] Avatar customization unavailable:', detail)
      throw new AvatarServiceUnavailableError(detail)
    }

    const updated = await prisma.classEnrollment.update({
      where: { studentId_classId: { studentId: userId, classId } },
      data: { avatarUrl: fileUrl },
    })

    return { avatarUrl: updated.avatarUrl, message: 'Avatar generado correctamente' }
  }

  async getClassBadges(userId: string, classId: string) {
    // Verify enrollment
    const enrollment = await prisma.classEnrollment.findUnique({
      where: { studentId_classId: { studentId: userId, classId } },
    })

    if (!enrollment) throw new Error('No estás en esta clase')

    // Get badges associated with missions in this class
    const classBadges = await prisma.badge.findMany({
      where: {
        mission: { classId },
      },
    })

    // Get student's earned badges
    const earnedBadges = await prisma.studentBadge.findMany({
      where: {
        studentId: userId,
        badgeId: { in: classBadges.map((b) => b.id) },
      },
    })

    const earnedBadgeIds = new Set(earnedBadges.map((eb) => eb.badgeId))

    return {
      badges: classBadges.map((badge) => {
        const earned = earnedBadges.find((eb) => eb.badgeId === badge.id)
        return {
          id: badge.id,
          name: badge.name,
          description: badge.description,
          imageUrl: badge.imageUrl,
          rarity: badge.rarity,
          category: badge.category,
          unlocked: earnedBadgeIds.has(badge.id),
          unlockedAt: earned?.earnedAt ?? null,
        }
      }),
      stats: {
        total: classBadges.length,
        unlocked: earnedBadges.length,
      },
    }
  }

  async getClassActivities(userId: string, classId: string, offset = 0, limit = 5) {
    // Verify enrollment
    const enrollment = await prisma.classEnrollment.findUnique({
      where: { studentId_classId: { studentId: userId, classId } },
    })

    if (!enrollment) throw new Error('No estás en esta clase')

    // Get activities related to this class (filter by classId field)
    const activities = await prisma.activity.findMany({
      where: {
        userId,
        classId,
      },
      orderBy: { createdAt: 'desc' },
      skip: offset,
      take: limit,
    })

    return {
      activities: activities.map((a) => ({
        id: a.id,
        type: a.type,
        timestamp: a.createdAt,
        // Class-specific student profile (from Activity model directly)
        avatar: a.avatar,
        username: a.username,
        classId: a.classId,
        className: a.className,
        teacherName: a.teacherName,
        actor: activityActor(a),
        // Activity-specific fields (from Activity model directly)
        enigmaTitle: a.enigmaTitle,
        enigmaXp: a.enigmaXp,
        missionTitle: a.missionTitle,
        missionXp: a.missionXp,
        newLevel: a.newLevel,
        newTitle: a.newTitle,
        badgeName: a.badgeName,
        badgeRarity: a.badgeRarity,
        badgeImage: a.badgeImage,
        achievementName: a.achievementName,
        xpAmount: a.xpAmount,
        source: a.source,
        metadata: a.metadata,
      })),
      total: activities.length,
    }
  }

  /**
   * Matrícula "fantasma" para el modo "Ver como alumno": auto-matricula al
   * profesor (isPreview=true) en todas las clases a las que tiene acceso, con
   * cualquier nivel, de forma idempotente. Estas matrículas se excluyen de
   * listados/recuentos/rankings, así que solo las ve el propio profesor al
   * previsualizar.
   */
  async ensurePreviewEnrollments(userId: string) {
    // Solo se crean las que faltan: una matrícula que ya existía se deja como
    // está, porque es la que cuenta en el ranking y en los listados de la clase.
    const toCreate = await prisma.class.findMany({
      where: { ...accessibleClassesWhere(userId), enrollments: { none: { studentId: userId } } },
      select: { id: true },
    })

    if (toCreate.length) {
      // Un alias que no tenga nadie de la clase, para no verse repetido en ella.
      const nicknames = await freeNicknamesForPreview(toCreate.map(c => c.id))
      await prisma.classEnrollment.createMany({
        data: toCreate.map(c => ({
          studentId: userId,
          classId: c.id,
          isPreview: true,
          avatarUrl: getRandomAvatar(),
          nickname: nicknames.get(c.id),
        })),
        skipDuplicates: true,
      })
    }
    return { enrolled: toCreate.length }
  }

  async joinClass(user: ClassUser, code: string) {
    assertStudentRole(user)
    const userId = user.id
    const cls = await prisma.class.findUnique({
      where: { invitationCode: code },
    })

    if (!cls) throw new Error('Código de clase inválido')
    if (cls.archived) throw new Error('Esta clase está archivada y no admite más estudiantes')

    const existingEnrollment = await prisma.classEnrollment.findUnique({
      where: { studentId_classId: { studentId: userId, classId: cls.id } },
    })

    if (existingEnrollment) throw new Error('Ya estás en esta clase')

    await enrollStudentNow({ studentId: userId, classId: cls.id, className: cls.name })

    return {
      // Incluimos los settings resueltos para que el front pueda decidir si
      // celebra con confeti/sonido al unirse (gates visualEffects/sounds).
      class: { id: cls.id, name: cls.name, settings: resolveClassSettings(cls.settings) },
      success: true,
      message: 'Te has unido a la clase correctamente',
    }
  }

  // ==================== MISSIONS ====================

  async getMissions(user: ClassUser) {
    const userId = user.id
    const enrollments = await prisma.classEnrollment.findMany({
      where: studentEnrollmentsWhere(user),
    })

    const classIds = enrollments.map((e) => e.classId)

    const missions = await prisma.mission.findMany({
      // Las misiones de clases archivadas no aparecen en el listado del alumno.
      where: { classId: { in: classIds }, class: { archived: false } },
      include: {
        enigmas: {
          include: { progress: { where: { studentId: userId } } },
        },
        progress: { where: { studentId: userId } },
        class: true,
      },
      orderBy: { createdAt: 'desc' },
    })

    return {
      missions: missions.map((m) => formatMission(m, true, resolveClassSettings(m.class.settings))),
      total: missions.length,
    }
  }

  // ==================== BADGES & ACHIEVEMENTS ====================

  async getBadges(user: ClassUser, filter?: string, category?: string) {
    const userId = user.id
    const categoryLabels: Record<string, string> = {
      streak: 'Rachas',
      missions: 'Misiones',
      level: 'Nivel',
      performance: 'Rendimiento',
      xp: 'Experiencia',
      exploration: 'Exploración',
      social: 'Social',
    }

    const earnedBadges = await prisma.studentBadge.findMany({
      where: { studentId: userId },
      include: { badge: true },
    })

    // Get class IDs the student is enrolled in
    const enrollments = await prisma.classEnrollment.findMany({
      where: studentEnrollmentsWhere(user),
      select: { classId: true },
    })
    const classIds = enrollments.map(e => e.classId)

    // Get mission IDs from those classes
    const missions = await prisma.mission.findMany({
      where: { classId: { in: classIds } },
      select: { id: true },
    })
    const missionIds = missions.map(m => m.id)

    // A student only sees:
    //  - System badges (teacher_id IS NULL): global, auto-unlock by XP/level/missions.
    //  - Badges linked to missions in their enrolled classes.
    // Teacher-owned badges with no mission attached are unreachable (there's
    // no automatic trigger), so we hide them from every student.
    const allBadges = await prisma.badge.findMany({
      where: {
        OR: [
          { teacherId: null },
          { missionId: { in: missionIds } },
        ],
      },
      orderBy: { name: 'asc' },
    })

    const badges = allBadges.map((badge) => {
      const earned = earnedBadges.find((eb) => eb.badgeId === badge.id)
      return {
        id: badge.id,
        name: badge.name,
        description: badge.description,
        imageUrl: badge.imageUrl,
        rarity: badge.rarity,
        category: badge.category,
        unlocked: !!earned,
        unlockedAt: earned?.earnedAt ?? null,
      }
    })

    let filteredBadges = badges
    if (filter === 'unlocked') {
      filteredBadges = badges.filter((b) => b.unlocked)
    } else if (filter === 'locked') {
      filteredBadges = badges.filter((b) => !b.unlocked)
    }

    if (category && category !== 'all') {
      filteredBadges = filteredBadges.filter((b) => b.category === category)
    }

    // Build categories with counts
    const uniqueCategories = [...new Set(allBadges.map((b) => b.category))]
    const categories = uniqueCategories.map((cat) => ({
      id: cat,
      name: categoryLabels[cat] || cat,
      count: allBadges.filter((b) => b.category === cat).length,
    }))

    return {
      badges: filteredBadges,
      total: filteredBadges.length,
      stats: {
        total: allBadges.length,
        unlocked: earnedBadges.length,
        locked: allBadges.length - earnedBadges.length,
      },
      categories,
      filter: filter || 'all',
      category: category || 'all',
    }
  }


  // ==================== ACTIVITIES ====================

  async getActivities(userId: string, limit = 10) {
    const activities = await prisma.activity.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    })

    return {
      activities: activities.map((a) => {
        return {
          id: a.id,
          type: a.type,
          timestamp: a.createdAt,
          // Class-specific student profile (from Activity model directly)
          avatar: a.avatar,
          username: a.username,
          classId: a.classId,
          className: a.className,
          teacherName: a.teacherName,
          actor: activityActor(a),
          // Activity-specific fields (from Activity model directly)
          enigmaTitle: a.enigmaTitle,
          enigmaXp: a.enigmaXp,
          missionTitle: a.missionTitle,
          missionXp: a.missionXp,
          newLevel: a.newLevel,
          newTitle: a.newTitle,
          badgeName: a.badgeName,
          badgeRarity: a.badgeRarity,
          badgeImage: a.badgeImage,
          achievementName: a.achievementName,
          xpAmount: a.xpAmount,
          source: a.source,
          metadata: a.metadata,
        }
      }),
      total: activities.length,
    }
  }
}

export const studentsService = new StudentsService()
