<template>
  <div class="space-y-8">
    <!-- Sub-navegación (pills) + acciones -->
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
      <div class="flex gap-2 overflow-x-auto scrollbar-subtle -mx-1 px-1">
        <button
          v-for="f in filters"
          :key="f.id"
          :class="[
            'px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors flex items-center gap-2 flex-shrink-0',
            viewKind === f.id
              ? 'bg-navy-700 text-white'
              : 'bg-surface border border-border-primary text-navy-700 hover:bg-gray-50',
          ]"
          @click="viewKind = f.id"
        >
          {{ f.label }}
          <span
            class="px-1.5 py-0.5 rounded-full text-xs font-semibold"
            :class="viewKind === f.id ? 'bg-white/20 text-white' : 'bg-navy-700/10 text-navy-700'"
          >
            {{ f.count }}
          </span>
        </button>
      </div>
      <div class="flex flex-shrink-0 gap-2">
        <Button variant="outline" :icon-left="SparklesIcon" @click="showLibrary = true">
          <span class="whitespace-nowrap">{{ t('teacher.classes.detail.behaviors.library_button') }}</span>
        </Button>
        <Button variant="primary" :icon-left="PlusIcon" @click="openNew">
          <span class="whitespace-nowrap">
            <span class="sm:hidden">{{ t('teacher.classes.detail.behaviors.new_button_short') }}</span>
            <span class="hidden sm:inline">{{ t('teacher.classes.detail.behaviors.new_button') }}</span>
          </span>
        </Button>
      </div>
    </div>

    <!-- Skeletons de carga inicial -->
    <div
      v-if="loading"
      class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6"
    >
      <IconCardSkeleton v-for="n in 6" :key="n" />
    </div>

    <EmptyState
      v-else-if="!behaviors.length"
      :icon="HandRaisedIcon"
      :title="t('teacher.classes.detail.behaviors.empty_title')"
      :description="t('teacher.classes.detail.behaviors.empty_description')"
    >
      <template #action>
        <Button variant="primary" :icon-left="SparklesIcon" @click="showLibrary = true">
          {{ t('teacher.classes.detail.behaviors.library_button') }}
        </Button>
      </template>
    </EmptyState>

    <!-- Grid único filtrado -->
    <div v-else class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
      <BehaviorCardItem
        v-for="b in displayedBehaviors"
        :key="b.id"
        :behavior="b"
        :xp-enabled="cfg.xp"
        :coins-enabled="cfg.coins"
        :lives-enabled="cfg.lives"
        @click="openApply(b)"
        @edit="openEdit(b)"
      />
    </div>

    <!-- Modal: aplicar a un alumno -->
    <Teleport to="body">
      <Transition name="modal">
        <div
          v-if="pendingBehavior"
          class="fixed inset-0 z-50 flex items-center justify-center p-4"
          @click.self="pendingBehavior = null"
        >
          <div class="absolute inset-0 bg-black/50" @click="pendingBehavior = null" />
          <div
            class="relative flex max-h-[85vh] w-full max-w-md flex-col overflow-hidden rounded-2xl bg-white shadow-xl"
          >
            <div class="flex items-start justify-between gap-3 p-6 pb-3">
              <div>
                <h3 class="text-lg font-bold text-navy-700">
                  {{
                    t('teacher.classes.detail.behaviors.apply_title', {
                      name: pendingBehavior.name,
                    })
                  }}
                </h3>
                <p class="mt-1 text-sm text-text-secondary">
                  {{ t('teacher.classes.detail.behaviors.pick_student') }}
                </p>
              </div>
              <button
                class="-mr-1 -mt-1 flex-shrink-0 rounded-full p-1.5 text-navy-700/70 hover:bg-gray-100"
                @click="pendingBehavior = null"
              >
                <XMarkIcon class="w-5 h-5" />
              </button>
            </div>

            <div class="flex-1 overflow-y-auto px-6 pb-6">
              <p v-if="!students.length" class="text-sm text-text-secondary">
                {{ t('teacher.classes.detail.behaviors.empty_students') }}
              </p>
              <ul v-else class="space-y-2">
                <li
                  v-for="s in students"
                  :key="s.id"
                  class="flex cursor-pointer items-center gap-3 rounded-xl border border-border-primary bg-surface px-4 py-3 transition-colors hover:border-navy-700/40"
                  @click="apply(s)"
                >
                  <Avatar :src="s.avatar" :username="displayName(s)" size="md" />
                  <span class="min-w-0 flex-1 truncate font-medium text-navy-700">
                    {{ displayName(s) }}
                  </span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>

    <!-- Modal: crear/editar comportamiento -->
    <Teleport to="body">
      <Transition name="modal">
        <div
          v-if="showForm"
          class="fixed inset-0 z-50 flex items-center justify-center p-4"
          @click.self="showForm = false"
        >
          <div class="absolute inset-0 bg-black/50" @click="showForm = false" />
          <div
            class="relative bg-white rounded-2xl p-6 max-w-md w-full shadow-xl max-h-[90vh] overflow-y-auto"
          >
            <div class="flex items-center justify-between mb-4">
              <h3 class="text-lg font-bold text-navy-700">
                {{
                  editingId
                    ? t('teacher.classes.detail.behaviors.form_edit_title')
                    : t('teacher.classes.detail.behaviors.form_new_title')
                }}
              </h3>
              <button
                class="p-1.5 rounded-full hover:bg-gray-100 text-navy-700/70"
                @click="showForm = false"
              >
                <XMarkIcon class="w-5 h-5" />
              </button>
            </div>

            <div class="space-y-4">
              <!-- Tipo -->
              <div>
                <label class="block text-sm font-medium text-navy-700 mb-1.5">
                  {{ t('teacher.classes.detail.behaviors.form_type') }}
                </label>
                <div class="flex gap-2">
                  <button
                    v-for="opt in ['positive', 'negative']"
                    :key="opt"
                    type="button"
                    class="px-3 py-1.5 rounded-full text-sm font-medium border transition-colors"
                    :class="
                      form.kind === opt
                        ? 'bg-navy-700 text-white border-navy-700'
                        : 'border-border-primary text-navy-700 hover:bg-gray-50'
                    "
                    @click="form.kind = opt as BehaviorKind"
                  >
                    {{
                      opt === 'positive'
                        ? t('teacher.classes.detail.behaviors.type_positive')
                        : t('teacher.classes.detail.behaviors.type_negative')
                    }}
                  </button>
                </div>
              </div>

              <!-- Nombre -->
              <div>
                <label class="block text-sm font-medium text-navy-700 mb-1.5">
                  {{ t('teacher.classes.detail.behaviors.form_name') }}
                </label>
                <input
                  v-model="form.name"
                  type="text"
                  maxlength="50"
                  :placeholder="t('teacher.classes.detail.behaviors.form_name_placeholder')"
                  class="w-full rounded-xl border border-border-primary px-4 py-2.5 text-navy-700 focus:outline-none focus:ring-2 focus:ring-navy-700/20"
                />
              </div>

              <!-- Descripción -->
              <div>
                <label class="block text-sm font-medium text-navy-700 mb-1.5">
                  {{ t('teacher.classes.detail.behaviors.form_description') }}
                </label>
                <textarea
                  v-model="form.description"
                  rows="2"
                  maxlength="160"
                  :placeholder="t('teacher.classes.detail.behaviors.form_description_placeholder')"
                  class="w-full rounded-xl border border-border-primary px-4 py-2.5 text-navy-700 resize-none focus:outline-none focus:ring-2 focus:ring-navy-700/20"
                />
              </div>

              <!-- Impactos (solo los recursos activados en la clase) -->
              <div v-if="hasImpactFields">
                <label class="block text-sm font-medium text-navy-700 mb-1.5">
                  {{ t('teacher.classes.detail.behaviors.form_impacts') }}
                </label>
                <p class="mb-2 text-xs text-text-secondary">
                  {{ t('teacher.classes.detail.behaviors.form_impacts_hint') }}
                </p>
                <div class="flex flex-wrap gap-2">
                  <div v-if="cfg.xp" class="relative flex-1 min-w-[120px]">
                    <XpIcon class="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      v-model.number="form.xp"
                      type="number"
                      min="0"
                      :placeholder="t('common.resources.xp')"
                      class="w-full rounded-xl border border-border-primary pl-9 pr-3 py-2.5 text-navy-700 focus:outline-none focus:ring-2 focus:ring-navy-700/20"
                    />
                  </div>
                  <div v-if="cfg.coins" class="relative flex-1 min-w-[120px]">
                    <CoinIcon class="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      v-model.number="form.coins"
                      type="number"
                      min="0"
                      :placeholder="t('common.resources.coins')"
                      class="w-full rounded-xl border border-border-primary pl-9 pr-3 py-2.5 text-navy-700 focus:outline-none focus:ring-2 focus:ring-navy-700/20"
                    />
                  </div>
                  <div v-if="cfg.lives" class="relative flex-1 min-w-[120px]">
                    <LifeIcon class="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      v-model.number="form.lives"
                      type="number"
                      min="0"
                      :placeholder="t('common.resources.lives')"
                      class="w-full rounded-xl border border-border-primary pl-9 pr-3 py-2.5 text-navy-700 focus:outline-none focus:ring-2 focus:ring-navy-700/20"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div class="mt-6 flex items-center gap-3">
              <Button v-if="editingId" variant="outline" @click="deleteFromForm">
                <TrashIcon class="w-4 h-4 mr-2" />
                {{ t('teacher.classes.detail.behaviors.form_delete') }}
              </Button>
              <div class="flex-1" />
              <Button variant="outline" @click="showForm = false">
                {{ t('teacher.classes.detail.behaviors.form_cancel') }}
              </Button>
              <Button variant="primary" :disabled="!isValid" @click="save">
                {{
                  editingId
                    ? t('teacher.classes.detail.behaviors.form_save')
                    : t('teacher.classes.detail.behaviors.form_create')
                }}
              </Button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>

    <!-- Modal: confirmar borrado -->
    <Teleport to="body">
      <Transition name="modal">
        <div
          v-if="pendingDelete"
          class="fixed inset-0 z-50 flex items-center justify-center p-4"
          @click.self="pendingDelete = null"
        >
          <div class="absolute inset-0 bg-black/50" @click="pendingDelete = null" />
          <div class="relative bg-white rounded-2xl p-6 max-w-sm w-full shadow-xl text-center">
            <div
              class="w-14 h-14 rounded-full bg-red/10 flex items-center justify-center mx-auto mb-4"
            >
              <TrashIcon class="w-7 h-7 text-red" />
            </div>
            <h3 class="text-lg font-bold text-navy-700">
              {{
                t('teacher.classes.detail.behaviors.delete_title', {
                  name: pendingDelete.name,
                })
              }}
            </h3>
            <p class="text-sm text-text-secondary mt-1">
              {{ t('teacher.classes.detail.behaviors.delete_description') }}
            </p>
            <div class="flex gap-3 mt-6">
              <Button variant="outline" full-width @click="pendingDelete = null">
                {{ t('teacher.classes.detail.behaviors.form_cancel') }}
              </Button>
              <Button variant="danger" full-width @click="confirmDelete">
                {{ t('teacher.classes.detail.behaviors.form_delete') }}
              </Button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>

    <!-- Modal: biblioteca de sugerencias -->
    <Teleport to="body">
      <Transition name="modal">
        <div
          v-if="showLibrary"
          class="fixed inset-0 z-50 flex items-center justify-center p-4"
          @click.self="showLibrary = false"
        >
          <div class="absolute inset-0 bg-black/50" @click="showLibrary = false" />
          <div
            class="relative flex max-h-[85vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl bg-white shadow-xl"
          >
            <div class="flex items-start justify-between gap-3 p-6 pb-3">
              <div>
                <h3 class="text-lg font-bold text-navy-700">
                  {{ t('teacher.classes.detail.behaviors.library_title') }}
                </h3>
                <p class="mt-1 text-sm text-text-secondary">
                  {{ t('teacher.classes.detail.behaviors.library_subtitle') }}
                </p>
              </div>
              <button
                class="-mr-1 -mt-1 flex-shrink-0 rounded-full p-1.5 text-navy-700/70 hover:bg-gray-100"
                @click="showLibrary = false"
              >
                <XMarkIcon class="w-5 h-5" />
              </button>
            </div>
            <div class="flex-1 space-y-2 overflow-y-auto px-6 pb-6">
              <div
                v-for="s in suggestions"
                :key="s.name"
                class="flex items-center gap-3 rounded-xl border border-border-primary p-3"
              >
                <span
                  class="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full"
                  :class="s.kind === 'positive' ? 'bg-navy-700' : 'bg-red'"
                >
                  <HandThumbUpIcon
                    v-if="s.kind === 'positive'"
                    class="h-4 w-4 text-white"
                  />
                  <HandThumbDownIcon v-else class="h-4 w-4 text-white" />
                </span>
                <div class="min-w-0 flex-1">
                  <p class="font-medium text-navy-700 truncate">{{ s.name }}</p>
                  <p class="text-xs text-text-secondary truncate">{{ s.description }}</p>
                  <div class="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs font-semibold">
                    <span v-if="s.xp && cfg.xp" class="inline-flex items-center gap-0.5">
                      <XpIcon class="h-3 w-3" />
                      <span :class="signClass(s)">{{ sign(s) }}{{ s.xp }}</span>
                    </span>
                    <span v-if="s.coins && cfg.coins" class="inline-flex items-center gap-0.5">
                      <CoinIcon class="h-3 w-3" />
                      <span :class="signClass(s)">{{ sign(s) }}{{ s.coins }}</span>
                    </span>
                    <span v-if="s.lives && cfg.lives" class="inline-flex items-center gap-0.5">
                      <LifeIcon class="h-3 w-3" />
                      <span :class="signClass(s)">{{ sign(s) }}{{ s.lives }}</span>
                    </span>
                  </div>
                </div>
                <Button
                  size="sm"
                  :variant="alreadyAdded(s) ? 'outline' : 'primary'"
                  :disabled="alreadyAdded(s) || addingName === s.name"
                  @click="addSuggestion(s)"
                >
                  <CheckIcon v-if="alreadyAdded(s)" class="w-4 h-4" />
                  <span v-else>{{ t('teacher.classes.detail.behaviors.library_add') }}</span>
                </Button>
              </div>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import {
  PlusIcon,
  XMarkIcon,
  TrashIcon,
  SparklesIcon,
  CheckIcon,
  HandRaisedIcon,
} from '@heroicons/vue/24/outline'
import { HandThumbUpIcon, HandThumbDownIcon } from '@heroicons/vue/24/solid'
import {
  BEHAVIOR_SUGGESTIONS,
  type BehaviorKind,
  type BehaviorSuggestion,
} from '~/utils/behavior-suggestions'
import type { Behavior } from '~/stores/behaviors'
import type { ClassSettings } from '~/types/class.types'
import { resolveClassSettings } from '~/utils/class-settings'

