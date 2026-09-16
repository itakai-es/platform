<template>
  <div class="space-y-6">
    <!-- ===== Curva / cómo se gana XP ===== -->
    <section class="bg-white rounded-2xl shadow-lg p-4 sm:p-5 space-y-4">
      <div>
        <h3 class="font-semibold text-navy-700">
          {{ t('teacher.classes.detail.settings.levels.curve_title') }}
        </h3>
        <p class="text-sm text-text-secondary">
          {{ t('teacher.classes.detail.settings.levels.curve_hint') }}
        </p>
      </div>

      <!-- Nº de niveles + modo de cálculo -->
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 items-end">
        <div>
          <label class="text-sm font-medium text-text-primary mb-2 block">
            {{ t('teacher.classes.detail.settings.levels.cap_label') }}
          </label>
          <input
            v-model.number="form.cap"
            type="number"
            min="2"
            max="200"
            class="w-full sm:w-36 rounded-xl border border-border-primary bg-white px-3 py-2 text-navy-700 outline-none focus:border-navy-700"
          />
        </div>
        <div>
          <label class="text-sm font-medium text-text-primary mb-2 block">
            {{ t('teacher.classes.detail.settings.levels.mode_label') }}
          </label>
          <div class="flex gap-2">
            <button
              v-for="m in modes"
              :key="m.value"
              type="button"
              class="flex-1 px-3 py-2 rounded-xl text-sm font-medium transition-all"
              :class="
                form.mode === m.value
                  ? 'bg-navy-700 text-white'
                  : 'bg-surface text-navy-700 border border-border-primary hover:border-navy-700'
              "
              @click="setMode(m.value)"
            >
              {{ m.label }}
            </button>
          </div>
        </div>
      </div>

      <!-- ===== Modo FÓRMULA (XP base + ritmo de crecimiento) ===== -->
      <template v-if="form.mode === 'curve'">
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 items-end">
          <div>
            <label class="text-sm font-medium text-text-primary mb-2 block">
              {{ t('teacher.classes.detail.settings.levels.base_label') }}
            </label>
            <input
              v-model.number="form.baseXp"
              type="number"
              min="1"
              max="100000"
              class="w-full sm:w-36 rounded-xl border border-border-primary bg-white px-3 py-2 text-navy-700 outline-none focus:border-navy-700"
            />
          </div>
          <div>
            <label class="text-sm font-medium text-text-primary mb-2 block">
              {{ t('teacher.classes.detail.settings.levels.pace_label') }}
            </label>
            <div class="flex gap-2">
              <button
                v-for="p in paces"
                :key="p.value"
                type="button"
                class="flex-1 px-3 py-2 rounded-xl text-sm font-medium transition-all"
                :class="
                  Math.abs(form.exponent - p.value) < 0.01
                    ? 'bg-navy-700 text-white'
                    : 'bg-surface text-navy-700 border border-border-primary hover:border-navy-700'
                "
                @click="form.exponent = p.value"
              >
                {{ p.label }}
              </button>
            </div>
          </div>
        </div>

        <!-- Explica en palabras el ritmo elegido (cambia al pulsar Lento/Normal/Rápido) -->
        <InfoNote>{{ paceDesc }}</InfoNote>

        <!-- Comparación: XP total para alcanzar niveles de referencia con cada
             ritmo. La columna del ritmo activo se resalta y cambia al pulsar. -->
        <div class="rounded-xl border border-border-primary overflow-hidden">
          <p class="bg-navy-700/5 px-3 py-2 text-xs font-medium text-text-secondary">
            {{ t('teacher.classes.detail.settings.levels.compare_title') }}
          </p>
          <div class="overflow-x-auto">
            <table class="w-full text-sm">
              <thead>
                <tr>
                  <th class="px-3 py-2"></th>
                  <th
                    v-for="col in paceCompare"
                    :key="col.label"
                    class="px-3 py-2 text-right text-xs font-semibold"
                    :class="col.active ? 'bg-navy-700/10 text-navy-700' : 'text-text-secondary'"
                  >
                    {{ col.label }}
                  </th>
                </tr>
              </thead>
              <tbody>
                <tr
                  v-for="(lvl, ri) in compareLevels"
                  :key="lvl"
                  class="border-t border-border-primary/50"
                >
                  <td class="whitespace-nowrap px-3 py-2 text-text-secondary">
                    {{ t('teacher.classes.detail.settings.levels.compare_level', { level: lvl }) }}
                  </td>
                  <td
                    v-for="col in paceCompare"
                    :key="col.label"
                    class="px-3 py-2 text-right tabular-nums"
                    :class="col.active ? 'bg-navy-700/5 font-bold text-navy-700' : 'text-text-secondary'"
                  >
                    {{ col.totals[ri] }} XP
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </template>

      <!-- ===== Modo MANUAL (XP por nivel) ===== -->
      <template v-else>
        <p class="text-sm text-text-secondary">
          {{ t('teacher.classes.detail.settings.levels.custom_hint') }}
        </p>
        <div
          v-if="form.levelXp"
          class="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-72 overflow-y-auto scrollbar-subtle pr-1"
        >
          <div
            v-for="(_, i) in form.levelXp"
            :key="i"
            class="flex items-center gap-2 rounded-xl bg-navy-700/5 px-3 py-2"
          >
            <span
              class="w-2.5 h-2.5 rounded-full flex-shrink-0"
              :style="{ backgroundColor: tierColorOf(i + 1) }"
            />
            <span class="text-sm text-navy-700 whitespace-nowrap"> Nvl {{ i + 1 }} → {{ i + 2 }} </span>
            <input
              v-model.number="form.levelXp[i]"
              type="number"
              min="1"
              class="ml-auto w-28 rounded-lg border border-border-primary bg-white px-2 py-1.5 text-right text-navy-700 outline-none focus:border-navy-700"
            />
            <span class="text-xs text-text-secondary">XP</span>
          </div>
        </div>
      </template>

    </section>

    <!-- ===== Rangos (título + color por tramo de niveles) ===== -->
    <section class="bg-white rounded-2xl shadow-lg p-4 sm:p-5 space-y-3">
      <div>
        <h3 class="font-semibold text-navy-700">
          {{ t('teacher.classes.detail.settings.levels.tiers_title') }}
        </h3>
        <p class="text-sm text-text-secondary">
          {{ t('teacher.classes.detail.settings.levels.tiers_hint') }}
        </p>
      </div>

      <div class="space-y-2">
        <div
          v-for="(tier, i) in form.tiers"
          :key="i"
          class="flex flex-wrap items-center gap-2 rounded-2xl bg-navy-700/5 p-3"
        >
          <input
            type="color"
            :value="tier.color"
            class="h-9 w-9 flex-shrink-0 cursor-pointer rounded-lg border border-border-primary bg-white p-0.5"
            @input="tier.color = ($event.target as HTMLInputElement).value"
          />
          <input
            v-model="tier.title"
            type="text"
            maxlength="40"
            :placeholder="t('teacher.classes.detail.settings.levels.tier_title_placeholder')"
            class="min-w-0 flex-1 rounded-xl border border-border-primary bg-white px-3 py-2 text-navy-700 outline-none focus:border-navy-700"
          />
          <div class="flex items-center gap-1.5 text-sm text-text-secondary">
            <span>{{ t('teacher.classes.detail.settings.levels.tier_from') }}</span>
            <input
              v-model.number="tier.fromLevel"
              type="number"
              min="1"
              :max="form.cap"
              class="w-16 rounded-lg border border-border-primary bg-white px-2 py-1.5 text-center text-navy-700 outline-none focus:border-navy-700"
            />
            <span>{{ t('teacher.classes.detail.settings.levels.tier_to') }}</span>
            <input
              v-model.number="tier.toLevel"
              type="number"
              min="1"
              :max="form.cap"
              class="w-16 rounded-lg border border-border-primary bg-white px-2 py-1.5 text-center text-navy-700 outline-none focus:border-navy-700"
            />
          </div>
          <button
            type="button"
            class="p-2 rounded-lg text-navy-700/50 hover:text-error hover:bg-error/10 transition-colors"
            :title="t('teacher.classes.detail.settings.levels.tier_remove')"
            @click="removeTier(i)"
          >
            <TrashIcon class="w-5 h-5" />
          </button>
        </div>
      </div>

      <div
        v-if="tierIssues.hasIssues"
        class="flex flex-col gap-2 rounded-xl border border-yellow/40 bg-yellow/10 px-3 py-2.5 text-sm text-navy-700 sm:flex-row sm:items-center"
      >
        <span class="flex-1">{{ t('teacher.classes.detail.settings.levels.tiers_warning') }}</span>
        <Button
          type="button"
          variant="outline"
          size="sm"
          class="flex-shrink-0"
          @click="normalizeTiers"
        >
          {{ t('teacher.classes.detail.settings.levels.tiers_autofix') }}
        </Button>
      </div>

      <Button type="button" variant="outline" size="sm" :icon-left="PlusIcon" @click="addTier">
        {{ t('teacher.classes.detail.settings.levels.tier_add') }}
      </Button>
    </section>

    <!-- ===== Acciones ===== -->
    <div class="flex flex-wrap justify-end gap-2">
      <Button
        type="button"
        variant="ghost"
        size="md"
        class="mr-auto"
        :disabled="saving"
        @click="restoreDefaults"
      >
        {{ t('teacher.classes.detail.settings.levels.restore_defaults') }}
      </Button>
      <Button type="button" variant="outline" size="md" :disabled="!dirty || saving" @click="reset">
        {{ t('teacher.classes.detail.settings.levels.discard') }}
      </Button>
      <Button
        type="button"
        variant="primary"
        size="md"
        :disabled="!dirty || saving"
        :loading="saving"
        @click="save"
      >
        {{ t('teacher.classes.detail.settings.levels.save') }}
      </Button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { PlusIcon, TrashIcon } from '@heroicons/vue/24/outline'
