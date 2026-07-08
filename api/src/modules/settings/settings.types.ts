/**
 * Tipos de la configuración de instancia (editable desde el panel de admin).
 * Cubre los 5 puntos del presupuesto de auto-hospedaje:
 *   ai       → servicios de IA + generación de imágenes
 *   storage  → almacenamiento (local o R2/S3)
 *   domain   → dominio público (CORS + enlaces de email)
 *   general  → parámetros generales de la instancia
 */

export type SettingsSection = 'ai' | 'storage' | 'domain' | 'general'

export const SETTINGS_SECTIONS: SettingsSection[] = ['ai', 'storage', 'domain', 'general']

// ─────────────────────────────── IA ───────────────────────────────

/**
 * Endpoint compatible con la API de OpenAI (texto o imágenes). No se capa a
 * ningún proveedor: sirve cualquiera que hable ese protocolo — OpenAI, un Spark
 * propio, vLLM, LiteLLM, Groq, Together, OpenRouter, o Gemini vía su endpoint
 * compatible con OpenAI. El admin pone la URL, la clave y el modelo que quiera.
 */
export interface OpenAiEndpointConfig {
  baseUrl: string
  apiKey: string // secreto
  model: string
}

export interface AiSettings {
  /** Endpoint para generación de texto (chat/completions). */
  text: OpenAiEndpointConfig
  /** Endpoint para generación de imágenes (images/generations). */
  image: OpenAiEndpointConfig
}

// ──────────────────────────── Almacenamiento ────────────────────────────

export type StorageDriver = 'local' | 's3'

export interface S3StorageConfig {
  /** Endpoint S3-compatible. R2: https://<accountid>.r2.cloudflarestorage.com */
  endpoint: string
  /** Región. Para R2 usar 'auto'. */
  region: string
  bucket: string
  accessKeyId: string // secreto
  secretAccessKey: string // secreto
  /**
   * URL pública base desde donde se sirven los ficheros (bucket público o
   * dominio propio de R2). Ej: https://cdn.mi-itakai.es
   */
  publicBaseUrl: string
  /** Path-style vs virtual-hosted. R2 funciona con path-style. */
  forcePathStyle: boolean
}

export interface StorageSettings {
  driver: StorageDriver
  s3: S3StorageConfig
}

// ─────────────────────────────── Dominio ───────────────────────────────

export interface DomainSettings {
  /** URL pública de la instancia. Se usa en los enlaces de los emails. */
  appUrl: string
  /** Orígenes permitidos por CORS (separados por comas). */
  corsOrigins: string
}

// ──────────────────────────── Generales ────────────────────────────

export type AppLanguage = 'es' | 'en' | 'ca' | 'eu' | 'gl'

export interface GeneralSettings {
  platformName: string
  contactEmail: string
  defaultLanguage: AppLanguage
  /** Si está desactivado, se bloquea el registro de nuevos usuarios. */
  registrationOpen: boolean
  /** Modo mantenimiento (expuesto para que el frontend muestre aviso). */
  maintenanceMode: boolean
}

export interface InstanceSettings {
  ai: AiSettings
  storage: StorageSettings
  domain: DomainSettings
  general: GeneralSettings
}

/**
 * Rutas (dot-path) de los campos secretos por sección. Se usan para:
 *  - cifrarlos antes de persistir,
 *  - enmascararlos al devolverlos por la API.
 */
export const SECRET_PATHS: Record<SettingsSection, string[]> = {
  ai: ['text.apiKey', 'image.apiKey'],
  storage: ['s3.accessKeyId', 's3.secretAccessKey'],
  domain: [],
  general: [],
}
