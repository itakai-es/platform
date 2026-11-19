/**
 * Lo que se le pide a `GET /teacher/classes`. Sin límite, la API da todas las
 * clases, y eso es lo que necesitan «Mis clases» (con su contador) y el selector
 * de clase al crear una misión. Con un tope fijo, quien pasaba de él dejaba de
 * ver sus clases más antiguas y el contador decía el tope, no las que tiene.
 */
export function teacherClassesQuery(limit?: number): { limit: number } | undefined {
  return limit ? { limit } : undefined
}
