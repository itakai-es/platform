<template>
  <Card type="settings">
    <div class="p-5">
      <div class="flex items-center gap-3 mb-4">
        <KeyIcon class="w-5 h-5 text-navy-700" />
        <h3 class="text-lg font-bold text-navy-700">
          {{ t('common.change_password.title') }}
        </h3>
      </div>
      <form class="space-y-4" autocomplete="on" novalidate @submit.prevent="submit">
        <FormField
          :id="`${uid}-current`"
          v-model="form.currentPassword"
          :label="t('common.change_password.current_password')"
          type="password"
          autocomplete="current-password"
          required
          :error-message="errors.current"
        />
        <NewPasswordFields
          v-model:password="form.newPassword"
          v-model:confirm-password="form.confirmPassword"
          :id-prefix="uid"
          :username="profileStore.accountLogin"
          :password-label="t('common.change_password.new_password')"
          :password-placeholder="
            t('common.change_password.new_password_placeholder', { min: PASSWORD_MIN_LENGTH })
          "
          :confirm-label="t('common.change_password.confirm_password')"
          :confirm-placeholder="t('common.change_password.confirm_password_placeholder')"
          :password-error="errors.password"
          :confirm-error="errors.confirm"
        />
        <Button type="submit" variant="primary" size="sm" :loading="isSaving">
          {{ t('common.change_password.submit') }}
        </Button>
      </form>
    </div>
  </Card>
</template>

<script setup lang="ts">
import { KeyIcon } from '@heroicons/vue/24/outline'
import { PASSWORD_MIN_LENGTH } from '~/utils/password'

/**
 * Cambio de contraseña del perfil, igual para profesorado y alumnado; gemela de
 * `ChangeEmailCard`. Pide la actual y la nueva dos veces (`NewPasswordFields`,
 * que lleva el campo oculto de usuario para los gestores de contraseñas). Los
 * errores salen junto al campo que los provoca, se anuncian al aparecer
 * (`FormField`) y el foco va al primer campo con error, para que el envío nunca
 * falle en silencio. Al escribir, el error desaparece.
 */

const { t } = useI18n()
const toast = useToast()
const profileStore = useProfileStore()
const uid = useId()

type Field = 'current' | 'password' | 'confirm'

const form = reactive({ currentPassword: '', newPassword: '', confirmPassword: '' })
const errors = reactive<Record<Field, string>>({ current: '', password: '', confirm: '' })
const isSaving = ref(false)

/** `id` de cada campo: el de la actual es de aquí; los otros dos, de `NewPasswordFields`. */
const FIELD_IDS: Record<Field, string> = {
  current: `${uid}-current`,
  password: `${uid}-password`,
  confirm: `${uid}-confirm-password`,
}

// Código del servidor → campo al que pertenece el error y su texto.
const SERVER_ERRORS: Record<string, { field: Field; text: () => string }> = {
  INVALID_PASSWORD: {
    field: 'current',
    text: () => t('common.change_password.errors.current_wrong'),
  },
  PASSWORD_NOT_SET: {
    field: 'current',
    text: () => t('common.change_password.errors.password_not_set'),
  },
}

/** El foco al campo que hay que corregir, cuando ya está pintado su error. */
const focusField = async (field: Field) => {
  await nextTick()
  document.getElementById(FIELD_IDS[field])?.focus()
}

watch(
  () => form.currentPassword,
  () => {
    errors.current = ''
  }
)
watch(
  () => form.newPassword,
  () => {
    errors.password = ''
  }
)
watch(
  () => form.confirmPassword,
  () => {
    errors.confirm = ''
  }
)

/** Devuelve el primer campo con error, o `null` si todo está bien. */
const validate = (): Field | null => {
  errors.current = form.currentPassword ? '' : t('common.change_password.errors.current_required')
  errors.password =
    form.newPassword.length >= PASSWORD_MIN_LENGTH
      ? ''
      : t('common.change_password.errors.too_short', { min: PASSWORD_MIN_LENGTH })
  errors.confirm =
    errors.password || form.newPassword === form.confirmPassword
      ? ''
      : t('common.change_password.errors.mismatch')
  return (['current', 'password', 'confirm'] as const).find(field => errors[field]) ?? null
}

const submit = async () => {
  if (isSaving.value) return
  const invalid = validate()
  if (invalid) {
    void focusField(invalid)
    return
  }

  isSaving.value = true
  const result = await profileStore.changePassword({
    currentPassword: form.currentPassword,
    newPassword: form.newPassword,
  })
  isSaving.value = false

  if (result.success) {
    toast.success(t('common.change_password.success'))
    form.currentPassword = ''
    form.newPassword = ''
    form.confirmPassword = ''
    return
  }

  const known = result.code ? SERVER_ERRORS[result.code] : undefined
  if (known) {
    errors[known.field] = known.text()
    void focusField(known.field)
    return
  }
  toast.error(t('common.change_password.errors.generic'))
}
</script>
