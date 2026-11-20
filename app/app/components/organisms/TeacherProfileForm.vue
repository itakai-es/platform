<script setup lang="ts">
import {
  registrationOptions,
  registrationError,
  type EducationCenter,
  type ProfessionalProfile,
} from '~/utils/teacher-registration'

const props = defineProps<{ wizard?: boolean }>()
const emit = defineEmits<{ completed: []; cancel: [] }>()
const { t } = useI18n()
const api = useApi()
const step = ref(1)
const busy = ref(false)
const centerBusy = ref(false)
const loaded = ref(false)
const error = ref('')
const id = useId()
const progress = ref<HTMLElement | null>(null)
function options(field: 'experience' | 'gamificationExperience' | 'gamificationFrequency') {
  return registrationOptions[field].map(value => ({
    value,
    label: t(`auth.teacher_registration.options.${field}.${value}`),
  }))
}

async function changeStep(next: number) {
  step.value = next
  error.value = ''
  await nextTick()
  progress.value?.focus()
}
const center = ref<EducationCenter | null | undefined>(undefined)
const answers = reactive({
  experience: '',
  stages: [] as string[],
  subjects: [] as string[],
  gamificationExperience: '',
  gamificationFrequency: '',
})

function fetchProfile() {
  return api.get<{ profile: ProfessionalProfile | null }>('/teacher-registration/profile')
}

async function load() {
  busy.value = true
  error.value = ''
  try {
    const { profile } = await fetchProfile()
    if (profile) {
      center.value = profile.centerAnswered ? profile.center : undefined
      answers.experience = profile.experience ?? ''
      answers.stages = profile.stages
      answers.subjects = profile.subjects
      answers.gamificationExperience = profile.gamificationExperience ?? ''
      answers.gamificationFrequency = profile.gamificationFrequency ?? ''
      if (props.wizard) {
        if (profile.completedAt) {
          emit('completed')
          return
        }
        step.value = !profile.centerAnswered ? 1 : profile.experience ? 3 : 2
      }
    }
    loaded.value = true
  } catch (cause) {
    error.value = registrationError(cause, t('auth.teacher_registration.error'))
  } finally {
    busy.value = false
  }
}

onMounted(load)

function toggle(field: 'stages' | 'subjects', option: string, checked: boolean) {
  const values = answers[field]
  answers[field] = checked
    ? option === 'none'
      ? ['none']
      : [...values.filter(value => value !== 'none'), option]
    : values.filter(value => value !== option)
}

function validationError() {
  if ((!props.wizard || step.value === 1) && center.value === undefined) return 'required'
  if (
    (!props.wizard || step.value === 2) &&
    (!answers.experience || !answers.stages.length || !answers.subjects.length)
  )
    return 'required'
  if (!props.wizard || step.value === 3) {
    if (!answers.gamificationExperience || !answers.gamificationFrequency) return 'required'
    if (answers.gamificationExperience === 'never' && answers.gamificationFrequency !== 'none')
      return 'inconsistent'
  }
  return null
}

async function save() {
  if (busy.value || centerBusy.value) return
  const issue = validationError()
  if (issue) {
    error.value = t(`auth.teacher_registration.${issue}`)
    return
  }
  busy.value = true
  error.value = ''
  const centerId = center.value?.id ?? null
  try {
    if (props.wizard && step.value < 3) {
      const body =
        step.value === 1
          ? { step: 1, centerId }
          : {
              step: 2,
              experience: answers.experience,
              stages: answers.stages,
              subjects: answers.subjects,
            }
      const draft = await api.apiFetch<ProfessionalProfile>('/teacher-registration/draft', {
        method: 'PATCH',
        body: JSON.stringify(body),
      })
      if (step.value === 1) center.value = draft.center
      await changeStep(step.value + 1)
    } else {
      const body = { centerId, ...answers }
      if (props.wizard) await api.post('/teacher-registration/finish', body)
      else await api.put('/teacher-registration/profile', body)
      emit('completed')
    }
  } catch (cause) {
    if (
      props.wizard &&
      step.value < 3 &&
      (cause as { statusCode?: number } | null)?.statusCode === 409
    ) {
      const latest = await fetchProfile().catch(() => null)
      if (latest?.profile?.completedAt) {
        emit('completed')
        return
      }
    }
    error.value = registrationError(cause, t('auth.teacher_registration.error'))
  } finally {
    busy.value = false
  }
}

