import { describe, it, expect } from 'vitest'
import {
  chainEdges,
  cycleWith,
  dependentsOf,
  enigmasComplete,
  orderViolation,
  pathOrder,
} from '../../src/utils/mission-path.js'

/**
 * Las reglas del camino del mapa de misiones (E3, entrega 3) sin base de datos:
 * qué cuenta como completar, los ciclos, el orden que cumple el camino y la
 * cadena de «Encadenar en orden».
 */

const edge = (missionId: string, requiredMissionId: string) => ({ missionId, requiredMissionId })

describe('completar una misión', () => {
  it('cuentan solo los enigmas obligatorios', () => {
    expect(
      enigmasComplete([
        { isOptional: false, approved: true },
        { isOptional: true, approved: false },
      ])
    ).toBe(true)
    expect(
      enigmasComplete([
        { isOptional: false, approved: true },
        { isOptional: false, approved: false },
        { isOptional: true, approved: true },
      ])
    ).toBe(false)
  })

  it('si todos son opcionales, basta con uno; sin enigmas, nunca', () => {
    expect(
      enigmasComplete([
        { isOptional: true, approved: false },
        { isOptional: true, approved: true },
      ])
    ).toBe(true)
    expect(enigmasComplete([{ isOptional: true, approved: false }])).toBe(false)
    expect(enigmasComplete([])).toBe(false)
  })
})

describe('ciclos', () => {
  const edges = [edge('B', 'A'), edge('C', 'B'), edge('D', 'A')]

  it('las que dependen de una, directa o indirectamente', () => {
    expect([...dependentsOf(edges, 'A')].sort()).toEqual(['B', 'C', 'D'])
    expect([...dependentsOf(edges, 'C')]).toEqual([])
  })

  it('pedir una que ya la necesita (o a sí misma) cerraría un círculo', () => {
    expect(cycleWith(edges, 'A', ['C'])).toBe('C')
    expect(cycleWith(edges, 'A', ['D', 'B'])).toBe('D')
    expect(cycleWith(edges, 'A', ['A'])).toBe('A')
    expect(cycleWith(edges, 'C', ['D'])).toBeNull()
    // Lo que pide ahora la propia misión se sustituye: no cuenta.
    expect(cycleWith([edge('A', 'B')], 'A', ['B'])).toBeNull()
  })
})

describe('el orden que cumple el camino', () => {
  it('si ya cumple, no cambia', () => {
    expect(pathOrder(['A', 'B', 'C'], [edge('C', 'A')])).toEqual(['A', 'B', 'C'])
  })

  it('la que va delante de lo que pide se coloca justo detrás', () => {
    expect(pathOrder(['A', 'M', 'B', 'C', 'D'], [edge('M', 'D')])).toEqual([
      'A',
      'B',
      'C',
      'D',
      'M',
    ])
  })

  it('y con ella lo que la pide a ella; lo demás no se mueve entre sí', () => {
    // X pide M y M pasa a pedir A, que iba la última.
    expect(pathOrder(['M', 'X', 'Y', 'A'], [edge('X', 'M'), edge('M', 'A')])).toEqual([
      'Y',
      'A',
      'M',
      'X',
    ])
  })

  it('una arista con un id que no está no cuenta', () => {
    expect(pathOrder(['A', 'B'], [edge('B', 'Z')])).toEqual(['A', 'B'])
  })

  it('el orden que pone una misión delante de lo que pide se detecta', () => {
    expect(orderViolation(['B', 'A'], [edge('B', 'A')])).toEqual(edge('B', 'A'))
    expect(orderViolation(['A', 'B'], [edge('B', 'A')])).toBeNull()
  })
})

it('encadenar en orden: cada una pide la anterior', () => {
  expect(chainEdges(['A', 'B', 'C'])).toEqual([edge('B', 'A'), edge('C', 'B')])
  expect(chainEdges(['A'])).toEqual([])
})
