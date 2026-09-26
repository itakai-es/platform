import { prisma } from '../../config/database.js'
import type { Prisma } from '../../generated/prisma/client.js'
import { getMissionCompletionRewards, calculateMissionTotalXP, ENIGMA_XP_PRESETS, getLevelFromXP } from '../../utils/xp-calculator.js'
import { applyXpDelta } from '../../utils/enrollment-xp.js'
import { formatMission, getMissionStatus } from '../../utils/mission-formatter.js'
import { resolveClassSettings } from '../../utils/class-settings.js'
import { resolveLevelConfig } from '../../utils/level-config.js'
import {
  CLASS_ACTION_LEVEL,
  assertClassAccess,
  assertDocumentAccess,
  assertEnigmaAccess,
  assertMissionAccess,
  assertMissionMember,
  getStudentEnrollment,
  hasClassLevel,
  recordClassAction,
  studentEnrollmentsWhere,
  type ClassUser,
} from '../../utils/class-access.js'
import { assignableBadgesWhere } from '../../utils/badge-access.js'
import { NotFoundError } from '../../utils/errors.js'
import { existsSync, mkdirSync } from 'fs'
import {
  saveUpload,
  deleteUpload,
  privateUploadResolver,
  resolvePrivateUpload,
  uploadExtension,
  type StoredUpload,
} from '../storage/storage.service.js'
import { join } from 'path'
import { randomUUID } from 'crypto'

const DOCUMENTS_DIR = join(process.cwd(), 'uploads', 'documents')

// Ensure uploads directory exists
if (!existsSync(DOCUMENTS_DIR)) {
  mkdirSync(DOCUMENTS_DIR, { recursive: true })
}

// Helper: persist a base64 data URL cover to disk, returning its stored URL.
async function saveBase64Image(base64Data: string, subdir: 'covers' = 'covers'): Promise<string | null> {
  const matches = base64Data.match(/^data:image\/(\w+);base64,(.+)$/)
  if (!matches) return null
  const ext = matches[1] === 'jpeg' ? 'jpg' : matches[1]
  const buffer = Buffer.from(matches[2], 'base64')
  return saveUpload(`${subdir}/${randomUUID()}.${ext}`, buffer, `image/${matches[1]}`)
}

type Db = Prisma.TransactionClient

/** Campos de un enigma que no son recompensas: cambiarlos es editarlo. */
const ENIGMA_CONTENT_FIELDS = ['title', 'description', 'objectives', 'isOptional'] as const

/** Mismo valor, también para listas y fechas. */
function sameValue(a: unknown, b: unknown) {
  return JSON.stringify(a ?? null) === JSON.stringify(b ?? null)
}

function enigmaRewards(enigma: { xpReward: number; coinReward: number; manaReward: number }) {
  return { xp: enigma.xpReward, coins: enigma.coinReward, mana: enigma.manaReward }
}

/** Apunta en el registro de la clase un cambio en los documentos de una misión. */
function recordDocumentChange(
  tx: Db,
  actorId: string,
  classId: string,
  action: 'document.created' | 'document.updated' | 'document.deleted',
  document: { id: string; missionId: string; name: string }
) {
  return recordClassAction(tx, {
    classId,
    actorId,
    action,
    entityType: 'document',
    entityId: document.id,
    metadata: { title: document.name, missionId: document.missionId },
  })
}

/** Campos de la misión que se comparan al editarla; la clase va aparte. */
const MISSION_FIELDS = [
  'title',
  'description',
  'status',
  'rarity',
  'deadline',
  'backgroundImage',
] as const

type MissionFields = { id: string; classId: string; title: string } & Record<
  (typeof MISSION_FIELDS)[number],
  unknown
>

/**
 * Apunta la edición de una misión con los campos que cambiaron. Si pasa a otra
 * clase, queda en las dos: en cada una se ve de dónde salió y adónde fue.
 */
async function recordMissionUpdate(
  tx: Db,
  actorId: string,
  before: MissionFields,
  after: MissionFields
) {
  const fields = MISSION_FIELDS.filter(field => !sameValue(before[field], after[field]))
  if (before.classId !== after.classId) {
    for (const classId of [before.classId, after.classId]) {
      await recordClassAction(tx, {
        classId,
        actorId,
        action: 'mission.moved',
        entityType: 'mission',
        entityId: after.id,
        metadata: {
          title: after.title,
          fromClassId: before.classId,
          toClassId: after.classId,
          fields,
        },
      })
    }
    return
  }
  if (fields.length === 0) return
  await recordClassAction(tx, {
    classId: after.classId,
    actorId,
    action: 'mission.updated',
    entityType: 'mission',
    entityId: after.id,
    // Bloquear o abrir la misión se ve en el historial tal cual.
    metadata: {
      title: after.title,
      fields,
      ...(fields.includes('status') ? { status: String(after.status) } : {}),
    },
  })
}

