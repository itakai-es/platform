<template>
  <AuthCardShell
    :title="t('auth.reset_password.card_title')"
    :subtitle="t('auth.reset_password.card_subtitle')"
    :error="errorMessage"
  >
    <div
      v-if="successMessage"
      role="status"
      class="rounded-2xl bg-green-50 px-4 py-3 text-sm text-green-700"
    >
      {{ successMessage }}
    </div>

    <form class="space-y-4" novalidate @submit.prevent="handleResetPassword">
      <NewPasswordFields
        v-model:password="password"
        v-model:confirm-password="confirmPassword"
        id-prefix="reset"
        :password-label="t('auth.reset_password.password_label')"
        :password-placeholder="
          t('auth.reset_password.password_placeholder', { min: PASSWORD_MIN_LENGTH })
        "
        :confirm-label="t('auth.reset_password.confirm_password_label')"
        :confirm-placeholder="t('auth.reset_password.confirm_password_placeholder')"
        :password-error="fieldErrors.password"
        :confirm-error="fieldErrors.confirm"
      />

      <Button variant="primary" size="lg" class="w-full" :loading="isLoading" type="submit">
        {{
          isLoading
            ? t('auth.reset_password.submit_loading')
            : t('auth.reset_password.submit_button')
        }}
      </Button>
    </form>

    <template #footer>
      <NuxtLink to="/auth/login" class="text-purple hover:text-purple-dark">
        {{ t('auth.reset_password.back_to_login') }}
      </NuxtLink>
    </template>
  </AuthCardShell>
</template>

<script setup lang="ts">
/**
 * Contraseña nueva desde el enlace del correo. Lo que falla en un campo sale
 * junto a ese campo, que es lo que `FormField` anuncia y marca; lo que no es de
 * ningún campo (el enlace caducado, un fallo del servidor) sale arriba, en un
 * bloque que también se anuncia.
 */
import { PASSWORD_MIN_LENGTH } from '~/utils/password'

const { t } = useI18n()
const route = useRoute()
const authStore = useAuthStore()

definePageMeta({
  layout: 'auth',
  middleware: 'guest',
})

useHead(() => ({
  title: t('auth.reset_password.page_title'),
  meta: [{ name: 'description', content: t('auth.reset_password.page_description') }],
}))

const password = ref('')
const confirmPassword = ref('')
const isLoading = ref(false)
const errorMessage = ref('')
const successMessage = ref('')
const fieldErrors = reactive({ password: '', confirm: '' })

/** Al escribir desaparece el error del campo: el aviso es de lo que se envió. */
watch(password, () => {
  fieldErrors.password = ''
})
watch(confirmPassword, () => {
  fieldErrors.confirm = ''
})

/** El foco al campo que hay que corregir, cuando ya está pintado su error. */
const focusField = async (id: string) => {
  await nextTick()
  document.getElementById(id)?.focus()
}

onMounted(() => {
  void focusField('reset-password')
})

async function handleResetPassword() {
  errorMessage.value = ''
  successMessage.value = ''

  const token = typeof route.query.token === 'string' ? route.query.token : ''
  if (!token) {
    errorMessage.value = t('auth.reset_password.validation.token_missing')
    return
  }

  if (password.value.length < PASSWORD_MIN_LENGTH) {
    fieldErrors.password = t('auth.reset_password.validation.password_too_short', {
      min: PASSWORD_MIN_LENGTH,
    })
    void focusField('reset-password')
    return
  }

  if (password.value !== confirmPassword.value) {
    fieldErrors.confirm = t('auth.reset_password.validation.passwords_dont_match')
    void focusField('reset-confirm-password')
    return
  }

  try {
    isLoading.value = true
    await authStore.resetPassword(token, password.value)

    // Always use the i18n message (backend message is fixed Spanish, ignore it)
    successMessage.value = t('auth.reset_password.validation.success')
    password.value = ''
    confirmPassword.value = ''
  } catch (error: any) {
    void error
    errorMessage.value = t('auth.reset_password.validation.reset_error')
  } finally {
    isLoading.value = false
  }
}
</script>
