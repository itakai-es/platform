/**
 * El color de cada categoría del centro de ayuda.
 *
 * No inventa una paleta propia: guarda directamente el `type` del componente
 * `Card` del sistema de diseño, que es el que ya pinta las tarjetas de toda la
 * aplicación (amarillo, morado, verde y rosa de marca).
 */
export type HelpCardType = 'ia' | 'stats' | 'clases' | 'pending'

export const HELP_CARD_TYPES: HelpCardType[] = ['ia', 'stats', 'clases', 'pending']

export function helpCardType(accent?: string | null): HelpCardType {
  return HELP_CARD_TYPES.includes(accent as HelpCardType) ? (accent as HelpCardType) : 'stats'
}
