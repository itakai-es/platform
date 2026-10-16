<template>
  <div v-if="standings.length" class="grid grid-cols-1 gap-4 xl:grid-cols-2 xl:gap-6">
    <Card v-for="entry in standings" :key="entry.set.id" type="ia">
      <CardHeader
        :title="t('common.teams.standings_title', { title: entry.set.title })"
        :icon="TrophyIcon"
        :title-tag="titleTag"
      />
      <ol class="space-y-2">
        <li
          v-for="(team, position) in entry.teams"
          :key="team.id"
          class="flex items-center gap-3 rounded-xl bg-white px-4 py-3"
        >
          <span
            class="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-navy-700/10 text-sm font-bold text-navy-700"
          >
            <span class="sr-only">{{ t('common.teams.position') }}</span
            >{{ position + 1 }}
          </span>
          <TeamBadge
            :title="team.title"
            :color="team.color"
            :emblem="team.emblem"
            :index="team.index ?? position"
            class="min-w-0 flex-1"
          />
          <span class="flex-shrink-0 font-semibold text-navy-700">
            {{ t('common.teams.points', { count: team.points }, team.points) }}
          </span>
        </li>
      </ol>
    </Card>
  </div>
</template>

<script setup lang="ts">
import { TrophyIcon } from '@heroicons/vue/24/outline'
import type { TeamColor, TeamEmblem } from '~/types/team.types'

/**
 * Clasificación de equipos: una tarjeta por agrupación de base, con sus equipos
 * de más a menos puntos. Los puntos son los del marcador (los premios al
 * equipo), no la XP de sus integrantes. La ven el profesorado y el alumnado, y
 * solo si la clase tiene la clasificación activada (lo decide quien la usa).
 */
withDefaults(
  defineProps<{
    standings: {
      set: { id: string; title: string }
      teams: {
        id: string
        title: string
        color: TeamColor | null
        emblem: TeamEmblem | null
        points: number
        index?: number
      }[]
    }[]
    titleTag?: 'h2' | 'h3'
  }>(),
  { titleTag: 'h2' }
)

const { t } = useI18n()
</script>
