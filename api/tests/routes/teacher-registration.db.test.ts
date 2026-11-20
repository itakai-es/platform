import { afterAll, beforeAll, expect, it, vi } from 'vitest'
import { randomUUID } from 'node:crypto'
import type { FastifyInstance } from 'fastify'
import cookie from '@fastify/cookie'
import { OAuth2Client, LoginTicket } from 'google-auth-library'
import { describeWithDatabase } from '../helpers/test-db.js'
import { buildApp, prisma } from '../helpers/class-fixture.js'
import { adminRoutes } from '../../src/modules/admin/admin.routes.js'
import { authRoutes, onboardingRoutes } from '../../src/modules/auth/auth.routes.js'
import { teacherRoutes } from '../../src/modules/teachers/teachers.routes.js'
import { teacherRegistrationRoutes } from '../../src/modules/teacher-registration/teacher-registration.routes.js'
import { sessionGate } from '../../src/utils/session-gate.js'

describeWithDatabase('registro docente, catálogo y estadísticas', () => {
  let app: FastifyInstance
  const tag = randomUUID()
  const ids: string[] = []
  const centerIds: string[] = []
  const answers = {
    centerId: null as string | null,
    experience: '4to10',
    stages: ['primary', 'secondary', 'primary'],
    subjects: ['math', 'technology'],
    gamificationExperience: '1to3',
    gamificationFrequency: 'weekly',
  }
  const center = { name: `Centro ${tag}`, municipality: 'A Coruña', country: 'España', type: 'school' }

  async function user(role: 'teacher' | 'student' | 'admin' | null) {
    const account = await prisma.user.create({
      data: { email: `fixture-${randomUUID()}@test.invalid`, role, isOnboarded: role !== null, name: 'Prueba docente', passwordHash: 'x' },
    })
    ids.push(account.id)
    return account
  }

  function token(account: { id: string; role: string | null }) {
    return app.jwt.sign({ id: account.id, role: account.role })
  }

  function request(method: 'GET' | 'POST' | 'PUT' | 'PATCH', url: string, access?: string, payload?: object) {
    return app.inject({ method, url, payload, headers: access ? { authorization: `Bearer ${access}` } : {} })
  }

  async function chooseTeacher() {
    const account = await user(null)
    const response = await request('POST', '/onboarding/complete-role', token(account), { role: 'teacher' })
    expect(response.statusCode).toBe(200)
    expect(response.json().user.teacherRegistrationPending).toBe(true)
    return { account, access: response.json().accessToken as string }
  }

  async function addCenter(access: string, fields = center) {
    const response = await request('POST', '/teacher-registration/centers', access, fields)
    expect(response.statusCode).toBe(200)
    centerIds.push(response.json().center.id)
    return response.json()
  }

  beforeAll(async () => {
    app = await buildApp(async instance => {
      await instance.register(cookie)
      instance.addHook('onRequest', sessionGate)
      await instance.register(authRoutes, { prefix: '/auth' })
      await instance.register(onboardingRoutes, { prefix: '/onboarding' })
      await instance.register(teacherRoutes, { prefix: '/teacher' })
      await instance.register(teacherRegistrationRoutes, { prefix: '/teacher-registration' })
      await instance.register(adminRoutes, { prefix: '/admin' })
    })
  })

  afterAll(async () => {
    await prisma.user.deleteMany({ where: { id: { in: ids } } })
    await prisma.educationCenter.updateMany({
      where: { id: { in: centerIds } }, data: { mergedIntoId: null },
    })
    await prisma.educationCenter.deleteMany({ where: { id: { in: centerIds } } })
    await app?.close()
  })

  it('inicia el mismo registro desde un alta por correo y un alta por Google', async () => {
    const email = await request('POST', '/auth/signup', undefined, {
      email: `mail-${tag}@test.invalid`, password: 'registro-docente-123', name: 'Correo', acceptTerms: true,
    })
    expect(email.statusCode).toBe(201)
    ids.push(email.json().user.id)

    const googleIdBefore = process.env.GOOGLE_CLIENT_ID
    process.env.GOOGLE_CLIENT_ID = 'registro-docente-test'
    const ticket = new LoginTicket()
    vi.spyOn(ticket, 'getPayload').mockReturnValue({
      email: `oauth-${tag}@test.invalid`, name: 'Google',
    } as ReturnType<LoginTicket['getPayload']>)
    const verify = vi.spyOn(OAuth2Client.prototype, 'verifyIdToken').mockImplementation(
      (async () => ticket) as typeof OAuth2Client.prototype.verifyIdToken,
    )
    try {
      const oauth = await request('POST', '/auth/login-google', undefined, { credential: 'verified-by-test' })
      expect(oauth.statusCode).toBe(200)
      ids.push(oauth.json().user.id)
      for (const response of [email, oauth]) {
        expect(response.json().user.isOnboarded).toBe(false)
        const chosen = await request('POST', '/onboarding/complete-role', response.json().tokens.accessToken, { role: 'teacher' })
        expect(chosen.statusCode).toBe(200)
        expect(chosen.json().user.teacherRegistrationPending).toBe(true)
      }
    } finally {
      verify.mockRestore()
      if (googleIdBefore === undefined) delete process.env.GOOGLE_CLIENT_ID
      else process.env.GOOGLE_CLIENT_ID = googleIdBefore
    }
  }, 20_000)

  it('bloquea el área docente, retoma el borrador con otro token y permite reintentar la finalización', async () => {
    const existing = await user('teacher')
    expect((await request('GET', '/teacher/classes', token(existing))).statusCode).toBe(200)

    const { account, access } = await chooseTeacher()
    const guarded = await request('GET', '/teacher/classes', access)
    expect(guarded.statusCode).toBe(403)
    expect(guarded.json().code).toBe('TEACHER_REGISTRATION_REQUIRED')

    const malformed = await request('PATCH', '/teacher-registration/draft', access, { step: 1 })
    expect(malformed.statusCode).toBe(400)
    expect((await request('PATCH', '/teacher-registration/draft', access, { step: 1, centerId: null })).statusCode).toBe(200)
    expect((await request('PATCH', '/teacher-registration/draft', access, {
      step: 2, ...answers, stages: ['primary', 'none'],
    })).statusCode).toBe(400)
    expect((await request('PATCH', '/teacher-registration/draft', access, { step: 2, ...answers })).statusCode).toBe(200)

    const resumed = token({ id: account.id, role: 'teacher' })
    const state = await request('GET', '/auth/me', resumed)
    expect(state.json().user.teacherRegistrationPending).toBe(true)
    const draft = (await request('GET', '/teacher-registration/profile', resumed)).json().profile
    expect(draft).toMatchObject({
      centerAnswered: true, centerId: null, stages: ['primary', 'secondary'], completedAt: null,
    })

    expect((await request('POST', '/teacher-registration/finish', resumed, {
      ...answers, gamificationExperience: 'never',
    })).statusCode).toBe(400)
    const completed = await request('POST', '/teacher-registration/finish', resumed, answers)
    expect(completed.statusCode).toBe(200)
    const retry = await request('POST', '/teacher-registration/finish', resumed, answers)
    expect(retry.json()).toEqual(completed.json())
    const staleDraft = await request('PATCH', '/teacher-registration/draft', access, { step: 1, centerId: null })
    expect(staleDraft.statusCode).toBe(409)
    expect((await request('GET', '/teacher-registration/profile', access)).json().profile.completedAt).toBeTruthy()
    expect((await request('GET', '/teacher/classes', resumed)).statusCode).toBe(200)
    expect((await request('GET', '/auth/me', resumed)).json().user.teacherRegistrationPending).toBe(false)
    expect((await request('PUT', '/teacher-registration/profile', resumed, { ...answers, experience: 'over20' })).statusCode).toBe(200)
  })

  it('deduplica altas concurrentes, protege las respuestas y consolida centros incluso con escrituras concurrentes', async () => {
    const { account: teacher, access } = await chooseTeacher()
    const { account: pending, access: draftAccess } = await chooseTeacher()
    const legacy = await user('teacher')
    const admin = token(await user('admin'))
    const student = token(await user('student'))
    const [first, duplicate] = await Promise.all([
      addCenter(access), addCenter(draftAccess, { ...center, name: center.name.toUpperCase().replace(' ', '  ') }),
    ])
    expect(duplicate.center.id).toBe(first.center.id)
    expect([first.existing, duplicate.existing].sort()).toEqual([false, true])
    const source = first.center.id
    const target = (await addCenter(access, { ...center, municipality: 'Vigo' })).center.id

    expect((await request('GET', '/teacher-registration/centers', student)).statusCode).toBe(403)
    expect((await request('GET', '/teacher-registration/centers')).statusCode).toBe(401)
    expect((await request('GET', '/admin/teacher-registration/report', access)).statusCode).toBe(403)
    expect((await request('GET', `/admin/users/${teacher.id}/professional-profile`, token(legacy))).statusCode).toBe(403)

    expect((await request('POST', '/teacher-registration/finish', access, { ...answers, centerId: source })).statusCode).toBe(200)
    expect((await request('PUT', '/teacher-registration/profile', token(legacy), { ...answers, centerId: target })).statusCode).toBe(200)
    expect((await request('PATCH', '/teacher-registration/draft', draftAccess, { step: 1, centerId: source })).statusCode).toBe(200)
    expect((await request('GET', `/admin/users/${pending.id}/professional-profile`, admin)).json().profile).toBeNull()

    const before = (await request('GET', `/admin/teacher-registration/report?centerId=${source}`, admin)).json()
    expect(before.filtered).toBe(1)
    expect(before.distributions.stages).toEqual({ primary: 1, secondary: 1 })

    const combinedQuery = encodeURIComponent(`${center.name.toUpperCase().replace(' ', '  ')} Vigo`)
    const combinedSearch = await request('GET', `/teacher-registration/centers?q=${combinedQuery}`, access)
    expect(combinedSearch.json().map((result: { id: string }) => result.id)).toEqual([target])

    const catalog = '/admin/teacher-registration/centers'
    expect((await request('PUT', `${catalog}/${target}`, access, { ...center, municipality: 'Madrid' })).statusCode).toBe(403)
    expect((await request('POST', `${catalog}/${source}/merge`, access, { targetId: target })).statusCode).toBe(403)
    expect((await prisma.educationCenter.findUnique({ where: { id: source } }))?.mergedIntoId).toBeNull()
    const [merged, writing] = await Promise.all([
      request('POST', `${catalog}/${source}/merge`, admin, { targetId: target }),
      request('PATCH', '/teacher-registration/draft', draftAccess, { step: 1, centerId: source }),
    ])
    expect(merged.statusCode).toBe(200)
    expect(writing.statusCode).toBe(200)
    expect((await request('GET', '/teacher-registration/profile', draftAccess)).json().profile.centerId).toBe(target)
    const saved = await request('POST', '/teacher-registration/finish', draftAccess, { ...answers, centerId: source })
    expect(saved.statusCode).toBe(200)
    expect(saved.json().centerId).toBe(target)
    expect((await addCenter(access)).center.id).toBe(target)

    const search = await request('GET', `/teacher-registration/centers?q=${tag}`, access)
    expect(search.json().map((result: { id: string }) => result.id)).toEqual([target])
    expect((await request('PUT', `${catalog}/${target}`, admin, { ...center, municipality: 'Vigo', type: 'university' })).statusCode).toBe(200)

    const retryMerge = await request('POST', `${catalog}/${source}/merge`, admin, { targetId: target })
    expect(retryMerge.statusCode).toBe(200)
    expect(retryMerge.json().id).toBe(target)
    const other = (await addCenter(access, { ...center, municipality: 'Lugo' })).center.id
    const staleMerge = await request('POST', `${catalog}/${other}/merge`, admin, { targetId: source })
    expect(staleMerge.statusCode).toBe(409)
    expect(await prisma.educationCenter.findUnique({ where: { id: other } })).toMatchObject({ mergedIntoId: null })

    const otherTeacher = token(await user('teacher'))
    expect((await request('PUT', '/teacher-registration/profile', otherTeacher, {
      ...answers, centerId: other, experience: 'under1',
    })).statusCode).toBe(200)
    const noCenterUrl = '/admin/teacher-registration/report?centerId=none'
    const previousNoCenter = (await request('GET', noCenterUrl, admin)).json()
    const noCenterTeacher = token(await user('teacher'))
    expect((await request('PUT', '/teacher-registration/profile', noCenterTeacher, {
      ...answers, centerId: null, gamificationFrequency: 'monthly',
    })).statusCode).toBe(200)

    const university = (await request('GET', '/admin/teacher-registration/report?type=university', admin)).json()
    expect(university.filtered).toBe(3)
    expect(university.distributions.experience).toEqual({ '4to10': 3 })
    const school = (await request('GET', '/admin/teacher-registration/report?type=school', admin)).json()
    expect(school.filtered).toBe(1)
    expect(school.distributions.experience).toEqual({ under1: 1 })
    const noCenter = (await request('GET', noCenterUrl, admin)).json()
    expect(noCenter.filtered).toBe(previousNoCenter.filtered + 1)
    expect(noCenter.filtered).toBe(noCenter.withoutCenter)
    expect(noCenter.distributions.gamificationFrequency.monthly).toBe(
      (previousNoCenter.distributions.gamificationFrequency.monthly ?? 0) + 1,
    )

    const after = (await request('GET', `/admin/teacher-registration/report?centerId=${target}`, admin)).json()
    expect(after.filtered).toBe(3)
    expect(after.total).toBeGreaterThanOrEqual(after.completed)
    expect(after.distributions).toMatchObject({
      experience: { '4to10': 3 },
      stages: { primary: 3, secondary: 3 },
      gamificationExperience: { '1to3': 3 },
      gamificationFrequency: { weekly: 3 },
    })
    expect(after.centers).toContainEqual({ center: expect.objectContaining({ id: target, type: 'university' }), count: 3 })
    expect(after.centers.some((entry: { center: { id: string } }) => entry.center.id === source)).toBe(false)
    expect((await request('GET', `/admin/users/${teacher.id}/professional-profile`, admin)).json().profile).toMatchObject({
      centerId: target, subjects: answers.subjects,
    })
  })
})
