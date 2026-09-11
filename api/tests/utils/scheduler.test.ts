import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { registerJob, runJobNow, startScheduler, stopScheduler } from '../../src/utils/scheduler.js'

/**
 * Tests del planificador (Fase 3, punto 3).
 *
 * Lo que tiene que quedar garantizado, porque de ello dependen los recordatorios
 * de entrega y, más adelante, la purga de la papelera y los avisos de asistencia:
 *  - una pasada lenta NO se solapa con la siguiente (el fallo clásico de los
 *    cron caseros: dos ejecuciones creando el mismo aviso a la vez),
 *  - un fallo puntual no deja la tarea muerta hasta el siguiente reinicio,
 *  - los errores se registran en vez de escaparse como rechazo sin capturar.
 */

const silentLogger = { info: vi.fn(), error: vi.fn() }

beforeEach(() => {
  vi.useFakeTimers()
  silentLogger.info.mockClear()
  silentLogger.error.mockClear()
})

afterEach(() => {
  stopScheduler()
  vi.useRealTimers()
})

describe('scheduler', () => {
  it('ejecuta una tarea registrada bajo demanda', async () => {
    const run = vi.fn().mockResolvedValue({ created: 2 })
    registerJob({ name: 'test-bajo-demanda', everyMs: 1000, run })

    const result = await runJobNow('test-bajo-demanda')

    expect(run).toHaveBeenCalledTimes(1)
    expect(result).toEqual({ created: 2 })
  })

  it('pasa la hora de la pasada a la tarea', async () => {
    const run = vi.fn().mockResolvedValue(undefined)
    registerJob({ name: 'test-contexto', everyMs: 1000, run })

    await runJobNow('test-contexto')

    expect(run.mock.calls[0][0].now).toBeInstanceOf(Date)
  })

  it('falla claro si la tarea no existe', async () => {
    await expect(runJobNow('no-existe')).rejects.toThrow('Tarea desconocida: no-existe')
  })

  it('no arranca una pasada mientras la anterior sigue en marcha', async () => {
    let enCurso = 0
    let maxSimultaneas = 0
    let terminar: () => void = () => {}

    registerJob({
      name: 'test-lenta',
      everyMs: 100,
      firstRunDelayMs: 10,
      run: async () => {
        enCurso += 1
        maxSimultaneas = Math.max(maxSimultaneas, enCurso)
        await new Promise<void>(resolve => {
          terminar = () => {
            enCurso -= 1
            resolve()
          }
        })
      },
    })

    startScheduler(silentLogger)

    // Arranca la primera pasada y se deja colgada.
    await vi.advanceTimersByTimeAsync(10)
    expect(enCurso).toBe(1)

    // Pasa mucho más tiempo que el periodo: no puede haber una segunda pasada.
    await vi.advanceTimersByTimeAsync(500)
    expect(maxSimultaneas).toBe(1)

    terminar()
    await vi.advanceTimersByTimeAsync(0)
  })

  it('se reprograma después de una pasada que falla', async () => {
    const run = vi
      .fn()
      .mockRejectedValueOnce(new Error('boom'))
      .mockResolvedValue({ created: 1 })

    registerJob({ name: 'test-fallo', everyMs: 50, firstRunDelayMs: 10, run })
    startScheduler(silentLogger)

    await vi.advanceTimersByTimeAsync(10)
    expect(run).toHaveBeenCalledTimes(1)
    expect(silentLogger.error).toHaveBeenCalledTimes(1)

    // La segunda pasada llega igualmente: el fallo no mata la tarea.
    await vi.advanceTimersByTimeAsync(50)
    expect(run).toHaveBeenCalledTimes(2)
  })

  it('deja de programar pasadas al pararlo', async () => {
    const run = vi.fn().mockResolvedValue(undefined)
    registerJob({ name: 'test-parada', everyMs: 20, firstRunDelayMs: 10, run })

    startScheduler(silentLogger)
    await vi.advanceTimersByTimeAsync(10)
    expect(run).toHaveBeenCalledTimes(1)

    stopScheduler()
    await vi.advanceTimersByTimeAsync(200)
    expect(run).toHaveBeenCalledTimes(1)
  })

  it('solo registra en el log las pasadas que hicieron algo', async () => {
    registerJob({
      name: 'test-silencio',
      everyMs: 1000,
      firstRunDelayMs: 5,
      run: async () => ({ created: 0, skipped: 0 }),
    })
    startScheduler(silentLogger)
    silentLogger.info.mockClear()

    await vi.advanceTimersByTimeAsync(5)

    expect(silentLogger.info).not.toHaveBeenCalled()
  })
})
