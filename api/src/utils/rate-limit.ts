import { RateLimitError } from './errors.js'

/**
 * Límite de peticiones por clave, en memoria del proceso. Sirve para lo que se
 * puede pedir en bucle sin coste para quien lo pide (proponer un usuario libre,
 * por ejemplo): no es una defensa contra un ataque distribuido, es evitar que
 * una pantalla o un script se lleven por delante la instancia.
 *
 * Al ser en memoria, cada proceso lleva su propia cuenta y reiniciar la borra.
 */

interface Bucket {
  count: number
  resetAt: number
}

const buckets = new Map<string, Bucket>()

/** Cada diez minutos se olvidan las claves cuya ventana ya pasó. */
const cleanup = setInterval(
  () => {
    const now = Date.now()
    for (const [key, bucket] of buckets) {
      if (bucket.resetAt <= now) buckets.delete(key)
    }
  },
  10 * 60 * 1000
)
// No es motivo para mantener el proceso vivo.
cleanup.unref?.()

export interface RateLimitOptions {
  /** Peticiones permitidas en la ventana. */
  max: number
  /** Duración de la ventana, en milisegundos. */
  windowMs: number
}

/**
 * Apunta una petición para `key` y lanza `RateLimitError` si ya se pasó del
 * límite. La clave la compone quien llama: normalmente la ruta y quién la pide.
 *
 * `cost` es lo que gasta la petición: una que hace varias cosas de una vez (dar
 * de alta una lista, por ejemplo) cuenta por todas, y se rechaza entera si no
 * cabe en lo que queda de la ventana.
 */
export function consumeRateLimit(key: string, options: RateLimitOptions, cost = 1): void {
  assertRateLimit(key, options, cost)
  recordRateLimit(key, options, cost)
}

/**
 * Comprueba el límite sin apuntar nada. Va con `recordRateLimit` cuando solo
 * cuentan los intentos fallidos: se comprueba antes de intentarlo y se apunta
 * solo si sale mal, así que a quien acierta no le gasta cupo.
 */
export function assertRateLimit(key: string, options: RateLimitOptions, cost = 1): void {
  const bucket = buckets.get(key)
  const live = bucket && bucket.resetAt > Date.now() ? bucket : null
  if ((live?.count ?? 0) + cost <= options.max) return

  const waitMs = live ? live.resetAt - Date.now() : options.windowMs
  const seconds = Math.ceil(waitMs / 1000)
  throw new RateLimitError(`Demasiadas peticiones. Inténtalo de nuevo en ${seconds} s.`)
}

/** Apunta una petición sin comprobar el límite: lo comprueba `assertRateLimit`. */
export function recordRateLimit(key: string, options: RateLimitOptions, cost = 1): void {
  const now = Date.now()
  const bucket = buckets.get(key)

  if (!bucket || bucket.resetAt <= now) {
    buckets.set(key, { count: cost, resetAt: now + options.windowMs })
    return
  }

  bucket.count += cost
}

/**
 * Devuelve cupo apuntado de más: lo que se apartó con `consumeRateLimit` para
 * algo que al final no se hizo. Nunca deja la cuenta por debajo de cero.
 */
export function releaseRateLimit(key: string, cost = 1): void {
  const bucket = buckets.get(key)
  if (!bucket || bucket.resetAt <= Date.now() || cost <= 0) return
  bucket.count = Math.max(0, bucket.count - cost)
}

/** Olvida lo apuntado. Solo para los tests. */
export function resetRateLimits(): void {
  buckets.clear()
}
