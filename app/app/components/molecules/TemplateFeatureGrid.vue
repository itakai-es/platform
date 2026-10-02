<template>
  <div class="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:grid-flow-col sm:grid-rows-[repeat(5,auto)]">
    <div
      v-for="flag in orderedFlags"
      :key="flag"
      class="flex items-center gap-3 rounded-2xl bg-white p-4 shadow-sm"
    >
      <!-- Apagada, solo el icono va en tenue: el texto se tiene que poder leer
           igual, y lo que dice si va encendida es la etiqueta. -->
      <span
        class="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-navy-700/5 text-navy-700"
        :class="isActive(flag) ? '' : 'opacity-50'"
        aria-hidden="true"
      >
        <component :is="featureIcons[flag]" class="h-5 w-5" />
      </span>
      <div class="min-w-0 flex-1">
        <p class="font-semibold leading-tight text-navy-700">
          {{ t(`teacher.classes.detail.settings.items.${flag}.label`, { coins: coinLabel }) }}
        </p>
        <!-- Explicación de 12 px: en el navy atenuado, que llega al contraste
             mínimo, no en el gris de los textos secundarios. -->
        <p class="mt-0.5 text-xs text-navy-700/70">
          {{ t(`teacher.classes.detail.settings.items.${flag}.desc`, { coins: coinLabel }) }}
        </p>
      </div>
      <Badge :variant="isActive(flag) ? 'success' : 'default'" size="sm" class="flex-shrink-0">
        {{
          isActive(flag)
            ? t('teacher.templates.preview.active')
            : t('teacher.templates.preview.inactive')
        }}
      </Badge>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { Component } from 'vue'
import {
  ShoppingBagIcon,
  ChartBarIcon,
  HandRaisedIcon,
  SparklesIcon,
  SpeakerWaveIcon,
} from '@heroicons/vue/24/outline'
import type { ClassSettings } from '~/types/class.types'
import CoinIcon from '~/components/atoms/CoinIcon.vue'
import ManaIcon from '~/components/atoms/ManaIcon.vue'
import XpIcon from '~/components/atoms/XpIcon.vue'
import LifeIcon from '~/components/atoms/LifeIcon.vue'

/**
 * Las funcionalidades de una plantilla: las nueve, cada una con su icono, su
 * descripción y si va activada, y las apagadas con el icono en tenue. Se
 * enseñan también las apagadas para que se entienda qué puede traer una
 * plantilla, aunque esta no lo traiga. Es la misma pieza en la pestaña
 * «Funcionalidades» de la previsualización del profesorado y en la ficha
 * pública.
 */

const props = defineProps<{
  /** Las funcionalidades ya resueltas: cada una, encendida o apagada. */
  features: ClassSettings
}>()

const { t } = useI18n()
const { coinLabel } = useCoinLabel()

const featureIcons: Record<keyof ClassSettings, Component> = {
  shop: ShoppingBagIcon,
  coins: CoinIcon,
  mana: ManaIcon,
  rankings: ChartBarIcon,
  xp: XpIcon,
  behaviors: HandRaisedIcon,
  lives: LifeIcon,
  visualEffects: SparklesIcon,
  sounds: SpeakerWaveIcon,
}

const orderedFlags: (keyof ClassSettings)[] = [
  'rankings',
  'shop',
  'behaviors',
  'visualEffects',
  'sounds',
  'xp',
  'coins',
  'mana',
  'lives',
]

function isActive(flag: keyof ClassSettings): boolean {
  return !!props.features[flag]
}
</script>
