<template>
  <ClassConfigPanel
    :class-id="classId"
    :class-data="state.classData"
    :access="state.classData?.myAccess"
    @update="onSettingsUpdate"
    @general-update="onGeneralUpdate"
    @levels-update="onLevelsUpdate"
    @access-change="setMyAccess"
    @left="onLeft"
    @trashed="onLeft"
  />
</template>

<script setup lang="ts">
import type { ClassSettings, LevelConfig } from '~/types/class.types'
import type { ScheduleConfig } from '~/types/schedule.types'

definePageMeta({ layout: 'teacher', middleware: ['auth', 'role'] })

const route = useRoute()
const classId = computed(() => route.params.id as string)
const { state, setClassData, setMyAccess, forget } = useTeacherClassDetail(classId)

// Los emits ya persisten en backend; aquí reflejamos en el estado compartido
// para que el header y el resto de pestañas reaccionen al instante.
function onSettingsUpdate(settings: ClassSettings) {
  setClassData({ settings })
}
function onGeneralUpdate(data: {
  name: string
  schedule: string
  backgroundImage: string
  scheduleConfig?: ScheduleConfig[]
}) {
  setClassData(data)
}
function onLevelsUpdate(levelConfig: LevelConfig) {
  setClassData({ levelConfig })
}

// Tras salir de la clase o enviarla a la papelera ya no se llega a ella como
// antes: se olvida y se vuelve a «Mis clases».
async function onLeft() {
  await navigateTo('/profesor/clases')
  forget()
}
</script>
