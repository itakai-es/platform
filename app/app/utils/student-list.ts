/**
 * Listas de alumnado para dar de alta de una vez: lo que se pega desde una hoja
 * de cálculo (una línea por alumno) o un CSV. Se lee todo en el navegador; a la
 * API solo llegan las filas ya separadas.
 *
 * Cada línea es un alumno: su nombre y, si se quiere elegir, su usuario en la
 * segunda columna. Al copiar dos columnas de una hoja de cálculo se separan con
 * un tabulador; en un CSV, con punto y coma (lo que guarda una hoja en español)
 * o con coma.
 */

import { toCsv } from '~/utils/csv'

export interface StudentListRow {
  name: string
  username?: string
}

/** Máximo de alumnos por lista: el mismo que acepta la API. */
export const STUDENT_LIST_MAX = 50

/** Campos de una línea separada por `separator`, respetando las comillas de CSV. */
function splitLine(line: string, separator: string): string[] {
  const fields: string[] = []
  let current = ''
  let quoted = false
  for (let i = 0; i < line.length; i++) {
    const char = line[i]
    if (quoted) {
      if (char === '"' && line[i + 1] === '"') {
        current += '"'
        i++
      } else if (char === '"') {
        quoted = false
      } else {
        current += char
      }
    } else if (char === '"' && current.trim() === '') {
      quoted = true
      current = ''
    } else if (char === separator) {
      fields.push(current)
      current = ''
    } else {
      current += char
    }
  }
  fields.push(current)
  return fields.map(field => field.trim())
}

/**
 * Separador de la lista. Un texto pegado solo se parte por tabuladores o por
 * punto y coma: «García, Ana» es un nombre, no dos columnas. Un fichero CSV
 * admite además la coma.
 */
function detectSeparator(lines: string[], fromFile: boolean): string | null {
  if (lines.some(line => line.includes('\t'))) return '\t'
  if (lines.some(line => line.includes(';'))) return ';'
  if (fromFile && lines.some(line => line.includes(','))) return ','
  return null
}

/** Para comparar cabeceras: sin tildes, sin mayúsculas y sin espacios alrededor. */
function plain(text: string): string {
  return text
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .trim()
    .toLowerCase()
}

/**
 * Filas de una lista pegada o de un CSV. Las líneas en blanco no cuentan. Si la
 * primera línea es una cabecera (su primera columna es una de `headerNames`),
 * se descarta.
 */
export function parseStudentList(
  text: string,
  options: { fromFile?: boolean; headerNames?: string[] } = {}
): StudentListRow[] {
  const lines = text
    .replace(/^\uFEFF/, '')
    .split(/\r\n|\n|\r/)
    .filter(line => line.trim() !== '')
  const separator = detectSeparator(lines, options.fromFile ?? false)

  const rows = lines
    .map(line => (separator ? splitLine(line, separator) : [line.trim()]))
    .filter(fields => fields.some(field => field !== ''))

  const headers = new Set((options.headerNames ?? []).map(plain))
  if (rows[0] && headers.has(plain(rows[0][0] ?? ''))) rows.shift()

  return rows.map(([name = '', username = '']) => ({
    name,
    ...(username ? { username } : {}),
  }))
}

/**
 * Plantilla CSV con cabecera y ejemplos, separada por punto y coma y lista para
 * abrirse en una hoja de cálculo.
 */
export function studentListTemplate(
  header: [string, string],
  examples: [string, string][]
): string {
  return toCsv([header, ...examples])
}
