<template>
  <BehaviorsPanel
    :class-id="classId"
    :students="state.students"
    :settings="classSettings"
    :readonly="!can('behavior.edit')"
    :archived="!!state.classData?.archived"
    :can-team="can('team.award')"
  />
</template>

<script setup lang="ts">
definePageMeta({ layout: 'teacher', middleware: ['auth', 'role'] })

const route = useRoute()
const classId = computed(() => route.params.id as string)
const { state, classSettings, can } = useTeacherClassDetail(classId)
</script>
