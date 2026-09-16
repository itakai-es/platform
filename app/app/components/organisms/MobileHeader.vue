<template>
  <header
    class="lg:hidden fixed top-0 left-0 right-0 h-14 bg-white shadow-sm z-40 flex items-center px-4 gap-3"
  >
    <!-- Botón de menú. Los avisos sin leer se ven sobre el botón y van en su nombre accesible. -->
    <button
      type="button"
      class="relative w-10 h-10 flex items-center justify-center rounded-lg hover:bg-gray-100 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-navy-700"
      :aria-label="menuLabel"
      @click="$emit('toggle-menu')"
    >
      <svg class="w-6 h-6 text-text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="2"
          d="M4 6h16M4 12h16M4 18h16"
        />
      </svg>
      <span
        v-if="unreadNotifications > 0"
        class="absolute -top-0.5 -right-0.5 min-w-5 h-5 px-1 flex items-center justify-center rounded-full bg-primary text-text-inverse text-xs font-semibold leading-none ring-2 ring-white"
        aria-hidden="true"
      >
        {{ formatUnreadBadge(unreadNotifications) }}
      </span>
    </button>

    <div class="flex-1" />
  </header>
</template>

<script setup lang="ts">
import { formatUnreadBadge } from '~/utils/notifications'

interface Props {
  title?: string
  badge?: string
  badgeClass?: string
  /** Avisos sin leer (profesorado y alumnado; el admin no lo pasa). */
  unreadNotifications?: number
}

const props = withDefaults(defineProps<Props>(), {
  title: 'ITAKAI',
  badge: undefined,
  badgeClass: '',
  unreadNotifications: 0,
})

const { t } = useI18n()

const menuLabel = computed(() =>
  props.unreadNotifications > 0
    ? t(
        'common.notifications.open_menu_unread',
        { count: props.unreadNotifications },
        props.unreadNotifications
      )
    : t('common.actions.toggle_menu')
)

defineEmits(['toggle-menu'])
</script>
