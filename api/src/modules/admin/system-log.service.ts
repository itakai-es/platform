import { prisma } from '../../config/database.js'
import type { Prisma } from '../../generated/prisma/client.js'
import type { SystemLogLevel, SystemLogCategory } from '../../generated/prisma/enums.js'

interface CreateSystemLogParams {
  level: SystemLogLevel
  category: SystemLogCategory
  title: string
  message: string
  service?: string
  metadata?: Record<string, unknown>
}

interface SystemLogFilters {
  period?: string
  level?: string
  category?: string
  search?: string
  page?: number
  limit?: number
}

// In-memory cache of last known service statuses to detect transitions
const lastServiceStatus = new Map<string, string>()

/** Apunta una entrada. Con `db`, dentro de esa transacción: se queda solo si se confirma. */
export async function createSystemLog(
  params: CreateSystemLogParams,
  db: Prisma.TransactionClient = prisma
) {
  return db.systemLog.create({
    data: {
      level: params.level,
      category: params.category,
      title: params.title,
      message: params.message,
      service: params.service,
      metadata: params.metadata ? JSON.parse(JSON.stringify(params.metadata)) : undefined,
    },
  })
}

export async function fetchSystemLogs(filters: SystemLogFilters) {
  const page = filters.page || 1
  const limit = Math.min(filters.limit || 10, 100)
  const skip = (page - 1) * limit

  let since = new Date()
  switch (filters.period) {
    case 'week':
    case '7d':
      since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
      break
    case 'month':
    case '30d':
      since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
      break
    default:
      since = new Date(Date.now() - 24 * 60 * 60 * 1000)
  }

  const where: Record<string, unknown> = {
    createdAt: { gte: since },
  }

  if (filters.level && filters.level !== 'all') {
    where.level = filters.level
  }

  if (filters.category && filters.category !== 'all') {
    where.category = filters.category
  }

  if (filters.search) {
    where.OR = [
      { title: { contains: filters.search, mode: 'insensitive' } },
      { message: { contains: filters.search, mode: 'insensitive' } },
      { service: { contains: filters.search, mode: 'insensitive' } },
    ]
  }

  const [logs, total] = await Promise.all([
    prisma.systemLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    }),
    prisma.systemLog.count({ where }),
  ])

  return {
    logs,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  }
}

/**
 * Logs service health check results, only recording events on status transitions
 * (e.g., operational → down, down → operational) to avoid flooding the logs.
 */
export async function logServiceHealthResults(
  services: Array<{ name: string; status: string; detail: string }>,
) {
  const logsToCreate: CreateSystemLogParams[] = []

  for (const svc of services) {
    const previousStatus = lastServiceStatus.get(svc.name)
    lastServiceStatus.set(svc.name, svc.status)

    // Skip if status hasn't changed (or first check and operational)
    if (previousStatus === svc.status) continue
    if (previousStatus === undefined && svc.status === 'operational') continue

    if (svc.status === 'down') {
      logsToCreate.push({
        level: 'error',
        category: 'service_status',
        title: `Servicio caído: ${svc.name}`,
        message: svc.detail,
        service: svc.name,
        metadata: { status: svc.status, previousStatus: previousStatus ?? 'unknown' },
      })
    } else if (svc.status === 'degraded') {
      logsToCreate.push({
        level: 'warning',
        category: 'service_status',
        title: `Servicio degradado: ${svc.name}`,
        message: svc.detail,
        service: svc.name,
        metadata: { status: svc.status, previousStatus: previousStatus ?? 'unknown' },
      })
    } else if (svc.status === 'operational' && previousStatus && previousStatus !== 'operational') {
      logsToCreate.push({
        level: 'success',
        category: 'service_status',
        title: `Servicio recuperado: ${svc.name}`,
        message: svc.detail,
        service: svc.name,
        metadata: { status: svc.status, previousStatus },
      })
    }
  }

  // Fire and forget - don't block the health check response
  if (logsToCreate.length > 0) {
    Promise.all(logsToCreate.map(log => createSystemLog(log))).catch(err => {
      console.error('Error logging service health results:', err)
    })
  }
}
