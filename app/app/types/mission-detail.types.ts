import type { MissionStatus } from './mission.types'
import type { ClassSettings } from './class.types'

export interface MissionNarrative {
  intro?: string
  description?: string
}

export interface MissionEnigmaDetail {
  id: string
  title: string
  description: string
  xp: number
  coins?: number
  mana?: number
  topic?: string | null
  status: 'disponible' | 'pendiente' | 'completado'
  submissionType?: string
  objectives?: string[]
  isOptional?: boolean
  earnedXp?: number
  earnedCoins?: number
  earnedMana?: number
  completedCount?: number // students who have completed it → rewards are raise-only
  submissionsCount?: number
  pendingSubmissions?: number
  totalSubmissions?: number
}

export interface MissionDocumentDetail {
  id: string
  title: string
  name?: string
  type: 'pdf' | 'video' | 'docx' | 'image' | 'link'
  format: string
  metadata: string
  description: string
  tags: string[]
  url?: string
  fileUrl?: string
  fileName?: string
  fileSize?: number
  mimeType?: string
  uploadedAt?: string | Date
}

export interface BadgeRewardDetail {
  id: string
  name: string
  description?: string
  imageUrl?: string
  rarity?: 'common' | 'rare' | 'epic' | 'legendary'
}

export interface TeacherMissionStats {
  totalStudents: number
  completed: number
  inProgress: number
  notStarted: number
  avgProgress: number
}

export interface MissionDetail {
  id: string
  title: string
  description?: string
  status: MissionStatus
  /** Estado real activa/bloqueada (para Ajustes), aparte del `status` calculado. */
  blocked?: boolean
  rarity: string
  deadline?: string | Date | null
  backgroundImage?: string | null
  isTeacher?: boolean
  progress:
    | number
    | {
        done: number
        total: number
      }
  rewards?: {
    xp: number
  }
  xpReward?: number
  timeRemaining?: string
  subject?: string
  className: string
  classId?: string
  /** Per-class feature flags (used to hide XP/coins/mana/etc. when disabled). */
  classSettings?: ClassSettings
  unit?: string
  tags: string[]
  narrative?: MissionNarrative
  estimatedTime?: string
  totalEnigmas?: number
  enigmas?: MissionEnigmaDetail[]
  documents?: MissionDocumentDetail[]
  badgeReward?: BadgeRewardDetail | null
  teacherStats?: TeacherMissionStats | null
  /** True si algún alumno ya completó la misión: la rareza queda bloqueada. */
  rarityLocked?: boolean
}
