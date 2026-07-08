import { prisma } from '../../config/database.js'
import { existsSync, mkdirSync } from 'fs'
import { saveUpload } from '../storage/storage.service.js'
import { join } from 'path'
import { randomUUID } from 'crypto'
import { getMissionCompletionRewards, validateCustomEnigmaXp } from '../../utils/xp-calculator.js'
import { applyXpDelta } from '../../utils/enrollment-xp.js'
import { resolveClassSettings } from '../../utils/class-settings.js'

const UPLOADS_DIR = join(process.cwd(), 'uploads', 'submissions')

// Ensure uploads directory exists
if (!existsSync(UPLOADS_DIR)) {
  mkdirSync(UPLOADS_DIR, { recursive: true })
}

export class SubmissionsService {
  /**
   * Submit an enigma (student uploads a file)
   */
  async submitEnigma(
    studentId: string,
    enigmaId: string,
    file?: { buffer: Buffer; filename: string; mimetype: string }
  ) {
    // Verify enigma exists and get mission info
    const enigma = await prisma.missionEnigma.findUnique({
      where: { id: enigmaId },
      include: { mission: { include: { class: true } } },
    })

    if (!enigma) throw new Error('Enigma no encontrado')
    if (enigma.mission.class.archived) throw new Error('La clase está archivada y no admite nuevas entregas')

    // Verify student is enrolled in the class
    const enrollment = await prisma.classEnrollment.findUnique({
      where: { studentId_classId: { studentId, classId: enigma.mission.classId } },
    })

    if (!enrollment) throw new Error('No estás inscrito en esta clase')

    // Check if already submitted and pending
    const existingSubmission = await prisma.enigmaSubmission.findFirst({
      where: { studentId, enigmaId, status: 'pendiente' },
    })

    if (existingSubmission) {
      throw new Error('Ya tienes una entrega pendiente de revisión')
    }

    // Save file if provided
    let fileUrl: string | null = null
    let fileName: string | null = null
    let fileSize: number | null = null

    if (file) {
      const ext = file.filename.split('.').pop() || 'bin'
      const uniqueName = `${randomUUID()}.${ext}`

      fileUrl = await saveUpload(`submissions/${uniqueName}`, file.buffer, file.mimetype)
      fileName = file.filename
      fileSize = file.buffer.length
    }

    // Create submission
    const submission = await prisma.enigmaSubmission.create({
      data: {
        studentId,
        enigmaId,
        fileUrl,
        fileName,
        fileSize,
        status: 'pendiente',
      },
      include: {
        enigma: { include: { mission: true } },
      },
    })

    // Get class name for activity
    const classInfo = await prisma.class.findUnique({
      where: { id: enigma.mission.classId },
      select: { name: true },
    })

    // Create activity with class-specific profile
    await prisma.activity.create({
      data: {
        userId: studentId,
        type: 'enigma_submitted',
        description: `Has enviado "${enigma.title}" a revisión`,
        // Class-specific student profile
        avatar: enrollment.avatarUrl,
        username: enrollment.nickname || 'Estudiante',
        classId: enigma.mission.classId,
        className: classInfo?.name,
        // Activity-specific fields
        enigmaTitle: enigma.title,
        metadata: {
          enigmaId,
          missionId: enigma.missionId,
          submissionId: submission.id,
        },
      },
    })

    return {
      submission: {
        id: submission.id,
        enigmaId: submission.enigmaId,
        enigmaTitle: submission.enigma.title,
        missionTitle: submission.enigma.mission.title,
        status: submission.status,
        fileName: submission.fileName,
        submittedAt: submission.submittedAt,
      },
      message: 'Entrega enviada correctamente. Será revisada por el profesor.',
    }
  }

  /**
   * Get student's submissions for an enigma
   */
  async getEnigmaSubmissions(studentId: string, enigmaId: string) {
    const submissions = await prisma.enigmaSubmission.findMany({
      where: { studentId, enigmaId },
      orderBy: { submittedAt: 'desc' },
    })

    return { submissions }
  }

