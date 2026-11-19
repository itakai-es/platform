import { ANALYTICS_PERIOD_PRESETS, type AnalyticsPeriodPreset } from '~/types/analytics.types'

/** Cómo va cada periodo en la URL (`?periodo=7-dias`). «Este curso», el de por defecto, sin nada. */
const PERIOD_IN_URL: Record<AnalyticsPeriodPreset, string> = {
  course: 'curso',
  last30: '30-dias',
  last7: '7-dias',
}
const DEFAULT_PERIOD: AnalyticsPeriodPreset = 'course'

/**
 * El periodo que se mira en los paneles de analítica del profesorado, el mismo
 * en el panel de la clase y en la página de cada estudiante: al entrar en una
 * persona y volver no se pierde. «Este curso» por defecto (decisión 10 del plan).
 *
 * Va en la URL (`?periodo=`), como la vista de Alumnado (`?vista=`): atrás y
 * recargar lo conservan. La URL manda; si no lo trae, el último elegido. Las
 * pantallas que lo usan (`syncUrl`) lo escriben en su URL al abrirse, para que
 * al llegar a ellas desde un enlace sin periodo se quede también al recargar.
 */
export function useAnalyticsPeriod(options: { syncUrl?: boolean } = {}) {
  const { t } = useI18n()
  const route = useRoute()
  const router = useRouter()
  const chosen = useState<AnalyticsPeriodPreset>('analytics:period', () => DEFAULT_PERIOD)

  const fromUrl = computed(
    () =>
      ANALYTICS_PERIOD_PRESETS.find(value => PERIOD_IN_URL[value] === route.query.periodo) ?? null
  )

  function writeUrl(value: AnalyticsPeriodPreset) {
    const wanted = value === DEFAULT_PERIOD ? undefined : PERIOD_IN_URL[value]
    if (route.query.periodo === wanted) return
    const query = { ...route.query }
    if (wanted) query.periodo = wanted
    else delete query.periodo
    void router.replace({ query })
  }

  const period = computed<AnalyticsPeriodPreset>({
    get: () => fromUrl.value ?? chosen.value,
    set: value => {
      chosen.value = value
      writeUrl(value)
    },
  })

  if (options.syncUrl) {
    // Atrás a una URL con otro periodo: ese pasa a ser el elegido.
    watch(fromUrl, value => {
      if (value) chosen.value = value
    })
    onMounted(() => {
      if (fromUrl.value) chosen.value = fromUrl.value
      else if (chosen.value !== DEFAULT_PERIOD) writeUrl(chosen.value)
    })
  }

  const tabs = computed(() =>
    ANALYTICS_PERIOD_PRESETS.map(value => ({
      id: value,
      label: t(`teacher.analytics.period.${value}`),
    }))
  )
  return { period, tabs }
}
