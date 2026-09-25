<template>
  <!--
    Los dos campos de una contraseña nueva, con el campo oculto de usuario que
    los gestores de contraseñas necesitan para saber a qué cuenta pertenece.
    Lo comparten la pantalla de restablecer con enlace y la del primer acceso.

    El error de cada campo se le pasa al `FormField`, que lo anuncia al aparecer
    y marca el campo como inválido: quien no ve la pantalla se entera de por qué
    no ha salido el envío.
  -->
  <div class="space-y-4">
    <input
      type="text"
      name="username"
      autocomplete="username"
      aria-hidden="true"
      tabindex="-1"
      class="sr-only"
      :value="username ?? ''"
    />

    <FormField
      :id="`${idPrefix}-password`"
      :model-value="password"
      :label="passwordLabel"
      type="password"
      :placeholder="passwordPlaceholder"
      autocomplete="new-password"
      required
      :error-message="passwordError"
      @update:model-value="emit('update:password', String($event))"
    />

    <FormField
      :id="`${idPrefix}-confirm-password`"
      :model-value="confirmPassword"
      :label="confirmLabel"
      type="password"
      :placeholder="confirmPlaceholder"
      autocomplete="new-password"
      required
      :error-message="confirmError"
      @update:model-value="emit('update:confirmPassword', String($event))"
    />
  </div>
</template>

<script setup lang="ts">
withDefaults(
  defineProps<{
    password: string
    confirmPassword: string
    passwordLabel: string
    passwordPlaceholder: string
    confirmLabel: string
    confirmPlaceholder: string
    /** Usuario de la cuenta, para el gestor de contraseñas. */
    username?: string | null
    /** Prefijo de los `id`, para que dos usos en la misma página no choquen. */
    idPrefix?: string
    /** Error de cada campo: lo pinta `FormField`, que lo anuncia y marca el campo. */
    passwordError?: string
    confirmError?: string
  }>(),
  { username: null, idPrefix: 'new', passwordError: '', confirmError: '' }
)

const emit = defineEmits<{
  'update:password': [value: string]
  'update:confirmPassword': [value: string]
}>()
</script>
