<template>
  <Card :type="cardType">
    <CardHeader :title="resolvedTitle" :icon="ClockIcon">
      <template #actions>
        <slot name="header-actions" />
      </template>
    </CardHeader>

    <!-- Loading state -->
    <div v-if="loading" class="space-y-6">
      <CardItemSkeleton v-for="i in 3" :key="i" :primary-width="i === 2 ? 'w-4/5' : 'w-full'" />
    </div>

    <!-- Empty state -->
    <CardItem v-else-if="activities.length === 0" padding="lg" layout="column" centered>
      <p class="text-navy-700/80">{{ resolvedEmptyMessage }}</p>
    </CardItem>

    <!-- Línea de tiempo (el historial de un estudiante): una sola caja, con una
         línea vertical y un punto con el icono de cada tipo -->
    <CardItem v-else-if="variant === 'timeline'" layout="column" padding="md">
      <ol ref="scrollContainer" class="w-full">
        <li
          v-for="(activity, index) in activities"
          :key="activity.id"
          class="relative flex gap-3 rounded-lg pb-5 last:pb-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-navy-700"
          :data-activity-id="activity.id"
          tabindex="-1"
        >
          <!-- La línea, de este punto al siguiente (solo dibujo) -->
          <span
            v-if="index < activities.length - 1"
            class="absolute bottom-0 left-3.5 top-8 w-0.5 -translate-x-1/2 rounded-full bg-navy-700/20"
            aria-hidden="true"
          />
          <!-- El punto: el icono de su tipo, en blanco en su círculo. Una entrada
               con color propio (la asistencia) va en un círculo blanco, con su color -->
          <span
            v-if="activity.iconClass"
            class="relative flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-white ring-2 ring-navy-700/20"
            aria-hidden="true"
          >
            <component :is="activity.icon ?? ClockIcon" class="h-5 w-5" :class="activity.iconClass" />
          </span>
          <IconCircle v-else :icon="activity.icon ?? ClockIcon" size="sm" class="relative" />
          <div class="min-w-0 flex-1 break-words">
            <p class="mb-0.5 pt-1 text-xs leading-5 text-navy-700/80">{{ activity.timeAgo }}</p>
            <ActivityEntryBody :activity="activity" :show-avatar="showAvatar" :inline-icon="false" />
          </div>
        </li>
      </ol>
    </CardItem>

    <!-- Activities list (scrollable with infinite scroll) -->
    <div
      v-else
      ref="scrollContainer"
      class="space-y-6 overflow-y-auto scrollbar-thin"
      :style="{ maxHeight, minHeight }"
      v-bind="scrollerAttrs"
      @scroll="handleScroll"
    >
      <CardItem
        v-for="activity in activities"
        :key="activity.id"
        layout="column"
        padding="sm"
        class="relative focus-visible:ring-inset focus-visible:ring-offset-0"
        :data-activity-id="activity.id"
        tabindex="-1"
      >
        <!-- Fecha completa (el historial de un estudiante): en su línea, encima, porque no
             cabe en la esquina -->
        <p v-if="fullDates" class="mb-1 w-full text-xs text-navy-700/80">
          {{ activity.timeAgo }}
        </p>
        <!-- Timestamp flotante arriba a la derecha (no consume fila) -->
        <span
          v-else
          class="absolute right-3 top-3 rounded-full bg-gray-100 px-2 py-0.5 text-xs text-navy-700/80 whitespace-nowrap"
        >
          {{ activity.timeAgo }}
        </span>

        <!-- pr-14 reserva el hueco del timestamp para que el texto no se le meta debajo -->
        <ActivityEntryBody
          :activity="activity"
          :show-avatar="showAvatar"
          class="w-full break-words"
          :class="fullDates ? '' : 'pr-14'"
        />
      </CardItem>

      <!-- Loading more indicator -->
      <div v-if="loadingMore" class="flex justify-center py-3">
        <div
          class="w-5 h-5 border-2 border-navy-700/30 border-t-navy-700 rounded-full animate-spin"
        />
      </div>
    </div>

    <slot name="footer-actions" />
  </Card>
