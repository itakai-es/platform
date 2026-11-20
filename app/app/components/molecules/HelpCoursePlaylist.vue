<template>
  <nav
    :aria-label="t('common.help.courses.course_navigation')"
    class="overflow-hidden rounded-2xl bg-surface shadow-lg"
  >
    <div class="border-b border-border-primary px-4 py-4">
      <div class="flex items-center gap-3">
        <div class="min-w-0 flex-1">
          <NuxtLink
            :to="helpCoursePath(course.slug)"
            class="text-base font-bold leading-snug text-navy-700 hover:underline"
          >
            {{ course.title }}
          </NuxtLink>
          <p class="mt-0.5 text-sm font-medium text-navy-700/80">
            {{ t('common.help.courses.lesson_of', { n: current, total: course.items.length }) }}
          </p>
        </div>
        <button
          type="button"
          class="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-navy-700 hover:bg-bg-secondary lg:hidden"
          :aria-label="t('common.help.courses.course_navigation')"
          :aria-expanded="expanded"
          aria-controls="help-course-playlist"
          @click="expanded = !expanded"
        >
          <ChevronDownIcon class="h-5 w-5" :class="{ 'rotate-180': expanded }" aria-hidden="true" />
        </button>
      </div>
      <HelpCourseProgressBar class="mt-4" :state="courseProgress(course)" />
    </div>

    <ol
      id="help-course-playlist"
      ref="items"
      class="relative max-h-80 overflow-y-auto overscroll-contain p-2 lg:block lg:max-h-[calc(100dvh-15rem)]"
      :class="{ hidden: !expanded }"
    >
      <li v-for="item in course.items" :key="item.article.id">
        <NuxtLink
          :to="item.to"
          :aria-current="item.number === current ? 'step' : undefined"
          class="flex items-center gap-2 rounded-xl p-2 text-navy-700"
          :class="
            item.number === current
              ? 'bg-purple/10 font-semibold ring-1 ring-inset ring-purple'
              : 'hover:bg-bg-secondary'
          "
        >
          <span class="flex w-4 shrink-0 items-center justify-center text-xs tabular-nums" aria-hidden="true">
            <PlayIcon v-if="item.number === current" class="h-4 w-4 text-purple" />
            <CheckCircleIcon v-else-if="isCompleted(course.slug, item.article.id)" class="h-4 w-4 text-navy-700" />
            <template v-else>{{ item.number }}</template>
          </span>
          <HelpVideoThumb
            class="w-24 shrink-0"
            :src="getImageUrl(item.article.coverImage)"
            :duration="item.article.videoDuration"
            :video="!!item.article.hasVideo"
            :accent="item.category.accent"
            :icon="item.category.icon"
            :progress="isCompleted(course.slug, item.article.id) ? 0 : videoFraction(item.article)"
            small
          />
          <span class="min-w-0 break-words text-sm leading-snug">
            {{ item.article.title }}
            <span v-if="isCompleted(course.slug, item.article.id)" class="block text-xs font-medium">
              {{ t('common.help.courses.lesson_complete') }}
            </span>
          </span>
        </NuxtLink>
      </li>
    </ol>
    <label
      class="min-h-12 cursor-pointer items-center justify-between gap-2 border-t border-border-primary px-4 py-2 text-sm font-semibold text-navy-700 lg:flex"
      :class="expanded ? 'flex' : 'hidden'"
    >
      {{ t('common.help.courses.autoplay') }}
      <input type="checkbox" class="h-4 w-4 accent-purple" :checked="autoplay" @change="changeAutoplay" />
    </label>
  </nav>
</template>

<script setup lang="ts">
import { CheckCircleIcon, ChevronDownIcon } from '@heroicons/vue/24/outline'
import { PlayIcon } from '@heroicons/vue/24/solid'
import type { ResolvedHelpCourse } from '~/composables/useHelpCourses'
import { helpCoursePath } from '~/utils/help-courses'

const props = defineProps<{ course: ResolvedHelpCourse; current: number }>()
const { t } = useI18n()
const { getImageUrl } = useImageUrl()
const { autoplay, setAutoplay, courseProgress, isCompleted, videoFraction } = useHelpCourses()
const expanded = ref(false)
const items = ref<HTMLOListElement | null>(null)

function changeAutoplay(event: Event) {
  if (event.target instanceof HTMLInputElement) setAutoplay(event.target.checked)
}

function revealCurrent() {
  const list = items.value
  const active = list?.querySelector<HTMLElement>('[aria-current="step"]')
  if (!list || !active || !list.clientHeight) return
  const top = active.offsetTop
  const bottom = top + active.offsetHeight
  if (top < list.scrollTop) list.scrollTop = top
  if (bottom > list.scrollTop + list.clientHeight) list.scrollTop = bottom - list.clientHeight
}

watch(() => props.current, () => { expanded.value = false })
watch([() => props.current, expanded], revealCurrent, { flush: 'post' })
onMounted(revealCurrent)
</script>
