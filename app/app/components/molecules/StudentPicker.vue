<template>
  <fieldset class="min-w-0">
    <legend class="mb-2 text-sm font-medium text-navy-700">
      {{ legend ?? t('teacher.classroom.picker.legend') }}
    </legend>

    <div class="space-y-3">
      <SearchInput
        v-if="students.length > SEARCH_FROM"
        v-model="query"
        :placeholder="t('teacher.classroom.picker.search')"
      />

      <!-- Selección rápida: todos y ninguno, y lo que añada quien lo usa
           (solo presentes, solo ausentes, un equipo…) con `select`. -->
      <div class="flex flex-wrap items-center gap-2">
        <Button size="sm" variant="outline" :disabled="disabled" @click="select(allIds)">
          {{ t('teacher.classroom.picker.all') }}
        </Button>
        <Button size="sm" variant="outline" :disabled="disabled" @click="select([])">
          {{ t('teacher.classroom.picker.none') }}
        </Button>
        <slot name="filters" :select="select" />
      </div>

      <p v-if="!students.length" class="text-sm text-text-secondary">
        {{ t('teacher.classroom.picker.empty') }}
      </p>
      <p v-else-if="!visible.length" class="text-sm text-text-secondary">
        {{ t('teacher.classroom.picker.no_results') }}
      </p>
      <ul v-else class="max-h-72 space-y-1 overflow-y-auto scrollbar-subtle pr-1">
        <li v-for="s in visible" :key="s.id">
          <StudentCheckRow
            :id="`${uid}-${s.id}`"
            :name="s.name"
            :avatar="s.avatar"
            :hint="s.hint"
            :checked="selected.has(s.id)"
            :disabled="disabled"
            selectable
            @update:checked="toggle(s.id, $event)"
          />
        </li>
      </ul>

      <p class="text-sm text-navy-700/70" aria-live="polite">
        {{
          t('teacher.classroom.picker.count', { count: modelValue.length, total: students.length })
        }}
      </p>
    </div>
  </fieldset>
</template>

<script setup lang="ts">
import { matchesQuery } from '~/utils/text-search'

/**
 * Elegir a varios estudiantes de una clase: casillas de verdad, buscador,
 * «todos / ninguno» y una ranura `filters` para selecciones rápidas propias
 * (solo presentes, solo ausentes, un equipo…), que reciben `select(ids)`.
 *
 * Es la pieza común de todo lo que se aplica a varios a la vez: comportamientos
 * y recompensas en lote, equipos y lo que venga. Solo elige; la confirmación la
 * pone quien la usa.
 */
export interface PickerStudent {
  id: string
  name: string
  avatar?: string
  /** Nota corta a la derecha del nombre (su estado en la lista de hoy, por ejemplo). */
  hint?: string
}

const props = withDefaults(
  defineProps<{
    students: PickerStudent[]
    /** Ids elegidos. */
    modelValue: string[]
    legend?: string
    disabled?: boolean
  }>(),
  { legend: undefined, disabled: false }
)

const emit = defineEmits<{ 'update:modelValue': [ids: string[]] }>()

const { t } = useI18n()
const uid = `picker-${useId()}`.replace(/[^\w-]/g, '-')

/** Con pocas filas el buscador sobra. */
const SEARCH_FROM = 8

const query = ref('')
const selected = computed(() => new Set(props.modelValue))
const allIds = computed(() => props.students.map(s => s.id))
const visible = computed(() => {
  return props.students.filter(s => matchesQuery(query.value, s.name))
})

/** Deja elegidos estos ids (los que sigan en la lista), en el orden de la lista. */
function select(ids: string[]) {
  const wanted = new Set(ids)
  emit(
    'update:modelValue',
    allIds.value.filter(id => wanted.has(id))
  )
}

function toggle(id: string, on: boolean) {
  const next = new Set(selected.value)
  if (on) next.add(id)
  else next.delete(id)
  select([...next])
}
</script>
