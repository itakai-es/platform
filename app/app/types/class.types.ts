/**
 * Class Module Type Definitions
 * Tipos para clases y sus estadísticas
 */
import type { ScheduleConfig } from '~/types/schedule.types'

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

/** Hasta dónde llega un profesor en una clase. Cada nivel incluye los anteriores. */
export type ClassAccessLevel = 'read' | 'edit' | 'admin'

/** Etiqueta del profesor en la clase. */
export type ClassTeacherProfile = 'titular' | 'sustituto' | 'practicas'

/** Acceso de quien pide la clase. */
export interface ClassAccess {
  access: ClassAccessLevel
  profile: ClassTeacherProfile
  isOwner: boolean
}

/** Un profesor de la clase. `id` es el del usuario. */
export interface ClassTeacher extends ClassAccess {
  id: string
  name: string
}

/** Un profesor en la sección de profesorado de los ajustes (`GET …/teachers`). */
export interface ClassTeacherMember extends ClassTeacher {
  email: string | null
  addedAt: string
  endsAt: string | null
}

/** Profesorado de la clase tal como lo devuelve `GET /teacher/classes/:id/teachers`. */
export interface ClassTeachersResponse {
  teachers: ClassTeacherMember[]
  myAccess: ClassAccess | null
  canManage: boolean
}

/** Lo que el alumnado ve de quien imparte su clase: sin correo ni nivel. */
export interface ClassTeacherPublic {
  name: string
  profile: ClassTeacherProfile
  isOwner: boolean
}

/** Tipos por los que se filtra el historial: la primera parte de la clave de la acción. */
export type ClassHistoryType =
  | 'class'
  | 'teacher'
  | 'student'
  | 'mission'
  | 'enigma'
  | 'document'
  | 'submission'
  | 'behavior'
  | 'shop'

/** Una entrada del historial de la clase. El texto lo compone la pantalla con `action` y `params`. */
export interface ClassHistoryEntry {
  id: string
  /** Clave `dominio.verbo`: `submission.approved`, `teacher.added`… */
  action: string
  type: ClassHistoryType
  createdAt: string
  actor: { id: string | null; name: string; avatar: string | null }
  /**
   * Persona sobre la que recae la acción, si sigue existiendo. De un alumno que
   * ya no está en la clase llega solo el papel, sin id ni nombre.
   */
  target: { id: string | null; name: string | null; role: string | null } | null
  entity: { type: string; id: string | null } | null
  params: Record<string, unknown>
}

export interface ClassHistoryResponse {
  entries: ClassHistoryEntry[]
  total: number
  page: number
  limit: number
  totalPages: number
  filters: {
    actors: { id: string; name: string }[]
    types: ClassHistoryType[]
  }
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
  /** Tramos de horario; las clases antiguas guardan un objeto único. */
  scheduleConfig?: ScheduleConfig | ScheduleConfig[]
  createdAt: Date
  updatedAt: Date
  // Estadísticas calculadas (opcionales, se añaden en el handler)
  stats?: ClassStats
  status?: ClassStatus
  /** Acceso propio y profesorado: los devuelve la API de profesor en el listado y en el detalle. */
  myAccess?: ClassAccess | null
  teachers?: ClassTeacher[]
  /** Cuándo se envió a la papelera; nulo si no está en ella. Lo trae el detalle del profesor. */
  deletedAt?: string | null
}

/** Una clase en la papelera, tal como la lista `GET /teacher/classes/trash`. */
export interface TrashedClass {
  id: string
  name: string
  backgroundImage?: string | null
  deletedAt: string
  /** Cuándo la borra la purga. */
  purgeAt: string
  /** Días que le quedan, redondeando hacia arriba; 0 si ya le toca. */
  daysLeft: number
  /** Quién la envió; nulo si su cuenta ya no existe. */
  deletedBy: { isMe: boolean; name: string | null } | null
}

export interface ClassTrashResponse {
  classes: TrashedClass[]
  total: number
  /** Días que pasa una clase en la papelera. */
  purgeDays: number
}

/** Lo que se perdería al borrar la clase, para el aviso antes de enviarla a la papelera. */
export interface ClassDeletionImpact {
  classId: string
  name: string
  inTrash: boolean
  isTemplate: boolean
  students: number
  submissionsWithFile: number
  missions: number
  shopPurchases: number
  /** Profesorado que no es propietario y deja de tener la clase. */
  otherTeachers: number
  /** Cuentas sin correo nacidas en la clase: las nunca usadas se borran; el resto queda para la administración. */
  managedAccounts: { deleted: number; unmanaged: number }
  purgeDays: number
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
/** Un tramo visual del sistema de niveles: rango de niveles + título + color. */
export interface LevelTier {
  fromLevel: number
  toLevel: number
  title: string
  color: string
}

/** Configuración del sistema de niveles de una clase (curva de XP + tramos). */
export interface LevelConfig {
  /** 'curve' = XP por fórmula; 'custom' = XP manual por nivel. */
  mode: 'curve' | 'custom'
  baseXp: number
  exponent: number
  cap: number
  /** Modo manual: XP para superar cada nivel (levelXp[L-1] = nivel L → L+1). */
  levelXp?: number[]
  tiers: LevelTier[]
}

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
  levelConfig?: LevelConfig
  scheduleConfig?: ScheduleConfig | ScheduleConfig[]
}

/**
 * Guía de clase (instrucciones del profesor en markdown)
 */
export interface ClassGuideData {
  teacherName: string
  content: string
  lastUpdated: string
}
