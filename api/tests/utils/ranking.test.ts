import { describe, it, expect, vi } from 'vitest'

// Las funciones de orden son puras: la base no se toca.
vi.mock('../../src/config/database.js', () => ({ prisma: {} }))

import { rankByXp, rankOf, rankingStats, splitPodium } from '../../src/utils/ranking.js'
import { wallLimit, wallOffset, WALL_MAX_OFFSET } from '../../src/utils/activity.js'

const entry = (id: string, xp: number, alias: string | null = id) => ({ id, xp, alias })

describe('rankByXp: el orden de la clasificación', () => {
  it('da puestos de competición: quien empata comparte puesto y el siguiente salta (1, 2, 2, 4)', () => {
    const ranked = rankByXp([entry('a', 100), entry('b', 80), entry('c', 80), entry('d', 50)])
    expect(ranked.map(r => [r.id, r.rank])).toEqual([
      ['a', 1],
      ['b', 2],
      ['c', 2],
      ['d', 4],
    ])
  })

  it('entre empatados ordena por alias, sin mayúsculas ni tildes, y luego por id: no depende del orden de entrada', () => {
    const people = [
      entry('3', 40, 'Zeus'),
      entry('1', 40, 'ártemis'),
      entry('2', 40, 'Apolo'),
      entry('5', 40, 'Hera'),
      entry('4', 40, 'Hera'),
    ]
    const expected = ['2', '1', '4', '5', '3']
    expect(rankByXp(people).map(r => r.id)).toEqual(expected)
    expect(rankByXp([...people].reverse()).map(r => r.id)).toEqual(expected)
    expect(new Set(rankByXp(people).map(r => r.rank))).toEqual(new Set([1]))
  })

  it('con 0 XP no hay puesto y se va al final', () => {
    const ranked = rankByXp([entry('a', 0, 'Ana'), entry('b', 30, 'Bea'), entry('c', 0, 'Ciro')])
    expect(ranked.map(r => [r.id, r.rank])).toEqual([
      ['b', 1],
      ['a', null],
      ['c', null],
    ])
  })

  it('entre empatados, quien no tiene alias va detrás', () => {
    expect(rankByXp([entry('a', 10, null), entry('b', 10, 'Bea')]).map(r => r.id)).toEqual([
      'b',
      'a',
    ])
  })

  it('rankOf da el mismo puesto que la lista', () => {
    const people = [entry('a', 100), entry('b', 80), entry('c', 80), entry('d', 0)]
    expect(rankOf(people, 'c')).toBe(2)
    expect(rankOf(people, 'd')).toBeNull()
    expect(rankOf(people, 'nadie')).toBeNull()
  })
})

describe('splitPodium', () => {
  it('nadie con 0 XP en el podio; quien aún no tiene XP va al final del resto', () => {
    const ranked = rankByXp([entry('a', 10), entry('b', 0), entry('c', 0)])
    const { podium, rest } = splitPodium(ranked)
    expect(podium.map(r => r.id)).toEqual(['a'])
    expect(rest.map(r => [r.id, r.rank])).toEqual([
      ['b', null],
      ['c', null],
    ])
  })

  it('el podio son las tres primeras personas con puesto, aunque empaten más', () => {
    const ranked = rankByXp([entry('a', 9), entry('b', 9), entry('c', 9), entry('d', 9), entry('e', 1)])
    const { podium, rest } = splitPodium(ranked)
    expect(podium.map(r => r.id)).toEqual(['a', 'b', 'c'])
    expect(rest.map(r => [r.id, r.rank])).toEqual([
      ['d', 1],
      ['e', 5],
    ])
  })

  it('una clase nueva, toda a 0, no tiene podio', () => {
    expect(splitPodium(rankByXp([entry('a', 0), entry('b', 0)])).podium).toEqual([])
  })
})

describe('rankingStats', () => {
  it('da las medias con las misiones que cuentan y la XP total', () => {
    const stats = rankingStats(
      [
        { xp: 100, missionsCompleted: 3, percent: 75 },
        { xp: 50, missionsCompleted: 1, percent: 25 },
      ],
      4
    )
    expect(stats).toEqual({
      avgXp: 75,
      avgProgress: 50,
      avgMissions: 2,
      missionsTotal: 4,
      totalXp: 150,
      totalStudents: 2,
    })
  })

  it('las misiones de media llevan un decimal', () => {
    const rows = [3, 3, 2].map(missionsCompleted => ({ xp: 0, missionsCompleted, percent: 0 }))
    expect(rankingStats(rows, 8).avgMissions).toBe(2.7)
  })

  it('sin obligatorios que cuenten, sin progreso medio', () => {
    expect(rankingStats([{ xp: 10, missionsCompleted: 0, percent: null }], 0)).toMatchObject({
      avgProgress: null,
      avgMissions: 0,
      missionsTotal: 0,
    })
  })

  it('sin alumnado, sin medias', () => {
    expect(rankingStats([], 3)).toEqual({
      avgXp: 0,
      avgProgress: null,
      avgMissions: null,
      missionsTotal: 3,
      totalXp: 0,
      totalStudents: 0,
    })
  })
})

describe('límites de los muros', () => {
  it('limit: entre 1 y 50; lo que no es un número, el de por defecto', () => {
    expect(wallLimit(undefined, 10)).toBe(10)
    expect(wallLimit('', 10)).toBe(10)
    expect(wallLimit('abc', 10)).toBe(10)
    expect(wallLimit('100000', 10)).toBe(50)
    expect(wallLimit('0', 10)).toBe(1)
    expect(wallLimit('-3', 10)).toBe(1)
    expect(wallLimit('7.9', 10)).toBe(7)
    expect(wallLimit('20', 10)).toBe(20)
  })

  it('offset: de 0 en adelante; lo que no es un número, 0', () => {
    expect(wallOffset(undefined)).toBe(0)
    expect(wallOffset('abc')).toBe(0)
    expect(wallOffset('-5')).toBe(0)
    expect(wallOffset('15')).toBe(15)
  })

  it('offset: con tope, también lo que no cabe en la consulta', () => {
    expect(wallOffset(String(WALL_MAX_OFFSET))).toBe(WALL_MAX_OFFSET)
    expect(wallOffset(String(WALL_MAX_OFFSET + 1))).toBe(WALL_MAX_OFFSET)
    expect(wallOffset('1e30')).toBe(WALL_MAX_OFFSET)
    expect(wallOffset('99999999999999999999')).toBe(WALL_MAX_OFFSET)
    expect(wallOffset('Infinity')).toBe(0)
  })
})
