<template>
  <div class="space-y-6">
    <PageHeader :title="t('admin.settings.title')" :subtitle="t('admin.settings.subtitle')" />

    <!-- Loading skeleton -->
    <div v-if="isLoadingSettings && !form" class="space-y-6">
      <div v-for="n in 3" :key="n" class="bg-white rounded-2xl shadow-lg p-6 md:p-8 animate-pulse">
        <div class="h-5 w-48 bg-gray-200 rounded mb-5" />
        <div class="space-y-3">
          <div class="h-11 bg-gray-100 rounded-2xl" />
          <div class="h-11 bg-gray-100 rounded-2xl" />
        </div>
      </div>
    </div>

    <template v-else-if="form">
      <!-- ─────────────── IA ─────────────── -->
      <SettingsSectionCard
        :icon="SparklesIcon"
        :title="t('admin.settings.ai.title')"
        :description="t('admin.settings.ai.desc')"
        :saving="savingSection === 'ai'"
        :save-label="t('admin.settings.save')"
        @save="save('ai')"
      >
        <!-- Texto -->
        <div>
          <p class="text-sm font-semibold text-navy-700 mb-3 flex items-center gap-2">
            <ChatBubbleLeftRightIcon class="w-4 h-4" /> {{ t('admin.settings.ai.text_title') }}
          </p>
          <div class="grid gap-3 sm:grid-cols-2">
            <FormField v-model="form.ai.text.baseUrl" class="sm:col-span-2" :label="t('admin.settings.ai.endpoint_url')" placeholder="https://api.openai.com" />
            <FormField v-model="form.ai.text.apiKey" :label="t('admin.settings.ai.api_key')" autocomplete="off" placeholder="sk-…" />
            <FormField v-model="form.ai.text.model" :label="t('admin.settings.ai.model')" placeholder="gpt-4o-mini" />
          </div>
        </div>

        <hr class="border-border-primary" />

        <!-- Imágenes -->
        <div>
          <p class="text-sm font-semibold text-navy-700 mb-3 flex items-center gap-2">
            <PhotoIcon class="w-4 h-4" /> {{ t('admin.settings.ai.image_title') }}
          </p>
          <div class="grid gap-3 sm:grid-cols-2">
            <FormField v-model="form.ai.image.baseUrl" class="sm:col-span-2" :label="t('admin.settings.ai.endpoint_url')" placeholder="https://api.openai.com" />
            <FormField v-model="form.ai.image.apiKey" :label="t('admin.settings.ai.api_key')" autocomplete="off" placeholder="sk-…" />
            <FormField v-model="form.ai.image.model" :label="t('admin.settings.ai.model')" placeholder="dall-e-3" />
          </div>
        </div>
      </SettingsSectionCard>

      <!-- ─────────────── Almacenamiento ─────────────── -->
      <SettingsSectionCard
        :icon="CircleStackIcon"
        :title="t('admin.settings.storage.title')"
        :description="t('admin.settings.storage.desc')"
        :saving="savingSection === 'storage'"
        :save-label="t('admin.settings.save')"
        @save="save('storage')"
      >
        <div class="sm:w-2/3">
          <label class="text-sm font-medium text-text-primary mb-2 block">{{ t('admin.settings.storage.driver') }}</label>
          <SelectDropdown v-model="form.storage.driver" :options="storageDriverOptions" />
        </div>

        <div v-if="form.storage.driver === 's3'" class="space-y-3 rounded-2xl border border-border-primary p-4">
          <div class="grid gap-3 sm:grid-cols-2">
            <FormField v-model="form.storage.s3.endpoint" class="sm:col-span-2" :label="t('admin.settings.storage.endpoint')" placeholder="https://<accountid>.r2.cloudflarestorage.com" />
            <FormField v-model="form.storage.s3.bucket" :label="t('admin.settings.storage.bucket')" />
            <FormField v-model="form.storage.s3.region" :label="t('admin.settings.storage.region')" placeholder="auto" />
            <FormField v-model="form.storage.s3.accessKeyId" :label="t('admin.settings.storage.access_key')" autocomplete="off" />
            <FormField v-model="form.storage.s3.secretAccessKey" :label="t('admin.settings.storage.secret_key')" autocomplete="off" />
            <FormField v-model="form.storage.s3.publicBaseUrl" class="sm:col-span-2" :label="t('admin.settings.storage.public_url')" :hint="t('admin.settings.storage.public_url_hint')" placeholder="https://cdn.tu-dominio.com" />
          </div>
          <div class="flex items-center justify-between rounded-xl bg-bg-secondary px-3 py-2.5">
            <span class="text-sm font-medium text-navy-700">{{ t('admin.settings.storage.path_style') }}</span>
            <Toggle v-model="form.storage.s3.forcePathStyle" />
          </div>
        </div>
      </SettingsSectionCard>

      <!-- ─────────────── Dominio ─────────────── -->
      <SettingsSectionCard
        :icon="GlobeAltIcon"
        :title="t('admin.settings.domain.title')"
        :description="t('admin.settings.domain.desc')"
        :saving="savingSection === 'domain'"
        :save-label="t('admin.settings.save')"
        @save="save('domain')"
      >
        <div class="grid gap-3 sm:grid-cols-2">
          <FormField v-model="form.domain.appUrl" :label="t('admin.settings.domain.app_url')" :hint="t('admin.settings.domain.app_url_hint')" placeholder="https://tu-instancia.com" />
          <FormField v-model="form.domain.corsOrigins" :label="t('admin.settings.domain.cors')" :hint="t('admin.settings.domain.cors_hint')" />
        </div>
      </SettingsSectionCard>

      <!-- ─────────────── General ─────────────── -->
      <SettingsSectionCard
        :icon="Cog6ToothIcon"
        :title="t('admin.settings.general.title')"
        :description="t('admin.settings.general.desc')"
        :saving="savingSection === 'general'"
        :save-label="t('admin.settings.save')"
        @save="save('general')"
      >
        <div class="grid gap-3 sm:grid-cols-2">
          <FormField v-model="form.general.platformName" :label="t('admin.settings.general.platform_name')" />
          <FormField v-model="form.general.contactEmail" type="email" :label="t('admin.settings.general.contact_email')" autocomplete="off" />
          <div>
            <label class="text-sm font-medium text-text-primary mb-2 block">{{ t('admin.settings.general.default_language') }}</label>
            <SelectDropdown v-model="form.general.defaultLanguage" :options="languageOptions" />
          </div>
        </div>

        <div class="flex items-center justify-between rounded-2xl border border-border-primary p-4">
          <div class="min-w-0 pr-4">
            <p class="font-semibold text-navy-700">{{ t('admin.settings.general.registration_open') }}</p>
            <p class="mt-0.5 text-sm text-navy-700/70">{{ t('admin.settings.general.registration_hint') }}</p>
          </div>
          <Toggle v-model="form.general.registrationOpen" class="flex-shrink-0" />
        </div>

        <div class="flex items-center justify-between rounded-2xl border border-border-primary p-4">
          <div class="min-w-0 pr-4">
            <p class="font-semibold text-navy-700">{{ t('admin.settings.general.maintenance_mode') }}</p>
            <p class="mt-0.5 text-sm text-navy-700/70">{{ t('admin.settings.general.maintenance_hint') }}</p>
          </div>
          <Toggle v-model="form.general.maintenanceMode" class="flex-shrink-0" />
        </div>
      </SettingsSectionCard>
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import { storeToRefs } from 'pinia'
import {
  SparklesIcon,
  ChatBubbleLeftRightIcon,
  PhotoIcon,
  CircleStackIcon,
  GlobeAltIcon,
  Cog6ToothIcon,
} from '@heroicons/vue/24/outline'
import type { SystemSettings } from '~/types/admin.types'

