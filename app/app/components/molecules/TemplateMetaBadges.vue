<template>
  <div class="flex flex-wrap gap-1.5">
    <!-- En la tarjeta, una etiqueta no se parte en dos líneas; si ni sola cabe
         (hay asignaturas muy largas), se recorta con puntos suspensivos en vez
         de salirse, y el texto entero queda en el `title`. Con `wrap` se parte:
         es la ficha, donde la etiqueta se tiene que poder leer entera también
         en un móvil estrecho. -->
    <Badge v-for="item in items" :key="item.key" variant="info" size="sm" class="max-w-full gap-1">
      <component :is="item.icon" class="h-3.5 w-3.5 flex-shrink-0" />
      <span v-if="wrap" class="min-w-0 whitespace-normal">{{ item.value }}</span>
      <span v-else class="min-w-0 truncate" :title="item.value">{{ item.value }}</span>
    </Badge>
  </div>
</template>

<script setup lang="ts">
import type { Component } from 'vue'
import { AcademicCapIcon, BookOpenIcon, LanguageIcon, MapPinIcon } from '@heroicons/vue/24/outline'
import type { TemplateMeta } from '~/types/template.types'

/**
 * Los metadatos educativos de una plantilla como etiquetas con su icono: nivel,
 * asignatura e idioma, y la provincia si se pide. La misma fila en la tarjeta
 * de los dos catálogos y en la ficha pública. Los que faltan no se pintan.
 */

const props = defineProps<{
  template: TemplateMeta
  /** También la provincia: la tarjeta no la lleva, la ficha sí. */
  withProvince?: boolean
  /** Las etiquetas que no caben se parten en vez de recortarse (la ficha). */
  wrap?: boolean
}>()

const items = computed(() => {
  const all: { key: keyof TemplateMeta; icon: Component; value: string | null }[] = [
    { key: 'educationLevel', icon: AcademicCapIcon, value: props.template.educationLevel },
    { key: 'subject', icon: BookOpenIcon, value: props.template.subject },
    { key: 'language', icon: LanguageIcon, value: props.template.language },
    ...(props.withProvince
      ? [{ key: 'province' as const, icon: MapPinIcon, value: props.template.province }]
      : []),
  ]
  return all.filter((item): item is typeof item & { value: string } => !!item.value)
})
</script>
