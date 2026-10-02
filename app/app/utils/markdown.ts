import { Marked } from 'marked'
import _DOMPurify from 'dompurify'

// --- DOMPurify ---
interface PurifyInstance {
  sanitize: (html: string, config?: object) => string
  addHook: (hook: 'afterSanitizeAttributes', cb: (node: Element) => void) => void
}

let purifyInstance: PurifyInstance | null = null
try {
  const dp = (_DOMPurify as unknown as Record<string, unknown>).default || _DOMPurify
  purifyInstance =
    typeof dp === 'function'
      ? (dp as (win: Window) => typeof purifyInstance)(window)
      : (dp as unknown as typeof purifyInstance)
  // Todo enlace abre otra pestaña y va sin `opener`, también los que se
  // escriben como HTML: así se portan como los de Markdown (ver `link` más
  // abajo), uno sin `target` no se lleva a quien lee fuera de la página, y un
  // `rel="opener"` no deja a la página enlazada cambiar la dirección de esta.
  purifyInstance?.addHook('afterSanitizeAttributes', node => {
    if (node.tagName === 'A') {
      node.setAttribute('target', '_blank')
      node.setAttribute('rel', 'noopener noreferrer')
    }
  })
} catch {
  // SSR or test environment — DOMPurify unavailable
  purifyInstance = null
}

const ALLOWED_TAGS = [
  'h1',
  'h2',
  'h3',
  'h4',
  'h5',
  'h6',
  'p',
  'br',
  'hr',
  'strong',
  'em',
  'del',
  's',
  'u',
  'ul',
  'ol',
  'li',
  'a',
  'code',
  'pre',
  'blockquote',
  'table',
  'thead',
  'tbody',
  'tr',
  'th',
  'td',
]

/**
 * Ni `class` ni `style`, ni tampoco `data-*`, que DOMPurify deja pasar si no
 * se le dice (`ALLOW_DATA_ATTR`). Este Markdown lo escribe cualquiera, y la
 * historia de una plantilla se lee sin cuenta en su enlace público: con los
 * estilos de la propia app, un enlace escrito como HTML podría tapar la página
 * entera o hacerse pasar por uno de sus botones. Nada de lo que se pinta
 * depende de ellos: las clases `language-*` que pone marked en los bloques de
 * código no las usa ningún estilo.
 */
const ALLOWED_ATTR = ['href', 'target', 'rel']

/**
 * Solo el centro de ayuda admite imágenes: los diagramas y las capturas que
 * se insertan desde el panel de administración. El chat, la guía de clase,
 * las misiones y el resto de páginas no, a propósito: ahí escribe cualquiera
 * y lo lee el alumnado, y una imagen remota es una petición que no
 * controlamos. `javascript:` sigue bloqueado por DOMPurify también en `src`.
 */
const HELP_ALLOWED_TAGS = [...ALLOWED_TAGS, 'img']
const HELP_ALLOWED_ATTR = [...ALLOWED_ATTR, 'src', 'alt', 'title']

interface SanitizeConfig {
  ALLOWED_TAGS: string[]
  ALLOWED_ATTR: string[]
  ALLOW_DATA_ATTR: boolean
}

const TEXT_CONFIG: SanitizeConfig = { ALLOWED_TAGS, ALLOWED_ATTR, ALLOW_DATA_ATTR: false }
const HELP_CONFIG: SanitizeConfig = {
  ALLOWED_TAGS: HELP_ALLOWED_TAGS,
  ALLOWED_ATTR: HELP_ALLOWED_ATTR,
  ALLOW_DATA_ATTR: false,
}

const DANGEROUS_PROTOCOLS = /^(javascript|data|vbscript):/i

function escapeHtml(raw: string): string {
  return raw
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
    .replace(/\n/g, '<br />')
}

function sanitize(html: string, config: SanitizeConfig): string {
  if (purifyInstance?.sanitize) {
    return purifyInstance.sanitize(html, config)
  }
  // DOMPurify unavailable (SSR) — escape raw input as safe fallback
  return escapeHtml(html)
}

// --- Single marked instance ---
const md = new Marked({
  breaks: true,
  gfm: true,
  renderer: {
    link({ href, text }: { href: string; text: string }) {
      if (DANGEROUS_PROTOCOLS.test(href.trim())) {
        return escapeHtml(text)
      }
      const safeHref = href.replace(/"/g, '&quot;')
      return `<a href="${safeHref}" target="_blank" rel="noopener noreferrer">${text}</a>`
    },
  },
})

function parse(raw: string, config: SanitizeConfig): string {
  const html = md.parse(raw, { async: false }) as string
  return sanitize(html, config)
}

/**
 * Render markdown for chat messages (headings clamped to h3-h4).
 */
export function renderMarkdown(raw: string): string {
  if (!raw) return ''
  try {
    return parse(raw, TEXT_CONFIG)
      .replace(/<h[12][^>]*>/g, '<h3>')
      .replace(/<\/h[12]>/g, '</h3>')
  } catch {
    return escapeHtml(raw)
  }
}

/**
 * Render markdown for page content (full headings, no images).
 */
export function renderPageMarkdown(raw: string): string {
  if (!raw) return ''
  try {
    return parse(raw, TEXT_CONFIG)
  } catch {
    return escapeHtml(raw)
  }
}

/**
 * El markdown de un artículo del centro de ayuda: como una página, y además
 * con imágenes. Solo lo escriben administradores.
 */
export function renderHelpMarkdown(raw: string): string {
  if (!raw) return ''
  try {
    return parse(raw, HELP_CONFIG)
  } catch {
    return escapeHtml(raw)
  }
}
