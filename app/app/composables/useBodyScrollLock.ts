/**
 * Bloqueo del scroll del body compartido entre modales, menús y paneles.
 *
 * Cada instancia cuenta como un solo bloqueo (llamar dos veces a `lock` o a
 * `unlock` no descuadra nada) y el scroll solo se libera cuando ya no queda
 * ninguno: cerrar un diálogo abierto encima de un menú no desbloquea la página
 * mientras el menú siga abierto, sea cual sea el orden en que se cierren.
 */
let activeLocks = 0

export function useBodyScrollLock() {
  let held = false

  /** Bloquea el scroll de fondo mientras el overlay esté abierto. */
  const lock = () => {
    if (!import.meta.client || held) return
    held = true
    activeLocks++
    document.body.style.overflow = 'hidden'
  }

  /** Suelta este bloqueo; el scroll vuelve solo si no queda ningún otro. */
  const unlock = () => {
    if (!import.meta.client || !held) return
    held = false
    activeLocks = Math.max(0, activeLocks - 1)
    if (!activeLocks) document.body.style.overflow = ''
  }

  return { lock, unlock }
}