// Helper: Convert mimeType to document type
function getDocumentType(mimeType: string): 'pdf' | 'video' | 'docx' | 'image' | 'link' {
  if (mimeType === 'application/pdf') return 'pdf'
  if (mimeType.startsWith('video/')) return 'video'
  if (mimeType.startsWith('image/')) return 'image'
  if (mimeType.includes('word') || mimeType.includes('document')) return 'docx'
  return 'pdf' // default
}

// Helper: Convert mimeType to format string
function getDocumentFormat(mimeType: string): string {
  if (mimeType === 'application/pdf') return 'PDF'
  if (mimeType === 'video/mp4') return 'MP4'
  if (mimeType === 'video/webm') return 'WEBM'
  if (mimeType === 'video/quicktime') return 'MOV'
  if (mimeType === 'image/png') return 'PNG'
  if (mimeType === 'image/jpeg' || mimeType === 'image/jpg') return 'JPG'
  if (mimeType === 'image/gif') return 'GIF'
  if (mimeType === 'image/svg+xml') return 'SVG'
  if (mimeType === 'image/webp') return 'WEBP'
  if (mimeType.includes('word')) return 'DOCX'
  const ext = mimeType.split('/').pop()?.toUpperCase()
  return ext || 'FILE'
}

// Helper: Convert fileSize to human-readable metadata
function getDocumentMetadata(fileSize: number): string {
  if (fileSize < 1024) return `${fileSize} B`
  if (fileSize < 1024 * 1024) return `${(fileSize / 1024).toFixed(1)} KB`
  return `${(fileSize / (1024 * 1024)).toFixed(1)} MB`
}

// Helper: Format document for frontend.
// De un documento que es un fichero guardado no sale su URL: `storedFile` le
// dice al cliente que lo pida a `/files/documents/:id`, que comprueba el acceso.
// Los que son un enlace externo siguen saliendo con su URL, tal cual.
function formatDocumentForFrontend(
  d: {
    id: string
    name: string
    description: string | null
    fileUrl: string
    fileName: string
    fileSize: number
    mimeType: string
    tags: string[]
    uploadedAt: Date
  },
  privateUploadOf: (fileUrl: string | null | undefined) => StoredUpload | null
) {
  const storedFile = privateUploadOf(d.fileUrl) !== null
  return {
    id: d.id,
    title: d.name, // Frontend expects 'title'
    name: d.name,
    type: getDocumentType(d.mimeType),
    format: getDocumentFormat(d.mimeType),
    metadata: getDocumentMetadata(d.fileSize),
    description: d.description || '',
    tags: d.tags || [],
    storedFile,
    fileUrl: storedFile ? null : d.fileUrl,
    fileName: d.fileName,
    fileSize: d.fileSize,
    mimeType: d.mimeType,
    uploadedAt: d.uploadedAt,
  }
}

export class MissionsService {
  async getMissions(user: ClassUser, filters?: { subject?: string; search?: string }) {
    const userId = user.id
    // Clases en las que actúa como alumno: las suyas o, para el profesorado, la
    // vista previa de las que sigue impartiendo.
    const enrollments = await prisma.classEnrollment.findMany({
      where: studentEnrollmentsWhere(user),
      select: { classId: true },
    })

    const classIds = enrollments.map((e) => e.classId)

    // Las misiones de clases archivadas no aparecen en el listado del alumno.
    const whereClause: any = { classId: { in: classIds }, class: { archived: false } }

    if (filters?.search) {
      whereClause.OR = [{ title: { contains: filters.search, mode: 'insensitive' } }, { description: { contains: filters.search, mode: 'insensitive' } }]
    }

    const missions = await prisma.mission.findMany({
      where: whereClause,
      include: {
        enigmas: {
          include: { progress: { where: { studentId: userId } } },
        },
        progress: { where: { studentId: userId } },
        class: true,
      },
      orderBy: { createdAt: 'desc' },
    })

    return {
      missions: missions.map((m) => formatMission(m, true, resolveClassSettings(m.class.settings))),
      total: missions.length,
    }
  }

