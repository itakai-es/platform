import { describe, expect, it } from 'vitest'
import { parseImageDataUrl } from '../../src/utils/image-data-url.js'

const dataUrl = (type: string, bytes: number[] | Buffer) =>
  `data:image/${type};base64,${Buffer.from(bytes).toString('base64')}`

const PNG = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0x0d]
const JPG = [0xff, 0xd8, 0xff, 0xe0, 0, 0x10]
const GIF = [...Buffer.from('GIF89a'), 1, 0, 1, 0]
const WEBP = [...Buffer.from('RIFF'), 0x24, 0, 0, 0, ...Buffer.from('WEBPVP8 ')]

describe('parseImageDataUrl', () => {
  it('acepta PNG, JPG, WebP y GIF de verdad, con la extensión que toca', () => {
    expect(parseImageDataUrl(dataUrl('png', PNG))).toMatchObject({ ext: 'png', mime: 'image/png' })
    expect(parseImageDataUrl(dataUrl('jpeg', JPG))).toMatchObject({ ext: 'jpg', mime: 'image/jpeg' })
    expect(parseImageDataUrl(dataUrl('jpg', JPG))).toMatchObject({ ext: 'jpg', mime: 'image/jpeg' })
    expect(parseImageDataUrl(dataUrl('webp', WEBP))).toMatchObject({ ext: 'webp', mime: 'image/webp' })
    expect(parseImageDataUrl(dataUrl('gif', GIF))).toMatchObject({ ext: 'gif', mime: 'image/gif' })
  })

  it('devuelve los bytes de la imagen', () => {
    expect(parseImageDataUrl(dataUrl('png', PNG))?.buffer.equals(Buffer.from(PNG))).toBe(true)
  })

  it('no acepta una página web disfrazada de imagen', () => {
    const page = Buffer.from('<html><script>alert(1)</script></html>')
    expect(parseImageDataUrl(dataUrl('html', page))).toBeNull()
    expect(parseImageDataUrl(dataUrl('xhtml', page))).toBeNull()
    expect(parseImageDataUrl(`data:image/svg+xml;base64,${page.toString('base64')}`)).toBeNull()
  })

  it('no acepta un formato correcto con otro contenido dentro', () => {
    expect(parseImageDataUrl(dataUrl('png', Buffer.from('<html></html>')))).toBeNull()
    expect(parseImageDataUrl(dataUrl('png', JPG))).toBeNull()
    expect(parseImageDataUrl(dataUrl('webp', [...Buffer.from('RIFF'), 0, 0, 0, 0, ...Buffer.from('WAVE')]))).toBeNull()
  })

  it('no acepta formatos que no son de la lista ni cosas que no son data: URL', () => {
    expect(parseImageDataUrl(dataUrl('bmp', [0x42, 0x4d, 0, 0]))).toBeNull()
    expect(parseImageDataUrl('https://ejemplo.org/imagen.png')).toBeNull()
    expect(parseImageDataUrl('data:image/png;base64,')).toBeNull()
    expect(parseImageDataUrl('data:image/png,sin-base64')).toBeNull()
  })
})
