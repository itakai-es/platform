import { prisma } from '../../../config/database.js'
import { BaseAgent, type AgentRequestContext } from './base-agent.js'
import { getPlatformContext, getSkinName } from '../platform-context.js'
import { calculateMissionTotalXP } from '../../../utils/xp-calculator.js'

export class StudentAgent extends BaseAgent {
  protected buildSystemPrompt(context: AgentRequestContext) {
    const platform = getPlatformContext('student', context.locale)
    const skinName = getSkinName(context.assistantId)

    const rules = context.locale.startsWith('en')
      ? `You are ${skinName}, student mentor in ITAKAI. When the student asks for help with content, explanations, or study tips: HELP THEM directly with useful information. When they ask how to do something in the platform: give the navigation path. Never give direct answers to exercises — guide with hints. Be BRIEF but USEFUL: max 4-5 sentences. Use data from context (class names, missions, XP, level). Friendly tone, markdown OK.`
      : `Eres ${skinName}, mentor del alumno en ITAKAI. Cuando el alumno pida ayuda con contenido, explicaciones o consejos de estudio: AYUDALE directamente con informacion util. Cuando pregunte como hacer algo en la plataforma: da la ruta de navegacion. Nunca des respuestas directas a ejercicios — guia con pistas. Se BREVE pero UTIL: maximo 4-5 frases. Usa datos del contexto (nombres de clases, misiones, XP, nivel). Tono amigable, markdown OK.`

    return `${platform}\n\n${rules}`
  }

