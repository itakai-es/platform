import type { FastifyReply, FastifyRequest } from 'fastify'
import { prisma } from '../config/database.js'

/**
 * Cuando una cuenta tiene el cambio de contraseña pendiente, la API no la deja
 * hacer nada más. Es lo que convierte la contraseña temporal en temporal de
 * verdad: mientras no la cambie, la sesión no sirve para nada, aunque alguien se
 * salte la pantalla y llame a la API a mano.
 *
 * Se deja pasar lo imprescindible para poder cambiarla: entrar y renovar la
 * sesión, el propio cambio de contraseña y la configuración pública (de ella
 * dependen el idioma y los textos de la pantalla).
 */

export const PASSWORD_CHANGE_REQUIRED = 'PASSWORD_CHANGE_REQUIRED'

/** Rutas que siguen abiertas con el cambio pendiente. */
const ALLOWED_PREFIXES = [
  '/auth',
  '/public',
  '/health',
  '/uploads',
  '/profile/change-password',
  '/students/profile/me/password',
]

/** ¿Es una de las rutas que siguen abiertas? */
function isAllowed(url: string): boolean {
  const path = url.split('?')[0]
  if (path === '/') return true
  return ALLOWED_PREFIXES.some(prefix => path === prefix || path.startsWith(`${prefix}/`))
}

/**
 * Hook `onRequest`, detrás del registro del JWT. Solo consulta la base cuando la
 * petición trae una sesión válida y va a una ruta que no está en la lista, así
 * que no cuesta nada en las que sí lo están ni en las que llegan sin sesión.
 */
export async function passwordChangeGate(request: FastifyRequest, reply: FastifyReply) {
  if (request.method === 'OPTIONS') return
  if (isAllowed(request.url)) return

  try {
    await request.jwtVerify()
  } catch {
    return // Sin sesión válida, ya la rechaza quien proteja la ruta.
  }

  const { id } = request.user as { id: string }
  const user = await prisma.user.findUnique({
    where: { id },
    select: { mustChangePassword: true },
  })
  if (!user?.mustChangePassword) return

  return reply.status(403).send({
    message: 'Tienes que cambiar tu contraseña antes de seguir',
    code: PASSWORD_CHANGE_REQUIRED,
  })
}
