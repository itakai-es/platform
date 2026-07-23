import type { MissionStatus, MissionRarity } from '~/types/mission.types'

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
  const { t } = useI18n()
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

  const formattedDeadline = computed(() => {
    if (!props.deadline) return null
    const date = new Date(props.deadline)
    return date.toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' })
  })

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

  const statusLabel = computed(() => {
    const labels: Record<MissionStatus, string> = {
      urgente: 'Urgente',
      activa: 'Activa',
      completada: 'Completada',
      bloqueada: 'Bloqueada',
      expirada: 'Expirada',
      pendiente: 'Pendiente',
    }
    return labels[props.status]
  })

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
      toast.info(
        'Esta misión estará disponible pronto. ¡Completa las misiones anteriores para desbloquearla!'
      )
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
    isFullyCompletedTeacher,
    progressValue,
    missionLink,
    statusLabel,
    showStatusBadge,
    progressBarColor,
    handleCardClick,
  }
}
