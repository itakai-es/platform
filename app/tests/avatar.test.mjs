/**
 * Pruebas de utils/avatar.ts (catálogos, retratos, iniciales y color de fondo).
 *
 * El front no tiene un ejecutor de pruebas: el módulo es puro y se importa ya
 * compilado del servidor de desarrollo. Dentro de itakai-app-dev:
 *   node --experimental-network-imports --test /app/tests/avatar.test.mjs
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'

const a = await import('http://localhost:4000/_nuxt/utils/avatar.ts')

const PALETTE = ['purple', 'yellow', 'mint', 'sky', 'red', 'peach']

test('el catálogo del alumnado: cinco personajes, con su ruta y su retrato', () => {
  assert.deepEqual(
    [...a.STUDENT_AVATAR_KEYS],
    ['atenea', 'odiseo', 'penelope', 'polifemo', 'poseidon']
  )
  for (const key of a.STUDENT_AVATAR_KEYS) {
    const src = a.studentAvatarSrc(key)
    assert.equal(src, `/app/avatars/${key}.svg`)
    assert.equal(a.catalogKeyOf(src), key)
    assert.equal(a.portraitOf(src), `/app/avatars/retratos/${key}.svg`)
  }
})

test('una imagen generada, una dirección externa o nada no son del catálogo ni tienen retrato', () => {
  for (const src of [
    '/uploads/ai-generated/avatars/x.png',
    'https://ejemplo.com/app/avatars/atenea.svg',
    '/app/avatars/retratos/atenea.svg',
    '/app/avatars/hermes.svg',
    '',
    null,
    undefined,
  ]) {
    assert.equal(a.catalogKeyOf(src), null, String(src))
    assert.equal(a.portraitOf(src), null, String(src))
  }
})

test('iniciales: nombre y último apellido; con una palabra, sus dos primeras letras', () => {
  assert.equal(a.avatarInitials('María López García'), 'MG')
  assert.equal(a.avatarInitials('  laura   martín '), 'LM')
  assert.equal(a.avatarInitials('Iker'), 'IK')
  assert.equal(a.avatarInitials('Ñ'), 'Ñ')
  assert.equal(a.avatarInitials('Álvaro Íñiguez'), 'ÁÍ')
  assert.equal(a.avatarInitials(''), '?')
  assert.equal(a.avatarInitials(null), '?')
})

test('el color sale siempre de la paleta y es estable para el mismo id', () => {
  for (const seed of ['', 'a', 'id-1', 'ccaa721f-80e3-4cef-acc7-88326da53af2', null, undefined]) {
    const color = a.avatarColorOf(seed)
    assert.ok(PALETTE.includes(color), String(seed))
    assert.equal(a.avatarColorOf(seed), color)
  }
  // Una clase de treinta no sale de un solo color.
  const colors = new Set(
    Array.from({ length: 30 }, (_, i) =>
      a.avatarColorOf(a.studentAvatarSeed('clase-1', `alumno-${i}`))
    )
  )
  assert.ok(colors.size >= 4, `${colors.size} colores`)
})

test('el color de un estudiante es de su matrícula: puede cambiar de una clase a otra', () => {
  assert.equal(a.studentAvatarSeed('c1', 's1'), 'c1:s1')
  assert.notEqual(a.studentAvatarSeed('c1', 's1'), a.studentAvatarSeed('c2', 's1'))
  assert.equal(a.studentAvatarSeed(undefined, 's1'), ':s1')
})

test('el catálogo docente: los personajes con su retrato, un color por clave de la paleta; lo que no es del catálogo, nada', () => {
  assert.deepEqual(a.TEACHER_AVATAR_KEYS, [...a.TEACHER_CHARACTER_KEYS, ...PALETTE])
  for (const key of a.TEACHER_CHARACTER_KEYS) {
    const entry = a.teacherAvatarOf(key)
    assert.ok(PALETTE.includes(entry.color), key)
    assert.equal(entry.portrait, a.studentAvatarSrc(key))
  }
  for (const key of PALETTE) assert.deepEqual(a.teacherAvatarOf(key), { color: key })
  for (const key of [null, undefined, '', 'gold', '/app/avatars/atenea.svg', 'constructor']) {
    assert.equal(a.teacherAvatarOf(key), null, String(key))
  }
})
