import type { FastifyRequest } from 'fastify'
import { prisma } from '../config/database.js'

/** Nombre de la cookie con el refresh token de la sesión. */
export const REFRESH_TOKEN_COOKIE_NAME = 'refresh_token'

/**
 * Familia de la sesión que hace la petición, leída de su cookie. Sirve para
 * cerrar «las demás sesiones» sin cerrar esta: quien cambia su contraseña desde
 * su perfil no debería quedarse fuera por hacerlo.
 */
export async function currentTokenFamily(request: FastifyRequest): Promise<string | undefined> {
  const cookieToken = request.cookies?.[REFRESH_TOKEN_COOKIE_NAME]
  if (!cookieToken) return undefined

  const token = await prisma.refreshToken.findUnique({
    where: { token: cookieToken },
    select: { family: true },
  })

  return token?.family
}
