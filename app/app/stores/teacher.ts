import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import type { ManagedCredentials } from '~/types/auth.types'
import type {
  ClassAccess,
  ClassAccessLevel,
  ClassHistoryResponse,
  ClassHistoryType,
  ClassTeacherMember,
  ClassTeacherProfile,
  ClassTeachersResponse,
} from '~/types/class.types'
import type {
  Class,
  Student,
  TeacherStats,
  Activity,
  CreateClassData,
  UpdateClassData,
  ManagedRowInput,
  ManagedRowReview,
  StudentListQuery,
  StudentListResponse,
} from '~/types/teacher.types'
import { canInClass } from '~/utils/class-access'

export const useTeacherStore = defineStore('teacher', () => {
  // State
  const stats = ref<TeacherStats | null>(null)
  const classes = ref<Class[]>([])
  const archivedClasses = ref<Class[]>([])
  // Listado general de alumnos: la página a la vista, con sus totales.
  const students = ref<Student[]>([])
  const studentsTotal = ref(0)
  const studentsTotalPages = ref(1)
  const studentCounts = ref({ active: 0, archived: 0 })
  const activities = ref<Activity[]>([])
  const recentMissions = ref<any[]>([])
  const isLoadingStats = ref(true)
  const isLoadingClasses = ref(true)
  const isLoadingArchivedClasses = ref(false)
  const isLoadingStudents = ref(true)
  const isLoadingActivities = ref(true)
  const isLoadingMissions = ref(true)

  // Per-class data (Maps keyed by classId)
  const classStudents = ref<Map<string, Student[]>>(new Map())
  const classMissions = ref<Map<string, any[]>>(new Map())
  const classGuides = ref<Map<string, { content: string; lastUpdated?: string }>>(new Map())
  const classRankings = ref<Map<string, any>>(new Map())
  // Per-id / per-classId data added for ensureX wrappers
  const studentDetails = ref<Map<string, any>>(new Map())

  // Cache flags (persist during session)
  const hasLoadedStats = ref(false)
  const hasLoadedClasses = ref(false)
  const hasLoadedArchivedClasses = ref(false)
  const hasLoadedStudents = ref(false)
  const hasLoadedActivities = ref(false)
  const hasLoadedMissions = ref(false)

  // Per-class cache flags
  const loadedClassStudents = ref<Set<string>>(new Set())
  const loadedClassMissions = ref<Set<string>>(new Set())
  const loadedClassGuides = ref<Set<string>>(new Set())
  const loadedClassRankings = ref<Set<string>>(new Set())
  // Per-id / per-classId fetched flags for new ensureX wrappers
  const loadedStudentDetails = ref<Set<string>>(new Set())
  // Per-classId fetched flag for the per-class ensureTeacherClassById wrapper
  const loadedClassDetails = ref<Set<string>>(new Set())

  // In-flight guards so concurrent ensureX calls don't fire duplicate fetches
  const isLoadingClassDetails = ref<Set<string>>(new Set())
  const isLoadingStudentDetails = ref<Set<string>>(new Set())

  // Actions
  /**
   * Obtiene las estadísticas del profesor
   */
  async function fetchStats(force = false) {
    // Use cached data unless forced
    if (!force && hasLoadedStats.value && stats.value) {
      return stats.value
    }

    try {
      isLoadingStats.value = true
      const config = useRuntimeConfig()
      const response = await $fetch<TeacherStats>(`${config.public.apiBase}/teacher/stats`)
      stats.value = response
      hasLoadedStats.value = true
      return response
    } catch (error) {
      console.error('Error fetching teacher stats:', error)
      throw error
    } finally {
      isLoadingStats.value = false
    }
  }

  /**
   * Obtiene las clases del profesor
   * @param limit - Límite opcional (default: sin límite = carga TODO)
   */
  async function fetchClasses(
    limit?: number,
    force = false,
    archived: 'active' | 'archived' | 'all' = 'active'
  ) {
    // Use cached data unless forced
    if (!force && hasLoadedClasses.value && archived === 'active') {
      return { classes: classes.value, total: classes.value.length }
    }

    try {
      isLoadingClasses.value = true
      const config = useRuntimeConfig()
      const response = await $fetch<{ classes: Class[]; total: number }>(
        `${config.public.apiBase}/teacher/classes`,
        {
          params: limit ? { limit } : undefined, // Solo envía limit si existe
        }
      )
      classes.value = response.classes
      hasLoadedClasses.value = true
      return response
    } catch (error) {
      console.error('Error fetching classes:', error)
      throw error
    } finally {
      isLoadingClasses.value = false
    }
  }

  /**
   * Obtiene una clase específica por ID
   */
  async function fetchClassById(classId: string, force = false) {
    // Use cached data unless forced, but only if it has full stats
    if (!force && hasLoadedClasses.value) {
      // Find class in classes array (cached)
      const cachedClass = classes.value.find(c => c.id === classId)
      // Only use cache if it has stats with pendingReviews (full detail data)
      if (cachedClass && cachedClass.stats?.pendingReviews !== undefined) {
        return cachedClass
      }
    }

    try {
      const config = useRuntimeConfig()
      const response = await $fetch<{ class: Class }>(
        `${config.public.apiBase}/teacher/classes/${classId}`
      )

      // Also update the class in the classes array if it exists
      const index = classes.value.findIndex(c => c.id === classId)
      if (index !== -1) {
        classes.value[index] = response.class
      }

      return response.class
    } catch (error) {
      console.error('Error fetching class:', error)
      if (isClassGone(error)) forgetClass(classId)
      throw error
    }
  }

  // ==========================================
  // CLASES A LAS QUE YA NO SE LLEGA
  // ==========================================

  /**
   * ¿Dice este error que la clase ya no es accesible? La API responde 404 a
   * quien no tiene acceso y 403 a quien no llega al nivel: en los dos casos lo
   * que se tenía guardado de la clase ya no vale.
   */
  function isClassGone(error: unknown): boolean {
    const e = error as { statusCode?: number; status?: number; response?: { status?: number } }
    const status = e?.statusCode ?? e?.status ?? e?.response?.status
    return status === 403 || status === 404
  }

  /**
   * Olvida todo lo guardado de una clase: sale de los listados y de las cachés
   * por clase, y los listados se volverán a pedir en la próxima visita. Tras
   * salir de una clase, que te quiten de ella o que te cambien el nivel.
   */
  function forgetClass(classId: string) {
    classes.value = classes.value.filter(c => c.id !== classId)
    archivedClasses.value = archivedClasses.value.filter(c => c.id !== classId)
    for (const map of [classStudents, classMissions, classGuides]) map.value.delete(classId)
    for (const set of [loadedClassStudents, loadedClassMissions, loadedClassGuides]) {
      set.value.delete(classId)
    }
    for (const key of [...classRankings.value.keys()]) {
      if (key.startsWith(`${classId}-`)) {
        classRankings.value.delete(key)
        loadedClassRankings.value.delete(key)
      }
    }
    loadedClassDetails.value.delete(classId)
    isLoadingClassDetails.value.delete(classId)
    hasLoadedClasses.value = false
    hasLoadedArchivedClasses.value = false
    hasLoadedStudents.value = false
    hasLoadedStats.value = false
    hasLoadedActivities.value = false
    hasLoadedMissions.value = false
    // El listado de «Mis clases» vive en el almacén de clases.
    const classesStore = useClassesStore()
    classesStore.classes = classesStore.classes.filter(c => c.id !== classId)
    classesStore.hasLoadedClasses = false
  }

  /**
   * Acceso propio en una clase, si ya está en algún listado cargado. `undefined`
   * si no se sabe (hay que pedir la clase); `null` si se sabe que no hay.
   */
  function cachedClassAccess(classId: string): ClassAccess | null | undefined {
    const cached = [...classes.value, ...archivedClasses.value, ...useClassesStore().classes].find(
      c => c.id === classId && c.myAccess !== undefined
    )
    return cached?.myAccess
  }

  /**
   * Cambios de acceso propio avisados desde fuera de la clase (un aviso de que
   * te han cambiado el nivel o quitado): cada uno sube el contador de su clase,
   * y la pantalla que la tenga abierta vuelve a pedirla.
   */
  const classAccessRevision = ref<Record<string, number>>({})

  /** Lo guardado de la clase ya no vale: se olvida y se avisa a quien la tenga abierta. */
  function markClassAccessChanged(classId: string) {
    forgetClass(classId)
    classAccessRevision.value = {
      ...classAccessRevision.value,
      [classId]: (classAccessRevision.value[classId] ?? 0) + 1,
    }
  }

  /**
   * ¿Se ofrece crear misiones? Hace falta edición en alguna clase. Mientras no se
   * sabe, o sin ninguna clase aún (el asistente lo explica), se ofrece.
   */
  const canCreateMissions = computed(
    () =>
      !hasLoadedClasses.value ||
      classes.value.length === 0 ||
      classes.value.some(c => canInClass(c.myAccess, 'mission.edit'))
  )

  /** Apunta el acceso propio nuevo de una clase en los listados que la tengan. */
  function setClassAccess(classId: string, access: ClassAccess | null) {
    for (const list of [classes.value, archivedClasses.value, useClassesStore().classes]) {
      const cls = list.find(c => c.id === classId)
      if (cls) cls.myAccess = access
    }
  }

  // ==========================================
  // PROFESORADO DE UNA CLASE
  // ==========================================

  function classTeachersUrl(classId: string) {
    return `${useRuntimeConfig().public.apiBase}/teacher/classes/${classId}`
  }

  async function fetchClassTeachers(classId: string) {
    return await $fetch<ClassTeachersResponse>(`${classTeachersUrl(classId)}/teachers`)
  }

  /** Añade por correo exacto. Sin nivel, el del perfil. */
  async function addClassTeacher(
    classId: string,
    data: { email: string; profile: ClassTeacherProfile; access?: ClassAccessLevel }
  ) {
    const response = await $fetch<{ teacher: ClassTeacherMember }>(
      `${classTeachersUrl(classId)}/teachers`,
      { method: 'POST', body: data }
    )
    return response.teacher
  }

  async function updateClassTeacher(
    classId: string,
    userId: string,
    data: { profile?: ClassTeacherProfile; access?: ClassAccessLevel }
  ) {
    const response = await $fetch<{ teacher: ClassTeacherMember }>(
      `${classTeachersUrl(classId)}/teachers/${userId}`,
      { method: 'PATCH', body: data }
    )
    return response.teacher
  }

  async function removeClassTeacher(classId: string, userId: string) {
    await $fetch(`${classTeachersUrl(classId)}/teachers/${userId}`, { method: 'DELETE' })
  }

  /** Sale de la clase: desde ese momento ya no se llega a ella. */
  async function leaveClass(classId: string) {
    await $fetch(`${classTeachersUrl(classId)}/leave`, { method: 'POST' })
    forgetClass(classId)
  }

  /** Pasa la propiedad. Devuelve el profesorado tal como queda. */
  async function transferClass(classId: string, userId: string) {
    const response = await $fetch<{ teachers: ClassTeacherMember[] }>(
      `${classTeachersUrl(classId)}/transfer`,
      { method: 'POST', body: { userId } }
    )
    return response.teachers
  }

  async function fetchClassHistory(
    classId: string,
    query: { page?: number; limit?: number; actorId?: string; type?: ClassHistoryType }
  ) {
    return await $fetch<ClassHistoryResponse>(`${classTeachersUrl(classId)}/history`, {
      params: query,
    })
  }

  /** Alumnado de una clase, entero y sin paginar: la vista de la clase lo usa todo. */
  async function fetchStudents(classId: string, force = false) {
    if (!force && loadedClassStudents.value.has(classId)) {
      const cached = classStudents.value.get(classId)
      if (cached) return { students: cached, total: cached.length }
    }
    try {
      const config = useRuntimeConfig()
      const response = await $fetch<StudentListResponse>(
        `${config.public.apiBase}/teacher/students`,
        { params: { classId } }
      )
      classStudents.value.set(classId, response.students)
      loadedClassStudents.value.add(classId)
      return response
    } catch (error) {
      console.error('Error fetching students:', error)
      throw error
    }
  }

  // Petición más reciente del listado, consulta de lo que se ve y la que va en
  // camino: una respuesta que llega tarde (se ha seguido escribiendo, se ha
  // vuelto a la página de antes) no pisa a la última.
  let studentListRequest = 0
  let studentListKey = ''
  let studentListPendingKey: string | null = null

  /** Una página del listado general de alumnos: la API busca, filtra, ordena y pagina. */
  async function fetchStudentList(query: StudentListQuery) {
    const request = ++studentListRequest
    const key = JSON.stringify(query)
    studentListPendingKey = key
    try {
      isLoadingStudents.value = true
      const config = useRuntimeConfig()
      // La pestaña va siempre: con ella, la clase solo acota quién sale y las
      // tarjetas llevan los números de todas las clases de la pestaña.
      const params: Record<string, string | number> = {
        archived: query.archived,
        page: query.page,
        limit: query.limit,
      }
      if (query.search?.trim()) params.search = query.search.trim()
      if (query.classId) params.classId = query.classId
      if (query.progress) params.progress = query.progress
      if (query.sort) params.sort = query.sort
      const response = await $fetch<StudentListResponse>(
        `${config.public.apiBase}/teacher/students`,
        { params }
      )
      if (request === studentListRequest) {
        students.value = response.students
        studentsTotal.value = response.total
        studentsTotalPages.value = response.totalPages
        studentCounts.value = response.counts
        studentListKey = key
        hasLoadedStudents.value = true
      }
      return response
    } catch (error) {
      console.error('Error fetching students:', error)
      throw error
    } finally {
      if (request === studentListRequest) {
        isLoadingStudents.value = false
        studentListPendingKey = null
      }
    }
  }

  /** Deja sin efecto la petición del listado que vaya en camino. */
  function dropStudentListRequest() {
    ++studentListRequest
    studentListPendingKey = null
    isLoadingStudents.value = false
  }

  /**
   * Obtiene la actividad reciente
   */
  async function fetchActivities(limit = 10, force = false) {
    // Use cached data unless forced
    if (!force && hasLoadedActivities.value) {
      return { activities: activities.value, total: activities.value.length }
    }

    try {
      isLoadingActivities.value = true
      const config = useRuntimeConfig()
      const response = await $fetch<{ activities: Activity[]; total: number }>(
        `${config.public.apiBase}/teacher/activities`,
        {
          params: { limit },
        }
      )
      activities.value = response.activities
      hasLoadedActivities.value = true
      return response
    } catch (error) {
      console.error('Error fetching activities:', error)
      throw error
    } finally {
      isLoadingActivities.value = false
    }
  }

  /**
   * Crea una nueva clase
   */
  async function createClass(data: CreateClassData) {
    try {
      const config = useRuntimeConfig()
      const response = await $fetch<{ class: Class; message: string }>(
        `${config.public.apiBase}/teacher/classes`,
        {
          method: 'POST',
          body: data,
        }
      )
      // Agregar la nueva clase al array local con defaults para campos calculados
      classes.value.push({
        ...response.class,
        studentCount: response.class.studentCount ?? 0,
        stats: response.class.stats ?? {
          avgProgress: 0,
          participation: 0,
          avgMissionsCompleted: 0,
          totalMissions: 0,
          pendingReviews: 0,
          avgXp: 0,
        },
      })
      return response
    } catch (error) {
      console.error('Error creating class:', error)
      throw error
    }
  }

  /**
   * Actualiza una clase existente
   */
  async function updateClass(classId: string, data: UpdateClassData) {
    try {
      const config = useRuntimeConfig()
      const response = await $fetch<{ class: Class; message: string }>(
        `${config.public.apiBase}/teacher/classes/${classId}`,
        {
          method: 'PUT',
          body: data,
        }
      )
      // Sobre lo que ya había: la respuesta no trae todo lo del listado (estadísticas…).
      const index = classes.value.findIndex(c => c.id === classId)
      if (index !== -1) {
        classes.value[index] = { ...classes.value[index], ...response.class }
      }
      return response
    } catch (error) {
      console.error('Error updating class:', error)
      throw error
    }
  }

  /** Publica/retira la clase como plantilla pública del marketplace. */
  async function publishTemplate(classId: string, publish: boolean) {
    const config = useRuntimeConfig()
    const response = await $fetch<{ isTemplate: boolean }>(
      `${config.public.apiBase}/teacher/classes/${classId}/publish-template`,
      { method: 'POST', body: { publish } }
    )
    const index = classes.value.findIndex(c => c.id === classId)
    if (index !== -1) {
      classes.value[index] = { ...classes.value[index], isTemplate: response.isTemplate }
    }
    return response
  }

  async function setClassArchived(classId: string, archived: boolean) {
    try {
      const config = useRuntimeConfig()
      const response = await $fetch<{ class: Class; message: string }>(
        `${config.public.apiBase}/teacher/classes/${classId}/archive`,
        {
          method: 'PATCH',
          body: { archived },
        }
      )

      const index = classes.value.findIndex(c => c.id === classId)
      if (index !== -1) {
        if (response.class.archived) {
          classes.value.splice(index, 1)
        } else {
          classes.value[index] = { ...classes.value[index], ...response.class }
        }
      } else if (!response.class.archived) {
        classes.value.unshift(response.class)
      }

      // Archivar/desarchivar mueve alumnos entre las pestañas activa y archivada:
      // el listado se vuelve a pedir en la próxima visita.
      hasLoadedStudents.value = false
      hasLoadedStats.value = false

      return response
    } catch (error) {
      console.error('Error archiving class:', error)
      throw error
    }
  }

  /**
   * Duplica una clase propia (crea una copia independiente). `options` elige qué
   * partes copiar (narrativa, funcionalidades, tienda, comportamientos, misiones).
   * Devuelve la clase nueva; el refresco de la lista lo hace la página.
   */
  async function duplicateClass(
    classId: string,
    options?: {
      narrative: boolean
      features: boolean
      shop: boolean
      behaviors: boolean
      missions: boolean
    }
  ) {
    const config = useRuntimeConfig()
    return $fetch<{ class: { id: string; name: string }; message: string }>(
      `${config.public.apiBase}/teacher/classes/${classId}/duplicate`,
      { method: 'POST', body: options ?? {} }
    )
  }

  /**
   * Obtiene el código de invitación de una clase
   */
  async function getInvitationCode(classId: string) {
    try {
      const config = useRuntimeConfig()
      const response = await $fetch<{ invitationCode: string }>(
        `${config.public.apiBase}/teacher/classes/${classId}/invitation-code`
      )
      return response.invitationCode
    } catch (error) {
      console.error('Error fetching invitation code:', error)
      throw error
    }
  }

  /**
   * Obtiene las misiones de una clase
   */
  async function fetchClassMissions(classId: string, force = false) {
    // Use cached data unless forced
    if (!force && loadedClassMissions.value.has(classId)) {
      const cached = classMissions.value.get(classId)
      if (cached) {
        return { missions: cached, total: cached.length }
      }
    }

    try {
      const config = useRuntimeConfig()
      const response = await $fetch<{ missions: any[]; total: number }>(
        `${config.public.apiBase}/teacher/classes/${classId}/missions`
      )

      // Store in cache
      classMissions.value.set(classId, response.missions)
      loadedClassMissions.value.add(classId)

      return response
    } catch (error) {
      console.error('Error fetching class missions:', error)
      throw error
    }
  }

  /**
   * Obtiene la guía de una clase
   */
  async function fetchClassGuide(classId: string, force = false) {
    // Use cached data unless forced
    if (!force && loadedClassGuides.value.has(classId)) {
      const cached = classGuides.value.get(classId)
      return { guide: cached }
    }

    try {
      const config = useRuntimeConfig()
      const response = await $fetch<{ guide: { content: string; lastUpdated?: string } }>(
        `${config.public.apiBase}/students/classes/${classId}/guide`
      )

      // Store in cache (even if null, to avoid repeated requests)
      const guideData = response.guide || null
      classGuides.value.set(classId, guideData)
      loadedClassGuides.value.add(classId)

      return response
    } catch (error) {
      console.error('Error fetching class guide:', error)
      throw error
    }
  }

  /**
   * Actualiza el guide en el cache (después de guardarlo)
   */
  function updateClassGuideCache(
    classId: string,
    guide: { content: string; lastUpdated?: string }
  ) {
    classGuides.value.set(classId, guide)
    loadedClassGuides.value.add(classId)
  }

  /**
   * Obtiene el ranking de una clase
   */
  async function fetchClassRanking(classId: string, filter = 'general', force = false) {
    const cacheKey = `${classId}-${filter}`

    // Use cached data unless forced
    if (!force && loadedClassRankings.value.has(cacheKey)) {
      const cached = classRankings.value.get(cacheKey)
      if (cached) {
        return cached
      }
    }

    try {
      const config = useRuntimeConfig()
      const response = await $fetch<any>(
        `${config.public.apiBase}/teacher/classes/${classId}/ranking`,
        {
          params: { filter },
        }
      )

      // Store in cache
      classRankings.value.set(cacheKey, response)
      loadedClassRankings.value.add(cacheKey)

      return response
    } catch (error) {
      console.error('Error fetching class ranking:', error)
      throw error
    }
  }

  // ==========================================
  // ALUMNADO DE UNA CLASE: altas, alias, quitar y contraseñas
  // ==========================================

  /**
   * Da por viejo lo cacheado de un alumno y de los listados donde sale, para que
   * la próxima visita lo pida de nuevo. La ficha del alumno se queda hasta que
   * llegue la nueva, para no dejar la pantalla en blanco mientras tanto. Sin
   * alumno, solo los listados (tras un alta).
   */
  function forgetStudent(studentId?: string, classId?: string) {
    if (studentId) loadedStudentDetails.value.delete(studentId)
    if (classId) {
      classStudents.value.delete(classId)
      loadedClassStudents.value.delete(classId)
      classRankings.value.delete(`${classId}-general`)
      loadedClassRankings.value.delete(`${classId}-general`)
    }
    hasLoadedStudents.value = false
    hasLoadedStats.value = false
  }

  /**
   * Usuario libre para un nombre. La API no dice si existe ninguno: responde
   * siempre con uno que se puede usar.
   */
  async function proposeUsername(classId: string, name: string) {
    const config = useRuntimeConfig()
    const response = await $fetch<{ username: string }>(
      `${config.public.apiBase}/teacher/classes/${classId}/students/username-proposal`,
      { params: { name } }
    )
    return response.username
  }

  /** Revisa una lista sin crear nada: el estado de cada fila y el usuario con el que nacería. */
  async function reviewManagedStudents(classId: string, students: ManagedRowInput[]) {
    const config = useRuntimeConfig()
    return await $fetch<{ dryRun: true; rows: ManagedRowReview[]; canCreate: boolean }>(
      `${config.public.apiBase}/teacher/classes/${classId}/students/import`,
      { method: 'POST', params: { dryRun: 'true' }, body: { students } }
    )
  }

  /**
   * Da de alta varias cuentas sin correo de una vez: todas o ninguna. Devuelve
   * las contraseñas temporales, que solo llegan aquí. Si alguna fila no se puede
   * crear, la API responde 400 con la revisión de cada una (`data.rows`).
   */
  async function createManagedStudents(classId: string, students: ManagedRowInput[]) {
    const config = useRuntimeConfig()
    const response = await $fetch<{ dryRun: false; created: ManagedCredentials[] }>(
      `${config.public.apiBase}/teacher/classes/${classId}/students/import`,
      { method: 'POST', body: { students } }
    )
    forgetStudent(undefined, classId)
    return response.created
  }

  /** Nueva contraseña temporal para una cuenta sin correo. Solo se ve en esta respuesta. */
  async function resetStudentPassword(studentId: string) {
    const config = useRuntimeConfig()
    return await $fetch<ManagedCredentials>(
      `${config.public.apiBase}/teacher/students/${studentId}/reset-password`,
      { method: 'POST' }
    )
  }

  /** Cambia el alias del alumno en la clase. */
  async function updateStudentNickname(classId: string, studentId: string, nickname: string) {
    const config = useRuntimeConfig()
    const response = await $fetch<{ nickname: string }>(
      `${config.public.apiBase}/teacher/classes/${classId}/students/${studentId}`,
      { method: 'PATCH', body: { nickname } }
    )
    forgetStudent(studentId, classId)
    return response.nickname
  }

  /** Quita al alumno de la clase, con todo lo que tenía en ella. */
  async function removeStudentFromClass(classId: string, studentId: string) {
    const config = useRuntimeConfig()
    const result = await $fetch<{ removed: true; accountDeleted: boolean }>(
      `${config.public.apiBase}/teacher/classes/${classId}/students/${studentId}`,
      { method: 'DELETE' }
    )
    forgetStudent(studentId, classId)
    const cls = classes.value.find(c => c.id === classId)
    if (cls && cls.studentCount > 0) cls.studentCount--
    return result
  }

  /**
   * Obtiene las misiones del profesor
   * @param limit - Límite opcional (default: sin límite = carga TODO)
   */
  async function fetchRecentMissions(limit?: number, force = false) {
    // Use cached data unless forced
    if (!force && hasLoadedMissions.value) {
      return { missions: recentMissions.value, total: recentMissions.value.length }
    }

    try {
      isLoadingMissions.value = true
      const config = useRuntimeConfig()
      const response = await $fetch<{ missions: any[]; total: number }>(
        `${config.public.apiBase}/teacher/missions`,
        {
          params: limit ? { limit } : undefined, // Solo envía limit si existe
        }
      )
      recentMissions.value = response.missions
      hasLoadedMissions.value = true
      return response
    } catch (error) {
      console.error('Error fetching recent missions:', error)
      throw error
    } finally {
      isLoadingMissions.value = false
    }
  }

  /**
   * Obtiene las clases archivadas del profesor.
   * Movido desde el $fetch inline de pages/teacher/clases/index.vue.
   */
  async function fetchArchivedClasses(force = false) {
    if (!force && hasLoadedArchivedClasses.value) {
      return { classes: archivedClasses.value, total: archivedClasses.value.length }
    }
    try {
      isLoadingArchivedClasses.value = true
      const config = useRuntimeConfig()
      const response = await $fetch<{ classes: Class[]; total: number }>(
        `${config.public.apiBase}/teacher/classes`,
        {
          params: { archived: 'archived' },
        }
      )
      archivedClasses.value = response.classes || []
      hasLoadedArchivedClasses.value = true
      return { classes: archivedClasses.value, total: archivedClasses.value.length }
    } catch (error) {
      console.error('Error fetching archived classes:', error)
      archivedClasses.value = []
      throw error
    } finally {
      isLoadingArchivedClasses.value = false
    }
  }

  /**
   * Obtiene el detalle de un estudiante por id. Cacheado en Map.
   */
  async function fetchStudentById(studentId: string, force = false) {
    if (!force && loadedStudentDetails.value.has(studentId)) {
      const cached = studentDetails.value.get(studentId)
      if (cached) return cached
    }
    try {
      const config = useRuntimeConfig()
      const response = await $fetch<any>(`${config.public.apiBase}/teacher/students/${studentId}`)
      studentDetails.value.set(studentId, response)
      loadedStudentDetails.value.add(studentId)
      return response
    } catch (error) {
      console.error('Error fetching student detail:', error)
      throw error
    }
  }

  // ==========================================
  // ENSURE WRAPPERS — patrón canónico
  // (ver useTeacherClassDetail.ts / useStudentClassDetail.ts).
  // Cada ensureX:
  //  - sale temprano si el flag fetched está puesto (salvo force=true)
  //  - sale temprano si ya hay una llamada en vuelo
  //  - delega al fetchX correspondiente
  // De este modo la UI puede llamar `ensureX()` libremente sin duplicar
  // requests, manteniendo intactas las APIs `fetchX()` existentes.
  // ==========================================

  async function ensureStats(force = false) {
    if (hasLoadedStats.value && !force) return stats.value
    return await fetchStats(force)
  }

  async function ensureClasses(force = false) {
    if (hasLoadedClasses.value && !force) {
      return { classes: classes.value, total: classes.value.length }
    }
    return await fetchClasses(undefined, force)
  }

  /** La página pedida del listado, salvo que ya sea la que se tiene. */
  async function ensureStudentList(query: StudentListQuery, force = false) {
    const key = JSON.stringify(query)
    if (!force && hasLoadedStudents.value && studentListKey === key) {
      // Es la que se ve. Si va en camino otra (se ha ido a la página 2 y se ha
      // vuelto a la 1 antes de que responda), al llegar no debe pisarla.
      if (studentListPendingKey !== null && studentListPendingKey !== key) dropStudentListRequest()
      return
    }
    await fetchStudentList(query)
  }

  async function ensureActivities(force = false) {
    if (hasLoadedActivities.value && !force) {
      return { activities: activities.value, total: activities.value.length }
    }
    return await fetchActivities(10, force)
  }

  async function ensureRecentMissions(force = false) {
    if (hasLoadedMissions.value && !force) {
      return { missions: recentMissions.value, total: recentMissions.value.length }
    }
    return await fetchRecentMissions(undefined, force)
  }

  async function ensureTeacherClassById(classId: string, force = false) {
    if (loadedClassDetails.value.has(classId) && !force) {
      const cached = classes.value.find(c => c.id === classId)
      if (cached) return cached
    }
    if (isLoadingClassDetails.value.has(classId)) return
    isLoadingClassDetails.value.add(classId)
    try {
      const result = await fetchClassById(classId, force)
      loadedClassDetails.value.add(classId)
      return result
    } finally {
      isLoadingClassDetails.value.delete(classId)
    }
  }

  async function ensureClassMissions(classId: string, force = false) {
    if (loadedClassMissions.value.has(classId) && !force) {
      const cached = classMissions.value.get(classId) || []
      return { missions: cached, total: cached.length }
    }
    return await fetchClassMissions(classId, force)
  }

  async function ensureClassRanking(classId: string, filter = 'general', force = false) {
    const cacheKey = `${classId}-${filter}`
    if (loadedClassRankings.value.has(cacheKey) && !force) {
      const cached = classRankings.value.get(cacheKey)
      if (cached) return cached
    }
    return await fetchClassRanking(classId, filter, force)
  }

  async function ensureClassGuide(classId: string, force = false) {
    if (loadedClassGuides.value.has(classId) && !force) {
      return { guide: classGuides.value.get(classId) || null }
    }
    return await fetchClassGuide(classId, force)
  }

  async function ensureStudentById(studentId: string, force = false) {
    if (loadedStudentDetails.value.has(studentId) && !force) {
      return studentDetails.value.get(studentId)
    }
    if (isLoadingStudentDetails.value.has(studentId)) return
    isLoadingStudentDetails.value.add(studentId)
    try {
      return await fetchStudentById(studentId, force)
    } finally {
      isLoadingStudentDetails.value.delete(studentId)
    }
  }

  async function ensureArchivedClasses(force = false) {
    if (hasLoadedArchivedClasses.value && !force) {
      return { classes: archivedClasses.value, total: archivedClasses.value.length }
    }
    if (isLoadingArchivedClasses.value) {
      return { classes: archivedClasses.value, total: archivedClasses.value.length }
    }
    return await fetchArchivedClasses(force)
  }

  /**
   * Refresca todos los datos del dashboard
   */
  async function refreshDashboard() {
    await Promise.all([
      fetchStats(true), // Force refresh
      fetchClasses(undefined, true), // Force refresh ALL classes
      fetchActivities(50, true), // Force refresh activities
      fetchRecentMissions(undefined, true), // Force refresh ALL missions
    ])
  }

  /**
   * Limpia el estado del store
   */
  function $reset() {
    stats.value = null
    classes.value = []
    archivedClasses.value = []
    students.value = []
    studentsTotal.value = 0
    studentsTotalPages.value = 1
    studentCounts.value = { active: 0, archived: 0 }
    studentListKey = ''
    dropStudentListRequest()
    activities.value = []
    recentMissions.value = []
    isLoadingStats.value = false
    isLoadingClasses.value = false
    isLoadingArchivedClasses.value = false
    isLoadingStudents.value = false
    isLoadingActivities.value = false
    isLoadingMissions.value = false
    // Per-class data
    classStudents.value.clear()
    classMissions.value.clear()
    classGuides.value.clear()
    classRankings.value.clear()
    studentDetails.value.clear()
    // Cache flags
    hasLoadedStats.value = false
    hasLoadedClasses.value = false
    hasLoadedArchivedClasses.value = false
    hasLoadedStudents.value = false
    hasLoadedActivities.value = false
    hasLoadedMissions.value = false
    // Per-class cache flags
    loadedClassStudents.value.clear()
    loadedClassMissions.value.clear()
    loadedClassGuides.value.clear()
    loadedClassRankings.value.clear()
    loadedClassDetails.value.clear()
    loadedStudentDetails.value.clear()
    // In-flight guards
    isLoadingClassDetails.value.clear()
    isLoadingStudentDetails.value.clear()
  }

  return {
    // State
    stats,
    classes,
    archivedClasses,
    students,
    studentsTotal,
    studentsTotalPages,
    studentCounts,
    activities,
    recentMissions,
    isLoadingStats,
    isLoadingClasses,
    isLoadingArchivedClasses,
    isLoadingStudents,
    isLoadingActivities,
    isLoadingMissions,
    // Per-class data
    classStudents,
    classMissions,
    classGuides,
    classRankings,
    studentDetails,
    // Fetched flags (cache de sesión)
    hasLoadedStats,
    hasLoadedClasses,
    hasLoadedArchivedClasses,
    hasLoadedStudents,
    hasLoadedActivities,
    hasLoadedMissions,
    loadedClassStudents,
    loadedClassMissions,
    loadedClassGuides,
    loadedClassRankings,
    loadedClassDetails,
    loadedStudentDetails,
    // Actions
    fetchStats,
    fetchClasses,
    fetchClassById,
    fetchStudents,
    fetchStudentList,
    fetchActivities,
    fetchRecentMissions,
    fetchArchivedClasses,
    fetchStudentById,
    createClass,
    updateClass,
    publishTemplate,
    setClassArchived,
    duplicateClass,
    getInvitationCode,
    fetchClassMissions,
    fetchClassGuide,
    updateClassGuideCache,
    fetchClassRanking,
    refreshDashboard,
    // Clases a las que ya no se llega y acceso propio
    isClassGone,
    forgetClass,
    cachedClassAccess,
    setClassAccess,
    canCreateMissions,
    classAccessRevision,
    markClassAccessChanged,
    // Profesorado e historial de una clase
    fetchClassTeachers,
    addClassTeacher,
    updateClassTeacher,
    removeClassTeacher,
    leaveClass,
    transferClass,
    fetchClassHistory,
    // Ensure wrappers (patrón canónico — usar desde la UI)
    ensureStats,
    ensureClasses,
    ensureStudentList,
    ensureActivities,
    ensureRecentMissions,
    ensureTeacherClassById,
    ensureClassMissions,
    ensureClassRanking,
    ensureClassGuide,
    ensureStudentById,
    ensureArchivedClasses,
    // Alumnado de una clase
    proposeUsername,
    reviewManagedStudents,
    createManagedStudents,
    resetStudentPassword,
    updateStudentNickname,
    removeStudentFromClass,
    forgetStudent,
    $reset,
  }
})
