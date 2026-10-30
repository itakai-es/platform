/**
 * Pruebas de los colores del círculo con iniciales (`INITIALS_FILL` de
 * components/atoms/Avatar.vue), con los tokens de cada tema y modo tal y como
 * los dejan assets/css/tailwind.css y accessibility.css.
 *
 * El avatar del profesorado son sus iniciales sobre uno de los seis colores, y
 * cada docente elige el suyo: los seis tienen que distinguirse entre sí a la vez,
 * y las iniciales leerse sobre todos, en cualquier tema y modo de daltonismo.
 *
 * Solo lee ficheros, no necesita el servidor de desarrollo. Dentro de itakai-app-dev:
 *   node --test /app/tests/avatar-colors.test.mjs
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const read = path => readFileSync(new URL(path, import.meta.url), 'utf8')

const PALETTE = ['purple', 'yellow', 'mint', 'sky', 'red', 'peach']

/** Contraste mínimo de las iniciales (WCAG AA, texto normal). */
const MIN_CONTRAST = 4.5
/**
 * Diferencia mínima entre dos fondos (ΔE2000). Por debajo de 10, dos círculos
 * claros de 20 a 60 px, uno al lado del otro, se leen como el mismo color.
 */
const MIN_DELTA_E = 10

// --- Los fondos de Avatar.vue ---

const avatarVue = read('../app/components/atoms/Avatar.vue')
const fillBlock = avatarVue.match(/const INITIALS_FILL[^=]*=\s*\{([^}]*)\}/)
assert.ok(fillBlock, 'INITIALS_FILL en Avatar.vue')
const FILL = Object.fromEntries(
  [...fillBlock[1].matchAll(/(\w+):\s*'bg-([\w-]+)'/g)].map(([, color, token]) => [color, token])
)

// --- Los tokens de cada tema y modo ---

/** Reglas sin anidar de las dos hojas, en el orden en que se cargan, sin comentarios. */
const RULES = [
  ...(read('../app/assets/css/tailwind.css') + read('../app/assets/css/accessibility.css'))
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .matchAll(/([^{}]+)\{([^{}]*)\}/g),
].map(([, selectors, body]) => ({
  selectors: selectors.split(',').map(s => s.trim().replace(/\s+/g, ' ')),
  body,
}))

const THEME = '[data-theme="university"]'
const vision = mode => `:root[data-color-vision='${mode}']`

/**
 * Cada caso, con sus selectores de menos a más específicos: `:root`, el tema
 * (en <html>, la misma especificidad, pero va después) y los ajustes de
 * accesibilidad (`:root[data-…]`, que ganan al tema).
 */
const MODES = {
  'por defecto': [':root'],
  university: [':root', THEME],
  protanopía: [':root', vision('protanopia')],
  deuteranopía: [':root', vision('deuteranopia')],
  tritanopía: [':root', vision('tritanopia')],
  'alto contraste': [':root', ":root[data-contrast='high']"],
  'university con protanopía': [':root', THEME, vision('protanopia')],
  'university con deuteranopía': [':root', THEME, vision('deuteranopia')],
  'university con tritanopía': [':root', THEME, vision('tritanopia')],
}

/** Las variables que quedan con esos selectores. */
function variablesOf(selectors) {
  const vars = {}
  for (const selector of selectors) {
    for (const rule of RULES) {
      if (!rule.selectors.includes(selector)) continue
      for (const [, name, value] of rule.body.matchAll(/(--[\w-]+)\s*:\s*([^;]+);/g)) {
        vars[name] = value.trim()
      }
    }
  }
  return vars
}

/**
 * Un color en `r g b`, `#rrggbb` o `var(--…)`. De `--x` se toma `--x-rgb`, que es
 * lo que usan las clases de Tailwind y lo que redefinen los modos de daltonismo.
 */
function rgbOf(vars, value) {
  const ref = value.match(/^var\((--[\w-]+)\)$/)
  if (ref) {
    const name = `${ref[1]}-rgb` in vars ? `${ref[1]}-rgb` : ref[1]
    assert.ok(name in vars, `${ref[1]} sin definir`)
    return rgbOf(vars, vars[name])
  }
  const hex = value.match(/^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i)
  if (hex) return hex.slice(1).map(h => parseInt(h, 16))
  const rgb = value.match(/^(\d+)\s+(\d+)\s+(\d+)$/)
  assert.ok(rgb, `color sin entender: ${value}`)
  return rgb.slice(1).map(Number)
}

/** El color del texto de un círculo: navy, salvo que una regla del tema o del modo lo cambie. */
function initialsColorOf(vars, selectors, token) {
  let color = 'var(--color-navy-700)'
  for (const selector of selectors) {
    for (const rule of RULES) {
      if (!rule.selectors.includes(`${selector} .bg-${token}`)) continue
      const decl = rule.body.match(/(?:^|[;\s])color\s*:\s*([^;]+);/)
      if (decl) color = decl[1].trim()
    }
  }
  return rgbOf(vars, color)
}

// --- Contraste WCAG y diferencia de color CIEDE2000 ---

const linear = c => ((c /= 255) <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4)
const luminance = rgb => {
  const [r, g, b] = rgb.map(linear)
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}
function contrast(a, b) {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x)
  return (hi + 0.05) / (lo + 0.05)
}

