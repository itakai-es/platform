/**
 * useTeacherClassDetail — estado compartido del detalle de clase del profesor.
 *
 * Las subrutas `/profesor/classes/:id/{resumen,historia,guia,misiones,ranking,
 * tienda,comportamientos,ajustes}` viven cada una en su propio archivo, pero
 * comparten la carga principal de datos (classData, students, missions…) y los
 * settings de la clase. Este composable centraliza:
 *  - el fetch principal (`loadAll`) que carga clase + estudiantes + misiones
 *    + dispara los fetches diferidos de guía, ranking y actividades
 *  - los fetches diferidos (`loadGuide`, `loadRanking`, `loadActivities`) que
 *    una tab puede lanzar bajo demanda si quiere refrescar
 *  - el estado de UI compartido entre el layout y los hijos (`showInviteModal`,
 *    `selectedActivityBadge`)
 *  - las derivadas (`classSettings`, `classStats`, `resolvedClassImage`).
 *
 * El estado se memoriza por `classId` con `useState` para que sea SSR-safe y
 * para no refetchar al navegar entre tabs de la misma clase. Al cambiar de
 * clase el layout llama `loadAll(id, true)` y resetea.
 */
import { resolveClassSettings } from '~/utils/class-settings'

interface State {
  classData: any | null
  students: any[]
  missions: any[]
  classGuide: { content: string; lastUpdated?: string } | null
  rankingData: {
    podium: any[]
    leaderboard: any[]
    stats: {
      avgXp: number
      avgProgress: number
      avgMissions: string
      participation: number
      totalStudents: number
      totalXp: number
    }
  } | null
  rawActivities: any[]
  isLoading: boolean
  isLoaded: boolean
  // Flags explícitos por endpoint para que `ensureX()` sepa si saltar la
  // llamada sin tener que mirar si los datos están vacíos (un guide=null tras
  // fetchar es válido y no debe disparar refetch en cada visita).
  guideFetched: boolean
  rankingFetched: boolean
  activitiesFetched: boolean
  isLoadingGuide: boolean
  isLoadingRanking: boolean
  isLoadingActivities: boolean
  showInviteModal: boolean
  selectedActivityBadge: { image: string; text: string } | null
}

function emptyState(): State {
  return {
    classData: null,
    students: [],
    missions: [],
    classGuide: null,
    rankingData: null,
    rawActivities: [],
    isLoading: true,
    isLoaded: false,
    guideFetched: false,
    rankingFetched: false,
    activitiesFetched: false,
    isLoadingGuide: false,
    isLoadingRanking: false,
    isLoadingActivities: false,
    showInviteModal: false,
    selectedActivityBadge: null,
  }
}

export function useTeacherClassDetail(classIdRef: Ref<string> | ComputedRef<string> | string) {
  const classId = computed(() => unref(classIdRef))
  const teacherStore = useTeacherStore()
  const runtimeConfig = useRuntimeConfig()

  // useState memoriza por clave; cambiar de classId resulta en un state separado.
  const state = useState<State>(`teacherClassDetail:${classId.value}`, emptyState)

  const classSettings = computed(() => resolveClassSettings(state.value.classData?.settings))
  const classStats = computed(
    () =>
      state.value.classData?.stats || {
        avgProgress: 0,
        participation: 0,
        avgMissionsCompleted: 0,
        totalMissions: 0,
        pendingReviews: 0,
        avgXp: 0,
      }
  )
  const resolvedClassImage = computed(() => {
    const url = state.value.classData?.backgroundImage
    if (!url) return ''
    if (url.startsWith('http') || url.startsWith('/app/')) return url
    return `${runtimeConfig.public.apiBase}${url}`
  })

  /** Carga principal: clase + estudiantes + misiones. Lanza también los fetches
   *  diferidos en background para que las tabs los encuentren listos. */
  async function loadAll(force = false) {
    if (state.value.isLoaded && !force) return
    state.value.isLoading = true
    try {
      const classResult = await teacherStore.fetchClassById(classId.value)
      if (classResult) {
        state.value.classData = {
          ...classResult,
          stats: classResult.stats || {
            avgProgress: 0,
            participation: 0,
            avgMissionsCompleted: 0,
            totalMissions: 0,
            pendingReviews: 0,
          },
        }
      }
      const studentsResult = await teacherStore.fetchStudents(classId.value)
      state.value.students =
        studentsResult?.students?.map((s: any) => ({
          ...s,
          progress: Math.round((s.totalMissionsCompleted / 12) * 100),
        })) || []
      const missionsResult = await teacherStore.fetchClassMissions(classId.value, true)
      state.value.missions = missionsResult?.missions || []
      state.value.isLoaded = true
      // Fetches diferidos (no bloqueantes). Cada uno respeta su propio flag,
      // así que si una tab ya los disparó por su cuenta, aquí no se duplican.
      void ensureGuide()
      void ensureRanking()
      void ensureActivities()
    } catch (error) {
      console.error('Error loading class:', error)
    } finally {
      state.value.isLoading = false
    }
  }

  /** Carga la guía si no se ha cargado todavía (o si `force=true`). Es idempotente:
   *  llamadas repetidas no disparan más de un fetch en vuelo. */
  async function ensureGuide(force = false) {
    if (state.value.guideFetched && !force) return
    if (state.value.isLoadingGuide) return
    state.value.isLoadingGuide = true
    try {
      const res = await teacherStore.fetchClassGuide(classId.value)
      state.value.classGuide = res.guide ?? null
      state.value.guideFetched = true
    } catch {
      state.value.classGuide = null
    } finally {
      state.value.isLoadingGuide = false
    }
  }

  async function ensureRanking(force = false) {
    if (state.value.rankingFetched && !force) return
    if (state.value.isLoadingRanking) return
    state.value.isLoadingRanking = true
    try {
      const res = await teacherStore.fetchClassRanking(classId.value, 'general')
      state.value.rankingData = res
      state.value.rankingFetched = true
    } catch {
      state.value.rankingData = null
    } finally {
      state.value.isLoadingRanking = false
    }
  }

  async function ensureActivities(force = false) {
    if (state.value.activitiesFetched && !force) return
    if (state.value.isLoadingActivities) return
    state.value.isLoadingActivities = true
    try {
      const response = await $fetch<{ activities: any[] }>(
        `${runtimeConfig.public.apiBase}/teacher/classes/${classId.value}/activities`,
        { params: { limit: 10 } }
      )
      state.value.rawActivities = response.activities
      state.value.activitiesFetched = true
    } catch {
      state.value.rawActivities = []
    } finally {
      state.value.isLoadingActivities = false
    }
  }

  // Setters/handlers que comparten el layout y los hijos.
  function setClassData(
    patch: Partial<{
      name: string
      schedule: string
      backgroundImage: string
      narrative: string
      settings: any
      levelConfig: any
    }>
  ) {
    if (!state.value.classData) return
    state.value.classData = { ...state.value.classData, ...patch }
  }
  function openActivityBadge(badge: { image?: string; text: string }) {
    if (badge.image) state.value.selectedActivityBadge = { image: badge.image, text: badge.text }
  }
  function closeActivityBadge() {
    state.value.selectedActivityBadge = null
  }

  return {
    classId,
    state,
    classSettings,
    classStats,
    resolvedClassImage,
    loadAll,
    ensureGuide,
    ensureRanking,
    ensureActivities,
    setClassData,
    openActivityBadge,
    closeActivityBadge,
  }
}
