<template>
  <Modal :model-value="modelValue" size="2xl" :title="undefined" sticky-chrome @update:model-value="close">
    <template #header>
      <div class="min-w-0 flex-1">
        <h3 class="text-xl font-bold text-navy-700 break-words">
          {{ tpl?.name || t('teacher.templates.preview.loading') }}
        </h3>
        <p v-if="tpl?.teacherName" class="mt-0.5 text-sm text-text-secondary">
          {{ t('teacher.templates.preview.by', { name: tpl.teacherName }) }}
        </p>
      </div>
    </template>

    <!-- Loading -->
    <div v-if="loading" class="space-y-4">
      <div class="flex gap-2">
        <Skeleton v-for="n in 4" :key="n" class="h-9 w-28 rounded-full" />
      </div>
      <Skeleton class="h-48 w-full rounded-2xl" />
    </div>

    <div v-else-if="tpl">
      <!-- Tabs pills -->
      <div class="flex gap-2 overflow-x-auto scrollbar-subtle mb-6">
        <button
          v-for="tab in availableTabs"
          :key="tab.id"
          :class="[
            'px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors',
            activeTab === tab.id
              ? 'bg-navy-700 text-white'
              : 'bg-surface border border-border-primary text-navy-700 hover:bg-gray-50',
          ]"
          @click="activeTab = tab.id"
        >
          {{ tab.label }}
        </button>
      </div>

      <!-- Tab: Historia -->
      <div v-if="activeTab === 'narrative'" class="space-y-4">
        <div v-if="tpl.backgroundImage" class="overflow-hidden rounded-2xl">
          <img
            :src="getImageUrl(tpl.backgroundImage) || undefined"
            :alt="tpl.name"
            class="h-56 w-full object-cover"
          />
        </div>
        <div
          v-if="tpl.narrative"
          class="rounded-2xl bg-white p-6 shadow-sm chat-markdown"
          v-html="renderedNarrative"
        />
        <EmptyState
          v-else
          :icon="BookOpenIcon"
          :title="t('teacher.templates.preview.no_narrative_title')"
          :description="t('teacher.templates.preview.no_narrative_description')"
        />
      </div>

      <!-- Tab: Funcionalidades -->
      <div v-else-if="activeTab === 'features'">
        <div
          class="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:grid-flow-col sm:grid-rows-[repeat(5,auto)]"
        >
          <div
            v-for="flag in orderedFlags"
            :key="flag"
            class="flex items-center gap-3 rounded-2xl bg-white p-4 shadow-sm"
            :class="isActive(flag) ? '' : 'opacity-50'"
          >
            <span
              class="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-navy-700/5 text-navy-700"
            >
              <component :is="featureIcons[flag]" class="h-5 w-5" />
            </span>
            <div class="min-w-0 flex-1">
              <p class="font-semibold leading-tight text-navy-700">
                {{ t(`teacher.classes.detail.settings.items.${flag}.label`) }}
              </p>
              <p class="mt-0.5 text-xs text-text-secondary">
                {{ t(`teacher.classes.detail.settings.items.${flag}.desc`) }}
              </p>
            </div>
            <Badge :variant="isActive(flag) ? 'success' : 'default'" size="sm" class="flex-shrink-0">
              {{ isActive(flag) ? t('teacher.templates.preview.active') : t('teacher.templates.preview.inactive') }}
            </Badge>
          </div>
        </div>
      </div>

      <!-- Tab: Tienda -->
      <div v-else-if="activeTab === 'shop'">
        <EmptyState
          v-if="tpl.shopItems.length === 0"
          :icon="ShoppingBagIcon"
          :title="t('teacher.templates.preview.no_shop_title')"
          :description="t('teacher.templates.preview.no_shop_description')"
        />
        <div v-else class="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div
          v-for="s in tpl.shopItems"
          :key="s.id"
          class="flex items-start gap-3 rounded-2xl bg-white p-4 shadow-sm"
        >
          <span
            class="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full"
            :class="s.kind === 'power' ? 'bg-purple/10 text-purple' : 'bg-yellow/10 text-yellow-active'"
          >
            <BoltIcon v-if="s.kind === 'power'" class="h-5 w-5" />
            <GiftIcon v-else class="h-5 w-5" />
          </span>
          <div class="min-w-0 flex-1">
            <p class="font-semibold leading-tight text-navy-700">{{ s.name }}</p>
            <p v-if="s.description" class="mt-0.5 line-clamp-2 text-xs text-text-secondary">
              {{ s.description }}
            </p>
            <div class="mt-2 flex items-center gap-3 text-sm font-medium text-navy-700">
              <span class="flex items-center gap-1">
                <CoinIcon class="h-4 w-4" />{{ s.price }}
              </span>
              <span v-if="s.manaCost > 0" class="flex items-center gap-1">
                <ManaIcon class="h-4 w-4" />{{ s.manaCost }}
              </span>
              <span v-if="s.lifeRestore" class="flex items-center gap-1">
                <LifeIcon class="h-4 w-4" />+{{ s.lifeRestore }}
              </span>
            </div>
          </div>
        </div>
        </div>
      </div>

      <!-- Tab: Comportamientos -->
      <div v-else-if="activeTab === 'behaviors'">
        <EmptyState
          v-if="tpl.behaviorTemplates.length === 0"
          :icon="HandRaisedIcon"
          :title="t('teacher.templates.preview.no_behaviors_title')"
          :description="t('teacher.templates.preview.no_behaviors_description')"
        />
        <div v-else class="space-y-3">
          <div
            v-for="b in tpl.behaviorTemplates"
            :key="b.id"
            class="flex items-center gap-3 rounded-2xl bg-white p-4 shadow-sm"
          >
            <span
              class="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full"
              :class="b.kind === 'positive' ? 'bg-navy-700' : 'bg-red'"
            >
              <HandThumbUpIcon v-if="b.kind === 'positive'" class="h-5 w-5 text-white" />
              <HandThumbDownIcon v-else class="h-5 w-5 text-white" />
            </span>
            <div class="min-w-0 flex-1">
              <p class="font-semibold leading-tight text-navy-700 truncate">{{ b.name }}</p>
              <p v-if="b.description" class="mt-0.5 line-clamp-1 text-xs text-text-secondary">
                {{ b.description }}
              </p>
            </div>
            <div
              class="flex items-center gap-3 text-sm font-semibold flex-shrink-0"
              :class="b.kind === 'positive' ? 'text-navy-700' : 'text-red'"
            >
              <span v-if="b.xpDelta" class="inline-flex items-center gap-1">
                <XpIcon class="h-4 w-4" />{{ formatDelta(b.xpDelta) }}
              </span>
              <span v-if="b.coinDelta" class="inline-flex items-center gap-1">
                <CoinIcon class="h-4 w-4" />{{ formatDelta(b.coinDelta) }}
              </span>
              <span v-if="b.lifeDelta" class="inline-flex items-center gap-1">
                <LifeIcon class="h-4 w-4" />{{ formatDelta(b.lifeDelta) }}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div v-else class="py-8 text-center text-text-secondary">
      {{ t('teacher.templates.preview.error') }}
    </div>

    <template #footer>
      <Button variant="outline" size="md" @click="close">
        {{ t('common.actions.close') }}
      </Button>
      <Button
        v-if="tpl"
        variant="primary"
        size="md"
        :loading="importing"
        :disabled="importing"
        @click="handleImport"
      >
        {{ t('teacher.templates.import') }}
      </Button>
    </template>
  </Modal>