  async getMissionById(user: ClassUser, missionId: string) {
    // La ve el profesorado de la clase, con cualquier nivel, y el alumnado
    // matriculado. Al alumno se le cierra (404) con la clase archivada o la
    // misión bloqueada; al profesorado no, que la sigue gestionando. Quien es
    // las dos cosas (vista previa) la ve como profesor.
    const membership = await assertMissionMember(missionId, user)
    const isTeacher = membership.teacher !== null
    const canEdit =
      membership.teacher !== null &&
      hasClassLevel(membership.teacher, CLASS_ACTION_LEVEL['mission.edit'])
    const userId = user.id

    const mission = await prisma.mission.findUnique({
      where: { id: missionId },
      include: {
        enigmas: {
          orderBy: { orderIndex: 'asc' },
          include: {
            progress: { where: { studentId: userId } },
            submissions: true,
            _count: { select: { progress: true } }, // total completions across all students
          },
        },
        progress: { where: { studentId: userId } },
        class: true,
        badges: true,
        documents: {
          orderBy: { orderIndex: 'asc' },
        },
      },
    })

    if (!mission) throw new NotFoundError('Misión no encontrada')

    const progress = mission.progress[0]

    // For teachers, calculate class-wide stats
    let teacherStats = null
    if (isTeacher) {
      // Get all enrollments for this class
      const enrollments = await prisma.classEnrollment.findMany({
        where: { classId: mission.classId, isPreview: false },
      })
      const totalStudents = enrollments.length

      // Get all mission progress for all students
      const allProgress = await prisma.studentMissionProgress.findMany({
        where: { missionId },
      })

      const completed = allProgress.filter((p) => p.completedAt).length
      const inProgress = allProgress.filter((p) => !p.completedAt).length
      const notStarted = totalStudents - completed - inProgress

      // Calculate average progress
      let avgProgress = 0
      if (totalStudents > 0) {
        const totalProgress = allProgress.reduce((sum, p) => sum + p.progress, 0)
        avgProgress = Math.round(totalProgress / totalStudents)
      }

      teacherStats = {
        totalStudents,
        completed,
        inProgress,
        notStarted,
        avgProgress,
      }
    }

    // For students, get their submissions separately to ensure we have them
    let studentSubmissionsMap = new Map<string, { status: string }>()
    if (!isTeacher) {
      const studentSubmissions = await prisma.enigmaSubmission.findMany({
        where: {
          studentId: userId,
          enigma: { missionId },
        },
        orderBy: { submittedAt: 'desc' },
      })
      // Group by enigmaId, keep latest submission
      for (const sub of studentSubmissions) {
        if (!studentSubmissionsMap.has(sub.enigmaId)) {
          studentSubmissionsMap.set(sub.enigmaId, { status: sub.status })
        }
      }
    }

    const privateUploadOf = await privateUploadResolver()

    return {
      mission: {
        id: mission.id,
        title: mission.title,
        description: mission.description,
        className: mission.class.name,
        classId: mission.classId,
        classSettings: resolveClassSettings(mission.class.settings),
        status: getMissionStatus(mission, progress),
        // Estado real de la misión (activa/bloqueada), independiente del status
        // calculado de arriba, para poder editarlo en Ajustes.
        blocked: mission.status === 'bloqueada',
        rarity: mission.rarity,
        deadline: mission.deadline,
        backgroundImage: mission.backgroundImage,
        isTeacher,
        // Si quien la mira como profesor puede cambiarla (con lectura, solo la ve).
        canEdit,
        progress: {
          done: progress?.enigmasCompleted || 0,
          total: mission.enigmas.length,
        },
        rewards: {
          xp: calculateMissionTotalXP(mission.rarity, mission.enigmas.map(e => e.xpReward)),
        },
        enigmas: mission.enigmas.map((e) => {
          const enigmaProgress = e.progress[0]
          // For teachers, count pending submissions
          const pendingSubmissions = isTeacher
            ? e.submissions.filter((s) => s.status === 'pendiente').length
            : 0
          const totalSubmissions = isTeacher ? e.submissions.length : 0

          // Determine enigma status
          let status: string
          if (enigmaProgress) {
            status = 'completado'
          } else if (!isTeacher) {
            // Use the separately queried submissions for students
            const studentSubmission = studentSubmissionsMap.get(e.id)
            status = studentSubmission?.status === 'pendiente' ? 'pendiente' : 'disponible'
          } else {
            status = 'disponible'
          }

          return {
            id: e.id,
            title: e.title,
            description: e.description,
            xp: e.xpReward,
            coins: e.coinReward,
            mana: e.manaReward,
            topic: null,
            status,
            submissionType: 'entregable',
            objectives: e.objectives || [],
            isOptional: e.isOptional,
            earnedXp: enigmaProgress?.xpEarned || 0,
            earnedCoins: enigmaProgress?.coinsEarned || 0,
            earnedMana: enigmaProgress?.manaEarned || 0,
            // Rewards become raise-only once any student has completed the enigma.
            completedCount: e._count.progress,
            submissionsCount: pendingSubmissions,
            pendingSubmissions,
            totalSubmissions,
          }
        }),
        documents: mission.documents.map(d => formatDocumentForFrontend(d, privateUploadOf)),
        badgeReward: mission.badges[0]
          ? {
              id: mission.badges[0].id,
              name: mission.badges[0].name,
              description: mission.badges[0].description,
              imageUrl: mission.badges[0].imageUrl,
              rarity: mission.badges[0].rarity,
            }
          : null,
        // Teacher-only stats (null for students)
        teacherStats,
        // La rareza no se puede cambiar una vez que algún alumno completó la
        // misión (alteraría su XP). Misma condición que el bloqueo de updateMission.
        rarityLocked: (teacherStats?.completed ?? 0) > 0,
      },
    }
  }

