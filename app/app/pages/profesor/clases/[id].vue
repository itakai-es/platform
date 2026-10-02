<template>
  <div ref="rootRef">
    <!-- Loading State -->
    <div v-if="state.isLoading" class="space-y-6">
      <Skeleton width="w-48" height="h-4" />
      <Skeleton width="w-64" height="h-8" />
      <div class="flex gap-2">
        <Skeleton v-for="i in 3" :key="i" width="w-24" height="h-10" />
      </div>
      <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Skeleton v-for="i in 3" :key="i" height="h-32" />
      </div>
    </div>

    <!-- Error State -->
    <EmptyState
      v-else-if="!state.classData"
      :icon="ExclamationTriangleIcon"
      :title="t('teacher.classes.detail.not_found_title')"
      :description="t('teacher.classes.detail.not_found_description')"
    >
      <template #action>
        <NuxtLink to="/profesor/clases">
          <Button variant="primary">{{ t('teacher.classes.detail.btn_back') }}</Button>
        </NuxtLink>
      </template>
    </EmptyState>

    <!-- En la papelera: no se abre como una clase normal (solo lectura por interfaz) -->
    <ClassInTrashNotice
      v-else-if="state.classData.deletedAt"
      :name="state.classData.name"
      :deleted-at="state.classData.deletedAt"
      :can-restore="can('class.restore')"
      :restoring="restoring"
      @restore="restore"
    />

    <!-- Main Content -->
    <template v-else>
      <ClassDetailHeader
        class="print:hidden"
        :name="state.classData.name"
        :background-image="resolvedClassImage"
        home-to="/profesor/inicio"
        :breadcrumb-middle="t('teacher.classes.detail.breadcrumb_classes')"
        breadcrumb-middle-to="/profesor/clases"
        :tabs="tabs"
        :active-tab="activeTab"
        :tab-href="tabHref"
        :subject="state.classData.subject"
        :education-level="state.classData.educationLevel"
        :language="state.classData.language"
      >
        <template v-if="can('class.inviteCode')" #actions>
          <Button
            variant="secondary"
            size="md"
            :disabled="state.classData.archived"
            @click="state.showInviteModal = true"
          >
            <UserPlusIcon class="w-5 h-5 sm:mr-2" /><span class="hidden sm:inline">{{
              t('teacher.classes.detail.btn_invite')
            }}</span>
          </Button>
        </template>
        <template v-if="scheduleSummary" #subtitle>
          <span class="inline-flex items-center gap-1.5">
            <CalendarDaysIcon class="w-4 h-4 text-white/60" />
            {{ scheduleSummary }}
          </span>
        </template>
        <template v-if="state.classData.archived" #meta>
          <div
            class="rounded-2xl bg-yellow/20 border border-yellow/30 px-4 py-3 text-sm text-white"
          >
            {{ t('teacher.classes.detail.archived_notice') }}
          </div>
        </template>
      </ClassDetailHeader>

      <!-- Tab Content (hijo via NuxtPage). El key cuelga del classId para que al
           navegar entre clases las páginas hijas no reutilicen estado de otra clase. -->
      <NuxtPage :key="classId" />
    </template>

    <!-- Invite Modal -->
    <InviteStudentsModal
      v-if="state.classData && !state.classData.deletedAt && can('class.inviteCode')"
      v-model="state.showInviteModal"
      :class-id="classId"
      :invitation-code="state.classData.invitationCode || ''"
      :can-create-accounts="!state.classData.archived"
      @created="onAccountsCreated"
    />

    <!-- Activity Badge Modal -->
    <Teleport to="body">
      <Transition name="modal">
        <div
          v-if="state.selectedActivityBadge"
          class="fixed inset-0 z-50 flex items-center justify-center p-4"
          @click.self="closeActivityBadge"
        >
          <div class="absolute inset-0 bg-black/50" @click="closeActivityBadge" />
          <div class="relative bg-white rounded-2xl p-6 max-w-xs w-full shadow-xl text-center">
            <button
              class="absolute top-3 right-3 p-1 rounded-full hover:bg-gray-100 transition-colors"
              @click="closeActivityBadge"
            >
              <XMarkIcon class="w-5 h-5 text-navy-700/70" />
            </button>
            <img
              :src="state.selectedActivityBadge.image"
              :alt="state.selectedActivityBadge.text"
              class="w-28 h-28 mx-auto mb-4 drop-shadow-lg"
            />
            <h3 class="text-lg font-bold text-navy-700">{{ state.selectedActivityBadge.text }}</h3>
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import {
  UserPlusIcon,
  ExclamationTriangleIcon,
  XMarkIcon,
  CalendarDaysIcon,
} from '@heroicons/vue/24/outline'
import {
  BookOpenIcon as BookOpenIconSolid,
  Squares2X2Icon as Squares2X2IconSolid,
  SparklesIcon as SparklesIconSolid,
  RocketLaunchIcon as RocketLaunchIconSolid,
  ShoppingBagIcon as ShoppingBagIconSolid,
  HandRaisedIcon as HandRaisedIconSolid,
  Cog6ToothIcon as Cog6ToothIconSolid,
  UsersIcon as UsersIconSolid,
  ClockIcon as ClockIconSolid,
} from '@heroicons/vue/24/solid'

