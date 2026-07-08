import { prisma } from '../../config/database.js'
import { getMissionCompletionRewards, calculateMissionTotalXP, ENIGMA_XP_PRESETS, getLevelFromXP } from '../../utils/xp-calculator.js'
import { applyXpDelta } from '../../utils/enrollment-xp.js'
import { formatMission, getMissionStatus } from '../../utils/mission-formatter.js'
import { resolveClassSettings } from '../../utils/class-settings.js'
import { existsSync, mkdirSync } from 'fs'
import { saveUpload, deleteUpload } from '../storage/storage.service.js'
import { join } from 'path'
import { randomUUID } from 'crypto'

const DOCUMENTS_DIR = join(process.cwd(), 'uploads', 'documents')

// Ensure uploads directory exists
if (!existsSync(DOCUMENTS_DIR)) {
  mkdirSync(DOCUMENTS_DIR, { recursive: true })
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

// Helper: Format document for frontend
function formatDocumentForFrontend(d: {
  id: string
  name: string
  description: string | null
  fileUrl: string
  fileName: string
  fileSize: number
  mimeType: string
  tags: string[]
  uploadedAt: Date
}) {
  return {
    id: d.id,
    title: d.name, // Frontend expects 'title'
    name: d.name,
    type: getDocumentType(d.mimeType),
    format: getDocumentFormat(d.mimeType),
    metadata: getDocumentMetadata(d.fileSize),
    description: d.description || '',
    tags: d.tags || [],
    fileUrl: d.fileUrl,
    fileName: d.fileName,
    fileSize: d.fileSize,
    mimeType: d.mimeType,
    uploadedAt: d.uploadedAt,
  }
}

export class MissionsService {
  async getMissions(userId: string, filters?: { subject?: string; search?: string }) {
    // Get user's enrolled classes
    const enrollments = await prisma.classEnrollment.findMany({
      where: { studentId: userId },
    })

    const classIds = enrollments.map((e) => e.classId)

    const whereClause: any = { classId: { in: classIds } }

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

  async getMissionById(userId: string, missionId: string) {
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

    if (!mission) throw new Error('Misión no encontrada')

    // Check if user is teacher of the class
    const isTeacher = mission.class.teacherId === userId

    // Check if user is enrolled as student
    const enrollment = await prisma.classEnrollment.findUnique({
      where: { studentId_classId: { studentId: userId, classId: mission.classId } },
    })

    if (!isTeacher && !enrollment) throw new Error('No tienes acceso a esta misión')

    const progress = mission.progress[0]

    // For teachers, calculate class-wide stats
    let teacherStats = null
    if (isTeacher) {
      // Get all enrollments for this class
      const enrollments = await prisma.classEnrollment.findMany({
        where: { classId: mission.classId },
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

    return {
      mission: {
        id: mission.id,
        title: mission.title,
        description: mission.description,
        className: mission.class.name,
        classId: mission.classId,
        classSettings: resolveClassSettings(mission.class.settings),
        status: getMissionStatus(mission, progress),
        rarity: mission.rarity,
        deadline: mission.deadline,
        backgroundImage: mission.backgroundImage,
        isTeacher,
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
        documents: mission.documents.map(formatDocumentForFrontend),
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
      },
    }
  }

  async startMission(userId: string, missionId: string) {
    const mission = await prisma.mission.findUnique({
      where: { id: missionId },
      include: { enigmas: true, class: true },
    })

    if (!mission) throw new Error('Misión no encontrada')
    if (mission.class.archived) throw new Error('La clase está archivada y no admite nuevas acciones')

    // Get enrollment for class-specific profile
    const enrollment = await prisma.classEnrollment.findUnique({
      where: { studentId_classId: { studentId: userId, classId: mission.classId } },
    })

    if (!enrollment) throw new Error('No estás inscrito en esta clase')

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

  async getStats(userId: string) {
    const enrollments = await prisma.classEnrollment.findMany({
      where: { studentId: userId },
    })

    const classIds = enrollments.map((e) => e.classId)

    const missions = await prisma.mission.findMany({
      where: { classId: { in: classIds } },
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
    userId: string,
    missionId: string,
    enigmaId: string,
    data: { fileName?: string; fileSize?: number }
  ) {
    // Verify enigma exists and belongs to mission
    const enigma = await prisma.missionEnigma.findFirst({
      where: { id: enigmaId, missionId },
      include: { mission: { include: { class: true } } },
    })

    if (!enigma) throw new Error('Enigma no encontrado')
    if (enigma.mission.class.archived) throw new Error('La clase está archivada y no admite nuevas entregas')

    // Verify student is enrolled
    const enrollment = await prisma.classEnrollment.findUnique({
      where: { studentId_classId: { studentId: userId, classId: enigma.mission.classId } },
    })

    if (!enrollment) throw new Error('No estás inscrito en esta clase')

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
  async getMissionDocuments(missionId: string) {
    const documents = await prisma.missionDocument.findMany({
      where: { missionId },
      orderBy: { orderIndex: 'asc' },
    })

    return {
      documents: documents.map(formatDocumentForFrontend),
    }
  }

  async uploadMissionDocument(
    teacherId: string,
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
    // Verify teacher owns the mission's class
    const mission = await prisma.mission.findUnique({
      where: { id: missionId },
      include: { class: true },
    })

    if (!mission) throw new Error('Misión no encontrada')
    if (mission.class.teacherId !== teacherId) {
      throw new Error('No tienes permiso para añadir documentos a esta misión')
    }

    let fileUrl: string
    let fileName: string
    let fileSize: number
    let mimeType: string

    if (file) {
      // File upload
      const ext = file.filename.split('.').pop() || 'bin'
      const uniqueName = `${randomUUID()}.${ext}`
      fileUrl = await saveUpload(`documents/${uniqueName}`, file.buffer, file.mimetype)
      fileName = file.filename
      fileSize = file.buffer.length
      mimeType = file.mimetype
    } else if (data.url) {
      // URL/link document
      fileUrl = data.url
      fileName = data.name
      fileSize = 0
      mimeType = data.type === 'video' ? 'video/mp4' : 'text/html'
    } else {
      throw new Error('Debes proporcionar un archivo o una URL')
    }

    const document = await prisma.missionDocument.create({
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

    return {
      document: formatDocumentForFrontend(document),
      message: 'Documento subido correctamente',
    }
  }

  async updateMissionDocument(
    teacherId: string,
    documentId: string,
    data: {
      name?: string
      description?: string
      tags?: string[]
    }
  ) {
    // Find document and verify teacher owns the mission's class
    const existingDoc = await prisma.missionDocument.findUnique({
      where: { id: documentId },
      include: { mission: { include: { class: true } } },
    })

    if (!existingDoc) throw new Error('Documento no encontrado')
    if (existingDoc.mission.class.teacherId !== teacherId) {
      throw new Error('No tienes permiso para editar este documento')
    }

    const document = await prisma.missionDocument.update({
      where: { id: documentId },
      data: {
        name: data.name,
        description: data.description,
        tags: data.tags,
      },
    })

    return {
      document: formatDocumentForFrontend(document),
      message: 'Documento actualizado correctamente',
    }
  }

  async deleteMissionDocument(teacherId: string, documentId: string) {
    // Find document and verify teacher owns the mission's class
    const document = await prisma.missionDocument.findUnique({
      where: { id: documentId },
      include: { mission: { include: { class: true } } },
    })

    if (!document) throw new Error('Documento no encontrado')
    if (document.mission.class.teacherId !== teacherId) {
      throw new Error('No tienes permiso para eliminar este documento')
    }

    // Delete file from storage (local o R2, best-effort)
    if (document.fileUrl) {
      await deleteUpload(document.fileUrl)
    }

    await prisma.missionDocument.delete({
      where: { id: documentId },
    })

    return { message: 'Documento eliminado correctamente' }
  }

  // Teacher methods
  async createMission(teacherId: string, data: any) {
    // Verify teacher owns the class
    const cls = await prisma.class.findFirst({
      where: { id: data.classId, teacherId },
    })

    if (!cls) throw new Error('Clase no encontrada')

    // A mission without enigmas would be trivially "complete" on first check,
    // handing out a free bonus. Require at least one enigma up front.
    if (!Array.isArray(data.enigmas) || data.enigmas.length === 0) {
      throw new Error('La misión debe tener al menos un enigma')
    }

    // Validate enigma XP values against the preset ladder.
    for (const e of data.enigmas) {
      const xp = Number(e.xp ?? ENIGMA_XP_PRESETS[0])
      if (!(ENIGMA_XP_PRESETS as readonly number[]).includes(xp)) {
        throw new Error(`El XP de cada enigma debe ser uno de: ${ENIGMA_XP_PRESETS.join(', ')}`)
      }
    }

    return await prisma.$transaction(async (tx) => {
      const mission = await tx.mission.create({
        data: {
          classId: data.classId,
          title: data.title,
          description: data.description,
          status: data.status || 'activa',
          rarity: data.rarity || 'comun',
          deadline: data.deadline ? new Date(data.deadline) : null,
          backgroundImage: data.backgroundImage || null,
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

      return { mission }
    })
  }

  async updateMission(teacherId: string, missionId: string, data: any) {
    const mission = await prisma.mission.findFirst({
      where: { id: missionId },
      include: { class: true },
    })

    if (!mission) throw new Error('Misión no encontrada')
    if (mission.class.teacherId !== teacherId) throw new Error('No tienes permiso para modificar esta misión')

    if (data.classId && data.classId !== mission.classId) {
      const targetClass = await prisma.class.findFirst({
        where: { id: data.classId, teacherId },
      })

      if (!targetClass) throw new Error('Clase no encontrada')
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

    const updated = await prisma.mission.update({
      where: { id: missionId },
      data: {
        classId: data.classId ?? mission.classId,
        title: data.title ?? mission.title,
        description: data.description ?? mission.description,
        status: data.status ?? mission.status,
        rarity: data.rarity ?? mission.rarity,
        deadline: data.deadline !== undefined ? (data.deadline ? new Date(data.deadline) : null) : mission.deadline,
      },
      include: {
        enigmas: true,
        badges: true,
        class: true,
      },
    })

    return {
      mission: updated,
      message: 'Misión actualizada correctamente',
    }
  }

  // Teacher: Reorder enigmas
  async reorderEnigmas(teacherId: string, missionId: string, enigmaIds: string[]) {
    // Verify mission exists and teacher owns it
    const mission = await prisma.mission.findFirst({
      where: { id: missionId },
      include: { class: true },
    })

    if (!mission) throw new Error('Misión no encontrada')
    if (mission.class.teacherId !== teacherId) throw new Error('No tienes permiso para modificar esta misión')

    // Update orderIndex for each enigma
    const updates = enigmaIds.map((enigmaId, index) =>
      prisma.missionEnigma.update({
        where: { id: enigmaId },
        data: { orderIndex: index },
      })
    )

    await prisma.$transaction(updates)

    return { message: 'Orden actualizado correctamente' }
  }

  // Teacher: Reorder documents
  async reorderDocuments(teacherId: string, missionId: string, documentIds: string[]) {
    // Verify mission exists and teacher owns it
    const mission = await prisma.mission.findFirst({
      where: { id: missionId },
      include: { class: true },
    })

    if (!mission) throw new Error('Misión no encontrada')
    if (mission.class.teacherId !== teacherId) throw new Error('No tienes permiso para modificar esta misión')

    // Update orderIndex for each document
    const updates = documentIds.map((docId, index) =>
      prisma.missionDocument.update({
        where: { id: docId },
        data: { orderIndex: index },
      })
    )

    await prisma.$transaction(updates)

    return { message: 'Orden actualizado correctamente' }
  }

  // Teacher: Create enigma for existing mission
  async createEnigma(teacherId: string, missionId: string, data: {
    title: string
    description?: string
    xp?: number
    coins?: number
    mana?: number
    objectives?: string[]
    isOptional?: boolean
  }) {
    const mission = await prisma.mission.findFirst({
      where: { id: missionId },
      include: { class: true, enigmas: { select: { id: true } } },
    })

    if (!mission) throw new Error('Misión no encontrada')
    if (mission.class.teacherId !== teacherId) throw new Error('No tienes permiso para modificar esta misión')

    const enigma = await prisma.missionEnigma.create({
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
  async updateEnigma(teacherId: string, enigmaId: string, data: {
    title?: string
    description?: string
    xp?: number
    coins?: number
    mana?: number
    objectives?: string[]
    isOptional?: boolean
  }) {
    const enigma = await prisma.missionEnigma.findFirst({
      where: { id: enigmaId },
      include: { mission: { include: { class: true } } },
    })

    if (!enigma) throw new Error('Enigma no encontrado')
    if (enigma.mission.class.teacherId !== teacherId) throw new Error('No tienes permiso para modificar este enigma')

    // XP must stay one of the presets (the UI offers fixed steps).
    if (data.xp !== undefined && data.xp !== enigma.xpReward) {
      if (!(ENIGMA_XP_PRESETS as readonly number[]).includes(data.xp)) {
        throw new Error(`El XP del enigma debe ser uno de: ${ENIGMA_XP_PRESETS.join(', ')}`)
      }
    }

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

      // If the rewards changed, re-grant every student who already completed this
      // enigma the partial share of the NEW rewards (the same % they were graded),
      // adjusting their per-class wallet by the difference. Keeps XP, coins and
      // mana in sync — editing rewards after completion never leaves things dangling.
      if (rewardsChanged) {
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

          const enr = await tx.classEnrollment.update({
            where: { studentId_classId: { studentId: p.studentId, classId } },
            data: {
              xp: { increment: addXp },
              coins: { increment: addCoin },
              mana: { increment: addMana },
            },
          })
          const newLevel = getLevelFromXP(enr.xp)
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
  async deleteEnigma(teacherId: string, enigmaId: string) {
    const enigma = await prisma.missionEnigma.findFirst({
      where: { id: enigmaId },
      include: {
        mission: { include: { class: true, enigmas: { select: { id: true } } } },
        submissions: { select: { id: true } },
        progress: { select: { id: true } },
      },
    })

    if (!enigma) throw new Error('Enigma no encontrado')
    if (enigma.mission.class.teacherId !== teacherId) throw new Error('No tienes permiso para eliminar este enigma')
    if (enigma.submissions.length > 0) throw new Error('No se puede eliminar un enigma que ya tiene entregas de alumnos')
    if (enigma.progress.length > 0) throw new Error('No se puede eliminar un enigma que ya tiene alumnos que lo completaron')
    if (enigma.mission.enigmas.length <= 1) {
      throw new Error('La misión debe tener al menos un enigma; no puedes eliminar el último')
    }

    await prisma.missionEnigma.delete({ where: { id: enigmaId } })

    return { message: 'Enigma eliminado correctamente' }
  }

  // Teacher: Update mission rewards (assign/remove badge)
  async updateMissionRewards(teacherId: string, missionId: string, badgeId: string | null) {
    // Verify mission exists and teacher owns it
    const mission = await prisma.mission.findFirst({
      where: { id: missionId },
      include: { class: true, badges: true },
    })

    if (!mission) throw new Error('Misión no encontrada')
    if (mission.class.teacherId !== teacherId) throw new Error('No tienes permiso para modificar esta misión')

    // Remove any existing badges from this mission
    if (mission.badges.length > 0) {
      await prisma.badge.updateMany({
        where: { missionId },
        data: { missionId: null },
      })
    }

    // Assign new badge if provided
    if (badgeId) {
      // Verify badge exists and belongs to teacher
      const badge = await prisma.badge.findFirst({
        where: { id: badgeId, teacherId },
      })

      if (!badge) throw new Error('Insignia no encontrada')

      await prisma.badge.update({
        where: { id: badgeId },
        data: { missionId },
      })
    }

    return { message: badgeId ? 'Insignia asignada correctamente' : 'Insignia eliminada de la misión' }
  }
}

export const missionsService = new MissionsService()
