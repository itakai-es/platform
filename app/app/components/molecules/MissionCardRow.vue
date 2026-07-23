<template>
  <!-- Variante en fila (vista lista): miniatura a la izquierda, datos en línea.
       Comparte toda la lógica con la variante en cuadrícula vía useMissionCard. -->
  <div
    class="transition-shadow duration-200 hover:shadow-xl rounded-2xl overflow-hidden shadow-sm bg-white"
  >
    <article
      class="relative flex min-h-[6.5rem] cursor-pointer items-stretch"
      role="article"
      @click="handleCardClick"
    >
      <!-- Full card link for student mode (bloqueadas sin enlace) -->
      <NuxtLink
        v-if="!isTeacherMode && status !== 'bloqueada'"
        :to="missionLink"
        class="absolute inset-0 z-20"
      />

      <!-- Thumbnail -->
      <div class="relative w-24 xs:w-28 sm:w-40 flex-shrink-0">
        <div
          class="absolute inset-0 bg-cover bg-center"
          :style="resolvedBgImage ? { backgroundImage: `url(${resolvedBgImage})` } : {}"
          :class="[
            !resolvedBgImage ? 'bg-gray-100' : '',
            status === 'bloqueada' && !isTeacherMode ? 'blur-md' : '',
          ]"
        />
        <!-- Blocked overlay (students only) -->
        <div
          v-if="!isTeacherMode && status === 'bloqueada'"
          class="absolute inset-0 flex items-center justify-center bg-gray-700/50"
        >
          <div
            class="w-10 h-10 rounded-full flex items-center justify-center shadow-lg bg-gray-400/80"
          >
            <LockClosedIcon class="w-5 h-5 text-white" />
          </div>
        </div>
      </div>

      <!-- Content -->
      <div class="flex min-w-0 flex-1 flex-col justify-center gap-1 p-3 sm:p-4">
        <!-- Badges row -->
        <div v-if="showStatusBadge || rarity" class="flex flex-wrap items-center gap-1.5">
          <StatusBadge v-if="showStatusBadge" :variant="status" size="sm">
            {{ statusLabel }}
          </StatusBadge>
          <RarityBadge v-if="rarity" :rarity="rarity" size="sm" />
        </div>

        <!-- Title + status indicator -->
        <div class="flex items-start gap-2">
          <h3 class="text-base font-bold text-navy-700 line-clamp-1 flex-1">{{ title }}</h3>

          <div class="flex-shrink-0">
            <div
              v-if="status === 'completada' || isFullyCompletedTeacher"
              class="w-7 h-7 rounded-full flex items-center justify-center bg-[#6cf3af]"
            >
              <CheckIcon class="w-4 h-4 text-white" />
            </div>
            <div
              v-else-if="status === 'expirada'"
              class="w-7 h-7 rounded-full flex items-center justify-center bg-gray-500"
            >
              <XCircleIcon class="w-4 h-4 text-white" />
            </div>
            <div
              v-else-if="status !== 'bloqueada'"
              class="px-2 py-0.5 rounded-full text-xs font-bold text-navy-700 bg-gray-100"
            >
              {{ progressValue }}%
            </div>
          </div>
        </div>

        <!-- Class name -->
        <p v-if="className" class="text-sm text-text-secondary truncate">{{ className }}</p>

        <!-- Rewards + meta in a single wrapping row -->
        <div
          class="relative z-30 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm font-semibold text-navy-700"
        >
          <Tooltip v-if="xpReward" :text="t('common.resources.xp')">
            <span class="inline-flex items-center gap-1">
              <XpIcon class="w-4 h-4" />
              <template v-if="showEarnedXp">
                <span class="font-bold">{{ earnedXp!.toLocaleString('es-ES') }}</span>
                <span class="opacity-60">/ {{ xpReward.toLocaleString('es-ES') }}</span>
              </template>
              <template v-else>{{ xpReward.toLocaleString('es-ES') }}</template>
            </span>
          </Tooltip>
          <Tooltip v-if="coinReward" :text="t('common.resources.coins')">
            <span class="inline-flex items-center gap-1">
              <CoinIcon class="w-4 h-4" />
              <template v-if="showEarnedCoins">
                <span class="font-bold">{{ earnedCoins!.toLocaleString('es-ES') }}</span>
                <span class="opacity-60">/ {{ coinReward.toLocaleString('es-ES') }}</span>
              </template>
              <template v-else>{{ coinReward.toLocaleString('es-ES') }}</template>
            </span>
          </Tooltip>
          <Tooltip v-if="manaReward" :text="t('common.resources.mana')">
            <span class="inline-flex items-center gap-1">
              <ManaIcon class="w-4 h-4" />
              <template v-if="showEarnedMana">
                <span class="font-bold">{{ earnedMana!.toLocaleString('es-ES') }}</span>
                <span class="opacity-60">/ {{ manaReward.toLocaleString('es-ES') }}</span>
              </template>
              <template v-else>{{ manaReward.toLocaleString('es-ES') }}</template>
            </span>
          </Tooltip>

          <!-- Meta (teacher completion / deadlines) -->
          <span
            v-if="isTeacherMode"
            class="inline-flex items-center gap-1 font-normal text-xs text-text-secondary"
          >
            <UsersIcon class="w-3.5 h-3.5" />
            {{ completedCount }}/{{ totalStudents }}
          </span>
          <span
            v-if="isTeacherMode && deadline"
            class="inline-flex items-center gap-1 font-normal text-xs text-text-secondary"
          >
            <ClockIcon class="w-3.5 h-3.5" />
            {{ formattedDeadline }}
          </span>
          <span
            v-if="
              !isTeacherMode &&
              status !== 'completada' &&
              status !== 'bloqueada' &&
              status !== 'expirada' &&
              (timeRemaining || deadline)
            "
            class="inline-flex items-center gap-1 font-normal text-xs text-text-secondary"
          >
            <ClockIcon class="w-3.5 h-3.5" />
            {{ timeRemaining || formattedDeadline }}
          </span>
          <span
            v-if="!isTeacherMode && deadline && status === 'expirada'"
            class="inline-flex items-center gap-1 font-normal text-xs text-gray-500"
          >
            <ClockIcon class="w-3.5 h-3.5" />
            Venció: {{ formattedDeadline }}
          </span>
        </div>
      </div>
    </article>

    <!-- Progress bar at bottom -->
    <div class="h-1.5 bg-gray-200">
      <div
        class="h-full transition-all duration-300"
        :style="{ width: `${progressValue}%`, backgroundColor: progressBarColor }"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ClockIcon, CheckIcon, LockClosedIcon, UsersIcon, XCircleIcon } from '@heroicons/vue/24/solid'
import { useMissionCard, type MissionCardProps } from '~/composables/useMissionCard'

const props = defineProps<MissionCardProps>()
const emit = defineEmits<{ click: [] }>()

const {
  t,
  resolvedBgImage,
  isTeacherMode,
  showEarnedXp,
  showEarnedCoins,
  showEarnedMana,
  formattedDeadline,
  isFullyCompletedTeacher,
  progressValue,
  missionLink,
  statusLabel,
  showStatusBadge,
  progressBarColor,
  handleCardClick,
} = useMissionCard(props, emit)
</script>

<style scoped>
.line-clamp-1 {
  display: -webkit-box;
  -webkit-line-clamp: 1;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
</style>
