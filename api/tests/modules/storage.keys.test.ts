import { describe, it, expect, vi, beforeEach, afterAll } from 'vitest'
import { mkdtemp, writeFile, mkdir, rm } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import type { StorageSettings } from '../../src/modules/settings/settings.types.js'

/**
 * Cómo se reconocen y se localizan los ficheros guardados.
 *
 * Importa porque de aquí salen tres decisiones: si un fichero es de los que solo
 * se entregan tras comprobar el acceso, en qué almacenamiento está (lo guardado
 * antes de cambiar de almacenamiento sigue donde estaba) y qué se borra al
 * borrar una fila. La dirección de un documento de tipo enlace la escribe quien
 * crea el documento, así que llega texto cualquiera: `..`, `./` o barras de más
 * no pueden abrir ni borrar nada de fuera de la carpeta de subidas.
 */

const settings: StorageSettings = {
  driver: 'local',
  s3: {
    endpoint: 'https://ejemplo.r2.cloudflarestorage.com',
    region: 'auto',
    bucket: 'itakai',
    accessKeyId: 'clave',
    secretAccessKey: 'secreto',
    publicBaseUrl: 'https://ficheros.ejemplo.es',
    forcePathStyle: true,
  },
}

vi.mock('../../src/modules/settings/settings.service.js', () => ({
  getStorageSettings: vi.fn(async () => settings),
}))

const {
  deleteUpload,
  isPrivateKey,
  isPublicUploadPath,
  privateUploadFromUrl,
  publicUploadFromUrl,
  uploadExtension,
} = await import('../../src/modules/storage/storage.service.js')

const UPLOADS_ROOT = join(process.cwd(), 'uploads')
const s3 = settings.s3

describe('qué ficheros son privados', () => {
  it('lo dice la carpeta, aunque el nombre traiga acentos, espacios o paréntesis', () => {
    expect(isPrivateKey('submissions/1234.pdf')).toBe(true)
    expect(isPrivateKey('submissions/1234.práctica')).toBe(true)
    expect(isPrivateKey('documents/apuntes de clase.pdf')).toBe(true)
    expect(isPrivateKey('documents/tarea (1).pdf')).toBe(true)
    expect(isPrivateKey('covers/portada.png')).toBe(false)
  })

  it('una clave que no está normalizada o que se sale de la carpeta no vale', () => {
    expect(isPrivateKey('./submissions/1234.pdf')).toBe(false)
    expect(isPrivateKey('submissions//1234.pdf')).toBe(false)
    expect(isPrivateKey('../submissions/1234.pdf')).toBe(false)
    expect(isPrivateKey('submissions/')).toBe(false)
  })

  it('la ruta estática solo sirve lo que no está en una carpeta privada', () => {
    expect(isPublicUploadPath('/covers/portada.png')).toBe(true)
    expect(isPublicUploadPath('/ai-generated/avatars/a.png')).toBe(true)
    expect(isPublicUploadPath('/submissions/1234.pdf')).toBe(false)
    expect(isPublicUploadPath('/./documents/1234.pdf')).toBe(false)
    expect(isPublicUploadPath('//submissions/1234.pdf')).toBe(false)
    expect(isPublicUploadPath('/covers/../submissions/1234.pdf')).toBe(false)
    expect(isPublicUploadPath('/../../etc/passwd')).toBe(false)
  })
})

describe('de qué fichero habla una dirección guardada', () => {
  it('reconoce la misma clave escrita de varias maneras', () => {
    const key = 'submissions/1234.pdf'
    for (const url of [
      '/uploads/submissions/1234.pdf',
      '/uploads/./submissions/1234.pdf',
      '/uploads//submissions/1234.pdf',
      '/uploads/documents/../submissions/1234.pdf',
    ]) {
      expect(privateUploadFromUrl(url, s3), url).toEqual({ key, origin: 'local' })
    }
  })

  it('el almacenamiento sale de la forma de la dirección, no del configurado', () => {
    // Una fila de cuando se guardaba en disco se sigue leyendo del disco.
    expect(privateUploadFromUrl('/uploads/documents/a.pdf', s3)).toEqual({
      key: 'documents/a.pdf',
      origin: 'local',
    })
    // Y una del almacenamiento externo, de allí, por su URL pública o la del bucket.
    expect(privateUploadFromUrl('https://ficheros.ejemplo.es/documents/a.pdf', s3)).toEqual({
      key: 'documents/a.pdf',
      origin: 's3',
    })
    expect(
      privateUploadFromUrl('https://ejemplo.r2.cloudflarestorage.com/itakai/submissions/b.zip', s3)
    ).toEqual({ key: 'submissions/b.zip', origin: 's3' })
  })

  it('una dirección de fuera, o que no es de una carpeta privada, no es un fichero privado', () => {
    expect(privateUploadFromUrl('https://ejemplo.es/apuntes.pdf', s3)).toBeNull()
    expect(privateUploadFromUrl('/uploads/covers/portada.png', s3)).toBeNull()
    expect(privateUploadFromUrl('/uploads/../../etc/passwd', s3)).toBeNull()
    expect(privateUploadFromUrl(null, s3)).toBeNull()
  })
})

