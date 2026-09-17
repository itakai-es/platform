<template>
  <div class="space-y-6">
    <!-- Page Header -->
    <PageHeader :title="t('admin.users.title')" :subtitle="t('admin.users.subtitle')">
      <template #actions>
        <Button variant="primary" size="sm" @click="openCreate">
          {{ t('admin.users.create.button') }}
        </Button>
      </template>
    </PageHeader>

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
        <SelectDropdown
          v-model="selectedAccountType"
          :options="accountTypeOptions"
          :placeholder="t('admin.users.filters.all_account_types')"
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
                <!-- Una cuenta sin correo se identifica por su usuario -->
                <p class="text-sm text-navy-700/70 truncate">{{ accountIdentifier(user) }}</p>
              </div>
            </div>
            <div class="flex items-center gap-1 flex-shrink-0">
              <Badge :variant="getRoleBadgeVariant(user.role)" size="sm">
                {{ getRoleLabel(user.role) }}
              </Badge>
              <ActionMenu
                :items="actionsFor(user)"
                :label="t('admin.users.actions.menu_label', { name: user.name })"
                @select="handleAction(user, $event)"
              />
            </div>
          </div>

          <!-- Cuenta que lleva el profesorado: de dónde se gestiona -->
          <div v-if="user.accountType === 'managed'" class="mb-3 flex flex-wrap items-center gap-2">
            <Badge variant="info" size="sm">{{ t('admin.users.card.managed') }}</Badge>
            <span class="text-xs text-navy-700/70">
              {{
                user.homeClassName
                  ? t('admin.users.card.home_class', { name: user.homeClassName })
                  : t('admin.users.card.no_home_class')
              }}
            </span>
          </div>

          <!-- Stats -->
          <div class="grid grid-cols-3 gap-2 text-center">
            <div class="bg-navy-700/5 rounded-xl py-2.5 px-2">
              <p class="text-sm font-bold" :class="getStatusColor(user.status)">
                {{ getStatusLabel(user.status) }}
              </p>
              <p class="text-xs text-navy-700/70 uppercase tracking-wide">
                {{ t('admin.users.card.status') }}
              </p>
            </div>

            <div class="bg-navy-700/5 rounded-xl py-2.5 px-2">
              <p class="text-sm font-bold text-navy-700">
                {{ user.classCount ?? 0 }}
              </p>
              <p class="text-xs text-navy-700/70 uppercase tracking-wide">
                {{ t('admin.users.card.classes') }}
              </p>
            </div>

            <div class="bg-navy-700/5 rounded-xl py-2.5 px-2">
              <p class="text-sm font-bold text-navy-700">
                {{ user.lastLogin ? formatTimeAgo(user.lastLogin) : '—' }}
              </p>
              <p class="text-xs text-navy-700/70 uppercase tracking-wide">
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

    <!-- Restablecer la contraseña de una cuenta gestionada -->
    <ConfirmModal
      v-model="showResetModal"
      :title="t('admin.users.actions.reset_password_title')"
      :message="t('admin.users.actions.reset_password_message', { name: selectedUser?.name })"
      :confirm-text="t('admin.users.actions.reset_password_confirm')"
      variant="warning"
      :loading="isPerformingUserAction"
      @confirm="confirmReset"
      @cancel="showResetModal = false"
    />

    <!-- Alta de una cuenta de alumnado sin correo -->
    <Modal v-model="showCreateModal" :title="t('admin.users.create.title')" size="sm">
      <div class="space-y-4">
        <InfoNote>{{ t('admin.users.create.note') }}</InfoNote>
        <FormField
          id="managed-name"
          v-model="createForm.name"
          :label="t('admin.users.create.name')"
          :placeholder="t('admin.users.create.name_placeholder')"
          required
          :error-message="createErrors.name"
        />
        <FieldGroup
          :label="t('admin.users.create.home_class')"
          :error="createErrors.classId"
          :hint="t('admin.users.create.home_class_hint')"
        >
          <template #default="{ labelId, describedby }">
            <SelectDropdown
              v-model="createForm.classId"
              :options="classOptions"
              :placeholder="t('admin.users.create.home_class_placeholder')"
              :labelledby="labelId"
              :describedby="describedby"
              :error="!!createErrors.classId"
            />
          </template>
        </FieldGroup>
        <FormField
          id="managed-username"
          v-model="createForm.username"
          :label="t('admin.users.create.username')"
          :placeholder="t('admin.users.create.username_placeholder')"
          :hint="t('admin.users.create.username_hint')"
        />
      </div>
      <template #footer>
        <Button variant="secondary" size="md" @click="showCreateModal = false">
          {{ t('common.actions.cancel') }}
        </Button>
        <Button
          variant="primary"
          size="md"
          :loading="isPerformingUserAction"
          @click="confirmCreate"
        >
          {{ t('admin.users.create.submit') }}
        </Button>
      </template>
    </Modal>

    <!-- La contraseña temporal, que solo se ve aquí y una vez -->
    <Modal
      v-model="showCredentialsModal"
      :title="t('admin.users.actions.credentials_title')"
      size="sm"
    >
      <div v-if="credentials" class="space-y-4">
        <InfoNote>{{ t('admin.users.actions.credentials_note') }}</InfoNote>
        <dl class="space-y-2">
          <div class="rounded-xl bg-navy-700/5 px-3 py-2">
            <dt class="text-xs uppercase tracking-wide text-navy-700/70">
              {{ t('admin.users.actions.credentials_username') }}
            </dt>
            <dd class="font-mono text-base font-bold text-navy-700">
              {{ credentials.student.username }}
            </dd>
          </div>
          <div class="rounded-xl bg-navy-700/5 px-3 py-2">
            <dt class="text-xs uppercase tracking-wide text-navy-700/70">
              {{ t('admin.users.actions.credentials_password') }}
            </dt>
            <dd class="font-mono text-base font-bold text-navy-700">
              {{ credentials.temporaryPassword }}
            </dd>
          </div>
        </dl>
      </div>
      <template #footer>
        <Button variant="primary" size="md" @click="closeCredentials">
          {{ t('common.actions.close') }}
        </Button>
      </template>
    </Modal>

    <!-- Clase desde la que se gestiona la cuenta -->
    <Modal
      v-model="showHomeClassModal"
      :title="t('admin.users.actions.home_class_title')"
      size="sm"
    >
      <div class="space-y-4">
        <InfoNote>{{ t('admin.users.actions.home_class_note') }}</InfoNote>
        <SelectDropdown
          v-model="homeClassSelection"
          :options="homeClassOptions"
          :placeholder="t('admin.users.actions.home_class_none')"
        />
      </div>
      <template #footer>
        <Button variant="secondary" size="md" @click="showHomeClassModal = false">
          {{ t('common.actions.cancel') }}
        </Button>
        <Button
          variant="primary"
          size="md"
          :loading="isPerformingUserAction"
          @click="confirmHomeClass"
        >
          {{ t('common.actions.save') }}
        </Button>
      </template>
    </Modal>

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
import {
  AcademicCapIcon,
  CheckCircleIcon,
  KeyIcon,
  NoSymbolIcon,
  TrashIcon,
  UsersIcon,
} from '@heroicons/vue/24/outline'
import type { AdminUser } from '~/types/admin.types'
import type { ActionMenuItem } from '~/types/action-menu.types'
import type { ManagedCredentials } from '~/types/auth.types'
import { accountIdentifier, matchesAccount } from '~/utils/identity'

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
const { users, classes, isLoadingUsers, isPerformingUserAction } = storeToRefs(adminStore)

