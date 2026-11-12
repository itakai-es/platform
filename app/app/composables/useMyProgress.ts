import type { MyProgress } from '~/types/analytics.types'
import { loadErrorOf, type AnalyticsLoadError } from '~/composables/useStudentAnalytics'

/** Una insignia que ha conseguido en la clase, para enseñar su imagen. */
export interface EarnedBadge {
  id: string
  name: string
  imageUrl: string | null
  rarity: string
}

/**
 * «Mi progreso» de una clase (`GET /students/classes/:classId/progress`): sus
 * cifras, sus misiones y la comparación anónima, ya hecha en la API. Solo vive en el
 * Resumen, sin guardarse entre visitas: lo que se ve siempre es de quien ha entrado.
 *
 * Si tiene alguna insignia de la clase, también cuáles (`badges`), de la lista de
 * insignias de su clase (`GET /students/classes/:classId/badges`, solo las suyas),
 * para enseñar su imagen. Si esa lista no llega, la cifra sigue saliendo sin ellas.
 */
export function useMyProgress(classId: Ref<string> | ComputedRef<string>) {
  const config = useRuntimeConfig()
  const progress = ref<MyProgress | null>(null)
  const error = ref<AnalyticsLoadError | null>(null)
  const badges = ref<EarnedBadge[]>([])
  // Solo vale la última respuesta.
  let turn = 0

  async function loadBadges(mine: number) {
    if (!progress.value?.summary.badges.earned) {
      badges.value = []
      return
    }
    try {
      const response = await $fetch<{ badges: (EarnedBadge & { unlocked: boolean })[] }>(
        `${config.public.apiBase}/students/classes/${classId.value}/badges`
      )
      if (mine !== turn) return
      badges.value = response.badges
        .filter(badge => badge.unlocked)
        .map(({ id, name, imageUrl, rarity }) => ({ id, name, imageUrl, rarity }))
    } catch {
      if (mine === turn) badges.value = []
    }
  }

  async function load() {
    const mine = ++turn
    error.value = null
    try {
      const response = await $fetch<MyProgress>(
        `${config.public.apiBase}/students/classes/${classId.value}/progress`
      )
      if (mine !== turn) return
      progress.value = response
      void loadBadges(mine)
    } catch (err) {
      if (mine === turn) error.value = loadErrorOf(err)
    }
  }

  watch(classId, load, { immediate: true })

  return { progress, error, badges, retry: load }
}
