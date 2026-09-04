<template>
  <div class="notification-panel-wrapper">
    <!-- Bell Icon Button -->
    <button
      data-testid="notification-bell"
      type="button"
      class="notification-bell"
      :aria-label="
        unreadCount > 0
          ? t('common.notifications.aria_label_unread', { count: unreadCount })
          : t('common.notifications.aria_label')
      "
      @click="togglePanel"
    >
      <!-- Bell Icon -->
      <svg
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
        stroke-width="1.5"
        stroke="currentColor"
        class="bell-icon"
      >
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0"
        />
      </svg>

      <!-- Unread Badge -->
      <span v-if="unreadCount > 0" data-testid="notification-badge" class="notification-badge">
        {{ unreadCount > 99 ? '99+' : unreadCount }}
      </span>
    </button>

    <!-- Dropdown Panel -->
    <Transition name="panel">
      <div
        v-if="isPanelOpen"
        v-click-outside="closePanel"
        data-testid="notification-panel"
        class="notification-dropdown"
        role="dialog"
        :aria-label="t('common.notifications.panel_label')"
      >
        <!-- Header -->
        <div class="panel-header">
          <h3 class="panel-title">{{ t('common.notifications.title') }}</h3>
          <NuxtLink to="/notificaciones" class="view-all-link" @click="closePanel">
            {{ t('common.notifications.view_all') }}
          </NuxtLink>
        </div>

        <!-- Notifications List -->
        <div v-if="recentNotifications.length > 0" class="notifications-list">
          <div
            v-for="notification in recentNotifications"
            :key="notification.id"
            data-testid="notification-item"
            class="notification-item"
            :class="{ unread: !notification.isRead }"
            @click="handleNotificationClick(notification)"
          >
            <!-- Unread indicator -->
            <span
              v-if="!notification.isRead"
              data-testid="unread-indicator"
              class="unread-dot"
              :aria-label="t('common.notifications.unread_label')"
            />

            <!-- Icon -->
            <div v-if="notification.icon" data-testid="notification-icon" class="notification-icon">
              {{ getNotificationIcon(notification.type) }}
            </div>

            <!-- Content -->
            <div class="notification-content">
              <p class="notification-title">{{ notification.title }}</p>
              <p class="notification-message">{{ notification.message }}</p>
              <span data-testid="notification-timestamp" class="notification-time">
                {{ formatRelativeTime(notification.createdAt) }}
              </span>
            </div>
          </div>
        </div>

        <!-- Empty State -->
        <div v-else class="empty-state">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            stroke-width="1.5"
            stroke="currentColor"
            class="empty-icon"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              d="M9.143 17.082a24.248 24.248 0 003.844.148m-3.844-.148a23.856 23.856 0 01-5.455-1.31 8.964 8.964 0 002.3-5.542m3.155 6.852a3 3 0 005.667 1.97m1.965-2.277L21 21m-4.225-4.225a23.81 23.81 0 003.536-1.003A8.967 8.967 0 0118 9.75V9A6 6 0 006.53 6.53m10.245 10.245L6.53 6.53M3 3l3.53 3.53"
            />
          </svg>
          <p class="empty-text">{{ t('common.notifications.empty') }}</p>
        </div>
      </div>
    </Transition>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { storeToRefs } from 'pinia'
import { useNotificationsStore } from '~/stores/notifications'
import type { Notification, NotificationType } from '~/types/notification.types'
import { formatDistanceToNow } from 'date-fns'
import { es } from 'date-fns/locale'

const { t } = useI18n()

const notificationsStore = useNotificationsStore()
const { notifications, unreadCount } = storeToRefs(notificationsStore)
const { fetchNotifications, markAsRead } = notificationsStore

const isPanelOpen = ref(false)

// Mostrar solo las 5 notificaciones más recientes
const recentNotifications = computed(() => {
  return notifications.value.slice(0, 5)
})

const togglePanel = () => {
  isPanelOpen.value = !isPanelOpen.value
}

const closePanel = () => {
  isPanelOpen.value = false
}

const handleNotificationClick = async (notification: Notification) => {
  // Marcar como leída
  if (!notification.isRead) {
    await markAsRead(notification.id)
  }

  // Navegar si tiene actionUrl
  if (notification.actionUrl) {
    await navigateTo(notification.actionUrl)
    closePanel()
  }
}

const getNotificationIcon = (type: NotificationType): string => {
  const icons: Record<NotificationType, string> = {
    mission_assigned: '📝',
    mission_completed: '✅',
    badge_earned: '🏆',
    level_up: '⬆️',
    class_invitation: '📧',
    deadline_reminder: '⏰',
    join_request: '🙋',
    join_accepted: '👥',
    join_rejected: '🚫',
    achievement_unlocked: '🎯',
    system_announcement: '📢',
    chat_message: '💬',
    submission_received: '📥',
    submission_reviewed: '📊',
  }
  return icons[type] || 'ℹ️'
}

