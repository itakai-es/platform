<template>
  <Card type="pending">
    <CardHeader :title="title" :icon="CalendarIcon" title-tag="h3" />

    <!-- Dates List -->
    <div class="space-y-6">
      <CardItem v-for="dateItem in dates" :key="dateItem.id" padding="sm">
        <component :is="getTypeIcon(dateItem.type)" class="w-5 h-5 text-navy-700 flex-shrink-0" />
        <div class="flex-1 min-w-0">
          <p class="font-semibold text-navy-700 truncate">{{ dateItem.title }}</p>
          <p class="text-sm text-text-secondary">
            {{ dateItem.date }}
            <span v-if="dateItem.className" class="text-navy-700/60">
              · {{ dateItem.className }}</span
            >
          </p>
        </div>
      </CardItem>

      <!-- Empty State -->
      <CardItem v-if="!dates.length" padding="lg" layout="column" centered>
        <p class="text-sm text-navy-700/80">{{ t('student.dashboard.upcoming_dates_empty') }}</p>
      </CardItem>
    </div>
  </Card>
</template>

<script setup lang="ts">
/**
 * UpcomingDatesCard - Card de próximas fechas
 *
 * Card coral/rojo que muestra las próximas fechas importantes
 * de la clase: exámenes, entregas, clases especiales, etc.
 */

import {
  CalendarIcon,
  AcademicCapIcon,
  DocumentTextIcon,
  BookOpenIcon,
  ClockIcon,
} from '@heroicons/vue/24/outline'
import type { UpcomingDate } from '~/types/mission.types'

const { t } = useI18n()

interface Props {
  dates: UpcomingDate[]
  title?: string
}

withDefaults(defineProps<Props>(), {
  title: 'Próximas Fechas',
})

const getTypeIcon = (type: UpcomingDate['type']) => {
  const icons = {
    examen: AcademicCapIcon,
    entrega: DocumentTextIcon,
    clase: BookOpenIcon,
    otro: ClockIcon,
  }
  return icons[type] || ClockIcon
}
</script>
