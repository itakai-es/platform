import { describe, it, expect, vi, beforeEach } from 'vitest'

/**
 * Tests del centro de ayuda (Fase 3, punto 17).
 *
 * Lo que importa aquí es la frontera entre lo público y lo editable: que la
 * superficie pública no deje escapar un borrador, que los slugs —que acaban
 * siendo URLs que la gente comparte— no cambien bajo los pies de nadie, y que
 * audiencia, área y tipo filtren lo que dicen filtrar.
 */

const mocks = vi.hoisted(() => ({
  $queryRaw: vi.fn(),
  $executeRaw: vi.fn(),
  $transaction: vi.fn(),
  categoryFindMany: vi.fn(),
  categoryFindUnique: vi.fn(),
  categoryFindFirst: vi.fn(),
  categoryCreate: vi.fn(),
  categoryUpdate: vi.fn(),
  articleFindMany: vi.fn(),
  articleFindFirst: vi.fn(),
  articleFindUnique: vi.fn(),
  articleCreate: vi.fn(),
  articleUpdate: vi.fn(),
  articleDelete: vi.fn(),
}))

vi.mock('../../src/config/database.js', () => ({
  prisma: {
    $queryRaw: mocks.$queryRaw,
    $executeRaw: mocks.$executeRaw,
    $transaction: mocks.$transaction,
    helpCategory: {
      findMany: mocks.categoryFindMany,
      findUnique: mocks.categoryFindUnique,
      findFirst: mocks.categoryFindFirst,
      create: mocks.categoryCreate,
      update: mocks.categoryUpdate,
    },
    helpArticle: {
      findMany: mocks.articleFindMany,
      findFirst: mocks.articleFindFirst,
      findUnique: mocks.articleFindUnique,
      create: mocks.articleCreate,
      update: mocks.articleUpdate,
      delete: mocks.articleDelete,
    },
  },
}))

vi.mock('../../src/modules/storage/storage.service.js', () => ({
  saveUpload: vi.fn(async (key: string) => `/uploads/${key}`),
}))

import {
  createArticle,
  createCategory,
  getArticlePreview,
  getPublicArticle,
  getPublicIndex,
  listArticles,
  reorderCategories,
  reorderArticles,
  saveHelpImage,
  searchArticles,
  slugify,
  updateArticle,
} from '../../src/modules/help/help.service.js'
import { saveUpload } from '../../src/modules/storage/storage.service.js'
import { NotFoundError, ValidationError } from '../../src/utils/errors.js'

beforeEach(() => {
  vi.clearAllMocks()
  mocks.$queryRaw.mockResolvedValue([])
  mocks.$executeRaw.mockResolvedValue(0)
  mocks.$transaction.mockImplementation((ops: Promise<unknown>[]) => Promise.all(ops))
  mocks.categoryFindMany.mockResolvedValue([])
  mocks.categoryFindUnique.mockResolvedValue(null)
  mocks.categoryFindFirst.mockResolvedValue(null)
  mocks.categoryCreate.mockImplementation(({ data }: any) => Promise.resolve({ id: 'c1', ...data }))
  mocks.categoryUpdate.mockImplementation(({ data }: any) => Promise.resolve({ id: 'c1', ...data }))
  mocks.articleFindFirst.mockResolvedValue(null)
  mocks.articleFindMany.mockResolvedValue([])
  mocks.articleFindUnique.mockResolvedValue(null)
  mocks.articleCreate.mockImplementation(({ data }: any) => Promise.resolve({ id: 'a1', ...data }))
  mocks.articleUpdate.mockImplementation(({ data }: any) => Promise.resolve({ id: 'a1', ...data }))
})

/** Un artículo con su categoría, como lo devuelve `include: { category: true }`. */
function articleRow(overrides: Record<string, unknown> = {}) {
  return {
    id: 'a2',
    slug: 'segundo',
    title: 'Segundo',
    summary: null,
    coverImage: null,
    body: 'cuerpo',
    updatedAt: new Date(),
    helpful: 0,
    categoryId: 'c1',
    locale: 'es',
    status: 'publicado',
    audience: 'profesor',
    kind: 'guia',
    videoUrl: null,
    category: { slug: 'misiones', name: 'Misiones', icon: '🗺️', accent: 'clases', area: 'ayuda' },
    ...overrides,
  }
}

