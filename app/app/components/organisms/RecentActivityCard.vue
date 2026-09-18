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
      <p class="text-text-secondary">{{ resolvedEmptyMessage }}</p>
    </CardItem>

    <!-- Activities list (scrollable with infinite scroll) -->
    <div
      v-else
      ref="scrollContainer"
      class="space-y-6 overflow-y-auto scrollbar-thin"
      :style="{ maxHeight, minHeight }"
      @scroll="handleScroll"
    >
      <CardItem
        v-for="activity in activities"
        :key="activity.id"
        layout="column"
        padding="sm"
        class="relative"
      >
        <!-- Timestamp flotante arriba a la derecha (no consume fila) -->
        <span
          class="absolute right-3 top-3 rounded-full bg-gray-100 px-2 py-0.5 text-xs text-text-secondary whitespace-nowrap"
        >
          {{ activity.timeAgo }}
        </span>

        <!-- pr-14 reserva el hueco del timestamp para que el texto no se le meta debajo -->
        <div class="text-sm text-navy-700 w-full pr-14 break-words">
          <p>
            <!-- Hover sobre el nickname → avatar como tooltip. Si hay studentId, además
                 el nickname es un NuxtLink al perfil del alumno en la vista de profesor. -->
            <Tooltip v-if="activity.username && showAvatar" variant="light">
              <template #content>
                <span
                  class="flex h-16 w-16 items-center justify-center overflow-hidden rounded-full bg-lila-medium"
                >
                  <img
                    :src="activity.avatar || defaultAvatar"
                    :alt="
                      activity.username ||
                      t('student.components.recent_activity_card.user_fallback')
                    "
                    class="h-full w-full object-contain p-1"
                  />
                </span>
              </template>
              <NuxtLink
                v-if="activity.studentId"
                :to="`/profesor/alumnos/${activity.studentId}`"
                class="font-semibold hover:underline"
              >{{ activity.username }}</NuxtLink>
              <span v-else class="font-semibold cursor-default">{{ activity.username }}</span>
              <span>&nbsp;</span>
            </Tooltip>
            <NuxtLink
              v-else-if="activity.username && activity.studentId"
              :to="`/profesor/alumnos/${activity.studentId}`"
              class="font-semibold hover:underline"
            >{{ activity.username }}&nbsp;</NuxtLink>
            <span
              v-else-if="activity.username"
              class="font-semibold"
            >{{ activity.username }}&nbsp;</span>
            <span v-html="activity.description"></span>
          </p>
          <!-- Quién lo hizo, si la descripción no lo dice -->
          <p v-if="activity.actorName" class="mt-1 text-xs text-navy-700/70">
            {{
              t('student.components.recent_activity_card.by_actor', { name: activity.actorName })
            }}
          </p>
          <!-- Chips de recursos involucrados (XP, monedas, maná, vidas) -->
          <div
            v-if="activity.resources?.length"
            class="mt-1.5 flex flex-wrap items-center gap-1.5"
          >
            <Tooltip
              v-for="r in activity.resources"
              :key="r.kind"
              :text="t(`common.resources.${chipKey(r.kind)}`)"
            >
              <span
                class="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-sm font-semibold"
                :class="r.positive ? 'bg-navy-700/5 text-navy-700' : 'bg-red/10 text-red'"
              >
                <CoinIcon v-if="r.kind === 'coin'" class="h-3.5 w-3.5" />
                <XpIcon v-else-if="r.kind === 'xp'" class="h-3.5 w-3.5" />
                <ManaIcon v-else-if="r.kind === 'mana'" class="h-3.5 w-3.5" />
                <LifeIcon v-else-if="r.kind === 'life'" class="h-3.5 w-3.5" />
                <span>{{ r.positive ? '+' : '−' }}{{ r.amount }}</span>
              </span>
            </Tooltip>
          </div>
        </div>
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
import { ref } from 'vue'
import { ClockIcon } from '@heroicons/vue/24/outline'
import type { ActivityBadgeType } from '~/components/atoms/ActivityBadge.vue'
import type { ResourceDelta } from '~/composables/useActivityFormatter'

const { t } = useI18n()

/**
 * Activity item structure
 */
export interface ActivityItem {
  id: string
  avatar?: string
  username?: string
  studentId?: string
  description: string
  timeAgo: string
  badge?: ActivityBadgeType
  resources?: ResourceDelta[]
  /** Profesor que lo hizo (aplicar un comportamiento…). */
  actorName?: string
}

interface Props {
  title?: string
  activities: ActivityItem[]
  loading?: boolean
  loadingMore?: boolean
  hasMore?: boolean
  emptyMessage?: string
  cardType?: 'ia' | 'stats' | 'pending' | 'clases' | 'info'
  defaultAvatar?: string
  maxHeight?: string
  minHeight?: string
  showAvatar?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  title: undefined,
  loading: false,
  loadingMore: false,
  hasMore: false,
  emptyMessage: undefined,
  cardType: 'pending',
  defaultAvatar: '/app/avatars/atenea.svg',
  maxHeight: '400px',
  minHeight: undefined,
  showAvatar: true,
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

const chipKey = (kind: ResourceDelta['kind']): string => {
  if (kind === 'coin') return 'coins'
  if (kind === 'life') return 'lives'
  return kind
}

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
