import { describe, it, expect } from 'vitest'
import {
  HINT_COST_TYPES as backendCostTypes,
  HINT_LIMITS as backendLimits,
  effectiveHintCost,
  normalizeHintCost,
  rewardAfterHints as backendRewardAfterHints,
} from '../../src/utils/mission-hints.js'

// El espejo del navegador, importado tal cual (como en xp-parity): lo que la
// ventana de entregas enseña en «Recibirá» y lo que el alumnado ve como coste o
// «Gratis» tiene que ser lo que la API paga y cobra.
import {
  HINT_COST_TYPES as frontCostTypes,
  HINT_LIMITS as frontLimits,
  clampHintCost,
  hintIsFree,
  rewardAfterHints as frontRewardAfterHints,
} from '../../../app/app/utils/mission-hints.js'

describe('pistas: paridad entre la API y el navegador', () => {
  it('los mismos tipos de coste y los mismos topes', () => {
    expect([...frontCostTypes]).toEqual([...backendCostTypes])
    expect(frontLimits).toEqual(backendLimits)
  })

  it('rewardAfterHints da lo mismo en toda la rejilla de base, % de aprobación y descuento', () => {
    const bases = [0, 1, 3, 7, 10, 15, 20, 33, 50, 99, 100, 120, 150, 199, 200, 250, 333, 400]
    for (const base of bases) {
      for (let pct = 0; pct <= 100; pct += 5) {
        for (let penalty = 0; penalty <= 100; penalty += 5) {
          expect(frontRewardAfterHints(base, pct, penalty), `${base} ${pct} ${penalty}`).toBe(
            backendRewardAfterHints(base, pct, penalty)
          )
        }
      }
    }
    // Fuera de rango, los dos acotan igual.
    for (const [pct, penalty] of [
      [-10, 0],
      [150, 0],
      [80, -5],
      [80, 120],
    ]) {
      expect(frontRewardAfterHints(100, pct, penalty)).toBe(
        backendRewardAfterHints(100, pct, penalty)
      )
    }
  })

  it('el editor acota el coste como lo guarda la API', () => {
    const samples: unknown[] = [
      -50, -1, 0, 0.4, 0.5, 1, 3.6, 20, 99, 100, 101, 150, 9999, 10000, 10001, 99999,
      '5', '12.7', ' 30 ', '', 'mucho', '-3',
    ]
    for (const costType of backendCostTypes) {
      for (const cost of samples) {
        expect(clampHintCost(costType, cost), `${costType} ${String(cost)}`).toBe(
          normalizeHintCost(costType, cost).cost
        )
      }
    }
  })

  it('«Gratis» en el navegador es lo que la API cobra a 0', () => {
    const settingsList = [
      { coins: true, xp: true },
      { coins: false, xp: true },
      { coins: true, xp: false },
      { coins: false, xp: false },
    ]
    for (const settings of settingsList) {
      for (const costType of backendCostTypes) {
        for (const cost of [0, 1, 10, 100]) {
          const hint = { costType, cost }
          expect(hintIsFree(hint, settings), `${costType} ${cost} ${JSON.stringify(settings)}`).toBe(
            effectiveHintCost(hint, settings) === 0
          )
        }
      }
    }
  })
})
