import type { InjectionKey } from 'vue'

/**
 * Dónde se teletransportan los menús desplegables y los tooltips.
 *
 * Fuera de un diálogo van a `<body>`. Dentro de un `Modal` con `aria-modal`,
 * lo que cuelgue fuera del diálogo queda inerte para los lectores de pantalla,
 * así que el modal ofrece su propia capa (un selector CSS) dentro del diálogo.
 */
export const OVERLAY_LAYER_KEY: InjectionKey<string> = Symbol('overlay-layer')

export function useOverlayTarget() {
  return inject(OVERLAY_LAYER_KEY, 'body')
}
