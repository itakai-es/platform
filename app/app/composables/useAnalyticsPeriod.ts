import { ANALYTICS_PERIOD_PRESETS, type AnalyticsPeriodPreset } from '~/types/analytics.types'

/**
 * El periodo que se mira en los paneles de analítica del profesorado, el mismo
 * en el panel de la clase y en la página de cada estudiante: al entrar en una
 * persona y volver no se pierde. «Este curso» por defecto (decisión 10 del plan).
 */
export function useAnalyticsPeriod() {
  const { t } = useI18n()
  const period = useState<AnalyticsPeriodPreset>('analytics:period', () => 'course')
  const options = computed(() =>
    ANALYTICS_PERIOD_PRESETS.map(value => ({
      value,
      label: t(`teacher.analytics.period.${value}`),
    }))
  )
  return { period, options }
}
