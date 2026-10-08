import { copyText } from '~/utils/clipboard'
import { ROUTE_NAMES } from '~/utils/navigation'

/**
 * El enlace público de una plantilla: su ficha, que se abre sin cuenta. Es el
 * que se comparte, y se copia desde la ficha, desde las tarjetas de los dos
 * catálogos y desde el interruptor de publicar de la clase, siempre igual y
 * con el mismo aviso.
 */
export function useTemplateLink() {
  const toast = useToast()
  const { t } = useI18n()

  /** El enlace de la ficha, sin nada más. */
  const templateUrl = (id: string) => `${window.location.origin}${ROUTE_NAMES.TEMPLATES}/${id}`

  async function copyTemplateLink(id: string) {
    try {
      await copyText(templateUrl(id))
      toast.success(t('common.copy.copied'))
    } catch {
      toast.error(t('common.copy.error'))
    }
  }

  return { templateUrl, copyTemplateLink }
}
