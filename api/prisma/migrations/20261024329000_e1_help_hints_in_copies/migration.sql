-- Ayuda de E1, retoques: las pistas viajan con la misión al importarla en otra
-- clase y al duplicar la clase (ya lo dice la guía de pistas, pero no estas), y
-- el historial de la clase las cuenta. En la misma línea del historial va
-- también el cambio de orden de las misiones (E3), que tampoco salía.
--
-- Como el resto del contenido de serie, el panel de administración manda. Cada
-- UPDATE solo cambia un campo si sigue exactamente con el texto de serie, así
-- que lo que alguien haya editado se queda como está. Siempre por slug de
-- categoría y de artículo, nunca por id.

-- misiones/importar-una-mision-de-otra-clase: las pistas, en lo que se copia y en lo que enseña la ventana.
UPDATE "help_articles" a
SET "body" = $itakai$**Una misión que ya funciona no hay que escribirla dos veces.** Puedes copiarla de una de tus clases a otra con sus enigmas, sus pistas, sus documentos y, si quieres, su insignia. La original no cambia y la copia es independiente: lo que retoques en una no toca la otra.

## Desde la clase que la recibe

En la pestaña **Misiones** de la clase, pulsa **Importar de otra clase**. Si la clase aún no tiene misiones, el botón está junto a **Crear primera misión**.

1. En **Clase de origen**, elige de qué clase la traes. Salen las tuyas y las que el resto del profesorado comparte contigo, con el nombre de la persona propietaria y cuántas misiones tiene cada una.
2. En **Misión**, elige cuál. Debajo ves lo que se va a copiar: cuántos enigmas, pistas y documentos lleva. Si la clase tiene muchas, puedes buscarla por el título.
3. Pulsa **Importar**.

## Desde Mis Misiones

En **Mis Misiones**, en el menú de la izquierda, el botón **Importar misión** hace lo mismo, pero antes te pide la **Clase de destino**. Si tienes la lista filtrada por una sola clase, te la propone como destino.

## Desde la propia misión

Al abrir una misión tienes, arriba, **Copiar en otra clase** (en pantallas estrechas solo se ve su icono, dos hojas superpuestas). Eliges la clase de destino y pulsas **Copiar**.

Si eliges la clase de la propia misión, que sale como **La de esta misión: se duplicará**, el botón pasa a ser **Duplicar** y la duplicas. Es la forma de hacer una variante —más corta, para otro nivel— sin tocar la original.

## Qué se copia

- La misión: título, descripción, rareza y portada.
- Sus **enigmas**, con sus enunciados y sus recompensas.
- Sus **pistas**, en su orden y con su coste, como cuenta [pistas en las misiones](/ayuda/misiones/pistas-en-las-misiones).
- Sus **documentos**. Si después borras uno en una de las dos misiones, la otra lo conserva.
- Su **insignia**, si dejas marcada la casilla **Copiar también su insignia**: llega como una insignia nueva tuya, con la misma imagen.

Nada del alumnado: ni entregas, ni progreso, ni las pistas que haya usado, ni las insignias que ya se hayan ganado.

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

La copia llega **bloqueada**, **sin fecha límite**, aunque la original tuviera una, y **al final** del [orden de la clase](/ayuda/misiones/el-orden-de-las-misiones). Así la revisas con calma, le pones fecha si hace falta, la colocas en su sitio y la desbloqueas cuando quieras que tu alumnado empiece a entregar.

Queda anotada en el [historial](/ayuda/clases/el-historial-de-la-clase) de las dos clases: en la de destino, que se importó; en la de origen, quién se llevó una copia.

## Qué clases salen

**Como destino**, solo las clases activas en las que puedes editar misiones. Si no tienes ninguna, los botones de importar y copiar no aparecen.

**Como origen**, cualquiera de tus clases o de las compartidas contigo, aunque en ella solo tengas acceso de lectura. Las archivadas no salen de entrada: marca **Mostrar también las clases archivadas** para traerte algo del curso pasado.

