<template>
  <div class="space-y-6">
    <!-- Loading -->
    <div v-if="ui.isLoadingRanking" class="space-y-6">
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Skeleton height="h-64" />
        <Skeleton height="h-64" />
      </div>
      <Skeleton height="h-96" />
    </div>

    <template v-else-if="ui.rankingData">
      <TeamStandings v-if="teams.data.value" :standings="teams.data.value.standings" />
      <ClassRankingSection :ranking-data="ui.rankingData" :show-current-user-highlight="true" />
    </template>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'student', middleware: ['auth', 'role'] })

const route = useRoute()
const classId = computed(() => route.params.id as string)
const { ui, ensureRanking } = useStudentClassDetail(classId)
// Clasificación de equipos (solo llega si la clase tiene la clasificación activada).
const teams = useStudentTeams(classId)

// Si llegamos directo a /ranking, ensureRanking() lo dispara; si ya estaba, no-op.
onMounted(() => void Promise.all([ensureRanking(), teams.ensure()]))
</script>