describe('qué dirección se enseña sin sesión', () => {
  it('la de un fichero público de los nuestros, en disco o en el almacenamiento externo', () => {
    for (const url of [
      '/uploads/covers/portada.png',
      '/uploads/ai-generated/covers/covers-1234.png',
      'https://ficheros.ejemplo.es/covers/portada.png',
      'https://ejemplo.r2.cloudflarestorage.com/itakai/covers/portada.png',
    ]) {
      expect(publicUploadFromUrl(url, s3), url).toBe(url)
    }
  })

  it('ni una de fuera, ni una privada, ni una que se salga del url(…) de CSS', () => {
    for (const url of [
      'https://rastreador.invalid/pixel.gif',
      '//rastreador.invalid/pixel.gif',
      'data:image/png;base64,AAAA',
      '/uploads/submissions/1234.pdf',
      '/uploads/covers/../documents/a.pdf',
      '/uploads/../../etc/passwd',
      '/uploads/covers/x.png), url(https://rastreador.invalid/pixel.gif',
      '/uploads/covers/mi portada.png',
      '/uploads/covers/"portada".png',
      'https://ficheros.ejemplo.es.rastreador.invalid/covers/portada.png',
    ]) {
      expect(publicUploadFromUrl(url, s3), url).toBeNull()
    }
    expect(publicUploadFromUrl(null, s3)).toBeNull()
    expect(publicUploadFromUrl('', s3)).toBeNull()
  })
})

describe('la extensión con la que se guarda una subida', () => {
  it('se queda en letras y números, y si no hay, en bin', () => {
    expect(uploadExtension('memoria.pdf')).toBe('pdf')
    expect(uploadExtension('MEMORIA.PDF')).toBe('pdf')
    expect(uploadExtension('memoria.pdf ')).toBe('pdf')
    expect(uploadExtension('práctica')).toBe('bin')
    expect(uploadExtension('mi trabajo')).toBe('bin')
    expect(uploadExtension('tarea.pdf (1)')).toBe('bin')
    expect(uploadExtension('apuntes.señal')).toBe('bin')
    expect(uploadExtension('copia.tar.gz')).toBe('gz')
  })
})

describe('borrar un fichero guardado', () => {
  let outside: string

  beforeEach(async () => {
    outside = join(await mkdtemp(join(tmpdir(), 'itakai-storage-')), 'fuera.txt')
    await writeFile(outside, 'no me toques')
  })

  afterAll(async () => {
    await rm(join(UPLOADS_ROOT, 'covers', 'prueba-borrado.txt'), { force: true })
  })

  it('no borra nada de fuera de la carpeta de subidas', async () => {
    const escapes = [
      `/uploads/../..${outside}`,
      `/uploads/./../..${outside}`,
      `/uploads/documents/../../..${outside}`,
    ]
    for (const url of escapes) {
      await deleteUpload(url)
      expect(existsSync(outside), url).toBe(true)
    }
    await deleteUpload(outside)
    expect(existsSync(outside)).toBe(true)
    await deleteUpload('https://ejemplo.es/apuntes.pdf')
    expect(existsSync(outside)).toBe(true)
  })

  it('borra el fichero de dentro, aunque la dirección venga con vueltas', async () => {
    const abs = join(UPLOADS_ROOT, 'covers', 'prueba-borrado.txt')
    await mkdir(join(UPLOADS_ROOT, 'covers'), { recursive: true })
    await writeFile(abs, 'portada')
    await deleteUpload('/uploads/documents/../covers/prueba-borrado.txt')
    expect(existsSync(abs)).toBe(false)
  })
})
