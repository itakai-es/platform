/**
 * useStudentClassDetail — estado compartido del detalle de clase del alumno.
 *
 * Equivalente a `useTeacherClassDetail` para el lado del alumno. Centraliza
 * los datos que necesitan varias pestañas (clase, settings, gamificación,
 * misiones, guía, badges, actividades) y los fetches que las disparan, para
 * que cada subruta no tenga que repetir loaders ni reinventar fetches.
 *
 * Las tabs específicas (Ranking, Avatar) disparan sus propios fetches
 * diferidos a través de `loadRanking()` / `loadAvatarGuides()` en su
 * onMounted; las demás aprovechan la carga inicial de `loadAll()`.
 */
import { resolveClassSettings } from '~/utils/class-settings'

interface UIState {
  classNickname: string
  originalNickname: string
  rankingData: any | null
  rankingFetched: boolean
  isLoadingRanking: boolean
  activeRankingFilter: string
  rankingFilters: { id: string; label: string }[]
}

function emptyUI(): UIState {
  return {
    classNickname: '',
    originalNickname: '',
    rankingData: null,
    rankingFetched: false,
    isLoadingRanking: false,
    activeRankingFilter: 'general',
    rankingFilters: [],
  }
}

export function useStudentClassDetail(classIdRef: Ref<string> | ComputedRef<string> | string) {
  const classId = computed(() => unref(classIdRef))
  const config = useRuntimeConfig()

  const classesStore = useClassesStore()
  const classGamificationStore = useClassGamificationStore()
  const gamificationStore = useGamificationStore()
  const shopStore = useShopStore()

  // Estado de UI local del detalle (ranking lazy + nickname editable + filtros).
  // Por classId con `useState` para sobrevivir a SSR.
  const ui = useState<UIState>(`studentClassDetail:${classId.value}`, emptyUI)

  // Datos vivos del store (no se duplican; aquí solo se exponen).
  const selectedClass = computed(() => classesStore.selectedClass)
  const classData = computed(() => selectedClass.value as any)
  const classSettings = computed(() => resolveClassSettings(classData.value?.settings))
  const classMissions = computed(() => classesStore.classMissions)
  const classGuide = computed(() => classesStore.classGuides.get(classId.value) || null)
  const currentClassBadges = computed(() => classesStore.classBadges.get(classId.value) || [])
  const recentActivities = computed(() => classesStore.classActivities.get(classId.value) || [])

  const classGamification = computed(() => classGamificationStore.getClassData(classId.value))
  const studentAvatar = computed(() => classGamification.value?.avatar || '/app/avatars/atenea.svg')

  // Saldos del header (gateados por settings; lives cae a 100 si no hay backend aún).
  const shopBalance = computed(() => shopStore.getBalance(classId.value))
  const manaBalance = computed(() => shopStore.getMana(classId.value))
  const livesBalance = computed(() => classData.value?.lives ?? 100)

  // Loaders compartidos
  const ACTIVITIES_LIMIT = 10
  async function loadAll(force = false) {
    // Sin acceso a la clase (ya no está en ella, o la clase está archivada o en
    // la papelera) la API responde 404: la página enseña el error que deja el
    // store y no se pide nada más. La tienda va en paralelo y, si falla, el
    // saldo no sale; ninguno de los dos fallos queda como promesa sin atender.
    void shopStore.fetchStudentShop(classId.value).catch(() => {})
    try {
      await classesStore.fetchStudentClassById(classId.value, true)
    } catch {
      return
    }
    await Promise.all([
      classesStore.fetchClassMissions(classId.value),
      classesStore.fetchClassGuide(classId.value),
      classesStore.fetchClassBadges(classId.value),
      classesStore.fetchClassActivities(classId.value, 0, ACTIVITIES_LIMIT),
      classGamificationStore.fetchClassXp(classId.value, force),
      gamificationStore.fetchGuides(),
    ])
  }

  /** Idempotente: salta si el ranking ya está cargado. `force=true` lo recarga. */
  async function ensureRanking(force = false) {
    if (ui.value.rankingFetched && !force) return
    if (ui.value.isLoadingRanking) return
    ui.value.isLoadingRanking = true
    try {
      const response = await $fetch<any>(
        `${config.public.apiBase}/students/classes/${classId.value}/ranking?filter=${ui.value.activeRankingFilter}`
      )
      ui.value.rankingData = response
      ui.value.rankingFetched = true
      if (response.filters) ui.value.rankingFilters = response.filters
    } catch (err) {
      console.error('Error fetching ranking:', err)
    } finally {
      ui.value.isLoadingRanking = false
    }
  }

  /** Idempotente: la propia store cachea, así que solo llamamos si está vacío. */
  async function ensureAvatarGuides() {
    if (gamificationStore.guides.length === 0) {
      await gamificationStore.fetchGuides()
    }
  }

  // Resuelve la URL de la imagen de portada (relativa → absoluta).
  const resolvedClassImage = computed(() => {
    const url = classData.value?.backgroundImage
    if (!url) return ''
    if (url.startsWith('http') || url.startsWith('/app/')) return url
    return `${config.public.apiBase}${url}`
  })

  return {
    classId,
    ui,
    // Datos
    classData,
    classSettings,
    classMissions,
    classGuide,
    currentClassBadges,
    recentActivities,
    classGamification,
    studentAvatar,
    shopBalance,
    manaBalance,
    livesBalance,
    resolvedClassImage,
    // Loaders
    loadAll,
    ensureRanking,
    ensureAvatarGuides,
  }
}
