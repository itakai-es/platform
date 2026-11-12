import { prisma } from '../config/database.js'
import type { Prisma } from '../generated/prisma/client.js'
import {
  groupAverages,
  madridMidnight,
  madridWeekStart,
  percentOf,
} from '../modules/analytics/definitions.js'
import { COUNTED_MISSION_WHERE, missionCompletions } from '../modules/analytics/student-progress.js'
import { studentAvatarColor } from './avatars.js'
import { resolveClassSettings, type ClassSettings } from './class-settings.js'
import { participatingEnrollmentWhere, publicAlias } from './enrollment.js'
import { resolveLevelConfig, tierForLevel } from './level-config.js'
import {
  RANKING_TYPES,
  rankingTypeAvailable,
  resolveRankingConfig,
  studentRankingTypes,
  type RankingConfig,
  type RankingPeriod,
  type RankingType,
} from './ranking-config.js'

type Db = Prisma.TransactionClient

/**
 * Lo que hace falta de cada estudiante de una clase para las dos clasificaciones
 * (la del alumnado y la del profesorado), con la definición única de progreso
 * (modules/analytics/definitions.ts): N son las misiones que cuentan (con enigmas
 * y sin bloquear a mano) y X, las que tiene completadas de esas. `required` y
 * `approvedBy`, para el % de enigmas obligatorios de las medias. `datesBy`, cuándo
 * completó cada una, para los periodos (`completedSince`).
 */
export async function missionProgressByStudent(classId: string, db: Db = prisma) {
  const missions = await db.mission.findMany({
    where: { classId, ...COUNTED_MISSION_WHERE },
    select: { id: true, enigmas: { select: { id: true, isOptional: true } } },
  })
  const { datesBy, requiredApprovedBy } = await missionCompletions(missions, { db })
  return {
    total: missions.length,
    required: missions.reduce((sum, m) => sum + m.enigmas.filter(e => !e.isOptional).length, 0),
    completedBy: new Map([...datesBy].map(([studentId, dates]) => [studentId, dates.size])),
    datesBy,
    approvedBy: requiredApprovedBy,
  }
}

export type MissionProgressByStudent = Awaited<ReturnType<typeof missionProgressByStudent>>

/** Las completadas de cada estudiante desde `since`; sin periodo, todas. */
export function completedSince(
  { completedBy, datesBy }: Pick<MissionProgressByStudent, 'completedBy' | 'datesBy'>,
  since: Date | null
): ReadonlyMap<string, number> {
  if (!since) return completedBy
  return new Map(
    [...datesBy].map(([studentId, dates]) => [
      studentId,
      [...dates.values()].filter(at => at >= since).length,
    ])
  )
}

// ---- Orden y puestos ----

/** Lo que hace falta de cualquier entrada para ordenarla, sea una persona o un equipo. */
export interface Rankable {
  /** Último desempate, para que el orden no dependa de la base. */
  id: string
  /** Alias en la clase (o nombre del equipo): el orden de pantalla entre quienes empatan. */
  alias: string | null
}

/** Lo que hace falta de cada estudiante para ordenar la clasificación por XP. */
export interface RankEntry extends Rankable {
  xp: number
}

/** Una entrada ya clasificada. */
export type Ranked<T> = T & {
  /**
   * Puesto de competición (1, 2, 2, 4). Null con 0: quien aún no ha sumado nada no
   * tiene puesto y va aparte, en su bloque «Aún sin…».
   */
  rank: number | null
}

/** Cuántos van en el podio. */
export const PODIUM_SIZE = 3

const aliasOrder = new Intl.Collator('es', { sensitivity: 'base', numeric: true })

const hasAlias = (entry: Rankable) => (entry.alias?.trim() ? 0 : 1)

const byAliasThenId = (a: Rankable, b: Rankable) =>
  hasAlias(a) - hasAlias(b) ||
  aliasOrder.compare(a.alias?.trim() ?? '', b.alias?.trim() ?? '') ||
  (a.id < b.id ? -1 : a.id > b.id ? 1 : 0)

/**
 * El orden de competición, el mismo para todos los tipos de ranking:
 * - de más a menos `score`; con `tiebreak`, entre iguales, de más a menos de él;
 * - quien empata en todo comparte puesto y el siguiente salta (1, 2, 2, 4);
 * - entre quienes empatan, por alias (quien no tiene, detrás) y, si coincide, por
 *   id: el orden no baila entre peticiones ni entre vistas;
 * - con 0 o menos no hay puesto (`rank` null): van al final, por alias.
 */