</template>

<script setup lang="ts">
import type { Component } from 'vue'
import {
  ShoppingBagIcon,
  ChartBarIcon,
  HandRaisedIcon,
  SparklesIcon,
  SpeakerWaveIcon,
  BoltIcon,
  GiftIcon,
  BookOpenIcon,
} from '@heroicons/vue/24/outline'
import { HandThumbUpIcon, HandThumbDownIcon } from '@heroicons/vue/24/solid'
import type { ClassSettings } from '~/types/class.types'
import { DEFAULT_CLASS_SETTINGS } from '~/utils/class-settings'
import { renderMarkdown } from '~/utils/markdown'
import CoinIcon from '~/components/atoms/CoinIcon.vue'
import ManaIcon from '~/components/atoms/ManaIcon.vue'
import XpIcon from '~/components/atoms/XpIcon.vue'
import LifeIcon from '~/components/atoms/LifeIcon.vue'

interface ShopItem {
  id: string
  name: string
  description: string | null
  price: number
  kind: string
  manaCost: number
  usage: string
  lifeRestore: number | null
}
interface BehaviorTemplate {
  id: string
  kind: 'positive' | 'negative'
  name: string
  description: string | null
  xpDelta: number
  coinDelta: number
  lifeDelta: number
}
interface TemplateDetail {
  id: string
  name: string
  narrative: string | null
  backgroundImage: string | null
  teacherName: string
  isOwn: boolean
  settings: Partial<ClassSettings> | null
  shopItems: ShopItem[]
  behaviorTemplates: BehaviorTemplate[]
}

type TabId = 'narrative' | 'features' | 'shop' | 'behaviors'

