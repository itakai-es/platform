<template>
  <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
    <FieldGroup v-slot="{ labelId }" :label="t('teacher.classes.detail.teachers.field_profile')">
      <SelectDropdown
        :model-value="profile"
        :options="profileOptions"
        :labelledby="labelId"
        :disabled="disabled"
        @update:model-value="setProfile"
      />
    </FieldGroup>
    <FieldGroup
      v-slot="{ labelId, describedby }"
      :label="t('teacher.classes.detail.teachers.field_access')"
      :hint="t(`teacher.classes.detail.teachers.access_hint.${access}`)"
    >
      <SelectDropdown
        :model-value="access"
        :options="accessOptions"
        :labelledby="labelId"
        :describedby="describedby"
        :disabled="disabled"
        @update:model-value="setAccess"
      />
    </FieldGroup>
  </div>
</template>

<script setup lang="ts">
import type { ClassAccessLevel, ClassTeacherProfile } from '~/types/class.types'
import {
  CLASS_ACCESS_LEVELS,
  CLASS_TEACHER_PROFILES,
  PROFILE_DEFAULT_ACCESS,
} from '~/utils/class-access'

/**
 * Perfil y nivel de un profesor en una clase, para añadirlo o cambiarlo. Al
 * elegir un perfil, el nivel pasa al de ese perfil; después se puede cambiar.
 * Debajo del nivel va lo que permite, para no elegirlo a ciegas.
 */
defineProps<{ disabled?: boolean }>()

const profile = defineModel<ClassTeacherProfile>('profile', { required: true })
const access = defineModel<ClassAccessLevel>('access', { required: true })

const { t } = useI18n()

const profileOptions = computed(() =>
  CLASS_TEACHER_PROFILES.map(value => ({
    value,
    label: t(`common.class_teachers.profiles.${value}`),
  }))
)
const accessOptions = computed(() =>
  CLASS_ACCESS_LEVELS.map(value => ({
    value,
    label: t(`common.class_teachers.access.${value}`),
  }))
)

function setProfile(value: string | number) {
  const chosen = value as ClassTeacherProfile
  profile.value = chosen
  // Con el perfil elegido, no con profile.value: el modelo no cambia hasta que
  // el padre vuelve a pintar, y leerlo aquí daría el nivel del perfil anterior.
  access.value = PROFILE_DEFAULT_ACCESS[chosen]
}

function setAccess(value: string | number) {
  access.value = value as ClassAccessLevel
}
</script>
