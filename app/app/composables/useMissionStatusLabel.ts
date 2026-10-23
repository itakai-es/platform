import type { TeacherMissionStatus } from '~/utils/mission-teacher-status'

/**
 * useMissionStatusLabel — el nombre de cada estado de una misión («Activa»,
 * «Bloqueada»…), el mismo en el filtro de estado, en la lista para ordenar, en
 * el mapa y en la insignia de las tarjetas. Las claves van escritas tal cual
 * para que las encuentre la comprobación de i18n.
 */
export function useMissionStatusLabel() {
  const { t } = useI18n()
  return (status: TeacherMissionStatus | string): string => {
    switch (status) {
      case 'urgente':
        return t('teacher.components.mission_filter_bar.status.urgent')
      case 'completada':
        return t('teacher.components.mission_filter_bar.status.completed')
      case 'expirada':
        return t('teacher.components.mission_filter_bar.status.expired')
      case 'bloqueada':
        return t('teacher.components.mission_filter_bar.status.locked')
      default:
        return t('teacher.components.mission_filter_bar.status.active')
    }
  }
}
