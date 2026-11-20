/**
 * Lo que dice un ZIP de sí mismo, leído de su directorio central sin
 * descomprimir nada: cuántas entradas tiene y cuánto ocuparían descomprimidas.
 *
 * Sirve para rechazar una «bomba» (unos pocos MB que se convierten en GB al
 * abrirse) antes de dársela a una librería que lo descomprime todo en memoria,
 * como pasa con los .docx. Si el ZIP no se puede leer, viene en ZIP64 (pensado
 * para tamaños enormes) o sus cifras no cuadran, devuelve `null`: quien llama
 * lo trata como no apto.
 */

const END_OF_CENTRAL_DIRECTORY = 0x06054b50
const CENTRAL_DIRECTORY_ENTRY = 0x02014b50
const END_RECORD_SIZE = 22
const ENTRY_HEADER_SIZE = 46
const MAX_COMMENT = 0xffff

export interface ZipDeclaredSize {
  entries: number
  uncompressed: number
}

export function zipDeclaredSize(buffer: Buffer): ZipDeclaredSize | null {
  // El registro final está al final, detrás como mucho de un comentario.
  const lowest = Math.max(0, buffer.length - END_RECORD_SIZE - MAX_COMMENT)
  let end = -1
  for (let i = buffer.length - END_RECORD_SIZE; i >= lowest; i--) {
    if (buffer.readUInt32LE(i) === END_OF_CENTRAL_DIRECTORY) {
      end = i
      break
    }
  }
  if (end < 0) return null

  const entries = buffer.readUInt16LE(end + 10)
  const directorySize = buffer.readUInt32LE(end + 12)
  const directoryOffset = buffer.readUInt32LE(end + 16)
  if (entries === 0xffff || directoryOffset === 0xffffffff) return null
  if (directoryOffset + directorySize > end) return null

  let position = directoryOffset
  let uncompressed = 0
  for (let n = 0; n < entries; n++) {
    if (position + ENTRY_HEADER_SIZE > end) return null
    if (buffer.readUInt32LE(position) !== CENTRAL_DIRECTORY_ENTRY) return null

    const size = buffer.readUInt32LE(position + 24)
    if (size === 0xffffffff) return null
    uncompressed += size

    position +=
      ENTRY_HEADER_SIZE +
      buffer.readUInt16LE(position + 28) +
      buffer.readUInt16LE(position + 30) +
      buffer.readUInt16LE(position + 32)
  }

  return { entries, uncompressed }
}