import type { LevelConfig, LevelTier } from '~/types/class.types'
import { tierForLevel, totalXpForLevel } from '~/utils/level-config'

// Paleta de rangos: bronce, teal, dorado… Es una identidad propia (como las
// medallas de un podio), no la semántica de la interfaz, así que no pasa por
// los tokens ni por los modos de accesibilidad.
const DEFAULT_TIERS: LevelTier[] = [
  { fromLevel: 1, toLevel: 4, title: 'Mortal', color: '#9CA3AF' },
  { fromLevel: 5, toLevel: 9, title: 'Héroe Novato', color: '#34D399' },
  { fromLevel: 10, toLevel: 19, title: 'Héroe', color: '#CD7F32' },
  { fromLevel: 20, toLevel: 29, title: 'Semidiós', color: '#14B8A6' },
  { fromLevel: 30, toLevel: 50, title: 'Dios del Olimpo', color: '#FBBF24' },
]
const DEFAULT_CONFIG: LevelConfig = {
  mode: 'curve',
  baseXp: 50,
  exponent: 1.3,
  cap: 50,
  tiers: DEFAULT_TIERS,
}

const props = defineProps<{
  classId: string
  levelConfig?: LevelConfig | null
}>()

const emit = defineEmits<{ update: [config: LevelConfig] }>()

