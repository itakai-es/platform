<template>
  <template v-if="taken">
    <Button size="sm" variant="outline" @click="select(presentIds)">
      {{ t('teacher.classroom.picker.only_present') }}
    </Button>
    <Button size="sm" variant="outline" :disabled="!absentOnly.length" @click="select(absentOnly)">
      {{ t('teacher.classroom.picker.only_absent') }}
    </Button>
  </template>
</template>

<script setup lang="ts">
/**
 * Selección rápida según la lista de hoy, para la ranura `filters` de
 * `StudentPicker`: «Solo presentes» (con retraso incluido) y «Solo ausentes»
 * (sin las faltas justificadas, para no penalizarlas de un clic). Sin lista
 * hoy no sale nada.
 */
const props = defineProps<{
  classId: string
  studentIds: string[]
  select: (ids: string[]) => void
}>()

const { t } = useI18n()
const { taken, statusOf, ensure } = useClassAttendance(() => props.classId)
onMounted(ensure)

const presentIds = computed(() =>
  props.studentIds.filter(id => {
    const s = statusOf(id)
    return s !== 'absent' && s !== 'excused'
  })
)
const absentOnly = computed(() => props.studentIds.filter(id => statusOf(id) === 'absent'))
</script>
