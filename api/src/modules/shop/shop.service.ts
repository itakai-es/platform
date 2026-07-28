import { prisma } from '../../config/database.js'
import { resolveClassSettings } from '../../utils/class-settings.js'
import type { Prisma } from '../../generated/prisma/client.js'

/** Load + resolve the per-class feature settings (used to guard mutations). */
async function getClassSettings(
  classId: string,
  client: Prisma.TransactionClient | typeof prisma = prisma
) {
  const cls = await client.class.findUnique({ where: { id: classId }, select: { settings: true } })
  return resolveClassSettings(cls?.settings)
}

/**
 * Per-class shop. Students spend their per-class `coins` balance (1 coin = 1 XP,
 * earned alongside XP via applyXpDelta) on teacher-created reward items.
 *
 * Purchases are instant (no approval flow): buying decrements the student's coins
 * and records a ShopPurchase. The teacher's "recent redemptions" is a read-only log.
 */

// Catálogo por defecto que se siembra en cada clase nueva. Mezcla equilibrada
// para que el profesor vea desde el primer momento los tres conceptos:
// recompensa de un uso, recompensa ilimitada (privilegio permanente) y poder
// (se compra con monedas y se usa gastando maná). El profesor puede editarlos
// o borrarlos; son artículos reales por clase, no globales.
const DEFAULT_SHOP_ITEMS: {
  name: string
  description: string
  price: number
  kind?: string
  manaCost?: number
  usage?: string
  lifeRestore?: number
}[] = [
  // ── Recompensas (se canjean con monedas) ──
  {
    name: 'Pista de examen',
    description: 'Canjea una pista para una pregunta del próximo examen.',
    price: 150,
  },
  {
    name: 'Saltar una tarea',
    description: 'Salta una tarea sin penalización (no aplica a exámenes).',
    price: 500,
  },
  {
    name: 'Prórroga de 1 día',
    description: 'Amplía 24 h el plazo de una entrega.',
    price: 400,
  },
  {
    name: 'Poción de vida',
    description: 'Recupera 50 puntos de vida al canjearla.',
    price: 300,
    lifeRestore: 50,
  },
  {
    name: 'Asiento libre',
    description: 'Siéntate donde quieras durante el resto del curso.',
    price: 800,
    usage: 'unlimited',
  },
  // ── Poderes (se compran con monedas y se usan gastando maná) ──
  {
    name: 'Pista mágica',
    description: 'Pídele al profe una pista extra cuando la necesites.',
    price: 300,
    kind: 'power',
    manaCost: 20,
  },
  {
    name: 'Repetir entrega',
    description: 'Vuelve a entregar un enigma ya corregido.',
    price: 500,
    kind: 'power',
    manaCost: 40,
  },
]

/** Crea los artículos por defecto para una clase (idempotente: no hace nada si ya tiene artículos). */
export async function seedDefaultShopItems(classId: string): Promise<number> {
  const existing = await prisma.shopItem.count({ where: { classId } })
  if (existing > 0) return 0
  const result = await prisma.shopItem.createMany({
    data: DEFAULT_SHOP_ITEMS.map((item) => ({ ...item, classId })),
  })
  return result.count
}

interface ItemInput {
  name: string
  description?: string
  price: number
  active?: boolean
  kind?: string
  manaCost?: number
  usage?: string
  lifeRestore?: number
}

function formatItem(item: {
  id: string
  name: string
  description: string
  price: number
  active: boolean
  kind: string
  manaCost: number
  usage: string
  lifeRestore: number
}) {
  return {
    id: item.id,
    name: item.name,
    description: item.description,
    price: item.price,
    active: item.active,
    kind: item.kind,
    manaCost: item.manaCost,
    usage: item.usage,
    lifeRestore: item.lifeRestore,
  }
}

/** Normalise the type-related fields so rewards never carry a mana cost and
 *  powers never carry a usage mode (they are always reusable). */
