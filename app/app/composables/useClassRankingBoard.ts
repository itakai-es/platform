import type { RankingOptions, RankingResponse } from '~/types/ranking.types'
import type { RankingPeriod, RankingType } from '~/utils/ranking-config'

/**
 * El ranking que se está mirando en una clase, contra la API del alumnado o la del
 * profesorado (`url`): el tipo y el periodo elegidos y lo que responde. Quien
 * decide lo que vale es la API: se pide lo elegido y se enseña lo que devuelve
 * (la XP solo tiene «Siempre», así que volver a Misiones no pierde el periodo).
 * Lo ya pedido se guarda mientras dura la pantalla: cambiar de pestaña no parpadea.
 */
export function useClassRankingBoard(url: MaybeRefOrGetter<string>) {
  const type = ref<RankingType>()
  const period = ref<RankingPeriod>('all')
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
