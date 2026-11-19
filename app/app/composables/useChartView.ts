import type { InjectionKey } from 'vue'
import { chartViewStorageKey, parseChartView, type ChartView } from '~/utils/chart-view'

/**
 * useChartView — cómo se ve un gráfico: como gráfico o como tabla («Ver como
 * tabla» en `ChartFigure`).
 *
 * Es **de cada gráfico**: al pulsarlo en una sección solo cambia esa. Con un id
 * estable (`chartId`), la elección se comparte entre las veces que sale ese
 * gráfico en la visita (`useState`) y se recuerda para la próxima en
 * `localStorage`, con una clave por gráfico (`chartViewStorageKey`). Es solo una
 * comodidad: sin almacenamiento (modo privado, bloqueado) vale para esta visita;
 * sin id, para ese gráfico mientras está en la pantalla. La tabla está siempre en
 * la página para el lector de pantalla, se vea o no.
 *
 * Sigue el patrón de `useViewMode`: lectura en `onMounted`, envuelta en try/catch.
 */
export function useChartView(chartId?: string | null) {
  const storageKey = chartViewStorageKey(chartId)
  const chosen = storageKey
    ? useState<ChartView>(`view:chart:${chartId}`, () => 'chart')
    : ref<ChartView>('chart')

  onMounted(() => {
    if (!storageKey) return
    try {
      const saved = parseChartView(localStorage.getItem(storageKey))
      if (saved) chosen.value = saved
    } catch {
      // Sin almacenamiento: se queda lo que hay.
    }
  })

  return computed<ChartView>({
    get: () => chosen.value,
    set(value) {
      chosen.value = value
      if (!storageKey || !import.meta.client) return
      try {
        localStorage.setItem(storageKey, value)
      } catch {
        // Sin almacenamiento: vale para esta visita.
      }
    },
  })
}

/**
 * Dentro de un `ChartFigure` el dibujo va oculto al lector de pantalla
 * (`aria-hidden`), porque lo cuenta la tabla. Las piezas de gráfico lo
 * preguntan con `useChartDecorative()` para no dejar nada enfocable ahí dentro:
 * sus enlaces siguen funcionando con el ratón, y con el teclado se llega a los
 * mismos desde la tabla.
 */
export const CHART_DECORATIVE: InjectionKey<boolean> = Symbol('chart-decorative')

export function useChartDecorative(): boolean {
  return inject(CHART_DECORATIVE, false)
}
