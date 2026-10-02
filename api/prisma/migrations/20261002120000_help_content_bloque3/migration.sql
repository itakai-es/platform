-- Ayuda del bloque 3: importar una misión de otra clase y el catálogo público
-- de plantillas, que ahora enseña sus misiones y deja importarlas. Dos guías
-- nuevas y las correcciones de las que daban por hecho que las misiones no
-- viajan con la plantilla o que el catálogo era solo del profesorado.
--
-- Como el resto del contenido de serie, el panel de administración manda. Los
-- INSERT solo crean lo que no exista y van al final de su categoría; cada UPDATE
-- solo cambia un campo si sigue exactamente con el texto de serie, así que lo que
-- alguien haya editado se queda como está. Siempre por slug de categoría y de
-- artículo, nunca por id.

-- misiones/importar-una-mision-de-otra-clase
INSERT INTO "help_articles" ("id", "category_id", "slug", "title", "summary", "cover_image", "body", "locale", "status", "order_index", "featured", "audience", "kind", "published_at", "updated_at")
SELECT gen_random_uuid()::text, c."id", $itakai$importar-una-mision-de-otra-clase$itakai$, $itakai$Importar una misión de otra clase$itakai$, $itakai$Traer a una clase una misión de otra, o duplicarla, con sus enigmas y sus documentos.$itakai$, $itakai$/app/ayuda/duplicar.svg$itakai$, $itakai$**Una misión que ya funciona no hay que escribirla dos veces.** Puedes copiarla de una de tus clases a otra con sus enigmas, sus documentos y, si quieres, su insignia. La original no cambia y la copia es independiente: lo que retoques en una no toca la otra.

## Desde la clase que la recibe

En la pestaña **Misiones** de la clase, pulsa **Importar de otra clase**. Si la clase aún no tiene misiones, el botón está junto a **Crear primera misión**.

1. En **Clase de origen**, elige de qué clase la traes. Salen las tuyas y las que otros profesores comparten contigo, con el nombre de su propietario y cuántas misiones tiene cada una.
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

> **¿Todas las misiones de una clase?** Para empezar el curso siguiente es más rápido [duplicar la clase](/ayuda/clases/duplicar-una-clase-para-el-curso-siguiente). Importar es para traerte una misión concreta.$itakai$, 'es', 'publicado'::"HelpArticleStatus", (SELECT COALESCE(MAX(a."order_index"), -1) + 1 FROM "help_articles" a WHERE a."category_id" = c."id"), false, 'profesor'::"HelpAudience", 'guia'::"HelpArticleKind", CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM "help_categories" c WHERE c."slug" = $itakai$misiones$itakai$
ON CONFLICT ("category_id", "slug", "locale") DO NOTHING;

-- clases/el-catalogo-publico-de-plantillas
INSERT INTO "help_articles" ("id", "category_id", "slug", "title", "summary", "cover_image", "body", "locale", "status", "order_index", "featured", "audience", "kind", "published_at", "updated_at")
SELECT gen_random_uuid()::text, c."id", $itakai$el-catalogo-publico-de-plantillas$itakai$, $itakai$El catálogo público de plantillas$itakai$, $itakai$Las plantillas a la vista sin cuenta: buscar y filtrar, compartir el enlace de una e importarla.$itakai$, $itakai$/app/ayuda/publicar.svg$itakai$, $itakai$**Las plantillas publicadas se pueden ver sin tener cuenta.** El [catálogo público de plantillas](/plantillas) está en la página **Plantillas** de la web, enlazada desde la cabecera y el pie de la portada. Sirve para curiosear antes de registrarse y para pasarle a un compañero el enlace de una plantilla concreta.

## Buscar y filtrar

Arriba tienes el buscador, que busca por el nombre, y el botón **Filtros**, con cuatro filtros: **nivel**, **asignatura**, **idioma** y **provincia**. En cada uno puedes marcar varios valores, y vale cualquiera de ellos. La asignatura se desbloquea al elegir un nivel, porque cada nivel tiene las suyas.

Puedes ordenar por las más recientes o por nombre, y la **X** de **Limpiar filtros** lo deja todo como al entrar. Los resultados van por páginas.

> **Ojo con la provincia.** Es el único dato que no se pide al publicar, así que no todas la tienen. Una plantilla sin provincia no sale cuando filtras por provincia, aunque encaje en todo lo demás: si buscas algo que sirve en cualquier sitio, prueba también sin ese filtro.

