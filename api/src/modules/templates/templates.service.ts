import { z } from 'zod'
import { prisma } from '../../config/database.js'
import { Prisma } from '../../generated/prisma/client.js'
import type { MissionRarity } from '../../generated/prisma/enums.js'
import { resolveClassSettings, type ClassSettings } from '../../utils/class-settings.js'
import { GoneError, NotFoundError } from '../../utils/errors.js'
import { containsPattern } from '../../utils/like-pattern.js'
import { missionRewards } from '../../utils/mission-formatter.js'
import { publicUploadResolver } from '../storage/storage.service.js'

/**
 * Catálogo de plantillas: las clases que su propietario ha publicado para que
 * otros profesores las importen. Lo leen dos puertas: el catálogo del
 * profesorado (`/teacher/templates`, con sesión) y el público
 * (`/public/templates`, sin ella). La ficha sale de la misma consulta en las
 * dos; el listado público pide su página a SQL (ver `listPublicTemplates`).
 *
 * La ficha enseña en las dos lo que se lleva quien importa la plantilla: la
 * historia, las funcionalidades, la tienda, los comportamientos y sus
 * misiones, que se copian si se pide (de cada una, lo justo para saber qué
 * trae: ver `TemplateMission`). Lo que cambia es quién mira. El profesorado ve
 * además quién publicó cada plantilla y si es suya y, en la ficha, la
 * configuración tal cual y el id de cada objeto y comportamiento. El público
 * no ve nada de quien la publicó (ni se lee) ni más ids que el de la
 * plantilla; de la configuración, solo qué funcionalidades van encendidas, y
 * la portada, solo si es un fichero público de la plataforma (ver
 * `publicUploadFromUrl`).
 */

// ==================== CONSULTA COMPARTIDA ====================

/**
 * Disponible: publicada, con la clase sin archivar y fuera de la papelera. Una
 * archivada sale del catálogo. Enviar una clase a la papelera ya la archiva y
 * la retira; `deletedAt` va igualmente, por si algún día deja de hacerlo. El
 * listado público lo dice en SQL (`publicTemplatesWhere`): si cambia aquí,
 * cambia allí.
 */
const AVAILABLE = {
  isTemplate: true,
  archived: false,
  deletedAt: null,
} satisfies Prisma.ClassWhereInput

/** Los órdenes del catálogo, los mismos que ofrece el del profesorado. */
export const TEMPLATE_SORTS = ['recent', 'name-asc', 'name-desc'] as const
export type TemplateSort = (typeof TEMPLATE_SORTS)[number]

/** Lo que se lee de cada plantilla para su tarjeta, en los dos catálogos. */
const TEMPLATE_CARD = {
  id: true,
  name: true,
  subject: true,
  language: true,
  educationLevel: true,
  province: true,
  backgroundImage: true,
  _count: { select: { missions: true, shopItems: true, behaviorTemplates: true } },
} satisfies Prisma.ClassSelect

/**
 * De cada objeto de la tienda, lo que enseñan las dos fichas: lo que se copia
 * de él, incluido si lo ve el alumnado (`active`), porque el oculto llega oculto.
 */
const TEMPLATE_SHOP_ITEM = {
  name: true,
  description: true,
  price: true,
  kind: true,
  manaCost: true,
  usage: true,
  lifeRestore: true,
  active: true,
} satisfies Prisma.ShopItemSelect

/** De cada comportamiento, lo que enseñan las dos fichas: lo que se copia de él. */
const TEMPLATE_BEHAVIOR = {
  kind: true,
  name: true,
  description: true,
  xpDelta: true,
  coinDelta: true,
  lifeDelta: true,
} satisfies Prisma.BehaviorTemplateSelect

/**
 * Lo que se lee para su ficha: lo que se lleva quien la importa (portada,
 * historia, funcionalidades, tienda, comportamientos y, si lo pide, misiones)
 * y sus metadatos. De las misiones, solo lo que sale en su resumen (ver
 * `TemplateMission`). Cada lista, en un orden estable: el id desempata.
 */
