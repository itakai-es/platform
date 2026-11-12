/**
 * useStudentClassDetail — estado compartido del detalle de clase del alumno.
 *
 * Equivalente a `useTeacherClassDetail` para el lado del alumno. Centraliza
 * los datos que necesitan varias pestañas (clase, settings, gamificación,
 * misiones, guía, actividades) y los fetches que las disparan, para
 * que cada subruta no tenga que repetir loaders ni reinventar fetches.
 *
 * La pestaña Ranking pide lo suyo con `ClassRankingBoard`, según el tipo y el
 * periodo que se miran; las demás aprovechan la carga inicial de `loadAll()`.
 */
import { resolveClassSettings } from '~/utils/class-settings'
import type { RankingType } from '~/utils/ranking-config'

export function useStudentClassDetail(classIdRef: Ref<string> | ComputedRef<string> | string) {
  const classId = computed(() => unref(classIdRef))
  const config = useRuntimeConfig()

  const classesStore = useClassesStore()
  const classGamificationStore = useClassGamificationStore()
  const shopStore = useShopStore()

  // Datos vivos del store (no se duplican; aquí solo se exponen).
  const selectedClass = computed(() => classesStore.selectedClass)
  const classData = computed(() => selectedClass.value as any)
  const classSettings = computed(() => resolveClassSettings(classData.value?.settings))
  /** Los tipos de ranking que ve; sin ninguno, la clase no tiene pestaña de ranking. */
  const rankingTypes = computed<RankingType[]>(() => classData.value?.rankingTypes ?? [])
  const classMissions = computed(() => classesStore.missionsByClass.get(classId.value) ?? [])
  const classGuide = computed(() => classesStore.classGuides.get(classId.value) || null)
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
      classesStore.fetchClassActivities(classId.value, 0, ACTIVITIES_LIMIT),
      // Si falla, el Resumen lo dice con su reintento (`error` del store).
      classGamificationStore.fetchClassXp(classId.value, force).catch(() => {}),
    ])
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
    // Datos
    classData,
    classSettings,
    rankingTypes,
    classMissions,
    classGuide,
    recentActivities,
    classGamification,
    studentAvatar,
    shopBalance,
    manaBalance,
    livesBalance,
    resolvedClassImage,
    // Loaders
    loadAll,
  }
}
