import { computed, onMounted, onUnmounted, watch } from 'vue'

/** Cada cuánto se piden avisos nuevos mientras la pestaña está a la vista. */
const REFRESH_INTERVAL_MS = 2 * 60 * 1000
/** Volver a la pestaña dispara `focus` y `visibilitychange` casi a la vez. */
const MIN_GAP_MS = 5 * 1000

/**
 * Si al usuario actual le tocan avisos: con sesión, con rol de profesorado o
 * alumnado (o el indicado) y fuera de «Ver como alumno». En esa vista el
 * profesor lleva el rol de alumno solo en memoria y sus avisos son de profesor,
 * así que ni se piden ni se enseñan.
 */
export function useNotificationsEnabled(role?: 'teacher' | 'student') {
  const authStore = useAuthStore()
  return computed(() => {
    const userRole = authStore.user?.role
    const roleMatches = role ? userRole === role : userRole === 'teacher' || userRole === 'student'
    return authStore.isAuthenticated && roleMatches && !authStore.isStudentPreview
  })
}

/**
 * Mantiene al día los avisos del menú lateral en los layouts de profesorado y
 * alumnado. No hay tiempo real: se cargan al montar el layout, al volver a la
 * pestaña y cada dos minutos mientras la pestaña está visible. Con la pestaña
 * oculta no se pide nada. Todo se suelta al desmontar.
 *
 * Solo pide avisos cuando `useNotificationsEnabled(role)` lo permite.
 */
export function useNotificationsPolling(role: 'teacher' | 'student') {
  const store = useNotificationsStore()
  const enabled = useNotificationsEnabled(role)

  /** Sin leer para el contador del menú (0 si no toca mostrarlo). */
  const unreadCount = computed(() => (enabled.value ? store.unreadCount : 0))

  let timer: ReturnType<typeof setInterval> | null = null
  let lastRefresh = 0
  let stopWatch: (() => void) | null = null

  const isVisible = () => document.visibilityState === 'visible'

  const refresh = (force = false) => {
    if (!enabled.value || !isVisible()) return
    const now = Date.now()
    if (!force && now - lastRefresh < MIN_GAP_MS) return
    lastRefresh = now
    store.fetchNotifications()
  }

  const stopTimer = () => {
    if (!timer) return
    clearInterval(timer)
    timer = null
  }

  const startTimer = () => {
    stopTimer()
    if (!enabled.value || !isVisible()) return
    timer = setInterval(() => refresh(true), REFRESH_INTERVAL_MS)
  }

  const onVisibilityChange = () => {
    if (!isVisible()) {
      stopTimer()
      return
    }
    refresh()
    startTimer()
  }

  const onFocus = () => refresh()

  onMounted(() => {
    document.addEventListener('visibilitychange', onVisibilityChange)
    window.addEventListener('focus', onFocus)
    // También cubre entrar o salir de sesión (o de la vista de alumno) sin
    // desmontar el layout.
    stopWatch = watch(
      enabled,
      isEnabled => {
        if (!isEnabled) {
          stopTimer()
          return
        }
        refresh(true)
        startTimer()
      },
      { immediate: true }
    )
  })

  onUnmounted(() => {
    stopWatch?.()
    stopTimer()
    document.removeEventListener('visibilitychange', onVisibilityChange)
    window.removeEventListener('focus', onFocus)
  })

  return { enabled, unreadCount }
}
