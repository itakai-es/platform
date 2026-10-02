import { z } from 'zod'
import { prisma } from '../../config/database.js'
import { Prisma } from '../../generated/prisma/client.js'
import { activeTeacherWhere } from '../../utils/class-access.js'
import { containsPattern } from '../../utils/like-pattern.js'
import { calculateMissionTotalXP, MISSION_COMPLETION_BONUS } from '../../utils/xp-calculator.js'

/**
 * Listados del panel de administración: usuarios, clases y misiones de toda la
 * instancia. Búsqueda, filtros, orden y página van en la consulta, porque una
 * instancia puede tener miles de filas y el panel solo pinta una página.
 *
 * Usuarios se resuelve entero con Prisma. En clases y misiones hay órdenes que
 * Prisma no sabe expresar (alumnos sin contar la vista previa, XP total de la
 * misión), así que la página de ids sale de SQL, con los filtros escritos ahí
 * una sola vez, y el detalle de esas filas, de Prisma.
 */

export const DEFAULT_PAGE_SIZE = 20
/** Más de esto no lo pinta el panel en una página: se recorta en vez de fallar. */
export const MAX_PAGE_SIZE = 100
/**
 * Ninguna instancia llega a tantas páginas. Una más alta es un error de quien
 * pide, no un OFFSET que Postgres no sabe representar (y que daría un 500).
 */
export const MAX_PAGE = 100_000

/** Un valor vacío en la URL (`?role=`) es lo mismo que no filtrar. */
const optionalEnum = <U extends string, T extends Readonly<[U, ...U[]]>>(values: T) =>
  z.preprocess(value => (value === '' ? undefined : value), z.enum(values).optional())

/** Si la página pedida pasa del tope, se lea como número entero o no (`1e20`). */
const beyondMaxPage = (value: string) =>
  Number(value) > MAX_PAGE || Number.parseInt(value, 10) > MAX_PAGE

const pageFields = {
  // Lo que no es un número sigue siendo la primera página (ver pageOf).
  page: z
    .string()
    .optional()
    .refine(value => value === undefined || !beyondMaxPage(value), {
      message: `La página no puede pasar de ${MAX_PAGE}`,
    }),
  limit: z.string().optional(),
  search: z.string().optional(),
}

export const userListQuerySchema = z.object({
  ...pageFields,
  role: optionalEnum(['all', 'student', 'teacher', 'admin']),
  status: optionalEnum(['all', 'active', 'suspended', 'inactive']),
  // `managed`, las cuentas que lleva el profesorado; `orphan`, las gestionadas
  // que se han quedado sin ninguna clase y solo puede atender la administración.
  accountType: optionalEnum(['all', 'self', 'managed', 'orphan']),
  sort: optionalEnum(['name-asc', 'name-desc', 'recent']),
})

export const classListQuerySchema = z.object({
  ...pageFields,
  sort: optionalEnum(['name-asc', 'name-desc', 'students-desc', 'missions-desc', 'recent']),
})

export const missionListQuerySchema = z.object({
  ...pageFields,
  status: optionalEnum(['all', 'activa', 'bloqueada']),
  rarity: optionalEnum(['all', 'comun', 'rara', 'epica', 'legendaria']),
  sort: optionalEnum(['name-asc', 'name-desc', 'xp-desc', 'enigmas-desc', 'recent']),
})

type UserListQuery = z.infer<typeof userListQuerySchema>
type ClassListQuery = z.infer<typeof classListQuerySchema>
type MissionListQuery = z.infer<typeof missionListQuerySchema>

/** Página pedida (desde 1) y tamaño, ya dentro de límites. */
function pageOf(query: { page?: string; limit?: string }) {
  const page = Math.max(1, Number.parseInt(query.page ?? '', 10) || 1)
  const requested = Number.parseInt(query.limit ?? '', 10) || DEFAULT_PAGE_SIZE
  const limit = Math.min(MAX_PAGE_SIZE, Math.max(1, requested))
  return { page, limit, skip: (page - 1) * limit }
}

function pageInfo(total: number, page: number, limit: number) {
  return { total, page, limit, totalPages: Math.ceil(total / limit) }
}

/** Reordena las filas de Prisma según la página de ids que ha dado SQL. */
function inIdOrder<T extends { id: string }>(ids: string[], rows: T[]): T[] {
  const byId = new Map(rows.map(row => [row.id, row]))
  return ids.flatMap(id => byId.get(id) ?? [])
}

// =============================================================================
// Usuarios
// =============================================================================

