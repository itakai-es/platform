import { prisma } from '../config/database.js'
import type { Prisma } from '../generated/prisma/client.js'

/**
 * Matricular a un alumno en una clase. Pasa por aquí todo lo que da de alta una
 * matrícula —el código de clase, el alta hecha por el profesorado y el cambio de
 * clase de origen desde el panel—, porque todas tienen que dejar lo mismo: la
 * matrícula con su alias y su avatar de clase, y la entrada en el historial del
 * alumno con ese mismo alias y avatar.
 */

type Db = Prisma.TransactionClient

/**
 * Longitud máxima del alias de una matrícula: la que admite el alumno cuando lo
 * cambia él, la que le deja poner el profesorado y la de los que pone la app.
 */
export const NICKNAME_MAX_LENGTH = 20

/** Avatares por defecto (dioses griegos), uno por matrícula. */
const DEFAULT_AVATARS = [
  '/app/avatars/atenea.svg',
  '/app/avatars/odiseo.svg',
  '/app/avatars/penelope.svg',
  '/app/avatars/polifemo.svg',
  '/app/avatars/poseidon.svg',
]

/** Alias de mitología con el que nace cada matrícula; el alumno lo cambia si quiere. */
const MYTHOLOGICAL_NICKNAMES = [
  'Leyenda Anónima',
  'Espíritu de Troya',
  'Argonauta Valiente',
  'Guardia del Olimpo',
  'Senda Épica',
  'Chispa Titánica',
  'Escudo de Atenea',
  'Eco de Hermes',
  'Aprendiz de Hefesto',
  'Estrella de Quirón',
  'Llama Eterna',
  'Navegante Audaz',
  'Flecha de Artemisa',
  'Antorcha del Ágora',
  'Mente Itacense',
  'Forja de Leyendas',
  'Voz del Oráculo',
  'Guardia del Templo',
  'Estirpe de las Musas',
  'Centinela de Esparta',
  'Alma Intrépida',
  'Vigía del Faro',
  'Cazamitos',
  'Aspirante a Leyenda',
  'Rayo de Luz',
  'Brújula Mítica',
  'Escriba del Olimpo',
  'Valiente de Atenas',
  'Joven Estratega',
  'Aprendiz del Destino',
]

export { DEFAULT_AVATARS }

/**
 * Matrículas que cuentan en lo que ve el alumnado de una clase —el ranking, el
 * podio, las medias, su puesto y el número de alumnos—: todas menos las de
 * cuentas sin correo que aún no han entrado nunca. Hasta su primera entrada solo
 * las ve el profesorado, en su lista y con «Pendiente de entrar». Cada entrada
 * deja una sesión, que al cerrarse o caducar se revoca pero no se borra, así que
 * haber entrado es tener alguna. Se combina con el resto del filtro con AND.
 */
export const participatingEnrollmentWhere = {
  OR: [{ student: { accountType: 'self' } }, { student: { refreshTokens: { some: {} } } }],
} satisfies Prisma.ClassEnrollmentWhereInput

/** Avatar por defecto al azar. */
export function getRandomAvatar(): string {
  return DEFAULT_AVATARS[Math.floor(Math.random() * DEFAULT_AVATARS.length)]
}

/** Para comparar alias: sin espacios de más y sin mayúsculas. */
const sameNickname = (nickname: string) =>
  nickname.trim().replace(/\s+/g, ' ').toLocaleLowerCase('es')

/**
 * Alias al azar que no esté en `taken`: uno de mitología que quede libre y, si
 * ya están todos cogidos, uno de ellos con número («Titan Novato 2», luego «… 3»).
 * Ninguno pasa de `NICKNAME_MAX_LENGTH`: en las rondas con número solo entran
 * los que caben con él, así que cada ronda ofrece algunos menos.
 */
export function pickFreeNickname(taken: Iterable<string | null>): string {
  const used = new Set<string>()
  for (const nickname of taken) if (nickname) used.add(sameNickname(nickname))

  for (let round = 1; ; round++) {
    const free = MYTHOLOGICAL_NICKNAMES.map(base => (round === 1 ? base : `${base} ${round}`))
      .filter(candidate => candidate.length <= NICKNAME_MAX_LENGTH)
      .filter(candidate => !used.has(sameNickname(candidate)))
    if (free.length > 0) return free[Math.floor(Math.random() * free.length)]
  }
}

/** Alias ocupados en cada clase de `classIds`: los del alumnado, sin las matrículas de vista previa. */
async function takenNicknames(db: Db, classIds: string[]) {
  const enrollments = await db.classEnrollment.findMany({
    where: { classId: { in: classIds }, isPreview: false },
    select: { classId: true, nickname: true },
  })
  const byClass = new Map<string, string[]>(classIds.map(id => [id, []]))
  for (const { classId, nickname } of enrollments) {
    if (nickname) byClass.get(classId)?.push(nickname)
  }
  return byClass
}

