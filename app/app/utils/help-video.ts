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

/** Un subtítulo del `.vtt` de un vídeo, con sus tiempos en segundos. */
export interface VttCue {
  start: number
  end: number
  text: string
}

/** `1:47`, `12:05`, `1:02:03`: la duración de un vídeo como la enseña cualquier reproductor. */
export function formatVideoTime(seconds?: number | null) {
  const total = Math.max(0, Math.floor(seconds ?? 0))
  const h = Math.floor(total / 3600)
  const m = Math.floor((total % 3600) / 60)
  const s = String(total % 60).padStart(2, '0')
  return h ? `${h}:${String(m).padStart(2, '0')}:${s}` : `${m}:${s}`
}

/**
 * Los subtítulos de un vídeo directo: el mismo fichero con extensión `.vtt`.
 * Los de YouTube y Vimeo los pone su propio reproductor.
 */
export function subtitlesUrl(videoUrl: string) {
  try {
    const url = new URL(videoUrl, 'https://itakai.local')
    if (!/\.(mp4|webm|ogg)$/i.test(url.pathname)) return null
  } catch {
    return null
  }
  return videoUrl.replace(/\.(mp4|webm|ogg)(?=$|[?#])/i, '.vtt')
}

const VTT_TIME = /(?:(\d+):)?(\d{1,2}):(\d{2})[.,](\d{1,3})/

function vttSeconds(value: string) {
  const match = VTT_TIME.exec(value)
  if (!match) return NaN
  const [, h = '0', m = '0', s = '0', ms = '0'] = match
  return Number(h) * 3600 + Number(m) * 60 + Number(s) + Number(ms.padEnd(3, '0')) / 1000
}

/**
 * Lee un WebVTT sencillo (el que generan las herramientas de vídeo de la ayuda):
 * bloques con una línea de tiempos y el texto. Ignora cabecera, notas, estilos
 * y ajustes de posición; las etiquetas en línea se quitan.
 */
export function parseVtt(text: string): VttCue[] {
  const cues: VttCue[] = []
  for (const block of text.replace(/\r\n?/g, '\n').split(/\n{2,}/)) {
    const lines = block.split('\n')
    const timing = lines.findIndex(line => line.includes('-->'))
    if (timing < 0) continue
    const [from = '', to = ''] = lines[timing]!.split('-->')
    const start = vttSeconds(from)
    const end = vttSeconds(to)
    const body = lines
      .slice(timing + 1)
      .join('\n')
      .replace(/<[^>]+>/g, '')
      .trim()
    if (Number.isFinite(start) && Number.isFinite(end) && body)
      cues.push({ start, end, text: body })
  }
  return cues
}
