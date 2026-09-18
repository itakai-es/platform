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

/**
 * Pasa la propiedad de la clase a `toUserId`, que ya tiene que tener su fila de
 * profesorado en ella. En la misma transacción: la fila del propietario actual
 * deja de serlo (se queda con administración), la del nuevo lo es, con
 * administración y sin fecha de fin, y `Class.teacherId` pasa a nombrarle.
 *
 * El orden importa: el índice de un solo propietario por clase no admite dos a
 * la vez, ni siquiera entre dos sentencias. Devuelve quién lo era antes.
 */
export async function transferClassOwnership(
  tx: Prisma.TransactionClient,
  classId: string,
  toUserId: string
): Promise<{ fromUserId: string | null }> {
  const current = await tx.classTeacher.findFirst({
    where: { classId, isOwner: true },
    select: { userId: true },
  })
  await tx.classTeacher.updateMany({
    where: { classId, isOwner: true },
    data: { isOwner: false, access: 'admin' },
  })
  await tx.classTeacher.update({
    where: { classId_userId: { classId, userId: toUserId } },
    data: { isOwner: true, access: 'admin', endsAt: null },
  })
  await tx.class.update({ where: { id: classId }, data: { teacherId: toUserId } })
  return { fromUserId: current?.userId ?? null }
}