## La ficha de una plantilla

**Ver plantilla** abre su ficha: el nombre, la portada, sus datos y, en pestañas, lo que trae.

- **Historia**: la narrativa entera.
- **Funcionalidades**: qué recursos tiene encendidos y cuáles no.
- **Misiones**: de cada una, el título, la rareza, cuántos enigmas tiene y sus recompensas. Los enunciados de los enigmas no se ven hasta importarla.
- **Tienda**: cada objeto con su precio, qué hace y si está oculto al alumnado.
- **Comportamientos**: si son positivos o negativos y qué efecto tienen.

Al lado tienes un resumen con cuántas misiones, objetos de tienda y comportamientos trae. No sale nada de quien la publicó.

## Compartir una plantilla

Cada plantilla tiene su propia dirección. **Copiar enlace**, en la cabecera de la ficha, la copia para pegarla en un correo o en un mensaje. Quien la abra ve la misma ficha, tenga cuenta o no.

## Importarla

Importar es cosa del profesorado:

- **Sin haber entrado**, la ficha lo dice y ofrece **Entrar**. Entra con tu cuenta de profesor y vuelve a abrir el enlace, o busca la plantilla en **Mis Clases → Plantillas**, donde está el mismo catálogo.
- **Con tu cuenta de profesor**, en **Usar esta plantilla** tienes el botón **Importar**. Si trae misiones, encima está la casilla para importar también sus misiones, con cuántas son, marcada de entrada. Al importarla, la plataforma te lleva a tu clase nueva.
- **Con una cuenta de alumno**, la ficha se ve igual, pero no se puede importar.

Qué llega exactamente lo cuenta [crear una clase desde cero o desde una plantilla](/ayuda/clases/crear-una-clase-desde-cero-o-desde-una-plantilla).

## Si se retira

Si quien la publicó la retira o archiva su clase, deja de salir en el catálogo y su enlace avisa de que **ya no está disponible**, con un botón para volver al catálogo. Las clases que ya se importaron de ella no cambian: cada importación es una clase independiente.

Si eres tú quien publica, lo que se ve y cómo retirarla está en [publicar tu clase como plantilla](/ayuda/clases/publicar-tu-clase-como-plantilla).$itakai$, 'es', 'publicado'::"HelpArticleStatus", (SELECT COALESCE(MAX(a."order_index"), -1) + 1 FROM "help_articles" a WHERE a."category_id" = c."id"), false, 'profesor'::"HelpAudience", 'guia'::"HelpArticleKind", CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM "help_categories" c WHERE c."slug" = $itakai$clases$itakai$
ON CONFLICT ("category_id", "slug", "locale") DO NOTHING;

-- clases/publicar-tu-clase-como-plantilla: El catálogo es público, enseña las misiones y se pueden importar con la plantilla.
UPDATE "help_articles" a
SET "summary" = $itakai$Qué se ve en el catálogo público, qué se copia al importarla y qué repasar antes de publicarla.$itakai$, "updated_at" = CURRENT_TIMESTAMP
FROM "help_categories" c
WHERE c."id" = a."category_id" AND c."slug" = $itakai$clases$itakai$ AND a."locale" = 'es'
  AND a."slug" = $itakai$publicar-tu-clase-como-plantilla$itakai$
  AND a."summary" = $itakai$Compartir tu trabajo con el resto del profesorado, y qué se limpia antes de publicarlo.$itakai$;

UPDATE "help_articles" a
SET "body" = $itakai$Si has montado una clase que funciona, puedes publicarla como **plantilla** para que otros docentes partan de ella. Se hace en los **Ajustes** de la clase, sección **Gestión**, con el interruptor **Publicar como plantilla**. Solo lo tiene el propietario de la clase, y antes hay que guardar la asignatura, el nivel educativo y el idioma en **Datos generales**. La provincia es opcional, pero una plantilla sin provincia no sale cuando alguien filtra por provincia.


![El recorrido de una plantilla: publicas tu clase, aparece en el catálogo y otro profesor se lleva una copia.](/app/ayuda/diagramas/flujo-plantillas.svg)
## Dónde se ve

