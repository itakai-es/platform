import type { ClassAccess, ClassAccessLevel, ClassTeacherProfile } from '~/types/class.types'

/**
 * Qué puede hacer cada profesor en una clase, a partir de su acceso propio
 * (`myAccess`, lo devuelve la API). Es la misma tabla que aplica la API
 * (`api/src/utils/class-access.ts`): cada nivel incluye a los anteriores y el
 * propietario llega a todo. Solo sirve para no ofrecer lo que la API
 * rechazaría; quien decide de verdad es ella. Si cambia allí, cambia aquí:
 * scripts/class-access-check.py comprueba que las dos tablas coinciden.
 */

/** Nivel exigible. `owner` no es un nivel guardado: es `isOwner`, por encima de `admin`. */
export type ClassRequiredLevel = ClassAccessLevel | 'owner'

const LEVEL_RANK: Record<ClassRequiredLevel, number> = { read: 1, edit: 2, admin: 3, owner: 4 }

/** Niveles guardados, de menos a más. */
export const CLASS_ACCESS_LEVELS: ClassAccessLevel[] = ['read', 'edit', 'admin']

/** Perfiles del profesorado, en el orden en que se ofrecen. */
export const CLASS_TEACHER_PROFILES: ClassTeacherProfile[] = ['titular', 'sustituto', 'practicas']

/** Nivel con el que entra cada perfil si no se elige otro. */
export const PROFILE_DEFAULT_ACCESS: Record<ClassTeacherProfile, ClassAccessLevel> = {
  titular: 'admin',
  sustituto: 'edit',
  practicas: 'read',
}

/** Nivel mínimo de cada acción. */
export const CLASS_ACTION_LEVEL = {
  'class.view': 'read',
  'class.duplicate': 'read',
  'class.editContent': 'edit',
  'class.editSettings': 'admin',
  'class.archive': 'admin',
  'class.inviteCode': 'admin',
  'class.publishTemplate': 'owner',
  'class.transfer': 'owner',
  'class.delete': 'owner',
  'class.restore': 'owner',
  'mission.view': 'read',
  'mission.edit': 'edit',
  'shop.view': 'read',
  'shop.edit': 'edit',
  'behavior.view': 'read',
  'behavior.edit': 'edit',
  'behavior.apply': 'edit',
  'submission.view': 'read',
  'submission.approve': 'edit',
  'student.view': 'read',
  'student.avatar': 'edit',
  'student.manage': 'admin',
  'student.nickname': 'admin',
  'teachers.view': 'read',
  'teachers.manage': 'admin',
  'teachers.leave': 'read',
  'class.history': 'read',
} as const satisfies Record<string, ClassRequiredLevel>

export type ClassAction = keyof typeof CLASS_ACTION_LEVEL

/** ¿Llega este acceso al nivel pedido? Sin acceso, a ninguno. */
export function hasClassLevel(
  access: ClassAccess | null | undefined,
  level: ClassRequiredLevel
): boolean {
  if (!access) return false
  if (level === 'owner') return access.isOwner
  return access.isOwner || LEVEL_RANK[access.access] >= LEVEL_RANK[level]
}

/** ¿Puede hacer `action` en la clase quien tiene este acceso? */
export function canInClass(access: ClassAccess | null | undefined, action: ClassAction): boolean {
  return hasClassLevel(access, CLASS_ACTION_LEVEL[action])
}
