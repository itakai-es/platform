<template>
  <!-- La lista: quien tiene puesto y, aparte y sin número, quien aún no ha sumado nada -->
  <Card v-if="groups.length > 0" type="clases">
    <CardHeader :title="title" :icon="ListBulletIcon" />

    <template v-for="group in groups" :key="group.id">
      <h3 v-if="group.title" class="sm:px-4 pt-2 text-sm font-semibold text-navy-700">
        {{ group.title }}
      </h3>
      <component :is="group.tag" class="grid grid-cols-1 xl:grid-cols-2 gap-4 sm:p-4">
        <li v-for="student in group.students" :key="student.id">
          <component
            :is="entryTag"
            v-bind="entryAttrs(student)"
            :class="['block rounded-xl', linkClass]"
          >
            <CardItem
              padding="sm"
              :class="['transition-shadow', isYou(student) ? 'ring-2 ring-yellow shadow-md' : '']"
            >
              <!-- Puesto: solo quien ha sumado algo -->
              <span
                v-if="student.rank !== null"
                class="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-navy-700/10 flex items-center justify-center flex-shrink-0 text-xs sm:text-sm font-bold text-navy-700"
              >
                <span class="sr-only">{{ rankLabel(student) }}</span>
                <span aria-hidden="true">{{ student.rank }}</span>
              </span>

              <!-- Avatar (marco = color del tramo de nivel de la clase) -->
              <Avatar
                :src="student.avatar"
                :name="student.username"
                :color="student.avatarColor"
                :ring-color="student.levelColor"
                :title="student.levelTitle"
                size="sm"
              />

              <div class="flex-1 min-w-0">
                <!-- Un alias largo se parte en vez de cortarse: dos «Guardia…» no se distinguirían -->
                <div class="flex flex-wrap items-center gap-1 sm:gap-2">
                  <p class="min-w-0 break-words font-semibold text-navy-700 text-xs sm:text-base">
                    {{ student.username }}
                  </p>
                  <span v-if="isYou(student)" :class="youBadgeClass">{{ youLabel }}</span>
                </div>
                <div
                  class="flex flex-wrap items-center gap-x-2 sm:gap-x-3 gap-y-0.5 text-xs text-navy-700/80 mt-0.5"
                >
                  <slot name="facts" :student="student" />
                  <!-- En el móvil, la cifra va en esta línea para dejar sitio al alias -->
                  <span v-if="student.rank !== null" class="sm:hidden font-bold text-navy-700">
                    <slot name="metric" :student="student" />
                  </span>
                </div>
              </div>

              <!-- La cifra: no hace falta en «Aún sin…» -->
              <p
                v-if="student.rank !== null"
                class="hidden sm:block flex-shrink-0 text-sm font-bold text-navy-700"
              >
                <slot name="metric" :student="student" />
              </p>
            </CardItem>
          </component>
        </li>
      </component>
    </template>
  </Card>
</template>

<script setup lang="ts">
import { ListBulletIcon } from '@heroicons/vue/24/outline'
import type { RankingStudent } from '~/types/ranking.types'

/**
 * La lista de una clasificación: una pieza de `ClassRankingSection`, la misma en
 * todos los tipos y modos. Lo que enseña de cada persona va en las ranuras:
 * `#metric`, lo que la ordena, y `#facts`, lo que la acompaña.
 */
const props = defineProps<{
  title: string
  /** El título del bloque de quien aún no ha sumado nada («Aún sin XP»…). */
  noScoreTitle: string
  entries: RankingStudent[]
  studentLink?: (studentId: string) => string
  highlightYou?: boolean
}>()

defineSlots<{
  metric?: (props: { student: RankingStudent }) => unknown
  facts?: (props: { student: RankingStudent }) => unknown
}>()

const { t } = useI18n()
const { isYou, rankLabel, entryTag, entryAttrs, linkClass, youBadgeClass } = useRankingEntry(props)

const youLabel = computed(() => t('student.components.class_ranking_section.you_badge'))

const groups = computed(() =>
  [
    {
      id: 'ranked',
      title: null,
      tag: 'ol',
      students: props.entries.filter(s => s.rank !== null),
    },
    {
      id: 'no-score',
      title: props.noScoreTitle,
      tag: 'ul',
      students: props.entries.filter(s => s.rank === null),
    },
  ].filter(group => group.students.length > 0)
)
</script>
