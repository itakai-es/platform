import { prisma } from '../../config/database.js'
import { getLevelInfo, wouldLevelUp } from '../../utils/xp-calculator.js'
import { resolveLevelConfig } from '../../utils/level-config.js'
import { formatMission, getMissionStatus } from '../../utils/mission-formatter.js'
import { classPathFor, classPathsFor } from '../../utils/mission-path.js'
import { ensureSafeEducationalPrompt } from '../ai/ai-safety.js'
import { generateFireRedAvatar } from '../ai/generators/avatar-firered.js'
import { releaseGeneratedAvatar } from '../storage/upload-usage.js'
import { getAIProvider } from '../ai/providers/index.js'
import { AVATAR_PROMPTS } from '../ai/prompts/index.js'
import { AvatarServiceUnavailableError } from '../../utils/errors.js'
import { resolveClassSettings } from '../../utils/class-settings.js'
import { ConflictError, ForbiddenError, NotFoundError, ValidationError } from '../../utils/errors.js'
import {
  LIVE_CLASS_WHERE,
  classTeachersInclude,
  getClassMembership,
  listedClassesWhere,
  studentEnrollmentsWhere,
  type ClassUser,
  type StudentEnrollmentRef,
} from '../../utils/class-access.js'
import {
  DEFAULT_AVATARS,
  ENROLL_TX_OPTIONS,
  cleanNickname,
  enrollStudentNow,
  freeNicknamesForPreview,
  getRandomAvatar,
  isAllowedClassAvatar,
  isSameNickname,
  lockClassNicknames,
  nicknameTakenInClass,
  participatingEnrollmentWhere,
} from '../../utils/enrollment.js'
import { ACTIVITY_ACTOR_INCLUDE, WALL_ACTIVITY_WHERE, activityActor } from '../../utils/activity.js'
import { studentRankingStats } from '../../utils/anonymous-stats.js'
import { assertNotManagedAccount } from '../../utils/identity-db.js'
import { changeOwnPassword } from '../../utils/password-change.js'
import { consumeRateLimit } from '../../utils/rate-limit.js'
import {
  classesWithBaseTeams,
  cutRanking,
  loadRankingBase,
  loadRankingContext,
  loadTeamStandings,
  publicRankingRow,
  rankClass,
  rankOf,
  rankingPeriodStart,
  statsWithoutXp,
  withoutXp,
} from '../../utils/ranking.js'
import {
  effectiveRankingTypes,
  rankingPeriodsFor,
  resolveRankingConfig,
  resolveRankingView,
  studentRankingTypes,
} from '../../utils/ranking-config.js'
import { classComparison } from '../analytics/comparison.js'
import {
  COUNTED_MISSION_WHERE,
  missionCompletions,
  studentProgressByClass,
} from '../analytics/student-progress.js'
import { MISSION_ORDER } from '../../utils/mission-order.js'

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

/** Avatares generados con IA: cada petición crea una imagen, así que hay tope por estudiante. */
const AVATAR_GENERATE_LIMIT = { max: 5, windowMs: 60 * 60 * 1000 }

export class StudentsService {
  // ==================== PROFILE ====================

