<template>
  <!-- Podio: las tres primeras personas con puesto (nadie con 0) -->
  <Card type="ia" flex>
    <CardHeader :title="t(`${PREFIX}.podium_title`)" :icon="TrophyIcon" />

    <CardItem
      layout="column"
      padding="md"
      :class="[
        '3xl:!p-6 3xl:!pt-14 3xl:!justify-center',
        entries.length === 0 ? '!justify-center' : '',
      ]"
      flex
    >
      <p v-if="entries.length === 0" class="text-sm text-navy-700/80 text-center">
        {{ emptyText }}
      </p>

      <template v-else>
        <!-- En columna, hasta que hay sitio para el podio en horizontal. Si la tarjeta
             se estira junto a otra, las filas la llenan: sin huecos vacíos. -->
        <ol class="flex flex-1 flex-col gap-3 3xl:hidden">
          <li v-for="student in entries" :key="student.id" class="flex flex-1 flex-col">
            <component
              :is="entryTag"
              v-bind="entryAttrs(student)"
              :class="[
                'flex flex-1 flex-wrap items-center gap-x-4 gap-y-2 rounded-xl p-4 border-l-4',
                placeOf(student).surface,
                linkClass,
              ]"
            >
              <div class="relative flex-shrink-0">
                <Avatar
                  :src="student.avatar"
                  :name="student.username"
                  :color="student.avatarColor"
                  :size="student.rank === 1 ? 'md' : 'sm'"
                  :class="['ring-2 shadow-lg', placeOf(student).ring]"
                />
                <span
                  :class="[
                    'absolute -top-1 -left-1 w-6 h-6 rounded-full flex items-center justify-center shadow-lg text-xs font-bold',
                    placeOf(student).badge,
                  ]"
                  aria-hidden="true"
                  >{{ student.rank }}</span
                >
              </div>
              <!-- Sin sitio (letra muy grande a 320 px), el nombre baja bajo el avatar y no se trocea -->
              <div class="flex-1 min-w-[6rem]">
                <p class="font-bold text-navy-700 flex flex-wrap items-center gap-1.5 min-w-0">
                  <span class="sr-only">{{ rankLabel(student) }}</span>
                  <TrophyIcon
                    v-if="student.rank === 1"
                    class="w-4 h-4 flex-shrink-0"
                    aria-hidden="true"
                  />
                  <span class="min-w-0 break-words">{{ student.username }}</span>
                  <span v-if="isYou(student)" :class="youBadgeClass">{{
                    t(`${PREFIX}.you_badge`)
                  }}</span>
                </p>
                <p class="text-sm text-navy-700 font-semibold flex items-center gap-1.5">
                  <slot name="metric" :student="student" />
                </p>
                <p class="text-xs text-navy-700/80 flex flex-wrap items-center gap-x-2">
                  <slot name="facts" :student="student" />
                </p>
              </div>
            </component>
          </li>
        </ol>

        <!-- En horizontal, en pantallas muy anchas: el 1.º en el centro. El
             orden de lectura sigue siendo 1.º, 2.º, 3.º. -->
        <ol class="hidden 3xl:flex items-end justify-center gap-8">
          <li
            v-for="(student, index) in entries"
            :key="student.id"
            :class="PODIUM_POSITIONS[index]?.order"
          >
            <component
              :is="entryTag"
              v-bind="entryAttrs(student)"
              :class="['flex flex-col items-center rounded-xl', linkClass]"
            >
              <div class="relative mb-3">
                <Avatar
                  :src="student.avatar"
                  :name="student.username"
                  :color="student.avatarColor"
                  :size="index === 0 ? 'xl' : 'lg'"
                  :class="['ring-4 shadow-lg', placeOf(student).ring]"
                />
                <span
                  :class="[
                    'absolute -top-2 -left-2 w-10 h-10 rounded-full flex items-center justify-center shadow-lg text-base font-bold',
                    placeOf(student).badge,
                  ]"
                  aria-hidden="true"
                  >{{ student.rank }}</span
                >
              </div>
              <div
                :class="[
                  'rounded-t-xl flex flex-col items-center justify-center border-t-4 shadow-md px-3 py-3',
                  placeOf(student).surface,
                  PODIUM_POSITIONS[index]?.pedestal,
                ]"
              >
                <p
                  class="text-base font-bold text-navy-700 text-center break-words w-full leading-tight"
                >
                  <span class="sr-only">{{ rankLabel(student) }}</span>
                  <TrophyIcon
                    v-if="student.rank === 1"
                    class="w-5 h-5 inline-block align-text-bottom mr-1"
                    aria-hidden="true"
                  />{{ student.username }}
                </p>
                <span v-if="isYou(student)" :class="[youBadgeClass, 'mt-1']">{{
                  t(`${PREFIX}.you_badge`)
                }}</span>
                <p class="mt-2 text-sm text-navy-700 font-bold inline-flex items-center gap-1">
                  <slot name="metric" :student="student" />
                </p>
                <div class="flex flex-wrap items-center justify-center gap-x-3 mt-2 text-xs text-navy-700/80">
                  <slot name="facts" :student="student" />
                </div>
              </div>
            </component>
          </li>
        </ol>
      </template>
    </CardItem>
  </Card>
</template>

<script setup lang="ts">
import { TrophyIcon } from '@heroicons/vue/24/outline'
import type { RankingStudent } from '~/types/ranking.types'

/**
 * El podio de una clasificación: una pieza de `ClassRankingSection`, la misma en
 * todos los tipos y modos. Lo que enseña de cada persona va en las ranuras:
 * `#metric`, lo que la ordena, y `#facts`, lo que la acompaña.
 */
const props = defineProps<{
  entries: RankingStudent[]
  emptyText: string
  studentLink?: (studentId: string) => string
  highlightYou?: boolean
}>()

defineSlots<{
  metric?: (props: { student: RankingStudent }) => unknown
  facts?: (props: { student: RankingStudent }) => unknown
}>()

const PREFIX = 'student.components.class_ranking_section'

const { t } = useI18n()
const { isYou, rankLabel, entryTag, entryAttrs, linkClass, youBadgeClass } = useRankingEntry(props)

/** Color de cada puesto del podio: oro, plata y bronce, con el número escrito. */
const PLACE_STYLES = {
  1: {
    surface: 'bg-yellow/20 border-yellow',
    ring: 'ring-yellow',
    badge: 'bg-yellow text-navy-700',
  },
  2: {
    surface: 'bg-gray-100 border-gray-400',
    ring: 'ring-gray-400',
    badge: 'bg-gray-400 text-navy-700',
  },
  3: {
    surface: 'bg-amber-600/10 border-amber-600',
    ring: 'ring-amber-600',
    badge: 'bg-amber-600 text-navy-700',
  },
} as const

/** Sitio y altura de cada posición del podio en horizontal: 2.º, 1.º, 3.º. */
const PODIUM_POSITIONS = [
  { order: 'order-2 -mt-8', pedestal: 'w-44 h-52' },
  { order: 'order-1', pedestal: 'w-40 h-40' },
  { order: 'order-3', pedestal: 'w-40 h-36' },
]

/** El estilo del puesto en el podio (el 3.º si llega uno raro). */
const placeOf = (student: RankingStudent) =>
  PLACE_STYLES[(student.rank ?? 3) as 1 | 2 | 3] ?? PLACE_STYLES[3]
</script>
