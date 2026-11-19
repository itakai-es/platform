import { describe, it, expect, vi } from 'vitest'

// Las funciones de orden son puras: la base no se toca.
vi.mock('../../src/config/database.js', () => ({ prisma: {} }))

import {
  DEFAULT_RANKING_CONFIG,
  compareEnabled,
  effectiveRankingTypes,
  mergeRankingConfig,
  normalizeRankingSwitch,
  rankingPeriodsFor,
  resolveRankingConfig,
  resolveRankingView,
  studentRankingTypes,
} from '../../src/utils/ranking-config.js'
import { cutRanking, rankByScore, rankingPeriodStart } from '../../src/utils/ranking.js'
import { normalizeClassSettings, resolveClassSettings } from '../../src/utils/class-settings.js'
import { studentAvatarColor } from '../../src/utils/avatars.js'

describe('resolveRankingConfig', () => {
  it('nula es como hoy: XP y equipos, completo', () => {
    for (const raw of [null, undefined]) {
      expect(resolveRankingConfig(raw)).toEqual({
        types: ['xp', 'teams'],
        mode: 'full',
        topN: 5,
        compare: null,
      })
    }
  })

  it('los valores raros caen en los de por defecto y nunca lanza', () => {
    for (const raw of ['x', 7, [], true, {}, { types: 'xp' }, { types: [] }, { types: ['monedas'] }]) {
      expect(resolveRankingConfig(raw)).toEqual(DEFAULT_RANKING_CONFIG)
    }
    expect(resolveRankingConfig({ mode: 'anónimo', topN: 4 })).toEqual(DEFAULT_RANKING_CONFIG)
    expect(resolveRankingConfig({ topN: '5' }).topN).toBe(5)
    expect(resolveRankingConfig({ topN: 1000 }).topN).toBe(5)
  })

  it('no devuelve la lista por defecto compartida: nadie la puede cambiar sin querer', () => {
    resolveRankingConfig(null).types.push('missions')
    expect(DEFAULT_RANKING_CONFIG.types).toEqual(['xp', 'teams'])
  })

  it('se queda con lo que vale: tipos sin repetir y en su orden', () => {
    expect(
      resolveRankingConfig({ types: ['teams', 'vidas', 'xp', 'teams'], mode: 'top', topN: 10 })
    ).toEqual({
      types: ['xp', 'teams'],
      mode: 'top',
      topN: 10,
      compare: null,
    })
  })

  it('lo guardado que ya no es de la configuración, como una temporada, se ignora', () => {
    const saved = {
      types: ['missions', 'teams'],
      mode: 'position',
      topN: 10,
      compare: true,
      seasonStartedAt: '2026-11-02T07:00:00.000Z',
    }
    expect(resolveRankingConfig(saved)).toEqual({
      types: ['missions', 'teams'],
      mode: 'position',
      topN: 10,
      compare: true,
    })
    expect(resolveRankingConfig({ seasonStartedAt: 'ayer' })).toEqual(DEFAULT_RANKING_CONFIG)
  })

  it('la comparación solo es verdadero o falso; lo demás, sin guardar', () => {
    expect(resolveRankingConfig({ compare: true }).compare).toBe(true)
    expect(resolveRankingConfig({ compare: false }).compare).toBe(false)
    for (const compare of ['sí', 1, 0, null, undefined, {}]) {
      expect(resolveRankingConfig({ compare }).compare).toBeNull()
    }
  })
})

describe('compareEnabled', () => {
  it('sin guardar, sigue al ranking de la clase', () => {
    expect(compareEnabled({ rankings: true }, { compare: null })).toBe(true)
    expect(compareEnabled({ rankings: false }, { compare: null })).toBe(false)
  })

  it('guardada, manda ella: es independiente del ranking', () => {
    expect(compareEnabled({ rankings: false }, { compare: true })).toBe(true)
    expect(compareEnabled({ rankings: true }, { compare: false })).toBe(false)
  })
})

describe('mergeRankingConfig', () => {
  const saved = { types: ['xp'], mode: 'top', topN: 3 }

  it('un cambio se funde con lo guardado, y lo que no es de la configuración no se guarda', () => {
    expect(mergeRankingConfig(saved, { mode: 'position' })).toEqual({
      types: ['xp'],
      mode: 'position',
      topN: 3,
      compare: null,
    })
    expect(mergeRankingConfig({ ...saved, compare: false }, { mode: 'full' }).compare).toBe(false)
    expect(mergeRankingConfig(saved, { compare: true }).compare).toBe(true)
    expect(
      mergeRankingConfig({ ...saved, seasonStartedAt: '2026-11-02T07:00:00.000Z' }, { topN: 5 })
    ).not.toHaveProperty('seasonStartedAt')
    expect(mergeRankingConfig(null, { seasonStartedAt: '2026-01-01' })).not.toHaveProperty('seasonStartedAt')
    expect(mergeRankingConfig(saved, 'raro')).toEqual(resolveRankingConfig(saved))
  })
})

