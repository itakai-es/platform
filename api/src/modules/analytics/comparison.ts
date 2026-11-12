import { prisma } from '../../config/database.js'
import type { Prisma } from '../../generated/prisma/client.js'
import { compareWithOthers, type AnonymousFigure } from '../../utils/anonymous-stats.js'
import {
  completedSince,
  cutRanking,
  loadRankingBase,
  rankClass,
  rankingPeriodStart,
  type RankingBase,
  type RankingContext,
} from '../../utils/ranking.js'
import { compareEnabled, rankingPeriodsFor } from '../../utils/ranking-config.js'

/**
 * «Tú y tu clase»: la comparación anónima de quien mira con el resto de su clase,
 * que va en «Mi progreso» y, en los modos que recortan el ranking, junto a su
 * puesto. Aquí solo se cargan los datos: las reglas, en `utils/anonymous-stats.ts`.
 *
 * Qué se compara: la XP (si la clase la usa), las misiones completadas, con la
 * definición única, y las de la temporada si hay una empezada. Nunca el % de
 * aprobación ni la asistencia, que son notas y faltas.
 */

type Db = Prisma.TransactionClient

export type ComparisonMetricKey = 'xp' | 'missions' | 'season_missions'

/** Una cifra de la comparación (ver `AnonymousFigure`). */
export interface ComparisonMetric extends AnonymousFigure {
  key: ComparisonMetricKey
  /** Las misiones que cuentan, para escribir «4 de 7» (no es un dato de nadie); null en la XP. */
  outOf: number | null
}

export interface AnonymousComparison {
  metrics: ComparisonMetric[]
}

/**
 * Cuántas personas del grupo no se ven en ninguna clasificación que pueda mirar en
 * el modo «los N primeros». Son todas las vistas, no una: una fila enseña su XP y
 * sus misiones, y entre los primeros por XP, por misiones y por misiones de la
 * semana se ve a más gente que los N de cada una. En los demás modos, null: en
 * `full` se ve a todo el mundo y la media no añade nada, y en `position` no se ve
 * a nadie. Se ordena en memoria sobre una sola carga (`RankingBase`).
 */
function hiddenOthersInTopMode(
  others: readonly { id: string }[],
  base: RankingBase,
  { config, studentTypes }: RankingContext,
  now: Date
): number | null {
  const views = studentTypes
    .filter((type): type is 'xp' | 'missions' => type !== 'teams')
    .flatMap(type => rankingPeriodsFor(type, config).map(period => ({ type, period })))
  if (config.mode !== 'top' || views.length === 0) return null

  const visible = new Set<string>()
  for (const { type, period } of views) {
    const { ranked } = rankClass(base, { type, since: rankingPeriodStart(period, config, now) })
    const { podium, rest } = cutRanking(ranked, config)
    for (const row of [...podium, ...rest]) visible.add(row.enrollmentId)
  }
  return others.filter(other => !visible.has(other.id)).length
}

/**
 * La comparación de quien mira con esta matrícula, o null si la clase la tiene
 * apagada. El grupo son las mismas matrículas que las del ranking, sin ella y sin
 * ninguna vista previa: quien mira como estudiante ve su valor frente al grupo
 * real, y nunca cuenta en la media de nadie. `base`, si quien llama ya la ha
 * cargado para su clasificación.
 */
export async function classComparison(
  enrollmentId: string,
  classId: string,
  context: RankingContext,
  { now = new Date(), base, db = prisma as Db }: { now?: Date; base?: RankingBase; db?: Db } = {}
): Promise<AnonymousComparison | null> {
  const { settings, config } = context
  if (!compareEnabled(settings, config)) return null

  const [mine, group] = await Promise.all([
    db.classEnrollment.findUnique({
      where: { id: enrollmentId },
      select: { studentId: true, xp: true },
    }),
    base ?? loadRankingBase(classId, db),
  ])
  if (!mine) return null

  const others = group.enrollments.filter(enrollment => enrollment.id !== enrollmentId)
  const hiddenOthers = hiddenOthersInTopMode(others, group, context, now)
  const { missions } = group
  const season = rankingPeriodStart('season', config, now)
  const ofOthers = (count: ReadonlyMap<string, number>) => others.map(o => count.get(o.studentId) ?? 0)
  const metrics: ComparisonMetric[] = []

  if (settings.xp) {
    metrics.push({
      key: 'xp',
      outOf: null,
      ...compareWithOthers({ value: mine.xp, others: others.map(o => o.xp), kind: 'xp', hiddenOthers }),
    })
  }
  // Sin misiones que cuenten no hay nada que comparar: «en la media» de nada.
  if (missions.total > 0) {
    metrics.push({
      key: 'missions',
      outOf: missions.total,
      ...compareWithOthers({
        value: missions.completedBy.get(mine.studentId) ?? 0,
        others: ofOthers(missions.completedBy),
        kind: 'missions',
        hiddenOthers,
      }),
    })
    if (season) {
      const inSeason = completedSince(missions, season)
      metrics.push({
        key: 'season_missions',
        outOf: missions.total,
        ...compareWithOthers({
          value: inSeason.get(mine.studentId) ?? 0,
          others: ofOthers(inSeason),
          kind: 'missions',
          hiddenOthers,
        }),
      })
    }
  }
  return { metrics }
}
