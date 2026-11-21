import type { HelpArticleCard, HelpCategoryRef, HelpScope } from '~/types/help.types'
import {
  HELP_COURSES,
  helpCourse,
  helpCoursesWithLesson,
  type HelpCourse,
} from '~/utils/help-courses'
import { helpArticlePath } from '~/utils/help-area'

/** Una lección ya resuelta contra el índice: el artículo y su categoría. */
export interface HelpCourseLesson {
  number: number
  article: HelpArticleCard
  category: HelpCategoryRef
  /** Ruta del artículo dentro del curso (lleva `?curso=`). */
  to: string
}

export interface ResolvedHelpCourse extends HelpCourse {
  title: string
  description: string
  items: HelpCourseLesson[]
  /** Suma de la duración de los vídeos de sus lecciones, en segundos (0 si no se sabe). */
  videoSeconds: number
  /** Lecciones con vídeo. */
  videoCount: number
}

/** Cómo va un curso en este navegador. */
export interface HelpCourseProgress {
  /** Lecciones terminadas. */
  done: number
  total: number
  /** 0–100, redondeado. */
  percent: number
  started: boolean
  finished: boolean
}

/**
 * Lo que se recuerda de cada curso, solo en este navegador:
 * - `completed`: lecciones terminadas al acabar el vídeo o marcadas a mano.
 * - `last`: la última lección abierta, para «Continuar».
 */
interface CourseState {
  completed: string[]
  last?: string
}

type CourseProgressStore = Record<string, CourseState>

/** Por dónde va cada vídeo, en segundos, por id de artículo (vale dentro y fuera de los cursos). */
type VideoPositions = Record<string, number>

const PROGRESS_KEY = 'itakai.help.course-progress.v2'
/** La versión anterior solo guardaba qué lecciones se habían abierto. */
const LEGACY_PROGRESS_KEY = 'itakai.help.course-progress'
const POSITIONS_KEY = 'itakai.help.video-positions'
const AUTOPLAY_KEY = 'itakai.help.course-autoplay'

function readJson<T extends object>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    return parsed && typeof parsed === 'object' ? (parsed as T) : null
  } catch {
    return null
  }
}

function writeJson(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    // Sin almacenamiento (modo privado, bloqueado): se recuerda solo en esta visita.
  }
}

/** Del formato anterior se conserva el último acceso. Abrir una lección no la completa. */
function readProgress(): CourseProgressStore {
  const current = readJson<CourseProgressStore>(PROGRESS_KEY)
  if (current) return current
  const legacy = readJson<Record<string, string[]>>(LEGACY_PROGRESS_KEY)
  if (!legacy) return {}
  const migrated: CourseProgressStore = {}
  for (const [slug, ids] of Object.entries(legacy)) {
    const last = Array.isArray(ids) ? ids.filter(id => typeof id === 'string').at(-1) : undefined
    if (last) migrated[slug] = { completed: [], last }
  }
  writeJson(PROGRESS_KEY, migrated)
  return migrated
}

/**
 * useHelpCourses — los cursos del centro de ayuda, resueltos contra el índice
 * que ya carga `useHelp` (no pide nada más al servidor), y el progreso de cada
 * curso en este navegador.
 *
 * Las lecciones se buscan en el índice completo, no en el de la portada
 * activa: un curso se lee entero aunque se haya entrado desde la otra portada.
 */
