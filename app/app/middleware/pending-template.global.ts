import { getRoleFromPath, ROUTE_NAMES } from '~/utils/navigation'
import {
  clearPendingTemplate,
  peekPendingTemplate,
  takePendingTemplate,
} from '~/utils/pending-template'

/**
 * Recoge la plantilla que alguien quiso usar antes de tener sesión (ver
 * `utils/pending-template.ts`). Es global porque se llega al panel por muchos
 * caminos (entrar, entrar con Google, registrarse y elegir el rol, o abrir la
 * aplicación con la sesión ya iniciada), y todos acaban aquí.
 *
 * Al llegar el profesorado a su panel, en vez del panel se abre la ficha de la
 * plantilla, con la casilla de sus misiones y el botón de importar a mano: no
 * se importa nada sin que lo pida. Si la plantilla ya no está, la ficha lo
 * dice. Con otro rol no se puede usar: se avisa y se descarta.
 *
 * Espera a que no quede nada por hacer antes del panel: elegir el rol o
 * cambiar la contraseña obligatoria.
 *
 * Sin sesión, la intención solo vive dentro del camino que lleva a usarla: las
 * pantallas de entrar y registrarse (`/auth/…`) y la propia ficha. Quien sale
 * de ahí sin entrar la abandona, y se descarta para que no la herede la
 * siguiente persona que use ese navegador.
 */
export default defineNuxtRouteMiddleware(to => {
  const authStore = useAuthStore()
  const user = authStore.user

  if (!authStore.isAuthenticated) {
    if (to.path.startsWith('/auth/')) return
    const id = peekPendingTemplate()
    if (id && to.path.replace(/\/$/, '') !== `${ROUTE_NAMES.TEMPLATES}/${id}`) {
      clearPendingTemplate()
    }
    return
  }
  if (!user?.isOnboarded || user.mustChangePassword) return

  // Solo al entrar en un panel: las páginas públicas no la recogen.
  const area = getRoleFromPath(to.path)
  if (!area) return

  if (user.role === 'teacher') {
    if (area !== 'teacher') return
    const id = takePendingTemplate()
    if (!id) return
    return navigateTo(
      { path: `${ROUTE_NAMES.TEMPLATES}/${id}`, query: { usar: '1' } },
      { replace: true }
    )
  }

  if (takePendingTemplate()) {
    const i18n = useNuxtApp().$i18n as { t: (key: string) => string }
    useToast().info(i18n.t('common.templates.use.not_for_role'))
  }
})
