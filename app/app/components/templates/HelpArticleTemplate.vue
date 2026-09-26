<template>
  <div>
    <!-- Cabecera y lateral se pintan con lo que ya está en memoria: el índice
         del centro de ayuda trae los nombres de las categorías y los títulos de
         todos los artículos, así que al entrar desde la portada o desde una
         categoría no hay nada que esperar. El hueco solo sale cuando de verdad
         no se sabe: al abrir un enlace directo con la pestaña recién puesta. -->
    <PageHeader v-if="headerTitle" :breadcrumbs="breadcrumbs" :title="headerTitle" />
    <div v-else-if="!notFound" class="mb-8">
      <Skeleton width="w-72" height="h-4" custom-class="mb-4" />
      <Skeleton width="w-2/3" height="h-8" />
    </div>

    <!-- No existe o está sin publicar -->
    <EmptyState
      v-if="notFound"
      :icon="isBlog ? NewspaperIcon : BookOpenIcon"
      :title="t('common.help.not_found_title')"
      :description="notFoundDescription"
    />

    <div v-else class="grid gap-6 lg:grid-cols-[16rem_1fr]">
      <!-- Índice de la categoría, con su color de marca -->
      <aside class="lg:sticky lg:top-24 lg:self-start">
        <Card v-if="category" :type="helpCardType(category.accent)" padding="sm" gap="none">
          <div class="mb-3 flex items-center gap-2.5 px-1">
            <HelpCategoryIcon :icon="category.icon" size="md" on-card />
            <NuxtLink
              :to="categoryPath(category.slug)"
              class="min-w-0 truncate text-sm font-bold text-navy-700 hover:underline"
            >
              {{ category.name }}
            </NuxtLink>
          </div>

          <NuxtLink
            v-for="sibling in siblings"
            :key="sibling.id"
            :to="articlePath(category.slug, sibling.slug)"
            class="block rounded-xl px-3 py-2 text-sm leading-snug transition-colors"
            :class="
              sibling.slug === route.params.articulo
                ? 'bg-white font-semibold text-navy-700 shadow-sm'
                : 'text-navy-700 hover:bg-white'
            "
          >
            {{ sibling.title }}
          </NuxtLink>
        </Card>

        <Skeleton v-else height="h-80" custom-class="rounded-2xl" />

        <!-- Índice del propio artículo. Solo en pantallas anchas: en el móvil
             el lateral va encima del texto y estorbaría más que ayuda. -->
        <nav
          v-if="headings.length > 1"
          aria-labelledby="help-toc-title"
          class="mt-4 hidden rounded-2xl bg-surface p-3 shadow-lg lg:block"
        >
          <p
            id="help-toc-title"
            class="mb-1 px-2 text-xs font-semibold uppercase tracking-wider text-navy-700/70"
          >
            {{ t('common.help.on_this_page') }}
          </p>
          <a
            v-for="heading in headings"
            :key="heading.id"
            :href="`#${heading.id}`"
            class="block rounded-lg px-2 py-1.5 text-sm leading-snug text-navy-700/80 transition-colors hover:bg-bg-secondary hover:text-navy-700"
            @click="goToHeading($event, heading.id)"
          >
            {{ heading.text }}
          </a>
        </nav>
      </aside>

      <!-- Artículo -->
      <article class="min-w-0">
        <HelpArticleSkeleton v-if="!view || swapping" />

        <template v-else>
          <HelpArticleBody :article="view.article" :accent="category?.accent" :area="props.area" />

          <!-- Anterior y siguiente dentro de la categoría -->
          <nav
            v-if="previous || next"
            :aria-label="paginationLabel"
            class="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2"
          >
            <NuxtLink
              v-if="previous"
              :to="articlePath(category?.slug ?? '', previous.slug)"
              class="group flex min-w-0 items-center gap-3 rounded-2xl bg-surface px-4 py-3 shadow-lg transition-shadow hover:shadow-xl"
            >
              <ArrowLeftIcon
                class="h-4 w-4 shrink-0 text-navy-700/40 transition-colors group-hover:text-purple"
              />
              <span class="min-w-0">
                <span class="block text-xs font-medium text-navy-700/70">
                  {{ t('common.help.previous') }}
                </span>
                <span class="block truncate text-sm font-semibold text-navy-700">
                  {{ previous.title }}
                </span>
              </span>
            </NuxtLink>
            <span v-else class="hidden sm:block" />

            <NuxtLink
              v-if="next"
              :to="articlePath(category?.slug ?? '', next.slug)"
              class="group flex min-w-0 items-center gap-3 rounded-2xl bg-surface px-4 py-3 text-right shadow-lg transition-shadow hover:shadow-xl sm:col-start-2"
            >
              <span class="ml-auto min-w-0">
                <span class="block text-xs font-medium text-navy-700/70">
                  {{ t('common.help.next') }}
                </span>
                <span class="block truncate text-sm font-semibold text-navy-700">
                  {{ next.title }}
                </span>
              </span>
              <ArrowRightIcon
                class="h-4 w-4 shrink-0 text-navy-700/40 transition-colors group-hover:text-purple"
              />
            </NuxtLink>
          </nav>

          <!-- ¿Te ha resultado útil? Solo en la ayuda: el blog no es una pieza de soporte. -->
          <div
            v-if="!isBlog"
            class="mt-6 flex flex-wrap items-center gap-3 rounded-2xl bg-surface px-5 py-4 shadow-lg"
          >
            <template v-if="rated">
              <CheckCircleIcon class="h-5 w-5 shrink-0 text-mint" />
              <p class="text-sm font-medium text-navy-700">
                {{ t('common.help.feedback_thanks') }}
              </p>
            </template>
            <template v-else>
              <span class="text-sm font-medium text-navy-700">
                {{ t('common.help.feedback_question') }}
              </span>
              <div class="ml-auto flex items-center gap-2">
                <Button variant="outline" size="sm" @click="sendFeedback(true)">
                  {{ t('common.help.feedback_yes') }}
                </Button>
                <Button variant="outline" size="sm" @click="sendFeedback(false)">
                  {{ t('common.help.feedback_no') }}
                </Button>
              </div>
            </template>

            <!-- Si el artículo no ha servido, aquí es donde hace falta el
                 contacto: al final y sin tener que buscarlo en el pie. -->
            <p class="w-full border-t border-border-primary pt-3 text-sm text-navy-700/70">
              {{ t('common.help.still_stuck') }}
              <a
                href="https://gamifp.es/contacto/"
                target="_blank"
                rel="noopener noreferrer"
                class="font-semibold text-navy-700 underline underline-offset-2 hover:text-purple"
              >
                {{ t('common.help.contact_us') }}
                <span class="sr-only">{{ t('common.accessibility.opens_new_tab') }}</span>
              </a>
            </p>
          </div>

          <!-- Seguir leyendo -->
          <section v-if="related.length" class="mt-8">
            <h2 class="mb-3 text-lg font-bold text-navy-700">
              {{ t('common.help.keep_reading') }}
            </h2>
            <HelpArticleTiles
              v-if="isBlog"
              :articles="related"
              :category="view.category"
              area="blog"
            />
            <HelpArticleList v-else :articles="related" :category="view.category" />
          </section>
        </template>
      </article>
    </div>
  </div>
