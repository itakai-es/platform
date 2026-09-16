<template>
  <!-- La misma forma que las listas ordenables del panel: tarjeta blanca,
       cabecera opcional y filas separadas. -->
  <div class="rounded-2xl bg-white shadow-lg" aria-hidden="true">
    <div v-if="header" class="flex items-center gap-2 border-b border-border-primary px-4 py-3">
      <Skeleton width="w-6" height="h-6" custom-class="rounded-lg" />
      <Skeleton width="w-40" height="h-4" />
    </div>
    <div class="divide-y divide-border-primary">
      <div v-for="i in rows" :key="i" class="flex items-center gap-3 px-4 py-3">
        <div class="min-w-0 flex-1 space-y-2">
          <Skeleton width="w-1/2" height="h-4" />
          <Skeleton width="w-3/4" height="h-3" />
        </div>
        <Skeleton width="w-20" height="h-5" custom-class="hidden rounded-full sm:block" />
        <Skeleton width="w-8" height="h-8" custom-class="rounded-lg" />
        <Skeleton width="w-8" height="h-8" custom-class="rounded-lg" />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
withDefaults(
  defineProps<{
    /** Número de filas. */
    rows?: number
    /** Con la cabecera de grupo (icono y nombre). */
    header?: boolean
  }>(),
  { rows: 4, header: false }
)
</script>
