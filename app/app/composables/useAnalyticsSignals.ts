import type { Component } from 'vue'
import {
  ArrowTrendingDownIcon,
  CalendarDaysIcon,
  LightBulbIcon,
  NoSymbolIcon,
  PauseCircleIcon,
} from '@heroicons/vue/24/solid'
import type { Signal } from '~/components/molecules/SignalList.vue'
import type { AnalyticsSignal } from '~/types/analytics.types'
import { formatDateShort } from '~/utils/analytics-view'
import { studentAvatarSeed } from '~/utils/avatar'

/** De dónde sacar el avatar de una persona y la portada de una misión de la pantalla. */
export interface SignalLookup {
  student?: (id: string) => { avatar: string | null } | undefined
  mission?: (id: string) => { cover: string | null; rarity: string } | undefined
}

/**
 * El texto y el enlace de una señal de dificultad: la API manda `scope` + `code`
 * con sus datos y aquí se escribe en el idioma de la app. `reason` (en
 * castellano) queda solo de reserva, para un código que esta versión no conozca.
 *
 * - En el panel de la clase (`where: 'class'`), cada señal dice de quién o de qué
 *   misión es (`title`) y lleva a la página del estudiante o a la misión.
 * - En la página de un estudiante (`where: 'student'`) ya se sabe de quién es:
 *   sin título, y solo enlaza si hay una misión a la que ir.
 *
 * `lookup` da, de lo que ya hay en la pantalla, el avatar de cada persona y la
 * portada de cada misión: la señal sale con su cara o su portada (`SignalList`).
 */
