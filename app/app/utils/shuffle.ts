import { randomIndex } from '~/utils/roulette'

/**
 * Una copia barajada de la lista (Fisher-Yates), con el azar del navegador
 * (`crypto.getRandomValues`, a través de `randomIndex`). No toca la original.
 * Los equipos al azar los baraja la API, que sabe quién falta hoy y el nivel.
 */
export function shuffled<T>(items: readonly T[]): T[] {
  const result = [...items]
  for (let i = result.length - 1; i > 0; i--) {
    const j = randomIndex(i + 1)
    ;[result[i], result[j]] = [result[j]!, result[i]!]
  }
  return result
}
