<template>
  <div class="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:grid-flow-col sm:grid-rows-[repeat(5,auto)]">
    <ClassFeatureRow
      v-for="flag in orderedFlags"
      :key="flag"
      :icon="featureIcons[flag]"
      :label="t(`teacher.classes.detail.settings.items.${flag}.label`, { coins: coinLabel })"
      :description="t(`teacher.classes.detail.settings.items.${flag}.desc`, { coins: coinLabel })"
      :dim-icon="!isActive(flag)"
    >
      <template #action>
        <Badge :variant="isActive(flag) ? 'success' : 'default'" size="sm">
          {{
            isActive(flag)
              ? t('teacher.templates.preview.active')
              : t('teacher.templates.preview.inactive')
          }}
        </Badge>
      </template>
    </ClassFeatureRow>
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
import type { TemplateFeature, TemplateFeatures } from '~/types/class.types'
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
 * pública. Las que están en pruebas (el mapa de misiones) no salen.
 */

const props = defineProps<{
  /** Las funcionalidades ya resueltas: cada una, encendida o apagada. */
  features: TemplateFeatures
}>()

const { t } = useI18n()
const { coinLabel } = useCoinLabel()

const featureIcons: Record<TemplateFeature, Component> = {
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

const orderedFlags: TemplateFeature[] = [
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

function isActive(flag: TemplateFeature): boolean {
  return !!props.features[flag]
}
</script>
