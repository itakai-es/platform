import type { Mission, Prisma } from '../../generated/prisma/client.js'
import type { MissionStatus } from '../../generated/prisma/enums.js'

/**
 * Copia de una misión dentro de otra clase: la usan duplicar una clase (todas
 * sus misiones) e importar una misión suelta de otra clase. La copia es
 * independiente del origen: fila nueva de misión, de cada enigma y de cada
 * documento, y nunca arrastra progreso de alumnos ni entregas.
 *
 * Los documentos copiados apuntan al mismo fichero que los del origen (misma
 * `fileUrl`): borrar un documento solo borra el fichero cuando ninguna otra fila
 * lo usa (ver `deleteMissionDocument`), y abrirlo lo decide la misión de la
 * fila, así que la copia lo abre a la clase nueva sin tocar el original. Para
 * que un borrado a la vez no se lleve el fichero de una copia a medio hacer, la
 * misión de origen se lee con `readMissionForCopy`, dentro de la transacción.
 *
 * La insignia vinculada no se puede compartir (una insignia no sale de su
 * clase, ver `assignableBadgesWhere`): se copia como insignia nueva, de quien
 * hace la copia, con la misma imagen (borrar una insignia no borra su imagen).
 */

/** Misión de origen: con sus enigmas siempre; documentos e insignias, si se copian. */
export type MissionCopySource = Prisma.MissionGetPayload<{ include: { enigmas: true } }> &
  Partial<Prisma.MissionGetPayload<{ include: { documents: true; badges: true } }>>

export interface MissionCopyOptions {
  /** Estado de la copia. Sin él, el del origen. */
  status?: MissionStatus
  /** Fecha límite de la copia (`null`, sin fecha). Sin él, la del origen. */
  deadline?: Date | null
  /** Copiar los documentos, compartiendo fichero con el origen. */
  documents?: boolean
  /** Quién se queda la insignia copiada. Sin él, la insignia no se copia. */
  badgeAuthorId?: string
}

export interface MissionCopyResult {
  mission: Mission
  enigmas: number
  documents: number
  badges: { id: string; name: string }[]
}

/**
 * Bloquea la clase de origen de una copia hasta que se confirme (`FOR KEY
 * SHARE`: no impide cambiarla, solo borrarla), o false si ya no existe. La
 * copia comparte con el origen la portada de la clase, las de sus misiones y
 * los documentos, y la purga de la papelera bloquea la clase `FOR UPDATE` antes
 * de borrarla: si llega a la vez, espera a que la copia esté confirmada y, al
 * mirar quién usa aún esos ficheros, ya la ve; si iba antes, la copia ya no
 * encuentra el origen y no se hace. Sin esto, la copia podría quedarse
 * apuntando a una portada recién borrada.
 */
export async function lockSourceClass(
  tx: Prisma.TransactionClient,
  classId: string
): Promise<boolean> {
  const rows = await tx.$queryRaw<{ id: string }[]>`
    SELECT id FROM classes WHERE id = ${classId} FOR KEY SHARE`
  return rows.length > 0
}

/**
 * La misión `missionId` entera (enigmas, documentos e insignias), leída dentro
 * de la transacción `tx` de la copia y con sus documentos bloqueados hasta que
 * se confirme. Un borrado de uno de ellos a la vez espera a que la copia esté
 * confirmada, y entonces ve que el fichero sigue en uso; si el borrado iba
 * antes, ese documento ya no se lee y no se copia. Sin esto, la copia podría
 * quedarse apuntando a un fichero recién borrado.
 *
 * Una consulta tras otra, y no con `include`: dentro de una transacción todas
 * van por la misma conexión, y un `include` de varias relaciones las lanza a la vez.
 */
export async function readMissionForCopy(
  tx: Prisma.TransactionClient,
  missionId: string
): Promise<Required<MissionCopySource> | null> {
  await tx.$executeRaw`SELECT id FROM mission_documents WHERE mission_id = ${missionId} FOR SHARE`
  const mission = await tx.mission.findUnique({ where: { id: missionId } })
  if (!mission) return null
  const enigmas = await tx.missionEnigma.findMany({
    where: { missionId },
    orderBy: { orderIndex: 'asc' },
  })
  const documents = await tx.missionDocument.findMany({
    where: { missionId },
    orderBy: [{ orderIndex: 'asc' }, { uploadedAt: 'asc' }],
  })
  const badges = await tx.badge.findMany({ where: { missionId }, orderBy: { createdAt: 'asc' } })
  return { ...mission, enigmas, documents, badges }
}

/**
 * Copia `source` en la clase `targetClassId`, dentro de la transacción `tx`.
 * Sin opciones copia la misión y sus enigmas tal cual (estado y fecha límite
 * incluidos), que es lo que ha hecho siempre duplicar una clase. No comprueba
 * permisos: eso lo hace quien la llama, antes.
 */
export async function copyMissionInto(
  tx: Prisma.TransactionClient,
  source: MissionCopySource,
  targetClassId: string,
  options: MissionCopyOptions = {}
): Promise<MissionCopyResult> {
  const mission = await tx.mission.create({
    data: {
      classId: targetClassId,
      title: source.title,
      description: source.description,
      status: options.status ?? source.status,
      rarity: source.rarity,
      deadline: options.deadline !== undefined ? options.deadline : source.deadline,
      backgroundImage: source.backgroundImage,
    },
  })

  // Enigma a enigma no hace falta: createMany basta, y el orden va en orderIndex.
  if (source.enigmas.length > 0) {
    await tx.missionEnigma.createMany({
      data: source.enigmas.map(e => ({
        missionId: mission.id,
        title: e.title,
        description: e.description,
        objectives: e.objectives,
        isOptional: e.isOptional,
        xpReward: e.xpReward,
        coinReward: e.coinReward,
        manaReward: e.manaReward,
        orderIndex: e.orderIndex,
      })),
    })
  }

  const documents = options.documents ? (source.documents ?? []) : []
  if (documents.length > 0) {
    await tx.missionDocument.createMany({
      data: documents.map(d => ({
        missionId: mission.id,
        name: d.name,
        description: d.description,
        fileUrl: d.fileUrl,
        fileName: d.fileName,
        fileSize: d.fileSize,
        mimeType: d.mimeType,
        tags: d.tags,
        orderIndex: d.orderIndex,
        // Es el mismo fichero: se subió cuando se subió.
        uploadedAt: d.uploadedAt,
      })),
    })
  }

  const badges: MissionCopyResult['badges'] = []
  if (options.badgeAuthorId) {
    for (const b of source.badges ?? []) {
      const created = await tx.badge.create({
        data: {
          name: b.name,
          description: b.description,
          imageUrl: b.imageUrl,
          rarity: b.rarity,
          category: b.category,
          // Autor de la insignia copiada: quien hace la copia, no quien hizo la original.
          teacherId: options.badgeAuthorId,
          missionId: mission.id,
        },
        select: { id: true, name: true },
      })
      badges.push(created)
    }
  }

  return { mission, enigmas: source.enigmas.length, documents: documents.length, badges }
}
