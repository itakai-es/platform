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
 * Aviso interno tal como lo devuelve `GET /notifications`. Solo lleva lo que
 * manda el servidor: el texto ya viene compuesto en el idioma del destinatario
 * y la fecha, como cadena ISO.
 */
export interface Notification {
  id: string
  type: NotificationType
  title: string
  message: string
  priority: NotificationPriority
  isRead: boolean
  /** Ruta interna a la que lleva el aviso; algunos tipos no tienen destino. */
  actionUrl: string | null
  /** Datos propios del tipo (ids de clase, misión, entrega…). */
  metadata: Record<string, unknown> | null
  createdAt: string
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
 * Filtro de la página de avisos
 */
export type NotificationFilter = 'all' | 'unread'

/**
 * Respuesta de `GET /notifications` (los 50 avisos más recientes)
 */
export interface NotificationsResponse {
  notifications: Notification[]
  total: number
  unreadCount: number
}
