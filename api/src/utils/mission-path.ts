import { prisma } from '../config/database.js'
import type { Prisma } from '../generated/prisma/client.js'
import { resolveClassSettings } from './class-settings.js'
import { ConflictError } from './errors.js'
import { MISSION_ORDER } from './mission-order.js'

/**
 * El camino del mapa de misiones (E3, entrega 3): lo que pide cada misión para
 * abrirse y quién la tiene cerrada por eso.
 *
 * Son dos capas que no se mezclan. `bloqueada` la pone el profesorado a mano,
 * para toda la clase, y vive en `status`. El cierre por camino no se escribe
 * nunca: se calcula al leer, para cada estudiante, y solo con el mapa encendido
 * en la clase (apagarlo lo abre todo al momento, aunque los requisitos se
 * guarden). La manual va siempre por encima.
 *
 * Una misión está cerrada para S si pide alguna que S no ha completado y S no
 * la ha empezado: lo empezado no se cierra, aunque el requisito llegue después
 * (ver `startedMissionIds`). Y una misión cuenta como completada si tiene
 * `completedAt` o si ya tiene aprobados todos sus enigmas obligatorios (ver
 * `enigmasComplete`): así un opcional sin hacer no deja a nadie encerrado,
 * tampoco en las que se cerraron antes de que los opcionales dejaran de contar.
 *
 * Todas las vías del alumnado pasan por aquí: los listados (`classPathsFor`),
 * el detalle, los documentos y el contexto de la IA (`missionMembership`, en
 * class-access.ts) y empezar, entregar y usar una pista
 * (`assertMissionOpenOnPath`).
 */

type Db = Prisma.TransactionClient

/** Como mucho, cuántas misiones puede pedir una. */
export const MISSION_PREREQUISITE_LIMIT = 3

/** Una misión que hace falta completar: lo que se enseña de ella. */
export interface PathRequirement {
  id: string
  title: string
}

/** Una arista del camino: `missionId` pide `requiredMissionId`. */
export interface PathEdge {
  missionId: string
  requiredMissionId: string
}

/**
 * Cerrada por el camino: 409 con su código, para entregar, usar una pista,
 * empezarla o abrir sus documentos. El mensaje dice qué falta.
 */
export class MissionPathLockedError extends ConflictError {
  readonly requires: PathRequirement[]
  constructor(requires: PathRequirement[]) {
    super(
      `Esta misión se abre al completar ${requires.map(r => `«${r.title}»`).join(', ')}`,
      'MISSION_PATH_LOCKED'
    )
    this.name = 'MissionPathLockedError'
    this.requires = requires
  }
}

// ---- Reglas, sin base de datos ----

/**
 * Completar una misión es tener aprobados todos sus enigmas obligatorios; los
 * opcionales no cuentan. Si todos son opcionales, basta con uno. Sin enigmas,
 * nunca. Es la regla de `approveSubmission` y la de los requisitos.
 */
export function enigmasComplete(enigmas: { isOptional: boolean; approved: boolean }[]): boolean {
  if (enigmas.length === 0) return false
  const required = enigmas.filter(e => !e.isOptional)
  if (required.length === 0) return enigmas.some(e => e.approved)
  return required.every(e => e.approved)
}

/** Las misiones que necesitan `missionId`, directa o indirectamente. */
export function dependentsOf(edges: PathEdge[], missionId: string): Set<string> {
  const requiredBy = new Map<string, string[]>()
  for (const edge of edges) {
    const list = requiredBy.get(edge.requiredMissionId) ?? []
    list.push(edge.missionId)
    requiredBy.set(edge.requiredMissionId, list)
  }
  const found = new Set<string>()
  const pending = [missionId]
  while (pending.length > 0) {
    for (const next of requiredBy.get(pending.pop()!) ?? []) {
      if (found.has(next)) continue
      found.add(next)
      pending.push(next)
    }
  }
  return found
}

/**
 * El primero de `requiredIds` que cerraría un ciclo si `missionId` lo pidiera
 * (ella misma o una que ya la necesita), o null. No cuenta lo que pide ahora
 * `missionId`: se va a sustituir.
 */
export function cycleWith(
  edges: PathEdge[],
  missionId: string,
  requiredIds: string[]
): string | null {
  const others = edges.filter(edge => edge.missionId !== missionId)
  const dependents = dependentsOf(others, missionId)
  return requiredIds.find(id => id === missionId || dependents.has(id)) ?? null
}

/**
 * El orden más parecido a `current` en el que cada misión va detrás de lo que
 * pide: va colocando, una a una, la primera de `current` que ya tiene delante
 * todo lo suyo. Si `current` ya cumple, no cambia; si no, solo se mueve hacia
 * atrás lo que hace falta. Sin ciclos (los impide `cycleWith` al guardar)
 * siempre las coloca todas; un id de una arista que no está en `current` no
 * cuenta.
 */
