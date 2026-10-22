import {
  BoltIcon,
  FireIcon,
  GlobeAltIcon,
  HeartIcon,
  MoonIcon,
  PuzzlePieceIcon,
  RocketLaunchIcon,
  ShieldCheckIcon,
  SparklesIcon,
  StarIcon,
  SunIcon,
  TrophyIcon,
} from '@heroicons/vue/24/solid'
import type { Component } from 'vue'
import type { TeamColor, TeamEmblem } from '~/types/team.types'

/**
 * Cómo se ve un equipo: un color de la paleta de tokens (responde a los modos de
 * daltonismo y de alto contraste) y un emblema. El color nunca va solo: el
 * equipo lleva siempre su nombre y su emblema al lado.
 *
 * Las clases van escritas enteras para que Tailwind las encuentre.
 */
export const TEAM_COLORS: Record<TeamColor, { swatch: string; soft: string; border: string }> = {
  purple: { swatch: 'bg-purple', soft: 'bg-purple-light', border: 'border-purple' },
  yellow: { swatch: 'bg-yellow', soft: 'bg-yellow-light', border: 'border-yellow' },
  mint: { swatch: 'bg-mint', soft: 'bg-mint-light', border: 'border-mint' },
  sky: { swatch: 'bg-sky', soft: 'bg-sky-light', border: 'border-sky' },
  red: { swatch: 'bg-red', soft: 'bg-red-light', border: 'border-red' },
  peach: { swatch: 'bg-peach', soft: 'bg-peach-light', border: 'border-peach' },
}

export const TEAM_COLOR_KEYS = Object.keys(TEAM_COLORS) as TeamColor[]

export const TEAM_EMBLEMS: Record<TeamEmblem, Component> = {
  star: StarIcon,
  bolt: BoltIcon,
  fire: FireIcon,
  shield: ShieldCheckIcon,
  rocket: RocketLaunchIcon,
  heart: HeartIcon,
  sun: SunIcon,
  moon: MoonIcon,
  sparkles: SparklesIcon,
  globe: GlobeAltIcon,
  puzzle: PuzzlePieceIcon,
  trophy: TrophyIcon,
}

export const TEAM_EMBLEM_KEYS = Object.keys(TEAM_EMBLEMS) as TeamEmblem[]

/** Estilo del equipo; sin color elegido, el de su posición, para que dos seguidos no se repitan. */
export function teamColorOf(color: TeamColor | null | undefined, index = 0) {
  return TEAM_COLORS[color ?? TEAM_COLOR_KEYS[index % TEAM_COLOR_KEYS.length]!]
}

export function teamEmblemOf(emblem: TeamEmblem | null | undefined, index = 0): Component {
  return TEAM_EMBLEMS[emblem ?? TEAM_EMBLEM_KEYS[index % TEAM_EMBLEM_KEYS.length]!]
}

/** Color y emblema propuestos para el equipo número `index` de una agrupación nueva. */
export function defaultTeamLook(index: number): { color: TeamColor; emblem: TeamEmblem } {
  return {
    color: TEAM_COLOR_KEYS[index % TEAM_COLOR_KEYS.length]!,
    emblem: TEAM_EMBLEM_KEYS[index % TEAM_EMBLEM_KEYS.length]!,
  }
}

/** El tono suave del equipo como color CSS, para lo que no se pinta con clases (la ruleta, en SVG). */
export function teamFillOf(color: TeamColor | null | undefined, index = 0): string {
  return `rgb(var(--color-${color ?? TEAM_COLOR_KEYS[index % TEAM_COLOR_KEYS.length]!}-light-rgb))`
}
