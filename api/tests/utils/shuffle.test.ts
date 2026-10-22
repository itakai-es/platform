import { describe, it, expect } from 'vitest'
import { deal, shuffled } from '../../src/utils/shuffle.js'

/** Barajar y repartir los equipos al azar: lo que no depende de la suerte. */

describe('shuffled', () => {
  it('devuelve los mismos elementos sin tocar el original', () => {
    const items = [1, 2, 3, 4, 5, 6]
    const out = shuffled(items)
    expect(out.sort()).toEqual(items)
    expect(items).toEqual([1, 2, 3, 4, 5, 6])
  })

  it('es Fisher-Yates: con un azar fijo, el orden esperado', () => {
    // Siempre 0: cada posición se cambia con la primera.
    expect(shuffled(['a', 'b', 'c', 'd'], () => 0)).toEqual(['b', 'c', 'd', 'a'])
  })
})

describe('deal', () => {
  it('reparte en grupos que se llevan como mucho uno', () => {
    for (const [n, groups] of [
      [7, 3],
      [10, 4],
      [3, 5],
      [0, 2],
    ] as const) {
      const out = deal(Array.from({ length: n }, (_, i) => i), groups)
      expect(out).toHaveLength(groups)
      const sizes = out.map(g => g.length)
      expect(Math.max(...sizes) - Math.min(...sizes)).toBeLessThanOrEqual(1)
      expect(out.flat().sort((a, b) => a - b)).toEqual(Array.from({ length: n }, (_, i) => i))
    }
  })

  it('equilibrado por nivel: en serpiente, de más a menos', () => {
    const people = [1, 2, 3, 4, 5, 6].map(level => ({ level }))
    const out = deal(people, 2, { level: p => p.level, random: () => 0 })
    // 6 y 5 abren cada equipo; luego 4 va con 5 y 3 con 6 (vuelta), y así.
    expect(out.map(g => g.map(p => p.level))).toEqual([
      [6, 3, 2],
      [5, 4, 1],
    ])
  })
})