  protected async buildPrompt(context: AgentRequestContext) {
    const [student, enrollments, missionProgress, availableMissions] = await Promise.all([
      prisma.user.findUnique({
        where: { id: context.userId },
        select: { name: true },
      }),
      prisma.classEnrollment.findMany({
        where: { studentId: context.userId },
        include: {
          class: {
            select: {
              name: true,
              archived: true,
            },
          },
        },
        orderBy: { enrolledAt: 'asc' },
        take: 5,
      }),
      prisma.studentMissionProgress.findMany({
        where: { studentId: context.userId },
        include: {
          mission: {
            select: {
              title: true,
              class: { select: { name: true } },
              _count: { select: { enigmas: true } },
            },
          },
        },
        orderBy: { startedAt: 'desc' },
        take: 5,
      }),
      // All missions available to this student (from enrolled classes)
      prisma.mission.findMany({
        where: {
          class: {
            enrollments: { some: { studentId: context.userId } },
            archived: false,
          },
          status: 'activa',
        },
        select: {
          title: true,
          description: true,
          rarity: true,
          class: { select: { name: true } },
          _count: { select: { enigmas: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: 10,
      }),
    ])

    // If missionId is provided, fetch full mission context for the AI
    let missionContext: string | null = null
    if (context.missionId) {
      missionContext = await this.buildMissionContext(context.missionId, context.userId)
    }

    const enrollmentsSummary = enrollments.length > 0
      ? enrollments.map(item => `${item.class.name} (nivel ${item.level}, ${item.xp} XP)`).join('; ')
      : 'Sin clases activas'
    const missionSummary = missionProgress.length > 0
      ? missionProgress.map(item => `${item.mission.title} en ${item.mission.class.name} (${item.progress}%, ${item.mission._count.enigmas} enigmas)`).join('; ')
      : 'Sin misiones en progreso'
    const availableMissionsSummary = availableMissions.length > 0
      ? availableMissions.map(m => `${m.title} en ${m.class.name} (${m.rarity}, ${m._count.enigmas} enigmas${m.description ? ': ' + m.description.slice(0, 80) : ''})`).join('; ')
      : 'Sin misiones disponibles'

    const studentName = student?.name?.split(' ')[0] || ''

    const parts = [
      `Rol del usuario: alumno`,
      studentName ? `Nombre del alumno: ${studentName}` : '',
      `Skin visual: ${getSkinName(context.assistantId)}`,
      `Clases: ${enrollmentsSummary}`,
      `Misiones en progreso: ${missionSummary}`,
      `Misiones disponibles: ${availableMissionsSummary}`,
    ]

    // Inject current mission context if available
    if (missionContext) {
      parts.push(`\nCURRENT MISSION CONTEXT:\n${missionContext}`)
    }

    // Include conversation history for multi-turn context
    if (context.history && context.history.length > 0) {
      const historyBlock = context.history
        .map(m => `${m.role === 'user' ? 'Alumno' : getSkinName(context.assistantId)}: ${m.content}`)
        .join('\n')
      parts.push(`\nHistorial reciente de la conversacion:\n${historyBlock}`)
    }

    parts.push(
      `\nConsulta del alumno: ${context.message}`,
      context.locale.startsWith('en')
        ? 'Be brief. Max 3-4 sentences. Guide with specific data, no filler.'
        : 'Se breve. Maximo 3-4 frases. Guia con datos concretos, sin relleno.',
    )

    return parts.join('\n')
  }

  /**
   * Build detailed mission context string for AI prompt injection.
   * Fetches the full mission with enigmas, class name, and student progress.
   */
  private async buildMissionContext(missionId: string, studentId: string): Promise<string | null> {
    const [mission, studentProgress, enigmaProgress] = await Promise.all([
      prisma.mission.findUnique({
        where: { id: missionId },
        include: {
          class: { select: { name: true } },
          enigmas: {
            orderBy: { orderIndex: 'asc' },
            select: {
              id: true,
              title: true,
              description: true,
              objectives: true,
              xpReward: true,
              isOptional: true,
              orderIndex: true,
            },
          },
          documents: {
            orderBy: { orderIndex: 'asc' },
            select: {
              name: true,
              description: true,
              tags: true,
            },
          },
        },
      }),
      prisma.studentMissionProgress.findFirst({
        where: { studentId, missionId },
      }),
      prisma.studentEnigmaProgress.findMany({
        where: {
          studentId,
          enigma: { missionId },
        },
        select: { enigmaId: true, xpEarned: true },
      }),
    ])

    if (!mission) return null

    const completedEnigmaIds = new Set(enigmaProgress.map(ep => ep.enigmaId))

    const lines: string[] = [
      `Mission: ${mission.title}`,
      `Class: ${mission.class.name}`,
      `Rarity: ${mission.rarity}`,
      `XP Reward: ${calculateMissionTotalXP(mission.rarity, mission.enigmas.map(e => e.xpReward))}`,
      `Status: ${mission.status}`,
    ]

    if (mission.deadline) {
      lines.push(`Deadline: ${mission.deadline.toISOString().split('T')[0]}`)
    }

    if (mission.description) {
      lines.push(`Description/Narrative:\n${mission.description}`)
    }

    if (mission.enigmas.length > 0) {
      lines.push(`\nEnigmas (${mission.enigmas.length} total):`)
      for (const enigma of mission.enigmas) {
        const completed = completedEnigmaIds.has(enigma.id)
        const status = completed ? 'COMPLETED' : 'PENDING'
        const optional = enigma.isOptional ? ' (optional)' : ''
        lines.push(`  ${enigma.orderIndex + 1}. [${status}] ${enigma.title}${optional} — ${enigma.xpReward} XP`)
        if (enigma.description) {
          lines.push(`     Description: ${enigma.description}`)
        }
        if (enigma.objectives.length > 0) {
          lines.push(`     Objectives: ${enigma.objectives.join('; ')}`)
        }
      }
    }

    if (mission.documents.length > 0) {
      lines.push(`\nSupport Documents (${mission.documents.length}):`)
      for (const doc of mission.documents) {
        lines.push(`  - ${doc.name}${doc.description ? `: ${doc.description}` : ''}${doc.tags.length > 0 ? ` [${doc.tags.join(', ')}]` : ''}`)
      }
    }

    if (studentProgress) {
      lines.push(`\nStudent Progress: ${studentProgress.progress}% complete, ${studentProgress.enigmasCompleted} enigmas completed`)
      if (studentProgress.completedAt) {
        lines.push(`Mission completed on: ${studentProgress.completedAt.toISOString().split('T')[0]}`)
      }
    } else {
      lines.push(`\nStudent Progress: Not started yet`)
    }

    return lines.join('\n')
  }
}
