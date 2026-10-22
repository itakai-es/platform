/**
 * Ruleta de la clase (bloque 4, E2): la parte que no es pantalla.
 *
 * El resultado se decide **antes** de girar (con `crypto.getRandomValues`) y la
 * rueda solo se anima hasta él: así ni el movimiento reducido ni una pestaña en
 * segundo plano pueden cambiar quién sale o dejar el giro colgado.
 */

/** Un nombre en la rueda. */
export interface RouletteEntry {
  id: string
  /** Lo que se ve en el proyector: alias en la clase o nombre, nunca nada del correo. */
  label: string
  avatar?: string | null
  /** Color del sector (un `rgb(var(--…))` de los tokens); sin él, el de la rueda. */
  fill?: string
}

/**
 * Quién juega: todo el alumnado, el de un equipo, o los equipos de una
 * agrupación (los sectores son equipos; después se puede girar dentro del que sale).
 */
export type RouletteMode = 'students' | 'team' | 'teams'

/** Lo que la ruleta necesita de un equipo. */
export interface RouletteTeam {
  id: string
  title: string
  studentIds: string[]
  fill?: string
}

/**
 * Lo que entra en la rueda antes de la ronda (sin contar a quien ya ha salido ni
 * a quien se ha quitado a mano). Quien falta hoy según la lista (`absent`) nunca
 * entra, ni en su equipo; un equipo sin nadie que haya venido tampoco entra.
 * Con `team`, `teams` es ese equipo; con `teams`, los de la agrupación.
 */
export function rouletteScope(
  students: RouletteEntry[],
  absent: ReadonlySet<string>,
  mode: RouletteMode,
  teams: RouletteTeam[] = []
): RouletteEntry[] {
  const present = students.filter(student => !absent.has(student.id))
  if (mode === 'students') return present
  const here = new Set(present.map(student => student.id))
  if (mode === 'team') {
    const members = new Set(teams[0]?.studentIds ?? [])
    return present.filter(student => members.has(student.id))
  }
  return teams
    .filter(team => team.studentIds.some(id => here.has(id)))
    .map(team => ({ id: team.id, label: team.title, avatar: null, fill: team.fill }))
}

/**
 * Nombre visible en lo que ve toda la clase: el alias en la clase y, si no
 * tiene, el nombre (la regla del ranking). El listado trae además un `username`
 * que puede salir de la parte local del correo: ese no se usa aquí.
 */
export function rouletteLabel(student: { nickname?: string | null; name?: string | null }): string {
  return student.nickname?.trim() || student.name?.trim() || '?'
}

/** Cómo va un nombre en su sector: en una o dos líneas, y con qué letra. */
export interface RouletteLabelFit {
  lines: string[]
  fontSize: number
}

export interface RouletteFitOptions {
  /** Sectores de la rueda. */
  count: number
  /** Radio donde acaba el texto, pegado al borde. */
  outer: number
  /** Radio hasta el que puede llegar hacia el centro (el buje). */
  inner: number
  maxFont: number
  minFont: number
}

// Lo que ocupa a lo ancho una línea, y la distancia entre dos, en proporción a la letra.
const LINE_THICKNESS = 0.9
const LINE_GAP = 1.15

/**
 * Encaja un nombre en su sector con la letra más grande posible, sin recortarlo:
 * a lo largo, entre el borde y el buje; a lo ancho, en la cuerda del sector donde
 * acaba el texto, que es lo más estrecho. Si en dos líneas cabe bastante más
 * grande, va en dos. Solo si no cabe entero ni con la letra más pequeña se
 * recorta (el nombre completo sale en el resultado).
 *
 * `measure(texto)` es el ancho del texto con letra de tamaño 1, en las mismas
 * unidades que los radios.
 */
export function fitRouletteLabel(
  label: string,
  measure: (text: string) => number,
  o: RouletteFitOptions
): RouletteLabelFit {
  const s = o.count <= 2 ? 1 : Math.sin(Math.PI / o.count)
  const room = o.outer - o.inner
  const chord = 2 * o.outer * s - 1
  const sizeFor = (width: number, lines: number) => {
    const thickness = LINE_THICKNESS + (lines - 1) * LINE_GAP
    return Math.min(o.maxFont, room / width, chord / (thickness + 2 * width * s))
  }
  const round = (size: number) => Math.floor(size * 10) / 10

  const text = label.trim() || '?'
  const one = sizeFor(measure(text), 1)
  const words = text.split(/\s+/)
  let two: { lines: string[]; size: number } | null = null
  for (let i = 1; i < words.length; i++) {
    const lines = [words.slice(0, i).join(' '), words.slice(i).join(' ')]
    const size = sizeFor(Math.max(...lines.map(measure)), 2)
    if (!two || size > two.size) two = { lines, size }
  }

  if (two && two.size >= o.minFont && (one < o.minFont || two.size > one * 1.15)) {
    return { lines: two.lines, fontSize: round(two.size) }
  }
  if (one >= o.minFont) return { lines: [text], fontSize: round(one) }

  // Ni entero ni en dos líneas: recortado, con la letra más pequeña.
  const size = o.minFont
  const maxWidth = Math.min(room, (chord - LINE_THICKNESS * size) / (2 * s)) / size
  const chars = Array.from(text)
  let n = chars.length - 1
  const cut = (k: number) => `${chars.slice(0, k).join('').trimEnd()}…`
  while (n > 1 && measure(cut(n)) > maxWidth) n--
  return { lines: [cut(n)], fontSize: size }
}

