import type { ClassSettings } from '~/types/class.types'

/**
 * Configuración del ranking de una clase (`Class.rankingConfig`). Espejo de la API
 * (`api/src/utils/ranking-config.ts`): qué tipos hay, qué ve el alumnado, desde
 * cuándo cuenta la temporada y si hay comparación con la media. El interruptor del
 * ranking sigue en `settings.rankings`: apagado es «solo el profesorado». Quien
 * decide es la API, que recorta lo que manda; aquí solo se ofrece lo que tiene sentido.
 */

export const RANKING_TYPES = ['xp', 'missions', 'teams'] as const
export type RankingType = (typeof RANKING_TYPES)[number]

export const RANKING_MODES = ['full', 'top', 'position'] as const
export type RankingMode = (typeof RANKING_MODES)[number]

export const RANKING_TOP_SIZES = [3, 5, 10] as const
export type RankingTopSize = (typeof RANKING_TOP_SIZES)[number]

export const RANKING_PERIODS = ['all', 'week', 'season'] as const
export type RankingPeriod = (typeof RANKING_PERIODS)[number]

export interface RankingConfig {
  types: RankingType[]
  mode: RankingMode
  topN: RankingTopSize
  /** Desde cuándo cuenta la temporada (ISO); null si no se ha empezado ninguna. */
  seasonStartedAt: string | null
  /** La comparación anónima con la media; null si nunca se ha tocado (ver `compareEnabled`). */
  compare: boolean | null
}

export const DEFAULT_RANKING_CONFIG: RankingConfig = {
  types: ['xp', 'teams'],
  mode: 'full',
  topN: 5,
  seasonStartedAt: null,
  compare: null,
}

/** Lo que mande la API, con los valores por defecto para lo que no sirva. Nunca lanza. */
export function resolveRankingConfig(raw: unknown): RankingConfig {
  const fallback = DEFAULT_RANKING_CONFIG
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return { ...fallback, types: [...fallback.types] }
  }
  const r = raw as Partial<Record<keyof RankingConfig, unknown>>
  const listed = Array.isArray(r.types) ? (r.types as unknown[]) : []
  const types = RANKING_TYPES.filter(type => listed.includes(type))
  const started = typeof r.seasonStartedAt === 'string' ? new Date(r.seasonStartedAt) : null
  return {
    types: types.length > 0 ? types : [...fallback.types],
    mode: RANKING_MODES.includes(r.mode as RankingMode) ? (r.mode as RankingMode) : fallback.mode,
    topN: RANKING_TOP_SIZES.includes(r.topN as RankingTopSize)
      ? (r.topN as RankingTopSize)
      : fallback.topN,
    seasonStartedAt:
      started && !Number.isNaN(started.getTime()) ? (r.seasonStartedAt as string) : null,
    compare: typeof r.compare === 'boolean' ? r.compare : null,
  }
}

/**
 * ¿Tiene la clase la comparación anónima encendida? Es independiente del ranking.
 * Sin guardar, sigue a `settings.rankings`: arranca igual que el ranking de cada
 * clase, para respetar lo que decidió quien lo apagó.
 */
export function compareEnabled(
  settings: Pick<ClassSettings, 'rankings'>,
  config: Pick<RankingConfig, 'compare'>
): boolean {
  return config.compare ?? settings.rankings
}

/** ¿Puede usar la clase este tipo? La XP, si la clase usa XP; los demás no piden nada. */
export function rankingTypeAvailable(type: RankingType, settings: Pick<ClassSettings, 'xp'>) {
  return type !== 'xp' || settings.xp
}

/** Los tipos encendidos que la clase puede usar. */
export function effectiveRankingTypes(
  config: Pick<RankingConfig, 'types'>,
  settings: Pick<ClassSettings, 'xp'>
): RankingType[] {
  return config.types.filter(type => rankingTypeAvailable(type, settings))
}

/** El interruptor, coherente con los tipos: sin ninguno disponible, apagado. */
export function normalizeRankingSwitch<T extends Pick<ClassSettings, 'xp' | 'rankings'>>(
  settings: T,
  config: Pick<RankingConfig, 'types'>
): T {
  if (settings.rankings && effectiveRankingTypes(config, settings).length === 0) {
    return { ...settings, rankings: false }
  }
  return settings
}

/**
 * Al encender el ranking, los tipos con los que arranca: los elegidos o, si ninguno
 * se puede usar (solo XP en una clase sin XP), el de misiones, que no pide nada. Con
 * el ranking encendido se ven las opciones, y ahí se cambia.
 */
export function rankingTypesToTurnOn(
  config: Pick<RankingConfig, 'types'>,
  settings: Pick<ClassSettings, 'xp'>
): RankingType[] {
  return effectiveRankingTypes(config, settings).length > 0 ? config.types : ['missions']
}
