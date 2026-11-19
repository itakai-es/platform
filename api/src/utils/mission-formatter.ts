/**
 * Shared mission formatting utilities
 * Used by missions.service.ts and students.service.ts; `missionRewards`, also by
 * the teachers' mission lists and the template detail.
 */
import { countsForProgress, enigmaTally, type EnigmaTally } from '../modules/analytics/definitions.js'
import { calculateMissionTotalXP } from './xp-calculator.js'
import type { ClassSettings } from './class-settings.js'
import { enigmasComplete, type PathRequirement } from './mission-path.js'

export interface MissionFormatInput {
  id: string
  title: string
  description: string | null
  classId: string
  status: string
  rarity: string
  deadline: Date | null
  backgroundImage: string | null
  /** Posición en el orden de su clase (ver utils/mission-order.ts). */
  orderIndex?: number
  xpReward?: number
  class?: { name: string } | null
  enigmas?: {
    id?: string
    isOptional?: boolean
    xpReward: number
    coinReward?: number
    manaReward?: number
    progress?: { xpEarned: number; coinsEarned: number; manaEarned: number }[]
  }[]
  progress?: { enigmasCompleted: number; completedAt: Date | null }[]
}

export interface FormattedMission {
  id: string
  title: string
  description: string | null
  className?: string
  classId: string
  status: string
  rarity: string
  deadline: Date | null
  backgroundImage: string | null
  /** Posición en el orden de su clase: la pantalla la usa al mezclar clases. */
  orderIndex: number
  progress: number
  xpReward: number
  coinReward: number
  manaReward: number
  // Student-only: rewards already accumulated across completed enigmas. Undefined for teachers.
  earnedXp?: number
  earnedCoins?: number
  earnedMana?: number
  /** Cuenta en «X de N misiones»: tiene enigmas y su docente no la ha bloqueado. */
  counted: boolean
  /** Enigmas obligatorios aprobados, de cuántos; los opcionales aparte, como extra. */
  progressDetail: {
    done: number
    total: number
    extraDone: number
    extraTotal: number
  }
  rewards: {
    xp: number
    coins: number
    mana: number
  }
  /**
   * Por qué sale `bloqueada`: la cerró su docente (`teacher`, para toda la
   * clase) o le falta completar algo del camino del mapa (`path`, solo a esta
   * persona). null si no está cerrada.
   */
  lockReason: 'teacher' | 'path' | null
  /**
   * Con `path`, lo que le falta completar, en el orden de la clase; cada uno con
   * su `state` (`teacher` si su docente lo tiene cerrado a mano).
   */
  requires: PathRequirement[]
  /** Lo que pide la misión en el mapa (ids), lo tenga hecho o no; vacío con el mapa apagado. */
  prerequisiteIds: string[]
}

/** El camino del mapa para una misión y un estudiante (ver utils/mission-path.ts). */
export interface MissionPathInfo {
  /** Lo que le falta para abrirla; vacío o sin él, no está cerrada por el camino. */
  requires?: PathRequirement[]
  prerequisiteIds?: string[]
}

/** Lo que se lee de cada enigma para sumar lo que da su misión. */
export interface EnigmaRewards {
  xpReward: number
  coinReward?: number | null
  manaReward?: number | null
}

/**
 * Lo que da una misión entera: la XP de sus enigmas más la de completarla,
 * según su rareza, y las monedas y el maná de sus enigmas. Con `settings`, lo
 * de un recurso que la clase tiene apagado es 0 (las tarjetas no pintan un 0).
 * Es la cuenta de todos los listados de misiones, y de la ficha de una
 * plantilla: vive aquí para que no cambie en uno sí y en otro no.
 */
export function missionRewards(
  mission: { rarity: string; enigmas?: EnigmaRewards[] },
  settings?: Pick<ClassSettings, 'xp' | 'coins' | 'mana'>
): { xpReward: number; coinReward: number; manaReward: number } {
  const enigmas = mission.enigmas ?? []
  const shows = (resource: 'xp' | 'coins' | 'mana') => !settings || settings[resource]
  const enigmaXps = enigmas.map(e => e.xpReward)
  return {
    xpReward: shows('xp') ? calculateMissionTotalXP(mission.rarity, enigmaXps) : 0,
    coinReward: shows('coins') ? enigmas.reduce((sum, e) => sum + (e.coinReward || 0), 0) : 0,
    manaReward: shows('mana') ? enigmas.reduce((sum, e) => sum + (e.manaReward || 0), 0) : 0,
  }
}

/** Lo que lleva aprobado de los enigmas de una misión, que traen su progreso por enigma. */
function studentTally(enigmas: NonNullable<MissionFormatInput['enigmas']>): EnigmaTally {
  const shapes = enigmas.map((enigma, index) => ({
    id: enigma.id ?? String(index),
    isOptional: enigma.isOptional ?? false,
  }))
  const approved = new Set(
    shapes.filter((_, index) => (enigmas[index]!.progress?.length ?? 0) > 0).map(e => e.id)
  )
  return enigmaTally(shapes, approved)
}

