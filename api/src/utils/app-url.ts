import { getDomainSettings } from '../modules/settings/settings.service.js'

/**
 * Origen público de la aplicación (el front), para construir enlaces absolutos
 * en los correos. Sale de la configuración de instancia; si el administrador no
 * la ha rellenado, se cae al primer origen permitido por CORS y, en último
 * término, al puerto de desarrollo.
 */
export async function getAppOrigin(): Promise<string> {
  const { appUrl } = await getDomainSettings()
  return appUrl || process.env.CORS_ORIGIN?.split(',')[0]?.trim() || 'http://localhost:4000'
}

/** Convierte una ruta de la aplicación (`/alumno/misiones/x`) en URL absoluta. */
export async function toAbsoluteAppUrl(path: string): Promise<string> {
  const origin = await getAppOrigin()
  return `${origin}${path.startsWith('/') ? path : `/${path}`}`
}
