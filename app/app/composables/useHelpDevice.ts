import { helpCardType } from '~/utils/help-accents'

/**
 * Ordenador o móvil en las guías que tienen las dos versiones.
 *
 * La versión móvil de un vídeo vive junto a él con el sufijo `-movil`
 * (`guia.mp4` → `guia-movil.mp4`), y la de cada captura igual
 * (`01-paso.webp` → `01-paso-movil.webp`). Si no hay versión móvil, no se
 * enseña el selector.
 *
 * La elección es una sola para toda la página (y se recuerda): en una lección
 * el vídeo va en el escenario y las capturas en el cuerpo, y las dos piezas
 * tienen que cambiar a la vez.
 */

export type HelpDevice = 'desktop' | 'mobile'

const DEVICE_KEY = 'itakai-help-device'

/** Una comprobación por URL: el escenario y el cuerpo preguntan por el mismo vídeo. */
const mobileChecks = new Map<string, Promise<boolean>>()

export const helpMobileVariant = (url: string) =>
  url.replace(/\.(mp4|webp|png|jpe?g)(\?.*)?$/i, '-movil.$1$2')

export function useHelpDevice(videoUrl: MaybeRefOrGetter<string | null | undefined>) {
  const device = useState<HelpDevice>('help-device', () => 'desktop')
  const loaded = useState<boolean>('help-device-loaded', () => false)
  const hasMobile = ref(false)

  const mobileVideoUrl = computed(() => {
    const url = toValue(videoUrl)
    return url && /\.mp4(\?|$)/i.test(url) ? helpMobileVariant(url) : null
  })

  const shownVideoUrl = computed(() =>
    device.value === 'mobile' && hasMobile.value && mobileVideoUrl.value
      ? mobileVideoUrl.value
      : toValue(videoUrl) || ''
  )

  const setDevice = (mode: HelpDevice) => {
    device.value = mode
    try {
      localStorage.setItem(DEVICE_KEY, mode)
    } catch {
      // Sin almacenamiento (modo privado): la elección dura lo que dura la página.
    }
  }

  watch(
    mobileVideoUrl,
    async url => {
      hasMobile.value = false
      if (!url || typeof window === 'undefined') return
      let check = mobileChecks.get(url)
      if (!check) {
        check = fetch(url, { method: 'HEAD' })
          .then(res => res.ok)
          .catch(() => false)
        mobileChecks.set(url, check)
      }
      const ok = await check
      if (url === mobileVideoUrl.value) hasMobile.value = ok
    },
    { immediate: true }
  )

  onMounted(() => {
    if (loaded.value) return
    try {
      if (localStorage.getItem(DEVICE_KEY) === 'mobile') device.value = 'mobile'
    } catch {
      // Sin almacenamiento: ordenador.
    }
    loaded.value = true
  })

  return { device, hasMobile, mobileVideoUrl, shownVideoUrl, setDevice }
}

/** El color de una categoría como variable CSS, para los detalles de color. */
export const helpAccentVar = (accent?: string | null) => `var(--color-card-${helpCardType(accent)})`
