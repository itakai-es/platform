<template>
  <TeacherShopPanel
    :class-id="classId"
    :mana-enabled="classSettings.mana"
    :readonly="!can('shop.edit')"
  />
</template>

<script setup lang="ts">
definePageMeta({ layout: 'teacher', middleware: ['auth', 'role'] })

const route = useRoute()
const classId = computed(() => route.params.id as string)
const { classSettings, can } = useTeacherClassDetail(classId)
</script>
