/**
 * useEffects — disparador centralizado de efectos visuales y de sonido.
 *
 * Cada evento del UI llama a `effects.play('event_kind', { settings, x, y, amount, resource })`
 * y el composable decide qué visual + qué SFX disparar. Aplica los gates de la clase
 * (`classSettings.visualEffects` y `classSettings.sounds`) y respeta el mute global
 * del usuario (gestionado dentro de `playSfx`).
 *
 * El resto del código no debe importar canvas-confetti ni Web Audio directamente;
 * añadir un nuevo evento aquí es suficiente para que herede gates y consistencia.
 */
import type { ClassSettings } from '~/types/class.types'
import { confettiBurst, confettiSparkle, showFloater } from '~/utils/effects/visual'
import {
  playSfx,
  playTicks,
  stopTicks,
  setSoundMuted,
  isSoundMuted,
  type SfxName,
} from '~/utils/effects/sounds'

export type EffectEvent =
  | 'mission_completed'
  | 'level_up'
  | 'class_joined'
  | 'enigma_approved'
  | 'xp_earned'
  | 'coins_earned'
  | 'mana_earned'
  | 'behavior_positive'
  | 'behavior_negative'
  | 'shop_purchase'
  | 'shop_redeem'
  | 'shop_use_power'
  | 'roulette_spin'
  | 'roulette_pick'
  | 'click'

export type Resource = 'xp' | 'coins' | 'mana' | 'lives'

export interface PlayOptions {
  /** Ajustes de la clase. Si se omite se considera todo activado. */
  settings?: ClassSettings | null
  /** Coordenadas viewport para localizar el efecto (clientX/clientY). */
  x?: number
  y?: number
  /** Cantidad para floaters (+/-N). */
  amount?: number
  /** Tipo de recurso para etiquetar el floater. */
  resource?: Resource
  /** Giro de la ruleta: segundos, desde ahora, en que suena cada «tic». */
  ticks?: number[]
}

const RESOURCE_COLOR: Record<Resource, string> = {
  xp: '#ac74fd', // morado de marca
  coins: '#ebad12', // dorado más legible sobre blanco que el yellow puro
  mana: '#00aafc',
  lives: '#ff3c52',
}

function visualsOn(settings?: ClassSettings | null): boolean {
  return settings ? settings.visualEffects : true
}
function soundsOn(settings?: ClassSettings | null): boolean {
  return settings ? settings.sounds : true
}

function sfx(name: SfxName, settings?: ClassSettings | null): void {
  if (soundsOn(settings)) playSfx(name)
}

export function useEffects() {
  const { t } = useI18n()

  // Etiqueta del floater por recurso, en el idioma de la interfaz. La moneda sale
  // siempre de `common.resources.coins` (su nombre es configurable, ver useCoinLabel).
  const RESOURCE_LABEL: Record<Resource, () => string> = {
    xp: () => t('common.effects.floater.xp'),
    coins: () => t('common.resources.coins'),
    mana: () => t('common.resources.mana'),
    lives: () => t('common.effects.floater.lives'),
  }

  function floater(opts: PlayOptions): void {
    if (!visualsOn(opts.settings)) return
    if (opts.amount === undefined || !opts.resource) return
    const sign = opts.amount >= 0 ? '+' : '−'
    const text = `${sign}${Math.abs(opts.amount)} ${RESOURCE_LABEL[opts.resource]()}`
    showFloater(text, { x: opts.x, y: opts.y, color: RESOURCE_COLOR[opts.resource] })
  }

  function play(event: EffectEvent, opts: PlayOptions = {}): void {
    switch (event) {
      case 'mission_completed':
      case 'level_up':
      case 'class_joined':
        if (visualsOn(opts.settings)) confettiBurst({ origin: originFrom(opts) })
        sfx('level_up', opts.settings)
        return
      case 'enigma_approved':
      case 'shop_redeem':
        if (visualsOn(opts.settings)) confettiSparkle({ origin: originFrom(opts) })
        sfx('success', opts.settings)
        floater(opts)
        return
      case 'xp_earned':
      case 'coins_earned':
      case 'mana_earned':
        sfx('coin', opts.settings)
        floater(opts)
        return
      case 'behavior_positive':
        if (visualsOn(opts.settings)) confettiSparkle({ origin: originFrom(opts) })
        sfx('success', opts.settings)
        floater(opts)
        return
      case 'behavior_negative':
        sfx('fail', opts.settings)
        floater(opts)
        return
      case 'shop_purchase':
        if (visualsOn(opts.settings)) confettiSparkle({ origin: originFrom(opts) })
        sfx('coin', opts.settings)
        floater(opts)
        return
      case 'shop_use_power':
        sfx('success', opts.settings)
        return
      // La rueda es el juego, no un efecto: aquí solo van sus tics y la celebración.
      case 'roulette_spin':
        if (soundsOn(opts.settings)) playTicks(opts.ticks ?? [])
        return
      case 'roulette_pick':
        if (visualsOn(opts.settings)) confettiBurst({ origin: originFrom(opts) })
        sfx('pick', opts.settings)
        return
      case 'click':
        sfx('click', opts.settings)
        return
    }
  }

  return { play, stopTicks, setSoundMuted, isSoundMuted }
}

/** Convierte coords (px, viewport) a origen 0–1 que pide canvas-confetti. */
function originFrom(opts: PlayOptions): { x: number; y: number } | undefined {
  if (opts.x === undefined || opts.y === undefined) return undefined
  if (typeof window === 'undefined') return undefined
  return { x: opts.x / window.innerWidth, y: opts.y / window.innerHeight }
}
