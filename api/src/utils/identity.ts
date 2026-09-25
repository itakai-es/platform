import { customAlphabet } from 'nanoid'
import type { Prisma } from '../generated/prisma/client.js'

/**
 * Con qué se identifica una cuenta: su correo o su usuario.
 *
 * El correo se guarda y se busca siempre en minúsculas, y el usuario también:
 * quien escribe «Ana.G.K7» en la pantalla de entrada entra igual. La base guarda
 * lo ya normalizado, así que las búsquedas son por igualdad exacta y aprovechan
 * el índice único; normalizar aquí, en un solo sitio, es lo que hace que eso se
 * cumpla en el registro, en la entrada, en Google y en el panel.
 *
 * Toda cuenta tiene al menos uno de los dos: lo garantiza el CHECK
 * `users_email_or_username` de la base (ver schema.prisma).
 *
 * Aquí no se consulta la base: son funciones puras, así que las puede usar
 * cualquiera, incluido el arranque de una instancia nueva, que corre con lo
 * mínimo configurado. Lo que sí pregunta a la base vive en `identity-db.ts`.
 */

/** El correo tal y como se guarda y se busca: sin espacios alrededor y en minúsculas. */
export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase()
}

/** El usuario tal y como se guarda y se busca. */
export function normalizeUsername(username: string): string {
  return username.trim().toLowerCase()
}

/** Un identificador con arroba se trata como correo; el resto, como usuario. */
export function looksLikeEmail(identifier: string): boolean {
  return identifier.includes('@')
}

/**
 * `where` para buscar la cuenta con la que alguien dice entrar. No delata cuál
 * de los dos campos existe: quien llama responde lo mismo en los dos casos.
 */
export function identifierWhere(identifier: string): Prisma.UserWhereUniqueInput {
  return looksLikeEmail(identifier)
    ? { email: normalizeEmail(identifier) }
    : { username: normalizeUsername(identifier) }
}

/** Lo que hace falta de una cuenta para nombrarla sin dar por hecho que tiene correo. */
export interface AccountIdentity {
  username: string | null
  email: string | null
}

/**
 * Con qué se nombra a una cuenta cuando no hay alias de clase: su usuario, y si
 * no tiene, la parte del correo antes de la arroba. Nunca el correo entero: es
 * un texto que se ve en listados y rankings.
 */
export function accountHandle(user: AccountIdentity): string {
  if (user.username) return user.username
  return user.email?.split('@')[0] ?? ''
}

/**
 * Con qué se identifica la cuenta en las pantallas que hasta ahora mostraban el
 * correo: el correo si lo tiene y, si no, su usuario.
 */
export function accountIdentifier(user: AccountIdentity): string {
  return user.email ?? user.username ?? ''
}

/**
 * Nombre visible o alias tal como se guarda: en forma NFC, sin caracteres de
 * control ni invisibles (anchura cero, marcas de dirección) y con los espacios
 * reducidos a uno. Vacío si no queda ninguna letra ni ningún número, porque un
 * nombre así no se ve en pantalla.
 */
export function cleanDisplayName(text: string): string {
  const clean = text
    .normalize('NFC')
    .replace(/\s+/g, ' ')
    .replace(/[\p{Cc}\p{Cf}]/gu, '')
    .replace(/ +/g, ' ')
    .trim()
  return /[\p{L}\p{N}]/u.test(clean) ? clean : ''
}

// ---- Usuario propuesto ----

/** Longitud máxima del usuario, sufijo incluido. */
export const USERNAME_MAX_LENGTH = 30
export const USERNAME_MIN_LENGTH = 3

/** Letras sin tilde, números y los tres separadores. Es lo que se puede teclear sin dudar. */
const USERNAME_ALLOWED = /^[a-z0-9._-]+$/

/** Sufijo corto del usuario propuesto: sin caracteres que se confundan al leerlos. */
const randomSuffix = customAlphabet('abcdefghjkmnpqrstuvwxyz23456789', 2)

/** Contraseña temporal: 8 caracteres sin 0/O ni 1/l/I, para poder dictarla. */
const temporaryPassword = customAlphabet(
  'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789',
  8
)

/** Contraseña de un solo uso que el alumno cambia al entrar. Nunca se guarda en claro. */
export function generateTemporaryPassword(): string {
  return temporaryPassword()
}