/**
 * Cerradura de los alias de una clase, hasta el final de la transacción `tx`.
 * La toman todas las altas de la clase (ver `freeNicknameInClass`).
 */
export async function lockClassNicknames(tx: Db, classId: string) {
  const lockKey = `enrollment-nickname:${classId}`
  await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${lockKey}))`
}

/**
 * Alias para una matrícula nueva que no tenga nadie más en la clase: varias
 * pantallas del profesorado solo enseñan el alias, y con uno repetido no se sabe
 * quién es quién. Tiene que ir dentro de la transacción de la matrícula: la
 * cerradura, por clase y hasta el final de la transacción, hace que dos altas a
 * la vez —toda un aula escribiendo el código— no se queden con el mismo alias.
 * Las matrículas de vista previa del profesorado no cuentan: no las ve nadie más.
 */
async function freeNicknameInClass(tx: Db, classId: string): Promise<string> {
  await lockClassNicknames(tx, classId)
  const taken = await takenNicknames(tx, [classId])
  return pickFreeNickname(taken.get(classId) ?? [])
}

/**
 * Alias libre de cada clase de `classIds`, para matrículas de vista previa: sin
 * cerradura, porque la vista previa no ocupa alias (un alta a la vez puede
 * quedarse con el mismo, y no pasa nada: solo lo ve el profesor que previsualiza).
 */
export async function freeNicknamesForPreview(classIds: string[]): Promise<Map<string, string>> {
  const taken = await takenNicknames(prisma, classIds)
  return new Map(classIds.map(id => [id, pickFreeNickname(taken.get(id) ?? [])]))
}

export interface EnrollStudentInput {
  studentId: string
  classId: string
  /** Nombre de la clase, para el texto del historial. */
  className: string
}

/**
 * Crea la matrícula con su alias —uno que no tenga nadie más en la clase— y su
 * avatar, y apunta la entrada de «se ha unido» en el historial del alumno.
 * Devuelve la matrícula. `tx` tiene que ser una transacción (ver
 * `freeNicknameInClass`); fuera de una, `enrollStudentNow`.
 */
export async function enrollStudent(tx: Db, input: EnrollStudentInput) {
  const enrollment = await tx.classEnrollment.create({
    data: {
      studentId: input.studentId,
      classId: input.classId,
      avatarUrl: getRandomAvatar(),
      nickname: await freeNicknameInClass(tx, input.classId),
    },
  })

  await tx.activity.create({
    data: {
      userId: input.studentId,
      type: 'class_joined',
      description: `Te has unido a la clase ${input.className}`,
      // Perfil con el que el alumno aparece en esa clase.
      avatar: enrollment.avatarUrl,
      username: enrollment.nickname || 'Estudiante',
      classId: input.classId,
      className: input.className,
      metadata: { classId: input.classId },
    },
  })

  return enrollment
}

/**
 * Lo que puede tener que esperar un alta suelta a la cerradura de alias de su
 * clase. La importación de listas de cuentas sin correo (`createManagedStudents`)
 * da de alta a todos en una sola transacción de hasta 30 s y se queda la
 * cerradura hasta que termina; quien se une con el código mientras tanto espera
 * a que acabe. Con los 5 s que da Prisma por defecto, esa transacción caducaría
 * esperando y el alta fallaría con un error interno. De ahí los 35 s: la
 * importación más lenta y algo de margen.
 */
const ENROLL_LOCK_WAIT_MS = 35_000

/**
 * Opciones para cualquier transacción que matricule con `enrollStudent` fuera
 * de la importación: el alta suelta de una cuenta sin correo, el cambio de clase
 * de origen desde el panel y `enrollStudentNow`. Todas pueden encontrarse la
 * cerradura tomada por una importación (ver `ENROLL_LOCK_WAIT_MS`).
 */
export const ENROLL_TX_OPTIONS = {
  maxWait: ENROLL_LOCK_WAIT_MS,
  timeout: ENROLL_LOCK_WAIT_MS,
} as const

/**
 * Igual que `enrollStudent`, en una transacción propia, que aguanta la espera a
 * la cerradura (ver `ENROLL_LOCK_WAIT_MS`). `maxWait` —lo que se espera a tener
 * conexión para empezar— es igual de largo: mientras dura una importación, cada
 * alumno que se une ocupa una conexión esperando la cerradura, y con toda un aula
 * entrando a la vez el resto espera a que la importación termine y las suelte.
 */
export async function enrollStudentNow(input: EnrollStudentInput) {
  return prisma.$transaction(tx => enrollStudent(tx, input), ENROLL_TX_OPTIONS)
}
