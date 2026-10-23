/**
 * Script to recalculate XP for all students in all classes
 * This fixes the missing mission completion bonuses in existing data
 *
 * OBSOLETO, no ejecutar sobre datos reales: rehace la XP solo con las entregas,
 * sin comportamientos, recompensas libres, premios de equipo ni lo que cobran y
 * descuentan las pistas de las misiones. Desharía todo eso.
 */

import { prisma } from '../config/database.js'
import { getMissionCompletionRewards } from '../utils/xp-calculator.js'

async function recalculateStudentXp() {
  console.log('🔄 Recalculating XP for all students...\n')

  // Get all class enrollments
  const enrollments = await prisma.classEnrollment.findMany({
    include: {
      student: { select: { name: true } },
      class: {
        select: {
          name: true,
          missions: { include: { enigmas: true } },
        },
      },
    },
  })

  let updated = 0

  for (const enrollment of enrollments) {
    const studentId = enrollment.studentId
    const classId = enrollment.classId

    // Get all enigma XP for this student in this class
    const enigmaIds = enrollment.class.missions.flatMap((m) => m.enigmas.map((e) => e.id))
    const completedEnigmaRecords = await prisma.studentEnigmaProgress.findMany({
      where: {
        studentId,
        enigmaId: { in: enigmaIds },
      },
    })

    // Sum XP from completed enigmas
    let xpEarned = completedEnigmaRecords.reduce((sum, ep) => sum + ep.xpEarned, 0)

    // Add mission completion bonuses for fully completed missions
    for (const mission of enrollment.class.missions) {
      const missionEnigmaIds = mission.enigmas.map((e) => e.id)
      const completedInMission = completedEnigmaRecords.filter((ep) =>
        missionEnigmaIds.includes(ep.enigmaId)
      )

      // If all enigmas in this mission are completed, add mission completion bonus
      if (mission.enigmas.length > 0 && completedInMission.length === mission.enigmas.length) {
        const bonus = getMissionCompletionRewards(mission.rarity as any).xp
        xpEarned += bonus
        console.log(
          `  ✓ Mission "${mission.title}" complete: +${bonus} XP bonus (${mission.rarity})`
        )
      }
    }

    // Update enrollment if XP changed
    if (xpEarned !== enrollment.xp) {
      await prisma.classEnrollment.update({
        where: {
          studentId_classId: { studentId, classId },
        },
        data: { xp: xpEarned },
      })

      console.log(
        `📊 ${enrollment.student.name} in "${enrollment.class.name}": ${enrollment.xp} XP → ${xpEarned} XP`
      )
      updated++
    } else {
      console.log(`✅ ${enrollment.student.name} in "${enrollment.class.name}": ${xpEarned} XP (no change)`)
    }

    console.log('') // Blank line
  }

  console.log(`\n✨ Done! Updated ${updated} enrollments.`)
}

recalculateStudentXp()
  .catch((e) => {
    console.error('❌ Error:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
