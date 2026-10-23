import type { MissionStatus, MissionRarity } from '~/types/mission.types'
import { resolveDateLocale } from '~/utils/notifications'

/**
 * Props compartidas por todas las representaciones de una tarjeta de misión
 * (cuadrícula y fila). MissionCardEnhanced las reenvía a la variante activa.
 */
export interface MissionCardProps {
  id: string
  title: string
  description: string
  status: MissionStatus
  rarity?: MissionRarity
  progress?: number
  timeRemaining?: string
  xpReward: number
  coinReward?: number
  manaReward?: number
  earnedXp?: number
  earnedCoins?: number
  earnedMana?: number
  backgroundImage?: string
  classId?: string
  className?: string
  // Teacher mode props
  completedCount?: number
  totalStudents?: number
  deadline?: string | null
  // Compat: se conserva para no romper llamadas existentes (ignorado)
  compact?: boolean
}

/**
 * useMissionCard - Toda la lógica derivada de una tarjeta de misión.
 *
 * Se extrae aquí para que las variantes de layout (MissionCardGrid y
 * MissionCardRow) compartan exactamente el mismo comportamiento sin duplicar
 * cálculos de estado, progreso, recompensas o navegación.
 */
export function useMissionCard(props: MissionCardProps, emit: (e: 'click') => void) {
  const { t, locale } = useI18n()
  const toast = useToast()
  const { getImageUrl } = useImageUrl()

  const resolvedBgImage = computed(() => {
    const url = props.backgroundImage
    if (!url) return ''
    if (url.startsWith('/app/')) return url
    return getImageUrl(url) ?? ''
  })

  // Modo profesor: se distingue por recibir el recuento de estudiantes.
  const isTeacherMode = computed(
    () => props.completedCount !== undefined && props.totalStudents !== undefined
  )

  // El alumno ve "obtenido / total" una vez ha ganado algo y no ha llegado al tope.
  const showEarnedXp = computed(
    () =>
      !isTeacherMode.value &&
      props.earnedXp !== undefined &&
      props.earnedXp > 0 &&
      props.earnedXp < props.xpReward
  )
  const showEarnedCoins = computed(
    () =>
      !isTeacherMode.value &&
      props.earnedCoins !== undefined &&
      props.earnedCoins > 0 &&
      !!props.coinReward &&
      props.earnedCoins < props.coinReward
  )
  const showEarnedMana = computed(
    () =>
      !isTeacherMode.value &&
      props.earnedMana !== undefined &&
      props.earnedMana > 0 &&
      !!props.manaReward &&
      props.earnedMana < props.manaReward
  )

  // En el idioma de la app, no en el del navegador (ver resolveDateLocale).
  const formattedDeadline = computed(() => {
    if (!props.deadline) return null
    const date = new Date(props.deadline)
    return date.toLocaleDateString(resolveDateLocale(locale.value), {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    })
  })
  const expiredOnLabel = computed(() =>
    formattedDeadline.value
      ? t('student.missions.expired_on', { date: formattedDeadline.value })
      : null
  )

  // Profesor: misión completada por todos los estudiantes.
  const isFullyCompletedTeacher = computed(() => {
    if (!isTeacherMode.value) return false
    if (props.totalStudents === 0) return false
    return props.completedCount === props.totalStudents
  })

  // Progreso: personal (alumno) o % de finalización (profesor).
  const progressValue = computed(() => {
    if (props.status === 'completada') return 100
    if (props.status === 'bloqueada') return 0
    if (isTeacherMode.value) {
      if (props.totalStudents === 0) return 0
      return Math.round((props.completedCount! / props.totalStudents!) * 100)
    }
    return props.progress ?? 0
  })

  const missionLink = computed(() => {
    if (props.classId) {
      return `/alumno/clases/${props.classId}/misiones/${props.id}`
    }
    return `/alumno/misiones/${props.id}`
  })

  // El mismo nombre que en el filtro de estado y en el mapa, en el idioma de la
  // app. La insignia solo sale con urgente, expirada o bloqueada.
  const missionStatusLabel = useMissionStatusLabel()
  const statusLabel = computed(() => missionStatusLabel(props.status))

  // La insignia de estado solo se muestra para urgente/expirada, o bloqueada en
  // modo profesor, y nunca cuando ya está completada por todos.
  const showStatusBadge = computed(
    () =>
      !isFullyCompletedTeacher.value &&
      (props.status === 'urgente' ||
        props.status === 'expirada' ||
        (props.status === 'bloqueada' && isTeacherMode.value))
  )

  const progressBarColor = computed(() => {
    if (props.status === 'bloqueada') return '#9CA3AF'
    if (props.status === 'expirada') return '#6B7280'
    const colors: Record<string, string> = {
      comun: 'var(--color-progress-comun)',
      rara: 'var(--color-progress-rara)',
      epica: 'var(--color-progress-epica)',
      legendaria: 'var(--color-progress-legendaria)',
    }
    return colors[props.rarity || 'comun'] || colors.comun
  })

  const handleCardClick = () => {
    if (isTeacherMode.value) {
      emit('click')
      return
    }
    if (props.status === 'bloqueada') {
      toast.info(t('student.missions.locked_toast'))
    }
    // Las misiones expiradas se abren en solo lectura (el enlace navega).
  }

  return {
    t,
    resolvedBgImage,
    isTeacherMode,
    showEarnedXp,
    showEarnedCoins,
    showEarnedMana,
    formattedDeadline,
    expiredOnLabel,
    isFullyCompletedTeacher,
    progressValue,
    missionLink,
    statusLabel,
    showStatusBadge,
    progressBarColor,
    handleCardClick,
  }
}
