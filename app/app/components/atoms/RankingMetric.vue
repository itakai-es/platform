<template>
  <span class="inline-flex items-center gap-1">
    <template v-if="type === 'xp'">
      <Tooltip :text="t('common.resources.xp')"><XpIcon :class="iconClass" /></Tooltip
      >{{ formatNumber(student.xp ?? 0) }}
      <span class="sr-only">{{ t('common.resources.xp') }}</span>
    </template>
    <template v-else-if="period === 'all'">
      <RocketLaunchIcon :class="iconClass" aria-hidden="true" />
      {{ student.missionsCompleted }}/{{ student.missionsTotal }}
      <span class="sr-only">{{ tr('missions_suffix') }}</span>
    </template>
    <template v-else>
      <RocketLaunchIcon :class="iconClass" aria-hidden="true" />
      <span aria-hidden="true">{{ formatNumber(student.score) }}</span>
      <span class="sr-only">{{ tr('missions_count', { count: student.score }, student.score) }}</span>
    </template>
  </span>
</template>

<script setup lang="ts">
import { RocketLaunchIcon } from '@heroicons/vue/24/outline'
import type { RankingStudent } from '~/types/ranking.types'
import type { RankingPeriod } from '~/utils/ranking-config'

/**
 * Una cifra de una persona en el ranking, con su icono: su XP o sus misiones («4/8»
 * en «Siempre»; en un periodo, las de ese periodo, sin total). Siempre con su
 * nombre para el lector de pantalla.
 */
withDefaults(
  defineProps<{
    student: RankingStudent
    type: 'xp' | 'missions'
    period?: RankingPeriod
    iconClass?: string
  }>(),
  { period: 'all', iconClass: 'w-4 h-4' }
)

const { t } = useI18n()
const { formatNumber } = useNumberFormat()
const tr = (key: string, params: Record<string, unknown> = {}, plural?: number) =>
  plural === undefined
    ? t(`student.components.class_ranking_section.${key}`, params)
    : t(`student.components.class_ranking_section.${key}`, params, plural)
</script>