  async startMission(user: ClassUser, missionId: string) {
    const userId = user.id
    const mission = await prisma.mission.findUnique({
      where: { id: missionId },
      include: { enigmas: true, class: true },
    })

    // Sin matrícula válida en la clase, la misión no existe para quien pregunta.
    const ref = mission && (await getStudentEnrollment(mission.classId, user))
    if (!mission || !ref) throw new NotFoundError('Misión no encontrada')
    if (mission.class.archived) throw new Error('La clase está archivada y no admite nuevas acciones')
    if (mission.status === 'bloqueada') throw new Error('Esta misión está bloqueada por el profesor')

    // Perfil del alumno en la clase (alias y avatar) para la actividad.
    const enrollment = await prisma.classEnrollment.findUniqueOrThrow({ where: { id: ref.id } })

    // Create or update progress
    const progress = await prisma.studentMissionProgress.upsert({
      where: { studentId_missionId: { studentId: userId, missionId } },
      update: {},
      create: {
        studentId: userId,
        missionId,
        progress: 0,
        enigmasCompleted: 0,
      },
    })

    // Use class-specific avatar or default
    const avatar = enrollment.avatarUrl || '/app/avatars/atenea.svg'

    // Create activity with class-specific profile
    await prisma.activity.create({
      data: {
        userId,
        type: 'mission_started',
        description: `Has comenzado la misión "${mission.title}"`,
        // Class-specific student profile
        avatar,
        username: enrollment.nickname || 'Estudiante',
        classId: mission.classId,
        className: mission.class.name,
        // Activity-specific fields
        missionTitle: mission.title,
        metadata: { missionId },
      },
    })

    return {
      mission: formatMission({ ...mission, progress: [progress] }, true),
      message: 'Misión iniciada correctamente',
    }
  }

  async getStats(user: ClassUser) {
    const userId = user.id
    const enrollments = await prisma.classEnrollment.findMany({
      where: studentEnrollmentsWhere(user),
      select: { classId: true },
    })

    const classIds = enrollments.map((e) => e.classId)

    const missions = await prisma.mission.findMany({
      // Coherente con el listado: las clases archivadas no cuentan en las stats.
      where: { classId: { in: classIds }, class: { archived: false } },
      include: { progress: { where: { studentId: userId } } },
    })

    const total = missions.length
    const completed = missions.filter((m) => m.progress[0]?.completedAt).length
    const inProgress = missions.filter((m) => m.progress[0] && !m.progress[0].completedAt).length
    const available = total - completed - inProgress

    return {
      total,
      completed,
      inProgress,
      available,
      completionRate: total > 0 ? Math.round((completed / total) * 100) : 0,
    }
  }

  async getFilters() {
    return {
      filters: [
        { id: 'todas', label: 'Todas', count: 0 },
        { id: 'activas', label: 'Activas', count: 0 },
        { id: 'completadas', label: 'Completadas', count: 0 },
        { id: 'urgentes', label: 'Urgentes', count: 0 },
      ],
      total: 4,
    }
  }

  // Submit enigma for review
  async submitEnigma(
    user: ClassUser,
    missionId: string,
    enigmaId: string,
    data: { fileName?: string; fileSize?: number }
  ) {
    const userId = user.id
    // Verify enigma exists and belongs to mission
    const enigma = await prisma.missionEnigma.findFirst({
      where: { id: enigmaId, missionId },
      include: { mission: { include: { class: true } } },
    })

    // Sin matrícula válida en la clase, el enigma no existe para quien pregunta.
    const enrollment = enigma && (await getStudentEnrollment(enigma.mission.classId, user))
    if (!enigma || !enrollment) throw new NotFoundError('Enigma no encontrado')
    if (enigma.mission.class.archived) throw new Error('La clase está archivada y no admite nuevas entregas')

    // Check if already has pending submission
    const existingSubmission = await prisma.enigmaSubmission.findFirst({
      where: { studentId: userId, enigmaId, status: 'pendiente' },
    })

    if (existingSubmission) {
      throw new Error('Ya tienes una entrega pendiente de revisión')
    }

    // Create submission
    await prisma.enigmaSubmission.create({
      data: {
        studentId: userId,
        enigmaId,
        fileName: data.fileName,
        fileSize: data.fileSize,
        status: 'pendiente',
      },
    })

    // Get all enigmas with their submission status
    const allEnigmas = await prisma.missionEnigma.findMany({
      where: { missionId },
      orderBy: { orderIndex: 'asc' },
      include: {
        progress: { where: { studentId: userId } },
        submissions: {
          where: { studentId: userId },
          orderBy: { submittedAt: 'desc' },
          take: 1,
        },
      },
    })

    // Calculate progress
    const completedCount = allEnigmas.filter((e) => e.progress.length > 0).length
    const newProgress = Math.round((completedCount / allEnigmas.length) * 100)

    // Format enigmas for frontend
    const enigmas = allEnigmas.map((e) => {
      const submission = e.submissions[0]
      const isCompleted = e.progress.length > 0

      let status: string
      if (isCompleted) {
        status = 'completado'
      } else if (submission?.status === 'pendiente') {
        status = 'pendiente'
      } else {
        status = 'disponible'
      }

      return {
        id: e.id,
        title: e.title,
        description: e.description,
        xp: e.xpReward,
        coins: e.coinReward,
        mana: e.manaReward,
        status,
        earnedXp: e.progress[0]?.xpEarned || 0,
      }
    })

    return {
      message: 'Entrega enviada correctamente',
      enigmas,
      newProgress,
    }
  }

