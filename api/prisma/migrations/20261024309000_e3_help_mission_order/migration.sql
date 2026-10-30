-- Ayuda de E3, entrega 1: el orden de la progresión. Una guía nueva para el
-- profesorado (el orden de las misiones: qué es, cómo se cambia y dónde llega
-- cada misión) y dos retoques: la misión importada llega al final del orden y,
-- al duplicar la clase, las misiones llegan en el mismo orden.
--
-- Como el resto del contenido de serie, el panel de administración manda. El
-- INSERT solo crea lo que no exista y va al final de su categoría; cada UPDATE
-- solo cambia un campo si sigue exactamente con el texto de serie, así que lo que
-- alguien haya editado se queda como está. Siempre por slug de categoría y de
-- artículo, nunca por id.

-- misiones/el-orden-de-las-misiones
INSERT INTO "help_articles" ("id", "category_id", "slug", "title", "summary", "cover_image", "body", "locale", "status", "order_index", "featured", "audience", "kind", "published_at", "updated_at")
SELECT gen_random_uuid()::text, c."id", $itakai$el-orden-de-las-misiones$itakai$, $itakai$El orden de las misiones$itakai$, $itakai$Decide en qué orden ve tu alumnado las misiones de la clase: el de la progresión, que siguen todos los listados.$itakai$, $itakai$/app/ayuda/mision.svg$itakai$, $itakai$Las misiones de una clase tienen un **orden**: el de la progresión, el que decides tú. Es el orden en que las ve tu alumnado en la pestaña *Misiones* y el que sale de entrada, como **Orden de la clase**, en el desplegable de ordenar. Desde ese desplegable cualquiera puede ver la lista por fecha, nombre o XP sin cambiar el orden de la clase.

## Cambiar el orden

1. En la pestaña **Misiones** de la clase, pulsa **Ordenar**.
2. Arrastra cada misión por su asa hasta su sitio. Con el teclado, ponte en el asa y usa las flechas arriba y abajo: cada paso se anuncia al lector de pantalla.
3. Cada cambio se guarda al momento. Pulsa **Hecho** para volver a las tarjetas.

Ordenar pide acceso de **edición** en la clase, como crear o editar misiones. Cada cambio queda en el [historial de la clase](/ayuda/clases/el-historial-de-la-clase).

## Dónde va cada misión

- Una misión **nueva** va al final.
- Una misión [importada de otra clase](/ayuda/misiones/importar-una-mision-de-otra-clase), o que pasas a otra clase, llega al final de la clase que la recibe.
- Al [duplicar la clase](/ayuda/clases/duplicar-una-clase-para-el-curso-siguiente) o importar una plantilla, las misiones llegan **en el mismo orden**.

El orden no abre ni cierra nada: una misión bloqueada sigue bloqueada esté donde esté, y el alumnado entrega las que están abiertas en el orden que quiera.$itakai$, 'es', 'publicado'::"HelpArticleStatus", (SELECT COALESCE(MAX(a."order_index"), -1) + 1 FROM "help_articles" a WHERE a."category_id" = c."id"), false, 'profesor'::"HelpAudience", 'guia'::"HelpArticleKind", CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM "help_categories" c WHERE c."slug" = $itakai$misiones$itakai$
ON CONFLICT ("category_id", "slug", "locale") DO NOTHING;

-- misiones/importar-una-mision-de-otra-clase: la copia llega al final del orden
UPDATE "help_articles" a
SET "body" = $itakai$**Una misión que ya funciona no hay que escribirla dos veces.** Puedes copiarla de una de tus clases a otra con sus enigmas, sus documentos y, si quieres, su insignia. La original no cambia y la copia es independiente: lo que retoques en una no toca la otra.

## Desde la clase que la recibe

En la pestaña **Misiones** de la clase, pulsa **Importar de otra clase**. Si la clase aún no tiene misiones, el botón está junto a **Crear primera misión**.

1. En **Clase de origen**, elige de qué clase la traes. Salen las tuyas y las que el resto del profesorado comparte contigo, con el nombre de la persona propietaria y cuántas misiones tiene cada una.
2. En **Misión**, elige cuál. Debajo ves lo que se va a copiar: cuántos enigmas, documentos e insignia lleva. Si la clase tiene muchas, puedes buscarla por el título.
3. Pulsa **Importar**.

## Desde Mis Misiones

En **Mis Misiones**, en el menú de la izquierda, el botón **Importar misión** hace lo mismo, pero antes te pide la **Clase de destino**. Si tienes la lista filtrada por una sola clase, te la propone como destino.

## Desde la propia misión

Al abrir una misión tienes, arriba, **Copiar en otra clase** (en pantallas estrechas solo se ve su icono, dos hojas superpuestas). Eliges la clase de destino y pulsas **Copiar**.

