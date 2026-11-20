import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { prisma } from '../../config/database.js'
import { registrationHandler } from '../teacher-registration/teacher-registration.routes.js'
import {
  centerFields, centerInput, centerTypes, getProfessionalProfile, mergeCenters, RegistrationError,
  searchCenters, updateCenter,
} from '../teacher-registration/teacher-registration.service.js'

const idParams = z.object({ id: z.string().uuid() })
const reportScope = z.object({
  centerId: z.union([z.string().uuid(), z.literal('none')]).optional(),
  type: centerTypes.optional(),
}).refine(scope => !scope.centerId || !scope.type)

async function registrationReport({ centerId, type }: z.infer<typeof reportScope>) {
  const [total, profiles] = await prisma.$transaction([
    prisma.user.count({ where: { role: 'teacher' } }),
    prisma.teacherProfessionalProfile.findMany({
      where: { completedAt: { not: null }, user: { role: 'teacher' } },
      select: {
        center: { select: centerFields },
        experience: true, stages: true, subjects: true,
        gamificationExperience: true, gamificationFrequency: true,
      },
    }),
  ], { isolationLevel: 'RepeatableRead' })
  const centers = new Map<string, { center: NonNullable<(typeof profiles)[number]['center']>; count: number }>()
  const types: Record<string, number> = {}
  let withoutCenter = 0
  let filtered = 0
  const distributions = {
    experience: {} as Record<string, number>,
    stages: {} as Record<string, number>,
    subjects: {} as Record<string, number>,
    gamificationExperience: {} as Record<string, number>,
    gamificationFrequency: {} as Record<string, number>,
  }
  for (const { center, ...answers } of profiles) {
    if (center) {
      centers.set(center.id, { center, count: (centers.get(center.id)?.count ?? 0) + 1 })
      types[center.type] = (types[center.type] ?? 0) + 1
    } else {
      withoutCenter++
    }
    if (centerId && (center?.id ?? 'none') !== centerId) continue
    if (type && center?.type !== type) continue
    filtered++
    for (const field of Object.keys(distributions) as (keyof typeof distributions)[]) {
      const options = answers[field]
      const counts = distributions[field]
      for (const option of new Set(Array.isArray(options) ? options : options ? [options] : [])) {
        counts[option] = (counts[option] ?? 0) + 1
      }
    }
  }
  return {
    total, completed: profiles.length, withoutCenter, filtered, types, distributions,
    centers: [...centers.values()].sort((a, b) => a.center.name.localeCompare(b.center.name)),
  }
}

/** Registered within the administrator role hook. */
export function registerAdminTeacherRegistration(fastify: FastifyInstance) {
  fastify.get('/users/:id/professional-profile', registrationHandler(async request => {
    const { id } = idParams.parse(request.params)
    const teacher = await prisma.user.findFirst({ where: { id, role: 'teacher' }, select: { id: true } })
    if (!teacher) throw new RegistrationError('No se encuentra la cuenta docente', 404)
    const profile = await getProfessionalProfile(teacher.id)
    return { profile: profile?.completedAt ? profile : null }
  }))
  fastify.get('/teacher-registration/report', registrationHandler(request => registrationReport(reportScope.parse(request.query))))
  fastify.get('/teacher-registration/centers', registrationHandler(request => {
    const { q } = z.object({ q: z.string().trim().max(200).default('') }).parse(request.query)
    return searchCenters(q)
  }))
  fastify.put('/teacher-registration/centers/:id', registrationHandler(request => {
    const { id } = idParams.parse(request.params)
    return updateCenter(id, centerInput.parse(request.body))
  }))
  fastify.post('/teacher-registration/centers/:id/merge', registrationHandler(request => {
    const { id } = idParams.parse(request.params)
    const { targetId } = z.object({ targetId: z.string().uuid() }).parse(request.body)
    if (id === targetId) throw new RegistrationError('Elige dos centros distintos')
    return mergeCenters(id, targetId)
  }))
}
