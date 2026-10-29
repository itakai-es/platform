import { resolveDateLocale } from '~/utils/notifications'

/**
 * useMissionPathText — el texto del camino del mapa de misiones: «Se abre al
 * completar «A» y «B»». El mismo en el mapa, en las tarjetas, en el detalle de
 * una misión cerrada y en la lista para ordenar. Las comillas son las de cada
 * idioma y la lista se une como en ese idioma («A y B», «A, B i C»…).
 */
export function useMissionPathText() {
  const { t, locale } = useI18n()

  /** «A» y «B»: los títulos entre comillas, unidos como en el idioma de la app. */
  function missionList(titles: string[]): string {
    const quoted = titles.map(title => t('common.mission_map.quoted', { title }))
    return new Intl.ListFormat(resolveDateLocale(locale.value), { type: 'conjunction' }).format(
      quoted
    )
  }

  /** «Se abre al completar «A» y «B»». */
  function opensAfter(missions: { title: string }[]): string {
    return t('common.mission_map.opens_after', {
      missions: missionList(missions.map(m => m.title)),
    })
  }

  return { missionList, opensAfter }
}
