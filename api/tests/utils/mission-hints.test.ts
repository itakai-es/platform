import { describe, it, expect } from 'vitest'
import {
  HINT_LIMITS,
  clipHintContent,
  effectiveHintCost,
  hintPenaltyFrom,
  normalizeHintCost,
  rewardAfterHints,
} from '../../src/utils/mission-hints.js'

/**
 * Cuentas de las pistas: el coste se acota sin lanzar, un recurso apagado sale
 * gratis, las pistas de % se suman con tope en 100 y se multiplican con el % de
 * aprobación. Sin descuento, lo que se paga es lo de siempre.
 */
describe('pistas: costes y descuento', () => {
  it('acota el coste: tipo desconocido a monedas, enteros entre 0 y el tope (100 si es %)', () => {
    expect(normalizeHintCost('percent', 150)).toEqual({ costType: 'percent', cost: 100 })
    expect(normalizeHintCost('coins', -4)).toEqual({ costType: 'coins', cost: 0 })
    expect(normalizeHintCost('xp', 3.6)).toEqual({ costType: 'xp', cost: 4 })
    expect(normalizeHintCost('mana', 5)).toEqual({ costType: 'coins', cost: 5 })
    expect(normalizeHintCost('xp', Number.NaN)).toEqual({ costType: 'xp', cost: 0 })
    expect(normalizeHintCost('coins', 1e9)).toEqual({ costType: 'coins', cost: HINT_LIMITS.maxCost })
  })

  it('recorta el texto a su tope, sin espacios a los lados', () => {
    expect(clipHintContent('  hola  ')).toBe('hola')
    expect(Array.from(clipHintContent('á'.repeat(HINT_LIMITS.content + 5)))).toHaveLength(
      HINT_LIMITS.content
    )
  })

  it('un recurso apagado vale 0; el % siempre cuenta', () => {
    const off = { coins: false, xp: false }
    expect(effectiveHintCost({ costType: 'coins', cost: 10 }, off)).toBe(0)
    expect(effectiveHintCost({ costType: 'xp', cost: 10 }, off)).toBe(0)
    expect(effectiveHintCost({ costType: 'percent', cost: 10 }, off)).toBe(10)
    expect(effectiveHintCost({ costType: 'coins', cost: 10 }, { coins: true, xp: false })).toBe(10)
  })

  it('las pistas de % se suman con tope en 100; las demás no cuentan', () => {
    expect(hintPenaltyFrom([])).toBe(0)
    expect(
      hintPenaltyFrom([
        { costType: 'percent', cost: 20 },
        { costType: 'coins', cost: 50 },
        { costType: 'percent', cost: 15 },
      ])
    ).toBe(35)
    expect(
      hintPenaltyFrom([
        { costType: 'percent', cost: 60 },
        { costType: 'percent', cost: 70 },
      ])
    ).toBe(100)
  })

  it('el descuento se multiplica con el % de aprobación (el ejemplo de la guía)', () => {
    expect(rewardAfterHints(100, 80, 20)).toBe(64)
    expect(rewardAfterHints(20, 80, 20)).toBe(13)
    expect(rewardAfterHints(200, 100, 20)).toBe(160)
    expect(rewardAfterHints(100, 100, 100)).toBe(0)
  })

  it('sin descuento paga lo de siempre: round(base × aprobación / 100)', () => {
    for (let base = 0; base <= 300; base += 7) {
      for (let pct = 0; pct <= 100; pct++) {
        expect(rewardAfterHints(base, pct, 0)).toBe(Math.round((base * pct) / 100))
      }
    }
  })
})
