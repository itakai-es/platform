import { prisma } from '../../../config/database.js'
import { BaseAgent, type AgentRequestContext } from './base-agent.js'
import { getPlatformContext, getSkinName } from '../platform-context.js'
import { INCLUSIVE_LANGUAGE_ES } from '../prompts/index.js'
import { calculateMissionTotalXP } from '../../../utils/xp-calculator.js'
import { sortByClassOrder } from '../../../utils/mission-order.js'
import { resolveClassSettings } from '../../../utils/class-settings.js'
import {
  listedClassesWhere,
  assertMissionAccess,
  passesAccessCheck,
} from '../../../utils/class-access.js'

/** Lo que se lee de una misión requisito para contar cómo está. */
const REQUIRED_SELECT = {
  title: true,
  status: true,
  deadline: true,
  _count: { select: { enigmas: true } },
} as const

interface RequiredMission {
  title: string
  status: string
  deadline: Date | null
  _count: { enigmas: number }
}

/**
 * Cómo está una misión requisito, si no es lo normal: sin enigmas o caducada ya
 * no cierra nada (ver `requirementCloses`, utils/mission-path.ts); bloqueada a
 * mano, nadie la puede completar hasta que se abra. null si cierra como siempre.
 */
function requirementNote(required: RequiredMission, locale: 'es' | 'en'): string | null {
  const es = locale === 'es'
  if (required._count.enigmas === 0) return es ? 'sin enigmas, no cierra' : 'no enigmas: does not lock'
  if (required.deadline && required.deadline < new Date()) {
    return es ? 'caducada, ya no cierra' : 'past its deadline: does not lock'
  }
  if (required.status === 'bloqueada') {
    return es ? 'bloqueada: nadie la puede completar' : 'blocked: nobody can complete it'
  }
  return null
}

/** «A», o «A» (cómo está), para las listas de requisitos. */
function requirementLabel(required: RequiredMission, locale: 'es' | 'en'): string {
  const note = requirementNote(required, locale)
  return note ? `«${required.title}» (${note})` : `«${required.title}»`
}

/**
 * Lo que pide una misión en el mapa, para el resumen: «; se abre al completar
 * «A»» (y si el mapa está apagado en su clase, que ahora no cierra). Vacío si
 * no pide nada.
 */
function pathNote(mission: {
  class: { settings: unknown }
  prerequisites: { requiredMission: RequiredMission }[]
}): string {
  if (mission.prerequisites.length === 0) return ''
  const titles = mission.prerequisites.map(p => requirementLabel(p.requiredMission, 'es')).join(' y ')
  const off = resolveClassSettings(mission.class.settings).missionMap ? '' : ', sin efecto con el mapa apagado'
  return `; se abre al completar ${titles}${off}`
}

export class TeacherAgent extends BaseAgent {
  protected buildSystemPrompt(context: AgentRequestContext) {
    const platform = getPlatformContext('teacher', context.locale)
    const skinName = getSkinName(context.assistantId)

    const rules = context.locale.startsWith('en')
      ? `You are ${skinName}, teacher assistant in ITAKAI. IMPORTANT: When the teacher asks to create something (mission, badge, narrative, enigma) and does NOT specify which class it is for, ASK FIRST which class they want it for before proceeding. List their available classes. When the teacher asks for ideas or creative help: be creative and specific. When asked how to do something in the platform: give the navigation path. Be BRIEF but USEFUL: max 4-5 sentences. Use data from context (class names, student counts). Markdown OK for lists/bold.`
      : `Eres ${skinName}, asistente del profesorado en ITAKAI. IMPORTANTE: Cuando te pida crear algo (misión, insignia, narrativa, enigma) y NO especifique para qué clase es, PREGUNTA PRIMERO para qué clase lo quiere. Lista sus clases disponibles para que elija. Cuando pida ideas o ayuda creativa: aporta creatividad y concreción. Cuando pregunte cómo hacer algo en la plataforma: da la ruta de navegación. Sé BREVE pero ÚTIL: máximo 4-5 frases. Usa datos del contexto (nombres de clases, número de estudiantes). Markdown OK para listas/negrita. ${INCLUSIVE_LANGUAGE_ES}`

    return `${platform}\n\n${rules}`
  }