Tu plantilla aparece en el [catálogo público de plantillas](/ayuda/clases/el-catalogo-publico-de-plantillas), que se abre **sin cuenta**: cualquiera puede ver su ficha y compartir su enlace. El profesorado de la plataforma la tiene también en **Mis Clases → Plantillas**.

Su ficha enseña:

- el nombre, la portada, los datos de la clase y la **historia** entera;
- las **funcionalidades** que tiene encendidas;
- las **misiones**: de cada una, el título, la rareza, cuántos enigmas tiene y sus recompensas;
- la **tienda**: cada objeto con su precio, qué hace y si está oculto al alumnado;
- los **comportamientos**: si son positivos o negativos y sus efectos.

En el catálogo público no sale nada de quien la publica. Dentro de la plataforma, el profesorado sí ve tu nombre en la tarjeta de la plantilla.

## Qué se copia

Quien la importa se lleva el marco de la clase: la narrativa y la portada, los recursos activos y los niveles, la tienda y los comportamientos. Si tu plantilla tiene misiones, puede llevárselas también, con sus enigmas enteros y el estado de cada una, activa o bloqueada. Llegan sin fecha límite, sin documentos y sin insignias: las fechas son de tu calendario, y los documentos y las insignias se quedan en tu clase.

La guía de clase no se copia nunca.

## Qué se queda fuera

**Todo lo que tenga que ver con personas.** No se comparte ningún alumno, ninguna entrega, ningún saldo ni ninguna estadística, ni el resto del profesorado de la clase. Quien importe tu plantilla recibe una clase vacía.

## Antes de publicar

Lo que publicas lo puede leer cualquiera, así que merece la pena repasar tres cosas:

1. **La narrativa**, por si menciona a tu grupo concreto, a tu centro o a un curso específico.
2. **Las misiones y sus enigmas.** Los títulos se ven en abierto, y quien importe la plantilla se lleva los enunciados enteros: que no lleven nombres de alumnos, datos de tu centro ni instrucciones que solo entienda tu grupo.
3. **Los nombres de la tienda y los comportamientos**, por si hay bromas internas que fuera de contexto no se entienden.

## Despublicar

Puedes retirar tu plantilla del catálogo cuando quieras, con el mismo interruptor. Una clase archivada también deja de estar en el catálogo. Quien abra después su enlace verá que ya no está disponible. Quien ya la haya importado se queda con su copia: importar crea una clase independiente, no un enlace a la tuya.

Si [pasas la propiedad](/ayuda/clases/traspasar-una-clase) de la clase, publicarla o retirarla pasa a ser cosa del nuevo propietario.$itakai$, "updated_at" = CURRENT_TIMESTAMP
FROM "help_categories" c
WHERE c."id" = a."category_id" AND c."slug" = $itakai$clases$itakai$ AND a."locale" = 'es'
  AND a."slug" = $itakai$publicar-tu-clase-como-plantilla$itakai$
  AND a."body" = $itakai$Si has montado una clase que funciona, puedes publicarla como **plantilla** para que cualquier otro docente de la instancia parta de ella. Se hace en los **Ajustes** de la clase, sección **Gestión**, con el interruptor **Publicar como plantilla**. Solo lo tiene el propietario de la clase, y antes hay que guardar la asignatura, el nivel educativo y el idioma en **Datos generales**.


![El recorrido de una plantilla: publicas tu clase, aparece en el catálogo y otro profesor se lleva una copia.](/app/ayuda/diagramas/flujo-plantillas.svg)
## Qué se comparte

Quien la importa se lleva el marco de la clase: la narrativa y la portada, los recursos activos y los niveles, la tienda y los comportamientos. Es la parte reutilizable — lo que a otro docente le ahorra las horas de montaje. Las misiones y la guía de clase no se copian.

## Qué se queda fuera

**Todo lo que tenga que ver con personas.** No se comparte ningún alumno, ninguna entrega, ningún saldo ni ninguna estadística. Quien importe tu plantilla recibe una clase vacía.

## Antes de publicar

Merece la pena repasar dos cosas:

1. **La narrativa**, por si menciona a tu grupo concreto, a tu centro o a un curso específico.
2. **Los nombres de la tienda y los comportamientos**, por si hay bromas internas que fuera de contexto no se entienden.

## Despublicar

Puedes retirar tu plantilla del catálogo cuando quieras, con el mismo interruptor. Una clase archivada también deja de estar en el catálogo. Quien ya la haya importado se queda con su copia: importar crea una clase independiente, no un enlace a la tuya.

