<template>
  <div>
    <!-- Loading State -->
    <div v-if="loading" class="space-y-6">
      <Skeleton width="w-48" height="h-4" />
      <Skeleton width="w-64" height="h-8" />
      <div class="flex gap-2">
        <Skeleton v-for="i in 4" :key="i" width="w-24" height="h-10" />
      </div>
      <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Skeleton v-for="i in 3" :key="i" height="h-32" />
      </div>
    </div>

    <!-- Error State -->
    <EmptyState
      v-else-if="error"
      :icon="ExclamationTriangleIcon"
      :title="t('student.classes.detail.error_title')"
      :description="error"
    >
      <template #action>
        <NuxtLink to="/alumno/clases">
          <Button variant="primary">{{ t('student.classes.detail.back_to_classes') }}</Button>
        </NuxtLink>
      </template>
    </EmptyState>

    <!-- Main Content -->
    <template v-else-if="classData">
      <ClassDetailHeader
        :name="classData.name"
        :background-image="resolvedClassImage"
        home-to="/alumno/inicio"
        :breadcrumb-middle="t('student.classes.detail.breadcrumb_classes')"
        breadcrumb-middle-to="/alumno/clases"
        :tabs="tabs"
        :active-tab="activeTab"
        :tab-href="tabHref"
        :subject="classData.subject"
        :education-level="classData.educationLevel"
        :language="classData.language"
      >
        <template #subtitle>
          {{ classData.teacherName || t('student.classes.detail.teacher_fallback')
          }}{{ classData.schedule ? ` - ${classData.schedule}` : '' }}
        </template>
        <template
          v-if="classSettings.lives || classSettings.coins || classSettings.mana"
          #meta
        >
          <div
            class="self-start inline-flex items-center gap-5 bg-white/10 rounded-full px-4 py-2 text-white text-base font-semibold"
          >
            <Tooltip v-if="classSettings.lives" :text="t('common.resources.lives')" variant="light">
              <span class="inline-flex items-center gap-1.5">
                <LifeIcon class="w-5 h-5" />
                {{ livesBalance.toLocaleString('es-ES') }}
              </span>
            </Tooltip>
            <template v-if="classSettings.coins">
              <span v-if="classSettings.lives" class="w-px h-5 bg-white/20" aria-hidden="true" />
              <Tooltip :text="t('common.resources.coins')" variant="light">
                <span class="inline-flex items-center gap-1.5">
                  <CoinIcon class="w-5 h-5" />
                  {{ shopBalance.toLocaleString('es-ES') }}
                </span>
              </Tooltip>
            </template>
            <template v-if="classSettings.mana">
              <span
                v-if="classSettings.lives || classSettings.coins"
                class="w-px h-5 bg-white/20"
                aria-hidden="true"
              />
              <Tooltip :text="t('common.resources.mana')" variant="light">
                <span class="inline-flex items-center gap-1.5">
                  <ManaIcon class="w-5 h-5" />
                  {{ manaBalance.toLocaleString('es-ES') }}
                </span>
              </Tooltip>
            </template>
          </div>
        </template>
      </ClassDetailHeader>

      <!-- Tab Content (hijo). El key cuelga del classId para que al saltar entre
           clases la página hija no reutilice estado de la anterior. -->
      <NuxtPage :key="classId" />
    </template>

    <!-- Level Up Modal -->
    <LevelUpModal
      v-if="levelUpData"
      :show="showLevelUpModal"
      :old-level="levelUpData.oldLevel"
      :new-level="levelUpData.newLevel"
      :class-name="levelUpData.className"
      :effects="classSettings.visualEffects"
      @close="classGamificationStore.closeLevelUpModal()"
    />
  </div>
</template>

