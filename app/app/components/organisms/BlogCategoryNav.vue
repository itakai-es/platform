<template>
  <!-- El ancho crece con el número de categorías hasta un tope: con pocas, las
       píldoras no se estiran a lo ancho de la página; con muchas, bajan de fila. -->
  <div v-if="categories.length" :style="{ maxWidth }">
    <OptionPillGroup
      :model-value="active"
      :options="options"
      :columns="Math.min(options.length, 4)"
      fluid
      min-item-width="8rem"
      :aria-label="t('common.blog.categories_label')"
    />
  </div>
</template>

<script setup lang="ts">
import { helpBasePath, helpCategoryPath } from '~/utils/help-area'

/**
 * Las categorías del blog como filtro: «Todas» lleva a `/blog` y cada una a
 * su página. Son enlaces (se pueden abrir en otra pestaña o compartir), con
 * las mismas píldoras que el selector de portada de la ayuda.
 */

withDefaults(
  defineProps<{
    /** El slug de la categoría que se está viendo; vacío en la portada del blog. */
    active?: string
  }>(),
  { active: '' }
)

const { t } = useI18n()
const { categories } = useHelp('blog')

const options = computed(() => [
  { value: '', label: t('common.blog.all_posts'), to: helpBasePath('blog') },
  ...categories.value.map(category => ({
    value: category.slug,
    label: category.name,
    to: helpCategoryPath('blog', category.slug),
  })),
])

/** Unas 12rem por píldora, hasta cuatro por fila. */
const maxWidth = computed(() => `${Math.min(options.value.length, 4) * 12}rem`)
</script>
