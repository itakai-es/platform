import { toDateKey } from '~/utils/schedule-occurrences'

/**
 * Asistencia de una clase, contra la API (`/teacher/classes/:id/attendance…`).
 *
 * `useClassAttendance(classId)` es «quién falta hoy»: la última lista guardada
 * hoy (fecha local de quien mira) con quien está ausente o con falta
 * justificada. Lo leen la selección «solo presentes / solo ausentes», los
 * equipos al azar y la ruleta. Sin lista hoy, `taken` es false y no falta nadie.
 *
 * `useAttendanceApi()` son las llamadas sueltas de la pantalla de pasar lista y
 * del histórico.
 */

export type AttendanceStatus = 'present' | 'absent' | 'late' | 'excused'

export const ATTENDANCE_STATUSES: AttendanceStatus[] = ['present', 'absent', 'late', 'excused']

export interface AttendanceCounts {
  present: number
  absent: number
  late: number
  excused: number
}

export interface AttendanceSession {
  id: string
  date: string
  startTime: string
  endTime: string | null
  source: 'schedule' | 'manual'
  /** Quién la guardó la última vez, con la clave de su avatar; null si su cuenta ya no está. */
  takenBy: { id: string; name: string; avatar: string | null } | null
  updatedAt: string
  counts: AttendanceCounts
  records: { studentId: string; status: AttendanceStatus; note: string | null }[]
}

export interface AttendanceCurrent {
  date: string
  session: {
    id: string
    startTime: string
    endTime: string | null
    updatedAt: string
    counts: AttendanceCounts
  } | null
  absentStudentIds: string[]
  statuses: Record<string, AttendanceStatus>
}

export interface AttendanceSummary {
  from: string
  to: string
  sessions: {
    id: string
    date: string
    startTime: string
    endTime: string | null
    counts: AttendanceCounts
  }[]
  students: (AttendanceCounts & {
    studentId: string
    total: number
    rate: number | null
    statuses: Record<string, AttendanceStatus>
  })[]
}

export interface SaveAttendanceInput {
  date: string
  startTime: string
  endTime?: string | null
  source: 'schedule' | 'manual'
  records: { studentId: string; status: AttendanceStatus }[]
}

export function useAttendanceApi() {
  const base = useRuntimeConfig().public.apiBase as string
  const url = (classId: string, path = '') => `${base}/teacher/classes/${classId}/attendance${path}`

  return {
    getDay: (classId: string, date: string) =>
      $fetch<{ date: string; sessions: AttendanceSession[] }>(url(classId), { query: { date } }),
    getCurrent: (classId: string, date: string) =>
      $fetch<AttendanceCurrent>(url(classId, '/current'), { query: { date } }),
    getSummary: (classId: string, from: string, to: string, studentId?: string) =>
      $fetch<AttendanceSummary>(url(classId, '/summary'), {
        query: { from, to, ...(studentId ? { studentId } : {}) },
      }),
    getExport: (classId: string, from: string, to: string) =>
      $fetch<AttendanceSummary>(url(classId, '/export'), { query: { from, to } }),
    save: (classId: string, body: SaveAttendanceInput) =>
      $fetch<{ created: boolean; session: AttendanceSession }>(url(classId, '/sessions'), {
        method: 'PUT',
        body,
      }),
    remove: (classId: string, sessionId: string) =>
      $fetch(url(classId, `/sessions/${sessionId}`), { method: 'DELETE' }),
  }
}

/**
 * Quién falta hoy en la clase. Compartido por clase y día (`useState`): pasar
 * lista lo refresca y lo ven a la vez la selección, los equipos y la ruleta.
 */
export function useClassAttendance(classIdRef: MaybeRefOrGetter<string>) {
  const api = useAttendanceApi()
  const classId = computed(() => toValue(classIdRef))
  const today = ref(toDateKey(new Date()))
  const state = useState<Record<string, AttendanceCurrent | null>>(
    'classAttendanceCurrent',
    () => ({})
  )
  const key = computed(() => `${classId.value}:${today.value}`)
  const loading = ref(false)

  const current = computed(() => state.value[key.value] ?? null)
  /** Hay lista guardada hoy. */
  const taken = computed(() => !!current.value?.session)
  /** Ausentes y faltas justificadas de hoy: quedan fuera de la ruleta y del azar. */
  const absentIds = computed(() => new Set(current.value?.absentStudentIds ?? []))
  const statusOf = (studentId: string): AttendanceStatus | null =>
    current.value?.statuses[studentId] ?? null

  async function refresh() {
    if (!classId.value) return
    // El día puede haber cambiado con la página abierta (pasada la medianoche).
    today.value = toDateKey(new Date())
    loading.value = true
    try {
      state.value = {
        ...state.value,
        [key.value]: await api.getCurrent(classId.value, today.value),
      }
    } finally {
      loading.value = false
    }
  }

  /** Carga si aún no se ha cargado hoy. */
  async function ensure() {
    if (state.value[key.value] === undefined) await refresh()
  }

  return { today, current, taken, absentIds, statusOf, loading, refresh, ensure }
}