const formatRelativeTime = (date: Date): string => {
  return formatDistanceToNow(new Date(date), {
    addSuffix: true,
    locale: es,
  })
}

type ClickOutsideEl = HTMLElement & { clickOutsideEvent?: (event: Event) => void }

const vClickOutside = {
  mounted(el: ClickOutsideEl, binding: any) {
    el.clickOutsideEvent = (event: Event) => {
      if (!(el === event.target || el.contains(event.target as Node))) {
        binding.value()
      }
    }
    setTimeout(() => {
      document.addEventListener('click', el.clickOutsideEvent!)
    }, 0)
  },
  unmounted(el: ClickOutsideEl) {
    if (el.clickOutsideEvent) {
      document.removeEventListener('click', el.clickOutsideEvent)
    }
  },
}

// Cargar notificaciones al montar
onMounted(() => {
  fetchNotifications()
})
</script>

<style scoped>
.notification-panel-wrapper {
  position: relative;
}

.notification-bell {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0.5rem;
  background: transparent;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  color: rgb(var(--palette-gray-400));
  transition: all 0.2s;
}

.notification-bell:hover {
  background: rgba(255, 255, 255, 0.1);
  color: #fff;
}

.notification-bell:focus {
  outline: 2px solid #6fedb7;
  outline-offset: 2px;
}

.bell-icon {
  width: 1.5rem;
  height: 1.5rem;
}

.notification-badge {
  position: absolute;
  top: 0.25rem;
  right: 0.25rem;
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: 1.25rem;
  height: 1.25rem;
  padding: 0 0.25rem;
  background: #ef4444;
  color: white;
  font-size: 0.625rem;
  font-weight: 700;
  border-radius: 9999px;
  border: 2px solid #0a0e27;
}

.notification-dropdown {
  position: absolute;
  top: calc(100% + 0.5rem);
  right: 0;
  width: 24rem;
  max-height: 32rem;
  background: #1a1f3a;
  border: 1px solid #2d3354;
  border-radius: 16px;
  box-shadow:
    0 20px 25px -5px rgba(0, 0, 0, 0.3),
    0 10px 10px -5px rgba(0, 0, 0, 0.2);
  overflow: hidden;
  z-index: 1000;
}

.panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1rem 1.25rem;
  border-bottom: 1px solid #2d3354;
}

.panel-title {
  margin: 0;
  font-size: 1rem;
  font-weight: 600;
  color: #fff;
}

.view-all-link {
  font-size: 0.875rem;
  color: #6fedb7;
  text-decoration: none;
  transition: color 0.2s;
}

.view-all-link:hover {
  color: #5dd4a0;
}

.notifications-list {
  max-height: 28rem;
  overflow-y: auto;
}

.notification-item {
  position: relative;
  display: flex;
  gap: 0.75rem;
  padding: 1rem 1.25rem;
  border-bottom: 1px solid #2d3354;
  cursor: pointer;
  transition: background 0.2s;
}

.notification-item:hover {
  background: rgba(110, 237, 183, 0.05);
}

.notification-item:last-child {
  border-bottom: none;
}

.notification-item.unread {
  background: rgba(110, 237, 183, 0.03);
}

.unread-dot {
  position: absolute;
  left: 0.5rem;
  top: 50%;
  transform: translateY(-50%);
  width: 0.5rem;
  height: 0.5rem;
  background: #6fedb7;
  border-radius: 9999px;
}

.notification-icon {
  flex-shrink: 0;
  width: 2rem;
  height: 2rem;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.25rem;
}

.notification-content {
  flex: 1;
  min-width: 0;
}

.notification-title {
  margin: 0 0 0.25rem 0;
  font-size: 0.875rem;
  font-weight: 600;
  color: #fff;
  line-height: 1.25rem;
}

.notification-message {
  margin: 0 0 0.25rem 0;
  font-size: 0.75rem;
  color: rgb(var(--palette-gray-400));
  line-height: 1rem;
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
}

.notification-time {
  font-size: 0.75rem;
  color: #6b7280;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 3rem 1.5rem;
  text-align: center;
}

.empty-icon {
  width: 3rem;
  height: 3rem;
  color: #4b5563;
  margin-bottom: 1rem;
}

.empty-text {
  margin: 0;
  font-size: 0.875rem;
  color: rgb(var(--palette-gray-400));
}

/* Transitions */
.panel-enter-active,
.panel-leave-active {
  transition: all 0.2s ease;
}

.panel-enter-from,
.panel-leave-to {
  opacity: 0;
  transform: translateY(-0.5rem);
}

/* Scrollbar */
.notifications-list::-webkit-scrollbar {
  width: 0.375rem;
}

.notifications-list::-webkit-scrollbar-track {
  background: #1a1f3a;
}

.notifications-list::-webkit-scrollbar-thumb {
  background: #4b5563;
  border-radius: 9999px;
}

.notifications-list::-webkit-scrollbar-thumb:hover {
  background: #6b7280;
}
</style>
