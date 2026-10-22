import type { Component } from 'vue'
import { CheckCircleIcon, XCircleIcon, ClockIcon, DocumentCheckIcon } from '@heroicons/vue/24/solid'
import type { AttendanceStatus } from '~/composables/useClassAttendance'

/**
 * Cómo se ve cada estado de asistencia: icono y color, siempre junto a su
 * texto (`teacher.attendance.status.*`), para que el color nunca sea la única
 * pista. La inicial es para la rejilla del histórico, donde no cabe la palabra.
 */
export const ATTENDANCE_STATUS_META: Record<AttendanceStatus, { icon: Component; color: string }> =
  {
    present: { icon: CheckCircleIcon, color: 'text-success' },
    absent: { icon: XCircleIcon, color: 'text-error' },
    late: { icon: ClockIcon, color: 'text-amber-600' },
    excused: { icon: DocumentCheckIcon, color: 'text-navy-700' },
  }