/** sRGB a CIELAB (D65). */
function lab(rgb) {
  const [r, g, b] = rgb.map(linear)
  const xyz = [
    (0.4124 * r + 0.3576 * g + 0.1805 * b) / 0.95047,
    0.2126 * r + 0.7152 * g + 0.0722 * b,
    (0.0193 * r + 0.1192 * g + 0.9505 * b) / 1.08883,
  ]
  const [fx, fy, fz] = xyz.map(t =>
    t > 216 / 24389 ? Math.cbrt(t) : ((24389 / 27) * t + 16) / 116
  )
  return [116 * fy - 16, 500 * (fx - fy), 200 * (fy - fz)]
}

/** CIEDE2000 entre dos colores CIELAB (Sharma, Wu y Dalal, 2005). */
function deltaE2000([L1, a1, b1], [L2, a2, b2]) {
  const rad = d => (d * Math.PI) / 180
  const hueOf = (b, a) => ((Math.atan2(b, a) * 180) / Math.PI + 360) % 360
  const Cbar = (Math.hypot(a1, b1) + Math.hypot(a2, b2)) / 2
  const G = 0.5 * (1 - Math.sqrt(Cbar ** 7 / (Cbar ** 7 + 25 ** 7)))
  const a1p = (1 + G) * a1
  const a2p = (1 + G) * a2
  const C1p = Math.hypot(a1p, b1)
  const C2p = Math.hypot(a2p, b2)
  const h1p = hueOf(b1, a1p)
  const h2p = hueOf(b2, a2p)
  const chroma = C1p * C2p !== 0
  let dhp = chroma ? h2p - h1p : 0
  if (dhp > 180) dhp -= 360
  else if (dhp < -180) dhp += 360
  const dLp = L2 - L1
  const dCp = C2p - C1p
  const dHp = 2 * Math.sqrt(C1p * C2p) * Math.sin(rad(dhp / 2))
  const Lbp = (L1 + L2) / 2
  const Cbp = (C1p + C2p) / 2
  let hbp = h1p + h2p
  if (chroma) {
    if (Math.abs(h1p - h2p) <= 180) hbp /= 2
    else hbp = hbp < 360 ? (hbp + 360) / 2 : (hbp - 360) / 2
  }
  const T =
    1 -
    0.17 * Math.cos(rad(hbp - 30)) +
    0.24 * Math.cos(rad(2 * hbp)) +
    0.32 * Math.cos(rad(3 * hbp + 6)) -
    0.2 * Math.cos(rad(4 * hbp - 63))
  const dTheta = 30 * Math.exp(-(((hbp - 275) / 25) ** 2))
  const RC = 2 * Math.sqrt(Cbp ** 7 / (Cbp ** 7 + 25 ** 7))
  const SL = 1 + (0.015 * (Lbp - 50) ** 2) / Math.sqrt(20 + (Lbp - 50) ** 2)
  const SC = 1 + 0.045 * Cbp
  const SH = 1 + 0.015 * Cbp * T
  const RT = -Math.sin(rad(2 * dTheta)) * RC
  return Math.sqrt(
    (dLp / SL) ** 2 + (dCp / SC) ** 2 + (dHp / SH) ** 2 + RT * (dCp / SC) * (dHp / SH)
  )
}

test('la fórmula de ΔE2000 da los valores de referencia de Sharma, Wu y Dalal', () => {
  for (const [c1, c2, expected] of [
    [[50, 2.6772, -79.7751], [50, 0, -82.7485], 2.0425],
    [[50, 2.5, 0], [73, 25, -18], 27.1492],
    [[2.0776, 0.0795, -1.135], [0.9033, -0.0636, -0.5514], 0.9082],
  ]) {
    assert.ok(Math.abs(deltaE2000(c1, c2) - expected) < 1e-4, `${c1} / ${c2}`)
  }
})

test('cada color de la paleta tiene su fondo, y ese token existe en el tema base', () => {
  assert.deepEqual(Object.keys(FILL).sort(), [...PALETTE].sort())
  const base = variablesOf([':root'])
  for (const token of Object.values(FILL)) assert.ok(`--color-${token}-rgb` in base, token)
})

for (const [mode, selectors] of Object.entries(MODES)) {
  test(`${mode}: las iniciales se leen y los seis fondos se distinguen entre sí`, () => {
    const vars = variablesOf(selectors)
    const bg = Object.fromEntries(
      PALETTE.map(color => [color, rgbOf(vars, `var(--color-${FILL[color]})`)])
    )
    for (const color of PALETTE) {
      const ratio = contrast(bg[color], initialsColorOf(vars, selectors, FILL[color]))
      assert.ok(ratio >= MIN_CONTRAST, `${color}: iniciales a ${ratio.toFixed(2)}:1`)
    }
    for (const [i, a] of PALETTE.entries()) {
      for (const b of PALETTE.slice(i + 1)) {
        const dE = deltaE2000(lab(bg[a]), lab(bg[b]))
        assert.ok(dE >= MIN_DELTA_E, `${a} (${bg[a]}) y ${b} (${bg[b]}): ΔE ${dE.toFixed(1)}`)
      }
    }
  })
}
