import {
  ACCESSIBILITY_DEFAULTS,
  applyAccessibilityToDom,
  normalizeAccessibility,
  readStoredAccessibility,
  writeStoredAccessibility,
  type AccessibilityPreferences,
} from '~/utils/accessibility'

/**
 * useAccessibility — ajustes de accesibilidad de plataforma (Fase 3, punto 14).
 *
 * Mismo patrón que `useMenuDisplay`: el valor canónico vive en BD (UserSettings,
 * vía el perfil) y se mantiene una copia local compartida (`useState`) para que
 * el cambio se vea al instante. Además se espeja en localStorage, porque estos
 * ajustes tienen que aplicarse en el arranque —y en las pantallas sin sesión—
 * antes de que el perfil llegue.
 */
export function useAccessibility() {
  const store = useProfileStore()
  const auth = useAuthStore()
  const local = useState<AccessibilityPreferences>('accessibility', () => ({
    ...ACCESSIBILITY_DEFAULTS,
  }))

  /** Aplica al DOM y guarda el espejo local. No toca el backend. */
  const applyLocal = (prefs: AccessibilityPreferences) => {
    local.value = prefs
    applyAccessibilityToDom(prefs)
    writeStoredAccessibility(prefs)
  }

  /**
   * Restaura desde localStorage antes de que el perfil cargue. Idempotente:
   * lo llama el plugin de arranque en cada carga de la aplicación.
   */
  const initAccessibility = () => {
    applyLocal(readStoredAccessibility())
  }

  /**
   * Cambio explícito del usuario: aplica al momento y persiste en BD. Si el
   * guardado falla se revierte lo aplicado, para que la interfaz no se quede
   * mostrando un ajuste que la próxima recarga no va a respetar.
   *
   * En las pantallas públicas no hay a quién guardárselo: el ajuste se aplica y
   * se queda en el navegador, y devuelve `null` para que la interfaz sepa que
   * no hay resultado de guardado del que informar. Cuando ese usuario inicie
   * sesión, manda su perfil.
   */
  const update = async (patch: Partial<AccessibilityPreferences>) => {
    const previous = local.value
    applyLocal({ ...previous, ...patch })

    if (!auth.isAuthenticated) return null

    const result = await store.updatePreferences(patch)
    if (!result.success) applyLocal(previous)

    return result
  }

  /**
   * Sincroniza con el perfil cuando está cargado. `store.profile` es null hasta
   * que la petición termina, así que se observa el perfil real y no el
   * `computed` con valores por defecto (que pisaría lo que hay en local).
   */
  const syncFromProfile = () => {
    watch(
      () => (store.profile ? store.preferences : null),
      preferences => {
        if (!preferences) return
        applyLocal(normalizeAccessibility(preferences))
      },
      { immediate: true }
    )
  }

  return {
    preferences: computed(() => local.value),
    initAccessibility,
    syncFromProfile,
    update,
  }
}
