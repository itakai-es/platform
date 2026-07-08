export const ROUTE_NAMES = {
  // Public
  HOME: '/',
  TERMS: '/terms',
  PRIVACY_POLICY: '/privacy-policy',
  COOKIES: '/cookies',
  LICENSES: '/licenses',
  DOCS: '/docs',

  // Shared (authenticated, role-agnostic)
  NOTIFICACIONES: '/notificaciones',

  // Auth
  LOGIN: '/auth/login',
  SIGNUP: '/auth/registro',
  FORGOT_PASSWORD: '/auth/recuperar-password',
  RESET_PASSWORD: '/auth/restablecer-password',

  // Student
  STUDENT_DASHBOARD: '/alumno/inicio',
  STUDENT_CLASSES: '/alumno/clases',
  STUDENT_MISSIONS: '/alumno/misiones',
  STUDENT_RANKINGS: '/alumno/clasificacion',
  STUDENT_AI_ASSISTANT: '/alumno/asistente',
  STUDENT_PROFILE: '/alumno/perfil',
  STUDENT_ACHIEVEMENTS: '/alumno/insignias',

  // Teacher
  TEACHER_DASHBOARD: '/profesor/inicio',
  TEACHER_CLASSES: '/profesor/clases',
  TEACHER_MISSIONS: '/profesor/misiones',
  TEACHER_STUDENTS: '/profesor/alumnos',
  TEACHER_PROFILE: '/profesor/perfil',
  TEACHER_BADGES: '/profesor/insignias',
  TEACHER_AI_ASSISTANT: '/profesor/asistente',

  // Admin
  ADMIN_DASHBOARD: '/admin/inicio',
  ADMIN_USERS: '/admin/usuarios',
  ADMIN_CLASSES: '/admin/clases',
  ADMIN_MISSIONS: '/admin/misiones',
  ADMIN_ANALYTICS: '/admin/estadisticas',
  ADMIN_SCHOOLS: '/admin/centros',
  ADMIN_LOGS: '/admin/registros',
  ADMIN_SETTINGS: '/admin/configuracion',
} as const

export const getDashboardByRole = (role: string): string => {
  const dashboardMap: Record<string, string> = {
    teacher: ROUTE_NAMES.TEACHER_DASHBOARD,
    student: ROUTE_NAMES.STUDENT_DASHBOARD,
    admin: ROUTE_NAMES.ADMIN_DASHBOARD,
  }

  return dashboardMap[role] || ROUTE_NAMES.HOME
}

export const isAuthRoute = (path: string): boolean => {
  return path.startsWith('/auth/')
}

export const isPublicRoute = (path: string): boolean => {
  const publicRoutes: string[] = [
    ROUTE_NAMES.HOME,
    ROUTE_NAMES.TERMS,
    ROUTE_NAMES.PRIVACY_POLICY,
    ROUTE_NAMES.COOKIES,
    ROUTE_NAMES.LICENSES,
    ROUTE_NAMES.DOCS,
    ROUTE_NAMES.LOGIN,
    ROUTE_NAMES.SIGNUP,
    ROUTE_NAMES.FORGOT_PASSWORD,
    ROUTE_NAMES.RESET_PASSWORD,
  ]
  return publicRoutes.includes(path)
}

export const getRoleFromPath = (path: string): string | null => {
  if (path.startsWith('/alumno/')) return 'student'
  if (path.startsWith('/profesor/')) return 'teacher'
  if (path.startsWith('/admin/')) return 'admin'
  return null
}
