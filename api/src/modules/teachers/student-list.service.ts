import { prisma } from '../../config/database.js'
import type { Prisma } from '../../generated/prisma/client.js'
import { assertClassAccess, listedClassesWhere } from '../../utils/class-access.js'
import { accountHandle } from '../../utils/identity.js'

/**
 * Listado de alumnos del profesorado: los de las clases a las que llega (también
 * las compartidas), buscado, filtrado y paginado aquí, no en el navegador.
 *
 * Un alumno se considera archivado cuando TODAS sus clases accesibles están
 * archivadas: no hay estado de archivado propio del alumno, se deriva de las
 * clases (así desarchivar una clase lo devuelve solo). En la lista general el
 * progreso suma las clases de la pestaña (las vivas o las archivadas), también
 * con una clase elegida en el filtro: la clase solo acota quién sale. La vista de
 * una clase (`classId` sin pestaña) cuenta solo esa clase. Una clase sin acceso
 * responde 404, como cualquier otra ruta de la clase.
 */

export const STUDENT_LIST_SORTS = [
  'name-asc',
  'name-desc',
  'progress-desc',
  'progress-asc',
  'missions-desc',
] as const
export type StudentListSort = (typeof STUDENT_LIST_SORTS)[number]

/** Tramos de progreso (en %), como los pinta la pantalla. */
export const STUDENT_PROGRESS_RANGES = ['excellent', 'good', 'progress', 'initial'] as const
export type StudentProgressRange = (typeof STUDENT_PROGRESS_RANGES)[number]

export const STUDENT_LIST_MAX_LIMIT = 100
/** Sin `limit` ni clase, una página como la de la pantalla: nunca todo el alumnado. */
export const STUDENT_LIST_DEFAULT_LIMIT = 12
/** Última página que se puede pedir: más allá, el salto no cabe en la consulta. */
export const STUDENT_LIST_MAX_PAGE = 10_000

export interface StudentListQuery {
  /**
   * Solo el alumnado de esta clase. Sin `archived` es la vista de la clase y los
   * números son los de ella; con `archived` (la lista general) solo acota quién
   * sale y los números siguen siendo los de las clases de la pestaña.
   */
  classId?: string
  /** Estado del alumno (la pestaña). Por defecto, `active`; con `classId`, `all`. */
  archived?: 'active' | 'archived' | 'all'
  /** Nombre, correo o usuario, sin distinguir mayúsculas. */
  search?: string
  progress?: StudentProgressRange
  sort?: StudentListSort
  page?: number
  /**
   * Sin límite, con `classId` sale toda la clase (su vista la necesita entera);
   * sin clase, una página de `STUDENT_LIST_DEFAULT_LIMIT`.
   */
  limit?: number
}

const PROGRESS_RANGE: Record<StudentProgressRange, (progress: number) => boolean> = {
  excellent: p => p >= 80,
  good: p => p >= 50 && p < 80,
  progress: p => p >= 20 && p < 50,
  initial: p => p < 20,
}

