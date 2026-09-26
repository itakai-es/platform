<template>
  <FieldGroup v-slot="{ labelId }" :label="label">
    <Skeleton v-if="loading" height="h-12" custom-class="rounded-2xl" />
    <template v-else-if="!failed">
      <InfoNote v-if="options.length === 0">{{ emptyText }}</InfoNote>
      <SelectDropdown
        v-else
        v-model="model"
        :options="options"
        :labelledby="labelId"
        :disabled="disabled"
        :searchable="options.length > searchFrom"
        :placeholder="t('teacher.missions.import.class_placeholder')"
        :search-placeholder="t('teacher.missions.import.class_search')"
        :no-results-text="t('teacher.missions.import.no_class_matches')"
      />
      <slot />
    </template>
  </FieldGroup>
</template>

<script setup lang="ts">
/**
 * Una clase de la ventana de importar misiones: la de destino o la de origen.
 * Mientras llegan las clases, un esqueleto; sin ninguna que ofrecer,
 * `emptyText`. Si no han llegado (`failed`) no pinta nada: el aviso con
 * «Reintentar» es uno para toda la ventana. Debajo del desplegable, lo que
 * se pase en el slot (la casilla de las clases archivadas, en el origen).
 */
withDefaults(
  defineProps<{
    label: string
    /** Cada clase, con su segunda línea (cuántas misiones, de quién, si está archivada). */
    options: { value: string; label: string; hint?: string }[]
    emptyText: string
    loading?: boolean
    failed?: boolean
    /** Sin poder cambiarla (mientras se importa: la copia va a la elegida). */
    disabled?: boolean
    /** Con más clases que estas, el desplegable lleva buscador. */
    searchFrom?: number
  }>(),
  { loading: false, failed: false, disabled: false, searchFrom: 6 }
)

const model = defineModel<string | number>({ required: true })

const { t } = useI18n()
</script>
