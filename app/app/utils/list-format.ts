/**
 * Una lista unida como en el idioma de la app: «A, B y C». Sin Vue, para
 * probarla en Node.
 *
 * Con `Intl.ListFormat` solo si el navegador conoce ese mismo idioma. Si no
 * (hay navegadores sin euskera, gallego, asturiano ni valenciano), se une con
 * la conjunción del idioma que se le pasa (`and`), nunca con la de otro: las
 * fechas sí caen al castellano (ver `resolveDateLocale`), pero «A, B y C» en
 * medio de una frase en euskera se lee mal.
 */

const formatters = new Map<string, Intl.ListFormat | null>()

/** El formateador del idioma, o null si el navegador no lo conoce. */
function listFormatter(language: string): Intl.ListFormat | null {
  let formatter = formatters.get(language)
  if (formatter === undefined) {
    const [supported] = Intl.ListFormat.supportedLocalesOf([language])
    formatter = supported ? new Intl.ListFormat(supported, { type: 'conjunction' }) : null
    formatters.set(language, formatter)
  }
  return formatter
}

/** `items` unidos con comas y, antes del último, la conjunción del idioma. */
export function formatConjunction(items: string[], language: string, and: string): string {
  if (items.length <= 1) return items[0] ?? ''
  const formatter = listFormatter(language)
  if (formatter) return formatter.format(items)
  return `${items.slice(0, -1).join(', ')} ${and} ${items[items.length - 1]}`
}
