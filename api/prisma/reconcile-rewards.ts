/**
 * One-time reconciliation of per-class reward balances.
 *
 * Rebuilds every student's XP / coins / mana from the immutable earn & spend
 * records so the wallet can never drift from reality:
 *   xp    = Σ enigma xpEarned + Σ mission-completion bonuses (XP only)
 *   coins = Σ enigma coinsEarned − Σ shop purchases
 *   mana  = Σ enigma manaEarned − Σ power uses
 *
 * Also backfills StudentEnigmaProgress.{percentage,coinsEarned,manaEarned}
 * (derived from xpEarned and the enigma's CURRENT rewards) for rows created
 * before those columns existed.
 *
 * Run: docker exec itakai-api-dev sh -c "cd /app && npx tsx prisma/reconcile-rewards.ts"
 *
 * OBSOLETO, no ejecutar sobre datos reales: rehace los saldos solo con entregas
 * y tienda, sin comportamientos, recompensas libres, premios de equipo ni lo que
 * cobran y descuentan las pistas de las misiones. Desharía todo eso.
 */
import { prisma } from '../src/config/database.js'
import { getLevelFromXP, getMissionCompletionRewards } from '../src/utils/xp-calculator.js'

async function main() {
  // 1) Backfill the per-enigma earned breakdown from xpEarned + current rewards.
  const progresses = await prisma.studentEnigmaProgress.findMany({ include: { enigma: true } })
  for (const p of progresses) {
    const xpReward = p.enigma.xpReward || 0
    const pct =
      xpReward > 0 ? Math.min(100, Math.max(0, Math.round((p.xpEarned / xpReward) * 100))) : 100
    const f = pct / 100
    await prisma.studentEnigmaProgress.update({
      where: { id: p.id },
      data: {
        percentage: pct,
        coinsEarned: Math.round((p.enigma.coinReward || 0) * f),
        manaEarned: Math.round((p.enigma.manaReward || 0) * f),
      },
    })
  }

  // 2) Reconcile every enrollment from the records.
  const enrollments = await prisma.classEnrollment.findMany()
  for (const e of enrollments) {
    const eps = await prisma.studentEnigmaProgress.findMany({
      where: { studentId: e.studentId, enigma: { mission: { classId: e.classId } } },
    })
    let xp = eps.reduce((s, x) => s + x.xpEarned, 0)
    const coinsEarned = eps.reduce((s, x) => s + x.coinsEarned, 0)
    const manaEarned = eps.reduce((s, x) => s + x.manaEarned, 0)

    const completedMissions = await prisma.studentMissionProgress.findMany({
      where: { studentId: e.studentId, completedAt: { not: null }, mission: { classId: e.classId } },
      include: { mission: true },
    })
    for (const mp of completedMissions) {
      xp += getMissionCompletionRewards(mp.mission.rarity as any).xp
    }

    const spentCoins = await prisma.shopPurchase.aggregate({
      where: { studentId: e.studentId, classId: e.classId },
      _sum: { price: true },
    })
    const spentMana = await prisma.shopItemUse.aggregate({
      where: { studentId: e.studentId, classId: e.classId },
      _sum: { manaCost: true },
    })

    const finalXp = Math.max(0, xp)
    const coins = Math.max(0, coinsEarned - (spentCoins._sum.price || 0))
    const mana = Math.max(0, manaEarned - (spentMana._sum.manaCost || 0))
    const level = getLevelFromXP(finalXp)

    await prisma.classEnrollment.update({
      where: { id: e.id },
      data: { xp: finalXp, coins, mana, level },
    })
    console.log(
      `reconciled student=${e.studentId} class=${e.classId} → xp=${finalXp} coins=${coins} mana=${mana} level=${level}`
    )
  }

  console.log('reconcile done')
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err)
    process.exit(1)
  })
