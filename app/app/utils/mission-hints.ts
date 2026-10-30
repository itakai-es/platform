/**
 * Pistas de una misión: espejo de `api/src/utils/mission-hints.ts`, para
 * enseñar lo mismo que la API cobra y paga. Sin dependencias de Nuxt: se prueba
 * en Node importándolo tal cual.
 *
 * Una pista cuesta monedas, XP o un % de lo que la misión aún tiene que pagar a
 * quien la usa. Las de % se suman con tope en 100 y se multiplican con el % de
 * aprobación. Un recurso apagado en la clase vale 0: la pista sale gratis.
 */

export const HINT_COST_TYPES = ['coins', 'xp', 'percent'] as const
export type HintCostType = (typeof HINT_COST_TYPES)[number]

export const HINT_LIMITS = {
  perMission: 10,
  content: 1000,
  maxCost: 10000,
} as const

/** Atajos del editor: sugerencias, no reglas (cualquier entero vale). */
export const HINT_COST_PRESETS: Record<HintCostType, readonly number[]> = {
  coins: [5, 10, 20, 50],
  xp: [5, 10, 20, 50],
  percent: [10, 20, 25, 50],
}

/** Coste acotado como lo guarda la API: entero entre 0 y el tope (100 si es un %). */
export function clampHintCost(costType: HintCostType, cost: unknown): number {
  const max = costType === 'percent' ? 100 : HINT_LIMITS.maxCost
  const value = typeof cost === 'number' ? cost : Number(cost)
  if (!Number.isFinite(value)) return 0
  return Math.min(max, Math.max(0, Math.round(value)))
}

/** ¿Sale gratis en esta clase? Sin tienda no hay monedas; sin XP no hay XP que cobrar. */
export function hintIsFree(
  hint: { costType: string; cost: number },
  settings: { coins: boolean; xp: boolean }
): boolean {
  if (hint.cost <= 0) return true
  if (hint.costType === 'coins') return !settings.coins
  if (hint.costType === 'xp') return !settings.xp
  return false
}

/**
 * Lo que paga una recompensa con el % de aprobación y el descuento de las
 * pistas (los dos de 0 a 100), con la misma cuenta que la API.
 */
export function rewardAfterHints(base: number, percentage: number, penalty: number): number {
  const pct = Math.min(100, Math.max(0, percentage))
  const off = Math.min(100, Math.max(0, penalty))
  const scaled = (base * pct) / 100
  return Math.round(off === 0 ? scaled : (scaled * (100 - off)) / 100)
}

/** Cuánto le falta para pagar la pista, o 0 si le llega. */
export function hintShortfall(
  hint: { costType: string; cost: number },
  wallet: { coins: number; xp: number }
): number {
  if (hint.costType === 'coins') return Math.max(0, hint.cost - wallet.coins)
  if (hint.costType === 'xp') return Math.max(0, hint.cost - wallet.xp)
  return 0
}
