<template>
  <div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
    <article
      v-for="{ course, state, resume } in cards"
      :key="course.slug"
      class="flex min-w-0 flex-col overflow-hidden rounded-2xl border border-border-primary bg-surface shadow-sm transition-shadow hover:shadow-md"
    >
        <NuxtLink :to="helpCoursePath(course.slug)" :aria-label="course.title" class="group relative block">
          <HelpVideoThumb
            :src="course.cover"
            :accent="course.accent"
            :icon="course.icon"
            :rounded="false"
          />
          <span
            v-if="course.videoCount"
            class="absolute bottom-2 right-2 inline-flex items-center gap-1 rounded-md bg-[#03003C]/85 px-2 py-1 text-xs font-semibold text-white"
          >
            <PlayIcon class="h-3.5 w-3.5" />
            {{ t('common.help.courses.video_lessons', { count: course.videoCount }, course.videoCount) }}
          </span>
        </NuxtLink>

        <div class="flex flex-1 flex-col p-5">
          <p class="text-xs font-semibold uppercase tracking-wider text-navy-700">
            {{ t(`common.help.audience.${course.audience}`) }}
          </p>
          <h3 class="mt-1 text-lg font-bold leading-tight text-navy-700">
            <NuxtLink :to="helpCoursePath(course.slug)" class="hover:underline">{{ course.title }}</NuxtLink>
          </h3>
          <p class="mt-1 text-sm text-navy-700">{{ course.description }}</p>

          <div class="mt-auto space-y-3 pt-4">
            <p class="text-xs font-medium text-navy-700">
              {{
                t(
                  'common.help.courses.lesson_count',
                  { count: course.items.length },
                  course.items.length
                )
              }}<template v-if="course.videoSeconds">
                · {{ t('common.help.courses.minutes', { n: courseMinutes(course) }) }}</template
              >
            </p>
            <HelpCourseProgressBar v-if="state.started" :state="state" />
            <NuxtLink
              :to="resume?.to ?? helpCoursePath(course.slug)"
              class="inline-flex min-h-10 items-center gap-1.5 rounded-xl bg-navy-700 px-4 text-sm font-semibold text-white hover:bg-navy-600"
            >
              {{ resume ? t('common.help.courses.resume') : t('common.help.courses.view_course') }}
              <ArrowRightIcon class="h-4 w-4" aria-hidden="true" />
            </NuxtLink>
          </div>
        </div>
    </article>
  </div>
</template>

<script setup lang="ts">
import { ArrowRightIcon } from '@heroicons/vue/24/outline'
import { PlayIcon } from '@heroicons/vue/24/solid'
import type { ResolvedHelpCourse } from '~/composables/useHelpCourses'
import { helpCourseMinutes, helpCoursePath } from '~/utils/help-courses'

const props = defineProps<{ courses: ResolvedHelpCourse[] }>()

const { t } = useI18n()
const { courseProgress, resumeLesson } = useHelpCourses()

const courseMinutes = (course: ResolvedHelpCourse) => helpCourseMinutes(course.videoSeconds)
const cards = computed(() => props.courses.map(course => ({
  course,
  state: courseProgress(course),
  resume: resumeLesson(course),
})))
</script>
