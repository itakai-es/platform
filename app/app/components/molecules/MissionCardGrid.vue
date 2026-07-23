<template>
  <!-- Card wrapper -->
  <div class="transition-shadow duration-200 hover:shadow-xl rounded-2xl overflow-hidden shadow-sm">
    <article
      class="relative flex flex-col cursor-pointer bg-white h-full"
      role="article"
      @click="handleCardClick"
    >
      <!-- Full card link for student mode. Las expiradas sí se pueden abrir (solo
           lectura); solo las bloqueadas quedan sin enlace. -->
      <NuxtLink
        v-if="!isTeacherMode && status !== 'bloqueada'"
        :to="missionLink"
        class="absolute inset-0 z-20"
      />

      <!-- Image area -->
      <div class="relative w-full h-[200px]">
        <div
          class="absolute inset-0 bg-cover bg-center transition-all"
          :style="resolvedBgImage ? { backgroundImage: `url(${resolvedBgImage})` } : {}"
          :class="[
            !resolvedBgImage ? 'bg-gray-100' : '',
            status === 'bloqueada' && !isTeacherMode ? 'blur-md' : '',
          ]"
        />

        <!-- Dark overlay for blocked status (students only) -->
        <div
          v-if="status === 'bloqueada' && !isTeacherMode"
          class="absolute inset-0 bg-gray-700/50"
        />

        <!-- Blocked overlay (students only) -->
        <div
          v-if="!isTeacherMode && status === 'bloqueada'"
          class="absolute inset-0 flex items-center justify-center"
        >
          <div
            class="w-12 h-12 rounded-full flex items-center justify-center shadow-lg bg-gray-400/80"
          >
            <LockClosedIcon class="w-6 h-6 text-white" />
          </div>
        </div>

        <!-- Badges - positioned at bottom of image, overlapping the boundary -->
        <div
          class="absolute bottom-0 left-3 right-3 translate-y-1/2 z-20 flex flex-wrap items-center gap-1.5"
        >
          <StatusBadge v-if="showStatusBadge" :variant="status" size="sm">
            {{ statusLabel }}
          </StatusBadge>
          <RarityBadge v-if="rarity" :rarity="rarity" size="sm" />
        </div>
      </div>

      <!-- Content area - white background -->
      <div class="flex flex-col p-3 pt-5 bg-white flex-1">
        <!-- Title row with status badge on the right -->
        <div class="flex items-start gap-2">
          <h3 class="text-base font-bold text-navy-700 line-clamp-2 flex-1">{{ title }}</h3>

          <!-- Status indicator badge -->
          <div class="flex-shrink-0">
            <!-- Completed check badge -->
            <div
              v-if="status === 'completada' || isFullyCompletedTeacher"
              class="w-7 h-7 rounded-full flex items-center justify-center bg-[#6cf3af]"
            >
              <CheckIcon class="w-4 h-4 text-white" />
            </div>
            <!-- Expired badge -->
            <div
              v-else-if="status === 'expirada'"
              class="w-7 h-7 rounded-full flex items-center justify-center bg-gray-500"
            >
              <XCircleIcon class="w-4 h-4 text-white" />
            </div>
            <!-- Progress percentage badge -->
            <div
              v-else-if="status !== 'bloqueada'"
              class="px-2 py-0.5 rounded-full text-xs font-bold text-navy-700 bg-gray-100"
            >
              {{ progressValue }}%
            </div>
          </div>
        </div>

        <!-- Class name -->
        <p v-if="className" class="text-sm text-text-secondary mt-1">{{ className }}</p>

        <!-- Rewards row (plain icon + number, like mission detail) -->
        <div
          v-if="xpReward || coinReward || manaReward"
          class="relative z-30 mt-2 flex items-center gap-3 text-sm font-semibold text-navy-700"
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
        </div>

        <!-- Meta info -->
        <div class="flex flex-wrap items-center gap-2 text-xs text-text-secondary mt-2">
          <div v-if="isTeacherMode" class="flex items-center gap-1">
            <UsersIcon class="w-3.5 h-3.5" />
            <span>{{ completedCount }}/{{ totalStudents }}</span>
          </div>
          <div v-if="isTeacherMode && deadline" class="flex items-center gap-1">
            <ClockIcon class="w-3.5 h-3.5" />
            <span>{{ formattedDeadline }}</span>
          </div>
          <div
            v-if="
              !isTeacherMode &&
              status !== 'completada' &&
              status !== 'bloqueada' &&
              status !== 'expirada' &&
              (timeRemaining || deadline)
            "
            class="flex items-center gap-1"
          >
            <ClockIcon class="w-3.5 h-3.5" />
            <span>{{ timeRemaining || formattedDeadline }}</span>
          </div>
          <div
            v-if="!isTeacherMode && deadline && status === 'expirada'"
            class="flex items-center gap-1 text-gray-500"
          >
            <ClockIcon class="w-3.5 h-3.5" />
            <span>Venció: {{ formattedDeadline }}</span>
          </div>
        </div>
      </div>

      <!-- Progress bar at bottom -->
      <div class="h-1.5 bg-gray-200">
        <div
          class="h-full transition-all duration-300"
          :style="{ width: `${progressValue}%`, backgroundColor: progressBarColor }"
        />
      </div>
    </article>
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
.line-clamp-2 {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
</style>
