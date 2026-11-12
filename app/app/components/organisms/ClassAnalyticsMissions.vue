<template>
  <ChartFigure
    chart-id="class-missions"
    type="clases"
    :title="t('teacher.analytics.missions.title')"
    :icon="RocketLaunchIcon"
    :caption="t('teacher.analytics.missions.caption')"
    :loading="loading"
    :empty="!loading && missions.length === 0"
    :empty-title="t('teacher.analytics.missions.empty_title')"
    :empty-description="t('teacher.analytics.missions.empty_description')"
  >
    <!-- Cada misión: su portada con el aro de su rareza, su título, la barra con
         cuántas personas hay en cada estado y quién la ha completado. Todo es
         dibujo (lo lee la tabla): los enlaces no reciben el foco. -->
    <ul class="divide-y divide-navy-700/10">
      <!-- Portada | título y quién la ha completado, y debajo la barra. En el
           móvil, la barra ocupa todo el ancho, por debajo de la portada. -->
      <li
        v-for="row in rows"
        :key="row.mission.id"
        class="grid grid-cols-[auto_minmax(0,1fr)] items-center gap-x-3 gap-y-2 py-4 first:pt-0 last:pb-0 sm:gap-x-4"
      >
        <MissionCover
          :cover="row.mission.cover"
          :rarity="row.mission.rarity"
          :locked="row.mission.exclusion === 'teacher_locked'"
          size="auto"
          class="col-start-1 row-start-1 sm:row-end-3 sm:self-start"
        />
        <div
          class="col-start-2 row-start-1 flex min-w-0 flex-wrap items-start justify-between gap-x-4 gap-y-2"
        >
          <p
            class="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 text-sm font-semibold text-navy-700"
          >
            <NuxtLink
              :to="row.to"
              tabindex="-1"
              class="underline decoration-navy-700/30 underline-offset-2 [overflow-wrap:anywhere] hover:decoration-navy-700"
              >{{ row.mission.title }}</NuxtLink
            >
            <!-- Su rareza, escrita: el aro de la portada es solo color -->
            <span class="text-xs font-semibold uppercase tracking-wide text-navy-700/80">{{
              rarityName(row.mission.rarity)
            }}</span>
            <span v-if="row.note" class="text-xs font-normal text-navy-700/80">{{
              row.note
            }}</span>
          </p>
          <AvatarStack
            v-if="row.people.length"
            :people="row.people"
            :total="row.mission.completedBy.total"
            :max="STACK_MAX"
            :label="t('common.mission_map.detail.completed_list')"
          />
        </div>
        <StackedBar
          v-if="row.mission.counted"
          :counts="row.counts"
          class="col-start-1 col-end-3 row-start-2 sm:col-start-2"
        />
      </li>
    </ul>

    <template #legend>
      <ChartLegend v-if="statuses.length" :statuses="statuses" />
    </template>

    <template #table>
      <ChartTable
        compact
        :caption="t('teacher.analytics.missions.table_caption')"
        :row-header="t('teacher.analytics.missions.col_mission')"
        :columns="columns"
        :rows="tableRows"
      >
        <template #header="{ row }">
          <NuxtLink
            :to="row.to!"
            class="underline decoration-navy-700/30 underline-offset-2 hover:decoration-navy-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-navy-700"
            >{{ row.header }}</NuxtLink
          >
          <span v-if="noteOf(row.key)" class="block text-xs font-normal text-navy-700/80">{{
            noteOf(row.key)
          }}</span>
        </template>
        <!-- Quién la ha completado: en la tabla, compacto (dos avatares y «+N»);
             los nombres de todos, para el lector y al pasar el ratón -->
        <template #cell="{ row, column, value }">
          <AvatarStack
            v-if="column.key === 'completed_by' && peopleOf(row.key).length"
            :people="peopleOf(row.key)"
            :total="totalOf(row.key)"
            :max="TABLE_STACK_MAX"
            :label="t('common.mission_map.detail.completed_list')"
            size="xxs"
            class="flex-nowrap justify-center"
          />
          <template v-else>{{ cellText(value) }}</template>
        </template>
      </ChartTable>
    </template>
  </ChartFigure>
</template>

