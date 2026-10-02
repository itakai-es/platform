/**
 * Patrón de ILIKE para buscar `term` dentro de un texto. Sus comodines (`%`,
 * `_`) y la barra invertida se buscan tal cual: sin escaparlos, quien escribe
 * `%` lo encontraría todo y `_` casaría con cualquier carácter.
 */
export function containsPattern(term: string) {
  return `%${term.replace(/[\\%_]/g, '\\$&')}%`
}
