import type { RankingOptions, RankingResponse } from '~/types/ranking.types'
import {
  RANKING_PERIODS,
  RANKING_TYPES,
  type RankingPeriod,
  type RankingType,
} from '~/utils/ranking-config'

/** Cómo van el tipo y el periodo en la URL (`?tipo=misiones&periodo=semana`). */
const TYPE_IN_URL: Record<RankingType, string> = {
  xp: 'xp',
  missions: 'misiones',
  teams: 'equipos',
}
const PERIOD_IN_URL: Record<RankingPeriod, string> = {
  all: 'siempre',
  week: 'semana',
  season: 'temporada',
}

/**
 * El ranking que se está mirando en una clase, contra la API del alumnado o la del
 * profesorado (`url`): el tipo y el periodo elegidos y lo que responde. Quien
 * decide lo que vale es la API: se pide lo elegido y se enseña lo que devuelve
 * (la XP solo tiene «Siempre», así que volver a Misiones no pierde el periodo).
 * Lo ya pedido se guarda mientras dura la pantalla: cambiar de pestaña no parpadea.
 *
 * El tipo y el periodo van en la URL, como la vista de Alumnado (`?vista=`): atrás
 * y recargar los conservan. Sin `tipo`, el primero que ofrece la API; sin
 * `periodo`, «Siempre».
 */
export function useClassRankingBoard(url: MaybeRefOrGetter<string>) {
  const route = useRoute()
  const router = useRouter()

  function writeQuery(name: 'tipo' | 'periodo', value: string | undefined) {
    if (route.query[name] === value) return
    const { [name]: _previous, ...rest } = route.query
    void router.replace({ query: value ? { ...rest, [name]: value } : rest })
  }

  const type = computed<RankingType | undefined>({
    get: () => RANKING_TYPES.find(value => TYPE_IN_URL[value] === route.query.tipo),
    set: value => writeQuery('tipo', value ? TYPE_IN_URL[value] : undefined),
  })
  const period = computed<RankingPeriod>({
    get: () => RANKING_PERIODS.find(value => PERIOD_IN_URL[value] === route.query.periodo) ?? 'all',
    set: value => writeQuery('periodo', value === 'all' ? undefined : PERIOD_IN_URL[value]),
  })
  const data = shallowRef<RankingResponse | null>(null)
  /** Las pestañas siguen ahí mientras llega la siguiente respuesta. */
  const options = shallowRef<RankingOptions | null>(null)
  const loading = ref(false)
  const error = ref(false)

  const cache = new Map<string, RankingResponse>()
  let lastRequest = 0

  async function load(force = false) {
    const key = `${toValue(url)}|${type.value ?? ''}|${period.value}`
    const cached = force ? undefined : cache.get(key)
    if (cached) {
      lastRequest++
      data.value = cached
      options.value = cached.options
      loading.value = false
      error.value = false
      return
    }
    const request = ++lastRequest
    loading.value = true
    error.value = false
    try {
      const response = await $fetch<RankingResponse>(toValue(url), {
        query: { type: type.value, period: period.value },
      })
      if (request !== lastRequest) return
      cache.set(key, response)
      data.value = response
      options.value = response.options
    } catch (err) {
      if (request !== lastRequest) return
      console.error('Error fetching ranking:', err)
      data.value = null
      error.value = true
    } finally {
      if (request === lastRequest) loading.value = false
    }
  }

  function retry() {
    void load(true)
  }

  watch([type, period, () => toValue(url)], () => void load(), { immediate: true })

  return { type, period, data, options, loading, error, retry }
}
