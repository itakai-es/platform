<template>
  <div class="space-y-6">
    <PageHeader
      :title="t('common.notifications.title')"
      :subtitle="t('common.notifications.subtitle')"
    >
      <template v-if="enabled && store.unreadCount > 0" #actions>
        <Button variant="outline" :icon-left="CheckIcon" :loading="markingAll" @click="markAll">
          {{ t('common.notifications.mark_all_read') }}
        </Button>
      </template>
    </PageHeader>

    <!-- Lo que ha hecho la última acción, para quien no la ve -->
    <p class="sr-only" role="status" aria-live="polite">{{ announcement }}</p>

    <div v-if="hasNotifications" class="max-w-sm">
      <OptionPillGroup
        v-model="filter"
        :options="filterOptions"
        :aria-label="t('common.notifications.filter_label')"
      />
    </div>

    <!-- Destino del foco cuando el aviso que lo tenía desaparece -->
    <div
      ref="regionRef"
      role="region"
      tabindex="-1"
      :aria-label="t('common.notifications.title')"
      class="overflow-hidden rounded-2xl bg-white shadow-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-navy-700"
      :aria-busy="showSkeleton"
    >
      <EmptyState
        v-if="!enabled"
        :icon="BellIcon"
        :title="t('common.notifications.empty_title')"
        :description="t('common.notifications.empty_description')"
      />

      <div v-else-if="showSkeleton" class="divide-y divide-border-primary" aria-hidden="true">
        <div v-for="i in 4" :key="i" class="flex items-start gap-3 px-4 py-4 sm:px-5">
          <Skeleton width="w-10" height="h-10" custom-class="shrink-0 rounded-xl" />
          <div class="min-w-0 flex-1 space-y-2">
            <Skeleton width="w-1/2" height="h-4" />
            <Skeleton width="w-4/5" height="h-3" />
            <Skeleton width="w-20" height="h-3" />
          </div>
          <Skeleton width="w-8" height="h-8" custom-class="shrink-0 rounded-lg" />
        </div>
      </div>

      <EmptyState
        v-else-if="loadFailed"
        :icon="ExclamationTriangleIcon"
        :title="t('common.notifications.load_error')"
        :description="t('common.errors.generic')"
      >
        <template #action>
          <Button variant="outline" @click="store.fetchNotifications()">
            {{ t('common.notifications.retry') }}
          </Button>
        </template>
      </EmptyState>

      <EmptyState
        v-else-if="!hasNotifications"
        :icon="BellIcon"
        :title="t('common.notifications.empty_title')"
        :description="t('common.notifications.empty_description')"
      />

      <EmptyState
        v-else-if="!visibleNotifications.length"
        :icon="CheckCircleIcon"
        :title="t('common.notifications.empty_unread_title')"
        :description="t('common.notifications.empty_unread_description')"
      >
        <template #action>
          <Button variant="outline" @click="filter = 'all'">
            {{ t('common.notifications.show_all') }}
          </Button>
        </template>
      </EmptyState>

      <ul v-else ref="listRef" class="divide-y divide-border-primary">
        <li
          v-for="(notification, index) in visibleNotifications"
          :key="notification.id"
          data-notification-item
          class="relative flex items-start gap-3 px-4 py-4 sm:px-5"
          :class="notification.isRead ? undefined : 'bg-purple-light/30'"
        >
          <span
            class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
            :class="iconFor(notification.type).tone"
            aria-hidden="true"
          >
            <component :is="iconFor(notification.type).icon" class="h-5 w-5 text-navy-700" />
          </span>

          <div class="min-w-0 flex-1">
            <div class="flex flex-wrap items-center gap-x-2 gap-y-1">
              <h2
                class="min-w-0 break-words text-sm text-navy-700 sm:text-base"
                :class="notification.isRead ? 'font-medium' : 'font-bold'"
              >
                <!-- Con destino, todo el aviso es el enlace (la capa `after`) -->
                <NuxtLink
                  v-if="notification.actionUrl"
                  :to="notification.actionUrl"
                  :aria-describedby="`${itemId(notification)}-message ${itemId(notification)}-time`"
                  class="rounded after:absolute after:inset-0 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-navy-700"
                  @click="openNotification(notification)"
                >
                  {{ notification.title
                  }}<span v-if="!notification.isRead" class="sr-only"
                    >, {{ t('common.notifications.unread_status') }}</span
                  >
                </NuxtLink>
                <template v-else>
                  {{ notification.title
                  }}<span v-if="!notification.isRead" class="sr-only"
                    >, {{ t('common.notifications.unread_status') }}</span
                  >
                </template>
              </h2>
              <!-- El estado ya va en el título para el lector -->
              <Badge v-if="!notification.isRead" variant="info" size="sm" aria-hidden="true">
                {{ t('common.notifications.new') }}
              </Badge>
            </div>
            <p
              :id="`${itemId(notification)}-message`"
              class="mt-1 break-words text-sm text-navy-700/80"
            >
              {{ notification.message }}
            </p>
            <div class="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1">
              <!-- `relative` la saca de debajo de la capa del enlace para que se vea el `title` -->
              <time
                :id="`${itemId(notification)}-time`"
                :datetime="notification.createdAt"
                :title="formatNotificationDate(notification.createdAt, locale)"
                class="relative text-xs text-navy-700/70"
              >
                {{ relativeTime(notification) }}
              </time>
              <button
                v-if="!notification.isRead && !notification.actionUrl"
                type="button"
                class="rounded text-xs font-semibold text-navy-700 underline underline-offset-2 hover:no-underline focus:outline-none focus-visible:ring-2 focus-visible:ring-navy-700"
                @click="markRead(notification, index)"
              >
                {{ t('common.notifications.mark_read') }}
                <span class="sr-only"
                  >: {{ notification.title }}, {{ relativeTime(notification) }}</span
                >
              </button>
            </div>
          </div>

          <IconButton
            class="relative shrink-0"
            :icon="TrashIcon"
            :label="
              t('common.notifications.delete', {
                title: notification.title,
                time: relativeTime(notification),
              })
            "
            :data-delete-id="notification.id"
            danger
            @click="remove(notification, index)"
          />
        </li>
      </ul>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { Component } from 'vue'