const TEMPLATE_DETAIL = {
  id: true,
  name: true,
  narrative: true,
  backgroundImage: true,
  subject: true,
  language: true,
  educationLevel: true,
  province: true,
  settings: true,
  // Con el id de cada uno, que el catálogo del profesorado da desde siempre.
  shopItems: {
    select: { id: true, ...TEMPLATE_SHOP_ITEM },
    orderBy: [{ price: 'asc' }, { name: 'asc' }, { id: 'asc' }],
  },
  behaviorTemplates: {
    select: { id: true, ...TEMPLATE_BEHAVIOR },
    orderBy: [{ kind: 'asc' }, { name: 'asc' }, { id: 'asc' }],
  },
  // Como en la pestaña de misiones de una clase: la más reciente, primero.
  missions: {
    select: {
      title: true,
      rarity: true,
      enigmas: { select: { xpReward: true, coinReward: true, manaReward: true } },
    },
    orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
  },
} satisfies Prisma.ClassSelect

/** Quién publicó la plantilla: solo lo lee el catálogo del profesorado. */
const TEMPLATE_PUBLISHER = {
  teacherId: true,
  teacher: { select: { name: true } },
} satisfies Prisma.ClassSelect

type TemplateDetailRow = Prisma.ClassGetPayload<{ select: typeof TEMPLATE_DETAIL }>
type PublisherRow = Prisma.ClassGetPayload<{ select: typeof TEMPLATE_PUBLISHER }>

/**
 * Una misión en la ficha de una plantilla: lo justo para saber qué trae. Ni su
 * descripción ni sus enigmas, de los que solo dice cuántos son (los dos se
 * copian con ella), ni sus documentos o su insignia, que no se copian.
 */
export interface TemplateMission {
  title: string
  rarity: MissionRarity
  enigmasCount: number
  /**
   * Lo que da la misión entera, como en el listado de misiones de una clase;
   * 0 en los recursos que la plantilla lleva apagados (ver `missionRewards`).
   */
  xpReward: number
  coinReward: number
  manaReward: number
}

/** Un objeto de la tienda en la ficha pública: lo que se copia de él, sin su id. */
export type TemplateShopItem = Prisma.ShopItemGetPayload<{ select: typeof TEMPLATE_SHOP_ITEM }>

/** Un comportamiento en la ficha pública: lo que se copia de él, sin su id. */
export type TemplateBehavior = Prisma.BehaviorTemplateGetPayload<{
  select: typeof TEMPLATE_BEHAVIOR
}>

/** La ficha tal como la leen los dos catálogos, con las misiones ya resumidas. */
type TemplateDetail = Omit<TemplateDetailRow, 'missions'> & { missions: TemplateMission[] }

/**
 * La ficha leída, con cada misión resumida como `TemplateMission`: lo que da
 * entera, con la cuenta de los listados de misiones, y solo de los recursos que
 * la plantilla lleva encendidos.
 */
function withMissionSummaries<T extends TemplateDetailRow>(
  tpl: T
): Omit<T, 'missions'> & { missions: TemplateMission[] } {
  const settings = resolveClassSettings(tpl.settings)
  return {
    ...tpl,
    missions: tpl.missions.map(({ title, rarity, enigmas }) => ({
      title,
      rarity,
      enigmasCount: enigmas.length,
      ...missionRewards({ rarity, enigmas }, settings),
    })),
  }
}

/** Una fila sin su id: la ficha pública no da más ids que el de la plantilla. */
function withoutId<T extends { id: string }>({ id: _id, ...row }: T): Omit<T, 'id'> {
  return row
}

/** Quién publicó una plantilla, como lo ve un profesor en su catálogo. */
export interface TemplatePublisher {
  teacherName: string
  /** La publicó quien mira. */
  isOwn: boolean
}

/**
 * Lo que el catálogo del profesorado enseña de quien publicó la plantilla, en
 * lugar de lo leído: su nombre y si es quien mira.
 */
function withPublisher<T extends PublisherRow>(
  { teacherId, teacher, ...template }: T,
  userId: string
) {
  return { ...template, teacherName: teacher.name, isOwn: teacherId === userId }
}

/**
 * Largo máximo de un metadato de clase (asignatura, nivel, idioma, provincia),
 * holgado para las listas cerradas del frontend: ningún valor pasa de 50
 * caracteres. Es también lo más largo que se lee de un filtro del catálogo: un
 * valor que no cabe en una clase no casa con ninguna.
 */
export const TEMPLATE_METADATA_MAX_LENGTH = 120

