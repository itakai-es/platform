/**
 * Class Module Type Definitions
 * Tipos para clases y sus estadísticas
 */

/**
 * Estadísticas calculadas dinámicamente por clase
 */
export interface ClassStats {
  avgProgress: number // 0-100, promedio de progreso de estudiantes
  participation: number // 0-100, % de estudiantes activos
  avgMissionsCompleted: number
  totalMissions: number
  pendingReviews: number // Entregas pendientes de revisar
  avgXp: number // Media de XP de los estudiantes
}

/**
 * Estado de la clase basado en las estadísticas
 * - al_dia: avgProgress >= 70 AND participation >= 80
 * - atencion: avgProgress >= 50 OR participation >= 60
 * - urgente: avgProgress < 50 AND participation < 60
 * - inactiva: participation === 0
 */
export type ClassStatus = 'al_dia' | 'atencion' | 'urgente' | 'inactiva'

/**
 * Configuración de funcionalidades por clase (panel "Ajustes").
 * Claves ausentes se consideran activadas (ver resolveClassSettings).
 */
export interface ClassSettings {
  shop: boolean
  coins: boolean
  mana: boolean
  rankings: boolean
  xp: boolean
  behaviors: boolean
  lives: boolean
  visualEffects: boolean
  sounds: boolean
}

/**
 * Clase/Curso
 */
export interface Class {
  id: string
  name: string
  narrative?: string
  schedule?: string // e.g., "Lunes y Miércoles 14:00-15:30"
  archived?: boolean
  studentCount: number
  invitationCode: string // Código de 6 dígitos para que estudiantes se unan
  teacherId: string
  backgroundImage?: string
  // Metadatos de clasificación (alimentan los filtros del marketplace de plantillas)
  subject?: string
  language?: string
  educationLevel?: string
  province?: string
  isTemplate?: boolean
  settings?: ClassSettings
  createdAt: Date
  updatedAt: Date
  // Estadísticas calculadas (opcionales, se añaden en el handler)
  stats?: ClassStats
  status?: ClassStatus
}

/**
 * Datos para crear una nueva clase
 */
export interface CreateClassData {
  name: string
  narrative?: string
  schedule?: string
  backgroundImage?: string
  subject?: string
  language?: string
  educationLevel?: string
  province?: string
}

/**
 * Datos para actualizar una clase existente
 */
export interface UpdateClassData {
  name?: string
  narrative?: string
  schedule?: string
  backgroundImage?: string
  subject?: string
  language?: string
  educationLevel?: string
  province?: string
  settings?: Partial<ClassSettings>
}

/**
 * Guía de clase (instrucciones del profesor en markdown)
 */
export interface ClassGuideData {
  teacherName: string
  content: string
  lastUpdated: string
}
