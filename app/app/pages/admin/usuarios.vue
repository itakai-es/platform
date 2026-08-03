<template>
  <div class="space-y-6">
    <!-- Page Header -->
    <PageHeader :title="t('admin.users.title')" :subtitle="t('admin.users.subtitle')" />

    <!-- Filters -->
    <FilterBar
      :search="searchQuery"
      :sort="sortBy"
      :results-count="filteredUsers.length"
      :search-placeholder="t('admin.users.filters.search_placeholder')"
      :sort-options="sortOptions"
      variant="red"
      :has-active-filters="hasActiveFilters"
      :active-filter-count="activeFilterCount"
      @update:search="searchQuery = $event"
      @update:sort="sortBy = $event"
      @reset="clearAllFilters"
    >
      <template #filters>
        <SelectDropdown
          v-model="selectedRole"
          :options="roleOptions"
          :placeholder="t('admin.users.filters.all_roles')"
        />
        <SelectDropdown
          v-model="selectedStatus"
          :options="statusOptions"
          :placeholder="t('admin.users.filters.all_statuses')"
        />
      </template>
    </FilterBar>

    <!-- Loading State -->
    <CardGrid v-if="isLoadingUsers">
      <div
        v-for="i in 6"
        :key="i"
        class="bg-white rounded-2xl shadow-lg overflow-hidden animate-pulse"
      >
        <div class="p-4">
          <div class="flex items-start justify-between gap-3 mb-3">
            <div class="flex items-center gap-3 flex-1">
              <div class="w-10 h-10 bg-gray-200 rounded-full" />
              <div class="flex-1">
                <div class="h-5 bg-gray-200 rounded w-36 mb-1.5" />
                <div class="h-4 bg-gray-100 rounded w-44" />
              </div>
            </div>
            <div class="h-6 bg-gray-200 rounded-full w-20" />
          </div>
          <div class="grid grid-cols-3 gap-2">
            <div class="bg-gray-50 rounded-xl p-2.5 h-14" />
            <div class="bg-gray-50 rounded-xl p-2.5 h-14" />
            <div class="bg-gray-50 rounded-xl p-2.5 h-14" />
          </div>
        </div>
        <div class="h-1.5 bg-gray-100" />
      </div>
    </CardGrid>

    <!-- Empty State -->
    <EmptyState
      v-else-if="filteredUsers.length === 0"
      :icon="UsersIcon"
      :title="t('admin.users.empty.title')"
      :description="t('admin.users.empty.description')"
    >
      <template v-if="hasActiveFilters" #action>
        <Button variant="secondary" size="sm" @click="clearAllFilters">
          {{ t('admin.users.filters.clear') }}
        </Button>
      </template>
    </EmptyState>

    <!-- Users Grid -->
    <CardGrid v-else>
      <article
        v-for="user in filteredUsers"
        :key="user.id"
        class="group bg-white rounded-2xl shadow-lg hover:shadow-xl transition-all duration-200 overflow-hidden"
      >
        <div class="p-4">
          <!-- Header: Avatar + Name + Role badge -->
          <div class="flex items-start justify-between gap-3 mb-3">
            <div class="flex items-center gap-3 min-w-0 flex-1">
              <div
                :class="[
                  'w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 text-white font-bold text-sm',
                  getRoleAvatarColor(user.role),
                ]"
              >
                {{ getInitials(user.name) }}
              </div>
              <div class="min-w-0 flex-1">
                <h3 class="font-bold text-navy-700 truncate text-lg">{{ user.name }}</h3>
                <p class="text-sm text-navy-700/50 truncate">{{ user.email }}</p>
              </div>
            </div>
            <Badge :variant="getRoleBadgeVariant(user.role)" size="sm">
              {{ getRoleLabel(user.role) }}
            </Badge>
          </div>

          <!-- Stats -->
          <div class="grid grid-cols-3 gap-2 text-center">
            <div class="bg-navy-700/5 rounded-xl py-2.5 px-2">
              <p class="text-sm font-bold" :class="getStatusColor(user.status)">
                {{ getStatusLabel(user.status) }}
              </p>
              <p class="text-xs text-navy-700/50 uppercase tracking-wide">
                {{ t('admin.users.card.status') }}
              </p>
            </div>

            <div class="bg-navy-700/5 rounded-xl py-2.5 px-2">
              <p class="text-sm font-bold text-navy-700">
                {{ user.classCount ?? 0 }}
              </p>
              <p class="text-xs text-navy-700/50 uppercase tracking-wide">
                {{ t('admin.users.card.classes') }}
              </p>
            </div>

            <div class="bg-navy-700/5 rounded-xl py-2.5 px-2">
              <p class="text-sm font-bold text-navy-700">
                {{ user.lastLogin ? formatTimeAgo(user.lastLogin) : '—' }}
              </p>
              <p class="text-xs text-navy-700/50 uppercase tracking-wide">
                {{ t('admin.users.card.last_login') }}
              </p>
            </div>
          </div>
        </div>
      </article>
    </CardGrid>

    <!-- Suspend Confirmation Modal -->
    <ConfirmModal
      v-model="showSuspendModal"
      :title="t('admin.users.actions.suspend_title')"
      :message="t('admin.users.actions.suspend_message', { name: selectedUser?.name })"
      :confirm-text="t('admin.users.actions.suspend_confirm')"
      variant="warning"
      :loading="isPerformingUserAction"
      @confirm="confirmSuspend"
      @cancel="showSuspendModal = false"
    />

    <!-- Delete Confirmation Modal -->
    <ConfirmModal
      v-model="showDeleteModal"
      :title="t('admin.users.actions.delete_title')"
      :message="t('admin.users.actions.delete_message', { name: selectedUser?.name })"
      :confirm-text="t('admin.users.actions.delete_confirm')"
      variant="danger"
      :loading="isPerformingUserAction"
      @confirm="confirmDelete"
      @cancel="showDeleteModal = false"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { UsersIcon } from '@heroicons/vue/24/outline'
