<template>
  <div>
    <!-- Cargando: los mismos bloques que después, en el mismo sitio -->
    <div v-if="loading && !tpl">
      <div class="mb-8">
        <Skeleton width="w-48" height="h-4" custom-class="mb-4" />
        <Skeleton width="w-2/3" height="h-8" />
        <Skeleton width="w-80 max-w-full" height="h-5" custom-class="mt-4 rounded-full" />
      </div>
      <div class="grid gap-6 lg:grid-cols-[1fr_20rem]">
        <Skeleton height="h-64" custom-class="rounded-2xl lg:col-start-2 lg:row-start-1" />
        <div class="lg:col-start-1 lg:row-start-1">
          <div class="mb-6 flex flex-wrap gap-2">
            <Skeleton
              v-for="n in 5"
              :key="n"
              width="w-28"
              height="h-9"
              custom-class="rounded-full"
            />
          </div>
          <div class="space-y-4">
            <Skeleton height="h-56" custom-class="rounded-2xl" />
            <Skeleton height="h-40" custom-class="rounded-2xl" />
          </div>
        </div>
      </div>
    </div>

    <!-- Enlace muerto: la plantilla se retiró (o se archivó su clase), o nunca
         existió. Se dice con calma y se lleva al catálogo. Es lo único que hay
         en la página, así que su título es el de la página. -->
    <EmptyState
      v-else-if="deadLink"
      :icon="deadLink.icon"
      :title="deadLink.title"
      :description="deadLink.description"
      :heading-level="1"
    >
      <template #action>
        <Button variant="primary" :to="ROUTE_NAMES.TEMPLATES">
          {{ t('common.templates.back_to_catalog') }}
        </Button>
      </template>
    </EmptyState>

    <!-- No ha llegado: demasiadas consultas seguidas, sin conexión… -->
    <LoadError
      v-else-if="failure"
      :rate-limited="failure === 'rate-limited'"
      :heading-level="1"
      @retry="load"
    />

    <template v-else-if="tpl">
      <PageHeader :breadcrumbs="breadcrumbs" :title="tpl.name">
        <!-- Nivel, asignatura, idioma y provincia, enteros: a lo ancho, bajo el
             título, como las etiquetas de la cabecera de una clase -->
        <template #meta>
          <TemplateMetaBadges :template="tpl" with-province wrap />
        </template>
        <!-- En una línea: junto a un nombre largo, lo que se estrecha es el
             título, no el botón -->
        <template #actions>
          <Button
            variant="outline"
            size="sm"
            :icon-left="LinkIcon"
            class="whitespace-nowrap"
            @click="copyLink"
          >
            {{ t('common.templates.copy_link') }}
          </Button>
        </template>
      </PageHeader>

      <div class="grid gap-6 lg:grid-cols-[1fr_20rem]">
        <!-- Qué trae y cómo usarla. En el DOM va antes que la historia: en el
             móvil sale arriba, sin tener que leerla entera, y en pantallas
             anchas se queda a la derecha mientras se lee. -->
        <aside class="lg:sticky lg:top-24 lg:col-start-2 lg:row-start-1 lg:self-start">
          <div class="rounded-2xl bg-white p-6 shadow-sm">
            <ul class="space-y-2">
              <li
                v-for="count in counts"
                :key="count.key"
                class="flex items-start gap-2 text-sm font-medium text-navy-700"
              >
                <component :is="count.icon" class="h-5 w-5 flex-shrink-0" aria-hidden="true" />
                <!-- La tienda o los comportamientos se copian igual al importarla,
                     pero si la plantilla los lleva apagados se dice aquí, como en
                     sus funcionalidades: si no, el número parece contradecirlas.
                     Si no cabe al lado, la etiqueta baja bajo el texto. -->
                <span class="flex flex-wrap items-center gap-x-2 gap-y-1">
                  {{ count.label }}
                  <Badge v-if="count.off" variant="default" size="sm">
                    {{ t('teacher.templates.preview.inactive') }}
                  </Badge>
                </span>
              </li>
            </ul>

            <div class="mt-5 border-t border-border-primary pt-5">
              <h2 class="text-lg font-bold text-navy-700">{{ t('common.templates.use.title') }}</h2>
              <p class="mt-1 text-sm text-navy-700/70">
                {{
                  tpl.missionCount > 0
                    ? t('common.templates.use.what_you_get_missions')
                    : t('common.templates.use.what_you_get')
                }}
              </p>

              <!-- Con sesión de profesor, el mismo importar que en su catálogo,
                   con la misma casilla para traer sus misiones -->
              <template v-if="canImport">
                <TemplateImportMissionsOption
                  v-if="tpl.missionCount > 0"
                  v-model="withMissions"
                  :count="tpl.missionCount"
                  :disabled="importingId !== null"
                  class="mt-4"
                />
                <Button
                  variant="primary"
                  full-width
                  class="mt-4"
                  :loading="importingId !== null"
                  :disabled="importingId !== null"
                  @click="onImport"
                >
                  {{ t('teacher.templates.import') }}
                </Button>
              </template>

              <!-- Sin sesión, a entrar; con otro rol, nada que vaya a fallar -->
              <template v-else-if="!authStore.isAuthenticated">
                <InfoNote class="mt-4">{{ t('common.templates.use.login_note') }}</InfoNote>
                <Button variant="primary" full-width class="mt-3" :to="ROUTE_NAMES.LOGIN">
                  {{ t('common.actions.enter') }}
                </Button>
              </template>
              <InfoNote v-else class="mt-4">{{ t('common.templates.use.teacher_only') }}</InfoNote>
            </div>
          </div>
        </aside>

        <!-- Lo que trae, en las mismas pestañas que la previsualización del
             profesorado: la historia a la vista y, a un toque, las
             funcionalidades y cada lista, sin que la página se haga eterna en
             el móvil. El título no se ve (las pestañas ya lo dicen), pero está
             para quien navega por títulos: los apartados de la historia son h3
             y cuelgan de aquí, no de «Usar esta plantilla». -->
        <section class="min-w-0 lg:col-start-1 lg:row-start-1">
          <h2 class="sr-only">{{ t('common.templates.contents_title') }}</h2>
          <TemplateContentTabs :template="tpl" :features="tpl.features" />
        </section>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import {
  ArchiveBoxXMarkIcon,
  HandRaisedIcon,
  LinkIcon,
  LinkSlashIcon,
  RocketLaunchIcon,
  ShoppingBagIcon,
} from '@heroicons/vue/24/outline'
import { copyText } from '~/utils/clipboard'
import { ROUTE_NAMES } from '~/utils/navigation'
import type { PublicTemplateDetail, TemplateFailure } from '~/types/template.types'

