import { describe, it, expect, vi, afterEach } from 'vitest'
import {
  formatMission,
  getMissionStatus,
  missionRewards,
  type MissionFormatInput,
} from '../../src/utils/mission-formatter.js'
import { DEFAULT_CLASS_SETTINGS } from '../../src/utils/class-settings.js'

const baseMission: MissionFormatInput = {
  id: 'mission-1',
  title: 'La Odisea de las Matemáticas',
  description: 'Explora las matemáticas antiguas',
  classId: 'class-1',
  status: 'activa',
  rarity: 'comun',
  deadline: null,
  backgroundImage: null,
  xpReward: 100,
  enigmas: [
    { xpReward: 20 },
    { xpReward: 40 },
  ],
  progress: [],
}

describe('formatMission', () => {
  it('should format a basic mission with correct fields', () => {
    const result = formatMission(baseMission)
    expect(result.id).toBe('mission-1')
    expect(result.title).toBe('La Odisea de las Matemáticas')
    expect(result.description).toBe('Explora las matemáticas antiguas')
    expect(result.classId).toBe('class-1')
    expect(result.rarity).toBe('comun')
  })

  it('should calculate progress percentage correctly', () => {
    const mission: MissionFormatInput = {
      ...baseMission,
      enigmas: [{ xpReward: 20 }, { xpReward: 40 }, { xpReward: 60 }],
      progress: [{ enigmasCompleted: 1, completedAt: null }],
    }
    const result = formatMission(mission)
    expect(result.progress).toBe(33) // 1/3 = 33%
    expect(result.progressDetail.done).toBe(1)
    expect(result.progressDetail.total).toBe(3)
  })

  it('should return 0% progress when no enigmas', () => {
    const mission: MissionFormatInput = {
      ...baseMission,
      enigmas: [],
      progress: [],
    }
    const result = formatMission(mission)
    expect(result.progress).toBe(0)
    expect(result.progressDetail.total).toBe(0)
  })

  it('should calculate total XP including rarity bonus', () => {
    const result = formatMission(baseMission)
    // comun bonus (50) + enigmas (20 + 40) = 110
    expect(result.xpReward).toBe(110)
    expect(result.rewards.xp).toBe(110)
  })

  it('should include className when requested', () => {
    const mission: MissionFormatInput = {
      ...baseMission,
      class: { name: 'Clase de Historia' },
    }
    const result = formatMission(mission, true)
    expect(result.className).toBe('Clase de Historia')
  })

  it('should not include className when not requested', () => {
    const mission: MissionFormatInput = {
      ...baseMission,
      class: { name: 'Clase de Historia' },
    }
    const result = formatMission(mission, false)
    expect(result.className).toBeUndefined()
  })

  it('should handle mission with no progress records', () => {
    const mission: MissionFormatInput = {
      ...baseMission,
      progress: undefined,
    }
    const result = formatMission(mission)
    expect(result.progress).toBe(0)
    expect(result.progressDetail.done).toBe(0)
  })
})

describe('getMissionStatus', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it('should return completada when progress has completedAt', () => {
    const status = getMissionStatus(
      { deadline: null, status: 'activa' },
      { completedAt: new Date() }
    )
    expect(status).toBe('completada')
  })

  it('should return expirada when deadline has passed', () => {
    const pastDate = new Date('2020-01-01')
    const status = getMissionStatus(
      { deadline: pastDate, status: 'activa' },
      null
    )
    expect(status).toBe('expirada')
  })

  it('should return urgente when deadline is within 2 days', () => {
    const tomorrow = new Date(Date.now() + 1 * 24 * 60 * 60 * 1000)
    const status = getMissionStatus(
      { deadline: tomorrow, status: 'activa' },
      null
    )
    expect(status).toBe('urgente')
  })

  it('should return bloqueada when status is bloqueada', () => {
    const status = getMissionStatus(
      { deadline: null, status: 'bloqueada' },
      null
    )
    expect(status).toBe('bloqueada')
  })

  it('should return activa for active mission with no deadline', () => {
    const status = getMissionStatus(
      { deadline: null, status: 'activa' },
      null
    )
    expect(status).toBe('activa')
  })

  it('should return activa for mission with far future deadline', () => {
    const farFuture = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
    const status = getMissionStatus(
      { deadline: farFuture, status: 'activa' },
      null
    )
    expect(status).toBe('activa')
  })

  it('should prioritize completada over expirada', () => {
    const pastDate = new Date('2020-01-01')
    const status = getMissionStatus(
      { deadline: pastDate, status: 'activa' },
      { completedAt: new Date() }
    )
    expect(status).toBe('completada')
  })
})

describe('missionRewards', () => {
  const mission = {
    rarity: 'epica',
    enigmas: [
      { xpReward: 20, coinReward: 3, manaReward: 2 },
      { xpReward: 40, coinReward: 4 },
    ],
  }

  it('suma la XP de los enigmas y la de la rareza, y sus monedas y su maná', () => {
    // épica (200) + enigmas (20 + 40)
    expect(missionRewards(mission)).toEqual({ xpReward: 260, coinReward: 7, manaReward: 2 })
    // Sin enigmas, la de completarla.
    expect(missionRewards({ rarity: 'comun' })).toEqual({
      xpReward: 50,
      coinReward: 0,
      manaReward: 0,
    })
  })

  it('da 0 en los recursos que la clase tiene apagados', () => {
    expect(missionRewards(mission, { xp: true, coins: true, mana: false })).toEqual({
      xpReward: 260,
      coinReward: 7,
      manaReward: 0,
    })
    expect(missionRewards(mission, { xp: false, coins: false, mana: true })).toEqual({
      xpReward: 0,
      coinReward: 0,
      manaReward: 2,
    })
  })

  it('es la misma cuenta que la tarjeta de formatMission', () => {
    const input: MissionFormatInput = { ...baseMission, ...mission }
    const settings = { ...DEFAULT_CLASS_SETTINGS, coins: false }
    const card = formatMission(input, false, settings)
    expect(missionRewards(input, settings)).toEqual({
      xpReward: card.xpReward,
      coinReward: card.coinReward,
      manaReward: card.manaReward,
    })
  })
})