Si [pasas la propiedad](/ayuda/clases/traspasar-una-clase) de la clase, publicarla o retirarla pasa a ser cosa del nuevo propietario.$itakai$;

-- clases/crear-una-clase-desde-cero-o-desde-una-plantilla: Las misiones se pueden importar con la plantilla; el catálogo está en Mis Clases y en abierto.
UPDATE "help_articles" a
SET "body" = $itakai$Además de crear una clase en blanco, puedes partir de una **plantilla**: una clase que otro docente ha publicado para que cualquiera la reutilice.

## Dónde están

En **Mis Clases**, el botón **Plantillas** abre el catálogo con todo lo publicado. Puedes buscar, filtrar por nivel, asignatura, idioma y provincia, y abrir una vista previa con **Previsualizar** antes de decidir. Las mismas plantillas están en el [catálogo público](/ayuda/clases/el-catalogo-publico-de-plantillas), que se abre sin cuenta y sirve para pasarle a alguien el enlace de una.

## Qué te traes al importar

Al importar una plantilla se crea una clase nueva con:

- La **narrativa** y la imagen de portada.
- Los **recursos activos** —qué usa esa clase y qué no— y sus niveles.
- La **tienda**: recompensas y poderes con sus precios.
- Los **comportamientos** configurados.

## Las misiones, si quieres

Si la plantilla tiene misiones, al importarla aparece la casilla para importar también sus misiones, con cuántas son, marcada de entrada. Por eso, en una plantilla con misiones, **Importar** abre primero la vista previa: en su pestaña **Misiones** ves cada una con su rareza, sus enigmas y sus recompensas, y decides si te las llevas.

Llegan con sus enigmas enteros y con el estado que tenían en la plantilla, activas o bloqueadas. No traen fecha límite, ni documentos, ni insignias: si los necesitas, se los añades tú.

> **Revisa las que lleguen activas.** Tu alumnado podrá entregarlas en cuanto entre en la clase. Si quieres repasarlas antes, bloquéalas hasta que estén a tu gusto.

Si desmarcas la casilla, la clase llega sin misiones y el contenido lo pones tú. Más adelante también puedes traerte una misión concreta de otra de tus clases: lo explica [importar una misión de otra clase](/ayuda/misiones/importar-una-mision-de-otra-clase).

## Qué no

Nunca viene la **guía de clase**, ni nada del alumnado ni del profesorado de la clase original: ni personas, ni progreso, ni saldos. Una plantilla es una clase vacía de gente.

## Después de importar

La clase importada es tuya —eres su propietario— y se edita como cualquier otra. Se llama como la plantilla, con «(copia)» detrás. Cambia lo que no encaje —precios, nombres, la propia narrativa, las misiones— antes de dar el código a tus alumnos.$itakai$, "updated_at" = CURRENT_TIMESTAMP
FROM "help_categories" c
WHERE c."id" = a."category_id" AND c."slug" = $itakai$clases$itakai$ AND a."locale" = 'es'
  AND a."slug" = $itakai$crear-una-clase-desde-cero-o-desde-una-plantilla$itakai$
  AND a."body" = $itakai$Además de crear una clase en blanco, puedes partir de una **plantilla**: una clase que otro docente ha publicado para que cualquiera la reutilice.

## Dónde están

En *Plantillas* tienes el catálogo con todo lo publicado en tu instancia. Puedes filtrar por asignatura, nivel e idioma, y ver una vista previa antes de decidir.

## Qué te traes al importar

Al importar una plantilla se copia:

- La **narrativa** y la imagen de portada.
- Los **recursos activos** —qué usa esa clase y qué no— y sus niveles.
- La **tienda**: recompensas y poderes con sus precios.
- Los **comportamientos** configurados.

## Qué no

**Las misiones no vienen en la importación.** La plantilla te da el marco —la historia, las reglas, la economía— y el contenido lo pones tú. Es una decisión deliberada: las misiones son lo más pegado a tu programación y a tu grupo.

Tampoco viene la **guía de clase**, ni nada del alumnado de la clase original: ni personas, ni progreso, ni saldos. Una plantilla es una clase vacía de gente.

## Después de importar

