import { z } from 'zod'
import { prisma } from '../../config/database.js'
import { decryptSecret, encryptSecret } from '../../config/crypto.js'
import {
  SECRET_PATHS,
  type AiSettings,
  type AppLanguage,
  type DomainSettings,
  type GeneralSettings,
  type InstanceSettings,
  type SettingsSection,
  type StorageDriver,
  type StorageSettings,
} from './settings.types.js'

/**
 * Servicio central de configuración de instancia.
 *
 * Estrategia: `.env` provee los DEFAULTS de arranque; la base de datos
 * (tabla `instance_settings`, editada desde el panel de admin) los SOBREESCRIBE.
 * Así una instalación existente sigue funcionando sin tocar nada, y un
 * auto-hospedaje nuevo se configura entero desde el panel.
 *
 * Los accesores `getXSettings()` devuelven la config resuelta y con secretos
 * descifrados (uso interno). `getAdminSettings()` devuelve todo descifrado para
 * el panel (el admin quiere ver sus claves); en BD siempre van cifradas.
 */

type RawData = Record<string, any>

const CACHE_TTL_MS = 60_000
const cache = new Map<SettingsSection, { raw: RawData; at: number }>()

async function loadRaw(section: SettingsSection): Promise<RawData> {
  const cached = cache.get(section)
  if (cached && Date.now() - cached.at < CACHE_TTL_MS) return cached.raw
  const row = await prisma.instanceSetting.findUnique({ where: { section } })
  const raw = ((row?.data as RawData) ?? {}) || {}
  cache.set(section, { raw, at: Date.now() })
  return raw
}

function invalidate(section: SettingsSection) {
  cache.delete(section)
}

/** Vaciar la caché completa (p. ej. tras un cambio externo en la BD). */
export function invalidateSettingsCache() {
  cache.clear()
}

// ───────────────────────── defaults desde .env ─────────────────────────

function stripTrailingSlash(url?: string) {
  return (url || '').replace(/\/+$/, '')
}

function aiDefaults(): AiSettings {
  // Defaults de arranque: apuntan al Spark (endpoint OpenAI-compatible) vía .env.
  // El admin puede cambiarlos por CUALQUIER endpoint compatible desde el panel.
  const baseUrl = stripTrailingSlash(process.env.SPARK_ROUTER_BASE_URL) || 'http://localhost:8000'
  const apiKey = process.env.SPARK_ROUTER_API_KEY || 'local-testing-key'
  return {
    text: {
      baseUrl,
      apiKey,
      model: process.env.SPARK_ROUTER_MODEL || 'google/gemma-4-26b-a4b-it',
    },
    image: {
      baseUrl,
      apiKey,
      model: process.env.SPARK_ROUTER_IMAGE_MODEL || 'black-forest-labs/flux.2-klein-4b',
    },
  }
}

function storageDefaults(): StorageSettings {
  return {
    driver: (process.env.STORAGE_DRIVER as StorageDriver) || 'local',
    s3: {
      endpoint: stripTrailingSlash(process.env.S3_ENDPOINT),
      region: process.env.S3_REGION || 'auto',
      bucket: process.env.S3_BUCKET || '',
      accessKeyId: process.env.S3_ACCESS_KEY_ID || '',
      secretAccessKey: process.env.S3_SECRET_ACCESS_KEY || '',
      publicBaseUrl: stripTrailingSlash(process.env.S3_PUBLIC_BASE_URL),
      forcePathStyle: process.env.S3_FORCE_PATH_STYLE
        ? process.env.S3_FORCE_PATH_STYLE === 'true'
        : true,
    },
  }
}

function domainDefaults(): DomainSettings {
  const corsOrigins = process.env.CORS_ORIGIN || 'http://localhost:4000'
  return {
    appUrl: stripTrailingSlash(process.env.APP_URL) || (corsOrigins.split(',')[0]?.trim() ?? ''),
    corsOrigins,
  }
}

function generalDefaults(): GeneralSettings {
  return {
    platformName: process.env.PLATFORM_NAME || 'ITAKAI',
    contactEmail: process.env.CONTACT_EMAIL || '',
    defaultLanguage: (process.env.DEFAULT_LANGUAGE as AppLanguage) || 'es',
    registrationOpen: process.env.REGISTRATION_OPEN ? process.env.REGISTRATION_OPEN === 'true' : true,
    maintenanceMode: process.env.MAINTENANCE_MODE === 'true',
  }
}

// ───────────────────────── utilidades dot-path / merge ─────────────────────────

function getPath(obj: any, path: string): any {
  return path.split('.').reduce((o, k) => (o == null ? undefined : o[k]), obj)
}

function setPath(obj: any, path: string, value: any) {
  const keys = path.split('.')
  let o = obj
  for (let i = 0; i < keys.length - 1; i++) {
    const k = keys[i]!
    if (typeof o[k] !== 'object' || o[k] == null) o[k] = {}
    o = o[k]
  }
  o[keys[keys.length - 1]!] = value
}

