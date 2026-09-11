import {
  AcademicCapIcon,
  BookOpenIcon,
  Cog6ToothIcon,
  FaceSmileIcon,
  LifebuoyIcon,
  MapIcon,
  RocketLaunchIcon,
  SparklesIcon,
  TrophyIcon,
  UserCircleIcon,
  UserGroupIcon,
} from '@heroicons/vue/24/outline'
import type { Component } from 'vue'

/**
 * Iconos de las categorías del centro de ayuda.
 *
 * El contenido guarda un nombre («misiones», «gamificacion»…) y aquí se traduce
 * al icono del sistema. Se usa Heroicons, como el resto de la aplicación: los
 * emojis desentonan con todo lo demás.
 */
export const HELP_ICONS: Record<string, Component> = {
  'primeros-pasos': RocketLaunchIcon,
  clases: AcademicCapIcon,
  misiones: MapIcon,
  gamificacion: TrophyIcon,
  alumnado: UserGroupIcon,
  'ia-y-configuracion': SparklesIcon,
  'tu-cuenta': UserCircleIcon,
  'si-eres-alumno': FaceSmileIcon,
  'cuando-algo-falla': LifebuoyIcon,
  configuracion: Cog6ToothIcon,
}

export function helpIcon(name?: string | null): Component {
  return (name && HELP_ICONS[name]) || BookOpenIcon
}
