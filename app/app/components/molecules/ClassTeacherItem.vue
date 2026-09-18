<template>
  <li class="flex items-center gap-3 py-3">
    <Avatar :username="name" size="xs" class="flex-shrink-0" aria-hidden="true" />
    <div class="min-w-0 flex-1">
      <p class="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
        <span class="truncate font-semibold text-navy-700">{{ name }}</span>
        <Badge v-if="isOwner" variant="info" size="sm" class="flex-shrink-0 whitespace-nowrap">
          {{ t('common.class_teachers.owner') }}
        </Badge>
        <ClassTeacherProfileBadge :profile="profile" />
      </p>
      <!-- Datos de más (correo, nivel…): los pone quien usa la fila -->
      <div v-if="$slots.details" class="mt-0.5 text-xs text-navy-700/70">
        <slot name="details" />
      </div>
    </div>
    <div v-if="$slots.actions" class="flex flex-shrink-0 items-center">
      <slot name="actions" />
    </div>
  </li>
</template>

<script setup lang="ts">
import type { ClassTeacherProfile } from '~/types/class.types'

/**
 * Una persona del profesorado de una clase: avatar, nombre, marca de propietario
 * y perfil. La usan la sección de profesorado de los ajustes (con el nivel y el
 * menú de acciones en sus huecos) y la vista de la clase del alumnado.
 */
defineProps<{
  name: string
  profile: ClassTeacherProfile
  isOwner: boolean
}>()

const { t } = useI18n()
</script>