// Local filter state
const searchQuery = ref('')
const selectedRole = ref('')
const selectedStatus = ref('')
const selectedAccountType = ref('')
const sortBy = ref('name-asc')
const selectedUser = ref<AdminUser | null>(null)
const showSuspendModal = ref(false)
const showDeleteModal = ref(false)
const showResetModal = ref(false)
const showCredentialsModal = ref(false)
const showHomeClassModal = ref(false)
const showCreateModal = ref(false)
const homeClassSelection = ref('')
const createForm = ref({ name: '', classId: '', username: '' })
const createErrors = ref({ name: '', classId: '' })
/** La contraseña temporal recién generada: solo vive en memoria y solo se ve una vez. */
const credentials = ref<ManagedCredentials | null>(null)

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

const accountTypeOptions = computed(() => [
  { value: '', label: t('admin.users.filters.all_account_types') },
  { value: 'self', label: t('admin.users.filters.self_accounts') },
  { value: 'managed', label: t('admin.users.filters.managed_accounts') },
  { value: 'orphan', label: t('admin.users.filters.orphan_accounts') },
])

const sortOptions = computed(() => [
  { value: 'name-asc', label: 'Nombre A-Z' },
  { value: 'name-desc', label: 'Nombre Z-A' },
  { value: 'recent', label: t('admin.users.sort.recent') },
])

const activeFilterCount = computed(
  () =>
    (selectedRole.value ? 1 : 0) +
    (selectedStatus.value ? 1 : 0) +
    (selectedAccountType.value ? 1 : 0)
)

const hasActiveFilters = computed(
  () => selectedRole.value !== '' || selectedStatus.value !== '' || selectedAccountType.value !== ''
)

