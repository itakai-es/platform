<template>
  <Card v-if="current.length" type="info">
    <CardHeader :title="t('student.teams.my_team_title')" :icon="UserGroupIcon" />
    <ul class="space-y-6">
      <li v-for="entry in current" :key="entry.set.id">
        <CardItem padding="sm" layout="column">
          <div class="flex w-full items-center justify-between gap-2">
            <TeamBadge
              :title="entry.team.title"
              :color="entry.team.color"
              :emblem="entry.team.emblem"
              :index="entry.team.index"
              class="min-w-0"
            />
            <span
              v-if="entry.team.points !== null"
              class="flex-shrink-0 font-semibold text-navy-700"
            >
              {{ t('common.teams.points', { count: entry.team.points }, entry.team.points) }}
            </span>
          </div>
          <p class="mt-1 w-full text-xs text-navy-700/70">
            {{ entry.set.title }} · {{ t(`common.teams.kind.${entry.set.kind}`) }}
          </p>
          <ul
            class="mt-3 w-full space-y-2"
            :aria-label="t('student.teams.members_label', { name: entry.team.title })"
          >
            <li v-for="member in entry.members" :key="member.id" class="flex items-center gap-3">
              <Avatar
                :src="member.avatar"
                :name="member.name"
                :seed="studentAvatarSeed(classId, member.id)"
                size="xs"
              />
              <span class="min-w-0 truncate text-sm font-medium text-navy-700">{{
                member.name
              }}</span>
              <Badge v-if="member.isMe" variant="info" size="sm">{{
                t('student.teams.you')
              }}</Badge>
            </li>
          </ul>
        </CardItem>
      </li>
    </ul>
  </Card>
</template>

<script setup lang="ts">
import { UserGroupIcon } from '@heroicons/vue/24/outline'
import { studentAvatarSeed } from '~/utils/avatar'

/**
 * «Mi equipo» en la portada de la clase del alumnado: cada equipo en el que
 * está (de las agrupaciones sin archivar) con quién lo forma. Los puntos, solo
 * de las agrupaciones de base y si la clase tiene la clasificación activada.
 * Sin equipos no sale nada.
 */
const props = defineProps<{ classId: string }>()

const { t } = useI18n()
const { data, ensure } = useStudentTeams(() => props.classId)
onMounted(ensure)
/** Solo las agrupaciones en curso: las archivadas quedan para sus misiones. */
const current = computed(() => (data.value?.myTeams ?? []).filter(entry => !entry.set.archived))
</script>
