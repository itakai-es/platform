/**
 * Efectos visuales reusables.
 *
 * - `confettiBurst`/`confettiSparkle` envuelven `canvas-confetti` con presets
 *   on-brand (paleta navy/purple/yellow/sky) para que todo el sitio celebre con
 *   el mismo lenguaje.
 * - `showFloater` añade un elemento absoluto al body con un texto que sube y
 *   se desvanece — útil para "+50 XP" cerca del badge que cambia.
 *
 * Los gates (ajustes de la clase) se aplican en `useEffects`; aquí solo dibujamos.
 * El de menos movimiento (del usuario o del sistema) sí se mira aquí, para que
 * ningún confeti se lo salte venga de donde venga.
 */

import confetti from 'canvas-confetti'
import { prefersReducedMotion } from '~/utils/reduced-motion'

const BRAND_COLORS = ['#23245d', '#ac74fd', '#ffc338', '#00aafc', '#6cf3af']

interface BurstOptions {
  /** Origen 0–1 en coords de viewport (default centro alto). */
  origin?: { x: number; y: number }
}

/** Estallido grande: misión completada, subida de nivel. */
export function confettiBurst(opts: BurstOptions = {}): void {
  if (prefersReducedMotion()) return
  confetti({
    particleCount: 120,
    spread: 80,
    startVelocity: 45,
    ticks: 200,
    origin: opts.origin ?? { x: 0.5, y: 0.35 },
    colors: BRAND_COLORS,
    scalar: 1,
  })
  // segundo pop ligero al cabo de 200 ms para más sensación de fiesta
  window.setTimeout(() => {
    confetti({
      particleCount: 60,
      spread: 100,
      startVelocity: 30,
      origin: opts.origin ?? { x: 0.5, y: 0.35 },
      colors: BRAND_COLORS,
      scalar: 0.85,
    })
  }, 220)
}

/** Estallido pequeño: enigma aprobado, recompensa canjeada. */
export function confettiSparkle(opts: BurstOptions = {}): void {
  if (prefersReducedMotion()) return
  confetti({
    particleCount: 30,
    spread: 50,
    startVelocity: 25,
    ticks: 120,
    origin: opts.origin ?? { x: 0.5, y: 0.4 },
    colors: BRAND_COLORS,
    scalar: 0.7,
  })
}

interface FloaterOptions {
  /** Coordenadas en píxeles de viewport (clientX/clientY). Si se omite, centra arriba. */
  x?: number
  y?: number
  /** Color del texto (token o hex). Default navy. */
  color?: string
  /** ms hasta auto-desmontaje. */
  duration?: number
}

/** Muestra un texto "+50 XP" que sube y se desvanece desde (x, y). */
export function showFloater(text: string, opts: FloaterOptions = {}): void {
  if (typeof document === 'undefined') return
  const el = document.createElement('div')
  el.textContent = text
  const color = opts.color ?? '#23245d'
  const duration = opts.duration ?? 1100
  const x = opts.x ?? window.innerWidth / 2
  const y = opts.y ?? window.innerHeight / 3
  Object.assign(el.style, {
    position: 'fixed',
    left: `${x}px`,
    top: `${y}px`,
    transform: 'translate(-50%, -50%)',
    color,
    fontWeight: '800',
    fontSize: '18px',
    pointerEvents: 'none',
    zIndex: '9999',
    textShadow: '0 1px 2px rgba(255,255,255,0.8)',
    transition: `transform ${duration}ms cubic-bezier(.2,.7,.3,1), opacity ${duration}ms ease-out`,
    opacity: '1',
    willChange: 'transform, opacity',
  } as CSSStyleDeclaration)
  document.body.appendChild(el)
  // siguiente frame: anima hacia arriba y desvanece (con menos movimiento, solo se desvanece)
  const rise = !prefersReducedMotion()
  requestAnimationFrame(() => {
    if (rise) el.style.transform = 'translate(-50%, calc(-50% - 60px))'
    el.style.opacity = '0'
  })
  window.setTimeout(() => el.remove(), duration + 50)
}
