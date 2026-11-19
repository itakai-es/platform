import type { ClassSettings } from './class-settings.js'

/**
 * Configuración del ranking de una clase (`Class.rankingConfig`): qué tipos hay y
 * qué ve el alumnado. El interruptor sigue en `settings.rankings`: apagado es «solo
 * el profesorado», y por eso aquí no hay un cuarto modo. Nula significa «como
 * siempre», y `resolveRankingConfig` lo resuelve a XP y equipos, completo: las
 * clases existentes no notan nada. Lo guardado que no sea de la configuración se
 * ignora.
 *
 * `compare` es el interruptor de la comparación anónima con la media, independiente
 * del ranking (ver `compareEnabled`).
 *
 * Espejo en `app/app/utils/ranking-config.ts`.
 */

export const RANKING_TYPES = ['xp', 'missions', 'teams'] as const
export type RankingType = (typeof RANKING_TYPES)[number]

/**
 * Qué ve el alumnado, siempre recortado en la API: `full`, toda la clasificación;
 * `top`, los N primeros y su fila; `position`, solo su puesto y el total.
 */
export const RANKING_MODES = ['full', 'top', 'position'] as const
export type RankingMode = (typeof RANKING_MODES)[number]

export const RANKING_TOP_SIZES = [3, 5, 10] as const
export type RankingTopSize = (typeof RANKING_TOP_SIZES)[number]

export const RANKING_PERIODS = ['all', 'week'] as const
export type RankingPeriod = (typeof RANKING_PERIODS)[number]

export interface RankingConfig {
  types: RankingType[]
  mode: RankingMode
  /** Cuántos puestos enseña el modo `top`. Sin él en otro modo, se conserva. */
  topN: RankingTopSize
  /** La comparación anónima con la media; null si nunca se ha tocado (ver `compareEnabled`). */
  compare: boolean | null
}

export const DEFAULT_RANKING_CONFIG: RankingConfig = {
  types: ['xp', 'teams'],
  mode: 'full',
  topN: 5,
  compare: null,
}

/**
 * Normaliza una configuración cruda (de la base o del cliente), con los valores
 * por defecto para lo que no sirva. Nunca lanza. Los tipos, sin repetir y en su
 * orden de siempre: el de las pestañas. Sin ninguno válido, los de por defecto:
 * un ranking sin tipos no existe.
 */
export function resolveRankingConfig(raw: unknown): RankingConfig {
  const fallback = DEFAULT_RANKING_CONFIG
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return { ...fallback, types: [...fallback.types] }
  }
  const r = raw as Partial<Record<keyof RankingConfig, unknown>>
  const listed = Array.isArray(r.types) ? (r.types as unknown[]) : []
  const types = RANKING_TYPES.filter(type => listed.includes(type))
  return {
    types: types.length > 0 ? types : [...fallback.types],
    mode: RANKING_MODES.includes(r.mode as RankingMode) ? (r.mode as RankingMode) : fallback.mode,
    topN: RANKING_TOP_SIZES.includes(r.topN as RankingTopSize)
      ? (r.topN as RankingTopSize)
      : fallback.topN,
    compare: typeof r.compare === 'boolean' ? r.compare : null,
  }
}

/**
 * ¿Tiene la clase la comparación anónima encendida? Es independiente del ranking:
 * se puede tener una sin el otro. Sin guardar, sigue a `settings.rankings`: arranca
 * igual que el ranking de cada clase, para respetar lo que decidió quien lo apagó.
 */
export function compareEnabled(
  settings: Pick<ClassSettings, 'rankings'>,
  config: Pick<RankingConfig, 'compare'>
): boolean {
  return config.compare ?? settings.rankings
}

/** Un cambio pedido por el profesorado sobre lo guardado. */
export function mergeRankingConfig(current: unknown, patch: unknown): RankingConfig {
  const saved = resolveRankingConfig(current)
  const asked = patch && typeof patch === 'object' && !Array.isArray(patch) ? patch : {}
  return resolveRankingConfig({ ...saved, ...asked })
}

/**
 * ¿Puede usar la clase este tipo? Cada uno pide lo suyo: la XP, que la clase use
 * XP; misiones y equipos, nada de los ajustes (los equipos sin agrupación de base
 * no tienen nada que enseñar, pero eso se mira en la clase: `baseTeamSets`).
 */
export function rankingTypeAvailable(type: RankingType, settings: Pick<ClassSettings, 'xp'>) {
  return type !== 'xp' || settings.xp
}

/** Los tipos encendidos que la clase puede usar. */
export function effectiveRankingTypes(
  config: RankingConfig,
  settings: Pick<ClassSettings, 'xp'>
): RankingType[] {
  return config.types.filter(type => rankingTypeAvailable(type, settings))
}

/**
 * Los tipos que ve el alumnado: ninguno con el interruptor apagado; si no, los
 * encendidos que tienen algo que enseñar (los equipos, con alguna agrupación de base).
 */
export function studentRankingTypes(
  settings: Pick<ClassSettings, 'xp' | 'rankings'>,
  config: RankingConfig,
  hasBaseTeams: boolean
): RankingType[] {
  if (!settings.rankings) return []
  return effectiveRankingTypes(config, settings).filter(type => type !== 'teams' || hasBaseTeams)
}

/**
 * ¿Ve el alumnado el ranking de XP? Con él, la XP de cada cual ya está a la vista y
 * puede desempatar las misiones; sin él, no (ver `loadRankingBase`).
 */
export function studentsSeeXpRanking(
  settings: Pick<ClassSettings, 'xp' | 'rankings'>,
  config: RankingConfig
): boolean {
  return studentRankingTypes(settings, config, false).includes('xp')
}

/**
 * El interruptor, coherente con los tipos: sin ninguno disponible (solo XP en una
 * clase que apaga la XP) el ranking queda apagado, como cualquier funcionalidad a
 * la que le falta lo que necesita.
 */
export function normalizeRankingSwitch<T extends Pick<ClassSettings, 'xp' | 'rankings'>>(
  settings: T,
  config: RankingConfig
): T {
  if (settings.rankings && effectiveRankingTypes(config, settings).length === 0) {
    return { ...settings, rankings: false }
  }
  return settings
}

/**
 * Los periodos de un tipo. La XP solo tiene «Siempre»: de ella no hay histórico,
 * solo el saldo. Misiones y equipos tienen fecha: también «Esta semana».
 */
export function rankingPeriodsFor(type: RankingType): RankingPeriod[] {
  return type === 'xp' ? ['all'] : [...RANKING_PERIODS]
}

/** El tipo y el periodo que se sirven: lo pedido si vale; si no, el primero y «Siempre». */
export function resolveRankingView(
  types: readonly RankingType[],
  requested: { type?: unknown; period?: unknown }
): { type: RankingType; period: RankingPeriod } {
  const type = types.includes(requested.type as RankingType)
    ? (requested.type as RankingType)
    : types[0]!
  const period = rankingPeriodsFor(type).includes(requested.period as RankingPeriod)
    ? (requested.period as RankingPeriod)
    : 'all'
  return { type, period }
}
