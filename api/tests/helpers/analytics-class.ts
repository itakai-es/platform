import './test-db.js'
import { randomUUID } from 'node:crypto'
import { prisma } from '../../src/config/database.js'
import { createClassWithOwner } from '../../src/utils/class-owner.js'
import { madridDay } from '../../src/modules/analytics/definitions.js'

/**
 * Una clase pequeña para probar las respuestas de la analítica, con cifras que
 * se pueden comprobar a mano. Cuatro estudiantes y la vista previa del profesorado:
 *
 * - **Ana** lo lleva bien: completa M1 (con el opcional) y M5 antes de la fecha,
 *   y M3 antes de que se bloqueara. Viene a todas las sesiones.
 * - **Bea** tropieza: un enigma de M1 al 40 %, uno de M2 al 55 %, dos pistas en M2
 *   (una de %), una entrega de M5 sin revisar y una sola asistencia de cinco.
 * - **Carla** es una cuenta sin estrenar: no participa y no tiene nada.
 * - **Dani** aprobó M2 hace 20 días y tiene una entrega atascada de ese enigma.
 *
 * Misiones, en su orden: M1 (dos obligatorios y un opcional), M2 (dos), M3
 * (bloqueada a mano), M4 (sin enigmas), M5 (caducó hace 3 días) y M6 (pide M1;
 * con el mapa encendido, cerrada a quien no ha completado M1).
 *
 * `ids` lleva por etiqueta las personas, las misiones, los enigmas y las
 * matrículas (`enrollment:ana`). Todo con ids nuevos; `cleanup` lo borra.
 */

export const NOW = new Date()
export const ago = (days: number) => new Date(NOW.getTime() - days * 24 * 60 * 60 * 1000)

export interface AnalyticsClass {
  classId: string
  otherClassId: string
  ids: Record<string, string>
  /** Nombres y alias de quienes no son `except`: lo que no puede ver el alumnado. */
  foreignValues: (except: string) => string[]
  cleanup: () => Promise<void>
}

const STUDENTS = ['ana', 'bea', 'carla', 'dani'] as const

