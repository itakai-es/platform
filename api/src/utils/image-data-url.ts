/**
 * Las imágenes que sube el navegador como `data:` URL (portadas, insignias,
 * imágenes de la ayuda). Solo se aceptan PNG, JPG, WebP y GIF, y el contenido
 * tiene que serlo de verdad: la extensión del fichero guardado sale de aquí y
 * no de lo que diga quien lo sube. Un `data:image/html` o un PNG que por dentro
 * es otra cosa no se guarda, para que nada servido desde `/uploads` pueda
 * ejecutarse como página.
 */

export interface ImageDataUrl {
  buffer: Buffer
  /** Extensión con la que se guarda: `png`, `jpg`, `webp` o `gif`. */
  ext: 'png' | 'jpg' | 'webp' | 'gif'
  mime: 'image/png' | 'image/jpeg' | 'image/webp' | 'image/gif'
}

const DATA_URL = /^data:image\/(png|jpe?g|webp|gif);base64,([A-Za-z0-9+/=\s]+)$/

const FORMATS = {
  png: { ext: 'png', mime: 'image/png' },
  jpg: { ext: 'jpg', mime: 'image/jpeg' },
  jpeg: { ext: 'jpg', mime: 'image/jpeg' },
  webp: { ext: 'webp', mime: 'image/webp' },
  gif: { ext: 'gif', mime: 'image/gif' },
} as const

/** ¿Empieza el contenido como empieza un fichero de ese formato? */
function hasSignature(buffer: Buffer, ext: ImageDataUrl['ext']): boolean {
  const starts = (bytes: number[], offset = 0) =>
    buffer.length >= offset + bytes.length && bytes.every((b, i) => buffer[offset + i] === b)
  const ascii = (text: string, offset = 0) => starts([...Buffer.from(text, 'ascii')], offset)

  switch (ext) {
    case 'png':
      return starts([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])
    case 'jpg':
      return starts([0xff, 0xd8, 0xff])
    case 'gif':
      return ascii('GIF87a') || ascii('GIF89a')
    case 'webp':
      return ascii('RIFF') && ascii('WEBP', 8)
  }
}

/**
 * Lee un `data:` URL de imagen. Devuelve `null` si no es PNG, JPG, WebP o GIF,
 * o si el contenido no es del formato que dice ser.
 */
export function parseImageDataUrl(dataUrl: string): ImageDataUrl | null {
  const match = DATA_URL.exec(dataUrl)
  if (!match) return null

  const format = FORMATS[match[1] as keyof typeof FORMATS]
  const buffer = Buffer.from(match[2], 'base64')
  if (!hasSignature(buffer, format.ext)) return null

  return { buffer, ext: format.ext, mime: format.mime }
}

export const IMAGE_FORMAT_ERROR = 'La imagen tiene que ser PNG, JPG, WebP o GIF.'
