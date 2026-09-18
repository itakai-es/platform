import { describe, it, expect } from 'vitest'
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join, relative, sep } from 'node:path'
import { fileURLToPath } from 'node:url'

/**
 * Que nadie decida el acceso a una clase mirando quién es su propietario.
 *
 * Una clase tiene varios profesores, cada uno con su nivel, y lo que puede hacer
 * cada cual lo decide la capa central (`src/utils/class-access.ts`):
 * `assertClassAccess` y sus variantes por recurso, `assertClassMember`,
 * `accessibleClassesWhere` para los listados. `Class.teacherId` sigue existiendo
 * y nombra al propietario, pero comparar con él o filtrar por él deja fuera al
 * resto del profesorado.
 *
 * El test lee el código de `src/` (sin `generated`) y cuenta cada `teacherId`
 * por fichero. Cada aparición tiene que estar en la lista de abajo, con su
 * motivo; una nueva, o una de más en un fichero, hace fallar el test. Si sobra
 * alguna (se ha quitado un uso), también falla, para que la lista no se quede
 * con huecos que tapen uno nuevo.
 *
 * Busca también las formas más directas de llegar al propietario por otro
 * camino (la relación `teacher`, la inversa `teacherClasses`, la columna
 * `teacher_id` en SQL escrito a mano) y la matrícula leída directamente como
 * permiso: quién actúa como alumno en una clase también lo decide la capa
 * central (`getStudentEnrollment`, `studentEnrollmentsWhere`), que descarta la
 * vista previa de quien ya no imparte la clase.
 *
 * No es infalible: busca nombres, no entiende el código, y la cuenta es por
 * fichero, no por uso. Lo que de verdad fija quién puede qué es la matriz de
 * rutas (`tests/routes/class-routes.matrix.db.test.ts`), con el propietario, el
 * profesorado añadido con cada nivel, otro profesor y el alumnado.
 */

const SRC = fileURLToPath(new URL('../../src/', import.meta.url))

interface Allowed {
  count: number
  reason: string
}

/** Apariciones permitidas de `teacherId`, por fichero relativo a `src/`. */
const ALLOWED_TEACHER_ID: Record<string, Allowed> = {
  'utils/class-owner.ts': {
    count: 3,
    reason:
      'createClassWithOwner escribe el propietario en Class.teacherId a la vez que su fila de profesorado (el tipo lo deja fuera de los datos de entrada y un comentario lo explica)',
  },
  'utils/badge-access.ts': {
    count: 3,
    reason:
      'Badge.teacherId es el autor de la insignia: las sueltas son personales, las del sistema no tienen autor y el autor puede llevarse la suya a otra clase donde edita',
  },
  'utils/system-badges.ts': {
    count: 1,
    reason: 'insignias del sistema: las que no tienen autor (Badge.teacherId nulo)',
  },
  'modules/students/students.service.ts': {
    count: 1,
    reason:
      'insignias del sistema que ve el alumno: las que no tienen autor (Badge.teacherId nulo)',
  },
  'modules/behaviors/behaviors.service.ts': {
    count: 1,
    reason:
      'BehaviorApplication.teacherId guarda quién aplicó el comportamiento (autoría, no acceso)',
  },
  'modules/profile/profile.service.ts': {
    count: 1,
    reason:
      'exportación de datos del usuario: el propietario de cada clase en la que está matriculado',
  },
  'modules/teachers/teachers.service.ts': {
    count: 6,
    reason:
      'plantillas publicadas (isOwn marca las del propietario, 3), insignias del sistema en la biblioteca (2) y autor de una insignia nueva (1)',
  },
}

/**
 * Otras formas de llegar al propietario que se saltarían la cuenta de arriba: el
 * filtro por la relación (`teacher: { id … }`, `teacher: { is … }`,
 * `teacher: { AND … }`), la comparación con su id (`cls.teacher.id`,
 * `cls.teacher?.id`) y la columna en SQL escrito a mano. No hay ninguna permitida.
 */
