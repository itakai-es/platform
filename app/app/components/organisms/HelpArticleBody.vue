<template>
  <div class="help-body overflow-hidden rounded-2xl bg-surface shadow-lg" :style="accentStyle">
    <!-- Con vídeo, el vídeo es la portada: lo primero que se ve al entrar, y la
         portada del artículo (su miniatura) hace de póster. Sin vídeo, la
         ilustración, que es 5:2: con esa proporción no se recorta. -->
    <!-- Guías con versión para móvil: el mismo vídeo y las mismas capturas, en
         ordenador o en móvil. Se recuerda la elección. -->
    <HelpDeviceToggle
      v-if="!hideMedia && heroVideo && hasMobile"
      :model-value="device"
      @update:model-value="setDevice"
    />
    <HelpVideoEmbed
      v-if="!hideMedia && heroVideo && article.videoUrl"
      :key="shownVideoUrl"
      :url="shownVideoUrl"
      :title="article.title"
      :poster="coverUrl"
      :rounded="false"
      :start-at="startAt"
      @ended="emit('videoEnded')"
      @progress="(seconds, duration) => emit('videoProgress', seconds, duration)"
    />
    <img v-else-if="!hideMedia && coverUrl" :src="coverUrl" alt="" class="aspect-[5/2] w-full object-cover" />

    <div class="p-5 md:p-8">
      <!-- La guía es lo normal y no se etiqueta; el resto de tipos sí. -->
      <Badge v-if="article.kind !== 'guia'" variant="common" size="sm" class="mb-3">
        {{ t(`common.help.kind.${article.kind}`) }}
      </Badge>

      <!-- La ayuda dice cuándo se actualizó; el blog, cuándo se publicó y quién firma. -->
      <p class="mb-6 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-navy-700/70">
        <span>
          <time :datetime="shownDate.iso">{{ shownDate.label }}</time>
          <template v-if="byline"> · {{ byline }}</template>
        </span>
        <HelpVisitCount v-if="visits !== undefined" :count="visits" />
      </p>

      <!-- Un vídeo que no se puede incrustar se queda en un enlace, sobre el texto. -->
      <HelpVideoEmbed
        v-if="!hideMedia && article.videoUrl && !heroVideo"
        :url="article.videoUrl"
        :title="article.title"
        class="mb-6"
      />

      <div ref="bodyEl" @load.capture="markPortrait">
        <template v-if="platformContent">
          <HelpCopyableMarkdown :html="renderedBody.before" />
          <div class="my-4 rounded-xl border border-border-primary bg-bg-secondary p-3">
            <p class="mb-2 text-sm font-semibold text-navy-700">
              {{ t('common.help.command_platform') }}
            </p>
            <OptionPillGroup
              :model-value="commandPlatform"
              :options="platformOptions"
              :aria-label="t('common.help.command_platform')"
              fluid
              min-item-width="5.25rem"
              @update:model-value="setCommandPlatform"
            />
          </div>
          <HelpCopyableMarkdown :html="renderedBody.commands" />
          <HelpCopyableMarkdown class="mt-6" :html="renderedBody.after" />
        </template>
        <HelpCopyableMarkdown v-else :html="renderedBody.before" />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import HelpVisitCount from '~/components/atoms/HelpVisitCount.vue'
import { helpCardType } from '~/utils/help-accents'
import {
  HELP_COMMAND_PLATFORMS,
  splitHelpCommandPlatforms,
  type HelpCommandPlatform,
} from '~/utils/help-command-platforms'
import { helpMobileVariant, useHelpDevice } from '~/composables/useHelpDevice'
import { helpDocument } from '~/utils/help-headings'
import { pointUploadsToApi } from '~/utils/help-images'
import { renderHelpMarkdown } from '~/utils/markdown'
import { videoEmbed } from '~/utils/help-video'
import type { HelpArea, HelpArticle } from '~/types/help.types'

