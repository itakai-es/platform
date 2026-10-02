import { defineStore } from 'pinia'
import { ref, type Ref } from 'vue'
import type {
  AdminUser,
  SystemStats,
  SystemActivity,
  SystemService,
  UserFilters,
  PaginatedUsersResponse,
  ActivityFilters,
  PaginatedActivitiesResponse,
  SystemLog,
  SystemLogFilters,
  PaginatedSystemLogsResponse,
  SystemSettings,
  AdminClass,
  AdminClassFilters,
  PaginatedClassesResponse,
  AdminMission,
  AdminMissionFilters,
  PaginatedMissionsResponse,
  AdminListQuery,
  AnalyticsData,
} from '~/types/admin.types'
import type { AccountDeletionCheck } from '~/types/profile.types'
import type { ManagedCredentials } from '~/types/auth.types'

/** Lo que comparten las respuestas de los listados que pagina el servidor. */
interface PaginatedResponse {
  total: number
  page: number
  totalPages: number
}

export const useAdminStore = defineStore('admin', () => {
  // State
  const stats = ref<SystemStats | null>(null)
  const users = ref<AdminUser[]>([])
  const activities = ref<SystemActivity[]>([])
  const services = ref<SystemService[]>([])
  const selectedUser = ref<AdminUser | null>(null)

  // Pagination state (users)
  const totalUsers = ref(0)
  const currentPage = ref(1)
  const totalPages = ref(1)

  // Activities pagination
  const totalActivities = ref(0)
  const activitiesPage = ref(1)
  const activitiesTotalPages = ref(1)

  // System logs state
  const systemLogs = ref<SystemLog[]>([])
  const totalSystemLogs = ref(0)
  const systemLogsPage = ref(1)
  const systemLogsTotalPages = ref(1)
  const isLoadingSystemLogs = ref(false)

  // Classes state
  const classes = ref<AdminClass[]>([])
  const totalClasses = ref(0)
  const classesPage = ref(1)
  const classesTotalPages = ref(1)
  const isLoadingClasses = ref(true)

  // Missions state
  const missions = ref<AdminMission[]>([])
  const totalMissions = ref(0)
  const missionsPage = ref(1)
  const missionsTotalPages = ref(1)
  const isLoadingMissions = ref(true)

  // Settings state
  const settings = ref<SystemSettings | null>(null)
  const isLoadingSettings = ref(false)
  const isSavingSettings = ref(false)

  // Analytics state
  const analytics = ref<AnalyticsData | null>(null)
  const isLoadingAnalytics = ref(false)

  // Loading states
  const isLoadingStats = ref(true)
  const isLoadingUsers = ref(true)
  const isLoadingActivities = ref(true)
  const isLoadingServices = ref(true)
  const isPerformingUserAction = ref(false)

  // Error state
  const error = ref<string | null>(null)

  // =========================================================================
  // Cache flags (ensureX patron canonico)
  // =========================================================================
  // Banderas booleanas + Maps por periodo para analytics/activities que llevan
  // un argumento de periodo. ensureX(force=true) ignora el flag.
  const hasLoadedStats = ref(false)
  const hasLoadedUsers = ref(false)
  const hasLoadedActivities = ref(false)
  const hasLoadedSystemLogs = ref(false)
  const hasLoadedSettings = ref(false)
  const hasLoadedAllClasses = ref(false)
  const hasLoadedAllMissions = ref(false)
  const hasLoadedAnalytics = ref(false)
  const hasLoadedServices = ref(false)
  const loadedAnalyticsPeriods = ref<Map<string, boolean>>(new Map())
  const loadedActivityPeriods = ref<Map<string, boolean>>(new Map())
  // Hash-based caches: clave = JSON.stringify de los filtros normalizados.
  // Permite cache fino para vistas con multiples filtros (registros).
  const loadedActivityLogHashes = ref<Map<string, boolean>>(new Map())
  const loadedSystemLogHashes = ref<Map<string, boolean>>(new Map())

  function hashFilters(filters?: object | string): string {
    if (filters === undefined || filters === null) return '__default__'
    if (typeof filters === 'string') return filters
    // Normaliza: ordena llaves, omite valores vacios/undefined para hits estables.
    const normalized: Record<string, unknown> = {}
    Object.keys(filters)
      .sort()
      .forEach(k => {
        const v = (filters as Record<string, unknown>)[k]
        if (v === undefined || v === null || v === '') return
        normalized[k] = v
      })
    return JSON.stringify(normalized)
  }

  // =========================================================================
  // Dashboard Actions
  // =========================================================================

  async function fetchStats() {
    try {
      isLoadingStats.value = true
      error.value = null
      const config = useRuntimeConfig()
      const response = await $fetch<{ stats: SystemStats }>(`${config.public.apiBase}/admin/stats`)
      stats.value = response.stats
      hasLoadedStats.value = true
      return response.stats
    } catch (err: unknown) {
      error.value = (err as Error).message || 'Error al cargar las estadísticas del sistema'
      console.error('Error fetching admin stats:', err)
      throw err
    } finally {
      isLoadingStats.value = false
    }
  }

  async function ensureStats(force = false) {
    if (hasLoadedStats.value && !force) return stats.value
    return await fetchStats()
  }

  async function fetchServices() {
    try {
      isLoadingServices.value = true
      error.value = null
      const config = useRuntimeConfig()
      const response = await $fetch<{ services: SystemService[] }>(
        `${config.public.apiBase}/admin/services`
      )
      services.value = response.services || []
      hasLoadedServices.value = true
      return response.services
    } catch (err: unknown) {
      error.value = (err as Error).message || 'Error al cargar el estado de los servicios'
      console.error('Error fetching services:', err)
      services.value = []
      throw err
    } finally {
      isLoadingServices.value = false
    }
  }

  async function ensureServices(force = false) {
    if (hasLoadedServices.value && !force) return services.value
    return await fetchServices()
  }

  // =========================================================================
  // Listados que pagina el servidor (usuarios, clases, misiones)
  // =========================================================================

  /** Parámetros de la URL de un listado: sin los vacíos ni «all», que es no filtrar. */
  function listParams(query: object) {
    const params = new URLSearchParams()
    Object.entries(query).forEach(([key, value]) => {
      if (value === undefined || value === null || value === '' || value === 'all') return
      params.append(key, String(value))
    })
    return params
  }

  /**
   * Un listado del panel que pagina el servidor. Recuerda la última consulta
   * pedida, para repetirla tras una acción, y la que está pintada, para no
   * pedirla otra vez al volver a la página. Cada petición lleva un número: la
   * respuesta de una búsqueda que ya ha cambiado llega tarde y se descarta.
   */
  function pagedList<T, Q extends AdminListQuery, R extends PaginatedResponse>(list: {
    path: string
    items: Ref<T[]>
    total: Ref<number>
    page: Ref<number>
    totalPages: Ref<number>
    loading: Ref<boolean>
    loaded: Ref<boolean>
    pick: (response: R) => T[] | undefined
    errorMessage: string
  }) {
    let lastQuery: Q = {} as Q
    /** La consulta de la última petición, esté en camino o no. */
    let requestedHash: string | null = null
    /** La consulta de lo que está pintado; null si lo pintado no es de ninguna. */
    let shownHash: string | null = null
    let request = 0

    /** `quiet`: sin el esqueleto de carga, y si falla se queda la página que había. */
    async function fetch(query: Q = {} as Q, { quiet = false } = {}) {
      const current = ++request
      const hash = hashFilters(query)
      lastQuery = { ...query }
      requestedHash = hash
      try {
        if (!quiet) list.loading.value = true
        error.value = null
        const config = useRuntimeConfig()
        const response = (await $fetch<R>(
          `${config.public.apiBase}${list.path}?${listParams(query)}`
        )) as R
        if (current !== request) return response
        list.items.value = list.pick(response) || []
        list.total.value = response.total || 0
        list.page.value = response.page || 1
        list.totalPages.value = response.totalPages || 1
        list.loaded.value = true
        shownHash = hash
        return response
      } catch (err: unknown) {
        if (current === request) {
          error.value = (err as Error).message || list.errorMessage
          if (!quiet) {
            // La lista vacía no es la respuesta de ninguna consulta: volver a
            // la que se veía antes tiene que pedirla otra vez.
            list.items.value = []
            shownHash = null
          }
        }
        console.error(`Error fetching ${list.path}:`, err)
        throw err
      } finally {
        if (current === request) list.loading.value = false
      }
    }

    async function ensure(query: Q = {} as Q, force = false) {
      const hash = hashFilters(query)
      if (list.loaded.value && !force && shownHash === hash) {
        // Se vuelve a lo que ya está pintado mientras otra consulta sigue en
        // camino: su respuesta ya no es de esta pantalla y no puede pisarla al
        // llegar (se vería una página con la paginación de otra).
        if (requestedHash !== hash) {
          request++
          list.loading.value = false
          lastQuery = { ...query }
          requestedHash = hash
        }
        return list.items.value
      }
      await fetch(query)
      return list.items.value
    }

    /** Vuelve a pedir la página que se ve, con los mismos filtros. No lanza. */
    async function refresh() {
      try {
        await fetch(lastQuery, { quiet: true })
      } catch {
        /* ya registrado; se queda la página que había */
      }
    }

    return { fetch, ensure, refresh }
  }

  // =========================================================================
  // User Management Actions
  // =========================================================================

  const usersList = pagedList<AdminUser, UserFilters, PaginatedUsersResponse>({
    path: '/admin/users',
    items: users,
    total: totalUsers,
    page: currentPage,
    totalPages,
    loading: isLoadingUsers,
    loaded: hasLoadedUsers,
    pick: response => response.users,
    errorMessage: 'Error al cargar las cuentas',
  })
  const fetchUsers = usersList.fetch
  const ensureUsers = usersList.ensure
  /**
   * Tras cada acción sobre una cuenta se vuelve a pedir la página que se ve, con
   * los filtros vigentes: la tarjeta puede haber cambiado (sus clases, su estado)
   * o haber dejado de casar con un filtro, y el total también cambia.
   */
  const refreshUsers = usersList.refresh

  /** Sustituye la tarjeta de un usuario por la que devuelve la API, que viene entera. */
  function replaceUser(user: AdminUser | undefined) {
    if (!user) return
    const idx = users.value.findIndex(u => u.id === user.id)
    if (idx !== -1) users.value[idx] = user
  }

  async function suspendUser(userId: string, reason?: string) {
    try {
      isPerformingUserAction.value = true
      error.value = null
      const config = useRuntimeConfig()
      const response = await $fetch<{ success: boolean; message: string; user: AdminUser }>(
        `${config.public.apiBase}/admin/users/${userId}/suspend`,
        { method: 'PUT', body: { reason } }
      )
      replaceUser(response.user)
      await refreshUsers()
      return response
    } catch (err: unknown) {
      error.value = (err as Error).message || 'Error al suspender la cuenta'
      console.error('Error suspending user:', err)
      throw err
    } finally {
      isPerformingUserAction.value = false
    }
  }

  async function activateUser(userId: string) {
    try {
      isPerformingUserAction.value = true
      error.value = null
      const config = useRuntimeConfig()
      const response = await $fetch<{ success: boolean; message: string; user: AdminUser }>(
        `${config.public.apiBase}/admin/users/${userId}/activate`,
        { method: 'PUT' }
      )
      replaceUser(response.user)
      await refreshUsers()
      return response
    } catch (err: unknown) {
      error.value = (err as Error).message || 'Error al activar la cuenta'
      console.error('Error activating user:', err)
      throw err
    } finally {
      isPerformingUserAction.value = false
    }
  }

  /**
   * Da de alta una cuenta de alumnado sin correo en una clase de la instancia.
   * Devuelve el usuario con el que ha nacido —que puede no ser el escrito, si
   * estaba cogido— y su contraseña temporal, que solo se ve una vez.
   */
  async function createManagedUser(input: {
    classId: string
    name: string
    username?: string
  }): Promise<ManagedCredentials> {
    try {
      isPerformingUserAction.value = true
      error.value = null
      const config = useRuntimeConfig()
      const response = await $fetch<ManagedCredentials>(
        `${config.public.apiBase}/admin/users/managed`,
        { method: 'POST', body: input }
      )
      await refreshUsers()
      return response
    } catch (err: unknown) {
      error.value = (err as Error).message || 'Error al crear la cuenta'
      console.error('Error creating managed user:', err)
      throw err
    } finally {
      isPerformingUserAction.value = false
    }
  }

  /**
   * Restablece la contraseña de una cuenta que lleva el profesorado. Devuelve
   * la contraseña temporal: solo se ve una vez, aquí, y no se guarda en ningún
   * sitio; si se pierde, se restablece otra vez.
   */
  async function resetManagedPassword(userId: string) {
    try {
      isPerformingUserAction.value = true
      error.value = null
      const config = useRuntimeConfig()
      const response = await $fetch<ManagedCredentials>(
        `${config.public.apiBase}/admin/users/${userId}/reset-password`,
        { method: 'POST' }
      )
      await refreshUsers()
      return response
    } catch (err: unknown) {
      error.value = (err as Error).message || 'Error al restablecer la contraseña'
      console.error('Error resetting managed password:', err)
      throw err
    } finally {
      isPerformingUserAction.value = false
    }
  }

  /**
   * Cambia la clase desde la que el profesorado gestiona una cuenta. `null` la
   * deja sin ninguna. Al moverla, la API la matricula en la clase nueva: la
   * recarga trae sus clases y la saca de «sin correo ni clase» si estaba ahí.
   */
  async function updateHomeClass(userId: string, classId: string | null) {
    try {
      isPerformingUserAction.value = true
      error.value = null
      const config = useRuntimeConfig()
      const response = await $fetch<{
        success: boolean
        message: string
        user: { id: string; homeClassId: string | null; homeClassName: string | null }
      }>(`${config.public.apiBase}/admin/users/${userId}/home-class`, {
        method: 'PUT',
        body: { classId },
      })
      await refreshUsers()
      return response
    } catch (err: unknown) {
      error.value = (err as Error).message || 'Error al cambiar la clase de origen'
      console.error('Error updating home class:', err)
      throw err
    } finally {
      isPerformingUserAction.value = false
    }
  }

  /** Qué pasaría con las clases de una cuenta al borrarla. `null` si no se pudo saber. */
  async function fetchUserDeletionCheck(userId: string) {
    try {
      const config = useRuntimeConfig()
      return await $fetch<AccountDeletionCheck>(
        `${config.public.apiBase}/admin/users/${userId}/deletion-check`
      )
    } catch (err: unknown) {
      console.error('Error checking user deletion:', err)
      return null
    }
  }

  async function deleteUser(userId: string) {
    try {
      isPerformingUserAction.value = true
      error.value = null
      const config = useRuntimeConfig()
      const response = await $fetch<{ success: boolean; message: string }>(
        `${config.public.apiBase}/admin/users/${userId}`,
        { method: 'DELETE' }
      )
      await refreshUsers()
      return response
    } catch (err: unknown) {
      error.value = (err as Error).message || 'Error al eliminar la cuenta'
      console.error('Error deleting user:', err)
      throw err
    } finally {
      isPerformingUserAction.value = false
    }
  }

  // =========================================================================
  // Activity Logs Actions
  // =========================================================================

  async function fetchActivities(periodOrFilters?: string | ActivityFilters) {
    try {
      isLoadingActivities.value = true
      error.value = null
      const config = useRuntimeConfig()
      const queryParams = new URLSearchParams()

      let periodKey = '__default__'
      if (typeof periodOrFilters === 'string') {
        queryParams.append('period', periodOrFilters)
        periodKey = periodOrFilters
      } else if (periodOrFilters) {
        if (periodOrFilters.period) {
          queryParams.append('period', periodOrFilters.period)
          periodKey = periodOrFilters.period
        }
        if (periodOrFilters.severity && periodOrFilters.severity !== 'all')
          queryParams.append('severity', periodOrFilters.severity)
        if (periodOrFilters.type && periodOrFilters.type !== 'all')
          queryParams.append('type', periodOrFilters.type)
        if (periodOrFilters.search) queryParams.append('search', periodOrFilters.search)
        if (periodOrFilters.page) queryParams.append('page', periodOrFilters.page.toString())
        if (periodOrFilters.limit) queryParams.append('limit', periodOrFilters.limit.toString())
      }

      const response = await $fetch<{ activities: SystemActivity[] } | PaginatedActivitiesResponse>(
        `${config.public.apiBase}/admin/activities?${queryParams}`
      )

      if ('total' in response) {
        activities.value = response.activities || []
        totalActivities.value = response.total
        activitiesPage.value = response.page
        activitiesTotalPages.value = response.totalPages
      } else {
        activities.value = response.activities || []
      }
      hasLoadedActivities.value = true
      loadedActivityPeriods.value.set(periodKey, true)
      return activities.value
    } catch (err: unknown) {
      error.value = (err as Error).message || 'Error al cargar la actividad del sistema'
      console.error('Error fetching activities:', err)
      activities.value = []
      throw err
    } finally {
      isLoadingActivities.value = false
    }
  }

  async function ensureActivities(periodOrFilters?: string | ActivityFilters, force = false) {
    // Cache por hash de filtros (incluye period, severity, type, search, page...).
    // Para argumentos string (solo period) se mantiene el comportamiento previo.
    const hash = hashFilters(periodOrFilters as Record<string, unknown> | string | undefined)

    if (loadedActivityLogHashes.value.get(hash) && !force) return activities.value
    await fetchActivities(periodOrFilters)
    loadedActivityLogHashes.value.set(hash, true)
    // Conservar compatibilidad con el Map por periodo legacy.
    const periodKey =
      typeof periodOrFilters === 'string'
        ? periodOrFilters
        : periodOrFilters?.period || '__default__'
    loadedActivityPeriods.value.set(periodKey, true)
    return activities.value
  }

  // Alias semantico: ensureActivityLogs(filters) — cache por hash de filtros.
  async function ensureActivityLogs(filters?: ActivityFilters, force = false) {
    return await ensureActivities(filters, force)
  }

  // =========================================================================
  // System Logs Actions
  // =========================================================================

  async function fetchSystemLogs(filters?: SystemLogFilters) {
    try {
      isLoadingSystemLogs.value = true
      error.value = null
      const config = useRuntimeConfig()
      const queryParams = new URLSearchParams()

      if (filters) {
        if (filters.period) queryParams.append('period', filters.period)
        if (filters.level && filters.level !== 'all') queryParams.append('level', filters.level)
        if (filters.category && filters.category !== 'all')
          queryParams.append('category', filters.category)
        if (filters.search) queryParams.append('search', filters.search)
        if (filters.page) queryParams.append('page', filters.page.toString())
        if (filters.limit) queryParams.append('limit', filters.limit.toString())
      }

      const response = await $fetch<PaginatedSystemLogsResponse>(
        `${config.public.apiBase}/admin/system-logs?${queryParams}`
      )

      systemLogs.value = response.logs || []
      totalSystemLogs.value = response.total || 0
      systemLogsPage.value = response.page || 1
      systemLogsTotalPages.value = response.totalPages || 1
      hasLoadedSystemLogs.value = true
      return response
    } catch (err: unknown) {
      error.value = (err as Error).message || 'Error al cargar los logs del sistema'
      console.error('Error fetching system logs:', err)
      systemLogs.value = []
      throw err
    } finally {
      isLoadingSystemLogs.value = false
    }
  }

  async function ensureSystemLogs(filters?: SystemLogFilters, force = false) {
    // Cache por hash de filtros (period, level, category, search, page...).
    const hash = hashFilters(filters as Record<string, unknown> | undefined)
    if (loadedSystemLogHashes.value.get(hash) && !force) return systemLogs.value
    if (isLoadingSystemLogs.value) return systemLogs.value
    await fetchSystemLogs(filters)
    loadedSystemLogHashes.value.set(hash, true)
    return systemLogs.value
  }

  // =========================================================================
  // Settings Actions
  // =========================================================================

  async function fetchSettings() {
    try {
      isLoadingSettings.value = true
      error.value = null
      const config = useRuntimeConfig()
      const response = await $fetch<{ settings: SystemSettings }>(
        `${config.public.apiBase}/admin/settings`
      )
      settings.value = response.settings
      hasLoadedSettings.value = true
      return response.settings
    } catch (err: unknown) {
      error.value = (err as Error).message || 'Error al cargar la configuración'
      console.error('Error fetching settings:', err)
      throw err
    } finally {
      isLoadingSettings.value = false
    }
  }

  async function ensureSettings(force = false) {
    if (hasLoadedSettings.value && !force) return settings.value
    if (isLoadingSettings.value) return settings.value
    return await fetchSettings()
  }

  async function updateSettings(section: string, data: Record<string, unknown>) {
    try {
      isSavingSettings.value = true
      error.value = null
      const config = useRuntimeConfig()
      const response = await $fetch<{ success: boolean; settings: SystemSettings }>(
        `${config.public.apiBase}/admin/settings/${section}`,
        { method: 'PUT', body: data }
      )
      if (response.settings) settings.value = response.settings
      return response
    } catch (err: unknown) {
      error.value = (err as Error).message || 'Error al guardar la configuración'
      console.error('Error updating settings:', err)
      throw err
    } finally {
      isSavingSettings.value = false
    }
  }

  // =========================================================================
  // Classes Actions
  // =========================================================================

  const classesList = pagedList<AdminClass, AdminClassFilters, PaginatedClassesResponse>({
    path: '/admin/classes',
    items: classes,
    total: totalClasses,
    page: classesPage,
    totalPages: classesTotalPages,
    loading: isLoadingClasses,
    loaded: hasLoadedAllClasses,
    pick: response => response.classes,
    errorMessage: 'Error al cargar las clases',
  })
  const fetchAllClasses = classesList.fetch
  const ensureAllClasses = classesList.ensure

  /**
   * Busca clases para elegir una (clase de origen de una cuenta). No toca el
   * listado de la página de clases: devuelve solo las primeras coincidencias y
   * si hay más, para que quien busca afine en vez de recorrer la instancia.
   */
  async function searchClasses(search: string, limit = 8) {
    const config = useRuntimeConfig()
    const queryParams = new URLSearchParams({ limit: String(limit) })
    if (search.trim()) queryParams.append('search', search.trim())
    const response = await $fetch<PaginatedClassesResponse>(
      `${config.public.apiBase}/admin/classes?${queryParams}`
    )
    return { classes: response.classes || [], hasMore: (response.total || 0) > limit }
  }

  // =========================================================================
  // Missions Actions
  // =========================================================================

  const missionsList = pagedList<AdminMission, AdminMissionFilters, PaginatedMissionsResponse>({
    path: '/admin/missions',
    items: missions,
    total: totalMissions,
    page: missionsPage,
    totalPages: missionsTotalPages,
    loading: isLoadingMissions,
    loaded: hasLoadedAllMissions,
    pick: response => response.missions,
    errorMessage: 'Error al cargar las misiones',
  })
  const fetchAllMissions = missionsList.fetch
  const ensureAllMissions = missionsList.ensure

  // =========================================================================
  // Analytics Actions
  // =========================================================================

  async function fetchAnalytics(period: 'week' | 'month' | 'quarter' = 'month') {
    try {
      isLoadingAnalytics.value = true
      error.value = null
      const config = useRuntimeConfig()
      const response = await $fetch<{ analytics: AnalyticsData }>(
        `${config.public.apiBase}/admin/analytics?period=${period}`
      )
      analytics.value = response.analytics
      hasLoadedAnalytics.value = true
      loadedAnalyticsPeriods.value.set(period, true)
      return response.analytics
    } catch (err: unknown) {
      error.value = (err as Error).message || 'Error al cargar las analíticas'
      console.error('Error fetching analytics:', err)
      throw err
    } finally {
      isLoadingAnalytics.value = false
    }
  }

  async function ensureAnalytics(period: 'week' | 'month' | 'quarter' = 'month', force = false) {
    if (loadedAnalyticsPeriods.value.get(period) && !force) return analytics.value
    if (isLoadingAnalytics.value) return analytics.value
    return await fetchAnalytics(period)
  }

  // =========================================================================
  // Utility
  // =========================================================================

  function clearError() {
    error.value = null
  }

  function $reset() {
    stats.value = null
    users.value = []
    activities.value = []
    services.value = []
    classes.value = []
    missions.value = []
    settings.value = null
    analytics.value = null
    selectedUser.value = null
    totalUsers.value = 0
    currentPage.value = 1
    totalPages.value = 1
    totalActivities.value = 0
    activitiesPage.value = 1
    activitiesTotalPages.value = 1
    systemLogs.value = []
    totalSystemLogs.value = 0
    systemLogsPage.value = 1
    systemLogsTotalPages.value = 1
    isLoadingSystemLogs.value = false
    totalClasses.value = 0
    classesPage.value = 1
    classesTotalPages.value = 1
    totalMissions.value = 0
    missionsPage.value = 1
    missionsTotalPages.value = 1
    isLoadingStats.value = false
    isLoadingUsers.value = false
    isLoadingActivities.value = false
    isLoadingServices.value = false
    isLoadingClasses.value = false
    isLoadingMissions.value = false
    isLoadingSettings.value = false
    isLoadingAnalytics.value = false
    isPerformingUserAction.value = false
    isSavingSettings.value = false
    error.value = null
    // Reset cache flags
    hasLoadedStats.value = false
    hasLoadedUsers.value = false
    hasLoadedActivities.value = false
    hasLoadedSystemLogs.value = false
    hasLoadedSettings.value = false
    hasLoadedAllClasses.value = false
    hasLoadedAllMissions.value = false
    hasLoadedAnalytics.value = false
    hasLoadedServices.value = false
    loadedAnalyticsPeriods.value = new Map()
    loadedActivityPeriods.value = new Map()
    loadedActivityLogHashes.value = new Map()
    loadedSystemLogHashes.value = new Map()
  }

  return {
    // State
    stats,
    users,
    activities,
    services,
    systemLogs,
    classes,
    missions,
    settings,
    analytics,
    selectedUser,
    // Pagination
    totalUsers,
    currentPage,
    totalPages,
    totalActivities,
    activitiesPage,
    activitiesTotalPages,
    totalSystemLogs,
    systemLogsPage,
    systemLogsTotalPages,
    totalClasses,
    classesPage,
    classesTotalPages,
    totalMissions,
    missionsPage,
    missionsTotalPages,
    // Loading
    isLoadingStats,
    isLoadingUsers,
    isLoadingActivities,
    isLoadingServices,
    isLoadingSystemLogs,
    isLoadingClasses,
    isLoadingMissions,
    isLoadingSettings,
    isLoadingAnalytics,
    isPerformingUserAction,
    isSavingSettings,
    // Error
    error,
    // Cache flags
    hasLoadedStats,
    hasLoadedUsers,
    hasLoadedActivities,
    hasLoadedSystemLogs,
    hasLoadedSettings,
    hasLoadedAllClasses,
    hasLoadedAllMissions,
    hasLoadedAnalytics,
    hasLoadedServices,
    loadedAnalyticsPeriods,
    loadedActivityPeriods,
    loadedActivityLogHashes,
    loadedSystemLogHashes,
    // Actions (fetchX - retrocompatibles, siempre ejecutan)
    fetchStats,
    fetchServices,
    fetchUsers,
    suspendUser,
    activateUser,
    createManagedUser,
    resetManagedPassword,
    updateHomeClass,
    fetchUserDeletionCheck,
    deleteUser,
    fetchActivities,
    fetchSystemLogs,
    fetchSettings,
    updateSettings,
    fetchAllClasses,
    searchClasses,
    fetchAllMissions,
    fetchAnalytics,
    // Actions (ensureX - patron canonico con cache)
    ensureStats,
    ensureUsers,
    refreshUsers,
    ensureActivities,
    ensureActivityLogs,
    ensureSystemLogs,
    ensureSettings,
    ensureAllClasses,
    ensureAllMissions,
    ensureAnalytics,
    ensureServices,
    clearError,
    $reset,
  }
})
