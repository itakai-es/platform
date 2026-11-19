<template>
  <div v-if="standings.length" class="grid grid-cols-1 gap-4 xl:grid-cols-2 xl:gap-6">
    <Card v-for="entry in standings" :key="entry.set.id" type="ia">
      <CardHeader
        :title="t('common.teams.standings_title', { title: entry.set.title })"
        :icon="TrophyIcon"
      />
      <template v-for="group in groupsOf(entry)" :key="group.id">
        <h3 v-if="group.title" class="text-sm font-semibold text-navy-700">{{ group.title }}</h3>
        <component :is="group.tag" class="space-y-2">
          <li
            v-for="team in group.teams"
            :key="team.id"
            class="flex items-center gap-3 rounded-xl bg-white px-4 py-3"
          >
            <!-- Puesto de competición: quien empata lo comparte. Sin puntos, sin puesto. -->
            <span
              v-if="team.rank !== null"
              class="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-navy-700/10 text-sm font-bold text-navy-700"
            >
              <span class="sr-only">{{ t('common.teams.position') }}</span
              >{{ team.rank }}
            </span>
            <TeamBadge
              :title="team.title"
              :color="team.color"
              :emblem="team.emblem"
              :index="team.index ?? 0"
              class="min-w-0 flex-1"
            />
            <span class="flex-shrink-0 font-semibold text-navy-700">
              {{ t('common.teams.points', { count: team.points }, team.points) }}
            </span>
          </li>
        </component>
      </template>
    </Card>
  </div>
</template>

<script setup lang="ts">
import { TrophyIcon } from '@heroicons/vue/24/outline'
import type { TeamStanding } from '~/types/ranking.types'
import type { RankingPeriod } from '~/utils/ranking-config'

/**
 * Clasificación de equipos: una tarjeta por agrupación de base, con sus equipos
 * de más a menos puntos, en el orden y con los puestos de la API (1, 2, 2, 4). Los
 * puntos son los del marcador (los premios al equipo), no la XP de sus integrantes,
 * del periodo que se mira. Quien aún no tiene puntos va aparte, sin puesto. La ven
 * el profesorado y el alumnado, entera en todos los modos: nadie queda señalado.
 */
const props = withDefaults(
  defineProps<{
    standings: TeamStanding[]
    period?: RankingPeriod
  }>(),
  { period: 'all' }
)

const { t } = useI18n()

/** Los equipos con puesto, numerados; y aparte, sin número, los que aún no tienen puntos. */
function groupsOf(entry: TeamStanding) {
  return [
    { id: 'ranked', title: null, tag: 'ol', teams: entry.teams.filter(team => team.rank !== null) },
    {
      id: 'no-score',
      title: t(`common.ranking.no_score.teams.${props.period}`),
      tag: 'ul',
      teams: entry.teams.filter(team => team.rank === null),
    },
  ].filter(group => group.teams.length > 0)
}
</script>
