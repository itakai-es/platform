<script setup lang="ts">
import {
  registrationError,
  type EducationCenter,
  type EducationCenterData,
} from '~/utils/teacher-registration'

const center = defineModel<EducationCenter | null | undefined>({ required: true })
const { t } = useI18n()
const api = useApi()
const query = ref('')
const results = ref<EducationCenter[]>([])
const showResults = ref(false)
const showCreate = ref(false)
const busy = defineModel<boolean>('busy', { required: true })
const error = ref('')
const match = ref<EducationCenter | null>(null)
const draft = ref<EducationCenterData>({ name: '', municipality: '', country: '', type: '' })

watch(query, () => {
  showResults.value = false
})

async function search() {
  if (busy.value) return
  showResults.value = false
  busy.value = true
  error.value = ''
  try {
    results.value = await api.apiFetch<EducationCenter[]>('/teacher-registration/centers', {
      query: { q: query.value },
    })
    showResults.value = true
  } catch (cause) {
    error.value = registrationError(cause, t('auth.teacher_registration.error'))
  } finally {
    busy.value = false
  }
}

function choose(value: EducationCenter | null) {
  center.value = value
  showCreate.value = false
  showResults.value = false
  match.value = null
}

function toggleCreate() {
  match.value = null
  showCreate.value = !showCreate.value
}

async function create() {
  if (busy.value) return
  match.value = null
  showResults.value = false
  busy.value = true
  error.value = ''
  try {
    const result = await api.post<{ center: EducationCenter; existing: boolean }>(
      '/teacher-registration/centers',
      draft.value
    )
    if (result.existing) match.value = result.center
    else choose(result.center)
  } catch (cause) {
    error.value = registrationError(cause, t('auth.teacher_registration.error'))
  } finally {
    busy.value = false
  }
}

function location(center: EducationCenter) {
  return [
    center.municipality,
    center.country,
    t(`auth.teacher_registration.options.type.${center.type}`),
  ].join(' · ')
}
</script>

<template>
  <fieldset :disabled="busy" class="space-y-4">
    <legend class="font-semibold">{{ t('auth.teacher_registration.center') }}</legend>
    <div
      v-if="center !== undefined"
      class="rounded-2xl bg-bg-secondary border border-border-primary px-4 py-3 text-text-primary"
      aria-live="polite"
    >
      <strong>{{ center?.name ?? t('auth.teacher_registration.no_center') }}</strong>
      <div v-if="center" class="text-sm">{{ location(center) }}</div>
    </div>
    <form class="flex flex-wrap gap-2" @submit.prevent="search">
      <SearchInput
        v-model="query"
        :placeholder="t('auth.teacher_registration.search')"
        class="min-w-44 flex-1"
      />
      <Button type="submit" variant="secondary" :disabled="busy">{{
        t('auth.teacher_registration.search')
      }}</Button>
    </form>
    <ul
      v-if="showResults && results.length"
      class="max-h-64 divide-y divide-border-primary overflow-auto rounded-2xl border border-border-primary"
    >
      <li v-for="result in results" :key="result.id">
        <button
          type="button"
          class="w-full px-4 py-3 text-left hover:bg-surface-hover focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary"
          @click="choose(result)"
        >
          <strong class="block">{{ result.name }}</strong>
          <span class="text-sm">{{ location(result) }}</span>
        </button>
      </li>
    </ul>
    <p v-else-if="showResults" class="text-sm">{{ t('auth.teacher_registration.no_results') }}</p>
    <div class="flex flex-wrap gap-2">
      <Button variant="secondary" :disabled="busy" @click="choose(null)">{{
        t('auth.teacher_registration.no_center')
      }}</Button>
      <Button
        variant="secondary-yellow"
        :disabled="busy"
        :aria-expanded="showCreate"
        @click="toggleCreate"
      >
        {{ t('auth.teacher_registration.create_center') }}
      </Button>
    </div>
    <form
      v-if="showCreate"
      class="space-y-3 rounded-2xl border border-border-primary bg-bg-secondary p-4"
      @submit.prevent="create"
    >
      <EducationCenterFields v-model="draft" @input="match = null" @change="match = null" />
      <Button type="submit" :disabled="busy">{{
        t('auth.teacher_registration.create_center')
      }}</Button>
      <div v-if="match" class="space-y-2" aria-live="polite">
        <p>
          {{ t('auth.teacher_registration.existing_center') }} <strong>{{ match.name }}</strong> ·
          {{ location(match) }}
        </p>
        <Button variant="secondary" @click="choose(match)">{{
          t('auth.teacher_registration.use_center')
        }}</Button>
      </div>
    </form>
    <p v-if="busy" role="status" class="text-sm text-text-secondary">
      {{ t('auth.teacher_registration.loading') }}
    </p>
    <p v-if="error" role="alert" class="text-sm text-error">{{ error }}</p>
  </fieldset>
</template>