> **¿Todas las misiones de una clase?** Para empezar el curso siguiente es más rápido [duplicar la clase](/ayuda/clases/duplicar-una-clase-para-el-curso-siguiente). Importar es para traerte una misión concreta.$itakai$;

-- clases/duplicar-una-clase-para-el-curso-siguiente: las misiones llegan con sus pistas.
UPDATE "help_articles" a
SET "body" = $itakai$Cuando empieza un curso nuevo no hace falta rehacer el trabajo: en los **Ajustes** de la clase, sección **Gestión**, **Duplicar** crea una copia limpia y te deja elegir qué te llevas.

## Qué puedes elegir

- **Misiones**: las misiones, en el mismo [orden](/ayuda/misiones/el-orden-de-las-misiones), con todos sus enigmas, sus [pistas](/ayuda/misiones/pistas-en-las-misiones) y sus recompensas.
- **Historia**: la narrativa y la imagen de portada.
- **Funcionalidades**: los recursos activos y los niveles de la clase.
- **Tienda**: los artículos, con sus precios.
- **Comportamientos.**

Marcas lo que quieras y el resto se queda en blanco. La copia se llama como la original, con «(copia)» detrás, y te lleva directamente a ella. Si copias las misiones, sus fechas de entrega vienen tal cual: revísalas antes de abrirlas al grupo.

## Qué no se copia nunca

**Nada del alumnado.** Ni las personas, ni sus entregas, ni la experiencia, ni los saldos, ni las pistas usadas, ni las insignias ganadas. La copia nace vacía de gente, que es justo lo que quieres en septiembre.

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

Es tentador borrar al alumnado del año pasado y volver a usar la misma clase, pero pierdes el histórico de un curso que puede que quieras consultar. Duplicando te quedas con las dos cosas: la clase del año pasado archivada y tal cual estaba, y una copia nueva lista para empezar.$itakai$;

-- clases/el-historial-de-la-clase: las pistas, y los cambios de orden de misiones y pistas.
UPDATE "help_articles" a
SET "body" = $itakai$La pestaña **Historial** de la clase cuenta qué ha hecho el profesorado en ella: quién, qué y cuándo. Es lo más útil cuando la clase es compartida y alguien pregunta quién cambió algo. La ve todo el profesorado de la clase, sea cual sea su nivel.

## Qué aparece

Todo lo relevante que hace el profesorado, con su autoría: cada línea lleva el nombre y el [avatar](/ayuda/tu-cuenta/tu-avatar-de-docente) de quien lo hizo.

- **Entregas**: cada aprobación, con quien entregó, el enigma y el porcentaje.
- **Comportamientos**: los que se aplican, a quién, y los que se crean, se editan o se borran. Lo aplicado a varios estudiantes de una vez sale en una sola línea, que se despliega para ver a quién.
- **Recompensas**: las recompensas libres, con su motivo y a quién.
- **Asistencia**: cada lista que se pasa, se corrige o se borra, con la fecha y cuántas personas vinieron y cuántas no.
- **Equipos**: las agrupaciones que se crean, se editan, se archivan o se borran, los cambios de equipo y cada premio a un equipo, con sus puntos y, si se repartió, a quién.
- **Misiones**, **Enigmas**, **Pistas** y **Documentos**: altas, cambios, borrados, bloqueos, cambios de recompensas y cambios de [orden](/ayuda/misiones/el-orden-de-las-misiones), y las misiones [importadas de otra clase](/ayuda/misiones/importar-una-mision-de-otra-clase) o copiadas en otra.
- **Tienda**: artículos añadidos, editados o quitados.
- **Alumnado**: cuentas creadas, contraseñas restablecidas, alias cambiados, avatares devueltos al catálogo y bajas de la clase.
- **Profesorado**: altas, cambios de perfil o de nivel, bajas y salidas.
- **Clase**: cambios de datos y de ajustes, la guía, archivar y desarchivar, publicar como plantilla, duplicar y los cambios de propiedad.