  // Document methods
  async getMissionDocuments(user: ClassUser, missionId: string) {
    // Los documentos los ve quien ve la misión: profesorado de la clase o alumno matriculado.
    await assertMissionMember(missionId, user)

    const documents = await prisma.missionDocument.findMany({
      where: { missionId },
      orderBy: { orderIndex: 'asc' },
    })

    const privateUploadOf = await privateUploadResolver()

    return {
      documents: documents.map(d => formatDocumentForFrontend(d, privateUploadOf)),
    }
  }

  async uploadMissionDocument(
    userId: string,
    missionId: string,
    data: {
      name: string
      description?: string
      tags?: string[]
      url?: string
      type?: string
    },
    file?: { buffer: Buffer; filename: string; mimetype: string }
  ) {
    const { classId } = await assertMissionAccess(missionId, userId, 'mission.edit')

    let fileUrl: string
    let fileName: string
    let fileSize: number
    let mimeType: string

    if (file) {
      // File upload
      const uniqueName = `${randomUUID()}.${uploadExtension(file.filename)}`
      fileUrl = await saveUpload(`documents/${uniqueName}`, file.buffer, file.mimetype)
      fileName = file.filename
      fileSize = file.buffer.length
      mimeType = file.mimetype
    } else if (data.url) {
      // URL/link document. Un enlace apunta fuera: no sirve para señalar un
      // fichero guardado de la plataforma, que solo se entrega tras comprobar el
      // acceso a la misión a la que pertenece.
      if (await resolvePrivateUpload(data.url)) {
        throw new Error('La dirección del enlace no es válida')
      }
      fileUrl = data.url
      fileName = data.name
      fileSize = 0
      mimeType = data.type === 'video' ? 'video/mp4' : 'text/html'
    } else {
      throw new Error('Debes proporcionar un archivo o una URL')
    }

    const document = await prisma.$transaction(async tx => {
      const created = await tx.missionDocument.create({
        data: {
          missionId,
          name: data.name,
          description: data.description,
          fileUrl,
          fileName,
          fileSize,
          mimeType,
          tags: data.tags || [],
        },
      })
      await recordDocumentChange(tx, userId, classId, 'document.created', created)
      return created
    })

    return {
      document: formatDocumentForFrontend(document, await privateUploadResolver()),
      message: 'Documento subido correctamente',
    }
  }

  async updateMissionDocument(
    userId: string,
    documentId: string,
    data: {
      name?: string
      description?: string
      tags?: string[]
    }
  ) {
    const { classId } = await assertDocumentAccess(documentId, userId, 'mission.edit')

    const document = await prisma.$transaction(async tx => {
      const updated = await tx.missionDocument.update({
        where: { id: documentId },
        data: {
          name: data.name,
          description: data.description,
          tags: data.tags,
        },
      })
      await recordDocumentChange(tx, userId, classId, 'document.updated', updated)
      return updated
    })

    return {
      document: formatDocumentForFrontend(document, await privateUploadResolver()),
      message: 'Documento actualizado correctamente',
    }
  }

  async deleteMissionDocument(userId: string, documentId: string) {
    const { classId } = await assertDocumentAccess(documentId, userId, 'mission.edit')
    const document = await prisma.missionDocument.findUnique({
      where: { id: documentId },
      select: { id: true, missionId: true, name: true, fileUrl: true },
    })
    if (!document) throw new NotFoundError('Documento no encontrado')
    // Un documento de tipo enlace lleva la dirección que escribió quien lo creó:
    // solo se borra un fichero de la carpeta de documentos.
    const stored = await resolvePrivateUpload(document.fileUrl)

    await prisma.$transaction(async tx => {
      await tx.missionDocument.delete({ where: { id: documentId } })
      await recordDocumentChange(tx, userId, classId, 'document.deleted', document)
    })

    // El fichero se borra cuando ya no lo usa ninguna fila (la copia de una
    // misión importada comparte el del original), y se cuenta después de
    // confirmar el borrado: con dos borrados a la vez, el último ve que no queda
    // ninguna; y una importación en curso, que bloquea los documentos que copia
    // (ver readMissionForCopy), ya está confirmada cuando se cuenta.
    if (stored?.key.startsWith('documents/')) {
      const inUse = await prisma.missionDocument.count({ where: { fileUrl: document.fileUrl } })
      if (inUse === 0) await deleteUpload(document.fileUrl)
    }

    return { message: 'Documento eliminado correctamente' }
  }