/** Un trozo de nombre reducido a lo que cabe en un usuario: sin tildes ni signos. */
function slugPart(text: string): string {
  return text
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .replace(/ñ/g, 'n')
    .replace(/[^a-z0-9]/g, '')
}

/**
 * ¿Sirve este usuario? Solo letras sin tilde, números y `.`, `_` o `-`, con
 * letra o número al principio y al final.
 */
export function isValidUsername(username: string): boolean {
  if (username.length < USERNAME_MIN_LENGTH || username.length > USERNAME_MAX_LENGTH) return false
  if (!USERNAME_ALLOWED.test(username)) return false
  return /^[a-z0-9]/.test(username) && /[a-z0-9]$/.test(username)
}

/**
 * Usuario propuesto para un nombre: nombre, inicial del apellido y un sufijo
 * aleatorio corto, como `ana.g.k7`. El sufijo es lo que evita que dos «Ana G.»
 * se pisen y, de paso, que los usuarios de una clase se adivinen en cadena.
 * Sin apellido sale `ana.k7`.
 */
export function buildUsernameProposal(name: string): string {
  const parts = name.split(/\s+/).map(slugPart).filter(Boolean)
  const first = parts[0] || 'alumno'
  const initial = parts[1]?.slice(0, 1)
  const stem = [first, initial].filter(Boolean).join('.')
  // El tronco se recorta para que el sufijo quepa siempre.
  const maxStem = USERNAME_MAX_LENGTH - randomSuffix().length - 1
  return `${stem.slice(0, maxStem)}.${randomSuffix()}`
}

/**
 * El usuario escrito por quien crea la cuenta y, si está cogido, el mismo con un
 * sufijo corto detrás.
 *
 * Así no hace falta responder «ese usuario ya está cogido»: un usuario es
 * también con lo que entra su dueño, y el espacio es corto y adivinable a partir
 * del nombre, así que decir cuáles están ocupados dejaría enumerar los
 * identificadores del alumnado de otras clases. Se crea la cuenta con lo más
 * parecido que esté libre y la respuesta dice con qué usuario ha nacido.
 */
export function usernameVariants(chosen: string): () => string {
  let first = true
  return () => {
    if (first) {
      first = false
      return chosen
    }
    const suffix = randomSuffix()
    return `${chosen.slice(0, USERNAME_MAX_LENGTH - suffix.length - 1)}.${suffix}`
  }
}

/** Lo que venga (una lista, un texto o nada) como lista de textos. */
function asFieldNames(value: unknown): string[] {
  if (Array.isArray(value)) return value.map(String)
  return value == null ? [] : [String(value)]
}

/**
 * ¿Es este error el choque de unicidad de `users.username`?
 *
 * Qué campo ha chocado se cuenta de dos maneras: en `meta.target` o en el
 * detalle que devuelve el adaptador de la base. Se miran las dos, porque según
 * la versión llega una u otra, y si ninguna lo dice queda el texto del error.
 * Acertar aquí es lo que hace que el choque se resuelva con otro usuario en vez
 * de acabar en un error genérico.
 */
export function isUsernameConflict(error: unknown): boolean {
  const known = error as {
    code?: string
    message?: string
    meta?: {
      target?: unknown
      driverAdapterError?: { cause?: { constraint?: { fields?: unknown } } }
    }
  }
  if (known?.code !== 'P2002') return false

  const named = [
    ...asFieldNames(known.meta?.target),
    ...asFieldNames(known.meta?.driverAdapterError?.cause?.constraint?.fields),
  ]
  const where = named.length > 0 ? named : [known.message ?? '']
  return where.some(field => field.includes('username'))
}

/**
 * Crea la cuenta reintentando con otro usuario si la base rechaza el que se
 * había propuesto. Solo reintenta cuando el usuario lo propuso el sistema: si lo
 * escribió quien crea la cuenta, el choque se le cuenta y elige otro.
 */
export async function withUsernameRetry<T>(
  create: (username: string) => Promise<T>,
  proposal: () => string,
  attempts = 5
): Promise<T> {
  for (let i = 0; i < attempts; i++) {
    try {
      return await create(proposal())
    } catch (error) {
      if (!isUsernameConflict(error) || i === attempts - 1) throw error
    }
  }
  throw new Error('No se ha podido crear la cuenta; inténtalo de nuevo')
}
