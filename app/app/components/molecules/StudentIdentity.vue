<template>
  <div class="flex min-w-0 items-center gap-3">
    <Avatar
      :src="student.avatar"
      :name="student.name"
      :seed="studentAvatarSeed(classId, student.id)"
      size="xs"
    />
    <div class="min-w-[6rem]">
      <NuxtLink
        :to="`/profesor/clases/${classId}/alumnos/${student.id}`"
        class="block break-words font-semibold text-navy-700 underline decoration-navy-700/30 underline-offset-2 hover:decoration-navy-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-navy-700"
      >
        {{ student.name }}
      </NuxtLink>
      <p v-if="student.nickname" class="text-xs font-normal text-navy-700/70">
        @{{ student.nickname }}
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { studentAvatarSeed } from '~/utils/avatar'

/**
 * Quién es un estudiante en los paneles del profesorado: avatar, nombre real
 * (que lleva a su página dentro de la clase) y alias, como en el Listado.
 */
defineProps<{
  classId: string
  student: { id: string; name: string; nickname: string | null; avatar: string | null }
}>()
</script>
