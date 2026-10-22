import { it, expect, afterAll } from 'vitest'
import { describeWithDatabase } from '../helpers/test-db.js'
import { prisma } from '../helpers/class-fixture.js'
import {
  getAiSettings,
  invalidateSettingsCache,
  updateSection,
} from '../../src/modules/settings/settings.service.js'

describeWithDatabase('ajustes de IA: nivel de razonamiento del texto', () => {
  afterAll(async () => {
    await prisma.instanceSetting.deleteMany({ where: { section: 'ai' } })
    invalidateSettingsCache()
  })

  it('de serie es «low», como hasta ahora', async () => {
    await prisma.instanceSetting.deleteMany({ where: { section: 'ai' } })
    invalidateSettingsCache()
    expect((await getAiSettings()).text.reasoningEffort).toBe('low')
  })

  it('se guarda el que elige el panel sin tocar el resto del endpoint', async () => {
    await updateSection('ai', {
      text: { baseUrl: 'https://api.openai.com/v1', apiKey: 'sk-prueba', model: 'gpt-6-luna' },
    })
    await updateSection('ai', { text: { reasoningEffort: 'medium' } })
    const { text } = await getAiSettings()
    expect(text).toMatchObject({
      baseUrl: 'https://api.openai.com/v1',
      apiKey: 'sk-prueba',
      model: 'gpt-6-luna',
      reasoningEffort: 'medium',
    })
  })

  it('rechaza un valor que no está en la lista', async () => {
    await expect(updateSection('ai', { text: { reasoningEffort: 'turbo' } })).rejects.toThrow()
    expect((await getAiSettings()).text.reasoningEffort).toBe('medium')
  })
})
