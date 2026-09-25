/**
 * ITAKAI Student Types - MVP Simplified
 *
 * Types for student role according to MVP specifications.
 */
import type { AccountType } from '~/types/auth.types'

export interface StudentProfile {
  id: string
  /** Nulo en una cuenta que entra con usuario: no tiene correo. */
  email: string | null
  /** Nulo en una cuenta que se registró con su correo. */
  username: string | null
  /** Quién lleva la cuenta: su dueño (`self`) o el profesorado (`managed`). */
  accountType?: AccountType
  firstName: string
  lastName: string
  nickname?: string // Público - ej: "LoboValiente34"
  avatar?: string
  bio?: string
  // XP, level, and rank are now per-class (see class-gamification.types.ts)
}

export interface EnrolledClass {
  id: string
  name: string
  description?: string
  schedule?: string
  teacherName: string
  studentCount: number
  invitationCode: string
}

export interface StudentBadge {
  id: string
  name: string
  description: string
  imageUrl?: string
  earnedAt: Date
  missionId?: string // Badge obtenido al completar esta misión
}

export interface StudentMission {
  id: string
  title: string
  description: string
  narrative?: string
  classId: string
  className: string
  xpReward: number
  status: 'available' | 'completed'
  dueDate?: string
  completedAt?: Date
  badges?: StudentBadge[] // Badges que se otorgan al completar
}

export interface StudentStats {
  // XP/level stats are now per-class (see class-gamification.types.ts)
  missionsCompleted: number
  totalMissions: number
  badgesEarned: number
  classesEnrolled: number
}

export interface ClassRanking {
  studentId: string
  name: string
  nickname?: string
  avatar?: string
  level: number
  xp: number
  rank: number
  isCurrentUser: boolean
}

export interface JoinClassData {
  invitationCode: string
}

export interface UpdateProfileData {
  firstName?: string
  lastName?: string
  nickname?: string
  bio?: string
  avatar?: string
}

export interface GenerateAvatarData {
  prompt: string // Descripción textual para generar avatar con IA
}

/**
 * Class-specific student profile
 *
 * Each student can have a different avatar and username in each class they're enrolled in.
 * This allows students to customize their identity per class/subject.
 *
 * Database table equivalent: student_class_profiles
 * Fields: student_id, class_id, avatar_url, username, created_at, updated_at
 */
export interface ClassStudentProfile {
  avatar: string
  username: string
}