/** Índice al azar en [0, n), uniforme (sin el sesgo del módulo) y con el azar del navegador. */
export function randomIndex(n: number): number {
  if (n <= 1) return 0
  const range = 0x100000000
  const limit = range - (range % n)
  const buffer = new Uint32Array(1)
  for (;;) {
    crypto.getRandomValues(buffer)
    const value = buffer[0]!
    if (value < limit) return value % n
  }
}

/** Un número en [0, 1) del mismo azar, para colocar la aguja dentro del sector. */
export function randomUnit(): number {
  return randomIndex(1_000_000) / 1_000_000
}

/** Vueltas completas que da la rueda antes de parar. */
export const ROULETTE_TURNS = 5

/**
 * Giro final, en grados y siempre hacia delante, para que la aguja (arriba)
 * quede dentro del sector `index`. Los sectores empiezan arriba y van en el
 * sentido de las agujas del reloj; `jitter` (0-1) dice en qué punto del sector
 * cae, sin rozar los bordes.
 */
export function rouletteTarget(current: number, index: number, count: number, jitter = 0.5) {
  const sector = 360 / count
  const point = index * sector + sector * (0.15 + 0.7 * jitter)
  // Girar R lleva el punto θ de la rueda a θ + R; la aguja está en 0.
  const wanted = (((-point - current) % 360) + 360) % 360
  return current + ROULETTE_TURNS * 360 + wanted
}

/**
 * Curva del giro. La transición CSS usa la misma (`ROULETTE_EASING`, la
 * aproximación habitual de «ease-out cubic»), así los tics caen cuando la
 * aguja pasa de verdad por cada borde.
 */
export const ROULETTE_EASING = 'cubic-bezier(0.33, 1, 0.68, 1)'

/** Inversa de ease-out cubic: en qué fracción del tiempo se alcanza la fracción `f` del giro. */
function easeOutCubicInverse(f: number): number {
  return 1 - Math.cbrt(1 - f)
}

/**
 * Cuándo suena cada «tic» (segundos desde que empieza el giro): uno por borde
 * de sector que cruza la aguja, sin dos a menos de `minGap` (con muchos
 * sectores, al principio pasarían demasiado deprisa para oírse).
 */
export function rouletteTickTimes(
  from: number,
  to: number,
  count: number,
  durationSeconds: number,
  minGap = 0.045
): number[] {
  const total = to - from
  if (total <= 0 || count < 2) return []
  const sector = 360 / count
  const times: number[] = []
  // Cuánto falta girar para que el primer borde llegue a la aguja (arriba, en 0).
  const first = ((-from % sector) + sector) % sector || sector
  let last = -Infinity
  for (let angle = first; angle < total; angle += sector) {
    const time = easeOutCubicInverse(angle / total) * durationSeconds
    if (time - last >= minGap) {
      times.push(time)
      last = time
    }
  }
  return times
}

/** Fecha local de hoy (AAAA-MM-DD): la ronda dura el día del aula, no el del servidor. */
export function localDay(date = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

/** Lo que se recuerda de la ronda en este dispositivo, por clase. */
export interface RouletteRoundMemory {
  day: string
  /** Quien ya ha salido hoy (con «sin repetir»). */
  drawn: string[]
  noRepeat: boolean
}

const MEMORY_PREFIX = 'itakai:roulette:'

/** Lee la ronda de hoy; si la guardada es de otro día, empieza una nueva. */
export function readRouletteRound(classId: string, day = localDay()): RouletteRoundMemory {
  const fresh: RouletteRoundMemory = { day, drawn: [], noRepeat: true }
  if (typeof localStorage === 'undefined') return fresh
  try {
    const raw = localStorage.getItem(MEMORY_PREFIX + classId)
    if (!raw) return fresh
    const parsed = JSON.parse(raw) as Partial<RouletteRoundMemory>
    const noRepeat = typeof parsed.noRepeat === 'boolean' ? parsed.noRepeat : true
    if (parsed.day !== day) return { ...fresh, noRepeat }
    const drawn = Array.isArray(parsed.drawn)
      ? parsed.drawn.filter((id): id is string => typeof id === 'string')
      : []
    return { day, drawn, noRepeat }
  } catch {
    return fresh
  }
}

/**
 * La ronda que vale hoy: si `memory` es de otro día (la página lleva abierta
 * desde ayer en el ordenador del aula), una nueva que solo conserva el interruptor.
 */
export function rouletteRoundForDay(
  memory: RouletteRoundMemory,
  day = localDay()
): RouletteRoundMemory {
  return memory.day === day ? memory : { day, drawn: [], noRepeat: memory.noRepeat }
}

export function writeRouletteRound(classId: string, memory: RouletteRoundMemory) {
  if (typeof localStorage === 'undefined') return
  try {
    localStorage.setItem(MEMORY_PREFIX + classId, JSON.stringify(memory))
  } catch {
    /* modo privado o cuota llena: la ronda sigue en memoria mientras la página esté abierta */
  }
}