describe('«el ranking requiere XP» se relaja: cada tipo pide lo suyo', () => {
  it('el ranking ya no se apaga solo por apagar la XP', () => {
    expect(resolveClassSettings({ xp: false }).rankings).toBe(true)
    expect(normalizeClassSettings({ ...resolveClassSettings(null), xp: false }).rankings).toBe(true)
  })

  it('la XP pide XP; misiones y equipos, nada', () => {
    const config = resolveRankingConfig({ types: ['xp', 'missions', 'teams'] })
    expect(effectiveRankingTypes(config, { xp: true })).toEqual(['xp', 'missions', 'teams'])
    expect(effectiveRankingTypes(config, { xp: false })).toEqual(['missions', 'teams'])
  })

  it('sin ningún tipo disponible, el interruptor queda apagado', () => {
    const onlyXp = resolveRankingConfig({ types: ['xp'] })
    const off = { xp: false, rankings: true }
    expect(normalizeRankingSwitch(off, onlyXp).rankings).toBe(false)
    expect(normalizeRankingSwitch({ xp: true, rankings: true }, onlyXp).rankings).toBe(true)
    expect(normalizeRankingSwitch(off, resolveRankingConfig({ types: ['xp', 'missions'] })).rankings).toBe(
      true
    )
  })
})

describe('studentRankingTypes', () => {
  const all = resolveRankingConfig({ types: ['xp', 'missions', 'teams'] })

  it('apagado, ninguno; encendido, los que tienen algo que enseñar', () => {
    expect(studentRankingTypes({ xp: true, rankings: false }, all, true)).toEqual([])
    expect(studentRankingTypes({ xp: true, rankings: true }, all, true)).toEqual([
      'xp',
      'missions',
      'teams',
    ])
    expect(studentRankingTypes({ xp: false, rankings: true }, all, false)).toEqual(['missions'])
  })

  it('sin XP ni agrupaciones de base, una clase sin configuración no tiene nada que enseñar', () => {
    expect(studentRankingTypes({ xp: false, rankings: true }, resolveRankingConfig(null), false)).toEqual(
      []
    )
  })
})

describe('periodos', () => {
  it('la XP solo tiene «Siempre»; misiones y equipos, también «Esta semana»', () => {
    expect(rankingPeriodsFor('xp')).toEqual(['all'])
    expect(rankingPeriodsFor('missions')).toEqual(['all', 'week'])
    expect(rankingPeriodsFor('teams')).toEqual(['all', 'week'])
  })

  it('lo que no vale se queda en lo primero y en «Siempre»', () => {
    const types = ['xp', 'teams'] as const
    expect(resolveRankingView(types, {})).toEqual({ type: 'xp', period: 'all' })
    expect(resolveRankingView(types, { type: 'missions' }).type).toBe('xp')
    expect(resolveRankingView(types, { type: 'xp', period: 'week' }).period).toBe('all')
    // La temporada ya no existe: se sirve «Siempre».
    expect(resolveRankingView(types, { type: 'teams', period: 'season' }).period).toBe('all')
    expect(resolveRankingView(types, { type: 'teams', period: 'week' })).toEqual({
      type: 'teams',
      period: 'week',
    })
    expect(resolveRankingView(types, { type: ['xp'], period: 7 })).toEqual({
      type: 'xp',
      period: 'all',
    })
  })

  it('«Esta semana» empieza el lunes a las 00:00 en Madrid, también con el cambio de hora', () => {
    // Jueves 5 de noviembre de 2026 (invierno, UTC+1): lunes 2, 00:00 en Madrid.
    expect(rankingPeriodStart('week', new Date('2026-11-05T10:00:00Z'))?.toISOString()).toBe(
      '2026-11-01T23:00:00.000Z'
    )
    // Domingo por la noche en Madrid (ya es lunes en Canarias no, pero en UTC aún domingo).
    expect(rankingPeriodStart('week', new Date('2026-11-08T22:30:00Z'))?.toISOString()).toBe(
      '2026-11-01T23:00:00.000Z'
    )
    // Lunes a las 00:30 en Madrid: 23:30 UTC del domingo; ya es la semana nueva.
    expect(rankingPeriodStart('week', new Date('2026-11-08T23:30:00Z'))?.toISOString()).toBe(
      '2026-11-08T23:00:00.000Z'
    )
    // Verano (UTC+2).
    expect(rankingPeriodStart('week', new Date('2026-07-08T10:00:00Z'))?.toISOString()).toBe(
      '2026-07-05T22:00:00.000Z'
    )
    // La semana del cambio de hora (25 de octubre): el lunes 19 aún es verano.
    expect(rankingPeriodStart('week', new Date('2026-10-25T12:00:00Z'))?.toISOString()).toBe(
      '2026-10-18T22:00:00.000Z'
    )
  })

  it('«Siempre» no tiene inicio', () => {
    expect(rankingPeriodStart('all')).toBeNull()
  })
})

