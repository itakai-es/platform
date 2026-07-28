// Sistema de niveles configurable por clase.
//
// Cada clase puede definir su propia curva de XP (baseXp · nivel^exponent, con un
// tope de niveles) y sus tramos visuales (título + color por rango de niveles).
// Si una clase no tiene `levelConfig`, se usa DEFAULT_LEVEL_CONFIG, que reproduce
// exactamente el sistema global anterior (retrocompatibilidad total).

export interface LevelTier {
  fromLevel: number
  toLevel: number
  title: string
  color: string
}

export type LevelMode = 'curve' | 'custom'

export interface LevelConfig {
  // 'curve' = XP por fórmula (baseXp·nivel^exponent); 'custom' = XP manual por nivel.
  mode: LevelMode
  baseXp: number // XP base de la fórmula (coste aproximado del primer nivel)
  exponent: number // Ritmo de crecimiento de la curva
  cap: number // Nivel máximo
  // Modo manual: XP para superar cada nivel. levelXp[L-1] = XP del nivel L → L+1
  // (longitud cap-1; el nivel máximo no necesita XP para "siguiente").
  levelXp?: number[]
  tiers: LevelTier[] // Tramos visuales (título + color)
}

// Reproduce el sistema anterior (BASE_XP=50, EXPONENT=1.3, LEVEL_CAP=50 y los
// mismos títulos por tramos), con un color por defecto para cada tramo.
export const DEFAULT_LEVEL_CONFIG: LevelConfig = {
  mode: 'curve',
  baseXp: 50,
  exponent: 1.3,
  cap: 50,
  tiers: [
    { fromLevel: 1, toLevel: 4, title: 'Mortal', color: '#9CA3AF' },
    { fromLevel: 5, toLevel: 9, title: 'Héroe Novato', color: '#34D399' },
    { fromLevel: 10, toLevel: 14, title: 'Héroe de Bronce', color: '#CD7F32' },
    { fromLevel: 15, toLevel: 19, title: 'Héroe de Plata', color: '#94A3B8' },
    { fromLevel: 20, toLevel: 24, title: 'Héroe de Oro', color: '#F59E0B' },
    { fromLevel: 25, toLevel: 29, title: 'Semidiós', color: '#14B8A6' },
    { fromLevel: 30, toLevel: 34, title: 'Titán', color: '#8B5CF6' },
    { fromLevel: 35, toLevel: 39, title: 'Olímpico Menor', color: '#6366F1' },
    { fromLevel: 40, toLevel: 44, title: 'Olímpico Mayor', color: '#3B82F6' },
    { fromLevel: 45, toLevel: 49, title: 'Avatar Divino', color: '#EC4899' },
    { fromLevel: 50, toLevel: 50, title: 'Dios del Olimpo', color: '#FBBF24' },
  ],
}

const clamp = (n: number, min: number, max: number) => Math.min(max, Math.max(min, n))

/**
 * Normaliza un `levelConfig` crudo (de la BD o del cliente) a una config válida,
 * fusionando sobre los valores por defecto y acotando rangos. Nunca lanza.
 */
export function resolveLevelConfig(raw: unknown): LevelConfig {
  if (!raw || typeof raw !== 'object') return DEFAULT_LEVEL_CONFIG
  const r = raw as Partial<LevelConfig>

  const cap = clamp(Math.round(Number(r.cap) || DEFAULT_LEVEL_CONFIG.cap), 2, 200)
  const baseXp = clamp(Math.round(Number(r.baseXp) || DEFAULT_LEVEL_CONFIG.baseXp), 1, 100000)
  const exponent = clamp(Number(r.exponent) || DEFAULT_LEVEL_CONFIG.exponent, 1, 3)

  let tiers: LevelTier[] =
    Array.isArray(r.tiers) && r.tiers.length > 0
      ? r.tiers
          .filter(t => t && typeof t === 'object')
          .map(t => ({
            fromLevel: clamp(Math.round(Number(t.fromLevel) || 1), 1, cap),
            toLevel: clamp(Math.round(Number(t.toLevel) || 1), 1, cap),
            title: String(t.title ?? '').slice(0, 40) || 'Nivel',
            color: /^#[0-9a-fA-F]{6}$/.test(String(t.color)) ? String(t.color) : '#9CA3AF',
          }))
          .filter(t => t.toLevel >= t.fromLevel)
          .sort((a, b) => a.fromLevel - b.fromLevel)
      : DEFAULT_LEVEL_CONFIG.tiers

  if (tiers.length === 0) tiers = DEFAULT_LEVEL_CONFIG.tiers

  const mode: LevelMode = r.mode === 'custom' ? 'custom' : 'curve'

  // Modo manual: normalizamos la lista de XP a exactamente cap-1 valores (uno por
  // cada salto de nivel). Los que falten se rellenan con la fórmula; el resto se
  // acotan a enteros ≥ 1. Así la config guardada siempre es coherente con el cap.
  let levelXp: number[] | undefined
  if (mode === 'custom') {
    const raw = Array.isArray(r.levelXp) ? r.levelXp : []
    levelXp = Array.from({ length: Math.max(1, cap - 1) }, (_, i) => {
      const v = Number(raw[i])
      if (Number.isFinite(v) && v >= 1) return Math.round(v)
      return Math.floor(baseXp * Math.pow(i + 1, exponent)) // fallback a la fórmula
    })
  }

  return { mode, baseXp, exponent, cap, ...(levelXp ? { levelXp } : {}), tiers }
}

