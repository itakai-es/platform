import { z } from 'zod'
import { prisma } from '../../config/database.js'
import type { Prisma } from '../../generated/prisma/client.js'

export const centerTypes = z.enum(['school', 'secondary', 'vocational', 'university', 'special', 'adult', 'other'])
const experience = z.enum(['under1', '1to3', '4to10', '11to20', 'over20'])
const stage = z.enum(['early', 'primary', 'secondary', 'baccalaureate', 'vocational', 'higher', 'special', 'adult', 'other', 'none'])
const subject = z.enum(['languages', 'math', 'science', 'technology', 'humanities', 'arts', 'physical', 'vocational', 'other', 'none'])
const gamificationExperience = z.enum(['never', 'under1', '1to3', '4to10', 'over10'])
const gamificationFrequency = z.enum(['none', 'term', 'monthly', 'weekly', 'severalWeekly'])

const centerAnswer = z.object({ centerId: z.string().uuid().nullable() })
const teachingAnswers = z.object({
  experience,
  stages: z.array(stage).min(1).max(10),
  subjects: z.array(subject).min(1).max(10),
})
const gamificationAnswers = z.object({ gamificationExperience, gamificationFrequency })

const profileAnswers = centerAnswer.merge(teachingAnswers).merge(gamificationAnswers)
const draftAnswers = z.discriminatedUnion('step', [
  centerAnswer.extend({ step: z.literal(1) }),
  teachingAnswers.extend({ step: z.literal(2) }),
])

export const centerInput = z.object({
  name: z.string().trim().min(1).max(200),
  municipality: z.string().trim().min(1).max(120),
  country: z.string().trim().min(1).max(120),
  type: centerTypes,
})

export const centerFields = {
  id: true, name: true, municipality: true, country: true, type: true,
} as const

type CenterInput = z.infer<typeof centerInput>

export class RegistrationError extends Error {
  constructor(message: string, public status = 400) {
    super(message)
  }
}

function normalizeCenterText(value: string) {
  return value.normalize('NFKC').toLowerCase().trim().replace(/\s+/gu, ' ')
}

function normalizedIdentity(input: CenterInput) {
  return JSON.stringify([input.name, input.municipality, input.country].map(normalizeCenterText))
}

