import type { ClassAccess, ClassAccessLevel } from '~/types/class.types'

/**
 * ¿Llega el acceso propio en una clase (`myAccess`, lo devuelve la API) al nivel
 * pedido? Es el mismo criterio que aplica la API: cada nivel incluye a los
 * anteriores y el propietario llega a todo. Solo sirve para no ofrecer lo que
 * la API rechazaría; quien decide de verdad es ella.
 */
const LEVEL_RANK: Record<ClassAccessLevel, number> = { read: 1, edit: 2, admin: 3 }

export function hasClassLevel(
  access: ClassAccess | null | undefined,
  level: ClassAccessLevel
): boolean {
  if (!access) return false
  return access.isOwner || LEVEL_RANK[access.access] >= LEVEL_RANK[level]
}
