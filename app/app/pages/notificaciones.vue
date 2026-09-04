<template>
  <div class="notifications-page">
    <div class="page-header">
      <h1 class="page-title">{{ t('legal.notifications.title') }}</h1>
      <button
        v-if="hasUnread && activeTab === 'all'"
        type="button"
        class="mark-all-button"
        @click="handleMarkAllAsRead"
      >
        {{ t('legal.notifications.btn_mark_all_read') }}
      </button>
    </div>

    <!-- Filter Tabs -->
    <div class="tabs" role="tablist">
      <button
        role="tab"
        :aria-selected="activeTab === 'all'"
        class="tab"
        :class="{ active: activeTab === 'all' }"
        @click="activeTab = 'all'"
      >
        {{ t('legal.notifications.tabs.all') }}
      </button>
      <button
        role="tab"
        :aria-selected="activeTab === 'unread'"
        class="tab"
        :class="{ active: activeTab === 'unread' }"
        @click="activeTab = 'unread'"
      >
        {{ t('legal.notifications.tabs.unread') }}
      </button>
    </div>

    <!-- Notifications List -->
    <div v-if="filteredNotifications.length > 0" class="notifications-list">
      <div
        v-for="notification in filteredNotifications"
        :key="notification.id"
        data-testid="notification-item"
        class="notification-item"
        :class="{ unread: !notification.isRead }"
        @click="handleNotificationClick(notification)"
        @mouseenter="hoveredId = notification.id"
        @mouseleave="hoveredId = null"
      >
        <!-- Unread indicator -->
        <span
          v-if="!notification.isRead"
          data-testid="unread-indicator"
          class="unread-dot"
          :aria-label="t('legal.notifications.unread_label')"
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

        <!-- Actions -->
        <div class="notification-actions">
          <button
            v-if="notification.actionUrl"
            data-testid="notification-action"
            type="button"
            class="action-button"
            @click.stop="handleActionClick(notification)"
          >
            {{ notification.actionLabel || t('legal.notifications.btn_view') }}
          </button>
          <button
            v-if="hoveredId === notification.id"
            data-testid="notification-delete"
            type="button"
            class="delete-button"
            :aria-label="t('legal.notifications.btn_delete')"
            @click.stop="handleDelete(notification.id)"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              stroke-width="1.5"
              stroke="currentColor"
              class="delete-icon"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0"
              />
            </svg>
          </button>
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
      <p class="empty-text">
        {{
          activeTab === 'unread'
            ? t('legal.notifications.empty_unread')
            : t('legal.notifications.empty_all')
        }}
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { storeToRefs } from 'pinia'
import { useNotificationsStore } from '~/stores/notifications'
import type { Notification, NotificationType } from '~/types/notification.types'
import { formatDistanceToNow, type Locale } from 'date-fns'
import { es, enUS, ca, eu } from 'date-fns/locale'

const { t, locale } = useI18n()

const dateFnsLocales: Record<string, Locale> = { es, en: enUS, ca, eu }

useHead({
  title: () => t('legal.notifications.meta.title'),
  meta: [{ name: 'description', content: () => t('legal.notifications.meta.description') }],
})

definePageMeta({
  middleware: ['auth', 'role'],
  allowedRoles: ['student', 'teacher'],
  layout: 'student',
})

const notificationsStore = useNotificationsStore()
const { notifications, unreadCount } = storeToRefs(notificationsStore)
const { ensureNotifications, markAsRead, markAllAsRead, deleteNotification } = notificationsStore

const activeTab = ref<'all' | 'unread'>('all')
const hoveredId = ref<string | null>(null)

const hasUnread = computed(() => unreadCount.value > 0)

const filteredNotifications = computed(() => {
  if (activeTab.value === 'unread') {
    return notifications.value.filter(n => !n.isRead)
  }
  return notifications.value
})

const handleNotificationClick = async (notification: Notification) => {
  if (!notification.isRead) {
    await markAsRead(notification.id)
  }
}

