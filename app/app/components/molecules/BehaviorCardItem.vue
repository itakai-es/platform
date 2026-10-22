<template>
  <div
    class="group relative flex flex-col rounded-2xl bg-white p-5 shadow-sm transition-shadow duration-200 hover:shadow-md focus-within:shadow-md"
  >
    <!-- Botón editar (esquina superior derecha). Encima del botón de aplicar,
         que ocupa toda la tarjeta; visible también al llegar con el teclado. -->
    <button
      v-if="!props.readonly"
      type="button"
      class="absolute right-3 top-3 z-10 rounded-full p-1.5 text-navy-700/50 opacity-0 transition-opacity hover:bg-gray-100 hover:text-navy-700 focus-visible:opacity-100 group-hover:opacity-100"
      :title="t('teacher.classes.detail.behaviors.edit_aria')"
      :aria-label="`${t('teacher.classes.detail.behaviors.edit_aria')}: ${behavior.name}`"
      @click.stop="$emit('edit')"
    >
      <PencilIcon class="h-4 w-4" />
    </button>

    <!-- Cabecera: icono (positivo/negativo) + título -->
    <div class="flex items-center gap-3 pr-6">
      <span
        class="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full"
        :class="isPositive ? 'bg-navy-700' : 'bg-red'"
      >
        <HandThumbUpIcon v-if="isPositive" class="h-5 w-5 text-white" />
        <HandThumbDownIcon v-else class="h-5 w-5 text-white" />
      </span>
      <h3 class="min-w-0 flex-1 font-bold text-navy-700 leading-snug">
        <!-- Aplicar: un botón de verdad, estirado a toda la tarjeta. -->
        <button
          v-if="canApply"
          type="button"
          class="text-left after:absolute after:inset-0 after:rounded-2xl after:content-[''] focus-visible:outline-none focus-visible:after:ring-2 focus-visible:after:ring-navy-700"
          :aria-label="t('teacher.classes.detail.behaviors.apply_title', { name: behavior.name })"
          @click="$emit('click')"
        >
          {{ behavior.name }}
        </button>
        <template v-else>{{ behavior.name }}</template>
      </h3>
    </div>

    <p class="mt-3 flex-1 text-sm text-text-secondary">{{ behavior.description }}</p>

    <!-- Pie: impactos en recursos (con + o - según el tipo) -->
    <div class="mt-4 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm font-semibold">
      <span v-if="behavior.xp && xpEnabled" class="inline-flex items-center gap-1">
        <Tooltip :text="t('common.resources.xp')">
          <span class="inline-flex items-center gap-1">
            <XpIcon class="h-4 w-4" />
            <span :class="signClass">{{ sign }}{{ behavior.xp }}</span>
          </span>
        </Tooltip>
      </span>
      <span v-if="behavior.coins && coinsEnabled" class="inline-flex items-center gap-1">
        <Tooltip :text="t('common.resources.coins')">
          <span class="inline-flex items-center gap-1">
            <CoinIcon class="h-4 w-4" />
            <span :class="signClass">{{ sign }}{{ behavior.coins }}</span>
          </span>
        </Tooltip>
      </span>
      <span v-if="behavior.mana && manaEnabled" class="inline-flex items-center gap-1">
        <Tooltip :text="t('common.resources.mana')">
          <span class="inline-flex items-center gap-1">
            <ManaIcon class="h-4 w-4" />
            <span :class="signClass">{{ sign }}{{ behavior.mana }}</span>
          </span>
        </Tooltip>
      </span>
      <span v-if="behavior.lives && livesEnabled" class="inline-flex items-center gap-1">
        <Tooltip :text="t('common.resources.lives')">
          <span class="inline-flex items-center gap-1">
            <LifeIcon class="h-4 w-4" />
            <span :class="signClass">{{ sign }}{{ behavior.lives }}</span>
          </span>
        </Tooltip>
      </span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { HandThumbUpIcon, HandThumbDownIcon } from '@heroicons/vue/24/solid'
import { PencilIcon } from '@heroicons/vue/24/outline'
import type { BehaviorSuggestion } from '~/utils/behavior-suggestions'

const props = withDefaults(
  defineProps<{
    behavior: BehaviorSuggestion
    /** Per-class flags: hide an impact when its resource is disabled for the class. */
    xpEnabled?: boolean
    coinsEnabled?: boolean
    manaEnabled?: boolean
    livesEnabled?: boolean
    /** Solo se ve: sin editar ni aplicar. */
    readonly?: boolean
    /** Se puede aplicar a alguien (no en solo lectura ni en una clase archivada). */
    canApply?: boolean
  }>(),
  {
    xpEnabled: true,
    coinsEnabled: true,
    manaEnabled: true,
    livesEnabled: true,
    readonly: false,
    canApply: true,
  }
)
defineEmits<{ click: []; edit: [] }>()

const { t } = useI18n()

const isPositive = computed(() => props.behavior.kind === 'positive')
const sign = computed(() => (isPositive.value ? '+' : '−'))
const signClass = computed(() => (isPositive.value ? 'text-navy-700' : 'text-red'))
</script>
