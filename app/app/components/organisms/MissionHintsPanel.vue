<template>
  <MissionDetailSection
    :id="mode === 'student' ? 'pistas' : undefined"
    :title="t('common.mission_hints.title')"
    :icon="LightBulbIcon"
    tone="hints"
  >
    <template v-if="mode === 'teacher' && canEdit" #actions>
      <Button
        variant="primary"
        size="sm"
        :icon-left="PlusIcon"
        :disabled="atLimit"
        :aria-describedby="atLimit ? limitId : undefined"
        @click="openAdd"
      >
        {{ t('teacher.components.mission_hints.add') }}
      </Button>
    </template>

    <!-- ============ Profesorado ============ -->
    <div v-if="mode === 'teacher'" ref="teacherRef">
      <template v-if="hints.length">
        <div class="mb-3 space-y-2">
          <InfoNote on-color>{{ t('teacher.components.mission_hints.intro') }}</InfoNote>
          <InfoNote v-if="anyFree" on-color>
            {{ t('teacher.components.mission_hints.free_note_list') }}
          </InfoNote>
          <p v-if="atLimit && canEdit" :id="limitId" class="text-sm text-navy-700">
            {{
              t('teacher.components.mission_hints.limit_reached', { max: HINT_LIMITS.perMission })
            }}
          </p>
        </div>
        <!-- `overflow-hidden` redondea el fondo de las filas, como en el panel. -->
        <div class="overflow-hidden rounded-xl bg-white" :aria-busy="busy">
          <AdminSortableList
            :items="hints"
            :locked="!canEdit || busy"
            :item-label="hint => t('common.mission_hints.hint_label', { position: hint.position })"
            :save="saveOrder"
          >
            <template #leading="{ index }">
              <OrderNumber :value="index + 1" />
            </template>

            <template #main="{ item, index }">
              <p class="sr-only">
                {{ t('common.mission_hints.hint_label', { position: index + 1 }) }}
              </p>
              <p class="line-clamp-3 whitespace-pre-line break-words text-sm text-navy-700">
                {{ item.content }}
              </p>
            </template>

            <template #meta="{ item }">
              <!-- El coste que tiene puesto; si la clase no usa ese recurso, al lado
                   que hoy sale gratis (vuelve a cobrarse si se activa). -->
              <HintCost :cost-type="item.costType" :cost="item.cost" :free="item.cost <= 0" />
              <span v-if="isFree(item) && item.cost > 0" class="text-xs text-navy-700/70">
                {{ t('teacher.components.mission_hints.free_in_class') }}
              </span>
              <span v-if="item.usedCount" class="text-xs text-navy-700/70">
                {{
                  t(
                    'teacher.components.mission_hints.used_by',
                    { count: item.usedCount },
                    item.usedCount
                  )
                }}
              </span>
            </template>

            <template v-if="canEdit" #actions="{ item, index }">
              <IconButton
                :icon="PencilSquareIcon"
                :label="t('teacher.components.mission_hints.edit_named', { position: index + 1 })"
                :disabled="busy"
                data-hint-edit
                @click="openEdit(item)"
              />
            </template>
          </AdminSortableList>
        </div>
      </template>

      <div v-else class="rounded-xl bg-white">
        <EmptyState
          :icon="LightBulbIcon"
          :title="t('teacher.components.mission_hints.empty_title')"
          :description="
            canEdit
              ? t('teacher.components.mission_hints.empty_description', { coins: coinLabel })
              : t('teacher.components.mission_hints.empty_description_readonly')
          "
        >
          <template v-if="canEdit" #action>
            <Button
              variant="primary"
              size="sm"
              :icon-left="PlusIcon"
              data-hint-add-first
              @click="openAdd"
            >
              {{ t('teacher.components.mission_hints.add_first') }}
            </Button>
          </template>
        </EmptyState>
      </div>

      <HintFormModal
        v-if="canEdit"
        v-model="formOpen"
        :hint="editing"
        :settings="classCfg"
        :saving="saving"
        :deleting="deleting"
        @submit="submit"
        @delete="removeEditing"
      />
    </div>

    <!-- ============ Alumnado ============ -->
    <template v-else>
      <InfoNote v-if="isPreview" class="mb-3" on-color>
        {{ t('student.mission_detail.hints.preview_note') }}
      </InfoNote>
      <InfoNote v-else-if="state?.closedReason === 'completed'" class="mb-3" on-color>
        {{ t('student.mission_detail.hints.closed_completed') }}
      </InfoNote>
      <InfoNote v-else-if="state?.closedReason === 'expired'" class="mb-3" on-color>
        {{ t('student.mission_detail.hints.closed_expired') }}
      </InfoNote>
      <InfoNote v-else class="mb-3" on-color>{{
        t('student.mission_detail.hints.intro')
      }}</InfoNote>

      <ol class="space-y-3">
        <li v-for="hint in hints" :key="hint.id" class="rounded-xl bg-white p-4">
          <div class="flex items-start gap-3">
            <span
              class="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full"
              :class="opened(hint) ? 'bg-navy-700 text-white' : 'bg-gray-200 text-navy-700'"
              aria-hidden="true"
            >
              <LightBulbIcon v-if="opened(hint)" class="h-5 w-5" />
              <LockClosedIcon v-else-if="!hint.isNext || closed" class="h-5 w-5" />
              <span v-else class="text-sm font-bold">{{ hint.position }}</span>
            </span>

            <div class="min-w-0 flex-1">
              <div class="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
                <h3 class="text-base font-semibold text-navy-700">
                  {{ t('common.mission_hints.hint_label', { position: hint.position }) }}
                </h3>
                <span class="inline-flex flex-wrap items-center gap-2">
                  <Badge v-if="hint.used" variant="success" size="sm">
                    {{ t('student.mission_detail.hints.used') }}
                  </Badge>
                  <HintCost :cost-type="hint.costType" :cost="hint.cost" :free="shownFree(hint)" />
                </span>
              </div>

              <!-- Abierta: su texto. Al usarla, el foco viene aquí. -->
              <p
                v-if="opened(hint)"
                :ref="el => setContentRef(hint.id, el)"
                tabindex="-1"
                class="mt-2 whitespace-pre-line break-words text-sm text-navy-700/90 focus:outline-none"
              >
                {{ hint.content }}
              </p>

              <!-- La siguiente: lo que cuesta y su saldo, junto al botón. Al pulsar se usa. -->
              <div
                v-else-if="hint.isNext && state?.canUse"
                class="mt-3 flex flex-wrap items-center gap-x-3 gap-y-2"
              >
                <Button
                  variant="primary"
                  size="sm"
                  :icon-left="LightBulbIcon"
                  :loading="usingId === hint.id"
                  :disabled="!!usingId || shortfall(hint) > 0"
                  :aria-describedby="`hint-summary-${hint.id}`"
                  @click="useOne(hint)"
                >
                  {{ t('student.mission_detail.hints.use_button', { position: hint.position }) }}
                </Button>
                <p
                  :id="`hint-summary-${hint.id}`"
                  class="min-w-0 flex-1 basis-56 text-sm text-navy-700/80"
                >
                  {{ summaryFor(hint) }}
                  <strong v-if="shortfall(hint) > 0" class="font-semibold text-navy-700">
                    {{ shortfallText(hint) }}
                  </strong>
                </p>
              </div>

              <!-- Con la misión cerrada ya no se abre ninguna: la nota de arriba dice por qué. -->
              <p v-else-if="closed" class="mt-1 text-sm text-navy-700/70">
                {{ t('student.mission_detail.hints.not_used') }}
              </p>
              <p
                v-else-if="!hint.isNext"
                class="mt-1 flex items-center gap-1.5 text-sm text-navy-700/70"
              >
                {{
                  t('student.mission_detail.hints.locked', {
                    position: Math.max(1, hint.position - 1),
                  })
                }}
              </p>
            </div>
          </div>
        </li>
      </ol>

      <!-- Avisa de la pista recién usada (su texto lo lee el foco, que va a ella). -->
      <p class="sr-only" aria-live="polite">{{ announcement }}</p>
    </template>
  </MissionDetailSection>
