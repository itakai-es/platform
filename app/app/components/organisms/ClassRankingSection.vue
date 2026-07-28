<template>
  <div class="space-y-6">
    <!-- Top Row: Podio + Stats -->
    <div class="grid grid-cols-1 xl:grid-cols-2 gap-4 xl:gap-6">
      <!-- Podio de Campeones - Yellow theme -->
      <Card type="ia" flex>
        <CardHeader
          :title="t('student.components.class_ranking_section.podium_title')"
          :icon="TrophyIcon"
          title-tag="h3"
        />

        <!-- Podium Display - Vertical on mobile/tablet, horizontal on 2xl+ -->
        <CardItem
          layout="column"
          padding="md"
          class="3xl:!p-6 !pt-12 3xl:!pt-14 !justify-center"
          flex
        >
          <!-- Mobile/Tablet: Vertical list (shows until container has enough width) -->
          <div class="flex flex-col gap-3 3xl:hidden">
            <!-- 1st Place -->
            <div
              v-if="rankingData.podium[0]"
              :class="[
                'flex items-center gap-4 bg-yellow/20 rounded-xl p-4 border-l-4 border-yellow',
                clickable ? 'cursor-pointer hover:shadow-md transition-all' : '',
              ]"
              @click="handleStudentClick(rankingData.podium[0].id)"
            >
              <div class="relative flex-shrink-0">
                <div
                  class="w-16 h-16 rounded-full bg-white flex items-center justify-center overflow-hidden border-3 border-yellow shadow-lg"
                >
                  <img
                    v-if="rankingData.podium[0].avatar"
                    :src="rankingData.podium[0].avatar"
                    :alt="rankingData.podium[0].username"
                    class="w-full h-full object-contain"
                  />
                  <UserIcon v-else class="w-8 h-8 text-yellow" />
                </div>
                <div
                  class="absolute -top-1 -left-1 w-7 h-7 rounded-full bg-yellow flex items-center justify-center shadow-lg"
                >
                  <TrophyIcon class="w-4 h-4 text-navy-700" />
                </div>
              </div>
              <div class="flex-1 min-w-0">
                <p class="font-bold text-navy-700">{{ rankingData.podium[0].username }}</p>
                <p class="text-sm text-navy-700 font-semibold flex items-center gap-1.5">
                  <span
                    >{{ t('student.components.class_ranking_section.level_abbr') }}
                    {{ rankingData.podium[0].level }}</span
                  >
                  <span>·</span>
                  <span class="inline-flex items-center gap-1">
                    <Tooltip :text="t('common.resources.xp')"><XpIcon class="w-4 h-4" /></Tooltip>{{ rankingData.podium[0].xp.toLocaleString() }}
                  </span>
                </p>
                <p class="text-xs text-text-secondary">
                  {{ rankingData.podium[0].missionsCompleted }}/{{
                    rankingData.podium[0].missionsTotal
                  }}
                  {{ t('student.components.class_ranking_section.missions_suffix') }}
                </p>
              </div>
            </div>

            <!-- 2nd Place -->
            <div
              v-if="rankingData.podium[1]"
              :class="[
                'flex items-center gap-4 bg-gray-100 rounded-xl p-4 border-l-4 border-gray-400',
                clickable ? 'cursor-pointer hover:shadow-md transition-all' : '',
              ]"
              @click="handleStudentClick(rankingData.podium[1].id)"
            >
              <div class="relative flex-shrink-0">
                <div
                  class="w-14 h-14 rounded-full bg-white flex items-center justify-center overflow-hidden border-2 border-gray-400 shadow-lg"
                >
                  <img
                    v-if="rankingData.podium[1].avatar"
                    :src="rankingData.podium[1].avatar"
                    :alt="rankingData.podium[1].username"
                    class="w-full h-full object-contain"
                  />
                  <UserIcon v-else class="w-7 h-7 text-gray-500" />
                </div>
                <div
                  class="absolute -top-1 -left-1 w-6 h-6 rounded-full bg-gray-400 flex items-center justify-center shadow-lg"
                >
                  <span class="text-white font-bold text-xs">2</span>
                </div>
              </div>
              <div class="flex-1 min-w-0">
                <p class="font-semibold text-navy-700">{{ rankingData.podium[1].username }}</p>
                <p class="text-sm text-navy-700 flex items-center gap-1.5">
                  <span
                    >{{ t('student.components.class_ranking_section.level_abbr') }}
                    {{ rankingData.podium[1].level }}</span
                  >
                  <span>·</span>
                  <span class="inline-flex items-center gap-1">
                    <Tooltip :text="t('common.resources.xp')"><XpIcon class="w-4 h-4" /></Tooltip>{{ rankingData.podium[1].xp.toLocaleString() }}
                  </span>
                </p>
                <p class="text-xs text-text-secondary">
                  {{ rankingData.podium[1].missionsCompleted }}/{{
                    rankingData.podium[1].missionsTotal
                  }}
                  {{ t('student.components.class_ranking_section.missions_suffix') }}
                </p>
              </div>
            </div>

            <!-- 3rd Place -->
            <div
              v-if="rankingData.podium[2]"
              :class="[
                'flex items-center gap-4 bg-[#CD7F32]/10 rounded-xl p-4 border-l-4 border-[#CD7F32]',
                clickable ? 'cursor-pointer hover:shadow-md transition-all' : '',
              ]"
              @click="handleStudentClick(rankingData.podium[2].id)"
            >
              <div class="relative flex-shrink-0">
                <div
                  class="w-14 h-14 rounded-full bg-white flex items-center justify-center overflow-hidden border-2 border-[#CD7F32] shadow-lg"
                >
                  <img
                    v-if="rankingData.podium[2].avatar"
                    :src="rankingData.podium[2].avatar"
                    :alt="rankingData.podium[2].username"
                    class="w-full h-full object-contain"
                  />
                  <UserIcon v-else class="w-7 h-7 text-[#CD7F32]" />
                </div>
                <div
                  class="absolute -top-1 -left-1 w-6 h-6 rounded-full bg-[#CD7F32] flex items-center justify-center shadow-lg"
                >
                  <span class="text-white font-bold text-xs">3</span>
                </div>
              </div>
              <div class="flex-1 min-w-0">
                <p class="font-semibold text-navy-700">{{ rankingData.podium[2].username }}</p>
                <p class="text-sm text-navy-700 flex items-center gap-1.5">
                  <span
                    >{{ t('student.components.class_ranking_section.level_abbr') }}
                    {{ rankingData.podium[2].level }}</span
                  >
                  <span>·</span>
                  <span class="inline-flex items-center gap-1">
                    <Tooltip :text="t('common.resources.xp')"><XpIcon class="w-4 h-4" /></Tooltip>{{ rankingData.podium[2].xp.toLocaleString() }}
                  </span>
                </p>
                <p class="text-xs text-text-secondary">
                  {{ rankingData.podium[2].missionsCompleted }}/{{
                    rankingData.podium[2].missionsTotal
                  }}
                  {{ t('student.components.class_ranking_section.missions_suffix') }}
                </p>
              </div>
            </div>
          </div>

          <!-- Desktop: Horizontal podium (only on very wide screens) -->
          <div class="hidden 3xl:flex items-end justify-center gap-8">
            <!-- 2nd Place -->
            <div
              v-if="rankingData.podium[1]"
              :class="[
                'flex flex-col items-center',
                clickable ? 'cursor-pointer hover:scale-105 transition-transform' : '',
              ]"
              @click="handleStudentClick(rankingData.podium[1].id)"
            >
              <div class="relative mb-3">
                <div
                  class="w-24 h-24 rounded-full bg-white flex items-center justify-center overflow-hidden border-4 border-gray-400 shadow-lg"
                >
                  <img
                    v-if="rankingData.podium[1].avatar"
                    :src="rankingData.podium[1].avatar"
                    :alt="rankingData.podium[1].username"
                    class="w-full h-full object-contain"
                  />
                  <UserIcon v-else class="w-12 h-12 text-gray-500" />
                </div>
                <div
                  class="absolute -top-2 -left-2 w-10 h-10 rounded-full bg-gray-400 flex items-center justify-center shadow-lg"
                >
                  <span class="text-white font-bold text-base">2</span>
                </div>
              </div>
              <div
                class="bg-gray-100 w-40 h-40 rounded-t-xl flex flex-col items-center justify-center border-t-4 border-gray-400 shadow-md px-3 py-3"
              >
                <p
                  class="text-base font-bold text-navy-700 text-center break-words w-full leading-tight"
                >
                  {{ rankingData.podium[1].username }}
                </p>
                <div class="bg-gray-400/20 rounded-full px-3 py-1 mt-2">
                  <p class="text-sm text-navy-700 font-bold inline-flex items-center gap-1">
                    <Tooltip :text="t('common.resources.xp')"><XpIcon class="w-4 h-4" /></Tooltip>{{ rankingData.podium[1].xp.toLocaleString() }}
                  </p>
                </div>
                <div class="flex items-center gap-3 mt-2 text-xs text-text-secondary">
                  <span
                    >{{ t('student.components.class_ranking_section.level_abbr')
                    }}{{ rankingData.podium[1].level }}</span
                  >
                  <span class="flex items-center gap-1">
                    <RocketLaunchIcon class="w-3.5 h-3.5" />
                    {{ rankingData.podium[1].missionsCompleted }}/{{
                      rankingData.podium[1].missionsTotal
                    }}
                  </span>
                </div>
              </div>
            </div>

            <!-- 1st Place -->
            <div
              v-if="rankingData.podium[0]"
              :class="[
                'flex flex-col items-center -mt-8',
                clickable ? 'cursor-pointer hover:scale-105 transition-transform' : '',
              ]"
              @click="handleStudentClick(rankingData.podium[0].id)"
            >
              <div class="relative mb-3">
                <div
                  class="w-28 h-28 rounded-full bg-white flex items-center justify-center overflow-hidden border-4 border-yellow shadow-xl"
                >
                  <img
                    v-if="rankingData.podium[0].avatar"
                    :src="rankingData.podium[0].avatar"
                    :alt="rankingData.podium[0].username"
                    class="w-full h-full object-contain"
                  />
                  <UserIcon v-else class="w-14 h-14 text-yellow" />
                </div>
                <div
                  class="absolute -top-3 -left-3 w-12 h-12 rounded-full bg-yellow flex items-center justify-center shadow-lg"
                >
                  <TrophyIcon class="w-6 h-6 text-navy-700" />
                </div>
              </div>
              <div
                class="bg-yellow/20 w-44 h-52 rounded-t-xl flex flex-col items-center justify-center border-t-4 border-yellow shadow-md px-4 py-4"
              >
                <p
                  class="text-lg font-extrabold text-navy-700 text-center break-words w-full leading-tight"
                >
                  {{ rankingData.podium[0].username }}
                </p>
                <div class="bg-yellow/40 rounded-full px-4 py-1.5 mt-3">
                  <p class="text-base text-navy-700 font-bold inline-flex items-center gap-1">
                    <Tooltip :text="t('common.resources.xp')"><XpIcon class="w-5 h-5" /></Tooltip>{{ rankingData.podium[0].xp.toLocaleString() }}
                  </p>
                </div>
                <div class="flex items-center gap-4 mt-3 text-sm text-text-secondary">
                  <span
                    >{{ t('student.components.class_ranking_section.level_abbr')
                    }}{{ rankingData.podium[0].level }}</span
                  >
                  <span class="flex items-center gap-1">
                    <RocketLaunchIcon class="w-4 h-4" />
                    {{ rankingData.podium[0].missionsCompleted }}/{{
                      rankingData.podium[0].missionsTotal
                    }}
                  </span>
                </div>
              </div>
            </div>

            <!-- 3rd Place -->
            <div
              v-if="rankingData.podium[2]"
              :class="[
                'flex flex-col items-center',
                clickable ? 'cursor-pointer hover:scale-105 transition-transform' : '',
              ]"
              @click="handleStudentClick(rankingData.podium[2].id)"
            >
              <div class="relative mb-3">
                <div
                  class="w-24 h-24 rounded-full bg-white flex items-center justify-center overflow-hidden border-4 border-[#CD7F32] shadow-lg"
                >
                  <img
                    v-if="rankingData.podium[2].avatar"
                    :src="rankingData.podium[2].avatar"
                    :alt="rankingData.podium[2].username"
                    class="w-full h-full object-contain"
                  />
                  <UserIcon v-else class="w-12 h-12 text-[#CD7F32]" />
                </div>
                <div
                  class="absolute -top-2 -left-2 w-10 h-10 rounded-full bg-[#CD7F32] flex items-center justify-center shadow-lg"
                >
                  <span class="text-white font-bold text-base">3</span>
                </div>
              </div>
              <div
                class="bg-[#CD7F32]/20 w-40 h-36 rounded-t-xl flex flex-col items-center justify-center border-t-4 border-[#CD7F32] shadow-md px-3 py-3"
              >
                <p
                  class="text-base font-bold text-navy-700 text-center break-words w-full leading-tight"
                >
                  {{ rankingData.podium[2].username }}
                </p>
                <div class="bg-[#CD7F32]/30 rounded-full px-3 py-1 mt-2">
                  <p class="text-sm text-navy-700 font-bold inline-flex items-center gap-1">
                    <Tooltip :text="t('common.resources.xp')"><XpIcon class="w-4 h-4" /></Tooltip>{{ rankingData.podium[2].xp.toLocaleString() }}
                  </p>
                </div>
                <div class="flex items-center gap-3 mt-2 text-xs text-text-secondary">
                  <span
                    >{{ t('student.components.class_ranking_section.level_abbr')
                    }}{{ rankingData.podium[2].level }}</span
                  >
                  <span class="flex items-center gap-1">
                    <RocketLaunchIcon class="w-3.5 h-3.5" />
                    {{ rankingData.podium[2].missionsCompleted }}/{{
                      rankingData.podium[2].missionsTotal
                    }}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </CardItem>
      </Card>

      <!-- Estadísticas de la Clase - Purple theme -->
      <Card type="stats" flex>
        <CardHeader
          :title="t('student.components.class_ranking_section.stats_title')"
          :icon="ChartPieIcon"
          title-tag="h3"
        />

        <CardGrid cols="2x2" flex>
          <!-- XP Promedio -->
          <CardItem layout="column" centered class="justify-center">
            <p class="text-5xl sm:text-6xl font-semibold text-navy-700">
              {{ (rankingData.stats?.avgXp ?? 0).toLocaleString() }}
            </p>
            <p class="text-sm text-navy-700/80 mt-2">
              {{ t('student.components.class_ranking_section.avg_xp') }}
            </p>
          </CardItem>
          <!-- Progreso Promedio -->
          <CardItem layout="column" centered class="justify-center">
            <p class="text-5xl sm:text-6xl font-semibold text-navy-700">
              {{ rankingData.stats?.avgProgress ?? 0 }}%
            </p>
            <p class="text-sm text-navy-700/80 mt-2">
              {{ t('student.components.class_ranking_section.avg_progress') }}
            </p>
          </CardItem>
          <!-- Misiones Promedio -->
          <CardItem layout="column" centered class="justify-center">
            <p class="text-5xl sm:text-6xl font-semibold text-navy-700">
              {{ rankingData.stats?.avgMissions ?? 0 }}
            </p>
            <p class="text-sm text-navy-700/80 mt-2">
              {{ t('student.components.class_ranking_section.avg_missions') }}
            </p>
          </CardItem>
          <!-- XP Total Clase -->
          <CardItem layout="column" centered class="justify-center">
            <p class="text-5xl sm:text-6xl font-semibold text-navy-700">
              {{ formatTotalXp(rankingData.stats?.totalXp ?? 0) }}
            </p>
            <p class="text-sm text-navy-700/80 mt-2">
              {{ t('student.components.class_ranking_section.total_xp') }}
            </p>
          </CardItem>
        </CardGrid>
      </Card>
    </div>

    <!-- Clasificación Completa - Mint theme (only show if more than 3 students) -->
    <Card v-if="rankingData.leaderboard && rankingData.leaderboard.length > 0" type="clases">
      <CardHeader
        :title="t('student.components.class_ranking_section.rest_title')"
        :icon="ListBulletIcon"
        title-tag="h3"
      />

      <!-- Leaderboard list - 1 col until xl, then 2 cols -->
      <div class="grid grid-cols-1 xl:grid-cols-2 gap-4 p-4">
        <CardItem
          v-for="student in rankingData.leaderboard"
          :key="student.id"
          padding="sm"
          :class="[
            'transition-all',
            student.isCurrentUser && showCurrentUserHighlight
              ? 'ring-2 ring-[#FFC338] shadow-md'
              : 'hover:shadow-md',
            clickable ? 'cursor-pointer' : '',
          ]"
          @click="handleStudentClick(student.id)"
        >
          <!-- Rank (hidden on xs) -->
          <div
            class="hidden xs:flex w-8 h-8 rounded-full bg-navy-700/10 items-center justify-center flex-shrink-0"
          >
            <span class="text-sm font-bold text-navy-700">{{ student.rank }}</span>
          </div>

          <!-- Avatar (borde = color del tramo de nivel de la clase) -->
          <div
            class="w-10 h-10 sm:w-14 sm:h-14 rounded-full bg-white flex items-center justify-center flex-shrink-0 overflow-hidden border-2 border-gray-200"
            :style="student.levelColor ? { borderColor: student.levelColor } : undefined"
            :title="student.levelTitle"
          >
            <img
              v-if="student.avatar"
              :src="student.avatar"
              :alt="student.username"
              class="w-full h-full object-contain"
            />
            <UserIcon v-else class="w-5 h-5 sm:w-7 sm:h-7 text-gray-400" />
          </div>

          <!-- Info -->
          <div class="flex-1 min-w-0">
            <div class="flex items-center gap-1 sm:gap-2">
              <p class="font-semibold text-navy-700 text-xs sm:text-base truncate">
                {{ student.username }}
              </p>
              <span
                v-if="student.isCurrentUser && showCurrentUserHighlight"
                class="px-1.5 py-0.5 bg-yellow text-navy-700 text-xs font-bold rounded-full flex-shrink-0"
                >{{ t('student.components.class_ranking_section.you_badge') }}</span
              >
            </div>
            <div class="flex items-center gap-3 text-xs text-text-secondary mt-0.5">
              <span
                >{{ t('student.components.class_ranking_section.level_abbr')
                }}{{ student.level }}</span
              >
              <span class="flex items-center gap-1">
                <RocketLaunchIcon class="w-3.5 h-3.5" />
                {{ student.missionsCompleted }}/{{ student.missionsTotal }}
              </span>
            </div>
          </div>

          <!-- XP Badge -->
          <div class="flex-shrink-0 bg-navy-700/10 rounded-full px-2 py-1 sm:px-3 sm:py-1.5">
            <p class="text-xs sm:text-sm font-bold text-navy-700 inline-flex items-center gap-1">
              <Tooltip :text="t('common.resources.xp')"><XpIcon class="w-4 h-4" /></Tooltip>{{ student.xp.toLocaleString() }}
            </p>
          </div>
        </CardItem>
      </div>
    </Card>
  </div>
</template>

<script setup lang="ts">
import {
  TrophyIcon,
  UserIcon,
  ChartPieIcon,
  ListBulletIcon,
  RocketLaunchIcon,
} from '@heroicons/vue/24/outline'
import type { ClassRanking } from '~/types/ranking.types'

const { t } = useI18n()

interface Props {
  rankingData: ClassRanking
  clickable?: boolean
  showCurrentUserHighlight?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  clickable: false,
  showCurrentUserHighlight: true,
})

const emit = defineEmits<{
  'student-click': [studentId: string]
}>()

// Format large XP numbers (e.g., 45200 -> "45.2K")
const formatTotalXp = (xp: number): string => {
  if (xp >= 1000) {
    const formatted = (xp / 1000).toFixed(1)
    return formatted.endsWith('.0') ? `${Math.floor(xp / 1000)}K` : `${formatted}K`
  }
  return xp.toString()
}

const handleStudentClick = (studentId: string) => {
  if (props.clickable) {
    emit('student-click', studentId)
  }
}
</script>
