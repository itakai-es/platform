import { REDUCED_MOTION_QUERY, systemPrefersReducedMotion } from '~/utils/reduced-motion'

/**
 * useReducedMotion — versión reactiva de `prefersReducedMotion()`: sigue al
 * ajuste del usuario (el de `useAccessibility`) y al del sistema, que puede
 * cambiar con la página abierta.
 */
export function useReducedMotion() {
  const { preferences } = useAccessibility()
  const system = ref(systemPrefersReducedMotion())

  let media: MediaQueryList | null = null
  const onChange = (event: MediaQueryListEvent) => {
    system.value = event.matches
  }
  onMounted(() => {
    if (!window.matchMedia) return
    media = window.matchMedia(REDUCED_MOTION_QUERY)
    system.value = media.matches
    media.addEventListener('change', onChange)
  })
  onBeforeUnmount(() => media?.removeEventListener('change', onChange))

  return computed(() => preferences.value.reduceMotion || system.value)
}
