import { prisma } from '../../config/database.js'
import { getLevelInfo, wouldLevelUp, calculateMissionTotalXP } from '../../utils/xp-calculator.js'
import { hashPassword, verifyPassword } from '../../utils/password.js'
import { formatMission, getMissionStatus } from '../../utils/mission-formatter.js'
import { ensureSafeEducationalPrompt } from '../ai/ai-safety.js'
import { generateFireRedAvatar } from '../ai/generators/avatar-firered.js'
import { getAIProvider } from '../ai/providers/index.js'
import { AVATAR_PROMPTS } from '../ai/prompts/index.js'
import { AvatarServiceUnavailableError } from '../../utils/errors.js'
import { resolveClassSettings } from '../../utils/class-settings.js'

export { AvatarServiceUnavailableError }

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

    if (!user) throw new Error('Usuario no encontrado')

    // Aggregate XP across all classes for profile display
    const totalXp = user.enrollments.reduce((sum, e) => sum + e.xp, 0)
    const levelInfo = getLevelInfo(totalXp)

    return {
      id: user.id,
      email: user.email,
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
      updateData.name = `${data.firstName || ''} ${data.lastName || ''}`.trim()
    }

    const user = await prisma.user.update({
      where: { id: userId },
      data: updateData,
    })

    return {
      id: user.id,
      name: user.name,
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

  async changePassword(userId: string, data: { currentPassword: string; newPassword: string; confirmPassword: string }) {
    if (data.newPassword !== data.confirmPassword) {
      throw new Error('Las contraseñas no coinciden')
    }

    const user = await prisma.user.findUnique({ where: { id: userId } })
    if (!user) throw new Error('Usuario no encontrado')

    const isValid = await verifyPassword(data.currentPassword, user.passwordHash)
    if (!isValid) throw new Error('Contraseña actual incorrecta')

    const newHash = await hashPassword(data.newPassword)
    await prisma.user.update({
      where: { id: userId },
      data: { passwordHash: newHash },
    })

    return { message: 'Contraseña actualizada correctamente' }
  }

  // ==================== CLASSES ====================

  async getClasses(userId: string) {
    const enrollments = await prisma.classEnrollment.findMany({
      where: { studentId: userId },
      include: {
        class: {
          include: {
            teacher: true,
            missions: true,
            enrollments: true,
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
            enrollments: true,
            guide: true,
          },
        },
      },
    })

    if (!enrollment) throw new Error('No estás inscrito en esta clase')

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
      teacherName: cls.teacher.name,
      archived: cls.archived,
      backgroundImage: cls.backgroundImage,
      subject: cls.subject,
      language: cls.language,
      educationLevel: cls.educationLevel,
      settings: resolveClassSettings(cls.settings),
      invitationCode: cls.invitationCode,
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
    if (!enrollment) throw new Error('No estás inscrito en esta clase')

    const missions = await prisma.mission.findMany({
      where: { classId },
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

  async getClassGuide(userId: string, classId: string) {
    // Check if user is enrolled as student OR is the teacher of the class
    const [enrollment, classAsTeacher] = await Promise.all([
      prisma.classEnrollment.findUnique({
        where: { studentId_classId: { studentId: userId, classId } },
      }),
      prisma.class.findFirst({
        where: { id: classId, teacherId: userId },
      }),
    ])

    if (!enrollment && !classAsTeacher) {
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

    if (!enrollment) throw new Error('No estás inscrito en esta clase')

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
      where: { classId },
      orderBy: { xp: 'desc' },
    })

    const rank = classStudents.findIndex((e) => e.studentId === userId) + 1
    const levelInfo = getLevelInfo(xpEarned)
    // Get next level title by calculating XP for next level
    const nextLevelXp = levelInfo.totalXP + levelInfo.requiredXP
    const nextLevelInfo = getLevelInfo(nextLevelXp)

    return {
      classId,
      xp: xpEarned,
      xpTotal: totalXpPotential,
      coins: enrollment.coins,
      lives: enrollment.lives,
      level: levelInfo.level,
      title: levelInfo.title,
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
      where: { classId },
      include: { student: true },
      orderBy: { xp: 'desc' },
    })

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

      return {
        id: e.student.id,
        username: e.nickname || e.student.name,
        avatar: e.avatarUrl || '/app/avatars/atenea.svg',
        rank: index + 1,
        xp: e.xp,
        level: e.level,
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

    if (!enrollment) throw new Error('No estás inscrito en esta clase')

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

    if (!enrollment) throw new Error('No estás inscrito en esta clase')

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

    if (!enrollment) throw new Error('No estás inscrito en esta clase')

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

    if (!enrollment) throw new Error('No estás inscrito en esta clase')

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

  async joinClass(userId: string, code: string) {
    const cls = await prisma.class.findUnique({
      where: { invitationCode: code },
    })

    if (!cls) throw new Error('Código de clase inválido')
    if (cls.archived) throw new Error('Esta clase está archivada y no admite nuevos alumnos')

    const existingEnrollment = await prisma.classEnrollment.findUnique({
      where: { studentId_classId: { studentId: userId, classId: cls.id } },
    })

    if (existingEnrollment) throw new Error('Ya estás inscrito en esta clase')

    // Create enrollment with random avatar and nickname
    const enrollment = await prisma.classEnrollment.create({
      data: {
        studentId: userId,
        classId: cls.id,
        avatarUrl: getRandomAvatar(),
        nickname: getRandomNickname(),
      },
    })

    // Create activity with class-specific profile
    await prisma.activity.create({
      data: {
        userId,
        type: 'class_joined',
        description: `Te has unido a la clase ${cls.name}`,
        // Class-specific student profile
        avatar: enrollment.avatarUrl,
        username: enrollment.nickname || 'Estudiante',
        classId: cls.id,
        className: cls.name,
        metadata: { classId: cls.id },
      },
    })

    return {
      // Incluimos los settings resueltos para que el front pueda decidir si
      // celebra con confeti/sonido al unirse (gates visualEffects/sounds).
      class: { id: cls.id, name: cls.name, settings: resolveClassSettings(cls.settings) },
      success: true,
      message: 'Te has unido a la clase correctamente',
    }
  }

  async createJoinRequest(userId: string, code: string, message?: string) {
    const cls = await prisma.class.findUnique({
      where: { invitationCode: code },
    })

    if (!cls) throw new Error('Código de clase inválido')
    if (cls.archived) throw new Error('Esta clase está archivada y no admite nuevas solicitudes')

    const existingEnrollment = await prisma.classEnrollment.findUnique({
      where: { studentId_classId: { studentId: userId, classId: cls.id } },
    })

    if (existingEnrollment) throw new Error('Ya estás inscrito en esta clase')

    const existingRequest = await prisma.joinRequest.findFirst({
      where: { studentId: userId, classId: cls.id, status: 'pending' },
    })

    if (existingRequest) throw new Error('Ya tienes una solicitud pendiente para esta clase')

    const request = await prisma.joinRequest.create({
      data: {
        studentId: userId,
        classId: cls.id,
        message,
      },
    })

    return {
      request: { id: request.id, status: request.status },
      success: true,
      message: 'Solicitud enviada correctamente',
    }
  }

  // ==================== ENROLLMENTS ====================

  async getJoinRequests(userId: string) {
    const requests = await prisma.joinRequest.findMany({
      where: { studentId: userId },
      include: { class: { include: { teacher: true } } },
      orderBy: { createdAt: 'desc' },
    })

    return {
      requests: requests.map((r) => ({
        id: r.id,
        classId: r.classId,
        className: r.class.name,
        teacherName: r.class.teacher.name,
        status: r.status,
        message: r.message,
        rejectionReason: r.rejectionReason,
        createdAt: r.createdAt,
      })),
      total: requests.length,
    }
  }

  async getInvitations(userId: string) {
    const invitations = await prisma.invitation.findMany({
      where: { studentId: userId, status: 'pending' },
      include: { class: true, teacher: true },
      orderBy: { createdAt: 'desc' },
    })

    return {
      invitations: invitations.map((i) => ({
        id: i.id,
        classId: i.classId,
        className: i.class.name,
        classImage: i.class.backgroundImage,
        teacherId: i.teacherId,
        teacherName: i.teacher.name,
        message: i.message,
        expiresAt: i.expiresAt,
        createdAt: i.createdAt,
      })),
      total: invitations.length,
    }
  }

  async acceptInvitation(userId: string, invitationId: string) {
    const invitation = await prisma.invitation.findUnique({
      where: { id: invitationId },
      include: { class: true },
    })

    if (!invitation || invitation.studentId !== userId) {
      throw new Error('Invitación no encontrada')
    }

    if (invitation.status !== 'pending') {
      throw new Error('Esta invitación ya no está disponible')
    }

    // Update invitation status
    await prisma.invitation.update({
      where: { id: invitationId },
      data: { status: 'accepted' },
    })

    // Create enrollment with random avatar and nickname
    const enrollment = await prisma.classEnrollment.create({
      data: {
        studentId: userId,
        classId: invitation.classId,
        avatarUrl: getRandomAvatar(),
        nickname: getRandomNickname(),
      },
    })

    // Create activity with class-specific profile
    await prisma.activity.create({
      data: {
        userId,
        type: 'class_joined',
        description: `Te has unido a la clase ${invitation.class.name}`,
        // Class-specific student profile
        avatar: enrollment.avatarUrl,
        username: enrollment.nickname || 'Estudiante',
        classId: invitation.classId,
        className: invitation.class.name,
        metadata: { classId: invitation.classId },
      },
    })

    return {
      class: { id: invitation.class.id, name: invitation.class.name },
      success: true,
      message: 'Te has unido a la clase correctamente',
    }
  }

  async rejectInvitation(userId: string, invitationId: string) {
    const invitation = await prisma.invitation.findUnique({
      where: { id: invitationId },
    })

    if (!invitation || invitation.studentId !== userId) {
      throw new Error('Invitación no encontrada')
    }

    await prisma.invitation.update({
      where: { id: invitationId },
      data: { status: 'rejected' },
    })

    return { success: true, message: 'Invitación rechazada' }
  }

  async getEnrollmentCounts(userId: string) {
    const pendingInvitations = await prisma.invitation.count({
      where: { studentId: userId, status: 'pending' },
    })

    const pendingRequests = await prisma.joinRequest.count({
      where: { studentId: userId, status: 'pending' },
    })

    return { pendingInvitations, pendingRequests }
  }

  // ==================== MISSIONS ====================

  async getMissions(userId: string) {
    const enrollments = await prisma.classEnrollment.findMany({
      where: { studentId: userId },
    })

    const classIds = enrollments.map((e) => e.classId)

    const missions = await prisma.mission.findMany({
      where: { classId: { in: classIds } },
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

  async getBadges(userId: string, filter?: string, category?: string) {
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
      where: { studentId: userId },
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

  // ==================== LEADERBOARD ====================

  async getCurrentUserStats(userId: string) {
    const user = await prisma.user.findUnique({ where: { id: userId } })
    if (!user) throw new Error('Usuario no encontrado')

    const users = await prisma.user.findMany({
      where: { role: 'student' },
      include: { enrollments: true },
      take: 100,
    })

    const usersWithTotalXp = users
      .map((u) => ({
        ...u,
        totalXp: u.enrollments.reduce((sum, e) => sum + e.xp, 0),
      }))
      .sort((a, b) => b.totalXp - a.totalXp)

    const currentUserIndex = usersWithTotalXp.findIndex((u) => u.id === userId)
    const totalXp = usersWithTotalXp[currentUserIndex]?.totalXp || 0
    const levelInfo = getLevelInfo(totalXp)

    return {
      user: {
        id: user.id,
        name: user.name,
        avatar: null,
        rank: currentUserIndex >= 0 ? currentUserIndex + 1 : null,
        xp: totalXp,
        level: levelInfo.level,
        weeklyXP: 0,
        monthlyXP: 0,
      },
    }
  }

  async getGlobalLeaderboard(period?: string) {
    // Get all students with their enrollments to aggregate XP
    const users = await prisma.user.findMany({
      where: { role: 'student' },
      include: { enrollments: true },
      take: 100,
    })

    // Calculate total XP across all classes for each student
    const usersWithTotalXp = users.map((u) => ({
      ...u,
      totalXp: u.enrollments.reduce((sum, e) => sum + e.xp, 0),
    }))

    // Sort by total XP descending
    usersWithTotalXp.sort((a, b) => b.totalXp - a.totalXp)

    return {
      leaderboard: usersWithTotalXp.map((u, index) => {
        const levelInfo = getLevelInfo(u.totalXp)
        return {
          id: u.id,
          name: u.name,
          avatar: null, // Avatar is per-class (in enrollment)
          rank: index + 1,
          xp: u.totalXp,
          level: levelInfo.level,
        }
      }),
      total: usersWithTotalXp.length,
      period: period || 'all',
    }
  }

  async getClassLeaderboard(userId: string, classId: string, period?: string) {
    return this.getClassRanking(userId, classId)
  }

  async getFriendsLeaderboard(userId: string, period?: string) {
    // For now, return empty - friends system not implemented
    return { leaderboard: [], total: 0, period: period || 'all' }
  }
}

export const studentsService = new StudentsService()
