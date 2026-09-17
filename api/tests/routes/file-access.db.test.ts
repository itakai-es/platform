import { it, expect, vi, beforeAll, afterAll, describe } from 'vitest'
import { describeWithDatabase } from '../helpers/test-db.js'
import { mkdir, rm, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { randomUUID } from 'node:crypto'
import Fastify, { type FastifyInstance } from 'fastify'
import fastifyStatic from '@fastify/static'

/**
 * Quién puede bajarse un fichero de los que no se sirven sin comprobar nada: las
 * entregas del alumnado y los documentos de misión.
 *
 * Lo que se fija aquí:
 *  - una entrega la ven su autor y el profesorado de la clase; nadie más;
 *  - un documento, el profesorado de la clase y el alumnado matriculado, con las
 *    mismas puertas que la misión (bloqueada, clase archivada);
 *  - un enlace temporal vale para su fichero y caduca; tocado o vencido, no vale;
 *  - las carpetas privadas no salen por la ruta estática, ni disfrazadas; el
 *    resto de `/uploads` sigue saliendo.
 *
 * Necesita TEST_DATABASE_URL (ver tests/helpers/test-db.ts) y escribe ficheros
 * de verdad en `uploads/`, que borra al acabar.
 */

vi.mock('../../src/utils/email.js', () => ({
  sendEmail: vi.fn(),
  sendPasswordResetEmail: vi.fn(),
  sendPasswordChangedEmail: vi.fn(),
  sendNotificationEmail: vi.fn(),
}))

import {
  buildApp,
  createClassFixture,
  prisma,
  type Actor,
  type ClassFixture,
} from '../helpers/class-fixture.js'
import { filesRoutes } from '../../src/modules/files/files.routes.js'
import { missionsService } from '../../src/modules/missions/missions.service.js'
import { signFileLink } from '../../src/modules/files/file-links.js'
import { isPublicUploadPath } from '../../src/modules/storage/storage.service.js'

const UPLOADS_ROOT = join(process.cwd(), 'uploads')

/** Deja un fichero en `uploads/<carpeta>/` y devuelve su clave y su URL guardada. */
async function putFile(folder: 'submissions' | 'documents', body: string, ext = 'txt') {
  const key = `${folder}/${randomUUID()}.${ext}`
  await mkdir(join(UPLOADS_ROOT, folder), { recursive: true })
  await writeFile(join(UPLOADS_ROOT, key), body)
  return { key, fileUrl: `/uploads/${key}` }
}

describeWithDatabase('acceso a los ficheros privados', () => {
  let app: FastifyInstance
  let f: ClassFixture
  const written: string[] = []

  let missionId: string
  let submissionId: string
  let documentId: string
  let videoDocumentId: string
  let submissionKey: string
  let documentKey: string

  const send = (method: 'GET' | 'POST', url: string, actor?: Actor) =>
    app.inject({
      method,
      url,
      headers: actor ? { authorization: `Bearer ${f.token(actor)}` } : {},
    })

  beforeAll(async () => {
    app = await buildApp(async instance => {
      await instance.register(filesRoutes, { prefix: '/files' })
    })
    f = await createClassFixture(app)

    missionId = await f.newMission()
    const enigmaId = await f.newEnigma(missionId)

    const submissionFile = await putFile('submissions', 'trabajo del alumno')
    submissionKey = submissionFile.key
    written.push(submissionFile.key)
    submissionId = await f.newSubmission(enigmaId)
    await prisma.enigmaSubmission.update({
      where: { id: submissionId },
      data: { fileUrl: submissionFile.fileUrl, fileName: 'mi entrega.txt' },
    })

    const documentFile = await putFile('documents', 'apuntes de clase')
    documentKey = documentFile.key
    written.push(documentFile.key)
    documentId = (
      await prisma.missionDocument.create({
        data: {
          missionId,
          name: 'Apuntes',
          fileUrl: documentFile.fileUrl,
          fileName: 'apuntes.txt',
          fileSize: 17,
          mimeType: 'text/plain',
        },
      })
    ).id

    const videoFile = await putFile('documents', 'no es un vídeo de verdad', 'mp4')
    written.push(videoFile.key)
    videoDocumentId = (
      await prisma.missionDocument.create({
        data: {
          missionId,
          name: 'Vídeo',
          fileUrl: videoFile.fileUrl,
          fileName: 'clase.mp4',
          fileSize: 24,
          mimeType: 'video/mp4',
        },
      })
    ).id
  })

  afterAll(async () => {
    await Promise.all(written.map(key => rm(join(UPLOADS_ROOT, key), { force: true })))
    await f?.cleanup()
    await app?.close()
  })

  describe('entregas', () => {
    it('sin sesión no se entrega nada', async () => {
      const res = await send('GET', `/files/submissions/${submissionId}`)
      expect(res.statusCode).toBe(401)
    })

    it('quien la entregó se la puede bajar, con su nombre original', async () => {
      const res = await send('GET', `/files/submissions/${submissionId}`, 'student')
      expect(res.statusCode).toBe(200)
      expect(res.body).toBe('trabajo del alumno')
      expect(res.headers['content-disposition']).toContain('attachment')
      expect(res.headers['content-disposition']).toContain('mi entrega.txt')
      expect(res.headers['cache-control']).toBe('no-store')
    })

    it('el profesorado de la clase también', async () => {
      const res = await send('GET', `/files/submissions/${submissionId}`, 'owner')
      expect(res.statusCode).toBe(200)
    })

    it('un profesor de otra clase no, y no sabe si existe', async () => {
      const res = await send('GET', `/files/submissions/${submissionId}`, 'other')
      expect(res.statusCode).toBe(404)
    })

    it('otro alumno tampoco', async () => {
      const res = await send('GET', `/files/submissions/${submissionId}`, 'outsider')
      expect(res.statusCode).toBe(404)
    })

    it('una entrega que no existe responde igual que una ajena', async () => {
      const res = await send('GET', `/files/submissions/${randomUUID()}`, 'owner')
      expect(res.statusCode).toBe(404)
    })

    it('un fichero guardado con acentos o espacios en el nombre se baja igual', async () => {
      const raro = await putFile('submissions', 'trabajo con nombre raro', 'práctica final')
      written.push(raro.key)
      const enigmaId = await f.newEnigma(missionId)
      const otra = await f.newSubmission(enigmaId)
      await prisma.enigmaSubmission.update({
        where: { id: otra },
        data: { fileUrl: raro.fileUrl, fileName: 'práctica final.pdf' },
      })

      const res = await send('GET', `/files/submissions/${otra}`, 'owner')
      expect(res.statusCode).toBe(200)
      expect(res.body).toBe('trabajo con nombre raro')
    })
  })

  describe('documentos de misión', () => {
    it('sin sesión no se entrega nada', async () => {
      const res = await send('GET', `/files/documents/${documentId}`)
      expect(res.statusCode).toBe(401)
    })

    it('el profesorado de la clase se lo baja', async () => {
      const res = await send('GET', `/files/documents/${documentId}`, 'owner')
      expect(res.statusCode).toBe(200)
      expect(res.body).toBe('apuntes de clase')
      expect(res.headers['content-disposition']).toContain('apuntes.txt')
    })

    it('el alumnado matriculado también', async () => {
      const res = await send('GET', `/files/documents/${documentId}`, 'student')
      expect(res.statusCode).toBe(200)
    })

    it('quien no es de la clase, no', async () => {
      expect((await send('GET', `/files/documents/${documentId}`, 'other')).statusCode).toBe(404)
      expect((await send('GET', `/files/documents/${documentId}`, 'outsider')).statusCode).toBe(404)
    })

    it('con la misión bloqueada el alumno deja de verlo, el profesor no', async () => {
      await prisma.mission.update({ where: { id: missionId }, data: { status: 'bloqueada' } })
      try {
        expect((await send('GET', `/files/documents/${documentId}`, 'student')).statusCode).toBe(
          404
        )
        expect((await send('GET', `/files/documents/${documentId}`, 'owner')).statusCode).toBe(200)
      } finally {
        await prisma.mission.update({ where: { id: missionId }, data: { status: 'activa' } })
      }
    })

    it('con la clase archivada, tampoco', async () => {
      await prisma.class.update({ where: { id: f.classId }, data: { archived: true } })
      try {
        expect((await send('GET', `/files/documents/${documentId}`, 'student')).statusCode).toBe(
          404
        )
      } finally {
        await prisma.class.update({ where: { id: f.classId }, data: { archived: false } })
      }
    })

    it('un documento que es un enlace externo no se sirve desde aquí', async () => {
      const linkDocument = await f.newDocument(missionId)
      const res = await send('GET', `/files/documents/${linkDocument}`, 'owner')
      expect(res.statusCode).toBe(404)
    })

    it('un enlace no puede señalar un fichero de los que se comprueban, ni con vueltas', async () => {
      for (const url of [
        `/uploads/${submissionKey}`,
        `/uploads/./${submissionKey}`,
        `/uploads//${submissionKey}`,
        `/uploads/documents/../${submissionKey}`,
        `/uploads/${documentKey}`,
      ]) {
        await expect(
          missionsService.uploadMissionDocument(f.users.owner.id, missionId, {
            name: 'Enlace',
            type: 'link',
            url,
          }),
          url
        ).rejects.toThrow()
      }
    })

    it('borrar un documento no borra ficheros que no son suyos', async () => {
      const { document } = await missionsService.uploadMissionDocument(
        f.users.owner.id,
        missionId,
        { name: 'Enlace', type: 'link', url: 'https://ejemplo.es/apuntes' }
      )
      // Una fila de enlace con una dirección hacia dentro (de antes de que se
      // rechazaran) tampoco arrastra el fichero al que señala.
      await prisma.missionDocument.update({
        where: { id: document.id },
        data: { fileUrl: `/uploads/./${submissionKey}` },
      })

      await missionsService.deleteMissionDocument(f.users.owner.id, document.id)
      expect((await send('GET', `/files/submissions/${submissionId}`, 'owner')).statusCode).toBe(
        200
      )
    })

    it('ni el de otro documento que sigue usándolo', async () => {
      const gemelo = await prisma.missionDocument.create({
        data: {
          missionId,
          name: 'Copia',
          fileUrl: `/uploads/${documentKey}`,
          fileName: 'apuntes.txt',
          fileSize: 17,
          mimeType: 'text/plain',
        },
      })

      await missionsService.deleteMissionDocument(f.users.owner.id, gemelo.id)
      expect((await send('GET', `/files/documents/${documentId}`, 'owner')).statusCode).toBe(200)
    })
  })

  describe('enlaces temporales', () => {
    const linkOf = async (url: string, actor: Actor) => {
      const res = await send('POST', url, actor)
      expect(res.statusCode).toBe(200)
      return JSON.parse(res.body) as { url: string; expiresAt: string }
    }

    it('el enlace de un vídeo se abre sin sesión y se muestra en el navegador', async () => {
      const { url } = await linkOf(`/files/documents/${videoDocumentId}/link`, 'student')
      const res = await send('GET', url)
      expect(res.statusCode).toBe(200)
      expect(res.headers['content-type']).toBe('video/mp4')
      expect(res.headers['content-disposition']).toContain('inline')
      expect(res.headers['content-security-policy']).toContain("default-src 'none'")
    })

    it('un documento de texto se descarga aunque sea por enlace', async () => {
      const { url } = await linkOf(`/files/documents/${documentId}/link`, 'owner')
      const res = await send('GET', url)
      expect(res.statusCode).toBe(200)
      expect(res.headers['content-disposition']).toContain('attachment')
    })

    it('quien no tiene acceso no consigue enlace', async () => {
      expect(
        (await send('POST', `/files/documents/${documentId}/link`, 'outsider')).statusCode
      ).toBe(404)
      expect(
        (await send('POST', `/files/submissions/${submissionId}/link`, 'other')).statusCode
      ).toBe(404)
    })

    it('un enlace tocado no vale', async () => {
      const { url } = await linkOf(`/files/documents/${documentId}/link`, 'owner')
      const [body, mac] = decodeURIComponent(url.split('token=')[1]).split('.')
      const swapped = `${body}.${mac.slice(0, -2)}${mac.slice(-2) === 'AA' ? 'BB' : 'AA'}`
      expect((await send('GET', `/files/link?token=${swapped}`)).statusCode).toBe(404)
      expect((await send('GET', `/files/link?token=${body}`)).statusCode).toBe(404)
      expect((await send('GET', '/files/link')).statusCode).toBe(404)
    })

    it('un enlace caducado no vale', async () => {
      const { token } = signFileLink(
        { k: 'document', i: documentId, f: documentKey, d: 'attachment' },
        -10
      )
      expect((await send('GET', `/files/link?token=${token}`)).statusCode).toBe(404)
    })

    it('un enlace no sirve para otro fichero ni para salirse de su carpeta', async () => {
      const otherFile = signFileLink({
        k: 'document',
        i: documentId,
        f: submissionKey,
        d: 'attachment',
      })
      expect((await send('GET', `/files/link?token=${otherFile.token}`)).statusCode).toBe(404)

      const traversal = signFileLink({
        k: 'document',
        i: documentId,
        f: 'documents/../../package.json',
        d: 'attachment',
      })
      expect((await send('GET', `/files/link?token=${traversal.token}`)).statusCode).toBe(404)
    })

    it('el enlace de un documento borrado deja de valer', async () => {
      const file = await putFile('documents', 'temporal')
      written.push(file.key)
      const doomed = await prisma.missionDocument.create({
        data: {
          missionId,
          name: 'Temporal',
          fileUrl: file.fileUrl,
          fileName: 'temporal.txt',
          fileSize: 8,
          mimeType: 'text/plain',
        },
      })
      const { url } = await linkOf(`/files/documents/${doomed.id}/link`, 'owner')
      expect((await send('GET', url)).statusCode).toBe(200)

      await prisma.missionDocument.delete({ where: { id: doomed.id } })
      expect((await send('GET', url)).statusCode).toBe(404)
    })
  })

  describe('ruta estática de /uploads', () => {
    let statics: FastifyInstance
    let publicName: string

    beforeAll(async () => {
      const cover = `covers/${randomUUID()}.txt`
      await mkdir(join(UPLOADS_ROOT, 'covers'), { recursive: true })
      await writeFile(join(UPLOADS_ROOT, cover), 'portada')
      written.push(cover)
      publicName = cover

      statics = Fastify()
      // Misma configuración que la aplicación para lo que aquí importa.
      await statics.register(fastifyStatic, {
        root: UPLOADS_ROOT,
        prefix: '/uploads/',
        decorateReply: false,
        allowedPath: isPublicUploadPath,
      })
      await statics.ready()
    })

    afterAll(async () => {
      await statics?.close()
    })

    it('las portadas y demás siguen saliendo', async () => {
      const res = await statics.inject({ method: 'GET', url: `/uploads/${publicName}` })
      expect(res.statusCode).toBe(200)
      expect(res.body).toBe('portada')
    })

    it('las entregas y los documentos ya no', async () => {
      expect(
        (await statics.inject({ method: 'GET', url: `/uploads/${submissionKey}` })).statusCode
      ).toBe(404)
      expect(
        (await statics.inject({ method: 'GET', url: `/uploads/${documentKey}` })).statusCode
      ).toBe(404)
    })

    it('ni disfrazadas en la ruta', async () => {
      const disguised = [
        `/uploads/./${submissionKey}`,
        `/uploads//${submissionKey}`,
        `/uploads/covers/../${submissionKey}`,
        `/uploads/${submissionKey.replace('/', '%2F')}`,
      ]
      for (const url of disguised) {
        const res = await statics.inject({ method: 'GET', url })
        expect(res.statusCode, url).not.toBe(200)
      }
    })
  })
})
