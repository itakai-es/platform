import { mkdir, writeFile, unlink } from 'fs/promises'
import { existsSync } from 'fs'
import { dirname, join } from 'path'
import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3'
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

function keyFromUrl(fileUrl: string, s3: S3StorageConfig): string | null {
  if (fileUrl.startsWith('/uploads/')) return fileUrl.slice('/uploads/'.length)
  const candidates = [
    s3.publicBaseUrl,
    s3.endpoint && s3.bucket ? `${s3.endpoint}/${s3.bucket}` : '',
  ]
  for (const c of candidates) {
    const base = (c || '').replace(/\/+$/, '')
    if (base && fileUrl.startsWith(base + '/')) return fileUrl.slice(base.length + 1)
  }
  return null
}

/**
 * Guarda un fichero y devuelve su URL pública.
 * @param key  ruta relativa dentro de uploads, sin barra inicial
 *             (p. ej. 'ai-generated/covers/covers-<uuid>.png')
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
 * Acepta la URL almacenada (relativa `/uploads/...` o absoluta de R2).
 */
export async function deleteUpload(fileUrl: string | null | undefined): Promise<void> {
  if (!fileUrl) return
  try {
    // Se enruta por la FORMA de la URL, no por el driver actual: un fichero
    // `/uploads/...` está en disco local aunque ahora el driver sea S3 (y al
    // revés), así que no se borra en el backend equivocado tras cambiar de driver.
    if (fileUrl.startsWith('/uploads/')) {
      const abs = join(UPLOADS_ROOT, fileUrl.slice('/uploads/'.length))
      if (existsSync(abs)) await unlink(abs)
      return
    }

    const storage = await getStorageSettings()
    const key = keyFromUrl(fileUrl, storage.s3)
    if (!key || !storage.s3.bucket) return
    const client = getS3Client(storage.s3)
    await client.send(new DeleteObjectCommand({ Bucket: storage.s3.bucket, Key: key }))
  } catch {
    /* best-effort: no rompemos la operación principal por un borrado fallido */
  }
}
