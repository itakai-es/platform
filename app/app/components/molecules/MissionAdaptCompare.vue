<template>
  <!-- Una parte de la misión (el título, la historia o un enigma): lo de ahora
       al lado de lo propuesto; en móvil, uno debajo del otro. -->
  <section class="rounded-2xl border border-border-primary p-4">
    <div class="flex flex-wrap items-center justify-between gap-2">
      <h3 class="text-sm font-bold text-navy-700">{{ label }}</h3>
      <span
        v-if="status"
        class="rounded-full px-2.5 py-0.5 text-xs font-semibold"
        :class="statusClass"
        >{{ status }}</span
      >
    </div>
    <div class="mt-3 grid gap-3 sm:grid-cols-2">
      <div v-if="$slots.current" class="min-w-0">
        <p class="text-xs font-semibold text-navy-700/70">
          {{ t('teacher.missions.adapt.current') }}
        </p>
        <div class="mt-1 text-sm"><slot name="current" /></div>
      </div>
      <div v-if="$slots.proposed" class="min-w-0 rounded-xl bg-navy-700/5 p-3">
        <p class="text-xs font-semibold text-navy-700/70">
          {{ t('teacher.missions.adapt.proposed') }}
        </p>
        <div class="mt-1 text-sm"><slot name="proposed" /></div>
      </div>
    </div>
    <slot />
  </section>
</template>

<script setup lang="ts">
/**
 * Comparación «Ahora» ↔ «Propuesta» de una parte de la misión en la ventana
 * de adaptar con IA. Si una de las dos columnas no tiene nada (un enigma
 * nuevo, uno que se borra) no se pinta. `status` es una etiqueta corta junto
 * al nombre: «Sin cambios», «Enigma nuevo», «Se eliminará»…
 */
const props = defineProps<{
  label: string
  status?: string
  /** Tono de la etiqueta: neutro, novedad o aviso. */
  tone?: 'neutral' | 'new' | 'warning'
}>()

const { t } = useI18n()

const statusClass = computed(
  () =>
    ({
      neutral: 'bg-gray-100 text-navy-700',
      new: 'bg-mint/20 text-navy-700',
      warning: 'bg-yellow/30 text-navy-700',
    })[props.tone ?? 'neutral']
)
</script>
