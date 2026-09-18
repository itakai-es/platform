import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify'
import { teachersService } from './teachers.service.js'
import { missionsService } from '../missions/missions.service.js'
import { shopService } from '../shop/shop.service.js'
import { behaviorsService } from '../behaviors/behaviors.service.js'
import { z, ZodError } from 'zod'
import { scheduleConfigSchema } from './schedule-config.schema.js'
import { ServiceUnavailableError, rethrowHttpError } from '../../utils/errors.js'
import { consumeRateLimit, releaseRateLimit } from '../../utils/rate-limit.js'
import { USERNAME_MAX_LENGTH, USERNAME_MIN_LENGTH } from '../../utils/identity.js'
import {
  createManagedStudent,
  createManagedStudents,
  ManagedRowsError,
  MANAGED_BATCH_MAX,
  proposeUsername,
  resetManagedStudentPassword,
} from './managed-students.service.js'
import {
  NICKNAME_MAX_LENGTH,
  removeStudentFromClass,
  updateStudentNickname,
} from './class-students.service.js'

/** Quien hace la petición: el `id` y el `role` que viajan en el token. */
type RequestUser = { id: string; role: string | null }

// Schemas
const createManagedStudentSchema = z.object({
  name: z.string().min(2, 'El nombre debe tener al menos 2 caracteres').max(120),
  // Sin usuario, lo propone el sistema.
  username: z.string().min(USERNAME_MIN_LENGTH).max(USERNAME_MAX_LENGTH).optional(),
})

// Las filas llegan tal cual se han escrito o importado: la revisión de cada una
// (nombre vacío, repetido, usuario mal formado) la hace el servicio y la devuelve
// fila a fila, así que aquí solo se acota el tamaño.
const managedBatchSchema = z.object({
  students: z
    .array(
      z.object({
        name: z.string().max(200),
        username: z.string().max(100).optional(),
      })
    )
    .min(1, 'La lista está vacía')
    .max(MANAGED_BATCH_MAX, `Como mucho ${MANAGED_BATCH_MAX} alumnos de una vez`),
})

const batchQuerySchema = z.object({
  dryRun: z.enum(['true', 'false']).optional(),
})

const studentNicknameSchema = z.object({
  nickname: z.string().max(NICKNAME_MAX_LENGTH * 2),
})

/**
 * Revisiones de listas por hora y por profesor. Revisar no crea nada, pero cada
 * revisión dice qué usuarios escritos están ocupados: con este límite no sirve
 * para recorrer usuarios en bucle.
 */
const MANAGED_REVIEW_LIMIT = { max: 30, windowMs: 60 * 60 * 1000 }

const usernameProposalSchema = z.object({
  name: z.string().min(1, 'Escribe el nombre del alumno').max(120),
})

/**
 * Altas de alumnado por hora y por profesor. Da de sobra para pasar varias listas
 * de clase de una sentada y corta el crear cuentas en bucle, que es lo que
 * abultaría la base sin coste para quien lo hace.
 */
const MANAGED_CREATE_LIMIT = { max: 200, windowMs: 60 * 60 * 1000 }
const createClassSchema = z.object({
  name: z.string().min(1),
  narrative: z.string().optional(),
  schedule: z.string().optional(),
  backgroundImage: z.string().optional(),
  // Metadatos de clasificación (opcionales; alimentan los filtros de plantillas).
  subject: z.string().optional(),
  language: z.string().optional(),
  educationLevel: z.string().optional(),
  province: z.string().optional(),
})

const classSettingsSchema = z
  .object({
    shop: z.boolean(),
    coins: z.boolean(),
    mana: z.boolean(),
    rankings: z.boolean(),
    xp: z.boolean(),
    behaviors: z.boolean(),
    lives: z.boolean(),
    visualEffects: z.boolean(),
    sounds: z.boolean(),
  })
  .partial()

const levelConfigSchema = z
  .object({
    mode: z.enum(['curve', 'custom']),
    baseXp: z.number(),
    exponent: z.number(),
    cap: z.number(),
    levelXp: z.array(z.number()),
    tiers: z.array(
      z.object({
        fromLevel: z.number(),
        toLevel: z.number(),
        title: z.string(),
        color: z.string(),
      })
    ),
  })
  .partial()

