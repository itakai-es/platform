/**
 * Shared mission formatting utilities
 * Used by missions.service.ts and students.service.ts
 */
import { calculateMissionTotalXP } from './xp-calculator.js'
import type { ClassSettings } from './class-settings.js'

export interface MissionFormatInput {
  id: string
  title: string
  description: string | null
  classId: string
  status: string
  rarity: string
  deadline: Date | null
  backgroundImage: string | null
  xpReward?: number
  class?: { name: string } | null
  enigmas?: {
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
  progress: number
  xpReward: number
  coinReward: number
  manaReward: number
  // Student-only: rewards already accumulated across completed enigmas. Undefined for teachers.
  earnedXp?: number
  earnedCoins?: number
  earnedMana?: number
  progressDetail: {
    done: number
    total: number
  }
  rewards: {
    xp: number
    coins: number
    mana: number
  }
}

export function formatMission(
  mission: MissionFormatInput,
  includeClassName = false,
  settings?: ClassSettings
): FormattedMission {
  // Hide a resource's amounts entirely when the class has it disabled (cards
  // hide a reward chip when its value is 0/undefined).
  const showXp = !settings || settings.xp
  const showCoins = !settings || settings.coins
  const showMana = !settings || settings.mana

  const progressRecord = mission.progress?.[0]
  const totalEnigmas = mission.enigmas?.length || 0
  const completedEnigmas = progressRecord?.enigmasCompleted || 0
  const enigmaXPs = mission.enigmas?.map(e => e.xpReward) || []
  const totalXp = showXp ? calculateMissionTotalXP(mission.rarity, enigmaXPs) : 0
  const totalCoins = showCoins ? mission.enigmas?.reduce((sum, e) => sum + (e.coinReward || 0), 0) || 0 : 0
  const totalMana = showMana ? mission.enigmas?.reduce((sum, e) => sum + (e.manaReward || 0), 0) || 0 : 0
  const progressPercent = totalEnigmas > 0 ? Math.round((completedEnigmas / totalEnigmas) * 100) : 0

  // Only compute earned totals when the caller included per-student enigma progress.
  const hasStudentProgress = mission.enigmas?.some(e => e.progress !== undefined) ?? false
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

  const formatted: FormattedMission = {
    id: mission.id,
    title: mission.title,
    description: mission.description,
    classId: mission.classId,
    status: getMissionStatus(mission, progressRecord),
    rarity: mission.rarity,
    deadline: mission.deadline,
    backgroundImage: mission.backgroundImage,
    progress: progressPercent,
    xpReward: totalXp,
    coinReward: totalCoins,
    manaReward: totalMana,
    earnedXp,
    earnedCoins,
    earnedMana,
    progressDetail: {
      done: completedEnigmas,
      total: totalEnigmas,
    },
    rewards: {
      xp: totalXp,
      coins: totalCoins,
      mana: totalMana,
    },
  }

  if (includeClassName && mission.class) {
    formatted.className = mission.class.name
  }

  return formatted
}

export function getMissionStatus(
  mission: { deadline: Date | null; status: string },
  progress?: { completedAt: Date | null } | null
): string {
  if (progress?.completedAt) return 'completada'
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
