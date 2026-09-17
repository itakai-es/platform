import { describe, it, expect } from 'vitest'
import bcrypt from 'bcryptjs'
import { hashPassword, verifyPassword } from '../../src/utils/password.js'

describe('Password Utilities', () => {
  it('should hash a password', async () => {
    const hash = await hashPassword('myPassword123')
    expect(typeof hash).toBe('string')
    expect(hash).not.toBe('myPassword123')
    expect(hash.startsWith('$2')).toBe(true) // bcrypt prefix
  })

  it('should verify correct password', async () => {
    const hash = await hashPassword('correctPassword')
    const isValid = await verifyPassword('correctPassword', hash)
    expect(isValid).toBe(true)
  })

  it('should reject incorrect password', async () => {
    const hash = await hashPassword('correctPassword')
    const isValid = await verifyPassword('wrongPassword', hash)
    expect(isValid).toBe(false)
  })

  it('should generate different hashes for same password', async () => {
    const hash1 = await hashPassword('samePassword')
    const hash2 = await hashPassword('samePassword')
    expect(hash1).not.toBe(hash2) // Different salts
  })

  it('should handle empty string password', async () => {
    const hash = await hashPassword('')
    expect(typeof hash).toBe('string')
    const isValid = await verifyPassword('', hash)
    expect(isValid).toBe(true)
  })

  it('should handle unicode characters', async () => {
    const hash = await hashPassword('contraseña123!@#')
    const isValid = await verifyPassword('contraseña123!@#', hash)
    expect(isValid).toBe(true)
  })

  it('las contraseñas nuevas se guardan con coste 12', async () => {
    expect(await hashPassword('otra-contraseña')).toMatch(/^\$2[aby]?\$12\$/)
  })

  it('un hash con el coste anterior sigue valiendo', async () => {
    // Las contraseñas que ya existen llevan su coste dentro del hash.
    const viejo = await bcrypt.hash('la-de-siempre', 10)
    expect(viejo).toMatch(/^\$2[aby]?\$10\$/)
    expect(await verifyPassword('la-de-siempre', viejo)).toBe(true)
    expect(await verifyPassword('otra', viejo)).toBe(false)
  })
})
