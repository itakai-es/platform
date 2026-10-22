/**
 * Búsqueda de personas en listas: sin tildes ni mayúsculas, para que «lucia»
 * encuentre a «Lucía» y «IÑIGO» a «Íñigo».
 */
export function foldText(text: string): string {
  return text
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
}

/** Si alguno de los campos contiene lo buscado; sin nada que buscar, todos valen. */
export function matchesQuery(query: string, ...fields: (string | null | undefined)[]): boolean {
  const q = foldText(query.trim())
  return !q || fields.some(field => !!field && foldText(field).includes(q))
}
