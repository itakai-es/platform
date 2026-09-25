/**
 * Con qué se identifica una cuenta en pantalla. Hay cuentas sin correo: las que
 * crea el profesorado entran con su usuario, así que ninguna pantalla puede dar
 * por hecho que hay correo que mostrar.
 *
 * Los tipos del frontend se escriben a mano y el compilador no avisa de un nulo
 * que venga de la API: por eso estas funciones aceptan el nulo y devuelven
 * siempre un texto.
 */

export interface AccountIdentity {
  email?: string | null
  username?: string | null
}

/**
 * Lo que se muestra donde antes iba el correo: el correo si lo tiene y, si no,
 * su usuario. Sin ninguno de los dos, cadena vacía (quien lo use decide si
 * esconde la línea).
 */
export function accountIdentifier(account: AccountIdentity | null | undefined): string {
  return account?.email || account?.username || ''
}
