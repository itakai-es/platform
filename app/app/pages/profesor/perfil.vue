<template>
  <div>
    <!-- Profile Header - Full width using negative margins -->
    <div class="bg-navy-700 -mx-4 md:-mx-6 -mt-4 md:-mt-6 px-4 md:px-6 pt-6 pb-0 mb-6">
      <div class="space-y-4">
        <!-- Breadcrumb -->
        <nav class="flex items-center gap-2 text-sm">
          <NuxtLink
            to="/profesor/inicio"
            class="text-white/70 hover:text-white flex items-center gap-1"
          >
            <HomeIcon class="w-4 h-4" />
            <span>{{ t('teacher.profile.breadcrumb_home') }}</span>
          </NuxtLink>
          <ChevronRightIcon class="w-4 h-4 text-white/70" />
          <span class="text-white font-medium">{{ t('teacher.profile.breadcrumb_profile') }}</span>
        </nav>

        <!-- Page Header -->
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div class="flex items-center gap-3">
            <div
              class="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-white/20 flex items-center justify-center"
            >
              <UserIcon class="w-5 h-5 sm:w-6 sm:h-6 text-white" />
            </div>
            <h1 class="text-2xl sm:text-3xl font-bold text-white">
              {{ t('teacher.profile.title') }}
            </h1>
          </div>
        </div>

        <!-- Tabs -->
        <div class="flex gap-1 overflow-x-auto scrollbar-subtle -mb-px">
          <button
            v-for="tab in tabs"
            :key="tab.id"
            :class="[
              'px-3 sm:px-4 md:px-6 py-3 text-sm font-medium transition-colors flex items-center gap-2 whitespace-nowrap rounded-t-xl',
              activeTab === tab.id
                ? 'bg-surface text-navy-700'
                : 'text-white/70 hover:text-white hover:bg-white/10',
            ]"
            @click="setActiveTab(tab.id)"
          >
            <component :is="tab.icon" class="w-5 h-5" />
            {{ tab.label }}
          </button>
        </div>
      </div>
    </div>

    <!-- Tab Content -->
    <div class="space-y-6">
      <!-- Tab: Seguridad -->
      <div v-if="activeTab === 'seguridad'">
        <div class="grid md:grid-cols-2 gap-4 md:gap-6">
          <!-- Cambiar Contraseña -->
          <Card type="settings">
            <div class="p-5">
              <div class="flex items-center gap-3 mb-4">
                <KeyIcon class="w-5 h-5 text-navy-700" />
                <h3 class="text-lg font-bold text-navy-700">
                  {{ t('teacher.profile.security.password_title') }}
                </h3>
              </div>
              <form class="space-y-3" autocomplete="on" @submit.prevent="changePassword">
                <input
                  type="text"
                  name="username"
                  :value="profileStore.currentEmail"
                  autocomplete="username"
                  class="sr-only"
                  tabindex="-1"
                  aria-hidden="true"
                  readonly
                />
                <FormField
                  v-model="securityForm.currentPassword"
                  type="password"
                  autocomplete="current-password"
                  :placeholder="t('teacher.profile.security.placeholder_current')"
                />
                <FormField
                  v-model="securityForm.newPassword"
                  type="password"
                  autocomplete="new-password"
                  :placeholder="t('teacher.profile.security.placeholder_new')"
                />
                <FormField
                  v-model="securityForm.confirmPassword"
                  type="password"
                  autocomplete="new-password"
                  :placeholder="t('teacher.profile.security.placeholder_confirm')"
                />
                <Button type="submit" variant="primary" size="sm" :loading="isChangingPassword">
                  {{ t('teacher.profile.security.btn_update') }}
                </Button>
              </form>
            </div>
          </Card>

          <!-- Cambiar Email -->
          <Card type="settings">
            <div class="p-5">
              <div class="flex items-center gap-3 mb-4">
                <EnvelopeIcon class="w-5 h-5 text-navy-700" />
                <h3 class="text-lg font-bold text-navy-700">
                  {{ t('teacher.profile.security.email_title') }}
                </h3>
              </div>
              <div class="space-y-3">
                <FormField :model-value="profileStore.currentEmail" type="email" disabled />
                <FormField
                  v-model="securityForm.newEmail"
                  type="email"
                  :placeholder="t('teacher.profile.security.placeholder_new_email')"
                />
                <Button variant="primary" size="sm" :loading="isChangingEmail" @click="changeEmail">
                  {{ t('teacher.profile.security.btn_update') }}
                </Button>
              </div>
            </div>
          </Card>

          <!-- Sesiones activas -->
          <Card type="settings">
            <div class="p-5">
              <div class="flex items-center justify-between mb-4">
                <div class="flex items-center gap-3">
                  <DevicePhoneMobileIcon class="w-5 h-5 text-navy-700" />
                  <h3 class="text-lg font-bold text-navy-700">
                    {{ t('teacher.profile.security.sessions_title') }}
                  </h3>
                </div>
                <button
                  v-if="profileStore.security.sessions.length > 1"
                  class="text-xs text-navy-700/60 hover:text-navy-700"
                  @click="closeAllSessions"
                >
                  {{ t('teacher.profile.security.sessions_close_all') }}
                </button>
              </div>
              <div class="space-y-2">
                <div
                  v-for="session in profileStore.security.sessions"
                  :key="session.id"
                  class="flex items-center justify-between p-2 bg-white rounded-lg border border-border-primary"
                >
                  <div class="flex items-center gap-2">
                    <ComputerDesktopIcon
                      v-if="session.device === 'desktop'"
                      class="w-4 h-4 text-navy-700/70"
                    />
                    <DevicePhoneMobileIcon v-else class="w-4 h-4 text-navy-700/70" />
                    <div>
                      <p class="text-sm font-medium text-navy-700">{{ session.browser }}</p>
                      <p class="text-xs text-navy-700/60">{{ session.lastActive }}</p>
                    </div>
                  </div>
                  <span
                    v-if="session.current"
                    class="text-xs text-navy-700 bg-navy-700/10 px-2 py-0.5 rounded-full"
                    >{{ t('teacher.profile.security.session_current') }}</span
                  >
                  <button
                    v-else
                    class="text-xs text-navy-700/60 hover:text-navy-700"
                    @click="closeSession(session.id)"
                  >
                    {{ t('teacher.profile.security.session_close') }}
                  </button>
                </div>
              </div>
            </div>
          </Card>
        </div>
      </div>

      <!-- Tab: Configuración -->
      <div v-else-if="activeTab === 'configuracion'">
        <div class="grid md:grid-cols-2 gap-4 md:gap-6">
          <!-- Left Column -->
          <div class="space-y-6">
            <!-- Tema -->
            <Card type="settings">
              <div class="p-6">
                <div class="flex items-center gap-3 mb-4">
                  <SwatchIcon class="w-6 h-6 text-navy-700" />
                  <h3 class="text-lg font-bold text-navy-700">
                    {{ t('teacher.profile.settings.theme_title') }}
                  </h3>
                </div>
                <p class="text-sm text-navy-700/70 mb-4">
                  {{ t('teacher.profile.settings.theme_description') }}
                </p>
                <div class="grid grid-cols-2 gap-3">
                  <SelectionCard
                    variant="square"
                    :icon="AcademicCapIcon"
                    :title="t('teacher.profile.settings.theme_college')"
                    :subtitle="t('teacher.profile.settings.theme_college_desc')"
                    :selected="preferencesForm.theme === 'college'"
                    @click="preferencesForm.theme = 'college'"
                  />
                  <SelectionCard
                    variant="square"
                    :icon="BuildingLibraryIcon"
                    :title="t('teacher.profile.settings.theme_university')"
                    :subtitle="t('teacher.profile.settings.theme_university_desc')"
                    :selected="preferencesForm.theme === 'university'"
                    @click="preferencesForm.theme = 'university'"
                  />
                </div>
              </div>
            </Card>

            <!-- Menú superior: icono / texto / ambos -->
            <Card type="settings">
              <div class="p-6">
                <div class="flex items-center gap-3 mb-4">
                  <ViewColumnsIcon class="w-6 h-6 text-navy-700" />
                  <h3 class="text-lg font-bold text-navy-700">
                    {{ t('common.menu_display.title') }}
                  </h3>
                </div>
                <p class="text-sm text-navy-700/70 mb-4">
                  {{ t('common.menu_display.description') }}
                </p>
                <div class="grid grid-cols-3 gap-2">
                  <button
                    v-for="opt in menuOptions"
                    :key="opt.value"
                    type="button"
                    class="rounded-xl border px-3 py-2 text-sm font-medium transition-colors"
                    :class="
                      menuDisplay === opt.value
                        ? 'border-navy-700 bg-navy-700 text-white'
                        : 'border-border-primary bg-surface text-navy-700 hover:bg-gray-50'
                    "
                    @click="menuDisplay = opt.value"
                  >
                    {{ opt.label }}
                  </button>
                </div>
              </div>
            </Card>
          </div>

          <!-- Right Column -->
          <div class="space-y-6">
            <!-- Idioma -->
            <Card type="settings">
              <div class="p-6">
                <div class="flex items-center gap-3 mb-4">
                  <LanguageIcon class="w-6 h-6 text-navy-700" />
                  <h3 class="text-lg font-bold text-navy-700">
                    {{ t('teacher.profile.settings.language_title') }}
                  </h3>
                </div>
                <SelectDropdown v-model="preferencesForm.language" :options="languageOptions" />
              </div>
            </Card>

            <!-- Zona peligrosa -->
            <Card type="settings" class="border-2 border-navy-700/20">
              <div class="p-6">
                <div class="flex items-center gap-3 mb-4">
                  <ExclamationTriangleIcon class="w-6 h-6 text-navy-700" />
                  <h3 class="text-lg font-bold text-navy-700">
                    {{ t('teacher.profile.settings.danger_zone_title') }}
                  </h3>
                </div>
                <p class="text-sm text-navy-700/70 mb-4">
                  {{ t('teacher.profile.settings.danger_zone_description') }}
                </p>
                <Button
                  variant="outline"
                  size="md"
                  :icon-left="TrashIcon"
                  @click="showDeleteModal = true"
                >
                  {{ t('teacher.profile.settings.btn_delete_account') }}
                </Button>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>

    <!-- Delete Account Modal -->
    <ConfirmModal
      v-model="showDeleteModal"
      :title="t('teacher.profile.settings.delete_modal_title')"
      :message="t('teacher.profile.settings.delete_modal_confirm_prompt')"
      :confirm-text="t('teacher.profile.settings.btn_delete_confirm')"
      :cancel-text="t('teacher.profile.settings.btn_cancel')"
      variant="danger"
      :loading="isDeleting"
      @confirm="deleteAccount"
    >
      <input
        type="text"
        name="username"
        :value="profileStore.currentEmail"
        autocomplete="username"
        class="sr-only"
        tabindex="-1"
        aria-hidden="true"
        readonly
      />
      <FormField
        v-model="deletePassword"
        type="password"
        autocomplete="current-password"
        :placeholder="t('teacher.profile.settings.placeholder_password')"
      />
    </ConfirmModal>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import {
  HomeIcon,
  ChevronRightIcon,
  UserIcon,
  ShieldCheckIcon,
  Cog6ToothIcon,
  KeyIcon,
  DevicePhoneMobileIcon,
  ComputerDesktopIcon,
  BellIcon,
  LanguageIcon,
  ExclamationTriangleIcon,
  TrashIcon,
  EnvelopeIcon,
  SwatchIcon,
  AcademicCapIcon,
  BuildingLibraryIcon,
  ViewColumnsIcon,
} from '@heroicons/vue/24/outline'