import type { AdminUser } from '~/types/admin.types'

const { t } = useI18n()

useHead({
  title: () => t('admin.users.meta.title'),
  meta: [{ name: 'description', content: () => t('admin.users.meta.description') }],
})

definePageMeta({
  layout: 'admin',
  middleware: ['auth', 'onboarding', 'role'],
  role: 'admin',
})

// Store
const adminStore = useAdminStore()
const { users, isLoadingUsers, isPerformingUserAction } = storeToRefs(adminStore)

// Local filter state
const searchQuery = ref('')
const selectedRole = ref('')
const selectedStatus = ref('')
const sortBy = ref('name-asc')
const selectedUser = ref<AdminUser | null>(null)
const showSuspendModal = ref(false)
const showDeleteModal = ref(false)

// Filter options
const roleOptions = computed(() => [
  { value: '', label: t('admin.users.filters.all_roles') },
  { value: 'student', label: t('admin.users.filters.students') },
  { value: 'teacher', label: t('admin.users.filters.teachers') },
  { value: 'admin', label: t('admin.users.filters.admins') },
])

const statusOptions = computed(() => [
  { value: '', label: t('admin.users.filters.all_statuses') },
  { value: 'active', label: t('admin.users.filters.active') },
  { value: 'suspended', label: t('admin.users.filters.suspended') },
  { value: 'inactive', label: t('admin.users.filters.inactive') },
])

const sortOptions = computed(() => [
  { value: 'name-asc', label: 'Nombre A-Z' },
  { value: 'name-desc', label: 'Nombre Z-A' },
  { value: 'recent', label: t('admin.users.sort.recent') },
])

const activeFilterCount = computed(
  () => (selectedRole.value ? 1 : 0) + (selectedStatus.value ? 1 : 0)
)

const hasActiveFilters = computed(() => selectedRole.value !== '' || selectedStatus.value !== '')

