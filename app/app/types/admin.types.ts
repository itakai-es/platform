/**
 * Admin Module Type Definitions
 * Tipos para el módulo de administración
 */
import type { AppLanguage } from '~/utils/app-languages'
import type { AccountType } from '~/types/auth.types'

/**
 * User con información completa para admin
 */
export interface AdminUser {
  id: string
  name: string
  /** Nulo en una cuenta que entra con usuario: no tiene correo. */
  email: string | null
  /** Nulo en una cuenta que se registró con su correo. */
  username: string | null
  /** Quién lleva la cuenta: su dueño (`self`) o el profesorado (`managed`). */
  accountType: AccountType
  /** Clase desde la que el profesorado gestiona la cuenta, si es gestionada. */
  homeClassId: string | null
  homeClassName: string | null
  /** Contraseña temporal pendiente de cambiar. */
  mustChangePassword: boolean
  role: 'student' | 'teacher' | 'admin'
  status: 'active' | 'suspended' | 'inactive'
  createdAt: string
  lastLogin: string | null
  classCount: number
}

/**
 * Estadísticas globales del sistema
 * Matches the real backend response from GET /admin/stats
 */
export interface SystemStats {
  activeUsersToday: number
  pendingSubmissions: number
  activeMissions: number
}

/**
 * Actividad del sistema (logs)
 */
export interface SystemActivity {
  id: string
  type: string
  title?: string
  description: string
  userName?: string
  avatar?: string | null
  timestamp?: string
  createdAt?: string
  metadata?: Record<string, unknown>
  icon?: string
  severity?: 'info' | 'warning' | 'error' | 'success'
}

/**
 * Estado de un servicio del sistema
 */
export interface SystemService {
  name: string
  status: 'operational' | 'degraded' | 'down'
  detail?: string
  uptime?: number
  latency?: number
}

/**
 * Acción sobre un usuario (suspender, activar, eliminar)
 */
export interface UserAction {
  action: 'suspend' | 'activate' | 'delete'
  userId: string
  reason?: string
}

/**
 * Página de un listado del panel que pagina el servidor: búsqueda, orden,
 * página (desde 1) y tamaño. Los filtros de cada listado se añaden encima.
 */
export interface AdminListQuery {
  search?: string
  sort?: string
  page?: number
  limit?: number
}

/**
 * Filtros para la tabla de usuarios
 */
export interface UserFilters extends AdminListQuery {
  role?: 'student' | 'teacher' | 'admin' | 'all'
  status?: 'active' | 'suspended' | 'inactive' | 'all'
  /** `orphan`: cuentas gestionadas que se han quedado sin ninguna clase. */
  accountType?: 'all' | AccountType | 'orphan'
  sort?: 'name-asc' | 'name-desc' | 'recent'
}

/**
 * Respuesta paginada de usuarios
 */
export interface PaginatedUsersResponse {
  users: AdminUser[]
  total: number
  page: number
  limit: number
  totalPages: number
}

// =============================================================================
// Activity Logs (extended)
// =============================================================================

export interface ActivityFilters {
  period?: '24h' | 'week' | 'month'
  severity?: 'info' | 'warning' | 'error' | 'success' | 'all'
  type?: SystemActivity['type'] | 'all'
  search?: string
  page?: number
  limit?: number
}

export interface PaginatedActivitiesResponse {
  activities: SystemActivity[]
  total: number
  page: number
  limit: number
  totalPages: number
}

// =============================================================================
// System Settings
// =============================================================================

export interface GeneralSettings {
  platformName: string
  contactEmail: string
  maintenanceMode: boolean
  registrationOpen: boolean
  defaultLanguage: AppLanguage
}

export interface GamificationSettings {
  xpMultiplier: number
  levelCap: number
  registrationBonus: number
  missionBonusCommon: number
  missionBonusRare: number
  missionBonusEpic: number
  missionBonusLegendary: number
}

export interface SecuritySettings {
  minPasswordLength: number
  maxLoginAttempts: number
  sessionTimeout: number
  require2FA: boolean
}

export interface NotificationSettings {
  emailEnabled: boolean
  apiThreshold: number
  diskThreshold: number
}

// ── Configuración de instancia / auto-hospedaje ──

/** Endpoint compatible con OpenAI (texto o imágenes). Sin capar a un proveedor. */
export interface AiEndpoint {
  baseUrl: string
  apiKey: string
  model: string
}

export interface AiSettings {
  text: AiEndpoint
  image: AiEndpoint
}

export type StorageDriver = 'local' | 's3'

