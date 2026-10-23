import type { ActivityType } from '~/types/activity.types'
import { normalizeLegacyActivityType, validateActivityType } from '~/types/activity.types'
import { rewardTakesOnly } from '~/utils/reward-sign'
import { studentAvatarSeed } from '~/utils/avatar'

/** Docente que hizo lo que cuenta una entrada: su nombre y la clave de su avatar. */
export interface ActivityActor {
  id: string | null
  name: string
  avatar: string | null
}

interface Activity {
  id: string
  type: string
  timestamp: Date | string
  avatar?: string
  username?: string
  teacherName?: string
  /** Quién hizo lo que cuenta la entrada, si no es el propio alumno (aprobar, aplicar). */
  actor?: ActivityActor | null
  enigmaTitle?: string
  enigmaXp?: number
  missionTitle?: string
  missionXp?: number
  newLevel?: number
  className?: string
  achievementName?: string
  badgeName?: string
  badgeImage?: string
  xpAmount?: number
  source?: string
  classId?: string
  studentId?: string
  metadata?: Record<string, unknown> | null
}

export type ResourceKind = 'xp' | 'coin' | 'mana' | 'life'

export interface ResourceDelta {
  kind: ResourceKind
  amount: number // valor absoluto
  positive: boolean // true → suma, false → resta
}

interface FormattedActivity {
  id: string
  username?: string
  studentId?: string
  description: string
  timeAgo: string
  avatar?: string
  avatarSeed?: string
  badge?: {
    type: 'xp' | 'new' | 'level' | 'mission' | 'achievement' | 'behavior'
    text: string
    image?: string
    /** Para 'behavior': true = positivo (pulgar arriba), false = negativo (pulgar abajo). */
    positive?: boolean
  }
  /** Chips visuales de recursos involucrados (XP, monedas, maná, vidas). */
  resources?: ResourceDelta[]
  /** Docente que lo hizo (aprobar, aplicar), con su avatar. */
  actor?: ActivityActor
}

/**
 * La descripción se pinta como HTML (lleva `<strong>`): lo que escriben las
 * personas (títulos, nombres) entra escapado.
 */
function esc(value: unknown): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

/** Construye un ResourceDelta a partir de un delta firmado (positivo o negativo). */
function makeDelta(kind: ResourceKind, value: number | undefined | null): ResourceDelta | null {
  if (!value) return null
  return { kind, amount: Math.abs(value), positive: value > 0 }
}

/**
 * Format activities for display
 * @param perspective - 'student' for 2nd person (Tu...), 'teacher' for 3rd person (El estudiante...)
 */
