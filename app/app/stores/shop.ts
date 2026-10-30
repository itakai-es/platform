import { defineStore } from 'pinia'
import { ref } from 'vue'

/**
 * Tienda + economía por clase, conectada al backend real.
 *
 * - **Monedas**: se ganan al completar enigmas; se gastan al comprar/canjear.
 * - **Maná**: se gana al completar enigmas; se gasta al usar poderes.
 * - **Recompensa**: se compra con monedas. Uso único (se consume) o ilimitado (privilegio).
 * - **Poder**: se compra con monedas y cada uso gasta maná (reutilizable). Cada uso se
 *   registra para que el profesor lo vea.
 */

export type ShopItemKind = 'reward' | 'power'
export type ShopItemUsage = 'single' | 'unlimited'

export interface ShopItem {
  id: string
  name: string
  description: string
  price: number
  active: boolean
  kind: ShopItemKind
  manaCost: number
  usage: ShopItemUsage
  lifeRestore: number
}

export interface ShopPurchase {
  id: string
  itemId: string | null
  itemName: string
  price: number
  kind?: ShopItemKind // tipo del artículo comprado (vista del profesor → icono)
  date: string // ISO
  studentId?: string // user id del alumno (vista del profesor → enlace al perfil)
  studentName?: string // solo en la vista del profesor
  studentAvatar?: string | null // avatar por clase del alumno (vista del profesor)
}

export interface ShopItemUse {
  id: string
  itemId: string | null
  itemName: string
  manaCost: number
  kind?: ShopItemKind // tipo del artículo usado/canjeado (vista del profesor → icono)
  date: string // ISO
  studentId?: string // user id del alumno (vista del profesor → enlace al perfil)
  studentName?: string // solo en la vista del profesor
  studentAvatar?: string | null // avatar por clase del alumno (vista del profesor)
}

interface ClassShopState {
  balance: number // monedas
  mana: number
  items: ShopItem[]
  purchases: ShopPurchase[]
  uses: ShopItemUse[] // usos de poderes (vista del profesor)
  owned: Set<string> // ids de poderes/recompensas ilimitadas/recompensas de un uso con stock
  singleUseStock: Record<string, number> // stock por id de recompensa de un uso
}

