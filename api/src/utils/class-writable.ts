import { prisma } from '../config/database.js'
import type { Prisma } from '../generated/prisma/client.js'
import { resolveClassSettings, type ClassSettings } from './class-settings.js'
import { resolveLevelConfig, type LevelConfig } from './level-config.js'
import { ConflictError, NotFoundError } from './errors.js'

/**
 * Lo que se hace en el aula (aplicar comportamientos, dar recompensas, pasar
 * lista) solo cabe en una clase viva: ni archivada ni en la papelera. La
 * interfaz ya no lo ofrece en esos casos, pero quien decide es la API.
 *
 * Devuelve los ajustes y la configuración de niveles de la clase, ya
 * resueltos, para que quien reparte recursos los lea una sola vez por petición
 * y no una por estudiante.
 */
export interface WritableClass {
  settings: ClassSettings
  levelConfig: LevelConfig
}

type Db = Prisma.TransactionClient

export async function assertClassWritable(classId: string, tx: Db = prisma): Promise<WritableClass> {
  const cls = await tx.class.findUnique({
    where: { id: classId },
    select: { archived: true, deletedAt: true, settings: true, levelConfig: true },
  })
  if (!cls) throw new NotFoundError('Clase no encontrada')
  if (cls.deletedAt) throw new ConflictError('La clase está en la papelera', 'CLASS_IN_TRASH')
  if (cls.archived) throw new ConflictError('La clase está archivada', 'CLASS_ARCHIVED')
  return {
    settings: resolveClassSettings(cls.settings),
    levelConfig: resolveLevelConfig(cls.levelConfig),
  }
}