const { t } = useI18n()
const toast = useToast()
const adminStore = useAdminStore()
const { settings, isLoadingSettings } = storeToRefs(adminStore)

useHead({
  title: () => t('admin.settings.meta.title'),
  meta: [{ name: 'description', content: () => t('admin.settings.meta.description') }],
})

definePageMeta({
  layout: 'admin',
  middleware: ['auth', 'onboarding', 'role'],
  role: 'admin',
})

// Copia local editable (se resincroniza cuando el store cambia, p. ej. tras guardar).
const form = ref<SystemSettings | null>(null)
const savingSection = ref<string | null>(null)

function syncForm() {
  form.value = settings.value ? JSON.parse(JSON.stringify(settings.value)) : null
}

watch(settings, syncForm)

onMounted(async () => {
  await adminStore.ensureSettings()
  syncForm()
})

async function save(section: 'ai' | 'storage' | 'domain' | 'general') {
  if (!form.value) return
  savingSection.value = section
  try {
    await adminStore.updateSettings(section, form.value[section] as Record<string, unknown>)
    toast.success(t('admin.settings.saved'))
  } catch {
    toast.error(t('admin.settings.save_error'))
  } finally {
    savingSection.value = null
  }
}

const storageDriverOptions = computed(() => [
  { value: 'local', label: t('admin.settings.storage.driver_local') },
  { value: 's3', label: t('admin.settings.storage.driver_s3') },
])
const languageOptions = computed(() => [
  { value: 'es', label: 'Castellano' },
  { value: 'en', label: 'English' },
  { value: 'ca', label: 'Català' },
  { value: 'eu', label: 'Euskara' },
  { value: 'gl', label: 'Galego' },
])
</script>
