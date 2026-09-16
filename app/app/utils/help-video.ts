/**
 * Vídeos del centro de ayuda.
 *
 * El centro de ayuda no aloja vídeos: guarda una URL y la incrusta. Solo se
 * reconocen unos pocos orígenes; para cualquier otro se ofrece un enlace, que
 * es mejor que un iframe que no carga.
 */

export interface HelpVideoEmbed {
  /** `iframe` para YouTube y Vimeo, `file` para un vídeo directo, `link` para el resto. */
  type: 'iframe' | 'file' | 'link'
  src: string
}

const YOUTUBE_ID = /^[\w-]{6,}$/
const VIMEO_HASH = /^[\da-f]+$/i

function youtubeId(url: URL) {
  const host = url.hostname.replace(/^www\.|^m\./, '')
  if (host === 'youtu.be') return url.pathname.slice(1).split('/')[0]
  if (host !== 'youtube.com' && host !== 'youtube-nocookie.com') return ''
  if (url.pathname === '/watch') return url.searchParams.get('v') ?? ''
  const match = url.pathname.match(/^\/(?:shorts|embed)\/([^/]+)/)
  return match?.[1] ?? ''
}

/**
 * El id de un vídeo de Vimeo y, si es oculto, su hash de privacidad: sin él
 * el reproductor no lo enseña. Llega como segundo tramo de la ruta
 * (`vimeo.com/123/abcdef`) o como parámetro (`…/video/123?h=abcdef`).
 */
function vimeoVideo(url: URL) {
  const host = url.hostname.replace(/^www\.|^player\./, '')
  if (host !== 'vimeo.com') return null
  const match = url.pathname.match(/^\/(?:video\/)?(\d+)(?:\/([\da-f]+))?\/?$/i)
  if (!match?.[1]) return null
  const param = url.searchParams.get('h') ?? ''
  const hash = match[2] ?? (VIMEO_HASH.test(param) ? param : '')
  return { id: match[1], hash }
}

export function videoEmbed(raw: string): HelpVideoEmbed {
  const link: HelpVideoEmbed = { type: 'link', src: raw }

  let url: URL
  try {
    url = new URL(raw)
  } catch {
    return link
  }
  if (url.protocol !== 'https:') return link

  const youtube = youtubeId(url)
  if (youtube && YOUTUBE_ID.test(youtube)) {
    return { type: 'iframe', src: `https://www.youtube-nocookie.com/embed/${youtube}` }
  }

  const vimeo = vimeoVideo(url)
  if (vimeo) {
    // `dnt=1`: el reproductor de Vimeo sin cookies ni analítica, como YouTube.
    const query = new URLSearchParams({ ...(vimeo.hash ? { h: vimeo.hash } : {}), dnt: '1' })
    return { type: 'iframe', src: `https://player.vimeo.com/video/${vimeo.id}?${query}` }
  }

  if (/\.(mp4|webm|ogg)$/i.test(url.pathname)) {
    return { type: 'file', src: raw }
  }

  return link
}