export function useHelpCourses() {
  const { t } = useI18n()
  const help = useHelp('ayuda')
  const mediaBase = useRuntimeConfig().public.helpMediaBase.replace(/\/$/, '')

  const lessonPath = (course: string, categoria: string, articulo: string) =>
    `${helpArticlePath('ayuda', categoria, articulo)}?curso=${encodeURIComponent(course)}`

  const resolve = (course: HelpCourse): ResolvedHelpCourse => {
    const categories = help.index.value?.categories ?? []
    const items: HelpCourseLesson[] = []
    for (const ref of course.lessons) {
      const category = categories.find(c => c.slug === ref.categoria)
      const article = category?.articles.find(a => a.slug === ref.articulo)
      if (!category || !article) continue
      items.push({
        number: items.length + 1,
        article,
        category: {
          slug: category.slug,
          name: category.name,
          icon: category.icon,
          accent: category.accent,
        },
        to: lessonPath(course.slug, category.slug, article.slug),
      })
    }
    const videos = items.filter(item => item.article.hasVideo)
    return {
      ...course,
      cover: `${mediaBase}/${course.cover}`,
      title: t(`common.help.courses.items.${course.slug}.title`),
      description: t(`common.help.courses.items.${course.slug}.description`),
      items,
      videoSeconds: videos.reduce((sum, item) => sum + (item.article.videoDuration ?? 0), 0),
      videoCount: videos.length,
    }
  }

  // ---- progreso (solo en este navegador) ----

  /**
   * Se lee al montar: sin cuenta no hay otro sitio donde guardarlo. Si el
   * almacenamiento no está disponible, el curso funciona igual, solo que sin
   * recordar nada al volver.
   */
  const progress = useState<CourseProgressStore>('help-course-progress', () => ({}))
  const positions = useState<VideoPositions>('help-video-positions', () => ({}))
  const autoplay = useState<boolean>('help-course-autoplay', () => true)
  const progressLoaded = useState<boolean>('help-course-progress-loaded', () => false)

  const loadProgress = () => {
    if (progressLoaded.value || typeof window === 'undefined') return
    progress.value = readProgress()
    positions.value = readJson<VideoPositions>(POSITIONS_KEY) ?? {}
    try {
      autoplay.value = localStorage.getItem(AUTOPLAY_KEY) !== 'off'
    } catch {
      autoplay.value = true
    }
    progressLoaded.value = true
  }

  const stateOf = (courseSlug: string): CourseState => {
    const state = progress.value[courseSlug]
    return Array.isArray(state?.completed) ? state : { completed: [] }
  }

  const saveCourse = (courseSlug: string, state: CourseState) => {
    progress.value = { ...progress.value, [courseSlug]: state }
    writeJson(PROGRESS_KEY, progress.value)
  }

  /** Recuerda la última lección abierta para ofrecer «Continuar». */
  const markVisited = (courseSlug: string, articleId: string) => {
    loadProgress()
    const state = stateOf(courseSlug)
    if (state.last !== articleId) saveCourse(courseSlug, { ...state, last: articleId })
  }

  const setCompleted = (courseSlug: string, articleId: string, done: boolean) => {
    loadProgress()
    const state = stateOf(courseSlug)
    const has = state.completed.includes(articleId)
    if (has === done) return
    saveCourse(courseSlug, {
      ...state,
      completed: done
        ? [...state.completed, articleId]
        : state.completed.filter(id => id !== articleId),
    })
  }

  const isCompleted = (courseSlug: string, articleId: string) =>
    stateOf(courseSlug).completed.includes(articleId)

  const courseProgress = (course: ResolvedHelpCourse): HelpCourseProgress => {
    const state = stateOf(course.slug)
    const total = course.items.length
    const done = course.items.filter(item => state.completed.includes(item.article.id)).length
    return {
      done,
      total,
      percent: total ? Math.round((done / total) * 100) : 0,
      started: done > 0 || course.items.some(item => item.article.id === state.last),
      finished: total > 0 && done === total,
    }
  }

  /**
   * Por dónde seguir: la última lección abierta si no se terminó; si no, la
   * primera sin terminar a partir de ella. Null si no se ha empezado o si ya
   * están todas.
   */
  const resumeLesson = (course: ResolvedHelpCourse) => {
    const state = stateOf(course.slug)
    if (!state.completed.length && !state.last) return null
    const lastIndex = course.items.findIndex(item => item.article.id === state.last)
    if (lastIndex >= 0 && !state.completed.includes(state.last!)) return course.items[lastIndex]!
    const pending = (item: HelpCourseLesson) => !state.completed.includes(item.article.id)
    return (
      course.items.slice(Math.max(0, lastIndex)).find(pending) ?? course.items.find(pending) ?? null
    )
  }

  // ---- posición de cada vídeo ----

  const videoPosition = (articleId: string) => {
    const position = positions.value[articleId]
    return typeof position === 'number' && Number.isFinite(position) && position > 0 ? position : 0
  }

  /**
   * Guarda por dónde va un vídeo. Al acabar se borra para volver a empezar.
   */
  const saveVideoPosition = (articleId: string, seconds: number, duration: number) => {
    loadProgress()
    const keep = Number.isFinite(duration) && seconds > 5 && seconds < duration
    const rounded = Math.floor(seconds)
    if (keep && positions.value[articleId] === rounded) return
    if (!keep && !(articleId in positions.value)) return
    const { [articleId]: _previous, ...rest } = positions.value
    positions.value = keep ? { ...rest, [articleId]: rounded } : rest
    writeJson(POSITIONS_KEY, positions.value)
  }

  /** Fracción vista de un vídeo, para la barrita de su miniatura (0 si no hay nada guardado). */
  const videoFraction = (article: Pick<HelpArticleCard, 'id' | 'videoDuration'>) => {
    const seconds = videoPosition(article.id)
    return seconds && article.videoDuration ? Math.min(1, seconds / article.videoDuration) : 0
  }

  const setAutoplay = (value: boolean) => {
    autoplay.value = value
    try {
      localStorage.setItem(AUTOPLAY_KEY, value ? 'on' : 'off')
    } catch {
      // Sin almacenamiento: dura lo que dura la visita.
    }
  }

  // ---- cursos ----

  /** Los cursos con alguna lección publicada, filtrados por portada si se pide. */
  const coursesFor = (scope: HelpScope) =>
    HELP_COURSES.filter(course => scope === 'todo' || course.audience === scope)
      .map(resolve)
      .filter(course => course.items.length > 0)

  const courses = computed(() => coursesFor(help.scope.value))

  const getCourse = (slug: string) => {
    const course = helpCourse(slug)
    return course ? resolve(course) : null
  }

  /**
   * La posición de un artículo dentro de un curso, para la plantilla de
   * lección. Null si el curso no existe o el artículo no forma parte de él.
   */
  const lessonContext = (courseSlug: string | null, categoria: string, articulo: string) => {
    if (!courseSlug) return null
    const course = getCourse(courseSlug)
    if (!course) return null
    const index = course.items.findIndex(
      item => item.category.slug === categoria && item.article.slug === articulo
    )
    if (index < 0) return null
    return {
      course,
      current: course.items[index]!,
      previous: course.items[index - 1] ?? null,
      next: course.items[index + 1] ?? null,
    }
  }

  /** Los cursos (ya resueltos) que incluyen un artículo, con su número de lección. */
  const coursesWithArticle = (categoria: string, articulo: string) =>
    helpCoursesWithLesson(categoria, articulo)
      .map(resolve)
      .map(course => ({
        course,
        lesson: course.items.find(
          item => item.category.slug === categoria && item.article.slug === articulo
        ),
      }))
      .filter(
        (entry): entry is { course: ResolvedHelpCourse; lesson: HelpCourseLesson } => !!entry.lesson
      )

  onMounted(loadProgress)

  return {
    ...help,
    courses,
    coursesFor,
    getCourse,
    lessonContext,
    coursesWithArticle,
    markVisited,
    setCompleted,
    isCompleted,
    courseProgress,
    resumeLesson,
    videoPosition,
    saveVideoPosition,
    videoFraction,
    autoplay,
    setAutoplay,
  }
}