import {
  ArrowTrendingUpIcon,
  BellIcon,
  ChatBubbleLeftRightIcon,
  CheckCircleIcon,
  CheckIcon,
  ClipboardDocumentCheckIcon,
  ClockIcon,
  EnvelopeIcon,
  ExclamationTriangleIcon,
  FlagIcon,
  InboxArrowDownIcon,
  MegaphoneIcon,
  RocketLaunchIcon,
  StarIcon,
  TrashIcon,
  TrophyIcon,
  XCircleIcon,
} from '@heroicons/vue/24/outline'
import type { Notification, NotificationFilter, NotificationType } from '~/types/notification.types'
import { formatNotificationDate, formatNotificationTime } from '~/utils/notifications'

/**
 * Buzón de avisos, el mismo para profesorado y alumnado (las páginas de cada
 * rol solo ponen el layout). La lista la mantiene al día el layout con
 * `useNotificationsPolling`; aquí se fuerza una carga al entrar para no
 * enseñar lo de hace dos minutos.
 */

const { t, locale } = useI18n()
const store = useNotificationsStore()
const toast = useToast()
// Fuera de sesión o en «Ver como alumno» no se pide ni se enseña nada
const enabled = useNotificationsEnabled()

const filter = ref<NotificationFilter>('all')
const markingAll = ref(false)
const announcement = ref('')
const regionRef = ref<HTMLElement | null>(null)
const listRef = ref<HTMLElement | null>(null)

const showSkeleton = computed(() => !store.hasLoadedNotifications && !store.error)
const loadFailed = computed(() => !store.hasLoadedNotifications && !!store.error)
const hasNotifications = computed(() => enabled.value && store.notifications.length > 0)
const visibleNotifications = computed(() => store.getNotificationsByFilter(filter.value))

const filterOptions = computed(() => [
  { value: 'all' as const, label: t('common.notifications.filter_all') },
  {
    value: 'unread' as const,
    // El total del servidor, como el menú (la lista solo trae los 50 últimos)
    label: `${t('common.notifications.filter_unread')} (${store.unreadCount})`,
  },
])