export async function seedAnalyticsClass(settings: object = { missionMap: true }): Promise<AnalyticsClass> {
  const tag = randomUUID().slice(0, 8)
  const ids: Record<string, string> = {}
  const userIds: string[] = []
  const classIds: string[] = []
  const texts: Record<string, string[]> = {}

  const newUser = async (label: string, role: 'teacher' | 'student', managed = false) => {
    const name = `${label[0]!.toUpperCase()}${label.slice(1)} Real ${tag}`
    const email = `${label}.${tag}@test.invalid`
    const user = await prisma.user.create({
      data: managed
        ? { username: `${label}-${tag}`, accountType: 'managed', passwordHash: 'x', name, role }
        : { email, passwordHash: 'x', name, role, isOnboarded: true },
    })
    userIds.push(user.id)
    ids[label] = user.id
    texts[label] = [name, email, user.id]
    return user.id
  }

  const newClass = async (name: string, ownerId: string, classSettings: object) => {
    const cls = await prisma.$transaction(tx =>
      createClassWithOwner(
        tx,
        {
          name: `${name} ${tag}`,
          invitationCode: randomUUID().slice(0, 6).toUpperCase(),
          settings: classSettings,
        },
        ownerId
      )
    )
    classIds.push(cls.id)
    return cls.id
  }

  const teacher = await newUser('profe', 'teacher')
  await prisma.user.update({ where: { id: teacher }, data: { avatar: 'atenea' } })
  const otherTeacher = await newUser('profeb', 'teacher')
  const classId = await newClass('Analítica', teacher, settings)
  const otherClassId = await newClass('Otra', otherTeacher, {})

  await newUser('ana', 'student')
  await newUser('bea', 'student')
  await newUser('carla', 'student', true)
  await newUser('dani', 'student')
  await newUser('fuera', 'student')

  const wallets: Record<string, { xp: number; coins: number; mana: number; level: number }> = {
    ana: { xp: 300, coins: 40, mana: 7, level: 5 },
    bea: { xp: 100, coins: 10, mana: 0, level: 2 },
    carla: { xp: 0, coins: 0, mana: 0, level: 1 },
    dani: { xp: 200, coins: 5, mana: 0, level: 4 },
  }
  for (const name of STUDENTS) {
    const nickname = `Alias ${name} ${tag}`
    const enrollment = await prisma.classEnrollment.create({
      data: { classId, studentId: ids[name]!, enrolledAt: ago(30), nickname, ...wallets[name]! },
    })
    ids[`enrollment:${name}`] = enrollment.id
    texts[name]!.push(nickname, enrollment.id)
  }
  const preview = await prisma.classEnrollment.create({
    data: { classId, studentId: teacher, isPreview: true, nickname: `Vista ${tag}`, enrolledAt: ago(30) },
  })
  ids['enrollment:profe'] = preview.id
  texts.profe!.push(`Vista ${tag}`, preview.id)
  const elsewhere = await prisma.classEnrollment.create({
    data: { classId: otherClassId, studentId: ids.fuera!, nickname: `Alias fuera ${tag}` },
  })
  texts.fuera!.push(`Alias fuera ${tag}`, elsewhere.id)
  await prisma.classEnrollment.create({
    data: { classId: otherClassId, studentId: ids.bea!, nickname: `Bea en otra ${tag}` },
  })

  let order = 0
  const newMission = async (
    label: string,
    enigmas: { label: string; optional?: boolean }[],
    data: { status?: 'activa' | 'bloqueada'; deadline?: Date } = {}
  ) => {
    const mission = await prisma.mission.create({
      data: { classId, title: label, orderIndex: order++, ...data },
    })
    ids[label] = mission.id
    for (const [index, e] of enigmas.entries()) {
      const enigma = await prisma.missionEnigma.create({
        data: {
          missionId: mission.id,
          title: e.label,
          isOptional: e.optional ?? false,
          orderIndex: index,
          xpReward: 10,
        },
      })
      ids[e.label] = enigma.id
    }
  }

  await newMission('M1', [{ label: 'm1e1' }, { label: 'm1e2' }, { label: 'm1o', optional: true }])
  await newMission('M2', [{ label: 'm2e1' }, { label: 'm2e2' }])
  await newMission('M3', [{ label: 'm3e1' }], { status: 'bloqueada' })
  await newMission('M4', [])
  await newMission('M5', [{ label: 'm5e1' }], { deadline: ago(3) })
  await newMission('M6', [{ label: 'm6e1' }])
  await prisma.missionPrerequisite.create({
    data: { missionId: ids.M6!, requiredMissionId: ids.M1! },
  })

  const approve = (student: string, enigma: string, percentage: number, at: Date) =>
    prisma.studentEnigmaProgress.create({
      data: {
        studentId: ids[student]!,
        enigmaId: ids[enigma]!,
        percentage,
        completedAt: at,
        xpEarned: Math.round((10 * percentage) / 100),
        coinsEarned: 5,
        manaEarned: 1,
      },
    })
  const submit = (
    student: string,
    enigma: string,
    at: Date,
    status: 'pendiente' | 'aprobada' = 'pendiente'
  ) =>
    prisma.enigmaSubmission.create({
      data: { studentId: ids[student]!, enigmaId: ids[enigma]!, submittedAt: at, status },
    })
  const progress = (student: string, mission: string, enigmasCompleted: number, completedAt: Date | null) =>
    prisma.studentMissionProgress.create({
      data: {
        studentId: ids[student]!,
        missionId: ids[mission]!,
        enigmasCompleted,
        completedAt,
        progress: completedAt ? 100 : 50,
      },
    })
  const wall = (
    student: string,
    type: 'enigma_submitted' | 'enigma_completed' | 'hint_used' | 'behavior_applied' | 'xp_gained' | 'badge_earned' | 'class_joined',
    at: Date,
    data: object = {},
    inClass: string | null = classId
  ) =>
    prisma.activity.create({
      data: {
        id: randomUUID(),
        userId: ids[student]!,
        classId: inClass,
        type,
        description: 'x',
        createdAt: at,
        ...data,
      },
    })

  // Ana.
  await approve('ana', 'm1e1', 100, ago(5))
  await approve('ana', 'm1e2', 90, ago(5))
  await approve('ana', 'm1o', 80, ago(5))
  await progress('ana', 'M1', 3, ago(5))
  await approve('ana', 'm5e1', 100, ago(4))
  await progress('ana', 'M5', 1, ago(4))
  await approve('ana', 'm3e1', 100, ago(20))
  await progress('ana', 'M3', 1, ago(20))
  await wall('ana', 'enigma_submitted', ago(2), { enigmaTitle: 'm1e2' })

  // Bea.
  await approve('bea', 'm1e1', 40, ago(6))
  await progress('bea', 'M1', 1, null)
  await approve('bea', 'm2e1', 55, ago(6))
  await progress('bea', 'M2', 1, null)
  const coinHint = await prisma.missionHint.create({
    data: { missionId: ids.M2!, content: 'Mira', costType: 'coins', cost: 5, orderIndex: 0 },
  })
  const percentHint = await prisma.missionHint.create({
    data: { missionId: ids.M2!, content: 'Más', costType: 'percent', cost: 20, orderIndex: 1 },
  })
  for (const hint of [coinHint, percentHint]) {
    await prisma.missionHintUse.create({
      data: {
        hintId: hint.id,
        missionId: ids.M2!,
        studentId: ids.bea!,
        costType: hint.costType,
        cost: hint.cost,
        createdAt: ago(5),
      },
    })
  }
  await submit('bea', 'm5e1', ago(4))

  // Su muro: dos entradas en el mismo instante, para probar el cursor, y lo que no sale.
  const bea = { username: `Alias bea ${tag}`, avatar: '/app/avatars/atenea.svg' }
  await wall('bea', 'enigma_submitted', ago(7), { ...bea, enigmaTitle: 'm1e1' })
  await wall('bea', 'enigma_completed', ago(6), {
    ...bea,
    enigmaTitle: 'm1e1',
    enigmaXp: 4,
    actorId: teacher,
    actorName: 'Profe Real',
    metadata: { enigmaId: ids.m1e1, missionId: ids.M1 },
  })
  const tied = ago(5)
  await wall('bea', 'hint_used', tied, {
    ...bea,
    missionTitle: 'M2',
    metadata: { position: 1, costType: 'coins', cost: 5 },
  })
  await wall('bea', 'hint_used', tied, {
    ...bea,
    missionTitle: 'M2',
    metadata: { position: 2, costType: 'percent', cost: 20 },
  })
  await wall('bea', 'behavior_applied', ago(1), {
    ...bea,
    source: 'Participa',
    actorId: teacher,
    actorName: 'Profe Real',
    metadata: { kind: 'positive', xpDelta: 5 },
  })
  await wall('bea', 'xp_gained', ago(1), { source: 'seguridad' }, null)
  await wall('bea', 'badge_earned', ago(1), { badgeName: 'Del sistema' }, null)
  await wall('bea', 'class_joined', ago(1), { className: 'Otra' }, otherClassId)

  // Dani: un aprobado viejo y una entrega atascada de ese enigma.
  await approve('dani', 'm2e1', 100, ago(20))
  await progress('dani', 'M2', 1, null)
  await submit('dani', 'm2e1', ago(21), 'aprobada')
  await submit('dani', 'm2e1', ago(20))
  await wall('dani', 'enigma_submitted', ago(20), { enigmaTitle: 'm2e1' })
  // Lo que hace el profesorado no es actividad del estudiante.
  await wall('dani', 'behavior_applied', ago(1), { source: 'Participa', actorName: 'Profe Real' })

  // Asistencia: cinco sesiones; Ana viene, Bea a una, Dani llega tarde y a
  // Carla no se le pasa. La primera, con horario.
  for (let day = 1; day <= 5; day++) {
    const session = await prisma.attendanceSession.create({
      data: {
        classId,
        date: new Date(`${madridDay(ago(day))}T00:00:00Z`),
        startTime: day === 1 ? '08:30' : '',
        endTime: day === 1 ? '09:25' : null,
        takenById: teacher,
      },
    })
    await prisma.attendanceRecord.createMany({
      data: [
        { sessionId: session.id, enrollmentId: ids['enrollment:ana']!, status: 'present' },
        {
          sessionId: session.id,
          enrollmentId: ids['enrollment:bea']!,
          status: day === 3 ? 'present' : day === 2 ? 'excused' : 'absent',
          note: day === 2 ? 'Médico' : null,
          updatedById: teacher,
        },
        { sessionId: session.id, enrollmentId: ids['enrollment:dani']!, status: 'late' },
        // La vista previa no cuenta, ni aunque tenga registros.
        { sessionId: session.id, enrollmentId: preview.id, status: 'absent' },
      ],
    })
  }

  // Una insignia de M1, que tiene Ana; una del sistema, que no es de la clase.
  const badge = await prisma.badge.create({
    data: { name: 'De la clase', teacherId: teacher, missionId: ids.M1 },
  })
  const systemBadge = await prisma.badge.create({ data: { name: `Del sistema ${tag}` } })
  await prisma.studentBadge.create({ data: { studentId: ids.ana!, badgeId: badge.id } })
  await prisma.studentBadge.create({ data: { studentId: ids.ana!, badgeId: systemBadge.id } })

  return {
    classId,
    otherClassId,
    ids,
    foreignValues: except =>
      Object.entries(texts)
        .filter(([label]) => label !== except)
        .flatMap(([, values]) => values),
    cleanup: async () => {
      await prisma.activity.deleteMany({ where: { userId: { in: userIds } } })
      await prisma.studentBadge.deleteMany({ where: { badgeId: { in: [badge.id, systemBadge.id] } } })
      await prisma.badge.deleteMany({ where: { id: { in: [badge.id, systemBadge.id] } } })
      await prisma.class.deleteMany({ where: { id: { in: classIds } } })
      await prisma.user.deleteMany({ where: { id: { in: userIds } } })
    },
  }
}