</template>

<script setup lang="ts">
import { ref, type Component } from 'vue'
import { ClockIcon } from '@heroicons/vue/24/outline'
import type { ActivityActor, ResourceDelta } from '~/composables/useActivityFormatter'

const { t } = useI18n()

/**
 * Activity item structure
 */
export interface ActivityItem {
  id: string
  avatar?: string
  /** De dónde sale el color del avatar: `studentAvatarSeed(clase, estudiante)`. */
  avatarSeed?: string
  username?: string
  studentId?: string
  /** La clase de la entrada: con ella, el nombre lleva a su página dentro de la clase. */
  classId?: string
  description: string
  timeAgo: string
  /** Icono delante del texto, para lo que no sale del muro (la asistencia). */
  icon?: Component
  iconClass?: string
  /** Una línea más debajo, en texto plano. */
  detail?: string
  resources?: ResourceDelta[]
  /** Docente que lo hizo (aprobar una entrega, aplicar un comportamiento…). */
  actor?: ActivityActor
}

interface Props {
  title?: string
  activities: ActivityItem[]
  loading?: boolean
  loadingMore?: boolean
  hasMore?: boolean
  emptyMessage?: string
  cardType?: 'ia' | 'stats' | 'pending' | 'clases' | 'info'
  maxHeight?: string
  minHeight?: string
  showAvatar?: boolean
  /** `timeAgo` trae la fecha completa: va en su línea, no en la esquina. */
  fullDates?: boolean
  /**
   * `cards` (por defecto): una tarjeta por entrada, con desplazamiento. `timeline`:
   * una línea de tiempo con un punto con el icono (`icon`) de cada entrada, sin
   * caja con desplazamiento (el historial de un estudiante).
   */
  variant?: 'cards' | 'timeline'
}

const props = withDefaults(defineProps<Props>(), {
  title: undefined,
  loading: false,
  loadingMore: false,
  hasMore: false,
  emptyMessage: undefined,
  cardType: 'pending',
  maxHeight: '400px',
  minHeight: undefined,
  showAvatar: true,
  fullDates: false,
  variant: 'cards',
})

const resolvedTitle = computed(
  () => props.title ?? t('student.components.recent_activity_card.title')
)
const resolvedEmptyMessage = computed(
  () => props.emptyMessage ?? t('student.components.recent_activity_card.empty')
)

const emit = defineEmits<{
  'load-more': []
}>()

const scrollContainer = ref<HTMLElement | null>(null)

/** Con altura máxima, la lista se desplaza dentro de su caja: también con el teclado. */
const scrollerAttrs = computed(() =>
  props.maxHeight === 'none' || props.variant === 'timeline'
    ? {}
    : { role: 'region', tabindex: 0, 'aria-label': resolvedTitle.value }
)

/** Lleva el foco a una entrada de la lista (por ejemplo, la primera de las recién cargadas). */
function focusActivity(id: string) {
  scrollContainer.value
    ?.querySelector<HTMLElement>(`[data-activity-id="${CSS.escape(id)}"]`)
    ?.focus()
}

defineExpose({ focusActivity })

const handleScroll = () => {
  if (!scrollContainer.value || props.loadingMore || !props.hasMore) return

  const { scrollTop, scrollHeight, clientHeight } = scrollContainer.value
  if (scrollTop + clientHeight >= scrollHeight - 50) {
    emit('load-more')
  }
}
</script>

<style scoped>
.scrollbar-thin {
  scrollbar-width: thin;
  scrollbar-color: rgba(0, 0, 0, 0.2) transparent;
}

.scrollbar-thin::-webkit-scrollbar {
  width: 6px;
}

.scrollbar-thin::-webkit-scrollbar-track {
  background: transparent;
}

.scrollbar-thin::-webkit-scrollbar-thumb {
  background-color: rgba(0, 0, 0, 0.2);
  border-radius: 3px;
}

.scrollbar-thin::-webkit-scrollbar-thumb:hover {
  background-color: rgba(0, 0, 0, 0.3);
}
</style>
