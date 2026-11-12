<script setup lang="ts">
/**
 * ClassXPBar - XP and level display for a specific class
 *
 * Shows the student's avatar, level, title, XP progress, and ranking
 * within a specific class context. Avatar and nickname are per-class.
 *
 * El avatar va dentro del anillo de su nivel (`LevelAvatar`): lo que lleva hacia
 * el siguiente, lo mismo que la barra, que lo dice con su XP escrita.
 */
interface Props {
  level: number
  title: string
  /** Color del tramo de nivel (configurable por clase). */
  color?: string
  nextTitle?: string
  name?: string
  username?: string
  avatar?: string
  /** De dónde sale el color del avatar: `studentAvatarSeed(clase, estudiante)`. */
  avatarSeed?: string
  currentXp: number
  requiredXp: number
  progress: number
  /**
   * Su puesto en la clasificación. Null si no tiene: la clase no la tiene
   * activada, aún no tiene XP o es la vista previa del profesorado.
   */
  rank: number | null
  totalStudents: number
}

const props = defineProps<Props>()

const { t } = useI18n()
const { formatNumber } = useNumberFormat()

const levelLine = computed(() =>
  t('student.components.class_xp_bar.level_line', { level: props.level, title: props.title })
)
const xpLine = computed(() =>
  t('student.components.class_xp_bar.xp_line', {
    current: formatNumber(props.currentXp),
    required: formatNumber(props.requiredXp),
  })
)
/** «Puesto 7 de 25», para el lector de pantalla: lo que se ve es «7 / 25». */
const rankText = computed(() =>
  props.rank === null
    ? ''
    : t('student.components.class_xp_bar.rank_of', {
        rank: formatNumber(props.rank),
        total: formatNumber(props.totalStudents),
      })
)
</script>

<template>
  <article
    class="rounded-2xl p-3 sm:p-4 lg:p-6 shadow-lg"
    :style="{
      backgroundColor: 'var(--color-card-xpbar)',
      borderLeft: 'var(--card-accent-left) solid var(--color-card-accent)',
    }"
    data-testid="class-xp-bar"
  >
    <div class="bg-white rounded-xl p-3 sm:p-4">
      <!-- Stacked Layout: Mobile (< 640px) + Medium Desktop (1024px - 1280px) -->
      <div class="sm:hidden lg:block xl:hidden">
        <!-- Top Row: Avatar/Name + Ranking -->
        <div class="flex items-center justify-between gap-3 mb-3 sm:mb-4">
          <div class="flex items-center gap-2.5 sm:gap-3 flex-shrink-0 min-w-0">
            <LevelAvatar
              :src="avatar"
              :name="username || name"
              :seed="avatarSeed"
              :progress="progress"
              size="sm"
            />
            <div class="min-w-0">
              <p
                v-if="name"
                class="text-navy-700 font-bold text-base sm:text-lg leading-tight truncate"
              >
                {{ name }}
              </p>
              <p v-if="username" class="text-navy-700/80 text-xs sm:text-sm truncate">
                @{{ username }}
              </p>
            </div>
          </div>

          <div v-if="rank !== null" class="flex-shrink-0 text-right">
            <p class="text-navy-700/80 text-xs sm:text-sm mb-0.5" aria-hidden="true">
              {{ t('student.components.class_xp_bar.rank') }}
            </p>
            <p class="text-navy-700 font-bold text-lg sm:text-xl tabular-nums whitespace-nowrap">
              <span class="sr-only">{{ rankText }}</span>
              <span aria-hidden="true"
                >{{ formatNumber(rank)
                }}<span class="text-navy-700/80 font-normal text-sm sm:text-base">
                  / {{ formatNumber(totalStudents) }}</span
                ></span
              >
            </p>
          </div>
        </div>

        <!-- Bottom Row: Progress Bar (full width) -->
        <div>
          <div class="flex items-baseline justify-between mb-1 sm:mb-1.5">
            <p
              class="text-navy-700 font-medium text-xs sm:text-sm mr-2 flex items-center gap-1.5 min-w-0"
            >
              <span
                class="w-2 h-2 rounded-full flex-shrink-0"
                :style="{ backgroundColor: color || '#38BDF8' }"
              />
              <span class="min-w-0">{{ levelLine }}</span>
            </p>
            <span
              class="text-xs sm:text-sm font-medium text-navy-700/80 tabular-nums flex-shrink-0"
            >
              {{ xpLine }}
            </span>
          </div>
          <div class="h-2 sm:h-2.5 bg-gray-100 rounded-full overflow-hidden">
            <div
              class="h-full bg-gradient-to-r from-[#7DD3FC] to-[#38BDF8] rounded-full transition-all duration-500"
              :style="{ width: `${progress}%` }"
              data-testid="class-xp-bar-fill"
            />
          </div>
        </div>
      </div>

      <!-- Three Columns Layout: Tablet (640px - 1024px) + Large Desktop (≥ 1280px) -->
      <div class="hidden sm:flex lg:hidden xl:flex items-center gap-4">
        <!-- Avatar + Name -->
        <div class="flex items-center gap-3 flex-shrink-0">
          <LevelAvatar
            :src="avatar"
            :name="username || name"
            :seed="avatarSeed"
            :progress="progress"
            size="md"
          />
          <div class="min-w-0">
            <p v-if="name" class="text-navy-700 font-bold text-lg leading-tight truncate">
              {{ name }}
            </p>
            <p v-if="username" class="text-navy-700/80 text-sm truncate">@{{ username }}</p>
          </div>
        </div>

        <!-- XP Progress - Center (grows to fill space) -->
        <div class="flex-1 min-w-0">
          <div class="flex items-baseline justify-between mb-1.5">
            <p class="text-navy-700 font-medium text-sm mr-2 flex items-center gap-1.5 min-w-0">
              <span
                class="w-2 h-2 rounded-full flex-shrink-0"
                :style="{ backgroundColor: color || '#38BDF8' }"
              />
              <span class="min-w-0">{{ levelLine }}</span>
            </p>
            <span class="text-sm font-medium text-navy-700/80 tabular-nums flex-shrink-0">
              {{ xpLine }}
            </span>
          </div>
          <div class="h-2.5 bg-gray-100 rounded-full overflow-hidden">
            <div
              class="h-full bg-gradient-to-r from-[#7DD3FC] to-[#38BDF8] rounded-full transition-all duration-500"
              :style="{ width: `${progress}%` }"
            />
          </div>
        </div>

        <!-- Puesto en la clasificación (solo si tiene) -->
        <div v-if="rank !== null" class="flex-shrink-0 text-right">
          <p class="text-navy-700/80 text-sm mb-0.5" aria-hidden="true">
            {{ t('student.components.class_xp_bar.rank') }}
          </p>
          <p class="text-navy-700 font-bold text-2xl tabular-nums whitespace-nowrap">
            <span class="sr-only">{{ rankText }}</span>
            <span aria-hidden="true"
              >{{ formatNumber(rank)
              }}<span class="text-navy-700/80 font-normal text-base">
                / {{ formatNumber(totalStudents) }}</span
              ></span
            >
          </p>
        </div>
      </div>
    </div>
  </article>
</template>
