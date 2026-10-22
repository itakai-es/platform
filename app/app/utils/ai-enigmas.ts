/**
 * Lectura de los enigmas que propone la IA (crear misión con IA y adaptar una
 * misión). La IA devuelve JSON a veces envuelto en ```json y con números como
 * texto: aquí se limpia, se recorta y se normaliza; monedas y maná se ponen a 0
 * si la clase no usa ese recurso.
 */

/** Recursos de la clase que puede dar un enigma además del XP. */
export interface AiEnigmaResources {
  coins: boolean
  mana: boolean
}

/** Un enigma propuesto por la IA, ya normalizado. */
export interface AiEnigma {
  title: string
  description: string
  xp: number
  coins: number
  mana: number
  objectives: string[]
}

/** Entero ≥ suelo, o el suelo si no es un número válido. */
export function clampInt(v: unknown, floor = 0): number {
  const n = Math.floor(Number(v))
  return Number.isFinite(n) ? Math.max(floor, n) : floor
}

/** Quita las vallas de código (```json … ```) con las que a veces responde la IA. */
export function stripCodeFences(rawText: string): string {
  return rawText
    .replace(/```(?:json)?\s*/gi, '')
    .replace(/```/g, '')
    .trim()
}

/** Normaliza una lista ya parseada de enigmas; lo que no es un objeto con título se descarta. */
export function normalizeAiEnigmas(list: unknown, resources: AiEnigmaResources): AiEnigma[] {
  if (!Array.isArray(list)) return []
  return list
    .filter((e): e is Record<string, unknown> => !!e && typeof e === 'object')
    .map(e => ({
      title: String(e.title || '').slice(0, 100),
      description: String(e.description || '').slice(0, 300),
      xp: clampInt(e.xp ?? 20, 0),
      coins: resources.coins ? clampInt(e.coins ?? 0, 0) : 0,
      mana: resources.mana ? clampInt(e.mana ?? 0, 0) : 0,
      objectives: Array.isArray(e.objectives) ? e.objectives.map(o => String(o).slice(0, 200)) : [],
    }))
    .filter(e => e.title.trim())
}

/** El JSON array de enigmas de la respuesta de la IA, o [] si no se puede leer. */
export function parseEnigmasJson(rawText: string, resources: AiEnigmaResources): AiEnigma[] {
  const match = stripCodeFences(rawText).match(/\[[\s\S]*\]/)
  if (!match) return []
  try {
    return normalizeAiEnigmas(JSON.parse(match[0]), resources)
  } catch {
    console.error('Failed to parse enigmas JSON from AI')
    return []
  }
}
