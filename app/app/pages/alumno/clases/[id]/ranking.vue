<template>
  <ClassRankingBoard v-if="showBoard" :url="rankingUrl" />
</template>

<script setup lang="ts">
definePageMeta({ layout: 'student', middleware: ['auth', 'role'] })

const route = useRoute()
const config = useRuntimeConfig()
const classId = computed(() => route.params.id as string)
const { classData, rankingTypes } = useStudentClassDetail(classId)

const rankingUrl = computed(
  () => `${config.public.apiBase}/students/classes/${classId.value}/ranking`
)

// Con los datos de esta clase ya cargados: sin ningún tipo de ranking que ver no se
// pide nada y se vuelve al Resumen.
const classLoaded = computed(() => classData.value?.id === classId.value)
const showBoard = computed(() => classLoaded.value && rankingTypes.value.length > 0)
watch(
  classLoaded,
  loaded => {
    if (loaded && rankingTypes.value.length === 0) {
      void navigateTo(`/alumno/clases/${classId.value}`, { replace: true })
    }
  },
  { immediate: true }
)
</script>
