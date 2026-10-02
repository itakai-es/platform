<template>
  <EmptyState
    v-if="items.length === 0"
    :icon="ShoppingBagIcon"
    :title="t('teacher.templates.preview.no_shop_title')"
    :description="t('teacher.templates.preview.no_shop_description')"
  />
  <div v-else class="space-y-4">
    <!-- Apagada, sus objetos se copian igual: se dice aquí, como en los contadores -->
    <InfoNote v-if="!features.shop">{{ t('teacher.templates.preview.shop_off') }}</InfoNote>

    <ul class="grid grid-cols-1 gap-3 sm:grid-cols-2">
      <!-- Sin ids en la ficha pública: la clave es su sitio en la lista -->
      <li
        v-for="(item, index) in items"
        :key="index"
        class="flex items-start gap-3 rounded-2xl bg-white p-4 shadow-sm"
      >
        <!-- Oculto, solo el icono va en tenue, como una funcionalidad apagada:
             lo que lo dice es la etiqueta. -->
        <span
          class="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full"
          :class="[
            item.kind === 'power' ? 'bg-purple/10 text-purple' : 'bg-yellow/10 text-yellow-active',
            item.active ? '' : 'opacity-50',
          ]"
          aria-hidden="true"
        >
          <BoltIcon v-if="item.kind === 'power'" class="h-5 w-5" />
          <GiftIcon v-else class="h-5 w-5" />
        </span>
        <div class="min-w-0 flex-1">
          <!-- Las mismas etiquetas que en la tienda de la clase: «Oculto» prima -->
          <div class="flex flex-wrap items-center gap-x-2 gap-y-1">
            <p class="min-w-0 break-words font-semibold leading-tight text-navy-700">
              {{ item.name }}
            </p>
            <Badge v-if="!item.active" size="sm">
              {{ t('teacher.templates.preview.hidden') }}
            </Badge>
            <Badge v-else-if="item.kind === 'power' && !features.mana" variant="warning" size="sm">
              {{ t('teacher.classes.detail.shop.mana_disabled_chip') }}
            </Badge>
          </div>
          <p v-if="item.description" class="mt-0.5 line-clamp-2 text-xs text-navy-700/70">
            {{ item.description }}
          </p>
          <!-- Qué es, en su línea; debajo, lo que cuesta y lo que devuelve -->
          <p class="mt-1.5 text-xs text-navy-700/70">
            {{ kindLabel(item) }} · {{ usageLabel(item) }}
          </p>
          <div
            class="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm font-medium text-navy-700"
          >
            <span class="inline-flex items-center gap-1">
              <CoinIcon class="h-4 w-4" aria-hidden="true" />
              <span class="sr-only">{{ t('common.resources.coins') }}</span>
              {{ item.price }}
            </span>
            <span
              v-if="item.kind === 'power' && item.manaCost > 0"
              class="inline-flex items-center gap-1"
            >
              <ManaIcon class="h-4 w-4" aria-hidden="true" />
              <span class="sr-only">{{ t('common.resources.mana') }}</span>
              {{ item.manaCost }}
            </span>
            <span v-if="item.lifeRestore > 0" class="inline-flex items-center gap-1">
              <LifeIcon class="h-4 w-4" aria-hidden="true" />
              <span class="sr-only">{{ t('common.resources.lives') }}</span>
              +{{ item.lifeRestore }}
            </span>
          </div>
        </div>
      </li>
    </ul>
  </div>
</template>

<script setup lang="ts">
import { ShoppingBagIcon, BoltIcon, GiftIcon } from '@heroicons/vue/24/outline'
import type { ClassSettings } from '~/types/class.types'
import type { TemplateShopItem } from '~/types/template.types'
import CoinIcon from '~/components/atoms/CoinIcon.vue'
import ManaIcon from '~/components/atoms/ManaIcon.vue'
import LifeIcon from '~/components/atoms/LifeIcon.vue'

/**
 * La tienda de una plantilla: de cada objeto, su nombre y su descripción, su
 * precio y lo que hace (recompensa o poder, de un solo uso o ilimitado, el
 * maná que gasta un poder al usarlo y la vida que devuelve). Lleva las mismas
 * etiquetas que la tienda de la clase: los ocultos al alumnado, que llegan
 * ocultos, y los poderes de una plantilla con el maná apagado. Es la misma
 * pieza en la previsualización del profesorado y en la ficha pública.
 */

defineProps<{
  items: TemplateShopItem[]
  /** Las funcionalidades de la plantilla, ya resueltas. */
  features: ClassSettings
}>()

const { t } = useI18n()

function kindLabel(item: TemplateShopItem) {
  return item.kind === 'power'
    ? t('teacher.classes.detail.shop.type_power')
    : t('teacher.classes.detail.shop.type_reward')
}

function usageLabel(item: TemplateShopItem) {
  return item.usage === 'unlimited'
    ? t('teacher.classes.detail.shop.usage_unlimited')
    : t('teacher.classes.detail.shop.usage_single')
}
</script>