// Client-side filtering (same pattern as teacher/students)
const filteredUsers = computed(() => {
  let result = [...users.value]

  // Filter by search: el nombre, el correo y el usuario, que es con lo que
  // entra quien no tiene correo.
  if (searchQuery.value) {
    result = result.filter(u => matchesAccount(u, searchQuery.value))
  }

  // Filter by role
  if (selectedRole.value) {
    result = result.filter(u => u.role === selectedRole.value)
  }

  // Filter by status
  if (selectedStatus.value) {
    result = result.filter(u => u.status === selectedStatus.value)
  }

  // Cuentas gestionadas, autogestionadas o gestionadas sin ninguna clase
  if (selectedAccountType.value === 'orphan') {
    result = result.filter(u => u.accountType === 'managed' && (u.classCount ?? 0) === 0)
  } else if (selectedAccountType.value) {
    result = result.filter(u => u.accountType === selectedAccountType.value)
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
  selectedAccountType.value = ''
  sortBy.value = 'name-asc'
}

/** Clases de la instancia entre las que elegir. */
const classOptions = computed(() => classes.value.map(cls => ({ value: cls.id, label: cls.name })))

/** Igual, con la opción de dejar la cuenta sin clase de origen. */
const homeClassOptions = computed(() => [
  { value: '', label: t('admin.users.actions.home_class_none') },
  ...classOptions.value,
])

/**
 * Alta de una cuenta de alumnado sin correo. El usuario se puede escribir o
 * dejar en blanco y lo propone el sistema; en los dos casos, el que acabe
 * teniendo la cuenta se ve en la hoja de credenciales, que es la misma que
 * aparece al restablecer la contraseña.
 */
const openCreate = async () => {
  createForm.value = { name: '', classId: '', username: '' }
  createErrors.value = { name: '', classId: '' }
  showCreateModal.value = true
  await adminStore.ensureAllClasses({ limit: 1000 })
}

const confirmCreate = async () => {
  createErrors.value = {
    name: createForm.value.name.trim().length >= 2 ? '' : t('admin.users.create.errors.name'),
    classId: createForm.value.classId ? '' : t('admin.users.create.errors.home_class'),
  }
  if (createErrors.value.name || createErrors.value.classId) return

  const username = createForm.value.username.trim()
  try {
    credentials.value = await adminStore.createManagedUser({
      classId: createForm.value.classId,
      name: createForm.value.name.trim(),
      ...(username ? { username } : {}),
    })
    showCreateModal.value = false
    showCredentialsModal.value = true
  } catch {
    /* handled in store */
  }
}

/**
 * Acciones de cada cuenta. Restablecer la contraseña y cambiar la clase de
 * origen solo tienen sentido en las que lleva el profesorado.
 */
const actionsFor = (user: AdminUser): ActionMenuItem[] => {
  const items: ActionMenuItem[] = []

  if (user.status === 'active') {
    items.push({
      id: 'suspend',
      label: t('admin.users.actions.suspend'),
      icon: NoSymbolIcon,
      disabled: user.role === 'admin',
    })
  } else {
    items.push({ id: 'activate', label: t('admin.users.actions.activate'), icon: CheckCircleIcon })
  }

  if (user.accountType === 'managed') {
    items.push(
      { divider: true },
      { id: 'reset-password', label: t('admin.users.actions.reset_password'), icon: KeyIcon },
      { id: 'home-class', label: t('admin.users.actions.home_class'), icon: AcademicCapIcon }
    )
  }

  items.push(
    { divider: true },
    { id: 'delete', label: t('admin.users.actions.delete'), icon: TrashIcon, danger: true }
  )
  return items
}

const handleAction = (user: AdminUser, action: string) => {
  selectedUser.value = user
  if (action === 'suspend') showSuspendModal.value = true
  else if (action === 'activate') handleActivate(user)
  else if (action === 'reset-password') showResetModal.value = true
  else if (action === 'home-class') openHomeClass(user)
  else if (action === 'delete') showDeleteModal.value = true
}

const openHomeClass = async (user: AdminUser) => {
  homeClassSelection.value = user.homeClassId ?? ''
  showHomeClassModal.value = true
  await adminStore.ensureAllClasses({ limit: 1000 })
}

const confirmReset = async () => {
  if (!selectedUser.value) return
  try {
    credentials.value = await adminStore.resetManagedPassword(selectedUser.value.id)
    showResetModal.value = false
    showCredentialsModal.value = true
  } catch {
    /* handled in store */
  }
}

const closeCredentials = () => {
  showCredentialsModal.value = false
  credentials.value = null
  selectedUser.value = null
}

const confirmHomeClass = async () => {
  if (!selectedUser.value) return
  try {
    await adminStore.updateHomeClass(selectedUser.value.id, homeClassSelection.value || null)
    showHomeClassModal.value = false
    selectedUser.value = null
  } catch {
    /* handled in store */
  }
}

// User actions
const handleActivate = async (user: AdminUser) => {
  try {
    await adminStore.activateUser(user.id)
  } catch {
    /* handled in store */
  }
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