const { t } = useI18n()
const toast = useToast()
const teacherStore = useTeacherStore()

const modes = computed(() => [
  { value: 'curve' as const, label: t('teacher.classes.detail.settings.levels.mode_curve') },
  { value: 'custom' as const, label: t('teacher.classes.detail.settings.levels.mode_custom') },
])

// Ritmo de subida = exponente de la curva. Menos exponente ⇒ los niveles altos
// cuestan menos ⇒ se sube más rápido; más exponente ⇒ más lento.
const paces = computed(() => [
  { value: 1.5, label: t('teacher.classes.detail.settings.levels.pace_slow') },
  { value: 1.3, label: t('teacher.classes.detail.settings.levels.pace_normal') },
  { value: 1.15, label: t('teacher.classes.detail.settings.levels.pace_fast') },
])

const clone = (c: LevelConfig): LevelConfig => ({
  mode: c.mode ?? 'curve',
  baseXp: c.baseXp,
  exponent: c.exponent,
  cap: c.cap,
  ...(c.levelXp ? { levelXp: [...c.levelXp] } : {}),
  tiers: c.tiers.map(tt => ({ ...tt })),
})

const buildForm = (): LevelConfig => clone(props.levelConfig ?? DEFAULT_CONFIG)

const form = ref<LevelConfig>(buildForm())
const snapshot = ref<LevelConfig>(buildForm())
const saving = ref(false)

const dirty = computed(() => JSON.stringify(form.value) !== JSON.stringify(snapshot.value))

watch(
  () => props.levelConfig,
  () => {
    if (!dirty.value) {
      form.value = buildForm()
      snapshot.value = buildForm()
    }
  }
)

// XP de un nivel según el modo actual (fórmula o valor manual). Rellena baseXp/
// exponent por defecto para que el cálculo del util nunca reciba NaN.
const cfgForCalc = computed<LevelConfig>(() => ({
  mode: form.value.mode ?? 'curve',
  baseXp: form.value.baseXp || 1,
  exponent: form.value.exponent || 1,
  cap: Math.max(2, Math.round(form.value.cap || 2)),
  levelXp: form.value.levelXp,
  tiers: form.value.tiers,
}))

function tierColorOf(level: number): string {
  return tierForLevel(level, cfgForCalc.value).color
}

