/**
 * Admin Module Type Definitions
 * Tipos para el módulo de administración
 */

/**
 * User con información completa para admin
 */
export interface AdminUser {
  id: string
  name: string
  email: string
  role: 'student' | 'teacher' | 'admin'
  status: 'active' | 'suspended' | 'inactive'
  createdAt: string
  lastLogin: string | null
  classCount: number
  schoolName?: string
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
 * Institución educativa (school)
 */
export interface School {
  id: string
  name: string
  status: 'active' | 'inactive'
  activeStudents: number
  activeTeachers: number
  totalClasses: number
  activityRate: number
  createdAt: string
  city?: string
  country?: string
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
 * Filtros para la tabla de usuarios
 */
export interface UserFilters {
  role?: 'student' | 'teacher' | 'admin' | 'all'
  status?: 'active' | 'suspended' | 'inactive' | 'all'
  search?: string
  schoolId?: string
  page?: number
  limit?: number
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
// Schools CRUD
// =============================================================================

export interface CreateSchoolPayload {
  name: string
  city: string
  country: string
}

export interface UpdateSchoolPayload {
  name?: string
  city?: string
  country?: string
}

export interface SchoolFilters {
  search?: string
  status?: 'active' | 'inactive' | 'all'
  page?: number
  limit?: number
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
  defaultLanguage: 'es' | 'en' | 'ca' | 'eu' | 'gl'
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

export interface AdminClassFilters {
  search?: string
  schoolId?: string
  status?: 'active' | 'inactive' | 'all'
  page?: number
  limit?: number
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

export interface AdminMissionFilters {
  search?: string
  schoolId?: string
  status?: 'active' | 'completed' | 'expired' | 'all'
  rarity?: 'comun' | 'rara' | 'epica' | 'legendaria' | 'all'
  page?: number
  limit?: number
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
