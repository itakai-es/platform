<script setup lang="ts">
import { registrationQuestions, type ProfessionalProfile } from '~/utils/teacher-registration'

defineProps<{ profile: ProfessionalProfile }>()
const { t } = useI18n()
</script>

<template>
  <dl class="grid gap-4 sm:grid-cols-2">
    <div>
      <dt class="font-semibold">{{ t('auth.teacher_registration.center') }}</dt>
      <dd v-if="profile.center">
        {{ profile.center.name }} · {{ profile.center.municipality }} · {{ profile.center.country }}
        <div class="text-sm">
          {{ t(`auth.teacher_registration.options.type.${profile.center.type}`) }}
        </div>
      </dd>
      <dd v-else>{{ t('auth.teacher_registration.no_center') }}</dd>
    </div>
    <div v-for="field in registrationQuestions" :key="field">
      <dt class="font-semibold">{{ t(`auth.teacher_registration.${field}`) }}</dt>
      <dd v-if="Array.isArray(profile[field])">
        {{
          (profile[field] as string[])
            .map(option => t(`auth.teacher_registration.options.${field}.${option}`))
            .join(', ')
        }}
      </dd>
      <dd v-else-if="profile[field]">
        {{ t(`auth.teacher_registration.options.${field}.${profile[field]}`) }}
      </dd>
    </div>
  </dl>
</template>