export function pathOrder(current: string[], edges: PathEdge[]): string[] {
  const known = new Set(current)
  const needs = new Map<string, Set<string>>()
  for (const edge of edges) {
    if (!known.has(edge.missionId) || !known.has(edge.requiredMissionId)) continue
    const set = needs.get(edge.missionId) ?? new Set<string>()
    set.add(edge.requiredMissionId)
    needs.set(edge.missionId, set)
  }
  const placed = new Set<string>()
  const result: string[] = []
  while (result.length < current.length) {
    const next = current.find(
      id => !placed.has(id) && [...(needs.get(id) ?? [])].every(required => placed.has(required))
    )
    // Con un ciclo (no debería haberlo) se deja el resto como estaba.
    if (!next) {
      for (const id of current) if (!placed.has(id)) result.push(id)
      break
    }
    placed.add(next)
    result.push(next)
  }
  return result
}

/** La primera arista que `order` contradice (la misión va antes que lo que pide), o null. */
export function orderViolation(order: string[], edges: PathEdge[]): PathEdge | null {
  const position = new Map(order.map((id, index) => [id, index]))
  for (const edge of edges) {
    const mission = position.get(edge.missionId)
    const required = position.get(edge.requiredMissionId)
    if (mission === undefined || required === undefined) continue
    if (required > mission) return edge
  }
  return null
}

/** El camino en cadena: cada misión de `order` pide la anterior. */
export function chainEdges(order: string[]): PathEdge[] {
  return order.slice(1).map((missionId, index) => ({
    missionId,
    requiredMissionId: order[index]!,
  }))
}

// ---- Con la base de datos ----

/**
 * Bloquea el camino de las clases hasta confirmar, en orden de id (dos que se
 * mueven misiones en sentidos contrarios no se esperan en cruz). Es el mismo
 * cerrojo que el orden (`FOR NO KEY UPDATE`, ver `lockMissionOrder`): choca
 * consigo mismo, así que dos guardados de requisitos, un reordenar o una misión
 * nueva no se solapan y el segundo ve lo que dejó el primero; ese es el que
 * impide que dos guardados a la vez («A pide B» y «B pide A») cierren un ciclo.
 * No impide lo que solo cuelga de la clase (entregas, pistas, el registro).
 */
export async function lockMissionPath(tx: Db, classIds: string[]) {
  for (const classId of [...new Set(classIds)].sort()) {
    await tx.$queryRaw`SELECT id FROM classes WHERE id = ${classId} FOR NO KEY UPDATE`
  }
}

/**
 * Las aristas de una clase, entre misiones suyas: lo que pide cada una, en el
 * orden de la clase.
 */
export async function classPathEdges(db: Db, classId: string): Promise<PathEdge[]> {
  return db.missionPrerequisite.findMany({
    where: { mission: { classId }, requiredMission: { classId } },
    select: { missionId: true, requiredMissionId: true },
    orderBy: [
      { requiredMission: { orderIndex: 'asc' } },
      { requiredMission: { createdAt: 'asc' } },
      { id: 'asc' },
    ],
  })
}

/** Lo que pide cada misión, por id. */
export function prerequisitesByMission(edges: PathEdge[]): Map<string, string[]> {
  const byMission = new Map<string, string[]>()
  for (const edge of edges) {
    const list = byMission.get(edge.missionId) ?? []
    list.push(edge.requiredMissionId)
    byMission.set(edge.missionId, list)
  }
  return byMission
}

/**
 * De `missionIds`, las que S ha completado: con `completedAt` o con todos sus
 * enigmas obligatorios aprobados (ver `enigmasComplete`).
 */
async function completedMissionIds(db: Db, studentId: string, missionIds: string[]) {
  const done = new Set(
    (
      await db.studentMissionProgress.findMany({
        where: { studentId, missionId: { in: missionIds }, completedAt: { not: null } },
        select: { missionId: true },
      })
    ).map(p => p.missionId)
  )
  const rest = missionIds.filter(id => !done.has(id))
  if (rest.length === 0) return done
  const enigmas = await db.missionEnigma.findMany({
    where: { missionId: { in: rest } },
    select: { missionId: true, isOptional: true, progress: { where: { studentId }, select: { id: true } } },
  })
  const byMission = new Map<string, { isOptional: boolean; approved: boolean }[]>()
  for (const e of enigmas) {
    const list = byMission.get(e.missionId) ?? []
    list.push({ isOptional: e.isOptional, approved: e.progress.length > 0 })
    byMission.set(e.missionId, list)
  }
  for (const [missionId, list] of byMission) if (enigmasComplete(list)) done.add(missionId)
  return done
}

/**
 * De `missionIds`, las que S ya ha empezado: tiene una entrega en alguno de sus
 * enigmas, una fila de progreso (que nace con la primera aprobación o al
 * empezarla) o ha usado una pista (la ha pagado). Esas no se le cierran.
 */
