<template>
  <Card type="info" padding="md" hoverable>
    <div class="flex items-start justify-between">
      <!-- User Info -->
      <div class="flex items-center gap-3 min-w-0 flex-1">
        <!-- Avatar -->
        <div
          :class="[
            'w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 text-sm font-semibold',
            avatarColorClass,
          ]"
        >
          {{ initials }}
        </div>

        <!-- Details -->
        <div class="min-w-0 flex-1">
          <div class="flex items-center gap-2 flex-wrap">
            <h3 class="text-sm font-semibold text-text-primary truncate">{{ user.name }}</h3>
            <Badge :variant="roleBadgeVariant" size="sm">{{ roleLabel }}</Badge>
          </div>
          <!-- Una cuenta sin correo se identifica por su usuario -->
          <p class="text-xs text-text-secondary truncate mt-0.5">{{ accountIdentifier(user) }}</p>
          <div class="flex items-center gap-3 mt-1.5 flex-wrap">
            <span
              v-if="user.schoolName"
              class="text-xs text-text-secondary flex items-center gap-1"
            >
              <BuildingOffice2Icon class="w-3 h-3" />
              {{ user.schoolName }}
            </span>
            <span class="text-xs text-text-secondary flex items-center gap-1">
              <ClockIcon class="w-3 h-3" />
              {{ lastLoginText }}
            </span>
          </div>
        </div>
      </div>

      <!-- Status & Actions -->
      <div class="flex items-center gap-2 flex-shrink-0 ml-2">
        <Badge :variant="statusBadgeVariant" size="sm">{{ statusLabel }}</Badge>

        <!-- Actions dropdown -->
        <div ref="dropdownRef" class="relative">
          <button
            class="p-1.5 rounded-lg hover:bg-surface-hover transition-colors"
            @click="showActions = !showActions"
          >
            <EllipsisVerticalIcon class="w-4 h-4 text-text-secondary" />
          </button>

          <Transition name="fade">
            <div
              v-if="showActions"
              class="absolute right-0 top-full mt-1 w-44 bg-surface border border-border-primary rounded-xl shadow-lg z-10 py-1"
            >
              <button
                v-if="user.status === 'active'"
                class="w-full px-3 py-2 text-left text-sm text-text-primary hover:bg-surface-hover transition-colors flex items-center gap-2"
                @click="handleAction('suspend')"
              >
                <NoSymbolIcon class="w-4 h-4 text-yellow" />
                Suspender
              </button>
              <button
                v-if="user.status === 'suspended'"
                class="w-full px-3 py-2 text-left text-sm text-text-primary hover:bg-surface-hover transition-colors flex items-center gap-2"
                @click="handleAction('activate')"
              >
                <CheckCircleIcon class="w-4 h-4 text-green-500" />
                Activar
              </button>
              <button
                class="w-full px-3 py-2 text-left text-sm text-red hover:bg-red/10 transition-colors flex items-center gap-2"
                @click="handleAction('delete')"
              >
                <TrashIcon class="w-4 h-4" />
                Eliminar
              </button>
            </div>
          </Transition>
        </div>
      </div>
    </div>
  </Card>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import {
  BuildingOffice2Icon,
  ClockIcon,
  EllipsisVerticalIcon,
  NoSymbolIcon,
  CheckCircleIcon,
  TrashIcon,
} from '@heroicons/vue/24/outline'
import type { AdminUser } from '~/types/admin.types'
import { accountIdentifier } from '~/utils/identity'

interface Props {
  user: AdminUser
}

const props = defineProps<Props>()

const emit = defineEmits<{
  action: [action: 'suspend' | 'activate' | 'delete', user: AdminUser]
}>()

const showActions = ref(false)
const dropdownRef = ref<HTMLElement | null>(null)

const initials = computed(() => {
  const parts = props.user.name.split(' ')
  return parts
    .map(p => p[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()
})

const avatarColorClass = computed(() => {
  switch (props.user.role) {
    case 'student':
      return 'bg-mint/20 text-mint'
    case 'teacher':
      return 'bg-purple/20 text-purple'
    case 'admin':
      return 'bg-red/20 text-red'
    default:
      return 'bg-gray-200 text-gray-600'
  }
})

const roleBadgeVariant = computed(() => {
  switch (props.user.role) {
    case 'student':
      return 'info' as const
    case 'teacher':
      return 'warning' as const
    case 'admin':
      return 'danger' as const
    default:
      return 'default' as const
  }
})

const roleLabel = computed(() => {
  switch (props.user.role) {
    case 'student':
      return 'Estudiante'
    case 'teacher':
      return 'Profesor'
    case 'admin':
      return 'Admin'
    default:
      return props.user.role
  }
})

const statusBadgeVariant = computed(() => {
  switch (props.user.status) {
    case 'active':
      return 'success' as const
    case 'suspended':
      return 'warning' as const
    case 'inactive':
      return 'default' as const
    default:
      return 'default' as const
  }
})

const statusLabel = computed(() => {
  switch (props.user.status) {
    case 'active':
      return 'Activo'
    case 'suspended':
      return 'Suspendido'
    case 'inactive':
      return 'Inactivo'
    default:
      return props.user.status
  }
})

const lastLoginText = computed(() => {
  if (!props.user.lastLogin) return 'Nunca'
  const date = new Date(props.user.lastLogin)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
  if (diffHours < 1) return 'Hace unos minutos'
  if (diffHours < 24) return `Hace ${diffHours}h`
  const diffDays = Math.floor(diffHours / 24)
  if (diffDays < 30) return `Hace ${diffDays}d`
  return date.toLocaleDateString('es-ES')
})

const handleAction = (action: 'suspend' | 'activate' | 'delete') => {
  showActions.value = false
  emit('action', action, props.user)
}

// Close dropdown on outside click
const handleClickOutside = (event: MouseEvent) => {
  if (dropdownRef.value && !dropdownRef.value.contains(event.target as Node)) {
    showActions.value = false
  }
}

onMounted(() => {
  document.addEventListener('click', handleClickOutside)
})

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside)
})
</script>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.15s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