Lo que hace el alumnado por su cuenta —entregar, usar una pista, comprar en la tienda— no sale aquí: lo ves en la misión y en la tienda.

## Filtrar

Arriba tienes dos filtros: **Docente**, para ver solo lo de una persona (**Todo el profesorado** lo junta todo), y **Tipo**, para quedarte con un tipo de cosa, como **Entregas** o **Alumnado**. Lo más reciente sale primero, y la lista va por páginas.

## Cuentas y estudiantes que ya no están

Si se borró la cuenta de quien hizo algo, la línea conserva el nombre y el avatar que tenía al hacerlo. Si quien aparece ya no está en la clase, no se muestra su nombre: la línea dice que era alguien del alumnado que ya no está en la clase.

## Lo que ve el alumnado

El alumnado no ve el historial, pero en su actividad ve quién le aprobó cada entrega y quién le aplicó cada comportamiento, con su avatar.$itakai$, "updated_at" = CURRENT_TIMESTAMP
FROM "help_categories" c
WHERE c."id" = a."category_id" AND c."slug" = $itakai$clases$itakai$ AND a."locale" = 'es'
  AND a."slug" = $itakai$el-historial-de-la-clase$itakai$
  AND a."body" = $itakai$La pestaña **Historial** de la clase cuenta qué ha hecho el profesorado en ella: quién, qué y cuándo. Es lo más útil cuando la clase es compartida y alguien pregunta quién cambió algo. La ve todo el profesorado de la clase, sea cual sea su nivel.

## Qué aparece

Todo lo relevante que hace el profesorado, con su autoría: cada línea lleva el nombre y el [avatar](/ayuda/tu-cuenta/tu-avatar-de-docente) de quien lo hizo.

- **Entregas**: cada aprobación, con quien entregó, el enigma y el porcentaje.
- **Comportamientos**: los que se aplican, a quién, y los que se crean, se editan o se borran. Lo aplicado a varios estudiantes de una vez sale en una sola línea, que se despliega para ver a quién.
- **Recompensas**: las recompensas libres, con su motivo y a quién.
- **Asistencia**: cada lista que se pasa, se corrige o se borra, con la fecha y cuántas personas vinieron y cuántas no.
- **Equipos**: las agrupaciones que se crean, se editan, se archivan o se borran, los cambios de equipo y cada premio a un equipo, con sus puntos y, si se repartió, a quién.
- **Misiones**, **Enigmas** y **Documentos**: altas, cambios, borrados, bloqueos y cambios de recompensas, y las misiones [importadas de otra clase](/ayuda/misiones/importar-una-mision-de-otra-clase) o copiadas en otra.
- **Tienda**: artículos añadidos, editados o quitados.
- **Alumnado**: cuentas creadas, contraseñas restablecidas, alias cambiados, avatares devueltos al catálogo y bajas de la clase.
- **Profesorado**: altas, cambios de perfil o de nivel, bajas y salidas.
- **Clase**: cambios de datos y de ajustes, la guía, archivar y desarchivar, publicar como plantilla, duplicar y los cambios de propiedad.

Lo que hace el alumnado por su cuenta —entregar, comprar en la tienda— no sale aquí: lo ves en la misión y en la tienda.

## Filtrar

Arriba tienes dos filtros: **Docente**, para ver solo lo de una persona (**Todo el profesorado** lo junta todo), y **Tipo**, para quedarte con un tipo de cosa, como **Entregas** o **Alumnado**. Lo más reciente sale primero, y la lista va por páginas.

## Cuentas y estudiantes que ya no están

Si se borró la cuenta de quien hizo algo, la línea conserva el nombre y el avatar que tenía al hacerlo. Si quien aparece ya no está en la clase, no se muestra su nombre: la línea dice que era alguien del alumnado que ya no está en la clase.

## Lo que ve el alumnado

El alumnado no ve el historial, pero en su actividad ve quién le aprobó cada entrega y quién le aplicó cada comportamiento, con su avatar.$itakai$;