La clase importada es tuya —eres su propietario— y se edita como cualquier otra. Se llama como la plantilla, con «(copia)» detrás. Cambia lo que no encaje —precios, nombres, la propia narrativa— antes de dar el código a tus alumnos.$itakai$;

-- clases/el-historial-de-la-clase: Importar una misión o copiarla en otra clase queda anotado en las dos.
UPDATE "help_articles" a
SET "body" = $itakai$La pestaña **Historial** de la clase cuenta qué ha hecho el profesorado en ella: quién, qué y cuándo. Es lo más útil cuando la clase es compartida y alguien pregunta quién cambió algo. La ve todo el profesorado de la clase, sea cual sea su nivel.

## Qué aparece

Todo lo relevante que hace el profesorado, con su autor:

- **Entregas**: cada aprobación, con el alumno, el enigma y el porcentaje.
- **Comportamientos**: los que se aplican, a quién, y los que se crean, se editan o se borran.
- **Misiones**, **Enigmas** y **Documentos**: altas, cambios, borrados, bloqueos y cambios de recompensas, y las misiones [importadas de otra clase](/ayuda/misiones/importar-una-mision-de-otra-clase) o copiadas en otra.
- **Tienda**: artículos añadidos, editados o quitados.
- **Alumnado**: cuentas creadas, contraseñas restablecidas, alias cambiados y alumnos quitados de la clase.
- **Profesorado**: altas, cambios de perfil o de nivel, bajas y salidas.
- **Clase**: cambios de datos y de ajustes, la guía, archivar y desarchivar, publicar como plantilla, duplicar y los cambios de propiedad.

Lo que hace el alumnado por su cuenta —entregar, comprar en la tienda— no sale aquí: lo ves en la misión y en la tienda.

## Filtrar

Arriba tienes dos filtros: **Profesor**, para ver solo lo de una persona (**Todo el profesorado** los junta todos), y **Tipo**, para quedarte con un tipo de cosa, como **Entregas** o **Alumnado**. Lo más reciente sale primero, y la lista va por páginas.

## Cuentas y alumnos que ya no están

Si se borró la cuenta de quien hizo algo, la línea sale como **Cuenta eliminada**. Si el alumno ya no está en la clase, no se muestra su nombre: la línea dice que era un alumno que ya no está en la clase.

## Lo que ve el alumnado

El alumnado no ve el historial, pero en su actividad ve quién le aprobó cada entrega y quién le aplicó cada comportamiento.$itakai$, "updated_at" = CURRENT_TIMESTAMP
FROM "help_categories" c
WHERE c."id" = a."category_id" AND c."slug" = $itakai$clases$itakai$ AND a."locale" = 'es'
  AND a."slug" = $itakai$el-historial-de-la-clase$itakai$
  AND a."body" = $itakai$La pestaña **Historial** de la clase cuenta qué ha hecho el profesorado en ella: quién, qué y cuándo. Es lo más útil cuando la clase es compartida y alguien pregunta quién cambió algo. La ve todo el profesorado de la clase, sea cual sea su nivel.

## Qué aparece

Todo lo relevante que hace el profesorado, con su autor:

- **Entregas**: cada aprobación, con el alumno, el enigma y el porcentaje.
- **Comportamientos**: los que se aplican, a quién, y los que se crean, se editan o se borran.
- **Misiones**, **Enigmas** y **Documentos**: altas, cambios, borrados, bloqueos y cambios de recompensas.
- **Tienda**: artículos añadidos, editados o quitados.
- **Alumnado**: cuentas creadas, contraseñas restablecidas, alias cambiados y alumnos quitados de la clase.
- **Profesorado**: altas, cambios de perfil o de nivel, bajas y salidas.
- **Clase**: cambios de datos y de ajustes, la guía, archivar y desarchivar, publicar como plantilla, duplicar y los cambios de propiedad.

Lo que hace el alumnado por su cuenta —entregar, comprar en la tienda— no sale aquí: lo ves en la misión y en la tienda.

## Filtrar

Arriba tienes dos filtros: **Profesor**, para ver solo lo de una persona (**Todo el profesorado** los junta todos), y **Tipo**, para quedarte con un tipo de cosa, como **Entregas** o **Alumnado**. Lo más reciente sale primero, y la lista va por páginas.

## Cuentas y alumnos que ya no están