/**
 * Filtros del catálogo. De cada metadato se puede pedir más de un valor y vale
 * cualquiera de ellos. Dónde y cómo busca `q` lo dice cada catálogo
 * (`findTemplates` y `listPublicTemplates`).
 */
export interface TemplateFilters {
  subject?: string[]
  educationLevel?: string[]
  language?: string[]
  province?: string[]
  q?: string
}

/**
 * Si `id` puede ser el de una plantilla: los ids son uuid, y con otra forma no
 * hay nada que buscar. Se comprueba antes de consultar porque un id con un byte
 * nulo hace fallar la consulta (un 500) donde toca un 404.
 */
export function isTemplateId(id: string) {
  return z.string().uuid().safeParse(id).success
}

/**
 * La plantilla `id` con lo que enseña su ficha, o `null` si no está disponible.
 * `userId` es el profesor que mira desde su catálogo: solo con él se lee quién
 * la publicó (su nombre, y si es él). La ficha pública no lo pasa y esa parte
 * ni se lee. Las misiones salen ya resumidas, las mismas en las dos fichas.
 */
export function findTemplate(id: string): Promise<TemplateDetail | null>
export function findTemplate(
  id: string,
  userId: string
): Promise<(TemplateDetail & TemplatePublisher) | null>
export async function findTemplate(id: string, userId?: string) {
  if (!isTemplateId(id)) return null
  const where = { ...AVAILABLE, id }
  if (userId === undefined) {
    const tpl = await prisma.class.findFirst({ where, select: TEMPLATE_DETAIL })
    return tpl && withMissionSummaries(tpl)
  }

  const tpl = await prisma.class.findFirst({
    where,
    select: { ...TEMPLATE_DETAIL, ...TEMPLATE_PUBLISHER },
  })
  return tpl && withPublisher(withMissionSummaries(tpl), userId)
}

// ==================== CATÁLOGO DEL PROFESORADO ====================

function templatesWhere(filters: TemplateFilters): Prisma.ClassWhereInput {
  // Sin valores, sin filtro.
  const anyOf = (values?: string[]) => (values?.length ? { in: values } : undefined)
  return {
    ...AVAILABLE,
    subject: anyOf(filters.subject),
    educationLevel: anyOf(filters.educationLevel),
    language: anyOf(filters.language),
    province: anyOf(filters.province),
    ...(filters.q
      ? {
          OR: [
            { name: { contains: filters.q, mode: 'insensitive' } },
            { narrative: { contains: filters.q, mode: 'insensitive' } },
          ],
        }
      : {}),
  }
}

/**
 * Las plantillas disponibles que casan con `filters`, para el catálogo del
 * profesorado: las `take` últimas tocadas, con la narrativa entera y con quién
 * publicó cada una (su nombre, y si es `userId`, el profesor que mira). `q`
 * busca en el nombre y en la narrativa sin distinguir mayúsculas; los
 * comodines de LIKE que traiga cuentan como tales.
 */
export async function findTemplates(filters: TemplateFilters, take: number, userId: string) {
  const rows = await prisma.class.findMany({
    where: templatesWhere(filters),
    orderBy: [{ updatedAt: 'desc' }, { id: 'desc' }],
    take,
    select: { ...TEMPLATE_CARD, narrative: true, ...TEMPLATE_PUBLISHER },
  })
  return rows.map(row => withPublisher(row, userId))
}

// ==================== CATÁLOGO PÚBLICO ====================

/** Largo máximo, en caracteres, del extracto de la narrativa en la tarjeta. */
export const EXCERPT_LENGTH = 200
/**
 * Cuánto del principio de la narrativa se lee para sacar el extracto: de sobra
 * para `EXCERPT_LENGTH` caracteres de prosa. La narrativa puede ser muy larga
 * (ver `CLASS_TEXT_LIMITS` en teachers.service), y la tarjeta no necesita más.
 */
export const EXCERPT_SOURCE_LENGTH = 2000

/** Lo que se lee de cada plantilla para su tarjeta pública: la narrativa, aparte. */
const PUBLIC_CARD = { ...TEMPLATE_CARD, settings: true } satisfies Prisma.ClassSelect
type PublicCardRow = Prisma.ClassGetPayload<{ select: typeof PUBLIC_CARD }>

