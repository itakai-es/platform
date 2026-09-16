-- Dos guías más para el centro de ayuda: cómo se gestiona desde el panel y dónde
-- encontrar la ayuda. Igual que el contenido inicial, solo crea lo que no exista y
-- no toca nada que ya esté: si alguien las ha editado o borrado, se respeta.
-- Cada una va al final de su categoría.

INSERT INTO "help_articles" ("id", "category_id", "slug", "title", "summary", "cover_image", "body", "locale", "status", "order_index", "featured", "audience", "kind", "published_at", "updated_at")
SELECT gen_random_uuid()::text, c."id", $itakai$gestionar-el-centro-de-ayuda$itakai$, $itakai$Gestionar el centro de ayuda$itakai$, $itakai$Para administración: categorías, artículos, borradores, vídeos y orden.$itakai$, $itakai$/app/ayuda/gestionar-ayuda.svg$itakai$, $itakai$El centro de ayuda se gestiona entero desde **Panel de administración → Contenidos → Centro de ayuda**. No hace falta tocar nada en el servidor: todo lo que se ve en la ayuda pública sale de ahí.

## Artículos y categorías

La página tiene dos pestañas, **Artículos** y **Categorías**. Los artículos se ven agrupados por categoría; la barra de arriba busca por título y, con **Filtros**, filtra por categoría, estado, audiencia o tipo.

En **Categorías** puedes crear, renombrar, cambiar el color y el icono, ordenar y eliminar: cada categoría tiene el **lápiz** para editarla y la **papelera** para eliminarla. Eliminar una categoría borra también sus artículos, y el aviso te dice cuántos antes de confirmar.

El blog tiene su propia sección, **Contenidos → Blog**, con sus entradas y sus categorías. Lo que hagas en una no aparece en la otra.

## Las acciones de cada artículo

El **lápiz**, o pulsar el título, abre el editor. El menú **⋮** reúne el resto: **Previsualizar**, **Publicar** o **Pasar a borrador**, **Destacar** y **Eliminar**.

## Qué decide cada campo de un artículo

**Audiencia.** Profesorado, alumnado o los dos. Decide en qué portada aparece: la del profesorado, la del alumnado o ambas.

**Tipo.** Guía, tutorial, pregunta frecuente o vídeo. Los que no son guías llevan una etiqueta en la lista de artículos de cada categoría, en los resultados de búsqueda y en el propio artículo.

**Destacar en la portada.** Lo pone en «Lo más consultado». También se cambia desde el menú ⋮, sin abrir el editor.

## Vídeos

Un artículo de tipo vídeo guarda **el enlace**, no el fichero: YouTube, Vimeo o un .mp4/.webm alojado en otro sitio. El reproductor aparece debajo del campo en cuanto pegas una dirección https, y en la página pública se muestra encima del texto. Puedes guardar un vídeo como borrador sin enlace, pero no publicarlo.

## Corregir antes de publicar

Todo artículo nuevo empieza como **borrador**. Con **Previsualizar** ves cómo quedará, incluso antes de guardar los cambios (en el editor hace falta que tenga categoría, título y contenido y, si es un vídeo, un enlace https válido, que es obligatorio si está publicado). Cuando esté listo, publícalo; si hay que retirarlo, **Pasar a borrador** lo quita de la ayuda pública sin perder nada.

## Ordenar

Arrastra el artículo por el **asa de seis puntos** que aparece a su izquierda al pasar el ratón (en pantallas táctiles se ve siempre) y suéltalo en su sitio: el orden se guarda al soltar. Con el teclado, pulsa Tab hasta llegar al asa (se muestra al recibir el foco) y usa las flechas **arriba** y **abajo**: cada pulsación mueve el artículo un puesto y el orden se guarda al momento. Con lector de pantalla, pulsa antes **Espacio** sobre el asa para cogerlo y otra vez para soltarlo. Las categorías se ordenan igual.

Mientras buscas o filtras por estado, audiencia o tipo, el orden queda bloqueado, porque con la lista incompleta se descuadraría. Cambiar el orden no cambia la fecha de «Actualizado el…» de los artículos.

## El contenido de serie

Los artículos con los que arranca la plataforma vienen incluidos en la instalación. A partir de ahí son vuestros: lo que editéis, borréis o reordenéis no lo sobrescribe ninguna actualización.$itakai$, 'es', 'publicado'::"HelpArticleStatus", (SELECT COALESCE(MAX(a."order_index"), -1) + 1 FROM "help_articles" a WHERE a."category_id" = c."id"), false, 'profesor'::"HelpAudience", 'guia'::"HelpArticleKind", CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM "help_categories" c WHERE c."slug" = $itakai$ia-y-configuracion$itakai$
ON CONFLICT ("category_id", "slug", "locale") DO NOTHING;

INSERT INTO "help_articles" ("id", "category_id", "slug", "title", "summary", "cover_image", "body", "locale", "status", "order_index", "featured", "audience", "kind", "published_at", "updated_at")
SELECT gen_random_uuid()::text, c."id", $itakai$donde-encontrar-ayuda$itakai$, $itakai$Dónde encontrar ayuda$itakai$, $itakai$El centro de ayuda desde el menú, la ayuda de cada rol y el buscador.$itakai$, $itakai$/app/ayuda/encontrar-ayuda.svg$itakai$, $itakai$La ayuda está a un clic: **Centro de ayuda**, en el menú de la izquierda de tu panel. Si eres profesor, está justo encima de «Acerca de»; si eres alumno, debajo de tus secciones, justo antes de «Mi perfil». En el móvil está en el mismo sitio, dentro del menú.

## La ayuda de tu rol

El centro de ayuda tiene tres portadas: **Toda la ayuda**, **Profesorado** y **Alumnado**. Desde el menú entras directamente en la tuya, y puedes cambiar de portada con el selector de arriba.

Si abres un artículo desde un enlace sin haber elegido portada, la ayuda se coloca sola en la del artículo; si el artículo es para todos, en la de tu rol. La lista del lateral muestra los artículos de su categoría que tocan en esa portada.

## Buscar

Escribe en el buscador de la portada. No hace falta acertar con las tildes: «configuracion» encuentra «configuración».

## Tipos de artículo

La mayoría son **guías**. Los tutoriales, las preguntas frecuentes y los vídeos llevan su etiqueta en la lista de artículos de cada categoría, en los resultados de búsqueda y en el propio artículo. En los vídeos, el reproductor aparece encima del texto.

## Accesibilidad

Los ajustes de tamaño de letra, contraste, daltonismo y animación están en tu **perfil, pestaña Configuración**. Antes de iniciar sesión los tienes arriba, junto al selector de idioma; en la portada, si la pantalla es estrecha, dentro del menú.

## Volver

Si tienes la sesión iniciada, **Volver a la app**, en la cabecera, te lleva de vuelta a tu inicio. En pantallas estrechas, como la del móvil, ese botón no aparece.

Y al final de cada artículo puedes decir si te ha servido: nos ayuda a saber qué reescribir.$itakai$, 'es', 'publicado'::"HelpArticleStatus", (SELECT COALESCE(MAX(a."order_index"), -1) + 1 FROM "help_articles" a WHERE a."category_id" = c."id"), false, 'ambos'::"HelpAudience", 'guia'::"HelpArticleKind", CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM "help_categories" c WHERE c."slug" = $itakai$primeros-pasos$itakai$
ON CONFLICT ("category_id", "slug", "locale") DO NOTHING;
