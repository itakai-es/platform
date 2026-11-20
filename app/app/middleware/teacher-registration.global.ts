import { getRoleFromPath, ROUTE_NAMES } from '~/utils/navigation'

export default defineNuxtRouteMiddleware(to => {
  const auth = useAuthStore()
  if (!auth.isAuthenticated || auth.user?.mustChangePassword) return
  if (auth.user?.teacherRegistrationPending && getRoleFromPath(to.path) === 'teacher') {
    return navigateTo(ROUTE_NAMES.TEACHER_REGISTRATION, { replace: true })
  }
})
