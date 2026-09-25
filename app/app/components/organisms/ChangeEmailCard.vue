<template>
  <Card type="settings">
    <div class="p-5">
      <div class="flex items-center gap-3 mb-4">
        <EnvelopeIcon class="w-5 h-5 text-navy-700" />
        <h3 class="text-lg font-bold text-navy-700">
          {{ t('common.change_email.title') }}
        </h3>
      </div>
      <form class="space-y-4" autocomplete="on" novalidate @submit.prevent="submit">
        <FormField
          :id="`${uid}-current`"
          :label="t('common.change_email.current_email')"
          :model-value="profileStore.currentEmail"
          type="email"
          autocomplete="username"
          disabled
        />
        <FormField
          :id="`${uid}-new`"
          v-model="form.newEmail"
          :label="t('common.change_email.new_email')"
          type="email"
          autocomplete="off"
          required
          :error-message="errors.newEmail"
        />
        <FormField
          :id="`${uid}-password`"
          v-model="form.password"
          :label="t('common.change_email.password')"
          type="password"
          autocomplete="current-password"
          required
          :error-message="errors.password"
          :hint="t('common.change_email.password_hint')"
        />
        <Button type="submit" variant="primary" size="sm" :loading="isSaving">
          {{ t('common.change_email.submit') }}
        </Button>
      </form>
    </div>
  </Card>
</template>

<script setup lang="ts">
import { EnvelopeIcon } from '@heroicons/vue/24/outline'

/**
 * Cambio de correo del perfil, igual para profesorado y alumnado. El correo es
 * con lo que se entra y se recupera la cuenta, así que el cambio pide la
 * contraseña actual. Los errores salen junto al campo que los provoca, se
 * anuncian al aparecer (`FormField`) y el foco va al primer campo con error,
 * para que el envío nunca falle en silencio. Al escribir, el error desaparece.
 */

const { t } = useI18n()
const toast = useToast()
const profileStore = useProfileStore()
const uid = useId()

const form = reactive({ newEmail: '', password: '' })
const errors = reactive({ newEmail: '', password: '' })
const isSaving = ref(false)

// Código del servidor → campo al que pertenece el error y su texto.
const SERVER_ERRORS: Record<string, { field: keyof typeof errors; text: () => string }> = {
  PASSWORD_REQUIRED: {
    field: 'password',
    text: () => t('common.change_email.errors.password_required'),
  },
  INVALID_PASSWORD: {
    field: 'password',
    text: () => t('common.change_email.errors.password_wrong'),
  },
  PASSWORD_NOT_SET: {
    field: 'password',
    text: () => t('common.change_email.errors.password_not_set'),
  },
  EMAIL_IN_USE: {
    field: 'newEmail',
    text: () => t('common.change_email.errors.email_in_use'),
  },
}

/** El foco al campo que hay que corregir, cuando ya está pintado su error. */
const focusField = async (field: keyof typeof errors) => {
  await nextTick()
  document.getElementById(`${uid}-${field === 'password' ? 'password' : 'new'}`)?.focus()
}

watch(
  () => form.newEmail,
  () => {
    errors.newEmail = ''
  }
)
watch(
  () => form.password,
  () => {
    errors.password = ''
  }
)

const validate = () => {
  const email = form.newEmail.trim()
  errors.newEmail = /^\S+@\S+\.\S+$/.test(email)
    ? ''
    : t('common.change_email.errors.email_invalid')
  if (!errors.newEmail && email.toLowerCase() === profileStore.currentEmail.toLowerCase()) {
    errors.newEmail = t('common.change_email.errors.email_same')
  }
  errors.password = form.password ? '' : t('common.change_email.errors.password_required')
  return !errors.newEmail && !errors.password
}

const submit = async () => {
  if (isSaving.value) return
  if (!validate()) {
    void focusField(errors.newEmail ? 'newEmail' : 'password')
    return
  }

  isSaving.value = true
  const result = await profileStore.changeEmail({
    newEmail: form.newEmail.trim(),
    password: form.password,
  })
  isSaving.value = false

  if (result.success) {
    toast.success(t('common.change_email.success'))
    form.newEmail = ''
    form.password = ''
    return
  }

  const known = result.code ? SERVER_ERRORS[result.code] : undefined
  if (known) {
    errors[known.field] = known.text()
    void focusField(known.field)
    return
  }
  toast.error(t('common.change_email.errors.generic'))
}
</script>