  protected async buildPrompt(context: AgentRequestContext) {
    // Las clases a las que el profesor tiene acceso, con cualquier nivel: lo que
    // puede ver en la aplicación es lo que el asistente puede contarle.
    // Las de la papelera, no: tampoco salen en sus listados.
    const myClasses = listedClassesWhere(context.userId)
    const [teacher, classes, pendingSubmissions, missions] = await Promise.all([
      prisma.user.findUnique({
        where: { id: context.userId },
        select: { name: true },
      }),
      prisma.class.findMany({
        where: myClasses,
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
          enigma: { mission: { class: myClasses } },
        },
      }),
      prisma.mission.findMany({
        where: { class: myClasses },
        include: {
          class: { select: { name: true, settings: true } },
          _count: { select: { enigmas: true } },
          // Lo que pide cada una en el mapa, para decir qué la abre.
          prerequisites: { select: { requiredMission: { select: REQUIRED_SELECT } } },
        },
        // Las más recientes, que son las del curso; se enseñan en el orden de
        // la progresión de cada clase, como las ve el alumnado.
        orderBy: { createdAt: 'desc' },
        take: 5,
      }),
    ])

    // If missionId is provided, fetch full mission context for the AI
    let missionContext: string | null = null
    if (context.missionId) {
      missionContext = await this.buildMissionContext(context.missionId, context.userId)
    }

    const classesSummary = classes.length > 0
      ? classes.map(cls => `${cls.name} (${cls._count.enrollments} estudiantes, ${cls._count.missions} misiones)`).join('; ')
      : 'Sin clases creadas'
    const missionsSummary = missions.length > 0
      ? sortByClassOrder(missions).map(mission => `${mission.title} en ${mission.class.name} (${mission._count.enigmas} enigmas${pathNote(mission)})`).join('; ')
      : 'Sin misiones'

    const teacherName = teacher?.name?.split(' ')[0] || ''

    const parts = [
      `Rol de quien escribe: docente`,
      teacherName ? `Nombre: ${teacherName}` : '',
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
        .map(m => `${m.role === 'user' ? 'Docente' : getSkinName(context.assistantId)}: ${m.content}`)
        .join('\n')
      parts.push(`\nHistorial reciente de la conversacion:\n${historyBlock}`)
    }

    parts.push(
      `\nConsulta de docente: ${context.message}`,
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
  private async buildMissionContext(missionId: string, userId: string): Promise<string | null> {
    // El contexto de una misión solo se carga para el profesorado de su clase; si no, se ignora.
    if (!(await passesAccessCheck(assertMissionAccess(missionId, userId, 'mission.view')))) {
      return null
    }

    const [mission, enrollmentCount, studentProgressList] = await Promise.all([
      prisma.mission.findUnique({
        where: { id: missionId },
        include: {
          class: { select: { name: true, settings: true } },
          // El camino del mapa: lo que pide y lo que la pide a ella.
          prerequisites: { select: { requiredMission: { select: REQUIRED_SELECT } } },
          requiredBy: {
            select: { mission: { select: { title: true } } },
            orderBy: { mission: { orderIndex: 'asc' } },
          },
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

    // El camino del mapa: cada estudiante la tiene cerrada hasta completar lo que pide.
    if (mission.prerequisites.length > 0 || mission.requiredBy.length > 0) {
      const mapOn = resolveClassSettings(mission.class.settings).missionMap
      lines.push(`Mission map path (${mapOn ? 'map on: it locks per student' : 'map off: it does not lock anything now'}):`)
      if (mission.prerequisites.length > 0) {
        lines.push(`  Opens for each student after completing: ${mission.prerequisites.map(p => requirementLabel(p.requiredMission, 'en')).join(', ')}`)
      }
      if (mission.requiredBy.length > 0) {
        lines.push(`  Completing it opens: ${mission.requiredBy.map(p => `«${p.mission.title}»`).join(', ')}`)
      }
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
