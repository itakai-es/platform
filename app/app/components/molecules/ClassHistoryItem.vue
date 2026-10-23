<template>
  <li class="flex items-start gap-3 py-3">
    <Avatar
      :src="entry.actor.avatar ?? undefined"
      :username="actorName"
      size="xs"
      class="flex-shrink-0"
      aria-hidden="true"
    />
    <div class="min-w-0 flex-1">
      <div class="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
        <p class="min-w-0 truncate font-semibold text-navy-700">{{ actorName }}</p>
        <time
          :datetime="entry.createdAt"
          :title="formatNotificationDate(entry.createdAt, locale)"
          class="flex-shrink-0 text-xs text-navy-700/70"
        >
          {{ formatNotificationTime(entry.createdAt, locale, now) }}
        </time>
      </div>
      <!-- Texto plano: los títulos y nombres van como parámetros, nunca como HTML -->
      <p class="mt-0.5 break-words text-sm text-navy-700/80">{{ text }}</p>
      <!-- Un lote: la lista de a quién, desplegable -->
      <details v-if="batchNames" class="mt-1 text-sm text-navy-700/80">
        <summary class="cursor-pointer font-medium text-navy-700">
          {{ t('teacher.classes.detail.history.batch_who', { count: batchNames.length }) }}
        </summary>
        <p class="mt-1 break-words">{{ batchNames.join(', ') }}</p>
      </details>
    </div>
  </li>
</template>

<script setup lang="ts">
import type { ClassHistoryEntry } from '~/types/class.types'
import { formatNotificationDate, formatNotificationTime } from '~/utils/notifications'
import { rewardTakesOnly } from '~/utils/reward-sign'

/**
 * Una entrada del historial de la clase: quién, qué hizo, sobre qué y cuándo.
 * El texto sale de la clave de la acción (`submission.approved`…) y sus datos,
 * en el idioma de la interfaz.
 */
const props = defineProps<{
  entry: ClassHistoryEntry
  /** Ahora, para la hora relativa (lo refresca la página). */
  now: number
}>()

const { t, te, locale } = useI18n()

const actorName = computed(
  () => props.entry.actor.name || t('teacher.classes.detail.history.unknown_actor')
)

/** Un dato suelto de la entrada, como texto. */
function param(name: string): string {
  const value = props.entry.params[name]
  return typeof value === 'string' || typeof value === 'number' ? String(value) : ''
}

/** Fecha de una lista de asistencia ("YYYY-MM-DD"), en el idioma de la interfaz. */
function dateParam(): string {
  const raw = param('date')
  const [y, m, d] = raw.split('-').map(Number)
  if (!y || !m || !d) return raw
  return new Date(y, m - 1, d).toLocaleDateString(locale.value, { dateStyle: 'medium' })
}

/** Puntos de un premio de equipo, con su signo: «+10», «−5». */
function signedPoints(): string {
  const points = Number(props.entry.params.points ?? 0)
  return `${points < 0 ? '−' : '+'}${Math.abs(points)}`
}

/**
 * Es un lote: a dos personas o más, o el reparto de un premio de equipo aunque
 * sea a una sola (sus líneas no salen sueltas, solo aquí dentro).
 */
function isBatch(entry: ClassHistoryEntry): boolean {
  if (!entry.batch) return false
  return entry.batch.size > 1 || entry.action === 'team.awarded'
}

/** Nombres de un lote; quien ya no está en la clase, en genérico. */
const batchNames = computed(() =>
  props.entry.batch && isBatch(props.entry)
    ? props.entry.batch.targets.map(
        p => p.name || t('teacher.classes.detail.history.unknown_target')
      )
    : null
)

/** Perfil y nivel guardados en la entrada, traducidos. */
function accessLabels(source: unknown) {
  const data = (source ?? {}) as { profile?: string; access?: string }
  return {
    profile: data.profile ? t(`common.class_teachers.profiles.${data.profile}`) : '',
    access: data.access ? t(`common.class_teachers.access.${data.access}`) : '',
  }
}

/**
 * Clave del texto. Bloquear o desbloquear una misión, y la propiedad que pasa
 * sola al borrarse una cuenta, tienen texto propio aunque compartan acción.
 */
function textKey(entry: ClassHistoryEntry): string {
  const { action, params } = entry
  if (action === 'mission.updated' && typeof params.status === 'string') {
    return params.status === 'bloqueada' ? 'mission.blocked' : 'mission.unblocked'
  }
  if (action === 'class.ownership_transferred' && params.reason === 'account_deleted') {
    return 'class.ownership_inherited'
  }
  if (action === 'student.removed' && params.accountDeleted) return 'student.removed_unused'
  // Aprobada con el descuento de sus pistas de %: «con un 80 %» no lo cuenta todo.
  if (action === 'submission.approved' && Number(params.hintPenalty ?? 0) > 0) {
    return 'submission.approved_hints'
  }
  if (action === 'team.set_updated' && typeof params.archived === 'boolean') {
    return params.archived ? 'team.set_archived' : 'team.set_unarchived'
  }
  // Una recompensa libre que solo resta no se cuenta como «dio una recompensa»;
  // un premio de equipo sin puntos solo reparte.
  const base =
    action === 'reward.granted' && rewardTakesOnly(params)
      ? 'reward.taken'
      : action === 'team.awarded' && Number(params.points ?? 0) === 0
        ? 'team.distributed'
        : action
  if (isBatch(entry)) return `${base}_batch`
  return base
}

const text = computed(() => {
  const entry = props.entry
  const action = textKey(entry)
  // Sin nombre (un alumno que ya no está en la clase, o una cuenta borrada), las
  // acciones sobre alumnado tienen frase propia que no lo nombra.
  const anonymous = `teacher.classes.detail.history.anonymous.${action}`
  const key = `teacher.classes.detail.history.actions.${action}`
  const chosen = !entry.target?.name && te(anonymous) ? anonymous : key
  if (!te(chosen)) return t('teacher.classes.detail.history.unknown_action')
  const labels = accessLabels(
    entry.action === 'teacher.changed' ? entry.params.after : entry.params
  )
  return t(chosen, {
    title: param('title'),
    target: entry.target?.name || t('teacher.classes.detail.history.unknown_target'),
    percentage: param('percentage'),
    position: param('position'),
    penalty: param('hintPenalty'),
    // El plural: de los puntos en un premio de equipo; si no, de las personas del lote.
    count:
      action === 'team.awarded' || action === 'team.awarded_batch'
        ? Math.abs(Number(entry.params.points ?? 0))
        : (entry.batch?.size ?? 0),
    date: dateParam(),
    time: param('startTime'),
    label: param('label'),
    points: signedPoints(),
    present: Number(entry.params.present ?? 0) + Number(entry.params.late ?? 0),
    absent: Number(entry.params.absent ?? 0) + Number(entry.params.excused ?? 0),
    ...labels,
  })
})
</script>