<script setup lang="ts">
import { storeToRefs } from 'pinia'
import { ExclamationTriangleIcon } from '@heroicons/vue/24/outline'
import {
  Squares2X2Icon as Squares2X2IconSolid,
  BookOpenIcon as BookOpenIconSolid,
  SparklesIcon as SparklesIconSolid,
  RocketLaunchIcon as RocketLaunchIconSolid,
  ChartBarIcon as ChartBarIconSolid,
  ShoppingBagIcon as ShoppingBagIconSolid,
  UserIcon as UserIconSolid,
} from '@heroicons/vue/24/solid'
import CoinIcon from '~/components/atoms/CoinIcon.vue'
import ManaIcon from '~/components/atoms/ManaIcon.vue'
import LifeIcon from '~/components/atoms/LifeIcon.vue'

definePageMeta({
  layout: 'student',
  middleware: ['auth', 'role'],
  // Re-monta al cambiar de :id para que el state compartido del composable
  // no se quede apuntando a la clase anterior.
  key: route => route.params.id as string,
})

const { t } = useI18n()
const route = useRoute()
const classesStore = useClassesStore()
const classGamificationStore = useClassGamificationStore()

const classId = computed(() => route.params.id as string)
const detail = useStudentClassDetail(classId)
const {
  classData,
  classSettings,
  resolvedClassImage,
  shopBalance,
  manaBalance,
  livesBalance,
  loadAll,
} = detail

const { isLoadingClass, error } = storeToRefs(classesStore)
const { showLevelUpModal, levelUpData } = storeToRefs(classGamificationStore)
const loading = computed(() => isLoadingClass.value)

const tabs = computed(() => {
  const s = classSettings.value
  const list = [
    { id: 'resumen', label: t('student.classes.detail.tabs.resumen'), icon: Squares2X2IconSolid },
    { id: 'historia', label: t('student.classes.detail.tabs.historia'), icon: BookOpenIconSolid },
    { id: 'guia', label: t('student.classes.detail.tabs.guia'), icon: SparklesIconSolid },
    { id: 'misiones', label: t('student.classes.detail.tabs.misiones'), icon: RocketLaunchIconSolid },
  ]
  if (s.rankings)
    list.push({ id: 'ranking', label: t('student.classes.detail.tabs.ranking'), icon: ChartBarIconSolid })
  if (s.shop)
    list.push({ id: 'tienda', label: t('student.classes.detail.tabs.tienda'), icon: ShoppingBagIconSolid })
  list.push({ id: 'avatar', label: t('student.classes.detail.tabs.avatar'), icon: UserIconSolid })
  return list
})

const activeTab = computed(() => {
  const segs = route.path.split('/').filter(Boolean)
  return segs[3] || 'resumen'
})

function tabHref(tabId: string) {
  const base = `/alumno/clases/${classId.value}`
  return tabId === 'resumen' ? base : `${base}/${tabId}`
}

watch(tabs, list => {
  if (!list.some(tab => tab.id === activeTab.value)) {
    navigateTo(tabHref('resumen'))
  }
})

// SFX al abrir el modal de subida de nivel (el confeti del modal queda dentro).
const effects = useEffects()
watch(showLevelUpModal, open => {
  if (open) effects.play('level_up', { settings: classSettings.value })
})

// Floaters automáticos al subir un saldo (XP/monedas/maná/vidas).
const RESOURCE_EVENT = {
  xp: 'xp_earned',
  coins: 'coins_earned',
  mana: 'mana_earned',
  lives: 'coins_earned',
} as const
function watchResourceDelta(
  source: () => number | undefined,
  resource: 'xp' | 'coins' | 'mana' | 'lives'
) {
  let prev: number | null = null
  watch(source, val => {
    if (val === undefined) return
    if (prev === null) {
      prev = val
      return
    }
    const delta = val - prev
    prev = val
    if (delta > 0) {
      effects.play(RESOURCE_EVENT[resource], {
        settings: classSettings.value,
        amount: delta,
        resource,
      })
    }
  })
}
watchResourceDelta(() => shopBalance.value, 'coins')
watchResourceDelta(() => manaBalance.value, 'mana')
watchResourceDelta(() => livesBalance.value, 'lives')
watchResourceDelta(() => detail.classGamification.value?.xp, 'xp')

onMounted(() => {
  void loadAll()
})
</script>
