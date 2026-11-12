<template>
  <div class="space-y-6">
    <!-- Una pestaña por tipo; con uno solo, no hace falta ninguna -->
    <TabNavigation
      v-if="tabs.length > 1"
      variant="pills"
      :id-prefix="ID_PREFIX"
      :tabs="tabs"
      :active-tab="activeType"
      :aria-label="t('common.ranking.types_label')"
      @tab-change="setType"
    />

    <div
      :id="tabs.length > 1 ? tabPanelId(ID_PREFIX, activeType) : undefined"
      :role="tabs.length > 1 ? 'tabpanel' : undefined"
      :aria-labelledby="tabs.length > 1 ? tabElementId(ID_PREFIX, activeType) : undefined"
      class="space-y-6"
    >
      <!-- Al profesorado, qué ve su alumnado -->
      <RankingAudienceNote
        v-if="options?.audience"
        :audience="options.audience"
        :type="activeType"
      />

      <!-- Periodo, si el tipo tiene más de uno: la XP solo tiene «Siempre». Las
           mismas píldoras que el periodo de la analítica. -->
      <div v-if="periodTabs.length > 1" class="space-y-2">
        <TabNavigation
          variant="pills"
          toggle
          :tabs="periodTabs"
          :active-tab="activePeriod"
          :aria-label="t('common.ranking.periods_label')"
          @tab-change="period = $event as RankingPeriod"
        />
        <p v-if="seasonNote" class="text-sm text-navy-700/70">{{ seasonNote }}</p>
      </div>

      <div v-if="loading" class="space-y-6">
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Skeleton height="h-64" />
          <Skeleton height="h-64" />
        </div>
        <Skeleton height="h-96" />
      </div>

      <LoadError v-else-if="error" @retry="retry" />

      <template v-else-if="data">
        <TeamStandings
          v-if="data.type === 'teams'"
          :standings="data.standings"
          :period="data.period"
        />
        <slot v-else-if="data.total === 0 && $slots.empty" name="empty" />
        <ClassRankingSection
          v-else
          :ranking-data="data"
          :student-link="studentLink"
          :show-current-user-highlight="showCurrentUserHighlight"
        />
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import { tabElementId, tabPanelId } from '~/utils/tabs'
import type { RankingPeriod, RankingType } from '~/utils/ranking-config'

/**
 * El ranking de una clase, con sus pestañas por tipo y sus periodos: el mismo en la
 * vista del alumnado y en la del profesorado. Cada cual lo pide a su API (`url`), y
 * lo que llega es lo que puede ver: las pestañas, los periodos y las filas.
 */
const props = withDefaults(
  defineProps<{
    url: string
    /** Adónde lleva cada estudiante (su página, en la vista del profesorado). */
    studentLink?: (studentId: string) => string
    /** Marcar «Tú» en la fila de quien mira (la vista del alumnado). */
    showCurrentUserHighlight?: boolean
  }>(),
  { studentLink: undefined, showCurrentUserHighlight: true }
)

defineSlots<{
  /** Sin nadie en la clasificación. */
  empty?: () => unknown
}>()

const ID_PREFIX = 'ranking'

const { t, locale } = useI18n()
const { type, period, data, options, loading, error, retry } = useClassRankingBoard(
  () => props.url
)

const tabs = computed(() =>
  (options.value?.types ?? []).map(id => ({ id, label: t(`common.ranking.type.${id}`) }))
)

/** El que se ve: el que ha respondido la API, o el pedido mientras llega. */
const activeType = computed<RankingType>(
  () => type.value ?? data.value?.type ?? options.value?.types[0] ?? 'xp'
)

/** El periodo se lee de la respuesta: la API se queda con «Siempre» si el pedido no vale. */
const activePeriod = computed(() => data.value?.period ?? period.value)

const periodTabs = computed(() =>
  (data.value?.options.periods ?? []).map(id => ({ id, label: t(`common.ranking.period.${id}`) }))
)

const seasonNote = computed(() => {
  const started = data.value?.options.seasonStartedAt
  if (activePeriod.value !== 'season' || !started) return ''
  return t('common.ranking.season_since', {
    date: new Date(started).toLocaleDateString(locale.value, { dateStyle: 'long' }),
  })
})

function setType(id: string) {
  type.value = id as RankingType
}
</script>
