/**
 * Los apartados de un artículo del centro de ayuda.
 *
 * El índice «En esta página» del lateral y los anclajes de los `<h2>` del
 * cuerpo tienen que salir de la misma lista, o los enlaces no llevarían a
 * ningún sitio; por eso vive aquí y no en la página ni en el componente.
 */

import { renderHelpMarkdown } from '~/utils/markdown'

export interface HelpHeading {
  id: string
  text: string
}

/**
 * Un identificador estable para un encabezado: sin tildes, en minúsculas.
 * Admite cualquier alfabeto (la ayuda también está en griego), así que se
 * conservan letras y dígitos Unicode y solo se quitan los diacríticos.
 */
export function anchorId(text: string) {
  return text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60)
}

export interface HelpDocument {
  /** El cuerpo ya saneado, con los `id` de los apartados puestos. */
  content: DocumentFragment
  headings: HelpHeading[]
}

/**
 * El cuerpo del artículo como DOM, a partir del HTML **ya saneado**, con un
 * `id` en cada `<h2>`. Los apartados salen de ese mismo DOM (su texto visible,
 * con las entidades ya resueltas), así que cuadran uno a uno con lo que se
 * pinta, sea cual sea el markdown o el HTML que haya escrito el editor.
 *
 * Si dos apartados darían el mismo identificador, se numera el siguiente
 * hasta encontrar uno libre, para que cada enlace lleve al suyo.
 *
 * Sin DOM (la app no se pinta en el servidor) devuelve `null`.
 */
export function helpDocument(body: string): HelpDocument | null {
  if (typeof document === 'undefined') return null
  const template = document.createElement('template')
  template.innerHTML = renderHelpMarkdown(body)
  const content = template.content

  const used = new Set<string>()
  const headings: HelpHeading[] = []
  content.querySelectorAll('h2').forEach(heading => {
    const text = (heading.textContent ?? '').replace(/\s+/g, ' ').trim()
    const base = anchorId(text) || 'apartado'
    let id = base
    for (let n = 2; used.has(id); n++) id = `${base}-${n}`
    used.add(id)
    heading.setAttribute('id', id)
    headings.push({ id, text })
  })
  return { content, headings }
}

/** Los apartados del artículo, con el mismo `id` que llevan en el cuerpo. */
export function helpHeadings(body: string): HelpHeading[] {
  return helpDocument(body)?.headings ?? []
}
