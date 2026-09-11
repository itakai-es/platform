/**
 * Accesibilidad de plataforma (Fase 3, punto 14).
 *
 * Fuente única de verdad de los ajustes de accesibilidad: los valores válidos,
 * sus opciones para la UI y el mapeo a los atributos `data-*` que lee
 * `assets/css/accessibility.css`. El composable `useAccessibility`, el plugin
 * de arranque y la tarjeta de ajustes del perfil consumen todo desde aquí.
 *
 * Los ajustes se guardan por usuario en BD (UserSettings, vía el perfil) y se
 * espejan en localStorage para poder aplicarlos antes de que el perfil cargue.
 */

/** Tamaño de letra base: escala todo lo que está en `rem` (texto e iconos). */
export const FONT_SCALES = ['normal', 'large', 'xlarge'] as const
export type FontScale = (typeof FONT_SCALES)[number]

/** Contraste: `high` refuerza textos, bordes y foco. */
export const CONTRAST_MODES = ['normal', 'high'] as const
export type ContrastMode = (typeof CONTRAST_MODES)[number]

/**
 * Visión del color. Cada modo remapea la paleta de marca a colores que siguen
 * siendo distinguibles con esa deficiencia (base: paleta Okabe-Ito).
 */
export const COLOR_VISION_MODES = ['default', 'protanopia', 'deuteranopia', 'tritanopia'] as const
export type ColorVisionMode = (typeof COLOR_VISION_MODES)[number]

export interface AccessibilityPreferences {
  fontScale: FontScale
  contrastMode: ContrastMode
  colorVision: ColorVisionMode
  reduceMotion: boolean
}

export const ACCESSIBILITY_DEFAULTS: AccessibilityPreferences = {
  fontScale: 'normal',
  contrastMode: 'normal',
  colorVision: 'default',
  reduceMotion: false,
}

/** Clave de localStorage donde se espeja el ajuste, igual que `itakai_theme`. */
export const ACCESSIBILITY_STORAGE_KEY = 'itakai_accessibility'

/** Atributo en `<html>` por cada ajuste. Los lee el CSS de accesibilidad. */
export const ACCESSIBILITY_ATTRIBUTES = {
  fontScale: 'data-font-scale',
  contrastMode: 'data-contrast',
  colorVision: 'data-color-vision',
  reduceMotion: 'data-reduce-motion',
} as const

function isOneOf<T extends readonly string[]>(list: T, value: unknown): value is T[number] {
  return typeof value === 'string' && (list as readonly string[]).includes(value)
}

/**
 * Normaliza un objeto de origen desconocido (localStorage, respuesta de API)
 * a preferencias válidas, cayendo al valor por defecto en cada campo suelto.
 */
export function normalizeAccessibility(raw: unknown): AccessibilityPreferences {
  const source = (raw ?? {}) as Partial<Record<keyof AccessibilityPreferences, unknown>>
  return {
    fontScale: isOneOf(FONT_SCALES, source.fontScale)
      ? source.fontScale
      : ACCESSIBILITY_DEFAULTS.fontScale,
    contrastMode: isOneOf(CONTRAST_MODES, source.contrastMode)
      ? source.contrastMode
      : ACCESSIBILITY_DEFAULTS.contrastMode,
    colorVision: isOneOf(COLOR_VISION_MODES, source.colorVision)
      ? source.colorVision
      : ACCESSIBILITY_DEFAULTS.colorVision,
    reduceMotion:
      typeof source.reduceMotion === 'boolean'
        ? source.reduceMotion
        : ACCESSIBILITY_DEFAULTS.reduceMotion,
  }
}

/**
 * Escribe los ajustes en `<html>`. Los valores por defecto quitan el atributo
 * en lugar de escribirlo, para que el CSS base no necesite ninguna condición.
 */
export function applyAccessibilityToDom(prefs: AccessibilityPreferences) {
  if (!import.meta.client) return
  const root = document.documentElement

  const set = (attr: string, value: string, isDefault: boolean) => {
    if (isDefault) root.removeAttribute(attr)
    else root.setAttribute(attr, value)
  }

  set(
    ACCESSIBILITY_ATTRIBUTES.fontScale,
    prefs.fontScale,
    prefs.fontScale === ACCESSIBILITY_DEFAULTS.fontScale
  )
  set(
    ACCESSIBILITY_ATTRIBUTES.contrastMode,
    prefs.contrastMode,
    prefs.contrastMode === ACCESSIBILITY_DEFAULTS.contrastMode
  )
  set(
    ACCESSIBILITY_ATTRIBUTES.colorVision,
    prefs.colorVision,
    prefs.colorVision === ACCESSIBILITY_DEFAULTS.colorVision
  )
  set(ACCESSIBILITY_ATTRIBUTES.reduceMotion, 'true', !prefs.reduceMotion)
}

/** Lee del espejo de localStorage (vacío o corrupto → valores por defecto). */
export function readStoredAccessibility(): AccessibilityPreferences {
  if (!import.meta.client) return { ...ACCESSIBILITY_DEFAULTS }
  try {
    const raw = localStorage.getItem(ACCESSIBILITY_STORAGE_KEY)
    return normalizeAccessibility(raw ? JSON.parse(raw) : null)
  } catch {
    return { ...ACCESSIBILITY_DEFAULTS }
  }
}

export function writeStoredAccessibility(prefs: AccessibilityPreferences) {
  if (!import.meta.client) return
  try {
    localStorage.setItem(ACCESSIBILITY_STORAGE_KEY, JSON.stringify(prefs))
  } catch {
    /* modo privado o cuota llena: el ajuste sigue vivo en BD */
  }
}
