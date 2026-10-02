/**
 * Types for Recent Activity Feed
 *
 * Used to display a feed of recent activities in the student's class view,
 * showing things like XP gained, badges unlocked, missions completed, etc.
 */

export type ActivityType =
  | 'xp_gained'
  | 'badge_unlocked'
  | 'mission_completed'
  | 'level_up'
  | 'enigma_completed'
  | 'enigma_submitted'
  | 'class_joined'
  | 'achievement_unlocked'
  | 'student_enrolled'
  | 'progress_milestone'
  | 'behavior_applied'
  | 'shop_purchased'
  | 'shop_item_used'

export interface RecentActivity {
  id: string
  type: ActivityType
  timestamp: Date
  // XP gained
  xpAmount?: number
  source?: string // e.g., "Enigma: Ecuaciones básicas"
  // Badge unlocked
  badgeName?: string
  badgeRarity?: 'common' | 'rare' | 'epic' | 'legendary'
  // Mission completed
  missionTitle?: string
  missionXp?: number
  // Level up
  newLevel?: number
  newTitle?: string
  // Enigma completed
  enigmaTitle?: string
  enigmaXp?: number
}

/**
 * Activity display config for UI rendering
 */
export interface ActivityDisplayConfig {
  icon: string
  bgColor: string
  textColor: string
  label: string
}

export const ACTIVITY_CONFIG: Record<ActivityType, ActivityDisplayConfig> = {
  xp_gained: {
    icon: 'sparkles',
    bgColor: 'bg-yellow/20',
    textColor: 'text-yellow',
    label: 'XP ganado',
  },
  badge_unlocked: {
    icon: 'trophy',
    bgColor: 'bg-purple/20',
    textColor: 'text-purple',
    label: 'Badge desbloqueado',
  },
  mission_completed: {
    icon: 'check-circle',
    bgColor: 'bg-[#6CF3AF]/20',
    textColor: 'text-[#6CF3AF]',
    label: 'Misión completada',
  },
  level_up: {
    icon: 'arrow-up',
    bgColor: 'bg-sky-light/20',
    textColor: 'text-[#7DD3FC]',
    label: 'Subida de nivel',
  },
  enigma_completed: {
    icon: 'puzzle',
    bgColor: 'bg-[#38BDF8]/20',
    textColor: 'text-[#38BDF8]',
    label: 'Enigma completado',
  },
  enigma_submitted: {
    icon: 'paper-airplane',
    bgColor: 'bg-[#A78BFA]/20',
    textColor: 'text-[#A78BFA]',
    label: 'Enigma enviado',
  },
  class_joined: {
    icon: 'user-group',
    bgColor: 'bg-blue-500/20',
    textColor: 'text-blue-500',
    label: 'Se unió a clase',
  },
  achievement_unlocked: {
    icon: 'trophy',
    bgColor: 'bg-yellow-500/20',
    textColor: 'text-yellow-500',
    label: 'Logro desbloqueado',
  },
  student_enrolled: {
    icon: 'academic-cap',
    bgColor: 'bg-indigo-500/20',
    textColor: 'text-indigo-500',
    label: 'Nueva matrícula',
  },
  progress_milestone: {
    icon: 'chart-bar',
    bgColor: 'bg-purple-500/20',
    textColor: 'text-purple-500',
    label: 'Hito de progreso',
  },
  behavior_applied: {
    icon: 'hand-raised',
    bgColor: 'bg-red-light/30',
    textColor: 'text-red',
    label: 'Comportamiento',
  },
  shop_purchased: {
    icon: 'shopping-bag',
    bgColor: 'bg-yellow/20',
    textColor: 'text-yellow-dark',
    label: 'Compra en tienda',
  },
  shop_item_used: {
    icon: 'sparkles',
    bgColor: 'bg-purple-light/40',
    textColor: 'text-purple',
    label: 'Uso de poder',
  },
}

/**
 * Normalizes legacy activity types to current canonical types
 * @param type - The activity type (may be legacy)
 * @returns Normalized ActivityType
 */
export function normalizeLegacyActivityType(type: string): ActivityType {
  // Map legacy types to canonical types
  const typeMap: Record<string, ActivityType> = {
    badge_earned: 'badge_unlocked',
  }

  return typeMap[type] || (type as ActivityType)
}

/**
 * Validates activity type and logs error in development if unknown
 * @param type - The activity type to validate
 * @param context - Context string for debugging (e.g., component name)
 */
export function validateActivityType(type: string, context: string = 'unknown'): void {
  const normalizedType = normalizeLegacyActivityType(type)
  if (!ACTIVITY_CONFIG[normalizedType as ActivityType]) {
    console.error(`[Activity Type Error] Unknown activity type "${type}" in ${context}`, {
      type,
      context,
      validTypes: Object.keys(ACTIVITY_CONFIG),
    })
  }
}
