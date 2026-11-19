/**
 * useTeacherClassDetail — estado compartido del detalle de clase del profesor.
 *
 * Las subrutas `/profesor/classes/:id/{resumen,historia,guia,misiones,ranking,
 * tienda,comportamientos,ajustes}` viven cada una en su propio archivo, pero
 * comparten la carga principal de datos (classData, students, missions…) y los
 * settings de la clase. Este composable centraliza:
 *  - el fetch principal (`loadAll`) que carga clase + estudiantes + misiones
 *    + dispara los fetches diferidos de guía y actividades
 *  - los fetches diferidos (`ensureGuide`, `ensureActivities`) que una tab puede
 *    lanzar bajo demanda si quiere refrescar
 *  - la analítica del Resumen (`ensureAnalytics`), por periodo, que solo pide esa
 *    pestaña
 *  - el estado de UI compartido entre el layout y los hijos (`showInviteModal`,
 *    `selectedActivityBadge`)
 *  - las derivadas (`classSettings`, `resolvedClassImage`)
 *  - qué puede hacer el usuario en la clase (`can`), a partir de su acceso.
 *
 * El estado se memoriza por `classId` con `useState` para que sea SSR-safe y
 * para no refetchar al navegar entre tabs de la misma clase. Al cambiar de
 * clase el layout llama `loadAll(id, true)` y resetea.
 */
import { resolveClassSettings } from '~/utils/class-settings'
import { loadClassContent } from '~/utils/class-trash'
import type { ScheduleConfig } from '~/types/schedule.types'
import type { ClassAccess } from '~/types/class.types'
import type { AnalyticsPeriodPreset, ClassAnalytics } from '~/types/analytics.types'

/** Una migaja de más tras el nombre de la clase, en la cabecera (una página dentro de una pestaña). */
export interface ClassBreadcrumbStep {
  label: string
  to?: string
}

interface State {
  classData: any | null
  students: any[]
  missions: any[]
  classGuide: { content: string; lastUpdated?: string } | null
  rawActivities: any[]
  isLoading: boolean
  isLoaded: boolean
  // Flags explícitos por endpoint para que `ensureX()` sepa si saltar la
  // llamada sin tener que mirar si los datos están vacíos (un guide=null tras
  // fetchar es válido y no debe disparar refetch en cada visita).
  guideFetched: boolean
  activitiesFetched: boolean
  isLoadingGuide: boolean
  isLoadingActivities: boolean
  showInviteModal: boolean
  selectedActivityBadge: { image: string; text: string } | null
  // La analítica se guarda por periodo: volver a uno ya visto no enseña esqueletos.
  analytics: Partial<Record<AnalyticsPeriodPreset, ClassAnalytics>>
  // Peticiones en vuelo (empiezan sin ninguna: el esqueleto sale de no tener datos).
  analyticsFetching: Partial<Record<AnalyticsPeriodPreset, boolean>>
  analyticsError: Partial<Record<AnalyticsPeriodPreset, 'error' | 'rate_limited'>>
  breadcrumbSteps: ClassBreadcrumbStep[]
}

function emptyState(): State {
  return {
    classData: null,
    students: [],
    missions: [],
    classGuide: null,
    rawActivities: [],
    isLoading: true,
    isLoaded: false,
    guideFetched: false,
    activitiesFetched: false,
    isLoadingGuide: false,
    isLoadingActivities: false,
    showInviteModal: false,
    selectedActivityBadge: null,
    analytics: {},
    analyticsFetching: {},
    analyticsError: {},
    breadcrumbSteps: [],
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
          stats: classResult.stats || { missionsCounted: 0, pendingReviews: 0 },
        }
      }
      // En la papelera, solo el aviso: ni alumnado ni misiones (ver `loadClassContent`).
      const content = await loadClassContent(state.value.classData, {
        students: async () => (await teacherStore.fetchStudents(classId.value))?.students || [],
        missions: async () =>
          (await teacherStore.fetchClassMissions(classId.value, true))?.missions || [],
      })
      state.value.students = content.students
      state.value.missions = content.missions
      state.value.isLoaded = true
      if (state.value.classData?.deletedAt) return
      // Fetches diferidos (no bloqueantes). Cada uno respeta su propio flag,
      // así que si una tab ya los disparó por su cuenta, aquí no se duplican.
      void ensureGuide()
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
   * perdido) mientras tanto. Sus misiones y su alumnado, como los tenga el
   * almacén, que los vuelve a pedir si los ha dado por caducados (p. ej. se ha
   * creado o importado una misión, o se han dado altas, desde esta u otra
   * pantalla): la pestaña Misiones y el mapa los leen de aquí, no del almacén.
   * La actividad, siempre: también la mueve el alumnado. También lo llama la
   * clase abierta cuando cambia algo en ella (`classDataRevision` del almacén).
   */
  async function revalidate() {
    void ensureActivities(true)
    try {
      const fresh = await teacherStore.fetchClassById(classId.value, true)
      if (fresh && state.value.classData) {
        state.value.classData = { ...state.value.classData, ...fresh }
      }
      // Si mientras tanto ha ido a la papelera, solo el aviso (ver `loadClassContent`).
      const content = await loadClassContent(state.value.classData, {
        students: async () => (await teacherStore.fetchStudents(classId.value)).students,
        missions: async () => (await teacherStore.ensureClassMissions(classId.value)).missions,
      })
      state.value.missions = content.missions
      state.value.students = content.students
    } catch (error) {
      if (teacherStore.isClassGone(error)) forget()
    }
  }

  /**
   * Vuelve a pedir las misiones de la clase, p. ej. tras importar una o tras
   * encender o apagar el mapa (al encenderlo, la API recoloca el orden).
   */
  async function reloadMissions() {
    try {
      const res = await teacherStore.fetchClassMissions(classId.value, true)
      state.value.missions = res.missions
    } catch (error) {
      console.error('Error refreshing class missions:', error)
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

  /**
   * La analítica de un periodo. Corta por lo que ya tiene y por lo que hay en
   * vuelo, nunca por un «cargando» que empieza en verdadero (se quedaría en el
   * esqueleto para siempre): la pantalla sabe que carga porque aún no hay datos
   * ni error. Con `force` se vuelve a pedir enseñando mientras lo que hay, y si
   * eso falla se queda lo que había.
   */
  async function ensureAnalytics(period: AnalyticsPeriodPreset, force = false) {
    if (state.value.analytics[period] && !force) return
    if (state.value.analyticsFetching[period]) return
    state.value.analyticsFetching[period] = true
    state.value.analyticsError[period] = undefined
    try {
      state.value.analytics[period] = await $fetch<ClassAnalytics>(
        `${runtimeConfig.public.apiBase}/teacher/classes/${classId.value}/analytics`,
        { params: { period } }
      )
    } catch (error) {
      if (!state.value.analytics[period]) {
        const status = (error as { statusCode?: number })?.statusCode
        state.value.analyticsError[period] = status === 429 ? 'rate_limited' : 'error'
      }
    } finally {
      state.value.analyticsFetching[period] = false
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
      rankingConfig: any
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
    resolvedClassImage,
    can,
    isOwner,
    loadAll,
    revalidate,
    reloadMissions,
    forget,
    setMyAccess,
    ensureGuide,
    ensureActivities,
    ensureAnalytics,
    setClassData,
    openActivityBadge,
    closeActivityBadge,
  }
}
