import { describe, expect, it } from 'vitest'
import { zipDeclaredSize } from '../../src/utils/zip-size.js'

/**
 * Un ZIP mínimo hecho a mano: entradas sin comprimir con los tamaños que se le
 * digan en el directorio central. Para estas pruebas solo cuenta lo que el ZIP
 * declara; el contenido y el CRC dan igual.
 */
function buildZip(entries: Array<{ name: string; data: Buffer; declared?: number }>, comment = '') {
  const locals: Buffer[] = []
  const centrals: Buffer[] = []
  let offset = 0
  for (const entry of entries) {
    const name = Buffer.from(entry.name)
    const local = Buffer.alloc(30)
    local.writeUInt32LE(0x04034b50, 0)
    local.writeUInt32LE(entry.data.length, 18)
    local.writeUInt32LE(entry.data.length, 22)
    local.writeUInt16LE(name.length, 26)
    locals.push(local, name, entry.data)

    const central = Buffer.alloc(46)
    central.writeUInt32LE(0x02014b50, 0)
    central.writeUInt32LE(entry.data.length, 20)
    central.writeUInt32LE(entry.declared ?? entry.data.length, 24)
    central.writeUInt16LE(name.length, 28)
    central.writeUInt32LE(offset, 42)
    centrals.push(central, name)

    offset += 30 + name.length + entry.data.length
  }
  const directory = Buffer.concat(centrals)
  const commentBytes = Buffer.from(comment)
  const end = Buffer.alloc(22)
  end.writeUInt32LE(0x06054b50, 0)
  end.writeUInt16LE(entries.length, 8)
  end.writeUInt16LE(entries.length, 10)
  end.writeUInt32LE(directory.length, 12)
  end.writeUInt32LE(offset, 16)
  end.writeUInt16LE(commentBytes.length, 20)
  return Buffer.concat([...locals, directory, end, commentBytes])
}

describe('zipDeclaredSize', () => {
  it('cuenta las entradas y suma lo que ocupan descomprimidas', () => {
    const zip = buildZip([
      { name: 'word/document.xml', data: Buffer.from('<w:document/>') },
      { name: '[Content_Types].xml', data: Buffer.from('<Types/>') },
    ])
    expect(zipDeclaredSize(zip)).toEqual({ entries: 2, uncompressed: 13 + 8 })
  })

  it('lee el ZIP aunque lleve un comentario al final', () => {
    const zip = buildZip([{ name: 'a.txt', data: Buffer.from('hola') }], 'un comentario')
    expect(zipDeclaredSize(zip)).toEqual({ entries: 1, uncompressed: 4 })
  })

  it('ve lo que una bomba dice que ocupará al abrirse', () => {
    const zip = buildZip([{ name: 'word/document.xml', data: Buffer.from('x'), declared: 4_000_000_000 }])
    expect(zipDeclaredSize(zip)?.uncompressed).toBe(4_000_000_000)
  })

  it('no da cifras de lo que no es un ZIP o está roto', () => {
    expect(zipDeclaredSize(Buffer.from('esto no es un zip'))).toBeNull()
    expect(zipDeclaredSize(Buffer.alloc(0))).toBeNull()

    const zip = buildZip([{ name: 'a.txt', data: Buffer.from('hola') }])
    const broken = Buffer.from(zip)
    broken.writeUInt32LE(0xdeadbeef, 4 + 30 + 'a.txt'.length) // firma del directorio central
    expect(zipDeclaredSize(broken)).toBeNull()
  })

  it('no da cifras de un ZIP64 (tamaños enormes)', () => {
    const zip = buildZip([{ name: 'a.txt', data: Buffer.from('hola'), declared: 0xffffffff }])
    expect(zipDeclaredSize(zip)).toBeNull()
  })
})