async function startedMissionIds(db: Db, studentId: string, missionIds: string[]) {
  const started = new Set<string>()
  const progress = await db.studentMissionProgress.findMany({
    where: { studentId, missionId: { in: missionIds } },
    select: { missionId: true },
  })
  for (const p of progress) started.add(p.missionId)
  const submitted = await db.missionEnigma.findMany({
    where: { missionId: { in: missionIds }, submissions: { some: { studentId } } },
    select: { missionId: true },
  })
  for (const e of submitted) started.add(e.missionId)
  const hinted = await db.missionHintUse.findMany({
    where: { studentId, missionId: { in: missionIds } },
    select: { missionId: true },
  })
  for (const h of hinted) started.add(h.missionId)
  return started
}

/**
 * Las cerradas por el camino para S según las aristas `edges`: cada una con lo
 * que le falta, en el orden de la clase. Las que pide algo ya completado, o que
 * S ya ha empezado, no salen.
 */
async function locksFromEdges(
  db: Db,
  edges: PathEdge[],
  studentId: string
): Promise<Map<string, PathRequirement[]>> {
  const locks = new Map<string, PathRequirement[]>()
  if (edges.length === 0) return locks
  const done = await completedMissionIds(db, studentId, [
    ...new Set(edges.map(e => e.requiredMissionId)),
  ])
  const missing = new Map<string, string[]>()
  for (const edge of edges) {
    if (done.has(edge.requiredMissionId)) continue
    const list = missing.get(edge.missionId) ?? []
    list.push(edge.requiredMissionId)
    missing.set(edge.missionId, list)
  }
  if (missing.size === 0) return locks
  const started = await startedMissionIds(db, studentId, [...missing.keys()])
  const closed = [...missing.entries()].filter(([missionId]) => !started.has(missionId))
  if (closed.length === 0) return locks
  const titles = await db.mission.findMany({
    where: { id: { in: [...new Set(closed.flatMap(([, ids]) => ids))] } },
    select: { id: true, title: true },
    orderBy: MISSION_ORDER,
  })
  for (const [missionId, ids] of closed) {
    const wanted = new Set(ids)
    locks.set(
      missionId,
      titles.filter(m => wanted.has(m.id)).map(m => ({ id: m.id, title: m.title }))
    )
  }
  return locks
}

/** El camino de una clase para un estudiante. */
export interface ClassPath {
  /** Lo que pide cada misión (ids). Vacío con el mapa apagado: ahí no cuenta. */
  prerequisites: Map<string, string[]>
  /** Las cerradas por el camino para el estudiante, con lo que les falta. */
  locks: Map<string, PathRequirement[]>
}

/** Sin camino: nada pide nada y nada está cerrado. */
const noPath = (): ClassPath => ({ prerequisites: new Map(), locks: new Map() })

/**
 * El camino de una clase para S: lo que pide cada misión y las que tiene
 * cerradas. Con el mapa apagado en la clase no hay camino. `settings`, si ya se
 * tienen los de la clase (si no, se leen).
 */
export async function classPathFor(
  db: Db,
  classId: string,
  studentId: string,
  settings?: unknown
): Promise<ClassPath> {
  const raw =
    settings !== undefined
      ? settings
      : (await db.class.findUnique({ where: { id: classId }, select: { settings: true } }))
          ?.settings
  if (!resolveClassSettings(raw).missionMap) return noPath()
  const edges = await classPathEdges(db, classId)
  if (edges.length === 0) return noPath()
  return {
    prerequisites: prerequisitesByMission(edges),
    locks: await locksFromEdges(db, edges, studentId),
  }
}

/**
 * El camino de varias clases a la vez, para los listados que las mezclan: uno
 * por clase, con sus ajustes ya leídos.
 */
export async function classPathsFor(
  db: Db,
  studentId: string,
  classes: { id: string; settings: unknown }[]
): Promise<Map<string, ClassPath>> {
  const paths = new Map<string, ClassPath>()
  for (const cls of classes) {
    if (paths.has(cls.id)) continue
    paths.set(cls.id, await classPathFor(db, cls.id, studentId, cls.settings))
  }
  return paths
}

/**
 * Lo que le falta a S para abrir una misión, o null si no la tiene cerrada por
 * el camino (mapa apagado, sin requisitos, ya completados o ya empezada).
 */
export async function missionPathLock(
  db: Db,
  mission: { id: string; classId: string; settings?: unknown },
  studentId: string
): Promise<PathRequirement[] | null> {
  const raw =
    mission.settings !== undefined
      ? mission.settings
      : (await db.class.findUnique({ where: { id: mission.classId }, select: { settings: true } }))
          ?.settings
  if (!resolveClassSettings(raw).missionMap) return null
  const edges = await db.missionPrerequisite.findMany({
    where: { missionId: mission.id, requiredMission: { classId: mission.classId } },
    select: { missionId: true, requiredMissionId: true },
  })
  if (edges.length === 0) return null
  return (await locksFromEdges(db, edges, studentId)).get(mission.id) ?? null
}

/** Exige que la misión no esté cerrada por el camino para S; si lo está, 409. */
export async function assertMissionOpenOnPath(
  mission: { id: string; classId: string; settings?: unknown },
  studentId: string,
  db: Db = prisma
) {
  const lock = await missionPathLock(db, mission, studentId)
  if (lock) throw new MissionPathLockedError(lock)
}
