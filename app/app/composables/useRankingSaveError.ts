/**
 * Por qué no se ha guardado el ranking (o una funcionalidad, `features`) de una
 * clase: con la clase archivada o en la papelera, la API lo rechaza (409) y se dice
 * qué hacer; si no, lo que se pase o el aviso de siempre.
 */
export function useRankingSaveError() {
  const { t } = useI18n()
  return (error: unknown, fallback?: string, scope: 'ranking' | 'features' = 'ranking'): string => {
    const code = (error as { data?: { code?: string } })?.data?.code
    if (code === 'CLASS_ARCHIVED') {
      return scope === 'features'
        ? t('teacher.classes.detail.settings.features.closed_archived')
        : t('teacher.classes.detail.settings.ranking.closed_archived')
    }
    if (code === 'CLASS_IN_TRASH') {
      return scope === 'features'
        ? t('teacher.classes.detail.settings.features.closed_trash')
        : t('teacher.classes.detail.settings.ranking.closed_trash')
    }
    return fallback || t('teacher.classes.detail.settings.toast_error')
  }
}