  /**
   * Get all student's pending submissions
   */
  async getMySubmissions(studentId: string, status?: string) {
    const where: any = { studentId }
    if (status) where.status = status

    const submissions = await prisma.enigmaSubmission.findMany({
      where,
      include: {
        enigma: { include: { mission: { include: { class: true } } } },
      },
      orderBy: { submittedAt: 'desc' },
    })

    return {
      submissions: submissions.map((s) => ({
        id: s.id,
        enigmaId: s.enigmaId,
        enigmaTitle: s.enigma.title,
        missionTitle: s.enigma.mission.title,
        className: s.enigma.mission.class.name,
        status: s.status,
        fileName: s.fileName,
        xpAwarded: s.xpAwarded,
        submittedAt: s.submittedAt,
        reviewedAt: s.reviewedAt,
      })),
      total: submissions.length,
    }
  }

  /**
   * Teacher: Get submissions for a specific enigma
   */
  async getEnigmaSubmissionsForTeacher(teacherId: string, enigmaId: string, status?: string) {
    // Get enigma and verify teacher owns the class
    const enigma = await prisma.missionEnigma.findUnique({
      where: { id: enigmaId },
      include: { mission: { include: { class: true } } },
    })

    if (!enigma) throw new Error('Enigma no encontrado')

    if (enigma.mission.class.teacherId !== teacherId) {
      throw new Error('No tienes permiso para ver estas entregas')
    }

    const where: any = { enigmaId }
    if (status) where.status = status

    const submissions = await prisma.enigmaSubmission.findMany({
      where,
      include: {
        student: {
          select: {
            id: true,
            name: true,
            email: true,
            enrollments: {
              where: { classId: enigma.mission.classId },
              select: { nickname: true, avatarUrl: true },
            },
          },
        },
      },
      orderBy: { submittedAt: 'desc' },
    })

    return {
      enigma: {
        id: enigma.id,
        title: enigma.title,
        description: enigma.description,
        xpReward: enigma.xpReward,
        missionTitle: enigma.mission.title,
        missionId: enigma.missionId,
      },
      submissions: submissions.map((s) => {
        const enrollment = s.student.enrollments[0]
        return {
          id: s.id,
          student: {
            id: s.student.id,
            name: enrollment?.nickname || s.student.name,
            avatar: enrollment?.avatarUrl || null,
          },
          status: s.status,
          fileName: s.fileName,
          fileUrl: s.fileUrl,
          fileSize: s.fileSize,
          xpAwarded: s.xpAwarded,
          submittedAt: s.submittedAt,
          reviewedAt: s.reviewedAt,
        }
      }),
      total: submissions.length,
      pending: submissions.filter((s) => s.status === 'pendiente').length,
    }
  }

  /**
   * Teacher: Get pending submissions for a class
   */
  async getClassSubmissions(teacherId: string, classId: string, status?: string) {
    // Verify teacher owns the class
    const cls = await prisma.class.findFirst({
      where: { id: classId, teacherId },
    })

    if (!cls) throw new Error('Clase no encontrada')

    const where: any = {
      enigma: { mission: { classId } },
    }
    if (status) where.status = status

    const submissions = await prisma.enigmaSubmission.findMany({
      where,
      include: {
        student: { select: { id: true, name: true, email: true } },
        enigma: { include: { mission: true } },
      },
      orderBy: { submittedAt: 'desc' },
    })

    return {
      submissions: submissions.map((s) => ({
        id: s.id,
        student: { id: s.student.id, name: s.student.name },
        enigmaId: s.enigmaId,
        enigmaTitle: s.enigma.title,
        missionTitle: s.enigma.mission.title,
        status: s.status,
        fileName: s.fileName,
        fileUrl: s.fileUrl,
        submittedAt: s.submittedAt,
      })),
      total: submissions.length,
    }
  }