</template>

<script setup lang="ts">
import {
  ArrowLeftIcon,
  ArrowRightIcon,
  BookOpenIcon,
  CheckCircleIcon,
  NewspaperIcon,
} from '@heroicons/vue/24/outline'
import { helpCardType } from '~/utils/help-accents'
import { helpHeadings } from '~/utils/help-headings'
import type { HelpArea, HelpArticleView } from '~/types/help.types'

/**
 * Un artículo del centro de ayuda o una entrada del blog (Fase 3, puntos 17 y
 * B3). Las páginas de cada área lo montan con la suya.
 *
 * El cuerpo lo pinta `HelpArticleBody`, la misma pieza que usa la
 * previsualización del panel; aquí quedan la cabecera, el lateral, anterior y
 * siguiente, la valoración y «Seguir leyendo».
 *
 * El blog cambia tres cosas: el cuerpo lleva la fecha de publicación y la
 * firma, el lateral y «Seguir leyendo» van de lo más nuevo a lo más antiguo
 * (con tarjetas, como el resto del blog) y no hay «¿Te ha resultado útil?».
 */

const props = withDefaults(defineProps<{ area?: HelpArea }>(), { area: 'ayuda' })

const { t } = useI18n()
const route = useRoute()
const {
  isBlog,
  ensureIndex,
  getCategory,
  fetchArticle,
  rate,
  scope,
  portalPath,
  categoryPath,
  articlePath,
  sectionTitle,
  inferScope,
  ordered,
} = useHelp(props.area)