const { t } = useI18n()

// Preferencia de visualización de las pestañas superiores (icono/texto/ambos).
const menuDisplay = useMenuDisplay()
const menuOptions = computed(() => [
  { value: 'both' as const, label: t('common.menu_display.both') },
  { value: 'icon' as const, label: t('common.menu_display.icon') },
  { value: 'text' as const, label: t('common.menu_display.text') },
])
const { changeLanguage } = useLocale()

useHead({
  title: computed(() => t('teacher.profile.meta.title')),
  meta: [{ name: 'description', content: computed(() => t('teacher.profile.meta.description')) }],
})

definePageMeta({
  layout: 'teacher',
  middleware: ['auth', 'onboarding', 'role'],
})

const profileStore = useProfileStore()
const toast = useToast()

// Tabs configuration
const tabs = computed(() => [
  { id: 'seguridad', label: t('teacher.profile.tabs.security'), icon: ShieldCheckIcon },
  { id: 'configuracion', label: t('teacher.profile.tabs.settings'), icon: Cog6ToothIcon },
])

const activeTab = ref('seguridad')

const setActiveTab = (tabId: string) => {
  activeTab.value = tabId
}

// Form state for security
const securityForm = ref({
  currentPassword: '',
  newPassword: '',
  confirmPassword: '',
  newEmail: '',
})

