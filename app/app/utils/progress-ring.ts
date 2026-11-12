/**
 * La geometría del anillo de progreso (`ProgressRing`), sin Vue, para probarla en
 * Node (`tests/progress-ring.test.mjs`).
 *
 * El anillo se dibuja en un `viewBox` de 100 × 100 que se estira al tamaño de su
 * caja (en `rem`): con la letra grande crece con el texto que lleva dentro. El
 * arco se mide con `pathLength="100"`, así que lo lleno es un porcentaje y no hace
 * falta la circunferencia.
 */

/** El lado del `viewBox` del anillo. */
export const RING_BOX = 100

/** Un número entre `min` y `max`; lo que no es un número, `min`. */
function clamp(value: number, min: number, max: number): number {
  return Number.isFinite(value) ? Math.min(max, Math.max(min, value)) : min
}

/**
 * El radio del círculo para un trazo de `stroke` unidades (de 1 a 40): el trazo
 * entero cabe en la caja, sin recortarse por fuera.
 */
export function ringRadius(stroke: number): number {
  return RING_BOX / 2 - clamp(stroke, 1, 40) / 2
}

/**
 * La parte llena de 0 a 1: `done` de `total`. Sin total, 0; nunca más de 1. Es el
 * anillo de los medallones del mapa (cuántas personas han completado la misión) y
 * el de los enigmas aprobados de una misión.
 */
export function ringFraction(done = 0, total = 0): number {
  if (total <= 0) return 0
  return clamp(done / total, 0, 1)
}

/** La parte llena de 0 a 1 a partir de un porcentaje (0-100). */
export function percentFraction(percent: number | null | undefined): number {
  return clamp((percent ?? 0) / 100, 0, 1)
}

/**
 * El `stroke-dashoffset` del arco (con `pathLength="100"` y `stroke-dasharray="100
 * 100"`): lo que queda sin pintar. 0 es el anillo lleno; 100, vacío.
 */
export function ringDashOffset(fraction: number): number {
  return Math.round((1 - clamp(fraction, 0, 1)) * 10000) / 100
}

/**
 * El grosor en unidades del `viewBox` de un trazo de `px` píxeles en un anillo de
 * `size` píxeles: para los que tienen un tamaño fijo en píxeles (los medallones
 * del mapa), que quieren un trazo de grosor exacto.
 */
export function ringStrokeFor(px: number, size: number): number {
  if (!(size > 0)) return 0
  return Math.round(((px * RING_BOX) / size) * 1000) / 1000
}
