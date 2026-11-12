<template>
  <!-- «Tú y tu clase»: en «Mi progreso» y junto al puesto en los modos que recortan -->
  <Card type="stats" :flex="flex">
    <CardHeader :title="t('student.classes.detail.compare.title')" :icon="ScaleIcon" />

    <CardItem layout="column" padding="lg" class="gap-4" :flex="flex">
      <!-- El umbral es de la clase, no de cada cifra: se dice una vez -->
      <p v-if="smallClass" class="text-sm text-navy-700/80">
        {{ t('common.charts.compare.not_enough') }}
      </p>
      <template v-else>
        <p class="text-sm text-navy-700/80">{{ t('student.classes.detail.compare.hint') }}</p>
        <div class="grid grid-cols-[repeat(auto-fit,minmax(min(15rem,100%),1fr))] gap-5">
          <div v-for="meter in meters" :key="meter.key" class="min-w-0">
            <h3 class="mb-2 text-sm font-semibold text-navy-700">{{ meter.title }}</h3>
            <CompareMeter
              :you="meter.value"
              :average="meter.average"
              :band="meter.band"
              :band-only="meter.reason === 'band_only'"
              :max="meter.outOf ?? undefined"
              :format-value="meter.format"
              :icon="meter.icon"
              :avatar="you"
            />
          </div>
        </div>
      </template>
    </CardItem>
  </Card>
</template>

<script setup lang="ts">
import { ScaleIcon } from '@heroicons/vue/24/outline'
import XpIcon from '~/components/atoms/XpIcon.vue'
import type { AnonymousComparison, ComparisonMetricKey } from '~/types/analytics.types'
import type { TeamColor } from '~/types/team.types'

/**
 * La comparación anónima con el resto de la clase. No calcula nada: la cifra
 * redondeada, la banda y lo que no se puede dar llegan hechos de la API, que es
 * donde se garantiza la anonimidad.
 */
const props = defineProps<{
  comparison: AnonymousComparison
  /** Estirarse en una rejilla, junto a otra tarjeta (como `Card`). */
  flex?: boolean
  /** Su avatar, que marca su sitio en cada pista (el suyo: nada de nadie más). */
  you?: {
    src?: string | null
    name?: string | null
    seed?: string | null
    color?: TeamColor | null
  } | null
}>()

const { t } = useI18n()
const { formatNumber } = useNumberFormat()

const smallClass = computed(() => props.comparison.metrics.some(m => m.reason === 'small_class'))

const titles = computed<Record<ComparisonMetricKey, string>>(() => ({
  xp: t('common.resources.xp'),
  missions: t('student.classes.detail.progress.missions_completed'),
  season_missions: t('student.classes.detail.compare.season_missions'),
}))

const meters = computed(() =>
  props.comparison.metrics.map(metric => ({
    ...metric,
    title: titles.value[metric.key],
    icon: metric.key === 'xp' ? XpIcon : undefined,
    // «4 de 7»; la XP nunca «sobre un máximo».
    format:
      metric.outOf === null
        ? formatNumber
        : (value: number) =>
            t('common.charts.value_of_total', {
              value: formatNumber(value),
              total: formatNumber(metric.outOf!),
            }),
  }))
)
</script>
