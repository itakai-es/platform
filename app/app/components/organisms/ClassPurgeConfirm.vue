<template>
  <!-- Borrar ya: qué se pierde y que no hay vuelta atrás -->
  <ConfirmModal
    :model-value="modelValue"
    :title="t('teacher.classes.trash.purge.modal_title')"
    :message="target ? t('teacher.classes.trash.purge.message', { name: target.name }) : ''"
    :confirm-text="t('teacher.classes.trash.purge.confirm')"
    variant="danger"
    :loading="busy"
    :confirm-disabled="!impact || !understood"
    @update:model-value="emit('update:modelValue', $event)"
    @confirm="confirmPurge"
  >
    <ClassDeletionImpactSummary
      :impact="impact"
      :loading="loading"
      :error="error"
      :heading="t('teacher.classes.trash.purge.loses')"
      @retry="loadImpact"
    />
    <!-- Confirmación reforzada: la clase ya no pasa por la papelera, y el botón
         está junto a «Restaurar», en la misma fila. -->
    <Checkbox
      v-if="impact"
      :id="checkboxId"
      v-model="understood"
      class="mt-4 text-left"
      :label="t('teacher.classes.trash.purge.understood')"
    />
  </ConfirmModal>
</template>

<script setup lang="ts">
import type { ClassTrashListItem } from '~/types/class.types'

/**
 * Borrar ya, para siempre, una clase de la papelera, sin esperar a que acabe su
 * plazo: el aviso con lo que se pierde (los mismos números que al enviarla a la
 * papelera) y una casilla que hay que marcar, porque no hay vuelta atrás. El
 * aviso no dice cuántos días: a cada clase le quedan los suyos. Lo ofrecen la
 * página de la papelera, que solo lista las clases propias (es de quien es
 * propietario, `class.purge`), y, con `scope: 'admin'`, la papelera de toda la
 * instancia en el panel de administración.
 */
const props = withDefaults(
  defineProps<{
    modelValue: boolean
    /** La clase que se va a borrar; null mientras no hay ninguna elegida. */
    target: Pick<ClassTrashListItem, 'id' | 'name'> | null
    /** De quién es la papelera: la propia del profesorado o la de administración. */
    scope?: 'teacher' | 'admin'
  }>(),
  { scope: 'teacher' }
)

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  purged: [cls: Pick<ClassTrashListItem, 'id' | 'name'>]
}>()

const { t } = useI18n()
const toast = useToast()
const purge =
  props.scope === 'admin' ? useAdminStore().purgeTrashedClass : useTeacherStore().purgeClass
const { impact, loading, error, load } = useClassDeletionImpact(props.scope)

const busy = ref(false)
const understood = ref(false)
const checkboxId = useId()

const loadImpact = () => (props.target ? load(props.target.id) : undefined)

// Cada apertura empieza de cero: números nuevos y la casilla sin marcar.
watch(
  () => props.modelValue,
  open => {
    if (!open) return
    understood.value = false
    void loadImpact()
  }
)

async function confirmPurge() {
  const cls = props.target
  if (!cls || busy.value) return
  busy.value = true
  try {
    await purge(cls.id)
    emit('update:modelValue', false)
    toast.success(t('teacher.classes.trash.purge.done', { name: cls.name }), { duration: 6000 })
    emit('purged', cls)
  } catch (err) {
    const message = (err as { data?: { message?: string } })?.data?.message
    toast.error(message || t('teacher.classes.trash.purge.error'))
  } finally {
    busy.value = false
  }
}
</script>
