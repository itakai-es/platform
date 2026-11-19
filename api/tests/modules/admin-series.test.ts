import { describe, it, expect } from 'vitest'
import { buildTimeSeries } from '../../src/modules/admin/admin-series.js'

/**
 * Las series de las estadísticas de la administración: tienen que cubrir el periodo
 * entero. Antes, la del mes dejaba fuera los dos últimos días y la de la semana, hoy.
 * Cada tramo lleva la fecha en que empieza, en ISO, nunca un nombre en castellano.
 */

const DAY = 24 * 60 * 60 * 1000
const row = (date: Date) => ({ created_at: date })
const total = (series: { value: number }[]) => series.reduce((sum, point) => sum + point.value, 0)

describe('buildTimeSeries', () => {
  // Jueves, a media mañana en Madrid.
  const now = new Date('2026-11-05T10:00:00Z')

  describe('la semana', () => {
    const since = new Date(now.getTime() - 7 * DAY)

    it('llega hasta hoy: lo de hace un rato cae en el último día', () => {
      const series = buildTimeSeries([row(new Date(now.getTime() - 60_000))], since, now, 'week')
      expect(series[series.length - 1]).toEqual({ start: '2026-11-05', value: 1 })
    })

    it('cuenta todo lo del periodo, también lo primero y lo último', () => {
      const rows = [since, new Date(since.getTime() + DAY), new Date(now.getTime() - DAY), now].map(row)
      const series = buildTimeSeries(rows, since, now, 'week')
      expect(total(series)).toBe(rows.length)
      // Siete días hacia atrás tocan ocho fechas, de jueves a jueves.
      expect(series.map(point => point.start)).toEqual([
        '2026-10-29',
        '2026-10-30',
        '2026-10-31',
        '2026-11-01',
        '2026-11-02',
        '2026-11-03',
        '2026-11-04',
        '2026-11-05',
      ])
      expect(series[0]!.value).toBe(1)
      expect(series[7]!.value).toBe(1)
    })

    it('los días son los de Madrid: las 23:30 UTC de un día ya son el siguiente', () => {
      const late = new Date('2026-11-04T23:30:00Z')
      const series = buildTimeSeries([row(late)], since, now, 'week')
      expect(series[series.length - 1]!.value).toBe(1)
    })

    it('no se salta el día del cambio de hora, que tiene 23 horas', () => {
      const dst = new Date('2027-03-30T22:30:00Z')
      const series = buildTimeSeries([], new Date(dst.getTime() - 7 * DAY), dst, 'week')
      // Del martes 23 a las 23:30 al miércoles 31 a las 00:30, con el domingo 28 dentro.
      expect(series.map(point => point.start)).toEqual([
        '2027-03-23',
        '2027-03-24',
        '2027-03-25',
        '2027-03-26',
        '2027-03-27',
        '2027-03-28',
        '2027-03-29',
        '2027-03-30',
        '2027-03-31',
      ])
    })
  })

  describe('el mes', () => {
    const since = new Date(now.getTime() - 30 * DAY)

    it('llega hasta ahora: los dos últimos días no se quedan fuera', () => {
      const rows = [now, new Date(now.getTime() - DAY), new Date(now.getTime() - 2 * DAY)].map(row)
      const series = buildTimeSeries(rows, since, now, 'month')
      // Cuatro tramos de siete días y medio, cada uno con el día de Madrid en que
      // empieza: el segundo, a las 00:00 del 14 (22:00 UTC del 13), y el último, a
      // las 23:00 del 28 (ya en hora de invierno).
      expect(series.map(point => point.start)).toEqual(['2026-10-06', '2026-10-14', '2026-10-21', '2026-10-28'])
      expect(series.map(point => point.value)).toEqual([0, 0, 0, 3])
    })

    it('cuenta todo lo del periodo, repartido en tramos iguales', () => {
      const rows = Array.from({ length: 30 }, (_, day) => row(new Date(since.getTime() + day * DAY)))
      const series = buildTimeSeries(rows, since, now, 'month')
      expect(total(series)).toBe(30)
      expect(Math.max(...series.map(p => p.value)) - Math.min(...series.map(p => p.value))).toBeLessThanOrEqual(1)
    })

    it('lo que entra mientras se carga la página va al último tramo', () => {
      const series = buildTimeSeries([row(new Date(now.getTime() + 500))], since, now, 'month')
      expect(series[3]!.value).toBe(1)
    })

    it('es lo de por defecto', () => {
      expect(buildTimeSeries([], since, now, 'loquesea')).toEqual(buildTimeSeries([], since, now, 'month'))
      expect(buildTimeSeries([], since, now, 'loquesea')).toHaveLength(4)
    })
  })

  describe('el trimestre', () => {
    it('va del mes de `since` al de ahora, con los vacíos a cero', () => {
      const since = new Date(now.getTime() - 90 * DAY)
      const series = buildTimeSeries([row(since), row(now)], since, now, 'quarter')
      expect(series).toEqual([
        { start: '2026-08-01', value: 1 },
        { start: '2026-09-01', value: 0 },
        { start: '2026-10-01', value: 0 },
        { start: '2026-11-01', value: 1 },
      ])
    })

    it('noventa días pueden tocar cinco meses: el último no se queda fuera', () => {
      const until = new Date('2027-05-01T10:00:00Z')
      const since = new Date(until.getTime() - 90 * DAY)
      const series = buildTimeSeries([row(until)], since, until, 'quarter')
      expect(series.map(point => point.start)).toEqual([
        '2027-01-01',
        '2027-02-01',
        '2027-03-01',
        '2027-04-01',
        '2027-05-01',
      ])
      expect(series[4]!.value).toBe(1)
    })

    it('cruza el año', () => {
      const until = new Date('2027-01-15T10:00:00Z')
      const since = new Date(until.getTime() - 90 * DAY)
      const series = buildTimeSeries([row(until)], since, until, 'quarter')
      expect(series.map(point => point.start)).toEqual(['2026-10-01', '2026-11-01', '2026-12-01', '2027-01-01'])
    })
  })
})

describe('lo que viaja', () => {
  it('solo la fecha de inicio y la cifra, sin nombres de día ni de mes', () => {
    const now = new Date('2026-11-05T10:00:00Z')
    for (const [period, days] of [['week', 7], ['month', 30], ['quarter', 90]] as const) {
      const series = buildTimeSeries([], new Date(now.getTime() - days * DAY), now, period)
      for (const point of series) {
        expect(Object.keys(point).sort()).toEqual(['start', 'value'])
        expect(point.start).toMatch(/^\d{4}-\d{2}-\d{2}$/)
      }
    }
  })
})