Si eliges la clase de la propia misión, que sale como **La de esta misión: se duplicará**, el botón pasa a ser **Duplicar** y la duplicas. Es la forma de hacer una variante —más corta, para otro nivel— sin tocar la original.

## Qué se copia

- La misión: título, descripción, rareza y portada.
- Sus **enigmas**, con sus enunciados y sus recompensas.
- Sus **documentos**. Si después borras uno en una de las dos misiones, la otra lo conserva.
- Su **insignia**, si dejas marcada la casilla **Copiar también su insignia**: llega como una insignia nueva tuya, con la misma imagen.

Nada del alumnado: ni entregas, ni progreso, ni las insignias que ya se hayan ganado.

## Cómo llega

La copia llega **bloqueada**, **sin fecha límite**, aunque la original tuviera una, y **al final** del [orden de la clase](/ayuda/misiones/el-orden-de-las-misiones). Así la revisas con calma, le pones fecha si hace falta, la colocas en su sitio y la desbloqueas cuando quieras que tu alumnado empiece a entregar.

Queda anotada en el [historial](/ayuda/clases/el-historial-de-la-clase) de las dos clases: en la de destino, que se importó; en la de origen, quién se llevó una copia.

## Qué clases salen

**Como destino**, solo las clases activas en las que puedes editar misiones. Si no tienes ninguna, los botones de importar y copiar no aparecen.

**Como origen**, cualquiera de tus clases o de las compartidas contigo, aunque en ella solo tengas acceso de lectura. Las archivadas no salen de entrada: marca **Mostrar también las clases archivadas** para traerte algo del curso pasado.

> **¿Todas las misiones de una clase?** Para empezar el curso siguiente es más rápido [duplicar la clase](/ayuda/clases/duplicar-una-clase-para-el-curso-siguiente). Importar es para traerte una misión concreta.$itakai$, "updated_at" = CURRENT_TIMESTAMP
FROM "help_categories" c
WHERE c."id" = a."category_id" AND c."slug" = $itakai$misiones$itakai$ AND a."locale" = 'es'
  AND a."slug" = $itakai$importar-una-mision-de-otra-clase$itakai$
  AND a."body" = $itakai$**Una misión que ya funciona no hay que escribirla dos veces.** Puedes copiarla de una de tus clases a otra con sus enigmas, sus documentos y, si quieres, su insignia. La original no cambia y la copia es independiente: lo que retoques en una no toca la otra.

## Desde la clase que la recibe

En la pestaña **Misiones** de la clase, pulsa **Importar de otra clase**. Si la clase aún no tiene misiones, el botón está junto a **Crear primera misión**.

1. En **Clase de origen**, elige de qué clase la traes. Salen las tuyas y las que el resto del profesorado comparte contigo, con el nombre de la persona propietaria y cuántas misiones tiene cada una.
2. En **Misión**, elige cuál. Debajo ves lo que se va a copiar: cuántos enigmas, documentos e insignia lleva. Si la clase tiene muchas, puedes buscarla por el título.
3. Pulsa **Importar**.

## Desde Mis Misiones

En **Mis Misiones**, en el menú de la izquierda, el botón **Importar misión** hace lo mismo, pero antes te pide la **Clase de destino**. Si tienes la lista filtrada por una sola clase, te la propone como destino.

## Desde la propia misión

Al abrir una misión tienes, arriba, **Copiar en otra clase** (en pantallas estrechas solo se ve su icono, dos hojas superpuestas). Eliges la clase de destino y pulsas **Copiar**.

Si eliges la clase de la propia misión, que sale como **La de esta misión: se duplicará**, el botón pasa a ser **Duplicar** y la duplicas. Es la forma de hacer una variante —más corta, para otro nivel— sin tocar la original.

## Qué se copia

- La misión: título, descripción, rareza y portada.
- Sus **enigmas**, con sus enunciados y sus recompensas.
- Sus **documentos**. Si después borras uno en una de las dos misiones, la otra lo conserva.
- Su **insignia**, si dejas marcada la casilla **Copiar también su insignia**: llega como una insignia nueva tuya, con la misma imagen.

Nada del alumnado: ni entregas, ni progreso, ni las insignias que ya se hayan ganado.

## Cómo llega

La copia llega **bloqueada** y **sin fecha límite**, aunque la original tuviera una. Así la revisas con calma, le pones fecha si hace falta y la desbloqueas cuando quieras que tu alumnado empiece a entregar.

Queda anotada en el [historial](/ayuda/clases/el-historial-de-la-clase) de las dos clases: en la de destino, que se importó; en la de origen, quién se llevó una copia.

## Qué clases salen

**Como destino**, solo las clases activas en las que puedes editar misiones. Si no tienes ninguna, los botones de importar y copiar no aparecen.