interface StudentLike {
  id: string
  name: string
  username?: string // backend ya envía nickname || name; lo preferimos para coherencia con ranking/cards.
  avatar?: string
}

const props = defineProps<{
  classId: string
  students: StudentLike[]
  settings?: Partial<ClassSettings> | null
}>()

// Per-class flags: hide resource impacts (XP/coins/lives) that the class has disabled.
const cfg = computed(() => resolveClassSettings(props.settings))
const hasImpactFields = computed(() => cfg.value.xp || cfg.value.coins || cfg.value.lives)

function displayName(s: StudentLike): string {
  return s.username || s.name
}

const { t } = useI18n()
const toast = useToast()
const store = useBehaviorsStore()
const effects = useEffects()

const behaviors = computed(() => store.getBehaviors(props.classId))
// Loading local por instancia (no el flag compartido del store): skeletons solo
// en la carga inicial sin datos cacheados de esta clase.
const loading = ref(store.getBehaviors(props.classId).length === 0)
const positives = computed(() => behaviors.value.filter(b => b.kind === 'positive'))
const negatives = computed(() => behaviors.value.filter(b => b.kind === 'negative'))

// Filtro de tipo (pills tipo tienda)
type ViewKind = 'all' | 'positive' | 'negative'
const viewKind = ref<ViewKind>('all')
const filters = computed(() => [
  {
    id: 'all' as const,
    label: t('teacher.classes.detail.behaviors.filter_all'),
    count: behaviors.value.length,
  },
  {
    id: 'positive' as const,
    label: t('teacher.classes.detail.behaviors.section_positives'),
    count: positives.value.length,
  },
  {
    id: 'negative' as const,
    label: t('teacher.classes.detail.behaviors.section_negatives'),
    count: negatives.value.length,
  },
])
const displayedBehaviors = computed(() => {
  if (viewKind.value === 'positive') return positives.value
  if (viewKind.value === 'negative') return negatives.value
  return behaviors.value
})

