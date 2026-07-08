import { PrismaClient } from '../src/generated/prisma/client.js'
import { PrismaPg } from '@prisma/adapter-pg'
import { Pool } from 'pg'
import bcrypt from 'bcryptjs'
import { randomBytes } from 'crypto'
import 'dotenv/config'
import { SYSTEM_BADGES } from './system-badges.js'

/**
 * Bootstrap para AUTO-HOSPEDAJE: crea las insignias del sistema y UN administrador
 * a partir de `ADMIN_EMAIL` + `ADMIN_PASSWORD` (sin usuarios de demostración ni
 * contraseñas por defecto). Idempotente: si el admin ya existe, no toca su
 * contraseña.
 *
 * Uso: ADMIN_EMAIL=… ADMIN_PASSWORD=… pnpm db:bootstrap
 */

const pool = new Pool({ connectionString: process.env.DATABASE_URL })
const adapter = new PrismaPg(pool)
const prisma = new PrismaClient({ adapter })

async function main() {
  console.log('🌱 Bootstrap de la instancia...\n')

  // 1. Insignias del sistema (idempotente)
  for (const badge of SYSTEM_BADGES) {
    const existing = await prisma.badge.findFirst({ where: { name: badge.name, teacherId: null } })
    if (existing) {
      await prisma.badge.update({ where: { id: existing.id }, data: badge })
    } else {
      await prisma.badge.create({ data: badge })
    }
  }
  console.log(`  ✅ ${SYSTEM_BADGES.length} insignias del sistema`)

  // 2. Administrador: se crea SOLO si no hay ninguno. Email y contraseña son
  // opcionales — por defecto `admin@itakai.local` y una contraseña generada que
  // se imprime aquí. Cualquiera se puede fijar con ADMIN_EMAIL / ADMIN_PASSWORD.
  const anyAdmin = await prisma.user.findFirst({ where: { role: 'admin' } })
  if (anyAdmin) {
    console.log(`  ℹ️  Ya existe un administrador (${anyAdmin.email}) — no se crea otro.`)
  } else {
    const email = process.env.ADMIN_EMAIL || 'admin@itakai.local'
    const provided = process.env.ADMIN_PASSWORD
    const password =
      provided || randomBytes(9).toString('base64').replace(/[^a-zA-Z0-9]/g, '').slice(0, 12)

    await prisma.user.create({
      data: {
        email,
        name: 'Administrador',
        role: 'admin',
        isOnboarded: true,
        passwordHash: await bcrypt.hash(password, 10),
      },
    })

    console.log('\n  ══════════════════════════════════════════════════')
    console.log('  ✅ Administrador creado — entra con estas credenciales:')
    console.log(`       Email:      ${email}`)
    console.log(
      `       Contraseña: ${provided ? '(la que definiste en ADMIN_PASSWORD)' : password + '   ← generada, apúntala'}`
    )
    console.log('  ══════════════════════════════════════════════════')
  }

  console.log('\n✨ Bootstrap completado.')
}

main()
  .catch((e) => {
    console.error('❌ Bootstrap falló:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
