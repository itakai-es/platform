import { randomInt } from 'node:crypto'

/**
 * Barajar y repartir al azar, con el azar criptográfico de Node (`randomInt`,
 * uniforme y sin el sesgo de `Math.random`). Lo usa el reparto de equipos al
 * azar; el resultado lo ve el profesorado antes de guardar nada.
 */

/** Copia barajada de `items` (Fisher-Yates). */
export function shuffled<T>(items: readonly T[], random: (n: number) => number = randomInt): T[] {
  const out = [...items]
  for (let i = out.length - 1; i > 0; i--) {
    const j = random(i + 1)
    ;[out[i], out[j]] = [out[j]!, out[i]!]
  }
  return out
}

/**
 * Reparte `items` en `groups` grupos tan iguales como se pueda (como mucho uno
 * de diferencia). Con `level`, equilibra: baraja, ordena de más a menos nivel
 * (a igual nivel, el orden barajado) y reparte en serpiente (1, 2, 3, 3, 2, 1…),
 * así cada grupo recibe una mezcla parecida. Sin él, baraja y reparte por turnos.
 */
export function deal<T>(
  items: readonly T[],
  groups: number,
  opts: { level?: (item: T) => number; random?: (n: number) => number } = {}
): T[][] {
  const count = Math.max(1, Math.floor(groups))
  const out: T[][] = Array.from({ length: count }, () => [])
  let order = shuffled(items, opts.random)
  if (opts.level) {
    const level = opts.level
    // `sort` es estable: a igual nivel se queda el orden barajado.
    order = order.sort((a, b) => level(b) - level(a))
  }
  order.forEach((item, i) => {
    const round = Math.floor(i / count)
    const pos = i % count
    out[opts.level && round % 2 === 1 ? count - 1 - pos : pos]!.push(item)
  })
  return out
}
