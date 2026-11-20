<template>
  <div>
    <Breadcrumb :items="breadcrumbs" />

    <div v-if="loadingIndex && !index">
      <Skeleton height="h-40" custom-class="mb-6 rounded-2xl" />
      <Skeleton v-for="i in 5" :key="i" height="h-16" custom-class="mb-2 rounded-2xl" />
    </div>

    <HelpLoadError v-else-if="indexError" area="ayuda" />

    <template v-else-if="course && course.items.length">
      <section class="mb-8 overflow-hidden rounded-2xl bg-[#03003C] text-white shadow-lg">
        <div class="grid items-center gap-6 p-5 sm:p-7 md:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)] lg:p-9">
          <div class="min-w-0">
            <p class="text-sm font-semibold text-mint">
              {{ t(`common.help.audience.${course.audience}`) }}
            </p>
            <h1 class="mt-2 break-words text-3xl font-bold leading-tight text-white sm:text-4xl">{{ course.title }}</h1>
            <p class="mt-3 max-w-xl text-base text-white/90">{{ course.description }}</p>
            <div class="mt-5 flex flex-wrap gap-x-5 gap-y-2 text-sm font-medium">
              <span class="inline-flex items-center gap-1.5">
                <BookOpenIcon class="h-4 w-4" aria-hidden="true" />
                {{ t('common.help.courses.lesson_count', { count: course.items.length }, course.items.length) }}
              </span>
              <span v-if="course.videoSeconds" class="inline-flex items-center gap-1.5">
                <ClockIcon class="h-4 w-4" aria-hidden="true" />
                {{ t('common.help.courses.minutes', { n: helpCourseMinutes(course.videoSeconds) }) }}
              </span>
            </div>
            <HelpCourseProgressBar v-if="state?.started" class="mt-5 max-w-sm" :state="state" on-dark />
            <NuxtLink
              :to="startLesson.to"
              class="mt-6 inline-flex min-h-11 items-center gap-2 rounded-xl bg-mint px-4 text-sm font-bold text-[#03003C] hover:bg-mint/90"
            >
              {{ startLabel }}
              <ArrowRightIcon class="h-4 w-4" aria-hidden="true" />
            </NuxtLink>
          </div>
          <HelpVideoThumb :src="course.cover" :accent="course.accent" :icon="course.icon" />
        </div>
      </section>

      <h2 class="mb-3 text-xl font-bold text-navy-700">{{ t('common.help.courses.curriculum') }}</h2>
      <ol class="overflow-hidden rounded-2xl border border-border-primary bg-surface shadow-sm">
        <li
          v-for="item in course.items"
          :key="item.article.id"
          class="border-b border-border-primary last:border-b-0"
        >
          <NuxtLink
            :to="item.to"
            class="group flex items-center gap-3 px-3 py-3 transition-colors hover:bg-bg-secondary sm:gap-4 sm:px-4"
          >
            <span
              class="hidden w-6 shrink-0 text-center text-sm font-bold text-navy-700/70 sm:block"
              aria-hidden="true"
            >
              {{ item.number }}
            </span>
            <HelpVideoThumb
              :src="getImageUrl(item.article.coverImage)"
              :video="!!item.article.hasVideo"
              :duration="item.article.videoDuration"
              :accent="item.category.accent"
              :icon="item.category.icon"
              :progress="visited(item.article.id) ? 0 : videoFraction(item.article)"
              small
              class="w-28 shrink-0 sm:w-44"
            />
            <span class="min-w-0 flex-1">
              <span class="sr-only">
                {{ t('common.help.courses.lesson_of', { n: item.number, total: course.items.length }) }}:
              </span>
              <span class="flex flex-wrap items-center gap-x-2 gap-y-1">
                <span class="font-semibold leading-snug text-navy-700">
                  <span class="sm:hidden">{{ item.number }}. </span>{{ item.article.title }}
                </span>
                <span
                  v-if="visited(item.article.id)"
                  class="inline-flex items-center gap-1 rounded-full bg-mint/30 px-2 py-0.5 text-xs font-semibold text-navy-700"
                >
                  <CheckIcon class="h-3.5 w-3.5" />
                  {{ t('common.help.courses.lesson_complete') }}
                </span>
                <span
                  v-else-if="videoFraction(item.article)"
                  class="inline-flex rounded-full bg-purple/10 px-2 py-0.5 text-xs font-semibold text-navy-700"
                >
                  {{ t('common.help.courses.in_progress') }}
                </span>
              </span>
              <span
                v-if="item.article.summary"
                class="mt-0.5 line-clamp-2 block text-sm text-navy-700/70"
              >
                {{ item.article.summary }}
              </span>
              <span class="mt-1 hidden text-xs font-medium text-navy-700/70 sm:block">
                {{ item.category.name }}
              </span>
            </span>
            <ChevronRightIcon
              class="hidden h-4 w-4 shrink-0 text-navy-700/40 transition-colors group-hover:text-purple sm:block"
            />
          </NuxtLink>
        </li>
      </ol>
    </template>

    <EmptyState
      v-else
      :icon="AcademicCapIcon"
      :title="t('common.help.courses.not_found_title')"
      :description="t('common.help.courses.not_found_description')"
    />
  </div>
</template>

<script setup lang="ts">
import {
  AcademicCapIcon,
  ArrowRightIcon,
  BookOpenIcon,
  ClockIcon,
  CheckIcon,
  ChevronRightIcon,
} from '@heroicons/vue/24/outline'
import { HELP_COURSES_PATH, helpCourseMinutes } from '~/utils/help-courses'

/** Un curso del centro de ayuda: su cabecera y sus lecciones en orden. */

definePageMeta({ layout: 'help' })

const { t } = useI18n()
const route = useRoute()
const {
  index,
  loadingIndex,
  indexError,
  ensureIndex,
  getCourse,
  setScope,
  scope,
  portalPath,
  sectionTitle,
  isCompleted,
  resumeLesson,
  courseProgress,
  videoFraction,
} = useHelpCourses()
const { getImageUrl } = useImageUrl()

const course = computed(() => (index.value ? getCourse(String(route.params.curso)) : null))

const visited = (articleId: string) =>
  course.value ? isCompleted(course.value.slug, articleId) : false

/** Por dónde seguir: la primera lección sin abrir si ya se empezó; si no, la primera. */
const resume = computed(() => (course.value ? resumeLesson(course.value) : null))
const state = computed(() => course.value ? courseProgress(course.value) : null)
const startLesson = computed(() => resume.value ?? course.value!.items[0]!)
const startLabel = computed(() =>
  resume.value
    ? t('common.help.courses.resume_lesson', { n: resume.value.number })
    : state.value?.finished
      ? t('common.help.courses.rewatch')
      : t('common.help.courses.start')
)

// El selector de portada sigue al público del curso.
watch(
  course,
  value => {
    if (!value || scope.value === 'todo') return
    const target = value.audience === 'desarrollador' ? 'todo' : value.audience
    if (scope.value !== target) setScope(target)
  },
  { immediate: true }
)

const breadcrumbs = computed(() => [
  { label: sectionTitle.value, to: portalPath(scope.value) },
  { label: t('common.help.courses.title'), to: HELP_COURSES_PATH },
  ...(course.value ? [{ label: course.value.title }] : []),
])

onMounted(ensureIndex)

useHead({
  title: () =>
    course.value ? `${course.value.title} · ${sectionTitle.value}` : t('common.help.courses.title'),
  meta: [{ name: 'description', content: () => course.value?.description ?? t('common.help.courses.subtitle') }],
})
</script>