watch(
  () => props.classId,
  async (id) => {
    loading.value = store.getBehaviors(id).length === 0
    try {
      await store.fetchBehaviors(id)
    } catch {
      toast.error(t('teacher.classes.detail.behaviors.fetch_error'))
    } finally {
      loading.value = false
    }
  },
  { immediate: true },
)

// --- Apply ---
const pendingBehavior = ref<Behavior | null>(null)
const applying = ref(false)
function openApply(b: Behavior) {
  pendingBehavior.value = b
}
async function apply(student: StudentLike) {
  const b = pendingBehavior.value
  if (!b || applying.value) return
  applying.value = true
  try {
    await store.apply(props.classId, b.id, student.id)
    toast.success(
      t('teacher.classes.detail.behaviors.applied_toast', {
        behavior: b.name,
        student: displayName(student),
      }),
    )
    // Feedback al profe: sparkle + sonido positivo, o sonido fail si es negativo.
    // El cliente del profe no muestra floaters de delta porque son varios recursos
    // a la vez y quedaría ruidoso; el toast ya comunica el resultado.
    effects.play(b.kind === 'positive' ? 'behavior_positive' : 'behavior_negative', {
      settings: cfg.value,
    })
    pendingBehavior.value = null
  } catch {
    toast.error(t('teacher.classes.detail.behaviors.apply_error'))
  } finally {
    applying.value = false
  }
}

