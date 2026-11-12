import { describe, it, expect } from 'vitest'
import {
  BAND_MARGIN,
  MIN_OTHERS,
  averageBand,
  compareWithOthers,
  roundForStudents,
  studentRankingStats,
} from '../../src/utils/anonymous-stats.js'

/**
 * Las reglas de la comparación anónima (F1, entrega 7), sin base de datos: umbral,
 * redondeo, banda, «los N primeros» y que dos estudiantes no puedan deshacer la
 * media restando las suyas. De punta a punta, en
 * tests/routes/anonymous-comparison.db.test.ts.
 */

const others = (...values: number[]) => values

describe('el umbral', () => {
  it('son 5 personas además de quien mira', () => {
    expect(MIN_OTHERS).toBe(5)
  })

  it('con 5 en total (4 además de quien mira), ni media ni banda', () => {
    expect(compareWithOthers({ value: 100, others: others(10, 20, 30, 40), kind: 'xp' })).toEqual({
      value: 100,
      average: null,
      band: null,
      reason: 'small_class',
    })
  })

  it('con 6 en total (5 además de quien mira), media y banda', () => {
    expect(compareWithOthers({ value: 100, others: others(10, 20, 30, 40, 50), kind: 'xp' })).toEqual(
      { value: 100, average: 30, band: 'above', reason: null }
    )
  })

  it('sin nadie más, tampoco', () => {
    expect(compareWithOthers({ value: 0, others: [], kind: 'missions' }).reason).toBe('small_class')
  })
})

describe('el redondeo', () => {
  it('la XP a la decena', () => {
    expect(roundForStudents(144.9, 'xp')).toBe(140)
    expect(roundForStudents(145, 'xp')).toBe(150)
    expect(roundForStudents(4, 'xp')).toBe(0)
  })

  it('las misiones a la unidad', () => {
    expect(roundForStudents(2.4, 'missions')).toBe(2)
    expect(roundForStudents(2.5, 'missions')).toBe(3)
  })

  it('el % de 5 en 5', () => {
    expect(roundForStudents(62, 'percent')).toBe(60)
    expect(roundForStudents(63, 'percent')).toBe(65)
    expect(roundForStudents(100, 'percent')).toBe(100)
  })

  it('la media sale ya redondeada; lo propio, exacto', () => {
    const figure = compareWithOthers({ value: 123, others: others(11, 12, 13, 14, 15), kind: 'xp' })
    expect(figure.value).toBe(123)
    expect(figure.average).toBe(10)
  })
})

describe('la banda', () => {
  it('a ±10 % de la media, con los dos extremos dentro', () => {
    expect(BAND_MARGIN).toBe(0.1)
    expect(averageBand(110, 100)).toBe('at')
    expect(averageBand(90, 100)).toBe('at')
    expect(averageBand(111, 100)).toBe('above')
    expect(averageBand(89, 100)).toBe('below')
  })

  it('con media 0: con algo se va por encima y con 0 se está en la media', () => {
    expect(averageBand(0, 0)).toBe('at')
    expect(averageBand(1, 0)).toBe('above')
  })

  it('se calcula con la media redondeada: lo que dice cuadra con lo que se ve', () => {
    // Exacta, 91: 100 estaría a menos del 10 %. Se enseña 90, y 100 queda por encima.
    const figure = compareWithOthers({ value: 100, others: others(91, 91, 91, 91, 91), kind: 'xp' })
    expect(figure).toMatchObject({ average: 90, band: 'above' })
  })
})

describe('«los N primeros»', () => {
  const group = others(100, 200, 300, 400, 500, 600)

  it('con menos de 5 ocultos, solo la banda', () => {
    expect(compareWithOthers({ value: 90, others: group, kind: 'xp', hiddenOthers: 4 })).toEqual({
      value: 90,
      average: null,
      band: 'below',
      reason: 'band_only',
    })
  })

  it('con 5 ocultos, también la media', () => {
    expect(compareWithOthers({ value: 90, others: group, kind: 'xp', hiddenOthers: 5 })).toEqual({
      value: 90,
      average: 350,
      band: 'below',
      reason: null,
    })
  })

  it('clase pequeña va por encima: sin banda aunque no haya ocultos', () => {
    expect(compareWithOthers({ value: 90, others: others(1, 2), kind: 'xp', hiddenOthers: 0 }).band).toBeNull()
  })

  it('en los demás modos no se mira', () => {
    expect(compareWithOthers({ value: 90, others: group, kind: 'xp', hiddenOthers: null }).average).toBe(350)
  })
})

