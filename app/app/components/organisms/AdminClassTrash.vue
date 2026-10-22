<template>
  <div ref="rootRef" class="space-y-4 sm:space-y-6">
    <InfoNote>{{ t('admin.classes.trash.note', { days: CLASS_TRASH_DAYS }) }}</InfoNote>

    <!-- Búsqueda y página van al servidor; el orden es fijo: la que antes se borra, primero -->
    <FilterBar
      :search="search"
      sort=""
      :results-count="totalTrashedClasses"
      :search-placeholder="t('admin.classes.trash.search_placeholder')"
      :sort-options="[]"
      variant="red"
      @update:search="search = $event"
      @reset="reset"
    />

    <div v-if="isLoadingTrashedClasses" class="space-y-3">
      <CardRowSkeleton v-for="i in 3" :key="i" />
    </div>

    <!-- Con búsqueda, «no hay ninguna» sería falso: solo no coincide ninguna -->
    <EmptyState
      v-else-if="!trashedClasses.length"
      :icon="TrashIcon"
      :title="isFiltering ? t('admin.classes.empty.title') : t('admin.classes.trash.empty_title')"
      :description="
        isFiltering
          ? t('admin.classes.empty.description')
          : t('admin.classes.trash.empty_description', { days: CLASS_TRASH_DAYS })
      "
    >
      <template v-if="isFiltering" #action>
        <Button variant="secondary" size="sm" @click="reset">
          {{ t('admin.users.filters.clear') }}
        </Button>
      </template>
    </EmptyState>

    <ClassTrashList
      v-else
      ref="listRef"
      :classes="trashedClasses"
      :restoring-id="restoringId"
      @restore="restore"
      @purge="askPurge"
    >
      <template #details="{ cls }">
        <p class="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-text-primary/70">
          <span>{{
            cls.ownerName
              ? t('admin.classes.trash.owner', { name: cls.ownerName })
              : t('admin.classes.trash.no_owner')
          }}</span>
          <!-- Solo la administración puede rescatarla. Sin nadie con la
               propiedad, ya lo dice el texto de al lado. -->
          <Badge v-if="cls.ownerName && !cls.ownerCanAct" variant="warning" size="sm">
            {{ t('admin.classes.trash.owner_unavailable') }}
          </Badge>
        </p>
        <p class="mt-0.5 text-sm text-text-primary/70">{{ sentLine(cls) }}</p>
        <p v-if="cls.warnedAt" class="mt-0.5 text-sm text-text-primary/70">
          {{ t('admin.classes.trash.warned', { date: formatTrashDate(cls.warnedAt, locale) }) }}
        </p>
      </template>
    </ClassTrashList>

    <Pagination
      :current-page="page"
      :total-pages="trashedClassesTotalPages"
      @page-change="page = $event"
    />

    <ClassPurgeConfirm v-model="showPurge" :target="purgeTarget" scope="admin" @purged="onPurged" />
  </div>
</template>

<script setup lang="ts">
import { TrashIcon } from '@heroicons/vue/24/outline'
import type { AdminTrashedClass } from '~/types/admin.types'
import { CLASS_TRASH_DAYS, formatTrashDate } from '~/utils/class-trash'

/**
 * La papelera de clases de toda la instancia, en el panel de administración:
 * el respaldo para las clases que quien tiene su propiedad no puede rescatar
 * (su cuenta está suspendida o desactivada) o que alguien pide recuperar.
 * Las mismas filas y acciones que la papelera del profesorado
 * (`ClassTrashList`, `ClassPurgeConfirm`), contra las rutas de administración:
 * restaurar sin confirmación (no se pierde nada y vuelve archivada a quien
 * tiene su propiedad) y borrar ya con el aviso de lo que se pierde. Ambas
 * quedan apuntadas como hechas por la administración.
 */

const { t, locale } = useI18n()
const toast = useToast()
const adminStore = useAdminStore()
const { trashedClasses, totalTrashedClasses, trashedClassesTotalPages, isLoadingTrashedClasses } =
  storeToRefs(adminStore)

const { search, page, isFiltering, reset } = useAdminListQuery({
  filters: {},
  sort: '',
  pageSize: 20,
  totalPages: trashedClassesTotalPages,
  load: query => adminStore.ensureTrashedClasses(query),
})

const restoringId = ref('')
const showPurge = ref(false)
const purgeTarget = ref<AdminTrashedClass | null>(null)
const rootRef = ref<HTMLElement | null>(null)
/** La lista (`ClassTrashList`), que sabe dónde dejar el foco tras quitar una fila. */
const listRef = ref<{ focusAfterRemoval: (index: number) => Promise<boolean> } | null>(null)

/** Quién la envió y cuándo; sin autor si su cuenta ya no existe. */
function sentLine(cls: AdminTrashedClass) {
  const date = formatTrashDate(cls.deletedAt, locale.value)
  if (cls.deletedBy?.name) {
    return t('admin.classes.trash.sent_by', { date, name: cls.deletedBy.name })
  }
  return t('admin.classes.trash.sent_on', { date })
}

/** Tras quitar una fila, el foco a la que ocupa su sitio o, si no queda ninguna, al buscador. */
async function focusAfterRemoval(index: number) {
  await nextTick()
  if (await listRef.value?.focusAfterRemoval(index)) return
  rootRef.value?.querySelector<HTMLElement>('input')?.focus()
}

async function restore(cls: AdminTrashedClass) {
  if (restoringId.value) return
  restoringId.value = cls.id
  const index = trashedClasses.value.findIndex(c => c.id === cls.id)
  try {
    await adminStore.restoreTrashedClass(cls.id)
    toast.success(t('admin.classes.trash.restored', { name: cls.name }), { duration: 6000 })
    void focusAfterRemoval(index)
  } catch (error) {
    const message = (error as { data?: { message?: string } })?.data?.message
    toast.error(message || t('admin.classes.trash.restore_error'))
  } finally {
    restoringId.value = ''
  }
}

/** Dónde estaba la que se va a borrar: al borrarla, el foco va a la que ocupa su sitio. */
let purgeIndex = 0

function askPurge(cls: AdminTrashedClass) {
  purgeTarget.value = cls
  purgeIndex = Math.max(
    0,
    trashedClasses.value.findIndex(c => c.id === cls.id)
  )
  showPurge.value = true
}

/** Borrada ya (el store ya la ha quitado de la lista): el foco, a la siguiente. */
function onPurged() {
  void focusAfterRemoval(purgeIndex)
}
</script>
