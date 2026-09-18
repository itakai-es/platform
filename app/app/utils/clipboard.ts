/**
 * Copia un texto al portapapeles. Si la API moderna no existe (fuera de HTTPS)
 * o rechaza la escritura (permiso denegado, iframe, sin foco), prueba con el
 * método antiguo; si tampoco lo consigue, lanza un error para que quien copia
 * pueda avisar.
 */
export async function copyText(text: string): Promise<void> {
  if (navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text)
      return
    } catch {
      // Sigue con el método antiguo.
    }
  }
  // El textarea oculto se lleva el foco: se devuelve a donde estaba para que
  // quien usa el teclado no pierda su sitio.
  const previous = document.activeElement as HTMLElement | null
  const textArea = document.createElement('textarea')
  textArea.value = text
  textArea.setAttribute('readonly', '')
  textArea.style.position = 'fixed'
  textArea.style.opacity = '0'
  document.body.appendChild(textArea)
  let copied = false
  try {
    textArea.select()
    copied = document.execCommand('copy')
  } finally {
    document.body.removeChild(textArea)
    previous?.focus()
  }
  if (!copied) throw new Error('copy failed')
}