/**
 * El cuerpo de un artículo del centro de ayuda: portada (o el vídeo, que
 * ocupa su sitio), tipo, fecha y texto. Es la misma pieza en la página pública y en la previsualización del
 * panel, así que lo que se revisa es exactamente lo que se publica.
 *
 * En el blog (`area="blog"`) la fecha es la de publicación y, si la entrada
 * va firmada, sale también la firma. Un borrador que aún no se ha publicado
 * no tiene fecha de publicación y enseña la de actualización, como la ayuda.
 *
 * El texto es markdown y se pinta con el mismo `.md-rendered` que la guía de
 * clase y el detalle de misión, para que la documentación se lea igual que el
 * resto del producto.
 */

/**
 * Las capturas de móvil son verticales: a todo el ancho ocuparían varias
 * pantallas. Al cargar, las marcamos para pintarlas del tamaño de un teléfono.
 */
function markPortrait(event: Event) {
  const img = event.target
  if (img instanceof HTMLImageElement && img.naturalHeight > img.naturalWidth * 1.1) {
    img.classList.add('help-shot-portrait')
  }
}

const props = withDefaults(
  defineProps<{
    article: Pick<
      HelpArticle,
      | 'title'
      | 'body'
      | 'coverImage'
      | 'updatedAt'
      | 'kind'
      | 'videoUrl'
      | 'publishedAt'
      | 'authorName'
    >
    /** El color de la categoría (tipo de `Card`), para apartados y citas. */
    accent?: string
    /** Del área sale la fecha que se enseña y si va la firma. */
    area?: HelpArea
    visits?: number
    /** En una lección el vídeo se reproduce encima del cuerpo del artículo. */
    hideMedia?: boolean
    startAt?: number
  }>(),
  { accent: undefined, area: 'ayuda', hideMedia: false, startAt: 0 }
)

const emit = defineEmits<{ videoEnded: []; videoProgress: [seconds: number, duration: number] }>()

const { t } = useI18n()
const config = useRuntimeConfig()
const { getImageUrl } = useImageUrl()
const { formatDate, authorLine } = useBlogByline()

const commandPlatformKey = 'itakai-help-command-platform'
const platformOptions = [...HELP_COMMAND_PLATFORMS]
const commandPlatform = ref<HelpCommandPlatform>('linux')
const platformContent = computed(() => splitHelpCommandPlatforms(props.article.body))

function setCommandPlatform(value: HelpCommandPlatform) {
  commandPlatform.value = value
  try {
    localStorage.setItem(commandPlatformKey, value)
  } catch {
    // El selector sigue funcionando si el almacenamiento está deshabilitado.
  }
}

/** El color de la categoría, para los detalles del cuerpo del artículo. */
const accentStyle = computed(() => ({
  '--help-accent': `var(--color-card-${helpCardType(props.accent)})`,
}))

const coverUrl = computed(() => getImageUrl(props.article.coverImage))

/** Si el vídeo se reproduce aquí (fichero, YouTube o Vimeo) y puede hacer de portada. */
const heroVideo = computed(
  () => !!props.article.videoUrl && videoEmbed(props.article.videoUrl).type !== 'link'
)

/**
 * Dos modos, ordenador y móvil. La versión móvil de un vídeo vive junto a él
 * con el sufijo `-movil` (`guia.mp4` → `guia-movil.mp4`), y la de cada captura
 * igual (`01-paso.webp` → `01-paso-movil.webp`). Si no hay versión móvil, no se
 * enseña el selector.
 */
const { device, hasMobile, shownVideoUrl, setDevice } = useHelpDevice(() => props.article.videoUrl)
const bodyEl = ref<HTMLElement | null>(null)

