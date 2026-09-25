import { describe, it, expect } from 'vitest'
import {
  CLASS_ACCESS_LABELS,
  CLASS_TEACHER_PROFILE_LABELS,
  NOTIFICATION_COPY,
  renderNotificationCopy,
} from '../../src/modules/notifications/notifications.messages.js'
import { APP_LANGUAGES } from '../../src/modules/settings/settings.types.js'

/**
 * Catálogo de textos de los avisos: cada aviso en los diez idiomas, con los
 * mismos `{parametros}` en todos, y los parámetros traducidos (el perfil y el
 * nivel del profesorado) en el idioma de quien lo recibe.
 */

const placeholders = (text: string) => [...text.matchAll(/\{(\w+)\}/g)].map(m => m[1]).sort()

describe('catálogo de avisos', () => {
  for (const [key, copy] of Object.entries(NOTIFICATION_COPY)) {
    it(`${key}: está en todos los idiomas y con los mismos parámetros`, () => {
      for (const part of ['title', 'message'] as const) {
        const texts = copy[part] as Record<string, string>
        const expected = placeholders(texts.es)
        for (const language of APP_LANGUAGES) {
          expect(texts[language]?.trim(), `${part} ${language}`).toBeTruthy()
          expect(placeholders(texts[language]), `${part} ${language}`).toEqual(expected)
        }
      }
    })
  }

  it('el perfil y el nivel de un profesor están en todos los idiomas', () => {
    for (const labels of [
      ...Object.values(CLASS_TEACHER_PROFILE_LABELS),
      ...Object.values(CLASS_ACCESS_LABELS),
    ]) {
      for (const language of APP_LANGUAGES) {
        expect((labels as Record<string, string>)[language]?.trim()).toBeTruthy()
      }
    }
  })

  it('un parámetro traducido sale en el idioma de quien recibe el aviso', () => {
    const params = {
      actor: 'Ana',
      class: '1º DAM',
      profile: CLASS_TEACHER_PROFILE_LABELS.practicas,
      access: CLASS_ACCESS_LABELS.read,
    }
    expect(renderNotificationCopy('class_teacher_added', 'es', params).message).toBe(
      'Ana te ha añadido al profesorado de 1º DAM con el perfil «Prácticas» y acceso de lectura.'
    )
    expect(renderNotificationCopy('class_teacher_added', 'gl', params).message).toBe(
      'Ana engadiute ao profesorado de 1º DAM co perfil «Prácticas» e acceso de lectura.'
    )
    expect(renderNotificationCopy('class_teacher_added', 'en', params).message).toBe(
      'Ana added you to the teachers of 1º DAM with the "Trainee" profile and view-only access.'
    )
  })
})