const props = defineProps<{
  modelValue: boolean
  templateId: string | null
}>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  imported: [payload: { id: string; name: string }]
}>()

const { t } = useI18n()
const config = useRuntimeConfig()
const toast = useToast()
const { getImageUrl } = useImageUrl()

const tpl = ref<TemplateDetail | null>(null)
const loading = ref(false)
const importing = ref(false)
const activeTab = ref<TabId>('narrative')

const featureIcons: Record<keyof ClassSettings, Component> = {
  shop: ShoppingBagIcon,
  coins: CoinIcon,
  mana: ManaIcon,
  rankings: ChartBarIcon,
  xp: XpIcon,
  behaviors: HandRaisedIcon,
  lives: LifeIcon,
  visualEffects: SparklesIcon,
  sounds: SpeakerWaveIcon,
}

const orderedFlags: (keyof ClassSettings)[] = [
  'rankings',
  'shop',
  'behaviors',
  'visualEffects',
  'sounds',
  'xp',
  'coins',
  'mana',
  'lives',
]

const mergedSettings = computed<ClassSettings>(() => ({
  ...DEFAULT_CLASS_SETTINGS,
  ...(tpl.value?.settings || {}),
}))

function isActive(flag: keyof ClassSettings): boolean {
  return !!mergedSettings.value[flag]
}

// Siempre mostramos las 4 tabs para que el profesor entienda qué tipos de
// contenido puede traer una plantilla, aunque ésta concreta no lo traiga.
const availableTabs = computed(() => [
  { id: 'narrative' as TabId, label: t('teacher.templates.preview.tab_narrative') },
  { id: 'features' as TabId, label: t('teacher.templates.preview.tab_features') },
  { id: 'shop' as TabId, label: t('teacher.templates.preview.tab_shop', { n: tpl.value?.shopItems.length ?? 0 }) },
  { id: 'behaviors' as TabId, label: t('teacher.templates.preview.tab_behaviors', { n: tpl.value?.behaviorTemplates.length ?? 0 }) },
])

const renderedNarrative = computed(() =>
  tpl.value?.narrative ? renderMarkdown(tpl.value.narrative) : ''
)

function formatDelta(n: number): string {
  return n > 0 ? `+${n}` : `${n}`
}

async function load(id: string) {
  loading.value = true
  tpl.value = null
  activeTab.value = 'narrative'
  try {
    tpl.value = await $fetch<TemplateDetail>(
      `${config.public.apiBase}/teacher/templates/${id}`
    )
  } catch {
    toast.error(t('teacher.templates.preview.load_error'))
  } finally {
    loading.value = false
  }
}

async function handleImport() {
  if (!tpl.value || importing.value) return
  importing.value = true
  try {
    const res = await $fetch<{ class: { id: string; name: string } }>(
      `${config.public.apiBase}/teacher/templates/${tpl.value.id}/import`,
      { method: 'POST' }
    )
    toast.success(t('teacher.templates.import_success', { name: res.class.name }))
    emit('imported', res.class)
    close()
  } catch {
    toast.error(t('teacher.templates.import_error'))
  } finally {
    importing.value = false
  }
}

function close() {
  emit('update:modelValue', false)
}

watch(
  () => props.templateId,
  (id) => {
    if (id && props.modelValue) load(id)
  },
  { immediate: true }
)
watch(
  () => props.modelValue,
  (open) => {
    if (open && props.templateId) load(props.templateId)
    if (!open) tpl.value = null
  }
)
</script>

<style scoped>
.chat-markdown :deep(h1),
.chat-markdown :deep(h2),
.chat-markdown :deep(h3) {
  font-weight: 700;
  color: rgb(35 36 93);
  margin: 0.75rem 0 0.5rem;
}
.chat-markdown :deep(h1) { font-size: 1.15rem; }
.chat-markdown :deep(h2) { font-size: 1.05rem; }
.chat-markdown :deep(h3) { font-size: 1rem; }
.chat-markdown :deep(p) { margin: 0.5rem 0; line-height: 1.6; color: rgb(35 36 93); }
.chat-markdown :deep(strong) { color: rgb(35 36 93); font-weight: 700; }
.chat-markdown :deep(em) { font-style: italic; }
.chat-markdown :deep(ul),
.chat-markdown :deep(ol) { padding-left: 1.25rem; margin: 0.5rem 0; }
.chat-markdown :deep(li) { margin: 0.25rem 0; }
.chat-markdown :deep(hr) { border: none; border-top: 1px solid rgb(229 231 235); margin: 1rem 0; }
</style>