// --- CRUD ---
const showForm = ref(false)
const editingId = ref<string | null>(null)
const form = reactive({
  name: '',
  description: '',
  kind: 'positive' as BehaviorKind,
  xp: undefined as number | undefined,
  coins: undefined as number | undefined,
  lives: undefined as number | undefined,
})

function resetForm(seed?: Behavior) {
  if (seed) {
    form.name = seed.name
    form.description = seed.description
    form.kind = seed.kind
    form.xp = seed.xp
    form.coins = seed.coins
    form.lives = seed.lives
  } else {
    form.name = ''
    form.description = ''
    form.kind = 'positive'
    form.xp = undefined
    form.coins = undefined
    form.lives = undefined
  }
}

const isValid = computed(() => form.name.trim().length > 0)

function openNew() {
  editingId.value = null
  resetForm()
  showForm.value = true
}
function openEdit(b: Behavior) {
  editingId.value = b.id
  resetForm(b)
  showForm.value = true
}

const saving = ref(false)
async function save() {
  if (!isValid.value || saving.value) return
  saving.value = true
  const payload = {
    name: form.name.trim(),
    description: form.description.trim(),
    kind: form.kind,
    xp: normalize(form.xp),
    coins: normalize(form.coins),
    lives: normalize(form.lives),
  }
  try {
    if (editingId.value) {
      await store.update(props.classId, editingId.value, payload)
      toast.success(t('teacher.classes.detail.behaviors.toast_updated'))
    } else {
      await store.add(props.classId, payload)
      toast.success(t('teacher.classes.detail.behaviors.toast_created'))
    }
    showForm.value = false
  } catch {
    toast.error(t('teacher.classes.detail.behaviors.toast_save_error'))
  } finally {
    saving.value = false
  }
}