/** Cambia cada captura del cuerpo a su versión del modo elegido; si no la hay, se queda la de ordenador. */
function applyDeviceToImages() {
  bodyEl.value?.querySelectorAll('img').forEach((img) => {
    const desktopSrc = img.dataset.desktopSrc ?? img.getAttribute('src') ?? ''
    img.dataset.desktopSrc = desktopSrc
    if (device.value === 'mobile' && hasMobile.value && /^\/help-media\/|\/help-media\//.test(desktopSrc)) {
      img.onerror = () => {
        img.onerror = null
        img.src = desktopSrc
      }
      img.src = helpMobileVariant(desktopSrc)
    } else if (img.getAttribute('src') !== desktopSrc) {
      img.src = desktopSrc
    }
  })
}

onMounted(() => {
  if (/Win/i.test(navigator.platform)) commandPlatform.value = 'windows'
  if (/Mac/i.test(navigator.platform)) commandPlatform.value = 'macos'
  try {
    const preferred = platformOptions.find(option => option.value === localStorage.getItem(commandPlatformKey))
    if (preferred) commandPlatform.value = preferred.value
  } catch {
    // Sin almacenamiento: ordenador.
  }
})

watch([device, hasMobile, commandPlatform, () => props.article.body], () => nextTick(applyDeviceToImages))

/**
 * El cuerpo, ya en HTML, con dos retoques.
 *
 * Uno: las imágenes que se suben desde el panel se apuntan a la API, que es
 * quien sirve `/uploads` (`pointUploadsToApi`, el mismo que usa la vista
 * previa del editor del panel).
 *
 * Y dos: se numeran los `<h2>` con el mismo identificador que el índice, para
 * poder enlazar a un apartado concreto. El saneado descarta los `id`, así que
 * se ponen al final y con un valor que se genera aquí, no en el texto.
 *
 * Los dos retoques se hacen sobre el DOM del HTML ya saneado, nunca sobre la
 * cadena: pegar texto en HTML saneado permitiría que un `alt` que contenga
 * `<h2 ` acabase abriendo atributos nuevos y saltándose el saneado.
 */
function renderBodySection(body: string, headings?: Set<string>) {
  // Los `id` de los `<h2>` los pone `helpDocument`, el mismo que da el índice.
  const doc = helpDocument(body, headings)
  // Sin DOM (no debería pasar: la app no se pinta en el servidor) el saneado
  // ya ha escapado todo el texto y no hay nada que retocar.
  if (!doc) return renderHelpMarkdown(body)

  pointUploadsToApi(doc.content, config.public.apiBase)

  const holder = document.createElement('div')
  holder.append(doc.content)
  return holder.innerHTML
}

const renderedBody = computed(() => {
  const platform = platformContent.value
  if (!platform) return { before: renderBodySection(props.article.body), commands: '', after: '' }

  const headings = new Set<string>()
  const before = renderBodySection(platform.before, headings)
  const after = renderBodySection(platform.after, headings)
  return {
    before,
    commands: renderBodySection(platform.commands[commandPlatform.value], headings),
    after,
  }
})

const isBlog = computed(() => props.area === 'blog')

const shownDate = computed(() => {
  const published = isBlog.value ? props.article.publishedAt : null
  if (published) {
    const date = formatDate(published, 'long')
    return { iso: published, label: t('common.help.published_on', { date }) }
  }
  const updated = props.article.updatedAt
  return { iso: updated, label: t('common.help.updated_on', { date: formatDate(updated, 'long') }) }
})

/** La firma, solo en el blog y si la hay. */
const byline = computed(() => (isBlog.value ? authorLine(props.article.authorName) : ''))
</script>

<style scoped>
.md-rendered :deep(img.help-shot-portrait) {
  display: block;
  width: 100%;
  max-width: 300px;
  margin: 1.25rem auto;
  border: 8px solid #14141f;
  border-radius: 28px;
}

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

.help-body :deep(.md-rendered blockquote) {
  border-left-color: var(--help-accent);
  border-radius: 0 0.75rem 0.75rem 0;
  background: var(--color-bg-secondary);
  padding: 0.75rem 1rem;
  font-style: normal;
  opacity: 1;
}
</style>
