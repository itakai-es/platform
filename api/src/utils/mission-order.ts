import type { Prisma } from '../generated/prisma/client.js'

/**
 * El orden de la progresión de una clase: el que fija el profesorado al ordenar
 * sus misiones (`orderIndex`, desde 0) y, a igualdad, la más antigua primero.
 * Es el de todos los listados de una clase (alumnado, profesorado, ficha de
 * plantilla, agentes de IA) y el de las copias, para que no cambie en uno sí y
 * en otro no.
 */
export const MISSION_ORDER: Prisma.MissionOrderByWithRelationInput[] = [
  { orderIndex: 'asc' },
  { createdAt: 'asc' },
  { id: 'asc' },
]

type Db = Prisma.TransactionClient

/**
 * Bloquea el orden de las misiones de la clase hasta confirmar (`FOR NO KEY
 * UPDATE` sobre la clase: no impide crear filas que cuelgan de ella ni copiarla,
 * solo que dos cambios de orden se pisen). Así dos misiones creadas a la vez no
 * se llevan la misma posición, y una creada mientras se reordena cae detrás.
 */
export async function lockMissionOrder(tx: Db, classId: string) {
  await tx.$queryRaw`SELECT id FROM classes WHERE id = ${classId} FOR NO KEY UPDATE`
}

/**
 * La posición del final de la clase, para una misión que llega: la nueva, la
 * importada o la que viene de otra clase. Bloquea antes el orden (ver
 * `lockMissionOrder`), dentro de la transacción `tx` que la crea o la mueve.
 */
export async function nextMissionOrderIndex(tx: Db, classId: string): Promise<number> {
  await lockMissionOrder(tx, classId)
  const { _max } = await tx.mission.aggregate({ where: { classId }, _max: { orderIndex: true } })
  return _max.orderIndex === null ? 0 : _max.orderIndex + 1
}

/**
 * El orden nuevo de una clase: primero los ids de `requested` que son suyos, en
 * ese orden y sin repetir, y detrás las que falten (una creada mientras se
 * ordenaba, por ejemplo) en el orden que tenían. Un id ajeno no cuenta. Siempre
 * devuelve todas las de la clase, una vez cada una.
 */
export function mergeMissionOrder(current: string[], requested: string[]): string[] {
  const own = new Set(current)
  const seen = new Set<string>()
  const ordered: string[] = []
  for (const id of requested) {
    if (!own.has(id) || seen.has(id)) continue
    seen.add(id)
    ordered.push(id)
  }
  for (const id of current) if (!seen.has(id)) ordered.push(id)
  return ordered
}

type OrderedMission = {
  id: string
  classId: string
  orderIndex: number
  createdAt: Date
  class: { name: string }
}

/**
 * Pone en el orden de la progresión, agrupadas por clase (por nombre, como las
 * listas que mezclan clases), unas misiones de varias clases ya elegidas con
 * otro criterio. Es para las listas con tope, como las de los agentes de IA: se
 * eligen las más recientes y se enseñan en orden. Elegirlas con `MISSION_ORDER`
 * y tope daría las primeras de las clases más antiguas, archivadas incluidas.
 */
export function sortByClassOrder<T extends OrderedMission>(missions: T[]): T[] {
  return [...missions].sort(
    (a, b) =>
      a.class.name.localeCompare(b.class.name) ||
      a.classId.localeCompare(b.classId) ||
      a.orderIndex - b.orderIndex ||
      a.createdAt.getTime() - b.createdAt.getTime() ||
      a.id.localeCompare(b.id)
  )
}
