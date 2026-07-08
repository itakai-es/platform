import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'crypto'

/**
 * Cifrado simétrico (AES-256-GCM) para los secretos de configuración que se
 * guardan en la base de datos desde el panel de administración (API keys de IA,
 * claves de R2, etc.). Nunca deben quedar en texto plano en `instance_settings`.
 *
 * La clave se deriva de `SETTINGS_ENCRYPTION_KEY` (recomendado en producción:
 * `openssl rand -base64 32`). Si no se define, se usa `JWT_ACCESS_SECRET` como
 * respaldo para que el arranque funcione sin configuración adicional en dev.
 *
 * IMPORTANTE: si cambia la clave, los secretos ya cifrados dejan de poder
 * descifrarse y habrá que volver a introducirlos desde el panel.
 */

const PREFIX = 'enc:v1:'

function deriveKey(): Buffer {
  const raw =
    process.env.SETTINGS_ENCRYPTION_KEY ||
    process.env.JWT_ACCESS_SECRET ||
    'itakai-insecure-dev-fallback-key'
  // sha256 → 32 bytes exactos para AES-256.
  return createHash('sha256').update(raw).digest()
}

// Se deriva una vez al cargar el módulo.
const KEY = deriveKey()

/** ¿El valor ya está cifrado con este esquema? */
export function isEncrypted(value: unknown): value is string {
  return typeof value === 'string' && value.startsWith(PREFIX)
}

/**
 * Cifra un secreto. Devuelve `''` para entradas vacías (no ciframos vacíos).
 * Si el valor ya venía cifrado, se devuelve tal cual (idempotente).
 */
export function encryptSecret(plain: string | null | undefined): string {
  if (!plain) return ''
  if (isEncrypted(plain)) return plain

  const iv = randomBytes(12)
  const cipher = createCipheriv('aes-256-gcm', KEY, iv)
  const ciphertext = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()])
  const tag = cipher.getAuthTag()

  return (
    PREFIX +
    [iv.toString('base64'), tag.toString('base64'), ciphertext.toString('base64')].join(':')
  )
}

/**
 * Descifra un secreto. Los valores no cifrados (p. ej. defaults que vienen de
 * `.env`) se devuelven sin tocar, de modo que la resolución de config puede
 * mezclar valores de BD (cifrados) con valores de entorno (texto plano).
 */
export function decryptSecret(value: string | null | undefined): string {
  if (!value) return ''
  if (!isEncrypted(value)) return value

  try {
    const [ivB64, tagB64, dataB64] = value.slice(PREFIX.length).split(':')
    if (!ivB64 || !tagB64 || !dataB64) return ''

    const iv = Buffer.from(ivB64, 'base64')
    const tag = Buffer.from(tagB64, 'base64')
    const data = Buffer.from(dataB64, 'base64')

    const decipher = createDecipheriv('aes-256-gcm', KEY, iv)
    decipher.setAuthTag(tag)
    return Buffer.concat([decipher.update(data), decipher.final()]).toString('utf8')
  } catch {
    // Clave rotada o dato corrupto: tratamos el secreto como no disponible.
    return ''
  }
}
