import { prisma } from '../src/config/database.js'
import { HELP_ARTICLES, HELP_CATEGORIES } from './help-content.js'

/**
 * Carga el contenido inicial del centro de ayuda (Fase 3, punto 17).
 *
 * Es **idempotente y no destructivo**: se puede volver a pasar tantas veces
 * como haga falta. Crea lo que no existe y deja intacto lo que ya está, porque
 * a partir del primer despliegue la verdad de un artículo es lo que haya
 * escrito quien lo edite desde el panel, no este fichero.
 *
 * Con `--force` sí se sobrescribe el contenido con el del repositorio, que es
 * lo que se quiere al corregir una errata en varios artículos a la vez.
 *
 *   pnpm db:seed:help            → crea lo que falte
 *   pnpm db:seed:help --force    → además reescribe lo existente
 */

const force = process.argv.includes('--force')

async function main() {
  const categoryIds = new Map<string, string>()

  for (const [index, seed] of HELP_CATEGORIES.entries()) {
    const category = await prisma.helpCategory.upsert({
      where: { slug: seed.slug },
      create: {
        slug: seed.slug,
        name: seed.name,
        description: seed.description,
        icon: seed.icon,
        accent: seed.accent,
        orderIndex: index,
      },
      // Los datos de la categoría (nombre, icono, orden) sí se refrescan: son
      // estructura, no contenido redactado.
      update: {
        name: seed.name,
        description: seed.description,
        icon: seed.icon,
        accent: seed.accent,
        orderIndex: index,
      },
    })
    categoryIds.set(seed.slug, category.id)
  }

  let creados = 0
  let actualizados = 0
  let intactos = 0

  const porCategoria = new Map<string, number>()

  for (const seed of HELP_ARTICLES) {
    const categoryId = categoryIds.get(seed.category)
    if (!categoryId) {
      console.warn(`[ayuda] categoría desconocida «${seed.category}» en «${seed.slug}», se salta`)
      continue
    }

    const orderIndex = porCategoria.get(seed.category) ?? 0
    porCategoria.set(seed.category, orderIndex + 1)

    const existing = await prisma.helpArticle.findFirst({
      where: { categoryId, slug: seed.slug, locale: 'es' },
      select: { id: true },
    })

    if (!existing) {
      await prisma.helpArticle.create({
        data: {
          categoryId,
          slug: seed.slug,
          title: seed.title,
          summary: seed.summary,
          coverImage: seed.cover,
          body: seed.body,
          locale: 'es',
          status: 'publicado',
          featured: seed.featured ?? false,
          orderIndex,
          publishedAt: new Date(),
        },
      })
      creados += 1
      continue
    }

    if (!force) {
      intactos += 1
      continue
    }

    await prisma.helpArticle.update({
      where: { id: existing.id },
      data: {
        title: seed.title,
        summary: seed.summary,
        coverImage: seed.cover,
        body: seed.body,
        featured: seed.featured ?? false,
        orderIndex,
      },
    })
    actualizados += 1
  }

  console.log(
    `[ayuda] ${HELP_CATEGORIES.length} categorías · ${creados} artículos creados` +
      `${actualizados ? `, ${actualizados} reescritos` : ''}` +
      `${intactos ? `, ${intactos} intactos (usa --force para sobrescribir)` : ''}`
  )
}

main()
  .catch(error => {
    console.error('[ayuda] no se pudo cargar el contenido:', error)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
