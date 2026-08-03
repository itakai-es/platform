/**
 * Idiomas de interfaz soportados por ITAKAI.
 *
 * Fuente única de verdad: el código de idioma se repetía a mano en la config de
 * i18n, los tipos, los selectores de perfil y de admin. Añadir un idioma nuevo
 * solo debería tocar esta lista (y sus 9 ficheros de traducción).
 *
 * `endonym` es el nombre del idioma en sí mismo, para selectores donde no hay
 * traducción disponible (p. ej. el panel de administración). Los selectores de
 * perfil sí usan claves i18n (`*.profile.languages.<code>`) para mostrar el
 * nombre en el idioma activo.
 */
export const APP_LANGUAGES = [
  { code: 'es', endonym: 'Castellano' },
  { code: 'en', endonym: 'English' },
  { code: 'ca', endonym: 'Català' },
  { code: 'val', endonym: 'Valencià' },
  { code: 'eu', endonym: 'Euskara' },
  { code: 'gl', endonym: 'Galego' },
  { code: 'ast', endonym: 'Asturianu' },
  { code: 'pt', endonym: 'Português' },
  { code: 'el', endonym: 'Ελληνικά' },
  { code: 'ro', endonym: 'Română' },
] as const

/** Código de idioma de interfaz (`'es' | 'en' | ...`). */
export type AppLanguage = (typeof APP_LANGUAGES)[number]['code']

/** Solo los códigos, en el orden en que se muestran en los selectores. */
export const APP_LANGUAGE_CODES = APP_LANGUAGES.map(lang => lang.code) as AppLanguage[]

/** Ficheros de traducción que compone cada idioma (mismos nombres en todos). */
export const LOCALE_FILES = [
  'common.json',
  'auth.json',
  'student.json',
  'teacher.json',
  'admin.json',
  'profile.json',
  'gamification.json',
  'chat.json',
  'legal.json',
] as const

/** True si el código recibido (cookie, BD, querystring) es un idioma soportado. */
export function isAppLanguage(code: unknown): code is AppLanguage {
  return typeof code === 'string' && (APP_LANGUAGE_CODES as string[]).includes(code)
}
