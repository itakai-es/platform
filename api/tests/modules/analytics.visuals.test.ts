import { describe, it, expect } from 'vitest'
import { buildClassMatrix, type MatrixData } from '../../src/modules/analytics/class-matrix.js'
import { ALL_TIME } from '../../src/modules/analytics/definitions.js'
import {
  COMPLETED_BY_LIMIT,
  levelProgress,
  missionCompletedBy,
} from '../../src/modules/analytics/analytics.service.js'
import { DEFAULT_LEVEL_CONFIG, resolveLevelConfig } from '../../src/utils/level-config.js'

/**
 * Lo que la analítica manda solo para pintar (el rediseño de los paneles): la
 * portada y la rareza de cada misión, quién la ha completado (con su avatar, como
 * mucho `COMPLETED_BY_LIMIT`) y cuánto lleva cada estudiante de su nivel. Sin base
 * de datos: la matriz se construye con datos ya cargados.
 */

const NOW = new Date('2026-10-30T10:00:00Z')
const day = (n: number) => new Date(NOW.getTime() - n * 24 * 60 * 60 * 1000)

const mission = (id: string, over: Partial<MatrixData['missions'][number]> = {}) => ({
  id,
  title: `Misión ${id}`,
  status: 'activa',
  deadline: null,
  orderIndex: 0,
  enigmas: [{ id: `${id}1`, title: `Enigma ${id}1`, isOptional: false, orderIndex: 0 }],
  ...over,
})

const enrollment = (studentId: string, avatarUrl: string | null = null) => ({
  id: `en-${studentId}`,
  studentId,
  nickname: null,
  avatarUrl,
  enrolledAt: day(60),
  name: studentId,
  accountType: 'self' as const,
  participating: true,
})

function data(over: Partial<MatrixData> = {}): MatrixData {
  return {
    classId: 'clase',
    missionMap: false,
    missions: [mission('A')],
    edges: [],
    enrollments: [],
    approvals: [],
    submissions: [],
    progress: [],
    hints: [],
    activity: [],
    attendance: [],
    sessions: 0,
    ...over,
  }
}

/** `who` ha completado A hace `days` días. */
const completed = (who: string, days: number) => ({
  approval: { studentId: who, enigmaId: 'A1', percentage: 100, approvedAt: day(days) },
  progress: { studentId: who, missionId: 'A', completedAt: day(days), hasWork: true },
})

describe('la miniatura de cada misión', () => {
  it('lleva su rareza y su portada tal cual; sin ellas, común y sin portada', () => {
    const matrix = buildClassMatrix(
      data({
        missions: [
          mission('A', { rarity: 'epica', backgroundImage: '/uploads/portada.webp' }),
          mission('B', { orderIndex: 1 }),
        ],
      }),
      ALL_TIME,
      NOW
    )
    expect(matrix.missions.map(m => [m.rarity, m.cover])).toEqual([
      ['epica', '/uploads/portada.webp'],
      ['comun', null],
    ])
  })
})

describe('quién ha completado una misión', () => {
  it('cuántas personas y, como mucho cinco, las primeras en completarla (a igualdad, por nombre)', () => {
    const order: [string, number][] = [
      ['gema', 1],
      ['bruno', 9],
      ['ana', 9],
      ['dario', 5],
      ['eva', 7],
      ['carla', 3],
      ['fede', 2],
    ]
    const done = order.map(([who, days]) => completed(who, days))
    const matrix = buildClassMatrix(
      data({
        enrollments: [...order.map(([who]) => enrollment(who, `/avatars/${who}.webp`)), enrollment('hugo')],
        approvals: done.map(d => d.approval),
        progress: done.map(d => d.progress),
      }),
      ALL_TIME,
      NOW
    )
    const result = missionCompletedBy(matrix, 0)
    expect(COMPLETED_BY_LIMIT).toBe(5)
    expect(result.total).toBe(7)
    expect(result.students.map(s => s.id)).toEqual(['ana', 'bruno', 'eva', 'dario', 'carla'])
    expect(result.students[0]).toEqual({ id: 'ana', name: 'ana', avatar: '/avatars/ana.webp' })
  })

  it('sin nadie que la haya completado, ni avatares ni total', () => {
    const matrix = buildClassMatrix(data({ enrollments: [enrollment('ana')] }), ALL_TIME, NOW)
    expect(missionCompletedBy(matrix, 0)).toEqual({ total: 0, students: [] })
  })
})

describe('cuánto lleva de su nivel', () => {
  // La curva por defecto: el nivel 2 pide 123 XP y se alcanza con 50.
  it('a mitad de nivel, la parte que lleva, redondeada', () => {
    expect(levelProgress(2, 100, DEFAULT_LEVEL_CONFIG)).toEqual({
      progress: 41,
      currentXp: 50,
      requiredXp: 123,
    })
  })

  it('el del nivel guardado, sin salirse de 0 a lo que pide', () => {
    expect(levelProgress(5, 300, DEFAULT_LEVEL_CONFIG)).toMatchObject({ progress: 0, currentXp: 0 })
    expect(levelProgress(2, 10_000, DEFAULT_LEVEL_CONFIG)).toEqual({
      progress: 100,
      currentXp: 123,
      requiredXp: 123,
    })
  })

  it('en el último nivel, lleno y sin siguiente', () => {
    const cfg = resolveLevelConfig({ cap: 3 })
    expect(levelProgress(3, 999, cfg)).toEqual({ progress: 100, currentXp: 0, requiredXp: 0 })
  })
})
