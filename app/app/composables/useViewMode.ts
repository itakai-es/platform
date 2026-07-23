/**
 * useViewMode - Preferencia de layout (cuadrícula / lista) para un listado.
 *
 * Cada listado usa una `key` propia, de modo que la elección del usuario se
 * recuerda por separado y persiste entre sesiones en `localStorage`.
 *
 * Se inicializa con el valor por defecto (para que SSR y la primera hidratación
 * coincidan) y se rehidrata desde `localStorage` en `onMounted`, evitando así
 * cualquier desajuste de hidratación.
 *
 * @example
 * const view = useViewMode('teacher-missions')
 * // <ViewToggle v-model="view" />
 * // <CardCollection :view="view"> ... </CardCollection>
 */
export type ViewMode = 'grid' | 'list'

export function useViewMode(key: string, initial: ViewMode = 'grid') {
  const storageKey = `itakai:view:${key}`
  const mode = useState<ViewMode>(`view:${key}`, () => initial)

  onMounted(() => {
    const saved = localStorage.getItem(storageKey)
    if (saved === 'grid' || saved === 'list') mode.value = saved
  })

  watch(mode, value => {
    if (import.meta.client) localStorage.setItem(storageKey, value)
  })

  return mode
}
