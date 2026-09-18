import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { Class, CreateClassData, UpdateClassData } from '~/types/class.types'
import type { EnhancedMission } from '~/types/mission.types'

interface RecentMission {
  id: string
  title: string
  status: 'urgent' | 'in-progress' | 'completed' | 'pending'
  statusText: string
}

interface ClassGuide {
  teacherName: string
  content: string
  lastUpdated: string
}

interface ClassBadge {
  id: string
  name: string
  description: string
  imageUrl: string
  rarity: 'common' | 'rare' | 'epic' | 'legendary'
  unlocked: boolean
  progress?: { current: number; total: number }
}

interface ClassActivity {
  id: string
  type: 'xp_gained' | 'badge_unlocked' | 'mission_completed' | 'level_up' | 'enigma_completed'
  timestamp: string
  xpAmount?: number
  source?: string
  badgeName?: string
  badgeRarity?: string
  badgeImage?: string
  missionTitle?: string
  missionXp?: number
  newLevel?: number
  newTitle?: string
  enigmaTitle?: string
  enigmaXp?: number
}

interface Teacher {
  id: string
  name: string
  email?: string
  avatar: string | null
}

interface StudentProgress {
  completionRate: number
  missionsCompleted: number
  missionsTotal: number
  xpEarned: number
  averageScore: number
}

interface ClassWithExtras extends Class {
  schedule?: string
  activeMissions?: number
  completionRate?: number
  backgroundImage?: string
  recentMissions?: RecentMission[]
  teacher?: Teacher
  studentProgress?: StudentProgress
  totalMissions?: number
}

interface JoinClassRequest {
  code: string
}

interface JoinClassResponse {
  success: boolean
  message: string
  class?: ClassWithExtras
}

