import type {
  HelpArea,
  HelpArticleCard,
  HelpArticleKind,
  HelpArticleView,
  HelpAudience,
} from '~/types/help.types'

/**
 * Edición del centro de ayuda y del blog desde el panel de administración
 * (Fase 3, punto 17). Los dos comparten modelo y se separan por el área de la
 * categoría.
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
  area: HelpArea
  orderIndex: number
  articles: number
}

/** La categoría tal y como viaja dentro de cada artículo del listado. */
interface AdminHelpCategoryRef {
  id: string
  name: string
  slug: string
  area: HelpArea
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
  audience: HelpAudience
  kind: HelpArticleKind
  videoUrl: string | null
  category: AdminHelpCategoryRef
}

export interface AdminHelpArticleFull extends Omit<AdminHelpArticle, 'category'> {
  body: string
  categoryId: string
  locale: string
  category: AdminHelpCategoryRef
}

/** Lo que el panel manda al crear o editar un artículo. */
export interface AdminArticlePayload {
  categoryId: string
  title: string
  summary?: string | null
  coverImage: string | null
  body: string
  status?: HelpStatus
  featured?: boolean
  audience?: HelpAudience
  kind?: HelpArticleKind
  /** Solo en el centro de ayuda; el blog no la manda. */
  videoUrl?: string | null
}

/** Lo que el panel manda al crear o editar una categoría. */
export interface AdminCategoryPayload {
  name: string
  description?: string
  icon?: string
  accent: string
  area: HelpArea
}

export interface AdminArticleFilters {
  categoryId?: string
  status?: HelpStatus
  audience?: HelpAudience
  kind?: HelpArticleKind
  area?: HelpArea
  /** Texto a buscar en el título. */
  search?: string
}

export function useHelpAdmin() {
  const { apiFetch } = useApi()

  const categories = ref<AdminHelpCategory[]>([])
  const articles = ref<AdminHelpArticle[]>([])
  const loading = ref(false)
  const categoriesLoading = ref(false)

  /**
   * Cada carga lleva un número y solo se aplica la última que se pidió: una
   * respuesta vieja que llegue tarde (al cambiar deprisa de filtros) no pisa
   * la lista visible.
   */
  let categoriesSeq = 0
  let articlesSeq = 0

  /** `silent`: recarga sin esqueleto, para no desmontar la lista (ni el foco). */
  interface LoadOptions {
    silent?: boolean
  }

  const loadCategories = async (area?: HelpArea, { silent = false }: LoadOptions = {}) => {
    const seq = ++categoriesSeq
    if (!silent) categoriesLoading.value = true
    const suffix = area ? `?area=${area}` : ''
    try {
      const { categories: list } = await apiFetch<{ categories: AdminHelpCategory[] }>(
        `/admin/help/categories${suffix}`
      )
      if (seq === categoriesSeq) categories.value = list
    } catch (error) {
      // El fallo de una petición ya sustituida no le importa a nadie.
      if (seq === categoriesSeq) throw error
    } finally {
      if (seq === categoriesSeq) categoriesLoading.value = false
    }
  }

  const articlesQuery = (filters: AdminArticleFilters) => {
    const query = new URLSearchParams()
    for (const [key, value] of Object.entries(filters)) {
      if (value) query.set(key, value)
    }
    return query.toString() ? `?${query}` : ''
  }

  const loadArticles = async (
    filters: AdminArticleFilters = {},
    { silent = false }: LoadOptions = {}
  ) => {
    const seq = ++articlesSeq
    if (!silent) loading.value = true
    try {
      const { articles: list } = await apiFetch<{ articles: AdminHelpArticle[] }>(
        `/admin/help/articles${articlesQuery(filters)}`
      )
      if (seq === articlesSeq) articles.value = list
    } catch (error) {
      if (seq === articlesSeq) throw error
    } finally {
      if (seq === articlesSeq) loading.value = false
    }
  }

  const getArticle = (id: string) =>
    apiFetch<{ article: AdminHelpArticleFull }>(`/admin/help/articles/${id}`).then(r => r.article)

  /** La vista pública de un artículo, esté publicado o en borrador. */
  const previewArticle = (id: string) =>
    apiFetch<HelpArticleView>(`/admin/help/articles/${id}/preview`)

  const createArticle = (data: Partial<AdminArticlePayload>) =>
    apiFetch<{ article: AdminHelpArticleFull }>('/admin/help/articles', {
      method: 'POST',
      body: JSON.stringify(data),
    }).then(r => r.article)

  const updateArticle = (id: string, data: Partial<AdminArticlePayload>) =>
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

  const createCategory = (data: Partial<AdminCategoryPayload>) =>
    apiFetch<{ category: AdminHelpCategory }>('/admin/help/categories', {
      method: 'POST',
      body: JSON.stringify(data),
    }).then(r => r.category)

  const updateCategory = (id: string, data: Partial<AdminCategoryPayload>) =>
    apiFetch<{ category: AdminHelpCategory }>(`/admin/help/categories/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }).then(r => r.category)

  const deleteCategory = (id: string) =>
    apiFetch(`/admin/help/categories/${id}`, { method: 'DELETE' })

  /** El orden de las categorías, tal y como salen en la portada pública. */
  const reorderCategories = (orderedIds: string[]) =>
    apiFetch<{ success: boolean; total: number }>('/admin/help/categories/order', {
      method: 'PUT',
      body: JSON.stringify({ orderedIds }),
    })

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
    categoriesLoading,
    byCategory,
    loadCategories,
    loadArticles,
    getArticle,
    previewArticle,
    createArticle,
    updateArticle,
    deleteArticle,
    uploadImage,
    createCategory,
    updateCategory,
    deleteCategory,
    reorderCategories,
    reorder,
  }
}

export type { HelpArticleCard }
