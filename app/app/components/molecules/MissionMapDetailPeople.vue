<template>
  <!-- Quién ha completado la misión: sus avatares, unos sobre otros, y «+N»
       con el resto. Cada avatar dice el nombre al lector de pantalla y, al
       pasar el ratón, en su `title`. -->
  <ul class="flex items-center" :aria-label="t('common.mission_map.detail.completed_list')">
    <li
      v-for="person in stack.shown"
      :key="person.id"
      class="-ml-2 rounded-full ring-2 ring-white first:ml-0"
      :title="person.name"
    >
      <Avatar
        :src="person.avatar"
        :name="person.name"
        :seed="person.seed"
        :label="person.name"
        size="xs"
      />
    </li>
    <li
      v-if="stack.more > 0"
      class="-ml-2 flex h-9 min-w-[2.25rem] items-center justify-center rounded-full bg-navy-700 px-1.5 text-xs font-bold text-white ring-2 ring-white first:ml-0"
      :title="rest"
    >
      <span aria-hidden="true">+{{ stack.more }}</span>
      <span class="sr-only">{{
        t('common.mission_map.detail.completed_more', { n: stack.more })
      }}</span>
    </li>
  </ul>
</template>

<script setup lang="ts">
import { avatarStack, type MapPerson } from '~/utils/mission-map'
import { formatConjunction } from '~/utils/list-format'

/**
 * Profesorado, en el detalle de una misión del mapa (MissionMapDetail): los
 * avatares de quien la ha completado, como mucho ocho (si hay más, siete y
 * «+N», que dice al pasar el ratón quiénes son).
 */
const props = defineProps<{ people: MapPerson[] }>()

const { t, locale } = useI18n()

const stack = computed(() => avatarStack(props.people))
/** Los nombres que no caben, unidos como en el idioma de la app. */
const rest = computed(() =>
  formatConjunction(
    props.people.slice(stack.value.shown.length).map(person => person.name),
    locale.value,
    t('common.mission_map.and')
  )
)
</script>
