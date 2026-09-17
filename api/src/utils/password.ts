import bcrypt from 'bcryptjs'

/**
 * Coste de bcrypt para las contraseñas nuevas. Los hashes antiguos llevan el
 * coste con el que se crearon dentro, así que `verifyPassword` los sigue
 * comprobando igual: subirlo no invalida ninguna contraseña que ya exista.
 */
const SALT_ROUNDS = 12

/** Longitud mínima de una contraseña nueva. Las más cortas que ya existen siguen valiendo. */
export const PASSWORD_MIN_LENGTH = 8

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS)
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash)
}

/**
 * Hash señuelo, con el coste de hoy y sin contraseña que lo abra: no hay ninguna
 * cuenta detrás.
 *
 * Comprobar la contraseña contra él cuando el identificador no existe es lo que
 * hace que las dos respuestas cuesten lo parecido. Sin esto, «no existe» se
 * responde en milésimas y «contraseña incorrecta» tarda lo que tarda bcrypt, así
 * que el tiempo de la respuesta diría qué cuentas hay aunque el mensaje sea el
 * mismo.
 *
 * El señuelo lleva el coste de hoy, así que lo que todavía se nota por tiempo es
 * un hash con un coste anterior, no si la cuenta existe; eso desaparece a medida
 * que se cambian las contraseñas. Contra probar en bucle, el límite de intentos
 * fallidos de la ruta de entrada.
 */
const DECOY_HASH = '$2b$12$v3P9gFBKEFsyqAuTY9i53.0P9Z9vDpks3b1dSw6ejUNiyM0IESQne'

/** Gasta el tiempo de comprobar una contraseña sin comprobar ninguna. */
export async function verifyAgainstDecoy(password: string): Promise<void> {
  await bcrypt.compare(password, DECOY_HASH)
}
