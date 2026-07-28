/**
 * useMenuDisplay - Preferencia de usuario para las barras de pestañas superiores
 * (detalle de clase y de misión): icono + texto, solo icono o solo texto.
 *
 * Se persiste **por usuario en BD** (UserSettings, vía el perfil), como el tema.
 * Se mantiene un valor local compartido (`useState`) para respuesta instantánea:
 * al cambiarlo se actualiza al momento y se guarda en el backend; cuando el
 * perfil (canónico) carga o cambia, refleja su valor.
 */
export type MenuDisplay = 'both' | 'icon' | 'text'

export function useMenuDisplay() {
  const store = useProfileStore()
  const local = useState<MenuDisplay>('menu-display', () => 'both')

  // Sincroniza con el valor canónico del perfil cuando está cargado (evita
  // pisar el local con el valor por defecto mientras el perfil aún no llega).
  watch(
    () => (store.profile ? store.preferences.menuDisplay : null),
    value => {
      if (value) local.value = value
    },
    { immediate: true }
  )

  return computed<MenuDisplay>({
    get: () => local.value,
    set: value => {
      local.value = value
      store.updatePreferences({ menuDisplay: value })
    },
  })
}
