<template>
  <div class="space-y-6">
    <!-- Sub-navegación + acción -->
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
      <div class="flex gap-2 overflow-x-auto scrollbar-subtle -mx-1 px-1">
        <button
          v-for="v in views"
          :key="v.id"
          :class="[
            'px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors flex items-center gap-2 flex-shrink-0',
            view === v.id
              ? 'bg-navy-700 text-white'
              : 'bg-surface border border-border-primary text-navy-700 hover:bg-gray-50',
          ]"
          @click="view = v.id"
        >
          {{ v.label }}
          <span
            v-if="v.count"
            class="px-1.5 py-0.5 rounded-full text-xs font-semibold"
            :class="view === v.id ? 'bg-white/20 text-white' : 'bg-navy-700/10 text-navy-700'"
          >
            {{ v.count }}
          </span>
        </button>
      </div>
      <div v-if="view === 'articulos'" class="flex flex-shrink-0 gap-2">
        <Button variant="outline" :icon-left="SparklesIcon" @click="showLibrary = true">
          {{ t('teacher.classes.detail.shop.library_button') }}
        </Button>
        <Button variant="primary" :icon-left="PlusIcon" @click="openNew">
          {{ t('teacher.classes.detail.shop.new_item') }}
        </Button>
      </div>
    </div>

    <!-- Vista: Artículos -->
    <template v-if="view === 'articulos'">
      <div
        v-if="loading"
        class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6"
      >
        <IconCardSkeleton v-for="n in 6" :key="n" />
      </div>
      <EmptyState
        v-else-if="items.length === 0"
        :icon="ShoppingBagIcon"
        :title="t('teacher.classes.detail.shop.empty_title')"
        :description="t('teacher.classes.detail.shop.empty_description')"
      >
        <template #action>
          <Button variant="primary" :icon-left="PlusIcon" @click="openNew">
            {{ t('teacher.classes.detail.shop.new_item') }}
          </Button>
        </template>
      </EmptyState>
      <div v-else class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
        <ShopItemCard
          v-for="item in items"
          :key="item.id"
          :item="item"
          :type-label="
            isPower(item)
              ? t('teacher.classes.detail.shop.type_power')
              : t('teacher.classes.detail.shop.type_reward')
          "
          :faded="!item.active || (isPower(item) && !manaEnabled)"
          @click="openEdit(item)"
        >
          <template #chip>
            <!-- Mismo lenguaje que el panel del alumno: chip arriba a la derecha
                 con "Oculto" (si está desactivado) o "Ilimitada" (excepción
                 frente a las de un uso). Si está oculto prima ese estado. -->
            <span
              v-if="!item.active"
              class="flex-shrink-0 rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-500"
            >
              {{ t('teacher.classes.detail.shop.hidden') }}
            </span>
            <span
              v-else-if="isPower(item) && !manaEnabled"
              class="flex-shrink-0 rounded-full bg-yellow/20 px-2 py-0.5 text-xs font-medium text-yellow-dark"
            >
              {{ t('teacher.classes.detail.shop.mana_disabled_chip') }}
            </span>
            <span
              v-else-if="!isPower(item) && usageOf(item) === 'unlimited'"
              class="flex-shrink-0 rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-navy-700/70"
            >
              {{ t('teacher.classes.detail.shop.usage_unlimited') }}
            </span>
          </template>
          <template #footer>
            <Tooltip :text="t('common.resources.coins')">
              <CoinBadge :amount="item.price" size="md" variant="plain" />
            </Tooltip>
            <Tooltip
              v-if="isPower(item) && manaCostOf(item) > 0"
              class="ml-auto"
              :text="t('common.resources.mana')"
            >
              <ManaBadge :amount="manaCostOf(item)" size="md" variant="plain" />
            </Tooltip>
          </template>
        </ShopItemCard>
      </div>
    </template>

    <!-- Vista: Historial (canjes + usos en dos columnas, como el alumno) -->
    <template v-else>
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
        <!-- Columna: Compras -->
        <div class="space-y-3">
          <h4 class="flex items-center gap-2 text-sm font-semibold text-navy-700/70">
            {{ t('teacher.classes.detail.shop.history_purchases') }}
            <span class="rounded-full bg-navy-700/10 px-1.5 py-0.5 text-xs text-navy-700">
              {{ purchases.length }}
            </span>
          </h4>
          <ul v-if="loading" class="space-y-2">
            <ShopHistoryRowSkeleton v-for="n in 4" :key="n" />
          </ul>
          <p
            v-else-if="purchases.length === 0"
            class="rounded-2xl border border-dashed border-border-primary p-4 text-sm text-text-secondary"
          >
            {{ t('teacher.classes.detail.shop.purchases_empty_title') }}
          </p>
          <ul v-else class="space-y-2">
            <ShopHistoryRow
              v-for="p in purchases"
              :key="p.id"
              :item-kind="p.kind || 'reward'"
              :avatar="getImageUrl(p.studentAvatar || undefined)"
              :name="p.studentName"
              :student-id="p.studentId"
              :title="p.itemName"
              :subtitle="`${t('student.classes.detail.shop.history_bought')} · ${formatDate(p.date)}`"
            >
              <template #badge>
                <!-- Igual que en el alumno: la compra resta monedas del saldo. -->
                <CoinBadge :amount="-p.price" size="sm" variant="plain" />
              </template>
            </ShopHistoryRow>
          </ul>
        </div>

        <!-- Columna: Usos -->
        <div class="space-y-3">
          <h4 class="flex items-center gap-2 text-sm font-semibold text-navy-700/70">
            {{ t('teacher.classes.detail.shop.tab_uses') }}
            <span class="rounded-full bg-navy-700/10 px-1.5 py-0.5 text-xs text-navy-700">
              {{ uses.length }}
            </span>
          </h4>
          <ul v-if="loading" class="space-y-2">
            <ShopHistoryRowSkeleton v-for="n in 4" :key="n" />
          </ul>
          <p
            v-else-if="uses.length === 0"
            class="rounded-2xl border border-dashed border-border-primary p-4 text-sm text-text-secondary"
          >
            {{ t('teacher.classes.detail.shop.uses_empty_title') }}
          </p>
          <ul v-else class="space-y-2">
            <ShopHistoryRow
              v-for="u in uses"
              :key="u.id"
              :item-kind="u.kind || 'reward'"
              :avatar="getImageUrl(u.studentAvatar || undefined)"
              :name="u.studentName"
              :student-id="u.studentId"
              :title="u.itemName"
              :subtitle="`${u.kind === 'reward' ? t('student.classes.detail.shop.history_redeemed') : t('student.classes.detail.shop.history_used')} · ${formatDate(u.date)}`"
            >
              <template #badge>
                <!-- Solo mostrar maná cuando hay coste (uso de poder); los canjes de
                     recompensas no gastan maná, así que omitimos el badge. -->
                <ManaBadge
                  v-if="u.manaCost > 0"
                  :amount="-u.manaCost"
                  size="sm"
                  variant="plain"
                />
              </template>
            </ShopHistoryRow>
          </ul>
        </div>
      </div>
    </template>

    <!-- Modal crear/editar artículo -->
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
                    ? t('teacher.classes.detail.shop.form_edit_title')
                    : t('teacher.classes.detail.shop.form_new_title')
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
              <!-- Nombre -->
              <div>
                <label class="block text-sm font-medium text-navy-700 mb-1.5">
                  {{ t('teacher.classes.detail.shop.form_name') }}
                </label>
                <input
                  v-model="form.name"
                  type="text"
                  maxlength="40"
                  :placeholder="t('teacher.classes.detail.shop.form_name_placeholder')"
                  class="w-full rounded-xl border border-border-primary px-4 py-2.5 text-navy-700 focus:outline-none focus:ring-2 focus:ring-navy-700/20"
                />
              </div>

              <!-- Descripción -->
              <div>
                <label class="block text-sm font-medium text-navy-700 mb-1.5">
                  {{ t('teacher.classes.detail.shop.form_description') }}
                </label>
                <textarea
                  v-model="form.description"
                  rows="2"
                  maxlength="140"
                  :placeholder="t('teacher.classes.detail.shop.form_description_placeholder')"
                  class="w-full rounded-xl border border-border-primary px-4 py-2.5 text-navy-700 resize-none focus:outline-none focus:ring-2 focus:ring-navy-700/20"
                />
              </div>

              <!-- Precio -->
              <div>
                <label class="block text-sm font-medium text-navy-700 mb-1.5">
                  {{ t('teacher.classes.detail.shop.form_price') }}
                </label>
                <div class="mb-2 flex flex-wrap gap-1.5">
                  <button
                    v-for="p in SHOP_PRICE_PRESETS"
                    :key="p"
                    type="button"
                    class="rounded-full border px-2.5 py-1 text-xs font-medium transition-colors"
                    :class="
                      form.price === p
                        ? 'bg-navy-700 text-white border-navy-700'
                        : 'border-border-primary text-navy-700 hover:bg-gray-50'
                    "
                    @click="form.price = p"
                  >
                    {{ p }}
                  </button>
                </div>
                <div class="relative">
                  <CoinIcon class="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    v-model.number="form.price"
                    type="number"
                    min="0"
                    class="w-full rounded-xl border border-border-primary pl-9 pr-3 py-2.5 text-navy-700 focus:outline-none focus:ring-2 focus:ring-navy-700/20"
                  />
                </div>
              </div>

              <!-- Tipo: recompensa / poder -->
              <div>
                <label class="block text-sm font-medium text-navy-700 mb-1.5">
                  {{ t('teacher.classes.detail.shop.form_type') }}
                </label>
                <div class="flex gap-2">
                  <button
                    v-for="opt in ['reward', 'power']"
                    :key="opt"
                    type="button"
                    class="px-3 py-1.5 rounded-full text-sm font-medium border transition-colors"
                    :class="
                      form.kind === opt
                        ? 'bg-navy-700 text-white border-navy-700'
                        : 'border-border-primary text-navy-700 hover:bg-gray-50'
                    "
                    @click="form.kind = opt as ShopItemKind"
                  >
                    {{
                      opt === 'power'
                        ? t('teacher.classes.detail.shop.type_power')
                        : t('teacher.classes.detail.shop.type_reward')
                    }}
                  </button>
                </div>
              </div>

              <!-- Uso (solo recompensas): un solo uso / ilimitado -->
              <div v-if="form.kind === 'reward'">
                <label class="block text-sm font-medium text-navy-700 mb-1.5">
                  {{ t('teacher.classes.detail.shop.form_usage') }}
                </label>
                <div class="flex gap-2">
                  <button
                    v-for="opt in ['single', 'unlimited']"
                    :key="opt"
                    type="button"
                    class="px-3 py-1.5 rounded-full text-sm font-medium border transition-colors"
                    :class="
                      form.usage === opt
                        ? 'bg-navy-700 text-white border-navy-700'
                        : 'border-border-primary text-navy-700 hover:bg-gray-50'
                    "
                    @click="form.usage = opt as ShopItemUsage"
                  >
                    {{
                      opt === 'unlimited'
                        ? t('teacher.classes.detail.shop.usage_unlimited')
                        : t('teacher.classes.detail.shop.usage_single')
                    }}
                  </button>
                </div>
              </div>

              <!-- Coste en maná (solo poderes) -->
              <div v-if="form.kind === 'power'">
                <label class="block text-sm font-medium text-navy-700 mb-1.5">
                  {{ t('teacher.classes.detail.shop.form_mana_cost') }}
                </label>
                <div class="mb-2 flex flex-wrap gap-1.5">
                  <button
                    v-for="m in SHOP_MANA_PRESETS"
                    :key="m"
                    type="button"
                    class="rounded-full border px-2.5 py-1 text-xs font-medium transition-colors"
                    :class="
                      form.manaCost === m
                        ? 'bg-navy-700 text-white border-navy-700'
                        : 'border-border-primary text-navy-700 hover:bg-gray-50'
                    "
                    @click="form.manaCost = m"
                  >
                    {{ m }}
                  </button>
                </div>
                <div class="relative">
                  <ManaIcon class="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    v-model.number="form.manaCost"
                    type="number"
                    min="0"
                    class="w-full rounded-xl border border-border-primary pl-9 pr-3 py-2.5 text-navy-700 focus:outline-none focus:ring-2 focus:ring-navy-700/20"
                  />
                </div>
              </div>

              <!-- Vida que recupera (todos los tipos) -->
              <div>
                <label class="block text-sm font-medium text-navy-700 mb-1.5">
                  {{ t('teacher.classes.detail.shop.form_life_restore') }}
                </label>
                <p class="mb-2 text-xs text-text-secondary">
                  {{ t('teacher.classes.detail.shop.form_life_restore_hint') }}
                </p>
                <div class="relative">
                  <LifeIcon class="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    v-model.number="form.lifeRestore"
                    type="number"
                    min="0"
                    placeholder="0"
                    class="w-full rounded-xl border border-border-primary pl-9 pr-3 py-2.5 text-navy-700 focus:outline-none focus:ring-2 focus:ring-navy-700/20"
                  />
                </div>
              </div>

              <!-- Visible -->
              <div class="flex items-center justify-between">
                <span class="text-sm font-medium text-navy-700">
                  {{ t('teacher.classes.detail.shop.form_visible') }}
                </span>
                <Toggle v-model="form.active" />
              </div>
            </div>

            <div class="mt-6 flex items-center gap-3">
              <Button v-if="editingId" variant="outline" @click="deleteFromForm">
                <TrashIcon class="w-4 h-4 mr-2" />
                {{ t('teacher.classes.detail.shop.form_delete') }}
              </Button>
              <div class="flex-1" />
              <Button variant="outline" @click="showForm = false">
                {{ t('teacher.classes.detail.shop.form_cancel') }}
              </Button>
              <Button variant="primary" :disabled="!isValid" @click="save">
                {{
                  editingId
                    ? t('teacher.classes.detail.shop.form_save')
                    : t('teacher.classes.detail.shop.form_create')
                }}
              </Button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>

    <!-- Modal confirmar borrado -->
    <Teleport to="body">
      <Transition name="modal">
        <div
          v-if="pendingDelete"
          class="fixed inset-0 z-50 flex items-center justify-center p-4"
          @click.self="pendingDelete = null"
        >
          <div class="absolute inset-0 bg-black/50" @click="pendingDelete = null" />
          <div class="relative bg-white rounded-2xl p-6 max-w-sm w-full shadow-xl text-center">
            <div class="w-14 h-14 rounded-full bg-red/10 flex items-center justify-center mx-auto mb-4">
              <TrashIcon class="w-7 h-7 text-red" />
            </div>
            <h3 class="text-lg font-bold text-navy-700">
              {{ t('teacher.classes.detail.shop.delete_title', { name: pendingDelete.name }) }}
            </h3>
            <p class="text-sm text-text-secondary mt-1">
              {{ t('teacher.classes.detail.shop.delete_description') }}
            </p>
            <div class="flex gap-3 mt-6">
              <Button variant="outline" full-width @click="pendingDelete = null">
                {{ t('teacher.classes.detail.shop.form_cancel') }}
              </Button>
              <Button variant="danger" full-width @click="confirmDelete">
                {{ t('teacher.classes.detail.shop.form_delete') }}
              </Button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>

    <!-- Modal biblioteca de sugerencias -->
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
                  {{ t('teacher.classes.detail.shop.library_title') }}
                </h3>
                <p class="mt-1 text-sm text-text-secondary">
                  {{ t('teacher.classes.detail.shop.library_subtitle') }}
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
                  :class="s.kind === 'power' ? 'bg-purple-light' : 'bg-yellow-light'"
                >
                  <BoltIcon v-if="s.kind === 'power'" class="h-4 w-4 text-purple" />
                  <GiftIcon v-else class="h-4 w-4 text-yellow-dark" />
                </span>
                <div class="min-w-0 flex-1">
                  <p class="font-medium text-navy-700 truncate">{{ s.name }}</p>
                  <p class="text-xs text-text-secondary truncate">{{ s.description }}</p>
                  <div class="mt-1 flex items-center gap-2">
                    <Tooltip :text="t('common.resources.coins')">
                      <CoinBadge :amount="s.price" size="sm" variant="plain" />
                    </Tooltip>
                    <Tooltip v-if="s.kind === 'power'" :text="t('common.resources.mana')">
                      <ManaBadge :amount="s.manaCost" size="sm" variant="plain" />
                    </Tooltip>
                    <span
                      v-else-if="s.usage === 'single'"
                      class="rounded-full bg-gray-100 px-2 py-0.5 text-[11px] font-medium text-navy-700/70"
                    >
                      {{ t('teacher.classes.detail.shop.usage_single') }}
                    </span>
                    <Tooltip v-if="s.lifeRestore" :text="t('common.resources.lives')">
                      <span class="inline-flex items-center gap-0.5 text-xs font-semibold text-navy-700">
                        <LifeIcon class="h-3.5 w-3.5" />
                        +{{ s.lifeRestore }}
                      </span>
                    </Tooltip>
                  </div>
                </div>
                <Button
                  size="sm"
                  :variant="alreadyAdded(s) ? 'outline' : 'primary'"
                  :disabled="alreadyAdded(s) || addingName === s.name"
                  @click="addSuggestion(s)"
                >
                  <CheckIcon v-if="alreadyAdded(s)" class="w-4 h-4" />
                  <span v-else>{{ t('teacher.classes.detail.shop.library_add') }}</span>
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
  ShoppingBagIcon,
  PlusIcon,
  TrashIcon,
  XMarkIcon,
  SparklesIcon,
  CheckIcon,
} from '@heroicons/vue/24/outline'
import { GiftIcon, BoltIcon } from '@heroicons/vue/24/solid'
import type { ShopItem, ShopItemKind, ShopItemUsage } from '~/stores/shop'
import { SHOP_PRICE_PRESETS, SHOP_MANA_PRESETS } from '~/utils/gamification-config'
import { SHOP_SUGGESTIONS, type ShopSuggestion } from '~/utils/shop-suggestions'

