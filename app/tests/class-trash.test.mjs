/**
 * Pruebas de utils/class-trash.ts: lo que la página de una clase del profesorado
 * carga además de la clase. Con la clase en la papelera, la API da 404 a sus
 * misiones; si se pidieran, la página dejaría el aviso de la papelera y diría
 * «Clase no encontrada».
 *
 * El front no tiene un ejecutor de pruebas: los módulos son puros y se importan ya
 * compilados del servidor de desarrollo. Dentro de itakai-app-dev:
 *   node --experimental-network-imports --test /app/tests/class-trash.test.mjs
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'

const { loadClassContent, classPurgeAt, CLASS_TRASH_DAYS } = await import(
  'http://localhost:4000/_nuxt/utils/class-trash.ts'
)

/** Como la API con la clase en la papelera: sus misiones, 404. */
function loaders(calls) {
  return {
    students: async () => {
      calls.push('students')
      return [{ id: 's1' }]
    },
    missions: async () => {
      calls.push('missions')
      throw Object.assign(new Error('Clase no encontrada'), { statusCode: 404 })
    },
  }
}

test('en la papelera no pide ni el alumnado ni las misiones', async () => {
  const calls = []
  const content = await loadClassContent({ deletedAt: '2026-11-01T10:00:00.000Z' }, loaders(calls))
  assert.deepEqual(content, { students: [], missions: [] })
  assert.deepEqual(calls, [])
})

test('fuera de la papelera pide el alumnado y luego las misiones', async () => {
  const calls = []
  const content = await loadClassContent(
    { deletedAt: null },
    {
      students: async () => (calls.push('students'), [{ id: 's1' }]),
      missions: async () => (calls.push('missions'), [{ id: 'm1' }]),
    }
  )
  assert.deepEqual(content, { students: [{ id: 's1' }], missions: [{ id: 'm1' }] })
  assert.deepEqual(calls, ['students', 'missions'])
})

test('sin la clase todavía, lo pide (y el fallo de la API sube)', async () => {
  const calls = []
  await assert.rejects(loadClassContent(null, loaders(calls)), { statusCode: 404 })
  assert.deepEqual(calls, ['students', 'missions'])
})

test('la purga, a los días de la papelera', () => {
  assert.equal(CLASS_TRASH_DAYS, 30)
  assert.equal(classPurgeAt('2026-11-01T10:00:00.000Z').toISOString(), '2026-12-01T10:00:00.000Z')
})
