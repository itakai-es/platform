<template>
  <Badge variant="common" size="sm" class="flex-shrink-0 whitespace-nowrap">
    {{ t(`common.class_teachers.profiles.${profile}`) }}
  </Badge>
</template>

<script setup lang="ts">
import type { ClassTeacherProfile } from '~/types/class.types'

/** El perfil de un profesor en una clase (titular, sustituto, prácticas), como etiqueta. */
defineProps<{ profile: ClassTeacherProfile }>()

const { t } = useI18n()
</script>
