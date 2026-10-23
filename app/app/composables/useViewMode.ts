/**
 * useViewMode - Preferencia de presentación (cuadrícula / lista / mapa) de un
 * listado.
 *
 * Cada listado usa una `key` propia, de modo que la elección del usuario se
 * recuerda por separado y persiste entre sesiones en `localStorage`.
 *
 * Mientras no se elige nada, sale `initial`, que puede depender de la pantalla
 * (el alumnado ve el mapa de entrada si la clase lo tiene). Si lo elegido no
 * está entre los modos que ofrece ahora el listado (`available`: el mapa solo
 * existe en las clases que lo tienen encendido), sale `initial` o, si tampoco,
 * el primero que se ofrezca; lo elegido se recuerda igual para cuando vuelva.
 *
 * Se lee de `localStorage` en `onMounted`, envuelto en try/catch: sin acceso al
 * almacenamiento (modo privado, bloqueado) se usa lo de entrada sin más.
 *
 * @example
 * const view = useViewMode('teacher-missions')
 * // <ViewToggle v-model="view" />
 * // <CardCollection :view="view"> ... </CardCollection>
 */
import type { MaybeRefOrGetter } from 'vue'
import { resolveViewMode } from '~/utils/view-mode'

/** El mapa solo lo ofrecen los listados de misiones de una clase que lo tiene encendido. */
export type ViewMode = 'grid' | 'list' | 'map'

const VIEW_MODES: readonly ViewMode[] = ['grid', 'list', 'map']

function isViewMode(value: unknown): value is ViewMode {
  return typeof value === 'string' && (VIEW_MODES as readonly string[]).includes(value)
}

export function useViewMode(
  key: string,
  initial: MaybeRefOrGetter<ViewMode> = 'grid',
  available: MaybeRefOrGetter<ViewMode[]> = ['grid', 'list']
) {
  const storageKey = `itakai:view:${key}`
  /** Lo que ha elegido quien mira; null mientras no elija nada. */
  const chosen = useState<ViewMode | null>(`view:${key}`, () => null)

  onMounted(() => {
    try {
      const saved = localStorage.getItem(storageKey)
      if (isViewMode(saved)) chosen.value = saved
    } catch {
      // Sin almacenamiento: se queda lo de entrada.
    }
  })

  return computed<ViewMode>({
    get() {
      return resolveViewMode(chosen.value, toValue(initial), toValue(available))
    },
    set(value) {
      chosen.value = value
      if (!import.meta.client) return
      try {
        localStorage.setItem(storageKey, value)
      } catch {
        // Sin almacenamiento: vale para esta visita.
      }
    },
  })
}
