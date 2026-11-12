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
 * Una misión está cerrada para S si pide alguna que todavía le cierra el paso y
 * S no la ha empezado: lo empezado no se cierra, aunque el requisito llegue
 * después. Empezar es trabajo de verdad (una entrega, un enigma aprobado, una
 * pista usada), no una fila de progreso vacía (ver `startedMissionIds`).
 *
 * Un requisito deja de cerrar en cuanto S lo completa, y también si no se puede
 * cumplir: caducado o sin ningún enigma (ver `requirementCloses`). Una misión
 * cuenta como completada si tiene `completedAt` o si ya tiene aprobados todos
 * sus enigmas obligatorios (ver `enigmasComplete`): así un opcional sin hacer no
 * deja a nadie encerrado, tampoco en las que se cerraron antes de que los
 * opcionales dejaran de contar.
 *
 * Solo lo recorre el alumnado (ver `walksPath`): el profesorado de la clase, también
 * en la vista previa, la ve y la usa toda abierta.
 *
 * Todas las vías del alumnado pasan por aquí: los listados (`classPathsFor`),
 * el detalle, los documentos y el contexto de la IA (`missionMembership`, en
 * class-access.ts), entregar y usar una pista (`assertMissionOpenOnPath`) y los
 * recordatorios de fecha (`locksFromEdges`).
 */

type Db = Prisma.TransactionClient

/** Como mucho, cuántas misiones puede pedir una. */
export const MISSION_PREREQUISITE_LIMIT = 3

/**
 * Una misión que hace falta completar: lo que se enseña de ella. `state` dice si
 * se puede hacer ya (`open`) o si la ha cerrado su docente a mano (`teacher`):
 * entonces «Ir a «X»» no lleva a ninguna parte hasta que la abra.
 */
export interface PathRequirement {
  id: string
  title: string
  state: 'open' | 'teacher'
}

/** Quien recorre el camino: su id y su rol, como llega en la sesión. */
export interface PathViewer {
  id: string
  role?: string | null
}

/**
 * ¿Tiene camino? Solo el alumnado (rol `student`, que entra con su matrícula de
 * verdad: la de vista previa no le vale). El profesorado, también cuando mira su
 * clase como alumno, lo tiene todo abierto: no se le cierra nada ni se le
 * enseña ningún candado del camino.
 */
export function walksPath(viewer: PathViewer): boolean {
  return viewer.role === 'student'
}

/** Una arista del camino: `missionId` pide `requiredMissionId`. */
export interface PathEdge {
  missionId: string
  requiredMissionId: string
}

/**
 * Cerrada por el camino: 409 con su código, para entregar, usar una pista o
 * listar sus documentos (las rutas de misiones). El mensaje dice qué falta. La
 * descarga de un documento responde 404, sin títulos (ver `assertDocumentMember`).
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

/** Lo que se sabe de una misión requisito para un estudiante. */
export interface RequirementState {
  /** Su fecha límite, si tiene. */
  deadline: Date | null
  /** Si S la tiene con `completedAt`. */
  completed: boolean
  /** Sus enigmas, con si S tiene aprobado cada uno. */
  enigmas: { isOptional: boolean; approved: boolean }[]
}

/**
 * ¿Sigue cerrando el requisito lo que depende de él? No, si S ya lo ha
 * completado (con `completedAt` o con sus obligatorios aprobados), y tampoco si
 * no se puede cumplir: sin ningún enigma, o caducado (la fecha ya pasó, la misma
 * comparación que `getMissionStatus`). Un requisito imposible no deja a nadie
 * encerrado. La bloqueada a mano sí cierra (su docente la puede abrir), salvo
 * que además esté caducada; alargarle la fecha a una caducada vuelve a cerrar lo
 * que la pide a quien aún no lo ha empezado.
 */
