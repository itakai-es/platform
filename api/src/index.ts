import Fastify from 'fastify'
import cors from '@fastify/cors'
import jwt from '@fastify/jwt'
import cookie from '@fastify/cookie'
import multipart from '@fastify/multipart'
import fastifyStatic from '@fastify/static'
import { join } from 'path'
import { env } from './config/env.js'
import { getDomainSettings, getGeneralSettings } from './modules/settings/settings.service.js'
import { publicConfigRoutes } from './modules/settings/public.routes.js'
import { authRoutes, onboardingRoutes } from './modules/auth/auth.routes.js'
import { studentsRoutes } from './modules/students/students.routes.js'
import { teacherRoutes } from './modules/teachers/teachers.routes.js'
import { classesRoutes } from './modules/classes/classes.routes.js'
import { missionsRoutes } from './modules/missions/missions.routes.js'
import { notificationsRoutes } from './modules/notifications/notifications.routes.js'
import { chatRoutes } from './modules/chat/chat.routes.js'
import { aiRoutes } from './modules/ai/ai.routes.js'
import { adminRoutes } from './modules/admin/admin.routes.js'
import { healthRoutes } from './modules/health/health.routes.js'
import { submissionsRoutes } from './modules/submissions/submissions.routes.js'
import { gamificationRoutes } from './modules/gamification/gamification.routes.js'
import { profileRoutes } from './modules/profile/profile.routes.js'
import { HttpError } from './utils/errors.js'
import { ZodError } from 'zod'
import { Prisma } from './generated/prisma/client.js'

// Extend Fastify types for JWT
declare module 'fastify' {
  interface FastifyInstance {
    authenticate: (request: FastifyRequest, reply: FastifyReply) => Promise<void>
  }
}

declare module '@fastify/jwt' {
  interface FastifyJWT {
    payload: { id: string; role: string | null }
    user: { id: string; role: string | null }
  }
}

