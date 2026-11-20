/**
 * Cursos del centro de ayuda.
 *
 * Un curso no tiene contenido propio: es un recorrido corto y en orden por
 * guías que ya existen, pensado para empezar desde cero (el profesorado que
 * monta su primera clase, el alumnado que entra por primera vez). La
 * documentación completa sigue en las categorías; aquí solo se elige qué leer
 * y en qué orden.
 *
 * Los títulos y resúmenes de cada lección salen del índice de la ayuda: aquí
 * se guardan solo la categoría y el slug. Una lección cuyo artículo no esté
 * publicado (o no exista en esta instancia) se omite al pintar el curso.
 * El nombre y la descripción del curso van en i18n
 * (`common.help.courses.items.<slug>`).
 */

import type { HelpCardType } from '~/utils/help-accents'

export type HelpCourseAudience = 'profesor' | 'alumno' | 'desarrollador'

export interface HelpCourseLessonRef {
  categoria: string
  articulo: string
}

export interface HelpCourse {
  slug: string
  audience: HelpCourseAudience
  /** Color de la tarjeta, como las categorías. */
  accent: HelpCardType
  /** Icono de `HELP_ICONS` (los de las categorías). */
  icon: string
  /**
   * Portada 16:9 del curso, como la de una lista de reproducción. Se publica
   * con los medios de la ayuda; si no carga, la tarjeta pinta su color e icono.
   */
  cover: string
  lessons: HelpCourseLessonRef[]
}

/** Dónde está la portada de un curso: junto al resto de medios de la ayuda. */
function helpCourseCover(slug: string) {
  return `/help-media/cursos/${slug}.webp`
}

const lesson = (path: string): HelpCourseLessonRef => {
  const [categoria = '', articulo = ''] = path.split('/')
  return { categoria, articulo }
}

export const HELP_COURSES: HelpCourse[] = [
  {
    slug: 'primeros-pasos-docentes',
    cover: helpCourseCover('primeros-pasos-docentes'),
    audience: 'profesor',
    accent: 'ia',
    icon: 'primeros-pasos',
    lessons: [
      'primeros-pasos/que-es-itakai',
      'primeros-pasos/crear-tu-primera-clase',
      'primeros-pasos/invitar-alumnos-a-una-clase',
      'primeros-pasos/la-narrativa-de-tu-clase',
      'misiones/crear-una-mision',
      'misiones/revisar-entregas',
    ].map(lesson),
  },
  {
    slug: 'misiones-a-fondo',
    cover: helpCourseCover('misiones-a-fondo'),
    audience: 'profesor',
    accent: 'pending',
    icon: 'misiones',
    lessons: [
      'misiones/enigmas-los-pasos-de-una-mision',
      'misiones/recompensas-xp-monedas-y-mana',
      'misiones/rarezas-y-fechas-de-entrega',
      'misiones/pistas-en-las-misiones',
      'misiones/el-orden-de-las-misiones',
      'misiones/el-mapa-de-misiones',
      'misiones/montar-el-camino-del-mapa',
    ].map(lesson),
  },
  {
    slug: 'gamifica-tu-clase',
    cover: helpCourseCover('gamifica-tu-clase'),
    audience: 'profesor',
    accent: 'clases',
    icon: 'gamificacion',
    lessons: [
      'gamificacion/monedas-y-tienda-de-clase',
      'gamificacion/comportamientos-y-puntos-de-vida',
      'gamificacion/insignias',
      'gamificacion/niveles-y-rangos',
      'gamificacion/premiar-a-un-equipo-y-ver-la-clasificacion',
      'gamificacion/usar-la-ruleta-en-clase',
    ].map(lesson),
  },
  {
    slug: 'empieza-como-estudiante',
    cover: helpCourseCover('empieza-como-estudiante'),
    audience: 'alumno',
    accent: 'stats',
    icon: 'si-eres-alumno',
    lessons: [
      'si-eres-alumno/como-entro-en-mi-clase',
      'si-eres-alumno/entrar-con-usuario-y-contrasena',
      'si-eres-alumno/cambiar-la-contrasena-la-primera-vez',
      'si-eres-alumno/como-entrego-una-mision',
      'si-eres-alumno/que-son-el-xp-las-monedas-y-el-mana',
      'si-eres-alumno/mi-avatar-y-mi-nombre-en-clase',
      'si-eres-alumno/la-clasificacion-de-la-clase',
    ].map(lesson),
  },
  {
    slug: 'desarrollo-itakai',
    cover: helpCourseCover('desarrollo-itakai'),
    audience: 'desarrollador',
    accent: 'ia',
    icon: 'desarrollo',
    lessons: [
      'desarrollo/bienvenida',
      'desarrollo/herramientas-ia',
      'desarrollo/entorno-y-mcp',
      'desarrollo/bmad-method',
      'desarrollo/itakai-en-local',
      'desarrollo/onboarding-del-profesor',
    ].map(lesson),
  },
]

export function helpCourse(slug?: string | null): HelpCourse | null {
  return HELP_COURSES.find(course => course.slug === slug) ?? null
}

/**
 * Si un artículo es una lección de un curso. No necesita el índice: decide qué
 * plantilla se monta (lección o guía) en cuanto se conoce la URL, sin esperar a
 * la API y sin que la página cambie de aspecto a medio cargar.
 */
export function helpCourseHasLesson(courseSlug: unknown, categoria: unknown, articulo: unknown) {
  if (typeof courseSlug !== 'string') return false
  return !!helpCourse(courseSlug)?.lessons.some(
    lesson => lesson.categoria === categoria && lesson.articulo === articulo
  )
}

/** Los cursos en los que aparece un artículo, para enlazarlos desde la guía suelta. */
export function helpCoursesWithLesson(categoria: string, articulo: string) {
  return HELP_COURSES.filter(course =>
    course.lessons.some(lesson => lesson.categoria === categoria && lesson.articulo === articulo)
  )
}

export const HELP_COURSES_PATH = '/ayuda/cursos'

export function helpCoursePath(slug: string) {
  return `${HELP_COURSES_PATH}/${slug}`
}

/** Minutos de vídeo de un curso, redondeando hacia arriba: «7 min», nunca «0 min». */
export function helpCourseMinutes(seconds: number) {
  return Math.max(1, Math.ceil(seconds / 60))
}
