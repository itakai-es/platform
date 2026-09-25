<template>
  <div>
    <div v-if="label" class="flex items-center justify-between mb-2">
      <label :for="id" class="text-sm font-medium text-text-primary">
        {{ label }}
        <span v-if="required" class="text-error">*</span>
      </label>

      <a
        v-if="helpLink && helpText"
        :href="helpLink"
        class="text-[0.8125rem] text-navy-700 link-underline transition-colors"
      >
        {{ helpText }}
      </a>
    </div>

    <Input
      :id="id"
      :model-value="modelValue"
      :type="type"
      :placeholder="placeholder"
      :disabled="disabled"
      :required="required"
      :autocomplete="autocomplete"
      :error="!!errorMessage"
      :aria-invalid="errorMessage ? 'true' : undefined"
      :aria-describedby="describedby"
      @update:model-value="emit('update:modelValue', $event)"
      @blur="emit('blur')"
    />

    <p v-if="errorMessage" :id="messageId" role="alert" class="mt-1 text-sm text-error">
      {{ errorMessage }}
    </p>

    <p v-else-if="hint" :id="messageId" class="mt-1 text-sm text-text-muted">
      {{ hint }}
    </p>
  </div>
</template>

<script setup lang="ts">
/**
 * Un campo de formulario: etiqueta, `Input` y, debajo, una pista o el error.
 *
 * El error y la pista van asociados al campo (`aria-describedby`) y el error se
 * anuncia al aparecer (`role="alert"`), así que quien usa un lector de pantalla
 * se entera de por qué no ha salido el envío sin tener que rastrear el
 * formulario. El campo con error queda marcado con `aria-invalid`.
 */
interface Props {
  id?: string
  label?: string
  modelValue: string | number
  type?: string
  placeholder?: string
  disabled?: boolean
  required?: boolean
  errorMessage?: string
  hint?: string
  helpText?: string // Texto del enlace de ayuda (ej: "¿Olvidaste tu contraseña?")
  helpLink?: string // URL del enlace de ayuda
  autocomplete?: string
}

const props = withDefaults(defineProps<Props>(), {
  type: 'text',
  disabled: false,
  required: false,
})

const emit = defineEmits<{
  'update:modelValue': [value: string | number]
  blur: []
}>()

const messageId = `${useId()}-message`
const describedby = computed(() => (props.errorMessage || props.hint ? messageId : undefined))
</script>