</template>

<script setup lang="ts">
import type { ComponentPublicInstance } from 'vue'
import {
  LightBulbIcon,
  LockClosedIcon,
  PencilSquareIcon,
  PlusIcon,
} from '@heroicons/vue/24/outline'
import type {
  MissionDetail,
  MissionHintDetail,
  MissionHintState,
} from '~/types/mission-detail.types'
import type { MissionHintInput } from '~/composables/useMissionHints'
import { resolveClassSettings } from '~/utils/class-settings'
import { HINT_LIMITS, hintIsFree, hintShortfall } from '~/utils/mission-hints'

/**
 * La sección «Pistas» del detalle de una misión.
 *
 * Profesorado: la lista ordenable (con ratón y con teclado), el editor de cada
 * pista y cuántos estudiantes ha usado cada una. Alumnado: las pistas en orden;
 * de las usadas, su texto; de la siguiente, el coste y el saldo junto a
 * «Usar», que se aplica al pulsar (sin ventana de confirmar). La vista previa
 * del profesorado las ve todas abiertas y no las usa.
 *
 * Lo que cambia se lo cuenta a la página con `changed`, que lo guarda en la
 * misión (y con ella en la caché).
 */
const props = withDefaults(
  defineProps<{
    mission: MissionDetail
    mode: 'teacher' | 'student'
    /** Profesorado: puede cambiar las pistas. */
    canEdit?: boolean
  }>(),
  { canEdit: false }
)

