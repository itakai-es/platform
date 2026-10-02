import { it, expect, beforeAll, afterAll } from 'vitest'
import { describeWithDatabase } from '../helpers/test-db.js'
import { randomUUID } from 'node:crypto'
import type { FastifyInstance } from 'fastify'

/**
 * Topes de lo que se escribe en una clase y sale en abierto en la ficha pública
 * de una plantilla: el nombre, la historia y los metadatos tienen un largo
 * máximo, y la portada tiene que ser una imagen subida en ese momento o un
 * fichero público de la plataforma. Se comprueba al crear la clase y al
 * guardarla. Lo que llega igual que lo guardado pasa siempre: una clase de
 * antes de los topes se sigue pudiendo editar. Al duplicar, el nombre de la
 * copia se recorta para caber.
 *
 * Usa Fastify, JWT, servicios y Postgres de verdad: necesita TEST_DATABASE_URL
 * (ver tests/helpers/test-db.ts).
 */

import {
  buildApp,
  createClassFixture,
  prisma,
  type ClassFixture,
} from '../helpers/class-fixture.js'
import { teacherRoutes } from '../../src/modules/teachers/teachers.routes.js'
import { CLASS_TEXT_LIMITS } from '../../src/modules/teachers/teachers.service.js'

const NAME_MAX = CLASS_TEXT_LIMITS.name.max
const NARRATIVE_MAX = CLASS_TEXT_LIMITS.narrative.max
const METADATA_MAX = CLASS_TEXT_LIMITS.subject.max

