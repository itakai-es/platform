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
      :icon="BookOpenIcon"
      :title="t('common.help.not_found_title')"
      :description="t('common.help.not_found_description')"
    />

    <div v-else class="grid gap-6 lg:grid-cols-[16rem_1fr]">
      <!-- Índice de la categoría, con su color de marca -->
      <aside class="lg:sticky lg:top-24 lg:self-start">
        <Card v-if="category" :type="helpCardType(category.accent)" padding="sm" gap="none">
          <div class="mb-3 flex items-center gap-2.5 px-1">
            <HelpCategoryIcon :icon="category.icon" size="md" on-card />
            <NuxtLink
              :to="`/ayuda/${category.slug}`"
              class="min-w-0 truncate text-sm font-bold text-navy-700 hover:underline"
            >
              {{ category.name }}
            </NuxtLink>
          </div>

          <NuxtLink
            v-for="sibling in siblings"
            :key="sibling.id"
            :to="`/ayuda/${category.slug}/${sibling.slug}`"
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
          <HelpArticleBody :article="view.article" :accent="category?.accent" />

          <!-- Anterior y siguiente dentro de la categoría -->
          <nav
            v-if="previous || next"
            :aria-label="t('common.help.article_pagination')"
            class="mt-6 grid gap-3 sm:grid-cols-2"
          >
            <NuxtLink
              v-if="previous"
              :to="`/ayuda/${category?.slug}/${previous.slug}`"
              class="group flex items-center gap-3 rounded-2xl bg-surface px-4 py-3 shadow-lg transition-shadow hover:shadow-xl"
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
              :to="`/ayuda/${category?.slug}/${next.slug}`"
              class="group flex items-center gap-3 rounded-2xl bg-surface px-4 py-3 text-right shadow-lg transition-shadow hover:shadow-xl sm:col-start-2"
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

          <!-- ¿Te ha resultado útil? -->
          <div
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
          <section v-if="view.related.length" class="mt-8">
            <h2 class="mb-3 text-lg font-bold text-navy-700">
              {{ t('common.help.keep_reading') }}
            </h2>
            <HelpArticleList :articles="view.related" :category="view.category" />
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
} from '@heroicons/vue/24/outline'
import { helpCardType } from '~/utils/help-accents'
import { helpHeadings } from '~/utils/help-headings'
import type { HelpArticleView } from '~/types/help.types'

/**
 * Un artículo del centro de ayuda (Fase 3, punto 17).
 *
 * El cuerpo lo pinta `HelpArticleBody`, la misma pieza que usa la
 * previsualización del panel; aquí quedan la cabecera, el lateral, anterior y
 * siguiente, la valoración y «Seguir leyendo».
 */

const { t } = useI18n()
const route = useRoute()
const { ensureIndex, getCategory, fetchArticle, rate, scope, portalPath, inferScope } = useHelp()

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

/** Los artículos del lateral, de donde primero se sepan. */
const siblings = computed(() => view.value?.siblings ?? indexed.value?.articles ?? [])

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

const previous = computed(() => (position.value > 0 ? siblings.value[position.value - 1] : null))

const next = computed(() =>
  position.value >= 0 && position.value < siblings.value.length - 1
    ? siblings.value[position.value + 1]
    : null
)

/** Ni cargando ni cargado: el artículo no existe o está sin publicar. */
const notFound = computed(() => !pending.value && !swapping.value && !view.value)

const breadcrumbs = computed(() => [
  { label: t('common.help.title'), to: portalPath(scope.value) },
  ...(category.value ? [{ label: category.value.name, to: `/ayuda/${category.value.slug}` }] : []),
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

definePageMeta({
  layout: 'help',
  /**
   * Clave fija: por defecto Nuxt rehace la página en cada cambio de ruta, así
   * que saltar de un artículo a otro desde el índice lateral desmontaba el
   * componente, vaciaba `view` y sacaba el esqueleto entero —lateral incluido—
   * para cambiar solo el texto. Con una clave que no cambia se reutiliza la
   * misma instancia y quien recarga es el `watch` de abajo, que deja lo
   * anterior en pantalla mientras llega lo nuevo.
   */
  key: 'ayuda-articulo',
})

useHead({
  title: () =>
    view.value ? `${view.value.article.title} · ${t('common.help.title')}` : t('common.help.title'),
  meta: [
    {
      name: 'description',
      content: () => view.value?.article.summary ?? t('common.help.meta.description'),
    },
  ],
})
</script>