/** Tarjeta de una plantilla en el catálogo público. */
export interface PublicTemplateCard {
  id: string
  name: string
  /** La narrativa en texto plano y recortada (ver `narrativeExcerpt`); entera, en la ficha. */
  excerpt: string | null
  subject: string | null
  educationLevel: string | null
  language: string | null
  province: string | null
  backgroundImage: string | null
  /**
   * Qué funcionalidades lleva encendidas, como en la ficha. Dan sentido a los
   * contadores: los objetos de una tienda apagada también se copian.
   */
  features: ClassSettings
  missionCount: number
  shopItemCount: number
  behaviorCount: number
}

/**
 * Ficha de una plantilla en el catálogo público: sin nada de quien la publicó,
 * sin la configuración tal cual y sin más ids que el suyo. Lleva lo que se
 * lleva quien la importa: sus misiones (resumidas), su tienda y sus
 * comportamientos, en el mismo orden que la ficha del profesorado.
 */
export interface PublicTemplateDetail {
  id: string
  name: string
  /** En Markdown, tal cual: la pinta el navegador, que la sanea. */
  narrative: string | null
  backgroundImage: string | null
  subject: string | null
  educationLevel: string | null
  language: string | null
  province: string | null
  /** Qué funcionalidades lleva encendidas: las que se lleva quien la importa. */
  features: ClassSettings
  missionCount: number
  shopItemCount: number
  behaviorCount: number
  missions: TemplateMission[]
  shopItems: TemplateShopItem[]
  behaviorTemplates: TemplateBehavior[]
}

/**
 * Los órdenes del listado público. Por nombre, con las reglas del español: la
 * colación de la base ordena por bytes y dejaría «Ábaco» y «el bosque» detrás
 * de la «Z». En todos, el id desempata para que las páginas no se solapen.
 */
const PUBLIC_ORDER: Record<TemplateSort, Prisma.Sql> = {
  recent: Prisma.sql`c.updated_at DESC, c.id DESC`,
  'name-asc': Prisma.sql`c.name COLLATE "es-x-icu" ASC, c.id ASC`,
  'name-desc': Prisma.sql`c.name COLLATE "es-x-icu" DESC, c.id DESC`,
}

/**
 * Las disponibles que casan con `filters`, en SQL: `AVAILABLE` y los mismos
 * filtros de metadatos que el catálogo del profesorado. `q` busca solo en el
 * nombre, como ese catálogo en pantalla, sin distinguir mayúsculas ni tildes
 * («quimica» encuentra «Química»), y lo escrito se busca tal cual, comodines
 * de LIKE incluidos.
 */
function publicTemplatesWhere(filters: TemplateFilters): Prisma.Sql {
  const conditions = [
    Prisma.sql`c.is_template`,
    Prisma.sql`NOT c.archived`,
    Prisma.sql`c.deleted_at IS NULL`,
  ]
  // Sin valores, sin filtro.
  const anyOf = (column: Prisma.Sql, values?: string[]) => {
    if (values?.length) conditions.push(Prisma.sql`${column} IN (${Prisma.join(values)})`)
  }
  anyOf(Prisma.sql`c.subject`, filters.subject)
  anyOf(Prisma.sql`c.education_level`, filters.educationLevel)
  anyOf(Prisma.sql`c.language`, filters.language)
  anyOf(Prisma.sql`c.province`, filters.province)
  if (filters.q) {
    conditions.push(Prisma.sql`unaccent(c.name) ILIKE unaccent(${containsPattern(filters.q)})`)
  }
  return Prisma.join(conditions, ' AND ')
}

function toPublicCard(
  tpl: PublicCardRow,
  narrative: string | null,
  backgroundImage: string | null
): PublicTemplateCard {
  return {
    id: tpl.id,
    name: tpl.name,
    excerpt: narrativeExcerpt(narrative),
    subject: tpl.subject,
    educationLevel: tpl.educationLevel,
    language: tpl.language,
    province: tpl.province,
    backgroundImage,
    features: resolveClassSettings(tpl.settings),
    missionCount: tpl._count.missions,
    shopItemCount: tpl._count.shopItems,
    behaviorCount: tpl._count.behaviorTemplates,
  }
}