**Como origen**, cualquiera de tus clases o de las compartidas contigo, aunque en ella solo tengas acceso de lectura. Las archivadas no salen de entrada: marca **Mostrar también las clases archivadas** para traerte algo del curso pasado.

> **¿Todas las misiones de una clase?** Para empezar el curso siguiente es más rápido [duplicar la clase](/ayuda/clases/duplicar-una-clase-para-el-curso-siguiente). Importar es para traerte una misión concreta.$itakai$;

-- clases/duplicar-una-clase-para-el-curso-siguiente: las misiones llegan en su orden
UPDATE "help_articles" a
SET "body" = $itakai$Cuando empieza un curso nuevo no hace falta rehacer el trabajo: en los **Ajustes** de la clase, sección **Gestión**, **Duplicar** crea una copia limpia y te deja elegir qué te llevas.

## Qué puedes elegir

- **Misiones**: las misiones, en el mismo [orden](/ayuda/misiones/el-orden-de-las-misiones), con todos sus enigmas y sus recompensas.
- **Historia**: la narrativa y la imagen de portada.
- **Funcionalidades**: los recursos activos y los niveles de la clase.
- **Tienda**: los artículos, con sus precios.
- **Comportamientos.**

Marcas lo que quieras y el resto se queda en blanco. La copia se llama como la original, con «(copia)» detrás, y te lleva directamente a ella. Si copias las misiones, sus fechas de entrega vienen tal cual: revísalas antes de abrirlas al grupo.

## Qué no se copia nunca

**Nada del alumnado.** Ni las personas, ni sus entregas, ni la experiencia, ni los saldos, ni las insignias ganadas. La copia nace vacía de gente, que es justo lo que quieres en septiembre.

Tampoco se copia la **guía de clase**, que tendrás que volver a escribir o pegar, ni el código de clase: la copia tiene el suyo propio.

## La copia es tuya

Para duplicar una clase basta con poder verla, así que también puedes duplicar una que alguien del profesorado comparte contigo. La copia nace solo contigo en el profesorado, y su propiedad es tuya: el resto del profesorado de la original no pasa a ella. Si quieres volver a compartirla, [añade en la copia a quien quieras](/ayuda/clases/compartir-una-clase-con-otros-profesores).

## Por qué duplicar y no reutilizar

Es tentador borrar al alumnado del año pasado y volver a usar la misma clase, pero pierdes el histórico de un curso que puede que quieras consultar. Duplicando te quedas con las dos cosas: la clase del año pasado archivada y tal cual estaba, y una copia nueva lista para empezar.$itakai$, "updated_at" = CURRENT_TIMESTAMP
FROM "help_categories" c
WHERE c."id" = a."category_id" AND c."slug" = $itakai$clases$itakai$ AND a."locale" = 'es'
  AND a."slug" = $itakai$duplicar-una-clase-para-el-curso-siguiente$itakai$
  AND a."body" = $itakai$Cuando empieza un curso nuevo no hace falta rehacer el trabajo: en los **Ajustes** de la clase, sección **Gestión**, **Duplicar** crea una copia limpia y te deja elegir qué te llevas.

## Qué puedes elegir

- **Misiones**: las misiones, con todos sus enigmas y sus recompensas.
- **Historia**: la narrativa y la imagen de portada.
- **Funcionalidades**: los recursos activos y los niveles de la clase.
- **Tienda**: los artículos, con sus precios.
- **Comportamientos.**

Marcas lo que quieras y el resto se queda en blanco. La copia se llama como la original, con «(copia)» detrás, y te lleva directamente a ella. Si copias las misiones, sus fechas de entrega vienen tal cual: revísalas antes de abrirlas al grupo.

## Qué no se copia nunca

**Nada del alumnado.** Ni las personas, ni sus entregas, ni la experiencia, ni los saldos, ni las insignias ganadas. La copia nace vacía de gente, que es justo lo que quieres en septiembre.

Tampoco se copia la **guía de clase**, que tendrás que volver a escribir o pegar, ni el código de clase: la copia tiene el suyo propio.

## La copia es tuya

Para duplicar una clase basta con poder verla, así que también puedes duplicar una que alguien del profesorado comparte contigo. La copia nace solo contigo en el profesorado, y su propiedad es tuya: el resto del profesorado de la original no pasa a ella. Si quieres volver a compartirla, [añade en la copia a quien quieras](/ayuda/clases/compartir-una-clase-con-otros-profesores).

## Por qué duplicar y no reutilizar

Es tentador borrar al alumnado del año pasado y volver a usar la misma clase, pero pierdes el histórico de un curso que puede que quieras consultar. Duplicando te quedas con las dos cosas: la clase del año pasado archivada y tal cual estaba, y una copia nueva lista para empezar.$itakai$;
