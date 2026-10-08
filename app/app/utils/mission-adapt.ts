/**
 * «Adaptar con IA» una misión ya guardada: leer la propuesta de la IA y decidir,
 * enigma a enigma, qué se haría al aplicarla. Sin red ni Vue: lo usa la ventana
 * de adaptación (AdaptMissionModal) para enseñar la comparación y, si su docente
 * la aplica, para escribir por las rutas de siempre.
 *
 * Reglas, las mismas que aplica la API (missions.service):
 * - un enigma con entregas o que alguien ha completado no se borra: si la
 *   propuesta trae menos enigmas, se queda como está;
 * - si alguien lo ha completado, sus recompensas no pueden bajar: lo propuesto
 *   se sube a lo que ya tiene (y se avisa);
 * - monedas y maná apagados en la clase no se tocan: el enigma conserva lo que
 *   tenga (vuelve a verse si se encienden) y los nuevos llegan con 0.
 */
import {
  normalizeAiEnigmas,
  stripCodeFences,
  type AiEnigma,
  type AiEnigmaResources,
} from '~/utils/ai-enigmas'

/** Lo que la propuesta necesita saber de cada enigma guardado. */
export interface AdaptCurrentEnigma {
  id: string
  title: string
  description: string
  xp: number
  coins: number
  mana: number
  objectives: string[]
  /** Alumnado que lo ha completado: si hay, las recompensas no bajan. */
  completedCount: number
  /** Entregas que tiene: si hay, no se puede borrar. */
  totalSubmissions: number
}

export interface AdaptProposal {
  title: string
  description: string
  enigmas: AiEnigma[]
}

export type AdaptRowKind = 'update' | 'create' | 'delete' | 'keep'

export interface AdaptRow {
  kind: AdaptRowKind
  current?: AdaptCurrentEnigma
  /** Lo que quedaría al aplicar (ya con las reglas de arriba). */
  proposed?: AiEnigma
  /** La IA proponía bajar recompensas ya repartidas y se han dejado como estaban. */
  rewardsRaised?: boolean
  /** En una fila 'update': cambia algo respecto a lo guardado. */
  changed?: boolean
}

export interface AdaptPlan {
  title: string
  description: string
  titleChanged: boolean
  descriptionChanged: boolean
  rows: AdaptRow[]
  hasChanges: boolean
}

const MAX_TITLE = 200
const MAX_DESCRIPTION = 8000

/** La propuesta de la IA ({ title, description, enigmas }), o null si no se puede usar. */
export function parseAdaptProposal(
  rawText: string,
  resources: AiEnigmaResources
): AdaptProposal | null {
  const match = stripCodeFences(rawText).match(/\{[\s\S]*\}/)
  if (!match) return null
  try {
    const parsed = JSON.parse(match[0]) as Record<string, unknown>
    const title = String(parsed.title || '')
      .trim()
      .slice(0, MAX_TITLE)
    const description = String(parsed.description || '')
      .trim()
      .slice(0, MAX_DESCRIPTION)
    const enigmas = normalizeAiEnigmas(parsed.enigmas, resources)
    if (!title || !description || enigmas.length === 0) return null
    return { title, description, enigmas }
  } catch {
    return null
  }
}

const isLocked = (e: AdaptCurrentEnigma) => e.completedCount > 0
const isUndeletable = (e: AdaptCurrentEnigma) => e.completedCount > 0 || e.totalSubmissions > 0

const sameList = (a: string[], b: string[]) =>
  a.length === b.length && a.every((value, index) => value === b[index])

/** Lo propuesto para un enigma guardado, con las reglas de recompensas aplicadas. */
function fitToCurrent(
  current: AdaptCurrentEnigma,
  proposed: AiEnigma,
  resources: AiEnigmaResources
): { enigma: AiEnigma; raised: boolean } {
  const enigma = {
    ...proposed,
    coins: resources.coins ? proposed.coins : current.coins,
    mana: resources.mana ? proposed.mana : current.mana,
  }
  let raised = false
  if (isLocked(current)) {
    for (const key of ['xp', 'coins', 'mana'] as const) {
      if (enigma[key] < current[key]) {
        enigma[key] = current[key]
        raised = true
      }
    }
  }
  return { enigma, raised }
}

/** Qué se haría con cada enigma, y con el título y la historia, al aplicar la propuesta. */
export function buildAdaptPlan(
  current: { title: string; description: string; enigmas: AdaptCurrentEnigma[] },
  proposal: AdaptProposal,
  resources: AiEnigmaResources
): AdaptPlan {
  const rows: AdaptRow[] = []
  const total = Math.max(current.enigmas.length, proposal.enigmas.length)
  for (let i = 0; i < total; i++) {
    const cur = current.enigmas[i]
    const prop = proposal.enigmas[i]
    if (cur && prop) {
      const { enigma, raised } = fitToCurrent(cur, prop, resources)
      const changed =
        enigma.title !== cur.title ||
        enigma.description !== cur.description ||
        enigma.xp !== cur.xp ||
        enigma.coins !== cur.coins ||
        enigma.mana !== cur.mana ||
        !sameList(enigma.objectives, cur.objectives)
      rows.push({ kind: 'update', current: cur, proposed: enigma, rewardsRaised: raised, changed })
    } else if (cur) {
      rows.push({ kind: isUndeletable(cur) ? 'keep' : 'delete', current: cur })
    } else if (prop) {
      rows.push({
        kind: 'create',
        proposed: {
          ...prop,
          coins: resources.coins ? prop.coins : 0,
          mana: resources.mana ? prop.mana : 0,
        },
      })
    }
  }

  const titleChanged = proposal.title !== current.title
  const descriptionChanged = proposal.description !== current.description
  return {
    title: proposal.title,
    description: proposal.description,
    titleChanged,
    descriptionChanged,
    rows,
    hasChanges:
      titleChanged ||
      descriptionChanged ||
      rows.some(row => row.kind === 'create' || row.kind === 'delete' || row.changed),
  }
}

/** La propuesta, en JSON y recortada, para mandarla de vuelta al pedir otro cambio. */
export function proposalForPrompt(proposal: AdaptProposal): string {
  return JSON.stringify({
    title: proposal.title,
    description: proposal.description.slice(0, 1500),
    enigmas: proposal.enigmas,
  }).slice(0, 4000)
}
