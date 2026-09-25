import { describe, it, expect, vi } from 'vitest'
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createClassWithOwner } from '../../src/utils/class-owner.js'

/**
 * Toda clase nace con su propietario en el profesorado, en la misma
 * transacción. Se comprueba la función y, leyendo el código, que nadie crea
 * clases por otro camino.
 */

const SRC = fileURLToPath(new URL('../../src/', import.meta.url))

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap(entry => {
    const path = join(dir, entry)
    if (statSync(path).isDirectory()) return entry === 'generated' ? [] : sourceFiles(path)
    return path.endsWith('.ts') ? [path] : []
  })
}

describe('createClassWithOwner', () => {
  it('crea la clase y la fila de propietario con el mismo cliente de transacción', async () => {
    const order: string[] = []
    const tx = {
      class: {
        create: vi.fn().mockImplementation(async ({ data }) => {
          order.push('class')
          return { id: 'class-1', ...data }
        }),
      },
      classTeacher: {
        create: vi.fn().mockImplementation(async () => {
          order.push('owner')
        }),
      },
    }

    const cls = await createClassWithOwner(
      tx as any,
      { name: 'Redes', invitationCode: 'ABC123' },
      'teacher-1'
    )

    expect(cls).toMatchObject({ id: 'class-1', name: 'Redes', teacherId: 'teacher-1' })
    expect(tx.class.create).toHaveBeenCalledWith({
      data: { name: 'Redes', invitationCode: 'ABC123', teacherId: 'teacher-1' },
    })
    expect(tx.classTeacher.create).toHaveBeenCalledWith({
      data: {
        classId: 'class-1',
        userId: 'teacher-1',
        access: 'admin',
        profile: 'titular',
        isOwner: true,
      },
    })
    expect(order).toEqual(['class', 'owner'])
  })

  it('si falla la fila de propietario, el error sube y la transacción se deshace', async () => {
    const tx = {
      class: { create: vi.fn().mockResolvedValue({ id: 'class-1' }) },
      classTeacher: { create: vi.fn().mockRejectedValue(new Error('boom')) },
    }
    await expect(
      createClassWithOwner(tx as any, { name: 'Redes', invitationCode: 'ABC123' }, 'teacher-1')
    ).rejects.toThrow('boom')
  })
})

describe('sitios que crean clases', () => {
  const files = sourceFiles(SRC).map(path => ({
    path: path.slice(SRC.length),
    source: readFileSync(path, 'utf8'),
  }))

  it('solo class-owner.ts llama a class.create', () => {
    const creators = files
      .filter(f => /\.class\.(create|createMany|createManyAndReturn|upsert)\(/.test(f.source))
      .map(f => f.path)
    expect(creators).toEqual(['utils/class-owner.ts'])
  })

  it('crear clase, copiar clase y la herramienta del asistente pasan por createClassWithOwner', () => {
    const users = files.filter(f => /createClassWithOwner\(/.test(f.source)).map(f => f.path)
    expect(users.sort()).toEqual([
      'modules/ai/tools/teacher-tools.ts',
      'modules/teachers/teachers.service.ts',
      'utils/class-owner.ts',
    ])

    const teachers = files.find(f => f.path === 'modules/teachers/teachers.service.ts')!.source
    // Una llamada en createClass y otra en copyClass (duplicar e importar plantilla).
    expect(teachers.match(/createClassWithOwner\(/g)).toHaveLength(2)
    // Siempre dentro de una transacción: nunca con el cliente global.
    for (const f of files) expect(f.source).not.toMatch(/createClassWithOwner\(\s*prisma\b/)
  })
})