export const useShopStore = defineStore('shop', () => {
  // Estado por clase (keyed by classId).
  const classShop = ref<Map<string, ClassShopState>>(new Map())
  const loading = ref(false)

  // Banderas explícitas por classId para que `ensureStudentShop()` /
  // `ensureTeacherShop()` puedan saltar la llamada al volver a la pestaña
  // tienda dentro de la misma clase sin tener que mirar si los datos están
  // vacíos. Se invalidan tras purchase / buyPower / addItem / updateItem /
  // deleteItem para forzar la próxima recarga.
  const loadedStudentShopClasses = ref<Set<string>>(new Set())
  const loadedTeacherShopClasses = ref<Set<string>>(new Set())
  // In-flight guards por classId para coalescer llamadas concurrentes.
  const loadingStudentShopClasses = ref<Set<string>>(new Set())
  const loadingTeacherShopClasses = ref<Set<string>>(new Set())

  // Capturado en el setup del store (contexto Nuxt válido), no dentro de acciones async.
  const base = useRuntimeConfig().public.apiBase as string
  function apiBase(): string {
    return base
  }

  function invalidateStudentShop(classId: string) {
    if (loadedStudentShopClasses.value.has(classId)) {
      const next = new Set(loadedStudentShopClasses.value)
      next.delete(classId)
      loadedStudentShopClasses.value = next
    }
  }
  function invalidateTeacherShop(classId: string) {
    if (loadedTeacherShopClasses.value.has(classId)) {
      const next = new Set(loadedTeacherShopClasses.value)
      next.delete(classId)
      loadedTeacherShopClasses.value = next
    }
  }
  function markStudentShopLoaded(classId: string) {
    if (!loadedStudentShopClasses.value.has(classId)) {
      const next = new Set(loadedStudentShopClasses.value)
      next.add(classId)
      loadedStudentShopClasses.value = next
    }
  }
  function markTeacherShopLoaded(classId: string) {
    if (!loadedTeacherShopClasses.value.has(classId)) {
      const next = new Set(loadedTeacherShopClasses.value)
      next.add(classId)
      loadedTeacherShopClasses.value = next
    }
  }

  function ensureState(classId: string): ClassShopState {
    let state = classShop.value.get(classId)
    if (!state) {
      state = {
        balance: 0,
        mana: 0,
        items: [],
        purchases: [],
        uses: [],
        owned: new Set(),
        singleUseStock: {},
      }
      classShop.value.set(classId, state)
    }
    return state
  }

  /** Reasigna el Map para forzar la reactividad tras mutar un estado anidado. */
  function touch() {
    classShop.value = new Map(classShop.value)
  }

  /** Saldo de monedas que ya se sabe por otro lado (al pagar una pista); sin la tienda cargada, nada. */
  function setBalance(classId: string, balance: number) {
    const state = classShop.value.get(classId)
    if (!state) return
    state.balance = balance
    touch()
  }
  function getBalance(classId: string): number {
    return classShop.value.get(classId)?.balance ?? 0
  }
  function getMana(classId: string): number {
    return classShop.value.get(classId)?.mana ?? 0
  }
  function getItems(classId: string): ShopItem[] {
    return classShop.value.get(classId)?.items ?? []
  }
  function getPurchases(classId: string): ShopPurchase[] {
    return classShop.value.get(classId)?.purchases ?? []
  }
  function getUses(classId: string): ShopItemUse[] {
    return classShop.value.get(classId)?.uses ?? []
  }
  function isOwned(classId: string, itemId: string): boolean {
    return classShop.value.get(classId)?.owned.has(itemId) ?? false
  }
  function getStock(classId: string, itemId: string): number {
    return classShop.value.get(classId)?.singleUseStock[itemId] ?? 0
  }

  // ==================== ALUMNO ====================

  /** Carga saldo de monedas y maná, artículos activos, canjes propios y poderes en posesión. */
  async function fetchStudentShop(classId: string): Promise<void> {
    loading.value = true
    try {
      const data = await $fetch<{
        balance: number
        mana: number
        ownedItemIds: string[]
        singleUseStock?: Record<string, number>
        items: ShopItem[]
        purchases: ShopPurchase[]
        uses: ShopItemUse[]
      }>(`${apiBase()}/students/classes/${classId}/shop`)
      classShop.value.set(classId, {
        balance: data.balance,
        mana: data.mana,
        items: data.items,
        purchases: data.purchases,
        uses: data.uses,
        owned: new Set(data.ownedItemIds),
        singleUseStock: { ...(data.singleUseStock ?? {}) },
      })
      touch()
      markStudentShopLoaded(classId)
    } finally {
      loading.value = false
    }
  }

  /** Idempotente: salta si la tienda del alumno ya está cargada para esta clase.
   *  `force=true` la recarga ignorando la bandera. Coalesce llamadas concurrentes
   *  para el mismo classId (no dispara más de un fetch en vuelo). */
  async function ensureStudentShop(classId: string, force = false): Promise<void> {
    if (loadedStudentShopClasses.value.has(classId) && !force) return
    if (loadingStudentShopClasses.value.has(classId)) return
    const inflight = new Set(loadingStudentShopClasses.value)
    inflight.add(classId)
    loadingStudentShopClasses.value = inflight
    try {
      await fetchStudentShop(classId)
    } finally {
      const next = new Set(loadingStudentShopClasses.value)
      next.delete(classId)
      loadingStudentShopClasses.value = next
    }
  }

  /** Canjea/compra un artículo con monedas. Devuelve {ok, error?}. */
  async function purchase(
    classId: string,
    itemId: string
  ): Promise<{ ok: boolean; error?: string }> {
    try {
      const res = await $fetch<{ balance: number; purchase: ShopPurchase }>(
        `${apiBase()}/students/classes/${classId}/shop/purchase`,
        { method: 'POST', body: { itemId } }
      )
      const state = ensureState(classId)
      state.balance = res.balance
      state.purchases = [res.purchase, ...state.purchases]
      touch()
      // El profesor ve compras agregadas: invalidamos su vista para forzar
      // recarga la próxima vez que entre a la tienda de esta clase.
      invalidateTeacherShop(classId)
      return { ok: true }
    } catch (err) {
      const message = (err as { data?: { message?: string } })?.data?.message
      return { ok: false, error: message || 'No se pudo completar el canje.' }
    }
  }

  /** Compra un poder o recompensa ilimitada con monedas. Para poderes, cada compra
   *  añade una "carga"; para unlimited rewards, queda en posesión vitalicia. */
  async function buyPower(
    classId: string,
    item: ShopItem
  ): Promise<{ ok: boolean; error?: string }> {
    const res = await purchase(classId, item.id)
    if (res.ok) {
      const state = ensureState(classId)
      state.owned = new Set(state.owned).add(item.id)
      // Poderes acumulan cargas (igual que single rewards). Unlimited rewards no.
      if (item.kind === 'power') {
        state.singleUseStock = {
          ...state.singleUseStock,
          [item.id]: (state.singleUseStock[item.id] ?? 0) + 1,
        }
      }
      touch()
    }
    return res
  }

  /** Compra una recompensa de un uso y la añade al inventario para canjearla luego.
   *  Las compras se acumulan: cada compra incrementa el stock disponible. */
  async function buySingleReward(
    classId: string,
    item: ShopItem
  ): Promise<{ ok: boolean; error?: string }> {
    const res = await purchase(classId, item.id)
    if (res.ok) {
      const state = ensureState(classId)
      state.owned = new Set(state.owned).add(item.id)
      state.singleUseStock = {
        ...state.singleUseStock,
        [item.id]: (state.singleUseStock[item.id] ?? 0) + 1,
      }
      touch()
    }
    return res
  }

  /** Canjea una recompensa de un uso ya comprada: registra el uso y, si ya no queda
   *  stock, sale de "Mis artículos". */
  async function redeemReward(
    classId: string,
    item: ShopItem
  ): Promise<{ ok: boolean; error?: string }> {
    try {
      const res = await $fetch<{ use: ShopItemUse; stillOwned: boolean }>(
        `${apiBase()}/students/classes/${classId}/shop/redeem`,
        { method: 'POST', body: { itemId: item.id } }
      )
      const state = ensureState(classId)
      state.uses = [res.use, ...state.uses]
      const remaining = Math.max(0, (state.singleUseStock[item.id] ?? 1) - 1)
      if (remaining > 0) {
        state.singleUseStock = { ...state.singleUseStock, [item.id]: remaining }
      } else {
        const { [item.id]: _dropped, ...rest } = state.singleUseStock
        state.singleUseStock = rest
      }
      if (!res.stillOwned) {
        const next = new Set(state.owned)
        next.delete(item.id)
        state.owned = next
      }
      touch()
      return { ok: true }
    } catch (err) {
      const message = (err as { data?: { message?: string } })?.data?.message
      return { ok: false, error: message || 'No se pudo canjear.' }
    }
  }

  /** Usa un poder gastando maná y una "carga". El backend valida que queden cargas. */
  async function usePower(
    classId: string,
    item: ShopItem
  ): Promise<{ ok: boolean; error?: string }> {
    try {
      const res = await $fetch<{ mana: number; lives?: number }>(
        `${apiBase()}/students/classes/${classId}/shop/use`,
        { method: 'POST', body: { itemId: item.id } }
      )
      const state = ensureState(classId)
      state.mana = res.mana
      const remaining = Math.max(0, (state.singleUseStock[item.id] ?? 1) - 1)
      if (remaining > 0) {
        state.singleUseStock = { ...state.singleUseStock, [item.id]: remaining }
      } else {
        const { [item.id]: _dropped, ...rest } = state.singleUseStock
        state.singleUseStock = rest
        const nextOwned = new Set(state.owned)
        nextOwned.delete(item.id)
        state.owned = nextOwned
      }
      touch()
      return { ok: true }
    } catch (err) {
      const message = (err as { data?: { message?: string } })?.data?.message
      return { ok: false, error: message || 'No se pudo usar el poder.' }
    }
  }

  // ==================== PROFESOR ====================

  /** Carga todos los artículos (incl. ocultos), canjes recientes y usos de poderes. */
  async function fetchTeacherShop(classId: string): Promise<void> {
    loading.value = true
    try {
      const data = await $fetch<{
        items: ShopItem[]
        purchases: ShopPurchase[]
        uses: ShopItemUse[]
      }>(`${apiBase()}/teacher/classes/${classId}/shop`)
      const state = ensureState(classId)
      state.items = data.items
      state.purchases = data.purchases
      state.uses = data.uses
      touch()
      markTeacherShopLoaded(classId)
    } finally {
      loading.value = false
    }
  }

  /** Idempotente: salta si la tienda del profesor ya está cargada para esta clase.
   *  `force=true` la recarga ignorando la bandera. Coalesce llamadas concurrentes
   *  para el mismo classId (no dispara más de un fetch en vuelo). */
  async function ensureTeacherShop(classId: string, force = false): Promise<void> {
    if (loadedTeacherShopClasses.value.has(classId) && !force) return
    if (loadingTeacherShopClasses.value.has(classId)) return
    const inflight = new Set(loadingTeacherShopClasses.value)
    inflight.add(classId)
    loadingTeacherShopClasses.value = inflight
    try {
      await fetchTeacherShop(classId)
    } finally {
      const next = new Set(loadingTeacherShopClasses.value)
      next.delete(classId)
      loadingTeacherShopClasses.value = next
    }
  }

  type ItemPayload = {
    name: string
    description: string
    price: number
    active: boolean
    kind: ShopItemKind
    manaCost: number
    usage: ShopItemUsage
    lifeRestore: number
  }

  async function addItem(classId: string, payload: ItemPayload): Promise<ShopItem> {
    const item = await $fetch<ShopItem>(`${apiBase()}/teacher/classes/${classId}/shop/items`, {
      method: 'POST',
      body: payload,
    })
    ensureState(classId).items.push(item)
    touch()
    // El catálogo cambió: invalidamos ambas vistas para que la próxima visita
    // a la pestaña tienda (alumno o profesor) refleje el nuevo artículo.
    invalidateStudentShop(classId)
    invalidateTeacherShop(classId)
    return item
  }

  async function updateItem(classId: string, id: string, payload: ItemPayload): Promise<ShopItem> {
    const item = await $fetch<ShopItem>(
      `${apiBase()}/teacher/classes/${classId}/shop/items/${id}`,
      {
        method: 'PUT',
        body: payload,
      }
    )
    const state = ensureState(classId)
    const idx = state.items.findIndex(i => i.id === id)
    if (idx >= 0) state.items[idx] = item
    touch()
    invalidateStudentShop(classId)
    invalidateTeacherShop(classId)
    return item
  }

  async function deleteItem(classId: string, id: string): Promise<void> {
    await $fetch(`${apiBase()}/teacher/classes/${classId}/shop/items/${id}`, { method: 'DELETE' })
    const state = ensureState(classId)
    state.items = state.items.filter(i => i.id !== id)
    touch()
    invalidateStudentShop(classId)
    invalidateTeacherShop(classId)
  }

  return {
    classShop,
    loading,
    loadedStudentShopClasses,
    loadedTeacherShopClasses,
    getBalance,
    setBalance,
    getMana,
    getItems,
    getPurchases,
    getUses,
    isOwned,
    getStock,
    fetchStudentShop,
    ensureStudentShop,
    purchase,
    buyPower,
    buySingleReward,
    redeemReward,
    usePower,
    fetchTeacherShop,
    ensureTeacherShop,
    addItem,
    updateItem,
    deleteItem,
    invalidateStudentShop,
    invalidateTeacherShop,
  }
})
