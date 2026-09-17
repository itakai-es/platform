import { describe, it, expect } from 'vitest'
import {
  accountHandle,
  accountIdentifier,
  buildUsernameProposal,
  generateTemporaryPassword,
  identifierWhere,
  isUsernameConflict,
  isValidUsername,
  looksLikeEmail,
  normalizeEmail,
  normalizeUsername,
  USERNAME_MAX_LENGTH,
  usernameVariants,
} from '../../src/utils/identity.js'

describe('normalización del identificador', () => {
  it('el correo se queda en minúsculas y sin espacios alrededor', () => {
    expect(normalizeEmail('  Ana.Gomez@Example.COM ')).toBe('ana.gomez@example.com')
  })

  it('el usuario también', () => {
    expect(normalizeUsername('  Ana.G.K7 ')).toBe('ana.g.k7')
  })

  it('con arroba es un correo; sin ella, un usuario', () => {
    expect(looksLikeEmail('ana@example.com')).toBe(true)
    expect(looksLikeEmail('ana.g.k7')).toBe(false)
  })

  it('busca por correo o por usuario según lo escrito', () => {
    expect(identifierWhere('Ana@Example.com')).toEqual({ email: 'ana@example.com' })
    expect(identifierWhere('Ana.G.K7')).toEqual({ username: 'ana.g.k7' })
  })
})

describe('cómo se nombra una cuenta sin correo', () => {
  it('sin alias se usa el usuario', () => {
    expect(accountHandle({ username: 'ana.g.k7', email: null })).toBe('ana.g.k7')
  })

  it('sin usuario se usa la parte del correo anterior a la arroba, nunca el correo entero', () => {
    expect(accountHandle({ username: null, email: 'ana@example.com' })).toBe('ana')
  })

  it('donde antes se mostraba el correo, se muestra el usuario si no lo hay', () => {
    expect(accountIdentifier({ username: 'ana.g.k7', email: null })).toBe('ana.g.k7')
    expect(accountIdentifier({ username: 'ana.g.k7', email: 'ana@example.com' })).toBe(
      'ana@example.com'
    )
    expect(accountIdentifier({ username: null, email: null })).toBe('')
  })
})

describe('usuario propuesto', () => {
  it('es nombre, inicial del apellido y un sufijo corto', () => {
    expect(buildUsernameProposal('Ana Gómez Ruiz')).toMatch(/^ana\.g\.[a-z0-9]{2}$/)
  })

  it('sin apellido sale solo el nombre y el sufijo', () => {
    expect(buildUsernameProposal('Ana')).toMatch(/^ana\.[a-z0-9]{2}$/)
  })

  it('quita tildes, eñes y cualquier signo raro', () => {
    expect(buildUsernameProposal('Íñigo Ñuño')).toMatch(/^inigo\.n\.[a-z0-9]{2}$/)
    expect(buildUsernameProposal("M.ª José  O'Brien")).toMatch(/^m[a]?\.j\.[a-z0-9]{2}$/)
  })

  it('con un nombre que no deja ninguna letra, propone algo que vale', () => {
    expect(isValidUsername(buildUsernameProposal('***'))).toBe(true)
  })

  it('nunca pasa del largo máximo, aunque el nombre sea larguísimo', () => {
    const proposal = buildUsernameProposal(`${'a'.repeat(80)} ${'b'.repeat(80)}`)
    expect(proposal.length).toBeLessThanOrEqual(USERNAME_MAX_LENGTH)
    expect(isValidUsername(proposal)).toBe(true)
  })

  it('dos propuestas del mismo nombre no coinciden: el sufijo es aleatorio', () => {
    const proposals = new Set(Array.from({ length: 30 }, () => buildUsernameProposal('Ana Gómez')))
    expect(proposals.size).toBeGreaterThan(1)
  })
})

describe('usuario válido', () => {
  it('admite letras sin tilde, números y los tres signos', () => {
    expect(isValidUsername('ana.g.k7')).toBe(true)
    expect(isValidUsername('ana_gomez-1')).toBe(true)
  })

  it('rechaza lo que no se puede teclear sin dudar', () => {
    expect(isValidUsername('Ana.G')).toBe(false) // mayúsculas
    expect(isValidUsername('ana gomez')).toBe(false) // espacio
    expect(isValidUsername('anagómez')).toBe(false) // tilde
    expect(isValidUsername('ana@example.com')).toBe(false) // arroba
    expect(isValidUsername('.ana')).toBe(false) // empieza por signo
    expect(isValidUsername('ana.')).toBe(false) // acaba en signo
    expect(isValidUsername('ab')).toBe(false) // demasiado corto
    expect(isValidUsername('a'.repeat(USERNAME_MAX_LENGTH + 1))).toBe(false)
  })
})

describe('contraseña temporal', () => {
  it('tiene 8 caracteres y ninguno se confunde al leerlo', () => {
    for (let i = 0; i < 50; i++) {
      const password = generateTemporaryPassword()
      expect(password).toHaveLength(8)
      expect(password).not.toMatch(/[0O1lI]/)
    }
  })

  it('no repite', () => {
    const passwords = new Set(Array.from({ length: 50 }, generateTemporaryPassword))
    expect(passwords.size).toBe(50)
  })
})

describe('usuario escrito que ya está cogido', () => {
  it('se prueba tal cual y luego con un sufijo detrás', () => {
    const next = usernameVariants('ana.gomez')
    expect(next()).toBe('ana.gomez')
    for (let i = 0; i < 20; i++) {
      const variant = next()
      expect(variant).not.toBe('ana.gomez')
      expect(variant.startsWith('ana.gomez.')).toBe(true)
      expect(isValidUsername(variant)).toBe(true)
    }
  })

  it('el sufijo cabe también en un usuario del largo máximo', () => {
    const next = usernameVariants('a'.repeat(USERNAME_MAX_LENGTH))
    next()
    expect(next().length).toBeLessThanOrEqual(USERNAME_MAX_LENGTH)
  })
})

describe('reconocer el choque de unicidad del usuario', () => {
  // La base cuenta el campo que ha chocado de dos maneras según la versión: si
  // no se reconoce ninguna, el choque acaba en un error genérico en vez de
  // resolverse con otro usuario.
  it('lo reconoce con el campo en `meta.target`', () => {
    expect(isUsernameConflict({ code: 'P2002', meta: { target: ['username'] } })).toBe(true)
    expect(isUsernameConflict({ code: 'P2002', meta: { target: 'users_username_key' } })).toBe(true)
  })

  it('lo reconoce con el detalle del adaptador de la base', () => {
    expect(
      isUsernameConflict({
        code: 'P2002',
        meta: {
          modelName: 'User',
          driverAdapterError: {
            cause: { kind: 'UniqueConstraintViolation', constraint: { fields: ['username'] } },
          },
        },
      })
    ).toBe(true)
  })

  it('no confunde otros choques ni otros errores', () => {
    expect(isUsernameConflict({ code: 'P2002', meta: { target: ['email'] } })).toBe(false)
    expect(isUsernameConflict({ code: 'P2003' })).toBe(false)
    expect(isUsernameConflict(new Error('vaya'))).toBe(false)
    expect(isUsernameConflict(null)).toBe(false)
  })
})
