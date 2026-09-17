/**
 * Enrollment Module Type Definitions
 * Tipos para solicitudes de inscripción e invitaciones
 */

// Estados de solicitud de inscripción (estudiante -> profesor)
export type JoinRequestStatus = 'pending' | 'accepted' | 'rejected'

// Estados de invitación (profesor -> estudiante)
export type InvitationStatus = 'pending' | 'accepted' | 'rejected' | 'expired'

/**
 * Solicitud de unión a clase (Vía Estudiante)
 * El estudiante envía código, profesor acepta/rechaza
 */
export interface JoinRequest {
  id: string
  studentId: string
  studentName: string
  studentUsername?: string | null
  studentAvatar?: string
  /** Puede no tener: una cuenta sin correo se nombra por su usuario (`accountIdentifier`). */
  studentEmail?: string | null
  studentLevel?: number
  classId: string
  className: string
  status: JoinRequestStatus
  message?: string // Mensaje opcional del estudiante
  rejectionReason?: string // Razón si es rechazada
  createdAt: Date
  updatedAt?: Date
}

/**
 * Invitación a clase (Vía Profesor)
 * El profesor busca estudiante, estudiante acepta/rechaza
 */
export interface Invitation {
  id: string
  classId: string
  className: string
  classImage?: string
  teacherId: string
  teacherName: string
  studentId: string
  studentName?: string
  status: InvitationStatus
  message?: string // Mensaje opcional del profesor
  expiresAt?: Date // Fecha de expiración opcional
  createdAt: Date
  updatedAt?: Date
}

/**
 * Datos para crear una solicitud de unión
 */
export interface CreateJoinRequestData {
  code: string
  message?: string
}

/**
 * Datos para crear una invitación
 */
export interface CreateInvitationData {
  classId: string
  studentId: string
  message?: string
}

/**
 * Respuesta al crear solicitud de unión
 */
export interface JoinRequestResponse {
  success: boolean
  message: string
  request?: JoinRequest
}

/**
 * Respuesta al crear invitación
 */
export interface InvitationResponse {
  success: boolean
  message: string
  invitation?: Invitation
}

/**
 * Estudiante buscable (para profesor invitar)
 */
export interface SearchableStudent {
  id: string
  name: string
  username: string
  /** Nulo en una cuenta que entra con usuario: no tiene correo. */
  email: string | null
  avatar?: string
  level: number
  xp?: number
  isEnrolled: boolean // Ya está en la clase
  hasPendingRequest: boolean // Ya tiene solicitud pendiente
  hasPendingInvitation: boolean // Ya tiene invitación pendiente
}

/**
 * Respuesta de búsqueda de estudiantes
 */
export interface SearchStudentsResponse {
  students: SearchableStudent[]
  total: number
}

/**
 * Contadores de pendientes (para badges)
 */
export interface EnrollmentCounts {
  pendingInvitations: number // Invitaciones pendientes para estudiante
  pendingRequests: number // Solicitudes pendientes para profesor (total)
}
