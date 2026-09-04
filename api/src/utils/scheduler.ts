/**
 * Planificador de tareas periódicas (Fase 3, punto 3).
 *
 * Infraestructura compartida, no un apaño para los recordatorios: la usan los
 * avisos de entrega, la limpieza de notificaciones y, cuando existan, la purga
 * a 30 días de la papelera de clases y los avisos de asistencia. Por eso vive
 * en `utils/` y no dentro del módulo de notificaciones.
 *
 * Decisiones:
 *  - Encadena `setTimeout` en vez de usar `setInterval`: una ejecución lenta
 *    nunca se solapa con la siguiente, que es el fallo clásico de los cron
 *    caseros (dos pasadas creando la misma notificación a la vez).
 *  - Los timers van con `unref()`, así los tests y los scripts de CLI terminan
 *    sin tener que apagar nada a mano.
 *  - Las tareas tienen que ser **idempotentes**: el proceso se reinicia sin
 *    memoria de lo ya hecho, así que cada una comprueba su propio estado (los
 *    avisos, por ejemplo, se deduplican por clave en la notificación).
 */

export interface JobContext {
  /** Momento en que arrancó esta pasada, para que la tarea no llame a `new Date()` varias veces. */
  now: Date
}

export interface JobResult {
  /** Resumen corto para el log: `{ created: 3, skipped: 12 }`. */
  [metric: string]: number
}

export interface ScheduledJob {
  /** Identificador corto y estable; sale en los logs. */
  name: string
  /** Periodo entre ejecuciones, en milisegundos. */
  everyMs: number
  /** Espera antes de la primera pasada. Por defecto, 30 s tras arrancar. */
  firstRunDelayMs?: number
  run: (ctx: JobContext) => Promise<JobResult | void>
}

export interface SchedulerLogger {
  info: (obj: Record<string, unknown>, msg: string) => void
  error: (obj: Record<string, unknown>, msg: string) => void
}

const DEFAULT_FIRST_RUN_DELAY_MS = 30_000

const jobs = new Map<string, ScheduledJob>()
const timers = new Map<string, NodeJS.Timeout>()
let running = false
let logger: SchedulerLogger = {
  info: (obj, msg) => console.log(`[scheduler] ${msg}`, obj),
  error: (obj, msg) => console.error(`[scheduler] ${msg}`, obj),
}

/** Registra una tarea. Repetir el mismo nombre sustituye a la anterior. */
export function registerJob(job: ScheduledJob) {
  jobs.set(job.name, job)
}

/** Ejecuta una tarea ya registrada, ahora y una sola vez (tests y depuración). */
export async function runJobNow(name: string): Promise<JobResult | void> {
  const job = jobs.get(name)
  if (!job) throw new Error(`Tarea desconocida: ${name}`)
  return job.run({ now: new Date() })
}

async function executeAndReschedule(job: ScheduledJob) {
  const startedAt = Date.now()
  try {
    const result = await job.run({ now: new Date() })
    const tookMs = Date.now() - startedAt
    // Solo se registra la pasada que hizo algo: si no, el log se llena de ruido
    // cada pocos minutos y deja de ser útil para ver qué pasó.
    const didSomething = result && Object.values(result).some(value => value > 0)
    if (didSomething) {
      logger.info({ job: job.name, tookMs, ...result }, `tarea "${job.name}" completada`)
    }
  } catch (error) {
    logger.error(
      { job: job.name, err: error instanceof Error ? error.message : String(error) },
      `tarea "${job.name}" ha fallado`
    )
  } finally {
    // Se reprograma pase lo que pase: un fallo puntual no puede dejar la tarea
    // muerta hasta el siguiente reinicio del servidor.
    if (running) schedule(job, job.everyMs)
  }
}

function schedule(job: ScheduledJob, delayMs: number) {
  const timer = setTimeout(() => {
    void executeAndReschedule(job)
  }, delayMs)
  timer.unref()
  timers.set(job.name, timer)
}

/**
 * Arranca todas las tareas registradas. Idempotente: llamarlo dos veces no
 * duplica los timers.
 */
export function startScheduler(customLogger?: SchedulerLogger) {
  if (running) return
  if (customLogger) logger = customLogger

  running = true
  for (const job of jobs.values()) {
    schedule(job, job.firstRunDelayMs ?? DEFAULT_FIRST_RUN_DELAY_MS)
  }

  logger.info({ jobs: [...jobs.keys()] }, `planificador arrancado con ${jobs.size} tarea(s)`)
}

/** Para todas las tareas. Se usa al apagar el servidor y en los tests. */
export function stopScheduler() {
  running = false
  for (const timer of timers.values()) clearTimeout(timer)
  timers.clear()
}