/**
 * La ficha pública de una plantilla (Fase 3, C5): adonde lleva el enlace que
 * se comparte, y se abre sin cuenta.
 *
 * Enseña lo que el visitante necesita para decidir: portada, nombre,
 * metadatos, la historia entera, qué funcionalidades lleva encendidas y lo
 * que trae (sus misiones, resumidas, su tienda y sus comportamientos), con
 * cuántos hay de cada. Nada de quien la publicó. Lo que trae va en las mismas
 * pestañas que la previsualización del profesorado.
 *
 * Con sesión de profesor se importa aquí mismo, como desde su catálogo, y si
 * trae misiones se elige si vienen (marcado de entrada). Sin sesión se explica
 * que hace falta entrar con una cuenta de profesor; con otro rol, que hace
 * falta una (llevarle a entrar no serviría: ya ha entrado).
 */

const { t } = useI18n()
const route = useRoute()
const toast = useToast()
const authStore = useAuthStore()
const { fetchTemplate } = usePublicTemplates()
const { importingId, importTemplate } = useTemplateImport()

definePageMeta({ layout: 'templates' })

const tpl = ref<PublicTemplateDetail | null>(null)
const loading = ref(true)
const failure = ref<TemplateFailure | null>(null)
/** Importar también sus misiones, si trae: marcado de entrada. */
const withMissions = ref(true)

