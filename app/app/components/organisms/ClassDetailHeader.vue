<template>
  <div
    class="relative bg-navy-700 -mx-4 md:-mx-6 -mt-4 md:-mt-6 px-4 md:px-6 pt-6 pb-0 mb-6 overflow-hidden"
  >
    <!-- Imagen de fondo a la derecha con degradado navy → transparente -->
    <div
      v-if="backgroundImage"
      class="pointer-events-none absolute inset-y-0 right-0 hidden md:block md:w-1/2 lg:w-[45%]"
    >
      <div
        class="absolute inset-0 bg-cover bg-center"
        :style="{ backgroundImage: `url(${backgroundImage})` }"
      />
      <div
        class="absolute inset-0 bg-gradient-to-r from-navy-700 via-navy-700/60 to-transparent"
      />
    </div>

    <div class="relative z-10 space-y-4">
      <!-- Breadcrumb + acciones a la derecha -->
      <div class="flex items-center justify-between gap-2">
        <nav
          class="flex items-center gap-1.5 sm:gap-2 text-sm overflow-x-auto scrollbar-subtle min-w-0"
        >
          <NuxtLink :to="homeTo" class="text-white/70 hover:text-white flex-shrink-0">
            <HomeIcon class="w-4 h-4" />
          </NuxtLink>
          <span class="hidden sm:flex items-center gap-1.5 sm:gap-2">
            <ChevronRightIcon class="w-4 h-4 text-white/70" />
            <NuxtLink
              :to="breadcrumbMiddleTo"
              class="text-white/70 hover:text-white whitespace-nowrap"
            >
              {{ breadcrumbMiddle }}
            </NuxtLink>
          </span>
          <ChevronRightIcon class="w-4 h-4 text-white/70 flex-shrink-0" />
          <span class="text-white font-medium truncate max-w-[180px] sm:max-w-none">{{
            name
          }}</span>
        </nav>
        <div v-if="$slots.actions" class="flex-shrink-0">
          <slot name="actions" />
        </div>
      </div>

      <!-- Bloque de título + subtítulo + meta (saldo / aviso archivado / etc.) -->
      <div class="space-y-3">
        <div class="flex items-center gap-3">
          <slot name="titleIcon" />
          <div class="min-w-0 flex-1">
            <h1 class="text-2xl sm:text-3xl md:text-4xl font-bold text-white break-all">
              {{ name }}
            </h1>
            <p v-if="$slots.subtitle" class="text-white/70 text-sm sm:text-base">
              <slot name="subtitle" />
            </p>
            <!-- Chips de clasificación (asignatura · nivel · idioma) -->
            <div
              v-if="subject || educationLevel || language"
              class="mt-2 flex flex-wrap items-center gap-2"
            >
              <span
                v-if="subject"
                class="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-2.5 py-1 text-xs font-medium text-white/90"
              >
                <BookOpenIcon class="h-3.5 w-3.5 flex-shrink-0" />{{ subject }}
              </span>
              <span
                v-if="educationLevel"
                class="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-2.5 py-1 text-xs font-medium text-white/90"
              >
                <AcademicCapIcon class="h-3.5 w-3.5 flex-shrink-0" />{{ educationLevel }}
              </span>
              <span
                v-if="language"
                class="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-2.5 py-1 text-xs font-medium text-white/90"
              >
                <LanguageIcon class="h-3.5 w-3.5 flex-shrink-0" />{{ language }}
              </span>
            </div>
          </div>
        </div>
        <slot name="meta" />
      </div>

      <!-- Tabs como NuxtLink: cada una tiene su URL real -->
      <div class="flex gap-0 overflow-x-auto scrollbar-subtle">
        <NuxtLink
          v-for="tab in tabs"
          :key="tab.id"
          :to="tabHref(tab.id)"
          :class="[
            'px-3 sm:px-4 md:px-6 lg:px-8 py-3 text-sm sm:text-base font-medium transition-colors flex items-center gap-2 rounded-t-2xl whitespace-nowrap flex-shrink-0 hover:opacity-100',
            activeTab === tab.id
              ? 'bg-surface text-navy-700'
              : 'text-white/70 hover:text-white hover:bg-white/10',
          ]"
        >
          <component :is="tab.icon" class="w-5 h-5" />
          <span class="hidden sm:inline">{{ tab.label }}</span>
        </NuxtLink>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { Component } from 'vue'
import {
  HomeIcon,
  ChevronRightIcon,
  BookOpenIcon,
  AcademicCapIcon,
  LanguageIcon,
} from '@heroicons/vue/24/outline'

defineProps<{
  /** Nombre de la clase (título y último segmento del breadcrumb). */
  name: string
  /** URL absoluta o relativa de la imagen de fondo. Vacío oculta el overlay. */
  backgroundImage?: string
  /** Destino del logo home del breadcrumb (rol-dependiente). */
  homeTo: string
  /** Texto del enlace intermedio del breadcrumb (p. ej. "Mis clases"). */
  breadcrumbMiddle: string
  /** Destino del enlace intermedio. */
  breadcrumbMiddleTo: string
  /** Pestañas a renderizar como NuxtLink. */
  tabs: Array<{ id: string; label: string; icon: Component }>
  /** ID de la pestaña activa (la del segmento actual de la URL). */
  activeTab: string
  /** Constructor del href de una tab por su id (p. ej. tabId => `/.../id/tabId`). */
  tabHref: (tabId: string) => string
  /** Chips de clasificación bajo el subtítulo (opcionales): asignatura · nivel · idioma. */
  subject?: string | null
  educationLevel?: string | null
  language?: string | null
}>()

defineSlots<{
  /** Acciones a la derecha del breadcrumb (p. ej. botón "Invitar"). */
  actions?: () => unknown
  /** Icono opcional a la izquierda del título (ninguna vista lo usa actualmente). */
  titleIcon?: () => unknown
  /** Línea subtítulo bajo el h1 (horario / profesor·horario). */
  subtitle?: () => unknown
  /** Bloque opcional bajo título (saldo del alumno, aviso de archivado, etc.). */
  meta?: () => unknown
}>()
</script>