<script setup lang="ts">
import { RocketLaunchIcon } from '@heroicons/vue/24/outline'
import type { StackPerson } from '~/components/molecules/AvatarStack.vue'
import type { ChartTableColumn, ChartTableRow } from '~/components/molecules/ChartTable.vue'
import type { ClassAnalyticsMission } from '~/types/analytics.types'
import { formatDateShort } from '~/utils/analytics-view'
import { studentAvatarSeed } from '~/utils/avatar'
import { countsFromSegments, onlyStatuses, statusesInUse } from '~/utils/chart-status'

/**
 * Las misiones de la clase en el panel: cuántas personas hay en cada estado, con
 * su tabla de verdad. Cada una con su portada y su rareza (como en sus tarjetas y
 * en el mapa) y los avatares de quien la ha completado («+N» con el resto). Una
 * misión que no cuenta (bloqueada a mano o sin enigmas) no se dibuja como un
 * estado más: lleva su texto. Cada título enlaza a la misión, que es donde se
 * revisan las entregas.
 */
const props = defineProps<{
  classId: string
  missions: ClassAnalyticsMission[]
  loading: boolean
}>()

/** Huecos de la pila de avatares: las cinco que manda la API y «+N». */
const STACK_MAX = 6
/** En la tabla, menos: que quepa a lo ancho junto a las cifras. */
const TABLE_STACK_MAX = 3

const { t, locale } = useI18n()
const { formatNumber, formatPercent } = useNumberFormat()

const countedCounts = computed(() =>
  props.missions.filter(m => m.counted).map(m => countsFromSegments(m.segments))
)
const statuses = computed(() => statusesInUse(countedCounts.value))

function noteFor(mission: ClassAnalyticsMission): string | undefined {
  if (mission.exclusion === 'teacher_locked') return t('teacher.analytics.missions.excluded_teacher')
  if (mission.exclusion === 'no_enigmas') return t('teacher.analytics.missions.excluded_empty')
  if (!mission.deadline) return undefined
  const date = formatDateShort(mission.deadline, locale.value)
  return mission.expired
    ? t('teacher.analytics.missions.deadline_past', { date })
    : t('teacher.analytics.missions.deadline_future', { date })
}

const peopleFor = (mission: ClassAnalyticsMission): StackPerson[] =>
  mission.completedBy.students.map(student => ({
    ...student,
    seed: studentAvatarSeed(props.classId, student.id),
  }))

const rows = computed(() =>
  props.missions.map(mission => ({
    mission,
    to: `/profesor/clases/${props.classId}/misiones/${mission.id}`,
    note: noteFor(mission),
    counts: mission.counted
      ? onlyStatuses(countsFromSegments(mission.segments), statuses.value)
      : {},
    people: peopleFor(mission),
  }))
)

const rowById = computed(() => new Map(rows.value.map(row => [row.mission.id, row])))
const noteOf = (id: string) => rowById.value.get(id)?.note
const peopleOf = (id: string) => rowById.value.get(id)?.people ?? []
const totalOf = (id: string) => rowById.value.get(id)?.mission.completedBy.total ?? 0

const RARITIES = ['comun', 'rara', 'epica', 'legendaria']
/** «Común», «Rara»…: el nombre de la rareza, como en las tarjetas de misión. */
const rarityName = (rarity: string) =>
  t(`student.components.rarity_badge.${RARITIES.includes(rarity) ? rarity : 'comun'}`)

const cellText = (value: string | number | null | undefined) => {
  if (value === null || value === undefined || value === '') return '—'
  return typeof value === 'number' ? formatNumber(value) : value
}

const columns = computed<ChartTableColumn[]>(() => [
  ...statuses.value.map(status => ({
    key: status,
    label: t(`common.charts.status.${status}`),
    align: 'center' as const,
  })),
  { key: 'average', label: t('teacher.analytics.missions.col_average'), align: 'center' },
  { key: 'hints', label: t('teacher.analytics.missions.col_hints'), align: 'center' },
  { key: 'completed_by', label: t('common.mission_map.detail.completed_list'), align: 'center' },
])

const tableRows = computed<ChartTableRow[]>(() =>
  rows.value.map(({ mission, to, counts }) => ({
    key: mission.id,
    header: mission.title,
    to,
    cells: {
      ...counts,
      average: mission.approvalAverage === null ? null : formatPercent(mission.approvalAverage),
      hints: mission.hints,
      completed_by: null,
    },
  }))
)
</script>