const updateClassSchema = z.object({
  name: z.string().optional(),
  narrative: z.string().optional(),
  schedule: z.string().optional(),
  backgroundImage: z.string().optional(),
  // Metadatos de clasificación (cadena vacía = sin especificar).
  subject: z.string().optional(),
  language: z.string().optional(),
  educationLevel: z.string().optional(),
  province: z.string().optional(),
  settings: classSettingsSchema.optional(),
  levelConfig: levelConfigSchema.optional(),
  scheduleConfig: scheduleConfigSchema.optional(),
})

const createBadgeSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  imageUrl: z.string().optional(),
  rarity: z.enum(['common', 'rare', 'epic', 'legendary']).optional(),
  missionId: z.string().uuid().optional(),
})

const updateGuideSchema = z.object({
  content: z.string(),
})

const archiveClassSchema = z.object({
  archived: z.boolean(),
})

// Qué copiar al duplicar una clase. Todo a true por defecto (copia completa).
const duplicateClassSchema = z.object({
  narrative: z.boolean().default(true),
  features: z.boolean().default(true),
  shop: z.boolean().default(true),
  behaviors: z.boolean().default(true),
  missions: z.boolean().default(true),
})

const shopItemSchema = z.object({
  name: z.string().min(1).max(60),
  description: z.string().max(200).optional(),
  price: z.number().int().min(0),
  active: z.boolean().optional(),
  kind: z.enum(['reward', 'power']).optional(),
  manaCost: z.number().int().min(0).optional(),
  usage: z.enum(['single', 'unlimited']).optional(),
  lifeRestore: z.number().int().min(0).optional(),
})

const shopItemUpdateSchema = shopItemSchema.partial()

const behaviorSchema = z.object({
  kind: z.enum(['positive', 'negative']),
  name: z.string().min(1).max(60),
  description: z.string().max(200).optional(),
  xp: z.number().int().min(0).optional(),
  coins: z.number().int().min(0).optional(),
  lives: z.number().int().min(0).optional(),
})

const behaviorUpdateSchema = behaviorSchema.partial()

const applyBehaviorSchema = z.object({
  studentId: z.string().uuid(),
})

const generateStudentAvatarSchema = z.object({
  avatar_id: z.string().min(1),
  wardrobe_prompt: z.string().min(1).max(500),
  background_prompt: z.string().min(1).max(500),
})

