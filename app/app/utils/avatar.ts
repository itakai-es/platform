import type { TeamColor } from '~/types/team.types'
import { TEAM_COLOR_KEYS } from '~/utils/team-style'

/**
 * Avatares: un solo sitio para el catálogo del alumnado, el del profesorado, las
 * iniciales y el color de fondo. Lo usa el átomo `Avatar`, que es el único que
 * pinta un avatar en la aplicación.
 *
 * - El alumnado lleva un avatar **por clase**: uno de los cinco personajes (se
 *   guarda la ruta, `/app/avatars/atenea.svg`) o uno generado con IA. La API
 *   tiene la misma lista para validar (`api/src/utils/enrollment.ts`).
 * - El profesorado lleva un avatar **por cuenta**, guardado como clave del
 *   catálogo docente (nunca una ruta). Hoy son iniciales sobre un color; un
 *   retrato se añade como una entrada más del catálogo, con su `portrait`.
 * - El fondo es un color de la paleta de equipos (tokens: responde a los modos
 *   de daltonismo y de alto contraste), elegido o derivado de un id.
 */

/** Los personajes del alumnado, en el orden en que se ofrecen. */
export const STUDENT_AVATAR_KEYS = ['atenea', 'odiseo', 'penelope', 'polifemo', 'poseidon'] as const

export type StudentAvatarKey = (typeof STUDENT_AVATAR_KEYS)[number]

const CATALOG_DIR = '/app/avatars/'
const PORTRAIT_DIR = '/app/avatars/retratos/'

/** La ruta del personaje entero, la que se guarda en la matrícula. */
export function studentAvatarSrc(key: StudentAvatarKey): string {
  return `${CATALOG_DIR}${key}.svg`
}

/** La clave del personaje si `src` es del catálogo; null si es otra imagen (generada con IA). */
export function catalogKeyOf(src: string | null | undefined): StudentAvatarKey | null {
  if (!src?.startsWith(CATALOG_DIR)) return null
  const key = src.slice(CATALOG_DIR.length).replace(/\.svg$/, '')
  return (STUDENT_AVATAR_KEYS as readonly string[]).includes(key) ? (key as StudentAvatarKey) : null
}

/**
 * El retrato (cabeza y hombros) de un personaje del catálogo: el mismo dibujo con
 * otro encuadre, para los tamaños pequeños, donde el cuerpo entero deja la cara
 * en un punto. Null si la imagen no es del catálogo.
 */
export function portraitOf(src: string | null | undefined): string | null {
  const key = catalogKeyOf(src)
  return key ? `${PORTRAIT_DIR}${key}.svg` : null
}

/**
 * Iniciales de un nombre: la primera letra del nombre y la del último apellido
 * («María López García» → «MG»); con una sola palabra, sus dos primeras letras.
 */
export function avatarInitials(name: string | null | undefined): string {
  const words = (name ?? '').trim().split(/\s+/).filter(Boolean)
  if (words.length === 0) return '?'
  const first = [...words[0]!]
  if (words.length === 1) return first.slice(0, 2).join('').toLocaleUpperCase()
  const last = [...words[words.length - 1]!]
  return `${first[0]}${last[0]}`.toLocaleUpperCase()
}

/** Hash pequeño y estable de un texto (el mismo texto da siempre el mismo número). */
function hashText(text: string): number {
  let hash = 0
  for (let i = 0; i < text.length; i++) {
    hash = (hash << 5) - hash + text.charCodeAt(i)
    hash |= 0
  }
  return Math.abs(hash)
}

/** Color de la paleta que le toca a un id: siempre el mismo, sin guardarlo en ningún sitio. */
export function avatarColorOf(seed: string | null | undefined): TeamColor {
  return TEAM_COLOR_KEYS[hashText(seed ?? '') % TEAM_COLOR_KEYS.length]!
}

/**
 * De dónde sale el color del avatar de un estudiante: su matrícula, es decir, la
 * clase y la persona. Como el avatar, es de cada clase: en otra clase puede ser
 * otro color.
 */
export function studentAvatarSeed(
  classId: string | null | undefined,
  studentId: string | null | undefined
): string {
  return `${classId ?? ''}:${studentId ?? ''}`
}

/** Una entrada del catálogo docente: el color de fondo y, si lo tiene, su retrato. */
export interface TeacherAvatarEntry {
  color: TeamColor
  /** Retrato ilustrado. Sin él, iniciales sobre el color. */
  portrait?: string
}

/**
 * Catálogo del avatar del profesorado, por clave. Hoy, uno por color de la
 * paleta (iniciales sobre ese color); para añadir retratos basta con añadir
 * entradas con su `portrait`, y la clave a la lista de la API
 * (`api/src/utils/avatars.ts`).
 */
export const TEACHER_AVATARS: Record<string, TeacherAvatarEntry> = Object.fromEntries(
  TEAM_COLOR_KEYS.map(color => [color, { color }])
)

export const TEACHER_AVATAR_KEYS = Object.keys(TEACHER_AVATARS)

/** La entrada del catálogo docente de una clave guardada; null si no tiene (o ya no existe). */
export function teacherAvatarOf(key: string | null | undefined): TeacherAvatarEntry | null {
  // Solo las claves propias del catálogo: «constructor» no es un avatar.
  return key && Object.hasOwn(TEACHER_AVATARS, key) ? TEACHER_AVATARS[key]! : null
}
