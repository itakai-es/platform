import { createHmac, hkdfSync, timingSafeEqual } from 'crypto'
import { env } from '../../config/env.js'

/**
 * Enlaces temporales firmados para los ficheros privados.
 *
 * La descarga normal va con la sesión en la cabecera, pero un vídeo que se abre
 * en otra pestaña o un fichero incrustado los pide el navegador por su cuenta y
 * ahí no hay cabecera que poner. Para esos casos, una ruta con sesión —que ya ha
 * comprobado el acceso— emite un enlace de un solo fichero y de vida corta.
 *
 * El enlace no es un token de acceso ni lo lleva dentro: es una firma sobre
 * `fichero + caducidad` con una clave derivada aparte, así que no vale para
 * llamar a la API ni un token de sesión vale como enlace. Va atado a la fila y a
 * la clave del fichero: si el documento se borra o se sustituye, el enlace muere.
 */

/**
 * Vida del enlace. Lo justo para abrirlo: se pide y se usa en el momento. Corta
 * también porque el enlace viaja en la dirección, y una dirección se queda
 * apuntada en el registro del proxy y en el historial del navegador: pasados
 * estos segundos, lo apuntado ya no sirve para nada.
 */
export const FILE_LINK_TTL_SECONDS = 300

export type FileKind = 'submission' | 'document'
export type FileDisposition = 'inline' | 'attachment'

export interface FileLinkPayload {
  /** Tipo de fila que se comprobó al emitirlo. */
  k: FileKind
  /** Id de la fila. */
  i: string
  /** Clave del fichero en el almacenamiento. */
  f: string
  /** Si se abre en el navegador o se descarga. */
  d: FileDisposition
  /** Caducidad, en segundos desde el epoch. */
  e: number
}

/**
 * Clave de firma, derivada del secreto de los tokens de acceso con una etiqueta
 * propia: el mismo despliegue no necesita otra variable de entorno y, aun así,
 * ninguna firma vale para lo otro.
 */
const LINK_KEY = hkdfSync('sha256', env.JWT_ACCESS_SECRET, '', 'itakai-file-link', 32)

function base64url(value: Buffer | string): string {
  return Buffer.from(value).toString('base64url')
}

function signature(body: string): Buffer {
  return createHmac('sha256', Buffer.from(LINK_KEY)).update(body).digest()
}

/** Firma un enlace para un fichero concreto. */
export function signFileLink(
  payload: Omit<FileLinkPayload, 'e'>,
  ttlSeconds = FILE_LINK_TTL_SECONDS
): { token: string; expiresAt: Date } {
  const expiresAt = new Date(Date.now() + ttlSeconds * 1000)
  const full: FileLinkPayload = { ...payload, e: Math.floor(expiresAt.getTime() / 1000) }
  const body = base64url(JSON.stringify(full))
  return { token: `${body}.${base64url(signature(body))}`, expiresAt }
}

/** Contenido de un enlace válido y sin caducar, o null si la firma no cuadra. */
export function verifyFileLink(token: string): FileLinkPayload | null {
  const [body, mac] = (token || '').split('.')
  if (!body || !mac) return null

  const expected = signature(body)
  const given = Buffer.from(mac, 'base64url')
  if (given.length !== expected.length || !timingSafeEqual(given, expected)) return null

  let payload: FileLinkPayload
  try {
    payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf-8')) as FileLinkPayload
  } catch {
    return null
  }
  if (payload.k !== 'submission' && payload.k !== 'document') return null
  if (typeof payload.i !== 'string' || typeof payload.f !== 'string') return null
  if (payload.d !== 'inline' && payload.d !== 'attachment') return null
  if (typeof payload.e !== 'number' || payload.e * 1000 <= Date.now()) return null
  return payload
}
