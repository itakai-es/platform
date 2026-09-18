<template>
  <BehaviorsPanel
    :class-id="classId"
    :students="state.students"
    :settings="classSettings"
    :readonly="!can('behavior.edit')"
  />
</template>

<script setup lang="ts">
definePageMeta({ layout: 'teacher', middleware: ['auth', 'role'] })

const route = useRoute()
const classId = computed(() => route.params.id as string)
const { state, classSettings, can } = useTeacherClassDetail(classId)
</script>
