import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { SYSTEM_BADGES, type SystemBadge } from '~/utils/gamification-config'
import type { StudentBadge } from '~/types/student.types'
import type { Guide, GuidesResponse } from '~/types/gamification.types'

// Types - Gamification System
export interface ProfileStats {
  classesEnrolled: number
  missionsCompleted: number
  badgesEarned: number
}

export interface Profile {
  id: string
  firstName: string
  lastName: string
  nickname?: string // MVP: Nickname público
  /** Nulo en una cuenta que entra con usuario: no tiene correo. */
  email: string | null
  /** Nulo en una cuenta que se registró con su correo. */
  username?: string | null
  avatar: string | null
  bio?: string
  // XP and level are now per-class, not global
  badges: StudentBadge[] // Solo badges de misiones
  stats: ProfileStats
}

export interface BadgeStats {
  totalBadges: number
  unlockedBadges: number
  completionPercentage: number
  recentBadges: any[]
}

export interface BadgeCategoryStats {
  id: string
  name: string
  count: number
}

export interface UpdateProfileData {
  firstName?: string
  lastName?: string
  nickname?: string // MVP: Agregar nickname
  bio?: string
}

export interface ChangePasswordData {
  currentPassword: string
  newPassword: string
}

export const useGamificationStore = defineStore('gamification', () => {
  // State
  const profile = ref<Profile | null>(null)
  const badges = ref<any[]>([]) // All badges (mission + system)
  const badgeStats = ref<BadgeStats>({
    totalBadges: 0,
    unlockedBadges: 0,
    completionPercentage: 0,
    recentBadges: [],
  })
  const badgeCategories = ref<BadgeCategoryStats[]>([])
  const guides = ref<Guide[]>([]) // Personajes guía disponibles
  const isLoadingProfile = ref(false)
  const isLoadingBadges = ref(false)
  const isLoadingGuides = ref(false)
  const isUpdatingProfile = ref(false)
  const isChangingPassword = ref(false)
  const error = ref<string | null>(null)

  // Cache flags (persist during session)
  const hasLoadedProfile = ref(false)
  const hasLoadedBadges = ref(false)
  const hasLoadedGuides = ref(false)

  // Badge notification state
  const showBadgeModal = ref(false)
  const newBadgeData = ref<SystemBadge | null>(null)

  // Track earned system badges (by id)
  const earnedSystemBadgeIds = ref<Set<string>>(new Set())

  // Getters
  const earnedBadges = computed(() => badges.value.filter(b => b.unlocked || b.earnedAt))

  // Actions

  /**
   * Fetch user profile with gamification stats
   */
  async function fetchProfile(force = false) {
    // Use cached data unless forced
    if (!force && hasLoadedProfile.value && profile.value) {
      return profile.value
    }

    try {
      isLoadingProfile.value = true
      error.value = null

      const config = useRuntimeConfig()
      const response = await $fetch<{ profile: Profile }>(
        `${config.public.apiBase}/students/profile/me`
      )

      profile.value = response.profile
      hasLoadedProfile.value = true
      return response.profile
    } catch (err: any) {
      error.value = err.message || 'Error al cargar el perfil'
      console.error('Error fetching profile:', err)
      throw err
    } finally {
      isLoadingProfile.value = false
    }
  }

  /**
   * Update user profile information (MVP: includes nickname)
   */
  async function updateProfile(data: UpdateProfileData) {
    try {
      isUpdatingProfile.value = true
      error.value = null

      const config = useRuntimeConfig()
      const response = await $fetch<{ profile: Profile }>(
        `${config.public.apiBase}/students/profile/me`,
        {
          method: 'PUT',
          body: data,
        }
      )

      profile.value = response.profile
      return response.profile
    } catch (err: any) {
      error.value = err.message || 'Error al actualizar el perfil'
      console.error('Error updating profile:', err)
      throw err
    } finally {
      isUpdatingProfile.value = false
    }
  }

  /**
   * Update user avatar
   */
  async function updateAvatar(avatar: string) {
    try {
      isUpdatingProfile.value = true
      error.value = null

      const config = useRuntimeConfig()
      const response = await $fetch<{ profile: Profile }>(
        `${config.public.apiBase}/students/profile/me`,
        {
          method: 'PUT',
          body: { avatar },
        }
      )

      profile.value = response.profile
      return response.profile
    } catch (err: any) {
      error.value = err.message || 'Error al actualizar el avatar'
      console.error('Error updating avatar:', err)
      throw err
    } finally {
      isUpdatingProfile.value = false
    }
  }

  /**
   * Generate avatar with AI prompt (MVP feature)
   */
  async function generateAvatar(prompt: string) {
    try {
      isUpdatingProfile.value = true
      error.value = null

      const config = useRuntimeConfig()
      const response = await $fetch<{ avatarUrl: string }>(
        `${config.public.apiBase}/students/profile/me/avatar/generate`,
        {
          method: 'POST',
          body: { prompt },
        }
      )

      // Update avatar with generated URL
      if (profile.value) {
        profile.value.avatar = response.avatarUrl
      }

      return response.avatarUrl
    } catch (err: any) {
      error.value = err.message || 'Error al generar el avatar'
      console.error('Error generating avatar:', err)
      throw err
    } finally {
      isUpdatingProfile.value = false
    }
  }

  /**
   * Change user password
   */
  async function changePassword(data: ChangePasswordData) {
    try {
      isChangingPassword.value = true
      error.value = null

      const config = useRuntimeConfig()
      await $fetch<{ message: string }>(`${config.public.apiBase}/students/profile/me/password`, {
        method: 'POST',
        body: data,
      })
    } catch (err: any) {
      error.value = err.message || 'Error al cambiar la contraseña'
      console.error('Error changing password:', err)
      throw err
    } finally {
      isChangingPassword.value = false
    }
  }

  /**
   * Fetch all badges with stats and categories
   */
  async function fetchBadges(force = false) {
    // Use cached data unless forced
    if (!force && hasLoadedBadges.value && badges.value.length > 0) {
      return {
        badges: badges.value,
        stats: badgeStats.value,
        categories: badgeCategories.value,
      }
    }

    try {
      isLoadingBadges.value = true
      error.value = null

      const config = useRuntimeConfig()
      const response = await $fetch<{
        badges: any[]
        stats: BadgeStats
        categories: BadgeCategoryStats[]
      }>(`${config.public.apiBase}/students/badges`)

      badges.value = response.badges
      badgeStats.value = response.stats
      badgeCategories.value = response.categories
      hasLoadedBadges.value = true

      return {
        badges: response.badges,
        stats: response.stats,
        categories: response.categories,
      }
    } catch (err: any) {
      error.value = err.message || 'Error al cargar las insignias'
      console.error('Error fetching badges:', err)
      throw err
    } finally {
      isLoadingBadges.value = false
    }
  }

  /**
   * Fetch available guides (mythological characters for student selection)
   * Uses cache by default - only fetches if guides are not already loaded
   */
  async function fetchGuides(forceRefresh = false) {
    // Return cached guides if already loaded (unless force refresh)
    if (guides.value.length > 0 && !forceRefresh) {
      return guides.value
    }

    try {
      isLoadingGuides.value = true
      error.value = null

      const config = useRuntimeConfig()
      const response = await $fetch<GuidesResponse>(`${config.public.apiBase}/gamification/guides`)

      guides.value = response.guides
      return response.guides
    } catch (err: any) {
      error.value = err.message || 'Error al cargar los guías'
      console.error('Error fetching guides:', err)
      throw err
    } finally {
      isLoadingGuides.value = false
    }
  }

  /**
   * Ensure-style wrapper sobre `fetchProfile`.
   *
   * Sigue el patrón canónico de los composables de detalle (useTeacherClassDetail,
   * useStudentClassDetail): respeta la bandera `hasLoadedProfile` para no
   * refetchar, evita llamadas concurrentes mirando `isLoadingProfile`, y deja
   * que `force=true` ignore la bandera. La función subyacente `fetchProfile`
   * se mantiene para compatibilidad con código existente.
   */
  async function ensureProfile(force = false) {
    if (hasLoadedProfile.value && !force) return profile.value
    if (isLoadingProfile.value) return profile.value
    return await fetchProfile(force)
  }

  /**
   * Ensure-style wrapper sobre `fetchBadges`. Idempotente: si los badges ya se
   * cargaron en esta sesión no dispara una nueva llamada salvo `force=true`.
   */
  async function ensureBadges(force = false) {
    if (hasLoadedBadges.value && !force) {
      return {
        badges: badges.value,
        stats: badgeStats.value,
        categories: badgeCategories.value,
      }
    }
    if (isLoadingBadges.value) {
      return {
        badges: badges.value,
        stats: badgeStats.value,
        categories: badgeCategories.value,
      }
    }
    return await fetchBadges(force)
  }

  /**
   * Ensure-style wrapper sobre `fetchGuides`. Marca `hasLoadedGuides` tras un
   * fetch exitoso para que sucesivas llamadas no disparen tráfico extra.
   */
  async function ensureGuides(force = false) {
    if (hasLoadedGuides.value && !force) return guides.value
    if (isLoadingGuides.value) return guides.value
    const result = await fetchGuides(force)
    hasLoadedGuides.value = true
    return result
  }

  /**
   * Clear error
   */
  function clearError() {
    error.value = null
  }

  /**
   * Check for new badges based on current stats
   * Note: XP and level badges are now checked per-class in classGamification store
   */
  function checkBadgeTriggers(): SystemBadge[] {
    if (!profile.value) return []

    const newBadges: SystemBadge[] = []
    const missionsCompleted = profile.value.stats.missionsCompleted

    for (const badge of SYSTEM_BADGES) {
      // Skip if already earned
      if (earnedSystemBadgeIds.value.has(badge.id)) continue

      // Only check missions_completed triggers (XP/level are now per-class)
      if (badge.trigger.type === 'missions_completed') {
        if (missionsCompleted >= badge.trigger.value) {
          earnedSystemBadgeIds.value.add(badge.id)
          newBadges.push(badge)
        }
      }
    }

    return newBadges
  }

  /**
   * Increment missions completed and check for badges
   * Note: XP is now added per-class via classGamification store
   */
  function incrementMissionsCompleted() {
    if (!profile.value) return

    profile.value.stats.missionsCompleted += 1

    // Check for mission-based badges
    const newBadges = checkBadgeTriggers()
    if (newBadges.length > 0) {
      newBadgeData.value = newBadges[0]
      showBadgeModal.value = true
    }
  }

  /**
   * Close badge modal
   */
  function closeBadgeModal() {
    showBadgeModal.value = false
    newBadgeData.value = null
  }

  /**
   * Reset store
   */
  function $reset() {
    profile.value = null
    badges.value = []
    badgeStats.value = {
      totalBadges: 0,
      unlockedBadges: 0,
      completionPercentage: 0,
      recentBadges: [],
    }
    badgeCategories.value = []
    guides.value = []
    isLoadingProfile.value = false
    isLoadingBadges.value = false
    isLoadingGuides.value = false
    isUpdatingProfile.value = false
    isChangingPassword.value = false
    error.value = null
    showBadgeModal.value = false
    newBadgeData.value = null
    earnedSystemBadgeIds.value = new Set()
    // Cache flags
    hasLoadedProfile.value = false
    hasLoadedBadges.value = false
    hasLoadedGuides.value = false
  }

  return {
    // State
    profile,
    badges,
    badgeStats,
    badgeCategories,
    guides,
    isLoadingProfile,
    isLoadingBadges,
    isLoadingGuides,
    isUpdatingProfile,
    isChangingPassword,
    error,
    showBadgeModal,
    newBadgeData,
    earnedSystemBadgeIds,

    // Getters
    earnedBadges,

    // Cache flags
    hasLoadedProfile,
    hasLoadedBadges,
    hasLoadedGuides,

    // Actions
    fetchProfile,
    updateProfile,
    updateAvatar,
    generateAvatar,
    changePassword,
    fetchBadges,
    fetchGuides,
    ensureProfile,
    ensureBadges,
    ensureGuides,
    incrementMissionsCompleted,
    checkBadgeTriggers,
    closeBadgeModal,
    clearError,
    $reset,
  }
})
