import type { MissionRequirement } from '~/types/mission.types'
import { formatConjunction } from '~/utils/list-format'

/** Una misión requisito, como se nombra: su título y, si llega, su `state`. */
type NamedRequirement = Pick<MissionRequirement, 'title'> &
  Partial<Pick<MissionRequirement, 'state'>>

/**
 * useMissionPathText — el texto del camino del mapa de misiones: «Se abre al
 * completar «A» y «B»». El mismo en el mapa, en las tarjetas, en el detalle de
 * una misión cerrada y en la lista para ordenar. Las comillas son las de cada
 * idioma y la lista se une como en ese idioma («A y B», «A, B i C»…; ver
 * `formatConjunction`). Un requisito que su docente tiene cerrado lo dice:
 * «A» (cerrada por tu docente por ahora).
 */
export function useMissionPathText() {
  const { t, locale } = useI18n()

  /** «A», o «A» (cerrada por tu docente por ahora) si aún no se puede hacer. */
  function requirementName(mission: NamedRequirement): string {
    return mission.state === 'teacher'
      ? t('common.mission_map.quoted_teacher_closed', { title: mission.title })
      : t('common.mission_map.quoted', { title: mission.title })
  }

  /** «A» y «B»: los títulos entre comillas, unidos como en el idioma de la app. */
  function missionList(missions: NamedRequirement[]): string {
    return formatConjunction(
      missions.map(requirementName),
      locale.value,
      t('common.mission_map.and')
    )
  }

  /** «Se abre al completar «A» y «B»». */
  function opensAfter(missions: NamedRequirement[]): string {
    return t('common.mission_map.opens_after', { missions: missionList(missions) })
  }

  return { missionList, opensAfter }
}
