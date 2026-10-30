<template>
  <!-- Solo dibujo: el medallón ya lo dice con `aria-current`. -->
  <span
    class="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full bg-white py-0.5 pl-0.5 pr-2.5 text-xs font-bold text-navy-700 shadow-lg ring-2 ring-purple"
    aria-hidden="true"
  >
    <Avatar :src="you?.avatar" :seed="you?.seed" :name="you?.name" :size="size" />
    {{ t('common.mission_map.you_are_here') }}
  </span>
</template>

<script setup lang="ts">
/**
 * «Estás aquí», con el avatar del estudiante: en el mapa de misiones, encima
 * del medallón de su misión (tablero) o encima de su título (columna del
 * móvil). Lo pinta MissionMap.vue.
 */
withDefaults(
  defineProps<{
    you?: { avatar?: string | null; seed: string; name?: string | null } | null
    size?: 'xxs' | 'xs'
  }>(),
  { you: null, size: 'xs' }
)

const { t } = useI18n()
</script>