async function buildServer() {
  const fastify = Fastify({
    logger: {
      level: env.NODE_ENV === 'development' ? 'info' : 'warn',
      transport:
        env.NODE_ENV === 'development'
          ? {
              target: 'pino-pretty',
              options: {
                translateTime: 'HH:MM:ss Z',
                ignore: 'pid,hostname',
              },
            }
          : undefined,
    },
    // Increase body limit to 10MB for base64 images in JSON payloads
    bodyLimit: 10 * 1024 * 1024,
  })

  // Global error handler — last-resort net so no raw error ever leaks to the user.
  // Per-route catches still run first; this only fires for whatever escapes them.
  fastify.setErrorHandler((error: unknown, request, reply) => {
    if (error instanceof HttpError) {
      return reply.status(error.statusCode).send({ message: error.message, code: error.code })
    }

    if (error instanceof ZodError) {
      return reply.status(400).send({
        message: error.errors[0]?.message || 'Datos inválidos',
        code: 'VALIDATION_ERROR',
        errors: error.errors,
      })
    }

    // Fastify's own validation errors (schema, body parsing, etc.)
    if ((error as { validation?: unknown }).validation) {
      return reply.status(400).send({ message: 'Datos inválidos', code: 'VALIDATION_ERROR' })
    }

    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2025') {
        return reply.status(404).send({ message: 'Recurso no encontrado', code: 'NOT_FOUND' })
      }
      if (error.code === 'P2002') {
        return reply.status(409).send({ message: 'Ya existe un recurso con esos datos', code: 'CONFLICT' })
      }
      if (error.code === 'P2003') {
        return reply.status(400).send({ message: 'Referencia inválida', code: 'INVALID_REFERENCE' })
      }
    }

    // Body too large, payload errors, etc. — Fastify sets statusCode
    const fastifyStatus = (error as { statusCode?: number }).statusCode
    if (fastifyStatus && fastifyStatus >= 400 && fastifyStatus < 500) {
      return reply.status(fastifyStatus).send({
        message: fastifyStatus === 401 ? 'No autorizado'
          : fastifyStatus === 403 ? 'Acceso denegado'
          : fastifyStatus === 404 ? 'Recurso no encontrado'
          : fastifyStatus === 413 ? 'El archivo es demasiado grande'
          : fastifyStatus === 429 ? 'Demasiadas peticiones'
          : 'Petición inválida',
        code: `HTTP_${fastifyStatus}`,
      })
    }

    // Everything else: log full detail server-side, give user a generic message.
    request.log.error({ err: error, url: request.url, method: request.method }, 'Unhandled route error')
    return reply.status(500).send({
      message: 'Ha ocurrido un error inesperado. Inténtalo de nuevo en unos momentos.',
      code: 'INTERNAL_ERROR',
    })
  })

  fastify.setNotFoundHandler((request, reply) => {
    return reply.status(404).send({
      message: 'Ruta no encontrada',
      code: 'ROUTE_NOT_FOUND',
    })
  })

  // Register CORS. Los orígenes permitidos se resuelven desde la configuración
  // de instancia (panel de admin), con `.env` (CORS_ORIGIN) como default de
  // arranque — así el dominio se puede cambiar sin tocar código.
  await fastify.register(cors, {
    origin: (origin, cb) => {
      // Sin cabecera Origin (same-origin, curl, apps nativas) → permitir.
      if (!origin) {
        cb(null, true)
        return
      }
      getDomainSettings()
        .then(({ corsOrigins }) => {
          const allowed = corsOrigins.split(',').map((o) => o.trim()).filter(Boolean)
          cb(null, allowed.includes(origin))
        })
        .catch(() => cb(null, false))
    },
    credentials: true,
  })

  // Register Cookie plugin (for HttpOnly refresh tokens)
  await fastify.register(cookie)

  // Register Multipart for file uploads (50MB max)
  await fastify.register(multipart, {
    limits: {
      fileSize: 50 * 1024 * 1024, // 50MB
    },
  })

  // Serve runtime user uploads (teacher badges, class covers, mission
  // documents, etc.). Backed by the `api_uploads_prod` Docker volume so
  // contents persist across deploys. Versioned static assets (system badge
  // SVGs, seed imagery) live in the frontend's `public/` folder and are
  // served by nginx directly — not here.
  await fastify.register(fastifyStatic, {
    root: join(process.cwd(), 'uploads'),
    prefix: '/uploads/',
    decorateReply: false,
  })

  // Register JWT with access token secret
  await fastify.register(jwt, {
    secret: env.JWT_ACCESS_SECRET,
  })

  // Auth middleware decorator
  fastify.decorate('authenticate', async function (request, reply) {
    try {
      await request.jwtVerify()
    } catch (err) {
      reply.status(401).send({ message: 'No autorizado' })
    }
  })

  // Modo mantenimiento (configurable desde el panel). Si está activo se bloquea
  // a todos con 503, salvo administradores — que pueden seguir entrando para
  // desactivarlo. Siempre se permiten login, health, config pública, ficheros y
  // el preflight CORS, para no dejar a nadie encerrado fuera.
  fastify.addHook('onRequest', async (request, reply) => {
    if (request.method === 'OPTIONS') return

    let maintenanceMode = false
    try {
      maintenanceMode = (await getGeneralSettings()).maintenanceMode
    } catch {
      return // no se pudo leer la config → no bloqueamos (fail-open)
    }
    if (!maintenanceMode) return

    const url = request.url
    if (
      url === '/' ||
      url.startsWith('/auth') ||
      url.startsWith('/health') ||
      url.startsWith('/public') ||
      url.startsWith('/uploads')
    ) {
      return
    }

    try {
      await request.jwtVerify()
      if ((request.user as { role?: string | null })?.role === 'admin') return
    } catch {
      /* sin sesión válida → tratado como no-admin */
    }

    return reply.status(503).send({
      message: 'La plataforma está en mantenimiento. Vuelve a intentarlo en unos minutos.',
      code: 'MAINTENANCE',
    })
  })

  // Role middleware helper
  const requireRole = (...roles: string[]) => {
    return async (request: any, reply: any) => {
      await fastify.authenticate(request, reply)
      if (reply.sent) return

      const user = request.user as { id: string; role: string | null }
      if (!user.role || !roles.includes(user.role)) {
        reply.status(403).send({ message: 'Acceso denegado' })
      }
    }
  }

  // Decorate fastify with requireRole helper
  fastify.decorate('requireRole', requireRole)

  // Health check root
  fastify.get('/', async () => {
    return {
      name: 'ITAKAI API',
      version: '1.0.0',
      status: 'running',
      timestamp: new Date().toISOString(),
    }
  })

  // Register routes
  await fastify.register(healthRoutes, { prefix: '/health' })
  await fastify.register(publicConfigRoutes, { prefix: '/public' })
  await fastify.register(authRoutes, { prefix: '/auth' })
  await fastify.register(onboardingRoutes, { prefix: '/onboarding' })
  await fastify.register(studentsRoutes, { prefix: '/students' })
  await fastify.register(teacherRoutes, { prefix: '/teacher' })
  await fastify.register(classesRoutes, { prefix: '/classes' })
  await fastify.register(missionsRoutes, { prefix: '/missions' })
  await fastify.register(notificationsRoutes, { prefix: '/notifications' })
  await fastify.register(chatRoutes, { prefix: '/chat' })
  await fastify.register(aiRoutes, { prefix: '/ai' })
  await fastify.register(adminRoutes, { prefix: '/admin' })
  await fastify.register(submissionsRoutes, { prefix: '/submissions' })
  await fastify.register(gamificationRoutes, { prefix: '/gamification' })
  await fastify.register(profileRoutes, { prefix: '/profile' })

  return fastify
}

async function start() {
  try {
    const server = await buildServer()

    await server.listen({
      port: env.PORT,
      host: '0.0.0.0',
    })

    console.log(`
🚀 ITAKAI Backend running!

   Local:    http://localhost:${env.PORT}
   Health:   http://localhost:${env.PORT}/health

   Environment: ${env.NODE_ENV}
`)
  } catch (err) {
    console.error('Error starting server:', err)
    process.exit(1)
  }
}

start()