function normalizeItemType(data: { kind?: string; manaCost?: number; usage?: string }) {
  const kind = data.kind === 'power' ? 'power' : 'reward'
  return {
    kind,
    manaCost: kind === 'power' ? Math.max(0, Math.round(data.manaCost ?? 0)) : 0,
    usage: kind === 'reward' && data.usage === 'unlimited' ? 'unlimited' : 'single',
  }
}

export class ShopService {
  // ==================== STUDENT ====================

  /** Student view: their coin balance, the active items, and their own purchase history. */
  async getStudentShop(studentId: string, classId: string) {
    const enrollment = await prisma.classEnrollment.findUnique({
      where: { studentId_classId: { studentId, classId } },
      select: { coins: true, mana: true },
    })
    if (!enrollment) throw new Error('No estás inscrito en esta clase')

    const [items, purchases, uses, ownedRows] = await Promise.all([
      prisma.shopItem.findMany({
        where: { classId, active: true },
        orderBy: { createdAt: 'asc' },
      }),
      prisma.shopPurchase.findMany({
        where: { classId, studentId },
        orderBy: { createdAt: 'desc' },
        take: 50,
      }),
      // The student's own power uses (for their history).
      prisma.shopItemUse.findMany({
        where: { classId, studentId },
        orderBy: { createdAt: 'desc' },
        take: 50,
      }),
      // Distinct items the student has bought (used to flag powers/unlimited rewards as owned).
      prisma.shopPurchase.findMany({
        where: { classId, studentId, itemId: { not: null } },
        select: { itemId: true },
        distinct: ['itemId'],
      }),
    ])

    // Unlimited rewards stay "owned" forever once bought (no stock).
    const purchasedIds = new Set(ownedRows.map((r) => r.itemId))
    const ownedItemIds: string[] = items
      .filter((i) => i.kind === 'reward' && i.usage === 'unlimited' && purchasedIds.has(i.id))
      .map((i) => i.id)

    // Both single-use rewards AND powers track stock as (purchases − uses): cada
    // compra añade una "carga" y cada uso/canjeo la consume. Si > 0, aparece en
    // "Mis artículos" con su contador.
    const singleUseStock: Record<string, number> = {}
    const stockableIds = items
      .filter((i) => i.kind === 'power' || (i.kind === 'reward' && i.usage === 'single'))
      .map((i) => i.id)
    if (stockableIds.length > 0) {
      const [purchaseCounts, useCounts] = await Promise.all([
        prisma.shopPurchase.groupBy({
          by: ['itemId'],
          where: { classId, studentId, itemId: { in: stockableIds } },
          _count: { _all: true },
        }),
        prisma.shopItemUse.groupBy({
          by: ['itemId'],
          where: { classId, studentId, itemId: { in: stockableIds } },
          _count: { _all: true },
        }),
      ])
      const purchaseByItem = new Map(purchaseCounts.map((r) => [r.itemId, r._count._all]))
      const useByItem = new Map(useCounts.map((r) => [r.itemId, r._count._all]))
      for (const id of stockableIds) {
        const stock = (purchaseByItem.get(id) ?? 0) - (useByItem.get(id) ?? 0)
        if (stock > 0) {
          ownedItemIds.push(id)
          singleUseStock[id] = stock
        }
      }
    }

    return {
      balance: enrollment.coins,
      mana: enrollment.mana,
      ownedItemIds,
      singleUseStock,
      items: items.map(formatItem),
      purchases: purchases.map((p) => ({
        id: p.id,
        itemId: p.itemId,
        itemName: p.itemName,
        price: p.price,
        date: p.createdAt.toISOString(),
      })),
      uses: uses.map((u) => ({
        id: u.id,
        itemId: u.itemId,
        itemName: u.itemName,
        manaCost: u.manaCost,
        date: u.createdAt.toISOString(),
      })),
    }
  }

