import { prisma } from '../../../config/database.js'
import { BaseAgent, type AgentRequestContext } from './base-agent.js'
import { getPlatformContext, getSkinName } from '../platform-context.js'
import { calculateMissionTotalXP } from '../../../utils/xp-calculator.js'

export class TeacherAgent extends BaseAgent {
  protected buildSystemPrompt(context: AgentRequestContext) {
    const platform = getPlatformContext('teacher', context.locale)
    const skinName = getSkinName(context.assistantId)

    const rules = context.locale.startsWith('en')
      ? `You are ${skinName}, teacher assistant in ITAKAI. IMPORTANT: When the teacher asks to create something (mission, badge, narrative, enigma) and does NOT specify which class it is for, ASK FIRST which class they want it for before proceeding. List their available classes. When the teacher asks for ideas or creative help: be creative and specific. When asked how to do something in the platform: give the navigation path. Be BRIEF but USEFUL: max 4-5 sentences. Use data from context (class names, student counts). Markdown OK for lists/bold.`
      : `Eres ${skinName}, asistente del profesor en ITAKAI. IMPORTANTE: Cuando el profesor pida crear algo (misión, insignia, narrativa, enigma) y NO especifique para qué clase es, PREGUNTA PRIMERO para qué clase lo quiere. Lista sus clases disponibles para que elija. Cuando pida ideas o ayuda creativa: sé creativo y específico. Cuando pregunte cómo hacer algo en la plataforma: da la ruta de navegación. Sé BREVE pero ÚTIL: máximo 4-5 frases. Usa datos del contexto (nombres de clases, cantidad de alumnos). Markdown OK para listas/negrita.`

    return `${platform}\n\n${rules}`
  }

  protected async buildPrompt(context: AgentRequestContext) {
    const [teacher, classes, pendingSubmissions, missions] = await Promise.all([
      prisma.user.findUnique({
        where: { id: context.userId },
        select: { name: true },
      }),
      prisma.class.findMany({
        where: { teacherId: context.userId },
        include: {
          _count: {
            select: {
              enrollments: { where: { isPreview: false } },
              missions: true,
            },
          },
        },
        orderBy: { createdAt: 'asc' },
        take: 5,
      }),
      prisma.enigmaSubmission.count({
        where: {
          status: 'pendiente',
          enigma: {
            mission: {
              class: {
                teacherId: context.userId,
              },
            },
          },
        },
      }),
      prisma.mission.findMany({
        where: {
          class: {
            teacherId: context.userId,
          },
        },
        include: {
          class: { select: { name: true } },
          _count: { select: { enigmas: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: 5,
      }),
    ])

    // If missionId is provided, fetch full mission context for the AI
    let missionContext: string | null = null
    if (context.missionId) {
      missionContext = await this.buildMissionContext(context.missionId)
    }

    const classesSummary = classes.length > 0
      ? classes.map(cls => `${cls.name} (${cls._count.enrollments} alumnos, ${cls._count.missions} misiones)`).join('; ')
      : 'Sin clases creadas'
    const missionsSummary = missions.length > 0
      ? missions.map(mission => `${mission.title} en ${mission.class.name} (${mission._count.enigmas} enigmas)`).join('; ')
      : 'Sin misiones'

    const teacherName = teacher?.name?.split(' ')[0] || ''

    const parts = [
      `Rol del usuario: profesor`,
      teacherName ? `Nombre del profesor: ${teacherName}` : '',
      `Skin visual: ${getSkinName(context.assistantId)}`,
      `Clases: ${classesSummary}`,
      `Misiones: ${missionsSummary}`,
      `Entregas pendientes: ${pendingSubmissions}`,
    ]

    // Inject current mission context if available
    if (missionContext) {
      parts.push(`\nCURRENT MISSION CONTEXT:\n${missionContext}`)
    }

    // Include conversation history for multi-turn context
    if (context.history && context.history.length > 0) {
      const historyBlock = context.history
        .map(m => `${m.role === 'user' ? 'Profesor' : getSkinName(context.assistantId)}: ${m.content}`)
        .join('\n')
      parts.push(`\nHistorial reciente de la conversacion:\n${historyBlock}`)
    }

    parts.push(
      `\nConsulta del profesor: ${context.message}`,
      context.locale.startsWith('en')
        ? 'Be brief. Max 3-4 sentences with specific data. No filler.'
        : 'Se breve. Maximo 3-4 frases con datos concretos. Sin relleno.',
    )

    return parts.join('\n')
  }

  /**
   * Build detailed mission context string for AI prompt injection (teacher perspective).
   * Fetches the full mission with enigmas, class info, and student submission stats.
   */
  private async buildMissionContext(missionId: string): Promise<string | null> {
    const [mission, enrollmentCount, studentProgressList] = await Promise.all([
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
      // Count students enrolled in the mission's class
      prisma.classEnrollment.count({
        where: {
          isPreview: false,
          class: {
            missions: { some: { id: missionId } },
          },
        },
      }),
      // All student progress records for this mission
      prisma.studentMissionProgress.findMany({
        where: { missionId },
        select: { progress: true, completedAt: true },
      }),
    ])

    if (!mission) return null

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
        const optional = enigma.isOptional ? ' (optional)' : ''
        lines.push(`  ${enigma.orderIndex + 1}. ${enigma.title}${optional} — ${enigma.xpReward} XP`)
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

    // Student submission stats (teacher perspective)
    const studentsStarted = studentProgressList.length
    const studentsCompleted = studentProgressList.filter(sp => sp.completedAt !== null).length
    const avgProgress = studentsStarted > 0
      ? Math.round(studentProgressList.reduce((sum, sp) => sum + sp.progress, 0) / studentsStarted)
      : 0

    lines.push(`\nStudent Stats:`)
    lines.push(`  Enrolled in class: ${enrollmentCount}`)
    lines.push(`  Started mission: ${studentsStarted}`)
    lines.push(`  Completed mission: ${studentsCompleted}`)
    lines.push(`  Average progress: ${avgProgress}%`)

    return lines.join('\n')
  }
}
