<template>
  <Card type="pending">
    <CardHeader :title="t('teacher.analytics.signals.title')" :icon="FlagIcon" />

    <div v-if="loading" class="space-y-3" aria-hidden="true">
      <CardRowSkeleton v-for="i in 3" :key="i" />
    </div>

    <template v-else>
      <SignalList
        :signals="visible"
        :empty-title="t('teacher.analytics.signals.empty_title')"
        :empty-description="t('teacher.analytics.signals.empty_description')"
      />
      <div v-if="signals.length > LIMIT" class="flex justify-center">
        <Button variant="outline" :aria-expanded="expanded" @click="expanded = !expanded">
          {{
            expanded
              ? t('teacher.analytics.signals.show_less')
              : t('teacher.analytics.signals.show_all', { count: signals.length })
          }}
        </Button>
      </div>
    </template>
  </Card>
</template>

<script setup lang="ts">
import { FlagIcon } from '@heroicons/vue/24/outline'
import type { Signal } from '~/components/molecules/SignalList.vue'

/**
 * Las dificultades detectadas, en su tarjeta: las primeras 8 (ya vienen por
 * importancia) y un botón para ver el resto en el sitio, sin paginar.
 */
const props = defineProps<{ signals: Signal[]; loading: boolean }>()

const LIMIT = 8

const { t } = useI18n()

const expanded = ref(false)
const visible = computed(() => (expanded.value ? props.signals : props.signals.slice(0, LIMIT)))
</script>
