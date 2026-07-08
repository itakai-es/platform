import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type {
  Class,
  Student,
  TeacherStats,
  Activity,
  CreateClassData,
  UpdateClassData,
} from '~/types/teacher.types'
import type {
  JoinRequest,
  Invitation,
  SearchableStudent,
  InvitationResponse,
} from '~/types/enrollment.types'

export const useTeacherStore = defineStore('teacher', () => {
  // State
  const stats = ref<TeacherStats | null>(null)
  const classes = ref<Class[]>([])
  const archivedClasses = ref<Class[]>([])
  const students = ref<Student[]>([])
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
  const classSubmissions = ref<Map<string, any>>(new Map())
  const classAnalytics = ref<Map<string, any>>(new Map())

  // Cache flags (persist during session)
  const hasLoadedStats = ref(false)
  const hasLoadedClasses = ref(false)
  const hasLoadedArchivedClasses = ref(false)
  const hasLoadedStudents = ref(false)
  const hasLoadedActivities = ref(false)
  const hasLoadedMissions = ref(false)
  const hasLoadedTotalPending = ref(false)

  // Per-class cache flags
  const loadedClassStudents = ref<Set<string>>(new Set())
  const loadedClassMissions = ref<Set<string>>(new Set())
  const loadedClassGuides = ref<Set<string>>(new Set())
  const loadedClassRankings = ref<Set<string>>(new Set())
  // Per-id / per-classId fetched flags for new ensureX wrappers
  const loadedStudentDetails = ref<Set<string>>(new Set())
  const loadedClassSubmissions = ref<Set<string>>(new Set())
  const loadedClassAnalytics = ref<Set<string>>(new Set())
  const hasLoadedPendingRequests = ref<Set<string>>(new Set())
  const hasLoadedSentInvitations = ref<Set<string>>(new Set())
  // Per-classId fetched flag for the per-class ensureTeacherClassById wrapper
  const loadedClassDetails = ref<Set<string>>(new Set())

  // In-flight guards so concurrent ensureX calls don't fire duplicate fetches
  const isLoadingClassDetails = ref<Set<string>>(new Set())
  const isLoadingClassSubmissions = ref<Set<string>>(new Set())
  const isLoadingClassAnalytics = ref<Set<string>>(new Set())
  const isLoadingStudentDetails = ref<Set<string>>(new Set())
  const isLoadingTotalPending = ref(false)

  // Enrollment state
  const pendingRequests = ref<Record<string, JoinRequest[]>>({}) // Por classId
  const sentInvitations = ref<Record<string, Invitation[]>>({}) // Por classId
  const searchedStudents = ref<SearchableStudent[]>([])
  const isLoadingRequests = ref(false)
  const isLoadingInvitations = ref(false)
  const isSearchingStudents = ref(false)
  const totalPendingRequests = ref(0)

  // Computed
  const getTotalPendingRequests = computed(() => {
    return Object.values(pendingRequests.value)
      .flat()
      .filter(r => r.status === 'pending').length
  })

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
      throw error
    }
  }

  /**
   * Obtiene los estudiantes
   */
  async function fetchStudents(classId?: string, force = false) {
    // If filtering by classId, check per-class cache
    if (classId) {
      if (!force && loadedClassStudents.value.has(classId)) {
        const cached = classStudents.value.get(classId)
        if (cached) {
          return { students: cached, total: cached.length }
        }
      }
    } else {
      // No filter, check global cache
      if (!force && hasLoadedStudents.value) {
        return { students: students.value, total: students.value.length }
      }
    }

    try {
      isLoadingStudents.value = true
      const config = useRuntimeConfig()
      const response = await $fetch<{ students: Student[]; total: number }>(
        `${config.public.apiBase}/teacher/students`,
        {
          params: classId ? { classId } : undefined,
        }
      )

      if (classId) {
        // Store per-class data
        classStudents.value.set(classId, response.students)
        loadedClassStudents.value.add(classId)
      } else {
        // Store global data
        students.value = response.students
        hasLoadedStudents.value = true
      }

      return response
    } catch (error) {
      console.error('Error fetching students:', error)
      throw error
    } finally {
      isLoadingStudents.value = false
    }
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
      // Actualizar la clase en el array local
      const index = classes.value.findIndex(c => c.id === classId)
      if (index !== -1) {
        classes.value[index] = response.class
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
          classes.value[index] = response.class
        }
      } else if (!response.class.archived) {
        classes.value.unshift(response.class)
      }

      return response
    } catch (error) {
      console.error('Error archiving class:', error)
      throw error
    }
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
  // ENROLLMENT SYSTEM - Join Requests & Invitations
  // ==========================================

  /**
   * Obtiene las solicitudes pendientes de una clase
   */
  async function fetchPendingRequests(classId: string) {
    try {
      isLoadingRequests.value = true
      const config = useRuntimeConfig()
      const response = await $fetch<{ requests: JoinRequest[]; total: number }>(
        `${config.public.apiBase}/teacher/classes/${classId}/requests`
      )
      pendingRequests.value[classId] = response.requests || []
      return response
    } catch (error) {
      console.error('Error fetching pending requests:', error)
      throw error
    } finally {
      isLoadingRequests.value = false
    }
  }

  /**
   * Acepta una solicitud de unión
   */
  async function acceptJoinRequest(classId: string, requestId: string) {
    try {
      const config = useRuntimeConfig()
      const response = await $fetch<{ success: boolean; message: string }>(
        `${config.public.apiBase}/teacher/classes/${classId}/requests/${requestId}/accept`,
        { method: 'PUT' }
      )

      // Remove from local state
      if (pendingRequests.value[classId]) {
        pendingRequests.value[classId] = pendingRequests.value[classId].filter(
          r => r.id !== requestId
        )
      }

      // Update class student count
      const classIndex = classes.value.findIndex(c => c.id === classId)
      if (classIndex !== -1) {
        classes.value[classIndex].studentCount++
      }

      return response
    } catch (error) {
      console.error('Error accepting join request:', error)
      throw error
    }
  }

  /**
   * Rechaza una solicitud de unión
   */
  async function rejectJoinRequest(classId: string, requestId: string, reason?: string) {
    try {
      const config = useRuntimeConfig()
      const response = await $fetch<{ success: boolean; message: string }>(
        `${config.public.apiBase}/teacher/classes/${classId}/requests/${requestId}/reject`,
        {
          method: 'PUT',
          body: { reason },
        }
      )

      // Remove from local state
      if (pendingRequests.value[classId]) {
        pendingRequests.value[classId] = pendingRequests.value[classId].filter(
          r => r.id !== requestId
        )
      }

      return response
    } catch (error) {
      console.error('Error rejecting join request:', error)
      throw error
    }
  }

  /**
   * Busca estudiantes para invitar
   */
  async function searchStudents(classId: string, query: string) {
    try {
      isSearchingStudents.value = true
      const config = useRuntimeConfig()
      const response = await $fetch<{ students: SearchableStudent[]; total: number }>(
        `${config.public.apiBase}/teacher/students/search`,
        {
          params: { q: query, classId },
        }
      )
      searchedStudents.value = response.students || []
      return response
    } catch (error) {
      console.error('Error searching students:', error)
      searchedStudents.value = []
      throw error
    } finally {
      isSearchingStudents.value = false
    }
  }

  /**
   * Envía una invitación a un estudiante
   */
  async function sendInvitation(
    classId: string,
    studentId: string,
    message?: string
  ): Promise<InvitationResponse> {
    try {
      const config = useRuntimeConfig()
      const response = await $fetch<InvitationResponse>(
        `${config.public.apiBase}/teacher/classes/${classId}/invitations`,
        {
          method: 'POST',
          body: { studentId, message },
        }
      )

      // Add to local state
      if (response.invitation) {
        if (!sentInvitations.value[classId]) {
          sentInvitations.value[classId] = []
        }
        sentInvitations.value[classId].push(response.invitation)
      }

      // Update searched student state
      const studentIndex = searchedStudents.value.findIndex(s => s.id === studentId)
      if (studentIndex !== -1) {
        searchedStudents.value[studentIndex].hasPendingInvitation = true
      }

      return response
    } catch (error) {
      console.error('Error sending invitation:', error)
      throw error
    }
  }

  /**
   * Obtiene las invitaciones enviadas de una clase
   */
  async function fetchSentInvitations(classId: string) {
    try {
      isLoadingInvitations.value = true
      const config = useRuntimeConfig()
      const response = await $fetch<{ invitations: Invitation[]; total: number }>(
        `${config.public.apiBase}/teacher/classes/${classId}/invitations`
      )
      sentInvitations.value[classId] = response.invitations || []
      return response
    } catch (error) {
      console.error('Error fetching sent invitations:', error)
      throw error
    } finally {
      isLoadingInvitations.value = false
    }
  }

  /**
   * Obtiene el conteo total de solicitudes pendientes
   */
  async function fetchTotalPendingRequests() {
    try {
      const config = useRuntimeConfig()
      const response = await $fetch<{ pendingRequests: number }>(
        `${config.public.apiBase}/teacher/enrollment-counts`
      )
      totalPendingRequests.value = response.pendingRequests
      return response.pendingRequests
    } catch (error) {
      console.error('Error fetching pending requests count:', error)
      return 0
    }
  }

  /**
   * Limpia los resultados de búsqueda
   */
  function clearSearchResults() {
    searchedStudents.value = []
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

  /**
   * Obtiene las entregas (submissions) pendientes de una clase. Cacheadas por classId.
   * Llama al endpoint real `/submissions/classes/:classId?status=pendiente`.
   */
  async function fetchClassSubmissions(classId: string, force = false) {
    if (!force && loadedClassSubmissions.value.has(classId)) {
      const cached = classSubmissions.value.get(classId)
      if (cached) return cached
    }
    try {
      const config = useRuntimeConfig()
      const response = await $fetch<{ submissions: any[]; total: number }>(
        `${config.public.apiBase}/submissions/classes/${classId}`,
        { params: { status: 'pendiente' } }
      )
      classSubmissions.value.set(classId, response)
      loadedClassSubmissions.value.add(classId)
      return response
    } catch (error) {
      console.error('Error fetching class submissions:', error)
      throw error
    }
  }

  /**
   * Elimina una entrega de la cache local de submissions de una clase, p.ej. después
   * de aprobarla. No invalida el flag fetched para no forzar refetch.
   */
  function removeSubmissionFromCache(classId: string, submissionId: string) {
    const cached = classSubmissions.value.get(classId)
    if (!cached || !cached.submissions) return
    const next = {
      ...cached,
      submissions: cached.submissions.filter((s: any) => s.id !== submissionId),
    }
    next.total = next.submissions.length
    classSubmissions.value.set(classId, next)
  }

  /**
   * Obtiene la analítica de una clase. Cacheada por classId.
   *
   * Como no existe un endpoint dedicado de analítica, agregamos los datos a
   * partir de la clase + sus misiones + el detalle por misión (enigmas con
   * pendientes/total de submissions). El resultado tiene la forma:
   *   { className: string, enigmaRows: EnigmaRow[] }
   */
  async function fetchClassAnalytics(classId: string, force = false) {
    if (!force && loadedClassAnalytics.value.has(classId)) {
      const cached = classAnalytics.value.get(classId)
      if (cached) return cached
    }
    try {
      const config = useRuntimeConfig()

      const [classData, missionsResponse] = await Promise.all([
        fetchClassById(classId, force),
        fetchClassMissions(classId, force),
      ])

      const className = classData?.name || ''
      const missions = (missionsResponse?.missions || []) as Array<{
        id: string
        title: string
      }>

      const details = await Promise.all(
        missions.map(mission =>
          $fetch<{
            mission: {
              id: string
              title: string
              enigmas: Array<{
                id: string
                title: string
                pendingSubmissions?: number
                totalSubmissions?: number
              }>
            }
          }>(`${config.public.apiBase}/missions/${mission.id}`)
        )
      )

      const enigmaRows = details.flatMap(detail =>
        (detail.mission.enigmas || []).map(enigma => {
          const totalSubmissions = enigma.totalSubmissions || 0
          const pendingSubmissions = enigma.pendingSubmissions || 0
          const riskScore =
            totalSubmissions > 0
              ? Math.round((pendingSubmissions / totalSubmissions) * 100)
              : pendingSubmissions > 0
                ? 100
                : 0

          return {
            id: enigma.id,
            title: enigma.title,
            missionTitle: detail.mission.title,
            pendingSubmissions,
            totalSubmissions,
            riskScore,
          }
        })
      )

      const response = { className, enigmaRows }
      classAnalytics.value.set(classId, response)
      loadedClassAnalytics.value.add(classId)
      return response
    } catch (error) {
      console.error('Error fetching class analytics:', error)
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

  async function ensureStudents(force = false) {
    if (hasLoadedStudents.value && !force) {
      return { students: students.value, total: students.value.length }
    }
    return await fetchStudents(undefined, force)
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

  async function ensureClassSubmissions(classId: string, force = false) {
    if (loadedClassSubmissions.value.has(classId) && !force) {
      return classSubmissions.value.get(classId)
    }
    if (isLoadingClassSubmissions.value.has(classId)) return
    isLoadingClassSubmissions.value.add(classId)
    try {
      return await fetchClassSubmissions(classId, force)
    } finally {
      isLoadingClassSubmissions.value.delete(classId)
    }
  }

  async function ensureClassAnalytics(classId: string, force = false) {
    if (loadedClassAnalytics.value.has(classId) && !force) {
      return classAnalytics.value.get(classId)
    }
    if (isLoadingClassAnalytics.value.has(classId)) return
    isLoadingClassAnalytics.value.add(classId)
    try {
      return await fetchClassAnalytics(classId, force)
    } finally {
      isLoadingClassAnalytics.value.delete(classId)
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

  async function ensurePendingRequests(classId: string, force = false) {
    if (hasLoadedPendingRequests.value.has(classId) && !force) {
      return {
        requests: pendingRequests.value[classId] || [],
        total: (pendingRequests.value[classId] || []).length,
      }
    }
    if (isLoadingRequests.value) return
    const response = await fetchPendingRequests(classId)
    hasLoadedPendingRequests.value.add(classId)
    return response
  }

  async function ensureSentInvitations(classId: string, force = false) {
    if (hasLoadedSentInvitations.value.has(classId) && !force) {
      return {
        invitations: sentInvitations.value[classId] || [],
        total: (sentInvitations.value[classId] || []).length,
      }
    }
    if (isLoadingInvitations.value) return
    const response = await fetchSentInvitations(classId)
    hasLoadedSentInvitations.value.add(classId)
    return response
  }

  async function ensureTotalPendingRequests(force = false) {
    if (hasLoadedTotalPending.value && !force) return totalPendingRequests.value
    if (isLoadingTotalPending.value) return totalPendingRequests.value
    isLoadingTotalPending.value = true
    try {
      const result = await fetchTotalPendingRequests()
      hasLoadedTotalPending.value = true
      return result
    } finally {
      isLoadingTotalPending.value = false
    }
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
    classSubmissions.value.clear()
    classAnalytics.value.clear()
    // Cache flags
    hasLoadedStats.value = false
    hasLoadedClasses.value = false
    hasLoadedArchivedClasses.value = false
    hasLoadedStudents.value = false
    hasLoadedActivities.value = false
    hasLoadedMissions.value = false
    hasLoadedTotalPending.value = false
    // Per-class cache flags
    loadedClassStudents.value.clear()
    loadedClassMissions.value.clear()
    loadedClassGuides.value.clear()
    loadedClassRankings.value.clear()
    loadedClassDetails.value.clear()
    loadedStudentDetails.value.clear()
    loadedClassSubmissions.value.clear()
    loadedClassAnalytics.value.clear()
    hasLoadedPendingRequests.value.clear()
    hasLoadedSentInvitations.value.clear()
    // In-flight guards
    isLoadingClassDetails.value.clear()
    isLoadingClassSubmissions.value.clear()
    isLoadingClassAnalytics.value.clear()
    isLoadingStudentDetails.value.clear()
    isLoadingTotalPending.value = false
    // Enrollment state
    pendingRequests.value = {}
    sentInvitations.value = {}
    searchedStudents.value = []
    isLoadingRequests.value = false
    isLoadingInvitations.value = false
    isSearchingStudents.value = false
    totalPendingRequests.value = 0
  }

  return {
    // State
    stats,
    classes,
    archivedClasses,
    students,
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
    classSubmissions,
    classAnalytics,
    // Fetched flags (cache de sesión)
    hasLoadedStats,
    hasLoadedClasses,
    hasLoadedArchivedClasses,
    hasLoadedStudents,
    hasLoadedActivities,
    hasLoadedMissions,
    hasLoadedTotalPending,
    hasLoadedPendingRequests,
    hasLoadedSentInvitations,
    loadedClassStudents,
    loadedClassMissions,
    loadedClassGuides,
    loadedClassRankings,
    loadedClassDetails,
    loadedStudentDetails,
    loadedClassSubmissions,
    loadedClassAnalytics,
    // Enrollment state
    pendingRequests,
    sentInvitations,
    searchedStudents,
    isLoadingRequests,
    isLoadingInvitations,
    isSearchingStudents,
    totalPendingRequests,
    // Computed
    getTotalPendingRequests,
    // Actions
    fetchStats,
    fetchClasses,
    fetchClassById,
    fetchStudents,
    fetchActivities,
    fetchRecentMissions,
    fetchArchivedClasses,
    fetchStudentById,
    fetchClassSubmissions,
    removeSubmissionFromCache,
    fetchClassAnalytics,
    createClass,
    updateClass,
    publishTemplate,
    setClassArchived,
    getInvitationCode,
    fetchClassMissions,
    fetchClassGuide,
    updateClassGuideCache,
    fetchClassRanking,
    refreshDashboard,
    // Ensure wrappers (patrón canónico — usar desde la UI)
    ensureStats,
    ensureClasses,
    ensureStudents,
    ensureActivities,
    ensureRecentMissions,
    ensureTeacherClassById,
    ensureClassMissions,
    ensureClassRanking,
    ensureClassGuide,
    ensureStudentById,
    ensureClassSubmissions,
    ensureClassAnalytics,
    ensureArchivedClasses,
    ensurePendingRequests,
    ensureSentInvitations,
    ensureTotalPendingRequests,
    // Enrollment actions
    fetchPendingRequests,
    acceptJoinRequest,
    rejectJoinRequest,
    searchStudents,
    sendInvitation,
    fetchSentInvitations,
    fetchTotalPendingRequests,
    clearSearchResults,
    $reset,
  }
})
