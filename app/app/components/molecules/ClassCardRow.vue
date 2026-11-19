<template>
  <!-- Variante en fila (vista lista) de una tarjeta de clase: miniatura a la
       izquierda y datos en línea. Presentacional; los datos ya vienen resueltos
       desde ClassCardItem. -->
  <article
    class="relative flex min-h-[6.5rem] cursor-pointer items-stretch overflow-hidden rounded-2xl bg-white shadow-lg transition-shadow duration-200 hover:shadow-xl"
    @click="$emit('click')"
  >
    <!-- Thumbnail -->
    <div class="relative w-24 xs:w-28 sm:w-44 flex-shrink-0">
      <div
        v-if="backgroundImage"
        class="absolute inset-0 bg-cover bg-center"
        :style="{ backgroundImage: `url(${backgroundImage})` }"
      />
      <div v-else class="absolute inset-0 bg-gray-100" />
      <!-- Gradiente hacia el contenido, como en la variante en cuadrícula -->
      <div class="absolute inset-0 bg-gradient-to-r from-transparent to-white/40" />
    </div>

    <!-- Content. Reserva espacio a la derecha solo si hay acciones (duplicar/
         archivar) para que el título no quede debajo de los botones. -->
    <div
      class="flex min-w-0 flex-1 flex-col justify-center gap-1.5 py-4 pl-4 sm:py-5 sm:pl-5"
      :class="hasActions ? 'pr-[5.5rem]' : 'pr-4 sm:pr-5'"
    >
      <div class="flex min-w-0 items-center gap-2">
        <component :is="headingTag ?? 'h3'" class="truncate text-base font-bold text-navy-700 sm:text-lg">
          {{ name }}
        </component>
        <!-- Etiqueta propia de quien la usa (p. ej. el perfil en la clase) -->
        <slot name="tag" />
      </div>

      <div v-if="schedule?.length" class="flex items-center gap-1 text-sm text-navy-700/80">
        <ClockIcon class="h-4 w-4 flex-shrink-0" />
        <span class="truncate">{{ schedule.join(' · ') }}</span>
      </div>

      <ClassCardFacts
        :student-count="studentCount"
        :missions-count="missionsCount"
        :progress="progress"
        :coins="coins"
        :mana="mana"
        :lives="lives"
      />
    </div>
  </article>
</template>

<script setup lang="ts">
import { ClockIcon } from '@heroicons/vue/24/outline'

defineProps<{
  name: string
  /** El nivel del título: `h2` si la lista cuelga directamente del título de la página. */
  headingTag?: 'h2' | 'h3'
  backgroundImage?: string
  studentCount?: number
  missionsCount?: number
  progress?: { done: number; total: number }
  /** Líneas del resumen de horario (ver useScheduleSummary). */
  schedule?: string[]
  coins?: number
  mana?: number
  lives?: number
  // Reserva espacio a la derecha para las acciones flotantes (duplicar/archivar).
  hasActions?: boolean
}>()

defineEmits<{ click: [] }>()
</script>