const OWNER_PATTERNS: Array<{ name: string; pattern: RegExp }> = [
  { name: 'filtro por la relación', pattern: /\bteacher\s*:\s*\{\s*(id|is|isNot|AND|OR|NOT)\b/g },
  { name: 'id del propietario', pattern: /\.teacher\??\.id\b/g },
  { name: 'columna en SQL', pattern: /\bteacher_id\b/g },
]

/** Apariciones permitidas de la relación inversa `User.teacherClasses` (clases de las que es propietario). */
const ALLOWED_TEACHER_CLASSES: Record<string, Allowed> = {
  'modules/profile/profile.service.ts': {
    count: 2,
    reason: 'exportación de datos del usuario: las clases de las que es propietario',
  },
  'modules/admin/admin.routes.ts': {
    count: 2,
    reason: 'panel de administración: cuántas clases tiene cada profesor como propietario',
  },
}

/**
 * Matrícula de un usuario en una clase leída directamente (`classEnrollment.find…`
 * por `studentId_classId`). Como permiso para actuar como alumno no vale: para
 * eso está `getStudentEnrollment`. Las que quedan leen el monedero o el perfil
 * del alumno cuando el acceso ya está comprobado, o buscan al alumno sobre el
 * que actúa el profesorado.
 */
const ENROLLMENT_LOOKUP =
  /\bclassEnrollment\.find(?:Unique|First)(?:OrThrow)?\(\s*\{\s*where\s*:\s*\{\s*studentId_classId\b/g

const ALLOWED_ENROLLMENT_LOOKUP: Record<string, Allowed> = {
  'utils/class-access.ts': {
    count: 1,
    reason:
      'getClassMembership: la capa central, que decide con qué matrícula se actúa como alumno',
  },
  'utils/enrollment-xp.ts': {
    count: 1,
    reason: 'syncEnrollmentLevel recalcula el nivel de una matrícula; no decide acceso',
  },
  'modules/students/students.service.ts': {
    count: 8,
    reason:
      'monedero y perfil del alumno en rutas /students/classes/:classId, detrás de requireStudentEnrollment (7), y joinClass, que mira si ya estaba matriculado (1)',
  },
  'modules/shop/shop.service.ts': {
    count: 4,
    reason:
      'monedero del alumno en la tienda, en rutas /students/classes/:classId detrás de requireStudentEnrollment',
  },
  'modules/behaviors/behaviors.service.ts': {
    count: 1,
    reason: 'alumno al que se aplica el comportamiento, con behavior.apply ya comprobado',
  },
  'modules/teachers/teachers.service.ts': {
    count: 1,
    reason: 'alumno cuyo avatar se genera, con student.avatar ya comprobado',
  },
  'modules/teachers/class-students.service.ts': {
    count: 1,
    reason: 'alumno de la clase sobre el que actúa la administración, con el acceso ya comprobado',
  },
  'modules/submissions/submissions.service.ts': {
    count: 1,
    reason: 'monedero del alumno cuya entrega se aprueba, con submission.approve ya comprobado',
  },
  'modules/admin/admin.routes.ts': {
    count: 1,
    reason:
      'administración de la instancia: al cambiar la clase de origen de una cuenta, mira si ya estaba matriculada',
  },
}

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap(entry => {
    const path = join(dir, entry)
    if (statSync(path).isDirectory()) return entry === 'generated' ? [] : sourceFiles(path)
    return path.endsWith('.ts') ? [path] : []
  })
}

/** Líneas (1…n) donde aparece `pattern` en `source`. */
function matchLines(source: string, pattern: RegExp): number[] {
  const lines: number[] = []
  for (const match of source.matchAll(pattern)) {
    lines.push(source.slice(0, match.index).split('\n').length)
  }
  return lines
}

/** Igual que `matchLines`, sin lo que cae en un comentario: tras `//` o en una línea que empieza por `*`. */
function codeMatchLines(source: string, pattern: RegExp): number[] {
  const text = source.split('\n')
  const lines: number[] = []
  for (const match of source.matchAll(pattern)) {
    const before = source.slice(0, match.index)
    const line = before.split('\n').length
    const head = before.slice(before.lastIndexOf('\n') + 1)
    const trimmed = text[line - 1].trimStart()
    const inComment = head.includes('//') || trimmed.startsWith('*') || trimmed.startsWith('/*')
    if (!inComment) lines.push(line)
  }
  return lines
}

const files = sourceFiles(SRC).map(path => ({
  file: relative(SRC, path).split(sep).join('/'),
  source: readFileSync(path, 'utf8'),
}))

/**
 * Compara, fichero a fichero, las apariciones de `pattern` con la lista: una
 * nueva, una de más o una entrada que sobra son un problema.
 */
function checkAllowList(
  label: string,
  pattern: RegExp,
  allowedByFile: Record<string, Allowed>
): string[] {
  const problems: string[] = []
  const seen = new Set<string>()

  for (const { file, source } of files) {
    const lines = matchLines(source, pattern)
    if (lines.length === 0) continue
    seen.add(file)
    const allowed = allowedByFile[file]
    const where = `${file}:${lines.join(',')}`
    if (!allowed) {
      problems.push(`${where} — ${label} en un fichero que no está en la lista`)
    } else if (lines.length > allowed.count) {
      problems.push(
        `${where} — ${lines.length} apariciones y la lista admite ${allowed.count} (${allowed.reason})`
      )
    } else if (lines.length < allowed.count) {
      problems.push(
        `${where} — quedan ${lines.length} y la lista admite ${allowed.count}: baja el número en la lista`
      )
    }
  }
  for (const file of Object.keys(allowedByFile)) {
    if (!seen.has(file)) {
      problems.push(`${file} — ya no tiene ${label}: quítalo de la lista`)
    }
  }
  return problems
}

const EXPLANATION =
  'El acceso a una clase y a sus recursos se decide en la capa central (src/utils/class-access.ts): ' +
  'assertClassAccess o su variante por recurso para una clase concreta, accessibleClassesWhere para los listados. ' +
  'Class.teacherId solo nombra al propietario: no sirve para autorizar. Si el uso nuevo no es de acceso ' +
  '(escribir el propietario, mostrar su nombre, autor de una insignia…), añádelo a la lista de ' +
  'tests/guards/no-owner-checks.test.ts con su motivo.'

const ENROLLMENT_EXPLANATION =
  'Quién actúa como alumno en una clase lo decide la capa central (src/utils/class-access.ts): ' +
  'getStudentEnrollment para una clase, studentEnrollmentsWhere para los listados, o requireStudentEnrollment ' +
  'en la ruta. Leer la matrícula directamente deja entrar la vista previa de quien ya no imparte la clase. ' +
  'Si la lectura no decide el acceso (el monedero tras comprobarlo, el alumno sobre el que actúa el profesorado), ' +
  'añádela a la lista de tests/guards/no-owner-checks.test.ts con su motivo.'

describe('sin comprobaciones de propietario fuera de la capa central', () => {
  it('se leen los ficheros de src/', () => {
    expect(files.length).toBeGreaterThan(20)
    expect(files.some(f => f.file === 'utils/class-access.ts')).toBe(true)
  })

  it('cada teacherId de src/ está en la lista, con su motivo', () => {
    const problems = checkAllowList('teacherId', /\bteacherId\b/g, ALLOWED_TEACHER_ID)
    expect(problems, `${problems.join('\n')}\n\n${EXPLANATION}`).toEqual([])
  })

  it('ningún otro camino hasta el propietario: su relación, su id o su columna', () => {
    const problems = OWNER_PATTERNS.flatMap(({ name, pattern }) =>
      files.flatMap(({ file, source }) => {
        const lines = codeMatchLines(source, pattern)
        return lines.length ? [`${file}:${lines.join(',')} — ${name}`] : []
      })
    )
    expect(problems, `${problems.join('\n')}\n\n${EXPLANATION}`).toEqual([])
  })

  it('cada teacherClasses de src/ está en la lista, con su motivo', () => {
    const problems = checkAllowList(
      'teacherClasses',
      /\bteacherClasses\b/g,
      ALLOWED_TEACHER_CLASSES
    )
    expect(problems, `${problems.join('\n')}\n\n${EXPLANATION}`).toEqual([])
  })

  it('ninguna matrícula leída como permiso fuera de la capa central', () => {
    const problems = checkAllowList(
      'lectura directa de la matrícula',
      ENROLLMENT_LOOKUP,
      ALLOWED_ENROLLMENT_LOOKUP
    )
    expect(problems, `${problems.join('\n')}\n\n${ENROLLMENT_EXPLANATION}`).toEqual([])
  })

  it('las formas que se buscan se reconocen', () => {
    const owner = (code: string) =>
      OWNER_PATTERNS.some(({ pattern }) => codeMatchLines(code, pattern).length > 0)
    expect(owner('if (cls.teacher.id !== userId) throw x')).toBe(true)
    expect(owner('const mine = cls.teacher?.id === userId')).toBe(true)
    expect(owner('where: { teacher: { AND: { id: userId } } }')).toBe(true)
    expect(owner('where: { class: { teacher: { id: userId } } }')).toBe(true)
    expect(owner('await tx.$queryRaw`SELECT 1 FROM classes WHERE teacher_id = ${id}`')).toBe(true)
    expect(owner('// las del sistema tienen teacher_id nulo')).toBe(false)
    expect(owner(' * System badges have `teacher_id = NULL`')).toBe(false)

    const lookup = (code: string) => matchLines(code, ENROLLMENT_LOOKUP).length > 0
    expect(
      lookup(
        'await prisma.classEnrollment.findUnique({\n  where: { studentId_classId: { studentId, classId } },\n})'
      )
    ).toBe(true)
    expect(lookup('tx.classEnrollment.findFirstOrThrow({ where: { studentId_classId: x } })')).toBe(
      true
    )
    expect(lookup('prisma.classEnrollment.update({ where: { studentId_classId: x } })')).toBe(false)
  })

  it('cada entrada de las listas explica su motivo', () => {
    for (const list of [ALLOWED_TEACHER_ID, ALLOWED_TEACHER_CLASSES, ALLOWED_ENROLLMENT_LOOKUP]) {
      for (const [file, allowed] of Object.entries(list)) {
        expect(allowed.count, file).toBeGreaterThan(0)
        expect(allowed.reason.length, file).toBeGreaterThan(20)
      }
    }
  })
})
