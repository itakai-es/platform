<template>
  <Modal
    :model-value="modelValue"
    size="md"
    :title="t('teacher.classes.index.duplicate.title')"
    @update:model-value="emit('update:modelValue', $event)"
  >
    <p class="text-sm text-text-secondary">
      {{ t('teacher.classes.index.duplicate.subtitle', { name: className }) }}
    </p>

    <div class="mt-4 space-y-2">
      <div
        v-for="row in rows"
        :key="row.key"
        class="flex items-center gap-3 rounded-2xl border border-border-primary p-3"
      >
        <span
          class="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-navy-700/5 text-navy-700"
        >
          <component :is="row.icon" class="h-5 w-5" />
        </span>
        <div class="min-w-0 flex-1">
          <p class="font-semibold leading-tight text-navy-700">
            {{ t(`teacher.classes.index.duplicate.items.${row.key}.label`) }}
          </p>
          <p class="mt-0.5 text-xs text-text-secondary">
            {{ t(`teacher.classes.index.duplicate.items.${row.key}.desc`) }}
          </p>
        </div>
        <Toggle v-model="selected[row.key]" />
      </div>
    </div>

    <template #footer>
      <Button variant="outline" :disabled="loading" @click="emit('update:modelValue', false)">
        {{ t('teacher.classes.index.duplicate.cancel') }}
      </Button>
      <Button variant="primary" :loading="loading" @click="confirm">
        {{ t('teacher.classes.index.duplicate.confirm') }}
      </Button>
    </template>
  </Modal>
</template>

<script setup lang="ts">
import {
  BookOpenIcon,
  Cog6ToothIcon,
  ShoppingBagIcon,
  HandRaisedIcon,
  FlagIcon,
} from '@heroicons/vue/24/outline'

export interface DuplicateOptions {
  narrative: boolean
  features: boolean
  shop: boolean
  behaviors: boolean
  missions: boolean
}

const props = defineProps<{
  modelValue: boolean
  className?: string
  loading?: boolean
}>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  confirm: [options: DuplicateOptions]
}>()

const { t } = useI18n()

// Misiones va primero: es lo que motivó el modal (copiar el contenido de verdad).
const rows = [
  { key: 'missions', icon: FlagIcon },
  { key: 'narrative', icon: BookOpenIcon },
  { key: 'features', icon: Cog6ToothIcon },
  { key: 'shop', icon: ShoppingBagIcon },
  { key: 'behaviors', icon: HandRaisedIcon },
] as const

const fullCopy = (): DuplicateOptions => ({
  narrative: true,
  features: true,
  shop: true,
  behaviors: true,
  missions: true,
})

const selected = ref<DuplicateOptions>(fullCopy())

// Cada vez que se abre, resetea a copia completa (todo marcado).
watch(
  () => props.modelValue,
  open => {
    if (open) selected.value = fullCopy()
  }
)

function confirm() {
  emit('confirm', { ...selected.value })
}
</script>
