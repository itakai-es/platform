<template>
  <OptionPillGroup
    v-model="period"
    :options="options"
    :aria-label="t('teacher.analytics.period.label')"
  />
</template>

<script setup lang="ts">
/**
 * El periodo de los paneles de analítica: «Este curso», «Últimos 30 días» y
 * «Últimos 7 días». El mismo en todas las pantallas (`useAnalyticsPeriod`).
 */
const { t } = useI18n()
const { period, options } = useAnalyticsPeriod()
</script>