/**
 * Una página del catálogo público, con cuántas plantillas casan en total y
 * cuántas páginas salen, como los listados del panel. `page` (desde 1) y
 * `limit` llegan ya dentro de sus límites. `q` busca en el nombre, sin
 * distinguir mayúsculas ni tildes (ver `publicTemplatesWhere`).
 *
 * Como en esos listados (admin-lists.service.ts), la página de ids sale de SQL,
 * por lo que Prisma no sabe hacer: buscar sin tildes, ordenar los nombres con
 * las reglas del español y leer solo el principio de la narrativa. El resto de
 * cada tarjeta, de Prisma.
 */
export async function listPublicTemplates(
  filters: TemplateFilters,
  { sort, page, limit }: { sort?: TemplateSort; page: number; limit: number }
) {
  const where = publicTemplatesWhere(filters)
  const [rows, countRows, publicCover] = await Promise.all([
    prisma.$queryRaw<{ id: string; narrative: string | null }[]>`
      SELECT c.id, left(c.narrative, ${EXCERPT_SOURCE_LENGTH}::int) AS narrative
      FROM classes c
      WHERE ${where}
      ORDER BY ${PUBLIC_ORDER[sort ?? 'recent']}
      LIMIT ${limit} OFFSET ${(page - 1) * limit}
    `,
    prisma.$queryRaw<{ total: bigint }[]>`SELECT COUNT(*) AS total FROM classes c WHERE ${where}`,
    publicUploadResolver(),
  ])

  // Sigue pidiendo que esté disponible, por si se ha retirado entre una consulta y otra.
  const cards = await prisma.class.findMany({
    where: { ...AVAILABLE, id: { in: rows.map(row => row.id) } },
    select: PUBLIC_CARD,
  })
  const byId = new Map(cards.map(card => [card.id, card]))
  const total = Number(countRows[0]?.total ?? 0)

  return {
    templates: rows.flatMap(({ id, narrative }) => {
      const card = byId.get(id)
      return card ? [toPublicCard(card, narrative, publicCover(card.backgroundImage))] : []
    }),
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  }
}

const TEMPLATE_NOT_FOUND = 'Plantilla no encontrada'

/**
 * La ficha pública de la plantilla `id`. Si no está disponible distingue dos
 * casos: la que se publicó alguna vez (y se retiró, o su clase se archivó) da
 * 410, para que quien abra un enlace compartido sepa que ya no está; cualquier
 * otra cosa, exista o no, da 404, para no desvelar qué clases existen.
 */
export async function getPublicTemplate(id: string): Promise<PublicTemplateDetail> {
  // Antes de nada: con otra forma de id tampoco hay nada que buscar en el historial.
  if (!isTemplateId(id)) throw new NotFoundError(TEMPLATE_NOT_FOUND)

  const [tpl, publicCover] = await Promise.all([findTemplate(id), publicUploadResolver()])
  if (!tpl) {
    if (await wasPublished(id)) {
      throw new GoneError('Esta plantilla ya no está disponible', 'TEMPLATE_UNAVAILABLE')
    }
    throw new NotFoundError(TEMPLATE_NOT_FOUND)
  }

  return {
    id: tpl.id,
    name: tpl.name,
    narrative: tpl.narrative,
    backgroundImage: publicCover(tpl.backgroundImage),
    subject: tpl.subject,
    educationLevel: tpl.educationLevel,
    language: tpl.language,
    province: tpl.province,
    features: resolveClassSettings(tpl.settings),
    missionCount: tpl.missions.length,
    shopItemCount: tpl.shopItems.length,
    behaviorCount: tpl.behaviorTemplates.length,
    missions: tpl.missions,
    shopItems: tpl.shopItems.map(withoutId),
    behaviorTemplates: tpl.behaviorTemplates.map(withoutId),
  }
}

/**
 * Si la clase `id` se ha publicado alguna vez como plantilla: lo sigue estando
 * (y entonces, si no está disponible, es que está archivada) o su registro
 * guarda que se publicó. Una que se retiró antes de que existiera el registro
 * da 404, que es el lado seguro.
 */
async function wasPublished(id: string) {
  const cls = await prisma.class.findUnique({
    where: { id },
    select: {
      isTemplate: true,
      actionLog: { where: { action: 'class.template_published' }, select: { id: true }, take: 1 },
    },
  })
  return Boolean(cls && (cls.isTemplate || cls.actionLog.length > 0))
}

