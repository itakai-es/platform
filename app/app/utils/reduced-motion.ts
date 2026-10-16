/**
 * Menos movimiento: el ajuste del usuario (Accesibilidad → «Menos animación»,
 * que se escribe como `data-reduce-motion` en `<html>`) **o** el del sistema
 * (`prefers-reduced-motion`).
 *
 * La hoja de accesibilidad ya frena las animaciones y transiciones CSS, pero lo
 * que se dibuja por JS (confeti, la ruleta) tiene que preguntarlo aquí: si no,
 * se salta los dos ajustes.
 */

export const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)'

/** ¿Pide el sistema menos movimiento? */
export function systemPrefersReducedMotion(): boolean {
  if (typeof window === 'undefined' || !window.matchMedia) return false
  return window.matchMedia(REDUCED_MOTION_QUERY).matches
}

/** ¿Ha pedido el usuario «Menos animación» en sus ajustes de accesibilidad? */
export function userPrefersReducedMotion(): boolean {
  if (typeof document === 'undefined') return false
  return document.documentElement.getAttribute('data-reduce-motion') === 'true'
}

/** Lectura puntual, para quien dispara un efecto en un momento dado. */
export function prefersReducedMotion(): boolean {
  return userPrefersReducedMotion() || systemPrefersReducedMotion()
}
