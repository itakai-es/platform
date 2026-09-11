/**
 * Aplica los ajustes de accesibilidad (Fase 3, punto 14) en el arranque:
 *  1. desde el espejo de localStorage, para que no haya salto visual ni haga
 *     falta sesión (login, landing y páginas legales también los respetan),
 *  2. y después desde el perfil cuando llega, que es el valor canónico.
 */
export default defineNuxtPlugin(() => {
  const { initAccessibility, syncFromProfile } = useAccessibility()

  initAccessibility()
  syncFromProfile()
})
