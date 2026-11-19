import { NuxtLink } from '#components'
import type { RankingStudent } from '~/types/ranking.types'

/**
 * Lo común a cada entrada de una clasificación, en el podio y en la lista: si es
 * un enlace a la página del estudiante (la vista del profesorado) y si es quien
 * mira (la del alumnado).
 */
export function useRankingEntry(
  props: Readonly<{
    studentLink?: (studentId: string) => string
    highlightYou?: boolean
  }>
) {
  const { t } = useI18n()

  const isYou = (student: RankingStudent) => !!props.highlightYou && !!student.isCurrentUser

  const rankLabel = (student: RankingStudent) =>
    t('student.components.class_ranking_section.rank_sr', { rank: student.rank })

  const entryTag = computed(() => (props.studentLink ? NuxtLink : 'div'))

  const entryAttrs = (student: RankingStudent) =>
    props.studentLink ? { to: props.studentLink(student.id) } : {}

  const linkClass = computed(() =>
    props.studentLink ? 'hover:shadow-md transition-shadow focus-visible:outline-offset-2' : ''
  )

  const youBadgeClass =
    'px-1.5 py-0.5 bg-yellow text-navy-700 text-xs font-bold rounded-full flex-shrink-0'

  return { isYou, rankLabel, entryTag, entryAttrs, linkClass, youBadgeClass }
}
