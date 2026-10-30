/**
 * ITAKAI Mission Types - Official Design System
 *
 * Simplified mission structure with individual props
 * for component-level consumption.
 */

// Estados de misión para el nuevo diseño
export type MissionStatus =
  | 'urgente'
  | 'activa'
  | 'completada'
  | 'bloqueada'
  | 'expirada'
  | 'pendiente'

// Rareza de misión para el sistema de gamificación
export type MissionRarity = 'comun' | 'rara' | 'epica' | 'legendaria'

/**
 * Por qué una misión sale `bloqueada` al alumnado: la cerró su docente
 * (`teacher`, para toda la clase) o le falta completar otra antes (`path`, el
 * camino del mapa de misiones, solo a esa persona).
 */
export type MissionLockReason = 'teacher' | 'path'

/**
 * Una misión que hay que completar antes (camino del mapa): lo que se enseña de
 * ella. Al alumnado le llega con su `state`: `open` si ya se puede hacer y
 * `teacher` si la tiene cerrada su docente (entonces no se enlaza).
 */
export interface MissionRequirement {
  id: string
  title: string
  state?: 'open' | 'teacher'
}

/**
 * Lo que pide una misión, como lo ve el profesorado (Ajustes › Camino), con el
 * estado de cada una: una caducada o sin enigmas ya no cierra nada.
 */
export interface MissionPrerequisite {
  id: string
  title: string
  status?: 'bloqueada' | 'expirada' | 'urgente' | 'activa'
}

export interface Mission {
  id: string
  title: string
  subtitle: string // Claim/descripción corta
  progress: {
    done: number
    total: number
  }
  rewards: {
    xp: number
  }
  subject: string
  deadline: string // Ya formateado: "7 días", "Hoy", "Mañana", etc.
  onClick?: () => void // Acción opcional del CTA button
  classId?: string
}

export interface MissionFilters {
  subject?: string[]
}

export interface MissionState {
  missions: Mission[]
  activeMissions: Mission[]
  loading: boolean
  error: string | null
}

// Types para creación de misiones (profesor)
export interface MissionTask {
  id?: string
  description: string
  isCompleted?: boolean
}

// Enigma for mission creation (XP is per enigma)
export interface CreateEnigmaData {
  title: string
  description: string
  type: string
  xp: number // XP reward for completing this enigma
}

export interface CreateMissionData {
  title: string
  subtitle: string
  classId: string
  deadline: string // ISO date string (fecha límite de la misión)
  tasks: string[]
  subject: string
  enigmas: CreateEnigmaData[] // XP is now per enigma
}

// Tipos para el nuevo diseño de MissionCard
export interface EnhancedMission {
  id: string
  title: string
  description: string
  status: MissionStatus
  rarity: MissionRarity
  progress: number // 0-100 porcentaje
  timeRemaining?: string // "2 días", "5 horas"
  xpReward: number
  coinReward?: number
  manaReward?: number
  earnedXp?: number
  earnedCoins?: number
  earnedMana?: number
  backgroundImage?: string // URL de imagen generada con IA
  subject?: string
  expiresAt?: string // ISO date string - fecha límite real de la misión
  /** Por qué sale bloqueada (ver MissionLockReason). */
  lockReason?: MissionLockReason | null
  /** Cerrada por el camino del mapa: lo que le falta completar. */
  requires?: MissionRequirement[]
  /** Lo que pide la misión en el mapa (ids). */
  prerequisiteIds?: string[]
}

// Tipos para el dashboard de clase
export interface RecentTopic {
  id: string
  name: string
  progress: number // 0-100
  status: 'completado' | 'en_progreso' | 'proximo'
}

export interface UpcomingDate {
  id: string
  title: string
  date: string // Fecha formateada: "15 de Enero"
  type: 'examen' | 'entrega' | 'clase' | 'otro'
  className?: string // Nombre de la clase (para vista global)
  classId?: string // ID de la clase
}

export interface RecentAchievement {
  id: string
  name: string
  description?: string
  icon: string // Nombre de icono o URL
  earnedAt: string // "Hace 3 días", "Hace 1 semana"
}

export interface AteneaSuggestion {
  id: string
  label: string
  icon?: string
  action: string // Identificador de acción
  chatMessage?: string // Mensaje predefinido para el chat
}

// Filtros de misiones por categoría
export type MissionCategory =
  | 'todas'
  | 'poderes'
  | 'personalizacion'
  | 'recompensas'
  | 'tiempo_extra'

export interface MissionCategoryFilter {
  id: MissionCategory | MissionRarity | string
  label: string
}
