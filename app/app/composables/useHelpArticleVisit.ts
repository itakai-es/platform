import type { HelpArticle } from '~/types/help.types'

export function useHelpArticleVisit(
  article: () => Pick<HelpArticle, 'id' | 'views'> | null | undefined
) {
  const {
    public: { apiBase },
  } = useRuntimeConfig()
  const counted = shallowRef<{ id: string; views: number }>()

  onMounted(() => {
    watch(
      article,
      (item, _, onCleanup) => {
        if (!item) return

        const controller = new AbortController()
        const register = async () => {
          if (document.visibilityState !== 'visible') return
          document.removeEventListener('visibilitychange', register)
          try {
            const { views } = await $fetch<{ views: number }>(
              `${apiBase}/public/help/${item.id}/visita`,
              {
                method: 'POST',
                body: {},
                signal: controller.signal,
              }
            )
            if (!controller.signal.aborted) counted.value = { id: item.id, views }
          } catch {
            // If counting fails, keep the total that came with the article.
          }
        }

        document.addEventListener('visibilitychange', register)
        onCleanup(() => {
          controller.abort()
          document.removeEventListener('visibilitychange', register)
        })
        void register()
      },
      { immediate: true, flush: 'post' }
    )
  })

  return computed(() => {
    const item = article()
    if (!item) return undefined
    const current = counted.value
    return current?.id === item.id ? Math.max(item.views, current.views) : item.views
  })
}