export async function listTeacherStudents(userId: string, query: StudentListQuery = {}) {
  const { classId, progress } = query
  const sort = query.sort ?? 'name-asc'
  // Con `classId` salen todos los de la clase: se ha abierto a propósito.
  const archived = query.archived ?? (classId ? 'all' : 'active')
  if (classId) await assertClassAccess(classId, userId, 'student.view')

  // Las clases de la papelera no cuentan: ni su alumnado sale por ellas ni suman.
  const accessible = listedClassesWhere(userId)
  const liveClass: Prisma.ClassWhereInput = { ...accessible, archived: false }
  const enrolledIn = (cls: Prisma.ClassWhereInput): Prisma.UserWhereInput => ({
    enrollments: { some: { isPreview: false, class: cls } },
  })
  const withoutLiveClass: Prisma.UserWhereInput = {
    enrollments: { none: { isPreview: false, class: liveClass } },
  }

  // Quién sale: el alumnado de la clase pedida o el de cualquier clase accesible,
  // según su estado (activo mientras le quede una clase sin archivar) y la búsqueda.
  const conditions: Prisma.UserWhereInput[] = [
    classId ? { enrollments: { some: { isPreview: false, classId } } } : enrolledIn(accessible),
  ]
  if (archived === 'active') conditions.push(enrolledIn(liveClass))
  if (archived === 'archived') conditions.push(withoutLiveClass)
  const term = query.search?.trim()
  if (term) {
    conditions.push({
      OR: [
        { name: { contains: term, mode: 'insensitive' } },
        { email: { contains: term, mode: 'insensitive' } },
        { username: { contains: term, mode: 'insensitive' } },
      ],
    })
  }
  const where: Prisma.UserWhereInput = { AND: conditions }

  // Las clases cuyo progreso cuenta, también para el filtro de progreso: en la vista
  // de una clase, esa; en la lista general, las de la pestaña, haya clase elegida o
  // no. Las archivadas no suman a los totales de un alumno activo.
  const classView = classId !== undefined && query.archived === undefined
  const metricClasses: Prisma.ClassWhereInput = classView
    ? { id: classId }
    : archived === 'active'
      ? liveClass
      : archived === 'archived'
        ? { ...accessible, archived: true }
        : accessible

  const limit = query.limit ?? (classId ? undefined : STUDENT_LIST_DEFAULT_LIMIT)
  const page = Math.min(Math.max(query.page ?? 1, 1), STUDENT_LIST_MAX_PAGE)

  let total: number
  let students: StudentListRow[]
  if (!progress && (sort === 'name-asc' || sort === 'name-desc')) {
    // Por nombre, la página sale directamente de la consulta.
    const [count, found] = await Promise.all([
      prisma.user.count({ where }),
      prisma.user.findMany({
        where,
        select: { id: true },
        orderBy: [{ name: sort === 'name-asc' ? 'asc' : 'desc' }, { id: 'asc' }],
        ...(limit ? { skip: (page - 1) * limit, take: limit } : {}),
      }),
    ])
    total = count
    const ids = found.map(u => u.id)
    const byId = new Map(
      (await studentRows({ id: { in: ids } }, metricClasses)).map(s => [s.id, s])
    )
    students = ids.flatMap(id => byId.get(id) ?? [])
  } else {
    // El progreso se calcula: se ordena y se filtra por él aquí, y solo viaja la página.
    let rows = await studentRows(where, metricClasses)
    if (progress) rows = rows.filter(s => PROGRESS_RANGE[progress](s.overallProgress))
    rows.sort(compareBy(sort))
    total = rows.length
    students = limit ? rows.slice((page - 1) * limit, page * limit) : rows
  }

  const archivedIds = await archivedAmong(
    students.map(s => s.id),
    archived,
    liveClass
  )
  const [activeCount, archivedCount] = await Promise.all([
    prisma.user.count({ where: enrolledIn(liveClass) }),
    prisma.user.count({ where: { AND: [enrolledIn(accessible), withoutLiveClass] } }),
  ])

  return {
    students: students.map(s => ({ ...s, archived: archivedIds.has(s.id) })),
    total,
    page,
    limit: limit ?? total,
    totalPages: limit ? Math.max(1, Math.ceil(total / limit)) : 1,
    // Lo que tiene cada pestaña, sin búsqueda ni filtros.
    counts: { active: activeCount, archived: archivedCount },
  }
}

type StudentListRow = Awaited<ReturnType<typeof studentRows>>[number]

/** Por nombre, sin distinguir mayúsculas ni tildes; a igualdad, por id. */
function byName(a: StudentListRow, b: StudentListRow) {
  return a.name.localeCompare(b.name, 'es', { sensitivity: 'base' }) || a.id.localeCompare(b.id)
}

function compareBy(sort: StudentListSort) {
  return (a: StudentListRow, b: StudentListRow) => {
    switch (sort) {
      case 'name-desc':
        return -byName(a, b)
      case 'progress-desc':
        return b.overallProgress - a.overallProgress || byName(a, b)
      case 'progress-asc':
        return a.overallProgress - b.overallProgress || byName(a, b)
      case 'missions-desc':
        return b.totalMissionsCompleted - a.totalMissionsCompleted || byName(a, b)
      default:
        return byName(a, b)
    }
  }
}

/** Quiénes, de estos, ya no tienen ninguna clase accesible sin archivar. */
async function archivedAmong(
  ids: string[],
  archived: 'active' | 'archived' | 'all',
  liveClass: Prisma.ClassWhereInput
): Promise<Set<string>> {
  if (archived === 'active' || ids.length === 0) return new Set()
  if (archived === 'archived') return new Set(ids)
  const live = await prisma.classEnrollment.findMany({
    where: { studentId: { in: ids }, isPreview: false, class: liveClass },
    select: { studentId: true },
    distinct: ['studentId'],
  })
  const liveIds = new Set(live.map(e => e.studentId))
  return new Set(ids.filter(id => !liveIds.has(id)))
}

/**
 * Una fila por alumno con su progreso sumado en las clases de `metricClasses`
 * en las que está: misiones, enigmas, XP e insignias, y el detalle por clase.
 */
