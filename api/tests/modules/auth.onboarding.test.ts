import { describe, it, expect, vi, beforeEach } from 'vitest'

/**
 * El rol se elige una sola vez, al terminar el alta.
 *
 *  - una cuenta que aún no lo ha elegido lo guarda y queda dada de alta
 *  - una cuenta que ya lo eligió no puede cambiarlo
 *  - la condición viaja en el propio UPDATE, no en una lectura previa
 */

const mocks = vi.hoisted(() => ({
  updateMany: vi.fn(),
  findUniqueOrThrow: vi.fn(),
}))

vi.mock('../../src/config/database.js', () => ({
  prisma: {
    user: { updateMany: mocks.updateMany, findUniqueOrThrow: mocks.findUniqueOrThrow },
  },
}))

import { authService } from '../../src/modules/auth/auth.service.js'

const USER = 'user-1'

beforeEach(() => {
  vi.clearAllMocks()
})

describe('completeOnboarding', () => {
  it('guarda el rol de una cuenta que aún no lo ha elegido', async () => {
    mocks.updateMany.mockResolvedValue({ count: 1 })
    mocks.findUniqueOrThrow.mockResolvedValue({
      id: USER,
      email: 'ana@ejemplo.test',
      name: 'Ana',
      role: 'student',
      isOnboarded: true,
      status: 'active',
    })

    const user = await authService.completeOnboarding(USER, { role: 'student' })

    expect(mocks.updateMany).toHaveBeenCalledWith({
      where: { id: USER, isOnboarded: false },
      data: { role: 'student', isOnboarded: true },
    })
    expect(user.role).toBe('student')
  })

  it('rechaza cambiar el rol de una cuenta que ya lo eligió', async () => {
    mocks.updateMany.mockResolvedValue({ count: 0 })

    await expect(authService.completeOnboarding(USER, { role: 'teacher' })).rejects.toThrow(
      'El rol de esta cuenta ya está elegido'
    )
    expect(mocks.findUniqueOrThrow).not.toHaveBeenCalled()
  })
})