/** Icono y fondo de cada tipo. Los tonos son los claros de la marca. */
const TYPE_ICONS: Partial<Record<NotificationType, { icon: Component; tone: string }>> = {
  deadline_reminder: { icon: ClockIcon, tone: 'bg-yellow-light' },
  submission_received: { icon: InboxArrowDownIcon, tone: 'bg-purple-light' },
  submission_reviewed: { icon: ClipboardDocumentCheckIcon, tone: 'bg-mint-light' },
  join_accepted: { icon: CheckCircleIcon, tone: 'bg-mint-light' },
  join_rejected: { icon: XCircleIcon, tone: 'bg-red-light' },
  class_invitation: { icon: EnvelopeIcon, tone: 'bg-sky-light' },
  badge_earned: { icon: TrophyIcon, tone: 'bg-yellow-light' },
  achievement_unlocked: { icon: StarIcon, tone: 'bg-yellow-light' },
  level_up: { icon: ArrowTrendingUpIcon, tone: 'bg-mint-light' },
  mission_assigned: { icon: RocketLaunchIcon, tone: 'bg-purple-light' },
  mission_completed: { icon: FlagIcon, tone: 'bg-mint-light' },
  system_announcement: { icon: MegaphoneIcon, tone: 'bg-sky-light' },
  chat_message: { icon: ChatBubbleLeftRightIcon, tone: 'bg-purple-light' },
}

const iconFor = (type: NotificationType) =>
  TYPE_ICONS[type] ?? { icon: BellIcon, tone: 'bg-purple-light' }

// La hora relativa avanza sola mientras la página está abierta
const now = ref(Date.now())
let clock: ReturnType<typeof setInterval> | null = null

/** Prefijo de los ids del mensaje y la hora que describen el enlace. */
const itemId = (notification: Notification) => `notification-${notification.id}`

const relativeTime = (notification: Notification) =>
  formatNotificationTime(notification.createdAt, locale.value, now.value)

onMounted(() => {
  if (enabled.value) store.fetchNotifications()
  clock = setInterval(() => {
    now.value = Date.now()
  }, 60 * 1000)
})

onUnmounted(() => {
  if (clock) clearInterval(clock)
})

const announce = (message: string) => {
  // Vaciar antes para que se repita el aviso si el texto es el mismo
  announcement.value = ''
  nextTick(() => {
    announcement.value = message
  })
}

/**
 * Tras quitar un aviso de la lista, el foco va al que ocupa su sitio (o al
 * anterior si era el último) y, si ya no queda ninguno, a la caja de la lista.
 */
const focusAfterRemoval = async (index: number) => {
  await nextTick()
  const items = listRef.value?.querySelectorAll<HTMLElement>('[data-notification-item]')
  const next = items?.length ? items[Math.min(index, items.length - 1)] : undefined
  const target = next?.querySelector<HTMLElement>('a, button') ?? regionRef.value
  target?.focus()
}

// Abrir un aviso lo da por leído; la navegación no espera a la respuesta
const openNotification = (notification: Notification) => {
  if (!notification.isRead) store.markAsRead(notification.id)
}

const markRead = async (notification: Notification, index: number) => {
  const ok = await store.markAsRead(notification.id)
  if (!ok) {
    toast.error(t('common.notifications.action_error'))
    return
  }
  announce(t('common.notifications.marked_read'))
  // Con el filtro «Sin leer» el aviso desaparece; si no, se va solo el botón
  if (filter.value === 'unread') {
    await focusAfterRemoval(index)
    return
  }
  await nextTick()
  listRef.value?.querySelector<HTMLElement>(`[data-delete-id="${notification.id}"]`)?.focus()
}

const markAll = async () => {
  markingAll.value = true
  const ok = await store.markAllAsRead()
  markingAll.value = false
  if (!ok) {
    toast.error(t('common.notifications.action_error'))
    return
  }
  announce(t('common.notifications.all_marked'))
  // El botón desaparece al no quedar ninguno sin leer
  regionRef.value?.focus()
}

const remove = async (notification: Notification, index: number) => {
  const ok = await store.deleteNotification(notification.id)
  if (!ok) {
    toast.error(t('common.notifications.action_error'))
    return
  }
  announce(t('common.notifications.deleted'))
  await focusAfterRemoval(index)
}
</script>
