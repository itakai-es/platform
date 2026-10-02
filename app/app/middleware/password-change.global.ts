import { ROUTE_NAMES } from '~/utils/navigation'

/**
 * Con el cambio de contraseña pendiente no se llega a ninguna pantalla de la
 * aplicación: el servidor tampoco deja hacer nada más con esa sesión, así que ir
 * a cualquier otro sitio solo daría errores. Es global porque afecta a toda la
 * aplicación, no a una lista de páginas.
 *
 * Sí se sigue llegando a la pantalla del cambio y a las páginas públicas de solo
 * leer: los textos legales, la ayuda, el blog y el catálogo de plantillas no
 * piden sesión y son justo lo que alguien puede querer consultar antes de
 * elegir una contraseña.
 */
const OPEN_PATHS: string[] = [
  ROUTE_NAMES.CHANGE_PASSWORD,
  ROUTE_NAMES.HOME,
  ROUTE_NAMES.TERMS,
  ROUTE_NAMES.PRIVACY_POLICY,
  ROUTE_NAMES.COOKIES,
  ROUTE_NAMES.LICENSES,
]

/** La ayuda, el blog, las plantillas y la entrada llevan subrutas. */
const OPEN_PREFIXES: string[] = [
  ROUTE_NAMES.DOCS,
  ROUTE_NAMES.BLOG,
  ROUTE_NAMES.TEMPLATES,
  '/auth/',
]

export default defineNuxtRouteMiddleware(to => {
  const authStore = useAuthStore()

  if (!authStore.isAuthenticated) return
  if (!authStore.user?.mustChangePassword) return
  if (OPEN_PATHS.includes(to.path)) return
  if (OPEN_PREFIXES.some(prefix => to.path.startsWith(prefix))) return

  return navigateTo(ROUTE_NAMES.CHANGE_PASSWORD, { replace: true })
})
