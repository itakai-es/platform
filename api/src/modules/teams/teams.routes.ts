import type { FastifyInstance, FastifyRequest } from 'fastify'
import { z } from 'zod'
import { BATCH_MAX } from '../behaviors/behaviors.service.js'
import {
  MAX_POINTS,
  MAX_TEAMS,
  TEAM_COLORS,
  TEAM_EMBLEMS,
  TEAM_SET_KINDS,
  teamsService,
} from './teams.service.js'

/**
 * Equipos de una clase (ver teams.service.ts). Las del profesorado se registran
 * dentro de sus rutas, que ya exigen sesión y papel; la del alumnado, dentro de
 * las suyas, que exigen su matrícula. El acceso a la clase lo comprueba el
 * servicio y los errores los traduce el manejador global.
 */

const title = z.string().trim().min(1).max(60)
const studentIds = z.array(z.string().uuid()).max(BATCH_MAX)

const teamSchema = z.object({
  id: z.string().uuid().optional(),
  title,
  color: z.enum(TEAM_COLORS).nullish(),
  emblem: z.enum(TEAM_EMBLEMS).nullish(),
  studentIds,
})
const teamsSchema = z.array(teamSchema).min(1).max(MAX_TEAMS)

const createSetSchema = z.object({
  title,
  kind: z.enum(TEAM_SET_KINDS).default('base'),
  teams: teamsSchema,
})

const updateSetSchema = z.object({
  title: title.optional(),
  kind: z.enum(TEAM_SET_KINDS).optional(),
  archived: z.boolean().optional(),
})

// Editar la agrupación entera: con la versión que se leyó, para no pisar cambios de otra persona.
const replaceTeamsSchema = z.object({
  title: title.optional(),
  kind: z.enum(TEAM_SET_KINDS).optional(),
  teams: teamsSchema,
  updatedAt: z.string().datetime(),
})

const moveSchema = z.object({
  studentIds: studentIds.min(1),
  teamId: z.string().uuid().nullable(),
})

const shuffleSchema = z
  .object({
    teams: z.number().int().min(1).max(MAX_TEAMS).optional(),
    perTeam: z.number().int().min(1).max(BATCH_MAX).optional(),
    balanceByLevel: z.boolean().optional(),
    date: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, 'Fecha no válida')
      .optional(),
    studentIds: studentIds.optional(),
  })
  .refine(v => (v.teams === undefined) !== (v.perTeam === undefined), {
    message: 'Indica cuántos equipos o cuántas personas por equipo',
  })

/** Cada recurso, con signo: positivo da y negativo quita. */
const resourceDelta = z.number().int().min(-10_000).max(10_000).optional()

const awardSchema = z
  .object({
    behaviorId: z.string().uuid().optional(),
    title: z.string().trim().min(1).max(80).optional(),
    points: z.number().int().min(-MAX_POINTS).max(MAX_POINTS),
    distribute: z.boolean(),
    xp: resourceDelta,
    coins: resourceDelta,
    mana: resourceDelta,
    lives: resourceDelta,
  })
  .refine(v => !!v.behaviorId || !!v.title, { message: 'Elige un comportamiento o escribe el motivo' })

type ClassParams = { Params: { classId: string } }
type SetParams = { Params: { classId: string; setId: string } }

export async function teamsRoutes(fastify: FastifyInstance) {
  fastify.get('/classes/:classId/team-sets', async (request: FastifyRequest<ClassParams>) => {
    const { id } = request.user as { id: string }
    return teamsService.listSets(id, request.params.classId)
  })

  fastify.post('/classes/:classId/team-sets', async (request: FastifyRequest<ClassParams>) => {
    const { id } = request.user as { id: string }
    return teamsService.createSet(id, request.params.classId, createSetSchema.parse(request.body))
  })

  // Propone un reparto al azar para una agrupación nueva o para rehacer una; no guarda nada.
  fastify.post(
    '/classes/:classId/team-sets/shuffle',
    async (request: FastifyRequest<ClassParams>) => {
      const { id } = request.user as { id: string }
      return teamsService.shuffle(id, request.params.classId, shuffleSchema.parse(request.body))
    }
  )

  fastify.patch('/classes/:classId/team-sets/:setId', async (request: FastifyRequest<SetParams>) => {
    const { id } = request.user as { id: string }
    const { classId, setId } = request.params
    return teamsService.updateSet(id, classId, setId, updateSetSchema.parse(request.body))
  })

  fastify.delete('/classes/:classId/team-sets/:setId', async (request: FastifyRequest<SetParams>) => {
    const { id } = request.user as { id: string }
    return teamsService.deleteSet(id, request.params.classId, request.params.setId)
  })

  fastify.put(
    '/classes/:classId/team-sets/:setId/members',
    async (request: FastifyRequest<SetParams>) => {
      const { id } = request.user as { id: string }
      const input = replaceTeamsSchema.parse(request.body)
      return teamsService.replaceTeams(id, request.params.classId, request.params.setId, input)
    }
  )

  // Mover personas de equipo (arrastre y teclado): solo la pertenencia, nunca los equipos.
  fastify.post(
    '/classes/:classId/team-sets/:setId/moves',
    async (request: FastifyRequest<SetParams>) => {
      const { id } = request.user as { id: string }
      const input = moveSchema.parse(request.body)
      return teamsService.moveMembers(id, request.params.classId, request.params.setId, input)
    }
  )

  fastify.post(
    '/classes/:classId/teams/:teamId/awards',
    async (request: FastifyRequest<{ Params: { classId: string; teamId: string } }>) => {
      const { id } = request.user as { id: string }
      const input = awardSchema.parse(request.body)
      return teamsService.awardTeam(id, request.params.classId, request.params.teamId, input)
    }
  )
}

/** La del alumnado: su equipo y, si la clase la tiene, la clasificación de equipos. */
export async function studentTeamsRoutes(fastify: FastifyInstance) {
  fastify.get('/classes/:classId/teams', async (request: FastifyRequest<ClassParams>) => {
    return teamsService.getStudentTeams(request.studentEnrollment!, request.params.classId)
  })
}
