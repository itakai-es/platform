/**
 * Estado de una misión para filtrar los listados del profesorado. Sigue la regla
 * con la que el alumnado ve sus misiones (getMissionStatus de la API): bloqueada
 * por encima de la fecha, caducada, urgente si quedan 2 días o menos y, si no,
 * activa. Aquí «completada» es cuando la ha completado todo el alumnado.
 */
export type TeacherMissionStatus = 'activa' | 'urgente' | 'completada' | 'expirada' | 'bloqueada'

const DAY_MS = 24 * 60 * 60 * 1000

export function teacherMissionStatus(
  mission: {
    status: string
    deadline?: string | null
    completedCount?: number
    totalStudents?: number
  },
  now = Date.now()
): TeacherMissionStatus {
  const total = mission.totalStudents ?? 0
  if (total > 0 && (mission.completedCount ?? 0) >= total) return 'completada'
  if (mission.status === 'bloqueada') return 'bloqueada'
  if (mission.deadline) {
    const due = new Date(mission.deadline).getTime()
    if (due < now) return 'expirada'
    if (Math.ceil((due - now) / DAY_MS) <= 2) return 'urgente'
  }
  return 'activa'
}
