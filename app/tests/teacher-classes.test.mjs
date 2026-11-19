/**
 * Pruebas de utils/teacher-classes.ts: lo que se pide a `GET /teacher/classes`.
 * «Mis clases» pedía como mucho 100: con más clases activas, las más antiguas no
 * salían (ni en la lista ni al crear una misión) y el contador decía 100 aunque
 * Inicio contara todas.
 *
 * El front no tiene un ejecutor de pruebas: los módulos son puros y se importan ya
 * compilados del servidor de desarrollo. Dentro de itakai-app-dev:
 *   node --experimental-network-imports --test /app/tests/teacher-classes.test.mjs
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'

const { teacherClassesQuery } = await import('http://localhost:4000/_nuxt/utils/teacher-classes.ts')

test('sin límite no pone tope: la API da todas las clases', () => {
  assert.equal(teacherClassesQuery(), undefined)
  assert.equal(teacherClassesQuery(undefined), undefined)
})

test('con un límite, lo manda tal cual', () => {
  assert.deepEqual(teacherClassesQuery(5), { limit: 5 })
})
