<template>
  <TabNavigation
    variant="pills"
    toggle
    :tabs="tabs"
    :active-tab="period"
    :aria-label="t('teacher.analytics.period.label')"
    @tab-change="period = $event as AnalyticsPeriodPreset"
  />
</template>

<script setup lang="ts">
import type { AnalyticsPeriodPreset } from '~/types/analytics.types'

/**
 * El periodo de los paneles de analítica: «Este curso», «Últimos 30 días» y
 * «Últimos 7 días». El mismo en todas las pantallas (`useAnalyticsPeriod`) y
 * con las mismas píldoras que los tipos del ranking o las vistas de Alumnado.
 */
const { t } = useI18n()
const { period, tabs } = useAnalyticsPeriod()
</script>
