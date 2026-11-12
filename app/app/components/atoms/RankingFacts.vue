<template>
  <span v-if="student.level !== undefined">{{ tr('level_abbr') }} {{ student.level }}</span>
  <RankingMetric
    v-if="type === 'xp'"
    :student="student"
    type="missions"
    icon-class="w-3.5 h-3.5"
  />
  <RankingMetric
    v-else-if="student.xp !== undefined"
    :student="student"
    type="xp"
    icon-class="w-3.5 h-3.5"
  />
</template>

<script setup lang="ts">
import type { RankingStudent } from '~/types/ranking.types'

/**
 * Lo que acompaña a la cifra de una persona en el ranking: su nivel y lo que no
 * ordena esta clasificación (las misiones en la de XP; la XP en la de misiones). El
 * nivel y la XP, solo si la clase usa XP: si no, la API no los manda.
 */
defineProps<{
  student: RankingStudent
  type: 'xp' | 'missions'
}>()

const { t } = useI18n()
const tr = (key: string) => t(`student.components.class_ranking_section.${key}`)
</script>
