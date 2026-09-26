import type { HelpBlogFields } from '~/types/help.types'

/**
 * La fecha de publicación y la firma de una entrada del blog, escritas igual
 * en todas partes: en la entrada, en las tarjetas del blog público y en las
 * filas del panel.
 */
export function useBlogByline() {
  const { t, locale } = useI18n()

  /** Un día con el mes largo («10 de marzo de 2024») o corto («10 mar 2024»). */
  const formatDate = (iso: string, month: 'long' | 'short') =>
    new Date(iso).toLocaleDateString(locale.value, { day: 'numeric', month, year: 'numeric' })

  /** «Por Laura Martín», o nada si la entrada no va firmada. */
  const authorLine = (name?: string | null) => {
    const author = name?.trim()
    return author ? t('common.help.by_author', { name: author }) : ''
  }

  /**
   * «10 mar 2024 · Por Laura Martín», para listas y tarjetas. La fecha va
   * delante porque es lo que más se mira, y así una firma larga, que se
   * recorta al final, nunca se la come.
   */
  const shortByline = (article: HelpBlogFields) =>
    [
      article.publishedAt ? formatDate(article.publishedAt, 'short') : '',
      authorLine(article.authorName),
    ]
      .filter(Boolean)
      .join(' · ')

  return { formatDate, authorLine, shortByline }
}