// ==================== EXTRACTO DE LA NARRATIVA ====================
//
// Todas las expresiones de aquí trabajan en tiempo lineal: la narrativa la
// escribe quien publica y el extracto se calcula en cada visita al catálogo.
// Las que abren con un delimitador no lo admiten dentro (`[^[\]]`, `[^<>]`),
// así que no rebuscan hasta el final del texto desde cada apertura, y las de
// principio de línea no saltan de línea (`[ \t]` en vez de `\s`).

/** Una línea de título de Markdown (`# …`) y una de separación (`---`, `***`, `___`). */
const HEADING_LINE = /^ {0,3}#{1,6}(\s|$)/
const RULE_LINE = /^ {0,3}([-*_])(?:[ \t]*\1){2,}[ \t]*$/
/** La fila que separa la cabecera de una tabla del resto (`|---|:---:|`): solo `|`, `-` y `:`. */
const TABLE_RULE_LINE = /^(?=[^|]*\|)(?=[^-]*-)[ \t|:-]+$/

/**
 * La narrativa en texto plano y recortada, para la tarjeta del catálogo. Es
 * Markdown y suele abrir con el título de la historia: en la tarjeta va la
 * prosa, sin títulos ni marcas (los títulos solo si no hay otra cosa). Si pasa
 * de `EXCERPT_LENGTH`, se corta en un espacio y acaba en «…». Solo se mira el
 * principio (`EXCERPT_SOURCE_LENGTH`).
 */
export function narrativeExcerpt(narrative: string | null): string | null {
  if (!narrative) return null
  // Sin dejar media pareja de un emoji al final del trozo.
  const head = narrative.slice(0, EXCERPT_SOURCE_LENGTH).replace(/[\uD800-\uDBFF]$/, '')
  const lines = head
    .split(/\r\n?|\n/)
    .filter(line => !RULE_LINE.test(line) && !TABLE_RULE_LINE.test(line))
  const prose = lines.filter(line => !HEADING_LINE.test(line))
  const text = plainText((prose.some(line => line.trim()) ? prose : lines).join('\n'))
  if (!text) return null

  // Por caracteres y no por unidades de UTF-16, para no partir un emoji.
  const chars = Array.from(text)
  if (chars.length <= EXCERPT_LENGTH) return text
  const cut = chars.slice(0, EXCERPT_LENGTH).join('')
  const space = cut.lastIndexOf(' ')
  const cutHead = space > EXCERPT_LENGTH / 2 ? cut.slice(0, space) : cut
  return `${cutHead.replace(/[\s,.;:]+$/, '')}…`
}

/**
 * Markdown en texto corrido: sin marcas, los enlaces por su texto y sin
 * imágenes. Lo que solo parece una marca se queda: un `<` que no abre una
 * etiqueta («nota < 5»), un año al principio de línea («2084.»), el `*` de una
 * multiplicación («2 * 3») o el `_` dentro de una palabra («mi_variable»).
 */
function plainText(markdown: string) {
  return (
    markdown
      // Imágenes y enlaces; el destino admite un nivel de paréntesis
      // («…/Ítaca_(isla)») y un título entre comillas.
      .replace(/!\[[^[\]]*\]\((?:[^()\s]|\([^()\s]*\))*(?:[ \t]+"[^"\n]*")?\)/g, '')
      .replace(/\[([^[\]]*)\]\((?:[^()\s]|\([^()\s]*\))*(?:[ \t]+"[^"\n]*")?\)/g, '$1')
      .replace(/<\/?[a-z][^<>]*>/gi, '') // etiquetas HTML
      .replace(/^ {0,3}#{1,6}[ \t]*/gm, '') // marcas de título
      .replace(/^[ \t]*>[ \t]?/gm, '') // citas
      .replace(/^[ \t]*(?:[-*+]|\d{1,3}[.)])[ \t]+/gm, '') // viñetas y listas numeradas
      .replace(/\|/g, ' ') // celdas de una tabla
      // Énfasis, tachado y código: la marca que abre va pegada al principio de
      // una palabra y la que cierra, al final.
      .replace(/(^|[^\p{L}\p{N}*_~`])[*_~`]+(?=[^\s*_~`])/gmu, '$1')
      .replace(/([^\s*_~`])[*_~`]+(?![\p{L}\p{N}])/gu, '$1')
      .replace(/\s+/g, ' ')
      .trim()
  )
}