const view = ref<HelpArticleView | null>(null)
/** Primera carga: no hay nada en pantalla todavía. */
const pending = ref(true)
/** Cambio de un artículo a otro: solo se renueva el cuerpo. */
const swapping = ref(false)
const rated = ref(false)

/**
 * Carga el artículo **sin vaciar el anterior**: al saltar de un artículo a otro
 * desde el índice lateral, dejar `view` a null tiraba la cabecera, el lateral y
 * el cuerpo a la vez, y parecía que se recargaba la página entera. Aquí solo se
 * marca `swapping`, que vacía el cuerpo y deja el resto quieto.
 */
/**
 * Número de la carga vigente: al saltar deprisa entre artículos, una respuesta
 * atrasada no pinta su cuerpo bajo la URL del siguiente.
 */
let loadSeq = 0

const load = async () => {
  const seq = ++loadSeq
  pending.value = !view.value
  swapping.value = !!view.value
  rated.value = false
  try {
    const categoria = String(route.params.categoria)
    const articulo = String(route.params.articulo)
    const article = await fetchArticle(categoria, articulo)
    if (seq !== loadSeq) return
    // Al llegar por un enlace directo no hay portada elegida: la fija la
    // audiencia del artículo. Si cambia, se vuelve a pedir para que el lateral
    // y «Seguir leyendo» salgan ya filtrados.
    const before = scope.value
    inferScope(article.article.audience)
    const fresh = scope.value === before ? article : await fetchArticle(categoria, articulo)
    if (seq !== loadSeq) return
    view.value = fresh
    // Un enlace compartido a un apartado: el cuerpo acaba de pintarse, así que
    // es ahora cuando existe el apartado al que hay que bajar.
    if (route.hash) nextTick(() => scrollToHeading(route.hash.slice(1)))
  } catch {
    if (seq === loadSeq) view.value = null
  } finally {
    if (seq === loadSeq) {
      pending.value = false
      swapping.value = false
    }
  }
}

/**
 * Solo se recarga cuando cambia el artículo. Vigilar la ruta entera (o un array
 * con sus parámetros, que es nuevo en cada cambio) recargaba también al pulsar
 * un apartado del índice, que solo cambia el `#`: el cuerpo pasaba por el
 * esqueleto y la página daba saltos.
 */
watch(() => `${route.params.categoria}/${route.params.articulo}`, load)

onMounted(() => {
  load()
  // En paralelo, por si se ha entrado por un enlace directo: con el índice en
  // memoria la cabecera y el lateral se pintan sin esperar al artículo.
  ensureIndex()
})

/** La categoría de la URL, según el índice ya cargado. */
const indexed = computed(() => getCategory(String(route.params.categoria)))

/**
 * La categoría del artículo: la que trae el artículo cargado y, mientras llega,
 * la del índice. Da igual cuál de las dos sea: el nombre, el icono y el color
 * son los mismos.
 */
const category = computed(() => view.value?.category ?? indexed.value ?? null)

/**
 * Los artículos del lateral, de donde primero se sepan, en el orden de lectura
 * del área (la API los manda en el del panel; el índice ya viene ordenado).
 */
const siblings = computed(() =>
  view.value ? ordered(view.value.siblings) : (indexed.value?.articles ?? [])
)

/**
 * «Seguir leyendo»: los siguientes de la misma categoría. En la ayuda, los que
 * elige la API; en el blog, los más recientes, que es lo que se espera leer.
 */