  // Teacher methods
  // Crear, cambiar, bloquear o mover misiones y tocar sus enigmas, documentos y
  // recompensas es editar el contenido de la clase: hace falta edición en ella.
  async createMission(userId: string, data: any) {
    if (!data.classId) throw new NotFoundError('Clase no encontrada')
    await assertClassAccess(data.classId, userId, 'mission.edit')

    // A mission without enigmas would be trivially "complete" on first check,
    // handing out a free bonus. Require at least one enigma up front.
    if (!Array.isArray(data.enigmas) || data.enigmas.length === 0) {
      throw new Error('La misión debe tener al menos un enigma')
    }

    // Las recompensas admiten cualquier valor entero ≥ 0 (los presets son solo
    // sugerencias de UI/IA). El schema de la ruta ya garantiza `int().min(0)`.

    // Una portada subida por el profesor llega como data URL y se guarda en
    // disco antes de anotarla, igual que al editar; la generada por la IA ya es
    // una ruta /uploads/….
    const backgroundImage: string | null = data.backgroundImage
      ? data.backgroundImage.startsWith('data:image/')
        ? await saveBase64Image(data.backgroundImage, 'covers')
        : data.backgroundImage
      : null

    return await prisma.$transaction(async (tx) => {
      const mission = await tx.mission.create({
        data: {
          classId: data.classId,
          title: data.title,
          description: data.description,
          status: data.status || 'activa',
          rarity: data.rarity || 'comun',
          deadline: data.deadline ? new Date(data.deadline) : null,
          backgroundImage,
        },
      })

      await tx.missionEnigma.createMany({
        data: data.enigmas.map((e: any, index: number) => ({
          missionId: mission.id,
          title: e.title,
          description: e.description,
          xpReward: e.xp ?? ENIGMA_XP_PRESETS[0],
          coinReward: e.coins ?? 0,
          manaReward: e.mana ?? 0,
          objectives: e.objectives || [],
          orderIndex: index,
        })),
      })

      await recordClassAction(tx, {
        classId: mission.classId,
        actorId: userId,
        action: 'mission.created',
        entityType: 'mission',
        entityId: mission.id,
        metadata: { title: mission.title, enigmas: data.enigmas.length, status: mission.status },
      })

      return { mission }
    })
  }

  async updateMission(userId: string, missionId: string, data: any) {
    await assertMissionAccess(missionId, userId, 'mission.edit')
    const mission = await prisma.mission.findUnique({ where: { id: missionId } })
    if (!mission) throw new NotFoundError('Misión no encontrada')

    // Moverla a otra clase es añadirle contenido a esa también: la misma exigencia allí.
    if (data.classId && data.classId !== mission.classId) {
      await assertClassAccess(data.classId, userId, 'mission.edit')
    }

    // Changing the rarity of a mission that has already been completed by any
    // student would retroactively alter the XP they earned. Lock it instead.
    if (data.rarity && data.rarity !== mission.rarity) {
      const completedCount = await prisma.studentMissionProgress.count({
        where: { missionId, completedAt: { not: null } },
      })
      if (completedCount > 0) {
        throw new Error('No puedes cambiar la rareza de una misión que ya tiene alumnos que la completaron')
      }
    }

    // Persist an uploaded cover (base64 data URL) to disk before storing.
    let backgroundImage = mission.backgroundImage
    if (data.backgroundImage !== undefined) {
      backgroundImage = data.backgroundImage
        ? data.backgroundImage.startsWith('data:image/')
          ? await saveBase64Image(data.backgroundImage, 'covers')
          : data.backgroundImage
        : null
    }

    const updated = await prisma.$transaction(async tx => {
      const saved = await tx.mission.update({
        where: { id: missionId },
        data: {
          classId: data.classId ?? mission.classId,
          title: data.title ?? mission.title,
          description: data.description ?? mission.description,
          status: data.status ?? mission.status,
          rarity: data.rarity ?? mission.rarity,
          deadline: data.deadline !== undefined ? (data.deadline ? new Date(data.deadline) : null) : mission.deadline,
          backgroundImage,
        },
        include: {
          enigmas: true,
          badges: true,
          class: true,
        },
      })
      await recordMissionUpdate(tx, userId, mission, saved)
      return saved
    })

    return {
      mission: updated,
      message: 'Misión actualizada correctamente',
    }
  }

  // Teacher: Reorder enigmas
  async reorderEnigmas(userId: string, missionId: string, enigmaIds: string[]) {
    await assertMissionAccess(missionId, userId, 'mission.edit')

    // Solo se reordena lo que es de esta misión: un id de otra no cambia nada.
    const updates = enigmaIds.map((enigmaId, index) =>
      prisma.missionEnigma.updateMany({
        where: { id: enigmaId, missionId },
        data: { orderIndex: index },
      })
    )

    await prisma.$transaction(updates)

    return { message: 'Orden actualizado correctamente' }
  }

  // Teacher: Reorder documents
  async reorderDocuments(userId: string, missionId: string, documentIds: string[]) {
    await assertMissionAccess(missionId, userId, 'mission.edit')

    // Solo se reordena lo que es de esta misión: un id de otra no cambia nada.
    const updates = documentIds.map((docId, index) =>
      prisma.missionDocument.updateMany({
        where: { id: docId, missionId },
        data: { orderIndex: index },
      })
    )

    await prisma.$transaction(updates)

    return { message: 'Orden actualizado correctamente' }
  }

