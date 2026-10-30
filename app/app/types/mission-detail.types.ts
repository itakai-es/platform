import type {
  MissionLockReason,
  MissionPrerequisite,
  MissionRequirement,
  MissionStatus,
} from './mission.types'
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
  /** true cuando el documento es un fichero guardado: se pide a la API, que comprueba el acceso. */
  storedFile?: boolean
  /** Solo la traen los documentos que son un enlace externo. */
  fileUrl?: string | null
  fileName?: string
  fileSize?: number
  mimeType?: string
  uploadedAt?: string | Date
}

export type MissionHintCostType = 'coins' | 'xp' | 'percent'

/**
 * Una pista de la misión. El profesorado la recibe siempre con su texto y cuántos
 * estudiantes la han usado; el alumnado, el texto solo si ya la ha usado.
 */
export interface MissionHintDetail {
  id: string
  /** Su lugar en el orden de la misión, desde 1. */
  position: number
  costType: MissionHintCostType
  /** Monedas, XP o %. Al alumnado: lo que le costó o lo que cuesta ahora (0 si sale gratis). */
  cost: number
  content: string | null
  /** Profesorado: cuántos la han usado (una usada no se borra). */
  usedCount?: number
  /** Alumnado: ya la ha usado. */
  used?: boolean
  /** Alumnado: es la siguiente que puede usar. */
  isNext?: boolean
}

/** Solo del alumnado: lo que necesita junto a las pistas. */
export interface MissionHintState {
  /** % que restan ya sus pistas en lo que la misión le queda por pagar (tope 100). */
  penalty: number
  canUse: boolean
  closedReason: 'completed' | 'expired' | null
  coins: number
  xp: number
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
  /** Se hace por equipos de esta agrupación (solo informativo; cada cual entrega lo suyo). */
  teamSet?: { id: string; title: string; archived: boolean } | null
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
  hints?: MissionHintDetail[]
  hintState?: MissionHintState | null
  badgeReward?: BadgeRewardDetail | null
  teacherStats?: TeacherMissionStats | null
  /** True si algún alumno ya completó la misión: la rareza queda bloqueada. */
  rarityLocked?: boolean
  /**
   * Alumnado: por qué está bloqueada. Con `path` (camino del mapa) la misión
   * llega sin historia, enigmas, documentos ni pistas, y `requires` dice qué
   * le falta completar antes.
   */
  lockReason?: MissionLockReason | null
  requires?: MissionRequirement[]
  /**
   * Profesorado: lo que pide para abrirse en el mapa, en el orden de la clase,
   * con el estado de cada una.
   */
  prerequisites?: MissionPrerequisite[]
}
