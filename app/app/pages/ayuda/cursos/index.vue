<template>
  <div>
    <PageHeader
      :breadcrumbs="breadcrumbs"
      :title="t('common.help.courses.title')"
      :subtitle="t('common.help.courses.subtitle')"
    />

    <div v-if="loadingIndex && !index" class="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      <Skeleton v-for="i in 3" :key="i" height="h-44" custom-class="rounded-2xl" />
    </div>

    <HelpLoadError v-else-if="indexError" area="ayuda" />

    <HelpCourseCards v-else-if="courses.length" :courses="courses" />

    <EmptyState
      v-else
      :icon="AcademicCapIcon"
      :title="t('common.help.courses.empty_title')"
      :description="t('common.help.courses.empty_description')"
    />
  </div>
</template>

<script setup lang="ts">
import { AcademicCapIcon } from '@heroicons/vue/24/outline'

/**
 * Índice de cursos del centro de ayuda. Respeta la portada activa
 * (profesorado o alumnado); desde «Toda la ayuda» salen todos.
 */

definePageMeta({ layout: 'help' })

const { t } = useI18n()
const { index, loadingIndex, indexError, ensureIndex, courses, scope, portalPath, sectionTitle } =
  useHelpCourses()

const breadcrumbs = computed(() => [
  { label: sectionTitle.value, to: portalPath(scope.value) },
  { label: t('common.help.courses.title') },
])

onMounted(ensureIndex)

useHead({
  title: () => `${t('common.help.courses.title')} · ${sectionTitle.value}`,
  meta: [{ name: 'description', content: () => t('common.help.courses.subtitle') }],
})
</script>