  /**
   * Teacher: Approve submission and award XP.
   * Runs inside a single transaction so that XP, level, progress and activity
   * updates are all-or-nothing. Also prevents double-awarding the mission bonus
   * under concurrent approvals by requiring `completedAt: null` in the atomic
   * `updateMany` that marks the mission as complete.
   */
  async approveSubmission(
    teacherId: string,
    submissionId: string,
    opts: { xpAwarded?: number; percentage?: number } = {}
  ) {
    const submission = await prisma.enigmaSubmission.findUnique({
      where: { id: submissionId },
      include: {
        enigma: { include: { mission: true } },
        student: true,
      },
    })

    if (!submission) throw new Error('Entrega no encontrada')

    // Verify teacher owns the class
    const cls = await prisma.class.findFirst({
      where: { id: submission.enigma.mission.classId, teacherId },
    })

    if (!cls) throw new Error('No tienes permiso para revisar esta entrega')

    if (submission.status !== 'pendiente') {
      throw new Error('Esta entrega ya fue revisada')
    }

    // Guard against double-crediting: if this enigma was already approved for the
    // student (a progress record exists from an earlier submission), refuse —
    // re-approving a fresh submission would grant the rewards a second time.
    const alreadyApproved = await prisma.studentEnigmaProgress.findUnique({
      where: { studentId_enigmaId: { studentId: submission.studentId, enigmaId: submission.enigmaId } },
    })
    if (alreadyApproved) {
      throw new Error('Este enigma ya fue aprobado para este alumno')
    }

    const { xpReward, coinReward, manaReward } = submission.enigma

    // The teacher marks the % of the task completed; that single percentage
    // scales every reward (XP, coins and mana) independently. We resolve the
    // percentage server-side so we never trust client-sent reward amounts.
    let pct: number
    if (opts.percentage !== undefined && opts.percentage !== null) {
      pct = opts.percentage
    } else if (opts.xpAwarded !== undefined && opts.xpAwarded !== null && xpReward > 0) {
      // Backward compat: derive the percentage from a legacy absolute XP value.
      pct = (opts.xpAwarded / xpReward) * 100
    } else {
      pct = 100
    }
    if (!Number.isFinite(pct)) pct = 100
    pct = Math.min(100, Math.max(0, pct))

    // Respect the class settings: don't award resources the class has disabled
    // (keeps balances consistent with what's shown). `cls` already carries settings.
    const classSettings = resolveClassSettings(cls.settings)

    // Validate + resolve XP to award (integer, 0..xpReward).
    const xpToAward = classSettings.xp
      ? validateCustomEnigmaXp(Math.round((xpReward * pct) / 100), xpReward)
      : 0
    const coinsToAward = classSettings.coins ? Math.round(((coinReward ?? 0) * pct) / 100) : 0
    const manaToAward = classSettings.mana ? Math.round(((manaReward ?? 0) * pct) / 100) : 0

    const studentId = submission.studentId
    const classId = submission.enigma.mission.classId
    const missionId = submission.enigma.missionId

    // Pre-fetch class info (read-only) before the write transaction so we don't
    // hold locks while talking to unrelated tables.
    const classInfo = await prisma.class.findUnique({
      where: { id: classId },
      select: { name: true, teacher: { select: { name: true } } },
    })

    const result = await prisma.$transaction(async (tx) => {
      // Re-check status inside the tx to close the race window between
      // the pre-check above and this write.
      const locked = await tx.enigmaSubmission.findUnique({
        where: { id: submissionId },
        select: { status: true },
      })
      if (!locked || locked.status !== 'pendiente') {
        throw new Error('Esta entrega ya fue revisada')
      }

      // Mark the submission as approved.
      const updated = await tx.enigmaSubmission.update({
        where: { id: submissionId },
        data: {
          status: 'aprobada',
          xpAwarded: xpToAward,
          reviewedAt: new Date(),
        },
      })

      // Record enigma progress (idempotent via unique constraint). We store the
      // completion %, plus the XP/coins/mana actually earned, so each enigma's
      // contribution is auditable and can be recomputed if the teacher later
      // edits the enigma's rewards.
      const roundedPct = Math.round(pct)
      await tx.studentEnigmaProgress.upsert({
        where: { studentId_enigmaId: { studentId, enigmaId: submission.enigmaId } },
        update: {
          xpEarned: xpToAward,
          coinsEarned: coinsToAward,
          manaEarned: manaToAward,
          percentage: roundedPct,
        },
        create: {
          studentId,
          enigmaId: submission.enigmaId,
          xpEarned: xpToAward,
          coinsEarned: coinsToAward,
          manaEarned: manaToAward,
          percentage: roundedPct,
        },
      })

      // Recompute mission progress.
      const [missionEnigmasCompleted, totalEnigmas] = await Promise.all([
        tx.studentEnigmaProgress.count({
          where: { studentId, enigma: { missionId } },
        }),
        tx.missionEnigma.count({ where: { missionId } }),
      ])

      if (totalEnigmas === 0) {
        throw new Error('La misión no tiene enigmas configurados')
      }

      const isComplete = missionEnigmasCompleted >= totalEnigmas
      const progressPct = Math.round((missionEnigmasCompleted / totalEnigmas) * 100)

      // Upsert progress but DO NOT set completedAt here — we use a conditional
      // updateMany below so that only one concurrent transaction can flip it.
      await tx.studentMissionProgress.upsert({
        where: { studentId_missionId: { studentId, missionId } },
        update: {
          enigmasCompleted: missionEnigmasCompleted,
          progress: progressPct,
        },
        create: {
          studentId,
          missionId,
          enigmasCompleted: missionEnigmasCompleted,
          progress: progressPct,
        },
      })

      let justCompleted = false
      if (isComplete) {
        const flipped = await tx.studentMissionProgress.updateMany({
          where: { studentId, missionId, completedAt: null },
          data: { completedAt: new Date() },
        })
        justCompleted = flipped.count > 0
      }

      // Award enigma rewards (always). Coins and mana scale with the same
      // percentage as XP but are credited independently (the teacher configures
      // them separately on the enigma).
      const enigmaXpResult = await applyXpDelta({
        studentId,
        classId,
        delta: xpToAward,
        coinsDelta: coinsToAward,
        manaDelta: manaToAward,
        tx,
      })

      // Fresh enrollment after the enigma XP change — needed for activity metadata.
      const enrollmentAfter = await tx.classEnrollment.findUniqueOrThrow({
        where: { studentId_classId: { studentId, classId } },
      })

      await tx.activity.create({
        data: {
          userId: studentId,
          type: 'enigma_completed',
          description: `Tu entrega de "${submission.enigma.title}" fue aprobada`,
          avatar: enrollmentAfter.avatarUrl,
          username: enrollmentAfter.nickname || 'Estudiante',
          classId,
          className: classInfo?.name,
          teacherName: classInfo?.teacher.name,
          enigmaTitle: submission.enigma.title,
          enigmaXp: xpToAward,
          metadata: {
            enigmaId: submission.enigmaId,
            missionId,
          },
        },
      })

      // Mission completion bonus: only fire on the transaction that flipped completedAt.
      if (justCompleted) {
        const mission = await tx.mission.findUnique({
          where: { id: missionId },
          include: { badges: true },
        })

        if (mission?.badges[0]) {
          await tx.studentBadge.create({
            data: { studentId, badgeId: mission.badges[0].id },
          }).catch(() => {}) // Unique constraint catches repeats.
        }

        const bonusRewards = getMissionCompletionRewards(submission.enigma.mission.rarity)

        // Skip the completion XP bonus if XP is disabled for the class.
        if (classSettings.xp) {
          await applyXpDelta({
            studentId,
            classId,
            delta: bonusRewards.xp,
            tx,
          })
        }

        await tx.activity.create({
          data: {
            userId: studentId,
            type: 'mission_completed',
            description: `Has completado la misión "${submission.enigma.mission.title}"`,
            avatar: enrollmentAfter.avatarUrl,
            username: enrollmentAfter.nickname || 'Estudiante',
            classId,
            className: classInfo?.name,
            missionTitle: submission.enigma.mission.title,
            missionXp: bonusRewards.xp,
            metadata: { missionId },
          },
        })
      }

      return { updated, enigmaXpResult }
    })

    const updated = result.updated

    return {
      submission: updated,
      xpAwarded: xpToAward,
      coinsAwarded: coinsToAward,
      manaAwarded: manaToAward,
      percentage: Math.round(pct),
      message: 'Entrega aprobada',
    }
  }
}

export const submissionsService = new SubmissionsService()
