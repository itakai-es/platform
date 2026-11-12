<template>
  <!-- Cifras de una tarjeta de clase, en sus dos variantes (cuadrícula y fila):
       estudiantes y misiones o, en la vista del alumno, «4 de 7 misiones» y sus
       vidas, monedas y maná en la clase. Dos bloques: quien la usa decide el
       espacio entre ellos. -->
  <div class="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-navy-700/80">
    <span v-if="progress" class="flex items-center gap-1">
      <RocketLaunchIcon class="h-4 w-4" aria-hidden="true" />
      {{ progressText }}
    </span>
    <template v-else>
      <span class="flex items-center gap-1">
        <UserGroupIcon class="h-4 w-4" aria-hidden="true" />
        {{ t('common.class_card.students', { count: formatNumber(students) }, students) }}
      </span>
      <span v-if="missionsCount !== undefined" class="flex items-center gap-1">
        <RocketLaunchIcon class="h-4 w-4" aria-hidden="true" />
        {{ t('common.class_card.missions', { count: formatNumber(missionsCount) }, missionsCount) }}
      </span>
    </template>
  </div>
  <div
    v-if="lives !== undefined || coins !== undefined || mana !== undefined"
    class="flex items-center gap-3 text-sm font-semibold text-navy-700"
  >
    <Tooltip v-if="lives !== undefined" :text="t('common.resources.lives')">
      <span class="flex items-center gap-1.5">
        <LifeIcon class="h-4 w-4" />
        <span class="sr-only">{{ t('common.resources.lives') }}:</span>
        {{ formatNumber(lives) }}
      </span>
    </Tooltip>
    <Tooltip v-if="coins !== undefined" :text="t('common.resources.coins')">
      <span class="flex items-center gap-1.5">
        <CoinIcon class="h-4 w-4" />
        <span class="sr-only">{{ t('common.resources.coins') }}:</span>
        {{ formatNumber(coins) }}
      </span>
    </Tooltip>
    <Tooltip v-if="mana !== undefined" :text="t('common.resources.mana')">
      <span class="flex items-center gap-1.5">
        <ManaIcon class="h-4 w-4" />
        <span class="sr-only">{{ t('common.resources.mana') }}:</span>
        {{ formatNumber(mana) }}
      </span>
    </Tooltip>
  </div>
</template>

<script setup lang="ts">
import { UserGroupIcon, RocketLaunchIcon } from '@heroicons/vue/24/outline'

const props = defineProps<{
  studentCount?: number
  missionsCount?: number
  /** Lo suyo en la clase (vista del alumno): «4 de 7 misiones», en vez de los recuentos. */
  progress?: { done: number; total: number }
  coins?: number
  mana?: number
  lives?: number
}>()

const { t } = useI18n()
const { formatNumber } = useNumberFormat()

const students = computed(() => props.studentCount ?? 0)

/** «4 de 7 misiones»; sin ninguna que cuente, «Sin misiones», no «0 de 0». */
const progressText = computed(() => {
  const { done = 0, total = 0 } = props.progress ?? {}
  return total === 0
    ? t('common.class_card.missions', { count: 0 }, 0)
    : t(
        'common.progress.missions_of',
        { done: formatNumber(done), total: formatNumber(total) },
        total
      )
})
</script>
