<template>
  <div class="min-h-screen bg-navy-700 flex items-center justify-center px-4">
    <div class="w-full max-w-md rounded-3xl bg-white p-8 shadow-xl space-y-6">
      <div class="space-y-2 text-center">
        <h1 class="text-3xl font-bold text-navy-700">
          {{ t('auth.change_password.card_title') }}
        </h1>
        <p class="text-navy-700/70">{{ t('auth.change_password.card_subtitle') }}</p>
      </div>

      <InfoNote v-if="username">
        {{ t('auth.change_password.account_note', { username }) }}
      </InfoNote>

      <div
        v-if="errors.general"
        role="alert"
        class="rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700"
      >
        {{ errors.general }}
      </div>

      <form class="space-y-4" @submit.prevent="handleChangePassword">
        <FormField
          id="change-current-password"
          v-model="currentPassword"
          :label="t('auth.change_password.current_password_label')"
          type="password"
          :placeholder="t('auth.change_password.current_password_placeholder')"
          autocomplete="current-password"
          required
          :error-message="errors.current"
        />

        <NewPasswordFields
          v-model:password="password"
          v-model:confirm-password="confirmPassword"
          id-prefix="change"
          :username="username"
          :password-label="t('auth.change_password.password_label')"
          :password-placeholder="
            t('auth.change_password.password_placeholder', { min: PASSWORD_MIN_LENGTH })
          "
          :confirm-label="t('auth.change_password.confirm_password_label')"
          :confirm-placeholder="t('auth.change_password.confirm_password_placeholder')"
          :password-error="errors.password"
          :confirm-error="errors.confirm"
        />

        <Button variant="primary" size="lg" class="w-full" :loading="isLoading" type="submit">
          {{
            isLoading
              ? t('auth.change_password.submit_loading')
              : t('auth.change_password.submit_button')
          }}
        </Button>
      </form>

      <!--
        La única salida sin cambiar la contraseña: si la sesión abierta no es la
        de quien está delante (un portátil compartido, una temporal equivocada),
        se sale de aquí y se vuelve a entrar.
      -->
      <button
        type="button"
        class="block w-full text-center text-sm font-medium text-purple hover:text-purple-dark"
        @click="handleLogout"
      >
        {{ t('auth.change_password.logout') }}
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
/**
 * Cambio de contraseña obligatorio del primer acceso. Mientras esté pendiente,
 * el servidor no deja hacer nada más con esa sesión: la contraseña actual es la
 * temporal que dio el profesorado, y de aquí solo se sale cambiándola o saliendo
 * de la cuenta.
 *
 * Los errores van junto al campo que los provoca, así que `FormField` los anuncia
 * y marca el campo; el foco va al primero que haya que corregir, y al cargar la
 * pantalla, a la contraseña temporal.
 */
import { PASSWORD_MIN_LENGTH } from '~/utils/password'
import { getDashboardByRole } from '~/utils/navigation'

const { t } = useI18n()
const router = useRouter()
const authStore = useAuthStore()
const profileStore = useProfileStore()
const logout = useLogout()
const toast = useToast()

definePageMeta({
  layout: 'auth',
  middleware: 'auth',
})

useHead(() => ({
  title: t('auth.change_password.page_title'),
  meta: [{ name: 'description', content: t('auth.change_password.page_description') }],
}))

const currentPassword = ref('')
const password = ref('')
const confirmPassword = ref('')
const isLoading = ref(false)
const errors = reactive({ current: '', password: '', confirm: '', general: '' })

const username = computed(() => authStore.user?.username ?? null)

/** Al escribir desaparece el error del campo: el aviso es de lo que se envió. */
watch(currentPassword, () => {
  errors.current = ''
})
watch(password, () => {
  errors.password = ''
})
watch(confirmPassword, () => {
  errors.confirm = ''
})

/** El foco al campo que hay que corregir, cuando ya está pintado su error. */
const focusField = async (id: string) => {
  await nextTick()
  document.getElementById(id)?.focus()
}

// Al llegar aquí desde otra pantalla el foco se queda donde estaba: se trae.
onMounted(() => {
  void focusField('change-current-password')
})

async function handleChangePassword() {
  errors.general = ''

  if (!currentPassword.value) {
    errors.current = t('auth.change_password.validation.current_password_required')
    void focusField('change-current-password')
    return
  }

  if (password.value.length < PASSWORD_MIN_LENGTH) {
    errors.password = t('auth.change_password.validation.password_too_short', {
      min: PASSWORD_MIN_LENGTH,
    })
    void focusField('change-password')
    return
  }

  if (password.value !== confirmPassword.value) {
    errors.confirm = t('auth.change_password.validation.passwords_dont_match')
    void focusField('change-confirm-password')
    return
  }

  isLoading.value = true
  const result = await profileStore.changePassword({
    currentPassword: currentPassword.value,
    newPassword: password.value,
  })
  isLoading.value = false

  if (!result.success) {
    errors.general = t('auth.change_password.validation.change_error')
    return
  }

  authStore.markPasswordChanged()
  toast.success(t('auth.change_password.validation.success'))
  await router.replace(getDashboardByRole(authStore.user?.role ?? ''))
}

async function handleLogout() {
  await logout()
}
</script>
