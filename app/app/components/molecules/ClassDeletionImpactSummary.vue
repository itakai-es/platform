<template>
  <div>
    <!-- Regiones vivas que existen desde que se abre: el lector de pantalla
         dice que se está calculando, lee los números al llegar y avisa del
         error (que es también por qué el botón de confirmar sigue desactivado). -->
    <div role="alert">
      <div v-if="error" class="space-y-3 text-left">
        <InfoNote>{{
          t('teacher.classes.detail.settings.management.trash.impact_error')
        }}</InfoNote>
        <Button type="button" variant="outline" size="sm" @click="emit('retry')">
          {{ t('teacher.classes.detail.settings.management.trash.retry') }}
        </Button>
      </div>
    </div>

    <div role="status">
      <div v-if="loading" class="space-y-2">
        <span class="sr-only">{{
          t('teacher.classes.detail.settings.management.trash.impact_loading')
        }}</span>
        <Skeleton height="h-4" width="w-1/2" aria-hidden="true" />
        <Skeleton height="h-4" aria-hidden="true" />
        <Skeleton height="h-4" width="w-3/4" aria-hidden="true" />
      </div>

      <div v-else-if="impact" class="space-y-3 text-left text-sm text-navy-700">
        <p class="font-semibold">{{ heading }}</p>
        <ul class="list-disc space-y-1 pl-5">
          <li v-for="item in losses" :key="item">{{ item }}</li>
        </ul>
        <slot />
        <InfoNote v-if="impact.managedAccounts.unmanaged > 0">
          {{
            t(
              'teacher.classes.detail.settings.management.trash.unmanaged_accounts',
              { count: impact.managedAccounts.unmanaged },
              impact.managedAccounts.unmanaged
            )
          }}
        </InfoNote>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { ClassDeletionImpact } from '~/types/class.types'

/**
 * Lo que se pierde al borrar una clase, con los números de `deletion-impact`
 * (ver `useClassDeletionImpact`): mientras se calcula, si falla y, al llegar,
 * la lista y el aviso de las cuentas sin correo que se quedan sin clase de
 * origen. Lo comparten enviarla a la papelera (`ClassTrashAction`) y borrarla
 * ya desde ella (`ClassPurgeConfirm`); cada uno pone su encabezado y, en el
 * hueco, sus propias notas.
 */
const props = defineProps<{
  impact: ClassDeletionImpact | null
  loading: boolean
  error: boolean
  /** Lo que va antes de la lista: cuándo se borra. */
  heading: string
}>()

const emit = defineEmits<{ retry: [] }>()

const { t } = useI18n()

/** Lo que se pierde: la clase siempre; lo demás, solo si hay. */
const losses = computed(() => {
  const i = props.impact
  if (!i) return []
  const list = [t('teacher.classes.detail.settings.management.trash.loses_class')]
  const { missions, students, submissionsWithFile: files, shopPurchases: purchases } = i
  const accounts = i.managedAccounts.deleted
  if (missions)
    list.push(
      t(
        'teacher.classes.detail.settings.management.trash.loses_missions',
        { count: missions },
        missions
      )
    )
  if (students)
    list.push(
      t(
        'teacher.classes.detail.settings.management.trash.loses_students',
        { count: students },
        students
      )
    )
  if (files)
    list.push(
      t(
        'teacher.classes.detail.settings.management.trash.loses_submissions',
        { count: files },
        files
      )
    )
  if (purchases)
    list.push(
      t(
        'teacher.classes.detail.settings.management.trash.loses_purchases',
        { count: purchases },
        purchases
      )
    )
  if (accounts)
    list.push(
      t(
        'teacher.classes.detail.settings.management.trash.loses_accounts',
        { count: accounts },
        accounts
      )
    )
  return list
})
</script>