  // Teacher: Create enigma for existing mission
  async createEnigma(userId: string, missionId: string, data: {
    title: string
    description?: string
    xp?: number
    coins?: number
    mana?: number
    objectives?: string[]
    isOptional?: boolean
  }) {
    const { classId } = await assertMissionAccess(missionId, userId, 'mission.edit')
    const mission = await prisma.mission.findUnique({
      where: { id: missionId },
      select: { enigmas: { select: { id: true } } },
    })
    if (!mission) throw new NotFoundError('Misión no encontrada')

    const enigma = await prisma.$transaction(async tx => {
      const created = await tx.missionEnigma.create({
        data: {
          missionId,
          title: data.title,
          description: data.description || '',
          xpReward: data.xp || ENIGMA_XP_PRESETS[0],
          coinReward: data.coins ?? 0,
          manaReward: data.mana ?? 0,
          objectives: data.objectives || [],
          isOptional: data.isOptional || false,
          orderIndex: mission.enigmas.length,
        },
      })
      await recordClassAction(tx, {
        classId,
        actorId: userId,
        action: 'enigma.created',
        entityType: 'enigma',
        entityId: created.id,
        metadata: { title: created.title, missionId, rewards: enigmaRewards(created) },
      })
      return created
    })

    return {
      message: 'Enigma creado correctamente',
      enigma: {
        id: enigma.id,
        title: enigma.title,
        description: enigma.description,
        xp: enigma.xpReward,
        coins: enigma.coinReward,
        mana: enigma.manaReward,
        objectives: enigma.objectives,
        isOptional: enigma.isOptional,
        orderIndex: enigma.orderIndex,
        status: 'disponible',
      },
    }
  }

  // Teacher: Update enigma
  async updateEnigma(userId: string, enigmaId: string, data: {
    title?: string
    description?: string
    xp?: number
    coins?: number
    mana?: number
    objectives?: string[]
    isOptional?: boolean
  }) {
    await assertEnigmaAccess(enigmaId, userId, 'mission.edit')
    const enigma = await prisma.missionEnigma.findUnique({
      where: { id: enigmaId },
      include: { mission: { include: { class: true } } },
    })
    if (!enigma) throw new NotFoundError('Enigma no encontrado')

    // El XP admite cualquier valor entero ≥ 0 (input libre + atajos rápidos en la
    // UI). El schema de la ruta ya garantiza `int().min(0)`.

    const classId = enigma.mission.classId
    const classSettings = resolveClassSettings(enigma.mission.class.settings)
    const newXpReward = data.xp ?? enigma.xpReward
    const newCoinReward = data.coins ?? enigma.coinReward
    const newManaReward = data.mana ?? enigma.manaReward
    const rewardsChanged =
      newXpReward !== enigma.xpReward ||
      newCoinReward !== enigma.coinReward ||
      newManaReward !== enigma.manaReward

    // Once a student has completed this enigma the rewards have been granted (and
    // possibly spent). Raising them is fine (everyone who did it gets topped up to
    // their %), but LOWERING is blocked — clawing back currency a student may have
    // already spent would corrupt their balance. Title/description/objectives stay
    // freely editable regardless.
    if (rewardsChanged) {
      const completedCount = await prisma.studentEnigmaProgress.count({ where: { enigmaId } })
      if (
        completedCount > 0 &&
        (newXpReward < enigma.xpReward ||
          newCoinReward < enigma.coinReward ||
          newManaReward < enigma.manaReward)
      ) {
        throw new Error(
          'No puedes reducir las recompensas (XP, monedas o maná) de un enigma que ya completaron alumnos, porque podrían haberlas gastado. Solo puedes mantenerlas o aumentarlas.'
        )
      }
    }

    const updated = await prisma.$transaction(async (tx) => {
      const u = await tx.missionEnigma.update({
        where: { id: enigmaId },
        data: {
          title: data.title ?? enigma.title,
          description: data.description ?? enigma.description,
          xpReward: newXpReward,
          coinReward: newCoinReward,
          manaReward: newManaReward,
          objectives: data.objectives ?? enigma.objectives,
          isOptional: data.isOptional ?? enigma.isOptional,
        },
      })

      const contentFields = ENIGMA_CONTENT_FIELDS.filter(
        field => data[field] !== undefined && !sameValue(data[field], enigma[field])
      )
      if (contentFields.length > 0) {
        await recordClassAction(tx, {
          classId,
          actorId: userId,
          action: 'enigma.updated',
          entityType: 'enigma',
          entityId: enigmaId,
          metadata: { title: u.title, missionId: enigma.missionId, fields: contentFields },
        })
      }
      // Cuántos alumnos reciben la diferencia en el reparto retroactivo de abajo.
      let affectedCount = 0

      // If the rewards changed, re-grant every student who already completed this
      // enigma the partial share of the NEW rewards (the same % they were graded),
      // adjusting their per-class wallet by the difference. Keeps XP, coins and
      // mana in sync — editing rewards after completion never leaves things dangling.
      if (rewardsChanged) {
        const clsRow = await tx.class.findUnique({ where: { id: classId }, select: { levelConfig: true } })
        const levelCfg = resolveLevelConfig(clsRow?.levelConfig)
        const progresses = await tx.studentEnigmaProgress.findMany({ where: { enigmaId } })
        for (const p of progresses) {
          const f = Math.min(100, Math.max(0, p.percentage)) / 100
          // Rewards can only increase after completion (guarded above), so every
          // delta is ≥ 0 — we only ever top up, never claw back. The student keeps
          // whatever they already earned/spent.
          // Don't top up resources the class has disabled.
          const addXp = classSettings.xp ? Math.max(0, Math.round(newXpReward * f) - p.xpEarned) : 0
          const addCoin = classSettings.coins ? Math.max(0, Math.round(newCoinReward * f) - p.coinsEarned) : 0
          const addMana = classSettings.mana ? Math.max(0, Math.round(newManaReward * f) - p.manaEarned) : 0
          if (addXp === 0 && addCoin === 0 && addMana === 0) continue
          affectedCount += 1

          const enr = await tx.classEnrollment.update({
            where: { studentId_classId: { studentId: p.studentId, classId } },
            data: {
              xp: { increment: addXp },
              coins: { increment: addCoin },
              mana: { increment: addMana },
            },
          })
          const newLevel = getLevelFromXP(enr.xp, levelCfg)
          if (newLevel !== enr.level) {
            await tx.classEnrollment.update({
              where: { studentId_classId: { studentId: p.studentId, classId } },
              data: { level: newLevel },
            })
          }
          await tx.studentEnigmaProgress.update({
            where: { id: p.id },
            data: {
              xpEarned: p.xpEarned + addXp,
              coinsEarned: p.coinsEarned + addCoin,
              manaEarned: p.manaEarned + addMana,
            },
          })
        }

        await recordClassAction(tx, {
          classId,
          actorId: userId,
          action: 'enigma.rewards_changed',
          entityType: 'enigma',
          entityId: enigmaId,
          metadata: {
            title: u.title,
            missionId: enigma.missionId,
            before: enigmaRewards(enigma),
            after: enigmaRewards(u),
            affectedCount,
          },
        })
      }

      return u
    })

    return {
      message: 'Enigma actualizado correctamente',
      enigma: {
        id: updated.id,
        title: updated.title,
        description: updated.description,
        xp: updated.xpReward,
        coins: updated.coinReward,
        mana: updated.manaReward,
        objectives: updated.objectives,
        isOptional: updated.isOptional,
        orderIndex: updated.orderIndex,
        status: 'disponible',
      },
    }
  }

