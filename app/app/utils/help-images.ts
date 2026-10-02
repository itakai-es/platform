/**
 * Las imágenes del centro de ayuda y del blog, los únicos textos en los que
 * se admiten (ver `renderHelpMarkdown`).
 *
 * Las que se suben desde el panel se guardan en `/uploads`, que sirve la API,
 * pero el markdown se pinta en el frontend: hay que apuntarlas al origen de la
 * API, o el navegador las pediría al del frontend y no saldrían. Las que ya
 * son absolutas, como las de R2, y las de la propia app, como los diagramas
 * de `/app/ayuda/diagramas`, se quedan igual.
 *
 * Se retocan sobre el DOM del HTML ya saneado, nunca sobre la cadena: pegar
 * texto en HTML saneado permitiría que un `alt` bien escogido acabase abriendo
 * atributos nuevos y saltándose el saneado.
 */

import { renderHelpMarkdown } from '~/utils/markdown'

/** Apunta a la API las imágenes subidas desde el panel que haya en `root`. */
export function pointUploadsToApi(root: ParentNode, apiBase: string) {
  root.querySelectorAll('img[src^="/uploads/"]').forEach(img => {
    img.setAttribute('src', `${apiBase}${img.getAttribute('src')}`)
  })
}

/**
 * El markdown de la ayuda en HTML, con las imágenes subidas ya apuntadas a la
 * API. Es lo que enseña la vista previa del editor del panel. La página
 * pública pasa por `helpDocument`, que además numera los apartados para el
 * índice; en el editor no hay índice, y esos `id` se repetirían con los de la
 * previsualización, que se abre encima.
 */
export function renderHelpMarkdownWithUploads(raw: string, apiBase: string) {
  // Sin DOM (no debería pasar: la app no se pinta en el servidor) el saneado
  // ya ha escapado todo el texto y no hay nada que retocar.
  if (typeof document === 'undefined') return renderHelpMarkdown(raw)
  const template = document.createElement('template')
  template.innerHTML = renderHelpMarkdown(raw)
  pointUploadsToApi(template.content, apiBase)
  return template.innerHTML
}
