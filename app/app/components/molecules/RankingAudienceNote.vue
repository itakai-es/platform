<template>
  <InfoNote>{{ text }}</InfoNote>
</template>

<script setup lang="ts">
import type { RankingAudience } from '~/types/ranking.types'
import type { RankingType } from '~/utils/ranking-config'

/**
 * Lo que ve el alumnado de lo que el profesorado está mirando, que siempre es el
 * ranking completo: «Tu alumnado ve: los 5 primeros y su puesto».
 */
const props = defineProps<{
  audience: RankingAudience
  type: RankingType
}>()

const { t } = useI18n()

const text = computed(() => {
  const { rankings, types, mode, topN } = props.audience
  const tr = (key: string, params: Record<string, unknown> = {}) =>
    t(`teacher.classes.detail.ranking.${key}`, params)
  if (!rankings) return tr('hidden_from_students')
  if (!types.includes(props.type)) return tr('audience_type_off')
  // Los equipos se ven enteros en todos los modos: nadie queda señalado.
  if (props.type === 'teams') return tr('audience_teams')
  if (mode === 'top') return tr('audience_top', { n: topN })
  return mode === 'position' ? tr('audience_position') : tr('audience_full')
})
</script>
