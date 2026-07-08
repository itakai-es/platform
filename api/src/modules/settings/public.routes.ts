import type { FastifyInstance } from 'fastify'
import { getGeneralSettings } from './settings.service.js'

/**
 * Configuración pública (no sensible) que el frontend puede leer sin
 * autenticación: nombre de la plataforma, idioma por defecto, si el registro
 * está abierto y si la instancia está en modo mantenimiento.
 */
export async function publicConfigRoutes(fastify: FastifyInstance) {
  fastify.get('/config', async () => {
    const general = await getGeneralSettings()
    return {
      platformName: general.platformName,
      defaultLanguage: general.defaultLanguage,
      registrationOpen: general.registrationOpen,
      maintenanceMode: general.maintenanceMode,
    }
  })
}
