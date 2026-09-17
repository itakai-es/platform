/**
 * Descarga y apertura de los ficheros con acceso restringido: las entregas del
 * alumnado y los documentos de misión que son un fichero subido.
 *
 * Esos ficheros no se sirven por su URL: se piden a la API, que comprueba quién
 * los pide. Hay dos maneras, y aquí se elige la que toca:
 *  - descargar con la sesión puesta y guardar el fichero (lo normal);
 *  - pedir un enlace temporal cuando hay que abrirlo en otra pestaña (un vídeo),
 *    porque ahí la petición la hace el navegador y no lleva la sesión.
 *
 * Los documentos que son un enlace externo se abren tal cual, como siempre.
 */

export interface ProtectedDocument {
  id: string
  title?: string
  name?: string
  type?: 'pdf' | 'video' | 'docx' | 'image' | 'link'
  /** true cuando el documento es un fichero guardado en la plataforma. */
  storedFile?: boolean
  /** Solo lo traen los documentos que son un enlace externo. */
  fileUrl?: string | null
  url?: string | null
  fileName?: string | null
}

export interface ProtectedSubmission {
  id: string
  fileName?: string | null
  hasFile?: boolean
}

export function useProtectedFiles() {
  const config = useRuntimeConfig()
  const toast = useToast()
  const { t } = useI18n()

  const apiUrl = (path: string) => `${config.public.apiBase}${path}`

  /** Mensaje según lo que haya contestado la API. */
  const reportError = (error: unknown) => {
    const status = (error as { response?: { status?: number }; status?: number })?.response?.status
    if (status === 401 || status === 403 || status === 404) {
      toast.error(t('common.toast.download_no_access'))
      return
    }
    toast.error(t('common.toast.download_error'))
  }

  /** Guarda el contenido descargado con el nombre original. */
  const saveBlob = (blob: Blob, fileName: string) => {
    const url = window.URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = fileName
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    // La dirección se suelta en el tic siguiente: algunos navegadores cancelan
    // la descarga si se retira mientras la están empezando.
    window.setTimeout(() => window.URL.revokeObjectURL(url), 0)
  }

  const downloadFromApi = async (path: string, fileName: string) => {
    const blob = await $fetch<Blob>(apiUrl(path), { responseType: 'blob' })
    saveBlob(blob, fileName)
  }

  /**
   * Abre el fichero en otra pestaña con un enlace temporal. La pestaña se abre
   * antes de pedirlo, dentro del clic, para que el navegador no la bloquee. Si
   * aun así no hay pestaña, se dice: si no, el clic no haría nada.
   */
  const openWithLink = async (path: string) => {
    const tab = window.open('', '_blank')
    try {
      const { url } = await $fetch<{ url: string }>(apiUrl(path), { method: 'POST' })
      if (tab) {
        tab.location.href = apiUrl(url)
        return true
      }
      if (window.open(apiUrl(url), '_blank', 'noopener,noreferrer')) return true
      toast.error(t('common.toast.popup_blocked'))
      return false
    } catch (error) {
      tab?.close()
      throw error
    }
  }

  /**
   * Descarga la entrega de un alumno (la ve su autor y el profesorado de la
   * clase). Devuelve si se ha llegado a abrir el fichero, para que quien llama
   * no anuncie una descarga que no ha salido.
   */
  const downloadSubmission = async (submission: ProtectedSubmission) => {
    if (submission.hasFile === false) {
      toast.error(t('common.toast.download_not_found'))
      return false
    }
    try {
      await downloadFromApi(`/files/submissions/${submission.id}`, submission.fileName || 'archivo')
      return true
    } catch (error) {
      reportError(error)
      return false
    }
  }

  /** Abre o descarga un documento de misión, según lo que sea. */
  const openDocument = async (doc: ProtectedDocument) => {
    const externalUrl = doc.url || doc.fileUrl

    if (!doc.storedFile) {
      if (!externalUrl) {
        toast.error(t('common.toast.download_not_found'))
        return false
      }
      if (window.open(externalUrl, '_blank', 'noopener,noreferrer')) return true
      toast.error(t('common.toast.popup_blocked'))
      return false
    }

    try {
      // Un vídeo se ve en el navegador; el resto se descarga, como hasta ahora.
      if (doc.type === 'video') return await openWithLink(`/files/documents/${doc.id}/link`)
      await downloadFromApi(
        `/files/documents/${doc.id}`,
        doc.fileName || doc.title || doc.name || 'documento'
      )
      return true
    } catch (error) {
      reportError(error)
      return false
    }
  }

  return { downloadSubmission, openDocument }
}
