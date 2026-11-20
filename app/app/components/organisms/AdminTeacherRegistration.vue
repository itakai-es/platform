<script setup lang="ts">
import {
  registrationOptions,
  registrationQuestions,
  registrationError,
  type EducationCenter,
  type EducationCenterData,
} from '~/utils/teacher-registration'

interface RegistrationReport {
  total: number
  completed: number
  withoutCenter: number
  types: Record<string, number>
  centers: { center: EducationCenter; count: number }[]
  distributions: Record<(typeof registrationQuestions)[number], Record<string, number>>
}

const { t } = useI18n()
const api = useApi()
const scope = ref('')
const report = ref<RegistrationReport | null>(null)
const reportError = ref(false)
const reportBusy = ref(false)
let reportRequest = 0
const managing = ref(false)
const centerQuery = ref('')
const results = ref<EducationCenter[]>([])
const targetResults = ref<EducationCenter[]>([])
const targetQuery = ref('')
const selected = ref<EducationCenter | null>(null)
const edit = ref<EducationCenterData>({ name: '', municipality: '', country: '', type: '' })
const target = ref<EducationCenter | null>(null)
const busy = ref(false)
const error = ref('')
const status = ref('')
const endpoint = '/admin/teacher-registration/centers'

async function loadReport() {
  const [kind, value] = scope.value.split('/')
  const query = kind === 'type' ? { type: value } : kind === 'center' ? { centerId: value } : {}
  const current = ++reportRequest
  reportBusy.value = true
  reportError.value = false
  try {
    const data = await api.apiFetch<RegistrationReport>('/admin/teacher-registration/report', {
      query,
    })
    if (current !== reportRequest) return
    if (
      kind === 'center' &&
      value !== 'none' &&
      !data.centers.some(row => row.center.id === value)
    ) {
      scope.value = ''
      return
    }
    report.value = data
  } catch {
    if (current === reportRequest) reportError.value = true
  } finally {
    if (current === reportRequest) reportBusy.value = false
  }
}
onMounted(loadReport)
watch(scope, loadReport)

function label(center: EducationCenter) {
  return `${center.name} · ${center.municipality} · ${center.country} · ${t(`auth.teacher_registration.options.type.${center.type}`)}`
}

async function manage(operation: () => Promise<void>) {
  error.value = ''
  status.value = ''
  busy.value = true
  try {
    await operation()
  } catch (cause) {
    error.value = registrationError(cause, t('auth.teacher_registration.error'))
  } finally {
    busy.value = false
  }
}

function findCenters(query: string) {
  return api.apiFetch<EducationCenter[]>(endpoint, { query: { q: query } })
}

function findSource() {
  return manage(async () => {
    results.value = await findCenters(centerQuery.value)
  })
}

async function toggleManagement() {
  managing.value = !managing.value
  if (managing.value) await findSource()
}

function findTarget() {
  return manage(async () => {
    targetResults.value = (await findCenters(targetQuery.value)).filter(
      center => center.id !== selected.value?.id
    )
  })
}

function selectSource(center: EducationCenter) {
  selected.value = center
  edit.value = { ...center }
  targetQuery.value = ''
  targetResults.value = []
  target.value = null
  error.value = ''
  status.value = ''
}

function saveCenter() {
  const center = selected.value
  if (!center) return
  return manage(async () => {
    const saved = await api.put<EducationCenter>(`${endpoint}/${center.id}`, edit.value)
    selectSource(saved)
    status.value = t('auth.teacher_registration.saved')
    await Promise.all([
      loadReport(),
      findCenters(centerQuery.value).then(centers => {
        results.value = centers
      }),
    ])
  })
}

function merge() {
  const source = selected.value
  const destination = target.value
  if (!source || !destination) return
  return manage(async () => {
    const survivor = await api.post<EducationCenter>(`${endpoint}/${source.id}/merge`, {
      targetId: destination.id,
    })
    selectSource(survivor)
    status.value = t('auth.teacher_registration.merged')
    if (scope.value === `center/${source.id}`) scope.value = `center/${survivor.id}`
    else await loadReport()
    results.value = await findCenters(centerQuery.value)
  })
}
</script>

