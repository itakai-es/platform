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
  classId?: string
  description: string
  timeAgo: string
  avatar?: string
  avatarSeed?: string
  /** Los recursos que suma o quita (XP, monedas, maná, vidas): icono y número con su signo. */
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
        let resources: ResourceDelta[] | undefined
        let actor: ActivityActor | undefined

        // Format based on perspective
        const isTeacher = perspective === 'teacher'
        const feed = (key: string, params: Record<string, unknown> = {}) =>
          t(`common.activity_feed.${key}_${isTeacher ? 'teacher' : 'student'}`, params)
        const fallback = (key: string) => t(`common.activity_feed.fallback.${key}`)
        /** Un título o nombre escrito por una persona, en negrita y entrecomillado. */
        const quoted = (value: unknown) => `<strong>"${esc(value)}"</strong>`

        switch (normalizedType) {
          case 'enigma_completed':
            description = feed('enigma_approved', { enigma: quoted(activity.enigmaTitle) })
            // Quién la aprobó va debajo, con su avatar. Las entradas antiguas solo
            // guardan el nombre.
            actor =
              activity.actor ??
              (activity.teacherName
                ? { id: null, name: activity.teacherName, avatar: null }
                : undefined)
            break

          case 'enigma_submitted':
            description = feed('enigma_submitted', { enigma: quoted(activity.enigmaTitle) })
            break

          case 'mission_completed':
            description = feed('mission_completed', { mission: quoted(activity.missionTitle) })
            break

          case 'level_up':
            description = feed('level_up', { level: `<strong>${esc(activity.newLevel)}</strong>` })
            break

          case 'class_joined':
            description = feed('class_joined', {
              name: quoted(activity.className || fallback('class')),
            })
            break

          case 'achievement_unlocked':
            description = feed('achievement_unlocked', { name: quoted(activity.achievementName) })
            break

          case 'badge_unlocked':
            description = feed('badge_unlocked', { name: quoted(activity.badgeName) })
            break

          case 'xp_gained':
            // Skip activities with no real XP
            if (activity.xpAmount == null || activity.xpAmount <= 0) return null
            description = feed('xp_gained', {
              xp: `<strong>+${esc(activity.xpAmount)} XP</strong>`,
              source: esc(activity.source || fallback('activity')),
            })
            break

          case 'student_enrolled':
            description = feed('student_enrolled')
            break

          case 'progress_milestone':
            description = activity.source ? esc(activity.source) : feed('progress_milestone')
            break

          case 'behavior_applied': {
            const meta = (activity.metadata || {}) as {
              kind?: 'positive' | 'negative' | 'reward'
              xpDelta?: number
              coinDelta?: number
              manaDelta?: number
              lifeDelta?: number
            }
            const name = quoted(activity.source || fallback('behavior'))
            // Una recompensa libre (con su motivo) va por el mismo camino que un comportamiento.
            if (meta.kind === 'reward' && rewardTakesOnly(meta)) {
              description = feed('reward_taken', { name })
            } else if (meta.kind === 'reward') {
              description = feed('reward_given', { name })
            } else {
              description = feed('behavior_applied', { name })
            }
            resources = [
              makeDelta('xp', meta.xpDelta),
              makeDelta('coin', meta.coinDelta),
              makeDelta('mana', meta.manaDelta),
              makeDelta('life', meta.lifeDelta),
            ].filter((r): r is ResourceDelta => r !== null)
            actor = activity.actor ?? undefined
            break
          }

          case 'shop_purchased': {
            const meta = (activity.metadata || {}) as { price?: number }
            description = feed('shop_purchased', {
              name: quoted(activity.source || fallback('item')),
            })
            // El precio sale de monedas, así que va firmado en negativo.
            resources = [makeDelta('coin', meta.price != null ? -meta.price : 0)].filter(
              (r): r is ResourceDelta => r !== null
            )
            break
          }

          case 'shop_item_used': {
            const meta = (activity.metadata || {}) as { manaCost?: number; lifeRestore?: number }
            description = feed('shop_item_used', {
              name: quoted(activity.source || fallback('item')),
            })
            resources = [
              // El maná se gasta (negativo), las vidas se recuperan (positivo).
              makeDelta('mana', meta.manaCost ? -meta.manaCost : 0),
              makeDelta('life', meta.lifeRestore),
            ].filter((r): r is ResourceDelta => r !== null)
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
              mission: quoted(activity.missionTitle || ''),
              count: meta.cost ?? 0,
            }
            // Una pista de % no mueve saldo: lo dice la frase. Las de monedas o XP,
            // con su cifra en negativo, como una compra.
            description =
              meta.costType === 'percent' && params.count > 0
                ? feed('hint_used_percent', params)
                : feed('hint_used', params)
            resources = [
              makeDelta(
                meta.costType === 'xp' ? 'xp' : 'coin',
                meta.costType === 'percent' ? 0 : -(meta.cost ?? 0)
              ),
            ].filter((r): r is ResourceDelta => r !== null)
            break
          }

          // La app ya no empieza las misiones a mano, pero quedan entradas guardadas.
          case 'mission_started':
            description = feed('mission_started', { mission: quoted(activity.missionTitle || '') })
            break

          default:
            console.error(`[ActivityFormatter] Unknown activity type:`, {
              type: activity.type,
              normalizedType,
              perspective,
              activity,
            })
            description = t('common.activity_feed.unknown')
        }

        return {
          id: activity.id,
          username: isTeacher ? activity.username : undefined,
          studentId: activity.studentId,
          classId: activity.classId,
          description,
          timeAgo: formatTimeAgo(activity.timestamp),
          avatar: activity.avatar || undefined,
          avatarSeed: activity.studentId
            ? studentAvatarSeed(activity.classId, activity.studentId)
            : undefined,
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