export function useActivityFormatter(perspective: 'student' | 'teacher' = 'student') {
  const { t } = useI18n()
  const formatTimeAgo = (timestamp: Date | string): string => {
    const now = new Date()
    const activityDate = new Date(timestamp)
    const diffMs = now.getTime() - activityDate.getTime()
    const diffMins = Math.floor(diffMs / (1000 * 60))
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

    if (diffMins < 1) return '< 1m'
    if (diffMins < 60) return `${diffMins}m`
    if (diffHours < 24) return `${diffHours}h`
    return `${diffDays}d`
  }

  const formatActivities = (activities: Activity[]): FormattedActivity[] => {
    return activities
      .map((activity): FormattedActivity | null => {
        const normalizedType = normalizeLegacyActivityType(activity.type as string) as ActivityType

        // Validate in development
        if (import.meta.env.DEV) {
          validateActivityType(normalizedType, `activity-formatter-${perspective}`)
        }

        let description = ''
        let badge:
          | {
              type: 'xp' | 'new' | 'level' | 'mission' | 'achievement' | 'behavior'
              text: string
              image?: string
              positive?: boolean
            }
          | undefined
        let resources: ResourceDelta[] | undefined
        let actor: ActivityActor | undefined

        // Format based on perspective
        const isTeacher = perspective === 'teacher'

        switch (normalizedType) {
          case 'enigma_completed': {
            const params = { enigma: `<strong>"${esc(activity.enigmaTitle)}"</strong>` }
            description = isTeacher
              ? t('common.activity_feed.enigma_approved_teacher', params)
              : t('common.activity_feed.enigma_approved_student', params)
            // Quién la aprobó va debajo, con su avatar. Las entradas antiguas solo
            // guardan el nombre.
            actor =
              activity.actor ??
              (activity.teacherName
                ? { id: null, name: activity.teacherName, avatar: null }
                : undefined)
            badge = { type: 'xp', text: `+${activity.enigmaXp} XP` }
            break
          }

          case 'enigma_submitted':
            description = isTeacher
              ? `Envió <strong>"${esc(activity.enigmaTitle)}"</strong> a revisión`
              : `Entregaste <strong>"${esc(activity.enigmaTitle)}"</strong>`
            // No badge for submissions (only when approved)
            badge = undefined
            break

          case 'mission_completed':
            description = isTeacher
              ? `Completó la misión <strong>"${esc(activity.missionTitle)}"</strong>`
              : `Completaste la misión <strong>"${esc(activity.missionTitle)}"</strong>`
            badge = activity.missionXp
              ? { type: 'mission', text: `+${activity.missionXp} XP` }
              : undefined
            break

          case 'level_up':
            description = isTeacher
              ? `Subió al nivel <strong>${esc(activity.newLevel)}</strong>`
              : `Subiste al nivel <strong>${esc(activity.newLevel)}</strong>`
            badge = { type: 'level', text: `Nivel ${activity.newLevel}` }
            break

          case 'class_joined':
            description = isTeacher
              ? `Se unió a <strong>"${esc(activity.className || 'una clase')}"</strong>`
              : `Te uniste a <strong>"${esc(activity.className || 'una clase')}"</strong>`
            badge = { type: 'new', text: 'Nueva' }
            break

          case 'achievement_unlocked':
            description = isTeacher
              ? `Desbloqueó el logro <strong>"${esc(activity.achievementName)}"</strong>`
              : `Desbloqueaste el logro <strong>"${esc(activity.achievementName)}"</strong>`
            badge = { type: 'achievement', text: 'Logro' }
            break

          case 'badge_unlocked':
            description = isTeacher
              ? `Desbloqueó la insignia <strong>"${esc(activity.badgeName)}"</strong>`
              : `Desbloqueaste la insignia <strong>"${esc(activity.badgeName)}"</strong>`
            badge = {
              type: 'achievement',
              text: activity.badgeName || '',
              image: activity.badgeImage,
            }
            break

          case 'xp_gained':
            if (activity.xpAmount != null && activity.xpAmount > 0) {
              description = isTeacher
                ? `Ganó <strong>+${esc(activity.xpAmount)} XP</strong> en ${esc(activity.source || 'una actividad')}`
                : `Ganaste <strong>+${esc(activity.xpAmount)} XP</strong> en ${esc(activity.source || 'una actividad')}`
              badge = { type: 'xp', text: `+${activity.xpAmount} XP` }
            } else {
              // Skip activities with no real XP
              return null
            }
            break

          case 'student_enrolled':
            description = isTeacher
              ? `Se registró en la plataforma`
              : `Te registraste en la plataforma`
            badge = { type: 'new', text: 'Nueva cuenta' }
            break

          case 'progress_milestone':
            description = isTeacher
              ? esc(activity.source || 'Alcanzó un hito de progreso')
              : esc(activity.source || 'Alcanzaste un hito de progreso')
            badge = { type: 'achievement', text: 'Hito' }
            break

          case 'behavior_applied': {
            const meta = (activity.metadata || {}) as {
              kind?: 'positive' | 'negative' | 'reward'
              xpDelta?: number
              coinDelta?: number
              manaDelta?: number
              lifeDelta?: number
            }
            const name = activity.source || 'un comportamiento'
            // Una recompensa libre (con su motivo) va por el mismo camino que un comportamiento.
            const takesOnly = meta.kind === 'reward' && rewardTakesOnly(meta)
            if (takesOnly) {
              description = isTeacher
                ? `Se le quitaron recursos: <strong>"${esc(name)}"</strong>`
                : `Se te quitaron recursos: <strong>"${esc(name)}"</strong>`
            } else if (meta.kind === 'reward') {
              description = isTeacher
                ? `Recibió una recompensa: <strong>"${esc(name)}"</strong>`
                : `Recibiste una recompensa: <strong>"${esc(name)}"</strong>`
            } else {
              description = isTeacher
                ? `Recibió el comportamiento <strong>"${esc(name)}"</strong>`
                : `Recibiste el comportamiento <strong>"${esc(name)}"</strong>`
            }
            resources = [
              makeDelta('xp', meta.xpDelta),
              makeDelta('coin', meta.coinDelta),
              makeDelta('mana', meta.manaDelta),
              makeDelta('life', meta.lifeDelta),
            ].filter((r): r is ResourceDelta => r !== null)
            actor = activity.actor ?? undefined
            // Propagamos el tipo (positivo/negativo) al badge para que el
            // frontend pueda elegir icono pulgar arriba/abajo.
            badge = {
              type: 'behavior',
              text: name,
              // Una recompensa que solo quita cuenta como negativa.
              positive: meta.kind === 'reward' ? !takesOnly : meta.kind !== 'negative',
            }
            break
          }

          case 'shop_purchased': {
            const meta = (activity.metadata || {}) as { price?: number }
            const name = activity.source || 'un artículo'
            description = isTeacher
              ? `Compró <strong>"${esc(name)}"</strong> en la tienda`
              : `Compraste <strong>"${esc(name)}"</strong> en la tienda`
            // El precio sale de monedas, así que va firmado en negativo.
            resources = [makeDelta('coin', meta.price != null ? -meta.price : 0)].filter(
              (r): r is ResourceDelta => r !== null
            )
            badge = undefined
            break
          }

          case 'shop_item_used': {
            const meta = (activity.metadata || {}) as { manaCost?: number; lifeRestore?: number }
            const name = activity.source || 'un artículo'
            description = isTeacher
              ? `Usó <strong>"${esc(name)}"</strong>`
              : `Usaste <strong>"${esc(name)}"</strong>`
            resources = [
              // El maná se gasta (negativo), las vidas se recuperan (positivo).
              makeDelta('mana', meta.manaCost ? -meta.manaCost : 0),
              makeDelta('life', meta.lifeRestore),
            ].filter((r): r is ResourceDelta => r !== null)
            badge = undefined
            break
          }

          case 'hint_used': {
            const meta = (activity.metadata || {}) as {
              position?: number
              costType?: string
              cost?: number
            }
            const params = {
              position: meta.position ?? 1,
              mission: `<strong>"${esc(activity.missionTitle || '')}"</strong>`,
              count: meta.cost ?? 0,
            }
            // Una pista de % no mueve saldo: lo dice la frase. Las de monedas o XP,
            // con su chip en negativo, como una compra.
            if (meta.costType === 'percent' && params.count > 0) {
              description = isTeacher
                ? t('common.activity_feed.hint_used_percent_teacher', params)
                : t('common.activity_feed.hint_used_percent_student', params)
            } else {
              description = isTeacher
                ? t('common.activity_feed.hint_used_teacher', params)
                : t('common.activity_feed.hint_used_student', params)
            }
            resources = [
              makeDelta(
                meta.costType === 'xp' ? 'xp' : 'coin',
                meta.costType === 'percent' ? 0 : -(meta.cost ?? 0)
              ),
            ].filter((r): r is ResourceDelta => r !== null)
            badge = undefined
            break
          }

          // La app ya no empieza las misiones a mano, pero quedan entradas guardadas.
          case 'mission_started': {
            const params = { mission: `<strong>"${esc(activity.missionTitle || '')}"</strong>` }
            description = isTeacher
              ? t('common.activity_feed.mission_started_teacher', params)
              : t('common.activity_feed.mission_started_student', params)
            badge = undefined
            break
          }

          default:
            console.error(`[ActivityFormatter] Unknown activity type:`, {
              type: activity.type,
              normalizedType,
              perspective,
              activity,
            })
            description = 'Actividad reciente'
        }

        return {
          id: activity.id,
          username: isTeacher ? activity.username : undefined,
          studentId: activity.studentId,
          description,
          timeAgo: formatTimeAgo(activity.timestamp),
          avatar: activity.avatar || undefined,
          avatarSeed: activity.studentId
            ? studentAvatarSeed(activity.classId, activity.studentId)
            : undefined,
          badge,
          resources: resources?.length ? resources : undefined,
          actor,
        }
      })
      .filter((a): a is FormattedActivity => a !== null)
  }

  return {
    formatActivities,
    formatTimeAgo,
  }
}