// Client-side filtering (same pattern as teacher/students)
const filteredUsers = computed(() => {
  let result = [...users.value]

  // Filter by search
  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase()
    result = result.filter(
      u => u.name.toLowerCase().includes(query) || u.email.toLowerCase().includes(query)
    )
  }

  // Filter by role
  if (selectedRole.value) {
    result = result.filter(u => u.role === selectedRole.value)
  }

  // Filter by status
  if (selectedStatus.value) {
    result = result.filter(u => u.status === selectedStatus.value)
  }

  // Sort
  switch (sortBy.value) {
    case 'name-asc':
      result.sort((a, b) => a.name.localeCompare(b.name))
      break
    case 'name-desc':
      result.sort((a, b) => b.name.localeCompare(a.name))
      break
    case 'recent':
      result.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      break
  }

  return result
})

const clearAllFilters = () => {
  searchQuery.value = ''
  selectedRole.value = ''
  selectedStatus.value = ''
  sortBy.value = 'name-asc'
}

// User actions
const handleSuspend = (user: AdminUser) => {
  selectedUser.value = user
  showSuspendModal.value = true
}

const handleActivate = async (user: AdminUser) => {
  try {
    await adminStore.activateUser(user.id)
  } catch {
    /* handled in store */
  }
}

const handleDelete = (user: AdminUser) => {
  selectedUser.value = user
  showDeleteModal.value = true
}

const confirmSuspend = async () => {
  if (!selectedUser.value) return
  try {
    await adminStore.suspendUser(selectedUser.value.id)
    showSuspendModal.value = false
    selectedUser.value = null
  } catch {
    /* handled in store */
  }
}

const confirmDelete = async () => {
  if (!selectedUser.value) return
  try {
    await adminStore.deleteUser(selectedUser.value.id)
    showDeleteModal.value = false
    selectedUser.value = null
  } catch {
    /* handled in store */
  }
}

// Visual helpers
const getInitials = (name: string) => {
  const parts = name.split(' ')
  return parts.length >= 2
    ? `${parts[0]![0]}${parts[1]![0]}`.toUpperCase()
    : name.substring(0, 2).toUpperCase()
}

const getRoleAvatarColor = (role: string) => {
  switch (role) {
    case 'admin':
      return 'bg-red'
    case 'teacher':
      return 'bg-purple'
    case 'student':
      return 'bg-sky'
    default:
      return 'bg-lilac'
  }
}

const getRoleBadgeVariant = (role: string) => {
  switch (role) {
    case 'admin':
      return 'danger' as const
    case 'teacher':
      return 'epic' as const
    case 'student':
      return 'info' as const
    default:
      return 'default' as const
  }
}

const getRoleLabel = (role: string) => {
  switch (role) {
    case 'admin':
      return t('admin.users.roles.admin')
    case 'teacher':
      return t('admin.users.roles.teacher')
    case 'student':
      return t('admin.users.roles.student')
    default:
      return role
  }
}

const getStatusColor = (status: string) => {
  switch (status) {
    case 'active':
      return 'text-green-600'
    case 'suspended':
      return 'text-red-500'
    case 'inactive':
      return 'text-gray-500'
    default:
      return 'text-gray-500'
  }
}

const getStatusLabel = (status: string) => {
  switch (status) {
    case 'active':
      return t('admin.users.filters.active')
    case 'suspended':
      return t('admin.users.filters.suspended')
    case 'inactive':
      return t('admin.users.filters.inactive')
    default:
      return status
  }
}

const formatTimeAgo = (dateStr: string) => {
  const date = new Date(dateStr)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60))

  if (diffHours < 1) {
    const diffMins = Math.floor(diffMs / (1000 * 60))
    return `${diffMins}m`
  }
  if (diffHours < 24) return `${diffHours}h`
  const diffDays = Math.floor(diffHours / 24)
  if (diffDays < 30) return `${diffDays}d`
  return new Date(dateStr).toLocaleDateString('es-ES', { day: '2-digit', month: 'short' })
}

// Load all users on mount (no pagination, filter client-side)
// Usa ensureUsers para aprovechar cache del store (no refetch si ya estan cargados)
onMounted(() => adminStore.ensureUsers({ limit: 1000 }))
</script>
