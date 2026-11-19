import { readFileSync } from 'node:fs'
import { randomUUID } from 'node:crypto'
import { it, expect, beforeAll, afterAll } from 'vitest'
import { describeWithDatabase } from '../helpers/test-db.js'
import { prisma } from '../../src/config/database.js'
import { createClassWithOwner } from '../../src/utils/class-owner.js'
import { compareEnabled, resolveRankingConfig, studentRankingTypes } from '../../src/utils/ranking-config.js'
import { resolveClassSettings } from '../../src/utils/class-settings.js'

/**
 * Las clases antiguas con la XP apagada: bajo la regla antigua («el ranking pide XP»)
 * tenían el ranking apagado de hecho. Sin esta migración, al quitar esa regla se les
 * encendería, con la comparación y quizá los equipos. Corre el SQL de verdad dentro
 * de una transacción que se deshace, para no tocar las clases de otras pruebas.
 * Necesita TEST_DATABASE_URL (ver tests/helpers/test-db.ts).
 */

const sql = readFileSync(
  new URL('../../prisma/migrations/20261105110000_rankings_off_without_xp/migration.sql', import.meta.url),
  'utf8'
)

class Rollback extends Error {}

describeWithDatabase('migración rankings_off_without_xp', () => {
  const tag = randomUUID().slice(0, 8)
  const ids: Record<string, string> = {}
  let ownerId: string

  const CASES: Record<string, object> = {
    xpOffUnsaved: { xp: false, sounds: false },
    xpOffSavedOn: { xp: false, rankings: true },
    xpOffSavedOff: { xp: false, rankings: false },
    xpOn: { xp: true },
    empty: {},
    otherOff: { rankings: false },
  }

  beforeAll(async () => {
    const owner = await prisma.user.create({
      data: { email: `mig.${tag}@test.invalid`, passwordHash: 'x', name: 'Profe', role: 'teacher' },
    })
    ownerId = owner.id
    for (const [label, settings] of Object.entries(CASES)) {
      const cls = await prisma.$transaction(tx =>
        createClassWithOwner(
          tx,
          { name: `${label} ${tag}`, invitationCode: randomUUID().slice(0, 6).toUpperCase(), settings },
          ownerId
        )
      )
      ids[label] = cls.id
    }
  })

  afterAll(async () => {
    await prisma.class.deleteMany({ where: { teacherId: ownerId } })
    await prisma.user.delete({ where: { id: ownerId } })
  })

  /** Lo que queda en cada clase tras aplicar el SQL `times` veces, sin confirmar. */
  async function afterMigration(times: number) {
    const result: Record<string, unknown> = {}
    const updated: number[] = []
    await prisma
      .$transaction(async tx => {
        for (let i = 0; i < times; i++) updated.push(await tx.$executeRawUnsafe(sql))
        const rows = await tx.class.findMany({
          where: { id: { in: Object.values(ids) } },
          select: { id: true, settings: true, updatedAt: true },
        })
        for (const [label, id] of Object.entries(ids)) {
          result[label] = rows.find(row => row.id === id)!.settings
        }
        throw new Rollback()
      })
      .catch(error => {
        if (!(error instanceof Rollback)) throw error
      })
    return { settings: result, updated }
  }

  it('guarda `rankings: false` solo en las que tienen la XP apagada y el ranking encendido', async () => {
    const { settings } = await afterMigration(1)
    expect(settings).toEqual({
      xpOffUnsaved: { xp: false, sounds: false, rankings: false },
      xpOffSavedOn: { xp: false, rankings: false },
      xpOffSavedOff: { xp: false, rankings: false },
      xpOn: { xp: true },
      empty: {},
      otherOff: { rankings: false },
    })
  })

  it('es idempotente: la segunda pasada no encuentra ninguna de las suyas', async () => {
    const once = await afterMigration(1)
    const twice = await afterMigration(2)
    expect(twice.settings).toEqual(once.settings)
    expect(twice.updated[1]).toBe(0)
  })

  it('deja la clase sin ranking ni comparación, como la tenía', async () => {
    const before = resolveClassSettings(CASES.xpOffUnsaved)
    const config = resolveRankingConfig(null)
    // Sin migrar, la regla nueva le encendería la comparación y los equipos.
    expect(before.rankings).toBe(true)
    expect(compareEnabled(before, config)).toBe(true)
    expect(studentRankingTypes(before, config, true)).toEqual(['teams'])

    const { settings } = await afterMigration(1)
    const after = resolveClassSettings(settings.xpOffUnsaved)
    expect(after.rankings).toBe(false)
    expect(compareEnabled(after, config)).toBe(false)
    expect(studentRankingTypes(after, config, true)).toEqual([])
  })
})
