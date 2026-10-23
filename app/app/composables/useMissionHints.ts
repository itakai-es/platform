import type {
  MissionHintCostType,
  MissionHintDetail,
  MissionHintState,
} from '~/types/mission-detail.types'

/** Lo que el editor manda de una pista. */
export interface MissionHintInput {
  content: string
  costType: MissionHintCostType
  cost: number
}

/** Lo que vuelve al usar una pista: las pistas del alumno y su estado, ya con el cobro hecho. */
export interface MissionHintUseResult {
  hints: MissionHintDetail[]
  hintState: MissionHintState
}

/**
 * Pistas de una misión, contra la API (`/missions/:id/hints…`). El profesorado
 * las crea, edita, borra y ordena; el alumnado usa la siguiente. Cada llamada
 * devuelve lo que la API dice que queda, y un fallo, su mensaje (o el genérico
 * que se pase) y su código, sin lanzar.
 */
export function useMissionHints(missionIdRef: MaybeRefOrGetter<string>) {
  const base = useRuntimeConfig().public.apiBase as string
  const url = (path = '') => `${base}/missions/${toValue(missionIdRef)}/hints${path}`

  type Outcome<T> = { ok: true; data: T } | { ok: false; message?: string; code?: string }

  async function call<T>(request: () => Promise<T>): Promise<Outcome<T>> {
    try {
      return { ok: true, data: await request() }
    } catch (err) {
      const data = (err as { data?: { message?: string; code?: string } })?.data
      return { ok: false, message: data?.message, code: data?.code }
    }
  }

  const create = (input: MissionHintInput) =>
    call(() => $fetch<{ hint: MissionHintDetail }>(url(), { method: 'POST', body: input }))

  const update = (hintId: string, input: Partial<MissionHintInput>) =>
    call(() =>
      $fetch<{ hint: MissionHintDetail }>(url(`/${hintId}`), { method: 'PUT', body: input })
    )

  const remove = (hintId: string) =>
    call(() => $fetch<{ message: string }>(url(`/${hintId}`), { method: 'DELETE' }))

  const reorder = (ids: string[]) =>
    call(() =>
      $fetch<{ hints: MissionHintDetail[] }>(url('/reorder'), { method: 'PUT', body: { ids } })
    )

  /** Usa una pista con el coste que se veía (`seen`): si ya no es el de ahora, 409 sin cobrar. */
  const use = (hintId: string, seen: Pick<MissionHintInput, 'costType' | 'cost'>) =>
    call(() => $fetch<MissionHintUseResult>(url(`/${hintId}/use`), { method: 'POST', body: seen }))

  return { create, update, remove, reorder, use }
}
