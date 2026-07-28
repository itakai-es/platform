<template>
  <ClassConfigPanel
    :class-id="classId"
    :class-data="state.classData"
    @update="onSettingsUpdate"
    @general-update="onGeneralUpdate"
    @levels-update="onLevelsUpdate"
  />
</template>

<script setup lang="ts">
import type { ClassSettings, LevelConfig } from '~/types/class.types'

definePageMeta({ layout: 'teacher', middleware: ['auth', 'role'] })

const route = useRoute()
const classId = computed(() => route.params.id as string)
const { state, setClassData } = useTeacherClassDetail(classId)

// Los emits ya persisten en backend; aquí reflejamos en el estado compartido
// para que el header y el resto de pestañas reaccionen al instante.
function onSettingsUpdate(settings: ClassSettings) {
  setClassData({ settings })
}
function onGeneralUpdate(data: { name: string; schedule: string; backgroundImage: string }) {
  setClassData(data)
}
function onLevelsUpdate(levelConfig: LevelConfig) {
  setClassData({ levelConfig })
}
</script>
