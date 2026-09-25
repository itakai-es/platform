/**
 * Longitud mínima de una contraseña nueva. Es la misma que exige el servidor
 * (api/src/utils/password.ts): aquí solo sirve para avisar antes de enviar.
 * Las contraseñas más cortas que ya existen siguen valiendo para entrar.
 */
export const PASSWORD_MIN_LENGTH = 8