/**
 * Número de la carga vigente: si se reintenta antes de que conteste la
 * anterior, manda la última.
 */
let loadSeq = 0

async function load() {
  const seq = ++loadSeq
  loading.value = true
  failure.value = null
  try {
    const data = await fetchTemplate(String(route.params.id))
    if (seq === loadSeq) tpl.value = data
  } catch (error) {
    if (seq !== loadSeq) return
    tpl.value = null
    failure.value = templateFailure(error)
  } finally {
    if (seq === loadSeq) loading.value = false
  }
}

// Cada ficha es su propia página (Nuxt la rehace al cambiar de id): basta con
// pedirla al montarse.
onMounted(load)

/** Retirada (o con la clase archivada) o inexistente: lo que se cuenta en cada caso. */
const deadLink = computed(() => {
  if (failure.value === 'gone') {
    return {
      icon: ArchiveBoxXMarkIcon,
      title: t('common.templates.gone.title'),
      description: t('common.templates.gone.description'),
    }
  }
  if (failure.value === 'not-found') {
    return {
      icon: LinkSlashIcon,
      title: t('common.templates.not_found.title'),
      description: t('common.templates.not_found.description'),
    }
  }
  return null
})

/** Importar es cosa del profesorado: la ruta cuelga de `/teacher`. */
const canImport = computed(() => authStore.isAuthenticated && authStore.userRole === 'teacher')

/**
 * Cuántas misiones, objetos de tienda y comportamientos trae, con su icono, y
 * si su funcionalidad va apagada (`off`): la tienda y los comportamientos
 * tienen la suya; las misiones, no.
 */
const counts = computed(() => {
  if (!tpl.value) return []
  const { missionCount, shopItemCount, behaviorCount, features } = tpl.value
  return [
    {
      key: 'missions',
      icon: RocketLaunchIcon,
      label: t('common.templates.counts.missions', { count: missionCount }, missionCount),
      off: false,
    },
    {
      key: 'shop',
      icon: ShoppingBagIcon,
      label: t('common.templates.counts.shop_items', { count: shopItemCount }, shopItemCount),
      off: !features.shop,
    },
    {
      key: 'behaviors',
      icon: HandRaisedIcon,
      label: t('common.templates.counts.behaviors', { count: behaviorCount }, behaviorCount),
      off: !features.behaviors,
    },
  ]
})

const breadcrumbs = computed(() => [
  { label: t('common.nav.templates'), to: ROUTE_NAMES.TEMPLATES },
  { label: tpl.value?.name ?? '' },
])

/** Importa y lleva a la clase nueva, como desde el catálogo del profesorado. */
async function onImport() {
  if (!tpl.value) return
  const missions = withMissions.value && tpl.value.missionCount > 0
  const created = await importTemplate(tpl.value.id, { missions })
  if (created) navigateTo(`/profesor/clases/${created.id}`)
}

/** El enlace de la ficha, sin nada más: es el que se comparte. */
async function copyLink() {
  if (!tpl.value) return
  try {
    await copyText(`${window.location.origin}${ROUTE_NAMES.TEMPLATES}/${tpl.value.id}`)
    toast.success(t('common.copy.copied'))
  } catch {
    toast.error(t('common.copy.error'))
  }
}

// En la pestaña, el nombre de la plantilla o, si el enlace está muerto, lo que
// le ha pasado: es lo que se ve al volver a ella o en el historial.
useHead({
  title: () => {
    const heading = tpl.value?.name ?? deadLink.value?.title
    return heading ? `${heading} · ${t('common.nav.templates')}` : t('common.templates.meta.title')
  },
  meta: [{ name: 'description', content: () => t('common.templates.meta.description') }],
})
</script>
