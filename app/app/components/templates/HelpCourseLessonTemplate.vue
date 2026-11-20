<template>
  <div class="course-lesson">
    <Breadcrumb :items="breadcrumbs" />

    <HelpLoadError v-if="indexError" area="ayuda" />
    <div v-else-if="pending || !index" class="grid gap-5 lg:grid-cols-[minmax(0,1fr)_22rem]">
      <Skeleton height="h-auto" custom-class="aspect-video rounded-2xl" />
      <Skeleton height="h-72" custom-class="hidden rounded-2xl lg:block" />
    </div>
    <EmptyState
      v-else-if="!article || !lesson"
      :icon="AcademicCapIcon"
      :title="t('common.help.not_found_title')"
      :description="t('common.help.not_found_description')"
    />

    <div v-else class="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_22rem]">
      <section class="min-w-0">
        <div
          v-if="article.videoUrl"
          class="overflow-hidden rounded-2xl bg-[#03003C] shadow-lg"
          :class="{ 'p-4': externalLink }"
        >
          <HelpDeviceToggle v-if="hasMobile" :model-value="device" @update:model-value="setDevice" />
          <HelpVideoEmbed
            :key="shownVideoUrl"
            :url="shownVideoUrl"
            :title="article.title"
            :poster="getImageUrl(article.coverImage)"
            :rounded="false"
            :autoplay="startAutomatically"
            :start-at="videoPosition(article.id)"
            exit-fullscreen-on-end
            @progress="trackVideo"
            @ended="finishVideo"
          />
        </div>

        <div class="mt-4 flex flex-wrap items-end justify-between gap-3">
          <div class="min-w-0">
            <p class="mb-1 text-sm font-medium text-navy-700/80 lg:hidden">
              {{ t('common.help.courses.lesson_of', { n: lesson.current.number, total: lesson.course.items.length }) }}
            </p>
            <h1 class="break-words text-2xl font-bold leading-tight text-navy-700 sm:text-3xl">
              {{ article.title }}
            </h1>
            <HelpVisitCount v-if="visits !== undefined" :count="visits" class="mt-2 text-sm text-navy-700/80" />
          </div>
          <label class="inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-xl border border-border-primary bg-surface px-3 text-sm font-semibold text-navy-700">
            <input
              type="checkbox"
              class="h-4 w-4 accent-purple"
              :checked="completed"
              @change="changeCompleted"
            />
            {{ t('common.help.courses.mark_complete') }}
          </label>
        </div>

        <div
          v-if="nextSeconds !== null"
          class="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border-primary bg-surface p-3 text-sm text-navy-700"
        >
          <div>
            <p class="font-semibold">{{ t('common.help.courses.up_next_in', { seconds: nextSeconds }) }}</p>
            <p>{{ lesson.next?.article.title }}</p>
          </div>
          <button type="button" class="min-h-11 rounded-lg px-3 font-semibold underline" @click="cancelNext">
            {{ t('common.help.courses.cancel_next') }}
          </button>
        </div>
      </section>

      <aside class="min-w-0 lg:sticky lg:top-24 lg:col-start-2 lg:row-span-2 lg:row-start-1">
        <HelpCoursePlaylist :course="lesson.course" :current="lesson.current.number" />
      </aside>

      <article class="min-w-0 lg:col-start-1 lg:row-start-2">
        <nav
          :aria-label="t('common.help.courses.lesson_actions')"
          class="mb-4 flex flex-wrap items-center gap-2"
        >
          <NuxtLink
            v-if="lesson.previous"
            :to="lesson.previous.to"
            class="inline-flex min-h-11 items-center gap-1.5 rounded-xl border border-border-primary bg-surface px-3 text-sm font-semibold text-navy-700 hover:bg-bg-secondary"
          >
            <ArrowLeftIcon class="h-4 w-4" aria-hidden="true" />
            {{ t('common.help.courses.previous_lesson') }}
          </NuxtLink>
          <NuxtLink
            v-if="lesson.next"
            :to="lesson.next.to"
            class="inline-flex min-h-11 items-center gap-1.5 rounded-xl bg-navy-700 px-3 text-sm font-semibold text-white hover:bg-navy-600"
          >
            {{ t('common.help.courses.next_lesson') }}
            <ArrowRightIcon class="h-4 w-4" aria-hidden="true" />
          </NuxtLink>
          <NuxtLink
            v-else
            :to="helpCoursePath(lesson.course.slug)"
            class="inline-flex min-h-11 items-center rounded-xl bg-navy-700 px-3 text-sm font-semibold text-white"
          >
            {{ t('common.help.courses.back_to_course') }}
          </NuxtLink>
          <NuxtLink
            :to="route.path"
            class="mx-2 inline-flex min-h-11 items-center text-sm font-semibold text-navy-700 underline underline-offset-4"
          >
            {{ t('common.help.courses.open_guide') }}
          </NuxtLink>
        </nav>

        <HelpArticleBody :article="article" :accent="lesson.current.category.accent" :hide-media="!!article.videoUrl" />
      </article>
    </div>
  </div>