/**
 * `$queryRaw` y `$executeRaw` son plantillas etiquetadas: recibe `[strings, ...values]`, y los
 * fragmentos condicionales (`Prisma.sql`) llegan como un valor con sus propias
 * `strings` y `values`. Se aplana todo para mirar qué viaja como texto y qué
 * como parámetro.
 */
function flattenQuery(call: unknown[]) {
  const strings: string[] = []
  const values: unknown[] = []
  const visit = (parts: readonly string[], vals: unknown[]) => {
    strings.push(...parts)
    for (const value of vals) {
      if (value && typeof value === 'object' && 'strings' in value && 'values' in value) {
        visit((value as any).strings, (value as any).values)
      } else {
        values.push(value)
      }
    }
  }
  const [parts, ...vals] = call
  visit(parts as readonly string[], vals)
  return { strings, values }
}

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

  it('no acaba en guion si el corte cae en un separador', () => {
    expect(slugify(`${'a'.repeat(79)} bcd`)).toBe('a'.repeat(79))
  })
})

describe('getPublicIndex', () => {
  it('pide solo artículos publicados del idioma', async () => {
    await getPublicIndex({ locale: 'es' })

    const where = mocks.categoryFindMany.mock.calls[0][0].include.articles.where
    expect(where).toEqual({ status: 'publicado', locale: 'es' })
  })

  it('esconde las categorías que se han quedado sin artículos publicados', async () => {
    mocks.categoryFindMany.mockResolvedValue([
      { slug: 'con', name: 'Con', description: null, icon: '📘', accent: 'ia', area: 'ayuda', articles: [{ id: 'a' }] },
      { slug: 'sin', name: 'Sin', description: null, icon: '📕', accent: 'stats', area: 'ayuda', articles: [] },
    ])

    const { categories } = await getPublicIndex()

    expect(categories.map(c => c.slug)).toEqual(['con'])
    expect(categories[0].total).toBe(1)
    expect(categories[0].area).toBe('ayuda')
  })

  it('filtra por audiencia contando también los de ambos', async () => {
    await getPublicIndex({ locale: 'es', audience: 'alumno' })

    const where = mocks.categoryFindMany.mock.calls[0][0].include.articles.where
    expect(where).toEqual({
      status: 'publicado',
      locale: 'es',
      audience: { in: ['alumno', 'ambos'] },
    })

    const featuredWhere = mocks.articleFindMany.mock.calls[0][0].where
    expect(featuredWhere.audience).toEqual({ in: ['alumno', 'ambos'] })
    expect(featuredWhere.category).toEqual({ area: 'ayuda' })
    expect(featuredWhere.featured).toBe(true)
  })

  it('por defecto solo sirve el área de ayuda', async () => {
    await getPublicIndex()

    expect(mocks.categoryFindMany.mock.calls[0][0].where.area).toBe('ayuda')
    expect(mocks.articleFindMany.mock.calls[0][0].where.category).toEqual({ area: 'ayuda' })
  })

  it('sin audiencia no filtra', async () => {
    await getPublicIndex()

    const where = mocks.categoryFindMany.mock.calls[0][0].include.articles.where
    expect(where).not.toHaveProperty('audience')
    expect(mocks.articleFindMany.mock.calls[0][0].where).not.toHaveProperty('audience')
  })
})

