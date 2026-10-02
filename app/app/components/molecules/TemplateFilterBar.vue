<template>
  <FilterBar
    v-model:search="search"
    v-model:sort="sort"
    :results-count="resultsCount"
    :search-placeholder="t('teacher.templates.search')"
    :sort-options="sortOptions"
    :has-active-filters="activeFilterCount > 0"
    :active-filter-count="activeFilterCount"
    variant="red"
    @reset="reset"
  >
    <template #filters>
      <MultiSelectDropdown
        :model-value="levels"
        :options="CLASS_EDUCATION_LEVELS"
        :all-label="t('teacher.templates.filter_all.level')"
        :plural-label="t('teacher.templates.plural.levels')"
        @update:model-value="setLevels"
      />
      <!-- Bloqueado, dice por qué: hasta elegir un nivel no hay asignaturas -->
      <MultiSelectDropdown
        v-model="subjects"
        :disabled="!levels.length"
        :options="subjectOptions"
        :all-label="
          levels.length
            ? t('teacher.templates.filter_all.subject')
            : t('teacher.classes.detail.settings.general.subject_needs_level')
        "
        :plural-label="t('teacher.templates.plural.subjects')"
      />
      <MultiSelectDropdown
        v-model="languages"
        :options="CLASS_LANGUAGES"
        :all-label="t('teacher.templates.filter_all.language')"
        :plural-label="t('teacher.templates.plural.languages')"
      />
      <MultiSelectDropdown
        v-model="provinces"
        :options="SPANISH_PROVINCES"
        :all-label="t('teacher.templates.filter_all.province')"
        :plural-label="t('teacher.templates.plural.provinces')"
      />
    </template>
  </FilterBar>
</template>

<script setup lang="ts">
import {
  subjectsForLevels,
  CLASS_EDUCATION_LEVELS,
  CLASS_LANGUAGES,
  SPANISH_PROVINCES,
} from '~/utils/class-metadata'

/**
 * La barra de filtros de los catálogos de plantillas, la misma en el del
 * profesorado y en el público: el `FilterBar` de las misiones con un
 * desplegable de selección múltiple por cada metadato educativo, sobre los
 * vocabularios cerrados de `class-metadata.ts`. Una lista vacía es «todos».
 *
 * Solo recoge lo que se elige; quién filtra lo decide cada catálogo (el del
 * profesorado, en el navegador; el público, en el servidor).
 */

defineProps<{
  /** Cuántas plantillas salen con lo elegido. */
  resultsCount: number
}>()

const search = defineModel<string>('search', { required: true })
const sort = defineModel<string>('sort', { required: true })
const levels = defineModel<string[]>('levels', { required: true })
const subjects = defineModel<string[]>('subjects', { required: true })
const languages = defineModel<string[]>('languages', { required: true })
const provinces = defineModel<string[]>('provinces', { required: true })

const { t } = useI18n()

const sortOptions = computed(() => [
  { value: 'recent', label: t('teacher.templates.sort.recent') },
  { value: 'name-asc', label: t('teacher.templates.sort.name_asc') },
  { value: 'name-desc', label: t('teacher.templates.sort.name_desc') },
])

// El filtro de asignaturas funciona como en el wizard: bloqueado hasta marcar
// algún nivel, y estrechado al catálogo de los niveles marcados.
const subjectOptions = computed(() => subjectsForLevels(levels.value))

/**
 * Al cambiar los niveles, las asignaturas marcadas que queden fuera se sueltan
 * antes, en el mismo paso: así el catálogo público pide una sola vez, y nunca
 * una mezcla de niveles nuevos con asignaturas que ya no valen. Sin niveles se
 * sueltan todas, porque el desplegable se bloquea: una asignatura que no se
 * puede quitar no puede seguir filtrando.
 */
function setLevels(value: string[]) {
  const valid = new Set(subjectsForLevels(value).map(o => o.value))
  const kept = value.length ? subjects.value.filter(s => valid.has(s)) : []
  // Solo si sobra alguna: una lista nueva con lo mismo haría pedir otra vez
  // la página al catálogo público.
  if (kept.length !== subjects.value.length) subjects.value = kept
  levels.value = value
}

const activeFilterCount = computed(
  () =>
    subjects.value.length + levels.value.length + languages.value.length + provinces.value.length
)

/** «Limpiar filtros»: todo como al entrar, también la búsqueda y el orden. */
function reset() {
  search.value = ''
  subjects.value = []
  levels.value = []
  languages.value = []
  provinces.value = []
  sort.value = 'recent'
}
</script>