  /** Student uses a power they own, spending mana. Records the use so the teacher sees it. */
  async usePower(studentId: string, classId: string, itemId: string) {
    return prisma.$transaction(async (tx) => {
      const settings = await getClassSettings(classId, tx)
      if (!settings.shop || !settings.mana)
        throw new Error('Los poderes están desactivados en esta clase')

      const enrollment = await tx.classEnrollment.findUnique({
        where: { studentId_classId: { studentId, classId } },
        select: { mana: true, avatarUrl: true, nickname: true },
      })
      if (!enrollment) throw new Error('No estás inscrito en esta clase')

      const item = await tx.shopItem.findFirst({ where: { id: itemId, classId } })
      if (!item) throw new Error('El poder ya no existe')
      if (item.kind !== 'power') throw new Error('Este artículo no es un poder')

      // Cada compra del poder añade una carga; cada uso consume una. Sin cargas no se puede usar.
      const [purchaseCount, useCount] = await Promise.all([
        tx.shopPurchase.count({ where: { classId, studentId, itemId } }),
        tx.shopItemUse.count({ where: { classId, studentId, itemId } }),
      ])
      if (purchaseCount - useCount <= 0) throw new Error('Ya no te quedan cargas de este poder')
      if (enrollment.mana < item.manaCost) throw new Error('No tienes maná suficiente')

      const updated = await tx.classEnrollment.update({
        where: { studentId_classId: { studentId, classId } },
        data: {
          mana: { decrement: item.manaCost },
          // Only restore lives if the class still has the lives mechanic enabled.
          ...(item.lifeRestore > 0 && settings.lives ? { lives: { increment: item.lifeRestore } } : {}),
        },
        select: { mana: true, lives: true },
      })

      const use = await tx.shopItemUse.create({
        data: { classId, itemId: item.id, studentId, itemName: item.name, manaCost: item.manaCost },
      })

      // Recent-activity entry visible in the student's class feed.
      await tx.activity.create({
        data: {
          userId: studentId,
          type: 'shop_item_used',
          description: `Usó "${item.name}"`,
          classId,
          avatar: enrollment.avatarUrl,
          username: enrollment.nickname || 'Estudiante',
          source: item.name,
          metadata: {
            itemId: item.id,
            itemName: item.name,
            manaCost: item.manaCost,
            lifeRestore: item.lifeRestore,
          },
        },
      })

      return {
        mana: updated.mana,
        lives: updated.lives,
        use: {
          id: use.id,
          itemId: use.itemId,
          itemName: use.itemName,
          manaCost: use.manaCost,
          date: use.createdAt.toISOString(),
        },
      }
    })
  }

  /** Student buys an item. Atomic: checks balance, decrements coins, records the purchase. */
  async purchase(studentId: string, classId: string, itemId: string) {
    return prisma.$transaction(async (tx) => {
      const settings = await getClassSettings(classId, tx)
      if (!settings.shop) throw new Error('La tienda está desactivada en esta clase')

      const enrollment = await tx.classEnrollment.findUnique({
        where: { studentId_classId: { studentId, classId } },
        select: { coins: true, avatarUrl: true, nickname: true },
      })
      if (!enrollment) throw new Error('No estás inscrito en esta clase')

      const item = await tx.shopItem.findFirst({ where: { id: itemId, classId } })
      if (!item) throw new Error('El artículo ya no existe')
      if (!item.active) throw new Error('Este artículo no está disponible')
      if (item.kind === 'power' && !settings.mana)
        throw new Error('Los poderes están desactivados en esta clase')
      // Unlimited rewards son permiso vitalicio: no se pueden comprar más de una vez.
      // (Single rewards y powers SÍ se acumulan: cada compra añade una carga.)
      if (item.kind === 'reward' && item.usage === 'unlimited') {
        const already = await tx.shopPurchase.findFirst({
          where: { classId, studentId, itemId },
          select: { id: true },
        })
        if (already) throw new Error('Ya tienes esta recompensa')
      }
      if (enrollment.coins < item.price) throw new Error('No tienes monedas suficientes')

      const updated = await tx.classEnrollment.update({
        where: { studentId_classId: { studentId, classId } },
        data: { coins: { decrement: item.price } },
        select: { coins: true },
      })

      const purchase = await tx.shopPurchase.create({
        data: {
          classId,
          itemId: item.id,
          studentId,
          itemName: item.name,
          price: item.price,
        },
      })

      // Recent-activity entry visible in the student's class feed.
      await tx.activity.create({
        data: {
          userId: studentId,
          type: 'shop_purchased',
          description: `Compró "${item.name}" en la tienda`,
          classId,
          avatar: enrollment.avatarUrl,
          username: enrollment.nickname || 'Estudiante',
          source: item.name,
          metadata: {
            itemId: item.id,
            itemName: item.name,
            price: item.price,
            kind: item.kind,
          },
        },
      })

      return {
        balance: updated.coins,
        purchase: {
          id: purchase.id,
          itemId: purchase.itemId,
          itemName: purchase.itemName,
          price: purchase.price,
          date: purchase.createdAt.toISOString(),
        },
      }
    })
  }