export const useClassesStore = defineStore('classes', () => {
  // State
  const classes = ref<ClassWithExtras[]>([])
  const selectedClass = ref<ClassWithExtras | null>(null)
  const classMissions = ref<EnhancedMission[]>([])
  const classGuides = ref<Map<string, ClassGuide>>(new Map())
  const classBadges = ref<Map<string, ClassBadge[]>>(new Map())
  const classActivities = ref<Map<string, ClassActivity[]>>(new Map())
  const isLoading = ref(false)
  const isLoadingClasses = ref(false)
  const isLoadingClass = ref(false)
  const isLoadingClassMissions = ref(false)
  const isLoadingGuide = ref(false)
  const isLoadingBadges = ref(false)
  const isLoadingActivities = ref(false)
  const isJoining = ref(false)
  const error = ref<string | null>(null)

  // Cache flags (persist during session)
  const hasLoadedClasses = ref(false)
  const loadedClasses = ref<Set<string>>(new Set())
  const loadedMissions = ref<Set<string>>(new Set())
  const loadedGuides = ref<Set<string>>(new Set())
  const loadedBadges = ref<Set<string>>(new Set())
  const loadedActivities = ref<Set<string>>(new Set())

  // Getters
  const totalClasses = computed(() => classes.value.length)
  const hasClasses = computed(() => classes.value.length > 0)

  // Actions

  /**
   * Fetch classes for student (enrolled classes)
   */
  async function fetchStudentClasses(force = false) {
    // Use cached data unless forced
    if (!force && hasLoadedClasses.value) {
      return { classes: classes.value, total: classes.value.length }
    }

    try {
      isLoadingClasses.value = true
      error.value = null

      const config = useRuntimeConfig()
      const response = await $fetch<{ classes: ClassWithExtras[]; total: number }>(
        `${config.public.apiBase}/students/classes`
      )

      classes.value = response.classes || []
      hasLoadedClasses.value = true
      return response
    } catch (err: any) {
      error.value = err.message || 'Error al cargar las clases'
      console.error('Error fetching student classes:', err)
      throw err
    } finally {
      isLoadingClasses.value = false
    }
  }

  /**
   * Fetch classes for teacher (created classes)
   */
  async function fetchTeacherClasses(limit = 100, force = false) {
    // Use cached data unless forced
    if (!force && hasLoadedClasses.value) {
      return { classes: classes.value, total: classes.value.length }
    }

    try {
      isLoadingClasses.value = true
      error.value = null

      const config = useRuntimeConfig()
      const response = await $fetch<{ classes: ClassWithExtras[]; total: number }>(
        `${config.public.apiBase}/teacher/classes`,
        {
          params: { limit },
        }
      )

      classes.value = response.classes || []
      hasLoadedClasses.value = true
      return response
    } catch (err: any) {
      error.value = err.message || 'Error al cargar las clases'
      console.error('Error fetching teacher classes:', err)
      throw err
    } finally {
      isLoadingClasses.value = false
    }
  }

  /**
   * Fetch class by ID (student perspective)
   */
  async function fetchStudentClassById(classId: string, force = false) {
    // Use cached data unless forced
    if (!force && loadedClasses.value.has(classId)) {
      // Find class in classes array (cached)
      const cachedClass = classes.value.find(c => c.id === classId)
      if (cachedClass) {
        selectedClass.value = cachedClass
        return cachedClass
      }
    }

    try {
      isLoadingClass.value = true
      error.value = null

      const config = useRuntimeConfig()
      const response = await $fetch<{ class: ClassWithExtras }>(
        `${config.public.apiBase}/students/classes/${classId}`
      )

      selectedClass.value = response.class

      // Also update the class in the classes array if it exists. Merge instead
      // of replacing so list-only fields (e.g. coins/mana) survive when the
      // detail response doesn't carry them.
      const index = classes.value.findIndex(c => c.id === classId)
      if (index !== -1) {
        classes.value[index] = { ...classes.value[index], ...response.class }
      }

      loadedClasses.value.add(classId)
      return response.class
    } catch (err: any) {
      console.error('Error fetching student class by id:', err)

      if (err?.status === 404 || err?.statusCode === 404) {
        error.value = 'No se encontró la clase'
      } else if (err?.status === 403 || err?.statusCode === 403) {
        error.value = 'No estás inscrito en esta clase'
      } else {
        error.value = 'Error al cargar la clase'
      }

      throw err
    } finally {
      isLoadingClass.value = false
    }
  }

  /**
   * Fetch class by ID (teacher perspective)
   */
  async function fetchTeacherClassById(classId: string, force = false) {
    // Use cached data unless forced
    if (!force && loadedClasses.value.has(classId) && selectedClass.value?.id === classId) {
      return selectedClass.value
    }

    try {
      isLoadingClass.value = true
      error.value = null

      const config = useRuntimeConfig()
      const response = await $fetch<{ class: ClassWithExtras }>(
        `${config.public.apiBase}/teacher/classes/${classId}`
      )

      selectedClass.value = response.class
      loadedClasses.value.add(classId)
      return response.class
    } catch (err: any) {
      error.value = err.message || 'Error al cargar los detalles de la clase'
      console.error('Error fetching teacher class by id:', err)
      throw err
    } finally {
      isLoadingClass.value = false
    }
  }

  /**
   * Fetch missions for a specific class (student perspective)
   */
  async function fetchClassMissions(classId: string, force = false) {
    // Use cached data unless forced
    if (!force && loadedMissions.value.has(classId)) {
      return classMissions.value
    }

    try {
      isLoadingClassMissions.value = true
      error.value = null

      const config = useRuntimeConfig()
      const response = await $fetch<{ missions: EnhancedMission[] }>(
        `${config.public.apiBase}/students/classes/${classId}/missions`
      )

      classMissions.value = response.missions || []
      loadedMissions.value.add(classId)
      return response.missions
    } catch (err: any) {
      error.value = err.message || 'Error al cargar las misiones de la clase'
      console.error('Error fetching class missions:', err)
      classMissions.value = []
      throw err
    } finally {
      isLoadingClassMissions.value = false
    }
  }

  /**
   * Fetch guide for a specific class (student perspective)
   */
  async function fetchClassGuide(classId: string, force = false) {
    // Use cached data unless forced
    if (!force && loadedGuides.value.has(classId)) {
      const cached = classGuides.value.get(classId)
      return { guide: cached }
    }

    try {
      isLoadingGuide.value = true
      error.value = null

      const config = useRuntimeConfig()
      const response = await $fetch<{ guide: ClassGuide }>(
        `${config.public.apiBase}/students/classes/${classId}/guide`
      )

      // Store in cache (even if null, to avoid repeated requests)
      const guideData = response.guide || null
      classGuides.value.set(classId, guideData)
      loadedGuides.value.add(classId)

      return response.guide
    } catch (err: any) {
      error.value = err.message || 'Error al cargar la guía de la clase'
      console.error('Error fetching class guide:', err)
      throw err
    } finally {
      isLoadingGuide.value = false
    }
  }

  /**
   * Fetch badges for a specific class (student perspective)
   */
  async function fetchClassBadges(classId: string, force = false) {
    // Use cached data unless forced
    if (!force && loadedBadges.value.has(classId)) {
      const cached = classBadges.value.get(classId)
      if (cached) {
        return cached
      }
    }

    try {
      isLoadingBadges.value = true
      error.value = null

      const config = useRuntimeConfig()
      const response = await $fetch<{ badges: ClassBadge[] }>(
        `${config.public.apiBase}/students/classes/${classId}/badges`
      )

      const badges = response.badges || []
      classBadges.value.set(classId, badges)
      loadedBadges.value.add(classId)
      return badges
    } catch (err: any) {
      error.value = err.message || 'Error al cargar las insignias de la clase'
      console.error('Error fetching class badges:', err)
      throw err
    } finally {
      isLoadingBadges.value = false
    }
  }

  /**
   * Fetch activities for a specific class (student perspective)
   * Caches initial load, pagination always fetches fresh data
   */
  async function fetchClassActivities(classId: string, offset = 0, limit = 5, force = false) {
    // Use cached data for initial load unless forced
    if (!force && offset === 0 && loadedActivities.value.has(classId)) {
      const cached = classActivities.value.get(classId)
      if (cached && cached.length > 0) {
        return {
          activities: cached,
          total: cached.length,
        }
      }
    }

    // Solo marcar loading global en la carga inicial. En las paginadas (offset>0)
    // la página tiene su propio `loadingMore`; si tocamos el flag global aquí
    // RecentActivityCard reemplaza la lista entera por skeletons (v-if="loading"),
    // colapsa la altura del card y el navegador pierde la posición de scroll → te
    // lleva al inicio de la página justo cuando llegas al final de la lista.
    const isInitialLoad = offset === 0
    try {
      if (isInitialLoad) isLoadingActivities.value = true
      error.value = null

      const config = useRuntimeConfig()
      const response = await $fetch<{ activities: ClassActivity[]; total: number }>(
        `${config.public.apiBase}/students/classes/${classId}/activities`,
        {
          params: { offset, limit },
        }
      )

      // Store in map
      const currentActivities = classActivities.value.get(classId) || []
      if (isInitialLoad) {
        // Reset if starting from beginning
        classActivities.value.set(classId, response.activities || [])
        loadedActivities.value.add(classId)
      } else {
        // Append if loading more
        classActivities.value.set(classId, [...currentActivities, ...(response.activities || [])])
      }

      return {
        activities: response.activities || [],
        total: response.total,
      }
    } catch (err: any) {
      error.value = err.message || 'Error al cargar las actividades de la clase'
      console.error('Error fetching class activities:', err)
      throw err
    } finally {
      if (isInitialLoad) isLoadingActivities.value = false
    }
  }

  /**
   * Ensure wrappers (idempotent): respetan banderas y `isLoading*` para evitar
   * fetchs duplicados. `force=true` ignora la bandera y recarga.
   * Cada `fetchX` ya implementa su propio guard de cache; estos wrappers añaden
   * el guard extra de "ya hay una llamada en vuelo" siguiendo el patrón canónico
   * de `useTeacherClassDetail` / `useStudentClassDetail`.
   */
  async function ensureStudentClasses(force = false) {
    if (hasLoadedClasses.value && !force) return
    if (isLoadingClasses.value) return
    return fetchStudentClasses(force)
  }

  async function ensureTeacherClasses(limit = 100, force = false) {
    if (hasLoadedClasses.value && !force) return
    if (isLoadingClasses.value) return
    return fetchTeacherClasses(limit, force)
  }

  async function ensureStudentClassById(classId: string, force = false) {
    if (loadedClasses.value.has(classId) && !force) return
    if (isLoadingClass.value) return
    return fetchStudentClassById(classId, force)
  }

  async function ensureTeacherClassById(classId: string, force = false) {
    if (loadedClasses.value.has(classId) && selectedClass.value?.id === classId && !force) return
    if (isLoadingClass.value) return
    return fetchTeacherClassById(classId, force)
  }

  async function ensureClassMissions(classId: string, force = false) {
    if (loadedMissions.value.has(classId) && !force) return
    if (isLoadingClassMissions.value) return
    return fetchClassMissions(classId, force)
  }

  async function ensureClassGuide(classId: string, force = false) {
    if (loadedGuides.value.has(classId) && !force) return
    if (isLoadingGuide.value) return
    return fetchClassGuide(classId, force)
  }

  async function ensureClassBadges(classId: string, force = false) {
    if (loadedBadges.value.has(classId) && !force) return
    if (isLoadingBadges.value) return
    return fetchClassBadges(classId, force)
  }

  async function ensureClassActivities(classId: string, offset = 0, limit = 5, force = false) {
    // Sólo aplicamos la bandera al primer page; las páginas siguientes siempre
    // pasan por el fetch real (paginación no debe cachearse).
    if (offset === 0 && loadedActivities.value.has(classId) && !force) return
    if (isLoadingActivities.value) return
    return fetchClassActivities(classId, offset, limit, force)
  }

  /**
   * Join a class using invitation code (student only)
   */
  async function joinClass(data: JoinClassRequest) {
    try {
      isJoining.value = true
      error.value = null

      const config = useRuntimeConfig()
      const response = await $fetch<JoinClassResponse>(
        `${config.public.apiBase}/students/classes/join`,
        {
          method: 'POST',
          body: data,
        }
      )

      // If successful, add the class to the list and invalidate caches
      if (response.success && response.class) {
        // Check if class already exists in list
        const existingIndex = classes.value.findIndex(c => c.id === response.class!.id)
        if (existingIndex === -1) {
          classes.value.push(response.class)
        }
      }

      // Invalidate caches so dashboard reloads fresh data on next visit
      hasLoadedClasses.value = false

      // Invalidate related store caches (missions, activities, profile stats)
      try {
        const studentStore = useStudentStore()
        studentStore.$reset()
      } catch {
        // Store may not be initialized yet
      }
      try {
        const gamificationStore = useGamificationStore()
        gamificationStore.$reset()
      } catch {
        // Store may not be initialized yet
      }

      return response
    } catch (err: any) {
      error.value = err.message || 'Error al unirse a la clase'
      console.error('Error joining class:', err)
      throw err
    } finally {
      isJoining.value = false
    }
  }

  /**
   * Create a new class (teacher only)
   */
  async function createClass(data: CreateClassData) {
    isLoading.value = true
    error.value = null
    try {
      const config = useRuntimeConfig()
      const response = await $fetch<{ class: Class; message: string }>(
        `${config.public.apiBase}/teacher/classes`,
        {
          method: 'POST',
          body: data,
        }
      )
      classes.value.push(response.class)
      return response
    } catch (err: unknown) {
      error.value = (err as Error).message || 'Error al crear la clase'
      throw err
    } finally {
      isLoading.value = false
    }
  }

  /**
   * Update class (teacher only)
   */
  async function updateClass(classId: string, data: UpdateClassData) {
    isLoading.value = true
    error.value = null
    try {
      const config = useRuntimeConfig()
      const response = await $fetch<{ class: Class; message: string }>(
        `${config.public.apiBase}/teacher/classes/${classId}`,
        {
          method: 'PUT',
          body: data,
        }
      )
      const index = classes.value.findIndex(c => c.id === classId)
      if (index !== -1) {
        classes.value[index] = response.class
      }
      if (selectedClass.value?.id === classId) {
        selectedClass.value = response.class
      }
      loadedClasses.value.add(classId)
      return response
    } catch (err: unknown) {
      error.value = (err as Error).message || 'Error al actualizar la clase'
      throw err
    } finally {
      isLoading.value = false
    }
  }

  /**
   * Clear error
   */
  function clearError() {
    error.value = null
  }

  /**
   * Reset store
   */
  function $reset() {
    classes.value = []
    selectedClass.value = null
    classMissions.value = []
    classGuides.value.clear()
    classBadges.value.clear()
    classActivities.value.clear()
    isLoading.value = false
    isLoadingClasses.value = false
    isLoadingClass.value = false
    isLoadingClassMissions.value = false
    isLoadingGuide.value = false
    isLoadingBadges.value = false
    isLoadingActivities.value = false
    isJoining.value = false
    error.value = null
    // Cache flags
    hasLoadedClasses.value = false
    loadedClasses.value.clear()
    loadedMissions.value.clear()
    loadedGuides.value.clear()
    loadedBadges.value.clear()
    loadedActivities.value.clear()
  }

  return {
    // State
    classes,
    selectedClass,
    classMissions,
    classGuides,
    classBadges,
    classActivities,
    isLoading,
    isLoadingClasses,
    isLoadingClass,
    isLoadingClassMissions,
    isLoadingGuide,
    isLoadingBadges,
    isLoadingActivities,
    isJoining,
    error,

    // Cache flags expuestos para que los composables/páginas puedan
    // decidir si llamar `ensureX(force = true)`.
    hasLoadedClasses,

    // Getters
    totalClasses,
    hasClasses,

    // Actions
    fetchStudentClasses,
    fetchTeacherClasses,
    fetchStudentClassById,
    fetchTeacherClassById,
    fetchClassMissions,
    fetchClassGuide,
    fetchClassBadges,
    fetchClassActivities,
    joinClass,
    createClass,
    updateClass,
    clearError,
    $reset,

    // Ensure wrappers (patrón canónico de los composables de detalle).
    ensureStudentClasses,
    ensureTeacherClasses,
    ensureStudentClassById,
    ensureTeacherClassById,
    ensureClassMissions,
    ensureClassGuide,
    ensureClassBadges,
    ensureClassActivities,
  }
})
