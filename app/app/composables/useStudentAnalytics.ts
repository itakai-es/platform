import type {
  AnalyticsPeriodPreset,
  StudentAnalytics,
  StudentTimeline,
  TimelineEntry,
} from '~/types/analytics.types'
import { timelineTypeParam, type TimelineFilter } from '~/utils/analytics-view'

/** Cuántas entradas trae cada «Cargar más» del historial. */
const TIMELINE_PAGE = 15

export type AnalyticsLoadError = 'error' | 'rate_limited' | 'not_found'

export function loadErrorOf(error: unknown): AnalyticsLoadError {
  const status = (error as { statusCode?: number })?.statusCode
  if (status === 404) return 'not_found'
  return status === 429 ? 'rate_limited' : 'error'
}

/**
 * Los datos de la página de un estudiante dentro de la clase: sus cifras del
 * periodo y su historial por páginas. Cada parte carga por su cuenta: si una
 * falla, la otra sigue. Solo vive en esa página: no se guarda entre visitas.
 */
export function useStudentAnalytics(
  classId: Ref<string> | ComputedRef<string>,
  studentId: Ref<string> | ComputedRef<string>,
  period: Ref<AnalyticsPeriodPreset>
) {
  const config = useRuntimeConfig()
  const base = computed(
    () => `${config.public.apiBase}/teacher/classes/${classId.value}/students/${studentId.value}`
  )

  const analytics = ref<StudentAnalytics | null>(null)
  const analyticsError = ref<AnalyticsLoadError | null>(null)
  // Solo vale la última respuesta: cambiar de periodo o de persona deja atrás la anterior.
  let analyticsTurn = 0

  async function loadAnalytics() {
    const turn = ++analyticsTurn
    analyticsError.value = null
    try {
      const response = await $fetch<StudentAnalytics>(`${base.value}/analytics`, {
        params: { period: period.value },
      })
      if (turn === analyticsTurn) analytics.value = response
    } catch (error) {
      if (turn === analyticsTurn) {
        analytics.value = null
        analyticsError.value = loadErrorOf(error)
      }
    }
  }

  const timelineFilter = ref<TimelineFilter>('all')
  const entries = ref<TimelineEntry[]>([])
  const nextCursor = ref<string | null>(null)
  const loadingTimeline = ref(true)
  const loadingMore = ref(false)
  const timelineError = ref<AnalyticsLoadError | null>(null)
  let timelineTurn = 0

  async function fetchTimeline(cursor?: string) {
    return $fetch<StudentTimeline>(`${base.value}/timeline`, {
      params: {
        limit: TIMELINE_PAGE,
        ...(cursor ? { cursor } : {}),
        ...(timelineFilter.value !== 'all'
          ? { type: timelineTypeParam(timelineFilter.value) }
          : {}),
      },
    })
  }

  async function loadTimeline() {
    const turn = ++timelineTurn
    loadingTimeline.value = true
    timelineError.value = null
    try {
      const page = await fetchTimeline()
      if (turn !== timelineTurn) return
      entries.value = page.entries
      nextCursor.value = page.nextCursor
    } catch (error) {
      if (turn !== timelineTurn) return
      entries.value = []
      nextCursor.value = null
      timelineError.value = loadErrorOf(error)
    } finally {
      if (turn === timelineTurn) loadingTimeline.value = false
    }
  }

  async function loadMoreTimeline() {
    if (!nextCursor.value || loadingMore.value) return
    const turn = timelineTurn
    loadingMore.value = true
    try {
      const page = await fetchTimeline(nextCursor.value)
      if (turn !== timelineTurn) return
      entries.value = [...entries.value, ...page.entries]
      nextCursor.value = page.nextCursor
    } catch {
      // Lo que ya se ve se queda; el botón sigue ahí para volver a intentarlo.
    } finally {
      loadingMore.value = false
    }
  }

  watch([classId, studentId, period], () => void loadAnalytics(), { immediate: true })
  watch([classId, studentId, timelineFilter], () => void loadTimeline(), { immediate: true })

  return {
    analytics,
    analyticsError,
    loadAnalytics,
    timelineFilter,
    entries,
    nextCursor,
    loadingTimeline,
    loadingMore,
    timelineError,
    loadTimeline,
    loadMoreTimeline,
  }
}