/** XP necesaria para superar un nivel concreto (fórmula o valor manual). */
export function xpForLevel(level: number, cfg: LevelConfig): number {
  if (cfg.mode === 'custom' && cfg.levelXp && cfg.levelXp.length > 0) {
    const idx = clamp(level - 1, 0, cfg.levelXp.length - 1)
    return Math.max(1, Math.floor(cfg.levelXp[idx]))
  }
  return Math.floor(cfg.baseXp * Math.pow(level, cfg.exponent))
}

/** XP total acumulada para ALCANZAR un nivel (nivel 1 = 0 XP). */
export function totalXpForLevel(level: number, cfg: LevelConfig): number {
  if (level <= 1) return 0
  let total = 0
  for (let i = 1; i < level; i++) total += xpForLevel(i, cfg)
  return total
}

/** Nivel a partir de la XP total, acotado al cap de la clase. */
export function levelFromXp(totalXP: number, cfg: LevelConfig): number {
  if (totalXP <= 0) return 1
  let level = 1
  let threshold = 0
  while (level < cfg.cap) {
    const next = xpForLevel(level, cfg)
    if (threshold + next > totalXP) break
    threshold += next
    level++
  }
  return level
}

/** Tramo (título + color) al que pertenece un nivel. */
export function tierForLevel(level: number, cfg: LevelConfig): LevelTier {
  const tiers = cfg.tiers.length > 0 ? cfg.tiers : DEFAULT_LEVEL_CONFIG.tiers
  const t = tiers.find(x => level >= x.fromLevel && level <= x.toLevel)
  if (t) return t
  // Fuera de rango: por debajo del primer tramo → el más bajo; por encima del
  // último → el más alto. (Los niveles siempre van acotados a [1, cap], así que
  // esto solo es una red de seguridad para valores inesperados.)
  const first = tiers[0]
  return level < first.fromLevel ? first : tiers[tiers.length - 1]
}

export function titleForLevel(level: number, cfg: LevelConfig): string {
  return tierForLevel(level, cfg).title
}

export interface LevelInfo {
  level: number
  title: string
  color: string
  progress: number
  currentXP: number
  requiredXP: number
  totalXP: number
}

/** Información completa de nivel para una XP total, según la config de la clase. */
export function levelInfo(totalXP: number, cfg: LevelConfig): LevelInfo {
  const safeXP = Math.max(0, totalXP)
  const level = levelFromXp(safeXP, cfg)
  const tier = tierForLevel(level, cfg)

  if (level >= cfg.cap) {
    return {
      level: cfg.cap,
      title: tier.title,
      color: tier.color,
      progress: 100,
      currentXP: 0,
      requiredXP: 0,
      totalXP: safeXP,
    }
  }

  const currentLevelXP = totalXpForLevel(level, cfg)
  const requiredXP = xpForLevel(level, cfg)
  const xpInCurrentLevel = safeXP - currentLevelXP
  const progress =
    requiredXP > 0 ? clamp(Math.round((xpInCurrentLevel / requiredXP) * 100), 0, 100) : 0

  return {
    level,
    title: tier.title,
    color: tier.color,
    progress,
    currentXP: xpInCurrentLevel,
    requiredXP,
    totalXP: safeXP,
  }
}
