<template>
  <div class="space-y-6">
    <!-- Sub-navegación -->
    <div class="flex gap-2">
      <button
        v-for="v in views"
        :key="v.id"
        :class="[
          'px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors flex items-center gap-2',
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

    <!-- Vista: Tienda (catálogo agrupado por tipo) -->
    <template v-if="view === 'tienda'">
      <div
        v-if="loading"
        class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6"
      >
        <IconCardSkeleton v-for="n in 6" :key="n" />
      </div>
      <EmptyState
        v-else-if="items.length === 0"
        :icon="ShoppingBagIcon"
        :title="t('student.classes.detail.shop.empty_title')"
        :description="t('student.classes.detail.shop.empty_description')"
      />
      <template v-else>
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
          <ShopItemCard
            v-for="item in catalogItems"
            :key="item.id"
            :item="item"
            :type-label="typeLabel(item)"
            :muted="!buyableInShop(item) && !canBuy(item)"
            :clickable="buyableInShop(item)"
            @click="buyableInShop(item) && openBuy(item)"
          >
          <!-- Chip arriba a la derecha: ×N para items con stock acumulable (poderes y
               recompensas de un uso), o "Ilimitada" para recompensas vitalicias. -->
          <template #chip>
            <span
              v-if="(isSingleReward(item) || isPower(item)) && stockOf(item) > 0"
              class="rounded-full bg-navy-700 px-2 py-0.5 text-xs font-bold text-white"
            >
              ×{{ stockOf(item) }}
            </span>
            <span
              v-else-if="isUnlimitedReward(item)"
              class="rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-navy-700/70"
            >
              {{ t('student.classes.detail.shop.usage_unlimited') }}
            </span>
          </template>
          <template #footer>
            <!-- Ya en posesión solo aplica a recompensas ilimitadas (vitalicio). Los
                 poderes se compran cuantas veces se quiera (acumulan cargas). -->
            <span
              v-if="owned(item) && isUnlimitedReward(item)"
              class="rounded-full bg-mint-light px-2.5 py-1 text-xs font-medium text-navy-700"
            >
              {{ t('student.classes.detail.shop.owned') }}
            </span>
            <!-- Comprar con monedas -->
            <template v-else>
              <span class="inline-flex items-center gap-1.5">
                <span class="text-xs font-medium text-text-secondary">{{ buyVerb(item) }}</span>
                <Tooltip :text="t('common.resources.coins')">
                  <CoinBadge
                    :amount="item.price"
                    size="md"
                    variant="plain"
                    :disabled="!canBuy(item)"
                  />
                </Tooltip>
              </span>
              <!-- Poder: coste por uso (maná) para que el alumno lo sepa antes de comprar.
                   Si el poder no cuesta maná, no mostramos el badge — las recompensas
                   tampoco lo llevan, así que evitamos "0 maná" confuso. -->
              <span
                v-if="isPower(item) && manaCostOf(item) > 0"
                class="ml-auto inline-flex items-center gap-1.5"
              >
                <span class="text-xs font-medium text-text-secondary">
                  {{ t('student.classes.detail.shop.use') }}
                </span>
                <Tooltip :text="t('common.resources.mana')">
                  <ManaBadge :amount="manaCostOf(item)" size="md" variant="plain" />
                </Tooltip>
              </span>
            </template>
          </template>
          </ShopItemCard>
        </div>
      </template>
    </template>

    <!-- Vista: Mis artículos (en posesión) -->
    <template v-else-if="view === 'posesion'">
      <div
        v-if="loading"
        class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6"
      >
        <IconCardSkeleton v-for="n in 4" :key="n" />
      </div>
      <EmptyState
        v-else-if="ownedItems.length === 0"
        :icon="SparklesIcon"
        :title="t('student.classes.detail.shop.owned_empty_title')"
        :description="t('student.classes.detail.shop.owned_empty_description')"
      />
      <div v-else class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
        <ShopItemCard
          v-for="item in ownedItems"
          :key="item.id"
          :item="item"
          :type-label="typeLabel(item)"
          :muted="isPower(item) && !canUse(item)"
          :clickable="isPower(item) || isSingleReward(item)"
          @click="
            isPower(item) ? openUse(item) : isSingleReward(item) ? openRedeem(item) : null
          "
        >
          <template v-if="(isSingleReward(item) || isPower(item)) && stockOf(item) >= 1" #chip>
            <span class="rounded-full bg-navy-700 px-2 py-0.5 text-xs font-bold text-white">
              ×{{ stockOf(item) }}
            </span>
          </template>
          <template v-if="!isSingleReward(item)" #footer>
            <!-- Poder: usar gastando maná. Ocultamos el badge cuando no cuesta maná. -->
            <span
              v-if="isPower(item) && manaCostOf(item) > 0"
              class="inline-flex items-center gap-1.5"
            >
              <span class="text-xs font-medium text-text-secondary">
                {{ t('student.classes.detail.shop.use') }}
              </span>
              <Tooltip :text="t('common.resources.mana')">
                <ManaBadge
                  :amount="manaCostOf(item)"
                  size="md"
                  variant="plain"
                  :disabled="!canUse(item)"
                />
              </Tooltip>
            </span>
            <!-- Recompensa ilimitada: privilegio permanente -->
            <span
              v-else
              class="rounded-full bg-mint-light px-2.5 py-1 text-xs font-medium text-navy-700"
            >
              {{ t('student.classes.detail.shop.owned') }}
            </span>
          </template>
        </ShopItemCard>
      </div>
    </template>

    <!-- Vista: Historial (compras / usos en dos columnas) -->
    <template v-else>
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
        <!-- Columna: Compras -->
        <div class="space-y-3">
          <h4 class="flex items-center gap-2 text-sm font-semibold text-navy-700/70">
            {{ t('student.classes.detail.shop.history_purchases_title') }}
            <span class="rounded-full bg-navy-700/10 px-1.5 py-0.5 text-xs text-navy-700">
              {{ historyPurchases.length }}
            </span>
          </h4>
          <ul v-if="loading" class="space-y-2">
            <ShopHistoryRowSkeleton v-for="n in 4" :key="n" />
          </ul>
          <p
            v-else-if="historyPurchases.length === 0"
            class="rounded-2xl border border-dashed border-border-primary p-4 text-sm text-text-secondary"
          >
            {{ t('student.classes.detail.shop.history_purchases_empty') }}
          </p>
          <ul v-else class="space-y-2">
            <ShopHistoryRow
              v-for="h in historyPurchases"
              :key="h.id"
              :item-kind="h.itemKind"
              :title="h.itemName"
              :subtitle="`${t('student.classes.detail.shop.history_bought')} · ${formatDate(h.date)}`"
            >
              <template #badge>
                <!-- Negativo: la compra resta monedas del saldo del alumno -->
                <CoinBadge :amount="-h.amount" size="sm" variant="plain" />
              </template>
            </ShopHistoryRow>
          </ul>
        </div>

        <!-- Columna: Usos -->
        <div class="space-y-3">
          <h4 class="flex items-center gap-2 text-sm font-semibold text-navy-700/70">
            {{ t('student.classes.detail.shop.history_uses_title') }}
            <span class="rounded-full bg-navy-700/10 px-1.5 py-0.5 text-xs text-navy-700">
              {{ historyUses.length }}
            </span>
          </h4>
          <ul v-if="loading" class="space-y-2">
            <ShopHistoryRowSkeleton v-for="n in 4" :key="n" />
          </ul>
          <p
            v-else-if="historyUses.length === 0"
            class="rounded-2xl border border-dashed border-border-primary p-4 text-sm text-text-secondary"
          >
            {{ t('student.classes.detail.shop.history_uses_empty') }}
          </p>
          <ul v-else class="space-y-2">
            <ShopHistoryRow
              v-for="h in historyUses"
              :key="h.id"
              :item-kind="h.itemKind"
              :title="h.itemName"
              :subtitle="`${
                h.isRedeem
                  ? t('student.classes.detail.shop.history_redeemed')
                  : t('student.classes.detail.shop.history_used')
              } · ${formatDate(h.date)}`"
            >
              <template v-if="!h.isRedeem" #badge>
                <ManaBadge :amount="-h.manaCost" size="sm" variant="plain" />
              </template>
            </ShopHistoryRow>
          </ul>
        </div>
      </div>
    </template>

    <!-- Modal de confirmación (canjear / comprar / usar) -->
    <Teleport to="body">
      <Transition name="modal">
        <div
          v-if="pendingItem"
          class="fixed inset-0 z-50 flex items-center justify-center p-4"
          @click.self="pendingItem = null"
        >
          <div class="absolute inset-0 bg-black/50" @click="pendingItem = null" />
          <div class="relative bg-white rounded-2xl p-6 max-w-sm w-full shadow-xl text-center">
            <h3 class="text-lg font-bold text-navy-700">{{ confirmTitle }}</h3>
            <p class="text-sm text-text-secondary mt-1">{{ pendingItem.description }}</p>

            <div
              v-if="!redeeming"
              class="mt-4 rounded-xl px-4 py-3 flex items-center justify-between text-sm"
              :class="payingMana ? 'bg-sky/10' : 'bg-yellow-light'"
            >
              <span class="text-navy-700/70">{{ t('student.classes.detail.shop.cost') }}</span>
              <ManaBadge
                v-if="payingMana"
                :amount="manaCostOf(pendingItem)"
                size="md"
                variant="plain"
              />
              <CoinBadge v-else :amount="pendingItem.price" size="md" variant="plain" />
            </div>
            <div v-if="!redeeming" class="mt-2 flex items-center justify-between text-sm px-1">
              <span class="text-navy-700/70">{{ afterLabel }}</span>
              <span class="font-semibold" :class="canConfirm ? 'text-navy-700' : 'text-red'">
                {{ Math.abs(currentBalance - currentCost).toLocaleString(locale) }}
                {{ payingMana ? t('student.classes.detail.shop.mana') : coinLabel }}
              </span>
            </div>

            <div class="flex gap-3 mt-6">
              <Button variant="outline" full-width @click="pendingItem = null">
                {{ t('student.classes.detail.shop.cancel') }}
              </Button>
              <Button variant="primary" full-width :disabled="!canConfirm" @click="confirm">
                {{ actionLabel }}
              </Button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { ShoppingBagIcon, ShoppingCartIcon, SparklesIcon } from '@heroicons/vue/24/outline'
import type { ShopItem, ShopItemUsage } from '~/stores/shop'
import type { ClassSettings } from '~/types/class.types'

const props = withDefaults(
  defineProps<{ classId: string; manaEnabled?: boolean; settings?: ClassSettings }>(),
  { manaEnabled: true }
)

const { t, locale } = useI18n()
const { coinLabel } = useCoinLabel()
const shop = useShopStore()
const effects = useEffects()
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
      await shop.fetchStudentShop(id)
    } finally {
      loading.value = false
    }
  },
  { immediate: true }
)

const balance = computed(() => shop.getBalance(props.classId))
const mana = computed(() => shop.getMana(props.classId))
const items = computed(() => shop.getItems(props.classId))
// Catálogo visible: si el maná está desactivado, los poderes no se ofrecen.
const catalogItems = computed(() =>
  props.manaEnabled ? items.value : items.value.filter(i => !isPower(i))
)
const myPurchases = computed(() => shop.getPurchases(props.classId))
const uses = computed(() => shop.getUses(props.classId))

const view = ref<'tienda' | 'posesion' | 'historial'>('tienda')

// --- Helpers de artículo ---
function isPower(item: ShopItem): boolean {
  return item.kind === 'power'
}
function usageOf(item: ShopItem): ShopItemUsage {
  return item.usage
}
function manaCostOf(item: ShopItem): number {
  return item.manaCost
}
function owned(item: ShopItem): boolean {
  return shop.isOwned(props.classId, item.id)
}
function canBuy(item: ShopItem): boolean {
  return balance.value >= item.price
}
function canUse(item: ShopItem): boolean {
  return mana.value >= item.manaCost
}
function typeLabel(item: ShopItem): string {
  return isPower(item)
    ? t('student.classes.detail.shop.power')
    : t('student.classes.detail.shop.reward')
}
/** Verbo de adquisición: en la tienda todo se "compra" (las recompensas de un uso pasan
 *  a "Mis artículos" para canjearlas allí cuando quieras). */
function buyVerb(_item: ShopItem): string {
  return t('student.classes.detail.shop.buy')
}
function isSingleReward(item: ShopItem): boolean {
  return !isPower(item) && usageOf(item) === 'single'
}
function isUnlimitedReward(item: ShopItem): boolean {
  return !isPower(item) && usageOf(item) === 'unlimited'
}
function stockOf(item: ShopItem): number {
  return shop.getStock(props.classId, item.id)
}
/** Si se puede comprar en la tienda: las recompensas ilimitadas solo si no se poseen
 *  (son vitalicias); las recompensas de un uso y los poderes acumulan cargas con cada
 *  compra, por lo que siempre son recomprables. */
function buyableInShop(item: ShopItem): boolean {
  return !isUnlimitedReward(item) || !owned(item)
}

// Mis artículos: lo que el alumno posee (poderes + recompensas ilimitadas compradas).
const ownedItems = computed(() => items.value.filter(i => owned(i)))

// Historial: compras y usos por separado (cada columna ordenada por fecha desc).
const historyPurchases = computed(() =>
  myPurchases.value
    .map(p => {
      const found = items.value.find(i => i.id === p.itemId)
      const itemKind: 'power' | 'reward' = found?.kind === 'power' ? 'power' : 'reward'
      return { id: `p_${p.id}`, itemName: p.itemName, amount: p.price, date: p.date, itemKind }
    })
    .sort((a, b) => (a.date < b.date ? 1 : -1))
)
const historyUses = computed(() =>
  uses.value
    .map(u => {
      // Si el uso trae kind, es la fuente de verdad; si no, miramos el item del
      // catálogo. Solo si ambos faltan caemos a la heurística de manaCost === 0
      // (los poderes cuestan maná; los canjes, no).
      const found = items.value.find(i => i.id === u.itemId)
      const isRedeem = (u.kind ?? found?.kind) === 'reward' || (!u.kind && !found && u.manaCost === 0)
      return {
        id: `u_${u.id}`,
        itemName: u.itemName,
        manaCost: u.manaCost,
        date: u.date,
        isRedeem,
        itemKind: (isRedeem ? 'reward' : 'power') as 'power' | 'reward',
      }
    })
    .sort((a, b) => (a.date < b.date ? 1 : -1))
)
const historyCount = computed(() => historyPurchases.value.length + historyUses.value.length)

const views = computed(() => [
  {
    id: 'tienda' as const,
    label: t('student.classes.detail.shop.tab_shop'),
    count: items.value.length,
  },
  {
    id: 'posesion' as const,
    label: t('student.classes.detail.shop.tab_items'),
    count: ownedItems.value.reduce(
      (sum, i) => sum + (isSingleReward(i) || isPower(i) ? stockOf(i) : 1),
      0
    ),
  },
  {
    id: 'historial' as const,
    label: t('student.classes.detail.shop.tab_history'),
    count: historyCount.value,
  },
])

// --- Modal de confirmación ---
const pendingItem = ref<ShopItem | null>(null)
const pendingAction = ref<'buy' | 'use' | 'redeem'>('buy')

function openBuy(item: ShopItem) {
  pendingItem.value = item
  pendingAction.value = 'buy'
}
function openUse(item: ShopItem) {
  pendingItem.value = item
  pendingAction.value = 'use'
}
function openRedeem(item: ShopItem) {
  pendingItem.value = item
  pendingAction.value = 'redeem'
}

const payingMana = computed(() => pendingAction.value === 'use')
const redeeming = computed(() => pendingAction.value === 'redeem')
const currentBalance = computed(() => (payingMana.value ? mana.value : balance.value))
const currentCost = computed(() => {
  if (!pendingItem.value) return 0
  if (redeeming.value) return 0
  return payingMana.value ? manaCostOf(pendingItem.value) : pendingItem.value.price
})
const canConfirm = computed(() => {
  if (!pendingItem.value) return false
  if (redeeming.value) return true
  return payingMana.value ? canUse(pendingItem.value) : canBuy(pendingItem.value)
})
const confirmTitle = computed(() => {
  if (!pendingItem.value) return ''
  const name = pendingItem.value.name
  const key = payingMana.value
    ? 'confirm_use_title'
    : redeeming.value
      ? 'confirm_title'
      : 'confirm_buy_title'
  return t(`student.classes.detail.shop.${key}`, { name })
})
const actionLabel = computed(() => {
  if (!pendingItem.value) return ''
  const key = payingMana.value ? 'use' : redeeming.value ? 'redeem' : 'buy'
  return t(`student.classes.detail.shop.${key}`)
})
const afterLabel = computed(() => {
  if (!pendingItem.value) return ''
  if (redeeming.value) return ''
  if (!canConfirm.value) return t('student.classes.detail.shop.missing')
  return payingMana.value
    ? t('student.classes.detail.shop.mana_after')
    : t('student.classes.detail.shop.balance_after')
})

async function confirm() {
  if (!pendingItem.value) return
  const item = pendingItem.value
  let result: { ok: boolean; error?: string }
  let toastKey: string
  if (payingMana.value) {
    result = await shop.usePower(props.classId, item)
    toastKey = 'used_toast'
  } else if (redeeming.value) {
    result = await shop.redeemReward(props.classId, item)
    toastKey = 'redeemed_toast'
  } else if (isSingleReward(item)) {
    result = await shop.buySingleReward(props.classId, item)
    toastKey = 'bought_toast'
  } else {
    result = await shop.buyPower(props.classId, item)
    toastKey = 'bought_toast'
  }
  if (result.ok) {
    toast.success(t(`student.classes.detail.shop.${toastKey}`, { name: item.name }))
    // Efectos sonido/visual del evento correspondiente. La cantidad es negativa
    // porque el alumno gasta el recurso (sale del saldo).
    if (payingMana.value) {
      effects.play('shop_use_power', {
        settings: props.settings,
        amount: -manaCostOf(item),
        resource: 'mana',
      })
    } else if (redeeming.value) {
      effects.play('shop_redeem', { settings: props.settings })
    } else {
      effects.play('shop_purchase', {
        settings: props.settings,
        amount: -item.price,
        resource: 'coins',
      })
    }
  } else {
    toast.error(result.error || t('student.classes.detail.shop.redeem_error'))
  }
  pendingItem.value = null
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(locale.value, {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })
}

// Bloquear el scroll del fondo mientras el modal de confirmación esté abierto.
const { lock, unlock } = useBodyScrollLock()
watch(
  () => pendingItem.value !== null,
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
