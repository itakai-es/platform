<template>
  <article
    class="relative rounded-2xl overflow-hidden min-h-[280px] md:min-h-[200px] shadow-lg transition-all duration-200 hover:shadow-xl flex flex-col md:flex-row cursor-pointer"
    :class="cardRingClass"
    @click="$emit('click')"
  >
    <!-- Left content area (white background) - Order 2 on mobile so image shows first -->
    <div class="flex-1 flex flex-col justify-between p-6 bg-white z-10 order-2 md:order-1 min-w-0">
      <!-- Top: Badge and subtitle -->
      <div>
        <div v-if="badgeVariant || subtitle" class="flex items-center gap-2 mb-2">
          <StatusBadge v-if="badgeVariant && badgeText" :variant="badgeVariant">{{
            badgeText
          }}</StatusBadge>
          <span v-if="subtitle" class="text-xs text-text-secondary">{{ subtitle }}</span>
        </div>

        <!-- Title -->
        <h3 class="text-lg md:text-xl font-bold text-navy-700 leading-tight min-w-0 mb-2">
          {{ name }}
        </h3>

        <!-- Schedule (below title, teacher-written content) -->
        <div v-if="schedule" class="flex items-center gap-1 text-sm text-text-secondary mb-3">
          <ClockIcon class="w-4 h-4 flex-shrink-0" />
          <span>{{ schedule }}</span>
        </div>
      </div>

      <!-- Middle: Missions list (only shown if there are activities) -->
      <div v-if="recentActivities && recentActivities.length > 0" class="flex-1 mb-3 min-w-0">
        <div class="space-y-1.5">
          <div
            v-for="activity in recentActivities.slice(0, 4)"
            :key="activity.id"
            class="flex items-center gap-2"
            :class="{ 'opacity-50': activity.status === 'bloqueada' }"
          >
            <!-- Completed -->
            <CheckCircleIcon
              v-if="activity.status === 'completed'"
              class="w-4 h-4 flex-shrink-0 text-green"
            />
            <!-- Blocked -->
            <LockClosedIcon
              v-else-if="activity.status === 'bloqueada'"
              class="w-4 h-4 flex-shrink-0 text-gray-400"
            />
            <!-- Pending / In Progress / Urgent -->
            <div v-else class="w-4 h-4 flex-shrink-0 rounded-full border-2 border-gray-300" />
            <p
              class="text-sm truncate"
              :class="activity.status === 'bloqueada' ? 'text-gray-400' : 'text-navy-700'"
            >
              {{ activity.title }}
            </p>
          </div>
        </div>
      </div>
      <!-- Info when no activities -->
      <div v-else class="flex-1 mb-3">
        <div class="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-text-secondary">
          <span class="flex items-center gap-1">
            <UserGroupIcon class="w-4 h-4" />
            {{ studentCount }} estudiantes
          </span>
          <span v-if="missionsCount !== undefined" class="flex items-center gap-1">
            <RocketLaunchIcon class="w-4 h-4" />
            {{ missionsCount }} misiones
          </span>
          <span v-if="participation !== undefined" class="flex items-center gap-1">
            <ChartBarIcon class="w-4 h-4" />
            {{ participation }}% participación
          </span>
        </div>
        <!-- Vidas, monedas y maná del alumno en esta clase -->
        <div
          v-if="lives !== undefined || coins !== undefined || mana !== undefined"
          class="mt-1.5 flex items-center gap-3 text-sm font-semibold text-navy-700"
        >
          <Tooltip v-if="lives !== undefined" :text="t('common.resources.lives')">
            <span class="flex items-center gap-1.5">
              <LifeIcon class="w-4 h-4" />
              {{ lives.toLocaleString('es-ES') }}
            </span>
          </Tooltip>
          <Tooltip v-if="coins !== undefined" :text="t('common.resources.coins')">
            <span class="flex items-center gap-1.5">
              <CoinIcon class="w-4 h-4" />
              {{ coins.toLocaleString('es-ES') }}
            </span>
          </Tooltip>
          <Tooltip v-if="mana !== undefined" :text="t('common.resources.mana')">
            <span class="flex items-center gap-1.5">
              <ManaIcon class="w-4 h-4" />
              {{ mana.toLocaleString('es-ES') }}
            </span>
          </Tooltip>
        </div>
      </div>

      <!-- Bottom: Action button - Hidden on mobile, full card is clickable -->
      <div class="hidden md:block">
        <Button variant="primary" size="sm"> Ver clase </Button>
      </div>
    </div>

    <!-- Right image area - Height on mobile, width on md+ -->
    <div
      class="relative w-full h-[140px] md:h-auto md:w-[45%] lg:w-[48%] flex-shrink-0 order-1 md:order-2"
    >
      <!-- Background Image -->
      <div
        v-if="backgroundImage"
        class="absolute inset-0 bg-cover bg-center"
        :style="{ backgroundImage: `url(${backgroundImage})` }"
      />
      <!-- Neutral background when no image -->
      <div v-else class="absolute inset-0 bg-gray-100" />

      <!-- Gradient overlay - bottom to top on mobile, left to right on md+ -->
      <div
        class="absolute inset-0 bg-gradient-to-t md:bg-gradient-to-r from-white via-white/30 via-40% to-transparent"
      />
    </div>
  </article>
</template>

<script setup lang="ts">
import { CheckCircleIcon, LockClosedIcon } from '@heroicons/vue/24/solid'
import { RocketLaunchIcon, ChartBarIcon, UserGroupIcon, ClockIcon } from '@heroicons/vue/24/outline'

interface Activity {
  id: string
  title: string
  status: 'completed' | 'pending' | 'in-progress' | 'urgent' | 'bloqueada'
  statusText: string
}

interface Props {
  icon: any
  name: string
  subtitle?: string
  badgeVariant?: 'urgente' | 'activa' | 'pendiente' | 'bloqueada'
  badgeText?: string
  studentCount?: number
  recentActivities?: Activity[]
  backgroundImage?: string
  subject?: string
  missionsCount?: number
  participation?: number
  schedule?: string
  coins?: number
  mana?: number
  lives?: number
}

const props = withDefaults(defineProps<Props>(), {
  subject: 'general',
  recentActivities: () => [],
  studentCount: 0,
})

defineEmits(['click'])

const { t } = useI18n()

// Subject-based icon background colors
const subjectColors: Record<string, string> = {
  matematicas: 'bg-purple',
  historia: 'bg-yellow',
  fisica: 'bg-navy-700',
  lengua: 'bg-green',
  ciencias: 'bg-emerald-500',
  ingles: 'bg-blue-500',
  general: 'bg-purple',
}

// Detect subject from name
const detectedSubject = computed(() => {
  const nameLower = props.name.toLowerCase()
  if (
    nameLower.includes('matemáticas') ||
    nameLower.includes('álgebra') ||
    nameLower.includes('cálculo')
  )
    return 'matematicas'
  if (nameLower.includes('historia')) return 'historia'
  if (nameLower.includes('física')) return 'fisica'
  if (nameLower.includes('lengua') || nameLower.includes('literatura')) return 'lengua'
  if (nameLower.includes('ciencias') || nameLower.includes('biología')) return 'ciencias'
  if (nameLower.includes('inglés')) return 'ingles'
  return props.subject || 'general'
})

const subjectIconBg = computed(() => subjectColors[detectedSubject.value] || 'bg-purple')

// Card ring for urgent status only
const cardRingClass = computed(() => {
  if (props.badgeVariant === 'urgente') return 'ring-2 ring-red-500/50'
  return ''
})
</script>

<style scoped>
.line-clamp-2 {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
</style>
