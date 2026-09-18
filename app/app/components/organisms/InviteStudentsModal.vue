<template>
  <Modal
    :model-value="modelValue"
    :title="t('common.invite_students_modal.title')"
    :size="canCreateAccounts ? 'lg' : 'sm'"
    theme="light"
    :persistent="activeTab === 'accounts'"
    @update:model-value="emit('update:modelValue', $event)"
  >
    <div class="space-y-5">
      <TabNavigation
        v-if="canCreateAccounts"
        :tabs="tabs"
        :active-tab="activeTab"
        :id-prefix="tabsId"
        :aria-label="t('common.invite_students_modal.tabs_label')"
        @tab-change="selectTab"
      />

      <!-- Código de clase: se comparte y el alumno entra con él directamente -->
      <div
        v-show="activeTab === 'code'"
        v-bind="panelAttrs('code')"
        class="mx-auto max-w-sm space-y-4"
      >
        <p class="text-text-secondary text-sm text-center">
          {{ t('common.invite_students_modal.description') }}
        </p>

        <div class="bg-gray-100 rounded-xl p-6 text-center">
          <p class="text-4xl font-bold text-navy-700 tracking-widest font-mono">
            {{ invitationCode }}
          </p>
        </div>

        <Button variant="primary" class="w-full" @click="handleCopyCode">
          <ClipboardDocumentIcon class="w-4 h-4 mr-2" />
          {{ t('common.invite_students_modal.copy_code') }}
        </Button>
      </div>

      <!-- Crear cuentas sin correo: una a una o importando una lista -->
      <div
        v-if="canCreateAccounts"
        v-show="activeTab === 'accounts'"
        v-bind="panelAttrs('accounts')"
        class="space-y-4"
      >
        <p class="text-sm font-medium text-navy-700">
          {{ t('teacher.classes.detail.accounts.lead', { max: STUDENT_LIST_MAX }) }}
        </p>
        <InfoNote>{{ t('teacher.classes.detail.accounts.intro') }}</InfoNote>
        <!-- Las dos formas, con icono y una línea que dice qué hace cada una -->
        <OptionPillGroup
          v-model="mode"
          :options="modeOptions"
          fluid
          min-item-width="9rem"
          :aria-label="t('teacher.classes.detail.accounts.mode_label')"
        >
          <template #option="{ option, selected }">
            <span class="flex flex-col items-center gap-1 py-1">
              <component :is="MODE_ICONS[option.value]" class="h-6 w-6" aria-hidden="true" />
              <span class="text-base font-semibold">{{ option.label }}</span>
              <span class="text-xs" :class="selected ? 'text-white/80' : 'text-navy-700/70'">
                {{ modeHints[option.value] }}
              </span>
            </span>
          </template>
        </OptionPillGroup>
        <ManagedAccountsRowsForm
          v-show="mode === 'rows'"
          :class-id="classId"
          @created="onCreated"
        />
        <ManagedAccountsImport
          v-show="mode === 'import'"
          :class-id="classId"
          @created="onCreated"
        />
      </div>
    </div>
  </Modal>
</template>

<script setup lang="ts">
import {
  ClipboardDocumentIcon,
  ClipboardDocumentListIcon,
  PencilSquareIcon,
} from '@heroicons/vue/24/outline'
import type { ManagedCredentials } from '~/types/auth.types'
import { copyText } from '~/utils/clipboard'
import { STUDENT_LIST_MAX } from '~/utils/student-list'
import { tabElementId, tabPanelId } from '~/utils/tabs'

/**
 * «Invitar alumnos»: el código de la clase, para que el alumnado entre por su
 * cuenta, y la creación de cuentas sin correo (una a una o con una lista). Las
 * cuentas nuevas terminan en la hoja de credenciales de la clase.
 *
 * Crear cuentas no se ofrece en una clase archivada (`canCreateAccounts`); quien
 * abre esta ventana ya administra la clase.
 */
interface Props {
  modelValue: boolean
  classId: string
  invitationCode: string
  canCreateAccounts?: boolean
}

const props = withDefaults(defineProps<Props>(), { canCreateAccounts: false })

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  codeCopied: []
  /** Cuántas cuentas se han creado y matriculado. */
  created: [count: number]
}>()

const { t } = useI18n()
const toast = useToast()
const credentialsStore = useCredentialsSheetStore()

type TabId = 'code' | 'accounts'
const activeTab = ref<TabId>('code')
const tabsId = `invite-${useId()}`.replace(/[^\w-]/g, '-')
const tabs = computed(() => [
  { id: 'code', label: t('common.invite_students_modal.tab_code') },
  { id: 'accounts', label: t('common.invite_students_modal.tab_accounts') },
])

/** Atributos de panel de pestaña; sin pestañas, ninguno. */
function panelAttrs(tab: TabId) {
  if (!props.canCreateAccounts) return {}
  return {
    id: tabPanelId(tabsId, tab),
    role: 'tabpanel',
    'aria-labelledby': tabElementId(tabsId, tab),
  }
}

function selectTab(tab: string) {
  activeTab.value = tab === 'accounts' ? 'accounts' : 'code'
}

type Mode = 'rows' | 'import'
const mode = ref<Mode>('rows')
const modeOptions = computed(() => [
  { value: 'rows' as const, label: t('teacher.classes.detail.accounts.mode_rows') },
  { value: 'import' as const, label: t('teacher.classes.detail.accounts.mode_import') },
])
const MODE_ICONS = { rows: PencilSquareIcon, import: ClipboardDocumentListIcon }
const modeHints = computed<Record<Mode, string>>(() => ({
  rows: t('teacher.classes.detail.accounts.mode_rows_hint'),
  import: t('teacher.classes.detail.accounts.mode_import_hint'),
}))

// Cada vez que se abre, empieza por el código.
watch(
  () => props.modelValue,
  open => {
    if (open) {
      activeTab.value = 'code'
      mode.value = 'rows'
    }
  }
)

/** Las cuentas ya existen: sus contraseñas van a la hoja, que es donde se ven. */
async function onCreated(list: ManagedCredentials[]) {
  credentialsStore.show(props.classId, list)
  emit('created', list.length)
  emit('update:modelValue', false)
  await navigateTo(`/profesor/clases/${props.classId}/credenciales`)
}

const handleCopyCode = async () => {
  try {
    await copyText(props.invitationCode)
    toast.success(t('common.invite_students_modal.code_copied'))
    emit('codeCopied')
  } catch {
    toast.error(t('common.invite_students_modal.copy_error'))
  }
}
</script>