const props = withDefaults(
  defineProps<{
    classId: string
    /** Si la clase tiene el maná desactivado, los alumnos no verán los poderes
     *  aunque existan en el catálogo del profesor. Lo avisamos visualmente. */
    manaEnabled?: boolean
  }>(),
  { manaEnabled: true }
)

const { t, locale } = useI18n()
const { getImageUrl } = useImageUrl()
const shop = useShopStore()
const toast = useToast()

// Skeletons solo en la carga inicial sin datos cacheados; si el store ya tiene
// artículos de esta clase (revisita), se muestran al instante y se refresca en silencio.
// watch (no onMounted): al navegar entre clases la ruta anidada reutiliza la
// instancia y onMounted no volvería a dispararse → recargamos por cambio de classId.
const loading = ref(shop.getItems(props.classId).length === 0)
watch(
  () => props.classId,
  async id => {
    loading.value = shop.getItems(id).length === 0
    try {
      await shop.fetchTeacherShop(id)
    } finally {
      loading.value = false
    }
  },
  { immediate: true }
)

const items = computed(() => shop.getItems(props.classId))
const purchases = computed(() => shop.getPurchases(props.classId))

function isPower(item: ShopItem): boolean {
  return item.kind === 'power'
}
function manaCostOf(item: ShopItem): number {
  return item.manaCost
}
function usageOf(item: ShopItem): ShopItemUsage {
  return item.usage
}

