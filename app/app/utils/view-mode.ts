/**
 * Qué vista sale en un listado con varias (cuadrícula, lista, mapa): lo que
 * eligió quien mira (`chosen`), si el listado lo ofrece ahora (`available`).
 * Si no eligió nada, o lo elegido no se ofrece (el mapa, en una clase que lo
 * tiene apagado), sale la de entrada (`initial`) y, si tampoco se ofrece, la
 * primera que haya. Es la decisión de `useViewMode`, aparte para probarla.
 */
export function resolveViewMode<T extends string>(
  chosen: T | null,
  initial: T,
  available: readonly T[]
): T {
  const wanted = chosen ?? initial
  if (available.includes(wanted)) return wanted
  return available.includes(initial) ? initial : (available[0] ?? initial)
}