/** Lo que pinta la tarjeta de un usuario. Lo usan el listado y las acciones sobre una cuenta. */
function adminUserSelect(now = new Date()) {
  return {
    id: true,
    name: true,
    email: true,
    username: true,
    accountType: true,
    homeClassId: true,
    homeClass: { select: { name: true } },
    mustChangePassword: true,
    role: true,
    status: true,
    createdAt: true,
    refreshTokens: {
      orderBy: { createdAt: 'desc' },
      take: 1,
      select: { createdAt: true },
    },
    _count: {
      select: {
        // Profesorado: las clases que imparte hoy, sea propietario o no.
        classTeachers: { where: activeTeacherWhere('read', now) },
        // Alumnado: sus matrículas, sin la vista previa de quien prueba su clase.
        enrollments: { where: { isPreview: false } },
      },
    },
  } satisfies Prisma.UserSelect
}

type AdminUserRow = Prisma.UserGetPayload<{ select: ReturnType<typeof adminUserSelect> }>

function toAdminUser(u: AdminUserRow) {
  return {
    id: u.id,
    name: u.name,
    email: u.email,
    username: u.username,
    accountType: u.accountType,
    homeClassId: u.homeClassId,
    homeClassName: u.homeClass?.name ?? null,
    mustChangePassword: u.mustChangePassword,
    role: u.role,
    status: u.status,
    createdAt: u.createdAt,
    lastLogin: u.refreshTokens[0]?.createdAt ?? null,
    classCount: u.role === 'teacher' ? u._count.classTeachers : u._count.enrollments,
  }
}

/** La tarjeta de un usuario, con el mismo formato que el listado. Null si no existe. */
export async function adminUserCard(userId: string) {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: adminUserSelect() })
  return user ? toAdminUser(user) : null
}

const USER_ORDER: Record<NonNullable<UserListQuery['sort']>, Prisma.UserOrderByWithRelationInput[]> =
  {
    'name-asc': [{ name: 'asc' }, { id: 'asc' }],
    'name-desc': [{ name: 'desc' }, { id: 'desc' }],
    recent: [{ createdAt: 'desc' }, { id: 'desc' }],
  }

export async function listAdminUsers(query: UserListQuery) {
  const { page, limit, skip } = pageOf(query)
  const where: Prisma.UserWhereInput = {}

  if (query.role && query.role !== 'all') where.role = query.role
  if (query.status && query.status !== 'all') where.status = query.status

  // Una cuenta sin correo se encuentra por su usuario: es su identificador.
  const search = query.search?.trim()
  if (search) {
    where.OR = [
      { name: { contains: search, mode: 'insensitive' } },
      { email: { contains: search, mode: 'insensitive' } },
      { username: { contains: search, mode: 'insensitive' } },
    ]
  }

  if (query.accountType === 'orphan') {
    where.accountType = 'managed'
    where.enrollments = { none: { isPreview: false } }
  } else if (query.accountType && query.accountType !== 'all') {
    where.accountType = query.accountType
  }

  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where,
      skip,
      take: limit,
      orderBy: USER_ORDER[query.sort ?? 'recent'],
      select: adminUserSelect(),
    }),
    prisma.user.count({ where }),
  ])

  return { users: users.map(toAdminUser), ...pageInfo(total, page, limit) }
}

// =============================================================================
// Clases
// =============================================================================

/** Nombre del propietario de la clase `c` que casa con `pattern`. */
function ownerNameMatches(pattern: string) {
  return Prisma.sql`EXISTS (
    SELECT 1 FROM class_teachers ct JOIN users u ON u.id = ct.user_id
    WHERE ct.class_id = c.id AND ct.is_owner AND u.name ILIKE ${pattern}
  )`
}

const CLASS_ORDER: Record<NonNullable<ClassListQuery['sort']>, Prisma.Sql> = {
  'name-asc': Prisma.sql`c.name ASC, c.id ASC`,
  'name-desc': Prisma.sql`c.name DESC, c.id DESC`,
  'students-desc': Prisma.sql`(
    SELECT COUNT(*) FROM class_enrollments e WHERE e.class_id = c.id AND NOT e.is_preview
  ) DESC, c.name ASC, c.id ASC`,
  'missions-desc': Prisma.sql`(
    SELECT COUNT(*) FROM missions m WHERE m.class_id = c.id
  ) DESC, c.name ASC, c.id ASC`,
  recent: Prisma.sql`c.created_at DESC, c.id DESC`,
}