const uses = computed(() => shop.getUses(props.classId))

const view = ref<'articulos' | 'historial'>('articulos')
const views = computed(() => [
  {
    id: 'articulos' as const,
    label: t('teacher.classes.detail.shop.tab_items'),
    count: items.value.length,
  },
  {
    id: 'historial' as const,
    label: t('teacher.classes.detail.shop.tab_history'),
    count: purchases.value.length + uses.value.length,
  },
])

// --- Formulario crear/editar ---
const showForm = ref(false)
const editingId = ref<string | null>(null)
const form = reactive({
  name: '',
  description: '',
  price: 100,
  active: true,
  kind: 'reward' as ShopItemKind,
  manaCost: 20,
  usage: 'single' as ShopItemUsage,
  lifeRestore: 0,
})

const isValid = computed(() => form.name.trim().length > 0 && form.price >= 0)

// --- Biblioteca de sugerencias ---
const showLibrary = ref(false)
const suggestions = SHOP_SUGGESTIONS
const addingName = ref<string | null>(null)

/** Una sugerencia ya está en la tienda si existe un artículo con el mismo nombre. */
function alreadyAdded(s: ShopSuggestion): boolean {
  return items.value.some(i => i.name.toLowerCase() === s.name.toLowerCase())
}

async function addSuggestion(s: ShopSuggestion) {
  if (alreadyAdded(s) || addingName.value) return
  addingName.value = s.name
  try {
    await shop.addItem(props.classId, {
      name: s.name,
      description: s.description,
      price: s.price,
      active: true,
      kind: s.kind,
      manaCost: s.manaCost,
      usage: s.usage,
      lifeRestore: s.lifeRestore ?? 0,
    })
    toast.success(t('teacher.classes.detail.shop.toast_created'))
  } catch {
    toast.error(t('teacher.classes.detail.shop.toast_save_error'))
  } finally {
    addingName.value = null
  }
}

