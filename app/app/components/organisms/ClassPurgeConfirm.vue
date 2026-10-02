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
import type { TrashedClass } from '~/types/class.types'

/**
 * Borrar ya, para siempre, una clase de la papelera, sin esperar a que acabe su
 * plazo: el aviso con lo que se pierde (los mismos números que al enviarla a la
 * papelera) y una casilla que hay que marcar, porque no hay vuelta atrás. El
 * aviso no dice cuántos días: a cada clase le quedan los suyos. Solo lo ofrece la página de la papelera, que solo lista las
 * clases propias: es de quien es propietario (`class.purge`).
 */
const props = defineProps<{
  modelValue: boolean
  /** La clase que se va a borrar; null mientras no hay ninguna elegida. */
  target: Pick<TrashedClass, 'id' | 'name'> | null
}>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  purged: [cls: Pick<TrashedClass, 'id' | 'name'>]
}>()

const { t } = useI18n()
const toast = useToast()
const teacherStore = useTeacherStore()
const { impact, loading, error, load } = useClassDeletionImpact()

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
    await teacherStore.purgeClass(cls.id)
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
