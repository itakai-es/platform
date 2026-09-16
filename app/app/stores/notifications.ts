/**
 * Store de Notificaciones
 * Maneja los avisos persistentes de la sección «Avisos»
 */

import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type {
  Notification,
  NotificationFilter,
  NotificationsResponse,
} from '~/types/notification.types'

export const useNotificationsStore = defineStore('notifications', () => {
  // Estado
  const notifications = ref<Notification[]>([])
  const error = ref<string | null>(null)
  // Sin leer según el servidor. La lista solo trae los 50 últimos, así que
  // contarlos en local se quedaría corto; las acciones de esta sesión lo
  // ajustan sin esperar al siguiente refresco.
  const unreadCount = ref(0)
  // Flag explícito de lista cargada: una respuesta vacía también es válida, así
  // que no basta con mirar si la lista está vacía.
  const hasLoadedNotifications = ref(false)
  // Petición en curso: el refresco periódico, el de volver a la pestaña y el de
  // la página pueden coincidir y basta con una.
  let inFlight: Promise<void> | null = null
  // Cambia en cada `reset()`: una respuesta que llega después de cerrar sesión
  // es del usuario anterior y se descarta.
  let generation = 0
  // Sube al empezar y al acabar cada acción que cambia avisos (leer, leer
  // todos, borrar). Una carga que se cruza con una acción puede traer el estado
  // de antes y deshacerla en pantalla, así que su respuesta se descarta: la
  // lista local ya está al día y el siguiente refresco trae lo demás.
  let mutations = 0

  const unreadNotifications = computed(() => notifications.value.filter(n => !n.isRead))

  const getNotificationsByFilter = (filter: NotificationFilter): Notification[] =>
    filter === 'unread' ? unreadNotifications.value : notifications.value

  const apiUrl = (path = '') => `${useRuntimeConfig().public.apiBase}/notifications${path}`

  /**
   * Carga los avisos del servidor. Si ya hay una carga en marcha, espera a esa.
   */
  const fetchNotifications = (): Promise<void> => {
    if (inFlight) return inFlight
    const requestGeneration = generation
    const requestMutations = mutations
    // Primera carga (o reintento tras un fallo): se limpia el error anterior
    if (!hasLoadedNotifications.value) error.value = null

    // Se declara antes para que el `finally` pueda compararla con `inFlight`
    let request: Promise<void> | null = null
    request = (async () => {
      try {
        const response = await $fetch<NotificationsResponse>(apiUrl())
        if (requestGeneration !== generation) return
        if (requestMutations !== mutations && hasLoadedNotifications.value) return
        notifications.value = response.notifications
        unreadCount.value = response.unreadCount
        hasLoadedNotifications.value = true
        error.value = null
      } catch (err: any) {
        if (requestGeneration !== generation) return
        error.value = err?.message || 'Error al cargar notificaciones'
        console.error('Error fetching notifications:', err)
      } finally {
        // Tras un `reset()` puede haber ya otra carga en marcha: no se toca
        if (inFlight === request) inFlight = null
      }
    })()
    inFlight = request
    return request
  }

  const decrementUnread = () => {
    unreadCount.value = Math.max(0, unreadCount.value - 1)
  }

  /** Envuelve una acción que cambia avisos para invalidar las cargas cruzadas. */
  const mutate = async (action: () => Promise<boolean>): Promise<boolean> => {
    mutations++
    try {
      return await action()
    } finally {
      mutations++
    }
  }

  /** Marca un aviso como leído. Devuelve si el servidor lo ha aceptado. */
  const markAsRead = async (notificationId: string): Promise<boolean> => {
    const current = notifications.value.find(n => n.id === notificationId)
    if (current?.isRead) return true
    return mutate(async () => {
      try {
        await $fetch(apiUrl(`/${notificationId}/read`), { method: 'PUT' })
        notifications.value = notifications.value.map(n =>
          n.id === notificationId ? { ...n, isRead: true } : n
        )
        decrementUnread()
        return true
      } catch (err: any) {
        error.value = err?.message || 'Error al marcar notificación'
        console.error('Error marking notification as read:', err)
        return false
      }
    })
  }

  /** Marca todos los avisos como leídos. */
  const markAllAsRead = (): Promise<boolean> =>
    mutate(async () => {
      try {
        await $fetch(apiUrl('/read-all'), { method: 'PUT' })
        notifications.value = notifications.value.map(n => (n.isRead ? n : { ...n, isRead: true }))
        unreadCount.value = 0
        return true
      } catch (err: any) {
        error.value = err?.message || 'Error al marcar todas las notificaciones'
        console.error('Error marking all notifications as read:', err)
        return false
      }
    })

  /** Elimina un aviso. */
  const deleteNotification = (notificationId: string): Promise<boolean> =>
    mutate(async () => {
      try {
        await $fetch(apiUrl(`/${notificationId}`), { method: 'DELETE' })
        const removed = notifications.value.find(n => n.id === notificationId)
        notifications.value = notifications.value.filter(n => n.id !== notificationId)
        if (removed && !removed.isRead) decrementUnread()
        return true
      } catch (err: any) {
        error.value = err?.message || 'Error al eliminar notificación'
        console.error('Error deleting notification:', err)
        return false
      }
    })

  /**
   * Vacía los avisos al cerrar sesión: en un ordenador compartido el siguiente
   * usuario no debe ver los del anterior, ni siquiera un instante.
   */
  const reset = (): void => {
    generation++
    inFlight = null
    notifications.value = []
    unreadCount.value = 0
    error.value = null
    hasLoadedNotifications.value = false
  }

  return {
    // Estado
    notifications,
    error,
    hasLoadedNotifications,
    unreadCount,

    // Computed
    unreadNotifications,

    // Actions
    fetchNotifications,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    getNotificationsByFilter,
    reset,
  }
})
