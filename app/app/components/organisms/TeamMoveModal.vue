<template>
  <Modal
    :model-value="modelValue"
    :title="t('teacher.teams.move.title', { title: set?.title ?? '' })"
    size="md"
    sticky-chrome
    fit-content
    @update:model-value="close"
  >
    <div class="space-y-6">
      <StudentPicker
        v-model="selection"
        :students="pickerStudents"
        :legend="t('teacher.teams.move.who')"
      >
        <template #filters="{ select }">
          <Button
            v-for="team in set?.teams ?? []"
            :key="team.id"
            size="sm"
            variant="outline"
            :disabled="!team.studentIds.length"
            @click="select(team.studentIds)"
          >
            {{ t('teacher.teams.move.from_team', { name: team.title }) }}
          </Button>
        </template>
      </StudentPicker>

      <label class="block text-sm text-navy-700">
        <span class="mb-1 block font-medium">{{ t('teacher.teams.move.to') }}</span>
        <Select v-model="destination" :options="destinationOptions" />
      </label>
    </div>

    <template #footer>
      <Button variant="outline" :disabled="saving" @click="close">
        {{ t('common.actions.cancel') }}
      </Button>
      <Button variant="primary" :disabled="!selection.length" :loading="saving" @click="confirm">
        {{ t('teacher.teams.move.confirm', { count: selection.length }, selection.length) }}
      </Button>
    </template>
  </Modal>
</template>

<script setup lang="ts">
import type { PickerStudent } from '~/components/molecules/StudentPicker.vue'
import type { TeamSet } from '~/types/team.types'

/**
 * La alternativa con teclado (y con lector de pantalla) al arrastre entre
 * equipos: se elige a quién con `StudentPicker` (también «los del equipo X» de
 * un toque) y a qué equipo va, o «Sin equipo». Quien lo abre guarda el cambio.
 */
const NONE = '__none__'

const props = defineProps<{
  modelValue: boolean
  set: TeamSet | null
  students: PickerStudent[]
  saving?: boolean
}>()

const emit = defineEmits<{
  'update:modelValue': [open: boolean]
  move: [payload: { studentIds: string[]; teamId: string | null }]
}>()

const { t } = useI18n()
const selection = ref<string[]>([])
const destination = ref<string>(NONE)

watch(
  () => props.modelValue,
  open => {
    if (!open) return
    selection.value = []
    destination.value = props.set?.teams[0]?.id ?? NONE
  },
  { immediate: true }
)

const teamOf = computed(() => {
  const map = new Map<string, string>()
  for (const team of props.set?.teams ?? [])
    for (const id of team.studentIds) map.set(id, team.title)
  return map
})

/** Cada estudiante con su equipo de ahora al lado. */
const pickerStudents = computed(() =>
  props.students.map(s => ({
    ...s,
    hint: teamOf.value.get(s.id) ?? t('teacher.teams.no_team'),
  }))
)

const destinationOptions = computed(() => [
  ...(props.set?.teams ?? []).map(team => ({ value: team.id, label: team.title })),
  { value: NONE, label: t('teacher.teams.no_team') },
])

function close() {
  if (props.saving) return
  emit('update:modelValue', false)
}

function confirm() {
  if (!selection.value.length) return
  emit('move', {
    studentIds: [...selection.value],
    teamId: destination.value === NONE ? null : destination.value,
  })
}
</script>