function back() {
  void changeStep(step.value - 1)
}
</script>

<template>
  <div class="space-y-5">
    <div v-if="wizard" ref="progress" tabindex="-1" class="space-y-2">
      <p class="text-sm font-semibold text-text-secondary">
        {{ t('auth.teacher_registration.progress', { step }) }}
      </p>
      <ProgressBar :percentage="(step / 3) * 100" variant="teacher" aria-hidden="true" />
    </div>
    <p v-if="error" role="alert" class="rounded-2xl border border-error/30 p-3 text-sm text-error">
      {{ error }}
    </p>
    <template v-if="!loaded">
      <p v-if="busy" role="status">{{ t('auth.teacher_registration.loading') }}</p>
      <Button v-else @click="load">{{ t('auth.teacher_registration.retry') }}</Button>
    </template>
    <fieldset v-else :disabled="busy" class="space-y-6">
      <TeacherCenterPicker
        v-if="!wizard || step === 1"
        v-model="center"
        v-model:busy="centerBusy"
      />
      <div v-if="!wizard || step === 2" class="space-y-4">
        <div class="space-y-1">
          <label :for="`${id}-experience`" class="block font-semibold">{{
            t('auth.teacher_registration.experience')
          }}</label>
          <Select
            :id="`${id}-experience`"
            :model-value="answers.experience"
            :placeholder="t('auth.teacher_registration.select')"
            :options="options('experience')"
            @update:model-value="answers.experience = String($event)"
          />
        </div>
        <fieldset v-for="field in ['stages', 'subjects'] as const" :key="field">
          <legend class="mb-2 font-semibold">{{ t(`auth.teacher_registration.${field}`) }}</legend>
          <div class="grid gap-2 sm:grid-cols-2">
            <Checkbox
              v-for="option in registrationOptions[field]"
              :id="`${id}-${field}-${option}`"
              :key="option"
              :model-value="answers[field].includes(option)"
              :label="t(`auth.teacher_registration.options.${field}.${option}`)"
              @update:model-value="toggle(field, option, $event)"
            />
          </div>
        </fieldset>
      </div>
      <div v-if="!wizard || step === 3" class="space-y-4">
        <div
          v-for="field in ['gamificationExperience', 'gamificationFrequency'] as const"
          :key="field"
          class="space-y-1"
        >
          <label :for="`${id}-${field}`" class="block font-semibold">{{
            t(`auth.teacher_registration.${field}`)
          }}</label>
          <Select
            :id="`${id}-${field}`"
            :model-value="answers[field]"
            :placeholder="t('auth.teacher_registration.select')"
            :options="options(field)"
            @update:model-value="answers[field] = String($event)"
          />
        </div>
      </div>
      <div
        class="flex flex-wrap items-center justify-end gap-2 border-t border-border-primary pt-4"
      >
        <Button
          v-if="wizard && step > 1"
          variant="secondary"
          :disabled="centerBusy"
          @click="back"
          >{{ t('auth.teacher_registration.back') }}</Button
        >
        <Button v-if="!wizard" variant="secondary" :disabled="centerBusy" @click="emit('cancel')">{{
          t('common.actions.cancel')
        }}</Button>
        <p v-if="busy" class="mr-auto text-sm text-text-secondary" role="status">
          {{ t('auth.teacher_registration.loading') }}
        </p>
        <Button :disabled="centerBusy" :loading="busy" @click="save">
          {{
            wizard
              ? t(step < 3 ? 'auth.teacher_registration.next' : 'auth.teacher_registration.finish')
              : t('common.actions.save')
          }}
        </Button>
      </div>
    </fieldset>
  </div>
</template>
