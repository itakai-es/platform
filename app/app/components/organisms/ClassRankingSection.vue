<template>
  <div class="space-y-6">
    <!-- Podio (salvo en «solo tu puesto», donde la API no lo manda) y a su lado: al
         profesorado, las medias de la clase; al alumnado, «Tú y tu clase» (la misma
         comparación que en su Resumen, si la clase la tiene encendida) y, en los
         modos que recortan, también su puesto. -->
    <div :class="['grid grid-cols-1 gap-4 xl:gap-6', twoColumns ? 'xl:grid-cols-2' : '']">
      <RankingPodium
        v-if="mode !== 'position'"
        :entries="podium"
        :empty-text="podiumEmptyText"
        :student-link="studentLink"
        :highlight-you="showCurrentUserHighlight"
      >
        <template #metric="{ student }">
          <RankingMetric :student="student" :type="type" :period="period" />
        </template>
        <template #facts="{ student }">
          <RankingFacts :student="student" :type="type" />
        </template>
      </RankingPodium>

      <RankingStats v-if="statItems.length > 0" :title="tr('stats_title')" :items="statItems" />
      <!-- En `position`, las dos tarjetas son las dos columnas; en `top`, una columna -->
      <div
        v-else-if="mode !== 'full'"
        :class="mode === 'top' ? 'flex flex-col gap-4 xl:gap-6' : 'contents'"
      >
        <RankingMyPosition
          :title="tr('my_position_title')"
          :student="me"
          :total="rankingData.total"
          :no-rank-text="noRankText"
          :preview-text="tr('my_position_preview')"
        >
          <template #metric>
            <RankingMetric v-if="me" :student="me" :type="type" :period="period" />
          </template>
          <template #facts>
            <RankingFacts v-if="me" :student="me" :type="type" />
          </template>
        </RankingMyPosition>
        <ClassCompareCard
          v-if="comparison"
          :comparison="comparison"
          :flex="mode === 'position'"
          :you="compareAvatar"
        />
      </div>
      <ClassCompareCard
        v-else-if="comparison"
        :comparison="comparison"
        flex
        :you="compareAvatar"
      />
    </div>

    <RankingList
      v-if="mode !== 'position'"
      :title="listTitle"
      :no-score-title="noScoreTitle"
      :entries="leaderboard"
      :student-link="studentLink"
      :highlight-you="showCurrentUserHighlight"
    >
      <template #metric="{ student }">
        <RankingMetric :student="student" :type="type" :period="period" />
      </template>
      <template #facts="{ student }">
        <RankingFacts :student="student" :type="type" />
      </template>
    </RankingList>
  </div>
</template>

<script setup lang="ts">
import type { ClassRanking } from '~/types/ranking.types'

/**
 * Una clasificación individual (XP o misiones), según lo que deja ver la clase. La
 * API ya manda solo lo que se puede enseñar; aquí se compone con sus piezas:
 * `RankingPodium`, `RankingList`, `RankingStats`, `RankingMyPosition` y, en los modos
 * que recortan, «Tú y tu clase» (`ClassCompareCard`).
 */
const props = withDefaults(
  defineProps<{
    rankingData: ClassRanking
    /**
     * Adónde lleva cada estudiante (su página, en la vista del profesorado). Con
     * él, el podio y la lista son enlaces de verdad, que se alcanzan con el teclado.
     */
    studentLink?: (studentId: string) => string
    /** Marcar «Tú» en la fila de quien mira (la vista del alumnado). */
    showCurrentUserHighlight?: boolean
  }>(),
  { studentLink: undefined, showCurrentUserHighlight: true }
)

const { t } = useI18n()
const { formatNumber, formatCompactNumber, formatPercent } = useNumberFormat()
const tr = (key: string, params: Record<string, unknown> = {}) =>
  t(`student.components.class_ranking_section.${key}`, params)

const type = computed(() => props.rankingData.type)
const period = computed(() => props.rankingData.period)
/** Lo que deja ver la clase. El profesorado, siempre todo. */
const mode = computed(() => props.rankingData.options.mode ?? 'full')
const me = computed(() => props.rankingData.me ?? null)

const podium = computed(() => props.rankingData.podium ?? [])
const leaderboard = computed(() => props.rankingData.leaderboard ?? [])

/** La vista del profesorado: solo a él le dice la API qué ve su alumnado. */
const forTeacher = computed(() => !!props.rankingData.options.audience)

/**
 * Las medias de la clase: solo al profesorado y solo en la clasificación completa
 * de «Siempre». La XP, si la clase la usa y llega (no llega con el tipo XP apagado).
 * El alumnado no las ve en ningún modo: su media es la de «Tú y tu clase» (la del
 * resto de la clase, redondeada), la misma que en su Resumen, y no dos distintas.
 */
const statItems = computed(() => {
  const s = props.rankingData.stats
  if (!s || !forTeacher.value) return []
  const usesXp = props.rankingData.options.usesXp
  return [
    ...(usesXp && typeof s.avgXp === 'number'
      ? [{ key: 'avg_xp', value: formatNumber(s.avgXp), label: tr('avg_xp') }]
      : []),
    ...(s.avgProgress === undefined
      ? []
      : [
          {
            key: 'avg_progress',
            value: s.avgProgress === null ? '—' : formatPercent(s.avgProgress),
            label: tr('avg_progress'),
          },
        ]),
    {
      key: 'avg_missions',
      value: t('common.charts.value_of_total', {
        value: formatNumber(s.avgMissions ?? 0),
        total: formatNumber(s.missionsTotal),
      }),
      label: tr('avg_missions'),
    },
    // Solo la manda al profesorado: al alumnado, la suma le diría lo de los demás.
    ...(usesXp && typeof s.totalXp === 'number'
      ? [
          {
            key: 'total_xp',
            // Con un espacio normal: «3,4 mil» puede saltar de línea si no cabe.
            value: formatCompactNumber(s.totalXp).replace(/\u00a0/g, ' '),
            label: tr('total_xp'),
          },
        ]
      : []),
  ]
})

/**
 * «Tú y tu clase», si la API la manda (en cualquier modo; null con la comparación
 * apagada) y hay algo que comparar. Solo al alumnado.
 */
const comparison = computed(() => {
  const value = props.rankingData.comparison
  return !forTeacher.value && value && value.metrics.length > 0 ? value : null
})

/** Su avatar, que marca su sitio en cada pista de «Tú y tu clase». */
const compareAvatar = computed(() =>
  me.value ? { src: me.value.avatar, name: me.value.username, color: me.value.avatarColor } : null
)

const twoColumns = computed(() =>
  mode.value === 'position'
    ? comparison.value !== null
    : statItems.value.length > 0 || mode.value === 'top' || comparison.value !== null
)

/** El sufijo de lo que depende del periodo (`_week`); nada en «Siempre». */
const periodSuffix = computed(() => (period.value === 'all' ? '' : `_${period.value}`))

const podiumEmptyText = computed(() =>
  type.value === 'xp' ? tr('podium_empty') : tr(`podium_empty_missions${periodSuffix.value}`)
)

const noRankText = computed(() =>
  type.value === 'xp' ? tr('no_rank_xp') : tr(`no_rank_missions${periodSuffix.value}`)
)

const noScoreTitle = computed(() =>
  type.value === 'xp' ? t('common.ranking.no_score.xp') : t(`common.ranking.no_score.missions.${period.value}`)
)

const listTitle = computed(() =>
  mode.value === 'top'
    ? tr('top_list_title', { n: props.rankingData.options.topN })
    : tr('rest_title')
)
</script>
