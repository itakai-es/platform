/**
 * La plantilla que alguien quiere usar antes de tener sesión (bloque 3, E11).
 *
 * En la ficha pública, sin sesión, «Usar esta plantilla» la apunta aquí y
 * lleva a entrar. Entre medias puede pasar a registrarse y a elegir su rol:
 * ninguna de esas pantallas sabe de dónde viene, así que la intención vive en
 * el navegador, como la sesión (`auth_access_token`), y la recoge el
 * profesorado al llegar a su panel (ver `middleware/pending-template.global.ts`).
 *
 * Solo se guarda el id de la plantilla y cuándo se pidió: nada de quien mira.
 * Caduca a las 2 horas, de sobra para crear la cuenta en la misma visita, y se
 * descarta al recogerla, al elegir el rol de estudiante, si ya no sirve o en
 * cuanto se sale sin sesión del camino entre la ficha y entrar o registrarse:
 * en un ordenador compartido, la siguiente persona no hereda lo que miró otra.
 */

/** Clave de localStorage. */
export const PENDING_TEMPLATE_KEY = 'itakai_pending_template'

/** Cuánto vale una intención: dos horas. */
export const PENDING_TEMPLATE_TTL_MS = 2 * 60 * 60 * 1000

/** Los ids de las plantillas son uuid: lo que no lo es no se guarda ni se recoge. */
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

interface PendingTemplate {
  id: string
  /** Cuándo se pidió, en milisegundos. */
  at: number
}

/** El almacén del navegador, o nada si no lo hay o está bloqueado (modo privado estricto). */
function storage(): Storage | null {
  try {
    return typeof window === 'undefined' ? null : window.localStorage
  } catch {
    return null
  }
}

/** Apunta que se quiere usar la plantilla `id`; sustituye a la que hubiera. */
export function savePendingTemplate(id: string, now = Date.now()) {
  if (!UUID.test(id)) return
  try {
    storage()?.setItem(
      PENDING_TEMPLATE_KEY,
      JSON.stringify({ id, at: now } satisfies PendingTemplate)
    )
  } catch {
    // Sin sitio o sin permiso: se entra igual, solo que sin volver a la plantilla.
  }
}

/**
 * El id de la plantilla pendiente, si hay una y no ha caducado. Una caducada o
 * con otra forma se descarta al leerla.
 */
export function peekPendingTemplate(now = Date.now()): string | null {
  const store = storage()
  let raw: string | null = null
  try {
    raw = store?.getItem(PENDING_TEMPLATE_KEY) ?? null
  } catch {
    return null
  }
  if (!raw) return null
  try {
    const value = JSON.parse(raw) as Partial<PendingTemplate>
    const fresh =
      typeof value.at === 'number' &&
      now - value.at >= 0 &&
      now - value.at < PENDING_TEMPLATE_TTL_MS
    if (typeof value.id === 'string' && UUID.test(value.id) && fresh) return value.id
  } catch {
    // Corrupta: como si no hubiera nada.
  }
  clearPendingTemplate()
  return null
}

/** Olvida la plantilla pendiente. */
export function clearPendingTemplate() {
  try {
    storage()?.removeItem(PENDING_TEMPLATE_KEY)
  } catch {
    // Nada que hacer.
  }
}

/** Recoge la plantilla pendiente: la devuelve y la olvida. */
export function takePendingTemplate(now = Date.now()): string | null {
  const id = peekPendingTemplate(now)
  if (id) clearPendingTemplate()
  return id
}
