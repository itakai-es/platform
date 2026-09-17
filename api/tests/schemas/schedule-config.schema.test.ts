import { describe, it, expect } from 'vitest'
import { scheduleConfigSchema } from '../../src/modules/teachers/schedule-config.schema.js'

const slot = {
  freq: 'weekly',
  interval: 1,
  weekdays: [0, 1],
  start: '20:51',
  end: '21:51',
  startDate: '2026-09-15',
  ends: { type: 'on', onDate: '2026-08-31' },
  overrides: {},
}

describe('scheduleConfigSchema', () => {
  it('conserva una lista de tramos válida tal cual', () => {
    const second = { ...slot, weekdays: [2, 3], start: '20:52', end: '23:52' }
    expect(scheduleConfigSchema.parse([slot, second])).toEqual([slot, second])
  })

  it('convierte el objeto único de las clases antiguas en lista', () => {
    expect(scheduleConfigSchema.parse(slot)).toEqual([slot])
  })

  it('acepta null para borrar el horario', () => {
    expect(scheduleConfigSchema.parse(null)).toBeNull()
  })

  it('normaliza valores raros en vez de rechazar el guardado', () => {
    const [parsed] = scheduleConfigSchema.parse([
      {
        ...slot,
        freq: 'hourly',
        interval: 0,
        weekdays: [3, 1, 3, 9, 'x'],
        ends: { type: 'after', afterCount: '' },
        overrides: 'nope',
        extra: 'fuera',
      },
    ])!
    expect(parsed).toEqual({
      ...slot,
      freq: 'weekly',
      interval: 1,
      weekdays: [1, 3],
      ends: { type: 'after' },
      overrides: {},
    })
  })

  it('vacía horas y fechas con formato inválido', () => {
    const [parsed] = scheduleConfigSchema.parse([
      {
        ...slot,
        start: '<b>9</b>',
        end: '',
        startDate: 'mañana',
        ends: { type: 'on', onDate: '' },
        overrides: { '2026-10-12': 'off', ayer: 'on' },
      },
    ])!
    expect(parsed).toMatchObject({ start: '', end: '', startDate: '', ends: { type: 'on' } })
    expect(parsed.ends.onDate).toBeUndefined()
    expect(parsed.overrides).toEqual({})
  })

  it('limita el número de tramos', () => {
    expect(scheduleConfigSchema.parse(Array(80).fill(slot))).toHaveLength(50)
  })

  it('rechaza lo que no es un horario', () => {
    expect(scheduleConfigSchema.safeParse('lunes y martes').success).toBe(false)
  })
})
