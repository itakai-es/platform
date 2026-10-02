/**
 * Plantillas de clase: las clases que su propietario ha publicado para que
 * otros docentes las importen (Fase 3, C5).
 *
 * Las ven dos catálogos: el del profesorado (`/teacher/templates`, con sesión)
 * y el público (`/public/templates`, sin ella). Estos tipos describen lo que
 * tienen en común y lo que devuelve el público, que no dice nada de quien
 * publicó la plantilla.
 */

import type { ClassSettings } from './class.types'
import type { MissionRarity } from './mission.types'
import type { ShopItemKind, ShopItemUsage } from '~/stores/shop'

/** Los órdenes del catálogo; los dos catálogos ofrecen los mismos. */
export type TemplateSort = 'recent' | 'name-asc' | 'name-desc'

/** Los metadatos educativos por los que se filtra y que enseñan tarjeta y ficha. */
export interface TemplateMeta {
  subject: string | null
  educationLevel: string | null
  language: string | null
  province: string | null
}

/** Lo que pinta la tarjeta de una plantilla en cualquiera de los dos catálogos. */
export interface TemplateCardData extends TemplateMeta {
  id: string
  name: string
  backgroundImage: string | null
}

/** Lo que pinta la historia de una plantilla: su portada y su narrativa. */
export interface TemplateStory {
  name: string
  narrative: string | null
  backgroundImage: string | null
}

/**
 * Una misión en la ficha de una plantilla: lo justo para saber qué trae. Las
 * recompensas son las de la misión entera, y valen 0 las de los recursos que
 * la plantilla lleva apagados.
 */
export interface TemplateMission {
  title: string
  rarity: MissionRarity
  enigmasCount: number
  xpReward: number
  coinReward: number
  manaReward: number
}

/** Un objeto de la tienda en la ficha de una plantilla, tal como se copia. */
export interface TemplateShopItem {
  name: string
  description: string | null
  price: number
  kind: ShopItemKind
  manaCost: number
  usage: ShopItemUsage
  lifeRestore: number
  /** Lo ve el alumnado; el oculto llega oculto. */
  active: boolean
}

/**
 * Un comportamiento en la ficha de una plantilla, tal como se copia. Los
 * efectos van sin signo: el negativo los resta.
 */
export interface TemplateBehavior {
  kind: 'positive' | 'negative'
  name: string
  description: string | null
  xpDelta: number
  coinDelta: number
  lifeDelta: number
}

/**
 * Lo que trae una plantilla, en las dos fichas: sus misiones (resumidas), su
 * tienda y sus comportamientos. Las dos lo devuelven con las mismas claves y
 * en el mismo orden; la pública, sin ids.
 */
export interface TemplateContents {
  missions: TemplateMission[]
  shopItems: TemplateShopItem[]
  behaviorTemplates: TemplateBehavior[]
}

/** Tarjeta del catálogo público. */
export interface PublicTemplateCard extends TemplateCardData {
  /** El principio de la narrativa en texto plano; entera, en la ficha. */
  excerpt: string | null
  /** Las funcionalidades encendidas, ya resueltas por la API. */
  features: ClassSettings
  missionCount: number
  shopItemCount: number
  behaviorCount: number
}

/** Una página del catálogo público, como los listados que pagina el servidor. */
export interface PublicTemplatePage {
  templates: PublicTemplateCard[]
  total: number
  page: number
  limit: number
  totalPages: number
}

/**
 * Ficha pública de una plantilla, adonde lleva un enlace compartido: sin la
 * configuración tal cual, sin nada de quien la publicó y sin más ids que el
 * suyo, pero con lo que trae (sus misiones, su tienda y sus comportamientos).
 */
export interface PublicTemplateDetail extends TemplateCardData, TemplateStory, TemplateContents {
  /** En Markdown, tal cual: se sanea al pintarla. */
  narrative: string | null
  features: ClassSettings
  missionCount: number
  shopItemCount: number
  behaviorCount: number
}

/**
 * Ficha de una plantilla en el catálogo del profesorado: la configuración tal
 * cual, quién la publicó y si es de quien mira, y lo mismo que trae la pública,
 * con el id de cada objeto y comportamiento.
 */
export interface TeacherTemplateDetail extends TemplateStory, TemplateContents {
  id: string
  teacherName: string
  /** La publicó quien mira: no la importa, ya es suya. */
  isOwn: boolean
  settings: Partial<ClassSettings> | null
  shopItems: (TemplateShopItem & { id: string })[]
  behaviorTemplates: (TemplateBehavior & { id: string })[]
}

/**
 * Por qué no se puede enseñar una plantilla o el catálogo: retirada o con la
 * clase archivada (410), no existe (404), demasiadas consultas seguidas desde
 * la misma conexión (429) o cualquier otro fallo (sin red, la API caída…).
 */
export type TemplateFailure = 'gone' | 'not-found' | 'rate-limited' | 'failed'
