/**
 * Pruebas de utils/help-video.ts (tiempos y subtítulos del reproductor de la ayuda).
 * Dentro de itakai-app-dev:
 *   node --experimental-network-imports --test /app/tests/help-video.test.mjs
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'

const { formatVideoTime, parseVtt, subtitlesUrl } = await import(
  process.env.HELP_VIDEO_MODULE ?? 'http://localhost:4000/_nuxt/utils/help-video.ts'
)

test('duración como un reproductor', () => {
  assert.equal(formatVideoTime(0), '0:00')
  assert.equal(formatVideoTime(107.4), '1:47')
  assert.equal(formatVideoTime(3723), '1:02:03')
  assert.equal(formatVideoTime(null), '0:00')
})

test('los subtítulos son el mismo fichero con .vtt', () => {
  assert.equal(subtitlesUrl('https://cdn.es/a/guia.mp4'), 'https://cdn.es/a/guia.vtt')
  assert.equal(subtitlesUrl('https://cdn.es/a/guia.mp4?v=2'), 'https://cdn.es/a/guia.vtt?v=2')
  assert.equal(subtitlesUrl('https://www.youtube-nocookie.com/embed/x'), null)
})

test('lee un WebVTT sencillo y quita etiquetas', () => {
  const cues = parseVtt(
    'WEBVTT\n\n00:00:02.950 --> 00:00:06.010\nHola, <b>¿qué tal?</b>\n\n1\n00:01:01.5 --> 00:01:03.000\nSegunda\nlínea\n'
  )
  assert.equal(cues.length, 2)
  assert.deepEqual(cues[0], { start: 2.95, end: 6.01, text: 'Hola, ¿qué tal?' })
  assert.equal(cues[1].start, 61.5)
  assert.equal(cues[1].text, 'Segunda\nlínea')
})
