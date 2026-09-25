/**
 * Ficheros CSV generados en el navegador, pensados para abrirse en una hoja de
 * cálculo en español: separados por punto y coma, con saltos de línea de
 * Windows y con la marca de orden de bytes para que las tildes se lean bien.
 */

/**
 * Un campo de CSV, entre comillas si hace falta. Si empieza como una fórmula
 * (=, +, -, @), lleva delante un apóstrofo para que la hoja lo muestre como
 * texto en vez de calcularlo.
 */
export function csvField(value: string): string {
  const text = /^[=+\-@\t\r]/.test(value) ? `'${value}` : value
  return /[";\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text
}

/** El contenido de un CSV: una línea por fila, con cabecera si se pasa como primera fila. */
export function toCsv(rows: string[][]): string {
  const lines = rows.map(fields => fields.map(csvField).join(';'))
  return `\uFEFF${lines.join('\r\n')}\r\n`
}

/** Descarga un CSV generado aquí mismo: no pasa por el servidor. */
export function downloadCsv(content: string, fileName: string) {
  const url = URL.createObjectURL(new Blob([content], { type: 'text/csv;charset=utf-8' }))
  const link = document.createElement('a')
  link.href = url
  link.download = fileName
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}
