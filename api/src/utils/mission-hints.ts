/**
 * Pistas de una misión: qué cuesta cada una y cuánto descuentan las de %.
 *
 * Una pista cuesta monedas, XP o un % de lo que la misión aún tiene que pagar a
 * quien la usa (los enigmas que le faltan por aprobar y el bonus de rareza;
 * nunca lo ya cobrado). Las de % se suman, con tope en 100, y se multiplican con
 * el % de aprobación: un enigma aprobado al 80 % con un −20 % de pistas paga el
 * 64 %. Un recurso apagado en la clase vale 0, como en las recompensas: la
 * pista sale gratis.
 *
 * El navegador tiene el espejo en `app/app/utils/mission-hints.ts`, para
 * enseñar lo mismo que se cobra.
 */

import type { ClassSettings } from './class-settings.js'

export const HINT_COST_TYPES = ['coins', 'xp', 'percent'] as const
export type HintCostType = (typeof HINT_COST_TYPES)[number]

export const HINT_LIMITS = {
  /** Pistas por misión. */
  perMission: 10,
  /** Caracteres del texto de una pista. */
  content: 1000,
  /** Monedas o XP que puede costar una pista. */
  maxCost: 10000,
} as const

function isCostType(value: unknown): value is HintCostType {
  return typeof value === 'string' && (HINT_COST_TYPES as readonly string[]).includes(value)
}

/**
 * Coste acotado: un tipo desconocido pasa a monedas y la cantidad a un entero
 * entre 0 y el tope (100 si es un %); un número en texto («5») vale como número
 * y lo que no es un número, 0. No lanza nunca: lo raro se recoloca.
 */
export function normalizeHintCost(
  costType: unknown,
  cost: unknown
): { costType: HintCostType; cost: number } {
  const type = isCostType(costType) ? costType : 'coins'
  const max = type === 'percent' ? 100 : HINT_LIMITS.maxCost
  const raw = typeof cost === 'string' && cost.trim() !== '' ? Number(cost) : cost
  const value = typeof raw === 'number' && Number.isFinite(raw) ? Math.round(raw) : 0
  return { costType: type, cost: Math.min(max, Math.max(0, value)) }
}

/** El texto de una pista, sin espacios a los lados y con su tope de largo. */
export function clipHintContent(content: string): string {
  return Array.from(content.trim()).slice(0, HINT_LIMITS.content).join('')
}

/**
 * Lo que cuesta de verdad en esta clase: 0 si el recurso del coste está apagado
 * (sin tienda no hay monedas; sin XP no hay XP que cobrar). El % siempre vale:
 * se aplica sobre lo que la clase reparta.
 */
export function effectiveHintCost(
  hint: { costType: string; cost: number },
  settings: Pick<ClassSettings, 'coins' | 'xp'>
): number {
  const { costType, cost } = normalizeHintCost(hint.costType, hint.cost)
  if (costType === 'coins' && !settings.coins) return 0
  if (costType === 'xp' && !settings.xp) return 0
  return cost
}

/** % que restan las pistas de % usadas por una persona en una misión: la suma, con tope en 100. */
export function hintPenaltyFrom(uses: { costType: string; cost: number }[]): number {
  const total = uses
    .filter(use => use.costType === 'percent')
    .reduce((sum, use) => sum + Math.max(0, use.cost), 0)
  return Math.min(100, total)
}

/**
 * Lo que paga una recompensa con el % de aprobación y el descuento de las
 * pistas, los dos de 0 a 100: `round(base × aprobación × (1 − descuento))`. Sin
 * descuento es la cuenta de siempre, `round(base × aprobación / 100)`, para no
 * mover ni una unidad de lo que se pagaba antes de las pistas.
 */
export function rewardAfterHints(base: number, percentage: number, penalty: number): number {
  const pct = Math.min(100, Math.max(0, percentage))
  const off = Math.min(100, Math.max(0, penalty))
  const scaled = (base * pct) / 100
  return Math.round(off === 0 ? scaled : (scaled * (100 - off)) / 100)
}