// Form state for preferences (local copy for immediate UI updates)
const preferencesForm = ref({
  emailNotifications: true,
  missionReminders: true,
  language: 'es' as AppLanguage,
  theme: 'college' as 'college' | 'university',
})

// Delete account state
const showDeleteModal = ref(false)
const deletePassword = ref('')
const isDeleting = ref(false)

// Loading states
const isChangingPassword = ref(false)
const isChangingEmail = ref(false)
const isTogglingTwoFactor = ref(false)

// Fetch profile on mount (uses cached load via hasLoadedProfile flag)
onMounted(async () => {
  await profileStore.ensureProfile()

  // Initialize preferences form with store data
  if (profileStore.preferences) {
    preferencesForm.value = { ...profileStore.preferences }
  }
})

// Watch for preference changes and sync with API
watch(
  () => preferencesForm.value.emailNotifications,
  async newVal => {
    if (profileStore.preferences && newVal !== profileStore.preferences.emailNotifications) {
      const result = await profileStore.updatePreferences({ emailNotifications: newVal })
      if (!result.success) {
        toast.error(result.message)
        preferencesForm.value.emailNotifications = profileStore.preferences.emailNotifications
      }
    }
  }
)

watch(
  () => preferencesForm.value.missionReminders,
  async newVal => {
    if (profileStore.preferences && newVal !== profileStore.preferences.missionReminders) {
      const result = await profileStore.updatePreferences({ missionReminders: newVal })
      if (!result.success) {
        toast.error(result.message)
        preferencesForm.value.missionReminders = profileStore.preferences.missionReminders
      }
    }
  }
)