definePageMeta({
  layout: 'teacher',
  middleware: ['auth', 'role'],
  // Re-monta la página (y por tanto el composable) cuando cambia el `:id`, así
  // el state compartido nunca queda apuntando a la clase anterior.
  key: route => route.params.id as string,
})

useHead({
  title: () => useI18n().t('teacher.classes.detail.meta.title'),
  meta: [
    {
      name: 'description',
      content: () => useI18n().t('teacher.classes.detail.meta.description'),
    },
  ],
})

const { t } = useI18n()
const route = useRoute()

const classId = computed(() => route.params.id as string)
const detail = useTeacherClassDetail(classId)
const { state, classSettings, resolvedClassImage, can, loadAll, revalidate, closeActivityBadge } =
  detail
const teacherStore = useTeacherStore()

// Días y horas de la clase; el horario completo, con fechas, está en Ajustes.
const { summarize } = useScheduleSummary()
const scheduleSummary = computed(() =>
  summarize(state.value.classData?.scheduleConfig, state.value.classData?.schedule).join(' · ')
)

// Restaurar desde el aviso de la papelera: vuelve archivada y se abre ya como clase.
// El botón desaparece con el aviso: el foco pasa al nombre de la clase.
const toast = useToast()
const restoring = ref(false)
const rootRef = ref<HTMLElement | null>(null)
async function restore() {
  if (restoring.value) return
  restoring.value = true
  try {
    await teacherStore.restoreClass(classId.value)
    await loadAll(true)
    toast.success(
      t('teacher.classes.trash.restored', { name: state.value.classData?.name ?? '' }),
      { duration: 6000 }
    )
    await nextTick()
    rootRef.value?.querySelector('h1')?.focus()
  } catch (error) {
    const message = (error as { data?: { message?: string } })?.data?.message
    toast.error(message || t('teacher.classes.trash.restore_error'))
  } finally {
    restoring.value = false
  }
}

/** Las cuentas nuevas ya están matriculadas: se cuentan sin volver a pedir la clase. */
function onAccountsCreated(count: number) {
  if (state.value.classData) state.value.classData.studentCount += count
}

const tabs = computed(() => {
  const s = classSettings.value
  const list = [
    { id: 'resumen', label: t('teacher.classes.detail.tabs.summary'), icon: Squares2X2IconSolid },
    { id: 'historia', label: t('teacher.classes.detail.tabs.narrative'), icon: BookOpenIconSolid },
    { id: 'guia', label: t('teacher.classes.detail.tabs.guide'), icon: SparklesIconSolid },
    {
      id: 'misiones',
      label: t('teacher.classes.detail.tabs.missions'),
      icon: RocketLaunchIconSolid,
    },
    { id: 'alumnos', label: t('teacher.classes.detail.tabs.students'), icon: UsersIconSolid },
  ]
  // El ranking (podio) vive ahora como sub-vista dentro de "Alumnos".
  if (s.shop)
    list.push({
      id: 'tienda',
      label: t('teacher.classes.detail.tabs.tienda'),
      icon: ShoppingBagIconSolid,
    })
  if (s.behaviors)
    list.push({
      id: 'comportamientos',
      label: t('teacher.classes.detail.tabs.behaviors'),
      icon: HandRaisedIconSolid,
    })
  if (can('class.history'))
    list.push({
      id: 'historial',
      label: t('teacher.classes.detail.tabs.history'),
      icon: ClockIconSolid,
    })
  list.push({
    id: 'ajustes',
    label: t('teacher.classes.detail.tabs.settings'),
    icon: Cog6ToothIconSolid,
  })
  return list
})

// Páginas de la clase que no son una pestaña, con la pestaña de la que dependen:
// la hoja de credenciales se abre desde Alumnos y la marca.
const TAB_OF_PAGE: Record<string, string> = { credenciales: 'alumnos' }

// Pestaña activa derivada del segmento siguiente al :id.
const activeTab = computed(() => {
  const segs = route.path.split('/').filter(Boolean)
  const page = segs[3] || 'resumen'
  return TAB_OF_PAGE[page] ?? page
})

function tabHref(tabId: string) {
  const base = `/profesor/clases/${classId.value}`
  return tabId === 'resumen' ? base : `${base}/${tabId}`
}

// Si la pestaña activa se desactiva en Ajustes (p. ej. Tienda off), volver a Resumen.
watch(tabs, list => {
  if (!list.some(tab => tab.id === activeTab.value)) {
    navigateTo(tabHref('resumen'))
  }
})

onMounted(() => {
  void loadAll()
})

// Un aviso de cambio de acceso a esta clase, abierto con la clase ya en pantalla:
// se vuelve a pedir para que pestañas y controles sigan al nivel nuevo.
watch(
  () => teacherStore.classAccessRevision[classId.value],
  () => {
    void revalidate()
  }
)
</script>
