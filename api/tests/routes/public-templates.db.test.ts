import { it, expect, beforeAll, afterAll, beforeEach } from 'vitest'
import { describeWithDatabase } from '../helpers/test-db.js'
import { randomUUID } from 'node:crypto'
import type { FastifyInstance } from 'fastify'

/**
 * Catálogo público de plantillas: se consulta sin sesión. El listado filtra
 * por metadatos (con varios valores por filtro), busca por el nombre sin
 * tildes, ordena y pagina en el servidor; la ficha da lo justo para decidir si
 * importarla: sus misiones resumidas (título, rareza, cuántos enigmas y lo que
 * dan), su tienda y sus comportamientos. Ninguno de los dos dice nada de quien
 * la publicó ni da la configuración tal cual o más ids que el de la plantilla,
 * y la portada solo sale si es un fichero público de la plataforma. Un enlace a
 * una plantilla que se retiró o cuya clase se archivó da 410; uno a algo que
 * nunca fue plantilla, 404, exista o no. Las dos rutas tienen un límite por
 * origen.
 *
 * El catálogo del profesorado usa la misma consulta y responde como siempre;
 * su ficha trae además las mismas misiones que la pública.
 *
 * Usa Fastify, JWT, servicios y Postgres de verdad: necesita TEST_DATABASE_URL
 * (ver tests/helpers/test-db.ts). Las plantillas llevan la etiqueta de esta
 * ejecución en el nombre y las búsquedas se acotan con ella: otros tests pueden
 * estar publicando plantillas a la vez en la misma base.
 */

import {
  buildApp,
  createClassFixture,
  prisma,
  type ClassFixture,
} from '../helpers/class-fixture.js'
import { teacherRoutes } from '../../src/modules/teachers/teachers.routes.js'
import {
  publicTemplateRoutes,
  PUBLIC_TEMPLATES_LIMIT,
  PUBLIC_TEMPLATES_MAX_PAGE_SIZE,
  PUBLIC_TEMPLATES_PAGE_SIZE,
} from '../../src/modules/templates/templates.routes.js'
import {
  EXCERPT_LENGTH,
  EXCERPT_SOURCE_LENGTH,
  narrativeExcerpt,
} from '../../src/modules/templates/templates.service.js'
import { recordRateLimit, resetRateLimits } from '../../src/utils/rate-limit.js'
import { createClassWithOwner, type NewClassData } from '../../src/utils/class-owner.js'
import { MISSION_COMPLETION_BONUS } from '../../src/utils/xp-calculator.js'

/** Lo único que lleva el listado público, arriba y en cada tarjeta. */
const LIST_KEYS = ['limit', 'page', 'templates', 'total', 'totalPages']
const CARD_KEYS = [
  'backgroundImage',
  'behaviorCount',
  'educationLevel',
  'excerpt',
  'features',
  'id',
  'language',
  'missionCount',
  'name',
  'province',
  'shopItemCount',
  'subject',
]
/** Lo único que lleva la ficha pública. */
const DETAIL_KEYS = [
  'backgroundImage',
  'behaviorCount',
  'behaviorTemplates',
  'educationLevel',
  'features',
  'id',
  'language',
  'missionCount',
  'missions',
  'name',
  'narrative',
  'province',
  'shopItemCount',
  'shopItems',
  'subject',
]
/** Lo único que lleva cada misión, objeto y comportamiento de la ficha pública. */
const MISSION_KEYS = ['coinReward', 'enigmasCount', 'manaReward', 'rarity', 'title', 'xpReward']
const SHOP_ITEM_KEYS = [
  'active',
  'description',
  'kind',
  'lifeRestore',
  'manaCost',
  'name',
  'price',
  'usage',
]
const BEHAVIOR_KEYS = ['coinDelta', 'description', 'kind', 'lifeDelta', 'name', 'xpDelta']
/** Lo que no puede salir nunca en público. */
const PRIVATE_KEYS = ['isOwn', 'teacherName', 'teacherId', 'teacher', 'settings']

/** Lo que devuelve el catálogo del profesorado, como antes del catálogo público. */
const TEACHER_CARD_KEYS = [
  'backgroundImage',
  'educationLevel',
  'id',
  'isOwn',
  'language',
  'missionCount',
  'name',
  'narrative',
  'province',
  'subject',
  'teacherName',
]
const TEACHER_DETAIL_KEYS = [
  'backgroundImage',
  'behaviorTemplates',
  'id',
  'isOwn',
  'missions',
  'name',
  'narrative',
  'settings',
  'shopItems',
  'teacherName',
]

const sorted = (keys: string[]) => [...keys].sort()