describe('dos estudiantes restando sus «medias del resto»', () => {
  /** Lo que recibe cada cual de la API: su media del resto. */
  const published = (values: number[], viewer: number, kind: 'xp' | 'missions') =>
    compareWithOthers({
      value: values[viewer]!,
      others: values.filter((_, index) => index !== viewer),
      kind,
    }).average!

  /** El ataque: (media de A − media de B) × (personas − 1) daría b − a si fueran exactas. */
  const attack = (values: number[], a: number, b: number, kind: 'xp' | 'missions') =>
    (published(values, a, kind) - published(values, b, kind)) * (values.length - 1)

  it('la XP: sin redondear lo sacarían; redondeada, no', () => {
    const xp = [103, 117, 40, 55, 60, 75]
    const exact = (viewer: number) =>
      xp.filter((_, i) => i !== viewer).reduce((sum, v) => sum + v, 0) / (xp.length - 1)
    // Con la media exacta (o con un decimal, que aquí es exacta), sale la diferencia: 14.
    expect(Math.round((exact(0) - exact(1)) * (xp.length - 1))).toBe(14)
    // Con la decena, las dos personas ven 70: no sale nada.
    expect(published(xp, 0, 'xp')).toBe(70)
    expect(published(xp, 1, 'xp')).toBe(70)
    expect(attack(xp, 0, 1, 'xp')).toBe(0)
  })

  it('las misiones: un decimal lo deshace, la unidad no', () => {
    const missions = [1, 3, 0, 2, 2, 4]
    const oneDecimal = (viewer: number) =>
      Math.round(
        (missions.filter((_, i) => i !== viewer).reduce((sum, v) => sum + v, 0) / (missions.length - 1)) * 10
      ) / 10
    expect(Math.round((oneDecimal(0) - oneDecimal(1)) * (missions.length - 1))).toBe(2)
    expect(published(missions, 0, 'missions')).toBe(2)
    expect(published(missions, 1, 'missions')).toBe(2)
    expect(attack(missions, 0, 1, 'missions')).toBe(0)
  })

  it('lo que ven no distingue entre muchas diferencias posibles', () => {
    // A sabe lo suyo y ve las dos medias; prueba todos los valores que podría tener B.
    const rest = [40, 55, 60, 75]
    const a = 103
    const seen = (b: number) => {
      const values = [a, b, ...rest]
      return `${published(values, 0, 'xp')}|${published(values, 1, 'xp')}`
    }
    const real = 117
    const compatible = Array.from({ length: 400 }, (_, b) => b).filter(b => seen(b) === seen(real))
    expect(compatible).toContain(real)
    expect(compatible.length).toBeGreaterThanOrEqual(25)
  })

  it('en ningún reparto de clase pequeña pasa de la decena: el salto mínimo es de 50 XP', () => {
    const base = [103, 117, 40, 55, 60, 75]
    for (let delta = 0; delta < 50; delta++) {
      const values = [base[0]!, base[1]! + delta, ...base.slice(2)]
      expect(Math.abs(attack(values, 0, 1, 'xp')) % 50).toBe(0)
    }
  })
})

describe('las medias del ranking completo', () => {
  it('el alumnado las recibe sin la XP total ni el progreso medio', () => {
    const shown = studentRankingStats({ avgXp: 75, avgProgress: 50, totalXp: 150, totalStudents: 2 })
    expect(shown).toEqual({ avgXp: 75, totalStudents: 2 })
    expect(shown).not.toHaveProperty('totalXp')
    expect(shown).not.toHaveProperty('avgProgress')
  })
})
