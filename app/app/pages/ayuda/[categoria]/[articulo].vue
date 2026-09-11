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
            <span class="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/60">
              <component :is="helpIcon(category.icon)" class="h-5 w-5 text-navy-700" />
            </span>
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
                : 'text-navy-700/80 hover:bg-white hover:text-navy-700'
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
          class="mt-4 hidden rounded-2xl bg-surface p-3 shadow-lg lg:block"
        >
          <p class="mb-1 px-2 text-xs font-semibold uppercase tracking-wider text-navy-700/60">
            {{ t('common.help.on_this_page') }}
          </p>
          <a
            v-for="heading in headings"
            :key="heading.id"
            :href="`#${heading.id}`"
            class="block rounded-lg px-2 py-1.5 text-sm leading-snug text-navy-700/80 transition-colors hover:bg-bg-secondary hover:text-navy-700"
          >
            {{ heading.text }}
          </a>
        </nav>
      </aside>

      <!-- Artículo -->
      <article class="min-w-0">
        <HelpArticleSkeleton v-if="!view || swapping" />

        <template v-else>
          <div
            class="help-body overflow-hidden rounded-2xl bg-surface shadow-lg"
            :style="accentStyle"
          >
            <!-- Las ilustraciones son 5:2; con esa misma proporción no se recortan. -->
            <img v-if="coverUrl" :src="coverUrl" alt="" class="aspect-[5/2] w-full object-cover" />

            <div class="p-5 md:p-8">
              <p class="mb-6 text-xs text-navy-700/70">
                {{ t('common.help.updated_on', { date: formattedDate }) }}
              </p>

              <!-- eslint-disable-next-line vue/no-v-html -->
              <div class="md-rendered" v-html="renderedBody" />
            </div>
          </div>

          <!-- Anterior y siguiente dentro de la categoría -->
          <nav v-if="previous || next" class="mt-6 grid gap-3 sm:grid-cols-2">
            <NuxtLink
              v-if="previous"
              :to="`/ayuda/${category?.slug}/${previous.slug}`"
              class="group flex items-center gap-3 rounded-2xl bg-surface px-4 py-3 shadow-lg transition-shadow hover:shadow-xl"
            >
              <ArrowLeftIcon
                class="h-4 w-4 shrink-0 text-navy-700/40 transition-colors group-hover:text-purple"
              />
              <span class="min-w-0">
                <span class="block text-xs font-medium text-navy-700/60">
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
                <span class="block text-xs font-medium text-navy-700/60">
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
import { helpIcon } from '~/utils/help-icons'
import { renderPageMarkdown } from '~/utils/markdown'
import type { HelpArticleView } from '~/types/help.types'

/**
 * Un artículo del centro de ayuda (Fase 3, punto 17).
 *
 * El cuerpo es markdown y se pinta con el mismo `.md-rendered` que la guía de
 * clase y el detalle de misión, así que la documentación se lee igual que el
 * resto del producto.
 */

const { t, locale } = useI18n()
const route = useRoute()
const config = useRuntimeConfig()
const { getImageUrl } = useImageUrl()
const { ensureIndex, getCategory, fetchArticle, rate } = useHelp()

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
const load = async () => {
  pending.value = !view.value
  swapping.value = !!view.value
  rated.value = false
  try {
    view.value = await fetchArticle(String(route.params.categoria), String(route.params.articulo))
  } catch {
    view.value = null
  } finally {
    pending.value = false
    swapping.value = false
  }
}

watch(() => [route.params.categoria, route.params.articulo], load)

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
  { label: t('common.help.title'), to: '/ayuda' },
  ...(category.value ? [{ label: category.value.name, to: `/ayuda/${category.value.slug}` }] : []),
  ...(headerTitle.value ? [{ label: headerTitle.value }] : []),
])

/** El color de la categoría, para los detalles del cuerpo del artículo. */
const accentStyle = computed(() => ({
  '--help-accent': `var(--color-card-${helpCardType(category.value?.accent)})`,
}))

const coverUrl = computed(() => getImageUrl(view.value?.article.coverImage))

/** Un identificador estable para un encabezado: sin tildes, en minúsculas. */
function anchorId(text: string) {
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60)
}

/**
 * Los apartados del artículo, sacados de los `##` del markdown.
 *
 * Alimentan el índice del lateral y los anclajes del cuerpo. Si dos apartados
 * se llaman igual se numera el segundo, para que cada enlace lleve al suyo.
 */
const headings = computed(() => {
  if (!view.value) return []
  const used = new Map<string, number>()
  return [...view.value.article.body.matchAll(/^## +(.+)$/gm)].map(match => {
    const text = match[1].replace(/[*_`]/g, '').trim()
    const base = anchorId(text) || 'apartado'
    const seen = used.get(base) ?? 0
    used.set(base, seen + 1)
    return { id: seen ? `${base}-${seen + 1}` : base, text }
  })
})

/**
 * El cuerpo, ya en HTML, con dos retoques.
 *
 * Uno: las imágenes que se suben desde el panel se guardan en `/uploads`, que
 * sirve la API, así que hay que apuntarlas a su origen —el markdown se pinta en
 * el frontend—; las que ya son absolutas, como las de R2, se quedan igual.
 *
 * Y dos: se numeran los `<h2>` con el mismo identificador que el índice, para
 * poder enlazar a un apartado concreto. Va después de pintar el markdown a
 * propósito: el saneado descarta los `id`, así que se ponen al final y con un
 * valor que se genera aquí, no en el texto del artículo.
 */
const renderedBody = computed(() => {
  if (!view.value) return ''

  const withAssets = renderPageMarkdown(view.value.article.body).replaceAll(
    'src="/uploads/',
    `src="${config.public.apiBase}/uploads/`
  )

  let index = 0
  return withAssets.replace(/<h2>/g, () => {
    const heading = headings.value[index++]
    return heading ? `<h2 id="${heading.id}">` : '<h2>'
  })
})

const formattedDate = computed(() => {
  if (!view.value) return ''
  return new Date(view.value.article.updatedAt).toLocaleDateString(locale.value, {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
})

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

<style scoped>
/**
 * Detalles de color dentro del artículo.
 *
 * El cuerpo sigue siendo el `.md-rendered` común —misma tipografía, mismos
 * tamaños que la guía de clase—; aquí solo se le añade el color de la categoría
 * en los apartados y en las citas, para que la lectura no sea un muro gris. No
 * se tocan los enlaces: siguen en navy subrayado, que es lo que garantiza el
 * contraste también en modo alto contraste.
 */
.help-body :deep(.md-rendered h2) {
  padding-left: 0.75rem;
  border-left: 4px solid var(--help-accent);
  /* Al llegar desde el índice, que el apartado no quede debajo de la barra. */
  scroll-margin-top: 6rem;
}

/* Los diagramas se leen como figura, no como parte del texto. */
.help-body :deep(.md-rendered img) {
  border: 1px solid var(--color-border-primary);
  border-radius: 0.75rem;
  margin: 1.5rem 0;
}

.help-body :deep(.md-rendered blockquote) {
  border-left-color: var(--help-accent);
  border-radius: 0 0.75rem 0.75rem 0;
  background: var(--color-bg-secondary);
  padding: 0.75rem 1rem;
  font-style: normal;
  opacity: 1;
}
</style>