describe('rankByScore: el mismo orden para todos los tipos', () => {
  const row = (id: string, score: number, xp = 0, alias: string | null = id) => ({
    id,
    score,
    xp,
    alias,
  })

  it('puesto de competición (1, 2, 2, 4), con orden estable', () => {
    const people = [row('d', 1), row('b', 5), row('c', 5), row('a', 9)]
    const ranked = rankByScore(people, r => r.score)
    expect(ranked.map(r => [r.id, r.rank])).toEqual([
      ['a', 1],
      ['b', 2],
      ['c', 2],
      ['d', 4],
    ])
    expect(rankByScore([...people].reverse(), r => r.score).map(r => r.id)).toEqual(
      ranked.map(r => r.id)
    )
  })

  it('con desempate: solo comparten puesto quienes empatan en los dos', () => {
    const ranked = rankByScore(
      [row('a', 3, 10), row('b', 3, 50), row('c', 3, 50), row('d', 1, 999)],
      r => r.score,
      r => r.xp
    )
    expect(ranked.map(r => [r.id, r.rank])).toEqual([
      ['b', 1],
      ['c', 1],
      ['a', 3],
      ['d', 4],
    ])
  })

  it('con 0 no hay puesto y van al final, por alias: el desempate no los ordena', () => {
    const ranked = rankByScore(
      [row('z', 0, 500, 'Zoe'), row('a', 0, 1, 'Ana'), row('b', 2, 0, 'Bea')],
      r => r.score,
      r => r.xp
    )
    expect(ranked.map(r => [r.alias, r.rank])).toEqual([
      ['Bea', 1],
      ['Ana', null],
      ['Zoe', null],
    ])
  })

  it('en negativo tampoco hay puesto, y va detrás de quien tiene 0', () => {
    const ranked = rankByScore([row('n', -3), row('c', 0), row('p', 4)], r => r.score)
    expect(ranked.map(r => [r.id, r.rank])).toEqual([
      ['p', 1],
      ['c', null],
      ['n', null],
    ])
  })
})

describe('cutRanking: lo que puede salir según el modo', () => {
  const rows = [1, 2, 2, 4, 4, 4, 7, null, null].map((rank, i) => ({ id: `p${i}`, rank }))
  const ids = (cut: { podium: { id: string }[]; rest: { id: string }[] }) =>
    [...cut.podium, ...cut.rest].map(r => r.id)

  it('completo: todo, con el podio aparte y sin nadie a 0 en él', () => {
    const cut = cutRanking(rows, { mode: 'full', topN: 5 })
    expect(cut.podium.map(r => r.rank)).toEqual([1, 2, 2])
    expect(ids(cut)).toHaveLength(rows.length)
  })

  it('los N primeros: entran quienes empatan en el puesto N', () => {
    expect(ids(cutRanking(rows, { mode: 'top', topN: 3 }))).toEqual(['p0', 'p1', 'p2'])
    expect(ids(cutRanking(rows, { mode: 'top', topN: 5 }))).toEqual([
      'p0',
      'p1',
      'p2',
      'p3',
      'p4',
      'p5',
    ])
  })

  it('los N primeros: nunca entra nadie sin puesto, aunque falte gente para N', () => {
    const few = [{ id: 'a', rank: 1 }, { id: 'b', rank: null }]
    expect(ids(cutRanking(few, { mode: 'top', topN: 10 }))).toEqual(['a'])
  })

  it('solo su puesto: nadie', () => {
    expect(ids(cutRanking(rows, { mode: 'position', topN: 5 }))).toEqual([])
  })
})

describe('studentAvatarColor', () => {
  it('da el mismo color que la aplicación, que no puede cambiar con el id de la matrícula', () => {
    // Los mismos valores que comprueba app/tests/ranking-config.test.mjs contra
    // `avatarColorOf(studentAvatarSeed(clase, estudiante))`.
    expect(studentAvatarColor('clase-1', 'alumno-1')).toBe('purple')
    expect(studentAvatarColor('clase-1', 'alumno-2')).toBe('peach')
    expect(
      studentAvatarColor(
        '9f4ccae9-575b-4185-b9ae-dce19f8e92a5',
        'ccaa721f-80e3-4cef-acc7-88326da53af2'
      )
    ).toBe('yellow')
  })
})
