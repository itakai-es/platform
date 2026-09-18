<template>
  <Card type="info">
    <CardHeader :title="t('student.classes.detail.teachers.title')" :icon="UserGroupIcon" />
    <CardItem v-if="teachers.length === 0" padding="lg" layout="column" centered>
      <p class="text-text-secondary">{{ t('student.classes.detail.teachers.empty') }}</p>
    </CardItem>
    <ul v-else class="divide-y divide-border-primary rounded-xl bg-white px-4">
      <ClassTeacherItem
        v-for="(teacher, index) in teachers"
        :key="`${index}-${teacher.name}`"
        :name="teacher.name"
        :profile="teacher.profile"
        :is-owner="teacher.isOwner"
      />
    </ul>
  </Card>
</template>

<script setup lang="ts">
import { UserGroupIcon } from '@heroicons/vue/24/outline'
import type { ClassTeacherPublic } from '~/types/class.types'

/** Quién imparte la clase, en la vista del alumnado: nombre, perfil y quién es el propietario. */
defineProps<{ teachers: ClassTeacherPublic[] }>()

const { t } = useI18n()
</script>