export function rankByScore<T extends Rankable>(
  entries: readonly T[],
  score: (entry: T) => number,
  tiebreak: (entry: T) => number = () => 0
): Ranked<T>[] {
  const second = (entry: T) => (score(entry) > 0 ? tiebreak(entry) : 0)
  const sorted = [...entries].sort(
    (a, b) => score(b) - score(a) || second(b) - second(a) || byAliasThenId(a, b)
  )
  let rank = 0
  return sorted.map((entry, index) => {
    if (score(entry) <= 0) return { ...entry, rank: null }
    const previous = sorted[index - 1]
    if (!previous || score(previous) !== score(entry) || second(previous) !== second(entry)) {
      rank = index + 1
    }
    return { ...entry, rank }
  })
}

/**
 * La clasificación por XP de una clase. Es la misma en las tres vistas que la
 * enseñan (la lista del alumnado, la barra de su portada y la lista del
 * profesorado), así que la misma persona tiene siempre el mismo puesto.
 */
export function rankByXp<T extends RankEntry>(entries: readonly T[]): Ranked<T>[] {
  return rankByScore(entries, entry => entry.xp)
}

/**
 * Podio y resto. En el podio, las tres primeras personas con puesto: nadie con
 * 0. En el resto, quien tiene puesto y, al final, quien aún no ha sumado nada.
 */
export function splitPodium<T extends { rank: number | null }>(ranked: readonly T[]) {
  const withRank = ranked.filter(r => r.rank !== null)
  return {
    podium: withRank.slice(0, PODIUM_SIZE),
    rest: [...withRank.slice(PODIUM_SIZE), ...ranked.filter(r => r.rank === null)],
  }
}

/** El puesto de una persona en la clase, o null si no tiene (0 XP o no está en la lista). */
export function rankOf(entries: readonly RankEntry[], id: string): number | null {
  return rankByXp(entries).find(r => r.id === id)?.rank ?? null
}

/**
 * Lo que puede salir de la clasificación según lo que ve el alumnado, recortado
 * aquí para que el navegador nunca reciba lo que el modo esconde:
 * - `full`: todo;
 * - `top`: los puestos hasta el N, con quienes empaten en él (quien va 4.º con dos
 *   empatados entra aunque sea la 5.ª o 6.ª fila). Nadie sin puesto;
 * - `position`: nadie. Quien mira recibe su propia fila aparte.
 */
export function cutRanking<T extends { rank: number | null }>(
  ranked: readonly T[],
  { mode, topN }: Pick<RankingConfig, 'mode' | 'topN'>
) {
  if (mode === 'position') return splitPodium<T>([])
  if (mode === 'top') return splitPodium(ranked.filter(r => r.rank !== null && r.rank <= topN))
  return splitPodium(ranked)
}

/**
 * Desde cuándo cuenta un periodo: nada en «Siempre», el lunes a las 00:00 en
 * Madrid en «Esta semana» y la fecha guardada en «Temporada».
 */
export function rankingPeriodStart(
  period: RankingPeriod,
  config: Pick<RankingConfig, 'seasonStartedAt'>,
  now = new Date()
): Date | null {
  if (period === 'week') return madridMidnight(madridWeekStart(now))
  if (period === 'season' && config.seasonStartedAt) return new Date(config.seasonStartedAt)
  return null
}

// ---- Qué tipos hay en una clase ----

export interface RankingContext {
  settings: ClassSettings
  config: RankingConfig
  /** Lo que ve el alumnado: los tipos encendidos que tienen algo que enseñar. Vacío si nada. */
  studentTypes: RankingType[]
  /** Lo que ve el profesorado: todos los que tienen algo que enseñar, encendidos o no. */
  teacherTypes: RankingType[]
}

/**
 * Los ajustes, la configuración y los tipos de una clase. Los equipos, solo si
 * hay alguna agrupación de base sin archivar; si no, no hay nada que enseñar y
 * no sale la pestaña.
 */