function openNew() {
  editingId.value = null
  Object.assign(form, {
    name: '',
    description: '',
    price: 100,
    active: true,
    kind: 'reward' as ShopItemKind,
    manaCost: 20,
    usage: 'single' as ShopItemUsage,
  })
  showForm.value = true
}

function openEdit(item: ShopItem) {
  editingId.value = item.id
  Object.assign(form, {
    name: item.name,
    description: item.description,
    price: item.price,
    active: item.active,
    kind: item.kind,
    manaCost: item.manaCost || 20,
    usage: item.usage,
    lifeRestore: item.lifeRestore ?? 0,
  })
  showForm.value = true
}

async function save() {
  if (!isValid.value) return
  const payload = {
    name: form.name.trim(),
    description: form.description.trim(),
    price: Math.max(0, Math.round(form.price)),
    active: form.active,
    kind: form.kind,
    manaCost: form.kind === 'power' ? Math.max(0, Math.round(form.manaCost)) : 0,
    usage: (form.kind === 'reward' ? form.usage : 'single') as ShopItemUsage,
    lifeRestore: Math.max(0, Math.round(form.lifeRestore || 0)),
  }
  try {
    if (editingId.value) {
      await shop.updateItem(props.classId, editingId.value, payload)
    } else {
      await shop.addItem(props.classId, payload)
    }
    toast.success(
      editingId.value
        ? t('teacher.classes.detail.shop.toast_updated')
        : t('teacher.classes.detail.shop.toast_created')
    )
    showForm.value = false
  } catch {
    toast.error(t('teacher.classes.detail.shop.toast_save_error'))
  }
}

// --- Borrado ---
const pendingDelete = ref<ShopItem | null>(null)

function deleteFromForm() {
  const item = items.value.find(i => i.id === editingId.value)
  showForm.value = false
  if (item) pendingDelete.value = item
}

async function confirmDelete() {
  if (!pendingDelete.value) return
  try {
    await shop.deleteItem(props.classId, pendingDelete.value.id)
    toast.success(t('teacher.classes.detail.shop.toast_deleted'))
  } catch {
    toast.error(t('teacher.classes.detail.shop.toast_delete_error'))
  }
  pendingDelete.value = null
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(locale.value, {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })
}

// Bloquear el scroll del fondo mientras haya un modal abierto.
const { lock, unlock } = useBodyScrollLock()
watch(
  () => showForm.value || showLibrary.value || pendingDelete.value !== null,
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
