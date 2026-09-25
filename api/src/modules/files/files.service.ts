import { prisma } from '../../config/database.js'
import { NotFoundError } from '../../utils/errors.js'
import {
  assertDocumentMember,
  assertSubmissionAccess,
  type ClassUser,
} from '../../utils/class-access.js'
import {
  privateUploadFromUrl,
  readUpload,
  type StoredUpload,
  type UploadRead,
} from '../storage/storage.service.js'
import { getStorageSettings } from '../settings/settings.service.js'
import { signFileLink, verifyFileLink, type FileDisposition, type FileKind } from './file-links.js'

/**
 * Entrega de los ficheros privados: entregas del alumnado y documentos de misión.
 *
 * Quién puede cada cosa:
 *  - una entrega, quien la hizo y el profesorado de la clase (lectura o más);
 *  - un documento de misión, el profesorado de la clase y el alumnado
 *    matriculado, con las mismas puertas que la misión (una clase archivada o
 *    una misión bloqueada se cierran para el alumno).
 *
 * Quien no tiene acceso recibe siempre 404, igual que si el fichero no
 * existiera: quién ha entregado qué no se deduce del código de respuesta.
 */

/** Fichero privado ya resuelto: la fila existe, hay acceso y el fichero está guardado. */
export interface PrivateFile {
  kind: FileKind
  id: string
  /** Dónde está guardado: la clave (`submissions/<uuid>.<ext>`) y su almacenamiento. */
  upload: StoredUpload
  /** Nombre con el que se descarga. */
  fileName: string
  mimeType: string
}

const OCTET_STREAM = 'application/octet-stream'

/** Tipos por extensión, para las filas que no guardan el tipo (las entregas). */
const TYPE_BY_EXTENSION: Record<string, string> = {
  pdf: 'application/pdf',
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  gif: 'image/gif',
  webp: 'image/webp',
  svg: 'image/svg+xml',
  mp4: 'video/mp4',
  webm: 'video/webm',
  mov: 'video/quicktime',
  mp3: 'audio/mpeg',
  ogg: 'audio/ogg',
  wav: 'audio/wav',
  txt: 'text/plain',
  csv: 'text/csv',
  zip: 'application/zip',
  doc: 'application/msword',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  ppt: 'application/vnd.ms-powerpoint',
  pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  xls: 'application/vnd.ms-excel',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
}

function typeFromName(name: string): string {
  const ext = name.toLowerCase().split('.').pop() || ''
  return TYPE_BY_EXTENSION[ext] || OCTET_STREAM
}

/**
 * Tipos que el navegador puede mostrar sin riesgo. Cualquier otro se descarga,
 * para que un fichero subido no se interprete como página de la propia API. El
 * SVG queda fuera a propósito: es un documento que puede traer guiones.
 */
export function canShowInline(mimeType: string): boolean {
  if (mimeType === 'application/pdf') return true
  if (mimeType === 'image/svg+xml') return false
  return /^(image|video|audio)\//.test(mimeType)
}

/** La entrega, si quien pide puede verla: su autor o el profesorado de la clase. */
export async function resolveSubmissionFile(
  submissionId: string,
  user: ClassUser
): Promise<PrivateFile> {
  const submission = await prisma.enigmaSubmission.findUnique({
    where: { id: submissionId },
    select: { id: true, studentId: true, fileUrl: true, fileName: true },
  })
  if (!submission) throw new NotFoundError('Entrega no encontrada')

  if (submission.studentId !== user.id) {
    await assertSubmissionAccess(submissionId, user.id, 'submission.view')
  }

  const { s3 } = await getStorageSettings()
  const upload = privateUploadFromUrl(submission.fileUrl, s3)
  if (!upload) throw new NotFoundError('Entrega no encontrada')

  const fileName = submission.fileName || upload.key.split('/').pop() || 'archivo'
  return {
    kind: 'submission',
    id: submission.id,
    upload,
    fileName,
    mimeType: typeFromName(fileName),
  }
}

/** El documento de misión, si quien pide es de la clase (profesorado o alumnado matriculado). */
export async function resolveDocumentFile(
  documentId: string,
  user: ClassUser
): Promise<PrivateFile> {
  await assertDocumentMember(documentId, user)

  const document = await prisma.missionDocument.findUnique({
    where: { id: documentId },
    select: { id: true, fileUrl: true, fileName: true, name: true, mimeType: true },
  })
  const { s3 } = await getStorageSettings()
  const upload = document && privateUploadFromUrl(document.fileUrl, s3)
  // Un documento que es un enlace externo no se sirve desde aquí.
  if (!document || !upload) throw new NotFoundError('Documento no encontrado')

  const fileName = document.fileName || document.name
  return {
    kind: 'document',
    id: document.id,
    upload,
    fileName,
    mimeType: document.mimeType || typeFromName(fileName),
  }
}

/**
 * Fichero al que apunta un enlace firmado. Se vuelve a leer la fila: si el
 * documento o la entrega ya no están, o su fichero es otro, el enlace no vale.
 */
export async function resolveSignedFile(
  token: string
): Promise<{ file: PrivateFile; disposition: FileDisposition }> {
  const payload = verifyFileLink(token)
  if (!payload) throw new NotFoundError('El enlace ya no es válido')

  let row: { fileUrl: string | null; fileName: string; mimeType: string } | null = null
  if (payload.k === 'submission') {
    const submission = await prisma.enigmaSubmission.findUnique({
      where: { id: payload.i },
      select: { fileUrl: true, fileName: true },
    })
    const fileName = submission?.fileName || payload.f.split('/').pop() || 'archivo'
    if (submission) {
      row = { fileUrl: submission.fileUrl, fileName, mimeType: typeFromName(fileName) }
    }
  } else {
    const document = await prisma.missionDocument.findUnique({
      where: { id: payload.i },
      select: { fileUrl: true, fileName: true, name: true, mimeType: true },
    })
    if (document) {
      const fileName = document.fileName || document.name
      row = {
        fileUrl: document.fileUrl,
        fileName,
        mimeType: document.mimeType || typeFromName(fileName),
      }
    }
  }
  if (!row) throw new NotFoundError('El enlace ya no es válido')

  const { s3 } = await getStorageSettings()
  const upload = privateUploadFromUrl(row.fileUrl, s3)
  if (!upload || upload.key !== payload.f) {
    throw new NotFoundError('El enlace ya no es válido')
  }

  return {
    file: {
      kind: payload.k,
      id: payload.i,
      upload,
      fileName: row.fileName,
      mimeType: row.mimeType,
    },
    disposition: payload.d,
  }
}

/** Enlace temporal para un fichero ya comprobado. Se muestra en el navegador si su tipo lo permite. */
export function issueFileLink(file: PrivateFile) {
  const disposition: FileDisposition = canShowInline(file.mimeType) ? 'inline' : 'attachment'
  const { token, expiresAt } = signFileLink({
    k: file.kind,
    i: file.id,
    f: file.upload.key,
    d: disposition,
  })
  return {
    url: `/files/link?token=${encodeURIComponent(token)}`,
    expiresAt: expiresAt.toISOString(),
  }
}

/** Contenido del fichero, o 404 si ya no está en el almacenamiento. */
export async function openPrivateFile(file: PrivateFile, range?: string): Promise<UploadRead> {
  const content = await readUpload(file.upload, range)
  if (!content) throw new NotFoundError('Archivo no encontrado')
  return content
}
