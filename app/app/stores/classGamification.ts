import { defineStore } from 'pinia'
import { ref } from 'vue'
import { checkLevelUp, getLevelInfo } from '~/utils/xp-calculator'
import { resolveLevelConfig } from '~/utils/level-config'
import type {
  ClassGamificationData,
  ClassLevelUpData,
  ClassGamificationResponse,
} from '~/types/class-gamification.types'

/**
 * Store for class-specific XP and level management
 *
 * Each student has independent XP and level per class,
 * enabling competition within each class context.
 */
export const useClassGamificationStore = defineStore('classGamification', () => {
  // State - XP data per class (keyed by classId)
  const classXpData = ref<Map<string, ClassGamificationData>>(new Map())

  // Level-up modal state (per class)
  const showLevelUpModal = ref(false)
  const levelUpData = ref<ClassLevelUpData | null>(null)

  // Loading state
  const isLoading = ref(false)
  const error = ref<string | null>(null)

  // Cache flags (persist during session)
  const loadedClasses = ref<Set<string>>(new Set())

  /**
   * Get XP data for a specific class
   */
  function getClassData(classId: string): ClassGamificationData | null {
    return classXpData.value.get(classId) || null
  }

  /**
   * Fetch XP data for a class from API
   */
  async function fetchClassXp(
    classId: string,
    force = false,
    showFeedback = false,
    className?: string
  ): Promise<ClassGamificationData> {
    // Use cached data unless forced
    if (!force && loadedClasses.value.has(classId)) {
      const cached = classXpData.value.get(classId)
      if (cached) {
        return cached
      }
    }

    isLoading.value = true
    error.value = null

    const previousData = classXpData.value.get(classId) || null

    try {
      const config = useRuntimeConfig()
      const response = await $fetch<ClassGamificationResponse>(
        `${config.public.apiBase}/students/classes/${classId}/gamification`
      )

      classXpData.value.set(classId, response.gamification)
      loadedClasses.value.add(classId)

      if (showFeedback && previousData && response.gamification.level > previousData.level) {
        levelUpData.value = {
          classId,
          className: className || response.gamification.name || '',
          oldLevel: previousData.level,
          newLevel: response.gamification.level,
          xpGained: response.gamification.xp - previousData.xp,
          newTitle: response.gamification.title,
        }
        showLevelUpModal.value = true
      }

      return response.gamification
    } catch (err: any) {
      error.value = err.message || 'Error al cargar los datos de XP'
      console.error('Error fetching class XP:', err)
      throw err
    } finally {
      isLoading.value = false
    }
  }

  /**
   * Ensure XP data for a class is loaded. Idempotente: skipea si el id ya
   * está en `loadedClasses` (a no ser que `force=true`). Sigue el patrón
   * canónico de los composables `useTeacherClassDetail` / `useStudentClassDetail`
   * — wrapper fino sobre `fetchClassXp` que respeta la bandera por-clase.
   */
  async function ensureClassXp(
    classId: string,
    force = false,
    showFeedback = false,
    className?: string
  ): Promise<ClassGamificationData | null> {
    if (loadedClasses.value.has(classId) && !force) {
      return classXpData.value.get(classId) || null
    }
    if (isLoading.value) {
      const cached = classXpData.value.get(classId)
      if (cached) return cached
    }
    return await fetchClassXp(classId, force, showFeedback, className)
  }

  /**
   * Add XP to a class (after completing enigma/mission)
   * Checks for level-up and shows modal if needed
   */
  function addClassXp(classId: string, className: string, xpAmount: number) {
    const currentData = classXpData.value.get(classId)
    if (!currentData) return

    const oldXP = currentData.xp
    const oldLevel = currentData.level
    const newXP = oldXP + xpAmount

    // Nivel/título/color se calculan con la curva de ESTA clase (si la trae del
    // backend); si no, con la config por defecto. Así el modal optimista coincide.
    const cfg = resolveLevelConfig(currentData.levelConfig)
    const levelsGained = checkLevelUp(oldXP, newXP, cfg)
    const levelInfoData = getLevelInfo(newXP, cfg)

    // Update stored data
    classXpData.value.set(classId, {
      ...currentData,
      xp: newXP,
      level: levelInfoData.level,
      title: levelInfoData.title,
      color: levelInfoData.color,
      progress: levelInfoData.progress,
      currentXP: levelInfoData.currentXP,
      requiredXP: levelInfoData.requiredXP,
    })

    // Show level-up modal if leveled up
    if (levelsGained > 0) {
      levelUpData.value = {
        classId,
        className,
        oldLevel,
        newLevel: levelInfoData.level,
        xpGained: xpAmount,
        newTitle: levelInfoData.title,
        newColor: levelInfoData.color,
      }
      showLevelUpModal.value = true
    }
  }

  /**
   * Update class data directly (e.g., after refetching from server)
   */
  function setClassData(classId: string, data: ClassGamificationData) {
    classXpData.value.set(classId, data)
  }

  /**
   * Close level-up modal
   */
  function closeLevelUpModal() {
    showLevelUpModal.value = false
    levelUpData.value = null
  }

  /**
   * Clear cached data for a specific class
   */
  function clearClassData(classId: string) {
    classXpData.value.delete(classId)
  }

  /**
   * Clear error
   */
  function clearError() {
    error.value = null
  }

  /**
   * Reset store
   */
  function $reset() {
    classXpData.value = new Map()
    showLevelUpModal.value = false
    levelUpData.value = null
    isLoading.value = false
    error.value = null
    loadedClasses.value.clear()
  }

  return {
    // State
    classXpData,
    showLevelUpModal,
    levelUpData,
    isLoading,
    error,

    // Getters
    getClassData,

    // Actions
    fetchClassXp,
    ensureClassXp,
    addClassXp,
    setClassData,
    closeLevelUpModal,
    clearClassData,
    clearError,
    $reset,
  }
})