<template>
  <Card type="stats">
    <section class="space-y-5 p-5">
      <div class="flex flex-wrap items-center justify-between gap-3">
        <h2 class="text-xl font-bold">{{ t('auth.teacher_registration.profile') }}</h2>
        <Button
          variant="secondary"
          :disabled="busy"
          :aria-expanded="managing"
          @click="toggleManagement"
        >
          {{ t('auth.teacher_registration.manage_centers') }}
        </Button>
      </div>

      <div v-if="managing" class="space-y-4 rounded-xl border border-border-primary p-4">
        <form class="flex flex-wrap gap-2" @submit.prevent="findSource">
          <SearchInput
            v-model="centerQuery"
            :placeholder="t('auth.teacher_registration.search')"
            class="min-w-44 flex-1"
          />
          <Button type="submit" variant="secondary" :disabled="busy">{{
            t('auth.teacher_registration.search')
          }}</Button>
        </form>
        <ul
          v-if="results.length"
          class="max-h-48 divide-y overflow-auto rounded-lg border border-border-primary"
        >
          <li v-for="result in results" :key="result.id">
            <button
              class="w-full px-3 py-2 text-left hover:bg-surface-hover focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary"
              type="button"
              :disabled="busy"
              @click="selectSource(result)"
            >
              {{ label(result) }}
            </button>
          </li>
        </ul>
        <p v-else-if="!busy && !error">{{ t('auth.teacher_registration.no_results') }}</p>
        <template v-if="selected">
          <h3 class="font-bold">{{ label(selected) }}</h3>
          <form class="space-y-3" @submit.prevent="saveCenter">
            <EducationCenterFields v-model="edit" />
            <Button type="submit" :disabled="busy">{{ t('common.actions.save') }}</Button>
          </form>
          <div class="space-y-2 border-t pt-3">
            <form class="flex flex-wrap gap-2" @submit.prevent="findTarget">
              <SearchInput
                v-model="targetQuery"
                :placeholder="t('auth.teacher_registration.survivor')"
                class="min-w-44 flex-1"
              />
              <Button type="submit" variant="secondary" :disabled="busy">{{
                t('auth.teacher_registration.search')
              }}</Button>
            </form>
            <ul
              v-if="targetResults.length"
              class="max-h-48 divide-y overflow-auto rounded-lg border border-border-primary"
            >
              <li v-for="result in targetResults" :key="result.id">
                <button
                  class="w-full px-3 py-2 text-left hover:bg-surface-hover focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary"
                  type="button"
                  :disabled="busy"
                  @click="target = result"
                >
                  {{ label(result) }}
                </button>
              </li>
            </ul>
            <div v-if="target" class="flex flex-wrap items-center gap-2">
              <p>
                {{
                  t('auth.teacher_registration.merge_summary', {
                    source: label(selected),
                    target: label(target),
                  })
                }}
              </p>
              <Button variant="danger" :disabled="busy" @click="merge">{{
                t('auth.teacher_registration.merge')
              }}</Button>
            </div>
          </div>
        </template>
        <p v-if="error" role="alert" class="text-sm text-error">{{ error }}</p>
        <p v-if="status" role="status" class="text-sm">{{ status }}</p>
      </div>

      <LoadError v-if="reportError" @retry="loadReport" />
      <p v-else-if="!report" role="status">{{ t('auth.teacher_registration.loading') }}</p>
      <template v-if="report">
        <p class="font-semibold">
          {{
            t('auth.teacher_registration.coverage', {
              completed: report.completed,
              total: report.total,
            })
          }}
        </p>
        <label class="block max-w-2xl space-y-1">
          <span class="block font-semibold">{{ t('auth.teacher_registration.filter') }}</span>
          <select
            v-model="scope"
            class="w-full rounded-2xl border border-border-primary bg-surface px-4 py-3 text-text-primary focus:border-primary focus:ring-primary/20"
          >
            <option value="">
              {{ t('auth.teacher_registration.all') }} ({{ report.completed }})
            </option>
            <option value="center/none">
              {{ t('auth.teacher_registration.no_center') }} ({{ report.withoutCenter }})
            </option>
            <optgroup :label="t('auth.teacher_registration.type')">
              <option v-for="type in registrationOptions.type" :key="type" :value="`type/${type}`">
                {{ t(`auth.teacher_registration.options.type.${type}`) }} ({{
                  report.types[type] ?? 0
                }})
              </option>
            </optgroup>
            <optgroup :label="t('auth.teacher_registration.centers')">
              <option
                v-for="row in report.centers"
                :key="row.center.id"
                :value="`center/${row.center.id}`"
              >
                {{ label(row.center) }} ({{ row.count }})
              </option>
            </optgroup>
          </select>
        </label>
        <p v-if="reportBusy" role="status">{{ t('auth.teacher_registration.loading') }}</p>
        <div v-else-if="!reportError" class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <section
            v-for="field in registrationQuestions"
            :key="field"
            class="rounded-lg border border-border-primary p-3"
          >
            <h3 class="mb-2 font-bold">{{ t(`auth.teacher_registration.${field}`) }}</h3>
            <dl>
              <div
                v-for="option in registrationOptions[field]"
                :key="option"
                class="flex justify-between gap-2 py-1"
              >
                <dt>{{ t(`auth.teacher_registration.options.${field}.${option}`) }}</dt>
                <dd class="font-semibold tabular-nums">
                  {{ report.distributions[field][option] ?? 0 }}
                </dd>
              </div>
            </dl>
          </section>
        </div>
      </template>
    </section>
  </Card>
</template>
