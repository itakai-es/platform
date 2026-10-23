/**
 * Per-class feature configuration ("Ajustes" panel).
 *
 * Stored as a JSON column on Class. Missing keys default to `true` (enabled),
 * so existing classes keep every feature on and adding a new flag never needs
 * a data backfill.
 *
 * Salvo las que están en pruebas (beta), que van apagadas mientras nadie las
 * encienda, también en las clases que ya existían: hoy, el mapa de misiones
 * (`missionMap`). Tampoco necesitan relleno: `resolveClassSettings` parte de
 * estos valores por defecto.
 *
 * Dependencies between features are enforced by `normalizeClassSettings` so the
 * stored/returned config can never be incoherent (e.g. shop on without coins).
 */
export interface ClassSettings {
  shop: boolean
  coins: boolean
  mana: boolean
  rankings: boolean
  xp: boolean
  behaviors: boolean
  lives: boolean
  visualEffects: boolean
  sounds: boolean
  /** Mapa de misiones (beta): una vista más en Misiones, con el orden de la clase. */
  missionMap: boolean
}

/** Las que enseña la ficha de una plantilla: todas menos las que están en pruebas. */
export type TemplateFeatures = Omit<ClassSettings, 'missionMap'>

export const DEFAULT_CLASS_SETTINGS: ClassSettings = {
  shop: true,
  coins: true,
  mana: true,
  rankings: true,
  xp: true,
  behaviors: true,
  lives: true,
  visualEffects: true,
  sounds: true,
  missionMap: false,
}

/**
 * Hard prerequisites (acyclic): disabling the prerequisite force-disables the dependent.
 *  - mana is spent on shop powers   → mana requires shop
 *  - ranking is ordered by XP       → rankings requires xp
 *  - lives are changed by behaviors → lives requires behaviors
 */
const DEPENDENCIES: Partial<Record<keyof ClassSettings, keyof ClassSettings>> = {
  mana: 'shop',
  rankings: 'xp',
  lives: 'behaviors',
}

/**
 * Coupled pairs: both flags are always on or off together. Coins are only worth
 * earning if there's a shop to spend them in, so Tienda ⇆ Monedas move as one.
 */
const COUPLES: [keyof ClassSettings, keyof ClassSettings][] = [['shop', 'coins']]

/**
 * "At least one of" requirements: a feature needs ≥1 of these resources on.
 * Behaviours give/remove resources, so they're off when no resource is enabled.
 */
const ONE_OF: Partial<Record<keyof ClassSettings, (keyof ClassSettings)[]>> = {
  behaviors: ['xp', 'coins', 'mana', 'lives'],
}

const NORMALIZE_PASSES = 6 // > longest dependency chain; enough to reach a fixed point

/** Force-disable any feature left incoherent (prerequisite off, couple half-on, no resource). */
export function normalizeClassSettings(settings: ClassSettings): ClassSettings {
  const out = { ...settings }
  for (let i = 0; i < NORMALIZE_PASSES; i++) {
    for (const [feature, requires] of Object.entries(DEPENDENCIES) as [
      keyof ClassSettings,
      keyof ClassSettings,
    ][]) {
      if (out[feature] && !out[requires]) out[feature] = false
    }
    for (const [a, b] of COUPLES) {
      if (out[a] !== out[b]) out[a] = out[b] = false
    }
    for (const [feature, resources] of Object.entries(ONE_OF) as [
      keyof ClassSettings,
      (keyof ClassSettings)[],
    ][]) {
      if (out[feature] && !resources.some((r) => out[r])) out[feature] = false
    }
  }
  return out
}

/** Merge a raw JSON value from the DB with defaults, then normalize dependencies. */
export function resolveClassSettings(raw: unknown): ClassSettings {
  const resolved = { ...DEFAULT_CLASS_SETTINGS }
  if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
    const partial = raw as Partial<Record<keyof ClassSettings, unknown>>
    for (const key of Object.keys(DEFAULT_CLASS_SETTINGS) as (keyof ClassSettings)[]) {
      if (typeof partial[key] === 'boolean') resolved[key] = partial[key] as boolean
    }
  }
  return normalizeClassSettings(resolved)
}

/**
 * Las funcionalidades de una plantilla tal como las enseña su ficha: las de la
 * clase, ya resueltas, sin las que están en pruebas.
 */
export function templateFeatures(raw: unknown): TemplateFeatures {
  const { missionMap: _beta, ...features } = resolveClassSettings(raw)
  return features
}
