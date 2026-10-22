<template>
  <p
    v-if="row && row.total > 0"
    class="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-navy-700"
  >
    <span class="font-semibold">
      {{ t('teacher.attendance.profile.rate', { rate: row.rate ?? 0 }) }}
    </span>
    <span class="text-navy-700/70">
      {{ t('teacher.attendance.profile.sessions', { count: row.total }, row.total) }}
    </span>
    <span v-for="s in MISSES" :key="s" class="inline-flex items-center gap-1">
      <component
        :is="ATTENDANCE_STATUS_META[s].icon"
        class="h-4 w-4"
        :class="ATTENDANCE_STATUS_META[s].color"
        aria-hidden="true"
      />
      {{ t(`teacher.attendance.count.${s}`, { count: row[s] }, row[s]) }}
    </span>
  </p>
</template>

<script setup lang="ts">
import type { AttendanceSummary, AttendanceStatus } from '~/composables/useClassAttendance'
import { ATTENDANCE_STATUS_META } from '~/utils/attendance-status'
import { toDateKey } from '~/utils/schedule-occurrences'

/**
 * La asistencia de un estudiante en una clase, en una línea, para su ficha:
 * porcentaje, sesiones y lo que no fue «presente». Del curso en marcha (desde
 * el 1 de septiembre). Sin ninguna lista en el curso, no sale nada.
 */
const props = defineProps<{ classId: string; studentId: string }>()

const { t } = useI18n()
const api = useAttendanceApi()

const MISSES: AttendanceStatus[] = ['absent', 'late', 'excused']

const row = ref<AttendanceSummary['students'][number] | null>(null)

onMounted(async () => {
  const today = new Date()
  const year = today.getMonth() >= 8 ? today.getFullYear() : today.getFullYear() - 1
  try {
    const res = await api.getSummary(
      props.classId,
      `${year}-09-01`,
      toDateKey(today),
      props.studentId
    )
    row.value = res.students[0] ?? null
  } catch {
    row.value = null
  }
})
</script>
