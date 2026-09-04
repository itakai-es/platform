/**
 * Tipos de notificaciones disponibles en el sistema
 */
/**
 * Tipos de notificación. Es exactamente el enum `NotificationType` del backend
 * (`api/prisma/schema.prisma`): antes esta lista iba por su cuenta e incluía
 * tipos que el servidor no emite nunca, con lo que los que sí llegaban
 * (`join_accepted`, `join_rejected`…) se quedaban sin icono. Al añadir un tipo
 * hay que tocar los dos sitios.
 */
export type NotificationType =
  | 'mission_assigned' // Nueva misión asignada
  | 'mission_completed' // Misión completada
  | 'badge_earned' // Logro/insignia ganada
  | 'level_up' // Subida de nivel
  | 'class_invitation' // Invitación a una clase
  | 'deadline_reminder' // Recordatorio de fecha límite
  | 'join_request' // Solicitud de acceso a una clase
  | 'join_accepted' // Solicitud aceptada
  | 'join_rejected' // Solicitud rechazada
  | 'achievement_unlocked' // Logro desbloqueado
  | 'system_announcement' // Anuncio del sistema
  | 'chat_message' // Mensaje del asistente
  | 'submission_received' // Entrega pendiente de revisar (profesor)
  | 'submission_reviewed' // Entrega ya revisada (alumno)

export type NotificationPriority = 'low' | 'medium' | 'high' | 'urgent'

/**
 * Severidad de las notificaciones tipo toast
 */
export type ToastSeverity = 'success' | 'error' | 'warning' | 'info'

/**
 * Interfaz para notificaciones persistentes (panel y página)
 */
export interface Notification {
  /** ID único de la notificación */
  id: string

  /** ID del usuario destinatario */
  userId: string

  /** Tipo de notificación */
  type: NotificationType

  /** Título de la notificación */
  title: string

  /** Mensaje detallado */
  message: string

  /** Prioridad de la notificación */
  priority: NotificationPriority

  /** Si la notificación ha sido leída */
  isRead: boolean

  /** Icono personalizado (nombre del componente o URL) */
  icon?: string

  /** URL de acción (a dónde navegar al hacer click) */
  actionUrl?: string

  /** Label del botón de acción */
  actionLabel?: string

  /** Metadata adicional específica del tipo */
  metadata?: Record<string, any>

  /** Fecha de expiración (opcional) */
  expiresAt?: string

  /** Fecha de creación */
  createdAt: Date

  /** Fecha de última actualización */
  updatedAt: Date
}

/**
 * Interfaz para mensajes toast temporales
 */
export interface ToastMessage {
  /** ID único del toast */
  id: string

  /** Severidad del mensaje */
  severity: ToastSeverity

  /** Título del toast */
  title: string

  /** Mensaje del toast */
  message: string

  /** Duración en milisegundos (default: 5000) */
  duration?: number

  /** Si el toast es dismissible manualmente */
  dismissible?: boolean
}

/**
 * Opciones para mostrar un toast
 */
export interface ToastOptions {
  /** Título del toast */
  title?: string

  /** Duración en milisegundos (default: 5000) */
  duration?: number

  /** Si el toast es dismissible manualmente (default: true) */
  dismissible?: boolean
}

/**
 * Estado del store de notificaciones
 */
export interface NotificationsState {
  /** Lista de notificaciones persistentes */
  notifications: Notification[]

  /** Lista de mensajes toast activos */
  toasts: ToastMessage[]

  /** Estado de carga */
  loading: boolean

  /** Error si lo hay */
  error: string | null
}

/**
 * Filtros para la página de notificaciones
 */
export type NotificationFilter = 'all' | 'unread' | 'read'

/**
 * Payload para crear una notificación (desde backend)
 */
export interface CreateNotificationPayload {
  userId: string
  type: NotificationType
  title: string
  message: string
  priority?: NotificationPriority
  icon?: string
  actionUrl?: string
  actionLabel?: string
  metadata?: Record<string, any>
  expiresAt?: string
}

/**
 * Response del API al obtener notificaciones
 */
export interface NotificationsResponse {
  notifications: Notification[]
  total: number
  unreadCount: number
}

export interface NotificationPreferences {
  email: boolean
  push: boolean
  inApp: boolean
  types: {
    [key in NotificationType]: boolean
  }
}
