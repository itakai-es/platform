export const registrationOptions = {
  type: ['school', 'secondary', 'vocational', 'university', 'special', 'adult', 'other'],
  experience: ['under1', '1to3', '4to10', '11to20', 'over20'],
  stages: [
    'early',
    'primary',
    'secondary',
    'baccalaureate',
    'vocational',
    'higher',
    'special',
    'adult',
    'other',
    'none',
  ],
  subjects: [
    'languages',
    'math',
    'science',
    'technology',
    'humanities',
    'arts',
    'physical',
    'vocational',
    'other',
    'none',
  ],
  gamificationExperience: ['never', 'under1', '1to3', '4to10', 'over10'],
  gamificationFrequency: ['none', 'term', 'monthly', 'weekly', 'severalWeekly'],
} as const

export interface EducationCenterData {
  name: string
  municipality: string
  country: string
  type: string
}

export interface EducationCenter extends EducationCenterData {
  id: string
}

export interface ProfessionalProfile {
  centerId: string | null
  center: EducationCenter | null
  centerAnswered: boolean
  experience: string | null
  stages: string[]
  subjects: string[]
  gamificationExperience: string | null
  gamificationFrequency: string | null
  completedAt: string | null
}

export const registrationQuestions = [
  'experience',
  'stages',
  'subjects',
  'gamificationExperience',
  'gamificationFrequency',
] as const

export function registrationError(error: unknown, fallback: string) {
  return (error as { data?: { message?: string } })?.data?.message || fallback
}