  /** Student redeems one unit of a single-use reward previously bought. Records a use
   *  (manaCost=0) so it disappears from "Mis artículos" but stays in history. */
  async redeemReward(studentId: string, classId: string, itemId: string) {
    return prisma.$transaction(async (tx) => {
      const settings = await getClassSettings(classId, tx)
      if (!settings.shop) throw new Error('La tienda está desactivada en esta clase')

      const item = await tx.shopItem.findFirst({ where: { id: itemId, classId } })
      if (!item) throw new Error('El artículo ya no existe')
      if (item.kind !== 'reward' || item.usage !== 'single') {
        throw new Error('Este artículo no se canjea de esta forma')
      }

      const [purchaseCount, useCount] = await Promise.all([
        tx.shopPurchase.count({ where: { classId, studentId, itemId } }),
        tx.shopItemUse.count({ where: { classId, studentId, itemId } }),
      ])
      if (purchaseCount - useCount <= 0) throw new Error('No tienes este artículo para canjear')

      const use = await tx.shopItemUse.create({
        data: { classId, itemId: item.id, studentId, itemName: item.name, manaCost: 0 },
      })

      const profile = await tx.classEnrollment.findUnique({
        where: { studentId_classId: { studentId, classId } },
        select: { avatarUrl: true, nickname: true },
      })

      // Recent-activity entry visible in the student's class feed.
      await tx.activity.create({
        data: {
          userId: studentId,
          type: 'shop_item_used',
          description: `Canjeó "${item.name}"`,
          classId,
          avatar: profile?.avatarUrl ?? null,
          username: profile?.nickname || 'Estudiante',
          source: item.name,
          metadata: {
            itemId: item.id,
            itemName: item.name,
            manaCost: 0,
            lifeRestore: item.lifeRestore,
          },
        },
      })

      let lives: number | undefined
      // Only restore lives if the class still has the lives mechanic enabled.
      if (item.lifeRestore > 0 && settings.lives) {
        const updated = await tx.classEnrollment.update({
          where: { studentId_classId: { studentId, classId } },
          data: { lives: { increment: item.lifeRestore } },
          select: { lives: true },
        })
        lives = updated.lives
      }

      return {
        use: {
          id: use.id,
          itemId: use.itemId,
          itemName: use.itemName,
          manaCost: use.manaCost,
          date: use.createdAt.toISOString(),
        },
        lives,
        lifeRestore: item.lifeRestore || 0,
        stillOwned: purchaseCount - useCount - 1 > 0,
      }
    })
  }

  // ==================== TEACHER ====================

  private async assertTeacherOwnsClass(teacherId: string, classId: string) {
    const cls = await prisma.class.findFirst({ where: { id: classId, teacherId }, select: { id: true } })
    if (!cls) throw new Error('No tienes permiso sobre esta clase')
  }

