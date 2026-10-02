/**
 * Lectura laxa de los parámetros de la consulta, para las rutas que filtran
 * sin rechazar nada (la ayuda, el catálogo público de plantillas): lo que no
 * tiene la forma esperada se ignora, sin error.
 */

/** Devuelve el valor si es uno de los admitidos; cualquier otro se ignora sin error. */
export function pickOne<const T extends readonly string[]>(
  allowed: T,
  value: unknown
): T[number] | undefined {
  return typeof value === 'string' && (allowed as readonly string[]).includes(value)
    ? (value as T[number])
    : undefined
}

/**
 * Un parámetro de texto libre, o nada si no es una cadena: con la clave
 * repetida (`?locale=es&locale=en`) Fastify entrega un array, que llegaría a
 * Prisma o a `.trim()` y acabaría en 500. Una cadena con un byte nulo (`%00`)
 * tampoco vale: Postgres no la admite en un texto y la consulta fallaría.
 */
export function str(value: unknown) {
  return typeof value === 'string' && !value.includes('\0') ? value : undefined
}