export interface StorageSettings {
  driver: StorageDriver
  s3: {
    endpoint: string
    region: string
    bucket: string
    accessKeyId: string
    secretAccessKey: string
    publicBaseUrl: string
    forcePathStyle: boolean
  }
}

export interface DomainSettings {
  appUrl: string
  corsOrigins: string
}

/**
 * Configuración global de la instancia editable desde el panel de admin.
 * Los campos secreto (API keys, claves R2) llegan enmascarados (`••••••••`)
 * cuando ya tienen valor; enviarlos sin cambiar los conserva.
 */
export interface SystemSettings {
  ai: AiSettings
  storage: StorageSettings
  domain: DomainSettings
  general: GeneralSettings
}

// =============================================================================
// Admin Classes & Missions
// =============================================================================

export interface AdminClass {
  id: string
  name: string
  teacherName: string
  studentCount: number
  missionCount: number
  createdAt: string
}

export interface AdminClassFilters extends AdminListQuery {
  sort?: 'name-asc' | 'name-desc' | 'students-desc' | 'missions-desc' | 'recent'
}

export interface PaginatedClassesResponse {
  classes: AdminClass[]
  total: number
  page: number
  limit: number
  totalPages: number
}

export interface AdminMission {
  id: string
  title: string
  className: string
  teacherName: string
  enigmaCount: number
  rarity: string
  xpReward: number
  status: string
  deadline: string | null
  createdAt: string
}

export interface AdminMissionFilters extends AdminListQuery {
  status?: 'activa' | 'bloqueada' | 'all'
  rarity?: 'comun' | 'rara' | 'epica' | 'legendaria' | 'all'
  sort?: 'name-asc' | 'name-desc' | 'xp-desc' | 'enigmas-desc' | 'recent'
}

export interface PaginatedMissionsResponse {
  missions: AdminMission[]
  total: number
  page: number
  limit: number
  totalPages: number
}

// =============================================================================
// System Logs
// =============================================================================

export interface SystemLog {
  id: string
  level: 'info' | 'warning' | 'error' | 'success'
  category:
    | 'health_check'
    | 'service_status'
    | 'security'
    | 'performance'
    | 'maintenance'
    | 'backup'
  title: string
  message: string
  service?: string
  metadata?: Record<string, unknown>
  createdAt: string
}

export interface SystemLogFilters {
  period?: '24h' | 'week' | 'month'
  level?: 'info' | 'warning' | 'error' | 'success' | 'all'
  category?: SystemLog['category'] | 'all'
  search?: string
  page?: number
  limit?: number
}

export interface PaginatedSystemLogsResponse {
  logs: SystemLog[]
  total: number
  page: number
  limit: number
  totalPages: number
}

// =============================================================================
// Analytics
// =============================================================================

export interface AnalyticsMetric {
  label: string
  value: number
  percentage?: number
  color?: string
}

export interface TimeSeriesPoint {
  label: string
  value: number
}

export interface ServiceHealthEntry {
  name: string
  status: 'operational' | 'degraded' | 'down'
  uptime: number
  avgLatency: number
  p95Latency: number
  requests24h: number
}

export interface AnalyticsData {
  overview: {
    totalUsers: number
    activeUsersToday: number
    activeSchools: number
    missionsCompleted: number
    avgCompletionRate: number
    newUsersThisPeriod: number
    newMissionsThisPeriod: number
    totalSubmissions: number
    pendingSubmissions: number
  }
  usersByRole: AnalyticsMetric[]
  missionsByStatus: AnalyticsMetric[]
  missionsByRarity: AnalyticsMetric[]
  schoolComparison: {
    name: string
    students: number
    teachers: number
    missions: number
    activityRate: number
  }[]
  // System performance
  systemHealth: {
    cpuUsage: number
    memoryUsage: number
    diskUsage: number
    diskUsedGB: number
    diskTotalGB: number
    dbLatency: number
  }
  serviceHealth: ServiceHealthEntry[]
  // Time series
  responseTimeSeries: TimeSeriesPoint[]
  activeUsersSeries: TimeSeriesPoint[]
  requestsSeries: TimeSeriesPoint[]
  // AI / Token usage
  aiUsage: {
    totalTokensUsed: number
    avgTokensPerUser: number
    totalConversations: number
    avgConversationsPerUser: number
    tokensByAssistant: AnalyticsMetric[]
    tokensSeries: TimeSeriesPoint[]
  }
  // Top-level KPIs
  kpis: {
    avgResponseTime: number
    avgResponseTimePrev: number
    errorRate: number
    errorRatePrev: number
    requestsPerMinute: number
    requestsPerMinutePrev: number
    uptimePercent: number
  }
}