const related = computed(() => {
  if (!view.value) return []
  if (!isBlog) return view.value.related
  const current = view.value.article.id
  return siblings.value.filter(sibling => sibling.id !== current).slice(0, 3)
})

/**
 * El título del artículo que se está mirando, sin esperar al servidor: sale de
 * la lista de hermanos o del índice. Solo devuelve vacío si no está en ninguno,
 * y entonces la página pinta su hueco.
 */
const headerTitle = computed(() => {
  const slug = String(route.params.articulo)
  if (view.value?.article.slug === slug) return view.value.article.title
  return siblings.value.find(sibling => sibling.slug === slug)?.title ?? ''
})

/** La posición del artículo dentro de su categoría, para anterior y siguiente. */
const position = computed(() =>
  siblings.value.findIndex(sibling => sibling.slug === String(route.params.articulo))
)

/** El artículo que queda a `offset` puestos en la lista de hermanos, si lo hay. */
function siblingAt(offset: number) {
  if (position.value < 0) return null
  return siblings.value[position.value + offset] ?? null
}

/*
 * En la ayuda, anterior y siguiente siguen el orden del panel. En el blog la
 * lista va de la más nueva a la más antigua, y «Anterior» es la publicada
 * antes: la que viene detrás en la lista.
 */
const previous = computed(() => siblingAt(isBlog ? 1 : -1))

const next = computed(() => siblingAt(isBlog ? -1 : 1))

/** Ni cargando ni cargado: el artículo no existe o está sin publicar. */
const notFound = computed(() => !pending.value && !swapping.value && !view.value)

const notFoundDescription = computed(() =>
  isBlog ? t('common.blog.not_found_description') : t('common.help.not_found_description')
)

const paginationLabel = computed(() =>
  isBlog ? t('common.blog.post_pagination') : t('common.help.article_pagination')
)

const breadcrumbs = computed(() => [
  { label: sectionTitle.value, to: portalPath(scope.value) },
  ...(category.value
    ? [{ label: category.value.name, to: categoryPath(category.value.slug) }]
    : []),
  ...(headerTitle.value ? [{ label: headerTitle.value }] : []),
])

/**
 * Los apartados del artículo, para el índice «En esta página» del lateral. Un
 * apartado sin texto conserva su anclaje en el cuerpo, pero no se lista.
 */
const headings = computed(() =>
  view.value ? helpHeadings(view.value.article.body).filter(heading => heading.text) : []
)

/**
 * Baja hasta un apartado y le pasa el foco, para que el teclado y el lector de
 * pantalla sigan desde ahí. El desplazamiento lo decide el CSS: suave, salvo
 * con «menos animación».
 */
const scrollToHeading = (id: string) => {
  const target = document.getElementById(id)
  if (!target) return false
  target.setAttribute('tabindex', '-1')
  target.scrollIntoView({ block: 'start' })
  target.focus({ preventScroll: true })
  return true
}

/**
 * Un apartado del índice. Se baja aquí mismo en vez de dejarlo al navegador:
 * así hay un solo desplazamiento, y el `#` se cambia sin pasar por el router ni
 * apilar una entrada por apartado en el historial, de modo que «Atrás» sigue
 * llevando a la página anterior. Con Ctrl, Mayúsculas o la rueda, el enlace se
 * comporta como siempre (abrir en otra pestaña, copiar…).
 */
const goToHeading = (event: MouseEvent, id: string) => {
  if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
    return
  }
  if (!scrollToHeading(id)) return
  event.preventDefault()
  history.replaceState(history.state, '', `#${encodeURIComponent(id)}`)
}

const sendFeedback = async (helpful: boolean) => {
  rated.value = true
  if (view.value) await rate(view.value.article.id, helpful)
}

const metaDescription = computed(() =>
  isBlog ? t('common.blog.meta.description') : t('common.help.meta.description')
)

useHead({
  title: () =>
    view.value ? `${view.value.article.title} · ${sectionTitle.value}` : sectionTitle.value,
  meta: [
    {
      name: 'description',
      content: () => view.value?.article.summary ?? metaDescription.value,
    },
  ],
})
</script>
