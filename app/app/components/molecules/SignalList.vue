<template>
  <CardItem v-if="!signals.length" layout="column" padding="lg" centered>
    <EmptyState
      :icon="CheckCircleIcon"
      :title="emptyTitle ?? t('common.charts.signals.empty_title')"
      :description="emptyDescription ?? t('common.charts.signals.empty_description')"
    />
  </CardItem>

  <ul v-else class="space-y-3">
    <li v-for="signal in signals" :key="signal.id">
      <!-- Con enlace, toda la fila es el enlace (un solo elemento que pulsar);
           sin él, la misma caja sin interacción. -->
      <!-- De quién o de qué misión es | título | flecha, y debajo el motivo. Desde
           `sm` (o sin título), el motivo va al lado, bajo el título; en el móvil,
           con todo el ancho. -->
      <component
        :is="signal.to ? NuxtLink : 'div'"
        :to="signal.to"
        class="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1 rounded-xl bg-white p-3 text-sm text-navy-700 sm:gap-x-4 sm:p-4"
        :class="
          signal.to
            ? 'transition-colors hover:bg-gray-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-navy-700'
            : undefined
        "
      >
        <!-- Su avatar o su portada y, encima, el icono del motivo en su círculo.
             Solo dibujo: el texto lo dice. -->
        <span
          class="relative col-start-1 row-start-1 flex h-11 w-11 flex-shrink-0 items-center justify-center"
          :class="signal.title ? 'sm:row-end-3' : ''"
          aria-hidden="true"
        >
          <Avatar
            v-if="signal.person"
            :src="signal.person.avatar"
            :name="signal.person.name"
            :seed="signal.person.seed"
            size="xs"
          />
          <MissionCover
            v-else-if="signal.cover"
            :cover="signal.cover.src"
            :rarity="signal.cover.rarity"
            size="sm"
          />
          <IconCircle v-else :icon="signal.icon ?? FlagIcon" size="md" />
          <IconCircle
            v-if="signal.person || signal.cover"
            :icon="signal.icon ?? FlagIcon"
            size="xs"
            class="absolute -bottom-1 -right-1 ring-2 ring-white"
          />
        </span>
        <span
          v-if="signal.title"
          class="col-start-2 row-start-1 min-w-0 font-semibold [overflow-wrap:anywhere]"
          >{{ signal.title }}</span
        >
        <span
          class="min-w-0 [overflow-wrap:anywhere]"
          :class="
            signal.title
              ? 'col-start-1 col-end-4 row-start-2 sm:col-start-2 sm:col-end-3'
              : 'col-start-2 row-start-1'
          "
        >
          <slot name="signal" :signal="signal">{{ signal.text }}</slot>
        </span>
        <ChevronRightIcon
          v-if="signal.to"
          class="col-start-3 row-start-1 h-5 w-5 flex-shrink-0 text-navy-700/60"
          :class="signal.title ? 'sm:row-end-3' : ''"
          aria-hidden="true"
        />
      </component>
    </li>
  </ul>
</template>

<script setup lang="ts">
import type { Component } from 'vue'
import { CheckCircleIcon, ChevronRightIcon } from '@heroicons/vue/24/outline'
import { FlagIcon } from '@heroicons/vue/24/solid'

/**
 * La lista de «dificultades detectadas» de los paneles del profesorado: cada
 * señal con su icono, su motivo en texto y un enlace a donde se atiende (la
 * misión o la página del estudiante). Va dentro de una tarjeta con su
 * `CardHeader`, como el resto de secciones.
 *
 * Sin colores de semáforo: todo en azul marino, con el motivo escrito. No
 * ordena ni puntúa; enseña lo que llega, en ese orden.
 *
 * - `signals`: `id`, `text` (el motivo ya traducido: la API manda clave y
 *   parámetros), `title` opcional (de quién o de qué misión es), `to` opcional e
 *   `icon` opcional (por defecto, la bandera), que va en blanco en su círculo.
 * - `person` (el avatar de la persona) o `cover` (la portada de la misión): de
 *   quién es, con el icono del motivo encima, en pequeño. Sin ninguno, el icono
 *   del motivo solo, más grande.
 * - Ranura `signal` ({ signal }) para escribir el motivo con más formato (el
 *   título va aparte, encima).
 * - Sin señales, un `EmptyState` («Nada que destacar»), que se puede cambiar
 *   con `emptyTitle` y `emptyDescription`.
 *
 * @example
 * <SignalList :signals="[{ id: 's1', text: t('…inactive', { n: 2, days: 14 }),
 *   to: `/profesor/clases/${classId}/alumnos` }]" />
 */
export interface Signal {
  id: string
  text: string
  title?: string
  to?: string
  icon?: Component
  person?: { name: string; avatar: string | null; seed: string }
  cover?: { src: string | null; rarity: string }
}

withDefaults(
  defineProps<{
    signals: Signal[]
    emptyTitle?: string
    emptyDescription?: string
  }>(),
  { emptyTitle: undefined, emptyDescription: undefined }
)

defineSlots<{ signal?: (props: { signal: Signal }) => unknown }>()

const NuxtLink = resolveComponent('NuxtLink')

const { t } = useI18n()
</script>
