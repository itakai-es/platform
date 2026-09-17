import { mkdir, writeFile, unlink, stat } from 'fs/promises'
import { createReadStream, existsSync } from 'fs'
import { dirname, join, posix, resolve, sep } from 'path'
import type { Readable } from 'stream'
import { S3Client, PutObjectCommand, DeleteObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3'
import { getStorageSettings } from '../settings/settings.service.js'
import type { S3StorageConfig, StorageSettings } from '../settings/settings.types.js'

/**
 * Capa de almacenamiento de ficheros subidos (portadas e imágenes generadas por
 * IA, avatares, insignias, documentos de misión, entregas de alumnos…).
 *
 * Driver por defecto: `local` (disco, servido por Fastify en `/uploads`).
 * Driver opcional: `s3` (Cloudflare R2 u otro S3-compatible), configurable desde
 * el panel de administración. En modo S3 se devuelven URLs públicas absolutas
 * (bucket público / dominio propio de R2), de modo que el servido es directo.
 *
 * Todos los sitios de subida pasan por `saveUpload`, así que cambiar de local a
 * R2 no requiere tocar código.
 *
 * PREFIJOS PRIVADOS (`PRIVATE_PREFIXES`): `submissions/` y `documents/` guardan
 * trabajo del alumnado y material de clase, y solo se entregan tras comprobar el
 * acceso (módulo `files`). Por eso:
 *  - el servido estático de `/uploads` los deja fuera;
 *  - con driver `s3` se leen desde el bucket con `readUpload`, nunca por su URL
 *    pública, y el bucket debería mantener esos dos prefijos sin acceso público
 *    (solo las credenciales de la instancia). Si el bucket es público de raíz —el
 *    caso habitual de R2 con dominio propio—, hay que restringir esos prefijos en
 *    el propio bucket o en el borde; el resto (`badges/`, `covers/`, `help/`,
 *    `ai-generated/`, avatares) sí es público a propósito.
 */

const UPLOADS_ROOT = join(process.cwd(), 'uploads')

// Cliente S3 cacheado por firma de configuración (se recrea si cambia en el panel).
let _s3: { client: S3Client; sig: string } | null = null

function getS3Client(cfg: S3StorageConfig): S3Client {
  const sig = [cfg.endpoint, cfg.region, cfg.accessKeyId, cfg.secretAccessKey, cfg.forcePathStyle].join('|')
  if (_s3 && _s3.sig === sig) return _s3.client
  const client = new S3Client({
    region: cfg.region || 'auto',
    endpoint: cfg.endpoint || undefined,
    forcePathStyle: cfg.forcePathStyle,
    credentials: {
      accessKeyId: cfg.accessKeyId,
      secretAccessKey: cfg.secretAccessKey,
    },
  })
  _s3 = { client, sig }
  return client
}

/** ¿Está el modo S3 activo Y suficientemente configurado para usarlo? */
function useS3(storage: StorageSettings): boolean {
  return storage.driver === 's3' && !!storage.s3.bucket && !!storage.s3.accessKeyId
}

function s3PublicUrl(cfg: S3StorageConfig, key: string): string {
  const base = (cfg.publicBaseUrl || `${cfg.endpoint}/${cfg.bucket}`).replace(/\/+$/, '')
  return `${base}/${key}`
}

/**
 * Clave y almacenamiento a los que apunta una URL guardada, o null si no apunta
 * a ninguno de los dos. La clave se normaliza, así que `/uploads/./documents/x`
 * y `/uploads/covers/../documents/x` se reconocen igual que `/uploads/documents/x`.
 *
 * El almacenamiento sale de la FORMA de la URL, no del driver de ahora: un
 * fichero guardado como `/uploads/...` está en disco aunque hoy el driver sea
 * externo (y al revés), así que tras cambiar de driver las filas de antes se
 * siguen leyendo y borrando donde están.
 */
function locateUpload(fileUrl: string, s3: S3StorageConfig): StoredUpload | null {
  const at = (raw: string, origin: StoredUpload['origin']): StoredUpload | null => {
    const key = normalizeUploadKey(raw)
    return key ? { key, origin } : null
  }

  if (fileUrl.startsWith('/uploads/')) return at(fileUrl.slice('/uploads/'.length), 'local')
  const candidates = [
    s3.publicBaseUrl,
    s3.endpoint && s3.bucket ? `${s3.endpoint}/${s3.bucket}` : '',
  ]
  for (const c of candidates) {
    const base = (c || '').replace(/\/+$/, '')
    if (base && fileUrl.startsWith(base + '/')) return at(fileUrl.slice(base.length + 1), 's3')
  }
  return null
}

// ─────────────────────────── Ficheros privados ───────────────────────────

/** Carpetas cuyo contenido solo se entrega tras comprobar el acceso. */
export const PRIVATE_PREFIXES = ['submissions/', 'documents/'] as const

/** Un fichero guardado, localizado: su clave y dónde está. */
export interface StoredUpload {
  key: string
  origin: 'local' | 's3'
}

/**
 * Clave canónica de una ruta o clave de subida, o null si no nombra un fichero
 * de dentro de `uploads/`. Es la forma única con la que se compara luego: así
 * `./documents/x`, `documents//x` y `covers/../documents/x` son la misma clave,
 * y lo que se sale de la carpeta (`../`) no es clave de nada.
 */
function normalizeUploadKey(raw: string): string | null {
  if (raw.includes('\\') || raw.includes('\0')) return null
  // La barra inicial se quita antes de normalizar: así una ruta que sube por
  // encima de la carpeta (`/../../etc/passwd`) no se queda en nada, se descarta.
  const key = posix.normalize(raw.replace(/^\/+/, ''))
  if (!key || key === '.' || key.endsWith('/') || key === '..' || key.startsWith('../')) return null
  return key
}

/** ¿Nombra esta clave una de las carpetas privadas, en cualquier tramo? */
function inPrivateFolder(key: string): boolean {
  const lower = key.toLowerCase()
  return PRIVATE_PREFIXES.some(prefix => lower.startsWith(prefix) || lower.includes(`/${prefix}`))
}

/**
 * ¿Se puede servir esta ruta de `/uploads` como estático, sin comprobar nada?
 * Se normaliza antes de mirar la carpeta, para que no cuele disfrazada de `.`,
 * `..` o barras de más; lo que no se pueda normalizar no se sirve.
 */
export function isPublicUploadPath(pathName: string): boolean {
  const key = normalizeUploadKey(pathName)
  return key !== null && !inPrivateFolder(key)
}

/**
 * ¿Es esta clave la de un fichero privado? Tiene que estar en una de las
 * carpetas privadas y venir ya normalizada: la carpeta manda, no la forma del
 * nombre, porque el nombre lo hereda del fichero que subió quien lo subió y
 * puede traer acentos, espacios o paréntesis.
 */
export function isPrivateKey(key: string): boolean {
  const normalized = normalizeUploadKey(key)
  if (normalized === null || normalized !== key) return false
  return PRIVATE_PREFIXES.some(prefix => normalized.startsWith(prefix))
}

/**
 * Fichero privado al que apunta una URL guardada, o null si no apunta a uno.
 * Reconoce tanto las relativas (`/uploads/<clave>`) como las absolutas del
 * almacenamiento externo, así que las filas de antes del cambio siguen valiendo.
 */
export function privateUploadFromUrl(
  fileUrl: string | null | undefined,
  s3: S3StorageConfig
): StoredUpload | null {
  if (!fileUrl) return null
  const found = locateUpload(fileUrl, s3)
  return found && isPrivateKey(found.key) ? found : null
}

/**
 * `privateUploadFromUrl` ya resuelto con la configuración actual, para recorrer
 * varias filas sin volver a leerla en cada una.
 */
export async function privateUploadResolver(): Promise<
  (fileUrl: string | null | undefined) => StoredUpload | null
> {
  const { s3 } = await getStorageSettings()
  return fileUrl => privateUploadFromUrl(fileUrl, s3)
}

/** Igual que `privateUploadResolver`, para una sola URL. */
export async function resolvePrivateUpload(fileUrl: string | null | undefined) {
  return (await privateUploadResolver())(fileUrl)
}

/**
 * Extensión con la que se guarda una subida: en minúsculas y solo letras y
 * números, para que la clave sea siempre canónica por mucho que el nombre
 * original traiga espacios, acentos o paréntesis. Si no hay una extensión
 * reconocible, `bin`. El nombre con el que se subió se guarda aparte, y es el
 * que se usa al descargar y para adivinar el tipo.
 */
export function uploadExtension(filename: string): string {
  const tail = filename.includes('.') ? (filename.split('.').pop() || '').trim().toLowerCase() : ''
  return /^[a-z0-9]{1,10}$/.test(tail) ? tail : 'bin'
}

/** Un fichero leído del almacenamiento, listo para enviar. */
export interface UploadRead {
  stream: Readable
  /** Bytes que se envían, si se conocen. */
  length: number | null
  contentType: string | null
  /** Trozo enviado cuando la petición traía `Range`. */
  range: { start: number; end: number; total: number } | null
}

/** `bytes=inicio-fin` sobre un fichero de `total` bytes, o null si no se puede aplicar. */
function parseRange(range: string | undefined, total: number) {
  const match = /^bytes=(\d*)-(\d*)$/.exec((range || '').trim())
  if (!match || total === 0) return null
  const [, rawStart, rawEnd] = match
  if (!rawStart && !rawEnd) return null
  let start = rawStart ? Number(rawStart) : total - Number(rawEnd)
  let end = rawStart ? (rawEnd ? Number(rawEnd) : total - 1) : total - 1
  start = Math.max(0, start)
  end = Math.min(end, total - 1)
  if (start > end) return null
  return { start, end, total }
}

/** Ruta en disco de una clave, o null si se saldría de la carpeta de subidas. */
function localPath(key: string): string | null {
  const abs = resolve(UPLOADS_ROOT, key)
  return abs.startsWith(UPLOADS_ROOT + sep) ? abs : null
}

/**
 * Lee un fichero privado del almacenamiento para enviarlo desde la API. Devuelve
 * null si no existe. Con `range` entrega solo ese trozo, para que un vídeo se
 * pueda recorrer sin descargarlo entero.
 *
 * Se lee de donde está el fichero (`origin`), no de donde guardaría el driver de
 * ahora: si la instancia cambia de disco a almacenamiento externo, lo subido
 * antes se sigue entregando.
 */
export async function readUpload(upload: StoredUpload, range?: string): Promise<UploadRead | null> {
  const { key } = upload
  if (!isPrivateKey(key)) return null

  if (upload.origin === 's3') {
    const storage = await getStorageSettings()
    if (!storage.s3.bucket || !storage.s3.accessKeyId) return null
    const client = getS3Client(storage.s3)
    try {
      const res = await client.send(
        new GetObjectCommand({ Bucket: storage.s3.bucket, Key: key, Range: range })
      )
      if (!res.Body) return null
      const matched = /^bytes (\d+)-(\d+)\/(\d+)$/.exec(res.ContentRange || '')
      return {
        stream: res.Body as Readable,
        length: res.ContentLength ?? null,
        contentType: res.ContentType ?? null,
        range: matched
          ? { start: Number(matched[1]), end: Number(matched[2]), total: Number(matched[3]) }
          : null,
      }
    } catch {
      return null
    }
  }

  const abs = localPath(key)
  if (!abs) return null
  try {
    const info = await stat(abs)
    if (!info.isFile()) return null
    const chunk = parseRange(range, info.size)
    return {
      stream: chunk
        ? createReadStream(abs, { start: chunk.start, end: chunk.end })
        : createReadStream(abs),
      length: chunk ? chunk.end - chunk.start + 1 : info.size,
      contentType: null,
      range: chunk,
    }
  } catch {
    return null
  }
}

/**
 * Guarda un fichero y devuelve su URL pública.
 * @param key  ruta relativa dentro de uploads, sin barra inicial
 *             (p. ej. 'ai-generated/covers/covers-<uuid>.png'). Para las
 *             carpetas privadas, la extensión sale de `uploadExtension`.
 */
export async function saveUpload(
  key: string,
  body: Buffer | string,
  contentType?: string
): Promise<string> {
  const cleanKey = key.replace(/^\/+/, '')
  const buffer = typeof body === 'string' ? Buffer.from(body, 'utf-8') : body
  const storage = await getStorageSettings()

  if (useS3(storage)) {
    const client = getS3Client(storage.s3)
    await client.send(
      new PutObjectCommand({
        Bucket: storage.s3.bucket,
        Key: cleanKey,
        Body: buffer,
        ContentType: contentType,
      })
    )
    return s3PublicUrl(storage.s3, cleanKey)
  }

  const abs = join(UPLOADS_ROOT, cleanKey)
  await mkdir(dirname(abs), { recursive: true })
  await writeFile(abs, buffer)
  return `/uploads/${cleanKey}`
}

/**
 * Borra un fichero previamente guardado (best-effort: nunca lanza).
 * Acepta la URL almacenada (relativa `/uploads/...` o absoluta del
 * almacenamiento externo), y solo borra dentro de la carpeta de subidas: una URL
 * que apunte a cualquier otro sitio no borra nada.
 */
export async function deleteUpload(fileUrl: string | null | undefined): Promise<void> {
  if (!fileUrl) return
  try {
    const storage = await getStorageSettings()
    const found = locateUpload(fileUrl, storage.s3)
    // Solo se borra lo que es un fichero de `uploads/`: la URL puede venir de un
    // documento de tipo enlace, que la escribe quien crea el documento.
    if (!found) return

    if (found.origin === 'local') {
      const abs = localPath(found.key)
      if (abs && existsSync(abs)) await unlink(abs)
      return
    }

    if (!storage.s3.bucket) return
    const client = getS3Client(storage.s3)
    await client.send(new DeleteObjectCommand({ Bucket: storage.s3.bucket, Key: found.key }))
  } catch {
    /* best-effort: no rompemos la operación principal por un borrado fallido */
  }
}
