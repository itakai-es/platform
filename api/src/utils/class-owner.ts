import type { Prisma } from '../generated/prisma/client.js'

/** Datos de una clase nueva, sin el propietario: lo pone `createClassWithOwner`. */
export type NewClassData = Omit<Prisma.ClassUncheckedCreateInput, 'teacherId' | 'teachers'>

/**
 * Crea una clase y, en la misma transacción, la fila de profesorado de su
 * propietario (administración, titular). Es la única puerta para crear clases:
 * una clase sin esa fila sería invisible para quien la creó en cuanto el acceso
 * se lea del profesorado. `Class.teacherId` y la fila `isOwner` nombran siempre
 * a la misma persona.
 */
export async function createClassWithOwner(
  tx: Prisma.TransactionClient,
  data: NewClassData,
  ownerId: string
) {
  const cls = await tx.class.create({ data: { ...data, teacherId: ownerId } })
  await tx.classTeacher.create({
    data: { classId: cls.id, userId: ownerId, access: 'admin', profile: 'titular', isOwner: true },
  })
  return cls
}
