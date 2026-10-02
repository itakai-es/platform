<template>
  <EmptyState
    v-if="behaviors.length === 0"
    :icon="HandRaisedIcon"
    :title="t('teacher.templates.preview.no_behaviors_title')"
    :description="t('teacher.templates.preview.no_behaviors_description')"
  />
  <div v-else class="space-y-4">
    <!-- Apagados, se copian igual: se dice aquí, como en los contadores -->
    <InfoNote v-if="!features.behaviors">
      {{ t('teacher.templates.preview.behaviors_off') }}
    </InfoNote>

    <ul class="space-y-3">
      <!-- Sin ids en la ficha pública: la clave es su sitio en la lista -->
      <li
        v-for="(behavior, index) in rows"
        :key="index"
        class="flex items-center gap-3 rounded-2xl bg-white p-4 shadow-sm"
      >
        <span
          class="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full"
          :class="behavior.kind === 'positive' ? 'bg-navy-700' : 'bg-red'"
          aria-hidden="true"
        >
          <HandThumbUpIcon v-if="behavior.kind === 'positive'" class="h-5 w-5 text-white" />
          <HandThumbDownIcon v-else class="h-5 w-5 text-white" />
        </span>
        <!-- En el móvil, los efectos bajan bajo el nombre: a su lado lo dejarían
             en nada. -->
        <div class="min-w-0 flex-1 sm:flex sm:items-center sm:gap-3">
          <div class="min-w-0 flex-1">
            <p class="break-words font-semibold leading-tight text-navy-700">
              <span class="sr-only">{{ kindLabel(behavior) }}:</span>
              {{ behavior.name }}
            </p>
            <p v-if="behavior.description" class="mt-0.5 line-clamp-2 text-xs text-navy-700/70">
              {{ behavior.description }}
            </p>
          </div>
          <div
            v-if="behavior.effects.length"
            class="mt-2 flex flex-shrink-0 items-center gap-3 text-sm font-semibold sm:mt-0"
            :class="behavior.kind === 'positive' ? 'text-navy-700' : 'text-red'"
          >
            <span
              v-for="effect in behavior.effects"
              :key="effect.key"
              class="inline-flex items-center gap-1"
            >
              <component :is="effect.icon" class="h-4 w-4" aria-hidden="true" />
              <span class="sr-only">{{ effect.label }}</span>
              {{ behavior.kind === 'positive' ? '+' : '−' }}{{ effect.amount }}
            </span>
          </div>
        </div>
      </li>
    </ul>
  </div>
</template>

<script setup lang="ts">
import { HandRaisedIcon } from '@heroicons/vue/24/outline'
import { HandThumbUpIcon, HandThumbDownIcon } from '@heroicons/vue/24/solid'
import type { ClassSettings } from '~/types/class.types'
import type { TemplateBehavior } from '~/types/template.types'
import CoinIcon from '~/components/atoms/CoinIcon.vue'
import XpIcon from '~/components/atoms/XpIcon.vue'
import LifeIcon from '~/components/atoms/LifeIcon.vue'

/**
 * Los comportamientos de una plantilla: si es positivo o negativo, su nombre,
 * su descripción y lo que da o quita de XP, monedas y vidas. Los efectos se
 * guardan sin signo y el signo lo pone el tipo, como en la clase; y, como allí,
 * no salen los de los recursos que la plantilla lleva apagados. Es la misma
 * pieza en la previsualización del profesorado y en la ficha pública.
 */

const props = defineProps<{
  behaviors: TemplateBehavior[]
  /** Las funcionalidades de la plantilla, ya resueltas. */
  features: ClassSettings
}>()

const { t } = useI18n()

function kindLabel(behavior: TemplateBehavior) {
  return behavior.kind === 'positive'
    ? t('teacher.classes.detail.behaviors.type_positive')
    : t('teacher.classes.detail.behaviors.type_negative')
}

/** Cada comportamiento con sus efectos: los de recursos encendidos y distintos de 0. */
const rows = computed(() => {
  const { xp, coins, lives } = props.features
  return props.behaviors.map(behavior => ({
    ...behavior,
    effects: [
      {
        key: 'xp',
        icon: XpIcon,
        label: t('common.resources.xp'),
        amount: xp ? behavior.xpDelta : 0,
      },
      {
        key: 'coins',
        icon: CoinIcon,
        label: t('common.resources.coins'),
        amount: coins ? behavior.coinDelta : 0,
      },
      {
        key: 'lives',
        icon: LifeIcon,
        label: t('common.resources.lives'),
        amount: lives ? behavior.lifeDelta : 0,
      },
    ].filter(effect => effect.amount > 0),
  }))
})
</script>
