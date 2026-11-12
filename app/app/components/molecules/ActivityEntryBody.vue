<template>
  <div class="text-sm text-navy-700">
    <p>
      <!-- Una entrada que no es del muro (la asistencia): su icono delante del texto,
           salvo en la línea de tiempo, donde va en su punto -->
      <component
        :is="activity.icon"
        v-if="activity.icon && inlineIcon"
        class="mr-1 inline-block h-4 w-4 align-text-bottom"
        :class="activity.iconClass"
        aria-hidden="true"
      />
      <!-- Hover sobre el nickname → avatar como tooltip. Si hay studentId, además
           el nickname es un NuxtLink al perfil del alumno en la vista de profesor. -->
      <Tooltip v-if="activity.username && showAvatar" variant="light">
        <template #content>
          <Avatar
            :src="activity.avatar"
            :name="activity.username"
            :seed="activity.avatarSeed"
            size="md"
          />
        </template>
        <NuxtLink
          v-if="activity.studentId"
          :to="studentLink(activity)"
          class="font-semibold hover:underline"
          >{{ activity.username }}</NuxtLink
        >
        <span v-else class="font-semibold cursor-default">{{ activity.username }}</span>
        <span>&nbsp;</span>
      </Tooltip>
      <NuxtLink
        v-else-if="activity.username && activity.studentId"
        :to="studentLink(activity)"
        class="font-semibold hover:underline"
        >{{ activity.username }}&nbsp;</NuxtLink
      >
      <span v-else-if="activity.username" class="font-semibold"
        >{{ activity.username }}&nbsp;</span
      >
      <span v-html="activity.description"></span>
    </p>
    <!-- Un dato más, en texto plano (la nota de una falta) -->
    <p v-if="activity.detail" class="mt-1 text-xs text-navy-700/80">{{ activity.detail }}</p>
    <!-- Quién lo hizo (aprobó, aplicó…), con su avatar -->
    <p v-if="activity.actor" class="mt-1 flex items-center gap-1.5 text-xs text-navy-700/70">
      <!-- Las entradas antiguas solo guardan el nombre: sin id, el color no sería
           el suyo, así que van sin círculo -->
      <Avatar
        v-if="activity.actor.id || activity.actor.avatar"
        :avatar-key="activity.actor.avatar"
        :seed="activity.actor.id"
        :name="activity.actor.name"
        size="xxs"
      />
      <span class="min-w-0 break-words">{{
        t('student.components.recent_activity_card.by_actor', { name: activity.actor.name })
      }}</span>
    </p>
    <!-- Recursos que suma o quita: icono y número en azul marino, con su signo -->
    <div v-if="activity.resources?.length" class="mt-1.5 flex flex-wrap items-center gap-3">
      <Tooltip
        v-for="r in activity.resources"
        :key="r.kind"
        :text="t(`common.resources.${chipKey(r.kind)}`)"
      >
        <span class="inline-flex items-center gap-1 text-sm font-semibold text-navy-700">
          <CoinIcon v-if="r.kind === 'coin'" class="h-3.5 w-3.5" />
          <XpIcon v-else-if="r.kind === 'xp'" class="h-3.5 w-3.5" />
          <ManaIcon v-else-if="r.kind === 'mana'" class="h-3.5 w-3.5" />
          <LifeIcon v-else-if="r.kind === 'life'" class="h-3.5 w-3.5" />
          <span class="sr-only">{{ t(`common.resources.${chipKey(r.kind)}`) }}:</span>
          <span>{{ r.positive ? '+' : '−' }}{{ r.amount }}</span>
        </span>
      </Tooltip>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { ActivityItem } from '~/components/organisms/RecentActivityCard.vue'
import type { ResourceDelta } from '~/composables/useActivityFormatter'

/**
 * Lo que dice una entrada de actividad (quién, qué, la nota, quién la hizo y lo
 * que sumó o quitó): lo mismo en las tarjetas de «Actividad reciente» y en la
 * línea de tiempo del historial de un estudiante (`RecentActivityCard`).
 *
 * - `showAvatar`: el avatar de la persona al pasar por su nombre.
 * - `inlineIcon`: el icono propio de la entrada (la asistencia) delante del
 *   texto; en la línea de tiempo va en su punto, no aquí.
 */
withDefaults(
  defineProps<{ activity: ActivityItem; showAvatar?: boolean; inlineIcon?: boolean }>(),
  { showAvatar: true, inlineIcon: true }
)

const { t } = useI18n()

/** La página del estudiante dentro de su clase; sin clase, su ficha global. */
const studentLink = (activity: ActivityItem) =>
  activity.classId
    ? `/profesor/clases/${activity.classId}/alumnos/${activity.studentId}`
    : `/profesor/alumnos/${activity.studentId}`

const chipKey = (kind: ResourceDelta['kind']): string => {
  if (kind === 'coin') return 'coins'
  if (kind === 'life') return 'lives'
  return kind
}
</script>