const handleActionClick = async (notification: Notification) => {
  if (!notification.isRead) {
    await markAsRead(notification.id)
  }
  if (notification.actionUrl) {
    await navigateTo(notification.actionUrl)
  }
}

const handleMarkAllAsRead = async () => {
  await markAllAsRead()
}

const handleDelete = async (id: string) => {
  await deleteNotification(id)
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
    locale: dateFnsLocales[locale.value] || es,
  })
}

onMounted(() => {
  ensureNotifications()
})
</script>

<style scoped>
.notifications-page {
  max-width: 56rem;
  margin: 0 auto;
  padding: 2rem 1rem;
}

.page-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 2rem;
}

.page-title {
  margin: 0;
  font-size: 2rem;
  font-weight: 700;
  color: #fff;
}

.mark-all-button {
  padding: 0.5rem 1rem;
  background: transparent;
  border: 1px solid #6fedb7;
  border-radius: 8px;
  color: #6fedb7;
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.mark-all-button:hover {
  background: rgba(110, 237, 183, 0.1);
}

/* Tabs */
.tabs {
  display: flex;
  gap: 1rem;
  margin-bottom: 1.5rem;
  border-bottom: 2px solid #2d3354;
}

.tab {
  padding: 0.75rem 1.5rem;
  background: transparent;
  border: none;
  border-bottom: 2px solid transparent;
  margin-bottom: -2px;
  color: rgb(var(--palette-gray-400));
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.tab:hover {
  color: #fff;
}

.tab.active {
  color: #6fedb7;
  border-bottom-color: #6fedb7;
}

/* Notifications List */
.notifications-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.notification-item {
  position: relative;
  display: flex;
  gap: 1rem;
  padding: 1.25rem;
  background: #1a1f3a;
  border: 1px solid #2d3354;
  border-radius: 16px;
  cursor: pointer;
  transition: all 0.2s;
}

.notification-item:hover {
  background: rgba(110, 237, 183, 0.05);
  border-color: #6fedb7;
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
  width: 2.5rem;
  height: 2.5rem;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.5rem;
}

.notification-content {
  flex: 1;
  min-width: 0;
}

.notification-title {
  margin: 0 0 0.25rem 0;
  font-size: 1rem;
  font-weight: 600;
  color: #fff;
  line-height: 1.5rem;
}

.notification-message {
  margin: 0 0 0.5rem 0;
  font-size: 0.875rem;
  color: rgb(var(--palette-gray-400));
  line-height: 1.25rem;
}

.notification-time {
  font-size: 0.75rem;
  color: #6b7280;
}

/* Actions */
.notification-actions {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.action-button {
  padding: 0.5rem 1rem;
  background: #6fedb7;
  border: none;
  border-radius: 8px;
  color: #0a0e27;
  font-size: 0.875rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.action-button:hover {
  background: #5dd4a0;
}

.delete-button {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0.5rem;
  background: transparent;
  border: none;
  border-radius: 8px;
  color: #ef4444;
  cursor: pointer;
  transition: all 0.2s;
}

.delete-button:hover {
  background: rgba(239, 68, 68, 0.1);
}

.delete-icon {
  width: 1.25rem;
  height: 1.25rem;
}

/* Empty State */
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 4rem 1.5rem;
  text-align: center;
  background: #1a1f3a;
  border: 1px solid #2d3354;
  border-radius: 16px;
}

.empty-icon {
  width: 4rem;
  height: 4rem;
  color: #4b5563;
  margin-bottom: 1rem;
}

.empty-text {
  margin: 0;
  font-size: 1rem;
  color: rgb(var(--palette-gray-400));
}

/* Responsive */
@media (max-width: 640px) {
  .page-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 1rem;
  }

  .notification-item {
    flex-direction: column;
    gap: 0.75rem;
  }

  .notification-actions {
    justify-content: flex-end;
  }
}
</style>