export async function listAdminClasses(query: ClassListQuery) {
  const { page, limit, skip } = pageOf(query)

  // Por nombre, por su propietario o por el código de invitación exacto. Las de
  // la papelera no salen: siguen ahí solo hasta la purga.
  const search = query.search?.trim()
  const pattern = search ? containsPattern(search) : ''
  const where = search
    ? Prisma.sql`WHERE c.deleted_at IS NULL AND (c.name ILIKE ${pattern}
        OR c.invitation_code = ${search.toUpperCase()}
        OR ${ownerNameMatches(pattern)})`
    : Prisma.sql`WHERE c.deleted_at IS NULL`

  const [idRows, countRows] = await Promise.all([
    prisma.$queryRaw<{ id: string }[]>`
      SELECT c.id FROM classes c ${where}
      ORDER BY ${CLASS_ORDER[query.sort ?? 'recent']}
      LIMIT ${limit} OFFSET ${skip}
    `,
    prisma.$queryRaw<{ total: bigint }[]>`SELECT COUNT(*) AS total FROM classes c ${where}`,
  ])
  const ids = idRows.map(row => row.id)

  const classes = await prisma.class.findMany({
    where: { id: { in: ids } },
    include: {
      teacher: { select: { name: true } },
      _count: { select: { enrollments: { where: { isPreview: false } }, missions: true } },
    },
  })

  return {
    classes: inIdOrder(ids, classes).map(c => ({
      id: c.id,
      name: c.name,
      teacherName: c.teacher.name,
      studentCount: c._count.enrollments,
      missionCount: c._count.missions,
      createdAt: c.createdAt,
    })),
    ...pageInfo(Number(countRows[0]?.total ?? 0), page, limit),
  }
}

// =============================================================================
// Misiones
// =============================================================================

/**
 * XP total de la misión `m` en SQL: el mismo cálculo que `calculateMissionTotalXP`
 * (bonificación por rareza más la XP de sus enigmas), con los valores de ahí.
 */
const MISSION_TOTAL_XP = Prisma.sql`(
  CASE m.rarity::text
    ${Prisma.join(
      Object.entries(MISSION_COMPLETION_BONUS).map(
        ([rarity, bonus]) => Prisma.sql`WHEN ${rarity} THEN ${bonus}::int`
      ),
      ' '
    )}
    ELSE ${MISSION_COMPLETION_BONUS.comun}::int
  END
  + COALESCE((SELECT SUM(e.xp_reward) FROM mission_enigmas e WHERE e.mission_id = m.id), 0)
)`

const MISSION_ORDER: Record<NonNullable<MissionListQuery['sort']>, Prisma.Sql> = {
  'name-asc': Prisma.sql`m.title ASC, m.id ASC`,
  'name-desc': Prisma.sql`m.title DESC, m.id DESC`,
  'xp-desc': Prisma.sql`${MISSION_TOTAL_XP} DESC, m.title ASC, m.id ASC`,
  'enigmas-desc': Prisma.sql`(
    SELECT COUNT(*) FROM mission_enigmas e WHERE e.mission_id = m.id
  ) DESC, m.title ASC, m.id ASC`,
  recent: Prisma.sql`m.created_at DESC, m.id DESC`,
}

export async function listAdminMissions(query: MissionListQuery) {
  const { page, limit, skip } = pageOf(query)

  // Las misiones de clases en la papelera no salen, como sus clases.
  const conditions: Prisma.Sql[] = [Prisma.sql`c.deleted_at IS NULL`]
  if (query.status && query.status !== 'all') {
    conditions.push(Prisma.sql`m.status = ${query.status}::"MissionStatus"`)
  }
  if (query.rarity && query.rarity !== 'all') {
    conditions.push(Prisma.sql`m.rarity = ${query.rarity}::"MissionRarity"`)
  }
  // Por título, por su clase o por el propietario de la clase.
  const search = query.search?.trim()
  if (search) {
    const pattern = containsPattern(search)
    conditions.push(
      Prisma.sql`(m.title ILIKE ${pattern} OR c.name ILIKE ${pattern} OR ${ownerNameMatches(pattern)})`
    )
  }
  const where = Prisma.sql`WHERE ${Prisma.join(conditions, ' AND ')}`

  const [idRows, countRows] = await Promise.all([
    prisma.$queryRaw<{ id: string }[]>`
      SELECT m.id FROM missions m JOIN classes c ON c.id = m.class_id ${where}
      ORDER BY ${MISSION_ORDER[query.sort ?? 'recent']}
      LIMIT ${limit} OFFSET ${skip}
    `,
    prisma.$queryRaw<{ total: bigint }[]>`
      SELECT COUNT(*) AS total FROM missions m JOIN classes c ON c.id = m.class_id ${where}
    `,
  ])
  const ids = idRows.map(row => row.id)

  const missions = await prisma.mission.findMany({
    where: { id: { in: ids } },
    include: {
      class: { select: { name: true, teacher: { select: { name: true } } } },
      enigmas: { select: { xpReward: true } },
      _count: { select: { enigmas: true } },
    },
  })

  return {
    missions: inIdOrder(ids, missions).map(m => ({
      id: m.id,
      title: m.title,
      className: m.class.name,
      teacherName: m.class.teacher.name,
      enigmaCount: m._count.enigmas,
      rarity: m.rarity,
      xpReward: calculateMissionTotalXP(
        m.rarity,
        m.enigmas.map(e => e.xpReward)
      ),
      status: m.status,
      deadline: m.deadline,
      createdAt: m.createdAt,
    })),
    ...pageInfo(Number(countRows[0]?.total ?? 0), page, limit),
  }
}
