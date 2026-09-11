import type { HelpArticleCard } from '~/types/help.types'

/**
 * Edición del centro de ayuda desde el panel de administración
 * (Fase 3, punto 17).
 *
 * Va aparte de `useHelp` a propósito: aquel sirve contenido público sin sesión y
 * este escribe con el rol de administrador. Mezclarlos invitaría a colar una
 * llamada autenticada en una pantalla pública.
 */

export type HelpStatus = 'borrador' | 'publicado'

export interface AdminHelpCategory {
  id: string
  slug: string
  name: string
  description: string | null
  icon: string | null
  accent: string
  orderIndex: number
  articles: number
}

export interface AdminHelpArticle {
  id: string
  slug: string
  title: string
  summary: string | null
  coverImage: string | null
  status: HelpStatus
  featured: boolean
  orderIndex: number
  views: number
  helpful: number
  notHelpful: number
  updatedAt: string
  publishedAt: string | null
  category: { id: string; name: string; slug: string }
}

export interface AdminHelpArticleFull extends Omit<AdminHelpArticle, 'category'> {
  body: string
  categoryId: string
  locale: string
  category: { id: string; name: string; slug: string }
}

export function useHelpAdmin() {
  const { apiFetch } = useApi()

  const categories = ref<AdminHelpCategory[]>([])
  const articles = ref<AdminHelpArticle[]>([])
  const loading = ref(false)

  const loadCategories = async () => {
    const { categories: list } = await apiFetch<{ categories: AdminHelpCategory[] }>(
      '/admin/help/categories'
    )
    categories.value = list
  }

  const loadArticles = async (filters: { categoryId?: string; status?: HelpStatus } = {}) => {
    loading.value = true
    try {
      const query = new URLSearchParams()
      if (filters.categoryId) query.set('categoryId', filters.categoryId)
      if (filters.status) query.set('status', filters.status)
      const suffix = query.toString() ? `?${query}` : ''
      const { articles: list } = await apiFetch<{ articles: AdminHelpArticle[] }>(
        `/admin/help/articles${suffix}`
      )
      articles.value = list
    } finally {
      loading.value = false
    }
  }

  const getArticle = (id: string) =>
    apiFetch<{ article: AdminHelpArticleFull }>(`/admin/help/articles/${id}`).then(r => r.article)

  const createArticle = (data: Record<string, unknown>) =>
    apiFetch<{ article: AdminHelpArticleFull }>('/admin/help/articles', {
      method: 'POST',
      body: JSON.stringify(data),
    }).then(r => r.article)

  const updateArticle = (id: string, data: Record<string, unknown>) =>
    apiFetch<{ article: AdminHelpArticleFull }>(`/admin/help/articles/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }).then(r => r.article)

  const deleteArticle = (id: string) => apiFetch(`/admin/help/articles/${id}`, { method: 'DELETE' })

  /**
   * Sube una imagen (portada o ilustración del cuerpo) y devuelve su URL.
   * Recibe el `data:` URL que produce `FileReader`, como el resto de subidas.
   */
  const uploadImage = (dataUrl: string) =>
    apiFetch<{ url: string }>('/admin/help/imagenes', {
      method: 'POST',
      body: JSON.stringify({ image: dataUrl }),
    }).then(r => r.url)

  const createCategory = (data: Record<string, unknown>) =>
    apiFetch<{ category: AdminHelpCategory }>('/admin/help/categories', {
      method: 'POST',
      body: JSON.stringify(data),
    }).then(r => r.category)

  const updateCategory = (id: string, data: Record<string, unknown>) =>
    apiFetch<{ category: AdminHelpCategory }>(`/admin/help/categories/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }).then(r => r.category)

  const deleteCategory = (id: string) =>
    apiFetch(`/admin/help/categories/${id}`, { method: 'DELETE' })

  const reorder = (categoryId: string, orderedIds: string[]) =>
    apiFetch(`/admin/help/categories/${categoryId}/order`, {
      method: 'PUT',
      body: JSON.stringify({ orderedIds }),
    })

  /** Artículos agrupados por categoría, en el orden en que se publican. */
  const byCategory = computed(() => {
    const groups = new Map<string, { category: AdminHelpCategory; items: AdminHelpArticle[] }>()
    for (const category of categories.value) {
      groups.set(category.id, { category, items: [] })
    }
    for (const article of articles.value) {
      groups.get(article.category.id)?.items.push(article)
    }
    return [...groups.values()].filter(group => group.items.length > 0)
  })

  return {
    categories,
    articles,
    loading,
    byCategory,
    loadCategories,
    loadArticles,
    getArticle,
    createArticle,
    updateArticle,
    deleteArticle,
    uploadImage,
    createCategory,
    updateCategory,
    deleteCategory,
    reorder,
  }
}

export type { HelpArticleCard }
