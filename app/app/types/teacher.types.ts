/**
 * Teacher Module Type Definitions
 * Tipos para el módulo de profesor
 */

// Re-export class types for backwards compatibility
// Import ActivityType for consistency with activity.types.ts
import type { ActivityType } from './activity.types'

export type {
  Class,
  ClassStats,
  ClassStatus,
  CreateClassData,
  UpdateClassData,
  ClassGuideData,
} from './class.types'

/**
 * Subset of ActivityType relevant for teacher dashboard
 * Uses the centralized ActivityType for consistency
 */
export type TeacherActivityType = Extract<ActivityType, 'mission_completed' | 'level_up'>

/**
 * Progreso de un estudiante en una clase específica
 * (Sistema per-class: cada estudiante tiene XP y nivel independiente por clase)
 */
export interface StudentClassProgress {
  classId: string
  className: string
  level: number
  xp: number
  missionsCompleted: number
  missionsTotal: number
  progress: number // Porcentaje de progreso (0-100)
}

/**
 * Estudiante (vista del profesor)
 * Incluye datos agregados y desglose por clase
 */
export interface Student {
  id: string
  name: string // Nombre real para identificación del profesor
  username: string // Nombre público para rankings (gamificación)
  email: string
  avatar?: string
  // Datos agregados (calculados desde classProgress)
  totalXp: number // Suma de XP en todas las clases
  highestLevel: number // Nivel más alto alcanzado en cualquier clase
  totalMissionsCompleted: number
  totalMissionsAvailable: number
  totalXpEarned: number
  totalXpAvailable: number
  totalBadgesEarned: number
  totalBadgesAvailable: number
  overallProgress: number // Progreso promedio (0-100)
  classCount: number // Número de clases inscritas
  // Detalle por clase
  classProgress: StudentClassProgress[]
  classIds: string[] // Para filtros y retrocompatibilidad
  archived?: boolean // Todas sus clases con este profesor están archivadas
  createdAt: Date
}

/**
 * Estadísticas del dashboard del profesor
 */
export interface TeacherStats {
  totalStudents: number
  activeClasses: number
  activeMissions: number
}

/**
 * Actividad reciente (eventos del dashboard)
 * Uses TeacherActivityType which is a subset of the unified ActivityType
 */
export interface Activity {
  id: string
  type: TeacherActivityType // Subset of ActivityType for teacher dashboard
  studentId: string
  studentName: string // Nombre real (para referencia del profesor)
  username: string // Nombre público/nickname (para mostrar en UI)
  avatar?: string // URL del avatar del estudiante
  description: string
  timestamp: Date
}
