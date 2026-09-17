import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify'
import { NotFoundError } from '../../utils/errors.js'
import type { ClassUser } from '../../utils/class-access.js'
import { getDomainSettings } from '../settings/settings.service.js'
import type { FileDisposition } from './file-links.js'
import {
  issueFileLink,
  openPrivateFile,
  resolveDocumentFile,
  resolveSignedFile,
  resolveSubmissionFile,
  type PrivateFile,
} from './files.service.js'

/**
 * Descarga de los ficheros privados (entregas y documentos de misión). Dos vías,
 * las dos con la comprobación de acceso delante:
 *  - con la sesión en la cabecera, para descargar desde la aplicación;
 *  - con un enlace temporal firmado, que emite una ruta con sesión, para lo que
 *    tiene que pedir el navegador por su cuenta (abrir un vídeo en otra pestaña).
 *
 * Sin acceso, 404. Nada de esto se cachea.
 */

/** Cabecera con el nombre original: en ASCII para navegadores viejos y en UTF-8 para el resto. */
function contentDisposition(disposition: FileDisposition, fileName: string): string {
  const safe = fileName.replace(/[\\/\r\n]/g, '_').trim() || 'archivo'
  const ascii = safe.replace(/[^\x20-\x7e]/g, '_').replace(/"/g, '_')
  return `${disposition}; filename="${ascii}"; filename*=UTF-8''${encodeURIComponent(safe)}`
}

async function sendPrivateFile(
  request: FastifyRequest,
  reply: FastifyReply,
  file: PrivateFile,
  disposition: FileDisposition
) {
  const content = await openPrivateFile(file, request.headers.range)

  reply
    .header('Content-Type', file.mimeType)
    .header('Content-Disposition', contentDisposition(disposition, file.fileName))
    .header('Cache-Control', 'no-store')
    .header('X-Content-Type-Options', 'nosniff')
    .header('Accept-Ranges', 'bytes')

  if (disposition === 'inline') {
    // Lo que se muestra en el navegador no puede cargar nada más ni ejecutar nada.
    reply.header(
      'Content-Security-Policy',
      "default-src 'none'; img-src 'self'; media-src 'self'; object-src 'self'; style-src 'unsafe-inline'"
    )
  }
  if (content.range) {
    reply
      .status(206)
      .header(
        'Content-Range',
        `bytes ${content.range.start}-${content.range.end}/${content.range.total}`
      )
  }
  if (content.length !== null) reply.header('Content-Length', content.length)

  return reply.send(content.stream)
}

export async function filesRoutes(fastify: FastifyInstance) {
  const withSession = { preHandler: fastify.authenticate }

  // Descarga de una entrega: su autor o el profesorado de la clase.
  fastify.get<{ Params: { submissionId: string } }>(
    '/submissions/:submissionId',
    withSession,
    async (request, reply) => {
      const file = await resolveSubmissionFile(
        request.params.submissionId,
        request.user as ClassUser
      )
      return sendPrivateFile(request, reply, file, 'attachment')
    }
  )

  // Enlace temporal para abrir una entrega en el navegador.
  fastify.post<{ Params: { submissionId: string } }>(
    '/submissions/:submissionId/link',
    withSession,
    async request => {
      const file = await resolveSubmissionFile(
        request.params.submissionId,
        request.user as ClassUser
      )
      return issueFileLink(file)
    }
  )

  // Descarga de un documento de misión: profesorado de la clase y alumnado matriculado.
  fastify.get<{ Params: { documentId: string } }>(
    '/documents/:documentId',
    withSession,
    async (request, reply) => {
      const file = await resolveDocumentFile(request.params.documentId, request.user as ClassUser)
      return sendPrivateFile(request, reply, file, 'attachment')
    }
  )

  // Enlace temporal para abrir un documento (un vídeo, una vista previa).
  fastify.post<{ Params: { documentId: string } }>(
    '/documents/:documentId/link',
    withSession,
    async request => {
      const file = await resolveDocumentFile(request.params.documentId, request.user as ClassUser)
      return issueFileLink(file)
    }
  )

  // Enlace firmado: sin sesión, pero solo vale para ese fichero y caduca pronto.
  // Si ya no vale y quien lo pide es una pestaña del navegador, se le lleva a la
  // página que lo explica en su idioma; si es una petición de la aplicación, 404.
  fastify.get<{ Querystring: { token?: string } }>('/link', async (request, reply) => {
    try {
      const { file, disposition } = await resolveSignedFile(request.query.token || '')
      return await sendPrivateFile(request, reply, file, disposition)
    } catch (error) {
      if (!(error instanceof NotFoundError)) throw error
      const { appUrl } = await getDomainSettings()
      if (appUrl && (request.headers.accept || '').includes('text/html')) {
        return reply.redirect(`${appUrl.replace(/\/+$/, '')}/archivo-no-disponible`, 302)
      }
      throw error
    }
  })
}
