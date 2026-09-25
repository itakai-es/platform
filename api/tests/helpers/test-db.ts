import { describe } from 'vitest'

/**
 * Tests contra una base de datos de verdad. Son opcionales: sin
 * `TEST_DATABASE_URL` se saltan (la integración continua no tiene Postgres).
 *
 * Preparar la base una vez y tras cada migración nueva:
 *   createdb itakai_test
 *   DATABASE_URL=$TEST_DATABASE_URL npx prisma migrate deploy
 *   TEST_DATABASE_URL=… npx vitest run
 *
 * Este módulo se importa ANTES que cualquier cosa de `src/`: deja la URL en
 * `DATABASE_URL` para que el cliente de Prisma de la aplicación apunte ahí.
 * Los tests crean sus propios datos con ids nuevos y los borran al acabar; no
 * vacían tablas. Aun así, solo se acepta una base cuyo nombre acabe en `_test`.
 */

const url = process.env.TEST_DATABASE_URL

if (url) {
  const database = new URL(url).pathname.replace(/^\//, '')
  if (!database.endsWith('_test')) {
    throw new Error(
      `TEST_DATABASE_URL debe apuntar a una base cuyo nombre acabe en «_test» (es «${database}»)`
    )
  }
  process.env.DATABASE_URL = url
}

export const hasTestDatabase = Boolean(url)

/** `describe` que solo corre si hay base de datos de pruebas. */
export const describeWithDatabase = url ? describe : describe.skip
