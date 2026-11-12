/**
 * Por qué no se ha guardado el ranking de una clase: con la clase archivada o en la
 * papelera, la API lo rechaza (409) y se dice qué hacer; si no, lo que se pase o el
 * aviso de siempre.
 */
export function useRankingSaveError() {
  const { t } = useI18n()
  return (error: unknown, fallback?: string): string => {
    const code = (error as { data?: { code?: string } })?.data?.code
    if (code === 'CLASS_ARCHIVED')
      return t('teacher.classes.detail.settings.ranking.closed_archived')
    if (code === 'CLASS_IN_TRASH') return t('teacher.classes.detail.settings.ranking.closed_trash')
    return fallback || t('teacher.classes.detail.settings.toast_error')
  }
}
