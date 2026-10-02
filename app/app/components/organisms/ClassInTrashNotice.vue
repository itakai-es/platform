<template>
  <div>
    <Breadcrumb
      :items="[
        { label: t('teacher.classes.detail.breadcrumb_classes'), to: '/profesor/clases' },
        { label: name },
      ]"
    />

    <EmptyState
      :icon="TrashIcon"
      :heading-level="1"
      :title="t('teacher.classes.detail.in_trash.title', { name })"
      :description="
        t('teacher.classes.detail.in_trash.description', {
          date: formatTrashDate(deletedAt, locale),
          purge: formatTrashDate(purgeAt, locale, true),
        })
      "
    >
      <template #action>
        <div class="mx-auto flex max-w-md flex-col items-center gap-4">
          <InfoNote class="text-left">
            {{
              canRestore
                ? t('teacher.classes.detail.in_trash.owner_hint')
                : t('teacher.classes.detail.in_trash.not_owner')
            }}
          </InfoNote>
          <div class="flex w-full flex-col justify-center gap-2 sm:w-auto sm:flex-row">
            <Button
              v-if="canRestore"
              variant="primary"
              :icon-left="ArrowUturnLeftIcon"
              :loading="restoring"
              @click="emit('restore')"
            >
              {{ t('teacher.classes.trash.restore') }}
            </Button>
            <Button v-if="canRestore" variant="outline" to="/profesor/clases/papelera">
              {{ t('teacher.classes.detail.in_trash.go_trash') }}
            </Button>
            <Button v-else variant="outline" to="/profesor/clases">
              {{ t('teacher.classes.detail.btn_back') }}
            </Button>
          </div>
        </div>
      </template>
    </EmptyState>
  </div>
</template>

<script setup lang="ts">
import { ArrowUturnLeftIcon, TrashIcon } from '@heroicons/vue/24/outline'
import { classPurgeAt, formatTrashDate } from '~/utils/class-trash'

/**
 * Lo que se ve al entrar por su dirección en una clase que está en la
 * papelera: no se abre como una clase normal. Quien tiene la propiedad puede
 * restaurarla desde aquí; el resto del profesorado solo ve el aviso.
 */
const props = defineProps<{
  name: string
  deletedAt: string
  canRestore: boolean
  restoring?: boolean
}>()

const emit = defineEmits<{ restore: [] }>()

const { t, locale } = useI18n()

const purgeAt = computed(() => classPurgeAt(props.deletedAt))
</script>