async function studentRows(students: Prisma.UserWhereInput, metricClasses: Prisma.ClassWhereInput) {
  const classes = await prisma.class.findMany({
    where: { AND: [metricClasses, { enrollments: { some: { isPreview: false, student: students } } }] },
    select: {
      id: true,
      name: true,
      archived: true,
      missions: {
        select: {
          id: true,
          enigmas: { select: { id: true, xpReward: true } },
          badges: { select: { id: true } },
        },
      },
      enrollments: {
        where: { isPreview: false, student: students },
        select: {
          xp: true,
          level: true,
          nickname: true,
          avatarUrl: true,
          enrolledAt: true,
          student: {
            select: {
              id: true,
              name: true,
              email: true,
              username: true,
              accountType: true,
              createdAt: true,
              missionProgress: {
                where: { completedAt: { not: null } },
                select: { missionId: true },
              },
              enigmaProgress: { select: { enigmaId: true } },
              earnedBadges: { select: { badgeId: true } },
            },
          },
        },
      },
    },
  })

  // Lo de cada alumno en cada clase.
  const perClass = classes.flatMap(c => {
    const missionIds = new Set(c.missions.map(m => m.id))
    const classEnigmas = c.missions.flatMap(m => m.enigmas)
    const enigmaIds = new Set(classEnigmas.map(e => e.id))
    const classTotalXp = classEnigmas.reduce((sum, e) => sum + (e.xpReward || 0), 0)
    const classBadgeIds = c.missions.flatMap(m => m.badges.map(b => b.id))

    return c.enrollments.map(e => {
      const earned = new Set(e.student.earnedBadges.map(b => b.badgeId))
      const enigmasCompleted = e.student.enigmaProgress.filter(p =>
        enigmaIds.has(p.enigmaId)
      ).length
      return {
        enrollment: e,
        cls: c,
        missionsCompleted: e.student.missionProgress.filter(p => missionIds.has(p.missionId))
          .length,
        enigmasCompleted,
        enigmasAvailable: enigmaIds.size,
        xpAvailable: classTotalXp,
        badgesEarned: classBadgeIds.filter(id => earned.has(id)).length,
        badgesAvailable: classBadgeIds.length,
        // El progreso va por enigmas: los hechos en la clase entre los que tiene.
        progress: enigmaIds.size > 0 ? Math.round((enigmasCompleted / enigmaIds.size) * 100) : 0,
      }
    })
  })

  const byStudent = new Map<string, typeof perClass>()
  for (const item of perClass) {
    const id = item.enrollment.student.id
    const items = byStudent.get(id)
    if (items) items.push(item)
    else byStudent.set(id, [item])
  }

  // Una fila por alumno: la primera de sus clases pone los datos de la cuenta y todas suman.
  return [...byStudent.values()].map(items => {
    const [first] = items
    const e = first.enrollment
    const sum = (pick: (item: (typeof items)[number]) => number) =>
      items.reduce((total, item) => total + pick(item), 0)
    // Nivel y XP a la vista: los de la clase donde más lleva.
    const top = items.reduce((best, item) => (item.enrollment.xp > best.enrollment.xp ? item : best))
    const enigmasCompleted = sum(i => i.enigmasCompleted)
    const enigmasAvailable = sum(i => i.enigmasAvailable)
    const badgesEarned = sum(i => i.badgesEarned)
    return {
      id: e.student.id,
      name: e.student.name,
      username: e.nickname || accountHandle(e.student),
      nickname: e.nickname,
      // Con qué se identifica la cuenta: su correo o, si no tiene, su usuario.
      email: e.student.email,
      accountUsername: e.student.username,
      accountType: e.student.accountType,
      avatar: e.avatarUrl,
      highestLevel: top.enrollment.level,
      totalXp: top.enrollment.xp,
      classTotalXp: first.xpAvailable,
      classId: first.cls.id,
      className: first.cls.name,
      classArchived: first.cls.archived,
      totalMissionsCompleted: sum(i => i.missionsCompleted),
      totalMissionsAvailable: sum(i => i.cls.missions.length),
      totalEnigmasCompleted: enigmasCompleted,
      totalEnigmasAvailable: enigmasAvailable,
      // El progreso general sale de los enigmas de todas sus clases.
      overallProgress:
        enigmasAvailable > 0 ? Math.round((enigmasCompleted / enigmasAvailable) * 100) : 0,
      badgesEarned,
      totalXpEarned: sum(i => i.enrollment.xp),
      totalXpAvailable: sum(i => i.xpAvailable),
      totalBadgesEarned: badgesEarned,
      totalBadgesAvailable: sum(i => i.badgesAvailable),
      classIds: items.map(i => i.cls.id),
      classCount: items.length,
      classProgress: items.map(i => ({
        classId: i.cls.id,
        className: i.cls.name,
        level: i.enrollment.level,
        xp: i.enrollment.xp,
        missionsCompleted: i.missionsCompleted,
        totalMissions: i.cls.missions.length,
        progress: i.progress,
      })),
      enrolledAt: e.enrolledAt,
      createdAt: e.student.createdAt,
    }
  })
}
