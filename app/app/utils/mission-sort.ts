/**
 * Orden de los listados de misiones (pestaña Misiones de una clase y «Mis
 * Misiones» de los dos roles). Lo comparten todas las pantallas para que cada
 * opción ordene igual en todas.
 *
 * El orden por defecto es «Orden de la clase»: el de la progresión que fija el
 * profesorado (`orderIndex`; ver api/src/utils/mission-order.ts). Con misiones
 * de varias clases, van por clase (por su nombre) y, dentro de cada una, en ese
 * orden. Las fechas usan `deadline`, la fecha límite de verdad; las que no
 * tienen, al final.
 */

/** Valor del desplegable «Ordenar»: campo y sentido, como `deadline-asc`. */
export type MissionSort = string

export const DEFAULT_MISSION_SORT: MissionSort = 'order-asc'

export interface SortableMission {
  title: string
  rarity?: string
  xpReward?: number
  deadline?: string | Date | null
  /** Posición en el orden de su clase; sin ella cuenta la del listado. */
  orderIndex?: number
  classId?: string
  className?: string
  completedCount?: number
  totalStudents?: number
}

const RARITY_RANK: Record<string, number> = { comun: 1, rara: 2, epica: 3, legendaria: 4 }

function deadlineTime(value: SortableMission['deadline']): number | null {
  if (!value) return null
  const time = new Date(value).getTime()
  return Number.isNaN(time) ? null : time
}

function completion(mission: SortableMission): number {
  const total = mission.totalStudents ?? 0
  return total > 0 ? (mission.completedCount ?? 0) / total : 0
}

/**
 * Las misiones ordenadas según `sort` (sin tocar la lista de entrada). A
 * igualdad se respeta el orden en que llegaron, que es el de la API.
 */
export function sortMissions<T extends SortableMission>(
  missions: readonly T[],
  sort: MissionSort,
  locale = 'es'
): T[] {
  const [field, direction] = sort.split('-')
  const sign = direction === 'desc' ? -1 : 1
  const position = new Map(missions.map((mission, index) => [mission, index]))
  const byText = (a = '', b = '') => a.localeCompare(b, locale)

  const compare = (a: T, b: T): number => {
    switch (field) {
      case 'order':
        return (
          byText(a.className, b.className) ||
          byText(a.classId, b.classId) ||
          (a.orderIndex ?? position.get(a)!) - (b.orderIndex ?? position.get(b)!)
        )
      case 'title':
        return byText(a.title, b.title)
      case 'xp':
        return (a.xpReward ?? 0) - (b.xpReward ?? 0)
      case 'rarity':
        return (RARITY_RANK[a.rarity ?? ''] ?? 0) - (RARITY_RANK[b.rarity ?? ''] ?? 0)
      case 'completion':
        return completion(a) - completion(b)
      case 'deadline': {
        const ta = deadlineTime(a.deadline)
        const tb = deadlineTime(b.deadline)
        if (ta === null && tb === null) return 0
        if (ta === null) return 1
        if (tb === null) return -1
        return ta - tb
      }
      default:
        return 0
    }
  }

  return [...missions].sort((a, b) => sign * compare(a, b) || position.get(a)! - position.get(b)!)
}

/**
 * Las misiones en el orden de `ids` (el que devuelve la API al ordenarlas), con
 * su `orderIndex` puesto a su nueva posición. Las que no estén en `ids` van
 * detrás, en el orden que tenían.
 */
export function orderByIds<T extends { id: string; orderIndex?: number }>(
  missions: readonly T[],
  ids: readonly string[]
): T[] {
  const rank = new Map(ids.map((id, index) => [id, index]))
  return [...missions]
    .map((mission, index) => ({ mission, index }))
    .sort(
      (a, b) =>
        (rank.get(a.mission.id) ?? ids.length + a.index) -
        (rank.get(b.mission.id) ?? ids.length + b.index)
    )
    .map(({ mission }, position) => ({ ...mission, orderIndex: position }))
}
