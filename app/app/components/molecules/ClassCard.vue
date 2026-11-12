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
        <div
          v-if="badgeVariant || subtitle || $slots.tag"
          class="flex flex-wrap items-center gap-2 mb-2"
        >
          <StatusBadge v-if="badgeVariant && badgeText" :variant="badgeVariant">{{
            badgeText
          }}</StatusBadge>
          <span v-if="subtitle" class="text-xs text-navy-700/80">{{ subtitle }}</span>
          <!-- Etiqueta propia de quien la usa (p. ej. el perfil en la clase) -->
          <slot name="tag" />
        </div>

        <!-- Title -->
        <component
          :is="headingTag ?? 'h3'"
          class="text-lg md:text-xl font-bold text-navy-700 leading-tight min-w-0 mb-2"
        >
          {{ name }}
        </component>

        <!-- Horario: una línea por tramo ("Lunes y martes 10:00-11:00"). Un
             horario escrito a mano llega como una sola línea y se recorta. -->
        <div v-if="schedule?.length" class="flex items-start gap-1 text-sm text-navy-700/80 mb-3">
          <ClockIcon class="w-4 h-4 flex-shrink-0 mt-0.5" />
          <div class="min-w-0">
            <p v-for="(line, i) in schedule" :key="i" class="line-clamp-2">{{ line }}</p>
          </div>
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
      <div v-else class="flex-1 mb-3 space-y-1.5">
        <ClassCardFacts
          :student-count="studentCount"
          :missions-count="missionsCount"
          :progress="progress"
          :coins="coins"
          :mana="mana"
          :lives="lives"
        />
      </div>

      <!-- Bottom: Action button - Hidden on mobile, full card is clickable -->
      <div class="hidden md:block">
        <Button variant="primary" size="sm">{{ t('common.class_card.view_class') }}</Button>
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
import { ClockIcon } from '@heroicons/vue/24/outline'

interface Activity {
  id: string
  title: string
  status: 'completed' | 'pending' | 'in-progress' | 'urgent' | 'bloqueada'
  statusText: string
}

interface Props {
  icon: any
  name: string
  /** El nivel del título: `h2` si la lista cuelga directamente del título de la página. */
  headingTag?: 'h2' | 'h3'
  subtitle?: string
  badgeVariant?: 'urgente' | 'activa' | 'pendiente' | 'bloqueada'
  badgeText?: string
  studentCount?: number
  /** Lo suyo en la clase (vista del alumno): «4 de 7 misiones». */
  progress?: { done: number; total: number }
  recentActivities?: Activity[]
  backgroundImage?: string
  subject?: string
  missionsCount?: number
  /** Líneas del resumen de horario (ver useScheduleSummary). */
  schedule?: string[]
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
