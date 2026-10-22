/**
 * Una recompensa libre lleva signo: da o quita. Cuenta como «quitar» cuando no
 * suma nada (todos sus deltas son cero o negativos). Lo usan el muro y el
 * historial de la clase para no decir «recibió una recompensa» de algo que resta.
 */
export interface SignedDeltas {
  xpDelta?: unknown
  coinDelta?: unknown
  manaDelta?: unknown
  lifeDelta?: unknown
}

export function rewardTakesOnly(d: SignedDeltas): boolean {
  return ![d.xpDelta, d.coinDelta, d.manaDelta, d.lifeDelta].some(v => Number(v ?? 0) > 0)
}
