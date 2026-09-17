import { prisma } from '../config/database.js'
import type { Prisma } from '../generated/prisma/client.js'
import { ForbiddenError } from './errors.js'
import { buildUsernameProposal } from './identity.js'

/**
 * Lo de la identidad que necesita preguntar a la base. Va aparte de
 * `identity.ts`, que es puro, para que usar las funciones de normalización o de
 * propuesta no arrastre la conexión ni la configuración del entorno.
 */

type Db = Prisma.TransactionClient

/**
 * Lo que una cuenta gestionada no hace por sí misma: cambiar su correo, su
 * nombre o su usuario, y borrarse. Esas tres cosas las lleva el profesorado que
 * la creó, así que la regla se cumple en el servidor y no solo escondiendo el
 * botón. El mensaje dice qué no se puede hacer, en segunda persona.
 */
export async function assertNotManagedAccount(userId: string, what: string): Promise<void> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { accountType: true },
  })
  if (user?.accountType === 'managed') {
    throw new ForbiddenError(
      `Tu cuenta la gestiona tu profesorado y ${what}. Pídeselo a quien te la creó.`,
      'MANAGED_ACCOUNT'
    )
  }
}

/** ¿Está libre este usuario? */
export async function isUsernameAvailable(username: string, tx: Db = prisma): Promise<boolean> {
  const taken = await tx.user.findUnique({ where: { username }, select: { id: true } })
  return taken === null
}

/**
 * Usuario libre para un nombre. Reintenta con otro sufijo mientras el propuesto
 * esté cogido. La unicidad de verdad la pone la base: quien crea la cuenta tiene
 * que estar preparado para un choque entre esta consulta y el INSERT
 * (ver `withUsernameRetry`).
 */
export async function findAvailableUsername(
  name: string,
  tx: Db = prisma,
  attempts = 8
): Promise<string> {
  for (let i = 0; i < attempts; i++) {
    const candidate = buildUsernameProposal(name)
    if (await isUsernameAvailable(candidate, tx)) return candidate
  }
  throw new Error('No se ha podido proponer un usuario libre; inténtalo de nuevo')
}
