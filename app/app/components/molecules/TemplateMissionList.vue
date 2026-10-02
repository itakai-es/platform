<template>
  <EmptyState
    v-if="missions.length === 0"
    :icon="RocketLaunchIcon"
    :title="t('teacher.templates.preview.no_missions_title')"
    :description="t('teacher.templates.preview.no_missions_description')"
  />
  <ul v-else class="space-y-3">
    <!-- Sin ids en la ficha pública: la clave es su sitio en la lista -->
    <li
      v-for="(mission, index) in missions"
      :key="index"
      class="flex items-center gap-3 rounded-2xl bg-white p-4 shadow-sm"
    >
      <span
        class="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-navy-700/5 text-navy-700"
        aria-hidden="true"
      >
        <RocketLaunchIcon class="h-5 w-5" />
      </span>
      <div class="min-w-0 flex-1">
        <p class="break-words font-semibold leading-tight text-navy-700">{{ mission.title }}</p>
        <MissionSummaryMeta
          class="mt-1.5"
          :rarity="mission.rarity"
          :enigmas-count="mission.enigmasCount"
          :xp="mission.xpReward"
          :coins="mission.coinReward"
          :mana="mission.manaReward"
        />
      </div>
    </li>
  </ul>
</template>

<script setup lang="ts">
import { RocketLaunchIcon } from '@heroicons/vue/24/outline'
import type { TemplateMission } from '~/types/template.types'

/**
 * Las misiones de una plantilla: el título, la rareza, cuántos enigmas tiene y
 * lo que da cada una, solo de los recursos que la plantilla lleva encendidos
 * (la API manda a 0 los demás). Nada de su descripción, sus enigmas, sus
 * documentos ni su insignia. Es la misma pieza en la previsualización del
 * profesorado y en la ficha pública.
 */

defineProps<{ missions: TemplateMission[] }>()

const { t } = useI18n()
</script>