/** Serialize profile and catalog writes so a merge cannot leave a stale reference. */
export function registrationTransaction<T>(operation: (tx: Prisma.TransactionClient) => Promise<T>) {
  return prisma.$transaction(async tx => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(518006214)`
    return operation(tx)
  })
}

export async function resolveCenter(tx: Prisma.TransactionClient, centerId: string) {
  let center = await tx.educationCenter.findUnique({ where: { id: centerId } })
  while (center?.mergedIntoId) {
    center = await tx.educationCenter.findUnique({ where: { id: center.mergedIntoId } })
  }
  if (!center) throw new RegistrationError('No se encuentra el centro', 404)
  const { id, name, municipality, country, type } = center
  return { id, name, municipality, country, type }
}

export async function searchCenters(query: string) {
  const terms = normalizeCenterText(query).split(' ').filter(Boolean)
  return prisma.educationCenter.findMany({
    where: {
      mergedIntoId: null,
      AND: terms.map(term => ({ identity: { contains: JSON.stringify(term).slice(1, -1) } })),
    },
    select: centerFields,
    orderBy: [{ name: 'asc' }, { municipality: 'asc' }, { id: 'asc' }],
    take: 50,
  })
}

export async function createCenter(input: CenterInput) {
  return registrationTransaction(async tx => {
    const identity = normalizedIdentity(input)
    const existing = await tx.educationCenter.findUnique({ where: { identity } })
    if (existing) return { center: await resolveCenter(tx, existing.id), existing: true }
    const center = await tx.educationCenter.create({ data: { ...input, identity }, select: centerFields })
    return { center, existing: false }
  })
}

export async function updateCenter(id: string, input: CenterInput) {
  return registrationTransaction(async tx => {
    if ((await resolveCenter(tx, id)).id !== id) throw new RegistrationError('El centro ya se ha fusionado', 409)
    const identity = normalizedIdentity(input)
    const duplicate = await tx.educationCenter.findUnique({ where: { identity } })
    if (duplicate && duplicate.id !== id) {
      if ((await resolveCenter(tx, duplicate.id)).id !== id) {
        throw new RegistrationError('Ya existe un centro con ese nombre y ubicación', 409)
      }
      // The survivor is reclaiming a name previously held by one of its aliases.
      await tx.educationCenter.update({ where: { id: duplicate.id }, data: { identity: `alias:${duplicate.id}` } })
    }
    return tx.educationCenter.update({ where: { id }, data: { ...input, identity }, select: centerFields })
  })
}

export async function mergeCenters(sourceId: string, targetId: string) {
  return registrationTransaction(async tx => {
    const target = await resolveCenter(tx, targetId)
    const source = await resolveCenter(tx, sourceId)
    if (source.id !== sourceId && source.id === target.id) return target
    if (target.id !== targetId) throw new RegistrationError('El centro de destino ya se ha fusionado', 409)
    if (source.id !== sourceId) throw new RegistrationError('El centro de origen ya se ha fusionado', 409)
    await tx.teacherProfessionalProfile.updateMany({
      where: { centerId: sourceId }, data: { centerId: target.id },
    })
    await tx.educationCenter.updateMany({
      where: { OR: [{ id: sourceId }, { mergedIntoId: sourceId }] },
      data: { mergedIntoId: target.id },
    })
    return target
  })
}

export async function getProfessionalProfile(userId: string) {
  return prisma.teacherProfessionalProfile.findUnique({
    where: { userId },
    include: { center: { select: centerFields } },
  })
}

function validateTeaching(answers: z.infer<typeof teachingAnswers>) {
  for (const values of [answers.stages, answers.subjects]) {
    if (values.length > 1 && values.some(value => value === 'none')) {
      throw new RegistrationError('La opción «Actualmente no imparto docencia» es excluyente')
    }
  }
  return { stages: [...new Set(answers.stages)], subjects: [...new Set(answers.subjects)] }
}

export async function saveDraft(userId: string, body: unknown) {
  const answers = draftAnswers.parse(body)
  return registrationTransaction(async tx => {
    const user = await tx.user.findUniqueOrThrow({ where: { id: userId } })
    if (!user.teacherRegistrationPending) throw new RegistrationError('El registro docente no está pendiente', 409)
    const profile = await tx.teacherProfessionalProfile.findUnique({ where: { userId } })
    if (answers.step === 2 && !profile?.centerAnswered) throw new RegistrationError('Responde primero a la pregunta sobre el centro')
    const data = answers.step === 1
      ? { centerAnswered: true, centerId: answers.centerId ? (await resolveCenter(tx, answers.centerId)).id : null }
      : { experience: answers.experience, ...validateTeaching(answers) }
    return tx.teacherProfessionalProfile.upsert({
      where: { userId },
      create: { userId, ...data },
      update: data,
      include: { center: { select: centerFields } },
    })
  })
}

export async function saveProfile(userId: string, body: unknown, finishRegistration: boolean) {
  return registrationTransaction(async tx => {
    const user = await tx.user.findUniqueOrThrow({ where: { id: userId } })
    const profile = await tx.teacherProfessionalProfile.findUnique({
      where: { userId }, include: { center: { select: centerFields } },
    })
    if (finishRegistration && !user.teacherRegistrationPending && profile?.completedAt) return profile
    if (user.teacherRegistrationPending !== finishRegistration) {
      throw new RegistrationError('El estado del registro docente ha cambiado', 409)
    }
    const answers = profileAnswers.parse(body)
    if (answers.gamificationExperience === 'never' && answers.gamificationFrequency !== 'none') {
      throw new RegistrationError('Si nunca has aplicado gamificación, elige «Actualmente no la uso»')
    }
    const data = {
      ...answers,
      ...validateTeaching(answers),
      centerAnswered: true,
      centerId: answers.centerId ? (await resolveCenter(tx, answers.centerId)).id : null,
      completedAt: profile?.completedAt ?? new Date(),
    }
    const saved = await tx.teacherProfessionalProfile.upsert({
      where: { userId },
      create: { userId, ...data },
      update: data,
      include: { center: { select: centerFields } },
    })
    if (finishRegistration) {
      await tx.user.update({ where: { id: userId }, data: { teacherRegistrationPending: false } })
    }
    return saved
  })
}