export async function loadRankingContext(classId: string): Promise<RankingContext> {
  const [cls, baseSets] = await Promise.all([
    prisma.class.findUnique({
      where: { id: classId },
      select: { settings: true, rankingConfig: true },
    }),
    prisma.teamSet.count({ where: { classId, kind: 'base', archivedAt: null } }),
  ])
  const settings = resolveClassSettings(cls?.settings)
  const config = resolveRankingConfig(cls?.rankingConfig)
  return {
    settings,
    config,
    studentTypes: studentRankingTypes(settings, config, baseSets > 0),
    teacherTypes: RANKING_TYPES.filter(
      type => rankingTypeAvailable(type, settings) && (type !== 'teams' || baseSets > 0)
    ),
  }
}

/** Las clases de esta lista con alguna agrupación de base sin archivar. */
export async function classesWithBaseTeams(classIds: string[]): Promise<Set<string>> {
  const rows = await prisma.teamSet.groupBy({
    by: ['classId'],
    where: { classId: { in: classIds }, kind: 'base', archivedAt: null },
  })
  return new Set(rows.map(row => row.classId))
}

// ---- La clasificación de una clase ----

interface StatsRow {
  xp: number
  missionsCompleted: number
  /** Su % de enigmas obligatorios; null si la clase no tiene ninguno que cuente. */
  percent: number | null
}

/**
 * Las medias que acompañan a la clasificación: XP media, progreso medio (el % de
 * enigmas obligatorios) y misiones de media, con un decimal, de las N que cuentan
 * (`groupAverages`), y la XP total. Para el profesorado, todas. Al alumnado le
 * llegan sin la XP total ni el progreso medio (`studentRankingStats`). Sin alumnado,
 * o sin obligatorios para el progreso, null. La XP, en una clase que no la usa,
 * tampoco se enseña (`withoutXp`).
 */
export function rankingStats(rows: readonly StatsRow[], missionsTotal: number) {
  const totalStudents = rows.length
  const totalXp = rows.reduce((sum, r) => sum + r.xp, 0)
  const averages = groupAverages([...rows])
  return {
    avgXp: totalStudents > 0 ? Math.round(totalXp / totalStudents) : 0,
    avgProgress: averages.percent,
    avgMissions: averages.missionsCompleted,
    missionsTotal,
    totalXp,
    totalStudents,
  }
}

/**
 * Todo lo que hace falta para ordenar una clase, sea cual sea el tipo o el periodo:
 * se carga una vez y se ordena en memoria tantas veces como haga falta (`rankClass`).
 *
 * Solo el alumnado que cuenta en la clase: sin la vista previa del profesorado ni
 * las cuentas que aún no han entrado (`participatingEnrollmentWhere`).
 */
export async function loadRankingBase(classId: string, db: Db = prisma) {
  const [enrollments, cls, missions] = await Promise.all([
    db.classEnrollment.findMany({
      where: { classId, isPreview: false, AND: [participatingEnrollmentWhere] },
      select: {
        id: true,
        studentId: true,
        nickname: true,
        avatarUrl: true,
        xp: true,
        level: true,
        student: { select: { name: true } },
      },
    }),
    db.class.findUnique({
      where: { id: classId },
      select: { levelConfig: true, settings: true },
    }),
    missionProgressByStudent(classId, db),
  ])
  return {
    classId,
    enrollments,
    missions,
    levelConfig: resolveLevelConfig(cls?.levelConfig),
    usesXp: resolveClassSettings(cls?.settings).xp,
  }
}

export type RankingBase = Awaited<ReturnType<typeof loadRankingBase>>

/**
 * La clasificación de una clase, ya ordenada, con lo que enseñan las dos vistas de
 * cada estudiante. `score` es lo que la ordena:
 * - `xp`: su XP (por `rankByXp`);
 * - `missions`: las misiones que cuentan completadas, desde `since` si se da, con
 *   la XP como desempate (si la clase la usa).
 *
 * Lleva el nombre real (`name`) para el profesorado y el id de la cuenta: quien la
 * sirve al alumnado tiene que quitarlos (`publicRankingRow`).
 */
