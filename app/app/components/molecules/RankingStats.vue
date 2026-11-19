<template>
  <!-- Las medias de la clase, junto al podio en la clasificación completa -->
  <Card type="stats" flex>
    <CardHeader :title="title" :icon="ChartPieIcon" />

    <CardGrid cols="2x2" flex>
      <StatTile
        v-for="(item, index) in items"
        :key="item.key"
        surface="item"
        size="sm"
        :class="items.length % 2 === 1 && index === items.length - 1 ? 'col-span-2' : ''"
        :label="item.label"
        :value="item.value"
      />
    </CardGrid>
  </Card>
</template>

<script setup lang="ts">
import { ChartPieIcon } from '@heroicons/vue/24/outline'

/** Las cifras de una clasificación: una pieza de `ClassRankingSection`. */
defineProps<{
  title: string
  items: { key: string; value: string; label: string }[]
}>()
</script>
