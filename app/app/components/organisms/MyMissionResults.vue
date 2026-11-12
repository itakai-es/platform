<template>
  <!-- «Mis resultados»: lo suyo, misión a misión, en neutro y sin etiquetas -->
  <Card type="clases">
    <CardHeader :title="t('student.classes.detail.results.title')" :icon="ClipboardDocumentCheckIcon" />
    <p class="text-sm text-navy-700">{{ t('student.classes.detail.results.hint') }}</p>
    <TabNavigation
      variant="pills"
      :id-prefix="TABS_PREFIX"
      :tabs="tabs"
      :active-tab="filter"
      :aria-label="t('student.classes.detail.results.filter_label')"
      @tab-change="setFilter"
    />
    <div
      :id="tabPanelId(TABS_PREFIX, filter)"
      role="tabpanel"
      :aria-labelledby="tabElementId(TABS_PREFIX, filter)"
    >
      <CardItem v-if="!visible.length" layout="column" padding="lg" centered>
        <EmptyState
          :icon="RocketLaunchIcon"
          :title="
            filter === 'pending'
              ? t('student.classes.detail.results.empty_pending')
              : t('student.classes.detail.results.empty_done')
          "
          :description="t('student.classes.detail.results.empty_description')"
        />
      </CardItem>
      <ul v-else class="space-y-3">
        <li v-for="mission in visible" :key="mission.id">
          <MissionResultRow :class-id="classId" :mission="mission" variant="student" />
        </li>
      </ul>
    </div>
  </Card>
</template>

<script setup lang="ts">
import { ClipboardDocumentCheckIcon, RocketLaunchIcon } from '@heroicons/vue/24/outline'
import type { StudentMissionRow } from '~/types/analytics.types'
import { filterMissionRows } from '~/utils/analytics-view'
import { tabElementId, tabPanelId } from '~/utils/tabs'

/** Sus misiones, pendientes o hechas, en el Resumen de la clase del alumnado. */
const props = defineProps<{ classId: string; missions: StudentMissionRow[] }>()

const TABS_PREFIX = 'my-results'

const { t } = useI18n()

// Primero lo pendiente; sin nada pendiente, lo que ya tiene hecho.
const filter = ref<'pending' | 'done'>(
  filterMissionRows(props.missions, 'pending').length > 0 ? 'pending' : 'done'
)

const tabs = computed(() =>
  (['pending', 'done'] as const).map(id => ({
    id,
    label: t(`student.classes.detail.results.filter_${id}`, {
      count: filterMissionRows(props.missions, id).length,
    }),
  }))
)

const visible = computed(() => filterMissionRows(props.missions, filter.value))

function setFilter(id: string) {
  filter.value = id as 'pending' | 'done'
}
</script>