export function requirementCloses(requirement: RequirementState, now: Date): boolean {
  if (requirement.completed) return false
  if (requirement.enigmas.length === 0) return false
  if (requirement.deadline && requirement.deadline < now) return false
  return !enigmasComplete(requirement.enigmas)
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


/** ¿Está el mapa encendido en la clase? `settings`, si ya se tienen (si no, se leen). */
export async function missionMapOn(db: Db, classId: string, settings?: unknown): Promise<boolean> {
  const raw =
    settings !== undefined
      ? settings
      : (await db.class.findUnique({ where: { id: classId }, select: { settings: true } }))
          ?.settings
  return resolveClassSettings(raw).missionMap
}

/**
 * Deja la clase en el orden más parecido al que tiene en el que cada misión va
 * detrás de lo que pide (ver `pathOrder`), escribiendo solo las que cambian.
 * Devuelve cuántas se han movido. Va con el camino ya bloqueado (ver
 * `lockMissionPath`): al guardar requisitos con el mapa encendido y al
 * encenderlo, que es cuando el orden tiene que volver a cumplir el camino.
 */
export async function placeAfterPrerequisites(tx: Db, classId: string): Promise<number> {
  const current = await tx.mission.findMany({
    where: { classId },
    orderBy: MISSION_ORDER,
    select: { id: true, orderIndex: true },
  })
  const next = pathOrder(
    current.map(m => m.id),
    await classPathEdges(tx, classId)
  )
  let moved = 0
  for (const [index, id] of next.entries()) {
    if (current[index]?.id !== id) moved += 1
    const before = current.find(m => m.id === id)
    if (before?.orderIndex === index) continue
    await tx.mission.update({ where: { id }, data: { orderIndex: index } })
  }
  return moved
}

/**
 * De `missionIds`, las que S ya ha empezado de verdad: tiene una entrega o un
 * enigma aprobado en alguna, ha usado una pista (la ha pagado) o tiene progreso
 * con algo dentro (enigmas completados o la misión completada). Esas no se le
 * cierran. Una fila de progreso vacía no cuenta: no es trabajo, y no puede
 * servir para que una misión no se cierre nunca.
 */
async function startedMissionIds(db: Db, studentId: string, missionIds: string[]) {
  const started = new Set<string>()
  if (missionIds.length === 0) return started
  const progress = await db.studentMissionProgress.findMany({
    where: {
      studentId,
      missionId: { in: missionIds },
      OR: [{ enigmasCompleted: { gt: 0 } }, { completedAt: { not: null } }],
    },
    select: { missionId: true },
  })
  for (const p of progress) started.add(p.missionId)
  const worked = await db.missionEnigma.findMany({
    where: {
      missionId: { in: missionIds },
      OR: [{ submissions: { some: { studentId } } }, { progress: { some: { studentId } } }],
    },
    select: { missionId: true },
  })
  for (const e of worked) started.add(e.missionId)
  const hinted = await db.missionHintUse.findMany({
    where: { studentId, missionId: { in: missionIds } },
    select: { missionId: true },
  })
  for (const h of hinted) started.add(h.missionId)
  return started
}

/**
 * Las cerradas por el camino para S según las aristas `edges`: cada una con lo
 * que le falta, en el orden de la clase. No salen las que solo piden requisitos
 * que ya no cierran (completados, caducados o sin enigmas: ver
 * `requirementCloses`) ni las que S ya ha empezado.
 *
 * Es la cuenta de un estudiante: quien la llama ya ha mirado que el mapa esté
 * encendido y que S recorra el camino (`walksPath`). Los recordatorios la usan
 * así, con las aristas de cada clase leídas una sola vez.
 */
export async function locksFromEdges(
  db: Db,
  edges: PathEdge[],
  studentId: string,
  now: Date = new Date()
): Promise<Map<string, PathRequirement[]>> {
  const locks = new Map<string, PathRequirement[]>()
  if (edges.length === 0) return locks
  // Los requisitos, con lo que hace falta para saber si cierran y lo que se
  // enseña de ellos, en el orden de la clase.
  const required = await db.mission.findMany({
    where: { id: { in: [...new Set(edges.map(e => e.requiredMissionId))] } },
    select: {
      id: true,
      title: true,
      status: true,
      deadline: true,
      progress: { where: { studentId }, select: { completedAt: true } },
      enigmas: {
        select: { isOptional: true, progress: { where: { studentId }, select: { id: true } } },
      },
    },
    orderBy: MISSION_ORDER,
  })
  const closing = required.filter(m =>
    requirementCloses(
      {
        deadline: m.deadline,
        completed: m.progress.some(p => p.completedAt !== null),
        enigmas: m.enigmas.map(e => ({ isOptional: e.isOptional, approved: e.progress.length > 0 })),
      },
      now
    )
  )
  if (closing.length === 0) return locks
  const closingIds = new Set(closing.map(m => m.id))
  const missing = new Map<string, Set<string>>()
  for (const edge of edges) {
    if (!closingIds.has(edge.requiredMissionId)) continue
    const set = missing.get(edge.missionId) ?? new Set<string>()
    set.add(edge.requiredMissionId)
    missing.set(edge.missionId, set)
  }
  const started = await startedMissionIds(db, studentId, [...missing.keys()])
  for (const [missionId, ids] of missing) {
    if (started.has(missionId)) continue
    locks.set(
      missionId,
      closing
        .filter(m => ids.has(m.id))
        .map(m => ({
          id: m.id,
          title: m.title,
          state: m.status === 'bloqueada' ? ('teacher' as const) : ('open' as const),
        }))
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
 * El camino de una clase para quien la mira como alumno: lo que pide cada misión
 * y las que tiene cerradas. Con el mapa apagado en la clase no hay camino. El
 * profesorado (vista previa) ve lo que pide cada una, pero nada cerrado.
 * `settings`, si ya se tienen los de la clase (si no, se leen).
 */
export async function classPathFor(
  db: Db,
  classId: string,
  viewer: PathViewer,
  settings?: unknown
): Promise<ClassPath> {
  if (!(await missionMapOn(db, classId, settings))) return noPath()
  const edges = await classPathEdges(db, classId)
  if (edges.length === 0) return noPath()
  return {
    prerequisites: prerequisitesByMission(edges),
    locks: walksPath(viewer) ? await locksFromEdges(db, edges, viewer.id) : new Map(),
  }
}

/**
 * El camino de varias clases a la vez, para los listados que las mezclan: uno
 * por clase, con sus ajustes ya leídos.
 */
export async function classPathsFor(
  db: Db,
  viewer: PathViewer,
  classes: { id: string; settings: unknown }[]
): Promise<Map<string, ClassPath>> {
  const paths = new Map<string, ClassPath>()
  for (const cls of classes) {
    if (paths.has(cls.id)) continue
    paths.set(cls.id, await classPathFor(db, cls.id, viewer, cls.settings))
  }
  return paths
}

/**
 * Lo que le falta a quien mira para abrir una misión, o null si no la tiene
 * cerrada por el camino (no es alumno, mapa apagado, sin requisitos, ya
 * cumplidos o ya empezada).
 */
export async function missionPathLock(
  db: Db,
  mission: { id: string; classId: string; settings?: unknown },
  viewer: PathViewer
): Promise<PathRequirement[] | null> {
  if (!walksPath(viewer)) return null
  if (!(await missionMapOn(db, mission.classId, mission.settings))) return null
  const edges = await db.missionPrerequisite.findMany({
    where: { missionId: mission.id, requiredMission: { classId: mission.classId } },
    select: { missionId: true, requiredMissionId: true },
  })
  if (edges.length === 0) return null
  return (await locksFromEdges(db, edges, viewer.id)).get(mission.id) ?? null
}

/** Exige que la misión no esté cerrada por el camino para quien mira; si lo está, 409. */
export async function assertMissionOpenOnPath(
  mission: { id: string; classId: string; settings?: unknown },
  viewer: PathViewer,
  db: Db = prisma
) {
  const lock = await missionPathLock(db, mission, viewer)
  if (lock) throw new MissionPathLockedError(lock)
}