function normalize(v: number | undefined): number | undefined {
  if (v === undefined || v === null || Number.isNaN(v)) return undefined
  const n = Math.max(0, Math.round(v))
  return n > 0 ? n : undefined
}

// --- Borrado ---
const pendingDelete = ref<Behavior | null>(null)
function deleteFromForm() {
  const b = behaviors.value.find(x => x.id === editingId.value)
  showForm.value = false
  if (b) pendingDelete.value = b
}
const deleting = ref(false)
async function confirmDelete() {
  if (!pendingDelete.value || deleting.value) return
  deleting.value = true
  try {
    await store.remove(props.classId, pendingDelete.value.id)
    toast.success(t('teacher.classes.detail.behaviors.toast_deleted'))
    pendingDelete.value = null
  } catch {
    toast.error(t('teacher.classes.detail.behaviors.toast_delete_error'))
  } finally {
    deleting.value = false
  }
}

// --- Biblioteca ---
const showLibrary = ref(false)
const suggestions = BEHAVIOR_SUGGESTIONS
const addingName = ref<string | null>(null)

function alreadyAdded(s: BehaviorSuggestion): boolean {
  return store.exists(props.classId, s.name)
}
function sign(s: BehaviorSuggestion): string {
  return s.kind === 'positive' ? '+' : '−'
}
function signClass(s: BehaviorSuggestion): string {
  return s.kind === 'positive' ? 'text-navy-700' : 'text-red'
}
async function addSuggestion(s: BehaviorSuggestion) {
  if (alreadyAdded(s) || addingName.value) return
  addingName.value = s.name
  try {
    await store.addFromSuggestion(props.classId, s)
    toast.success(t('teacher.classes.detail.behaviors.toast_created'))
  } catch {
    toast.error(t('teacher.classes.detail.behaviors.toast_save_error'))
  } finally {
    addingName.value = null
  }
}

// --- Scroll lock para todos los modales ---
const { lock, unlock } = useBodyScrollLock()
watch(
  () =>
    pendingBehavior.value !== null ||
    showForm.value ||
    pendingDelete.value !== null ||
    showLibrary.value,
  open => (open ? lock() : unlock())
)
onUnmounted(unlock)
</script>

<style scoped>
.modal-enter-active,
.modal-leave-active {
  transition: opacity 0.2s ease;
}
.modal-enter-active .relative,
.modal-leave-active .relative {
  transition:
    transform 0.2s ease,
    opacity 0.2s ease;
}
.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}
.modal-enter-from .relative,
.modal-leave-to .relative {
  transform: scale(0.95);
  opacity: 0;
}
</style>
