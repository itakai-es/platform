<template>
  <!--
    Tarjeta blanca centrada sobre navy de las pantallas de cuenta que no son el
    formulario de entrada: restablecer o cambiar la contraseña, o un enlace de
    fichero que ya no vale. El fondo liso tapa la onda del layout `auth`, y el
    pt-16 deja libre la franja de idioma y accesibilidad que ese layout flota.
  -->
  <div class="min-h-screen bg-navy-700 flex items-center justify-center px-4 pt-16 pb-6">
    <div class="w-full max-w-md rounded-3xl bg-white p-8 shadow-xl space-y-6">
      <div class="space-y-2 text-center">
        <h1 class="text-3xl font-bold text-navy-700">{{ title }}</h1>
        <p v-if="subtitle" class="text-navy-700/70">{{ subtitle }}</p>
      </div>

      <!-- Lo que no es de ningún campo (un fallo del servidor, un enlace caducado). -->
      <div v-if="error" role="alert" class="rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700">
        {{ error }}
      </div>

      <slot />

      <!-- Salida de la pantalla: volver al login, salir de la cuenta… -->
      <div v-if="$slots.footer" class="text-center text-sm font-medium">
        <slot name="footer" />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
withDefaults(
  defineProps<{
    title: string
    subtitle?: string
    /** Error general, anunciado como alerta. Vacío, no se pinta. */
    error?: string
  }>(),
  { subtitle: '', error: '' }
)
</script>