export async function teacherRoutes(fastify: FastifyInstance) {
  // All routes require authentication
  fastify.addHook('preHandler', async (request, reply) => {
    await fastify.authenticate(request, reply)
    if (reply.sent) return

    const user = request.user as { role: string | null }
    if (user.role !== 'teacher') {
      reply.status(403).send({ message: 'Acceso denegado. Solo profesores.' })
    }
  })

  // ==================== STATS ====================

  fastify.get('/stats', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { id } = request.user as { id: string }
      const stats = await teachersService.getStats(id)
      return stats
    } catch (error) {
      return reply.status(500).send({ message: 'Error interno' })
    }
  })

  // ==================== CLASSES ====================

  fastify.get('/classes', async (request: FastifyRequest<{ Querystring: { limit?: string; archived?: 'active' | 'archived' | 'all' } }>, reply: FastifyReply) => {
    try {
      const { id } = request.user as { id: string }
      const limit = request.query.limit ? parseInt(request.query.limit) : undefined
      const archived = request.query.archived || 'active'
      const result = await teachersService.getClasses(id, limit, archived)
      return result
    } catch (error) {
      return reply.status(500).send({ message: 'Error interno' })
    }
  })

  fastify.get('/classes/:classId', async (request: FastifyRequest<{ Params: { classId: string } }>, reply: FastifyReply) => {
    try {
      const { id } = request.user as { id: string }
      const { classId } = request.params
      const cls = await teachersService.getClassById(id, classId)
      return { class: cls }
    } catch (error) {
      rethrowHttpError(error)
      if (error instanceof Error) {
        return reply.status(404).send({ message: error.message })
      }
      return reply.status(500).send({ message: 'Error interno' })
    }
  })

  fastify.post('/classes', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { id } = request.user as { id: string }
      const data = createClassSchema.parse(request.body)
      const result = await teachersService.createClass(id, data)
      return reply.status(201).send(result)
    } catch (error) {
      if (error instanceof ZodError) {
        return reply.status(400).send({ message: 'Datos inválidos', errors: error.errors })
      }
      return reply.status(500).send({ message: 'Error interno' })
    }
  })

  // ==================== SHOP (teacher) ====================
  // El acceso a la clase lo comprueba el servicio: sin acceso responde 404 y con
  // un nivel que no llega, 403, a través del manejador global.

  fastify.get('/classes/:classId/shop', async (request: FastifyRequest<{ Params: { classId: string } }>, reply: FastifyReply) => {
    try {
      const { id } = request.user as { id: string }
      return await shopService.getTeacherShop(id, request.params.classId)
    } catch (error) {
      rethrowHttpError(error)
      return reply.status(500).send({ message: 'Error interno' })
    }
  })

  fastify.post('/classes/:classId/shop/items', async (request: FastifyRequest<{ Params: { classId: string } }>, reply: FastifyReply) => {
    try {
      const { id } = request.user as { id: string }
      const data = shopItemSchema.parse(request.body)
      const item = await shopService.createItem(id, request.params.classId, data)
      return reply.status(201).send(item)
    } catch (error) {
      if (error instanceof ZodError) {
        return reply.status(400).send({ message: 'Datos inválidos', errors: error.errors })
      }
      rethrowHttpError(error)
      return reply.status(500).send({ message: 'Error interno' })
    }
  })

  fastify.put('/classes/:classId/shop/items/:itemId', async (request: FastifyRequest<{ Params: { classId: string; itemId: string } }>, reply: FastifyReply) => {
    try {
      const { id } = request.user as { id: string }
      const data = shopItemUpdateSchema.parse(request.body)
      const item = await shopService.updateItem(id, request.params.classId, request.params.itemId, data)
      return item
    } catch (error) {
      if (error instanceof ZodError) {
        return reply.status(400).send({ message: 'Datos inválidos', errors: error.errors })
      }
      rethrowHttpError(error)
      if (error instanceof Error) {
        return reply.status(404).send({ message: error.message })
      }
      return reply.status(500).send({ message: 'Error interno' })
    }
  })

  fastify.delete('/classes/:classId/shop/items/:itemId', async (request: FastifyRequest<{ Params: { classId: string; itemId: string } }>, reply: FastifyReply) => {
    try {
      const { id } = request.user as { id: string }
      const result = await shopService.deleteItem(id, request.params.classId, request.params.itemId)
      return result
    } catch (error) {
      rethrowHttpError(error)
      if (error instanceof Error) {
        return reply.status(404).send({ message: error.message })
      }
      return reply.status(500).send({ message: 'Error interno' })
    }
  })

  // ==================== BEHAVIORS (teacher) ====================

  fastify.get('/classes/:classId/behaviors', async (request: FastifyRequest<{ Params: { classId: string } }>, reply: FastifyReply) => {
    try {
      const { id } = request.user as { id: string }
      return await behaviorsService.getBehaviors(id, request.params.classId)
    } catch (error) {
      rethrowHttpError(error)
      return reply.status(500).send({ message: 'Error interno' })
    }
  })

  fastify.post('/classes/:classId/behaviors', async (request: FastifyRequest<{ Params: { classId: string } }>, reply: FastifyReply) => {
    try {
      const { id } = request.user as { id: string }
      const data = behaviorSchema.parse(request.body)
      const behavior = await behaviorsService.createBehavior(id, request.params.classId, data)
      return reply.status(201).send(behavior)
    } catch (error) {
      if (error instanceof ZodError) {
        return reply.status(400).send({ message: 'Datos inválidos', errors: error.errors })
      }
      rethrowHttpError(error)
      return reply.status(500).send({ message: 'Error interno' })
    }
  })

  fastify.put('/classes/:classId/behaviors/:behaviorId', async (request: FastifyRequest<{ Params: { classId: string; behaviorId: string } }>, reply: FastifyReply) => {
    try {
      const { id } = request.user as { id: string }
      const data = behaviorUpdateSchema.parse(request.body)
      const behavior = await behaviorsService.updateBehavior(
        id,
        request.params.classId,
        request.params.behaviorId,
        data,
      )
      return behavior
    } catch (error) {
      if (error instanceof ZodError) {
        return reply.status(400).send({ message: 'Datos inválidos', errors: error.errors })
      }
      rethrowHttpError(error)
      if (error instanceof Error) {
        return reply.status(404).send({ message: error.message })
      }
      return reply.status(500).send({ message: 'Error interno' })
    }
  })

  fastify.delete('/classes/:classId/behaviors/:behaviorId', async (request: FastifyRequest<{ Params: { classId: string; behaviorId: string } }>, reply: FastifyReply) => {
    try {
      const { id } = request.user as { id: string }
      const result = await behaviorsService.deleteBehavior(
        id,
        request.params.classId,
        request.params.behaviorId,
      )
      return result
    } catch (error) {
      rethrowHttpError(error)
      if (error instanceof Error) {
        return reply.status(404).send({ message: error.message })
      }
      return reply.status(500).send({ message: 'Error interno' })
    }
  })

  fastify.post('/classes/:classId/behaviors/:behaviorId/apply', async (request: FastifyRequest<{ Params: { classId: string; behaviorId: string } }>, reply: FastifyReply) => {
    try {
      const { id } = request.user as { id: string }
      const { studentId } = applyBehaviorSchema.parse(request.body)
      const result = await behaviorsService.applyBehavior(
        id,
        request.params.classId,
        request.params.behaviorId,
        studentId,
      )
      return result
    } catch (error) {
      if (error instanceof ZodError) {
        return reply.status(400).send({ message: 'Datos inválidos', errors: error.errors })
      }
      rethrowHttpError(error)
      if (error instanceof Error) {
        return reply.status(400).send({ message: error.message })
      }
      return reply.status(500).send({ message: 'Error interno' })
    }
  })

  fastify.put('/classes/:classId', async (request: FastifyRequest<{ Params: { classId: string } }>, reply: FastifyReply) => {
    try {
      const { id } = request.user as { id: string }
      const { classId } = request.params
      const data = updateClassSchema.parse(request.body)
      const result = await teachersService.updateClass(id, classId, data)
      return result
    } catch (error) {
      if (error instanceof ZodError) {
        return reply.status(400).send({ message: 'Datos inválidos', errors: error.errors })
      }
      // El acceso (404/403) y las validaciones, como la de una plantilla publicada
      // sin metadatos (400), llegan con su estado.
      rethrowHttpError(error)
      if (error instanceof Error) {
        return reply.status(404).send({ message: error.message })
      }
      return reply.status(500).send({ message: 'Error interno' })
    }
  })

  // ── Marketplace de plantillas ──
  fastify.post('/classes/:classId/publish-template', async (request: FastifyRequest<{ Params: { classId: string } }>, reply: FastifyReply) => {
    try {
      const { id } = request.user as { id: string }
      const { publish } = z.object({ publish: z.boolean() }).parse(request.body)
      const result = await teachersService.publishTemplate(id, request.params.classId, publish)
      return result
    } catch (error) {
      if (error instanceof ZodError) {
        return reply.status(400).send({ message: 'Datos inválidos', errors: error.errors })
      }
      rethrowHttpError(error)
      if (error instanceof Error) {
        return reply.status(400).send({ message: error.message })
      }
      return reply.status(500).send({ message: 'Error interno' })
    }
  })

  fastify.get('/templates', async (request: FastifyRequest<{ Querystring: { subject?: string; educationLevel?: string; language?: string; province?: string; q?: string } }>, reply: FastifyReply) => {
    try {
      const { id } = request.user as { id: string }
      const result = await teachersService.listTemplates(id, request.query)
      return result
    } catch (error) {
      if (error instanceof Error) {
        return reply.status(500).send({ message: error.message })
      }
      return reply.status(500).send({ message: 'Error interno' })
    }
  })

  fastify.get('/templates/:classId', async (request: FastifyRequest<{ Params: { classId: string } }>, reply: FastifyReply) => {
    try {
      const { id } = request.user as { id: string }
      const result = await teachersService.getTemplateDetail(id, request.params.classId)
      return result
    } catch (error) {
      if (error instanceof Error) {
        return reply.status(404).send({ message: error.message })
      }
      return reply.status(500).send({ message: 'Error interno' })
    }
  })

  fastify.post('/templates/:classId/import', async (request: FastifyRequest<{ Params: { classId: string } }>, reply: FastifyReply) => {
    try {
      const { id } = request.user as { id: string }
      const result = await teachersService.importTemplate(id, request.params.classId)
      return result
    } catch (error) {
      if (error instanceof Error) {
        return reply.status(404).send({ message: error.message })
      }
      return reply.status(500).send({ message: 'Error interno' })
    }
  })

  fastify.patch('/classes/:classId/archive', async (request: FastifyRequest<{ Params: { classId: string } }>, reply: FastifyReply) => {
    try {
      const { id } = request.user as { id: string }
      const { classId } = request.params
      const { archived } = archiveClassSchema.parse(request.body)
      const result = await teachersService.setClassArchived(id, classId, archived)
      return result
    } catch (error) {
      if (error instanceof ZodError) {
        return reply.status(400).send({ message: 'Datos inválidos', errors: error.errors })
      }
      rethrowHttpError(error)
      if (error instanceof Error) {
        return reply.status(404).send({ message: error.message })
      }
      return reply.status(500).send({ message: 'Error interno' })
    }
  })

  fastify.post('/classes/:classId/duplicate', async (request: FastifyRequest<{ Params: { classId: string } }>, reply: FastifyReply) => {
    try {
      const { id } = request.user as { id: string }
      const options = duplicateClassSchema.parse(request.body ?? {})
      const result = await teachersService.duplicateClass(id, request.params.classId, options)
      return result
    } catch (error) {
      if (error instanceof ZodError) {
        return reply.status(400).send({ message: 'Datos inválidos', errors: error.errors })
      }
      rethrowHttpError(error)
      if (error instanceof Error) {
        return reply.status(404).send({ message: error.message })
      }
      return reply.status(500).send({ message: 'Error interno' })
    }
  })

  fastify.get('/classes/:classId/invitation-code', async (request: FastifyRequest<{ Params: { classId: string } }>, reply: FastifyReply) => {
    try {
      const { id } = request.user as { id: string }
      const { classId } = request.params
      const result = await teachersService.getInvitationCode(id, classId)
      return result
    } catch (error) {
      rethrowHttpError(error)
      if (error instanceof Error) {
        return reply.status(404).send({ message: error.message })
      }
      return reply.status(500).send({ message: 'Error interno' })
    }
  })

  fastify.get('/classes/:classId/missions', async (request: FastifyRequest<{ Params: { classId: string } }>, reply: FastifyReply) => {
    try {
      const { id } = request.user as { id: string }
      const { classId } = request.params
      const result = await teachersService.getClassMissions(id, classId)
      return result
    } catch (error) {
      rethrowHttpError(error)
      if (error instanceof Error) {
        return reply.status(404).send({ message: error.message })
      }
      return reply.status(500).send({ message: 'Error interno' })
    }
  })

  fastify.get('/classes/:classId/ranking', async (request: FastifyRequest<{ Params: { classId: string } }>, reply: FastifyReply) => {
    try {
      const { id } = request.user as { id: string }
      const { classId } = request.params
      const result = await teachersService.getClassRanking(id, classId)
      return result
    } catch (error) {
      rethrowHttpError(error)
      if (error instanceof Error) {
        return reply.status(404).send({ message: error.message })
      }
      return reply.status(500).send({ message: 'Error interno' })
    }
  })

  fastify.get('/classes/:classId/students', async (request: FastifyRequest<{ Params: { classId: string } }>, reply: FastifyReply) => {
    try {
      const { id } = request.user as { id: string }
      const { classId } = request.params
      const result = await teachersService.getClassStudents(id, classId)
      return result
    } catch (error) {
      rethrowHttpError(error)
      if (error instanceof Error) {
        return reply.status(404).send({ message: error.message })
      }
      return reply.status(500).send({ message: 'Error interno' })
    }
  })

  // Alta de una cuenta de alumnado sin correo en esta clase. Devuelve el usuario
  // y la contraseña temporal una sola vez: no se guardan en claro en ningún sitio.
  fastify.post(
    '/classes/:classId/students',
    async (request: FastifyRequest<{ Params: { classId: string } }>, reply: FastifyReply) => {
      try {
        const actor = request.user as RequestUser
        const { classId } = request.params
        const data = createManagedStudentSchema.parse(request.body)
        consumeRateLimit(`managed-student-create:${actor.id}`, MANAGED_CREATE_LIMIT)
        const result = await createManagedStudent(actor, { classId, ...data })
        return reply.status(201).send(result)
      } catch (error) {
        if (error instanceof ZodError) {
          return reply.status(400).send({ message: error.errors[0]?.message || 'Datos inválidos' })
        }
        rethrowHttpError(error)
        return reply.status(500).send({ message: 'Error interno' })
      }
    }
  )

  // Restablecer la contraseña de una cuenta gestionada. No lleva clase en el
  // camino: quien puede hacerlo se decide por la clase de ORIGEN de la cuenta,
  // que es la que la gestiona, y es también donde se registra la acción. Con una
  // clase en el camino, el camino diría que se comprueba algo que no se comprueba.
  fastify.post(
    '/students/:studentId/reset-password',
    async (request: FastifyRequest<{ Params: { studentId: string } }>, reply: FastifyReply) => {
      try {
        const actor = request.user as RequestUser
        const { studentId } = request.params
        const result = await resetManagedStudentPassword(actor, studentId)
        return result
      } catch (error) {
        rethrowHttpError(error)
        return reply.status(500).send({ message: 'Error interno' })
      }
    }
  )

  // Propuesta de usuario libre para un nombre. No responde si un usuario existe:
  // devuelve uno que se puede usar, así que no sirve para averiguar qué cuentas hay.
  fastify.get(
    '/classes/:classId/students/username-proposal',
    async (
      request: FastifyRequest<{ Params: { classId: string }; Querystring: { name?: string } }>,
      reply: FastifyReply
    ) => {
      try {
        const actor = request.user as RequestUser
        const { classId } = request.params
        const { name } = usernameProposalSchema.parse(request.query)
        consumeRateLimit(`username-proposal:${actor.id}`, { max: 120, windowMs: 60 * 60 * 1000 })
        const result = await proposeUsername(actor, classId, name)
        return result
      } catch (error) {
        if (error instanceof ZodError) {
          return reply.status(400).send({ message: error.errors[0]?.message || 'Datos inválidos' })
        }
        rethrowHttpError(error)
        return reply.status(500).send({ message: 'Error interno' })
      }
    }
  )

  // Varias cuentas de una vez: las filas del formulario o una lista importada.
  // Con ?dryRun=true solo revisa la lista y dice el estado de cada fila; sin él,
  // crea todas en una transacción o ninguna, y devuelve las contraseñas
  // temporales una sola vez.
  fastify.post(
    '/classes/:classId/students/import',
    async (
      request: FastifyRequest<{ Params: { classId: string }; Querystring: { dryRun?: string } }>,
      reply: FastifyReply
    ) => {
      try {
        const actor = request.user as RequestUser
        const { classId } = request.params
        const dryRun = batchQuerySchema.parse(request.query).dryRun === 'true'
        const { students } = managedBatchSchema.parse(request.body)
        if (dryRun) {
          consumeRateLimit(`managed-student-review:${actor.id}`, MANAGED_REVIEW_LIMIT)
          return await createManagedStudents(actor, classId, students, { dryRun })
        }
        // Las altas cuentan de una en una, y solo las que se crean. El cupo se
        // aparta antes de crear, para que varias listas a la vez no quepan todas
        // en el mismo hueco, y se devuelve lo que no se llega a crear.
        const createKey = `managed-student-create:${actor.id}`
        consumeRateLimit(createKey, MANAGED_CREATE_LIMIT, students.length)
        let created = 0
        try {
          const result = await createManagedStudents(actor, classId, students)
          created = result.dryRun ? 0 : result.created.length
          return reply.status(201).send(result)
        } finally {
          releaseRateLimit(createKey, students.length - created)
        }
      } catch (error) {
        if (error instanceof ZodError) {
          return reply.status(400).send({ message: error.errors[0]?.message || 'Datos inválidos' })
        }
        if (error instanceof ManagedRowsError) {
          // Una lista rechazada enseña su revisión igual que el modo de prueba,
          // así que gasta del mismo cupo de revisiones.
          consumeRateLimit(`managed-student-review:${(request.user as RequestUser).id}`, MANAGED_REVIEW_LIMIT)
          return reply
            .status(400)
            .send({ message: error.message, code: error.code, rows: error.rows })
        }
        rethrowHttpError(error)
        return reply.status(500).send({ message: 'Error interno' })
      }
    }
  )

  // Alias del alumno en esta clase.
  fastify.patch(
    '/classes/:classId/students/:studentId',
    async (
      request: FastifyRequest<{ Params: { classId: string; studentId: string } }>,
      reply: FastifyReply
    ) => {
      try {
        const actor = request.user as RequestUser
        const { classId, studentId } = request.params
        const { nickname } = studentNicknameSchema.parse(request.body)
        const result = await updateStudentNickname(actor, classId, studentId, nickname)
        return result
      } catch (error) {
        if (error instanceof ZodError) {
          return reply.status(400).send({ message: error.errors[0]?.message || 'Datos inválidos' })
        }
        rethrowHttpError(error)
        return reply.status(500).send({ message: 'Error interno' })
      }
    }
  )

  // Quitar al alumno de esta clase: su matrícula y lo que tenía en ella.
  fastify.delete(
    '/classes/:classId/students/:studentId',
    async (
      request: FastifyRequest<{ Params: { classId: string; studentId: string } }>,
      reply: FastifyReply
    ) => {
      try {
        const actor = request.user as RequestUser
        const { classId, studentId } = request.params
        const result = await removeStudentFromClass(actor, classId, studentId)
        return result
      } catch (error) {
        rethrowHttpError(error)
        return reply.status(500).send({ message: 'Error interno' })
      }
    }
  )

  fastify.get('/classes/:classId/activities', async (request: FastifyRequest<{ Params: { classId: string }; Querystring: { limit?: string } }>, reply: FastifyReply) => {
    try {
      const { id } = request.user as { id: string }
      const { classId } = request.params
      const limit = request.query.limit ? parseInt(request.query.limit) : 10
      const result = await teachersService.getClassActivities(id, classId, limit)
      return result
    } catch (error) {
      rethrowHttpError(error)
      if (error instanceof Error) {
        return reply.status(404).send({ message: error.message })
      }
      return reply.status(500).send({ message: 'Error interno' })
    }
  })

  // Update class guide
  fastify.put('/classes/:classId/guide', async (request: FastifyRequest<{ Params: { classId: string } }>, reply: FastifyReply) => {
    try {
      const { id } = request.user as { id: string }
      const { classId } = request.params
      const data = updateGuideSchema.parse(request.body)
      const result = await teachersService.updateClassGuide(id, classId, data.content)
      return result
    } catch (error) {
      if (error instanceof ZodError) {
        return reply.status(400).send({ message: 'Datos inválidos', errors: error.errors })
      }
      rethrowHttpError(error)
      if (error instanceof Error) {
        return reply.status(404).send({ message: error.message })
      }
      return reply.status(500).send({ message: 'Error interno' })
    }
  })

  fastify.post('/classes/:classId/students/:studentId/avatar/generate', async (request: FastifyRequest<{ Params: { classId: string; studentId: string } }>, reply: FastifyReply) => {
    try {
      const { id } = request.user as { id: string }
      const { classId, studentId } = request.params
      const data = generateStudentAvatarSchema.parse(request.body)
      const result = await teachersService.generateStudentAvatar(id, classId, studentId, data)
      return result
    } catch (error) {
      if (error instanceof ZodError) {
        return reply.status(400).send({ message: 'Datos inválidos', errors: error.errors })
      }
      if (error instanceof ServiceUnavailableError) {
        return reply.status(503).send({ message: error.message, code: error.code })
      }
      rethrowHttpError(error)
      if (error instanceof Error) {
        return reply.status(400).send({ message: error.message })
      }
      return reply.status(500).send({ message: 'Error interno' })
    }
  })

  // ==================== STUDENTS ====================

  fastify.get('/students', async (request: FastifyRequest<{ Querystring: { classId?: string; archived?: 'active' | 'archived' | 'all' } }>, reply: FastifyReply) => {
    try {
      const { id } = request.user as { id: string }
      const { classId } = request.query
      const archived = request.query.archived || 'active'
      const result = await teachersService.getStudents(id, classId, archived)
      return result
    } catch (error) {
      rethrowHttpError(error)
      return reply.status(500).send({ message: 'Error interno' })
    }
  })

  fastify.get('/students/:studentId', async (request: FastifyRequest<{ Params: { studentId: string } }>, reply: FastifyReply) => {
    try {
      const { id } = request.user as { id: string }
      const { studentId } = request.params
      const result = await teachersService.getStudentById(id, studentId)
      return result
    } catch (error) {
      rethrowHttpError(error)
      if (error instanceof Error) {
        return reply.status(404).send({ message: error.message })
      }
      return reply.status(500).send({ message: 'Error interno' })
    }
  })

  // ==================== MISSIONS ====================

  fastify.get('/missions', async (request: FastifyRequest<{ Querystring: { classIdFilter?: string; limit?: string } }>, reply: FastifyReply) => {
    try {
      const { id } = request.user as { id: string }
      const { classIdFilter, limit } = request.query
      const result = await teachersService.getMissions(id, classIdFilter, limit ? parseInt(limit) : undefined)
      return result
    } catch (error) {
      rethrowHttpError(error)
      if (error instanceof Error) {
        return reply.status(404).send({ message: error.message })
      }
      return reply.status(500).send({ message: 'Error interno' })
    }
  })

  fastify.post('/missions', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { id } = request.user as { id: string }
      const body = request.body as any

      // Map frontend field names to backend expected names
      const data = {
        title: body.title,
        description: body.description,
        classId: body.classId,
        status: body.status === 'publicada' ? 'activa' : body.status === 'borrador' ? 'bloqueada' : (body.status || 'activa'),
        rarity: body.rarity,
        deadline: body.dueDate || body.deadline,
        enigmas: body.enigmas,
      }

      const result = await missionsService.createMission(id, data)
      return reply.status(201).send(result)
    } catch (error) {
      rethrowHttpError(error)
      if (error instanceof Error) {
        return reply.status(400).send({ message: error.message })
      }
      return reply.status(500).send({ message: 'Error interno' })
    }
  })

  fastify.put('/missions/:missionId', async (request: FastifyRequest<{ Params: { missionId: string } }>, reply: FastifyReply) => {
    try {
      const { id } = request.user as { id: string }
      const { missionId } = request.params
      const body = request.body as any

      const data = {
        title: body.title,
        description: body.description,
        classId: body.classId,
        status: body.status === 'publicada' ? 'activa' : body.status === 'borrador' ? 'bloqueada' : (body.status || 'activa'),
        rarity: body.rarity,
        deadline: body.dueDate || body.deadline,
      }

      const result = await missionsService.updateMission(id, missionId, data)
      return result
    } catch (error) {
      rethrowHttpError(error)
      if (error instanceof Error) {
        return reply.status(400).send({ message: error.message })
      }
      return reply.status(500).send({ message: 'Error interno' })
    }
  })

  // ==================== ACTIVITIES ====================

  fastify.get('/activities', async (request: FastifyRequest<{ Querystring: { limit?: string } }>, reply: FastifyReply) => {
    try {
      const { id } = request.user as { id: string }
      const limit = request.query.limit ? parseInt(request.query.limit) : 10
      const result = await teachersService.getActivities(id, limit)
      return result
    } catch (error) {
      return reply.status(500).send({ message: 'Error interno' })
    }
  })

  // ==================== BADGES ====================

  fastify.get('/badges', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { id } = request.user as { id: string }
      const result = await teachersService.getBadges(id)
      return result
    } catch (error) {
      return reply.status(500).send({ message: 'Error interno' })
    }
  })

  fastify.get('/badges/:badgeId', async (request: FastifyRequest<{ Params: { badgeId: string } }>, reply: FastifyReply) => {
    try {
      const { id } = request.user as { id: string }
      const result = await teachersService.getBadges(id)
      const badge = result.badges.find((b) => b.id === request.params.badgeId)
      if (!badge) {
        return reply.status(404).send({ message: 'Insignia no encontrada' })
      }
      return { badge }
    } catch (error) {
      return reply.status(500).send({ message: 'Error interno' })
    }
  })

  fastify.post('/badges', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { id } = request.user as { id: string }
      const data = createBadgeSchema.parse(request.body)
      const result = await teachersService.createBadge(id, data)
      return reply.status(201).send(result)
    } catch (error) {
      if (error instanceof ZodError) {
        return reply.status(400).send({ message: 'Datos inválidos', errors: error.errors })
      }
      // La insignia puede vincularse a una misión: si no hay acceso a ella, el
      // servicio lanza el error con su estado y lo resuelve el manejador global.
      rethrowHttpError(error)
      return reply.status(500).send({ message: 'Error interno' })
    }
  })

  fastify.put('/badges/:badgeId', async (request: FastifyRequest<{ Params: { badgeId: string } }>, reply: FastifyReply) => {
    try {
      const { id } = request.user as { id: string }
      const { badgeId } = request.params
      const data = createBadgeSchema.partial().parse(request.body)
      const result = await teachersService.updateBadge(id, badgeId, data)
      return result
    } catch (error) {
      if (error instanceof ZodError) {
        return reply.status(400).send({ message: 'Datos inválidos', errors: error.errors })
      }
      rethrowHttpError(error)
      if (error instanceof Error) {
        return reply.status(404).send({ message: error.message })
      }
      return reply.status(500).send({ message: 'Error interno' })
    }
  })

  fastify.delete('/badges/:badgeId', async (request: FastifyRequest<{ Params: { badgeId: string } }>, reply: FastifyReply) => {
    try {
      const { id } = request.user as { id: string }
      const { badgeId } = request.params
      const result = await teachersService.deleteBadge(id, badgeId)
      return result
    } catch (error) {
      rethrowHttpError(error)
      if (error instanceof Error) {
        return reply.status(404).send({ message: error.message })
      }
      return reply.status(500).send({ message: 'Error interno' })
    }
  })
}
