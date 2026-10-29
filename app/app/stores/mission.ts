import { defineStore } from 'pinia'
import type {
  Mission,
  MissionFilters,
  MissionState,
  MissionCategoryFilter,
  CreateMissionData,
} from '~/types/mission.types'

export const useMissionStore = defineStore('mission', () => {
  // State
  const missions = ref<Mission[]>([])
  const activeMissions = ref<Mission[]>([])
  const completedMissions = ref<Mission[]>([])
  const categoryFilters = ref<MissionCategoryFilter[]>([])
  const loading = ref(true)
  const isLoadingFilters = ref(false)
  const error = ref<string | null>(null)

  // Cache flags (persist during session)
  const hasLoadedMissions = ref(false)
  const hasLoadedFilters = ref(false)
  const loadedMissionDetails = ref<Set<string>>(new Set())
  const missionDetailsCache = ref<Map<string, Mission>>(new Map())
  // Cache flags específicos del lado profesor para no colisionar con el
  // detalle student (la API/endpoint y los campos devueltos difieren).
  const loadedTeacherMissionDetails = ref<Set<string>>(new Set())
  // Estados "in-flight" para evitar carreras cuando varios componentes
  // disparan ensureX() simultáneamente antes de que el fetched flag se ponga
  // a true (patrón de useTeacherClassDetail).
  const isLoadingMissionById = ref(false)
  const isLoadingTeacherMissions = ref(false)
  const isLoadingTeacherMissionById = ref(false)
  // Flag de carga global de misiones del profesor (separado de hasLoadedMissions
  // para que cambiar entre vista student/teacher no se pise mutuamente).
  const hasLoadedTeacherMissions = ref(false)

  // Getters
  const availableMissions = computed(() => missions.value.filter(m => m.progress.done === 0))

  const inProgressMissions = computed(() =>
    missions.value.filter(m => m.progress.done > 0 && m.progress.done < m.progress.total)
  )

  const totalMissions = computed(() => missions.value.length)

  const completionRate = computed(() => {
    if (missions.value.length === 0) return 0
    return Math.round((completedMissions.value.length / missions.value.length) * 100)
  })

  // Actions
  const fetchMissions = async (filters?: MissionFilters, force = false) => {
    // Use cached data unless forced (only if no filters)
    const hasFilters = filters && filters.subject?.length

    if (!force && !hasFilters && hasLoadedMissions.value) {
      return missions.value
    }

    loading.value = true
    error.value = null

    try {
      const config = useRuntimeConfig()
      const params = new URLSearchParams()

      if (filters?.subject && filters.subject.length > 0) {
        params.append('subject', filters.subject[0]) // Simplificado: solo un subject
      }

      const url = params.toString()
        ? `${config.public.apiBase}/missions?${params}`
        : `${config.public.apiBase}/missions`

      const response = await $fetch<{ missions: Mission[]; total: number }>(url)

      missions.value = response.missions
      if (!hasFilters) {
        hasLoadedMissions.value = true
      }

      // Separar por progreso
      activeMissions.value = response.missions.filter(
        m => m.progress.done > 0 && m.progress.done < m.progress.total
      )
      completedMissions.value = response.missions.filter(m => m.progress.done >= m.progress.total)

      return response.missions
    } catch (err: any) {
      error.value = err.message || 'Error al cargar misiones'
      console.error('Error fetching missions:', err)
      throw err
    } finally {
      loading.value = false
    }
  }

  const fetchMissionById = async (id: string, force = false) => {
    // Use cached data unless forced
    if (!force && loadedMissionDetails.value.has(id)) {
      const cached = missionDetailsCache.value.get(id)
      return cached!
    }

    loading.value = true
    error.value = null

    try {
      const config = useRuntimeConfig()
      const response = await $fetch<{ mission: Mission }>(`${config.public.apiBase}/missions/${id}`)

      // Store in cache
      missionDetailsCache.value.set(id, response.mission)
      loadedMissionDetails.value.add(id)

      // Actualizar en el array de misiones
      const index = missions.value.findIndex(m => m.id === id)
      if (index !== -1) {
        missions.value[index] = response.mission
      } else {
        missions.value.push(response.mission)
      }

      return response.mission
    } catch (err: any) {
      error.value = err.message || 'Error al cargar misión'
      console.error('Error fetching mission:', err)
      throw err
    } finally {
      loading.value = false
    }
  }

  const startMission = async (id: string) => {
    loading.value = true
    error.value = null

    try {
      const config = useRuntimeConfig()
      const response = await $fetch<{ mission: Mission; message: string }>(
        `${config.public.apiBase}/missions/${id}/start`,
        {
          method: 'POST',
        }
      )

      // Actualizar en el array de misiones
      const index = missions.value.findIndex(m => m.id === id)
      if (index !== -1) {
        missions.value[index] = response.mission
      }

      // Actualizar activeMissions si tiene progreso
      if (
        response.mission.progress.done > 0 &&
        response.mission.progress.done < response.mission.progress.total
      ) {
        activeMissions.value.push(response.mission)
      }

      return response.mission
    } catch (err: any) {
      error.value = err.message || 'Error al iniciar misión'
      console.error('Error starting mission:', err)
      throw err
    } finally {
      loading.value = false
    }
  }

  const fetchStats = async () => {
    try {
      const config = useRuntimeConfig()
      const response = await $fetch<{
        total: number
        completed: number
        inProgress: number
        available: number
        completionRate: number
      }>(`${config.public.apiBase}/missions/stats`)

      return response
    } catch (err: any) {
      error.value = err.message || 'Error al cargar estadísticas'
      console.error('Error fetching mission stats:', err)
      throw err
    }
  }

  /**
   * Fetch category filters for mission filtering
   */
  const fetchFilters = async (force = false) => {
    // Use cached data unless forced
    if (!force && hasLoadedFilters.value) {
      return categoryFilters.value
    }

    try {
      isLoadingFilters.value = true

      const config = useRuntimeConfig()
      const response = await $fetch<{ filters: MissionCategoryFilter[]; total: number }>(
        `${config.public.apiBase}/missions/filters`
      )

      categoryFilters.value = response.filters
      hasLoadedFilters.value = true
      return response.filters
    } catch (err: any) {
      console.error('Error fetching filters:', err)
      // Fallback a filtro por defecto
      categoryFilters.value = [{ id: 'todas', label: 'Todas' }]
      return categoryFilters.value
    } finally {
      isLoadingFilters.value = false
    }
  }

  const clearError = () => {
    error.value = null
  }

  /**
   * Obtener misiones del profesor
   */
  const fetchTeacherMissions = async (options?: { empty?: boolean }) => {
    loading.value = true
    error.value = null

    try {
      const config = useRuntimeConfig()
      const params = new URLSearchParams()

      // Para testing E2E: permitir forzar empty state
      if (options?.empty) {
        params.append('empty', 'true')
      }

      const url = params.toString()
        ? `${config.public.apiBase}/teacher/missions?${params}`
        : `${config.public.apiBase}/teacher/missions`

      const response = await $fetch<{ missions: Mission[]; total: number }>(url)

      missions.value = response.missions

      // Separar por progreso
      activeMissions.value = response.missions.filter(
        m => m.progress.done === 0 || (m.progress.done > 0 && m.progress.done < m.progress.total)
      )
      completedMissions.value = response.missions.filter(m => m.progress.done >= m.progress.total)

      return response.missions
    } catch (err: any) {
      error.value = err.message || 'Error al cargar misiones'
      console.error('Error fetching teacher missions:', err)
      throw err
    } finally {
      loading.value = false
    }
  }

  /**
   * Obtener una misión específica del profesor por ID
   */
  const fetchTeacherMissionById = async (id: string, force = false) => {
    // Use cached data unless forced
    if (!force && loadedMissionDetails.value.has(id)) {
      const cached = missionDetailsCache.value.get(id)
      return cached!
    }

    loading.value = true
    error.value = null

    try {
      const config = useRuntimeConfig()
      const response = await $fetch<{ mission: Mission }>(`${config.public.apiBase}/missions/${id}`)

      // Store in cache
      missionDetailsCache.value.set(id, response.mission)
      loadedMissionDetails.value.add(id)

      return response.mission
    } catch (err: any) {
      error.value = err.message || 'Error al cargar misión'
      console.error('Error fetching teacher mission by id:', err)
      throw err
    } finally {
      loading.value = false
    }
  }

  /**
   * Crear una nueva misión (profesor)
   */
  const createMission = async (data: CreateMissionData) => {
    loading.value = true
    error.value = null

    try {
      const config = useRuntimeConfig()
      const response = await $fetch<{ mission: Mission; message: string }>(
        `${config.public.apiBase}/teacher/missions`,
        {
          method: 'POST',
          body: data,
        }
      )

      // Agregar la nueva misión al array local
      missions.value.push(response.mission)

      return response.mission
    } catch (err: any) {
      error.value = err.message || 'Error al crear misión'
      console.error('Error creating mission:', err)
      throw err
    } finally {
      loading.value = false
    }
  }

  /**
   * Ensure: carga las misiones si aún no se han cargado (o si force=true).
   * Idempotente — múltiples llamadas concurrentes no disparan más de un fetch
   * en vuelo. Sigue el patrón de useTeacherClassDetail.ensureX.
   */
  const ensureMissions = async (filters?: MissionFilters, force = false) => {
    const hasFilters = !!(filters && filters.subject?.length)
    // Si hay filtros activos no usamos el flag (la respuesta cambia con ellos).
    if (!force && !hasFilters && hasLoadedMissions.value) {
      return missions.value
    }
    return fetchMissions(filters, force)
  }

  const ensureFilters = async (force = false) => {
    if (!force && hasLoadedFilters.value) {
      return categoryFilters.value
    }
    if (isLoadingFilters.value) {
      return categoryFilters.value
    }
    return fetchFilters(force)
  }

  const ensureMissionById = async (id: string, force = false) => {
    if (!force && loadedMissionDetails.value.has(id)) {
      const cached = missionDetailsCache.value.get(id)
      // Cerrada por el camino del mapa: se abre en cuanto se completa lo que
      // pide, así que no se sirve de la caché (se vuelve a preguntar).
      const pathLocked =
        (cached as { lockReason?: string | null } | undefined)?.lockReason === 'path'
      if (cached && !pathLocked) return cached
    }
    if (!force && isLoadingMissionById.value) {
      const cached = missionDetailsCache.value.get(id)
      if (cached) return cached
    }
    isLoadingMissionById.value = true
    try {
      return await fetchMissionById(id, force)
    } finally {
      isLoadingMissionById.value = false
    }
  }

  const ensureTeacherMissions = async (options?: { empty?: boolean }, force = false) => {
    if (!force && hasLoadedTeacherMissions.value) {
      return missions.value
    }
    if (isLoadingTeacherMissions.value) {
      return missions.value
    }
    isLoadingTeacherMissions.value = true
    try {
      const result = await fetchTeacherMissions(options)
      hasLoadedTeacherMissions.value = true
      return result
    } finally {
      isLoadingTeacherMissions.value = false
    }
  }

  const ensureTeacherMissionById = async (id: string, force = false) => {
    if (!force && loadedTeacherMissionDetails.value.has(id)) {
      const cached = missionDetailsCache.value.get(id)
      if (cached) return cached
    }
    if (!force && isLoadingTeacherMissionById.value) {
      const cached = missionDetailsCache.value.get(id)
      if (cached) return cached
    }
    isLoadingTeacherMissionById.value = true
    try {
      const result = await fetchTeacherMissionById(id, force)
      loadedTeacherMissionDetails.value.add(id)
      return result
    } finally {
      isLoadingTeacherMissionById.value = false
    }
  }

  const $reset = () => {
    missions.value = []
    activeMissions.value = []
    completedMissions.value = []
    categoryFilters.value = []
    loading.value = true
    isLoadingFilters.value = false
    error.value = null
    hasLoadedMissions.value = false
    hasLoadedFilters.value = false
    hasLoadedTeacherMissions.value = false
    loadedMissionDetails.value.clear()
    loadedTeacherMissionDetails.value.clear()
    missionDetailsCache.value.clear()
    isLoadingMissionById.value = false
    isLoadingTeacherMissions.value = false
    isLoadingTeacherMissionById.value = false
  }

  return {
    // State
    missions,
    activeMissions,
    completedMissions,
    categoryFilters,
    loading,
    isLoadingFilters,
    isLoadingMissionById,
    isLoadingTeacherMissions,
    isLoadingTeacherMissionById,
    error,

    // Cache flags expuestos para que componentes puedan decidir si mostrar
    // skeletons o el contenido ya cacheado (mismo patrón que en otros stores).
    hasLoadedMissions,
    hasLoadedFilters,
    hasLoadedTeacherMissions,
    loadedMissionDetails,
    loadedTeacherMissionDetails,

    // Getters
    availableMissions,
    inProgressMissions,
    totalMissions,
    completionRate,

    // Actions (legacy fetchX — se mantienen para no romper APIs existentes)
    fetchMissions,
    fetchMissionById,
    startMission,
    fetchStats,
    fetchFilters,
    clearError,
    fetchTeacherMissions,
    fetchTeacherMissionById,
    createMission,

    // Ensure wrappers idempotentes (patrón useTeacherClassDetail)
    ensureMissions,
    ensureFilters,
    ensureMissionById,
    ensureTeacherMissions,
    ensureTeacherMissionById,

    $reset,
  }
})