const emit = defineEmits<{
  changed: [patch: { hints: MissionHintDetail[]; hintState?: MissionHintState | null }]
  /** Lo que se veía ya no vale (otra pestaña, otra persona): hay que volver a pedir la misión. */
  stale: []
}>()

const { t } = useI18n()
const { coinLabel } = useCoinLabel()
const toast = useToast()
const api = useMissionHints(() => props.mission.id)
const limitId = useId()

const hints = computed(() => props.mission.hints ?? [])
const state = computed(() => props.mission.hintState ?? null)
/** La misión ya no está en curso para el alumno (completada o caducada). */
const closed = computed(() => !!state.value?.closedReason)
const classCfg = computed(() => resolveClassSettings(props.mission.classSettings))
/** En modo alumno, pero la API responde como profesor: es la vista previa. */
const isPreview = computed(() => props.mode === 'student' && !!props.mission.isTeacher)

const atLimit = computed(() => hints.value.length >= HINT_LIMITS.perMission)
const isFree = (hint: MissionHintDetail) => hintIsFree(hint, classCfg.value)
const anyFree = computed(() => hints.value.some(hint => hint.cost > 0 && isFree(hint)))

/** Con posiciones de nuevo desde 1, tras quitar o mover alguna. */
const renumber = (list: MissionHintDetail[]) =>
  list.map((hint, index) => ({ ...hint, position: index + 1 }))

// ---------------- Profesorado ----------------

const formOpen = ref(false)
const editing = ref<MissionHintDetail | null>(null)
const saving = ref(false)
const deleting = ref(false)
const busy = computed(() => saving.value || deleting.value)
const teacherRef = ref<HTMLElement | null>(null)

// Si la misión se vuelve a pedir con el editor abierto (alguien acaba de usar
// la pista), el editor pasa a la pista de ahora: ya no ofrece borrarla.
watch(hints, list => {
  const current = editing.value
  if (!current || !formOpen.value) return
  const fresh = list.find(hint => hint.id === current.id)
  if (fresh) editing.value = fresh
  else formOpen.value = false
})

/**
 * Al cerrar el editor, el foco va a un sitio que sigue ahí: el botón Editar de
 * la pista guardada o de la que ocupa el sitio de la borrada o, si ya no queda
 * ninguna, «Añadir la primera pista». Sin esto se quedaría en la página: el
 * botón con el que se abrió el editor puede haber desaparecido.
 */
async function focusAfterChange(hintId: string | undefined) {
  await nextTick()
  const root = teacherRef.value
  if (!root) return
  const row = hintId
    ? root.querySelector<HTMLElement>(`[data-sortable-id="${hintId}"] [data-hint-edit]`)
    : null
  const target = row ?? root.querySelector<HTMLElement>('[data-hint-add-first]')
  target?.focus()
}

function openAdd() {
  editing.value = null
  formOpen.value = true
}

function openEdit(hint: MissionHintDetail) {
  editing.value = hint
  formOpen.value = true
}

async function submit(input: MissionHintInput) {
  saving.value = true
  let focusId: string | undefined
  try {
    const current = editing.value
    const result = current ? await api.update(current.id, input) : await api.create(input)
    if (!result.ok) {
      toast.error(result.message || t('teacher.components.mission_hints.toast_error'))
      return
    }
    const saved = result.data.hint
    emit('changed', {
      hints: current
        ? hints.value.map(hint => (hint.id === saved.id ? saved : hint))
        : [...hints.value, saved],
    })
    toast.success(
      current
        ? t('teacher.components.mission_hints.toast_saved')
        : t('teacher.components.mission_hints.toast_added')
    )
    formOpen.value = false
    focusId = saved.id
  } finally {
    saving.value = false
  }
  // Ya sin `busy`, que deja los botones Editar desactivados (y sin foco posible).
  if (focusId) await focusAfterChange(focusId)
}