// Explica en palabras el ritmo seleccionado (según el exponente actual).
const paceDesc = computed(() => {
  const e = form.value.exponent
  if (Math.abs(e - 1.15) < 0.01) return t('teacher.classes.detail.settings.levels.pace_desc_fast')
  if (Math.abs(e - 1.5) < 0.01) return t('teacher.classes.detail.settings.levels.pace_desc_slow')
  return t('teacher.classes.detail.settings.levels.pace_desc_normal')
})

// Comparación de ritmos: XP total para alcanzar unos niveles de referencia
// (~20%, ~50% y el máximo) con cada ritmo, para ver la diferencia de un vistazo.
const compareLevels = computed(() => {
  const cap = cfgForCalc.value.cap
  const pts = [Math.round(cap * 0.2), Math.round(cap * 0.5), cap]
  return [...new Set(pts)].filter(l => l >= 2 && l <= cap).sort((a, b) => a - b)
})
const paceCompare = computed(() => {
  const base = cfgForCalc.value
  // Mismo orden que el selector de arriba: Lento → Normal → Rápido.
  return paces.value.map(p => ({
    label: p.label,
    active: Math.abs(base.exponent - p.value) < 0.01,
    totals: compareLevels.value.map(l =>
      totalXpForLevel(l, { ...base, exponent: p.value }).toLocaleString()
    ),
  }))
})

// --- Modo manual: mantener levelXp con longitud cap-1 ---
function makeLevelXp(cap: number): number[] {
  const n = Math.max(1, Math.round(cap) - 1)
  const existing = form.value.levelXp ?? []
  return Array.from({ length: n }, (_, i) =>
    existing[i] != null && existing[i] >= 1
      ? Math.round(existing[i])
      : Math.floor((form.value.baseXp || 50) * Math.pow(i + 1, form.value.exponent || 1.3))
  )
}
function setMode(mode: 'curve' | 'custom') {
  if (form.value.mode === mode) return
  form.value.mode = mode
  if (mode === 'custom') form.value.levelXp = makeLevelXp(form.value.cap)
}
// Al cambiar el nº de niveles en modo manual, redimensionamos la lista.
watch(
  () => form.value.cap,
  () => {
    if (form.value.mode === 'custom') form.value.levelXp = makeLevelXp(form.value.cap)
  }
)

function addTier() {
  const last = form.value.tiers[form.value.tiers.length - 1]
  const from = last ? Math.min(form.value.cap, last.toLevel + 1) : 1
  form.value.tiers.push({ fromLevel: from, toLevel: form.value.cap, title: '', color: '#6366F1' })
}
function removeTier(i: number) {
  form.value.tiers.splice(i, 1)
}

const tierIssues = computed(() => {
  const cap = Math.max(1, Math.round(form.value.cap || 1))
  const covered = new Array(cap + 1).fill(0)
  let overlap = false
  let outOfRange = false
  for (const tr of form.value.tiers) {
    const from = Number(tr.fromLevel)
    const to = Number(tr.toLevel)
    if (from < 1 || to > cap || from > to) outOfRange = true
    for (let l = Math.max(1, from); l <= Math.min(cap, to); l++) {
      covered[l]++
      if (covered[l] > 1) overlap = true
    }
  }
  let gap = false
  for (let l = 1; l <= cap; l++) if (covered[l] === 0) gap = true
  return { overlap, gap, outOfRange, hasIssues: overlap || gap || outOfRange }
})

function normalizeTiers() {
  const cap = Math.max(1, Math.round(form.value.cap || 1))
  const sorted = [...form.value.tiers].sort((a, b) => (a.fromLevel || 0) - (b.fromLevel || 0))
  let cursor = 1
  sorted.forEach((tr, idx) => {
    const remaining = sorted.length - 1 - idx
    tr.fromLevel = cursor
    tr.toLevel =
      idx === sorted.length - 1
        ? cap
        : Math.max(cursor, Math.min(Number(tr.toLevel) || cursor, cap - remaining))
    cursor = tr.toLevel + 1
  })
  form.value.tiers = sorted
}

function reset() {
  form.value = clone(snapshot.value)
}
function restoreDefaults() {
  form.value = clone(DEFAULT_CONFIG)
}

async function save() {
  if (!dirty.value || saving.value) return
  saving.value = true
  const payload = clone(form.value)
  try {
    await teacherStore.updateClass(props.classId, { levelConfig: payload })
    snapshot.value = clone(payload)
    form.value = clone(payload)
    emit('update', payload)
    toast.success(t('teacher.classes.detail.settings.levels.toast_saved'))
  } catch {
    toast.error(t('teacher.classes.detail.settings.levels.toast_error'))
  } finally {
    saving.value = false
  }
}
</script>