export function useAnalyticsSignals(
  classIdRef: Ref<string> | ComputedRef<string>,
  lookup: SignalLookup = {}
) {
  const { t, locale } = useI18n()
  const { formatNumber, formatPercent } = useNumberFormat()

  const date = (iso: string) => formatDateShort(iso, locale.value)

  function text(signal: AnalyticsSignal): string {
    const count = signal.count ?? 1
    const many = count > 1
    if (signal.scope === 'mission') {
      switch (signal.code) {
        case 'unfinished_after_deadline':
          return t('teacher.analytics.signals.mission.unfinished_after_deadline', {
            unfinished: formatNumber(signal.data.unfinished),
            started: formatNumber(signal.data.started),
            percent: formatPercent(signal.data.percent),
          })
        case 'low_average':
          return t(
            'teacher.analytics.signals.mission.low_average',
            {
              average: formatPercent(signal.data.average),
              approvals: formatNumber(signal.data.approvals),
              threshold: formatPercent(signal.data.threshold),
            },
            signal.data.approvals
          )
        case 'students_expired':
          return t(
            'teacher.analytics.signals.mission.students_expired',
            { count: formatNumber(signal.data.count) },
            signal.data.count
          )
        case 'many_hints':
          return t('teacher.analytics.signals.mission.many_hints', {
            perStudent: formatNumber(signal.data.perStudent),
          })
      }
    }
    if (signal.scope === 'student') {
      switch (signal.code) {
        case 'inactive': {
          const open = signal.data.openMissions
          const params = { days: signal.data.days, count: open }
          return signal.data.lastActivityAt
            ? t('teacher.analytics.signals.student.inactive', params, open)
            : t('teacher.analytics.signals.student.inactive_never', params, open)
        }
        case 'mission_expired':
          if (many) {
            return t('teacher.analytics.signals.student.mission_expired_many', {
              count,
              mission: signal.data.missionTitle,
              date: date(signal.data.deadline),
            })
          }
          return signal.data.started
            ? t('teacher.analytics.signals.student.mission_expired_started', {
                mission: signal.data.missionTitle,
                date: date(signal.data.deadline),
              })
            : t('teacher.analytics.signals.student.mission_expired', {
                mission: signal.data.missionTitle,
                date: date(signal.data.deadline),
              })
        case 'low_grade':
          if (many) {
            return t('teacher.analytics.signals.student.low_grade_many', {
              count,
              threshold: formatPercent(signal.data.threshold),
              enigma: signal.data.enigmaTitle,
              percent: formatPercent(signal.data.percentage),
            })
          }
          return t('teacher.analytics.signals.student.low_grade', {
            enigma: signal.data.enigmaTitle,
            mission: signal.data.missionTitle,
            percent: formatPercent(signal.data.percentage),
            threshold: formatPercent(signal.data.threshold),
          })
        case 'low_average':
          return t(
            'teacher.analytics.signals.student.low_average',
            {
              average: formatPercent(signal.data.average),
              approvals: formatNumber(signal.data.approvals),
              threshold: formatPercent(signal.data.threshold),
            },
            signal.data.approvals
          )
        case 'hints':
          if (many) {
            return t('teacher.analytics.signals.student.hints_many', {
              count,
              mission: signal.data.missionTitle,
              hints: formatNumber(signal.data.hints),
            })
          }
          return signal.data.percentHints > 0
            ? t(
                'teacher.analytics.signals.student.hints_percent',
                {
                  count: signal.data.hints,
                  mission: signal.data.missionTitle,
                  // «(1 resta % de la recompensa)»: cuántas de ellas son de las que restan.
                  detail: t(
                    'teacher.analytics.signals.student.hints_percent_detail',
                    { count: signal.data.percentHints },
                    signal.data.percentHints
                  ),
                },
                signal.data.hints
              )
            : t(
                'teacher.analytics.signals.student.hints',
                { count: signal.data.hints, mission: signal.data.missionTitle },
                signal.data.hints
              )
        case 'low_attendance':
          return t(
            'teacher.analytics.signals.student.low_attendance',
            {
              rate: formatPercent(signal.data.rate),
              attended: formatNumber(signal.data.attended),
              total: formatNumber(signal.data.total),
            },
            signal.data.total
          )
      }
    }
    return (signal as AnalyticsSignal).reason
  }

  const ICONS: Record<string, Component> = {
    'student.inactive': PauseCircleIcon,
    'student.mission_expired': NoSymbolIcon,
    'mission.students_expired': NoSymbolIcon,
    'mission.unfinished_after_deadline': NoSymbolIcon,
    'student.low_attendance': CalendarDaysIcon,
    'student.low_average': ArrowTrendingDownIcon,
    'mission.low_average': ArrowTrendingDownIcon,
    'student.low_grade': ArrowTrendingDownIcon,
    'student.hints': LightBulbIcon,
    'mission.many_hints': LightBulbIcon,
  }

  const missionLink = (id: string) => `/profesor/clases/${unref(classIdRef)}/misiones/${id}`

  /** El id estable de una señal en su lista. */
  function signalId(signal: AnalyticsSignal, index: number): string {
    return `${signal.scope}-${signal.code}-${index}`
  }

  /** La portada de una misión, si la pantalla la tiene. */
  function coverOf(missionId: string): Signal['cover'] {
    const mission = lookup.mission?.(missionId)
    return mission ? { src: mission.cover, rarity: mission.rarity } : undefined
  }

  /** Lo que pinta `SignalList`, en el panel de la clase. */
  function classSignal(signal: AnalyticsSignal, index: number): Signal {
    const base = {
      id: signalId(signal, index),
      text: text(signal),
      icon: ICONS[`${signal.scope}.${signal.code}`],
    }
    if (signal.scope === 'student') {
      return {
        ...base,
        title: signal.data.studentName,
        to: `/profesor/clases/${unref(classIdRef)}/alumnos/${signal.studentId}`,
        person: {
          name: signal.data.studentName,
          avatar: lookup.student?.(signal.studentId)?.avatar ?? null,
          seed: studentAvatarSeed(unref(classIdRef), signal.studentId),
        },
      }
    }
    return {
      ...base,
      title: signal.data.missionTitle,
      to: missionLink(signal.missionId),
      cover: coverOf(signal.missionId),
    }
  }

  /** Lo que pinta `SignalList`, en la página de un estudiante. */
  function studentSignal(signal: AnalyticsSignal, index: number): Signal {
    const missionId =
      'missionId' in signal.data ? (signal.data as { missionId: string }).missionId : null
    return {
      id: signalId(signal, index),
      text: text(signal),
      icon: ICONS[`${signal.scope}.${signal.code}`],
      to: missionId ? missionLink(missionId) : undefined,
      cover: missionId ? coverOf(missionId) : undefined,
    }
  }

  return { classSignal, studentSignal }
}
