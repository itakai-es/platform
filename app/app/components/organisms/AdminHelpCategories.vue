<template>
  <div ref="rootRef" tabindex="-1" class="focus:outline-none">
    <AdminListSkeleton v-if="loading" :rows="4" />

    <div v-else-if="error" class="rounded-2xl bg-white shadow-lg">
      <EmptyState
        :icon="ExclamationTriangleIcon"
        :title="t('admin.help.list_error')"
        :description="t('common.errors.generic')"
      >
        <template #action>
          <Button variant="outline" @click="retry">{{ t('admin.help.retry') }}</Button>
        </template>
      </EmptyState>
    </div>

    <div v-else-if="!categories.length" class="rounded-2xl bg-white shadow-lg">
      <EmptyState
        :icon="FolderIcon"
        :title="t('admin.help.categories_empty')"
        :description="t('admin.help.categories_empty_description')"
      />
    </div>

    <!-- `overflow-hidden` redondea el fondo de las filas. El contenedor es el
         destino del foco cuando la fila que lo tenía desaparece. -->
    <div
      v-else
      ref="listRef"
      tabindex="-1"
      class="overflow-hidden rounded-2xl bg-white shadow-lg focus:outline-none"
      :aria-busy="busy"
    >
      <AdminSortableList :items="categories" :item-label="categoryName" :save="saveOrder">
        <template #leading="{ item }">
          <HelpCategoryIcon :icon="item.icon" :accent="item.accent" size="md" />
        </template>

        <template #main="{ item }">
          <button
            type="button"
            class="block max-w-full truncate text-left font-semibold text-navy-700 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-navy-700"
            @click="openEdit(item)"
          >
            {{ item.name }}
          </button>
          <p class="truncate text-sm text-navy-700/70">
            {{ item.description || t('admin.help.no_summary') }}
          </p>
        </template>

        <template #meta="{ item }">
          <span class="text-xs text-navy-700/70">
            {{ t('common.help.article_count', { count: item.articles }, item.articles) }}
          </span>
        </template>

        <template #actions="{ item }">
          <IconButton
            :icon="PencilSquareIcon"
            :label="t('admin.help.edit_named', { name: item.name })"
            data-action="edit"
            @click="openEdit(item)"
          />
          <IconButton
            :icon="TrashIcon"
            :label="t('admin.help.delete_named', { name: item.name })"
            danger
            @click="askDelete(item)"
          />
        </template>
      </AdminSortableList>
    </div>

    <!-- Editor de categoría -->
    <Modal
      v-model="editorOpen"
      :title="editing ? t('admin.help.edit_category') : t('admin.help.new_category')"
      size="lg"
      theme="light"
      persistent
    >
      <div class="space-y-4">
        <!-- Los topes son los del esquema de la API (80 y 240 caracteres). -->
        <FieldGroup v-slot="{ id }" :label="t('admin.help.field_name')" native-control>
          <Input :id="id" v-model="form.name" maxlength="80" />
        </FieldGroup>

        <FieldGroup v-slot="{ id }" :label="t('admin.help.field_description')" native-control>
          <TextArea :id="id" v-model="form.description" :rows="2" maxlength="240" />
        </FieldGroup>

        <FieldGroup v-slot="{ labelId }" :label="t('admin.help.field_accent')">
          <OptionPillGroup
            v-model="form.accent"
            :options="accentOptions"
            :columns="4"
            :aria-labelledby="labelId"
          >
            <template #option="{ option }">
              <span class="inline-flex items-center gap-2">
                <span
                  class="h-4 w-4 rounded-full"
                  :style="{ backgroundColor: `var(--color-card-${option.value})` }"
                />
                {{ option.label }}
              </span>
            </template>
          </OptionPillGroup>
        </FieldGroup>

        <FieldGroup v-slot="{ labelId }" :label="t('admin.help.field_icon')">
          <div class="grid grid-cols-5 gap-2" role="group" :aria-labelledby="labelId">
            <SelectionCard
              v-for="name in iconNames"
              :key="name"
              variant="square"
              :icon="helpIcon(name)"
              :title="t(`admin.help.icon.${name}`)"
              :selected="form.icon === name"
              @click="form.icon = name"
            />
          </div>
        </FieldGroup>
      </div>

      <template #footer>
        <div class="flex justify-end gap-3">
          <Button variant="outline" @click="editorOpen = false">
            {{ t('common.actions.cancel') }}
          </Button>
          <Button variant="primary" :disabled="!canSave" :loading="saving" @click="save">
            {{ t('common.actions.save') }}
          </Button>
        </div>
      </template>
    </Modal>

    <ConfirmModal
      v-model="deleteOpen"
      :title="t('admin.help.delete_category_title')"
      :message="
        t(
          'admin.help.delete_category_message',
          { name: pendingDelete?.name ?? '', count: pendingDelete?.articles ?? 0 },
          pendingDelete?.articles ?? 0
        )
      "
      :confirm-text="t('common.actions.delete')"
      :cancel-text="t('common.actions.cancel')"
      variant="danger"
      :loading="deleting"
      @confirm="confirmDelete"
    />
  </div>
</template>

<script setup lang="ts">
import {
  ExclamationTriangleIcon,
  FolderIcon,
  PencilSquareIcon,
  TrashIcon,
} from '@heroicons/vue/24/outline'
import { HELP_CARD_TYPES, helpCardType, type HelpCardType } from '~/utils/help-accents'
import { HELP_ICONS, helpIcon } from '~/utils/help-icons'
import type { AdminHelpCategory } from '~/composables/useHelpAdmin'
import type { HelpArea } from '~/types/help.types'

