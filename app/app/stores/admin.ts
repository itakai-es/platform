import { defineStore } from 'pinia'
import { ref } from 'vue'
import type {
  AdminUser,
  SystemStats,
  SystemActivity,
  SystemService,
  School,
  UserFilters,
  PaginatedUsersResponse,
  CreateSchoolPayload,
  UpdateSchoolPayload,
  SchoolFilters,
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
  AnalyticsData,
} from '~/types/admin.types'
import type { AccountDeletionCheck } from '~/types/profile.types'
import type { ManagedCredentials } from '~/types/auth.types'

export const useAdminStore = defineStore('admin', () => {
  // State
  const stats = ref<SystemStats | null>(null)
  const users = ref<AdminUser[]>([])
  const activities = ref<SystemActivity[]>([])
  const services = ref<SystemService[]>([])
  const schools = ref<School[]>([])
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
  const isLoadingClasses = ref(false)

  // Missions state
  const missions = ref<AdminMission[]>([])
  const totalMissions = ref(0)
  const missionsPage = ref(1)
  const missionsTotalPages = ref(1)
  const isLoadingMissions = ref(false)

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
  const isLoadingSchools = ref(true)
  const isPerformingUserAction = ref(false)
  const isPerformingSchoolAction = ref(false)

  // Error state
  const error = ref<string | null>(null)

  // =========================================================================
  // Cache flags (ensureX patron canonico)
  // =========================================================================
  // Banderas booleanas + Maps por periodo para analytics/activities que llevan
  // un argumento de periodo. ensureX(force=true) ignora el flag.
  const hasLoadedStats = ref(false)
  const hasLoadedUsers = ref(false)
  const hasLoadedSchools = ref(false)
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

  function hashFilters(filters?: Record<string, unknown> | string): string {
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
  // User Management Actions
  // =========================================================================

  async function fetchUsers(filters?: UserFilters) {
    try {
      isLoadingUsers.value = true
      error.value = null
      const config = useRuntimeConfig()
      const queryParams = new URLSearchParams()
      if (filters?.role && filters.role !== 'all') queryParams.append('role', filters.role)
      if (filters?.status && filters.status !== 'all') queryParams.append('status', filters.status)
      if (filters?.accountType && filters.accountType !== 'all')
        queryParams.append('accountType', filters.accountType)
      if (filters?.search) queryParams.append('search', filters.search)
      if (filters?.schoolId) queryParams.append('schoolId', filters.schoolId)
      if (filters?.page) queryParams.append('page', filters.page.toString())
      if (filters?.limit) queryParams.append('limit', filters.limit.toString())

      const response = await $fetch<PaginatedUsersResponse>(
        `${config.public.apiBase}/admin/users?${queryParams}`
      )
      users.value = response.users || []
      totalUsers.value = response.total || 0
      currentPage.value = response.page || 1
      totalPages.value = response.totalPages || 1
      hasLoadedUsers.value = true
      return response
    } catch (err: unknown) {
      error.value = (err as Error).message || 'Error al cargar los usuarios'
      console.error('Error fetching users:', err)
      users.value = []
      throw err
    } finally {
      isLoadingUsers.value = false
    }
  }

  async function ensureUsers(filters?: UserFilters, force = false) {
    if (hasLoadedUsers.value && !force) return users.value
    await fetchUsers(filters)
    return users.value
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
      const idx = users.value.findIndex(u => u.id === userId)
      if (idx !== -1 && response.user) users.value[idx] = response.user
      return response
    } catch (err: unknown) {
      error.value = (err as Error).message || 'Error al suspender el usuario'
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
      const idx = users.value.findIndex(u => u.id === userId)
      if (idx !== -1 && response.user) users.value[idx] = response.user
      return response
    } catch (err: unknown) {
      error.value = (err as Error).message || 'Error al activar el usuario'
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
      // La cuenta nueva no está en la lista cargada: se vuelve a pedir.
      await fetchUsers({ limit: 1000 })
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
      const idx = users.value.findIndex(u => u.id === userId)
      if (idx !== -1) users.value[idx] = { ...users.value[idx]!, mustChangePassword: true }
      return response
    } catch (err: unknown) {
      error.value = (err as Error).message || 'Error al restablecer la contraseña'
      console.error('Error resetting managed password:', err)
      throw err
    } finally {
      isPerformingUserAction.value = false
    }
  }

  /** Cambia la clase desde la que el profesorado gestiona una cuenta. `null` la deja sin ninguna. */
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
      const idx = users.value.findIndex(u => u.id === userId)
      if (idx !== -1) {
        users.value[idx] = {
          ...users.value[idx]!,
          homeClassId: response.user.homeClassId,
          homeClassName: response.user.homeClassName,
        }
      }
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
      const idx = users.value.findIndex(u => u.id === userId)
      if (idx !== -1) {
        users.value.splice(idx, 1)
        totalUsers.value -= 1
      }
      return response
    } catch (err: unknown) {
      error.value = (err as Error).message || 'Error al eliminar el usuario'
      console.error('Error deleting user:', err)
      throw err
    } finally {
      isPerformingUserAction.value = false
    }
  }

  // =========================================================================
  // School Management Actions
  // =========================================================================

  async function fetchSchools(limitOrFilters?: number | SchoolFilters) {
    try {
      isLoadingSchools.value = true
      error.value = null
      const config = useRuntimeConfig()
      const queryParams = new URLSearchParams()

      if (typeof limitOrFilters === 'number') {
        queryParams.append('limit', limitOrFilters.toString())
      } else if (limitOrFilters) {
        if (limitOrFilters.search) queryParams.append('search', limitOrFilters.search)
        if (limitOrFilters.status && limitOrFilters.status !== 'all')
          queryParams.append('status', limitOrFilters.status)
        if (limitOrFilters.page) queryParams.append('page', limitOrFilters.page.toString())
        if (limitOrFilters.limit) queryParams.append('limit', limitOrFilters.limit.toString())
      }

      const response = await $fetch<{ schools: School[] }>(
        `${config.public.apiBase}/admin/schools?${queryParams}`
      )
      schools.value = response.schools || []
      hasLoadedSchools.value = true
      return response.schools
    } catch (err: unknown) {
      error.value = (err as Error).message || 'Error al cargar las instituciones'
      console.error('Error fetching schools:', err)
      schools.value = []
      throw err
    } finally {
      isLoadingSchools.value = false
    }
  }

  async function ensureSchools(limitOrFilters?: number | SchoolFilters, force = false) {
    if (hasLoadedSchools.value && !force) return schools.value
    await fetchSchools(limitOrFilters)
    return schools.value
  }

  async function createSchool(data: CreateSchoolPayload) {
    try {
      isPerformingSchoolAction.value = true
      error.value = null
      const config = useRuntimeConfig()
      const response = await $fetch<{ success: boolean; school: School }>(
        `${config.public.apiBase}/admin/schools`,
        { method: 'POST', body: data }
      )
      if (response.school) schools.value.push(response.school)
      return response
    } catch (err: unknown) {
      error.value = (err as Error).message || 'Error al crear la institución'
      console.error('Error creating school:', err)
      throw err
    } finally {
      isPerformingSchoolAction.value = false
    }
  }

  async function updateSchool(schoolId: string, data: UpdateSchoolPayload) {
    try {
      isPerformingSchoolAction.value = true
      error.value = null
      const config = useRuntimeConfig()
      const response = await $fetch<{ success: boolean; school: School }>(
        `${config.public.apiBase}/admin/schools/${schoolId}`,
        { method: 'PUT', body: data }
      )
      const idx = schools.value.findIndex(s => s.id === schoolId)
      if (idx !== -1 && response.school) schools.value[idx] = response.school
      return response
    } catch (err: unknown) {
      error.value = (err as Error).message || 'Error al actualizar la institución'
      console.error('Error updating school:', err)
      throw err
    } finally {
      isPerformingSchoolAction.value = false
    }
  }

  async function deleteSchool(schoolId: string) {
    try {
      isPerformingSchoolAction.value = true
      error.value = null
      const config = useRuntimeConfig()
      await $fetch<{ success: boolean }>(`${config.public.apiBase}/admin/schools/${schoolId}`, {
        method: 'DELETE',
      })
      const idx = schools.value.findIndex(s => s.id === schoolId)
      if (idx !== -1) schools.value.splice(idx, 1)
    } catch (err: unknown) {
      error.value = (err as Error).message || 'Error al eliminar la institución'
      console.error('Error deleting school:', err)
      throw err
    } finally {
      isPerformingSchoolAction.value = false
    }
  }

  async function toggleSchoolStatus(schoolId: string) {
    try {
      isPerformingSchoolAction.value = true
      error.value = null
      const config = useRuntimeConfig()
      const response = await $fetch<{ success: boolean; school: School }>(
        `${config.public.apiBase}/admin/schools/${schoolId}/status`,
        { method: 'PUT' }
      )
      const idx = schools.value.findIndex(s => s.id === schoolId)
      if (idx !== -1 && response.school) schools.value[idx] = response.school
      return response
    } catch (err: unknown) {
      error.value = (err as Error).message || 'Error al cambiar el estado de la institución'
      console.error('Error toggling school status:', err)
      throw err
    } finally {
      isPerformingSchoolAction.value = false
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

  async function fetchAllClasses(filters?: AdminClassFilters) {
    try {
      isLoadingClasses.value = true
      error.value = null
      const config = useRuntimeConfig()
      const queryParams = new URLSearchParams()
      if (filters?.search) queryParams.append('search', filters.search)
      if (filters?.schoolId) queryParams.append('schoolId', filters.schoolId)
      if (filters?.status && filters.status !== 'all') queryParams.append('status', filters.status)
      if (filters?.page) queryParams.append('page', filters.page.toString())
      if (filters?.limit) queryParams.append('limit', filters.limit.toString())

      const response = await $fetch<PaginatedClassesResponse>(
        `${config.public.apiBase}/admin/classes?${queryParams}`
      )
      classes.value = response.classes || []
      totalClasses.value = response.total || 0
      classesPage.value = response.page || 1
      classesTotalPages.value = response.totalPages || 1
      hasLoadedAllClasses.value = true
      return response
    } catch (err: unknown) {
      error.value = (err as Error).message || 'Error al cargar las clases'
      console.error('Error fetching classes:', err)
      classes.value = []
      throw err
    } finally {
      isLoadingClasses.value = false
    }
  }

  async function ensureAllClasses(filters?: AdminClassFilters, force = false) {
    if (hasLoadedAllClasses.value && !force) return classes.value
    if (isLoadingClasses.value) return classes.value
    await fetchAllClasses(filters)
    return classes.value
  }

  // =========================================================================
  // Missions Actions
  // =========================================================================

  async function fetchAllMissions(filters?: AdminMissionFilters) {
    try {
      isLoadingMissions.value = true
      error.value = null
      const config = useRuntimeConfig()
      const queryParams = new URLSearchParams()
      if (filters?.search) queryParams.append('search', filters.search)
      if (filters?.schoolId) queryParams.append('schoolId', filters.schoolId)
      if (filters?.status && filters.status !== 'all') queryParams.append('status', filters.status)
      if (filters?.rarity && filters.rarity !== 'all') queryParams.append('rarity', filters.rarity)
      if (filters?.page) queryParams.append('page', filters.page.toString())
      if (filters?.limit) queryParams.append('limit', filters.limit.toString())

      const response = await $fetch<PaginatedMissionsResponse>(
        `${config.public.apiBase}/admin/missions?${queryParams}`
      )
      missions.value = response.missions || []
      totalMissions.value = response.total || 0
      missionsPage.value = response.page || 1
      missionsTotalPages.value = response.totalPages || 1
      hasLoadedAllMissions.value = true
      return response
    } catch (err: unknown) {
      error.value = (err as Error).message || 'Error al cargar las misiones'
      console.error('Error fetching missions:', err)
      missions.value = []
      throw err
    } finally {
      isLoadingMissions.value = false
    }
  }

  async function ensureAllMissions(filters?: AdminMissionFilters, force = false) {
    if (hasLoadedAllMissions.value && !force) return missions.value
    if (isLoadingMissions.value) return missions.value
    await fetchAllMissions(filters)
    return missions.value
  }

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
    schools.value = []
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
    isLoadingSchools.value = false
    isLoadingClasses.value = false
    isLoadingMissions.value = false
    isLoadingSettings.value = false
    isLoadingAnalytics.value = false
    isPerformingUserAction.value = false
    isPerformingSchoolAction.value = false
    isSavingSettings.value = false
    error.value = null
    // Reset cache flags
    hasLoadedStats.value = false
    hasLoadedUsers.value = false
    hasLoadedSchools.value = false
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
    schools,
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
    isLoadingSchools,
    isLoadingSystemLogs,
    isLoadingClasses,
    isLoadingMissions,
    isLoadingSettings,
    isLoadingAnalytics,
    isPerformingUserAction,
    isPerformingSchoolAction,
    isSavingSettings,
    // Error
    error,
    // Cache flags
    hasLoadedStats,
    hasLoadedUsers,
    hasLoadedSchools,
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
    fetchSchools,
    createSchool,
    updateSchool,
    deleteSchool,
    toggleSchoolStatus,
    fetchActivities,
    fetchSystemLogs,
    fetchSettings,
    updateSettings,
    fetchAllClasses,
    fetchAllMissions,
    fetchAnalytics,
    // Actions (ensureX - patron canonico con cache)
    ensureStats,
    ensureUsers,
    ensureSchools,
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