function deepMerge<T>(base: T, patch: any): T {
  if (patch == null || typeof patch !== 'object') return base
  const out: any = { ...(base as any) }
  for (const key of Object.keys(patch)) {
    const pv = patch[key]
    const bv = (base as any)?.[key]
    if (pv && typeof pv === 'object' && !Array.isArray(pv) && bv && typeof bv === 'object') {
      out[key] = deepMerge(bv, pv)
    } else if (pv !== undefined) {
      out[key] = pv
    }
  }
  return out
}

/** Merge de BD sobre defaults + descifrado de secretos (uso interno). */
function resolve<T>(defaults: T, raw: RawData, secretPaths: string[]): T {
  const merged = deepMerge(defaults, raw)
  for (const p of secretPaths) {
    const v = getPath(merged, p)
    setPath(merged, p, decryptSecret(typeof v === 'string' ? v : ''))
  }
  return merged
}

// ───────────────────────── accesores (config resuelta) ─────────────────────────

export async function getAiSettings(): Promise<AiSettings> {
  return resolve(aiDefaults(), await loadRaw('ai'), SECRET_PATHS.ai)
}

export async function getStorageSettings(): Promise<StorageSettings> {
  return resolve(storageDefaults(), await loadRaw('storage'), SECRET_PATHS.storage)
}

export async function getDomainSettings(): Promise<DomainSettings> {
  return resolve(domainDefaults(), await loadRaw('domain'), SECRET_PATHS.domain)
}

export async function getGeneralSettings(): Promise<GeneralSettings> {
  return resolve(generalDefaults(), await loadRaw('general'), SECRET_PATHS.general)
}

/**
 * Config completa con los secretos DESCIFRADOS, para el panel de admin.
 * El admin quiere ver las claves que ha puesto (no van enmascaradas).
 */
export async function getAdminSettings(): Promise<InstanceSettings> {
  const [ai, storage, domain, general] = await Promise.all([
    loadRaw('ai'),
    loadRaw('storage'),
    loadRaw('domain'),
    loadRaw('general'),
  ])
  return {
    ai: resolve(aiDefaults(), ai, SECRET_PATHS.ai),
    storage: resolve(storageDefaults(), storage, SECRET_PATHS.storage),
    domain: resolve(domainDefaults(), domain, SECRET_PATHS.domain),
    general: resolve(generalDefaults(), general, SECRET_PATHS.general),
  }
}

// ───────────────────────── validación (patches parciales) ─────────────────────────

const endpointSchema = z
  .object({ baseUrl: z.string(), apiKey: z.string(), model: z.string() })
  .partial()

const aiSchema = z
  .object({ text: endpointSchema, image: endpointSchema })
  .partial()

const storageSchema = z
  .object({
    driver: z.enum(['local', 's3']),
    s3: z
      .object({
        endpoint: z.string(),
        region: z.string(),
        bucket: z.string(),
        accessKeyId: z.string(),
        secretAccessKey: z.string(),
        publicBaseUrl: z.string(),
        forcePathStyle: z.boolean(),
      })
      .partial(),
  })
  .partial()

const domainSchema = z
  .object({
    appUrl: z.string(),
    corsOrigins: z.string(),
  })
  .partial()

const generalSchema = z
  .object({
    platformName: z.string(),
    contactEmail: z.string(),
    defaultLanguage: z.enum(['es', 'en', 'ca', 'eu', 'gl']),
    registrationOpen: z.boolean(),
    maintenanceMode: z.boolean(),
  })
  .partial()

const SECTION_SCHEMAS: Record<SettingsSection, z.ZodTypeAny> = {
  ai: aiSchema,
  storage: storageSchema,
  domain: domainSchema,
  general: generalSchema,
}

// ───────────────────────── escritura ─────────────────────────

/**
 * Actualiza una sección. El patch puede ser parcial. Los secretos se guardan
 * cifrados en BD; un valor vacío limpia el override (vuelve al default de .env).
 * Devuelve la config completa (con secretos descifrados para el panel).
 */
export async function updateSection(
  section: SettingsSection,
  patch: unknown
): Promise<InstanceSettings> {
  const schema = SECTION_SCHEMAS[section]
  const parsed = schema.parse(patch) as RawData

  const current = await loadRaw(section)
  const merged = deepMerge(current, parsed)

  for (const p of SECRET_PATHS[section]) {
    const incoming = getPath(parsed, p)
    if (incoming === undefined) continue
    setPath(merged, p, incoming === '' ? '' : encryptSecret(String(incoming)))
  }

  await prisma.instanceSetting.upsert({
    where: { section },
    create: { section, data: merged },
    update: { data: merged },
  })
  invalidate(section)

  return getAdminSettings()
}