describeWithDatabase('topes de los textos y la portada de una clase', () => {
  let app: FastifyInstance
  let f: ClassFixture
  const tag = randomUUID().slice(0, 8)
  const cover = `/uploads/covers/${tag}.png`
  const aiCover = `/uploads/ai-generated/covers/covers-${tag}.png`

  const send = (method: 'POST' | 'PUT', url: string, payload: Record<string, unknown>) =>
    app.inject({
      method,
      url,
      payload,
      headers: { authorization: `Bearer ${f.token('owner')}` },
    })
  const create = (payload: Record<string, unknown>) => send('POST', '/teacher/classes', payload)
  const update = (payload: Record<string, unknown>) =>
    send('PUT', `/teacher/classes/${f.classId}`, payload)
  const stored = () => prisma.class.findUniqueOrThrow({ where: { id: f.classId } })

  beforeAll(async () => {
    app = await buildApp(async instance => {
      await instance.register(teacherRoutes, { prefix: '/teacher' })
    })
    f = await createClassFixture(app)
  })

  afterAll(async () => {
    await f?.cleanup()
    await app?.close()
  })

  it('los topes quedan muy por encima de lo que hay guardado', () => {
    // En desarrollo, el nombre más largo es de 86 caracteres y la historia más
    // larga, de unos 6.500; ningún metadato de las listas pasa de 50.
    expect(NAME_MAX).toBeGreaterThanOrEqual(200)
    expect(NARRATIVE_MAX).toBeGreaterThanOrEqual(50_000)
    for (const field of ['subject', 'language', 'educationLevel', 'province'] as const) {
      expect(CLASS_TEXT_LIMITS[field].max, field).toBeGreaterThanOrEqual(120)
    }
  })

  it('al crear: justo en el tope se guarda; pasado, 400 con un mensaje claro y sin clase nueva', async () => {
    const count = () => prisma.class.count({ where: { teacherId: f.users.owner.id } })

    const atLimit = await create({
      name: `${tag} ${'n'.repeat(NAME_MAX - tag.length - 1)}`,
      narrative: 'h'.repeat(NARRATIVE_MAX),
      subject: 's'.repeat(METADATA_MAX),
      backgroundImage: cover,
    })
    expect(atLimit.statusCode).toBe(201)
    expect(atLimit.json().class.backgroundImage).toBe(cover)

    const before = await count()
    const cases: Array<[Record<string, unknown>, string]> = [
      [
        { name: 'n'.repeat(NAME_MAX + 1) },
        `El nombre de la clase no puede pasar de ${NAME_MAX} caracteres.`,
      ],
      [
        { name: `Clase ${tag}`, narrative: 'h'.repeat(NARRATIVE_MAX + 1) },
        'La historia de la clase no puede pasar de 50.000 caracteres.',
      ],
      [
        { name: `Clase ${tag}`, subject: 's'.repeat(METADATA_MAX + 1) },
        `La asignatura no puede pasar de ${METADATA_MAX} caracteres.`,
      ],
      [
        { name: `Clase ${tag}`, province: 'p'.repeat(METADATA_MAX + 1) },
        `La provincia no puede pasar de ${METADATA_MAX} caracteres.`,
      ],
    ]
    for (const [payload, message] of cases) {
      const response = await create(payload)
      expect(response.statusCode, message).toBe(400)
      expect(response.json()).toEqual({ message, code: 'VALIDATION_ERROR' })
    }
    expect(await count()).toBe(before)
  })

  it('la portada: una de la plataforma, sí; una de fuera o de una carpeta privada, no', async () => {
    for (const ok of [cover, aiCover]) {
      const response = await create({ name: `Portada ${tag}`, backgroundImage: ok })
      expect(response.statusCode, ok).toBe(201)
      expect(response.json().class.backgroundImage, ok).toBe(ok)
    }

    const bad = [
      'https://rastreador.invalid/pixel.gif',
      `/uploads/submissions/${tag}.pdf`,
      `/uploads/documents/${tag}.pdf`,
      '/uploads/covers/x.png), url(https://rastreador.invalid/pixel.gif',
      '/uploads/../../etc/passwd',
      'javascript:alert(1)',
      'data:text/html;base64,PGgxPmhvbGE8L2gxPg==',
    ]
    for (const backgroundImage of bad) {
      const created = await create({ name: `Portada ${tag}`, backgroundImage })
      expect(created.statusCode, backgroundImage).toBe(400)
      expect(created.json().message).toBe(
        'La portada tiene que ser una imagen subida a la plataforma.'
      )

      const updated = await update({ backgroundImage })
      expect(updated.statusCode, backgroundImage).toBe(400)
    }
    expect((await stored()).backgroundImage).not.toBeTruthy()

    // Al guardar también vale una de la plataforma, y vacía la quita.
    expect((await update({ backgroundImage: aiCover })).statusCode).toBe(200)
    expect((await stored()).backgroundImage).toBe(aiCover)
    expect((await update({ backgroundImage: '' })).statusCode).toBe(200)
    expect((await stored()).backgroundImage).toBe('')
  })

  it('al guardar: pasado el tope, 400 y la clase no cambia', async () => {
    const before = await stored()
    const cases: Array<[Record<string, unknown>, string]> = [
      [
        { name: 'n'.repeat(NAME_MAX + 1) },
        `El nombre de la clase no puede pasar de ${NAME_MAX} caracteres.`,
      ],
      [
        { narrative: 'h'.repeat(NARRATIVE_MAX + 1) },
        'La historia de la clase no puede pasar de 50.000 caracteres.',
      ],
      [
        { language: 'l'.repeat(METADATA_MAX + 1) },
        `El idioma no puede pasar de ${METADATA_MAX} caracteres.`,
      ],
      [
        { educationLevel: 'e'.repeat(METADATA_MAX + 1) },
        `El nivel educativo no puede pasar de ${METADATA_MAX} caracteres.`,
      ],
    ]
    for (const [payload, message] of cases) {
      const response = await update(payload)
      expect(response.statusCode, message).toBe(400)
      expect(response.json()).toEqual({ message, code: 'VALIDATION_ERROR' })
    }
    const after = await stored()
    expect(after.updatedAt).toEqual(before.updatedAt)

    // Justo en el tope, sí.
    expect((await update({ narrative: 'h'.repeat(NARRATIVE_MAX) })).statusCode).toBe(200)
    expect((await stored()).narrative).toHaveLength(NARRATIVE_MAX)
  })

  it('los topes cuentan caracteres: un emoji es uno, aunque ocupe dos unidades', async () => {
    // 200 emojis son 400 unidades UTF-16: caben en el nombre; uno más, no.
    const emojis = '😀'.repeat(NAME_MAX)
    expect((await update({ name: emojis })).statusCode).toBe(200)
    expect((await stored()).name).toBe(emojis)
    expect((await update({ name: `${emojis}😀` })).statusCode).toBe(400)
    await update({ name: `Clase ${tag}` })
  })

  it('un fallo interno al guardar da un 500 sin el detalle de la base', async () => {
    // Postgres no admite el byte nulo en un texto: la consulta falla dentro.
    const response = await update({ narrative: 'hola\u0000adiós' })
    expect(response.statusCode).toBe(500)
    expect(response.json()).toEqual({ message: 'Error interno' })
  })

  it('una clase de antes de los topes se sigue editando: lo que llega igual que lo guardado pasa', async () => {
    // Guardada sin pasar por la API: más larga que los topes y con una portada de fuera.
    const legacy = {
      name: `Antigua ${tag} ${'n'.repeat(NAME_MAX)}`,
      narrative: 'h'.repeat(NARRATIVE_MAX + 10),
      subject: 's'.repeat(METADATA_MAX + 5),
      backgroundImage: 'https://almacen-antiguo.invalid/portada.png',
    }
    await prisma.class.update({ where: { id: f.classId }, data: legacy })

    // El formulario de ajustes manda el nombre, la portada y los metadatos tal cual, junto con lo que cambia.
    const settings = await update({
      name: legacy.name,
      backgroundImage: legacy.backgroundImage,
      subject: legacy.subject,
      schedule: 'Lunes 9:00',
      province: 'Valencia',
    })
    expect(settings.statusCode).toBe(200)
    // La historia, aunque pase del tope, no estorba para guardar lo demás.
    let saved = await stored()
    expect(saved).toMatchObject({ ...legacy, schedule: 'Lunes 9:00', province: 'Valencia' })

    // Mandarla tal cual también pasa; cambiarla por otra que pasa del tope, no.
    expect((await update({ narrative: legacy.narrative })).statusCode).toBe(200)
    expect((await update({ narrative: `${legacy.narrative}!` })).statusCode).toBe(400)
    // Recortarla, sí.
    expect((await update({ narrative: 'Una historia corta.' })).statusCode).toBe(200)

    // Cambiar el nombre o la portada exige ya que quepan y que valgan.
    expect((await update({ name: `${legacy.name}!` })).statusCode).toBe(400)
    expect((await update({ backgroundImage: 'https://otro.invalid/x.png' })).statusCode).toBe(400)
    expect((await update({ name: `Nueva ${tag}`, backgroundImage: cover })).statusCode).toBe(200)
    saved = await stored()
    expect(saved).toMatchObject({ name: `Nueva ${tag}`, backgroundImage: cover })
  })

  it('al duplicar, el nombre de la copia cabe en el tope', async () => {
    const longName = `${tag}${'n'.repeat(NAME_MAX - tag.length)}`
    await prisma.class.update({ where: { id: f.classId }, data: { name: longName } })

    const response = await app.inject({
      method: 'POST',
      url: `/teacher/classes/${f.classId}/duplicate`,
      payload: {},
      headers: { authorization: `Bearer ${f.token('owner')}` },
    })
    expect(response.statusCode).toBe(200)
    const name: string = response.json().class.name
    expect(name).toHaveLength(NAME_MAX)
    expect(name.endsWith(' (copia)')).toBe(true)
    expect(name.startsWith(tag)).toBe(true)

    // Sin partir un emoji que caiga justo en el corte (se guardaría «�»).
    const keep = NAME_MAX - ' (copia)'.length
    const head = `${tag}${'n'.repeat(keep - tag.length - 1)}😀`
    await prisma.class.update({
      where: { id: f.classId },
      data: { name: `${head}${'😀'.repeat(8)}` },
    })
    const emoji = await app.inject({
      method: 'POST',
      url: `/teacher/classes/${f.classId}/duplicate`,
      payload: {},
      headers: { authorization: `Bearer ${f.token('owner')}` },
    })
    expect(emoji.statusCode).toBe(200)
    expect(emoji.json().class.name).toBe(`${head} (copia)`)

    // Uno corto, como siempre.
    await prisma.class.update({ where: { id: f.classId }, data: { name: `Clase ${tag}` } })
    const short = await app.inject({
      method: 'POST',
      url: `/teacher/classes/${f.classId}/duplicate`,
      payload: {},
      headers: { authorization: `Bearer ${f.token('owner')}` },
    })
    expect(short.json().class.name).toBe(`Clase ${tag} (copia)`)
  })
})
