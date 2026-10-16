import type { FastifyInstance, FastifyRequest } from 'fastify'
import { z } from 'zod'
import { BATCH_MAX, behaviorsService } from './behaviors.service.js'

/**
 * Acciones de aula sobre varios estudiantes a la vez: aplicar un comportamiento
 * del catálogo y dar (o quitar) una recompensa libre con motivo. Siempre las
 * confirma antes la pantalla; aquí se aplican todo o nada.
 *
 * Se registra dentro de las rutas de profesorado, que ya exigen sesión y papel.
 * El acceso a la clase lo comprueba el servicio; los errores los traduce el
 * manejador global.
 */

const studentIdsSchema = z.array(z.string().uuid()).min(1).max(BATCH_MAX)

const applyManySchema = z.object({ studentIds: studentIdsSchema })

/** Cada recurso, con signo: positivo da y negativo quita. */
const resourceDelta = z.number().int().min(-10_000).max(10_000).optional()

const rewardSchema = z.object({
  studentIds: studentIdsSchema,
  xp: resourceDelta,
  coins: resourceDelta,
  mana: resourceDelta,
  lives: resourceDelta,
  reason: z.string().trim().min(1).max(80),
})

type ClassParams = { Params: { classId: string } }
type BehaviorParams = { Params: { classId: string; behaviorId: string } }

export async function classroomRoutes(fastify: FastifyInstance) {
  fastify.post(
    '/classes/:classId/behaviors/:behaviorId/apply-many',
    async (request: FastifyRequest<BehaviorParams>) => {
      const { id } = request.user as { id: string }
      const { studentIds } = applyManySchema.parse(request.body)
      return behaviorsService.applyBehaviorMany(
        id,
        request.params.classId,
        request.params.behaviorId,
        studentIds
      )
    }
  )

  fastify.post('/classes/:classId/rewards', async (request: FastifyRequest<ClassParams>) => {
    const { id } = request.user as { id: string }
    const input = rewardSchema.parse(request.body)
    return behaviorsService.grantRewards(id, request.params.classId, input)
  })
}
