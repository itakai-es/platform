<template>
  <!-- El detalle de una misión del mapa: lo mismo en el panel de al lado
       (pantallas anchas) y en la hoja inferior (móvil), que ponen el marco. -->
  <div class="space-y-4 text-navy-700">
    <!-- Portada en grande, con el número de paso y el estado encima. -->
    <div class="relative overflow-hidden rounded-xl bg-bg-secondary">
      <img
        v-if="item.cover"
        :src="item.cover"
        alt=""
        decoding="async"
        class="aspect-[16/9] w-full object-cover"
        :class="item.state === 'locked' ? 'opacity-70 grayscale' : ''"
      />
      <div v-else class="flex aspect-[16/9] w-full items-center justify-center">
        <RocketLaunchIcon class="h-10 w-10 text-navy-700/40" aria-hidden="true" />
      </div>
      <span
        class="absolute bottom-2 left-2 inline-flex items-center gap-1.5 rounded-full bg-white py-1 pl-1 pr-3 text-sm font-semibold shadow"
      >
        <MissionMapStateIcon :state="item.state" size="sm" />
        {{ item.stateLabel }}
      </span>
    </div>

    <div>
      <p class="text-xs font-semibold uppercase tracking-wide text-navy-700/70">
        {{ t('common.mission_map.step', { n: item.step }) }}
      </p>
      <h3
        v-if="!hideTitle"
        :id="titleId"
        tabindex="-1"
        class="text-xl font-bold leading-tight focus:outline-none"
      >
        {{ item.title }}
      </h3>
    </div>

    <!-- Rareza, enigmas y recompensas: icono y número, como en el detalle. -->
    <MissionSummaryMeta
      :rarity="item.rarity"
      :enigmas-count="item.enigmas"
      :xp="item.rewards.xp"
      :coins="item.rewards.coins"
      :mana="item.rewards.mana"
    />

    <!-- Alumnado: su avance en la misión. -->
    <div v-if="item.progress">
      <p class="mb-1 flex items-baseline justify-between gap-2 text-sm">
        <span class="font-semibold">{{ t('common.mission_map.detail.your_progress') }}</span>
        <span class="text-navy-700/70">
          {{
            t(
              'common.mission_map.detail.enigmas_done',
              { done: item.progress.done, total: item.progress.total },
              item.progress.total
            )
          }}
        </span>
      </p>
      <ProgressBar :percentage="item.progress.percent" :label="`${item.progress.percent} %`" />
    </div>

    <!-- Profesorado: cuántas personas la han completado. -->
    <div v-if="item.completed">
      <p class="mb-1 flex items-center gap-1.5 text-sm font-semibold">
        <UsersIcon class="h-4 w-4 text-navy-700/70" aria-hidden="true" />
        {{ item.completed.text }}
      </p>
      <ProgressBar
        :percentage="completedPercent"
        :label="`${item.completed.done}/${item.completed.total}`"
      />
    </div>

    <p v-if="item.deadline" class="flex items-center gap-1.5 text-sm">
      <CalendarDaysIcon class="h-4 w-4 text-navy-700/70" aria-hidden="true" />
      {{ t('common.mission_map.detail.deadline', { date: item.deadline }) }}
    </p>

    <!-- El camino: lo que la abre y lo que abre ella. Cada misión lleva al
         mapa: el foco va a su medallón. -->
    <MissionMapDetailLinks
      v-if="item.requires.length > 0"
      :heading="
        mode === 'teacher'
          ? t('common.mission_map.detail.requires_teacher')
          : t('common.mission_map.detail.requires')
      "
      :missions="item.requires"
      @go="id => emit('go', id)"
    />
    <MissionMapDetailLinks
      v-if="item.unlocks.length > 0"
      :heading="t('common.mission_map.detail.unlocks')"
      :missions="item.unlocks"
      @go="id => emit('go', id)"
    />

    <!-- Cerrada por su docente: el motivo, sin botón. -->
    <InfoNote v-if="item.lockedNote">{{ item.lockedNote }}</InfoNote>

    <Button
      v-if="item.href && item.actionLabel"
      :to="item.href"
      variant="primary"
      full-width
      :icon-right="ArrowRightIcon"
    >
      {{ item.actionLabel }}
    </Button>
  </div>
</template>

<script setup lang="ts">
import { ArrowRightIcon, CalendarDaysIcon, UsersIcon } from '@heroicons/vue/24/outline'
import { RocketLaunchIcon } from '@heroicons/vue/24/solid'
import type { MissionMapItem } from '~/utils/mission-map'

/**
 * El detalle de una misión del mapa de misiones: la portada, el estado, la
 * rareza y lo que da, el avance (del estudiante o de la clase), la fecha
 * límite, lo que la abre y lo que abre, y el botón para entrar. Una cerrada no
 * tiene botón: en su lugar va el motivo (su docente o lo que falta completar).
 *
 * Lo usa MissionMap.vue dentro del panel de al lado y de la hoja inferior del
 * móvil; en la hoja el título va en la cabecera de la ventana (`hideTitle`).
 */
const props = defineProps<{
  item: MissionMapItem
  mode: 'student' | 'teacher'
  /** El título ya está fuera (la cabecera de la ventana). */
  hideTitle?: boolean
  /** Id del título, para nombrar el panel. */
  titleId?: string
}>()

const emit = defineEmits<{ go: [id: string] }>()

const { t } = useI18n()

const completedPercent = computed(() => {
  const completed = props.item.completed
  if (!completed || completed.total === 0) return 0
  return Math.round((completed.done / completed.total) * 100)
})
</script>