  // Teacher: Delete enigma
  async deleteEnigma(userId: string, enigmaId: string) {
    const { classId } = await assertEnigmaAccess(enigmaId, userId, 'mission.edit')
    const enigma = await prisma.missionEnigma.findUnique({
      where: { id: enigmaId },
      include: {
        mission: { select: { enigmas: { select: { id: true } } } },
        submissions: { select: { id: true } },
        progress: { select: { id: true } },
      },
    })

    if (!enigma) throw new NotFoundError('Enigma no encontrado')
    if (enigma.submissions.length > 0) throw new Error('No se puede eliminar un enigma que ya tiene entregas de alumnos')
    if (enigma.progress.length > 0) throw new Error('No se puede eliminar un enigma que ya tiene alumnos que lo completaron')
    if (enigma.mission.enigmas.length <= 1) {
      throw new Error('La misión debe tener al menos un enigma; no puedes eliminar el último')
    }

    await prisma.$transaction(async tx => {
      await tx.missionEnigma.delete({ where: { id: enigmaId } })
      await recordClassAction(tx, {
        classId,
        actorId: userId,
        action: 'enigma.deleted',
        entityType: 'enigma',
        entityId: enigmaId,
        metadata: { title: enigma.title, missionId: enigma.missionId },
      })
    })

    return { message: 'Enigma eliminado correctamente' }
  }

  // Teacher: Update mission rewards (assign/remove badge)
  async updateMissionRewards(userId: string, missionId: string, badgeId: string | null) {
    const { classId } = await assertMissionAccess(missionId, userId, 'mission.edit')

    // Solo se asigna una insignia que quien edita puede usar en esta clase: una
    // suelta suya, una de otra misión de la clase o una suya de otra clase donde
    // también edita (ver `assignableBadgesWhere`).
    if (badgeId) {
      const badge = await prisma.badge.findFirst({
        where: { AND: [{ id: badgeId }, assignableBadgesWhere(userId, classId)] },
        select: { id: true },
      })
      if (!badge) throw new NotFoundError('Insignia no encontrada')
    }

    // Se quita la que tuviera y se pone la nueva a la vez: o las dos cosas o ninguna.
    await prisma.$transaction(async tx => {
      await tx.badge.updateMany({ where: { missionId }, data: { missionId: null } })
      if (badgeId) await tx.badge.update({ where: { id: badgeId }, data: { missionId } })
      const mission = await tx.mission.findUnique({
        where: { id: missionId },
        select: { title: true },
      })
      await recordClassAction(tx, {
        classId,
        actorId: userId,
        action: 'mission.rewards_changed',
        entityType: 'mission',
        entityId: missionId,
        metadata: { title: mission?.title ?? '', badgeId },
      })
    })

    return { message: badgeId ? 'Insignia asignada correctamente' : 'Insignia eliminada de la misión' }
  }
}

export const missionsService = new MissionsService()
