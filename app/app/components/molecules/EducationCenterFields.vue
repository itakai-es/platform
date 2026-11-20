<script setup lang="ts">
import { registrationOptions, type EducationCenterData } from '~/utils/teacher-registration'

const center = defineModel<EducationCenterData>({ required: true })
const { t } = useI18n()
const typeId = useId()
const types = computed(() =>
  registrationOptions.type.map(value => ({
    value,
    label: t(`auth.teacher_registration.options.type.${value}`),
  }))
)
</script>

<template>
  <div class="grid gap-3 sm:grid-cols-2">
    <label
      v-for="field in ['name', 'municipality', 'country'] as const"
      :key="field"
      class="space-y-1"
    >
      <span class="block text-sm font-medium">{{ t(`auth.teacher_registration.${field}`) }}</span>
      <Input
        :model-value="center[field]"
        required
        :maxlength="field === 'name' ? 200 : 120"
        @update:model-value="center[field] = String($event)"
      />
    </label>
    <div class="space-y-1">
      <label :for="typeId" class="block text-sm font-medium">{{
        t('auth.teacher_registration.type')
      }}</label>
      <Select
        :id="typeId"
        :model-value="center.type"
        :options="types"
        :placeholder="t('auth.teacher_registration.select')"
        required
        @update:model-value="center.type = String($event)"
      />
    </div>
  </div>
</template>