</template>

<script setup lang="ts">
import { AcademicCapIcon, ArrowLeftIcon, ArrowRightIcon } from '@heroicons/vue/24/outline'
import HelpVisitCount from '~/components/atoms/HelpVisitCount.vue'
import { useHelpArticleVisit } from '~/composables/useHelpArticleVisit'
import { useHelpDevice } from '~/composables/useHelpDevice'
import type { HelpArticle } from '~/types/help.types'
import { HELP_COURSES_PATH, helpCourse, helpCoursePath } from '~/utils/help-courses'
import { videoEmbed } from '~/utils/help-video'

const { t } = useI18n()
const route = useRoute()
const {
  index, indexError, ensureIndex, fetchArticle, lessonContext, sectionTitle,
  markVisited, setCompleted, isCompleted, videoPosition, saveVideoPosition, autoplay,
} = useHelpCourses()
const { getImageUrl } = useImageUrl()

const courseSlug = computed(() => String(route.query.curso))
const coursePath = computed(() => helpCoursePath(courseSlug.value))
const lesson = computed(() =>
  lessonContext(courseSlug.value, String(route.params.categoria), String(route.params.articulo))
)
const article = shallowRef<HelpArticle | null>(null)
const pending = ref(true)
const visits = useHelpArticleVisit(() => !pending.value && index.value && lesson.value ? article.value : null)
const startAutomatically = ref(false)
const { device, hasMobile, shownVideoUrl, setDevice } = useHelpDevice(() => article.value?.videoUrl)
const externalLink = computed(() => videoEmbed(shownVideoUrl.value).type === 'link')
const completed = computed(() => !!article.value && isCompleted(courseSlug.value, article.value.id))
const breadcrumbs = computed(() => [
  { label: sectionTitle.value, to: '/ayuda' },
  { label: t('common.help.courses.title'), to: HELP_COURSES_PATH },
  { label: lesson.value?.course.title ?? t(`common.help.courses.items.${courseSlug.value}.title`), to: coursePath.value },
])

let request = 0
let autoplayTarget: string | undefined
let countdown: ReturnType<typeof setInterval> | undefined
const nextSeconds = ref<number | null>(null)

function cancelNext() {
  clearInterval(countdown)
  countdown = undefined
  nextSeconds.value = null
}

async function loadLesson() {
  const version = ++request
  const [category, slug] = [String(route.params.categoria), String(route.params.articulo)]
  startAutomatically.value = autoplayTarget === route.fullPath
  autoplayTarget = undefined
  pending.value = true
  article.value = null
  cancelNext()

  try {
    const response = await fetchArticle(category, slug, true)
    if (version === request) article.value = response.article
  } catch {
    if (version === request) article.value = null
  } finally {
    if (version === request) pending.value = false
  }
}

function changeCompleted(event: Event) {
  if (article.value && event.target instanceof HTMLInputElement) {
    setCompleted(courseSlug.value, article.value.id, event.target.checked)
  }
}

function trackVideo(seconds: number, duration: number) {
  if (article.value) saveVideoPosition(article.value.id, seconds, duration)
}

function finishVideo() {
  if (!article.value || !lesson.value) return
  setCompleted(courseSlug.value, article.value.id, true)
  saveVideoPosition(article.value.id, 0, 0)
  const next = lesson.value.next
  if (!autoplay.value || !next) return

  cancelNext()
  nextSeconds.value = 5
  countdown = setInterval(() => {
    if (nextSeconds.value !== null && nextSeconds.value > 1) {
      nextSeconds.value--
      return
    }
    cancelNext()
    autoplayTarget = next.to
    void navigateTo(next.to)
  }, 1000)
}

watch(() => [route.path, courseSlug.value], loadLesson)
watch(autoplay, value => { if (!value) cancelNext() })
watch([article, lesson], ([item, context]) => {
  if (item && context?.current.article.id === item.id) markVisited(context.course.slug, item.id)
})
watch([article, lesson, () => route.hash], async ([item, context, hash]) => {
  if (!item || !context || !hash) return
  await nextTick()
  document.getElementById(hash.slice(1))?.scrollIntoView()
})

onMounted(() => {
  void ensureIndex()
  void loadLesson()
})
onBeforeUnmount(cancelNext)

useHead({
  title: () => article.value
    ? `${article.value.title} · ${sectionTitle.value}`
    : t(helpCourse(courseSlug.value) ? `common.help.courses.items.${courseSlug.value}.title` : 'common.help.courses.title'),
})
</script>
