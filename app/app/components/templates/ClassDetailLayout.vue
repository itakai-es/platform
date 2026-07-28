<template>
  <div>
    <!-- Loading State -->
    <div v-if="loading" class="space-y-6">
      <Skeleton width="w-48" height="h-4" />
      <Skeleton width="w-64" height="h-8" />
      <div class="flex gap-2">
        <Skeleton v-for="i in tabs.length" :key="i" width="w-24" height="h-10" />
      </div>
      <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Skeleton v-for="i in 3" :key="i" height="h-32" />
      </div>
    </div>

    <!-- Error State -->
    <EmptyState
      v-else-if="error"
      :icon="ExclamationTriangleIcon"
      :title="resolvedErrorTitle"
      :description="resolvedErrorMessage"
    >
      <template #action>
        <NuxtLink :to="backLink">
          <Button variant="primary">{{ resolvedBackText }}</Button>
        </NuxtLink>
      </template>
    </EmptyState>

    <!-- Main Content -->
    <template v-else>
      <!-- Class Header -->
      <div class="bg-navy-700 -mx-4 md:-mx-6 -mt-4 md:-mt-6 px-4 md:px-6 pt-6 pb-0 mb-6">
        <div class="space-y-4">
          <!-- Breadcrumb -->
          <nav class="flex items-center gap-1.5 sm:gap-2 text-sm overflow-x-auto scrollbar-subtle">
            <NuxtLink :to="dashboardLink" class="text-white/70 hover:text-white flex-shrink-0">
              <HomeIcon class="w-4 h-4" />
            </NuxtLink>
            <span class="hidden sm:flex items-center gap-1.5 sm:gap-2">
              <ChevronRightIcon class="w-4 h-4 text-white/70" />
              <NuxtLink
                :to="classesLink"
                class="text-white/70 hover:text-white whitespace-nowrap"
                >{{ t('teacher.components.class_detail_layout.breadcrumb_classes') }}</NuxtLink
              >
            </span>
            <ChevronRightIcon class="w-4 h-4 text-white/70 flex-shrink-0" />
            <span class="text-white font-medium truncate max-w-[180px] sm:max-w-none">{{
              title
            }}</span>
          </nav>

          <!-- Page Header -->
          <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div class="flex items-center gap-3">
              <div
                class="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-white/20 flex items-center justify-center"
              >
                <component :is="icon" class="w-5 h-5 sm:w-6 sm:h-6 text-white" />
              </div>
              <div>
                <h1 class="text-3xl sm:text-4xl font-bold text-white">{{ title }}</h1>
                <p class="text-white/70">{{ subtitle }}</p>
              </div>
            </div>
            <div v-if="$slots.actions" class="flex items-center gap-2">
              <slot name="actions" />
            </div>
          </div>

          <!-- Tabs -->
          <div class="flex gap-0 overflow-x-auto scrollbar-subtle">
            <button
              v-for="tab in tabs"
              :key="tab.id"
              :class="[
                'px-3 sm:px-4 lg:px-8 py-3 text-sm sm:text-base font-medium transition-colors flex items-center gap-2 rounded-t-2xl whitespace-nowrap flex-shrink-0',
                modelValue === tab.id
                  ? 'bg-surface text-navy-700'
                  : 'text-white/70 hover:text-white hover:bg-white/10',
              ]"
              @click="emit('update:modelValue', tab.id)"
            >
              <component v-if="menuDisplay !== 'text'" :is="tab.icon" class="w-5 h-5" />
              <span
                v-if="menuDisplay !== 'icon'"
                :class="menuDisplay === 'both' ? 'hidden sm:inline' : ''"
                >{{ tab.label }}</span
              >
            </button>
          </div>
        </div>
      </div>

      <!-- Tab Content -->
      <div class="space-y-6">
        <slot />
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { ExclamationTriangleIcon, HomeIcon, ChevronRightIcon } from '@heroicons/vue/24/outline'

const { t } = useI18n()

interface Tab {
  id: string
  label: string
  icon: any
}

interface Props {
  modelValue: string
  loading?: boolean
  error?: boolean
  errorTitle?: string
  errorMessage?: string
  title: string
  subtitle: string
  icon: any
  tabs: Tab[]
  dashboardLink: string
  classesLink: string
  backLink: string
  backText?: string
}

// Preferencia de usuario: icono / texto / ambos en las pestañas.
const menuDisplay = useMenuDisplay()

const props = withDefaults(defineProps<Props>(), {
  loading: false,
  error: false,
  errorTitle: undefined,
  errorMessage: undefined,
  backText: undefined,
})

const resolvedErrorTitle = computed(
  () => props.errorTitle ?? t('teacher.components.class_detail_layout.error_title')
)
const resolvedErrorMessage = computed(
  () => props.errorMessage ?? t('teacher.components.class_detail_layout.not_found')
)
const resolvedBackText = computed(
  () => props.backText ?? t('teacher.components.class_detail_layout.btn_back')
)

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()
</script>
