import { describe, it, expect, vi, beforeEach } from 'vitest'

/**
 * Tests del centro de ayuda (Fase 3, punto 17).
 *
 * Lo que importa aquí es la frontera entre lo público y lo editable: que la
 * superficie pública no deje escapar un borrador, y que los slugs —que acaban
 * siendo URLs que la gente comparte— no cambien bajo los pies de nadie.
 */

const mocks = vi.hoisted(() => ({
  categoryFindMany: vi.fn(),
  categoryFindUnique: vi.fn(),
  articleFindMany: vi.fn(),
  articleFindFirst: vi.fn(),
  articleFindUnique: vi.fn(),
  articleCreate: vi.fn(),
  articleUpdate: vi.fn(),
}))

vi.mock('../../src/config/database.js', () => ({
  prisma: {
    helpCategory: { findMany: mocks.categoryFindMany, findUnique: mocks.categoryFindUnique },
    helpArticle: {
      findMany: mocks.articleFindMany,
      findFirst: mocks.articleFindFirst,
      findUnique: mocks.articleFindUnique,
      create: mocks.articleCreate,
      update: mocks.articleUpdate,
    },
  },
}))

import {
  createArticle,
  getPublicArticle,
  getPublicIndex,
  slugify,
  updateArticle,
} from '../../src/modules/help/help.service.js'

beforeEach(() => {
  vi.clearAllMocks()
  mocks.articleFindFirst.mockResolvedValue(null)
  mocks.articleFindMany.mockResolvedValue([])
  mocks.articleCreate.mockImplementation(({ data }: any) => Promise.resolve({ id: 'a1', ...data }))
  mocks.articleUpdate.mockImplementation(({ data }: any) => Promise.resolve({ id: 'a1', ...data }))
})

describe('slugify', () => {
  it('quita tildes, signos y mayúsculas', () => {
    expect(slugify('Configuración de la IA')).toBe('configuracion-de-la-ia')
    expect(slugify('¿Cómo reviso una entrega?')).toBe('como-reviso-una-entrega')
    expect(slugify('Niveles y rangos')).toBe('niveles-y-rangos')
  })

  it('no deja guiones sueltos en los extremos', () => {
    expect(slugify('  ¡Empieza aquí!  ')).toBe('empieza-aqui')
  })

  it('acorta los títulos muy largos', () => {
    expect(slugify('a'.repeat(200)).length).toBeLessThanOrEqual(80)
  })
})

describe('getPublicIndex', () => {
  it('pide solo artículos publicados del idioma', async () => {
    mocks.categoryFindMany.mockResolvedValue([])
    await getPublicIndex('es')

    const where = mocks.categoryFindMany.mock.calls[0][0].include.articles.where
    expect(where).toEqual({ status: 'publicado', locale: 'es' })
  })

  it('esconde las categorías que se han quedado sin artículos publicados', async () => {
    mocks.categoryFindMany.mockResolvedValue([
      { slug: 'con', name: 'Con', description: null, icon: '📘', accent: 'purple', articles: [{ id: 'a' }] },
      { slug: 'sin', name: 'Sin', description: null, icon: '📕', accent: 'sky', articles: [] },
    ])

    const { categories } = await getPublicIndex()

    expect(categories.map(c => c.slug)).toEqual(['con'])
    expect(categories[0].total).toBe(1)
  })
})

describe('getPublicArticle', () => {
  it('no devuelve borradores', async () => {
    mocks.articleFindFirst.mockResolvedValue(null)

    expect(await getPublicArticle('misiones', 'un-borrador')).toBeNull()
    expect(mocks.articleFindFirst.mock.calls[0][0].where.status).toBe('publicado')
  })

  it('devuelve los hermanos para el lateral y excluye el propio de los relacionados', async () => {
    mocks.articleFindFirst.mockResolvedValue({
      id: 'a2',
      slug: 'segundo',
      title: 'Segundo',
      summary: null,
      body: 'cuerpo',
      updatedAt: new Date(),
      helpful: 0,
      categoryId: 'c1',
      category: { slug: 'misiones', name: 'Misiones', icon: '🗺️', accent: 'sky' },
    })
    mocks.articleFindMany.mockResolvedValue([
      { id: 'a1', slug: 'primero', title: 'Primero' },
      { id: 'a2', slug: 'segundo', title: 'Segundo' },
      { id: 'a3', slug: 'tercero', title: 'Tercero' },
    ])

    const found = await getPublicArticle('misiones', 'segundo')

    expect(found?.siblings).toHaveLength(3)
    expect(found?.related.map(r => r.id)).toEqual(['a1', 'a3'])
  })
})

describe('createArticle', () => {
  it('nace en borrador y sin fecha de publicación', async () => {
    await createArticle({ categoryId: 'c1', title: 'Crear una misión', body: 'texto' })

    const { data } = mocks.articleCreate.mock.calls[0][0]
    expect(data.status).toBe('borrador')
    expect(data.publishedAt).toBeNull()
    expect(data.slug).toBe('crear-una-mision')
  })

  it('desempata los slugs repetidos dentro de la misma categoría', async () => {
    mocks.articleFindFirst
      .mockResolvedValueOnce({ id: 'existente' })
      .mockResolvedValueOnce(null)

    await createArticle({ categoryId: 'c1', title: 'Insignias', body: 'texto' })

    expect(mocks.articleCreate.mock.calls[0][0].data.slug).toBe('insignias-2')
  })

  it('sella la fecha al crear ya publicado', async () => {
    await createArticle({ categoryId: 'c1', title: 'Ya', body: 'texto', status: 'publicado' })

    expect(mocks.articleCreate.mock.calls[0][0].data.publishedAt).toBeInstanceOf(Date)
  })
})

describe('updateArticle', () => {
  const current = {
    id: 'a1',
    categoryId: 'c1',
    slug: 'titulo-viejo',
    locale: 'es',
    status: 'borrador' as const,
    publishedAt: null,
  }

  it('el slug sigue al título mientras es borrador', async () => {
    mocks.articleFindUnique.mockResolvedValue(current)

    await updateArticle('a1', { title: 'Título nuevo' })

    expect(mocks.articleUpdate.mock.calls[0][0].data.slug).toBe('titulo-nuevo')
  })

  it('una vez publicado, el slug se queda quieto aunque cambie el título', async () => {
    mocks.articleFindUnique.mockResolvedValue({
      ...current,
      status: 'publicado',
      publishedAt: new Date(),
    })

    await updateArticle('a1', { title: 'Otro título distinto' })

    expect(mocks.articleUpdate.mock.calls[0][0].data.slug).toBeUndefined()
  })

  it('sella la fecha la primera vez que se publica', async () => {
    mocks.articleFindUnique.mockResolvedValue(current)

    await updateArticle('a1', { status: 'publicado' })

    expect(mocks.articleUpdate.mock.calls[0][0].data.publishedAt).toBeInstanceOf(Date)
  })

  it('no vuelve a sellar la fecha al republicar algo que ya se publicó', async () => {
    mocks.articleFindUnique.mockResolvedValue({
      ...current,
      status: 'borrador',
      publishedAt: new Date('2026-01-01'),
    })

    await updateArticle('a1', { status: 'publicado' })

    expect(mocks.articleUpdate.mock.calls[0][0].data.publishedAt).toBeUndefined()
  })
})
