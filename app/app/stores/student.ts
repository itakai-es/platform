import { defineStore } from 'pinia'
import { ref } from 'vue'
import type {
  MissionLockReason,
  MissionRarity,
  MissionRequirement,
  MissionStatus,
} from '~/types/mission.types'
import type { ActivityType } from '~/types/activity.types'
import { normalizeLegacyActivityType, validateActivityType } from '~/types/activity.types'

/**
 * Activity represents a student action that gets displayed in activity feeds
 *
 * IMPORTANT: Backend must populate username and avatar fields with the
 * class-specific profile of the student (from student_class_profiles table)
 */
export interface Activity {
  id: string
  timestamp: Date | string
  type: ActivityType

  // Class-specific student info (REQUIRED from backend)
  // Backend should fetch these from student_class_profiles table
  username?: string // Student's nickname in this class (e.g., "MateMaster99")
  avatar?: string // Student's avatar in this class (e.g., "/app/avatars/odiseo.svg")
  classId?: string // ID of the class where activity occurred

  // Activity-specific fields (populated based on type)
  missionTitle?: string
  missionXp?: number
  enigmaTitle?: string
  enigmaXp?: number
  newLevel?: number
  newTitle?: string
  className?: string
  teacherName?: string
  badgeName?: string
  badgeRarity?: string
  badgeImage?: string // Direct URL to badge image
  achievementName?: string
  xpAmount?: number
  source?: string
}

export interface StudentMission {
  id: string
  classId: string
  className: string
  title: string
  description: string
  status: MissionStatus
  rarity: MissionRarity
  progress: number
  timeRemaining?: string
  deadline?: string | null
  /** Posición en el orden de su clase (el de la progresión). */
  orderIndex?: number
  xpReward: number
  coinReward?: number
  manaReward?: number
  earnedXp?: number
  earnedCoins?: number
  earnedMana?: number
  backgroundImage?: string
  /** Por qué sale bloqueada: su docente la cerró o le falta completar otra (mapa de misiones). */
  lockReason?: MissionLockReason | null
  /** Cerrada por el camino del mapa: lo que le falta completar, en el orden de la clase. */
  requires?: MissionRequirement[]
  /** Lo que pide la misión en el mapa (ids); vacío con el mapa apagado. */
  prerequisiteIds?: string[]
}

export const useStudentStore = defineStore('student', () => {
  // State
  const activities = ref<Activity[]>([])
  const missions = ref<StudentMission[]>([])
  const isLoadingActivities = ref(true)
  const isLoadingMissions = ref(true)
  const error = ref<string | null>(null)

  // Cache flags (persist during session)
  const hasLoadedActivities = ref(false)
  const hasLoadedMissions = ref(false)

  // Actions
  /**
   * Obtiene la actividad reciente del estudiante
   */
  async function fetchRecentActivities(limit = 10, force = false) {
    // Use cached data unless forced
    if (!force && hasLoadedActivities.value) {
      return { activities: activities.value, total: activities.value.length }
    }

    try {
      isLoadingActivities.value = true
      error.value = null

      const config = useRuntimeConfig()
      const response = await $fetch<{ activities: Activity[]; total: number }>(
        `${config.public.apiBase}/students/activities`,
        {
          params: { limit },
        }
      )

      // Normalize legacy activity types
      activities.value = response.activities.map(activity => {
        const normalizedType = normalizeLegacyActivityType(activity.type as string)

        // Validate in development
        if (import.meta.env.DEV) {
          validateActivityType(normalizedType, 'student.fetchRecentActivities')
        }

        return {
          ...activity,
          type: normalizedType,
        }
      })

      hasLoadedActivities.value = true
      return { ...response, activities: activities.value }
    } catch (err: any) {
      error.value = err.message || 'Error al cargar actividades'
      console.error('Error fetching activities:', err)
      throw err
    } finally {
      isLoadingActivities.value = false
    }
  }

  /**
   * Obtiene TODAS las misiones del estudiante
   */
  async function fetchStudentMissions(force = false) {
    // Use cached data unless forced
    if (!force && hasLoadedMissions.value) {
      return { missions: missions.value, total: missions.value.length }
    }

    try {
      isLoadingMissions.value = true
      error.value = null

      const config = useRuntimeConfig()
      const response = await $fetch<{ missions: StudentMission[]; total: number }>(
        `${config.public.apiBase}/students/missions`
      )

      missions.value = response.missions
      hasLoadedMissions.value = true
      return response
    } catch (err: any) {
      error.value = err.message || 'Error al cargar misiones'
      console.error('Error fetching student missions:', err)
      throw err
    } finally {
      isLoadingMissions.value = false
    }
  }

  /**
   * Wrapper idempotente sobre fetchRecentActivities.
   *
   * Sigue el patrón canónico de `ensureX` (ver useTeacherClassDetail.ts /
   * useStudentClassDetail.ts): si el flag `hasLoadedActivities` ya está en true
   * y no se fuerza, devuelve cache sin disparar un segundo fetch; si hay un
   * fetch en vuelo, tampoco encadena otro. `force=true` ignora la bandera.
   */
  async function ensureRecentActivities(limit = 10, force = false) {
    if (hasLoadedActivities.value && !force) {
      return { activities: activities.value, total: activities.value.length }
    }
    return await fetchRecentActivities(limit, force)
  }

  /**
   * Wrapper idempotente sobre fetchStudentMissions.
   *
   * Mismo patrón canónico: respeta `hasLoadedMissions` para evitar refetch
   * y `isLoadingMissions` para no duplicar llamadas en vuelo. `force=true`
   * ignora la bandera y recarga.
   */
  async function ensureStudentMissions(force = false) {
    if (hasLoadedMissions.value && !force) {
      return { missions: missions.value, total: missions.value.length }
    }
    return await fetchStudentMissions(force)
  }

  /**
   * Limpia el estado del store
   */
  function $reset() {
    activities.value = []
    missions.value = []
    isLoadingActivities.value = true
    isLoadingMissions.value = true
    error.value = null
    hasLoadedActivities.value = false
    hasLoadedMissions.value = false
  }

  return {
    // State
    activities,
    missions,
    isLoadingActivities,
    isLoadingMissions,
    error,

    // Cache flags expuestos para que consumidores puedan inspeccionarlos
    hasLoadedActivities,
    hasLoadedMissions,

    // Actions
    fetchRecentActivities,
    fetchStudentMissions,
    ensureRecentActivities,
    ensureStudentMissions,
    $reset,
  }
})