export function formatMission(
  mission: MissionFormatInput,
  includeClassName = false,
  settings?: ClassSettings,
  path: MissionPathInfo = {}
): FormattedMission {
  // Hide a resource's amounts entirely when the class has it disabled (cards
  // hide a reward chip when its value is 0/undefined).
  const showXp = !settings || settings.xp
  const showCoins = !settings || settings.coins
  const showMana = !settings || settings.mana

  const progressRecord = mission.progress?.[0]
  const totalEnigmas = mission.enigmas?.length || 0
  const {
    xpReward: totalXp,
    coinReward: totalCoins,
    manaReward: totalMana,
  } = missionRewards(mission, settings)

  // Only compute earned totals when the caller included per-student enigma progress.
  const hasStudentProgress = mission.enigmas?.some(e => e.progress !== undefined) ?? false
  // El avance dentro de la misión: sus enigmas obligatorios (ver
  // analytics/definitions.ts), mirando lo aprobado de verdad. Sin el progreso por
  // enigma, lo guardado en su fila.
  const tally = hasStudentProgress ? studentTally(mission.enigmas!) : null
  // Completada es la definición única: `completedAt` o todos los obligatorios aprobados.
  const approvals = hasStudentProgress
    ? mission.enigmas!.map(e => ({
        isOptional: e.isOptional ?? false,
        approved: (e.progress?.length ?? 0) > 0,
      }))
    : undefined
  const completed = progressRecord?.completedAt != null || (approvals ? enigmasComplete(approvals) : false)
  const progressDetail = tally
    ? {
        done: tally.required.approved,
        total: tally.required.total,
        extraDone: tally.optional.approved,
        extraTotal: tally.optional.total,
      }
    : { done: progressRecord?.enigmasCompleted || 0, total: totalEnigmas, extraDone: 0, extraTotal: 0 }
  const progressPercent = completed
    ? 100
    : progressDetail.total > 0
      ? Math.round((progressDetail.done / progressDetail.total) * 100)
      : 0
  const earnedXp = hasStudentProgress
    ? showXp
      ? mission.enigmas!.reduce((sum, e) => sum + (e.progress?.[0]?.xpEarned ?? 0), 0)
      : 0
    : undefined
  const earnedCoins = hasStudentProgress
    ? showCoins
      ? mission.enigmas!.reduce((sum, e) => sum + (e.progress?.[0]?.coinsEarned ?? 0), 0)
      : 0
    : undefined
  const earnedMana = hasStudentProgress
    ? showMana
      ? mission.enigmas!.reduce((sum, e) => sum + (e.progress?.[0]?.manaEarned ?? 0), 0)
      : 0
    : undefined

  // La cerrada por el camino sale `bloqueada`, como la que cierra su docente
  // (sin enlace, con candado), y `lockReason` dice cuál de las dos es. La de su
  // docente va por encima; la completada, por encima de las dos.
  const baseStatus = getMissionStatus(mission, progressRecord, approvals)
  const requires = path.requires ?? []
  const pathLocked = requires.length > 0 && baseStatus !== 'completada' && baseStatus !== 'bloqueada'
  const status = pathLocked ? 'bloqueada' : baseStatus
  const lockReason = pathLocked ? 'path' : baseStatus === 'bloqueada' ? 'teacher' : null
  // La historia de una misión cerrada (por el camino o a mano, aunque ya la
  // tuviera completada) no sale en los listados: como en su detalle (ver
  // `lockedMissionView`), se lee al abrirse.
  const closed = pathLocked || mission.status === 'bloqueada'

  const formatted: FormattedMission = {
    id: mission.id,
    title: mission.title,
    description: closed ? null : mission.description,
    classId: mission.classId,
    status,
    rarity: mission.rarity,
    deadline: mission.deadline,
    backgroundImage: mission.backgroundImage,
    orderIndex: mission.orderIndex ?? 0,
    progress: progressPercent,
    xpReward: totalXp,
    coinReward: totalCoins,
    manaReward: totalMana,
    earnedXp,
    earnedCoins,
    earnedMana,
    counted: countsForProgress({
      id: mission.id,
      status: mission.status,
      deadline: mission.deadline,
      enigmas: (mission.enigmas ?? []).map((e, index) => ({
        id: e.id ?? String(index),
        isOptional: e.isOptional ?? false,
      })),
    }),
    progressDetail,
    rewards: {
      xp: totalXp,
      coins: totalCoins,
      mana: totalMana,
    },
    lockReason,
    requires: pathLocked ? requires : [],
    prerequisiteIds: path.prerequisiteIds ?? [],
  }

  if (includeClassName && mission.class) {
    formatted.className = mission.class.name
  }

  return formatted
}

/**
 * El estado de una misión para quien la mira. `enigmas`, con si tiene aprobado cada
 * uno, para la definición única de completada (ver analytics/definitions.ts); sin
 * ellos, solo se mira `completedAt`.
 */
export function getMissionStatus(
  mission: { deadline: Date | null; status: string },
  progress?: { completedAt: Date | null } | null,
  enigmas?: { isOptional: boolean; approved: boolean }[]
): string {
  if (progress?.completedAt || (enigmas && enigmasComplete(enigmas))) return 'completada'
  // Una misión bloqueada por el profesor debe mostrarse como tal por encima de los
  // estados derivados de la fecha (urgente/expirada); si no, una fecha cercana la
  // "desbloquearía" visualmente y el alumno podría interactuar con ella.
  if (mission.status === 'bloqueada') return 'bloqueada'
  if (mission.deadline && new Date(mission.deadline) < new Date()) return 'expirada'

  if (mission.deadline) {
    const daysLeft = Math.ceil((new Date(mission.deadline).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    if (daysLeft <= 2) return 'urgente'
  }

  return 'activa'
}
