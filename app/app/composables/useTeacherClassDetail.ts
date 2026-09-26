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
 *  - las derivadas (`classSettings`, `classStats`, `resolvedClassImage`)
 *  - qué puede hacer el usuario en la clase (`can`), a partir de su acceso.
 *
 * El estado se memoriza por `classId` con `useState` para que sea SSR-safe y
 * para no refetchar al navegar entre tabs de la misma clase. Al cambiar de
 * clase el layout llama `loadAll(id, true)` y resetea.
 */
import { resolveClassSettings } from '~/utils/class-settings'
import type { ScheduleConfig } from '~/types/schedule.types'
import type { ClassAccess } from '~/types/class.types'

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
  const { can, isOwner } = useClassPermissions(() => state.value.classData?.myAccess)
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
    if (state.value.isLoaded && !force) {
      void revalidate()
      return
    }
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
      // Sin acceso (o ya sin él): nada de lo cargado vale y la página dice que no está.
      if (teacherStore.isClassGone(error)) forget()
    } finally {
      state.value.isLoading = false
    }
  }

  /**
   * Al volver a una clase ya cargada se enseña lo guardado y, por detrás, se
   * pide la clase de nuevo: el acceso propio puede haber cambiado (o haberse
   * perdido) mientras tanto. Sus misiones, solo si el almacén las ha dado por
   * caducadas (p. ej. se ha importado una en esta clase desde otra pantalla):
   * la pestaña Misiones las lee de aquí, no del almacén.
   */
  async function revalidate() {
    try {
      const fresh = await teacherStore.fetchClassById(classId.value, true)
      if (fresh && state.value.classData) {
        state.value.classData = { ...state.value.classData, ...fresh }
      }
      if (!teacherStore.loadedClassMissions.has(classId.value)) {
        const missionsResult = await teacherStore.fetchClassMissions(classId.value, true)
        state.value.missions = missionsResult?.missions || []
      }
    } catch (error) {
      if (teacherStore.isClassGone(error)) forget()
    }
  }

  /** Vacía el estado de la clase, p. ej. al salir de ella: la próxima visita la vuelve a pedir. */
  function forget() {
    state.value = { ...emptyState(), isLoading: false }
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
      scheduleConfig: ScheduleConfig[]
    }>
  ) {
    if (!state.value.classData) return
    state.value.classData = { ...state.value.classData, ...patch }
  }
  /** Acceso propio nuevo en la clase (p. ej. tras cambiarse el nivel o pasar la propiedad). */
  function setMyAccess(access: ClassAccess | null) {
    if (state.value.classData)
      state.value.classData = { ...state.value.classData, myAccess: access }
    teacherStore.setClassAccess(classId.value, access)
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
    can,
    isOwner,
    loadAll,
    revalidate,
    forget,
    setMyAccess,
    ensureGuide,
    ensureRanking,
    ensureActivities,
    setClassData,
    openActivityBadge,
    closeActivityBadge,
  }
}
