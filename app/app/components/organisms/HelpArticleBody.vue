<template>
  <div class="help-body overflow-hidden rounded-2xl bg-surface shadow-lg" :style="accentStyle">
    <!-- Las ilustraciones son 5:2; con esa misma proporción no se recortan. -->
    <img v-if="coverUrl" :src="coverUrl" alt="" class="aspect-[5/2] w-full object-cover" />

    <div class="p-5 md:p-8">
      <!-- La guía es lo normal y no se etiqueta; el resto de tipos sí. -->
      <Badge v-if="article.kind !== 'guia'" variant="common" size="sm" class="mb-3">
        {{ t(`common.help.kind.${article.kind}`) }}
      </Badge>

      <p class="mb-6 text-xs text-navy-700/70">
        {{ t('common.help.updated_on', { date: formattedDate }) }}
      </p>

      <HelpVideoEmbed
        v-if="article.videoUrl"
        :url="article.videoUrl"
        :title="article.title"
        class="mb-6"
      />

      <!-- eslint-disable-next-line vue/no-v-html -->
      <div class="md-rendered" v-html="renderedBody" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { helpCardType } from '~/utils/help-accents'
import { helpDocument } from '~/utils/help-headings'
import { renderHelpMarkdown } from '~/utils/markdown'
import type { HelpArticle } from '~/types/help.types'

/**
 * El cuerpo de un artículo del centro de ayuda: portada, tipo, fecha, vídeo y
 * texto. Es la misma pieza en la página pública y en la previsualización del
 * panel, así que lo que se revisa es exactamente lo que se publica.
 *
 * El texto es markdown y se pinta con el mismo `.md-rendered` que la guía de
 * clase y el detalle de misión, para que la documentación se lea igual que el
 * resto del producto.
 */

const props = withDefaults(
  defineProps<{
    article: Pick<HelpArticle, 'title' | 'body' | 'coverImage' | 'updatedAt' | 'kind' | 'videoUrl'>
    /** El color de la categoría (tipo de `Card`), para apartados y citas. */
    accent?: string
  }>(),
  { accent: undefined }
)

const { t, locale } = useI18n()
const config = useRuntimeConfig()
const { getImageUrl } = useImageUrl()

/** El color de la categoría, para los detalles del cuerpo del artículo. */
const accentStyle = computed(() => ({
  '--help-accent': `var(--color-card-${helpCardType(props.accent)})`,
}))

const coverUrl = computed(() => getImageUrl(props.article.coverImage))

/**
 * El cuerpo, ya en HTML, con dos retoques.
 *
 * Uno: las imágenes que se suben desde el panel se guardan en `/uploads`, que
 * sirve la API, así que hay que apuntarlas a su origen —el markdown se pinta en
 * el frontend—; las que ya son absolutas, como las de R2, se quedan igual.
 *
 * Y dos: se numeran los `<h2>` con el mismo identificador que el índice, para
 * poder enlazar a un apartado concreto. El saneado descarta los `id`, así que
 * se ponen al final y con un valor que se genera aquí, no en el texto.
 *
 * Los dos retoques se hacen sobre el DOM del HTML ya saneado, nunca sobre la
 * cadena: pegar texto en HTML saneado permitiría que un `alt` que contenga
 * `<h2 ` acabase abriendo atributos nuevos y saltándose el saneado.
 */
const renderedBody = computed(() => {
  // Los `id` de los `<h2>` los pone `helpDocument`, el mismo que da el índice.
  const doc = helpDocument(props.article.body)
  // Sin DOM (no debería pasar: la app no se pinta en el servidor) el saneado
  // ya ha escapado todo el texto y no hay nada que retocar.
  if (!doc) return renderHelpMarkdown(props.article.body)

  doc.content.querySelectorAll('img[src^="/uploads/"]').forEach(img => {
    img.setAttribute('src', `${config.public.apiBase}${img.getAttribute('src')}`)
  })

  const holder = document.createElement('div')
  holder.append(doc.content)
  return holder.innerHTML
})

const formattedDate = computed(() =>
  new Date(props.article.updatedAt).toLocaleDateString(locale.value, {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
)
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
