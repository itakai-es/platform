/**
 * Catálogos de avatares, para validar lo que llega. Lo que se pinta (nombres,
 * retratos, colores) vive en la aplicación (`app/app/utils/avatar.ts`), con las
 * mismas listas.
 *
 * - Alumnado: un avatar **por clase**, guardado como ruta del personaje
 *   (`ClassEnrollment.avatarUrl`), o el generado con IA de esa matrícula.
 * - Profesorado: un avatar **por cuenta**, guardado como clave del catálogo
 *   docente (`User.avatar`), nunca como ruta ni URL. Hoy cada clave es un color de
 *   la paleta de equipos: iniciales sobre ese color. Un retrato ilustrado se
 *   añade como una clave más, aquí y en la aplicación, sin migrar nada.
 */

/** Los personajes del alumnado (dioses y héroes griegos), por su ruta. */
export const STUDENT_AVATARS = [
  '/app/avatars/atenea.svg',
  '/app/avatars/odiseo.svg',
  '/app/avatars/penelope.svg',
  '/app/avatars/polifemo.svg',
  '/app/avatars/poseidon.svg',
]

/** ¿Es un personaje del catálogo del alumnado? */
export function isStudentCatalogAvatar(value: string): boolean {
  return STUDENT_AVATARS.includes(value)
}

/**
 * Avatar que el alumnado puede ponerse en una clase: uno del catálogo o el que ya
 * tiene (el generado con IA lo escribe el servidor). Nunca una dirección cualquiera:
 * la cargarían los navegadores de toda la clase.
 */
export function isAllowedClassAvatar(value: string, current: string | null): boolean {
  return isStudentCatalogAvatar(value) || value === current
}

/** Claves del catálogo docente: los personajes y los colores de la paleta de equipos. */
// Los personajes (sus retratos) y, para quien prefiera sus iniciales, los colores.
export const TEACHER_AVATAR_KEYS = [
  'atenea',
  'odiseo',
  'penelope',
  'polifemo',
  'poseidon',
  'purple',
  'yellow',
  'mint',
  'sky',
  'red',
  'peach',
] as const

export type TeacherAvatarKey = (typeof TEACHER_AVATAR_KEYS)[number]

export function isTeacherAvatarKey(value: unknown): value is TeacherAvatarKey {
  return typeof value === 'string' && (TEACHER_AVATAR_KEYS as readonly string[]).includes(value)
}
