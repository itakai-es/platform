<template>
  <div>
    <!-- Maqueta de la cabecera de la clase: mismo montaje que
         ClassDetailHeader (fondo navy, portada difuminada a la derecha, título,
         horario, chips y pestañas), pero sin navegación: aquí las pestañas solo
         cambian el contenido de abajo. Los márgenes negativos la sangran hasta
         los bordes para que enganche con la barra navy del wizard. -->
    <div
      class="relative -mx-4 mb-6 overflow-hidden rounded-t-2xl bg-navy-700 px-4 pb-0 pt-6 md:-mx-6 md:px-6"
    >
      <div
        v-if="coverImage"
        class="pointer-events-none absolute inset-y-0 right-0 hidden md:block md:w-1/2 lg:w-[45%]"
      >
        <div
          class="absolute inset-0 bg-cover bg-center"
          :style="{ backgroundImage: `url(${coverImage})` }"
        />
        <div
          class="absolute inset-0 bg-gradient-to-r from-navy-700 via-navy-700/60 to-transparent"
        />
      </div>

      <div class="relative z-10 space-y-4">
        <div class="flex items-start justify-between gap-3">
          <div class="min-w-0 flex-1">
            <h1 class="text-2xl font-bold break-words text-white sm:text-3xl md:text-4xl">
              {{ title }}
            </h1>
            <p v-if="schedule" class="mt-1 text-sm text-white/70 sm:text-base">
              <span class="inline-flex items-center gap-1.5">
                <CalendarDaysIcon class="h-4 w-4 flex-shrink-0 text-white/60" />{{ schedule }}
              </span>
            </p>
            <div v-if="chips.length" class="mt-2 flex flex-wrap items-center gap-2">
              <span
                v-for="chip in chips"
                :key="chip.label"
                class="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-2.5 py-1 text-xs font-medium text-white/90"
              >
                <component :is="chip.icon" v-if="chip.icon" class="h-3.5 w-3.5 flex-shrink-0" />
                {{ chip.label }}
              </span>
            </div>
          </div>
          <div v-if="$slots.actions" class="flex flex-shrink-0 flex-wrap gap-2">
            <slot name="actions" />
          </div>
        </div>

        <!-- Pestañas: botones, no enlaces, con el mismo aspecto que las reales. -->
        <div v-if="tabs.length" class="flex gap-0 overflow-x-auto scrollbar-none">
          <button
            v-for="tab in tabs"
            :key="tab.id"
            type="button"
            class="flex flex-shrink-0 items-center gap-2 whitespace-nowrap rounded-t-2xl px-3 py-3 text-sm font-medium transition-colors sm:px-4 sm:text-base md:px-6"
            :class="
              tab.id === modelValue
                ? 'bg-surface text-navy-700'
                : 'text-white/70 hover:bg-white/10 hover:text-white'
            "
            @click="$emit('update:modelValue', tab.id)"
          >
            <component :is="tab.icon" v-if="tab.icon" class="h-5 w-5" />
            {{ tab.label }}
          </button>
        </div>
      </div>
    </div>

    <slot />
  </div>
</template>

<script setup lang="ts">
import type { Component } from 'vue'
import { CalendarDaysIcon } from '@heroicons/vue/24/outline'

withDefaults(
  defineProps<{
    title: string
    /** Pestaña activa (v-model). */
    modelValue?: string
    /** URL ya resuelta de la portada. */
    coverImage?: string
    /** Horario legible, bajo el título, como en la clase real. */
    schedule?: string
    /** Etiquetas de clasificación (nivel, asignatura, idioma, provincia). */
    chips?: Array<{ label: string; icon?: Component }>
    /** Pestañas a mostrar. Cambian el contenido del slot, no la URL. */
    tabs?: Array<{ id: string; label: string; icon?: Component }>
  }>(),
  { chips: () => [], tabs: () => [] }
)

defineEmits<{ 'update:modelValue': [value: string] }>()
</script>