Si se borró la cuenta de quien hizo algo, la línea sale como **Cuenta eliminada**. Si el alumno ya no está en la clase, no se muestra su nombre: la línea dice que era un alumno que ya no está en la clase.

## Lo que ve el alumnado

El alumnado no ve el historial, pero en su actividad ve quién le aprobó cada entrega y quién le aplicó cada comportamiento.$itakai$;

-- misiones/crear-una-mision: Una misión que ya existe en otra clase se importa.
UPDATE "help_articles" a
SET "body" = $itakai$Una misión es una unidad de trabajo con su propia historia. Se crea desde la pestaña *Misiones* de la clase, con un asistente parecido al de la clase. Si ya la tienes en otra de tus clases, no hace falta escribirla otra vez: [impórtala](/ayuda/misiones/importar-una-mision-de-otra-clase) con sus enigmas y sus documentos.


![Las cinco fases de una misión: la creas, el alumno la ve, entrega, la revisas con un porcentaje y cobra las recompensas.](/app/ayuda/diagramas/flujo-mision.svg)
## Lo que define una misión

**Título y descripción.** La descripción es lo que lee el alumno antes de empezar: para qué sirve lo que va a hacer y qué papel juega en la historia de la clase.

**Rareza.** Común, rara, épica o legendaria. Marca el color con el que se ve la misión y, sobre todo, [el bonus que se lleva quien la completa entera](/ayuda/misiones/rarezas-y-fechas-de-entrega).

**Fecha de entrega.** Opcional. Si la pones, la misión deja de admitir entregas cuando pasa, y tus alumnos reciben un recordatorio 24 horas antes.

**Portada.** Una imagen que puedes subir o generar con la inteligencia artificial a partir de la descripción.

**Materiales.** Puedes adjuntar documentos a la misión: enunciados, plantillas, lecturas. Quedan junto al contenido al que pertenecen, que es donde el alumno los busca.

## Y después, los enigmas

Una misión sin enigmas no se puede completar: los enigmas son los pasos concretos que se entregan y se puntúan. Al terminar de crear la misión, lo siguiente es [añadirle enigmas](/ayuda/misiones/enigmas-los-pasos-de-una-mision).

## El estado de la misión

Una misión puede estar **activa** —visible y entregable— o **bloqueada**, que la deja a la vista pero sin admitir entregas. Sirve para preparar contenido con antelación y abrirlo el día que toca.$itakai$, "updated_at" = CURRENT_TIMESTAMP
FROM "help_categories" c
WHERE c."id" = a."category_id" AND c."slug" = $itakai$misiones$itakai$ AND a."locale" = 'es'
  AND a."slug" = $itakai$crear-una-mision$itakai$
  AND a."body" = $itakai$Una misión es una unidad de trabajo con su propia historia. Se crea desde la pestaña *Misiones* de la clase, con un asistente parecido al de la clase.


![Las cinco fases de una misión: la creas, el alumno la ve, entrega, la revisas con un porcentaje y cobra las recompensas.](/app/ayuda/diagramas/flujo-mision.svg)
## Lo que define una misión

**Título y descripción.** La descripción es lo que lee el alumno antes de empezar: para qué sirve lo que va a hacer y qué papel juega en la historia de la clase.

**Rareza.** Común, rara, épica o legendaria. Marca el color con el que se ve la misión y, sobre todo, [el bonus que se lleva quien la completa entera](/ayuda/misiones/rarezas-y-fechas-de-entrega).

**Fecha de entrega.** Opcional. Si la pones, la misión deja de admitir entregas cuando pasa, y tus alumnos reciben un recordatorio 24 horas antes.

**Portada.** Una imagen que puedes subir o generar con la inteligencia artificial a partir de la descripción.

**Materiales.** Puedes adjuntar documentos a la misión: enunciados, plantillas, lecturas. Quedan junto al contenido al que pertenecen, que es donde el alumno los busca.

## Y después, los enigmas

Una misión sin enigmas no se puede completar: los enigmas son los pasos concretos que se entregan y se puntúan. Al terminar de crear la misión, lo siguiente es [añadirle enigmas](/ayuda/misiones/enigmas-los-pasos-de-una-mision).

## El estado de la misión

Una misión puede estar **activa** —visible y entregable— o **bloqueada**, que la deja a la vista pero sin admitir entregas. Sirve para preparar contenido con antelación y abrirlo el día que toca.$itakai$;