export function rankClass(
  { classId, enrollments, missions, levelConfig, usesXp }: RankingBase,
  { type = 'xp', since = null }: { type?: 'xp' | 'missions'; since?: Date | null } = {}
) {
  const missionsTotal = missions.total
  const scoreBy = completedSince(missions, since)

  const rows = enrollments.map(e => {
    const tier = tierForLevel(e.level, levelConfig)
    return {
      id: e.studentId,
      enrollmentId: e.id,
      alias: e.nickname,
      nickname: e.nickname,
      name: e.student.name,
      avatar: e.avatarUrl || '/app/avatars/atenea.svg',
      avatarColor: studentAvatarColor(classId, e.studentId),
      xp: e.xp,
      level: e.level,
      levelTitle: tier.title,
      levelColor: tier.color,
      missionsCompleted: missions.completedBy.get(e.studentId) ?? 0,
      missionsTotal,
      score: type === 'missions' ? (scoreBy.get(e.studentId) ?? 0) : e.xp,
    }
  })
  const ranked =
    type === 'missions'
      ? rankByScore(rows, r => r.score, usesXp ? r => r.xp : undefined)
      : rankByXp(rows)
  // El % de cada cual solo entra en la media: no viaja en la fila de nadie.
  const stats = rankingStats(
    ranked.map(r => ({
      xp: r.xp,
      missionsCompleted: r.missionsCompleted,
      percent: percentOf(missions.approvedBy.get(r.id) ?? 0, missions.required),
    })),
    missionsTotal
  )
  return { ranked, stats, usesXp }
}

/** La clasificación de una clase, cargándola entera (ver `loadRankingBase` y `rankClass`). */
export async function loadClassRanking(
  classId: string,
  options: { type?: 'xp' | 'missions'; since?: Date | null } = {}
) {
  return rankClass(await loadRankingBase(classId), options)
}

/**
 * La clasificación de equipos de una clase: una por agrupación de base sin
 * archivar, sumando los puntos de sus premios desde `since` (o todos), con el
 * mismo orden de competición que las personas. Los puntos son los del marcador,
 * no la XP de sus integrantes.
 */
export async function loadTeamStandings(classId: string, since: Date | null = null) {
  const sets = await prisma.teamSet.findMany({
    where: { classId, kind: 'base', archivedAt: null },
    orderBy: { createdAt: 'asc' },
    select: {
      id: true,
      title: true,
      teams: {
        orderBy: { orderIndex: 'asc' },
        select: { id: true, title: true, color: true, emblem: true, orderIndex: true },
      },
    },
  })
  const teamIds = sets.flatMap(set => set.teams.map(team => team.id))
  const totals =
    teamIds.length === 0
      ? []
      : await prisma.teamAward.groupBy({
          by: ['teamId'],
          where: { teamId: { in: teamIds }, ...(since ? { createdAt: { gte: since } } : {}) },
          _sum: { points: true },
        })
  const points = new Map(totals.map(row => [row.teamId, row._sum.points ?? 0]))
  return sets.map(set => ({
    set: { id: set.id, title: set.title },
    teams: rankByScore(
      set.teams.map(({ orderIndex, ...team }) => ({
        ...team,
        alias: team.title,
        index: orderIndex,
        points: points.get(team.id) ?? 0,
      })),
      team => team.points
    ).map(({ alias: _alias, ...team }) => team),
  }))
}

/**
 * Una fila sin lo que sale de la XP, si quien la recibe no ve la XP (la clase no la
 * usa o su alumnado no tiene ese tipo): ni XP ni nivel, que se calcula con ella.
 */
export function withoutXp<
  T extends { xp: number; level: number; levelTitle: string; levelColor: string },
>({ xp: _xp, level: _level, levelTitle: _title, levelColor: _color, ...row }: T) {
  return row
}

/** Las medias sin las de XP, en el mismo caso que `withoutXp`. */
export function statsWithoutXp<T extends { avgXp: number; totalXp: number }>(stats: T) {
  return { ...stats, avgXp: null, totalXp: null }
}

/**
 * Una fila tal como la ve el alumnado: el alias o «Estudiante», nunca el nombre
 * real, y el id de la matrícula, no el de la cuenta: con él no se pueden unir los
 * alias de una misma persona en dos clases.
 */
export function publicRankingRow<
  T extends { id: string; enrollmentId: string; nickname: string | null; name: string; alias: string | null },
>(row: T) {
  const { id: _account, enrollmentId, name: _name, alias: _alias, nickname, ...rest } = row
  return { ...rest, id: enrollmentId, username: publicAlias(nickname) }
}