  async getProfile(user: ClassUser) {
    const userId = user.id
    const account = await prisma.user.findUnique({
      where: { id: userId },
      include: { earnedBadges: { include: { badge: true } } },
    })

    if (!account) throw new Error('Cuenta no encontrada')

    // Las cifras del inicio. Clases: las de «Mis clases» (sin las archivadas ni
    // las de la papelera). Misiones completadas: las de la definición única de las
    // que cuentan (ver analytics/definitions.ts), solo de clases en las que está
    // matriculada de verdad, sin la vista previa.
    // Insignias: todas las que tiene, como en su página de insignias.
    const [classesEnrolled, countedMissions] = await Promise.all([
      prisma.classEnrollment.count({
        where: { AND: [studentEnrollmentsWhere(user), { class: { archived: false } }] },
      }),
      prisma.mission.findMany({
        where: {
          ...COUNTED_MISSION_WHERE,
          class: { ...LIVE_CLASS_WHERE, enrollments: { some: { studentId: userId, isPreview: false } } },
        },
        select: { id: true, enigmas: { select: { id: true, isOptional: true } } },
      }),
    ])
    const { datesBy } = await missionCompletions(countedMissions, { studentId: userId })
    const missionsCompleted = datesBy.get(userId)?.size ?? 0

    return {
      id: account.id,
      email: account.email,
      username: account.username,
      accountType: account.accountType,
      name: account.name,
      firstName: account.name.split(' ')[0],
      lastName: account.name.split(' ').slice(1).join(' ') || '',
      bio: null,
      // La XP, el nivel y el avatar son de cada clase: aquí no hay.
      badges: account.earnedBadges.map((eb) => ({
        id: eb.badge.id,
        name: eb.badge.name,
        imageUrl: eb.badge.imageUrl,
        earnedAt: eb.earnedAt,
      })),
      stats: {
        classesEnrolled,
        missionsCompleted,
        badgesEarned: account.earnedBadges.length,
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
    const classIds = activeEnrollments.map(e => e.class.id)
    // «4 de 7 misiones» en cada tarjeta: de una vez, sin una matriz por clase.
    const [withTeams, progressByClass] = await Promise.all([
      classesWithBaseTeams(classIds),
      studentProgressByClass(user.id, classIds),
    ])

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
        // Como en el detalle: la portada de la clase puede salir de esta lista.
        rankingTypes: studentRankingTypes(
          resolveClassSettings(e.class.settings),
          resolveRankingConfig(e.class.rankingConfig),
          withTeams.has(e.class.id)
        ),
        studentCount: e.class.enrollments.length,
        totalMissions: e.class.missions.length,
        progress: {
          missionsCompleted: progressByClass.get(e.class.id)?.missionsCompleted ?? 0,
          missionsCounted: progressByClass.get(e.class.id)?.missionsCounted ?? 0,
        },
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
            _count: { select: { missions: true } },
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
    const { studentTypes: rankingTypes } = await loadRankingContext(classId)

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
        id: t.userId,
        name: t.user.name,
        avatar: t.user.avatar,
        profile: t.profile,
        isOwner: t.isOwner,
      })),
      archived: cls.archived,
      backgroundImage: cls.backgroundImage,
      subject: cls.subject,
      language: cls.language,
      educationLevel: cls.educationLevel,
      settings: resolveClassSettings(cls.settings),
      // Los tipos de ranking que ve; vacío si no tiene ninguno (sin pestaña).
      rankingTypes,
      // Sin código de invitación: desde este lado entra también la vista previa
      // del profesorado, y el código es solo de quien administra la clase.
      studentCount: cls.enrollments.length,
      missionCount: cls._count.missions,
      coins: enrollment.coins,
      mana: enrollment.mana,
      lives: enrollment.lives,
      createdAt: cls.createdAt,
      updatedAt: cls.updatedAt,
    }
  }

  async getClassMissions(user: ClassUser, classId: string) {
    const userId = user.id
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
      // El orden de la progresión que fija el profesorado.
      orderBy: MISSION_ORDER,
    })

    // El camino del mapa para esta persona: lo que pide cada misión y las que
    // tiene cerradas por eso (solo con el mapa encendido en la clase, y nada
    // cerrado si mira el profesorado en la vista previa).
    const path = await classPathFor(prisma, classId, user, missions[0]?.class.settings ?? null)

    return {
      missions: missions.map((m) =>
        formatMission(m, false, resolveClassSettings(m.class.settings), {
          requires: path.locks.get(m.id),
          prerequisiteIds: path.prerequisites.get(m.id),
        })
      ),
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
        student: { select: { name: true } },
        class: true,
      },
    })

    if (!enrollment) throw new Error('No estás en esta clase')

    // Per-class XP is the single source of truth: it's kept in sync by
    // applyXpDelta on every approval/revocation and shared with the ranking, so
    // the header and the ranking can never disagree. Level is derived from it.
    const xpEarned = enrollment.xp

    // Su puesto, con el mismo orden que la lista del ranking (`rankByXp`). Sin
    // puesto (null) si la clase no tiene el ranking por XP encendido, si aún no
    // tiene XP o si es la vista previa del profesorado, que no está en ella. Todos
    // los modos enseñan el puesto propio: aquí no hay más que recortar.
    const classStudents = await prisma.classEnrollment.findMany({
      where: { classId, isPreview: false, AND: [participatingEnrollmentWhere] },
      select: { studentId: true, xp: true, nickname: true },
    })
    const settings = resolveClassSettings(enrollment.class.settings)
    const xpRanking =
      settings.rankings &&
      effectiveRankingTypes(resolveRankingConfig(enrollment.class.rankingConfig), settings).includes('xp')
    const rank =
      xpRanking && !enrollment.isPreview
        ? rankOf(
            classStudents.map(e => ({ id: e.studentId, xp: e.xp, alias: e.nickname })),
            userId
          )
        : null
    // El nivel/título/color del alumno se calcula con la config de SU clase.
    const levelCfg = resolveLevelConfig(enrollment.class.levelConfig)
    const levelInfo = getLevelInfo(xpEarned, levelCfg)
    // Get next level title by calculating XP for next level
    const nextLevelXp = levelInfo.totalXP + levelInfo.requiredXP
    const nextLevelInfo = getLevelInfo(nextLevelXp, levelCfg)

    return {
      classId,
      xp: xpEarned,
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
    }
  }

  /**
   * El ranking de la clase para el alumnado, de un tipo y un periodo (lo que no
   * valga se resuelve a lo primero que tenga la clase). Si no hay ninguno que ver,
   * no existe (404): el profesorado ve el suyo en su lado.
   *
   * Lo que el modo esconde no sale de aquí (`cutRanking`): en `top` y `position`
   * no viajan las filas ocultas ni las medias de la clase, con las que se podría
   * deducir lo escondido. Quien mira recibe siempre su fila aparte (`me`), con su
   * puesto, y el total; la vista previa del profesorado no tiene fila. Los equipos
   * se ven enteros en todos los modos: nadie queda señalado individualmente.
   *
   * Sin el tipo XP entre los que ve, la XP y el nivel de cada cual no viajan, en
   * ningún modo (`withoutXp`), y `usesXp` sale apagado: el desempate por XP de las
   * misiones se queda en el servidor.
   *
   * Ni la XP total de la clase ni el progreso medio salen en ningún modo
   * (`studentRankingStats`). En `top` y `position`, en vez de las medias va la
   * comparación anónima (`classComparison`), si la clase la tiene encendida.
   *
   * Con alias o «Estudiante», nunca el nombre real, y con el id de la matrícula,
   * no el de la cuenta (`publicRankingRow`).
   */
  async getClassRanking(
    enrollment: StudentEnrollmentRef,
    classId: string,
    requested: { type?: unknown; period?: unknown } = {}
  ) {
    const context = await loadRankingContext(classId)
    const { config, studentTypes } = context
    if (studentTypes.length === 0) {
      throw new NotFoundError('Esta clase no tiene la clasificación activada', 'RANKING_DISABLED')
    }
    const { type, period } = resolveRankingView(studentTypes, config, requested)
    const since = rankingPeriodStart(period, config)
    const showsXp = studentTypes.includes('xp')
    const options = {
      types: studentTypes,
      periods: rankingPeriodsFor(type, config),
      mode: config.mode,
      topN: config.topN,
      seasonStartedAt: config.seasonStartedAt,
      usesXp: showsXp,
    }
    if (type === 'teams') {
      return { type, period, options, standings: await loadTeamStandings(classId, since) }
    }

    const base = await loadRankingBase(classId)
    const { ranked, stats } = rankClass(base, { type, since })
    const rows = ranked.map(row => {
      const shown = publicRankingRow(row)
      return { ...(showsXp ? shown : withoutXp(shown)), isCurrentUser: row.enrollmentId === enrollment.id }
    })
    const { podium, rest } = cutRanking(rows, config)
    const showStats = config.mode === 'full' && period === 'all'
    const comparison =
      config.mode === 'full' ? null : await classComparison(enrollment.id, classId, context, { base })

    return {
      type,
      period,
      options,
      podium,
      leaderboard: rest,
      stats: showStats ? studentRankingStats(showsXp ? stats : statsWithoutXp(stats)) : null,
      total: rows.length,
      me: rows.find(row => row.isCurrentUser) ?? null,
      comparison,
    }
  }

  /**
   * El alias y el avatar con los que se ve en la clase. El alias, con las reglas
   * del profesorado (`cleanNickname`: limpio y de 1 a 20 caracteres) y sin
   * repetir el de otra persona de la clase (409 `NICKNAME_TAKEN`). No se puede
   * dejar sin alias: sin él, el resto de la clase vería «Estudiante».
   */
  async updateClassProfile(
    enrollmentRef: StudentEnrollmentRef,
    classId: string,
    data: { nickname?: string; avatarUrl?: string | null }
  ) {
    const enrollment = await prisma.classEnrollment.findUnique({ where: { id: enrollmentRef.id } })

    if (!enrollment) throw new Error('No estás en esta clase')
    if (data.avatarUrl && !isAllowedClassAvatar(data.avatarUrl, enrollment.avatarUrl)) {
      throw new ValidationError('Elige un avatar de la lista', 'AVATAR_NOT_ALLOWED')
    }
    const nickname = data.nickname === undefined ? undefined : cleanNickname(data.nickname)

    const updated = await prisma.$transaction(async tx => {
      // Solo se comprueba un alias nuevo: quien guarda el suyo (o lo cambia de
      // mayúsculas) no choca consigo, ni con un repetido de antes de esta regla.
      if (nickname !== undefined && !isSameNickname(nickname, enrollment.nickname)) {
        await lockClassNicknames(tx, classId)
        if (await nicknameTakenInClass(tx, classId, nickname, enrollment.id)) {
          throw new ConflictError('Ese alias ya lo tiene otra persona de la clase', 'NICKNAME_TAKEN')
        }
      }
      return tx.classEnrollment.update({
        where: { id: enrollment.id },
        data: {
          ...(nickname !== undefined ? { nickname } : {}),
          ...(data.avatarUrl !== undefined ? { avatarUrl: data.avatarUrl } : {}),
        },
      })
    }, ENROLL_TX_OPTIONS)
    // El generado con IA que deja ya no se puede volver a poner: fuera su fichero.
    if (updated.avatarUrl !== enrollment.avatarUrl) await releaseGeneratedAvatar(enrollment.avatarUrl)

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

    // Lo escribe un estudiante menor: el mismo filtro que el resto de la IA y un
    // tope de peticiones, porque cada una genera una imagen.
    consumeRateLimit(`avatar-generate:${userId}`, AVATAR_GENERATE_LIMIT)
    for (const text of [data.prompt, data.wardrobe_prompt, data.background_prompt]) {
      if (text) ensureSafeEducationalPrompt(text)
    }

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
      // El detalle (del servidor de imágenes) solo al log; al estudiante, el mensaje genérico.
      throw new AvatarServiceUnavailableError()
    }

    const updated = await prisma.classEnrollment.update({
      where: { studentId_classId: { studentId: userId, classId } },
      data: { avatarUrl: fileUrl },
    })
    // El nuevo sustituye al que tenía: si era otro generado, fuera su fichero.
    if (updated.avatarUrl !== enrollment.avatarUrl) await releaseGeneratedAvatar(enrollment.avatarUrl)

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

    if (!enrollment) throw new NotFoundError('No estás en esta clase')

    // Get activities related to this class (filter by classId field)
    const activities = await prisma.activity.findMany({
      where: {
        userId,
        classId,
      },
      include: ACTIVITY_ACTOR_INCLUDE,
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
    // Las de la papelera, no: tampoco se listan como alumno (`studentEnrollmentsWhere`).
    const toCreate = await prisma.class.findMany({
      where: { ...listedClassesWhere(userId), enrollments: { none: { studentId: userId } } },
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
      // Por clase y, dentro de cada una, en el orden de la progresión.
      orderBy: [{ class: { name: 'asc' } }, { classId: 'asc' }, ...MISSION_ORDER],
    })

    // El camino del mapa de cada clase para esta persona (ver getClassMissions).
    const paths = await classPathsFor(
      prisma,
      user,
      missions.map(m => ({ id: m.classId, settings: m.class.settings }))
    )

    return {
      missions: missions.map((m) =>
        formatMission(m, true, resolveClassSettings(m.class.settings), {
          requires: paths.get(m.classId)?.locks.get(m.id),
          prerequisiteIds: paths.get(m.classId)?.prerequisites.get(m.id),
        })
      ),
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
      where: { userId, ...WALL_ACTIVITY_WHERE },
      include: ACTIVITY_ACTOR_INCLUDE,
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