/**
 * El gestor de categorías de una sección del panel (centro de ayuda o blog):
 * la lista de su área, con su orden, y el formulario para crear o editar una.
 * El área no se elige aquí: la fija la sección. Borrar una categoría
 * arrastra sus artículos, y el aviso lo dice con el recuento delante.
 *
 * La página es quien carga la lista y quien la recarga cuando algo cambia:
 * aquí se llama a `reload` y se espera a que acabe, para no ordenar sobre una
 * lista vieja y para devolver el foco a una fila que ya existe.
 */

const props = defineProps<{
  /** El área de la sección: las categorías nuevas nacen en ella. */
  area: HelpArea
  categories: AdminHelpCategory[]
  /** Primera carga en curso. */
  loading?: boolean
  /** La última carga falló: se ofrece reintentar. */
  error?: boolean
  /** Recarga la lista sin esqueleto. */
  reload: () => Promise<void>
}>()

const { t } = useI18n()
const toast = useToast()
const { createCategory, updateCategory, deleteCategory, reorderCategories } = useHelpAdmin()

const accentOptions = computed(() =>
  HELP_CARD_TYPES.map(value => ({ value, label: t(`admin.help.accent.${value}`) }))
)

const iconNames = Object.keys(HELP_ICONS)

// ---- orden ----

const rootRef = ref<HTMLElement | null>(null)
const listRef = ref<HTMLElement | null>(null)
const busy = ref(false)

/**
 * La recarga de la página: no lanza (el aviso y el estado de error los pone
 * ella) y se espera entera, así la guarda de orden dura lo mismo que la recarga.
 */
const reloadList = () => props.reload()

async function retry() {
  await reloadList()
}

/** A dónde va el foco si la lista ya no está (p. ej. se quedó vacía). */
function focusFallback() {
  ;(listRef.value ?? rootRef.value)?.focus()
}

/**
 * Guarda un orden nuevo y recarga. Devuelve si se guardó: si no, la lista
 * vuelve al orden anterior. Mientras se guarda se ignoran los demás intentos
 * (calcularían el orden sobre la lista vieja y pisarían el primero).
 */
async function saveOrder(orderedIds: string[]) {
  if (busy.value) return false
  busy.value = true
  try {
    await reorderCategories(orderedIds)
    toast.success(t('admin.help.order_saved'))
    await reloadList()
    return true
  } catch {
    toast.error(t('admin.help.order_error'))
    return false
  } finally {
    busy.value = false
  }
}

/** El nombre de cada fila, para el nombre accesible de su asa. */
const categoryName = (category: AdminHelpCategory) => category.name

// ---- editor ----

const editorOpen = ref(false)
const saving = ref(false)
const editing = ref<AdminHelpCategory | null>(null)

const form = ref({
  name: '',
  description: '',
  accent: 'stats' as HelpCardType,
  icon: iconNames[0] ?? '',
})

const canSave = computed(() => form.value.name.trim().length > 0)

function openNew() {
  editing.value = null
  form.value = {
    name: '',
    description: '',
    accent: 'stats',
    icon: iconNames[0] ?? '',
  }
  editorOpen.value = true
}

function openEdit(category: AdminHelpCategory) {
  editing.value = category
  form.value = {
    name: category.name,
    description: category.description ?? '',
    // Un acento antiguo fuera de la lista cerrada se normaliza: si no, la API
    // rechazaría cualquier guardado de la categoría.
    accent: helpCardType(category.accent),
    icon: category.icon ?? iconNames[0] ?? '',
  }
  editorOpen.value = true
}

async function save() {
  saving.value = true
  try {
    const payload = {
      name: form.value.name.trim(),
      description: form.value.description.trim(),
      icon: form.value.icon,
      accent: form.value.accent,
      area: props.area,
    }
    if (editing.value) await updateCategory(editing.value.id, payload)
    else await createCategory(payload)
    toast.success(t('admin.help.category_saved'))
    editorOpen.value = false
    await reloadList()
    // Si la fila (y el lápiz con el foco) ya no está, el foco va a la lista.
    await nextTick()
    const active = document.activeElement
    if (!active || active === document.body || !active.isConnected) focusFallback()
  } catch {
    toast.error(t('admin.help.category_save_error'))
  } finally {
    saving.value = false
  }
}

// ---- borrado ----

const deleteOpen = ref(false)
const pendingDelete = ref<AdminHelpCategory | null>(null)
/** Un borrado en curso: el aviso sigue abierto y no admite un segundo clic. */
const deleting = ref(false)

function askDelete(category: AdminHelpCategory) {
  pendingDelete.value = category
  deleteOpen.value = true
}

/**
 * El modal se cierra después de recargar y el foco va a la fila siguiente (o
 * a la anterior, o a la lista): la fila que abrió el aviso ya no existe.
 */
async function confirmDelete() {
  const category = pendingDelete.value
  if (!category || deleting.value) return
  deleting.value = true
  const ids = props.categories.map(item => item.id)
  const position = ids.indexOf(category.id)
  const neighbour = ids[position + 1] ?? ids[position - 1]
  let deleted = false
  try {
    await deleteCategory(category.id)
    deleted = true
    toast.success(t('admin.help.category_deleted'))
    await reloadList()
  } catch {
    toast.error(t('admin.help.delete_error'))
  } finally {
    deleteOpen.value = false
    pendingDelete.value = null
    deleting.value = false
  }
  // Si falla, el modal devuelve el foco a donde estaba, que sigue ahí.
  if (!deleted) return
  await nextTick()
  const next = neighbour
    ? listRef.value?.querySelector<HTMLElement>(
        `[data-sortable-id="${neighbour}"] [data-action="edit"]`
      )
    : null
  if (next) next.focus()
  else focusFallback()
}

// La página abre el formulario desde el botón «Nueva categoría» de la cabecera.
defineExpose({ openNew })
</script>
