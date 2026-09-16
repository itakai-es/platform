import { ROUTE_NAMES } from '~/utils/navigation'

/**
 * Cierra la sesión y vuelve al login. Lo usa el bloque de cuenta del menú
 * lateral (NavAccountSection), el mismo en escritorio y en móvil.
 */
export const useLogout = () => {
  const authStore = useAuthStore()
  const router = useRouter()

  return async () => {
    await authStore.logout()
    await router.push(ROUTE_NAMES.LOGIN)
  }
}
