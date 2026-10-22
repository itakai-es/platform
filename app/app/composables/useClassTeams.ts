import type {
  ShuffleInput,
  ShuffleResult,
  StudentTeams,
  TeamAwardInput,
  TeamAwardResult,
  TeamDraft,
  TeamOption,
  TeamSet,
  TeamSetKind,
} from '~/types/team.types'

/**
 * Equipos de una clase, contra la API (`/teacher/classes/:id/team-sets…`).
 *
 * `useClassTeams(classId)` guarda las agrupaciones de la clase compartidas
 * (`useState`): la pestaña de equipos, la ventana de premiar y la ruleta ven
 * las mismas y se enteran de los cambios sin volver a pedirlas.
 *
 * `useStudentTeams(classId)` es lo que ve el alumnado: su equipo y, si la
 * clase la tiene, la clasificación.
 */
export function useClassTeams(classIdRef: MaybeRefOrGetter<string>) {
  const base = useRuntimeConfig().public.apiBase as string
  const classId = computed(() => toValue(classIdRef))
  const url = (path = '') => `${base}/teacher/classes/${classId.value}${path}`

  const state = useState<Record<string, TeamSet[] | undefined>>('classTeamSets', () => ({}))
  const loading = ref(false)

  const sets = computed(() => state.value[classId.value] ?? [])
  const loaded = computed(() => state.value[classId.value] !== undefined)
  const activeSets = computed(() => sets.value.filter(s => !s.archived))

  /** Equipos de las agrupaciones sin archivar, con la suya al lado: para elegir uno. */
  const teamOptions = computed<TeamOption[]>(() =>
    activeSets.value.flatMap(set =>
      set.teams.map((team, index) => ({
        ...team,
        index,
        setId: set.id,
        setTitle: set.title,
        setKind: set.kind,
      }))
    )
  )

  function store(next: TeamSet[]) {
    state.value = { ...state.value, [classId.value]: next }
  }

  /** Sustituye (o añade) una agrupación en lo guardado. */
  function put(set: TeamSet) {
    const list = sets.value
    store(
      list.some(s => s.id === set.id) ? list.map(s => (s.id === set.id ? set : s)) : [...list, set]
    )
  }

  async function refresh() {
    if (!classId.value) return
    loading.value = true
    try {
      store((await $fetch<{ sets: TeamSet[] }>(url('/team-sets'))).sets)
    } finally {
      loading.value = false
    }
  }

  /** Carga si aún no se ha cargado. */
  async function ensure() {
    if (!loaded.value) await refresh()
  }

  async function createSet(body: { title: string; kind: TeamSetKind; teams: TeamDraft[] }) {
    const set = await $fetch<TeamSet>(url('/team-sets'), { method: 'POST', body })
    put(set)
    return set
  }

  async function updateSet(
    setId: string,
    body: { title?: string; kind?: TeamSetKind; archived?: boolean }
  ) {
    const set = await $fetch<TeamSet>(url(`/team-sets/${setId}`), { method: 'PATCH', body })
    put(set)
    return set
  }

  async function deleteSet(setId: string) {
    await $fetch(url(`/team-sets/${setId}`), { method: 'DELETE' })
    store(sets.value.filter(s => s.id !== setId))
  }

  /**
   * Edita la agrupación entera (nombre, tipo y equipos) en una petición. Lleva
   * el `updatedAt` con el que se abrió: si alguien la ha cambiado después, la
   * API responde 409 (`isStale`) y no guarda nada.
   */
  async function replaceTeams(
    setId: string,
    body: { title?: string; kind?: TeamSetKind; teams: TeamDraft[]; updatedAt: string }
  ) {
    const set = await $fetch<TeamSet>(url(`/team-sets/${setId}/members`), {
      method: 'PUT',
      body,
    })
    put(set)
    return set
  }

  /** Cambia de equipo a unas personas (null: sin equipo); nunca toca los equipos. */
  async function moveMembers(setId: string, body: { studentIds: string[]; teamId: string | null }) {
    const set = await $fetch<TeamSet>(url(`/team-sets/${setId}/moves`), { method: 'POST', body })
    put(set)
    return set
  }

  function shuffle(body: ShuffleInput) {
    return $fetch<ShuffleResult>(url('/team-sets/shuffle'), { method: 'POST', body })
  }

  async function award(teamId: string, body: TeamAwardInput) {
    const result = await $fetch<TeamAwardResult>(url(`/teams/${teamId}/awards`), {
      method: 'POST',
      body,
    })
    // El marcador nuevo, sin volver a pedir las agrupaciones.
    store(
      sets.value.map(set => ({
        ...set,
        teams: set.teams.map(t => (t.id === teamId ? { ...t, points: result.teamPoints } : t)),
      }))
    )
    return result
  }

  return {
    sets,
    activeSets,
    teamOptions,
    loaded,
    loading,
    refresh,
    ensure,
    createSet,
    updateSet,
    deleteSet,
    replaceTeams,
    moveMembers,
    shuffle,
    award,
  }
}

/** La agrupación ha cambiado desde que se leyó (otra persona u otra pestaña). */
export function isStale(error: unknown): boolean {
  return (error as { statusCode?: number } | null)?.statusCode === 409
}

export function useStudentTeams(classIdRef: MaybeRefOrGetter<string>) {
  const base = useRuntimeConfig().public.apiBase as string
  const classId = computed(() => toValue(classIdRef))
  const state = useState<Record<string, StudentTeams | null | undefined>>(
    'studentClassTeams',
    () => ({})
  )
  const data = computed(() => state.value[classId.value] ?? null)
  const loaded = computed(() => state.value[classId.value] !== undefined)

  async function ensure() {
    if (loaded.value || !classId.value) return
    try {
      const res = await $fetch<StudentTeams>(`${base}/students/classes/${classId.value}/teams`)
      state.value = { ...state.value, [classId.value]: res }
    } catch {
      // Sin equipos que enseñar: la portada sigue igual.
      state.value = { ...state.value, [classId.value]: null }
    }
  }

  return { data, loaded, ensure }
}