watch(
  () => preferencesForm.value.language,
  async newVal => {
    if (profileStore.preferences && newVal !== profileStore.preferences.language) {
      try {
        await changeLanguage(newVal)
        toast.success(t('teacher.profile.settings.language_updated'))
      } catch {
        preferencesForm.value.language = profileStore.preferences.language
      }
    }
  }
)

watch(
  () => preferencesForm.value.theme,
  async newVal => {
    if (profileStore.preferences && newVal !== profileStore.preferences.theme) {
      const result = await profileStore.updatePreferences({ theme: newVal })
      if (result.success) {
        toast.success(t('teacher.profile.settings.theme_updated'))
      } else {
        toast.error(result.message)
        preferencesForm.value.theme = profileStore.preferences.theme
      }
    }
  }
)

// Actions
const changePassword = async () => {
  if (securityForm.value.newPassword !== securityForm.value.confirmPassword) {
    toast.error(t('teacher.profile.security.validation.passwords_mismatch'))
    return
  }

  if (securityForm.value.newPassword.length < 6) {
    toast.error(t('teacher.profile.security.validation.password_min_length'))
    return
  }

  isChangingPassword.value = true
  const result = await profileStore.changePassword({
    currentPassword: securityForm.value.currentPassword,
    newPassword: securityForm.value.newPassword,
  })
  isChangingPassword.value = false

  if (result.success) {
    toast.success(result.message)
    securityForm.value.currentPassword = ''
    securityForm.value.newPassword = ''
    securityForm.value.confirmPassword = ''
  } else {
    toast.error(result.message)
  }
}

const changeEmail = async () => {
  if (!securityForm.value.newEmail) {
    toast.error(t('teacher.profile.security.validation.email_invalid'))
    return
  }

  isChangingEmail.value = true
  const result = await profileStore.changeEmail({
    newEmail: securityForm.value.newEmail,
    password: '',
  })
  isChangingEmail.value = false

  if (result.success) {
    toast.success(result.message)
    securityForm.value.newEmail = ''
  } else {
    toast.error(result.message)
  }
}

const toggleTwoFactor = async (enabled: boolean) => {
  isTogglingTwoFactor.value = true
  const result = await profileStore.toggleTwoFactor(enabled)
  isTogglingTwoFactor.value = false

  if (result.success) {
    toast.success(result.message)
  } else {
    toast.error(result.message)
  }
}

const closeSession = async (sessionId: string) => {
  const result = await profileStore.closeSession(sessionId)
  if (result.success) {
    toast.success(result.message)
  } else {
    toast.error(result.message)
  }
}

const closeAllSessions = async () => {
  const result = await profileStore.closeAllSessions()
  if (result.success) {
    toast.success(result.message)
  } else {
    toast.error(result.message)
  }
}

const deleteAccount = async () => {
  if (!deletePassword.value) {
    toast.error(t('teacher.profile.security.validation.password_required'))
    return
  }

  isDeleting.value = true
  const result = await profileStore.deleteAccount(deletePassword.value)
  isDeleting.value = false

  if (result.success) {
    toast.success(result.message)
  } else {
    toast.error(result.message)
  }
}

// Language options for select
const languageOptions = computed(() =>
  APP_LANGUAGE_CODES.map(code => ({
    value: code,
    label: t(`teacher.profile.settings.languages.${code}`),
  }))
)
</script>
