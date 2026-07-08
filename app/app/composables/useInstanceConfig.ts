/**
 * Configuración pública de la instancia (viene de GET /public/config), cargada
 * una vez al arrancar por el plugin `instance-config.client.ts`. Los componentes
 * la leen con `useInstanceConfig()`.
 */
export interface InstanceConfig {
  platformName: string
  defaultLanguage: 'es' | 'en' | 'ca' | 'eu' | 'gl'
  registrationOpen: boolean
  maintenanceMode: boolean
}

export const useInstanceConfig = () => useState<InstanceConfig | null>('instanceConfig', () => null)
