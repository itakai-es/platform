import type { FastifyReply, FastifyRequest } from 'fastify'
import { prisma } from '../config/database.js'

/**
 * Lo que se comprueba de la cuenta en cada petición con sesión, con una sola
 * consulta. El token de acceso dura unos minutos y no se puede retirar; esto es
 * lo que hace que deje de valer en cuanto cambia algo de la cuenta:
 *
 * - si la cuenta ya no está activa (suspendida desde el panel, por ejemplo), la
 *   sesión deja de servir al momento, no cuando caduque el token;
 * - un token emitido antes del último cambio de contraseña ya no vale: cambiar
 *   la contraseña (o que la restablezca el profesorado) cierra de verdad las
 *   sesiones abiertas, también la que estaba en uso. El cliente lo trata como un
 *   token caducado: renueva la sesión, y solo lo consigue la que se conservó al
 *   hacer el cambio;
 * - con el cambio de contraseña pendiente, la API no deja hacer nada más. Es lo
 *   que convierte la contraseña temporal en temporal de verdad, aunque alguien
 *   se salte la pantalla y llame a la API a mano.
 *
 * `iat` va en segundos: un token emitido en el mismo segundo que el cambio, pero
 * antes, sigue valiendo hasta que caduca. Es el precio de no añadir nada al token.
 */

export const PASSWORD_CHANGE_REQUIRED = 'PASSWORD_CHANGE_REQUIRED'
export const ACCOUNT_SUSPENDED = 'ACCOUNT_SUSPENDED'
export const SESSION_REVOKED = 'SESSION_REVOKED'

/** Rutas que no usan la sesión: la barrera ni las mira. */
const SESSIONLESS_PREFIXES = ['/public', '/health', '/uploads']

/**
 * De `/auth`, solo estas usan la sesión. El resto (entrar, renovar, salir,
 * recuperar la contraseña) no la necesita y tiene que funcionar aunque el
 * cliente mande un token que ya no vale.
 */
const AUTH_SESSION_PREFIXES = ['/auth/me', '/auth/logout-all', '/auth/sessions']

/** Rutas que siguen abiertas con el cambio de contraseña pendiente. */
const PASSWORD_CHANGE_PREFIXES = [
  '/auth',
  '/profile/change-password',
  '/students/profile/me/password',
]

function matches(path: string, prefixes: string[]): boolean {
  return prefixes.some(prefix => path === prefix || path.startsWith(`${prefix}/`))
}

/**
 * La ruta que va a atender la petición, como se registró (`/auth/sessions/:sessionId`).
 * No vale la URL tal cual: el enrutador decodifica los escapes, así que
 * `/auth/%6De` llega a `/auth/me` aunque como texto no lo parezca. Sin ruta
 * (un 404), la URL sin consulta.
 */
function routePath(request: FastifyRequest): string {
  return request.routeOptions.url ?? request.url.split('?')[0]
}

/** ¿La ruta funciona sin sesión, y por tanto no hay nada que comprobar? */
function isSessionless(path: string): boolean {
  if (path === '/') return true
  if (matches(path, SESSIONLESS_PREFIXES)) return true
  return matches(path, ['/auth']) && !matches(path, AUTH_SESSION_PREFIXES)
}

/**
 * Hook `onRequest`, detrás del registro del JWT. Solo consulta la base cuando la
 * petición trae una sesión válida y va a una ruta que la usa, así que no cuesta
 * nada en las demás ni en las que llegan sin sesión.
 */
export async function sessionGate(request: FastifyRequest, reply: FastifyReply) {
  if (request.method === 'OPTIONS') return
  const path = routePath(request)
  if (isSessionless(path)) return

  try {
    await request.jwtVerify()
  } catch {
    return // Sin sesión válida, ya la rechaza quien proteja la ruta.
  }

  const { iat } = request.user as { iat?: unknown }
  const revoked = () =>
    reply.status(401).send({
      message: 'La sesión ya no es válida. Vuelve a entrar.',
      code: SESSION_REVOKED,
    })
  const id = sessionAccountId(request.user)
  if (!id) return revoked()

  const user = await prisma.user.findUnique({
    where: { id },
    select: { status: true, mustChangePassword: true, passwordChangedAt: true },
  })
  if (!user) return revoked()

  if (user.status !== 'active') {
    return reply.status(401).send({
      message: 'Cuenta suspendida o inactiva',
      code: ACCOUNT_SUSPENDED,
    })
  }

  if (user.passwordChangedAt) {
    const changedAt = Math.floor(user.passwordChangedAt.getTime() / 1000)
    if (typeof iat !== 'number' || iat < changedAt) return revoked()
  }

  if (user.mustChangePassword && !matches(path, PASSWORD_CHANGE_PREFIXES)) {
    return reply.status(403).send({
      message: 'Tienes que cambiar tu contraseña antes de seguir',
      code: PASSWORD_CHANGE_REQUIRED,
    })
  }
}

/**
 * La cuenta de un token de acceso, o `null` si el token firmado no es una
 * sesión: sin cuenta, o con `type` (los tokens con propósito propio lo llevan).
 */
function sessionAccountId(payload: unknown): string | null {
  if (!payload || typeof payload !== 'object') return null
  const { id, type } = payload as { id?: unknown; type?: unknown }
  if (type !== undefined || typeof id !== 'string') return null
  return id
}

/**
 * El decorador `authenticate`: token de acceso bien firmado y que sea una sesión.
 * Lo que la barrera comprueba de la cuenta ya se ha hecho antes, en `onRequest`.
 */
export async function authenticate(request: FastifyRequest, reply: FastifyReply) {
  try {
    await request.jwtVerify()
  } catch {
    return reply.status(401).send({ message: 'No autorizado' })
  }
  if (!sessionAccountId(request.user)) return reply.status(401).send({ message: 'No autorizado' })
}