describe('getPublicArticle', () => {
  it('no devuelve borradores', async () => {
    mocks.articleFindFirst.mockResolvedValue(null)

    expect(await getPublicArticle('misiones', 'un-borrador')).toBeNull()
    expect(mocks.articleFindFirst.mock.calls[0][0].where.status).toBe('publicado')
  })

  it('devuelve los hermanos para el lateral y excluye el propio de los relacionados', async () => {
    mocks.articleFindFirst.mockResolvedValue(articleRow())
    mocks.articleFindMany.mockResolvedValue([
      { id: 'a1', slug: 'primero', title: 'Primero' },
      { id: 'a2', slug: 'segundo', title: 'Segundo' },
      { id: 'a3', slug: 'tercero', title: 'Tercero' },
    ])

    const found = await getPublicArticle('misiones', 'segundo')

    expect(found?.siblings).toHaveLength(3)
    expect(found?.related.map(r => r.id)).toEqual(['a1', 'a3'])
  })

  it('el artículo resuelve aunque su audiencia no sea la del scope y él mismo está entre los hermanos', async () => {
    mocks.articleFindFirst.mockResolvedValue(articleRow({ audience: 'profesor' }))

    const found = await getPublicArticle('misiones', 'segundo', { audience: 'alumno' })

    expect(found).not.toBeNull()
    expect(mocks.articleFindFirst.mock.calls[0][0].where).not.toHaveProperty('audience')

    const siblingsWhere = mocks.articleFindMany.mock.calls[0][0].where
    expect(siblingsWhere.OR).toEqual([{ audience: { in: ['alumno', 'ambos'] } }, { id: 'a2' }])
  })

  it('por defecto solo sirve artículos de categorías de ayuda', async () => {
    await getPublicArticle('novedades', 'una-entrada')

    expect(mocks.articleFindFirst.mock.calls[0][0].where.category).toEqual({ slug: 'novedades', area: 'ayuda' })
  })

  it('un artículo de blog solo se sirve si se pide su área', async () => {
    mocks.articleFindFirst.mockResolvedValue(articleRow({ category: { ...articleRow().category, area: 'blog' } }))

    const found = await getPublicArticle('novedades', 'segundo', { area: 'blog' })

    expect(found).not.toBeNull()
    expect(mocks.articleFindFirst.mock.calls[0][0].where.category).toEqual({ slug: 'novedades', area: 'blog' })
  })

  it('sin audiencia los hermanos no llevan condición de audiencia', async () => {
    mocks.articleFindFirst.mockResolvedValue(articleRow())

    await getPublicArticle('misiones', 'segundo')

    expect(mocks.articleFindMany.mock.calls[0][0].where).not.toHaveProperty('OR')
  })

  it('devuelve audiencia, tipo y URL de vídeo', async () => {
    mocks.articleFindFirst.mockResolvedValue(
      articleRow({ audience: 'ambos', kind: 'video', videoUrl: 'https://www.youtube-nocookie.com/embed/x' })
    )

    const found = await getPublicArticle('misiones', 'segundo')

    expect(found?.article.audience).toBe('ambos')
    expect(found?.article.kind).toBe('video')
    expect(found?.article.videoUrl).toBe('https://www.youtube-nocookie.com/embed/x')
    expect(found?.category.area).toBe('ayuda')
  })
})

describe('searchArticles', () => {

  it('no consulta con menos de dos caracteres', async () => {
    expect(await searchArticles('a')).toEqual([])
    expect(mocks.$queryRaw).not.toHaveBeenCalled()
  })

  it('pasa área y audiencia como parámetros, no como texto', async () => {
    await searchArticles('misiones', { audience: 'profesor' })

    const { strings, values } = flattenQuery(mocks.$queryRaw.mock.calls[0])
    expect(values).toContain('ayuda')
    expect(values).toContain('profesor')
    expect(strings.some(s => s.includes('profesor'))).toBe(false)
    expect(strings.some(s => s.includes('::"HelpArea"'))).toBe(true)
    expect(strings.some(s => s.includes('::"HelpAudience"'))).toBe(true)
  })

  it('sin audiencia no añade la condición', async () => {
    await searchArticles('misiones')

    const { strings } = flattenQuery(mocks.$queryRaw.mock.calls[0])
    expect(strings.some(s => s.includes('HelpAudience'))).toBe(false)
  })

  it('mapea audience y kind', async () => {
    mocks.$queryRaw.mockResolvedValue([
      {
        id: 'a1',
        slug: 'crear-una-mision',
        title: 'Crear una misión',
        summary: null,
        cover_image: null,
        audience: 'ambos',
        kind: 'tutorial',
        category_slug: 'misiones',
        category_name: 'Misiones',
        category_icon: null,
        category_accent: 'clases',
        snippet: '<em>misión</em>',
        rank: 0.5,
      },
    ])

    const [result] = await searchArticles('misión')

    expect(result.audience).toBe('ambos')
    expect(result.kind).toBe('tutorial')
    expect(result.category.slug).toBe('misiones')
  })
})

