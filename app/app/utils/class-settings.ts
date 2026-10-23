import type { ClassSettings } from '~/types/class.types'

/**
 * Per-class feature flags. Missing keys default to `true` (enabled), so a class
 * without explicit settings behaves exactly as before. Coherence between flags
 * is enforced by `normalizeClassSettings` (mirror of the backend) and, for the
 * "turn-on" direction, by `coerceClassSettings` used by the settings panel.
 *
 * Salvo las que están en pruebas (beta), que van apagadas mientras nadie las
 * encienda: hoy, el mapa de misiones (`missionMap`). Espejo de la API.
 */
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
 * Hard prerequisites (acyclic): a feature only makes sense if its prerequisite
 * is on. Used both for the panel's "blocked / Necesita X" hint and the
 * off-cascade in `normalizeClassSettings`.
 *  - mana is spent on shop powers   → mana requires shop
 *  - ranking is ordered by XP       → rankings requires xp
 *  - lives are changed by behaviors → lives requires behaviors
 */
export const CLASS_SETTING_DEPENDENCIES: Partial<Record<keyof ClassSettings, keyof ClassSettings>> =
  {
    mana: 'shop',
    rankings: 'xp',
    lives: 'behaviors',
  }

/**
 * Coupled pairs: both flags are always on or off together. Coins are only worth
 * earning if there's a shop to spend them in, and a shop needs a currency, so
 * Tienda ⇆ Monedas move as one. (Modelled as a couple, not a mutual
 * prerequisite, to avoid a "both blocked, neither can be enabled" deadlock.)
 */
export const CLASS_SETTING_COUPLES: [keyof ClassSettings, keyof ClassSettings][] = [
  ['shop', 'coins'],
]

/**
 * "At least one of" requirements: a feature needs ≥1 of these resources on to
 * have anything to act on. Behaviours give/remove resources, so they're useless
 * without at least one resource (XP, monedas, maná o vidas) enabled.
 */
export const CLASS_SETTING_ONE_OF: Partial<Record<keyof ClassSettings, (keyof ClassSettings)[]>> = {
  behaviors: ['xp', 'coins', 'mana', 'lives'],
}

const COERCE_PASSES = 6 // > longest dependency chain; enough to reach a fixed point

/** Force-disable any feature left incoherent (prerequisite off, couple half-on, no resource). */
export function normalizeClassSettings(settings: ClassSettings): ClassSettings {
  const out = { ...settings }
  for (let i = 0; i < COERCE_PASSES; i++) {
    // Hard prerequisites: dependent off when its prerequisite is off.
    for (const key of Object.keys(CLASS_SETTING_DEPENDENCIES) as (keyof ClassSettings)[]) {
      const requires = CLASS_SETTING_DEPENDENCIES[key]
      if (requires && out[key] && !out[requires]) out[key] = false
    }
    // Couples: if one side is off, the other must be off too.
    for (const [a, b] of CLASS_SETTING_COUPLES) {
      if (out[a] !== out[b]) out[a] = out[b] = false
    }
    // One-of: feature off when none of its required resources are on.
    for (const key of Object.keys(CLASS_SETTING_ONE_OF) as (keyof ClassSettings)[]) {
      const anyOn = CLASS_SETTING_ONE_OF[key]!.some(r => out[r])
      if (out[key] && !anyOn) out[key] = false
    }
  }
  return out
}

/**
 * When enabling `flag`, turn on everything it strictly needs: hard prerequisites
 * (e.g. Vidas → Comportamientos) and couple partners (Tienda ⇆ Monedas).
 *
 * Deliberately does NOT satisfy "one-of" requirements (Comportamientos needs a
 * resource): we never pick a resource for the user. Instead the panel blocks the
 * toggle and asks them to enable one — see `classSettingNeedsResource`.
 */
function propagateEnable(
  s: ClassSettings,
  flag: keyof ClassSettings,
  seen = new Set<string>()
): void {
  if (seen.has(flag)) return
  seen.add(flag)

  const req = CLASS_SETTING_DEPENDENCIES[flag]
  if (req && !s[req]) {
    s[req] = true
    propagateEnable(s, req, seen)
  }

  for (const [a, b] of CLASS_SETTING_COUPLES) {
    const partner = flag === a ? b : flag === b ? a : null
    if (partner && !s[partner]) {
      s[partner] = true
      propagateEnable(s, partner, seen)
    }
  }
}

/**
 * True when `flag` has an unmet "one-of" requirement (it needs ≥1 resource but
 * none is on). The panel uses this to block the toggle and show a hint so the
 * teacher picks a resource themselves instead of one being chosen for them.
 */
export function classSettingNeedsResource(flag: keyof ClassSettings, s: ClassSettings): boolean {
  const oneOf = CLASS_SETTING_ONE_OF[flag]
  return !!oneOf && !oneOf.some(r => s[r])
}

/** Apply a single toggle and return a coherent settings object (on-cascade + normalize). */
export function coerceClassSettings(
  prev: ClassSettings,
  flag: keyof ClassSettings,
  value: boolean
): ClassSettings {
  const next: ClassSettings = { ...prev, [flag]: value }
  if (value) propagateEnable(next, flag)
  return normalizeClassSettings(next)
}

/** Merge whatever the API sent with the defaults, then normalize dependencies. */
export function resolveClassSettings(raw?: Partial<ClassSettings> | null): ClassSettings {
  return normalizeClassSettings({ ...DEFAULT_CLASS_SETTINGS, ...(raw ?? {}) })
}