describeWithDatabase('catálogo público de plantillas', () => {
  let app: FastifyInstance
  let f: ClassFixture
  const tag = randomUUID().slice(0, 8)
  /** Una palabra que solo está en una narrativa de esta ejecución, no en su nombre. */
  const blackberry = `zarzamora${tag.replace(/\d/g, '')}`
  /** Portadas: una de la plataforma, y lo que no debe salir en público. */
  const cover = `/uploads/covers/${tag}.png`
  const covers = {
    outside: 'https://rastreador.invalid/pixel.gif',
    private: `/uploads/submissions/${tag}.pdf`,
    css: '/uploads/covers/x.png), url(https://rastreador.invalid/pixel.gif',
  }

  let ownerName: string
  /** Las plantillas disponibles de esta ejecución, por su papel en las pruebas. */
  const t = {} as Record<'maths' | 'physics' | 'wood' | 'short' | 'percent', string>
  let archivedId: string
  let retiredId: string
  let privateId: string

  /**
   * Lo de las misiones, los objetos y los comportamientos de la primera que no
   * sale en ninguna ficha: textos, fechas, ficheros e ids.
   */
  const hidden = {
    missionDescription: `Descubre quién se llevó el mapa ${tag}`,
    deadline: new Date('2031-05-20T10:00:00.000Z'),
    missionCover: `/uploads/covers/mision-${tag}.png`,
    enigmaTitle: `Enigma secreto ${tag}`,
    documentName: `Apuntes ${tag}`,
    documentUrl: `/uploads/documents/${tag}.pdf`,
    badgeName: `Cartógrafa ${tag}`,
    ids: [] as string[],
  }

  const T1_NARRATIVE = [
    '# El Legado de los Archivos',
    '',
    'Bienvenidos a la **Academia de las Sombras**, un lugar donde el conocimiento es el combustible del mundo. Consulta [el mapa](https://example.invalid/mapa) antes de empezar.',
    '',
    '- **Casa del Valor:** exploradores que lideran ante la incertidumbre.',
    '- *Casa del Ingenio:* estrategas que encuentran salida donde otros no la ven.',
    '',
    '---',
    '',
    'Cada misión superada suma puntos de esencia para tu casa y desbloquea grimorios.',
  ].join('\n')

  const newClass = (data: Omit<NewClassData, 'invitationCode'>) =>
    prisma.$transaction(tx =>
      createClassWithOwner(
        tx,
        { ...data, invitationCode: randomUUID().slice(0, 6).toUpperCase() },
        f.users.owner.id
      )
    )

  /** Una plantilla publicada de esta ejecución. */
  const newTemplate = async (
    label: string,
    meta: Pick<NewClassData, 'subject' | 'educationLevel' | 'language' | 'province'>,
    extra: Partial<NewClassData> = {}
  ) =>
    (await newClass({ name: `Plantilla ${tag} ${label}`, isTemplate: true, ...meta, ...extra })).id

  /** Sin `actor`, sin sesión; sin `remoteAddress`, desde 127.0.0.1. */
  const get = (url: string, options: { remoteAddress?: string; actor?: 'owner' | 'other' } = {}) =>
    app.inject({
      method: 'GET',
      url,
      ...(options.remoteAddress ? { remoteAddress: options.remoteAddress } : {}),
      headers: options.actor ? { authorization: `Bearer ${f.token(options.actor)}` } : {},
    })

  /** El listado público con estos parámetros (los que se repiten, en array). */
  const list = async (params: Record<string, string | string[]>) => {
    const query = new URLSearchParams()
    for (const [key, value] of Object.entries(params)) {
      for (const one of Array.isArray(value) ? value : [value]) query.append(key, one)
    }
    const response = await get(`/public/templates?${query}`)
    expect(response.statusCode).toBe(200)
    return response.json() as {
      templates: Array<Record<string, unknown> & { id: string }>
      total: number
      page: number
      limit: number
      totalPages: number
    }
  }

  const ids = (body: { templates: { id: string }[] }) => body.templates.map(tpl => tpl.id).sort()

  const publish = (classId: string, publish: boolean) =>
    app.inject({
      method: 'POST',
      url: `/teacher/classes/${classId}/publish-template`,
      payload: { publish },
      headers: { authorization: `Bearer ${f.token('owner')}` },
    })

  beforeAll(async () => {
    app = await buildApp(async instance => {
      await instance.register(teacherRoutes, { prefix: '/teacher' })
      await instance.register(publicTemplateRoutes, { prefix: '/public/templates' })
    })
    f = await createClassFixture(app)
    ownerName = (await prisma.user.findUniqueOrThrow({ where: { id: f.users.owner.id } })).name

    // Una tras otra: el orden del catálogo es el de la última tocada. Las
    // etiquetas empiezan por mayúscula, por minúscula y por letra con tilde,
    // que la colación de la base ordenaría por bytes.
    t.maths = await newTemplate(
      'matemáticas',
      {
        subject: 'Matemáticas',
        educationLevel: 'Educación Secundaria (ESO)',
        language: 'Castellano',
        province: 'Valencia',
      },
      {
        narrative: T1_NARRATIVE,
        settings: { mana: false, sounds: false },
        backgroundImage: cover,
      }
    )
    t.physics = await newTemplate(
      'Física',
      {
        subject: 'Física y Química',
        educationLevel: 'Bachillerato',
        language: 'Català',
        province: 'Barcelona',
      },
      // Sin tienda: las monedas van con ella y el maná la necesita.
      {
        narrative: `Un laboratorio de ${blackberry} y probetas.`,
        settings: { shop: false },
        backgroundImage: covers.outside,
      }
    )
    t.wood = await newTemplate(
      'Ébano',
      {
        subject: 'Madera, Mueble y Corcho',
        educationLevel: 'FP de Grado Medio',
        language: 'Euskara',
        province: null,
      },
      { backgroundImage: covers.css }
    )
    t.short = await newTemplate(
      'corta',
      {
        subject: 'Matemáticas',
        educationLevel: 'Bachillerato',
        language: 'Castellano',
        province: 'Madrid',
      },
      { narrative: 'Una historia corta.', backgroundImage: covers.private }
    )
    t.percent = await newTemplate('porcentaje al 100% de nivel_2', {
      subject: 'Lengua Castellana y Literatura',
      educationLevel: 'Educación Primaria',
      language: 'Galego',
      province: 'A Coruña',
    })

    // Contenido de la primera (con el maná apagado): dos misiones, tres objetos
    // y dos comportamientos. La segunda misión, la más reciente, lleva enigmas
    // con monedas y maná y todo lo que no sale en la ficha.
    const first = await prisma.mission.create({
      data: { classId: t.maths, title: 'Primera', createdAt: new Date('2026-01-01T09:00:00Z') },
    })
    const second = await prisma.mission.create({
      data: {
        classId: t.maths,
        title: 'Segunda',
        description: hidden.missionDescription,
        status: 'bloqueada',
        rarity: 'epica',
        deadline: hidden.deadline,
        backgroundImage: hidden.missionCover,
        createdAt: new Date('2026-01-02T09:00:00Z'),
      },
    })
    await prisma.missionEnigma.createMany({
      data: [
        {
          missionId: second.id,
          title: hidden.enigmaTitle,
          xpReward: 20,
          coinReward: 3,
          manaReward: 2,
          orderIndex: 0,
        },
        { missionId: second.id, title: 'Otro', xpReward: 40, coinReward: 4, orderIndex: 1 },
      ],
    })
    const document = await prisma.missionDocument.create({
      data: {
        missionId: second.id,
        name: hidden.documentName,
        fileUrl: hidden.documentUrl,
        fileName: `${tag}.pdf`,
        fileSize: 1,
        mimeType: 'application/pdf',
      },
    })
    const badge = await prisma.badge.create({
      data: { name: hidden.badgeName, teacherId: f.users.owner.id, missionId: second.id },
    })
    hidden.ids.push(first.id, second.id, document.id, badge.id)

    // Un objeto de cada tipo: una recompensa normal, un poder que devuelve una
    // vida y una recompensa de uso ilimitado oculta al alumnado.
    const items = [
      {
        name: 'Pergamino',
        description: 'Un rollo antiguo',
        price: 30,
        usage: 'unlimited',
        active: false,
      },
      { name: 'Pluma', price: 5 },
      { name: 'Capa', price: 12, kind: 'power', manaCost: 3, lifeRestore: 1 },
    ]
    for (const item of items) {
      hidden.ids.push((await prisma.shopItem.create({ data: { classId: t.maths, ...item } })).id)
    }
    const behaviors = [
      {
        kind: 'positive',
        name: 'Ayuda',
        description: 'Echa una mano',
        xpDelta: 5,
        coinDelta: 2,
      },
      // Lo que quita, en positivo: el signo lo pone `kind`, como al aplicarlo.
      { kind: 'negative', name: 'Interrumpe', xpDelta: 5, lifeDelta: 1 },
    ]
    for (const behavior of behaviors) {
      hidden.ids.push(
        (await prisma.behaviorTemplate.create({ data: { classId: t.maths, ...behavior } })).id
      )
    }

    // En la de física, sin tienda, una misión cuyas monedas y maná no cuentan.
    const lab = await prisma.mission.create({
      data: { classId: t.physics, title: 'Laboratorio', rarity: 'rara' },
    })
    await prisma.missionEnigma.create({
      data: { missionId: lab.id, title: 'Probeta', xpReward: 60, coinReward: 5, manaReward: 5 },
    })

    // Publicada y con la clase archivada después.
    archivedId = await newTemplate(
      'archivada',
      { subject: 'Matemáticas', educationLevel: 'Bachillerato', language: 'Castellano' },
      { archived: true }
    )

    // Publicada y retirada por su propietario, por la ruta de verdad (queda en el registro).
    retiredId = (
      await newClass({
        name: `Plantilla ${tag} retirada`,
        subject: 'Matemáticas',
        educationLevel: 'Bachillerato',
        language: 'Castellano',
      })
    ).id
    expect((await publish(retiredId, true)).statusCode).toBe(200)
    expect((await publish(retiredId, false)).statusCode).toBe(200)

    // Nunca publicada.
    privateId = (
      await newClass({
        name: `Plantilla ${tag} privada`,
        subject: 'Matemáticas',
        educationLevel: 'Bachillerato',
        language: 'Castellano',
      })
    ).id
  })

  beforeEach(() => resetRateLimits())

  afterAll(async () => {
    resetRateLimits()
    await f?.cleanup()
    await app?.close()
  })

  // ---- Listado ----

  it('sin sesión lista las disponibles, sin nada de quien las publicó', async () => {
    const response = await get(`/public/templates?q=${tag}`)
    expect(response.statusCode).toBe(200)
    const body = response.json()

    expect(sorted(Object.keys(body))).toEqual(LIST_KEYS)
    expect(ids(body)).toEqual(Object.values(t).sort())
    expect(body).toMatchObject({
      total: 5,
      page: 1,
      limit: PUBLIC_TEMPLATES_PAGE_SIZE,
      totalPages: 1,
    })
    for (const card of body.templates) {
      expect(sorted(Object.keys(card))).toEqual(CARD_KEYS)
      for (const key of PRIVATE_KEYS) expect(card).not.toHaveProperty(key)
    }
    // Ni el nombre ni la cuenta de quien la publicó, en ningún campo.
    expect(response.body).not.toContain(ownerName)
    expect(response.body).not.toContain(f.users.owner.id)

    expect(body.templates.find((card: { id: string }) => card.id === t.maths)).toMatchObject({
      name: `Plantilla ${tag} matemáticas`,
      subject: 'Matemáticas',
      educationLevel: 'Educación Secundaria (ESO)',
      language: 'Castellano',
      province: 'Valencia',
      backgroundImage: cover,
      features: { shop: true, mana: false, sounds: false },
      missionCount: 2,
      shopItemCount: 3,
      behaviorCount: 2,
    })
    // Lo que dicen los contadores depende de lo que va encendido, como en la ficha.
    const physics = body.templates.find((card: { id: string }) => card.id === t.physics)
    expect(physics.features).toMatchObject({ shop: false, coins: false, mana: false })
  })

  it('la portada solo sale si es un fichero público de la plataforma', async () => {
    const cards = new Map((await list({ q: tag })).templates.map(card => [card.id, card]))
    expect(cards.get(t.maths)!.backgroundImage).toBe(cover)
    // Una de fuera, una de una carpeta privada y una que se saldría del url(…) de CSS.
    for (const id of [t.physics, t.short, t.wood]) {
      expect(cards.get(id)!.backgroundImage, id).toBeNull()
      expect((await get(`/public/templates/${id}`)).json().backgroundImage, id).toBeNull()
    }

    // El catálogo del profesorado la sigue dando tal cual se guardó.
    const teacher = (await get(`/teacher/templates?q=${tag}`, { actor: 'other' })).json()
    const stored = new Map(
      teacher.templates.map((card: { id: string; backgroundImage: string | null }) => [
        card.id,
        card.backgroundImage,
      ])
    )
    expect(stored.get(t.physics)).toBe(covers.outside)
    expect(stored.get(t.short)).toBe(covers.private)
    expect(stored.get(t.wood)).toBe(covers.css)
  })

  it('no lista las retiradas, las archivadas ni las que nunca se publicaron', async () => {
    const listed = ids(await list({ q: tag }))
    for (const id of [retiredId, archivedId, privateId]) expect(listed).not.toContain(id)
  })

  it('de la narrativa, un extracto en texto plano, sin el título y cortado en un espacio', async () => {
    const cards = new Map((await list({ q: tag })).templates.map(card => [card.id, card]))

    const excerpt = cards.get(t.maths)!.excerpt as string
    expect(excerpt.startsWith('Bienvenidos a la Academia de las Sombras, un lugar')).toBe(true)
    expect(excerpt).toContain('Consulta el mapa antes de empezar')
    expect(excerpt).not.toMatch(/[#*_[\]()]|https?:|\n/)
    expect(excerpt.endsWith('…')).toBe(true)
    expect(Array.from(excerpt).length).toBeLessThanOrEqual(EXCERPT_LENGTH + 1)
    // Cortado en un espacio: lo que queda antes de «…» es el principio de la narrativa.
    expect(T1_NARRATIVE.replace(/\*\*/g, '')).toContain(excerpt.slice(0, 60))

    expect(cards.get(t.short)!.excerpt).toBe('Una historia corta.')
    expect(cards.get(t.wood)!.excerpt).toBeNull()

    // Si solo hay títulos, el título; una lista, sin viñetas; un emoji no se parte.
    expect(narrativeExcerpt('# Solo un título')).toBe('Solo un título')
    expect(narrativeExcerpt('1. Uno\n2. *Dos*\n- Tres')).toBe('Uno Dos Tres')
    const emojis = narrativeExcerpt('🐉'.repeat(EXCERPT_LENGTH + 10))!
    expect(Array.from(emojis)).toHaveLength(EXCERPT_LENGTH + 1)
    expect(emojis).not.toMatch(/[\uD800-\uDBFF](?![\uDC00-\uDFFF])/)
  })

  it('el extracto no se come lo que solo parece una marca', () => {
    // Un < o un > que no abren una etiqueta, un año al principio y un * o un _ que no son énfasis.
    expect(narrativeExcerpt('Si tu nota es < 5 repites; si es > 8, <b>insignia</b>.')).toBe(
      'Si tu nota es < 5 repites; si es > 8, insignia.'
    )
    expect(narrativeExcerpt('¡Os quiero <3! Cada misión > la anterior.')).toBe(
      '¡Os quiero <3! Cada misión > la anterior.'
    )
    expect(narrativeExcerpt('2084. La nave despega rumbo a Marte.')).toBe(
      '2084. La nave despega rumbo a Marte.'
    )
    expect(narrativeExcerpt('La variable mi_variable vale 2 * 3, ~~no~~ `4`.')).toBe(
      'La variable mi_variable vale 2 * 3, no 4.'
    )
    // Un enlace con paréntesis en la dirección o con título, por su texto; una tabla, sin barras.
    expect(narrativeExcerpt('Zarpad hacia [Ítaca](https://ejemplo.invalid/Ítaca_(isla)).')).toBe(
      'Zarpad hacia Ítaca.'
    )
    expect(narrativeExcerpt('Mirad [el mapa](https://ejemplo.invalid/m "Mapa") antes.')).toBe(
      'Mirad el mapa antes.'
    )
    expect(narrativeExcerpt('| Casa | Color |\n| :--- | ---: |\n| Valor | Rojo |')).toBe(
      'Casa Color Valor Rojo'
    )
  })

  it('el extracto sale enseguida aunque la narrativa sea enorme y rebuscada', () => {
    // Sin cierre de corchete, de ángulo o de paréntesis, o con muchas líneas en
    // blanco: con expresiones que rebuscan hasta el final, cada una tardaba
    // segundos en una narrativa de 80 kB.
    const size = 200_000
    const narratives = [
      'a' + '!['.repeat(size / 2),
      'a' + '['.repeat(size),
      'a' + '<'.repeat(size),
      '[a]('.repeat(size / 4),
      'a' + '\n '.repeat(size / 2) + 'x',
      '*'.repeat(size) + ' x',
    ]
    const start = performance.now()
    for (const narrative of narratives) narrativeExcerpt(narrative)
    expect(performance.now() - start).toBeLessThan(500)

    // Solo cuenta el principio: lo que viene detrás no llega al extracto.
    const late = '# Título\n'.repeat(Math.ceil(EXCERPT_SOURCE_LENGTH / 9)) + 'Prosa del final.'
    expect(narrativeExcerpt(late)).not.toContain('Prosa del final')
  })

  it('una narrativa enorme y rebuscada no frena el listado', async () => {
    const other = randomUUID().slice(0, 8)
    const id = (
      await newClass({
        name: `Enorme ${other}`,
        isTemplate: true,
        narrative: `Empieza así ${'['.repeat(300_000)}`,
      })
    ).id

    const start = performance.now()
    const body = await list({ q: `Enorme ${other}` })
    expect(performance.now() - start).toBeLessThan(2000)
    expect(ids(body)).toEqual([id])
    expect((body.templates[0].excerpt as string).startsWith('Empieza así [[[')).toBe(true)
  })

  it('filtra por cada metadato, con varios valores por filtro', async () => {
    const only = async (params: Record<string, string | string[]>) =>
      ids(await list({ ...params, q: tag }))

    expect(await only({ subject: 'Matemáticas' })).toEqual([t.maths, t.short].sort())
    expect(await only({ subject: ['Matemáticas', 'Física y Química'] })).toEqual(
      [t.maths, t.physics, t.short].sort()
    )
    // La coma es parte del valor: varios valores van con la clave repetida.
    expect(await only({ subject: 'Madera, Mueble y Corcho' })).toEqual([t.wood])
    expect(await only({ educationLevel: 'Bachillerato' })).toEqual([t.physics, t.short].sort())
    expect(await only({ language: 'Castellano' })).toEqual([t.maths, t.short].sort())
    expect(await only({ province: ['Valencia', 'Madrid'] })).toEqual([t.maths, t.short].sort())
    expect(await only({ subject: 'Matemáticas', educationLevel: 'Bachillerato' })).toEqual([
      t.short,
    ])
    // Un valor vacío no filtra.
    expect(await only({ subject: '' })).toHaveLength(5)

    // El total y las páginas son los de lo filtrado.
    const first = await list({ q: tag, subject: 'Matemáticas', limit: '1' })
    expect(first).toMatchObject({ total: 2, page: 1, limit: 1, totalPages: 2 })
    const second = await list({ q: tag, subject: 'Matemáticas', limit: '1', page: '2' })
    expect([...ids(first), ...ids(second)].sort()).toEqual([t.maths, t.short].sort())
  })

  it('busca en el nombre sin distinguir mayúsculas ni tildes, y % y _ tal cual', async () => {
    expect((await list({ q: `PLANTILLA ${tag.toUpperCase()}` })).total).toBe(5)
    expect(ids(await list({ q: `${tag} MATEMATICAS` }))).toEqual([t.maths])
    expect(ids(await list({ q: `${tag} ébano` }))).toEqual([t.wood])
    expect(ids(await list({ q: `${tag} fisica` }))).toEqual([t.physics])
    // Solo en el nombre, como el catálogo del profesorado en pantalla.
    expect(ids(await list({ q: blackberry }))).toEqual([])

    expect(ids(await list({ q: `${tag} porcentaje al 100%` }))).toEqual([t.percent])
    expect(ids(await list({ q: `de nivel_2` }))).toContain(t.percent)
    // Como comodines, los dos casarían con «… porcentaje al 100% de nivel_2».
    expect(ids(await list({ q: `${tag}%nivel` }))).toEqual([])
    expect(ids(await list({ q: `${tag} porcentaje al 100_` }))).toEqual([])
  })

  it('pagina en el servidor: total, páginas y sin solapes, en el orden del catálogo', async () => {
    const pages = []
    for (const page of [1, 2, 3]) {
      const body = await list({ q: tag, limit: '2', page: String(page) })
      expect(body).toMatchObject({ total: 5, page, limit: 2, totalPages: 3 })
      pages.push(...body.templates.map(card => card.id))
    }
    const expected = await prisma.class.findMany({
      where: { id: { in: Object.values(t) } },
      orderBy: [{ updatedAt: 'desc' }, { id: 'desc' }],
      select: { id: true },
    })
    expect(pages).toEqual(expected.map(c => c.id))

    // Más allá de la última, vacía y con el total de verdad.
    expect(await list({ q: tag, limit: '2', page: '4' })).toMatchObject({ templates: [], total: 5 })
    // Más de lo que se sirve, se recorta; lo que no es un número, lo de por defecto.
    expect((await list({ q: tag, limit: '1000' })).limit).toBe(PUBLIC_TEMPLATES_MAX_PAGE_SIZE)
    expect(await list({ q: tag, limit: 'muchas', page: '0' })).toMatchObject({
      page: 1,
      limit: PUBLIC_TEMPLATES_PAGE_SIZE,
    })
    // Una página desorbitada se queda en la última que se puede pedir, sin error.
    expect(await list({ q: tag, page: '100000000000000000000' })).toMatchObject({
      templates: [],
      total: 5,
      page: 10_000,
    })
  })

  it('ordena por nombre en los dos sentidos; con otro orden, el de por defecto', async () => {
    const order = async (sort?: string | string[]) =>
      (await list({ q: tag, ...(sort ? { sort } : {}) })).templates.map(card => card.id)

    // corta, Ébano, Física, matemáticas, porcentaje: las mayúsculas y las tildes
    // no mandan (por bytes, «Física» iría primera y «Ébano», la última).
    const byName = [t.short, t.wood, t.physics, t.maths, t.percent]
    expect(await order('name-asc')).toEqual(byName)
    expect(await order('name-desc')).toEqual([...byName].reverse())

    const recent = await order()
    expect(recent).toHaveLength(5)
    expect(await order('recent')).toEqual(recent)
    expect(await order('populares')).toEqual(recent)
    expect(await order(['name-asc', 'name-desc'])).toEqual(recent)
  })

  it('lo que no tiene la forma esperada se ignora, sin error', async () => {
    // La página repetida llega como array: cuenta como no puesta.
    expect(await list({ q: tag, page: ['2', '3'], limit: '2' })).toMatchObject({ page: 1 })
    // La búsqueda repetida, igual: lista sin buscar.
    expect((await list({ q: [tag, 'otra'] })).total).toBeGreaterThanOrEqual(5)
    // Un valor de filtro desmedido no casa con nada de las listas cerradas: se ignora.
    expect((await list({ q: tag, subject: 'x'.repeat(500) })).total).toBe(5)
    // Con un byte nulo, que Postgres no admite en un texto, también.
    expect((await list({ q: tag, subject: '\0', province: 'Madrid\0' })).total).toBe(5)
    expect((await list({ q: `${tag}\0` })).total).toBeGreaterThanOrEqual(5)
  })

  // ---- Ficha ----

  it('la ficha da metadatos, funcionalidades, contadores y las tres listas, sin configuración', async () => {
    const response = await get(`/public/templates/${t.maths}`)
    expect(response.statusCode).toBe(200)
    const body = response.json()

    expect(sorted(Object.keys(body))).toEqual(DETAIL_KEYS)
    for (const key of PRIVATE_KEYS) expect(body).not.toHaveProperty(key)
    expect(response.body).not.toContain(ownerName)
    expect(response.body).not.toContain(f.users.owner.id)

    // De cada misión, objeto y comportamiento, solo lo decidido.
    for (const mission of body.missions) expect(sorted(Object.keys(mission))).toEqual(MISSION_KEYS)
    for (const item of body.shopItems) expect(sorted(Object.keys(item))).toEqual(SHOP_ITEM_KEYS)
    for (const behavior of body.behaviorTemplates) {
      expect(sorted(Object.keys(behavior))).toEqual(BEHAVIOR_KEYS)
    }
    // Ni descripciones, enigmas, fechas, portadas, documentos o insignias de
    // las misiones, ni ids de nada que no sea la plantilla.
    for (const text of [
      hidden.missionDescription,
      hidden.deadline.toISOString(),
      hidden.missionCover,
      hidden.enigmaTitle,
      hidden.documentName,
      hidden.documentUrl,
      hidden.badgeName,
      ...hidden.ids,
    ]) {
      expect(response.body).not.toContain(text)
    }

    expect(body).toEqual({
      id: t.maths,
      name: `Plantilla ${tag} matemáticas`,
      narrative: T1_NARRATIVE,
      backgroundImage: cover,
      subject: 'Matemáticas',
      educationLevel: 'Educación Secundaria (ESO)',
      language: 'Castellano',
      province: 'Valencia',
      features: {
        shop: true,
        coins: true,
        mana: false,
        rankings: true,
        xp: true,
        behaviors: true,
        lives: true,
        visualEffects: true,
        sounds: false,
      },
      missionCount: 2,
      shopItemCount: 3,
      behaviorCount: 2,
      // La más reciente, primero. Del maná no se dice nada: la plantilla lo lleva apagado.
      missions: [
        {
          title: 'Segunda',
          rarity: 'epica',
          enigmasCount: 2,
          xpReward: MISSION_COMPLETION_BONUS.epica + 20 + 40,
          coinReward: 3 + 4,
          manaReward: 0,
        },
        {
          title: 'Primera',
          rarity: 'comun',
          enigmasCount: 0,
          xpReward: MISSION_COMPLETION_BONUS.comun,
          coinReward: 0,
          manaReward: 0,
        },
      ],
      // Por precio, y el oculto al alumnado, también, marcado.
      shopItems: [
        {
          name: 'Pluma',
          description: '',
          price: 5,
          kind: 'reward',
          manaCost: 0,
          usage: 'single',
          lifeRestore: 0,
          active: true,
        },
        {
          name: 'Capa',
          description: '',
          price: 12,
          kind: 'power',
          manaCost: 3,
          usage: 'single',
          lifeRestore: 1,
          active: true,
        },
        {
          name: 'Pergamino',
          description: 'Un rollo antiguo',
          price: 30,
          kind: 'reward',
          manaCost: 0,
          usage: 'unlimited',
          lifeRestore: 0,
          active: false,
        },
      ],
      // Primero los negativos, y por nombre.
      behaviorTemplates: [
        {
          kind: 'negative',
          name: 'Interrumpe',
          description: '',
          xpDelta: 5,
          coinDelta: 0,
          lifeDelta: 1,
        },
        {
          kind: 'positive',
          name: 'Ayuda',
          description: 'Echa una mano',
          xpDelta: 5,
          coinDelta: 2,
          lifeDelta: 0,
        },
      ],
    })
  })

  it('lo que da cada misión cuadra con el listado de misiones de la clase', async () => {
    // El listado de la clase, que ve su profesorado, da todos los recursos.
    const listed = await get(`/teacher/classes/${t.maths}/missions`, { actor: 'owner' })
    expect(listed.statusCode).toBe(200)
    const byTitle = new Map(
      listed.json().missions.map((m: { title: string; enigmasCount: number }) => [m.title, m])
    )

    const { missions } = (await get(`/public/templates/${t.maths}`)).json()
    expect(missions.map((m: { title: string }) => m.title)).toEqual(['Segunda', 'Primera'])
    for (const mission of missions) {
      expect(byTitle.get(mission.title), mission.title).toMatchObject({
        rarity: mission.rarity,
        enigmasCount: mission.enigmasCount,
        xpReward: mission.xpReward,
        coinReward: mission.coinReward,
      })
    }
    // La ficha calla el maná, que la plantilla lleva apagado; el listado lo cuenta.
    expect(byTitle.get('Segunda')).toMatchObject({ manaReward: 2 })
  })

  it('las funcionalidades salen coherentes, como las aplica la clase', async () => {
    const body = (await get(`/public/templates/${t.physics}`)).json()
    // Sin tienda no hay monedas ni maná, aunque la configuración no lo diga.
    expect(body.features).toMatchObject({ shop: false, coins: false, mana: false, xp: true })
    // Y lo que dan sus misiones no los cuenta.
    expect(body.missions).toEqual([
      {
        title: 'Laboratorio',
        rarity: 'rara',
        enigmasCount: 1,
        xpReward: MISSION_COMPLETION_BONUS.rara + 60,
        coinReward: 0,
        manaReward: 0,
      },
    ])
  })

  it('una plantilla sin misiones, objetos ni comportamientos da las listas vacías', async () => {
    const body = (await get(`/public/templates/${t.short}`)).json()
    expect(body).toMatchObject({
      missionCount: 0,
      shopItemCount: 0,
      behaviorCount: 0,
      missions: [],
      shopItems: [],
      behaviorTemplates: [],
    })
  })

  it('con fechas, precios o nombres iguales, las listas salen siempre en el mismo orden', async () => {
    // En la del porcentaje, que no tenía nada: empates en todo lo que ordena.
    const at = new Date('2026-03-01T09:00:00Z')
    const missions = []
    for (const title of ['Empate 1', 'Empate 2', 'Empate 3']) {
      missions.push(
        await prisma.mission.create({ data: { classId: t.percent, title, createdAt: at } })
      )
    }
    const items = []
    for (const name of ['Zeta', 'Alfa', 'Alfa']) {
      items.push(await prisma.shopItem.create({ data: { classId: t.percent, name, price: 7 } }))
    }
    const behaviors = []
    for (const name of ['Igual', 'Igual']) {
      behaviors.push(
        await prisma.behaviorTemplate.create({
          data: { classId: t.percent, kind: 'positive', name, xpDelta: 1 },
        })
      )
    }

    // Lo que desempata es el id; la ficha del profesorado lo enseña.
    const byId = <T extends { id: string }>(rows: T[], desc = false) =>
      [...rows].sort((a, b) => (a.id < b.id ? -1 : 1) * (desc ? -1 : 1)).map(row => row.id)
    const teacher = (await get(`/teacher/templates/${t.percent}`, { actor: 'other' })).json()
    const alfas = items.filter(item => item.name === 'Alfa')
    expect(teacher.shopItems.map((item: { id: string }) => item.id)).toEqual([
      ...byId(alfas),
      items[0].id,
    ])
    expect(teacher.behaviorTemplates.map((b: { id: string }) => b.id)).toEqual(byId(behaviors))

    // Las misiones, de la más reciente a la más antigua: con la misma fecha, por id.
    const titleOf = new Map(missions.map(m => [m.id, m.title]))
    expect(teacher.missions.map((m: { title: string }) => m.title)).toEqual(
      byId(missions, true).map(id => titleOf.get(id))
    )

    // La pública, sin ids, sale igual cada vez y en el mismo orden que la del profesorado.
    const first = (await get(`/public/templates/${t.percent}`)).json()
    for (let i = 0; i < 3; i++) {
      expect((await get(`/public/templates/${t.percent}`)).json()).toEqual(first)
    }
    expect(first.missions).toEqual(teacher.missions)
    expect(first.shopItems.map((item: { name: string }) => item.name)).toEqual([
      'Alfa',
      'Alfa',
      'Zeta',
    ])
  })

  it('404 a un id que no es uuid, a uno que no existe y a una clase que nunca fue plantilla', async () => {
    const bodies = []
    for (const id of ['no-es-un-uuid', randomUUID(), privateId, f.otherClassId]) {
      const response = await get(`/public/templates/${id}`)
      expect(response.statusCode, id).toBe(404)
      bodies.push(response.json())
    }
    // Todas iguales: no se distingue una clase privada de una que no existe.
    for (const body of bodies) {
      expect(body).toEqual({ message: 'Plantilla no encontrada', code: 'NOT_FOUND' })
    }
  })

  it('410 a la que se retiró y a la que tiene la clase archivada', async () => {
    for (const id of [retiredId, archivedId]) {
      const response = await get(`/public/templates/${id}`)
      expect(response.statusCode, id).toBe(410)
      expect(response.json()).toEqual({
        message: 'Esta plantilla ya no está disponible',
        code: 'TEMPLATE_UNAVAILABLE',
      })
    }

    // Si se vuelve a publicar, el enlace vuelve a funcionar.
    expect((await publish(retiredId, true)).statusCode).toBe(200)
    try {
      expect((await get(`/public/templates/${retiredId}`)).statusCode).toBe(200)
      expect(ids(await list({ q: tag }))).toContain(retiredId)
    } finally {
      expect((await publish(retiredId, false)).statusCode).toBe(200)
    }
    expect((await get(`/public/templates/${retiredId}`)).statusCode).toBe(410)
  })

  // ---- Límite por origen ----

  it('429 al pasar el límite, contado por ruta y por origen', async () => {
    const client = '203.0.113.20'
    const listUrl = `/public/templates?q=${tag}`
    recordRateLimit(
      `public-templates:list:${client}`,
      PUBLIC_TEMPLATES_LIMIT,
      PUBLIC_TEMPLATES_LIMIT.max - 1
    )

    // La última que cabe, y la siguiente ya no.
    expect((await get(listUrl, { remoteAddress: client })).statusCode).toBe(200)
    const blocked = await get(listUrl, { remoteAddress: client })
    expect(blocked.statusCode).toBe(429)
    expect(blocked.json().code).toBe('RATE_LIMITED')

    // La ficha lleva su propia cuenta, y otro origen la suya.
    expect((await get(`/public/templates/${t.maths}`, { remoteAddress: client })).statusCode).toBe(
      200
    )
    expect((await get(listUrl, { remoteAddress: '203.0.113.21' })).statusCode).toBe(200)

    // En la ficha cuenta toda petición, también la de un enlace que no existe.
    recordRateLimit(
      `public-templates:detail:${client}`,
      PUBLIC_TEMPLATES_LIMIT,
      PUBLIC_TEMPLATES_LIMIT.max
    )
    const detail = await get(`/public/templates/${randomUUID()}`, { remoteAddress: client })
    expect(detail.statusCode).toBe(429)
  })

  // ---- El catálogo del profesorado, como siempre ----

  it('el listado del profesorado responde como siempre: quién la publicó y si es suya', async () => {
    const asOther = await get(`/teacher/templates?q=${tag}`, { actor: 'other' })
    expect(asOther.statusCode).toBe(200)
    const body = asOther.json()
    expect(sorted(Object.keys(body))).toEqual(['templates', 'total'])
    expect(body.total).toBe(body.templates.length)
    expect(ids(body)).toEqual(Object.values(t).sort())
    for (const card of body.templates) {
      expect(sorted(Object.keys(card))).toEqual(TEACHER_CARD_KEYS)
    }
    expect(body.templates.find((card: { id: string }) => card.id === t.maths)).toEqual({
      id: t.maths,
      name: `Plantilla ${tag} matemáticas`,
      narrative: T1_NARRATIVE,
      subject: 'Matemáticas',
      language: 'Castellano',
      educationLevel: 'Educación Secundaria (ESO)',
      province: 'Valencia',
      backgroundImage: cover,
      teacherName: ownerName,
      missionCount: 2,
      isOwn: false,
    })

    const asOwner = (await get(`/teacher/templates?q=${tag}`, { actor: 'owner' })).json()
    expect(asOwner.templates.every((card: { isOwn: boolean }) => card.isOwn)).toBe(true)

    // Un valor por filtro, como antes, y cada uno a su columna.
    const only = async (params: Record<string, string>) =>
      ids(
        (
          await get(`/teacher/templates?${new URLSearchParams({ q: tag, ...params })}`, {
            actor: 'other',
          })
        ).json()
      )
    expect(await only({ subject: 'Matemáticas' })).toEqual([t.maths, t.short].sort())
    expect(await only({ educationLevel: 'Bachillerato' })).toEqual([t.physics, t.short].sort())
    expect(await only({ language: 'Castellano' })).toEqual([t.maths, t.short].sort())
    expect(await only({ province: 'Valencia' })).toEqual([t.maths])
    // La búsqueda no distingue mayúsculas en el nombre.
    expect(await only({ q: `PLANTILLA ${tag.toUpperCase()}` })).toEqual(Object.values(t).sort())
  })

  it('la ficha del profesorado responde como siempre, y con las mismas misiones que la pública', async () => {
    const response = await get(`/teacher/templates/${t.maths}`, { actor: 'other' })
    expect(response.statusCode).toBe(200)
    const body = response.json()
    expect(sorted(Object.keys(body))).toEqual(TEACHER_DETAIL_KEYS)
    expect(body).toMatchObject({
      id: t.maths,
      teacherName: ownerName,
      isOwn: false,
      // Tal cual se guardó, sin completar ni corregir.
      settings: { mana: false, sounds: false },
    })

    // Las listas, como las de la ficha pública y con el id de cada uno.
    const publicBody = (await get(`/public/templates/${t.maths}`)).json()
    for (const item of body.shopItems) {
      expect(sorted(Object.keys(item))).toEqual(sorted(['id', ...SHOP_ITEM_KEYS]))
    }
    for (const behavior of body.behaviorTemplates) {
      expect(sorted(Object.keys(behavior))).toEqual(sorted(['id', ...BEHAVIOR_KEYS]))
    }
    const withoutIds = (rows: { id: string }[]) => rows.map(({ id: _id, ...row }) => row)
    expect(withoutIds(body.shopItems)).toEqual(publicBody.shopItems)
    expect(withoutIds(body.behaviorTemplates)).toEqual(publicBody.behaviorTemplates)
    expect(body.shopItems.map((item: { name: string }) => item.name)).toEqual([
      'Pluma',
      'Capa',
      'Pergamino',
    ])
    expect(body.behaviorTemplates.map((b: { name: string }) => b.name)).toEqual([
      'Interrumpe',
      'Ayuda',
    ])
    // Las misiones salen de la misma consulta: iguales en las dos fichas.
    expect(body.missions).toEqual(publicBody.missions)
    expect(body.missions).toHaveLength(2)

    // Lo que en público es 410 o 404, aquí sigue siendo el 404 de siempre.
    for (const id of [retiredId, archivedId, privateId, 'no-es-un-uuid']) {
      const missing = await get(`/teacher/templates/${id}`, { actor: 'other' })
      expect(missing.statusCode, id).toBe(404)
      expect(missing.json()).toEqual({ message: 'Plantilla no encontrada' })
    }
  })
})