async function removeEditing() {
  const target = editing.value
  if (!target) return
  deleting.value = true
  let removed = false
  let focusId: string | undefined
  try {
    const result = await api.remove(target.id)
    if (!result.ok) {
      toast.error(result.message || t('teacher.components.mission_hints.toast_delete_error'))
      // Alguien la ha usado mientras tanto: lo que se ve ya no vale.
      if (result.code === 'HINT_USED') emit('stale')
      return
    }
    const index = hints.value.findIndex(hint => hint.id === target.id)
    const remaining = hints.value.filter(hint => hint.id !== target.id)
    emit('changed', { hints: renumber(remaining) })
    toast.success(t('teacher.components.mission_hints.toast_deleted'))
    formOpen.value = false
    removed = true
    // La que ocupa ahora su sitio, o la anterior si era la última.
    focusId = remaining[Math.min(index, remaining.length - 1)]?.id
  } finally {
    deleting.value = false
  }
  if (removed) await focusAfterChange(focusId)
}

async function saveOrder(ids: string[]): Promise<boolean> {
  const result = await api.reorder(ids)
  if (!result.ok) {
    toast.error(result.message || t('teacher.components.mission_hints.reorder_error'))
    return false
  }
  emit('changed', { hints: result.data.hints })
  return true
}

// ---------------- Alumnado ----------------

const usingId = ref<string | null>(null)
const announcement = ref('')
const contentRefs = new Map<string, HTMLElement>()
const shopStore = useShopStore()
const classGamification = useClassGamificationStore()

/** Abierta: usada o, en la vista previa, todas. */
const opened = (hint: MissionHintDetail) => hint.content !== null && (hint.used || isPreview.value)

function setContentRef(id: string, el: Element | ComponentPublicInstance | null) {
  if (el instanceof HTMLElement) contentRefs.set(id, el)
  else contentRefs.delete(id)
}

/**
 * Gratis, tal como se enseña: al alumnado la API ya le da el coste de hoy (0 si
 * el recurso está apagado) o lo que le costó; la vista previa recibe el coste
 * escrito y se mira la clase.
 */
const shownFree = (hint: MissionHintDetail) => (isPreview.value ? isFree(hint) : hint.cost <= 0)

const wallet = computed(() => ({ coins: state.value?.coins ?? 0, xp: state.value?.xp ?? 0 }))
const shortfall = (hint: MissionHintDetail) => hintShortfall(hint, wallet.value)

function summaryFor(hint: MissionHintDetail): string {
  if (hint.cost <= 0) return t('student.mission_detail.hints.summary_free')
  if (hint.costType === 'percent') {
    return t('student.mission_detail.hints.summary_percent', { count: hint.cost })
  }
  if (hint.costType === 'xp') {
    return t('student.mission_detail.hints.summary_xp', {
      count: hint.cost,
      balance: wallet.value.xp,
    })
  }
  return t('student.mission_detail.hints.summary_coins', {
    count: hint.cost,
    coins: coinLabel.value,
    balance: wallet.value.coins,
  })
}

function shortfallText(hint: MissionHintDetail): string {
  const missing = shortfall(hint)
  return hint.costType === 'xp'
    ? t('student.mission_detail.hints.short_xp', { count: missing })
    : t('student.mission_detail.hints.short_coins', { count: missing, coins: coinLabel.value })
}

async function useOne(hint: MissionHintDetail) {
  if (usingId.value) return
  usingId.value = hint.id
  try {
    // Con el coste que se veía junto al botón: si ha cambiado, la API no cobra otro.
    const result = await api.use(hint.id, { costType: hint.costType, cost: hint.cost })
    if (!result.ok) {
      toast.error(result.message || t('student.mission_detail.hints.use_error'))
      // Ya la tenía, no era la siguiente o la misión ha cambiado: se vuelve a pedir.
      emit('stale')
      return
    }
    emit('changed', { hints: result.data.hints, hintState: result.data.hintState })
    // Los saldos de la clase cambian: la cabecera y la tienda, al día.
    const classId = props.mission.classId
    if (classId) {
      shopStore.setBalance(classId, result.data.hintState.coins)
      if (hint.costType === 'xp' && hint.cost > 0) {
        void classGamification.fetchClassXp(classId, true).catch(() => {})
      }
    }
    announcement.value = t('student.mission_detail.hints.used_announcement', {
      position: hint.position,
    })
    await nextTick()
    contentRefs.get(hint.id)?.focus()
  } finally {
    usingId.value = null
  }
}
</script>
