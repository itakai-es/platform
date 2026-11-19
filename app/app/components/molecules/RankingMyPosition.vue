<template>
  <!-- El puesto de quien mira, en los modos que no enseñan toda la clasificación -->
  <Card type="stats" flex>
    <CardHeader :title="title" :icon="FlagIcon" />

    <CardItem layout="column" centered padding="md" class="justify-center" flex>
      <div v-if="student" class="flex w-full flex-col items-center text-center">
        <Avatar
          :src="student.avatar"
          :name="student.username"
          :color="student.avatarColor"
          :ring-color="student.levelColor"
          size="md"
        />
        <p class="mt-3 max-w-full font-semibold text-navy-700 [overflow-wrap:anywhere]">
          {{ student.username }}
        </p>
        <p v-if="student.rank !== null" class="mt-2 text-3xl font-bold text-navy-700 sm:text-4xl">
          {{ positionText }}
        </p>
        <p v-else class="mt-2 text-sm text-navy-700/80">{{ noRankText }}</p>
        <p class="mt-3 flex flex-wrap items-center justify-center gap-3 text-sm text-navy-700">
          <span v-if="student.rank !== null" class="font-bold"><slot name="metric" /></span>
          <span class="flex flex-wrap items-center justify-center gap-x-3 text-navy-700/80"
            ><slot name="facts"
          /></span>
        </p>
      </div>
      <p v-else class="text-center text-sm text-navy-700/80">{{ previewText }}</p>
    </CardItem>
  </Card>
</template>

<script setup lang="ts">
import { FlagIcon } from '@heroicons/vue/24/outline'
import type { RankingStudent } from '~/types/ranking.types'

/**
 * «Puesto 7 de 25»: una pieza de `ClassRankingSection`. Es lo único que se ve en el
 * modo «solo tu puesto» y va junto al podio en «los N primeros». El puesto, siempre
 * en texto. Sin fila propia (la vista previa del profesorado), una explicación.
 */
const props = defineProps<{
  title: string
  student: RankingStudent | null
  total: number
  /** Qué le falta para tener puesto. */
  noRankText: string
  previewText: string
}>()

const { t } = useI18n()
const { formatNumber } = useNumberFormat()

const positionText = computed(() =>
  t('student.components.class_xp_bar.rank_of', {
    rank: formatNumber(props.student?.rank ?? 0),
    total: formatNumber(props.total),
  })
)
</script>
