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
  'Héroe Anónimo',
  'Guerrero de Troya',
  'Argonauta Valiente',
  'Guardián del Olimpo',
  'Explorador Épico',
  'Titan Novato',
  'Escudero de Atenea',
  'Mensajero Hermes',
  'Aprendiz de Hefesto',
  'Discípulo de Quirón',
  'Portador de la Llama',
  'Navegante Audaz',
  'Cazador de Artemisa',
  'Defensor del Ágora',
  'Sabio Itacense',
  'Forjador de Leyendas',
  'Voz del Oráculo',
  'Protector del Templo',
  'Hijo de las Musas',
  'Centinela Espartano',
  'Viajero Intrépido',
  'Guardián Secreto',
  'Buscador de Mitos',
  'Aspirante a Héroe',
  'Portador de Luz',
  'Explorador Mítico',
  'Escriba del Olimpo',
  'Valiente de Atenas',
  'Joven Estratega',
  'Aprendiz del Destino',
]

export { DEFAULT_AVATARS }

/** Avatar por defecto al azar. */
export function getRandomAvatar(): string {
  return DEFAULT_AVATARS[Math.floor(Math.random() * DEFAULT_AVATARS.length)]
}

/** Alias por defecto al azar. */
export function getRandomNickname(): string {
  return MYTHOLOGICAL_NICKNAMES[Math.floor(Math.random() * MYTHOLOGICAL_NICKNAMES.length)]
}

export interface EnrollStudentInput {
  studentId: string
  classId: string
  /** Nombre de la clase, para el texto del historial. */
  className: string
}

/**
 * Crea la matrícula con su alias y avatar y apunta la entrada de «se ha unido»
 * en el historial del alumno. Devuelve la matrícula.
 */
export async function enrollStudent(tx: Db, input: EnrollStudentInput) {
  const enrollment = await tx.classEnrollment.create({
    data: {
      studentId: input.studentId,
      classId: input.classId,
      avatarUrl: getRandomAvatar(),
      nickname: getRandomNickname(),
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

/** Igual que `enrollStudent`, fuera de una transacción. */
export async function enrollStudentNow(input: EnrollStudentInput) {
  return enrollStudent(prisma, input)
}