describe('getArticlePreview', () => {
  it('devuelve un borrador con la forma de la página pública', async () => {
    mocks.articleFindUnique.mockResolvedValue(articleRow({ status: 'borrador' }))
    mocks.articleFindMany.mockResolvedValue([
      { id: 'a1', slug: 'primero', title: 'Primero' },
      { id: 'a2', slug: 'segundo', title: 'Segundo' },
    ])

    const found = await getArticlePreview('a2')

    expect(mocks.articleFindUnique.mock.calls[0][0].where).toEqual({ id: 'a2' })
    expect(mocks.articleFindUnique.mock.calls[0][0].where).not.toHaveProperty('status')
    expect(found).toMatchObject({
      article: { id: 'a2', slug: 'segundo', body: 'cuerpo' },
      category: { slug: 'misiones', area: 'ayuda' },
    })
    expect(found?.siblings).toHaveLength(2)
    expect(found?.related.map(r => r.id)).toEqual(['a1'])

    const siblingsWhere = mocks.articleFindMany.mock.calls[0][0].where
    expect(siblingsWhere.OR).toEqual([{ status: 'publicado' }, { id: 'a2' }])
  })

  it('null si no existe', async () => {
    expect(await getArticlePreview('nada')).toBeNull()
    expect(mocks.articleFindMany).not.toHaveBeenCalled()
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

  it('un título sin letras latinas cae en la raíz de respaldo también al sufijar', async () => {
    mocks.articleFindFirst.mockResolvedValueOnce({ id: 'x' }).mockResolvedValue(null)

    await createArticle({ categoryId: 'c1', title: 'Καλημέρα', body: 'texto' })

    expect(mocks.articleCreate.mock.calls[0][0].data.slug).toBe('articulo-2')
  })

  it('sella la fecha al crear ya publicado', async () => {
    await createArticle({ categoryId: 'c1', title: 'Ya', body: 'texto', status: 'publicado' })

    expect(mocks.articleCreate.mock.calls[0][0].data.publishedAt).toBeInstanceOf(Date)
  })

  it('nace para el profesorado y como guía', async () => {
    await createArticle({ categoryId: 'c1', title: 'Guía', body: 'texto' })

    const { data } = mocks.articleCreate.mock.calls[0][0]
    expect(data.audience).toBe('profesor')
    expect(data.kind).toBe('guia')
    expect(data.videoUrl).toBeNull()
  })

  it('guarda audiencia, tipo y URL de vídeo', async () => {
    await createArticle({
      categoryId: 'c1',
      title: 'Vídeo',
      body: 'texto',
      audience: 'alumno',
      kind: 'video',
      videoUrl: 'https://vimeo.com/1',
    })

    const { data } = mocks.articleCreate.mock.calls[0][0]
    expect(data.audience).toBe('alumno')
    expect(data.kind).toBe('video')
    expect(data.videoUrl).toBe('https://vimeo.com/1')
  })

  it('vacía la URL si no es vídeo', async () => {
    await createArticle({
      categoryId: 'c1',
      title: 'Guía',
      body: 'texto',
      kind: 'guia',
      videoUrl: 'https://vimeo.com/1',
    })

    expect(mocks.articleCreate.mock.calls[0][0].data.videoUrl).toBeNull()
  })

  it('un vídeo puede guardarse en borrador sin URL', async () => {
    await createArticle({ categoryId: 'c1', title: 'Vídeo', body: 'texto', kind: 'video' })

    const { data } = mocks.articleCreate.mock.calls[0][0]
    expect(data.kind).toBe('video')
    expect(data.videoUrl).toBeNull()
  })

  it('un vídeo no se publica sin URL', async () => {
    await expect(
      createArticle({ categoryId: 'c1', title: 'Vídeo', body: 'texto', kind: 'video', status: 'publicado' })
    ).rejects.toThrow(ValidationError)
    expect(mocks.articleCreate).not.toHaveBeenCalled()
  })
})

describe('updateArticle', () => {
  const current = {
    id: 'a1',
    categoryId: 'c1',
    slug: 'titulo-viejo',
    title: 'Título viejo',
    locale: 'es',
    status: 'borrador' as const,
    publishedAt: null,
    audience: 'profesor' as const,
    kind: 'guia' as const,
    videoUrl: null,
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

  it('retirado y con fecha de publicación, el slug tampoco cambia', async () => {
    mocks.articleFindUnique.mockResolvedValue({
      ...current,
      status: 'borrador',
      publishedAt: new Date('2026-01-01'),
    })

    await updateArticle('a1', { title: 'Título nuevo' })

    expect(mocks.articleUpdate.mock.calls[0][0].data.slug).toBeUndefined()
  })

  it('al cambiar de categoría conserva el slug si está libre en la nueva', async () => {
    mocks.articleFindUnique.mockResolvedValue({ ...current, status: 'publicado', publishedAt: new Date() })

    await updateArticle('a1', { categoryId: 'c2' })

    const patch = mocks.articleUpdate.mock.calls[0][0].data
    expect(patch.category).toEqual({ connect: { id: 'c2' } })
    expect(patch.slug).toBe('titulo-viejo')
    expect(mocks.articleFindFirst.mock.calls[0][0].where).toMatchObject({
      categoryId: 'c2',
      slug: 'titulo-viejo',
      NOT: { id: 'a1' },
    })
  })

  it('un publicado que cambia de categoría y trae título conserva su slug', async () => {
    mocks.articleFindUnique.mockResolvedValue({ ...current, status: 'publicado', publishedAt: new Date() })

    await updateArticle('a1', { title: 'Título distinto', categoryId: 'c2' })

    expect(mocks.articleUpdate.mock.calls[0][0].data.slug).toBe('titulo-viejo')
    expect(mocks.articleFindFirst.mock.calls[0][0].where).toMatchObject({ categoryId: 'c2', slug: 'titulo-viejo' })
  })

  it('al volver a una categoría donde está libre, un publicado recupera su slug sin el sufijo', async () => {
    mocks.articleFindUnique.mockResolvedValue({
      ...current,
      slug: 'titulo-viejo-2',
      status: 'publicado',
      publishedAt: new Date(),
    })
    // La raíz sigue ocupada en el origen: el sufijo lo puso un choque.
    mocks.articleFindFirst.mockResolvedValueOnce({ id: 'a9' })

    await updateArticle('a1', { categoryId: 'c2' })

    expect(mocks.articleFindFirst.mock.calls[0][0].where).toEqual({
      categoryId: 'c1',
      locale: 'es',
      slug: 'titulo-viejo',
      NOT: { id: 'a1' },
    })
    expect(mocks.articleUpdate.mock.calls[0][0].data.slug).toBe('titulo-viejo')
  })

  it('al mover conserva un número final que venía del título original', async () => {
    // Publicado como «Guía 2026» y retitulado después a «Guía»: nadie ocupa
    // «guia» en el origen, así que el «-2026» no es un sufijo de choque.
    mocks.articleFindUnique.mockResolvedValue({
      ...current,
      title: 'Guía',
      slug: 'guia-2026',
      status: 'publicado',
      publishedAt: new Date(),
    })

    await updateArticle('a1', { categoryId: 'c2' })

    expect(mocks.articleUpdate.mock.calls[0][0].data.slug).toBe('guia-2026')
  })

  it('al mover no se toca un slug que no sale del título actual', async () => {
    mocks.articleFindUnique.mockResolvedValue({
      ...current,
      title: 'Paso 2',
      slug: 'paso-2',
      status: 'publicado',
      publishedAt: new Date(),
    })

    await updateArticle('a1', { categoryId: 'c2' })

    expect(mocks.articleUpdate.mock.calls[0][0].data.slug).toBe('paso-2')
  })

  it('al cambiar de categoría un publicado recibe sufijo si el slug ya existe allí', async () => {
    mocks.articleFindUnique.mockResolvedValue({ ...current, status: 'publicado', publishedAt: new Date() })
    mocks.articleFindFirst.mockResolvedValueOnce({ id: 'a9' }).mockResolvedValue(null)

    await updateArticle('a1', { categoryId: 'c2' })

    expect(mocks.articleUpdate.mock.calls[0][0].data.slug).toBe('titulo-viejo-2')
  })

  it('un id inexistente lanza NotFoundError y no actualiza nada', async () => {
    await expect(updateArticle('nada', { title: 'X' })).rejects.toBeInstanceOf(NotFoundError)
    expect(mocks.articleUpdate).not.toHaveBeenCalled()
  })

  it('al cambiar de categoría sin orden explícito pasa al final de la nueva', async () => {
    mocks.articleFindUnique.mockResolvedValue({ ...current, orderIndex: 0 })
    // La primera búsqueda es la del slug (libre); la segunda, el último de la categoría.
    mocks.articleFindFirst.mockResolvedValueOnce(null).mockResolvedValueOnce({ orderIndex: 4 })

    await updateArticle('a1', { categoryId: 'c2' })

    expect(mocks.articleUpdate.mock.calls[0][0].data.orderIndex).toBe(5)
    expect(mocks.articleFindFirst.mock.calls[1][0].where).toEqual({ categoryId: 'c2' })
  })

  it('al cambiar de categoría con orden explícito lo respeta', async () => {
    mocks.articleFindUnique.mockResolvedValue({ ...current, orderIndex: 0 })

    await updateArticle('a1', { categoryId: 'c2', orderIndex: 2 })

    expect(mocks.articleUpdate.mock.calls[0][0].data.orderIndex).toBe(2)
    // Solo la búsqueda del slug: no consulta el último de la categoría.
    expect(mocks.articleFindFirst).toHaveBeenCalledTimes(1)
  })

  it('sin cambio de categoría no recalcula el orden', async () => {
    mocks.articleFindUnique.mockResolvedValue(current)

    await updateArticle('a1', { categoryId: 'c1', summary: 'Otro' })

    expect(mocks.articleUpdate.mock.calls[0][0].data.orderIndex).toBeUndefined()
  })

  it('al mover, un título sin letras latinas retira el sufijo de la raíz de respaldo', async () => {
    mocks.articleFindUnique.mockResolvedValue({
      ...current,
      title: 'Οδηγός',
      slug: 'articulo-2',
      status: 'publicado',
      publishedAt: new Date(),
    })
    mocks.articleFindFirst.mockResolvedValueOnce({ id: 'a9' })

    await updateArticle('a1', { categoryId: 'c2' })

    expect(mocks.articleUpdate.mock.calls[0][0].data.slug).toBe('articulo')
  })

  it('al mover, un título sin letras latinas conserva un slug que no es la raíz con sufijo', async () => {
    mocks.articleFindUnique.mockResolvedValue({
      ...current,
      title: 'Οδηγός',
      slug: 'articulo-guia',
      status: 'publicado',
      publishedAt: new Date(),
    })

    await updateArticle('a1', { categoryId: 'c2' })

    expect(mocks.articleUpdate.mock.calls[0][0].data.slug).toBe('articulo-guia')
  })

  it('en borrador, cambiar título y categoría a la vez usa el título nuevo en la categoría nueva', async () => {
    mocks.articleFindUnique.mockResolvedValue(current)

    await updateArticle('a1', { title: 'Título nuevo', categoryId: 'c2' })

    expect(mocks.articleUpdate.mock.calls[0][0].data.slug).toBe('titulo-nuevo')
    expect(mocks.articleFindFirst.mock.calls[0][0].where).toMatchObject({
      categoryId: 'c2',
      slug: 'titulo-nuevo',
      NOT: { id: 'a1' },
    })
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

  it('incluye audiencia, tipo y vídeo en el parche', async () => {
    mocks.articleFindUnique.mockResolvedValue(current)

    await updateArticle('a1', {
      audience: 'ambos',
      kind: 'video',
      videoUrl: 'https://vimeo.com/2',
    })

    const patch = mocks.articleUpdate.mock.calls[0][0].data
    expect(patch.audience).toBe('ambos')
    expect(patch.kind).toBe('video')
    expect(patch.videoUrl).toBe('https://vimeo.com/2')
  })

  it('null vacía videoUrl', async () => {
    mocks.articleFindUnique.mockResolvedValue({
      ...current,
      kind: 'video',
      videoUrl: 'https://vimeo.com/2',
    })

    await updateArticle('a1', { videoUrl: null })

    const patch = mocks.articleUpdate.mock.calls[0][0].data
    expect(patch.videoUrl).toBeNull()
  })

  it('null vacía el resumen', async () => {
    mocks.articleFindUnique.mockResolvedValue({ ...current, summary: 'Resumen viejo' })

    await updateArticle('a1', { summary: null })

    expect(mocks.articleUpdate.mock.calls[0][0].data.summary).toBeNull()
  })

  it('no toca audiencia ni tipo si no vienen', async () => {
    mocks.articleFindUnique.mockResolvedValue(current)

    await updateArticle('a1', { title: 'Otro' })

    const patch = mocks.articleUpdate.mock.calls[0][0].data
    expect(patch.audience).toBeUndefined()
    expect(patch.kind).toBeUndefined()
  })

  it('publicar un vídeo sin URL falla aunque solo cambie el estado', async () => {
    mocks.articleFindUnique.mockResolvedValue({ ...current, kind: 'video', videoUrl: null })

    await expect(updateArticle('a1', { status: 'publicado' })).rejects.toThrow(ValidationError)
    expect(mocks.articleUpdate).not.toHaveBeenCalled()
  })

  it('publicar con URL ya guardada pasa', async () => {
    mocks.articleFindUnique.mockResolvedValue({
      ...current,
      kind: 'video',
      videoUrl: 'https://vimeo.com/3',
    })

    await updateArticle('a1', { status: 'publicado' })

    const patch = mocks.articleUpdate.mock.calls[0][0].data
    expect(patch.status).toBe('publicado')
    expect(patch.videoUrl).toBe('https://vimeo.com/3')
  })

  it('cambiar el tipo a algo que no es vídeo vacía la URL guardada', async () => {
    mocks.articleFindUnique.mockResolvedValue({
      ...current,
      kind: 'video',
      videoUrl: 'https://vimeo.com/3',
    })

    await updateArticle('a1', { kind: 'faq' })

    expect(mocks.articleUpdate.mock.calls[0][0].data.videoUrl).toBeNull()
  })
})

describe('listArticles', () => {
  it('filtra por audiencia y tipo', async () => {
    await listArticles({ audience: 'alumno', kind: 'faq' })

    const where = mocks.articleFindMany.mock.calls[0][0].where
    expect(where.audience).toBe('alumno')
    expect(where.kind).toBe('faq')
  })

  it('filtra el área a través de la categoría', async () => {
    await listArticles({ area: 'blog' })

    expect(mocks.articleFindMany.mock.calls[0][0].where.category.area).toBe('blog')
  })

  it('sin filtros no añade condiciones', async () => {
    await listArticles()

    expect(mocks.articleFindMany.mock.calls[0][0].where).toEqual({})
  })
})

describe('categorías', () => {
  it('nace en el área de ayuda con acento stats', async () => {
    await createCategory({ name: 'Novedades' })

    const { data } = mocks.categoryCreate.mock.calls[0][0]
    expect(data.area).toBe('ayuda')
    expect(data.accent).toBe('stats')
    expect(data.slug).toBe('novedades')
  })

  it('respeta el área y el acento que le llegan', async () => {
    await createCategory({ name: 'Blog', area: 'blog', accent: 'ia' })

    const { data } = mocks.categoryCreate.mock.calls[0][0]
    expect(data.area).toBe('blog')
    expect(data.accent).toBe('ia')
  })

  it('no permite los slugs reservados', async () => {
    await createCategory({ name: 'Profesor' })

    expect(mocks.categoryCreate.mock.calls[0][0].data.slug).toBe('profesor-2')
  })

  it('un nombre sin letras latinas cae en la raíz de respaldo también al sufijar', async () => {
    mocks.categoryFindUnique.mockResolvedValueOnce({ id: 'c0', slug: 'categoria' }).mockResolvedValue(null)

    await createCategory({ name: 'Καλημέρα' })

    expect(mocks.categoryCreate.mock.calls[0][0].data.slug).toBe('categoria-2')
  })

  it('reorderCategories cambia solo el orden, en una sentencia y sin tocar la fecha', async () => {
    mocks.$executeRaw.mockResolvedValueOnce(3)
    const result = await reorderCategories(['c3', 'c1', 'c2'])

    expect(mocks.$executeRaw).toHaveBeenCalledTimes(1)
    const { strings, values } = flattenQuery(mocks.$executeRaw.mock.calls[0])
    const sql = strings.join('?')
    expect(sql).toContain('"help_categories"')
    expect(sql).toContain('"order_index"')
    expect(sql).not.toMatch(/updated_?at/i)
    expect(values).toEqual(['c3', 0, 'c1', 1, 'c2', 2])
    expect(mocks.categoryUpdate).not.toHaveBeenCalled()
    expect(result).toEqual({ success: true, total: 3 })
  })

  it('reorderCategories no consulta con la lista vacía', async () => {
    await reorderCategories([])
    expect(mocks.$executeRaw).not.toHaveBeenCalled()
  })

  it('reorderCategories cuenta solo las filas movidas', async () => {
    mocks.$executeRaw.mockResolvedValueOnce(2)
    const result = await reorderCategories(['c1', 'c2', 'no-existe'])
    expect(result).toEqual({ success: true, total: 2 })
  })
})

describe('reorderArticles', () => {
  it('reordena solo dentro de su categoría y sin tocar la fecha de actualización', async () => {
    mocks.$executeRaw.mockResolvedValueOnce(2)
    const result = await reorderArticles('cat-1', ['a2', 'a1'])

    expect(mocks.$executeRaw).toHaveBeenCalledTimes(1)
    const { strings, values } = flattenQuery(mocks.$executeRaw.mock.calls[0])
    const sql = strings.join('?')
    expect(sql).toContain('"help_articles"')
    expect(sql).toContain('"order_index"')
    expect(sql).toContain('"category_id"')
    expect(sql).not.toMatch(/updated_?at/i)
    expect(values).toEqual(['a2', 0, 'a1', 1, 'cat-1'])
    expect(mocks.articleUpdate).not.toHaveBeenCalled()
    expect(result).toEqual({ success: true, categoryId: 'cat-1', total: 2 })
  })

  it('no consulta con la lista vacía', async () => {
    const result = await reorderArticles('cat-1', [])
    expect(mocks.$executeRaw).not.toHaveBeenCalled()
    expect(result).toEqual({ success: true, categoryId: 'cat-1', total: 0 })
  })

  it('un id de otra categoría no cuenta en el total', async () => {
    mocks.$executeRaw.mockResolvedValueOnce(1)
    const result = await reorderArticles('cat-1', ['a1', 'ajeno'])
    expect(result).toEqual({ success: true, categoryId: 'cat-1', total: 1 })
  })

  it('con una categoría que no existe responde no encontrado', async () => {
    mocks.$executeRaw.mockResolvedValueOnce(0)
    mocks.categoryFindUnique.mockResolvedValueOnce(null)
    await expect(reorderArticles('no-existe', ['a1'])).rejects.toThrow(NotFoundError)
  })

  it('con una categoría existente y ningún id suyo no falla', async () => {
    mocks.$executeRaw.mockResolvedValueOnce(0)
    mocks.categoryFindUnique.mockResolvedValueOnce({ id: 'cat-1' })
    const result = await reorderArticles('cat-1', ['ajeno'])
    expect(result).toEqual({ success: true, categoryId: 'cat-1', total: 0 })
  })
})

describe('saveHelpImage', () => {
  const payload = Buffer.from('imagen').toString('base64')

  it('rechaza SVG sin llegar a guardar nada', async () => {
    await expect(saveHelpImage(`data:image/svg+xml;base64,${payload}`)).rejects.toThrow()
    expect(saveUpload).not.toHaveBeenCalled()
  })

  it('rechaza HTML y textos que no son data URL', async () => {
    await expect(saveHelpImage(`data:text/html;base64,${payload}`)).rejects.toThrow()
    await expect(saveHelpImage('https://ejemplo.test/foto.png')).rejects.toThrow()
    expect(saveUpload).not.toHaveBeenCalled()
  })

  it('guarda un JPEG con extensión .jpg y su tipo', async () => {
    const url = await saveHelpImage(`data:image/jpeg;base64,${payload}`)

    expect(saveUpload).toHaveBeenCalledWith(
      expect.stringMatching(/^help\/[0-9a-f-]+\.jpg$/),
      Buffer.from('imagen'),
      'image/jpeg'
    )
    expect(url).toMatch(/^\/uploads\/help\//)
  })
})
