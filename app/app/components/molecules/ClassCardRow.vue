<template>
  <!-- Variante en fila (vista lista) de una tarjeta de clase: miniatura a la
       izquierda y datos en línea. Presentacional; los datos ya vienen resueltos
       desde ClassCardItem. -->
  <article
    class="relative flex min-h-[6.5rem] cursor-pointer items-stretch overflow-hidden rounded-2xl bg-white shadow-lg transition-shadow duration-200 hover:shadow-xl"
    @click="$emit('click')"
  >
    <!-- Thumbnail -->
    <div class="relative w-24 xs:w-28 sm:w-44 flex-shrink-0">
      <div
        v-if="backgroundImage"
        class="absolute inset-0 bg-cover bg-center"
        :style="{ backgroundImage: `url(${backgroundImage})` }"
      />
      <div v-else class="absolute inset-0 bg-gray-100" />
      <!-- Gradiente hacia el contenido, como en la variante en cuadrícula -->
      <div class="absolute inset-0 bg-gradient-to-r from-transparent to-white/40" />
    </div>

    <!-- Content. Reserva espacio a la derecha solo si hay acciones (duplicar/
         archivar) para que el título no quede debajo de los botones. -->
    <div
      class="flex min-w-0 flex-1 flex-col justify-center gap-1.5 py-4 pl-4 sm:py-5 sm:pl-5"
      :class="hasActions ? 'pr-[5.5rem]' : 'pr-4 sm:pr-5'"
    >
      <h3 class="truncate text-base font-bold text-navy-700 sm:text-lg">{{ name }}</h3>

      <div v-if="schedule" class="flex items-center gap-1 text-sm text-text-secondary">
        <ClockIcon class="h-4 w-4 flex-shrink-0" />
        <span class="truncate">{{ schedule }}</span>
      </div>

      <div class="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-text-secondary">
        <span class="flex items-center gap-1">
          <UserGroupIcon class="h-4 w-4" />
          {{ (studentCount ?? 0).toLocaleString('es-ES') }} estudiantes
        </span>
        <span v-if="missionsCount !== undefined" class="flex items-center gap-1">
          <RocketLaunchIcon class="h-4 w-4" />
          {{ missionsCount }} misiones
        </span>
      </div>

      <!-- Vidas, monedas y maná del alumno en esta clase -->
      <div
        v-if="lives !== undefined || coins !== undefined || mana !== undefined"
        class="flex items-center gap-3 text-sm font-semibold text-navy-700"
      >
        <Tooltip v-if="lives !== undefined" :text="t('common.resources.lives')">
          <span class="flex items-center gap-1.5">
            <LifeIcon class="h-4 w-4" />
            {{ lives.toLocaleString('es-ES') }}
          </span>
        </Tooltip>
        <Tooltip v-if="coins !== undefined" :text="t('common.resources.coins')">
          <span class="flex items-center gap-1.5">
            <CoinIcon class="h-4 w-4" />
            {{ coins.toLocaleString('es-ES') }}
          </span>
        </Tooltip>
        <Tooltip v-if="mana !== undefined" :text="t('common.resources.mana')">
          <span class="flex items-center gap-1.5">
            <ManaIcon class="h-4 w-4" />
            {{ mana.toLocaleString('es-ES') }}
          </span>
        </Tooltip>
      </div>
    </div>
  </article>
</template>

<script setup lang="ts">
import { ClockIcon, UserGroupIcon, RocketLaunchIcon } from '@heroicons/vue/24/outline'

defineProps<{
  name: string
  backgroundImage?: string
  studentCount?: number
  missionsCount?: number
  schedule?: string
  coins?: number
  mana?: number
  lives?: number
  // Reserva espacio a la derecha para las acciones flotantes (duplicar/archivar).
  hasActions?: boolean
}>()

defineEmits<{ click: [] }>()

const { t } = useI18n()
</script>
