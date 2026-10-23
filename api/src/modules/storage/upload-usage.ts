import { prisma } from '../../config/database.js'
import { isStudentCatalogAvatar } from '../../utils/avatars.js'
import { deleteUpload, uploadResolver, type StoredUpload } from './storage.service.js'

/**
 * Si un fichero de la plataforma lo sigue apuntando alguna fila, y el borrado de
 * los que ya no apunta ninguna. Lo usan la purga de una clase (portadas y
 * documentos) y el avatar generado con IA que deja una matrícula.
 */

/** Clave y almacenamiento de una URL guardada (`uploadResolver`). */
export type ResolveUpload = (fileUrl: string | null | undefined) => StoredUpload | null

/**
 * ¿Lo apunta alguna fila? Se busca por el nombre del fichero y se compara la
 * clave ya normalizada: dos URL escritas distinto pueden ser el mismo fichero.
 * Mira todas las columnas donde puede acabar la URL de una imagen o un
 * documento de la plataforma, no solo la de su tipo: una portada puede ser la
 * de otra clase, de una misión o el enlace de un documento.
 */
export async function uploadInUse(stored: StoredUpload, resolve: ResolveUpload): Promise<boolean> {
  const name = stored.key.slice(stored.key.lastIndexOf('/') + 1)
  const like = { contains: name }
  const [classes, missions, documents, badges, enrollments, articles] = await Promise.all([
    prisma.class.findMany({
      where: { backgroundImage: like },
      select: { backgroundImage: true },
    }),
    prisma.mission.findMany({
      where: { backgroundImage: like },
      select: { backgroundImage: true },
    }),
    prisma.missionDocument.findMany({
      where: { fileUrl: like },
      select: { fileUrl: true },
    }),
    prisma.badge.findMany({
      where: { imageUrl: like },
      select: { imageUrl: true },
    }),
    prisma.classEnrollment.findMany({
      where: { avatarUrl: like },
      select: { avatarUrl: true },
    }),
    prisma.helpArticle.findMany({
      where: { coverImage: like },
      select: { coverImage: true },
    }),
  ])
  const urls = [
    ...classes.map(r => r.backgroundImage),
    ...missions.map(r => r.backgroundImage),
    ...documents.map(r => r.fileUrl),
    ...badges.map(r => r.imageUrl),
    ...enrollments.map(r => r.avatarUrl),
    ...articles.map(r => r.coverImage),
  ]
  return urls.some(url => {
    const other = resolve(url)
    return other?.key === stored.key && other.origin === stored.origin
  })
}

/** Carpeta donde se guardan los avatares generados con IA (`avatar-firered.ts`). */
const GENERATED_AVATAR_FOLDER = 'ai-generated/avatars/'

/**
 * El fichero del avatar generado con IA al que apunta una URL guardada, o null
 * si no es uno. Se decide por la clave ya normalizada, no por el texto: hasta la
 * 0.6.1 el alumnado podía guardar cualquier dirección, y
 * `/uploads/ai-generated/avatars/../../covers/x.png` es en realidad una portada.
 * Vale solo un fichero suelto de la carpeta, sin subcarpetas.
 */
export function generatedAvatarUpload(
  fileUrl: string | null | undefined,
  resolve: ResolveUpload
): StoredUpload | null {
  const stored = resolve(fileUrl)
  if (!stored?.key.startsWith(GENERATED_AVATAR_FOLDER)) return null
  const name = stored.key.slice(GENERATED_AVATAR_FOLDER.length)
  return name && !name.includes('/') ? stored : null
}

/**
 * Borra la imagen del avatar generado con IA que una matrícula acaba de dejar
 * (porque el estudiante elige otro o genera uno nuevo, porque su docente lo
 * devuelve al catálogo o porque sale de la clase), si ya no la apunta ninguna
 * fila: si no, seguiría a la vista en su dirección para siempre, porque nadie
 * puede volver a ponérsela.
 *
 * Va después de cambiar o borrar la matrícula, y nunca lanza: el cambio ya está
 * hecho, y un borrado que falla no lo deshace.
 */
export async function releaseGeneratedAvatar(previous: string | null | undefined): Promise<void> {
  // Un personaje del catálogo no es un fichero: nada que mirar.
  if (!previous || isStudentCatalogAvatar(previous)) return
  try {
    const resolve = await uploadResolver()
    const stored = generatedAvatarUpload(previous, resolve)
    if (!stored || (await uploadInUse(stored, resolve))) return
    await deleteUpload(previous)
  } catch {
    /* best-effort, como deleteUpload */
  }
}
