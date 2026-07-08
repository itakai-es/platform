<template>
  <div>
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

    <!-- Main Content -->
    <template v-else>
      <ClassDetailHeader
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
        <template #actions>
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
        <template v-if="state.classData.schedule" #subtitle>
          {{ state.classData.schedule }}
        </template>
        <template v-if="state.classData.archived" #meta>
          <div
            class="rounded-2xl bg-yellow/20 border border-yellow/30 px-4 py-3 text-sm text-white"
          >
            Esta clase está archivada. Se mantiene accesible para consulta, pero no admite nuevos
            alumnos ni invitaciones.
          </div>
        </template>
      </ClassDetailHeader>

      <!-- Tab Content (hijo via NuxtPage). El key cuelga del classId para que al
           navegar entre clases las páginas hijas no reutilicen estado de otra clase. -->
      <NuxtPage :key="classId" />
    </template>

    <!-- Invite Modal -->
    <InviteStudentsModal
      v-if="state.classData"
      v-model="state.showInviteModal"
      :class-id="classId"
      :invitation-code="state.classData.invitationCode || ''"
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
              <XMarkIcon class="w-5 h-5 text-navy-700/60" />
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
} from '@heroicons/vue/24/outline'
import {
  BookOpenIcon as BookOpenIconSolid,
  Squares2X2Icon as Squares2X2IconSolid,
  SparklesIcon as SparklesIconSolid,
  ChartBarIcon as ChartBarIconSolid,
  RocketLaunchIcon as RocketLaunchIconSolid,
  ShoppingBagIcon as ShoppingBagIconSolid,
  HandRaisedIcon as HandRaisedIconSolid,
  Cog6ToothIcon as Cog6ToothIconSolid,
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
const { state, classSettings, resolvedClassImage, loadAll, closeActivityBadge } = detail

const tabs = computed(() => {
  const s = classSettings.value
  const list = [
    { id: 'resumen', label: t('teacher.classes.detail.tabs.summary'), icon: Squares2X2IconSolid },
    { id: 'historia', label: t('teacher.classes.detail.tabs.narrative'), icon: BookOpenIconSolid },
    { id: 'guia', label: t('teacher.classes.detail.tabs.guide'), icon: SparklesIconSolid },
    { id: 'misiones', label: t('teacher.classes.detail.tabs.missions'), icon: RocketLaunchIconSolid },
  ]
  if (s.rankings)
    list.push({ id: 'ranking', label: t('teacher.classes.detail.tabs.ranking'), icon: ChartBarIconSolid })
  if (s.shop)
    list.push({ id: 'tienda', label: t('teacher.classes.detail.tabs.tienda'), icon: ShoppingBagIconSolid })
  if (s.behaviors)
    list.push({
      id: 'comportamientos',
      label: t('teacher.classes.detail.tabs.behaviors'),
      icon: HandRaisedIconSolid,
    })
  list.push({ id: 'ajustes', label: t('teacher.classes.detail.tabs.settings'), icon: Cog6ToothIconSolid })
  return list
})

// Pestaña activa derivada del segmento siguiente al :id.
const activeTab = computed(() => {
  const segs = route.path.split('/').filter(Boolean)
  return segs[3] || 'resumen'
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
</script>
