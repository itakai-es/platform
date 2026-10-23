/**
 * Pruebas de utils/mission-teacher-status.ts (filtro de estado de los listados
 * del profesorado). Dentro de itakai-app-dev:
 *   node --experimental-network-imports --test /app/tests/mission-teacher-status.test.mjs
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'

const { teacherMissionStatus: s } = await import(
  'http://localhost:4000/_nuxt/utils/mission-teacher-status.ts'
)
const now = Date.parse('2026-10-23T10:00:00Z')
const inDays = d => new Date(now + d * 86400000).toISOString()

test('cada misión cae en un estado, y el filtro ya no deja la lista vacía', () => {
  assert.equal(
    s({ status: 'activa', deadline: null, completedCount: 0, totalStudents: 5 }, now),
    'activa'
  )
  assert.equal(
    s({ status: 'activa', deadline: inDays(1), completedCount: 0, totalStudents: 5 }, now),
    'urgente'
  )
  assert.equal(
    s({ status: 'activa', deadline: inDays(5), completedCount: 0, totalStudents: 5 }, now),
    'activa'
  )
  assert.equal(
    s({ status: 'activa', deadline: inDays(-1), completedCount: 2, totalStudents: 5 }, now),
    'expirada'
  )
  assert.equal(
    s({ status: 'bloqueada', deadline: inDays(-1), completedCount: 0, totalStudents: 5 }, now),
    'bloqueada'
  )
  assert.equal(
    s({ status: 'activa', deadline: inDays(1), completedCount: 5, totalStudents: 5 }, now),
    'completada'
  )
  // Sin alumnado no hay «completada».
  assert.equal(
    s({ status: 'activa', deadline: null, completedCount: 0, totalStudents: 0 }, now),
    'activa'
  )
})