  /** Teacher view: all items (incl. hidden) + recent redemptions across students. */
  async getTeacherShop(teacherId: string, classId: string) {
    await this.assertTeacherOwnsClass(teacherId, classId)

    const [items, purchases, uses, enrollments] = await Promise.all([
      prisma.shopItem.findMany({ where: { classId }, orderBy: { createdAt: 'asc' } }),
      prisma.shopPurchase.findMany({
        where: { classId },
        orderBy: { createdAt: 'desc' },
        take: 50,
        include: {
          student: { select: { id: true, name: true } },
          item: { select: { kind: true } },
        },
      }),
      prisma.shopItemUse.findMany({
        where: { classId },
        orderBy: { createdAt: 'desc' },
        take: 50,
        include: {
          student: { select: { id: true, name: true } },
          item: { select: { kind: true } },
        },
      }),
      prisma.classEnrollment.findMany({
        where: { classId, isPreview: false },
        select: { studentId: true, nickname: true, avatarUrl: true },
      }),
    ])

    const nickname = new Map(enrollments.map((e) => [e.studentId, e.nickname]))
    const avatar = new Map(enrollments.map((e) => [e.studentId, e.avatarUrl]))

    return {
      items: items.map(formatItem),
      purchases: purchases.map((p) => ({
        id: p.id,
        itemId: p.itemId,
        itemName: p.itemName,
        price: p.price,
        // Tipo real del artículo (recompensa/poder) para pintar el icono correcto.
        // Si el artículo se borró, asumimos recompensa.
        kind: p.item?.kind === 'power' ? 'power' : 'reward',
        date: p.createdAt.toISOString(),
        studentId: p.studentId, // User id → enlace al perfil del alumno
        studentName: nickname.get(p.studentId) || p.student.name,
        studentAvatar: avatar.get(p.studentId) ?? null,
      })),
      uses: uses.map((u) => ({
        id: u.id,
        itemId: u.itemId,
        itemName: u.itemName,
        manaCost: u.manaCost,
        // Un "uso" puede ser un poder (gasta maná) o el canje de una recompensa de
        // un uso. Tipo real del artículo; si se borró, lo inferimos por el maná.
        kind: u.item?.kind === 'power' || (!u.item && u.manaCost > 0) ? 'power' : 'reward',
        date: u.createdAt.toISOString(),
        studentId: u.studentId, // User id → enlace al perfil del alumno
        studentName: nickname.get(u.studentId) || u.student.name,
        studentAvatar: avatar.get(u.studentId) ?? null,
      })),
    }
  }

  async createItem(teacherId: string, classId: string, data: ItemInput) {
    await this.assertTeacherOwnsClass(teacherId, classId)
    const item = await prisma.shopItem.create({
      data: {
        classId,
        name: data.name.trim(),
        description: data.description?.trim() ?? '',
        price: Math.max(0, Math.round(data.price)),
        active: data.active ?? true,
        lifeRestore: Math.max(0, Math.round(data.lifeRestore ?? 0)),
        ...normalizeItemType(data),
      },
    })
    return formatItem(item)
  }

  async updateItem(teacherId: string, classId: string, itemId: string, data: Partial<ItemInput>) {
    await this.assertTeacherOwnsClass(teacherId, classId)
    const existing = await prisma.shopItem.findFirst({ where: { id: itemId, classId }, select: { id: true } })
    if (!existing) throw new Error('El artículo no existe')

    const item = await prisma.shopItem.update({
      where: { id: itemId },
      data: {
        ...(data.name !== undefined ? { name: data.name.trim() } : {}),
        ...(data.description !== undefined ? { description: data.description.trim() } : {}),
        ...(data.price !== undefined ? { price: Math.max(0, Math.round(data.price)) } : {}),
        ...(data.active !== undefined ? { active: data.active } : {}),
        ...(data.lifeRestore !== undefined ? { lifeRestore: Math.max(0, Math.round(data.lifeRestore)) } : {}),
        // The teacher form always sends the type fields together; normalise them
        // so a reward can't keep a stale mana cost (or a power a stale usage mode).
        ...(data.kind !== undefined ? normalizeItemType(data) : {}),
      },
    })
    return formatItem(item)
  }

  async deleteItem(teacherId: string, classId: string, itemId: string) {
    await this.assertTeacherOwnsClass(teacherId, classId)
    const existing = await prisma.shopItem.findFirst({ where: { id: itemId, classId }, select: { id: true } })
    if (!existing) throw new Error('El artículo no existe')
    await prisma.shopItem.delete({ where: { id: itemId } })
    return { success: true }
  }
}

export const shopService = new ShopService()
