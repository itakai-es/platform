/**
 * Contexto para adaptar con IA una misión ya guardada a su clase (tipo de
 * prompt `mission.adapt`). Lo arma la API y no el navegador: así los recursos
 * activos de la clase (monedas, maná), su idioma y lo que ya no se puede tocar
 * de cada enigma (entregas, recompensas ya dadas) salen de la base de datos y
 * no de lo que mande quien llama. Solo para quien puede editar la misión.
 *
 * Proponer no escribe nada: la propuesta vuelve al navegador y solo se guarda
 * si su docente la aplica, por las rutas de siempre.
 */
import { prisma } from '../../config/database.js'
import { assertMissionAccess } from '../../utils/class-access.js'
import { resolveClassSettings } from '../../utils/class-settings.js'
import { NotFoundError } from '../../utils/errors.js'
import type { MissionAdaptInput } from './prompts/index.js'

export type MissionAdaptContext = Omit<MissionAdaptInput, 'previousProposal' | 'feedback'>

export async function loadMissionAdaptContext(
  missionId: string,
  userId: string
): Promise<MissionAdaptContext> {
  await assertMissionAccess(missionId, userId, 'mission.edit')
  const mission = await prisma.mission.findUnique({
    where: { id: missionId },
    select: {
      title: true,
      description: true,
      class: {
        select: {
          name: true,
          subject: true,
          educationLevel: true,
          language: true,
          narrative: true,
          settings: true,
          deletedAt: true,
        },
      },
      enigmas: {
        orderBy: { orderIndex: 'asc' },
        select: {
          title: true,
          description: true,
          objectives: true,
          xpReward: true,
          coinReward: true,
          manaReward: true,
          _count: { select: { submissions: true, progress: true } },
        },
      },
    },
  })
  // Una clase en la papelera es de solo lectura: tampoco se adapta nada en ella.
  if (!mission || mission.class.deletedAt) throw new NotFoundError('Misión no encontrada')

  const settings = resolveClassSettings(mission.class.settings)
  const meta = [
    mission.class.subject ? `Asignatura: ${mission.class.subject}` : '',
    mission.class.educationLevel ? `Nivel educativo: ${mission.class.educationLevel}` : '',
  ]
    .filter(Boolean)
    .join(' | ')

  return {
    className: mission.class.name,
    classMeta: meta,
    classLanguage: mission.class.language || '',
    classNarrative: mission.class.narrative || '',
    title: mission.title,
    description: mission.description || '',
    resources: { coins: settings.coins, mana: settings.mana },
    enigmas: mission.enigmas.map(e => ({
      title: e.title,
      description: e.description || '',
      objectives: e.objectives,
      xp: e.xpReward,
      coins: e.coinReward,
      mana: e.manaReward,
      hasSubmissions: e._count.submissions > 0 || e._count.progress > 0,
      rewardsLocked: e._count.progress > 0,
    })),
  }
}
