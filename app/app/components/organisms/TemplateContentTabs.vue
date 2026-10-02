<template>
  <div>
    <TabNavigation
      :tabs="tabs"
      :active-tab="activeTab"
      variant="pills"
      :id-prefix="tabsId"
      :aria-label="t('teacher.templates.preview.tabs_label')"
      class="mb-6"
      @tab-change="selectTab"
    />

    <div
      :id="tabPanelId(tabsId, activeTab)"
      role="tabpanel"
      :aria-labelledby="tabElementId(tabsId, activeTab)"
      tabindex="0"
      class="focus:outline-none focus-visible:ring-2 focus-visible:ring-navy-700 focus-visible:ring-offset-2 rounded-2xl"
    >
      <TemplateNarrative v-if="activeTab === 'narrative'" :template="template" />
      <TemplateFeatureGrid v-else-if="activeTab === 'features'" :features="features" />
      <TemplateMissionList v-else-if="activeTab === 'missions'" :missions="template.missions" />
      <TemplateShopList
        v-else-if="activeTab === 'shop'"
        :items="template.shopItems"
        :features="features"
      />
      <TemplateBehaviorList v-else :behaviors="template.behaviorTemplates" :features="features" />
    </div>
  </div>
</template>

<script setup lang="ts">
import type { ClassSettings } from '~/types/class.types'
import type { TemplateContents, TemplateStory } from '~/types/template.types'
import { tabElementId, tabPanelId } from '~/utils/tabs'

/**
 * Lo que trae una plantilla, en pestañas: su historia, sus funcionalidades, sus
 * misiones, su tienda y sus comportamientos, con cuántos hay de cada lista. Es
 * la misma pieza en la previsualización del catálogo del profesorado y en la
 * ficha pública, así que las dos se leen igual.
 *
 * Siempre salen las cinco, aunque alguna lista venga vacía, para que se
 * entienda qué puede traer una plantilla aunque esta no lo traiga. Se abre por
 * la historia; quien la usa la vuelve a montar para otra plantilla.
 */

type TabId = 'narrative' | 'features' | 'missions' | 'shop' | 'behaviors'

const props = defineProps<{
  template: TemplateStory & TemplateContents
  /** Las funcionalidades de la plantilla, ya resueltas. */
  features: ClassSettings
}>()

const { t } = useI18n()

const tabsId = useId()
const activeTab = ref<TabId>('narrative')

const tabs = computed<{ id: TabId; label: string }[]>(() => [
  { id: 'narrative', label: t('teacher.templates.preview.tab_narrative') },
  { id: 'features', label: t('teacher.templates.preview.tab_features') },
  {
    id: 'missions',
    label: t('teacher.templates.preview.tab_missions', { n: props.template.missions.length }),
  },
  {
    id: 'shop',
    label: t('teacher.templates.preview.tab_shop', { n: props.template.shopItems.length }),
  },
  {
    id: 'behaviors',
    label: t('teacher.templates.preview.tab_behaviors', {
      n: props.template.behaviorTemplates.length,
    }),
  },
])

function selectTab(id: string) {
  activeTab.value = id as TabId
}
</script>
