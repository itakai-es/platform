import { PrismaClient } from '../src/generated/prisma/client.js'
import { PrismaPg } from '@prisma/adapter-pg'
import { Pool } from 'pg'
import bcrypt from 'bcryptjs'
import 'dotenv/config'
import { SYSTEM_BADGES } from './system-badges.js'

const pool = new Pool({ connectionString: process.env.DATABASE_URL })
const adapter = new PrismaPg(pool)
const prisma = new PrismaClient({ adapter })

async function main() {
  console.log('🌱 Starting database seed...\n')

  // 1. Create users (2 per role, password = email)
  console.log('Creating users...')

  const users = [
    { email: 'sofia.garcia@itakai.es', name: 'Sofía García Pérez', role: 'student' as const },
    { email: 'miguel.lopez@itakai.es', name: 'Miguel López Ruiz', role: 'student' as const },
    { email: 'elena.sanchez@itakai.es', name: 'Elena Sánchez Torres', role: 'teacher' as const },
    { email: 'antonio.garcia@itakai.es', name: 'Antonio García Ruiz', role: 'teacher' as const },
    { email: 'admin@itakai.es', name: 'Admin Principal', role: 'admin' as const },
    { email: 'soporte@itakai.es', name: 'Admin Secundario', role: 'admin' as const },
  ]

  for (const u of users) {
    const passwordHash = await bcrypt.hash(u.email, 10)
    await prisma.user.upsert({
      where: { email: u.email },
      update: { passwordHash },
      create: {
        email: u.email,
        passwordHash,
        name: u.name,
        role: u.role,
        isOnboarded: true,
      },
    })
  }
  console.log(`  ✅ ${users.length} users created (2 per role)`)

  // 2. Create system badges (teacherId = null, auto-awarded)
  console.log('Creating system badges...')

  const systemBadges = SYSTEM_BADGES

  for (const badge of systemBadges) {
    const existing = await prisma.badge.findFirst({
      where: { name: badge.name, teacherId: null },
    })
    if (existing) {
      await prisma.badge.update({ where: { id: existing.id }, data: badge })
    } else {
      await prisma.badge.create({ data: badge })
    }
  }
  console.log(`  ✅ ${systemBadges.length} system badges created`)

  console.log('\n✨ Seed completed!\n')
  console.log('Users (password = email):')
  for (const u of users) {
    console.log(`  ${u.role.padEnd(7)} → ${u.email}`)
  }
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
