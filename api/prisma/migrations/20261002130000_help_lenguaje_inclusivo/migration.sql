-- Lenguaje que vale para los dos géneros en la ayuda de serie. Donde decía
-- profesor, alumno, propietario o un masculino genérico dirigido a quien lee
-- (todos, otros, inscrito…), ahora dice docente, estudiante, alumnado,
-- profesorado o la frase se reescribe para que concuerde. Los slugs y los enlaces
-- no cambian, y tampoco los nombres de botones y pestañas que se citan tal cual
-- salen en pantalla.
--
-- Como el resto del contenido de serie, el panel de administración manda: cada
-- UPDATE solo cambia un campo si sigue exactamente con el texto de serie, así que
-- lo que alguien haya editado se queda como está. Siempre por slug de categoría y
-- de artículo, nunca por id.

-- categoría alumnado
UPDATE "help_categories"
SET "description" = $itakai$Cómo lo ve el alumnado y cómo se gestiona.$itakai$, "updated_at" = CURRENT_TIMESTAMP
WHERE "slug" = $itakai$alumnado$itakai$
  AND "description" = $itakai$Cómo lo ve el alumno y cómo se gestiona.$itakai$;

-- categoría si-eres-alumno
UPDATE "help_categories"
SET "name" = $itakai$Si eres estudiante$itakai$, "updated_at" = CURRENT_TIMESTAMP
WHERE "slug" = $itakai$si-eres-alumno$itakai$
  AND "name" = $itakai$Si eres alumno$itakai$;

UPDATE "help_categories"
SET "description" = $itakai$Lo que necesitas saber tú, no tu docente.$itakai$, "updated_at" = CURRENT_TIMESTAMP
WHERE "slug" = $itakai$si-eres-alumno$itakai$
  AND "description" = $itakai$Lo que necesitas saber tú, no tu profesor.$itakai$;

-- primeros-pasos/que-es-itakai
UPDATE "help_articles" a
SET "body" = $itakai$ITAKAI convierte una asignatura en una aventura. Tú creas una **clase**, le pones una historia, y el temario se reparte en **misiones** que el alumnado completa entregando trabajo. Cada entrega que revisas reparte recursos, y esos recursos suben de nivel, compran cosas en la tienda de clase y aparecen en la clasificación.

## Las tres piezas

**La clase** es el contenedor: tu alumnado, tu narrativa y las reglas del juego. Decides qué recursos usa —puedes tener una clase solo con experiencia, o con monedas y tienda, o con todo— y esa decisión se puede cambiar en cualquier momento.

**Las misiones** son las unidades de trabajo. Cada una tiene una rareza, opcionalmente una fecha de entrega, y por dentro se divide en **enigmas**: los pasos concretos que el alumnado resuelve uno a uno. El enigma es lo que se entrega y lo que se puntúa.

**Los recursos** son lo que gana el alumnado. La experiencia hace subir de nivel, las monedas se gastan en la tienda que tú montas, el maná paga poderes y los puntos de vida suben o bajan con los comportamientos que registras en clase.

## Quién es quién

- **Profesorado**: crea clases, escribe misiones, revisa entregas y gestiona la tienda y los comportamientos. Una clase la puede impartir más de una persona, cada una con su nivel de acceso: [compartir una clase](/ayuda/clases/compartir-una-clase-con-otros-profesores).
- **Alumnado**: se une con un código —o entra con la cuenta que le crea su docente, si no tiene correo—, resuelve enigmas, gasta lo que gana y ve su progreso.
- **Administración**: gestiona la instancia completa — cuentas, clases, inteligencia artificial, almacenamiento y el centro de ayuda.

## Por dónde empezar

Si es tu primera vez, el camino corto es: [crear una clase](/ayuda/primeros-pasos/crear-tu-primera-clase), [invitar a tu alumnado](/ayuda/primeros-pasos/invitar-alumnos-a-una-clase) y [escribir tu primera misión](/ayuda/misiones/crear-una-mision). Con eso ya tienes una clase viva; el resto se añade cuando lo necesites.$itakai$, "updated_at" = CURRENT_TIMESTAMP
FROM "help_categories" c
WHERE c."id" = a."category_id" AND c."slug" = $itakai$primeros-pasos$itakai$ AND a."locale" = 'es'
  AND a."slug" = $itakai$que-es-itakai$itakai$
  AND a."body" = $itakai$ITAKAI convierte una asignatura en una aventura. Tú creas una **clase**, le pones una historia, y el temario se reparte en **misiones** que los alumnos completan entregando trabajo. Cada entrega que revisas reparte recursos, y esos recursos suben de nivel, compran cosas en la tienda de clase y aparecen en la clasificación.

## Las tres piezas

**La clase** es el contenedor: tus alumnos, tu narrativa y las reglas del juego. Decides qué recursos usa —puedes tener una clase solo con experiencia, o con monedas y tienda, o con todo— y esa decisión se puede cambiar en cualquier momento.

**Las misiones** son las unidades de trabajo. Cada una tiene una rareza, opcionalmente una fecha de entrega, y por dentro se divide en **enigmas**: los pasos concretos que el alumno resuelve uno a uno. El enigma es lo que se entrega y lo que se puntúa.

**Los recursos** son lo que el alumno gana. La experiencia hace subir de nivel, las monedas se gastan en la tienda que tú montas, el maná paga poderes y los puntos de vida suben o bajan con los comportamientos que registras en clase.

## Quién es quién

- **Profesorado**: crea clases, escribe misiones, revisa entregas y gestiona la tienda y los comportamientos. Una clase puede tener varios profesores, cada uno con su nivel de acceso: [compartir una clase](/ayuda/clases/compartir-una-clase-con-otros-profesores).
- **Alumnado**: se une con un código —o entra con la cuenta que le crea su profesor, si no tiene correo—, resuelve enigmas, gasta lo que gana y ve su progreso.
- **Administración**: gestiona la instancia completa — usuarios, clases, inteligencia artificial, almacenamiento y el centro de ayuda.

## Por dónde empezar

Si es tu primera vez, el camino corto es: [crear una clase](/ayuda/primeros-pasos/crear-tu-primera-clase), [invitar a tus alumnos](/ayuda/primeros-pasos/invitar-alumnos-a-una-clase) y [escribir tu primera misión](/ayuda/misiones/crear-una-mision). Con eso ya tienes una clase viva; el resto se añade cuando lo necesites.$itakai$;

-- primeros-pasos/crear-tu-primera-clase
UPDATE "help_articles" a
SET "body" = $itakai$Desde **Mis Clases**, el botón **Nueva Clase** abre un asistente que te va preguntando por partes. Ninguna decisión es definitiva: todo lo que eliges aquí se puede cambiar luego desde los ajustes de la clase.

## Lo que te va a preguntar

**Nombre y datos.** El nombre es lo que verá tu alumnado. Los datos —asignatura, nivel, idioma y provincia— sirven para que el resto del profesorado encuentre tu clase si algún día la publicas como plantilla, y no afectan a nada más.

**La narrativa.** Es la historia que envuelve la asignatura. Puedes escribirla tú o pedirle a la inteligencia artificial que te la proponga a partir de una idea suelta. No es decoración: las misiones que escribas después se apoyan en ella.

**Los recursos.** Aquí decides con qué juega tu clase: experiencia, monedas, maná, puntos de vida, tienda, insignias y niveles. Empieza con poco. Una clase con experiencia y misiones ya funciona, y añadir monedas más adelante no cuesta nada.

**El horario.** Si quieres que la plataforma sepa cuándo tienes esa clase, puedes definir las sesiones. Es opcional.

## Cuando termina

La clase se crea con un **código** de seis caracteres. Ese código es lo que le das a tu alumnado para que se una; lo tienes siempre a mano con el botón **Invitar**, en la cabecera de la clase.

> Si te has quedado a medias, no pasa nada: el asistente muestra al final una maqueta de cómo va a quedar la clase antes de crearla de verdad.

## Y ahora

Lo siguiente es [meter a tu alumnado](/ayuda/primeros-pasos/invitar-alumnos-a-una-clase) y [escribir la primera misión](/ayuda/misiones/crear-una-mision). Si prefieres no partir de cero, puedes [empezar desde una plantilla publicada por alguien del profesorado](/ayuda/clases/crear-una-clase-desde-cero-o-desde-una-plantilla).$itakai$, "updated_at" = CURRENT_TIMESTAMP
FROM "help_categories" c
WHERE c."id" = a."category_id" AND c."slug" = $itakai$primeros-pasos$itakai$ AND a."locale" = 'es'
  AND a."slug" = $itakai$crear-tu-primera-clase$itakai$
  AND a."body" = $itakai$Desde **Mis Clases**, el botón **Nueva Clase** abre un asistente que te va preguntando por partes. Ninguna decisión es definitiva: todo lo que eliges aquí se puede cambiar luego desde los ajustes de la clase.

## Lo que te va a preguntar

**Nombre y datos.** El nombre es lo que verán tus alumnos. Los datos —asignatura, nivel, idioma y provincia— sirven para que otros docentes encuentren tu clase si algún día la publicas como plantilla, y no afectan a nada más.

**La narrativa.** Es la historia que envuelve la asignatura. Puedes escribirla tú o pedirle a la inteligencia artificial que te la proponga a partir de una idea suelta. No es decoración: las misiones que escribas después se apoyan en ella.

**Los recursos.** Aquí decides con qué juega tu clase: experiencia, monedas, maná, puntos de vida, tienda, insignias y niveles. Empieza con poco. Una clase con experiencia y misiones ya funciona, y añadir monedas más adelante no cuesta nada.

**El horario.** Si quieres que la plataforma sepa cuándo tienes esa clase, puedes definir las sesiones. Es opcional.

## Cuando termina

La clase se crea con un **código** de seis caracteres. Ese código es lo que le das a tus alumnos para que se unan; lo tienes siempre a mano con el botón **Invitar**, en la cabecera de la clase.

> Si te has quedado a medias, no pasa nada: el asistente muestra al final una maqueta de cómo va a quedar la clase antes de crearla de verdad.

## Y ahora

Lo siguiente es [meter a tus alumnos](/ayuda/primeros-pasos/invitar-alumnos-a-una-clase) y [escribir la primera misión](/ayuda/misiones/crear-una-mision). Si prefieres no partir de cero, puedes [empezar desde una plantilla publicada por otro docente](/ayuda/clases/crear-una-clase-desde-cero-o-desde-una-plantilla).$itakai$;

-- primeros-pasos/invitar-alumnos-a-una-clase
UPDATE "help_articles" a
SET "title" = $itakai$Invitar al alumnado a una clase$itakai$, "updated_at" = CURRENT_TIMESTAMP
FROM "help_categories" c
WHERE c."id" = a."category_id" AND c."slug" = $itakai$primeros-pasos$itakai$ AND a."locale" = 'es'
  AND a."slug" = $itakai$invitar-alumnos-a-una-clase$itakai$
  AND a."title" = $itakai$Invitar alumnos a una clase$itakai$;

UPDATE "help_articles" a
SET "summary" = $itakai$El código de la clase y las cuentas sin correo: las dos formas de meter a tu alumnado.$itakai$, "updated_at" = CURRENT_TIMESTAMP
FROM "help_categories" c
WHERE c."id" = a."category_id" AND c."slug" = $itakai$primeros-pasos$itakai$ AND a."locale" = 'es'
  AND a."slug" = $itakai$invitar-alumnos-a-una-clase$itakai$
  AND a."summary" = $itakai$El código de la clase y las cuentas sin correo: las dos formas de meter a tus alumnos.$itakai$;

UPDATE "help_articles" a
SET "body" = $itakai$Hay dos formas de meter a tu alumnado en una clase: darle el **código** para que entre con su propia cuenta, o **crearle tú las cuentas**, pensado para quien no tiene correo. Las dos están en el mismo sitio: entra en la clase y pulsa **Invitar**, en la cabecera (en pantallas estrechas solo se ve su icono, una persona con un signo más).

**Invitar** solo aparece si tienes acceso de administración en la clase: lo explica [niveles y perfiles del profesorado](/ayuda/clases/niveles-y-perfiles-del-profesorado).

## El código de la clase

Es un código de seis caracteres que la plataforma crea junto con la clase. La ventana **Invitar al alumnado** se abre en la pestaña **Código de clase**, con el código en grande y el botón **Copiar Código**, para pegarlo donde quieras: el aula virtual, un correo al grupo o un mensaje. Proyectarlo en la pizarra funciona igual de bien. Tú lo compartes, tu alumnado lo escribe y ya está dentro: nadie tiene que aceptar nada.

También lo tienes a la vista al terminar de crear la clase.

## Qué hace el alumnado

Con su cuenta de estudiante, entra en **Mis Clases**, pulsa **Unirse a clase**, escribe el código y confirma con **Unirse a la clase**. En el móvil tiene **Unirse a Clase** arriba del todo, al abrir el menú. Da igual si lo escribe en mayúsculas o en minúsculas.

Entra directamente y la plataforma le lleva a la clase. Tú lo verás en la pestaña **Alumnado** de la clase la próxima vez que la abras.

Si el código no vale, quien lo escribe ve el motivo en la misma ventana: **«Código de clase inválido»** cuando está mal copiado o no es de ninguna clase, y **«Esta clase está archivada y no admite más estudiantes»** cuando es el de una clase archivada.

## Cuentas para quien no tiene correo

Si parte del grupo no tiene correo, o prefieres que no se registren por su cuenta, en la pestaña **Crear cuentas** de la misma ventana les das de alta tú, con usuario y contraseña, de uno en uno o con una lista. Las cuentas nacen ya matriculadas en la clase, sin código. Lo explica [dar de alta a estudiantes sin correo](/ayuda/alumnado/dar-de-alta-alumnos-sin-correo).

## Un código por clase

Si tienes varios grupos, cada clase tiene su propio código, y una clase duplicada estrena el suyo: asegúrate de repartir el que toca, y dáselo solo a tu grupo.

> **Ojo con las clases archivadas.** Una clase archivada no admite más alumnado: el botón **Invitar** aparece desactivado y quien intente unirse con su código recibe el aviso de arriba. Si vas a reutilizar una clase del curso pasado, mejor [duplicarla](/ayuda/clases/duplicar-una-clase-para-el-curso-siguiente) que desarchivarla.$itakai$, "updated_at" = CURRENT_TIMESTAMP
FROM "help_categories" c
WHERE c."id" = a."category_id" AND c."slug" = $itakai$primeros-pasos$itakai$ AND a."locale" = 'es'
  AND a."slug" = $itakai$invitar-alumnos-a-una-clase$itakai$
  AND a."body" = $itakai$Hay dos formas de meter a tus alumnos en una clase: darles el **código** para que entren con su propia cuenta, o **crearles tú las cuentas**, pensado para quien no tiene correo. Las dos están en el mismo sitio: entra en la clase y pulsa **Invitar**, en la cabecera (en pantallas estrechas solo se ve su icono, una persona con un signo más).

**Invitar** solo aparece si tienes acceso de administración en la clase: lo explica [niveles y perfiles del profesorado](/ayuda/clases/niveles-y-perfiles-del-profesorado).

## El código de la clase

Es un código de seis caracteres que la plataforma crea junto con la clase. La ventana **Invitar Alumnos** se abre en la pestaña **Código de clase**, con el código en grande y el botón **Copiar Código**, para pegarlo donde quieras: el aula virtual, un correo al grupo o un mensaje. Proyectarlo en la pizarra funciona igual de bien. Tú lo compartes, ellos lo escriben y ya están dentro: nadie tiene que aceptar nada.

También lo tienes a la vista al terminar de crear la clase.

## Qué hace el alumno

Con su cuenta de alumno, entra en **Mis Clases**, pulsa **Unirse a clase**, escribe el código y confirma con **Unirse a la clase**. En el móvil tiene **Unirse a Clase** arriba del todo, al abrir el menú. Da igual si lo escribe en mayúsculas o en minúsculas.

Entra directamente y la plataforma le lleva a la clase. Tú lo verás en la pestaña **Alumnos** de la clase la próxima vez que la abras.

Si el código no vale, el alumno ve el motivo en la misma ventana: **«Código de clase inválido»** cuando está mal copiado o no es de ninguna clase, y **«Esta clase está archivada y no admite nuevos alumnos»** cuando es el de una clase archivada.

## Cuentas para quien no tiene correo

Si parte del grupo no tiene correo, o prefieres que no se registren por su cuenta, en la pestaña **Crear cuentas** de la misma ventana les das de alta tú, con usuario y contraseña, de uno en uno o con una lista. Entran ya matriculados en la clase, sin código. Lo explica [dar de alta alumnos sin correo](/ayuda/alumnado/dar-de-alta-alumnos-sin-correo).

## Un código por clase

Si tienes varios grupos, cada clase tiene su propio código, y una clase duplicada estrena el suyo: asegúrate de repartir el que toca, y dáselo solo a tu grupo.

> **Ojo con las clases archivadas.** Una clase archivada no admite alumnos nuevos: el botón **Invitar** aparece desactivado y quien intente unirse con su código recibe el aviso de arriba. Si vas a reutilizar una clase del curso pasado, mejor [duplicarla](/ayuda/clases/duplicar-una-clase-para-el-curso-siguiente) que desarchivarla.$itakai$;

-- primeros-pasos/la-narrativa-de-tu-clase
UPDATE "help_articles" a
SET "body" = $itakai$La narrativa es la historia que envuelve tu asignatura: un naufragio, una expedición, un misterio por resolver. No es un adorno de la portada — es el hilo del que tiran las misiones.

## Dónde se nota

La narrativa aparece en la portada de la clase, en la **guía de clase** que tu alumnado puede consultar, y sobre todo en el tono de las misiones. Cuando le pides a la inteligencia artificial que te proponga una misión, lo primero que lee es la narrativa: si tu clase va de una travesía por el Mediterráneo, las misiones hablarán de puertos y tormentas, no de "unidad 3".

## Cómo escribirla

Puedes escribirla entera tú, en el editor de la clase, o darle a la IA una idea suelta —"quiero algo de mitología griega para 1º de la ESO, asignatura de matemáticas"— y quedarte con lo que te proponga. Lo que devuelve es un punto de partida editable, no algo cerrado.

Funciona mejor si incluyes:

- **Dónde ocurre** y en qué época o mundo.
- **Qué papel tiene el alumnado** dentro de la historia.
- **Qué está en juego**: qué se consigue al final del curso.

## Los dioses

La plataforma tiene cinco personajes que acompañan al alumnado —Atenea, Odiseo, Penélope, Polifemo y Posidón— y cada uno tiene su color y su carácter. El que elijas para tu clase es quien da la cara en el asistente y en los mensajes del sistema. Es un detalle pequeño que hace mucho por la coherencia.$itakai$, "updated_at" = CURRENT_TIMESTAMP
FROM "help_categories" c
WHERE c."id" = a."category_id" AND c."slug" = $itakai$primeros-pasos$itakai$ AND a."locale" = 'es'
  AND a."slug" = $itakai$la-narrativa-de-tu-clase$itakai$
  AND a."body" = $itakai$La narrativa es la historia que envuelve tu asignatura: un naufragio, una expedición, un misterio por resolver. No es un adorno de la portada — es el hilo del que tiran las misiones.

## Dónde se nota

La narrativa aparece en la portada de la clase, en la **guía de clase** que tus alumnos pueden consultar, y sobre todo en el tono de las misiones. Cuando le pides a la inteligencia artificial que te proponga una misión, lo primero que lee es la narrativa: si tu clase va de una travesía por el Mediterráneo, las misiones hablarán de puertos y tormentas, no de "unidad 3".

## Cómo escribirla

Puedes escribirla entera tú, en el editor de la clase, o darle a la IA una idea suelta —"quiero algo de mitología griega para 1º de la ESO, asignatura de matemáticas"— y quedarte con lo que te proponga. Lo que devuelve es un punto de partida editable, no algo cerrado.

Funciona mejor si incluyes:

- **Dónde ocurre** y en qué época o mundo.
- **Qué papel tiene el alumnado** dentro de la historia.
- **Qué está en juego**: qué se consigue al final del curso.

## Los dioses

La plataforma tiene cinco personajes que acompañan al alumnado —Atenea, Odiseo, Penélope, Polifemo y Posidón— y cada uno tiene su color y su carácter. El que elijas para tu clase es quien da la cara en el asistente y en los mensajes del sistema. Es un detalle pequeño que hace mucho por la coherencia.$itakai$;

-- primeros-pasos/donde-encontrar-ayuda
UPDATE "help_articles" a
SET "body" = $itakai$La ayuda está a un clic: **Centro de ayuda**, en el menú de la izquierda de tu panel. Si eres docente, está justo encima de «Acerca de»; si eres estudiante, debajo de tus secciones, justo antes de «Mi perfil». En el móvil está en el mismo sitio, dentro del menú.

## La ayuda de tu rol

El centro de ayuda tiene tres portadas: **Toda la ayuda**, **Profesorado** y **Alumnado**. Desde el menú entras directamente en la tuya, y puedes cambiar de portada con el selector de arriba.

Si abres un artículo desde un enlace sin haber elegido portada, la ayuda se coloca sola en la del artículo; si el artículo es para todo el mundo, en la de tu rol. La lista del lateral muestra los artículos de su categoría que tocan en esa portada.

## Buscar

Escribe en el buscador de la portada. No hace falta acertar con las tildes: «configuracion» encuentra «configuración».

## Tipos de artículo

La mayoría son **guías**. Los tutoriales, las preguntas frecuentes y los vídeos llevan su etiqueta en la lista de artículos de cada categoría, en los resultados de búsqueda y en el propio artículo. En los vídeos, el reproductor aparece encima del texto.

## Accesibilidad

Los ajustes de tamaño de letra, contraste, daltonismo y animación están en tu **perfil, pestaña Configuración**. Antes de iniciar sesión los tienes arriba, junto al selector de idioma; en la portada, si la pantalla es estrecha, dentro del menú.

## Volver

Si tienes la sesión iniciada, **Volver a la app**, en la cabecera, te lleva de vuelta a tu inicio. En pantallas estrechas, como la del móvil, ese botón no aparece.

Y al final de cada artículo puedes decir si te ha servido: nos ayuda a saber qué reescribir.$itakai$, "updated_at" = CURRENT_TIMESTAMP
FROM "help_categories" c
WHERE c."id" = a."category_id" AND c."slug" = $itakai$primeros-pasos$itakai$ AND a."locale" = 'es'
  AND a."slug" = $itakai$donde-encontrar-ayuda$itakai$
  AND a."body" = $itakai$La ayuda está a un clic: **Centro de ayuda**, en el menú de la izquierda de tu panel. Si eres profesor, está justo encima de «Acerca de»; si eres alumno, debajo de tus secciones, justo antes de «Mi perfil». En el móvil está en el mismo sitio, dentro del menú.

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

Y al final de cada artículo puedes decir si te ha servido: nos ayuda a saber qué reescribir.$itakai$;

-- clases/crear-una-clase-desde-cero-o-desde-una-plantilla
UPDATE "help_articles" a
SET "summary" = $itakai$Qué te traes al importar una plantilla publicada por otra persona y qué tienes que montar tú.$itakai$, "updated_at" = CURRENT_TIMESTAMP
FROM "help_categories" c
WHERE c."id" = a."category_id" AND c."slug" = $itakai$clases$itakai$ AND a."locale" = 'es'
  AND a."slug" = $itakai$crear-una-clase-desde-cero-o-desde-una-plantilla$itakai$
  AND a."summary" = $itakai$Qué te traes al importar una plantilla de otro docente y qué tienes que montar tú.$itakai$;

UPDATE "help_articles" a
SET "body" = $itakai$Además de crear una clase en blanco, puedes partir de una **plantilla**: una clase que alguien del profesorado ha publicado para que cualquiera la reutilice.

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

La clase importada es tuya —tienes su propiedad— y se edita como cualquier otra. Se llama como la plantilla, con «(copia)» detrás. Cambia lo que no encaje —precios, nombres, la propia narrativa, las misiones— antes de dar el código a tu alumnado.$itakai$, "updated_at" = CURRENT_TIMESTAMP
FROM "help_categories" c
WHERE c."id" = a."category_id" AND c."slug" = $itakai$clases$itakai$ AND a."locale" = 'es'
  AND a."slug" = $itakai$crear-una-clase-desde-cero-o-desde-una-plantilla$itakai$
  AND a."body" = $itakai$Además de crear una clase en blanco, puedes partir de una **plantilla**: una clase que otro docente ha publicado para que cualquiera la reutilice.

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

La clase importada es tuya —eres su propietario— y se edita como cualquier otra. Se llama como la plantilla, con «(copia)» detrás. Cambia lo que no encaje —precios, nombres, la propia narrativa, las misiones— antes de dar el código a tus alumnos.$itakai$;

-- clases/elegir-que-recursos-usa-tu-clase
UPDATE "help_articles" a
SET "body" = $itakai$En *Ajustes* de la clase, sección **Funcionalidades**, decides con qué juega tu grupo. Cada interruptor cambia lo que ve tu alumnado y lo que se reparte al revisar entregas. Cambiarlos pide acceso de administración en la clase.

## Qué hace cada uno

| Interruptor | Para qué sirve |
|---|---|
| **Experiencia (XP)** | Sube de nivel. Es la columna vertebral: casi todas las clases la usan |
| **Monedas** | Se gastan en la tienda que tú montas |
| **Maná** | Paga el uso de los poderes de la tienda |
| **Vidas** | Puntos de vida que suben y bajan con los comportamientos que registras |
| **Tienda** | La pantalla donde el alumnado canjea lo que ha ganado |
| **Ranking** | La clasificación del alumnado de la clase |
| **Comportamientos** | Acciones positivas o negativas que dan o quitan recursos |
| **Efectos visuales** | Animaciones como el confeti al subir de nivel |
| **Sonidos** | Efectos de sonido al subir de nivel, completar misiones y otros momentos |

Los rangos y los umbrales de experiencia no son un interruptor: se configuran en la sección **Niveles** de *Ajustes*. Las insignias se crean desde **Insignias**, en el menú lateral.

## Apagar un recurso no borra nada

Si desactivas las monedas, dejan de verse y **dejan de repartirse al revisar entregas**, aunque los enigmas tengan monedas configuradas. Los saldos que ya tuviera tu alumnado se quedan guardados: al volver a activarlas, aparecen otra vez tal cual estaban.

## Dependencias

Algunos ajustes necesitan otro para tener sentido —la tienda sin monedas no vende nada— y la propia pantalla te lo dice cuando ocurre. Y **al menos un recurso tiene que estar activo**: una clase sin ninguno no podría repartir nada al revisar una entrega.

> Empieza corto. Una clase con experiencia y misiones ya funciona el primer día; monedas, tienda y poderes se añaden cuando el grupo ya está rodado.$itakai$, "updated_at" = CURRENT_TIMESTAMP
FROM "help_categories" c
WHERE c."id" = a."category_id" AND c."slug" = $itakai$clases$itakai$ AND a."locale" = 'es'
  AND a."slug" = $itakai$elegir-que-recursos-usa-tu-clase$itakai$
  AND a."body" = $itakai$En *Ajustes* de la clase, sección **Funcionalidades**, decides con qué juega tu grupo. Cada interruptor cambia lo que ven tus alumnos y lo que se reparte al revisar entregas. Cambiarlos pide acceso de administración en la clase.

## Qué hace cada uno

| Interruptor | Para qué sirve |
|---|---|
| **Experiencia (XP)** | Sube de nivel. Es la columna vertebral: casi todas las clases la usan |
| **Monedas** | Se gastan en la tienda que tú montas |
| **Maná** | Paga el uso de los poderes de la tienda |
| **Vidas** | Puntos de vida que suben y bajan con los comportamientos que registras |
| **Tienda** | La pantalla donde el alumnado canjea lo que ha ganado |
| **Ranking** | La clasificación de los alumnos de la clase |
| **Comportamientos** | Acciones positivas o negativas que dan o quitan recursos |
| **Efectos visuales** | Animaciones como el confeti al subir de nivel |
| **Sonidos** | Efectos de sonido al subir de nivel, completar misiones y otros momentos |

Los rangos y los umbrales de experiencia no son un interruptor: se configuran en la sección **Niveles** de *Ajustes*. Las insignias se crean desde **Insignias**, en el menú lateral.

## Apagar un recurso no borra nada

Si desactivas las monedas, dejan de verse y **dejan de repartirse al revisar entregas**, aunque los enigmas tengan monedas configuradas. Los saldos que ya tuvieran tus alumnos se quedan guardados: al volver a activarlas, aparecen otra vez tal cual estaban.

## Dependencias

Algunos ajustes necesitan otro para tener sentido —la tienda sin monedas no vende nada— y la propia pantalla te lo dice cuando ocurre. Y **al menos un recurso tiene que estar activo**: una clase sin ninguno no podría repartir nada al revisar una entrega.

> Empieza corto. Una clase con experiencia y misiones ya funciona el primer día; monedas, tienda y poderes se añaden cuando el grupo ya está rodado.$itakai$;

-- clases/la-guia-de-clase
UPDATE "help_articles" a
SET "summary" = $itakai$El documento que tu alumnado consulta para saber de qué va todo esto.$itakai$, "updated_at" = CURRENT_TIMESTAMP
FROM "help_categories" c
WHERE c."id" = a."category_id" AND c."slug" = $itakai$clases$itakai$ AND a."locale" = 'es'
  AND a."slug" = $itakai$la-guia-de-clase$itakai$
  AND a."summary" = $itakai$El documento que tus alumnos consultan para saber de qué va todo esto.$itakai$;

UPDATE "help_articles" a
SET "body" = $itakai$La **guía de clase** es un documento libre que tu alumnado puede abrir en cualquier momento. Sirve para lo que tú quieras: las reglas del juego, el contexto de la historia, cómo se puntúa, qué se espera de cada estudiante.

## Cómo se escribe

Con el editor de la clase, que admite **markdown**: títulos, listas, negritas, tablas y enlaces. Lo que escribes se ve exactamente igual que en el resto de la plataforma.

Tienes también el botón de la inteligencia artificial: le cuentas qué quieres explicar y te devuelve un borrador que puedes editar. Como con todo lo que genera la IA, lo que sale es una propuesta — la última palabra es tuya.

## Qué merece la pena poner

- **Cómo se gana experiencia** en tu clase y qué la hace subir más.
- **Para qué sirven las monedas** y qué hay en la tienda.
- **Qué pasa si no entregas a tiempo.**
- El **contexto de la historia**, si la narrativa es larga.

## Y qué no

La guía no es el sitio para el temario ni para los materiales: para eso están los documentos que puedes adjuntar a cada misión, que quedan junto al contenido al que pertenecen.$itakai$, "updated_at" = CURRENT_TIMESTAMP
FROM "help_categories" c
WHERE c."id" = a."category_id" AND c."slug" = $itakai$clases$itakai$ AND a."locale" = 'es'
  AND a."slug" = $itakai$la-guia-de-clase$itakai$
  AND a."body" = $itakai$La **guía de clase** es un documento libre que tus alumnos pueden abrir en cualquier momento. Sirve para lo que tú quieras: las reglas del juego, el contexto de la historia, cómo se puntúa, qué se espera de ellos.

## Cómo se escribe

Con el editor de la clase, que admite **markdown**: títulos, listas, negritas, tablas y enlaces. Lo que escribes se ve exactamente igual que en el resto de la plataforma.

Tienes también el botón de la inteligencia artificial: le cuentas qué quieres explicar y te devuelve un borrador que puedes editar. Como con todo lo que genera la IA, lo que sale es una propuesta — la última palabra es tuya.

## Qué merece la pena poner

- **Cómo se gana experiencia** en tu clase y qué la hace subir más.
- **Para qué sirven las monedas** y qué hay en la tienda.
- **Qué pasa si no entregas a tiempo.**
- El **contexto de la historia**, si la narrativa es larga.

## Y qué no

La guía no es el sitio para el temario ni para los materiales: para eso están los documentos que puedes adjuntar a cada misión, que quedan junto al contenido al que pertenecen.$itakai$;

-- clases/duplicar-una-clase-para-el-curso-siguiente
UPDATE "help_articles" a
SET "body" = $itakai$Cuando empieza un curso nuevo no hace falta rehacer el trabajo: en los **Ajustes** de la clase, sección **Gestión**, **Duplicar** crea una copia limpia y te deja elegir qué te llevas.

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

Para duplicar una clase basta con poder verla, así que también puedes duplicar una que otro profesor comparte contigo. La copia nace con un solo profesor, tú, como propietario: el resto del profesorado de la original no pasa a ella. Si quieres volver a compartirla, [añádelos en la copia](/ayuda/clases/compartir-una-clase-con-otros-profesores).

## Por qué duplicar y no reutilizar

Es tentador borrar a los alumnos del año pasado y volver a usar la misma clase, pero pierdes el histórico de un curso que puede que quieras consultar. Duplicando te quedas con las dos cosas: la clase del año pasado archivada y tal cual estaba, y una copia nueva lista para empezar.$itakai$;

-- clases/publicar-tu-clase-como-plantilla
UPDATE "help_articles" a
SET "body" = $itakai$Si has montado una clase que funciona, puedes publicarla como **plantilla** para que el resto del profesorado parta de ella. Se hace en los **Ajustes** de la clase, sección **Gestión**, con el interruptor **Publicar como plantilla**. Solo lo ve quien tiene la propiedad de la clase, y antes hay que guardar la asignatura, el nivel educativo y el idioma en **Datos generales**. La provincia es opcional, pero una plantilla sin provincia no sale cuando alguien filtra por provincia.


![El recorrido de una plantilla: publicas tu clase, aparece en el catálogo y alguien del profesorado se lleva una copia.](/app/ayuda/diagramas/flujo-plantillas.svg)
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

**Todo lo que tenga que ver con personas.** No se comparte el alumnado, ni sus entregas, saldos o estadísticas, ni el resto del profesorado de la clase. Quien importe tu plantilla recibe una clase vacía.

## Antes de publicar

Lo que publicas lo puede leer cualquiera, así que merece la pena repasar tres cosas:

1. **La narrativa**, por si menciona a tu grupo concreto, a tu centro o a un curso específico.
2. **Las misiones y sus enigmas.** Los títulos se ven en abierto, y quien importe la plantilla se lleva los enunciados enteros: que no lleven nombres de estudiantes, datos de tu centro ni instrucciones que solo entienda tu grupo.
3. **Los nombres de la tienda y los comportamientos**, por si hay bromas internas que fuera de contexto no se entienden.

## Despublicar

Puedes retirar tu plantilla del catálogo cuando quieras, con el mismo interruptor. Una clase archivada también deja de estar en el catálogo. Quien abra después su enlace verá que ya no está disponible. Quien ya la haya importado se queda con su copia: importar crea una clase independiente, no un enlace a la tuya.

Si [pasas la propiedad](/ayuda/clases/traspasar-una-clase) de la clase, publicarla o retirarla pasa a ser cosa de quien la reciba.$itakai$, "updated_at" = CURRENT_TIMESTAMP
FROM "help_categories" c
WHERE c."id" = a."category_id" AND c."slug" = $itakai$clases$itakai$ AND a."locale" = 'es'
  AND a."slug" = $itakai$publicar-tu-clase-como-plantilla$itakai$
  AND a."body" = $itakai$Si has montado una clase que funciona, puedes publicarla como **plantilla** para que otros docentes partan de ella. Se hace en los **Ajustes** de la clase, sección **Gestión**, con el interruptor **Publicar como plantilla**. Solo lo tiene el propietario de la clase, y antes hay que guardar la asignatura, el nivel educativo y el idioma en **Datos generales**. La provincia es opcional, pero una plantilla sin provincia no sale cuando alguien filtra por provincia.


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

Si [pasas la propiedad](/ayuda/clases/traspasar-una-clase) de la clase, publicarla o retirarla pasa a ser cosa del nuevo propietario.$itakai$;

-- clases/compartir-una-clase-con-otros-profesores
UPDATE "help_articles" a
SET "title" = $itakai$Compartir una clase con más docentes$itakai$, "updated_at" = CURRENT_TIMESTAMP
FROM "help_categories" c
WHERE c."id" = a."category_id" AND c."slug" = $itakai$clases$itakai$ AND a."locale" = 'es'
  AND a."slug" = $itakai$compartir-una-clase-con-otros-profesores$itakai$
  AND a."title" = $itakai$Compartir una clase con otros profesores$itakai$;

UPDATE "help_articles" a
SET "summary" = $itakai$Añadir docentes a tu clase, cambiar su acceso, quitar a alguien o salir tú.$itakai$, "updated_at" = CURRENT_TIMESTAMP
FROM "help_categories" c
WHERE c."id" = a."category_id" AND c."slug" = $itakai$clases$itakai$ AND a."locale" = 'es'
  AND a."slug" = $itakai$compartir-una-clase-con-otros-profesores$itakai$
  AND a."summary" = $itakai$Añadir a otros docentes a tu clase, cambiar su acceso, quitarlos o salir tú.$itakai$;

UPDATE "help_articles" a
SET "body" = $itakai$Una clase no tiene por qué ser de una sola persona. Puedes compartirla con quien la imparte contigo, con quien te sustituye o con alguien en prácticas, y cada cual entra con el nivel de acceso que le toque.

## Añadir docentes

1. En la clase, abre **Ajustes** y la sección **Profesorado**.
2. Pulsa **Añadir docente**.
3. Escribe el **correo electrónico** exacto de su cuenta de docente en la plataforma.
4. Elige su **perfil** —titular, sustitución o prácticas— y su **nivel de acceso**. Cada perfil propone un nivel, que puedes cambiar: lo explica [niveles y perfiles del profesorado](/ayuda/clases/niveles-y-perfiles-del-profesorado).
5. Pulsa **Añadir**.

Entra al momento, sin tener que aceptar nada, y recibe un aviso. La clase le aparece en **Mis Clases**, y su alumnado y sus misiones en sus listados.

Para eso necesitas acceso de administración en la clase, y la otra persona necesita tener ya su cuenta de docente: si todavía no la tiene, que se registre primero.

## Si no se puede añadir

Si el correo no es el de una cuenta de docente, la plataforma responde «No se puede añadir a esa persona». Revisa que esté bien escrito y que sea el de su cuenta de docente, no el de una cuenta de estudiante. Los intentos por hora tienen un límite: si lo pasas, tendrás que esperar un rato antes de volver a probar.

## Cambiar o quitar

En la lista de **Profesorado**, el menú **⋮** de cada persona tiene **Cambiar perfil o nivel** y **Quitar de la clase**. Quien sale deja de ver la clase y recibe un aviso; lo que ya hizo en ella se queda. A quien tiene la propiedad no se le puede cambiar ni quitar.

## Salir de la clase

Cualquiera menos quien tiene la propiedad puede irse con **Salir de la clase**, debajo de la lista. Para volver, alguien con administración tendrá que añadirle otra vez. Quien tiene la propiedad, para salir, tiene que [pasar antes la propiedad](/ayuda/clases/traspasar-una-clase).

## Quién ve qué

La sección **Profesorado** la ve todo el profesorado de la clase, con el perfil y el nivel de cada persona. El alumnado ve en el **Resumen** de la clase quién la imparte, con su perfil. Cada cambio queda en el [historial de la clase](/ayuda/clases/el-historial-de-la-clase).

Al duplicar una clase compartida, la copia es solo tuya: el resto del profesorado no pasa a ella.$itakai$, "updated_at" = CURRENT_TIMESTAMP
FROM "help_categories" c
WHERE c."id" = a."category_id" AND c."slug" = $itakai$clases$itakai$ AND a."locale" = 'es'
  AND a."slug" = $itakai$compartir-una-clase-con-otros-profesores$itakai$
  AND a."body" = $itakai$Una clase no tiene por qué ser de un solo profesor. Puedes compartirla con quien la imparte contigo, con quien te sustituye o con alguien en prácticas, y cada uno entra con el nivel de acceso que le toque.

## Añadir a un profesor

1. En la clase, abre **Ajustes** y la sección **Profesorado**.
2. Pulsa **Añadir profesor**.
3. Escribe el **correo electrónico** exacto de su cuenta de profesor en la plataforma.
4. Elige su **perfil** —titular, sustituto o prácticas— y su **nivel de acceso**. Cada perfil propone un nivel, que puedes cambiar: lo explica [niveles y perfiles del profesorado](/ayuda/clases/niveles-y-perfiles-del-profesorado).
5. Pulsa **Añadir**.

Entra al momento, sin tener que aceptar nada, y recibe un aviso. La clase le aparece en **Mis Clases**, y sus alumnos y misiones en sus listados.

Para eso necesitas acceso de administración en la clase, y la otra persona necesita tener ya su cuenta de profesor: si todavía no la tiene, que se registre primero.

## Si no se puede añadir

Si el correo no es el de una cuenta de profesor, la plataforma responde «No se puede añadir a esa persona». Revisa que esté bien escrito y que sea el de su cuenta de profesor, no el de una cuenta de alumno. Los intentos por hora tienen un límite: si lo pasas, tendrás que esperar un rato antes de volver a probar.

## Cambiar o quitar

En la lista de **Profesorado**, el menú **⋮** de cada persona tiene **Cambiar perfil o nivel** y **Quitar de la clase**. Quien sale deja de ver la clase y recibe un aviso; lo que ya hizo en ella se queda. Al propietario no se le puede cambiar ni quitar.

## Salir de la clase

Cualquiera menos el propietario puede irse con **Salir de la clase**, debajo de la lista. Para volver, alguien con administración tendrá que añadirle otra vez. El propietario, para salir, tiene que [pasar antes la propiedad](/ayuda/clases/traspasar-una-clase).

## Quién ve qué

La sección **Profesorado** la ve todo el profesorado de la clase, con el perfil y el nivel de cada uno. El alumnado ve en el **Resumen** de la clase quién la imparte, con su perfil. Cada cambio queda en el [historial de la clase](/ayuda/clases/el-historial-de-la-clase).

Al duplicar una clase compartida, la copia es solo tuya: el resto del profesorado no pasa a ella.$itakai$;

-- clases/niveles-y-perfiles-del-profesorado
UPDATE "help_articles" a
SET "summary" = $itakai$Lectura, edición y administración: qué puede hacer cada nivel, y qué añade tener la propiedad.$itakai$, "updated_at" = CURRENT_TIMESTAMP
FROM "help_categories" c
WHERE c."id" = a."category_id" AND c."slug" = $itakai$clases$itakai$ AND a."locale" = 'es'
  AND a."slug" = $itakai$niveles-y-perfiles-del-profesorado$itakai$
  AND a."summary" = $itakai$Lectura, edición y administración: qué puede hacer cada uno, y qué añade ser el propietario.$itakai$;

UPDATE "help_articles" a
SET "body" = $itakai$Cada persona del profesorado de una clase tiene un **perfil** y un **nivel de acceso**. El perfil dice qué papel tiene; el nivel, qué puede hacer.

## Los perfiles

| Perfil | Nivel con el que entra |
|---|---|
| **Titular** | Administración |
| **Sustitución** | Edición |
| **Prácticas** | Lectura |

El perfil es una etiqueta: el nivel se elige aparte y se puede cambiar cuando haga falta. Si alguien en prácticas va a llevar la tienda durante unas semanas, dale edición y déjale el perfil.

## Los niveles

Cada nivel incluye todo lo del anterior.

**Lectura.** Ve la clase entera —misiones, alumnado, entregas, tienda, comportamientos, profesorado e historial— sin cambiar nada. Puede descargar las entregas, duplicar la clase y salir de ella. No recibe los avisos de entregas nuevas.

**Edición.** Además, cambia el contenido: la historia, la guía, el nombre, el horario y la portada de la clase; crea y edita misiones, enigmas y documentos; lleva la tienda y los comportamientos, y los aplica; aprueba entregas y gestiona las insignias vinculadas a las misiones de la clase. Le llega un aviso con cada entrega nueva.

**Administración.** Además, cambia los ajustes —funcionalidades, niveles, y la asignatura, el nivel educativo, el idioma y la provincia de *Datos generales*—, invita al alumnado, crea sus cuentas y las gestiona: restablece contraseñas, cambia alias y quita estudiantes de la clase. También lleva el profesorado y archiva la clase.

## La propiedad de la clase

Cada clase tiene una persona **propietaria**, al principio quien la creó. Tiene administración y es la única que puede [publicarla como plantilla](/ayuda/clases/publicar-tu-clase-como-plantilla) y [pasar la propiedad](/ayuda/clases/traspasar-una-clase) a otra persona. Nadie le puede cambiar el nivel ni quitarla de la clase, y no puede salir sin pasarla antes.

## Qué ves según tu nivel

Cada pantalla de la clase enseña solo lo que tu nivel permite: sin edición no aparece **Nueva Misión**, y sin administración no aparece **Invitar**. Donde puedes mirar pero no cambiar nada, verás el aviso «Tu acceso a esta clase te deja ver esto, pero no cambiarlo».

Si alguien te cambia el nivel, te llega un aviso, y la clase se pone al día en cuanto abres el aviso.$itakai$, "updated_at" = CURRENT_TIMESTAMP
FROM "help_categories" c
WHERE c."id" = a."category_id" AND c."slug" = $itakai$clases$itakai$ AND a."locale" = 'es'
  AND a."slug" = $itakai$niveles-y-perfiles-del-profesorado$itakai$
  AND a."body" = $itakai$Cada persona del profesorado de una clase tiene un **perfil** y un **nivel de acceso**. El perfil dice qué papel tiene; el nivel, qué puede hacer.

## Los perfiles

| Perfil | Nivel con el que entra |
|---|---|
| **Titular** | Administración |
| **Sustituto** | Edición |
| **Prácticas** | Lectura |

El perfil es una etiqueta: el nivel se elige aparte y se puede cambiar cuando haga falta. Si alguien en prácticas va a llevar la tienda durante unas semanas, dale edición y déjale el perfil.

## Los niveles

Cada nivel incluye todo lo del anterior.

**Lectura.** Ve la clase entera —misiones, alumnado, entregas, tienda, comportamientos, profesorado e historial— sin cambiar nada. Puede descargar las entregas, duplicar la clase y salir de ella. No recibe los avisos de entregas nuevas.

**Edición.** Además, cambia el contenido: la historia, la guía, el nombre, el horario y la portada de la clase; crea y edita misiones, enigmas y documentos; lleva la tienda y los comportamientos, y los aplica; aprueba entregas y gestiona las insignias vinculadas a las misiones de la clase. Le llega un aviso con cada entrega nueva.

**Administración.** Además, cambia los ajustes —funcionalidades, niveles, y la asignatura, el nivel educativo, el idioma y la provincia de *Datos generales*—, invita al alumnado, crea sus cuentas y las gestiona: restablece contraseñas, cambia alias y quita alumnos de la clase. También lleva el profesorado y archiva la clase.

## El propietario

Cada clase tiene un **propietario**, al principio quien la creó. Tiene administración y es el único que puede [publicarla como plantilla](/ayuda/clases/publicar-tu-clase-como-plantilla) y [pasar la propiedad](/ayuda/clases/traspasar-una-clase) a otra persona. Nadie le puede cambiar el nivel ni quitarle de la clase, y él no puede salir sin pasarla antes.

## Qué ves según tu nivel

Cada pantalla de la clase enseña solo lo que tu nivel permite: sin edición no aparece **Nueva Misión**, y sin administración no aparece **Invitar**. Donde puedes mirar pero no cambiar nada, verás el aviso «Tu acceso a esta clase te deja ver esto, pero no cambiarlo».

Si alguien te cambia el nivel, te llega un aviso, y la clase se pone al día en cuanto abres el aviso.$itakai$;

-- clases/traspasar-una-clase
UPDATE "help_articles" a
SET "summary" = $itakai$Pasar la propiedad de una clase a otra persona del profesorado, y qué pasa con tus clases si borras tu cuenta.$itakai$, "updated_at" = CURRENT_TIMESTAMP
FROM "help_categories" c
WHERE c."id" = a."category_id" AND c."slug" = $itakai$clases$itakai$ AND a."locale" = 'es'
  AND a."slug" = $itakai$traspasar-una-clase$itakai$
  AND a."summary" = $itakai$Pasar la propiedad de una clase a otro profesor, y qué pasa con tus clases si borras tu cuenta.$itakai$;

UPDATE "help_articles" a
SET "body" = $itakai$Cada clase tiene una sola persona **propietaria**. Si deja el centro o la clase pasa a otra persona, puede pasarle la propiedad sin perder nada de lo que hay dentro.

## Cómo

1. En la clase, abre **Ajustes** y la sección **Profesorado**.
2. En el menú **⋮** de la persona, elige **Pasar la propiedad** y confírmalo.

Solo lo puede hacer quien tiene la propiedad, y solo a alguien con acceso de **administración** en la clase. Si la persona tiene otro nivel, súbeselo antes con **Cambiar perfil o nivel**: hasta entonces, la opción no aparece. Si todavía no está en la clase, [añádela primero](/ayuda/clases/compartir-una-clase-con-otros-profesores).

## Qué cambia

- La otra persona pasa a ser la propietaria y recibe un aviso.
- Tú sigues en la clase con acceso de administración.
- Dejas de poder publicarla como plantilla y de pasar la propiedad. No se puede deshacer desde tu cuenta: solo la nueva propietaria podría devolvértela.

El alumnado, las misiones y todo lo demás siguen igual. El cambio queda en el [historial de la clase](/ayuda/clases/el-historial-de-la-clase).

## Si quieres dejar la clase

Quien tiene la propiedad no puede salir de la clase: primero tiene que pasar la propiedad. Después ya puede irse con **Salir de la clase**, en la misma sección.

## Si borras tu cuenta

Al borrar tu cuenta desde tu perfil, cada clase de la que tienes la propiedad pasa a otra persona con administración en ella, y antes de confirmar ves a quién va cada una. Si en alguna no hay nadie más con administración, la cuenta no se puede borrar todavía: da administración a alguien en esa clase, o pásale la propiedad, y vuelve a intentarlo.$itakai$, "updated_at" = CURRENT_TIMESTAMP
FROM "help_categories" c
WHERE c."id" = a."category_id" AND c."slug" = $itakai$clases$itakai$ AND a."locale" = 'es'
  AND a."slug" = $itakai$traspasar-una-clase$itakai$
  AND a."body" = $itakai$Cada clase tiene un solo **propietario**. Si deja el centro o la clase pasa a otra persona, puede pasarle la propiedad sin perder nada de lo que hay dentro.

## Cómo

1. En la clase, abre **Ajustes** y la sección **Profesorado**.
2. En el menú **⋮** de la persona, elige **Pasar la propiedad** y confírmalo.

Solo lo puede hacer el propietario, y solo a alguien con acceso de **administración** en la clase. Si la persona tiene otro nivel, súbeselo antes con **Cambiar perfil o nivel**: hasta entonces, la opción no aparece. Si todavía no está en la clase, [añádela primero](/ayuda/clases/compartir-una-clase-con-otros-profesores).

## Qué cambia

- La otra persona pasa a ser la propietaria y recibe un aviso.
- Tú sigues en la clase con acceso de administración.
- Dejas de poder publicarla como plantilla y de pasar la propiedad. No se puede deshacer desde tu cuenta: solo la nueva propietaria podría devolvértela.

Los alumnos, las misiones y todo lo demás siguen igual. El cambio queda en el [historial de la clase](/ayuda/clases/el-historial-de-la-clase).

## Si quieres dejar la clase

El propietario no puede salir de la clase: primero tiene que pasar la propiedad. Después ya puede irse con **Salir de la clase**, en la misma sección.

## Si borras tu cuenta

Al borrar tu cuenta desde tu perfil, cada clase de la que eres propietario pasa a otra persona con administración en ella, y antes de confirmar ves a quién va cada una. Si en alguna no hay nadie más con administración, la cuenta no se puede borrar todavía: da administración a alguien en esa clase, o pásale la propiedad, y vuelve a intentarlo.$itakai$;

-- clases/el-historial-de-la-clase
UPDATE "help_articles" a
SET "summary" = $itakai$Quién ha hecho qué en la clase, y cómo filtrarlo por docente o por tipo.$itakai$, "updated_at" = CURRENT_TIMESTAMP
FROM "help_categories" c
WHERE c."id" = a."category_id" AND c."slug" = $itakai$clases$itakai$ AND a."locale" = 'es'
  AND a."slug" = $itakai$el-historial-de-la-clase$itakai$
  AND a."summary" = $itakai$Quién ha hecho qué en la clase, y cómo filtrarlo por profesor o por tipo.$itakai$;

UPDATE "help_articles" a
SET "body" = $itakai$La pestaña **Historial** de la clase cuenta qué ha hecho el profesorado en ella: quién, qué y cuándo. Es lo más útil cuando la clase es compartida y alguien pregunta quién cambió algo. La ve todo el profesorado de la clase, sea cual sea su nivel.

## Qué aparece

Todo lo relevante que hace el profesorado, con su autoría:

- **Entregas**: cada aprobación, con quien entregó, el enigma y el porcentaje.
- **Comportamientos**: los que se aplican, a quién, y los que se crean, se editan o se borran.
- **Misiones**, **Enigmas** y **Documentos**: altas, cambios, borrados, bloqueos y cambios de recompensas, y las misiones [importadas de otra clase](/ayuda/misiones/importar-una-mision-de-otra-clase) o copiadas en otra.
- **Tienda**: artículos añadidos, editados o quitados.
- **Alumnado**: cuentas creadas, contraseñas restablecidas, alias cambiados y bajas de la clase.
- **Profesorado**: altas, cambios de perfil o de nivel, bajas y salidas.
- **Clase**: cambios de datos y de ajustes, la guía, archivar y desarchivar, publicar como plantilla, duplicar y los cambios de propiedad.

Lo que hace el alumnado por su cuenta —entregar, comprar en la tienda— no sale aquí: lo ves en la misión y en la tienda.

## Filtrar

Arriba tienes dos filtros: **Docente**, para ver solo lo de una persona (**Todo el profesorado** lo junta todo), y **Tipo**, para quedarte con un tipo de cosa, como **Entregas** o **Alumnado**. Lo más reciente sale primero, y la lista va por páginas.

## Cuentas y estudiantes que ya no están

Si se borró la cuenta de quien hizo algo, la línea sale como **Cuenta eliminada**. Si quien aparece ya no está en la clase, no se muestra su nombre: la línea dice que era alguien del alumnado que ya no está en la clase.

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

El alumnado no ve el historial, pero en su actividad ve quién le aprobó cada entrega y quién le aplicó cada comportamiento.$itakai$;

-- clases/el-catalogo-publico-de-plantillas
UPDATE "help_articles" a
SET "body" = $itakai$**Las plantillas publicadas se pueden ver sin tener cuenta.** El [catálogo público de plantillas](/plantillas) está en la página **Plantillas** de la web, enlazada desde la cabecera y el pie de la portada. Sirve para curiosear antes de registrarse y para pasarle a quien quieras el enlace de una plantilla concreta.

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

- **Sin haber entrado**, la ficha lo dice y ofrece **Entrar**. Entra con tu cuenta de docente y vuelve a abrir el enlace, o busca la plantilla en **Mis Clases → Plantillas**, donde está el mismo catálogo.
- **Con tu cuenta de docente**, en **Usar esta plantilla** tienes el botón **Importar**. Si trae misiones, encima está la casilla para importar también sus misiones, con cuántas son, marcada de entrada. Al importarla, la plataforma te lleva a tu clase nueva.
- **Con una cuenta de estudiante**, la ficha se ve igual, pero no se puede importar.

Qué llega exactamente lo cuenta [crear una clase desde cero o desde una plantilla](/ayuda/clases/crear-una-clase-desde-cero-o-desde-una-plantilla).

## Si se retira

Si quien la publicó la retira o archiva su clase, deja de salir en el catálogo y su enlace avisa de que **ya no está disponible**, con un botón para volver al catálogo. Las clases que ya se importaron de ella no cambian: cada importación es una clase independiente.

Si eres tú quien publica, lo que se ve y cómo retirarla está en [publicar tu clase como plantilla](/ayuda/clases/publicar-tu-clase-como-plantilla).$itakai$, "updated_at" = CURRENT_TIMESTAMP
FROM "help_categories" c
WHERE c."id" = a."category_id" AND c."slug" = $itakai$clases$itakai$ AND a."locale" = 'es'
  AND a."slug" = $itakai$el-catalogo-publico-de-plantillas$itakai$
  AND a."body" = $itakai$**Las plantillas publicadas se pueden ver sin tener cuenta.** El [catálogo público de plantillas](/plantillas) está en la página **Plantillas** de la web, enlazada desde la cabecera y el pie de la portada. Sirve para curiosear antes de registrarse y para pasarle a un compañero el enlace de una plantilla concreta.

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

Si eres tú quien publica, lo que se ve y cómo retirarla está en [publicar tu clase como plantilla](/ayuda/clases/publicar-tu-clase-como-plantilla).$itakai$;

-- misiones/crear-una-mision
UPDATE "help_articles" a
SET "body" = $itakai$Una misión es una unidad de trabajo con su propia historia. Se crea desde la pestaña *Misiones* de la clase, con un asistente parecido al de la clase. Si ya la tienes en otra de tus clases, no hace falta escribirla otra vez: [impórtala](/ayuda/misiones/importar-una-mision-de-otra-clase) con sus enigmas y sus documentos.


![Las cinco fases de una misión: la creas, tu alumnado la ve, entrega, la revisas con un porcentaje y cobra las recompensas.](/app/ayuda/diagramas/flujo-mision.svg)
## Lo que define una misión

**Título y descripción.** La descripción es lo que lee el alumnado antes de empezar: para qué sirve lo que va a hacer y qué papel juega en la historia de la clase.

**Rareza.** Común, rara, épica o legendaria. Marca el color con el que se ve la misión y, sobre todo, [el bonus que se lleva quien la completa entera](/ayuda/misiones/rarezas-y-fechas-de-entrega).

**Fecha de entrega.** Opcional. Si la pones, la misión deja de admitir entregas cuando pasa, y tu alumnado recibe un recordatorio 24 horas antes.

**Portada.** Una imagen que puedes subir o generar con la inteligencia artificial a partir de la descripción.

**Materiales.** Puedes adjuntar documentos a la misión: enunciados, plantillas, lecturas. Quedan junto al contenido al que pertenecen, que es donde el alumnado los busca.

## Y después, los enigmas

Una misión sin enigmas no se puede completar: los enigmas son los pasos concretos que se entregan y se puntúan. Al terminar de crear la misión, lo siguiente es [añadirle enigmas](/ayuda/misiones/enigmas-los-pasos-de-una-mision).

## El estado de la misión

Una misión puede estar **activa** —visible y entregable— o **bloqueada**, que la deja a la vista pero sin admitir entregas. Sirve para preparar contenido con antelación y abrirlo el día que toca.$itakai$, "updated_at" = CURRENT_TIMESTAMP
FROM "help_categories" c
WHERE c."id" = a."category_id" AND c."slug" = $itakai$misiones$itakai$ AND a."locale" = 'es'
  AND a."slug" = $itakai$crear-una-mision$itakai$
  AND a."body" = $itakai$Una misión es una unidad de trabajo con su propia historia. Se crea desde la pestaña *Misiones* de la clase, con un asistente parecido al de la clase. Si ya la tienes en otra de tus clases, no hace falta escribirla otra vez: [impórtala](/ayuda/misiones/importar-una-mision-de-otra-clase) con sus enigmas y sus documentos.


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

-- misiones/enigmas-los-pasos-de-una-mision
UPDATE "help_articles" a
SET "summary" = $itakai$Qué es un enigma, cómo se ordenan y qué entrega el alumnado en cada uno.$itakai$, "updated_at" = CURRENT_TIMESTAMP
FROM "help_categories" c
WHERE c."id" = a."category_id" AND c."slug" = $itakai$misiones$itakai$ AND a."locale" = 'es'
  AND a."slug" = $itakai$enigmas-los-pasos-de-una-mision$itakai$
  AND a."summary" = $itakai$Qué es un enigma, cómo se ordenan y qué entrega el alumno en cada uno.$itakai$;

UPDATE "help_articles" a
SET "body" = $itakai$El enigma es la unidad real de trabajo. La misión da el marco; el enigma es lo que el alumnado hace, entrega y ve puntuado.


![Las partes de una misión señaladas sobre su ficha: portada, rareza, fecha de entrega y los enigmas.](/app/ayuda/diagramas/anatomia-mision.svg)
## Cómo se componen

Cada enigma tiene un **título**, un **enunciado** y sus propias **recompensas**. Se ordenan dentro de la misión, y ese orden es el que ve el alumnado.

Un enigma puede ser cualquier cosa que acabe en una entrega: resolver un problema, grabar un audio, subir una foto de una maqueta, entregar un documento. El alumnado lo entrega siempre en **un archivo comprimido ZIP, RAR o 7Z de hasta 50 MB**, así que dentro cabe lo que haga falta: uno o varios archivos, del formato que sea.

## Qué hace cada estudiante

Abre la misión, elige un enigma y sube su archivo. La entrega queda **pendiente de revisión** y en su pantalla ve que la pelota está en tu tejado. Mientras tenga una entrega pendiente de ese enigma no puede subir otra, para que no se te acumulen tres versiones de lo mismo.

## Cuántos poner

No hay número mágico, pero conviene que cada enigma sea entregable en una sesión o dos. Una misión de dos enigmas gordos se atasca; una de ocho pequeños da sensación de avance continuo.

## Lo que pasa al completar el último

Cuando apruebas el enigma que faltaba, la misión se marca como completada y quien la ha hecho se lleva el bonus de rareza y la insignia asociada, si la misión tiene una. Eso ocurre una sola vez, en esa revisión.$itakai$, "updated_at" = CURRENT_TIMESTAMP
FROM "help_categories" c
WHERE c."id" = a."category_id" AND c."slug" = $itakai$misiones$itakai$ AND a."locale" = 'es'
  AND a."slug" = $itakai$enigmas-los-pasos-de-una-mision$itakai$
  AND a."body" = $itakai$El enigma es la unidad real de trabajo. La misión da el marco; el enigma es lo que el alumno hace, entrega y ve puntuado.


![Las partes de una misión señaladas sobre su ficha: portada, rareza, fecha de entrega y los enigmas.](/app/ayuda/diagramas/anatomia-mision.svg)
## Cómo se componen

Cada enigma tiene un **título**, un **enunciado** y sus propias **recompensas**. Se ordenan dentro de la misión, y ese orden es el que ve el alumnado.

Un enigma puede ser cualquier cosa que acabe en una entrega: resolver un problema, grabar un audio, subir una foto de una maqueta, entregar un documento. El alumno lo entrega siempre en **un archivo comprimido ZIP, RAR o 7Z de hasta 50 MB**, así que dentro cabe lo que haga falta: uno o varios archivos, del formato que sea.

## Qué hace el alumno

Abre la misión, elige un enigma y sube su archivo. La entrega queda **pendiente de revisión** y él ve que está en tu tejado. Mientras tenga una entrega pendiente de ese enigma no puede subir otra, para que no se te acumulen tres versiones de lo mismo.

## Cuántos poner

No hay número mágico, pero conviene que cada enigma sea entregable en una sesión o dos. Una misión de dos enigmas gordos se atasca; una de ocho pequeños da sensación de avance continuo.

## Lo que pasa al completar el último

Cuando apruebas el enigma que faltaba, la misión se marca como completada y el alumno se lleva el bonus de rareza y la insignia asociada, si la misión tiene una. Eso ocurre una sola vez, en esa revisión.$itakai$;

-- misiones/recompensas-xp-monedas-y-mana
UPDATE "help_articles" a
SET "body" = $itakai$**Las recompensas se configuran en el enigma, no en la misión.** Es el detalle que más despista al principio: la misión no tiene un "vale 300 XP" propio, sino que suma lo de sus enigmas.


![De dónde sale y en qué se gasta cada recurso: el XP sube de nivel y no se gasta, las monedas se gastan en la tienda y el maná en los poderes.](/app/ayuda/diagramas/circuito-recompensas.svg)
## Los tres recursos

Al crear o editar un enigma verás una fila por cada recurso que tu clase tenga activo:

- **Experiencia**, que sube de nivel.
- **Monedas**, que se gastan en la tienda.
- **Maná**, que paga los poderes.

Cada uno se pone por separado, con valores sugeridos a mano para no tener que pensarlos cada vez.

## Cómo se calcula el total de la misión

El total que ve el alumnado es la **suma de lo que dan sus enigmas más el bonus por completar la misión**, que depende de la rareza. Si tienes tres enigmas de 100 XP en una misión épica, el total son 300 más 200 de bonus: 500.

## Si cambias una recompensa a mitad de curso

Una vez que alguien ha completado un enigma, su recompensa **solo se puede subir, no bajar**. Es para no dejar a nadie con menos experiencia de la que ya se ganó. La plataforma te lo impide directamente en el formulario.

## Y si el recurso está apagado

Un enigma puede tener monedas configuradas y no repartir ninguna, si la clase tiene las monedas desactivadas. Se reparte lo que la clase usa, no lo que el enigma dice.$itakai$, "updated_at" = CURRENT_TIMESTAMP
FROM "help_categories" c
WHERE c."id" = a."category_id" AND c."slug" = $itakai$misiones$itakai$ AND a."locale" = 'es'
  AND a."slug" = $itakai$recompensas-xp-monedas-y-mana$itakai$
  AND a."body" = $itakai$**Las recompensas se configuran en el enigma, no en la misión.** Es el detalle que más despista al principio: la misión no tiene un "vale 300 XP" propio, sino que suma lo de sus enigmas.


![De dónde sale y en qué se gasta cada recurso: el XP sube de nivel y no se gasta, las monedas se gastan en la tienda y el maná en los poderes.](/app/ayuda/diagramas/circuito-recompensas.svg)
## Los tres recursos

Al crear o editar un enigma verás una fila por cada recurso que tu clase tenga activo:

- **Experiencia**, que sube de nivel.
- **Monedas**, que se gastan en la tienda.
- **Maná**, que paga los poderes.

Cada uno se pone por separado, con valores sugeridos a mano para no tener que pensarlos cada vez.

## Cómo se calcula el total de la misión

El total que ve el alumno es la **suma de lo que dan sus enigmas más el bonus por completar la misión**, que depende de la rareza. Si tienes tres enigmas de 100 XP en una misión épica, el total son 300 más 200 de bonus: 500.

## Si cambias una recompensa a mitad de curso

Una vez que un alumno ha completado un enigma, su recompensa **solo se puede subir, no bajar**. Es para no dejar a nadie con menos experiencia de la que ya se ganó. La plataforma te lo impide directamente en el formulario.

## Y si el recurso está apagado

Un enigma puede tener monedas configuradas y no repartir ninguna, si la clase tiene las monedas desactivadas. Se reparte lo que la clase usa, no lo que el enigma dice.$itakai$;

-- misiones/rarezas-y-fechas-de-entrega
UPDATE "help_articles" a
SET "body" = $itakai$## Las cuatro rarezas

La rareza marca el color de la misión y el **bonus que se lleva quien la completa entera**:

| Rareza | Bonus al completar |
|---|---|
| Común | 50 XP |
| Rara | 100 XP |
| Épica | 200 XP |
| Legendaria | 400 XP |

Ese bonus es aparte de lo que dan los enigmas, y se entrega una sola vez: en la revisión que cierra la misión.


![La escala de rarezas, de común a legendaria, y la recompensa que corresponde a cada una.](/app/ayuda/diagramas/rarezas-escala.svg)
## Cómo usarlas

Lo natural es que la rareza siga al esfuerzo. Una misión de repaso de una sesión, común; el proyecto de trimestre, legendaria. Si todo es legendario, la escala deja de decir nada.

## Las fechas de entrega

La fecha es opcional. Cuando la pones, pasan dos cosas:

1. Tu alumnado recibe un **recordatorio 24 horas antes**, en la plataforma y por correo si lo tiene activado. Quien ya haya completado la misión no lo recibe, y quien haya desactivado los recordatorios en su perfil, tampoco.
2. Cuando la fecha pasa, la misión **deja de admitir entregas nuevas**.

## Después de la fecha

Las entregas que ya estuvieran pendientes las puedes seguir revisando con normalidad: vencer cierra la puerta de entrada, no tu trabajo de corrección. Si necesitas dar margen a alguien, mueve la fecha de la misión — y ojo, porque al moverla se vuelve a mandar el recordatorio con el plazo nuevo.$itakai$, "updated_at" = CURRENT_TIMESTAMP
FROM "help_categories" c
WHERE c."id" = a."category_id" AND c."slug" = $itakai$misiones$itakai$ AND a."locale" = 'es'
  AND a."slug" = $itakai$rarezas-y-fechas-de-entrega$itakai$
  AND a."body" = $itakai$## Las cuatro rarezas

La rareza marca el color de la misión y el **bonus que se lleva quien la completa entera**:

| Rareza | Bonus al completar |
|---|---|
| Común | 50 XP |
| Rara | 100 XP |
| Épica | 200 XP |
| Legendaria | 400 XP |

Ese bonus es aparte de lo que dan los enigmas, y se entrega una sola vez: en la revisión que cierra la misión.


![La escala de rarezas, de común a legendaria, y la recompensa que corresponde a cada una.](/app/ayuda/diagramas/rarezas-escala.svg)
## Cómo usarlas

Lo natural es que la rareza siga al esfuerzo. Una misión de repaso de una sesión, común; el proyecto de trimestre, legendaria. Si todo es legendario, la escala deja de decir nada.

## Las fechas de entrega

La fecha es opcional. Cuando la pones, pasan dos cosas:

1. Tus alumnos reciben un **recordatorio 24 horas antes**, en la plataforma y por correo si lo tienen activado. Quien ya haya completado la misión no lo recibe, y quien haya desactivado los recordatorios en su perfil, tampoco.
2. Cuando la fecha pasa, la misión **deja de admitir entregas nuevas**.

## Después de la fecha

Las entregas que ya estuvieran pendientes las puedes seguir revisando con normalidad: vencer cierra la puerta de entrada, no tu trabajo de corrección. Si necesitas dar margen a alguien, mueve la fecha de la misión — y ojo, porque al moverla se vuelve a mandar el recordatorio con el plazo nuevo.$itakai$;

-- misiones/revisar-entregas
UPDATE "help_articles" a
SET "body" = $itakai$Cuando alguien del alumnado sube su archivo a un enigma, la entrega queda **pendiente** hasta que la revises. La revisión se hace en la propia misión: ahí decides con qué porcentaje se ha completado la tarea, y ese único número reparte todas las recompensas.


![Los tres estados de una entrega: pendiente, entregada y revisada. Los dos primeros los mueve el alumnado; el último, el profesorado.](/app/ayuda/diagramas/estados-entrega.svg)
## Dónde están las entregas

Si tienes acceso de edición o de administración en la clase, cada vez que alguien del alumnado entrega te llega un aviso en **Avisos**, en el menú de la izquierda. Al pulsarlo vas directamente a la misión, con la ventana de entregas de ese enigma abierta. En cuanto alguien del profesorado aprueba esa entrega, el aviso queda como leído para todo el profesorado.

También puedes llegar tú: en la clase, pestaña **Misiones**, abre la misión. Cada enigma tiene su botón **Ver entregas (N)**, donde N son las que quedan por revisar; en el móvil está en el menú **⋮** de cada enigma.

Y para saber si te queda algo pendiente, el **Resumen** de la clase muestra cuántas **Entregas por Revisar** hay.

## Cómo se revisa

La ventana de entregas lista las pendientes de ese enigma, con el alias de quien entrega y cuándo lo hizo.

1. Pulsa **Descargar** para bajar el archivo y revisarlo.
2. Pulsa **Valorar**.
3. Elige el porcentaje completado: **25%**, **50%**, **75%**, **100%** o el que escribas, de 1 a 100. Al lado, **Recibirá** te enseña lo que se llevará esa persona con ese porcentaje.
4. Pulsa **Aprobar**, que lleva el porcentaje elegido (por ejemplo, **Aprobar 75%**). La entrega sale de la lista y quien la hizo recibe el aviso al momento, y también por correo si lo tiene activado.

Si cambias de idea antes de aprobar, **Cancelar** cierra la valoración sin tocar nada.

Con acceso de lectura ves las entregas y las puedes descargar, pero no aparece **Valorar**: aprobar pide acceso de edición.

> No hay botón de rechazar, y es a propósito. Una entrega a medias se puntúa con el porcentaje que le corresponda; así cada estudiante se lleva lo que ha hecho en lugar de quedarse a cero.

## Qué se lleva cada estudiante

El porcentaje escala **las tres recompensas a la vez**, cada una sobre lo que valga ese enigma. Si un enigma da 100 XP, 20 monedas y 10 de maná, y lo puntúas al 70 %:

| Recurso | Del enigma | Al 70 % |
|---|---|---|
| Experiencia | 100 XP | 70 XP |
| Monedas | 20 | 14 |
| Maná | 10 | 7 |

Si tu clase tiene algún recurso desactivado en *Ajustes*, ese no se reparte: se queda en cero aunque el enigma lo tuviera configurado.

## Al completar la misión entera

Quien termina el último enigma pendiente se lleva además el **bonus por completar la misión** —entre 50 y 400 XP [según la rareza](/ayuda/misiones/rarezas-y-fechas-de-entrega)— y con él la insignia asociada, si la misión tiene una.

## Lo que no se puede repetir

Un enigma ya aprobado **no se puede volver a aprobar**: en la vista de quien lo entregó deja de tener el botón **Entregar**, y la plataforma nunca paga dos veces las recompensas del mismo enigma.

## Quién aprobó qué

Cada aprobación queda en el [historial de la clase](/ayuda/clases/el-historial-de-la-clase), con quién la hizo y con qué porcentaje. Cada estudiante también ve en su actividad quién le aprobó la entrega.$itakai$, "updated_at" = CURRENT_TIMESTAMP
FROM "help_categories" c
WHERE c."id" = a."category_id" AND c."slug" = $itakai$misiones$itakai$ AND a."locale" = 'es'
  AND a."slug" = $itakai$revisar-entregas$itakai$
  AND a."body" = $itakai$Cuando un alumno sube su archivo a un enigma, la entrega queda **pendiente** hasta que la revises. La revisión se hace en la propia misión: ahí decides con qué porcentaje se ha completado la tarea, y ese único número reparte todas las recompensas.


![Los tres estados de una entrega: pendiente, entregada y revisada. Los dos primeros los mueve el alumno; el último, el profesorado.](/app/ayuda/diagramas/estados-entrega.svg)
## Dónde están las entregas

Si tienes acceso de edición o de administración en la clase, cada vez que un alumno entrega te llega un aviso en **Avisos**, en el menú de la izquierda. Al pulsarlo vas directamente a la misión, con la ventana de entregas de ese enigma abierta. En cuanto alguien del profesorado aprueba esa entrega, el aviso queda como leído para todos.

También puedes llegar tú: en la clase, pestaña **Misiones**, abre la misión. Cada enigma tiene su botón **Ver entregas (N)**, donde N son las que quedan por revisar; en el móvil está en el menú **⋮** de cada enigma.

Y para saber si te queda algo pendiente, el **Resumen** de la clase muestra cuántas **Entregas por Revisar** hay.

## Cómo se revisa

La ventana de entregas lista las pendientes de ese enigma, con el alias del alumno y cuándo entregó.

1. Pulsa **Descargar** para bajar el archivo y revisarlo.
2. Pulsa **Valorar**.
3. Elige el porcentaje completado: **25%**, **50%**, **75%**, **100%** o el que escribas, de 1 a 100. Al lado, **Recibirá** te enseña lo que se llevará el alumno con ese porcentaje.
4. Pulsa **Aprobar**, que lleva el porcentaje elegido (por ejemplo, **Aprobar 75%**). La entrega sale de la lista y el alumno recibe el aviso al momento, y también por correo si lo tiene activado.

Si cambias de idea antes de aprobar, **Cancelar** cierra la valoración sin tocar nada.

Con acceso de lectura ves las entregas y las puedes descargar, pero no aparece **Valorar**: aprobar pide acceso de edición.

> No hay botón de rechazar, y es a propósito. Una entrega a medias se puntúa con el porcentaje que le corresponda; así el alumno se lleva lo que ha hecho en lugar de quedarse a cero.

## Qué se lleva el alumno

El porcentaje escala **las tres recompensas a la vez**, cada una sobre lo que valga ese enigma. Si un enigma da 100 XP, 20 monedas y 10 de maná, y lo puntúas al 70 %:

| Recurso | Del enigma | Al 70 % |
|---|---|---|
| Experiencia | 100 XP | 70 XP |
| Monedas | 20 | 14 |
| Maná | 10 | 7 |

Si tu clase tiene algún recurso desactivado en *Ajustes*, ese no se reparte: se queda en cero aunque el enigma lo tuviera configurado.

## Al completar la misión entera

Cuando el alumno termina el último enigma pendiente se lleva además el **bonus por completar la misión** —entre 50 y 400 XP [según la rareza](/ayuda/misiones/rarezas-y-fechas-de-entrega)— y con él la insignia asociada, si la misión tiene una.

## Lo que no se puede repetir

Un enigma ya aprobado **no se puede volver a aprobar**: para ese alumno deja de tener el botón **Entregar**, y la plataforma nunca paga dos veces las recompensas del mismo enigma.

## Quién aprobó qué

Cada aprobación queda en el [historial de la clase](/ayuda/clases/el-historial-de-la-clase), con quién la hizo y con qué porcentaje. El alumno también ve en su actividad quién le aprobó la entrega.$itakai$;

-- misiones/importar-una-mision-de-otra-clase
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

La copia llega **bloqueada** y **sin fecha límite**, aunque la original tuviera una. Así la revisas con calma, le pones fecha si hace falta y la desbloqueas cuando quieras que tu alumnado empiece a entregar.

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

> **¿Todas las misiones de una clase?** Para empezar el curso siguiente es más rápido [duplicar la clase](/ayuda/clases/duplicar-una-clase-para-el-curso-siguiente). Importar es para traerte una misión concreta.$itakai$;

-- gamificacion/monedas-y-tienda-de-clase
UPDATE "help_articles" a
SET "body" = $itakai$La tienda es donde lo que el alumnado gana se convierte en algo que le importa. La montas tú, artículo a artículo, y decides los precios.

## Dos tipos de artículo

**Recompensas.** Cosas que se canjean: "saltar una pregunta del examen", "elegir la música de la sesión", "un día sin deberes". Al canjearla, quien la compra gasta las monedas y a ti te queda constancia en el historial para cumplir tu parte.

Una recompensa puede ser **de un solo uso** —se canjea una vez y desaparece de su lista— o **ilimitada**, que se puede volver a comprar tantas veces como quiera pagar.

**Poderes.** Se compran con monedas pero además **cuestan maná cada vez que se usan**. Sirven para efectos que se repiten: recuperar puntos de vida, una pista, un intento extra. Cada estudiante acumula cargas y las va gastando.

## Poner precios

No hay tabla correcta, pero sí una regla útil: mira cuántas monedas reparte una misión completa y calcula cuántas misiones quieres que cueste cada cosa. Si una misión da 60 monedas y quieres que la recompensa buena cueste "tres misiones", son 180.

## El historial

Cada compra y cada uso quedan registrados con su fecha. Lo tienes en la pestaña de tienda de la clase, y cada estudiante tiene el suyo. Es lo que evita las discusiones de "yo ya lo había canjeado".

## Si no quieres tienda

Es perfectamente válido. Desactiva las monedas y la tienda en los ajustes de la clase y la pantalla desaparece para todo el mundo.$itakai$, "updated_at" = CURRENT_TIMESTAMP
FROM "help_categories" c
WHERE c."id" = a."category_id" AND c."slug" = $itakai$gamificacion$itakai$ AND a."locale" = 'es'
  AND a."slug" = $itakai$monedas-y-tienda-de-clase$itakai$
  AND a."body" = $itakai$La tienda es donde lo que el alumnado gana se convierte en algo que le importa. La montas tú, artículo a artículo, y decides los precios.

## Dos tipos de artículo

**Recompensas.** Cosas que se canjean: "saltar una pregunta del examen", "elegir la música de la sesión", "un día sin deberes". Al canjearla, el alumno gasta las monedas y a ti te queda constancia en el historial para cumplir tu parte.

Una recompensa puede ser **de un solo uso** —se canjea una vez y desaparece de su lista— o **ilimitada**, que se puede volver a comprar tantas veces como quiera pagar.

**Poderes.** Se compran con monedas pero además **cuestan maná cada vez que se usan**. Sirven para efectos que se repiten: recuperar puntos de vida, una pista, un intento extra. El alumno acumula cargas y las va gastando.

## Poner precios

No hay tabla correcta, pero sí una regla útil: mira cuántas monedas reparte una misión completa y calcula cuántas misiones quieres que cueste cada cosa. Si una misión da 60 monedas y quieres que la recompensa buena cueste "tres misiones", son 180.

## El historial

Cada compra y cada uso quedan registrados con su fecha. Lo tienes en la pestaña de tienda de la clase, y el alumno tiene el suyo. Es lo que evita las discusiones de "yo ya lo había canjeado".

## Si no quieres tienda

Es perfectamente válido. Desactiva las monedas y la tienda en los ajustes de la clase y la pantalla desaparece para todos.$itakai$;

-- gamificacion/comportamientos-y-puntos-de-vida
UPDATE "help_articles" a
SET "body" = $itakai$Los comportamientos son la forma de que lo que ocurre en el aula —para bien y para mal— tenga efecto en la partida.


![Ejemplos de comportamientos que suman puntos de vida y de comportamientos que los restan.](/app/ayuda/diagramas/vidas.svg)
## Cómo funcionan

Defines una lista de comportamientos para tu clase. Cada uno tiene un nombre, si es **positivo o negativo**, y cuánto mueve de cada recurso: experiencia, monedas y puntos de vida. Luego, en el momento, se lo aplicas a cualquier estudiante con dos clics desde la pestaña **Comportamientos** de la clase. Crearlos y aplicarlos pide acceso de edición en la clase.

Ejemplos que suelen funcionar: "ayuda a alguien de clase" (+15 XP, +5 monedas), "trae el material" (+10 XP), "interrumpe la clase" (−10 puntos de vida).

## Los puntos de vida

Cada estudiante empieza con 100 y se mueven solo con los comportamientos. No bloquean nada por sí solos: son un termómetro visible, y lo que hagas cuando alguien baje mucho es cosa tuya. Hay docentes que montan un poder en la tienda para recuperarlos, y así el sistema se cierra sobre sí mismo.

## Consejos de uso

- **Pocos y claros.** Con seis u ocho comportamientos bien elegidos se cubre casi todo el curso.
- **Que se vea.** Aplicarlo en el momento y en voz alta es la mitad del efecto.
- **Cuidado con lo negativo.** Un sistema que solo resta se convierte en un castigo con otro nombre.

## El registro

Todo lo aplicado queda con fecha, con quién lo aplicó y sobre quién. Lo ves en la pestaña **Historial** de la clase, con el tipo **Comportamientos** ([el historial de la clase](/ayuda/clases/el-historial-de-la-clase)), y en la ficha de cada estudiante, que también ve en su actividad quién se lo aplicó.$itakai$, "updated_at" = CURRENT_TIMESTAMP
FROM "help_categories" c
WHERE c."id" = a."category_id" AND c."slug" = $itakai$gamificacion$itakai$ AND a."locale" = 'es'
  AND a."slug" = $itakai$comportamientos-y-puntos-de-vida$itakai$
  AND a."body" = $itakai$Los comportamientos son la forma de que lo que ocurre en el aula —para bien y para mal— tenga efecto en la partida.


![Ejemplos de comportamientos que suman puntos de vida y de comportamientos que los restan.](/app/ayuda/diagramas/vidas.svg)
## Cómo funcionan

Defines una lista de comportamientos para tu clase. Cada uno tiene un nombre, si es **positivo o negativo**, y cuánto mueve de cada recurso: experiencia, monedas y puntos de vida. Luego, en el momento, se lo aplicas a un alumno con dos clics desde la pestaña **Comportamientos** de la clase. Crearlos y aplicarlos pide acceso de edición en la clase.

Ejemplos que suelen funcionar: "ayuda a un compañero" (+15 XP, +5 monedas), "trae el material" (+10 XP), "interrumpe la clase" (−10 puntos de vida).

## Los puntos de vida

Cada alumno empieza con 100 y se mueven solo con los comportamientos. No bloquean nada por sí solos: son un termómetro visible, y lo que hagas cuando alguien baje mucho es cosa tuya. Muchos docentes montan un poder en la tienda que permite recuperarlos, y así el sistema se cierra sobre sí mismo.

## Consejos de uso

- **Pocos y claros.** Con seis u ocho comportamientos bien elegidos se cubre casi todo el curso.
- **Que se vea.** Aplicarlo en el momento y en voz alta es la mitad del efecto.
- **Cuidado con lo negativo.** Un sistema que solo resta se convierte en un castigo con otro nombre.

## El registro

Todo lo aplicado queda con fecha, con quién lo aplicó y sobre quién. Lo ves en la pestaña **Historial** de la clase, con el tipo **Comportamientos** ([el historial de la clase](/ayuda/clases/el-historial-de-la-clase)), y en la ficha del alumno. El alumno también ve en su actividad quién se lo aplicó.$itakai$;

-- gamificacion/insignias
UPDATE "help_articles" a
SET "body" = $itakai$Las insignias son el reconocimiento visible de algo conseguido. A diferencia de la experiencia o las monedas, no se gastan ni se pierden: se quedan en el perfil de cada estudiante dentro de esa clase.

## Cómo se ganan

Una insignia se asocia a una **misión**. Cuando alguien completa esa misión entera —todos sus enigmas aprobados— la insignia entra en su colección automáticamente, junto con el bonus de experiencia por rareza.

## Crear una

En **Insignias**, en el menú de la izquierda, pulsa **Nueva insignia**. Eliges la **misión asociada**, le pones un nombre y una imagen y, si quieres, una descripción de por qué se consigue. La imagen puedes subirla o, con la misión elegida, pulsar **Generar con IA**, que propone el nombre, la descripción y la imagen; para insignias funciona sorprendentemente bien.

Una insignia sin misión no se entrega a nadie: queda guardada hasta que la vincules a una.

## En una clase compartida

Una insignia vinculada a una misión es de su clase: la puede cambiar cualquiera con acceso de edición en ella. Las que no tienen misión son solo de quien las creó.

## Dónde se ven

En el perfil de cada estudiante dentro de la clase, en su pantalla de insignias, y en las tarjetas de misión completada. Las que todavía no ha ganado aparecen bloqueadas, con su descripción visible: saber lo que falta es parte del incentivo.

## Cuántas poner

Una por misión importante, no una por misión. Si todas las misiones dan insignia, la colección deja de significar nada; si solo la dan las grandes, conseguir una es una noticia.$itakai$, "updated_at" = CURRENT_TIMESTAMP
FROM "help_categories" c
WHERE c."id" = a."category_id" AND c."slug" = $itakai$gamificacion$itakai$ AND a."locale" = 'es'
  AND a."slug" = $itakai$insignias$itakai$
  AND a."body" = $itakai$Las insignias son el reconocimiento visible de algo conseguido. A diferencia de la experiencia o las monedas, no se gastan ni se pierden: se quedan en el perfil del alumno dentro de esa clase.

## Cómo se ganan

Una insignia se asocia a una **misión**. Cuando un alumno completa esa misión entera —todos sus enigmas aprobados— la insignia entra en su colección automáticamente, junto con el bonus de experiencia por rareza.

## Crear una

En **Insignias**, en el menú de la izquierda, pulsa **Nueva insignia**. Eliges la **misión asociada**, le pones un nombre y una imagen y, si quieres, una descripción de por qué se consigue. La imagen puedes subirla o, con la misión elegida, pulsar **Generar con IA**, que propone el nombre, la descripción y la imagen; para insignias funciona sorprendentemente bien.

Una insignia sin misión no se entrega a nadie: queda guardada hasta que la vincules a una.

## En una clase compartida

Una insignia vinculada a una misión es de su clase: la puede cambiar cualquiera con acceso de edición en ella. Las que no tienen misión son solo de quien las creó.

## Dónde se ven

En el perfil del alumno dentro de la clase, en su pantalla de insignias, y en las tarjetas de misión completada. Las que todavía no ha ganado aparecen bloqueadas, con su descripción visible: saber lo que falta es parte del incentivo.

## Cuántas poner

Una por misión importante, no una por misión. Si todas las misiones dan insignia, la colección deja de significar nada; si solo la dan las grandes, conseguir una es una noticia.$itakai$;

-- gamificacion/niveles-y-rangos
UPDATE "help_articles" a
SET "body" = $itakai$El nivel es la traducción de la experiencia acumulada en un número visible, y el rango es el título que lo acompaña.


![La barra de experiencia con sus niveles: al alcanzar ciertos niveles cambia el rango de cada estudiante.](/app/ayuda/diagramas/xp-nivel.svg)
## Los rangos por defecto

| Niveles | Título |
|---|---|
| 1 – 4 | Mortal |
| 5 – 9 | Héroe Novato |
| 10 – 19 | Héroe |
| 20 – 29 | Semidiós |
| 30 – 50 | Dios del Olimpo |

Cada rango tiene su color, que es el que se ve en la clasificación y en la ficha de cada estudiante.

## Cambiarlos en tu clase

Desde *Ajustes → Niveles* puedes tocar tanto los umbrales de experiencia como los tramos y los títulos. Si tu narrativa no es mitológica, cambiar "Semidiós" por lo que encaje en tu historia es de las cosas que más se notan por poco esfuerzo.

## Cuánta experiencia hace falta

Los umbrales suben progresivamente: los primeros niveles caen rápido y los últimos cuestan. Es a propósito, para que el arranque enganche y el final tenga recorrido durante todo el curso.

Si al mes de empezar tu grupo ya está en nivel 20, es señal de que las recompensas de los enigmas van altas para el ritmo de tu clase. Puedes subir los umbrales sin tocar las misiones.

## Al subir de nivel

El alumnado ve una animación de subida de nivel al entrar. Si prefieres una clase más sobria, en el perfil de cada cuenta se pueden [reducir las animaciones](/ayuda/tu-cuenta/accesibilidad).$itakai$, "updated_at" = CURRENT_TIMESTAMP
FROM "help_categories" c
WHERE c."id" = a."category_id" AND c."slug" = $itakai$gamificacion$itakai$ AND a."locale" = 'es'
  AND a."slug" = $itakai$niveles-y-rangos$itakai$
  AND a."body" = $itakai$El nivel es la traducción de la experiencia acumulada en un número visible, y el rango es el título que lo acompaña.


![La barra de experiencia con sus niveles: al alcanzar ciertos niveles cambia el rango del alumno.](/app/ayuda/diagramas/xp-nivel.svg)
## Los rangos por defecto

| Niveles | Título |
|---|---|
| 1 – 4 | Mortal |
| 5 – 9 | Héroe Novato |
| 10 – 19 | Héroe |
| 20 – 29 | Semidiós |
| 30 – 50 | Dios del Olimpo |

Cada rango tiene su color, que es el que se ve en la clasificación y en la ficha del alumno.

## Cambiarlos en tu clase

Desde *Ajustes → Niveles* puedes tocar tanto los umbrales de experiencia como los tramos y los títulos. Si tu narrativa no es mitológica, cambiar "Semidiós" por lo que encaje en tu historia es de las cosas que más se notan por poco esfuerzo.

## Cuánta experiencia hace falta

Los umbrales suben progresivamente: los primeros niveles caen rápido y los últimos cuestan. Es a propósito, para que el arranque enganche y el final tenga recorrido durante todo el curso.

Si al mes de empezar tu grupo ya está en nivel 20, es señal de que las recompensas de los enigmas van altas para el ritmo de tu clase. Puedes subir los umbrales sin tocar las misiones.

## Al subir de nivel

El alumno ve una animación de subida de nivel al entrar. Si prefieres una clase más sobria, en el perfil de cada usuario se pueden [reducir las animaciones](/ayuda/tu-cuenta/accesibilidad).$itakai$;

-- alumnado/la-vista-del-alumno
UPDATE "help_articles" a
SET "title" = $itakai$La vista del alumnado$itakai$, "updated_at" = CURRENT_TIMESTAMP
FROM "help_categories" c
WHERE c."id" = a."category_id" AND c."slug" = $itakai$alumnado$itakai$ AND a."locale" = 'es'
  AND a."slug" = $itakai$la-vista-del-alumno$itakai$
  AND a."title" = $itakai$La vista del alumno$itakai$;

UPDATE "help_articles" a
SET "body" = $itakai$Conviene saber cómo se ve la plataforma desde el otro lado, porque muchas dudas de clase se resuelven sabiendo dónde está cada botón.


![Lo que ve el profesorado frente a lo que ve el alumnado en la misma clase.](/app/ayuda/diagramas/vista-roles.svg)
## Su inicio

Al entrar, cada estudiante ve sus clases, su progreso y lo que tiene pendiente. Si una misión está a punto de vencer, le aparece destacada.

## Dentro de una clase

Cada clase tiene sus pestañas:

- **Resumen**: su nivel, sus números y su actividad en esa clase, y el profesorado que la imparte, con el perfil de cada docente.
- **Historia** y **Guía**: la narrativa y las reglas que hayas escrito.
- **Misiones**: las activas primero, con su rareza, su fecha y cuánto lleva completado de cada una.
- **Ranking**: dónde está respecto al resto del grupo, si la clase tiene la clasificación activada.
- **Tienda**: qué puede comprar con lo que tiene, si la clase la usa.
- **Avatar**: su alias y su avatar en esa clase.

Las insignias, las conseguidas y las que faltan, las tiene en **Insignias**, en su menú.

## Cómo entrega

Abre la misión, elige un enigma, sube su archivo y espera. Mientras tenga una entrega pendiente de ese enigma no puede subir otra. Cuando la revisas, le llega un aviso con el porcentaje que le has puesto, y en su actividad ve quién se la aprobó; lo mismo con los comportamientos que se le aplican.

## Su perfil

Cada estudiante tiene su alias y su avatar **por clase**: puede llamarse de una forma en Matemáticas y de otra en Historia. Eso se explica en [avatares y alias](/ayuda/alumnado/avatares-y-alias-por-clase).

Si le has [creado tú la cuenta](/ayuda/alumnado/dar-de-alta-alumnos-sin-correo), entra con su usuario y la contraseña temporal de la hoja, y lo primero que ve es la pantalla para cambiarla: hasta que no elige una suya, no llega a nada más.

## Ver tu clase como la ve tu alumnado

Con **Ver como estudiante**, debajo de tu nombre en el menú de la izquierda (en pantallas anchas), entras en la plataforma con una cuenta de estudiante de prueba, dentro de todas tus clases, para revisarlas desde dentro. Esa matrícula de prueba no cuenta en los listados, ni en el recuento del alumnado, ni en la clasificación.$itakai$, "updated_at" = CURRENT_TIMESTAMP
FROM "help_categories" c
WHERE c."id" = a."category_id" AND c."slug" = $itakai$alumnado$itakai$ AND a."locale" = 'es'
  AND a."slug" = $itakai$la-vista-del-alumno$itakai$
  AND a."body" = $itakai$Conviene saber cómo se ve la plataforma desde el otro lado, porque muchas dudas de clase se resuelven sabiendo dónde está cada botón.


![Lo que ve el profesorado frente a lo que ve el alumnado en la misma clase.](/app/ayuda/diagramas/vista-roles.svg)
## Su inicio

Al entrar, el alumno ve sus clases, su progreso y lo que tiene pendiente. Si una misión está a punto de vencer, le aparece destacada.

## Dentro de una clase

Cada clase tiene sus pestañas:

- **Resumen**: su nivel, sus números y su actividad en esa clase, y el profesorado que la imparte, con el perfil de cada uno.
- **Historia** y **Guía**: la narrativa y las reglas que hayas escrito.
- **Misiones**: las activas primero, con su rareza, su fecha y cuánto lleva completado de cada una.
- **Ranking**: dónde está respecto al resto del grupo, si la clase tiene la clasificación activada.
- **Tienda**: qué puede comprar con lo que tiene, si la clase la usa.
- **Avatar**: su alias y su avatar en esa clase.

Las insignias, las conseguidas y las que faltan, las tiene en **Insignias**, en su menú.

## Cómo entrega

Abre la misión, elige un enigma, sube su archivo y espera. Mientras tenga una entrega pendiente de ese enigma no puede subir otra. Cuando la revisas, le llega un aviso con el porcentaje que le has puesto, y en su actividad ve quién se la aprobó; lo mismo con los comportamientos que se le aplican.

## Su perfil

Cada alumno tiene su alias y su avatar **por clase**: puede llamarse de una forma en Matemáticas y de otra en Historia. Eso se explica en [avatares y alias](/ayuda/alumnado/avatares-y-alias-por-clase).

Si le has [creado tú la cuenta](/ayuda/alumnado/dar-de-alta-alumnos-sin-correo), entra con su usuario y la contraseña temporal de la hoja, y lo primero que ve es la pantalla para cambiarla: hasta que no elige una suya, no llega a nada más.

## Ver tu clase como la ven ellos

Con **Ver como alumno**, debajo de tu nombre en el menú de la izquierda (en pantallas anchas), entras en la plataforma como un alumno de prueba, dentro de todas tus clases, para revisarlas desde dentro. Esa matrícula de prueba no cuenta en los listados, ni en el recuento de alumnos, ni en la clasificación.$itakai$;

-- alumnado/avatares-y-alias-por-clase
UPDATE "help_articles" a
SET "body" = $itakai$En ITAKAI la identidad de cada estudiante **es por clase, no por cuenta**. La misma persona puede ser "Capitana Nemo" en tu clase de Ciencias y "Aristóteles" en la de Filosofía, con avatares distintos.

## Por qué

Porque la narrativa es de la clase. Un alias que encaja en una travesía por el Egeo no encaja en un laboratorio del futuro, y obligar a elegir uno para todo rompería las dos historias.

## El alias

Al unirse a la clase, cada estudiante recibe un alias mitológico al azar, y puede cambiarlo cuando quiera en la pestaña **Avatar** de la clase. Es lo que se ve en la clasificación, en las entregas y en el historial.

## El avatar

Al unirse también recibe uno al azar. Para cambiarlo, en la misma pestaña **Avatar**, hay dos caminos:

1. **Elegir uno del catálogo**, con los personajes de la plataforma.
2. **Generarlo con inteligencia artificial**, describiendo con palabras cómo lo quiere. La descripción se convierte en una imagen a partir de la guía del personaje elegido.

## Moderación

Los alias y los avatares los ves en la pestaña **Alumnado** de la clase, junto al nombre real de cada estudiante, y en su ficha. Si un alias no encaja y tienes administración en la clase, cámbialo con **Cambiar alias**, en su menú **⋮**: [cambiar el alias o quitar a alguien de la clase](/ayuda/alumnado/cambiar-el-alias-o-quitar-a-un-alumno-de-la-clase). El avatar no se edita desde tu lado: si no encaja, pide que lo cambie en su pestaña **Avatar**. Merece la pena dejar claras las reglas del juego el primer día, en la [guía de clase](/ayuda/clases/la-guia-de-clase).$itakai$, "updated_at" = CURRENT_TIMESTAMP
FROM "help_categories" c
WHERE c."id" = a."category_id" AND c."slug" = $itakai$alumnado$itakai$ AND a."locale" = 'es'
  AND a."slug" = $itakai$avatares-y-alias-por-clase$itakai$
  AND a."body" = $itakai$En ITAKAI la identidad de un alumno **es por clase, no por cuenta**. La misma persona puede ser "Capitana Nemo" en tu clase de Ciencias y "Aristóteles" en la de Filosofía, con avatares distintos.

## Por qué

Porque la narrativa es de la clase. Un alias que encaja en una travesía por el Egeo no encaja en un laboratorio del futuro, y obligar a elegir uno para todo rompería las dos historias.

## El alias

Al unirse a la clase, cada alumno recibe un alias mitológico al azar, y puede cambiarlo cuando quiera en la pestaña **Avatar** de la clase. Es lo que se ve en la clasificación, en las entregas y en el historial.

## El avatar

Al unirse también recibe uno al azar. Para cambiarlo, en la misma pestaña **Avatar**, hay dos caminos:

1. **Elegir uno del catálogo**, con los personajes de la plataforma.
2. **Generarlo con inteligencia artificial**, describiendo con palabras cómo lo quiere. La descripción se convierte en una imagen a partir de la guía del personaje elegido.

## Moderación

Los alias y los avatares los ves en la pestaña **Alumnos** de la clase, junto al nombre real de cada uno, y en la ficha de cada alumno. Si un alias no encaja y tienes administración en la clase, cámbialo con **Cambiar alias**, en el menú **⋮** del alumno: [cambiar el alias o quitar a un alumno](/ayuda/alumnado/cambiar-el-alias-o-quitar-a-un-alumno-de-la-clase). El avatar no se edita desde tu lado: si no encaja, pide al alumno que lo cambie en su pestaña **Avatar**. Merece la pena dejar claras las reglas del juego el primer día, en la [guía de clase](/ayuda/clases/la-guia-de-clase).$itakai$;

-- alumnado/clasificacion-y-progreso
UPDATE "help_articles" a
SET "summary" = $itakai$Cómo se ordena el ranking, qué ve cada estudiante y cómo seguir a alguien en concreto.$itakai$, "updated_at" = CURRENT_TIMESTAMP
FROM "help_categories" c
WHERE c."id" = a."category_id" AND c."slug" = $itakai$alumnado$itakai$ AND a."locale" = 'es'
  AND a."slug" = $itakai$clasificacion-y-progreso$itakai$
  AND a."summary" = $itakai$Cómo se ordena el ranking, qué ve cada alumno y cómo seguir a uno en concreto.$itakai$;

UPDATE "help_articles" a
SET "body" = $itakai$## La clasificación

Ordena al alumnado de una clase por la **experiencia acumulada en esa clase**. No es global: cada clase tiene la suya, y la experiencia de una no cuenta en otra.

Los tres primeros puestos salen en un podio y el resto en lista, cada estudiante con su nivel, su rango y su avatar. Cada estudiante ve siempre su puesto destacado, esté donde esté.

## Si no quieres competición

La clasificación se puede desactivar en los ajustes de la clase. Hay grupos donde el ranking motiva y grupos donde desanima a quien más lo necesita — es una decisión pedagógica, y la plataforma no la toma por ti.

## El progreso de cada estudiante

Desde la pestaña del alumnado, al abrir una ficha tienes todo lo suyo: experiencia, nivel, monedas, maná, puntos de vida, misiones completadas, insignias, entregas y el historial de comportamientos aplicados, con fechas.

Es la vista que sirve para una tutoría: en una pantalla está lo que ha hecho y cuándo.

## Ordenar el listado

El listado del alumnado se puede ordenar por nombre, nivel, experiencia, monedas, maná o vida, para encontrar rápido a quien va con retraso o a quien lleva semanas sin entregar.$itakai$, "updated_at" = CURRENT_TIMESTAMP
FROM "help_categories" c
WHERE c."id" = a."category_id" AND c."slug" = $itakai$alumnado$itakai$ AND a."locale" = 'es'
  AND a."slug" = $itakai$clasificacion-y-progreso$itakai$
  AND a."body" = $itakai$## La clasificación

Ordena a los alumnos de una clase por la **experiencia acumulada en esa clase**. No es global: cada clase tiene la suya, y la experiencia de una no cuenta en otra.

Los tres primeros salen en un podio y el resto en lista, cada uno con su nivel, su rango y su avatar. El alumno se ve siempre a sí mismo destacado, esté donde esté.

## Si no quieres competición

La clasificación se puede desactivar en los ajustes de la clase. Hay grupos donde el ranking motiva y grupos donde desanima a quien más lo necesita — es una decisión pedagógica, y la plataforma no la toma por ti.

## Seguir a un alumno

Desde la pestaña de alumnos, al abrir una ficha tienes todo lo suyo: experiencia, nivel, monedas, maná, puntos de vida, misiones completadas, insignias, entregas y el historial de comportamientos aplicados, con fechas.

Es la vista que sirve para una tutoría: en una pantalla está lo que ha hecho y cuándo.

## Ordenar el listado

El listado de alumnos se puede ordenar por nombre, nivel, experiencia, monedas, maná o vida, para encontrar rápido a quien va rezagado o a quien lleva semanas sin entregar.$itakai$;

-- alumnado/dar-de-alta-alumnos-sin-correo
UPDATE "help_articles" a
SET "title" = $itakai$Dar de alta a estudiantes sin correo$itakai$, "updated_at" = CURRENT_TIMESTAMP
FROM "help_categories" c
WHERE c."id" = a."category_id" AND c."slug" = $itakai$alumnado$itakai$ AND a."locale" = 'es'
  AND a."slug" = $itakai$dar-de-alta-alumnos-sin-correo$itakai$
  AND a."title" = $itakai$Dar de alta alumnos sin correo$itakai$;

UPDATE "help_articles" a
SET "body" = $itakai$Para el alumnado que no tiene correo —o que prefieres que no se registre por su cuenta— puedes crear tú las cuentas. Cada estudiante entra con un **usuario** y una **contraseña temporal** que le das tú, y la cambia la primera vez que entra. La cuenta nace ya matriculada en tu clase: no necesita el código.

## Dónde se hace

Entra en la clase, pulsa **Invitar**, en la cabecera, y abre la pestaña **Crear cuentas**. Hace falta acceso de administración en la clase, y la clase no puede estar archivada.

Hay dos formas, y con las dos puedes crear hasta 50 cuentas de una vez:

- **Escribir los nombres**: una fila por estudiante. Con **Añadir otra fila** sumas una más.
- **Pegar o subir una lista**: para traerla de una hoja de cálculo o de un CSV. Se explica en [importar una lista de estudiantes](/ayuda/alumnado/importar-una-lista-de-alumnos).

## El usuario

Al escribir el nombre, la plataforma propone un usuario: el nombre, la inicial del apellido y un sufijo corto, como `ana.g.k7`. Puedes cambiarlo antes de crear la cuenta. Admite letras sin tilde, números y los signos `.`, `_` y `-`, de 3 a 30 caracteres.

El usuario es único en toda la plataforma. Si el que escribes ya lo tiene otra cuenta, se usa uno parecido con un sufijo detrás; el definitivo es el que sale en la hoja de credenciales. Al entrar da igual si se escribe en mayúsculas o en minúsculas.

## Al crear las cuentas

Pulsa el botón de crear, que dice cuántas van (por ejemplo, **Crear 3 cuentas**). Se crean todas a la vez o ninguna: si una fila tiene un problema, no se crea nada hasta que la corrijas o la quites. Cada cuenta queda matriculada en la clase con un alias y un avatar al azar, como cualquiera que entra con el código.

Al terminar se abre la [hoja de credenciales](/ayuda/alumnado/la-hoja-de-credenciales), con el usuario y la contraseña temporal de cada cuenta. **Es la única vez que se ven las contraseñas**: cópialas, descárgalas o imprímelas antes de recargar la página.

## En la lista de la clase

En la pestaña **Alumnado**, estas cuentas llevan la etiqueta **Sin correo**, y mientras nadie entre con su contraseña temporal, también **Pendiente de entrar**. Hasta esa primera entrada, el resto de la clase no ve la cuenta: no sale en el ranking ni cuenta en las medias de la clase. Si la contraseña se pierde antes de entrar, restablécela y habrá una nueva. Desde el menú **⋮** de cada una puedes [restablecer su contraseña](/ayuda/alumnado/restablecer-la-contrasena-de-un-alumno), y también [cambiar su alias o quitarla de la clase](/ayuda/alumnado/cambiar-el-alias-o-quitar-a-un-alumno-de-la-clase).

## Lo que conviene saber

- Esta clase es su **clase de origen**: su contraseña la restablece quien tiene administración en ella.
- Con esa cuenta se puede unir a otras clases con su código, como con cualquier otra.
- No puede cambiar su nombre ni su usuario, añadir un correo a la cuenta ni borrarla.
- Se pueden crear cuentas aunque el registro público de la plataforma esté cerrado.

Lo que tiene que hacer cada estudiante para entrar está en [entrar con usuario y contraseña](/ayuda/si-eres-alumno/entrar-con-usuario-y-contrasena).$itakai$, "updated_at" = CURRENT_TIMESTAMP
FROM "help_categories" c
WHERE c."id" = a."category_id" AND c."slug" = $itakai$alumnado$itakai$ AND a."locale" = 'es'
  AND a."slug" = $itakai$dar-de-alta-alumnos-sin-correo$itakai$
  AND a."body" = $itakai$Para el alumnado que no tiene correo —o que prefieres que no se registre por su cuenta— puedes crear tú las cuentas. Cada alumno entra con un **usuario** y una **contraseña temporal** que le das tú, y la cambia la primera vez que entra. La cuenta nace ya matriculada en tu clase: no necesita el código.

## Dónde se hace

Entra en la clase, pulsa **Invitar**, en la cabecera, y abre la pestaña **Crear cuentas**. Hace falta acceso de administración en la clase, y la clase no puede estar archivada.

Hay dos formas, y con las dos puedes crear hasta 50 cuentas de una vez:

- **Escribir los nombres**: una fila por alumno. Con **Añadir otro alumno** sumas una fila más.
- **Pegar o subir una lista**: para traerla de una hoja de cálculo o de un CSV. Se explica en [importar una lista de alumnos](/ayuda/alumnado/importar-una-lista-de-alumnos).

## El usuario

Al escribir el nombre, la plataforma propone un usuario: el nombre, la inicial del apellido y un sufijo corto, como `ana.g.k7`. Puedes cambiarlo antes de crear la cuenta. Admite letras sin tilde, números y los signos `.`, `_` y `-`, de 3 a 30 caracteres.

El usuario es único en toda la plataforma. Si el que escribes ya lo tiene otra cuenta, se usa uno parecido con un sufijo detrás; el definitivo es el que sale en la hoja de credenciales. Al entrar da igual si el alumno lo escribe en mayúsculas o en minúsculas.

## Al crear las cuentas

Pulsa el botón de crear, que dice cuántas van (por ejemplo, **Crear 3 cuentas**). Se crean todas a la vez o ninguna: si una fila tiene un problema, no se crea nada hasta que la corrijas o la quites. Cada alumno queda matriculado en la clase con un alias y un avatar al azar, como cualquiera que entra con el código.

Al terminar se abre la [hoja de credenciales](/ayuda/alumnado/la-hoja-de-credenciales), con el usuario y la contraseña temporal de cada uno. **Es la única vez que se ven las contraseñas**: cópialas, descárgalas o imprímelas antes de recargar la página.

## En la lista de la clase

En la pestaña **Alumnos**, estas cuentas llevan la etiqueta **Sin correo**, y mientras el alumno no entre con su contraseña temporal, también **Pendiente de entrar**. Hasta que entra por primera vez, sus compañeros no lo ven: no sale en el ranking ni cuenta en las medias de la clase. Si ha perdido la contraseña antes de entrar, restablécela y tendrá una nueva. Desde el menú **⋮** de cada una puedes [restablecer su contraseña](/ayuda/alumnado/restablecer-la-contrasena-de-un-alumno), y también [cambiar su alias o quitarla de la clase](/ayuda/alumnado/cambiar-el-alias-o-quitar-a-un-alumno-de-la-clase).

## Lo que conviene saber

- Esta clase es su **clase de origen**: su contraseña la restablece quien tiene administración en ella.
- El alumno puede unirse a otras clases con su código, como cualquier otro.
- No puede cambiar su nombre ni su usuario, añadir un correo a la cuenta ni borrarla.
- Se pueden crear cuentas aunque el registro público de la plataforma esté cerrado.

Lo que tiene que hacer el alumno para entrar está en [entrar con usuario y contraseña](/ayuda/si-eres-alumno/entrar-con-usuario-y-contrasena).$itakai$;

-- alumnado/importar-una-lista-de-alumnos
UPDATE "help_articles" a
SET "title" = $itakai$Importar una lista de estudiantes$itakai$, "updated_at" = CURRENT_TIMESTAMP
FROM "help_categories" c
WHERE c."id" = a."category_id" AND c."slug" = $itakai$alumnado$itakai$ AND a."locale" = 'es'
  AND a."slug" = $itakai$importar-una-lista-de-alumnos$itakai$
  AND a."title" = $itakai$Importar una lista de alumnos$itakai$;

UPDATE "help_articles" a
SET "body" = $itakai$Si tienes la lista del grupo en una hoja de cálculo, no hace falta escribir los nombres uno a uno. Entra en la clase, pulsa **Invitar**, abre la pestaña **Crear cuentas** y elige **Pegar o subir una lista**.

## Pegar la lista

Copia la columna de nombres de tu hoja de cálculo y pégala en **Lista de estudiantes**: un nombre por línea. Si quieres elegir tú algún usuario, ponlo en una segunda columna, al lado del nombre (si lo escribes a mano, sepáralo con punto y coma); donde no lo haya, lo propone la plataforma.

## Subir un CSV

Pulsa **Subir un CSV** y elige el fichero. Si no sabes cómo prepararlo, **Descargar plantilla CSV** te da uno de ejemplo con las columnas `nombre` y `usuario`, listo para abrir en una hoja de cálculo. La primera línea puede ser esa cabecera: no cuenta como estudiante.

Solo se admiten ficheros CSV. Si tienes la lista en otro formato de hoja de cálculo, usa **Guardar como** en tu programa y elige CSV.

Caben **50 estudiantes por lista**. Si el grupo es más grande, divídela en dos.

## Revisar antes de crear

Pulsa **Revisar la lista**. Todavía no se crea nada: aparece una tabla con cada línea y su estado.

- **Lista para crear**: todo en orden.
- **«…» está ocupado: se usará «…»**: el usuario que pusiste ya lo tiene otra cuenta, y se usará el que propone la plataforma.
- **Repetido en la lista**: el nombre o el usuario aparecen dos veces. Añade una inicial para distinguirlos o quita la fila.
- **Falta el nombre**, o el nombre es demasiado corto o demasiado largo (de 2 a 120 caracteres).
- **Usuario no válido**: solo letras sin tilde, números y `.`, `_` o `-`, de 3 a 30 caracteres.

Las filas con errores hay que corregirlas en la lista, con **Volver a la lista**, o quitarlas, una a una o todas a la vez con **Quitar las filas con errores**. Mientras quede alguna, no se puede crear nada.

## Crear

Cuando todo esté bien, pulsa el botón de crear, que dice cuántas cuentas van. Se crean todas a la vez, o ninguna si algo falla, y se abre la [hoja de credenciales](/ayuda/alumnado/la-hoja-de-credenciales) con las contraseñas temporales.

Si prefieres escribir los nombres a mano, está explicado en [dar de alta a estudiantes sin correo](/ayuda/alumnado/dar-de-alta-alumnos-sin-correo).$itakai$, "updated_at" = CURRENT_TIMESTAMP
FROM "help_categories" c
WHERE c."id" = a."category_id" AND c."slug" = $itakai$alumnado$itakai$ AND a."locale" = 'es'
  AND a."slug" = $itakai$importar-una-lista-de-alumnos$itakai$
  AND a."body" = $itakai$Si tienes la lista del grupo en una hoja de cálculo, no hace falta escribir los nombres uno a uno. Entra en la clase, pulsa **Invitar**, abre la pestaña **Crear cuentas** y elige **Pegar o subir una lista**.

## Pegar la lista

Copia la columna de nombres de tu hoja de cálculo y pégala en **Lista de alumnos**: un alumno por línea. Si quieres elegir el usuario de alguno, ponlo en una segunda columna, al lado del nombre (si lo escribes a mano, sepáralo con punto y coma); donde no lo haya, lo propone la plataforma.

## Subir un CSV

Pulsa **Subir un CSV** y elige el fichero. Si no sabes cómo prepararlo, **Descargar plantilla CSV** te da uno de ejemplo con las columnas `nombre` y `usuario`, listo para abrir en una hoja de cálculo. La primera línea puede ser esa cabecera: no cuenta como alumno.

Solo se admiten ficheros CSV. Si tienes la lista en otro formato de hoja de cálculo, usa **Guardar como** en tu programa y elige CSV.

Caben **50 alumnos por lista**. Si el grupo es más grande, divídela en dos.

## Revisar antes de crear

Pulsa **Revisar la lista**. Todavía no se crea nada: aparece una tabla con cada línea y su estado.

- **Lista para crear**: todo en orden.
- **«…» está ocupado: se usará «…»**: el usuario que pusiste ya lo tiene otra cuenta, y se usará el que propone la plataforma.
- **Repetido en la lista**: el nombre o el usuario aparecen dos veces. Añade una inicial para distinguirlos o quita la fila.
- **Falta el nombre**, o el nombre es demasiado corto o demasiado largo (de 2 a 120 caracteres).
- **Usuario no válido**: solo letras sin tilde, números y `.`, `_` o `-`, de 3 a 30 caracteres.

Las filas con errores hay que corregirlas en la lista, con **Volver a la lista**, o quitarlas, una a una o todas a la vez con **Quitar las filas con errores**. Mientras quede alguna, no se puede crear nada.

## Crear

Cuando todo esté bien, pulsa el botón de crear, que dice cuántas cuentas van. Se crean todas a la vez, o ninguna si algo falla, y se abre la [hoja de credenciales](/ayuda/alumnado/la-hoja-de-credenciales) con las contraseñas temporales.

Si prefieres escribir los nombres a mano, está explicado en [dar de alta alumnos sin correo](/ayuda/alumnado/dar-de-alta-alumnos-sin-correo).$itakai$;

-- alumnado/la-hoja-de-credenciales
UPDATE "help_articles" a
SET "body" = $itakai$La hoja de credenciales aparece justo después de [crear cuentas](/ayuda/alumnado/dar-de-alta-alumnos-sin-correo) o de [restablecer una contraseña](/ayuda/alumnado/restablecer-la-contrasena-de-un-alumno). Tiene una tarjeta por estudiante con su nombre, su **usuario**, su **contraseña temporal**, la dirección donde se entra y el código de la clase, y le recuerda que al entrar por primera vez tiene que cambiar la contraseña.

## Solo se ve una vez

Las contraseñas temporales no se guardan en ningún sitio, y la plataforma no puede volver a enseñarlas. Si recargas la página o cierras la sesión, la hoja dice **«Las contraseñas ya no se pueden mostrar»**. No es grave: [restablece la contraseña](/ayuda/alumnado/restablecer-la-contrasena-de-un-alumno) de quien la necesite y se genera una nueva.

## Repartirlas

- **Copiar**, en cada tarjeta: las credenciales de esa tarjeta, para pegarlas en un mensaje privado.
- **Copiar todas**: todas seguidas, con el nombre de la clase, la dirección de entrada y el código.
- **Descargar lista (CSV)**: un fichero con el nombre, el usuario, la contraseña, la clase y la dirección de entrada de cada estudiante, que se abre bien en una hoja de cálculo.
- **Imprimir / guardar como PDF**: las tarjetas, listas para recortar y dar en mano.

> El fichero descargado lleva las contraseñas y se queda en tu ordenador. Guárdalo con cuidado y bórralo cuando las hayas repartido.

Dale a cada estudiante solo la suya. En cuanto la cambie al entrar, la temporal deja de servir, así que una tarjeta que se pierda después ya no abre nada.

## Volver

**Volver a Alumnado** te lleva a la lista de la clase. La hoja no está en ningún menú: solo existe justo después de crear cuentas o de restablecer una contraseña.$itakai$, "updated_at" = CURRENT_TIMESTAMP
FROM "help_categories" c
WHERE c."id" = a."category_id" AND c."slug" = $itakai$alumnado$itakai$ AND a."locale" = 'es'
  AND a."slug" = $itakai$la-hoja-de-credenciales$itakai$
  AND a."body" = $itakai$La hoja de credenciales aparece justo después de [crear cuentas](/ayuda/alumnado/dar-de-alta-alumnos-sin-correo) o de [restablecer una contraseña](/ayuda/alumnado/restablecer-la-contrasena-de-un-alumno). Tiene una tarjeta por alumno con su nombre, su **usuario**, su **contraseña temporal**, la dirección donde se entra y el código de la clase, y le recuerda que al entrar por primera vez tiene que cambiar la contraseña.

## Solo se ve una vez

Las contraseñas temporales no se guardan en ningún sitio, y la plataforma no puede volver a enseñarlas. Si recargas la página o cierras la sesión, la hoja dice **«Las contraseñas ya no se pueden mostrar»**. No es grave: [restablece la contraseña](/ayuda/alumnado/restablecer-la-contrasena-de-un-alumno) de quien la necesite y se genera una nueva.

## Repartirlas

- **Copiar**, en cada tarjeta: las credenciales de ese alumno, para pegarlas en un mensaje privado.
- **Copiar todas**: todas seguidas, con el nombre de la clase, la dirección de entrada y el código.
- **Descargar lista (CSV)**: un fichero con el nombre, el usuario, la contraseña, la clase y la dirección de entrada de cada uno, que se abre bien en una hoja de cálculo.
- **Imprimir / guardar como PDF**: las tarjetas, listas para recortar y dar en mano.

> El fichero descargado lleva las contraseñas y se queda en tu ordenador. Guárdalo con cuidado y bórralo cuando las hayas repartido.

Dale a cada alumno solo la suya. En cuanto la cambie al entrar, la temporal deja de servir, así que una tarjeta que se pierda después ya no abre nada.

## Volver

**Volver a Alumnos** te lleva a la lista de la clase. La hoja no está en ningún menú: solo existe justo después de crear cuentas o de restablecer una contraseña.$itakai$;

-- alumnado/restablecer-la-contrasena-de-un-alumno
UPDATE "help_articles" a
SET "title" = $itakai$Restablecer la contraseña de estudiantes$itakai$, "updated_at" = CURRENT_TIMESTAMP
FROM "help_categories" c
WHERE c."id" = a."category_id" AND c."slug" = $itakai$alumnado$itakai$ AND a."locale" = 'es'
  AND a."slug" = $itakai$restablecer-la-contrasena-de-un-alumno$itakai$
  AND a."title" = $itakai$Restablecer la contraseña de un alumno$itakai$;

UPDATE "help_articles" a
SET "body" = $itakai$Cuando alguien que entra con usuario olvida su contraseña, no puede recuperarla por correo porque su cuenta no lo tiene: se la restableces tú.

## Cómo

1. En la pestaña **Alumnado** de la clase, abre el menú **⋮** de su fila. También lo tienes en su ficha, en la tarjeta de cada clase.
2. Elige **Restablecer contraseña** y confirma con **Restablecer**.
3. Se abre la [hoja de credenciales](/ayuda/alumnado/la-hoja-de-credenciales) con su contraseña temporal nueva. Dásela.

Al entrar con ella, tendrá que elegir otra vez una contraseña suya, igual que la primera vez.

## Qué pasa al restablecerla

- La contraseña que tenía deja de funcionar.
- Se cierran todas sus sesiones abiertas, también la de un ordenador donde se la hubiera dejado abierta.
- Queda anotado en el [historial de la clase](/ayuda/clases/el-historial-de-la-clase): quién la restableció y cuándo.

## Quién puede hacerlo

Así solo se restablecen las **cuentas sin correo**, y las restablece quien tiene administración en su **clase de origen**, la clase donde se creó la cuenta. También puede hacerlo quien administra la plataforma.

Si tú no puedes, la opción te explica por qué:

- Quien **entra con su correo** la recupera por su cuenta con **¿Olvidaste tu contraseña?**, en la pantalla de entrada.
- Si su cuenta **se creó en otra clase**, la restablece el profesorado con administración en esa clase, o la administración de la plataforma.

## Si también ha olvidado el usuario

Lo tienes en **Alumnado**, en el menú de la izquierda: debajo del nombre de cada estudiante sin correo aparece su usuario, y también en su ficha.$itakai$, "updated_at" = CURRENT_TIMESTAMP
FROM "help_categories" c
WHERE c."id" = a."category_id" AND c."slug" = $itakai$alumnado$itakai$ AND a."locale" = 'es'
  AND a."slug" = $itakai$restablecer-la-contrasena-de-un-alumno$itakai$
  AND a."body" = $itakai$Cuando un alumno que entra con usuario olvida su contraseña, no puede recuperarla por correo porque su cuenta no lo tiene: se la restableces tú.

## Cómo

1. En la pestaña **Alumnos** de la clase, abre el menú **⋮** de su fila. También lo tienes en su ficha, en la tarjeta de cada clase.
2. Elige **Restablecer contraseña** y confirma con **Restablecer**.
3. Se abre la [hoja de credenciales](/ayuda/alumnado/la-hoja-de-credenciales) con su contraseña temporal nueva. Dásela.

Al entrar con ella, tendrá que elegir otra vez una contraseña suya, igual que la primera vez.

## Qué pasa al restablecerla

- La contraseña que tenía deja de funcionar.
- Se cierran todas sus sesiones abiertas, también la de un ordenador donde se la hubiera dejado abierta.
- Queda anotado en el [historial de la clase](/ayuda/clases/el-historial-de-la-clase): quién la restableció y cuándo.

## Quién puede hacerlo

Así solo se restablecen las **cuentas sin correo**, y las restablece quien tiene administración en su **clase de origen**, la clase donde se creó la cuenta. También puede hacerlo quien administra la plataforma.

Si tú no puedes, la opción te explica por qué:

- Si el alumno **entra con su correo**, la recupera él mismo con **¿Olvidaste tu contraseña?**, en la pantalla de entrada.
- Si su cuenta **se creó en otra clase**, la restablece el profesorado con administración en esa clase, o la administración de la plataforma.

## Si también ha olvidado el usuario

Lo tienes en **Alumnos**, en el menú de la izquierda: debajo del nombre de un alumno sin correo aparece su usuario, y también en su ficha.$itakai$;

-- alumnado/cambiar-el-alias-o-quitar-a-un-alumno-de-la-clase
UPDATE "help_articles" a
SET "title" = $itakai$Cambiar el alias o quitar a alguien de la clase$itakai$, "updated_at" = CURRENT_TIMESTAMP
FROM "help_categories" c
WHERE c."id" = a."category_id" AND c."slug" = $itakai$alumnado$itakai$ AND a."locale" = 'es'
  AND a."slug" = $itakai$cambiar-el-alias-o-quitar-a-un-alumno-de-la-clase$itakai$
  AND a."title" = $itakai$Cambiar el alias o quitar a un alumno de la clase$itakai$;

UPDATE "help_articles" a
SET "body" = $itakai$El menú **⋮** de cada estudiante, en la pestaña **Alumnado** de la clase o en su ficha, tiene también estas dos acciones. Las dos piden acceso de administración en la clase.

## Cambiar el alias

El alias es el nombre con el que cada estudiante sale en esa clase y en su ranking. Al unirse le toca uno al azar, y lo puede cambiar cuando quiera en su pestaña **Avatar**. Si pone uno que no es adecuado, elige **Cambiar alias**, escribe el nuevo (hasta 20 caracteres) y pulsa **Guardar**.

Solo cambia en esta clase: en las demás sigue con el suyo. Como puede volver a cambiarlo, conviene que lo habléis. El avatar no se cambia desde aquí.

## Quitar de la clase

**Quitar de la clase** saca a esa persona de esta clase y borra todo lo que tenía en ella:

- su nivel, XP, monedas, maná y vidas;
- su progreso en las misiones, sus entregas y las insignias de esas misiones;
- sus compras y usos en la tienda y los comportamientos que se le han aplicado;
- su historial, sus avisos y sus conversaciones con el asistente sobre esta clase.

Lo que tenga en otras clases no cambia, y su cuenta sigue existiendo. **No se puede deshacer**: si vuelve a entrar con el código, empieza de cero.

Si es una cuenta sin correo creada en esta clase, después solo la administración de la plataforma podrá restablecer su contraseña. Y si además **no ha entrado nunca** y no está en ninguna otra clase, la cuenta se borra del todo, no solo de la clase: es lo que pasa con una cuenta creada por error. La ventana te avisa de cada caso antes de confirmar.

> Para cerrar un curso no hace falta quitar a nadie: archiva la clase y todo se queda como estaba.

Las dos acciones quedan anotadas en el [historial de la clase](/ayuda/clases/el-historial-de-la-clase).$itakai$, "updated_at" = CURRENT_TIMESTAMP
FROM "help_categories" c
WHERE c."id" = a."category_id" AND c."slug" = $itakai$alumnado$itakai$ AND a."locale" = 'es'
  AND a."slug" = $itakai$cambiar-el-alias-o-quitar-a-un-alumno-de-la-clase$itakai$
  AND a."body" = $itakai$El menú **⋮** de cada alumno, en la pestaña **Alumnos** de la clase o en su ficha, tiene también estas dos acciones. Las dos piden acceso de administración en la clase.

## Cambiar el alias

El alias es el nombre con el que el alumno sale en esa clase y en su ranking. Al unirse le toca uno al azar, y él lo puede cambiar cuando quiera en su pestaña **Avatar**. Si pone uno que no es adecuado, elige **Cambiar alias**, escribe el nuevo (hasta 20 caracteres) y pulsa **Guardar**.

Solo cambia en esta clase: en las demás sigue con el suyo. Como el alumno puede volver a cambiarlo, conviene hablarlo con él. El avatar no se cambia desde aquí.

## Quitar de la clase

**Quitar de la clase** saca al alumno de esta clase y borra todo lo que tenía en ella:

- su nivel, XP, monedas, maná y vidas;
- su progreso en las misiones, sus entregas y las insignias de esas misiones;
- sus compras y usos en la tienda y los comportamientos que se le han aplicado;
- su historial, sus avisos y sus conversaciones con el asistente sobre esta clase.

Lo que tenga en otras clases no cambia, y su cuenta sigue existiendo. **No se puede deshacer**: si vuelve a entrar con el código, empieza de cero.

Si es una cuenta sin correo creada en esta clase, después solo la administración de la plataforma podrá restablecer su contraseña. Y si además **no ha entrado nunca** y no está en ninguna otra clase, la cuenta se borra del todo, no solo de la clase: es lo que pasa con una cuenta creada por error. La ventana te avisa de cada caso antes de confirmar.

> Para cerrar un curso no hace falta quitar a nadie: archiva la clase y todo se queda como estaba.

Las dos acciones quedan anotadas en el [historial de la clase](/ayuda/clases/el-historial-de-la-clase).$itakai$;

-- ia-y-configuracion/configurar-el-proveedor-de-ia
UPDATE "help_articles" a
SET "body" = $itakai$La inteligencia artificial se configura una vez, para toda la instancia, desde **Panel de administración → Configuración → Inteligencia artificial**.

## Qué hay que rellenar

**El proveedor de texto**, con su clave de API y el modelo que quieras usar. Es lo que genera narrativas, misiones, enigmas y las respuestas del asistente.

**El proveedor de imágenes**, para portadas, insignias y avatares. Puede ser distinto del de texto.

**El límite por hora**, que es cuántas generaciones puede hacer cada cuenta en una hora. Sirve para que un accidente —o un entusiasmo— no se lleve por delante el presupuesto de la cuenta.

## Las claves

Se guardan **cifradas** y no se vuelven a mostrar enteras: en el panel se ven enmascaradas. Si necesitas cambiarlas, se pegan de nuevo.

## Comprobar que funciona

Después de guardar, la forma rápida de verificarlo es entrar en cualquier clase y pedir una generación de narrativa. Si el proveedor responde, el botón devuelve texto en unos segundos.

## Si el proveedor principal falla

La plataforma tiene un camino de respaldo: si el endpoint principal no responde, la petición se reintenta por el proveedor alternativo configurado. El profesorado no ve el cambio, solo que la generación tarda un poco más.

## Sin configurar

Si no rellenas nada, la plataforma funciona igual pero sin los botones de generación. Es una opción legítima: hay centros que prefieren no usar IA.$itakai$, "updated_at" = CURRENT_TIMESTAMP
FROM "help_categories" c
WHERE c."id" = a."category_id" AND c."slug" = $itakai$ia-y-configuracion$itakai$ AND a."locale" = 'es'
  AND a."slug" = $itakai$configurar-el-proveedor-de-ia$itakai$
  AND a."body" = $itakai$La inteligencia artificial se configura una vez, para toda la instancia, desde **Panel de administración → Configuración → Inteligencia artificial**.

## Qué hay que rellenar

**El proveedor de texto**, con su clave de API y el modelo que quieras usar. Es lo que genera narrativas, misiones, enigmas y las respuestas del asistente.

**El proveedor de imágenes**, para portadas, insignias y avatares. Puede ser distinto del de texto.

**El límite por hora**, que es cuántas generaciones puede hacer un usuario en una hora. Sirve para que un accidente —o un entusiasmo— no se lleve por delante el presupuesto de la cuenta.

## Las claves

Se guardan **cifradas** y no se vuelven a mostrar enteras: en el panel se ven enmascaradas. Si necesitas cambiarlas, se pegan de nuevo.

## Comprobar que funciona

Después de guardar, la forma rápida de verificarlo es entrar en cualquier clase y pedir una generación de narrativa. Si el proveedor responde, el botón devuelve texto en unos segundos.

## Si el proveedor principal falla

La plataforma tiene un camino de respaldo: si el endpoint principal no responde, la petición se reintenta por el proveedor alternativo configurado. El profesorado no ve el cambio, solo que la generación tarda un poco más.

## Sin configurar

Si no rellenas nada, la plataforma funciona igual pero sin los botones de generación. Es una opción legítima: hay centros que prefieren no usar IA.$itakai$;

-- tu-cuenta/avisos-y-recordatorios
UPDATE "help_articles" a
SET "body" = $itakai$Los avisos aparecen **siempre dentro de la plataforma**, en **Avisos**, en el menú de la izquierda. Al lado verás cuántos tienes sin leer; en el móvil, ese número sale también sobre el botón que abre el menú.

En **Avisos** puedes ver todos o solo los que no has leído, marcarlos como leídos y eliminarlos. Si un aviso lleva a algún sitio, al pulsarlo vas directamente allí.

## Qué te avisa

Si eres **docente**:

- Cuando alguien del alumnado hace una entrega en una clase donde tienes acceso de edición o de administración. El aviso te lleva directamente a la misión, con la ventana de entregas de ese enigma abierta para que la revises. En cuanto alguien del profesorado la aprueba, el aviso queda como leído para todo el profesorado.
- Cuando cambia tu sitio en el profesorado de una clase: te añaden, te cambian el perfil o el nivel, te quitan o pasa a ser tuya su propiedad.

Si eres **estudiante**:

- Cuando tu docente ha revisado una entrega, con el porcentaje que te ha puesto.
- **Cuando faltan menos de 24 horas para el final de una misión** que todavía no has completado.
- Cuando consigues una de las insignias de la plataforma, las que se ganan por misiones completadas, experiencia o nivel. Este aviso solo sale en la plataforma, nunca por correo.

## Los dos interruptores del alumnado

En tu perfil, pestaña **Configuración**, tarjeta **Avisos**:

- **Avisos por correo.** Con él encendido, las entregas revisadas y los recordatorios te llegan también al correo. Si lo apagas, los sigues viendo en la plataforma. Si tu cuenta no tiene correo, este interruptor no aparece: tus avisos se quedan en la plataforma.
- **Recordatorios de entrega.** Si lo apagas, dejas de recibir el aviso de las 24 horas, tanto en la plataforma como por correo. Las entregas revisadas te siguen llegando.

## El profesorado no recibe correos

Los avisos del profesorado —entregas nuevas y cambios en el profesorado de una clase— **no se mandan por correo**, y es a propósito: treinta estudiantes entregando la misma misión llenarían el buzón. Se ven en **Avisos** y, clase a clase, en el **Resumen**, que cuenta las entregas por revisar.

## En qué idioma llegan

En el idioma de tu cuenta, el que eliges en tu perfil. El aviso se escribe en tu idioma en el momento de crearse, así que si lo cambias después, los anteriores se quedan como estaban. La excepción, de momento, es el aviso de insignia nueva, que llega siempre en castellano.$itakai$, "updated_at" = CURRENT_TIMESTAMP
FROM "help_categories" c
WHERE c."id" = a."category_id" AND c."slug" = $itakai$tu-cuenta$itakai$ AND a."locale" = 'es'
  AND a."slug" = $itakai$avisos-y-recordatorios$itakai$
  AND a."body" = $itakai$Los avisos aparecen **siempre dentro de la plataforma**, en **Avisos**, en el menú de la izquierda. Al lado verás cuántos tienes sin leer; en el móvil, ese número sale también sobre el botón que abre el menú.

En **Avisos** puedes ver todos o solo los que no has leído, marcarlos como leídos y eliminarlos. Si un aviso lleva a algún sitio, al pulsarlo vas directamente allí.

## Qué te avisa

Si eres **profesor**:

- Cuando un alumno hace una entrega en una clase donde tienes acceso de edición o de administración. El aviso te lleva directamente a la misión, con la ventana de entregas de ese enigma abierta para que la revises. En cuanto alguien del profesorado la aprueba, el aviso queda como leído para todos.
- Cuando cambia tu sitio en el profesorado de una clase: te añaden, te cambian el perfil o el nivel, te quitan o pasas a ser su propietario.

Si eres **alumno**:

- Cuando tu profesor ha revisado una entrega, con el porcentaje que te ha puesto.
- **Cuando faltan menos de 24 horas para el final de una misión** que todavía no has completado.
- Cuando consigues una de las insignias de la plataforma, las que se ganan por misiones completadas, experiencia o nivel. Este aviso solo sale en la plataforma, nunca por correo.

## Los dos interruptores del alumnado

En tu perfil, pestaña **Configuración**, tarjeta **Avisos**:

- **Avisos por correo.** Con él encendido, las entregas revisadas y los recordatorios te llegan también al correo. Si lo apagas, los sigues viendo en la plataforma. Si tu cuenta no tiene correo, este interruptor no aparece: tus avisos se quedan en la plataforma.
- **Recordatorios de entrega.** Si lo apagas, dejas de recibir el aviso de las 24 horas, tanto en la plataforma como por correo. Las entregas revisadas te siguen llegando.

## El profesorado no recibe correos

Los avisos del profesorado —entregas nuevas y cambios en el profesorado de una clase— **no se mandan por correo**, y es a propósito: treinta alumnos entregando la misma misión llenarían el buzón. Se ven en **Avisos** y, clase a clase, en el **Resumen**, que cuenta las entregas por revisar.

## En qué idioma llegan

En el idioma de tu cuenta, el que eliges en tu perfil. El aviso se escribe en tu idioma en el momento de crearse, así que si lo cambias después, los anteriores se quedan como estaban. La excepción, de momento, es el aviso de insignia nueva, que llega siempre en castellano.$itakai$;

-- tu-cuenta/seguridad-de-tu-cuenta
UPDATE "help_articles" a
SET "body" = $itakai$Todo está en tu **perfil, pestaña Seguridad**.

## Cambiar la contraseña

En la tarjeta **Contraseña**, escribe la actual y dos veces la nueva, de al menos 8 caracteres, y pulsa **Actualizar**. Al cambiarla se cierran tus sesiones abiertas en otros equipos; la del que estás usando sigue abierta. Si tu cuenta tiene correo, la plataforma te manda uno avisando del cambio: si no has sido tú, es la señal para reaccionar rápido.

## Cambiar el correo

En la tarjeta **Correo electrónico**, escribe el correo nuevo y tu contraseña actual, y pulsa **Cambiar correo**. Te pide la contraseña porque el correo es lo que permite recuperar la cuenta. A partir de ese momento entras con el nuevo.

Si entras con Google y tu cuenta todavía no tiene contraseña, crea una antes: cierra sesión y usa **¿Olvidaste tu contraseña?**, en la pantalla de entrada.

## Si entras con un usuario

Si tu cuenta te la creó tu docente, en Seguridad verás la tarjeta **Tu cuenta**, con tu usuario. Esa cuenta no tiene correo ni se le puede añadir, y la lleva tu profesorado: cualquier cambio en ella se lo pides a tu docente. La contraseña sí la cambias tú, en la tarjeta **Contraseña**.

## Si la has olvidado

Desde la pantalla de inicio de sesión, **¿Olvidaste tu contraseña?** manda un enlace al correo de la cuenta. **El enlace caduca en una hora.** Si no llega, revisa la carpeta de no deseado antes de volver a pedirlo.

Si tu cuenta no tiene correo, ese enlace no te sirve: [tu docente te da una contraseña nueva](/ayuda/si-eres-alumno/he-olvidado-mi-contrasena-y-no-tengo-correo).

## Sesiones abiertas

En Seguridad ves las sesiones activas de tu cuenta, con el dispositivo, el navegador y cuándo se usó cada una por última vez. La actual está marcada.

Puedes cerrar una suelta o **cerrar todas de golpe**, que es lo que hay que hacer si te dejaste la sesión abierta en un ordenador del aula. Cerrarlas todas no te echa de la sesión desde la que lo haces.

## En equipos compartidos

Si usas un ordenador de aula, cierra sesión al terminar. Los ajustes de accesibilidad se quedan guardados en tu cuenta, así que al volver a entrar en cualquier equipo los tienes otra vez sin tocar nada.$itakai$, "updated_at" = CURRENT_TIMESTAMP
FROM "help_categories" c
WHERE c."id" = a."category_id" AND c."slug" = $itakai$tu-cuenta$itakai$ AND a."locale" = 'es'
  AND a."slug" = $itakai$seguridad-de-tu-cuenta$itakai$
  AND a."body" = $itakai$Todo está en tu **perfil, pestaña Seguridad**.

## Cambiar la contraseña

En la tarjeta **Contraseña**, escribe la actual y dos veces la nueva, de al menos 8 caracteres, y pulsa **Actualizar**. Al cambiarla se cierran tus sesiones abiertas en otros equipos; la del que estás usando sigue abierta. Si tu cuenta tiene correo, la plataforma te manda uno avisando del cambio: si no has sido tú, es la señal para reaccionar rápido.

## Cambiar el correo

En la tarjeta **Correo electrónico**, escribe el correo nuevo y tu contraseña actual, y pulsa **Cambiar correo**. Te pide la contraseña porque el correo es lo que permite recuperar la cuenta. A partir de ese momento entras con el nuevo.

Si entras con Google y tu cuenta todavía no tiene contraseña, crea una antes: cierra sesión y usa **¿Olvidaste tu contraseña?**, en la pantalla de entrada.

## Si entras con un usuario

Si tu cuenta te la creó tu profesor, en Seguridad verás la tarjeta **Tu cuenta**, con tu usuario. Esa cuenta no tiene correo ni se le puede añadir, y la lleva tu profesorado: cualquier cambio en ella se lo pides a él. La contraseña sí la cambias tú, en la tarjeta **Contraseña**.

## Si la has olvidado

Desde la pantalla de inicio de sesión, **¿Olvidaste tu contraseña?** manda un enlace al correo de la cuenta. **El enlace caduca en una hora.** Si no llega, revisa la carpeta de no deseado antes de volver a pedirlo.

Si tu cuenta no tiene correo, ese enlace no te sirve: [tu profesor te da una contraseña nueva](/ayuda/si-eres-alumno/he-olvidado-mi-contrasena-y-no-tengo-correo).

## Sesiones abiertas

En Seguridad ves las sesiones activas de tu cuenta, con el dispositivo, el navegador y cuándo se usó cada una por última vez. La actual está marcada.

Puedes cerrar una suelta o **cerrar todas de golpe**, que es lo que hay que hacer si te dejaste la sesión abierta en un ordenador del aula. Cerrarlas todas no te echa de la sesión desde la que lo haces.

## En equipos compartidos

Si usas un ordenador de aula, cierra sesión al terminar. Los ajustes de accesibilidad se quedan guardados en tu cuenta, así que al volver a entrar en cualquier equipo los tienes otra vez sin tocar nada.$itakai$;

-- si-eres-alumno/como-entro-en-mi-clase
UPDATE "help_articles" a
SET "summary" = $itakai$Con el código que te da tu docente: dónde se escribe y qué hacer si no funciona.$itakai$, "updated_at" = CURRENT_TIMESTAMP
FROM "help_categories" c
WHERE c."id" = a."category_id" AND c."slug" = $itakai$si-eres-alumno$itakai$ AND a."locale" = 'es'
  AND a."slug" = $itakai$como-entro-en-mi-clase$itakai$
  AND a."summary" = $itakai$Con el código que te da tu profesor: dónde se escribe y qué hacer si no funciona.$itakai$;

UPDATE "help_articles" a
SET "body" = $itakai$Para entrar en una clase de ITAKAI solo necesitas su **código**, que te da tu docente: seis caracteres que pueden incluir algún guion o guion bajo, así que cópialo tal cual. Con él entras directamente, sin esperar a que nadie te acepte.

> **¿Tu docente te ha dado un usuario y una contraseña?** Entonces ya estás en su clase y no necesitas código: mira [entrar con usuario y contraseña](/ayuda/si-eres-alumno/entrar-con-usuario-y-contrasena).

## Paso a paso

1. Pide el código a tu docente.
2. Entra en ITAKAI con tu cuenta. Si todavía no tienes, créala con **Crear Cuenta Nueva**, en la pantalla de inicio de sesión, y cuando te pregunte por tu perfil elige **Estudiante**.
3. Ve a **Mis Clases**, en el menú de la izquierda, y pulsa **Unirse a clase**. En el móvil tienes **Unirse a Clase** arriba del todo, al abrir el menú.
4. Escribe el código y pulsa **Unirse a la clase**. Da igual si usas mayúsculas o minúsculas.

Y ya estás dentro: la plataforma te lleva a la clase, y a partir de ahí la tienes siempre en **Mis Clases**.

## Si te sale un error

- **«Código de clase inválido».** Revisa que esté bien copiado: es fácil confundir la O con el cero o la I con el uno. Si sigue sin funcionar, pregúntale a tu docente si es el código de tu grupo.
- **«Esta clase está archivada y no admite más estudiantes».** Esa clase ya está cerrada. Díselo a tu docente para que te dé el código de la clase que usa ahora.
- **«Ya estás en esta clase».** Ya estabas dentro: búscala en **Mis Clases**.

## Si no aparece la clase

Comprueba con qué cuenta has entrado. Si tienes dos —la del centro y una personal—, la clase solo está en la cuenta con la que escribiste el código.

También puede ser que la clase esté archivada porque el curso ya ha terminado: entonces no la vas a ver aunque estuvieras dentro.

## Tu cuenta es tuya

La misma cuenta te vale para todas las clases y para todos los cursos. No hace falta crear una nueva cada año ni una por asignatura: tu progreso, tus insignias y tu avatar viajan contigo.$itakai$, "updated_at" = CURRENT_TIMESTAMP
FROM "help_categories" c
WHERE c."id" = a."category_id" AND c."slug" = $itakai$si-eres-alumno$itakai$ AND a."locale" = 'es'
  AND a."slug" = $itakai$como-entro-en-mi-clase$itakai$
  AND a."body" = $itakai$Para entrar en una clase de ITAKAI solo necesitas su **código**, que te da tu profesor: seis caracteres que pueden incluir algún guion o guion bajo, así que cópialo tal cual. Con él entras directamente, sin esperar a que nadie te acepte.

> **¿Tu profesor te ha dado un usuario y una contraseña?** Entonces ya estás en su clase y no necesitas código: mira [entrar con usuario y contraseña](/ayuda/si-eres-alumno/entrar-con-usuario-y-contrasena).

## Paso a paso

1. Pide el código a tu profesor.
2. Entra en ITAKAI con tu cuenta. Si todavía no tienes, créala con **Crear Cuenta Nueva**, en la pantalla de inicio de sesión, y cuando te pregunte por tu perfil elige **Estudiante**.
3. Ve a **Mis Clases**, en el menú de la izquierda, y pulsa **Unirse a clase**. En el móvil tienes **Unirse a Clase** arriba del todo, al abrir el menú.
4. Escribe el código y pulsa **Unirse a la clase**. Da igual si usas mayúsculas o minúsculas.

Y ya estás dentro: la plataforma te lleva a la clase, y a partir de ahí la tienes siempre en **Mis Clases**.

## Si te sale un error

- **«Código de clase inválido».** Revisa que esté bien copiado: es fácil confundir la O con el cero o la I con el uno. Si sigue sin funcionar, pregúntale a tu profesor si es el código de tu grupo.
- **«Esta clase está archivada y no admite nuevos alumnos».** Esa clase ya está cerrada. Díselo a tu profesor para que te dé el código de la clase que usa ahora.
- **«Ya estás inscrito en esta clase».** Ya estabas dentro: búscala en **Mis Clases**.

## Si no aparece la clase

Comprueba con qué cuenta has entrado. Si tienes dos —la del centro y una personal—, la clase solo está en la cuenta con la que escribiste el código.

También puede ser que la clase esté archivada porque el curso ya ha terminado: entonces no la vas a ver aunque estuvieras dentro.

## Tu cuenta es tuya

La misma cuenta te vale para todas las clases y para todos los cursos. No hace falta crear una nueva cada año ni una por asignatura: tu progreso, tus insignias y tu avatar viajan contigo.$itakai$;

-- si-eres-alumno/como-entrego-una-mision
UPDATE "help_articles" a
SET "body" = $itakai$Una misión es un trabajo con premio. Cuando la abres ves de qué va, qué tienes que hacer y qué te llevas si la completas.

## Los enigmas son los pasos

Las misiones están partidas en enigmas: los pasos que hay que ir haciendo. Los ves en orden y cada uno tiene su propia recompensa, así que aunque no termines la misión entera, lo que hayas hecho cuenta.

## La entrega

Cada enigma que puedes entregar tiene su botón **Entregar**. Al pulsarlo se abre la ventana **Entregar Enigma**: arrastra tu archivo o haz clic para elegirlo, y pulsa **Entregar**.

Se entrega **un archivo comprimido ZIP, RAR o 7Z, de 50 MB como máximo**. Si tienes que mandar varias cosas —un documento, unas fotos, un audio—, mételas todas en el mismo archivo comprimido.

Cuando le das a entregar, la entrega pasa a tu docente y, mientras no la revise, no puedes mandar otra de ese enigma. Repásala antes.

## Después de entregar

Tu docente la revisa y le pone un porcentaje: cuánto has completado. Las recompensas se reparten según ese porcentaje, así que una entrega a medias también da algo. Cuando la revise, te llega un aviso en **Avisos** con el porcentaje.

## La fecha

Si la misión tiene fecha de entrega, te llega un aviso cuando falten menos de 24 horas, salvo que hayas apagado los recordatorios en tu perfil. Cuando la fecha pasa, la misión ya no admite entregas: no dejes el último enigma para el último momento.$itakai$, "updated_at" = CURRENT_TIMESTAMP
FROM "help_categories" c
WHERE c."id" = a."category_id" AND c."slug" = $itakai$si-eres-alumno$itakai$ AND a."locale" = 'es'
  AND a."slug" = $itakai$como-entrego-una-mision$itakai$
  AND a."body" = $itakai$Una misión es un trabajo con premio. Cuando la abres ves de qué va, qué tienes que hacer y qué te llevas si la completas.

## Los enigmas son los pasos

Las misiones están partidas en enigmas: los pasos que hay que ir haciendo. Los ves en orden y cada uno tiene su propia recompensa, así que aunque no termines la misión entera, lo que hayas hecho cuenta.

## La entrega

Cada enigma que puedes entregar tiene su botón **Entregar**. Al pulsarlo se abre la ventana **Entregar Enigma**: arrastra tu archivo o haz clic para elegirlo, y pulsa **Entregar**.

Se entrega **un archivo comprimido ZIP, RAR o 7Z, de 50 MB como máximo**. Si tienes que mandar varias cosas —un documento, unas fotos, un audio—, mételas todas en el mismo archivo comprimido.

Cuando le das a entregar, la entrega pasa a tu profesor y, mientras no la revise, no puedes mandar otra de ese enigma. Repásala antes.

## Después de entregar

Tu profesor la revisa y le pone un porcentaje: cuánto has completado. Las recompensas se reparten según ese porcentaje, así que una entrega a medias también da algo. Cuando la revise, te llega un aviso en **Avisos** con el porcentaje.

## La fecha

Si la misión tiene fecha de entrega, te llega un aviso cuando falten menos de 24 horas, salvo que hayas apagado los recordatorios en tu perfil. Cuando la fecha pasa, la misión ya no admite entregas: no dejes el último enigma para el último momento.$itakai$;

-- si-eres-alumno/que-son-el-xp-las-monedas-y-el-mana
UPDATE "help_articles" a
SET "body" = $itakai$Las misiones te dan tres cosas y es fácil confundirlas. Se ganan igual, pero no sirven para lo mismo.

## XP: tu progreso

La experiencia mide lo que llevas hecho en la clase. Sube y no baja nunca, y **no se gasta**: por mucho que compres en la tienda, tu XP sigue donde estaba. Es lo que te hace subir de nivel y cambiar de rango.

## Monedas: para gastar

Las monedas se ganan igual que el XP, pero son dinero. Se gastan en la tienda de tu clase, en lo que haya puesto tu docente: desde una recompensa de un solo uso hasta algo que te quedas para siempre.

Estas sí bajan cuando compras.

## Maná: para los poderes

El maná es para los poderes de la tienda, esas cosas que se usan una vez y luego se recargan. No todo el profesorado lo activa: si en tu clase no aparece, es que esa clase no lo usa.

## Qué usa tu clase

Cada docente elige qué recursos tiene su clase. Puede que en una uses las tres cosas y en otra solo XP. Mira el panel de la clase para ver qué hay en juego.$itakai$, "updated_at" = CURRENT_TIMESTAMP
FROM "help_categories" c
WHERE c."id" = a."category_id" AND c."slug" = $itakai$si-eres-alumno$itakai$ AND a."locale" = 'es'
  AND a."slug" = $itakai$que-son-el-xp-las-monedas-y-el-mana$itakai$
  AND a."body" = $itakai$Las misiones te dan tres cosas y es fácil confundirlas. Se ganan igual, pero no sirven para lo mismo.

## XP: tu progreso

La experiencia mide lo que llevas hecho en la clase. Sube y no baja nunca, y **no se gasta**: por mucho que compres en la tienda, tu XP sigue donde estaba. Es lo que te hace subir de nivel y cambiar de rango.

## Monedas: para gastar

Las monedas se ganan igual que el XP, pero son dinero. Se gastan en la tienda de tu clase, en lo que haya puesto tu profesor: desde una recompensa de un solo uso hasta algo que te quedas para siempre.

Estas sí bajan cuando compras.

## Maná: para los poderes

El maná es para los poderes de la tienda, esas cosas que se usan una vez y luego se recargan. No todos los profesores lo activan: si en tu clase no aparece, es que esa clase no lo usa.

## Qué usa tu clase

Cada profesor elige qué recursos tiene su clase. Puede que en una uses las tres cosas y en otra solo XP. Mira el panel de la clase para ver qué hay en juego.$itakai$;

-- si-eres-alumno/he-perdido-un-punto-de-vida
UPDATE "help_articles" a
SET "body" = $itakai$Los puntos de vida son la parte de la clase que mide cómo te comportas, no lo que entregas.

## Por qué se pierden

Los quita tu docente cuando pasa algo que ha marcado como comportamiento negativo: no entregar a tiempo, interrumpir la clase, saltarse una norma del aula. Cada clase tiene su lista, y la decide quien da la clase, no la aplicación.

## Qué pasa si me quedo sin

Quedarte sin vidas **no significa suspender**. La nota no depende de esto, y la aplicación no te bloquea nada: puedes seguir entregando y usando la tienda. Lo que pase después lo decide tu docente; mira la **Guía** de tu clase por si lo explica.

## Cómo se recuperan

Igual que se pierden: con comportamientos positivos. Ayudar a alguien de clase, participar, entregar antes de tiempo. Tu docente las devuelve del mismo sitio de donde las quita. Y si tu clase tiene tienda, puede que haya algo en ella que te devuelva puntos de vida.

## Si crees que hay un error

Habla con tu docente. Los puntos de vida los mueve una persona a mano, así que también se pueden deshacer a mano. En la aplicación no hay ningún automatismo que te quite vidas por su cuenta.$itakai$, "updated_at" = CURRENT_TIMESTAMP
FROM "help_categories" c
WHERE c."id" = a."category_id" AND c."slug" = $itakai$si-eres-alumno$itakai$ AND a."locale" = 'es'
  AND a."slug" = $itakai$he-perdido-un-punto-de-vida$itakai$
  AND a."body" = $itakai$Los puntos de vida son la parte de la clase que mide cómo te comportas, no lo que entregas.

## Por qué se pierden

Los quita tu profesor cuando pasa algo que ha marcado como comportamiento negativo: no entregar a tiempo, interrumpir la clase, saltarse una norma del aula. Cada clase tiene su lista, y la decide quien da la clase, no la aplicación.

## Qué pasa si me quedo sin

Quedarte sin vidas **no significa suspender**. La nota no depende de esto, y la aplicación no te bloquea nada: puedes seguir entregando y usando la tienda. Lo que pase después lo decide tu profesor; mira la **Guía** de tu clase por si lo explica.

## Cómo se recuperan

Igual que se pierden: con comportamientos positivos. Ayudar a un compañero, participar, entregar antes de tiempo. Tu profesor las devuelve del mismo sitio de donde las quita. Y si tu clase tiene tienda, puede que haya algo en ella que te devuelva puntos de vida.

## Si crees que hay un error

Habla con tu profesor. Los puntos de vida los mueve una persona a mano, así que también se pueden deshacer a mano. En la aplicación no hay ningún automatismo que te quite vidas por su cuenta.$itakai$;

-- si-eres-alumno/mi-avatar-y-mi-nombre-en-clase
UPDATE "help_articles" a
SET "body" = $itakai$En cada clase tienes un avatar y un alias. Al unirte te ponen unos al azar, y puedes cambiarlos cuando quieras.

## Son por clase

Lo importante: **el avatar y el alias son de cada clase**, no de tu cuenta. Puedes ser una cosa en Historia y otra en Matemáticas. Al cambiarlos en una clase, las demás se quedan como estaban.

## Dónde se cambian

Dentro de la clase, en la pestaña **Avatar**. Cambia lo que quieras y pulsa **Guardar cambios**.

## El alias

Es el nombre con el que apareces en la clase: en el ranking, si tu clase lo tiene activado, y en las entregas que revisa tu docente. Puede tener hasta 20 caracteres. Tu docente también ve tu nombre real, que es el que necesita para las notas.

Ponte algo que puedas enseñar en clase: si no lo es, tu docente puede cambiártelo.

## El avatar

Elige a tu guía entre los personajes de la lista. Si quieres uno a tu gusto, describe cómo lo quieres y pulsa **Genera avatar**: la inteligencia artificial lo crea a partir del personaje que hayas elegido. Cuanto más concreto seas con los colores, la ropa y el estilo, mejor.$itakai$, "updated_at" = CURRENT_TIMESTAMP
FROM "help_categories" c
WHERE c."id" = a."category_id" AND c."slug" = $itakai$si-eres-alumno$itakai$ AND a."locale" = 'es'
  AND a."slug" = $itakai$mi-avatar-y-mi-nombre-en-clase$itakai$
  AND a."body" = $itakai$En cada clase tienes un avatar y un alias. Al unirte te ponen unos al azar, y puedes cambiarlos cuando quieras.

## Son por clase

Lo importante: **el avatar y el alias son de cada clase**, no de tu cuenta. Puedes ser una cosa en Historia y otra en Matemáticas. Al cambiarlos en una clase, las demás se quedan como estaban.

## Dónde se cambian

Dentro de la clase, en la pestaña **Avatar**. Cambia lo que quieras y pulsa **Guardar cambios**.

## El alias

Es el nombre con el que apareces en la clase: en el ranking, si tu clase lo tiene activado, y en las entregas que revisa tu profesor. Puede tener hasta 20 caracteres. Tu profesor también ve tu nombre real, que es el que necesita para las notas.

Ponte algo que puedas enseñar en clase: si no lo es, tu profesor puede cambiártelo.

## El avatar

Elige a tu guía entre los personajes de la lista. Si quieres uno a tu gusto, describe cómo lo quieres y pulsa **Genera avatar**: la inteligencia artificial lo crea a partir del personaje que hayas elegido. Cuanto más concreto seas con los colores, la ropa y el estilo, mejor.$itakai$;

-- si-eres-alumno/la-clasificacion-de-la-clase
UPDATE "help_articles" a
SET "body" = $itakai$Algunas clases tienen clasificación y otras no: lo decide tu docente.

## Qué mide

Ordena por experiencia acumulada en esa clase. No mide notas, ni cuánto has acertado, ni lo bien que ha salido un trabajo: mide lo que llevas hecho.

Por eso alguien constante suele estar arriba aunque no saque las mejores notas.

## Qué no se ve

En la clasificación aparecen alias y progreso. **Nadie ve tus entregas ni tus porcentajes**, ni tú los de los demás. Eso es entre tu docente y tú.

## Si te agobia

Díselo a tu docente: la clasificación se puede apagar para toda la clase. Está pensada para picarse un poco, no para pasarlo mal.

## Empezar tarde

Si te has incorporado con el curso empezado vas a estar abajo, y es normal: los demás llevan más misiones hechas. Lo que cuenta para tu nota no es el puesto, es lo que entregas.$itakai$, "updated_at" = CURRENT_TIMESTAMP
FROM "help_categories" c
WHERE c."id" = a."category_id" AND c."slug" = $itakai$si-eres-alumno$itakai$ AND a."locale" = 'es'
  AND a."slug" = $itakai$la-clasificacion-de-la-clase$itakai$
  AND a."body" = $itakai$Algunas clases tienen clasificación y otras no: lo decide tu profesor.

## Qué mide

Ordena por experiencia acumulada en esa clase. No mide notas, ni cuánto has acertado, ni lo bien que ha salido un trabajo: mide lo que llevas hecho.

Por eso alguien constante suele estar arriba aunque no saque las mejores notas.

## Qué no se ve

En la clasificación aparecen alias y progreso. **Nadie ve tus entregas ni tus porcentajes**, ni tú los de los demás. Eso es entre tu profesor y tú.

## Si te agobia

Díselo a tu profesor: la clasificación se puede apagar para toda la clase. Está pensada para picarse un poco, no para pasarlo mal.

## Empezar tarde

Si te has incorporado con el curso empezado vas a estar abajo, y es normal: los demás llevan más misiones hechas. Lo que cuenta para tu nota no es el puesto, es lo que entregas.$itakai$;

-- si-eres-alumno/entrar-con-usuario-y-contrasena
UPDATE "help_articles" a
SET "summary" = $itakai$Si tu docente te ha creado la cuenta: dónde se escribe el usuario y qué hacer si no te deja entrar.$itakai$, "updated_at" = CURRENT_TIMESTAMP
FROM "help_categories" c
WHERE c."id" = a."category_id" AND c."slug" = $itakai$si-eres-alumno$itakai$ AND a."locale" = 'es'
  AND a."slug" = $itakai$entrar-con-usuario-y-contrasena$itakai$
  AND a."summary" = $itakai$Si tu profesor te ha creado la cuenta: dónde se escribe el usuario y qué hacer si no te deja entrar.$itakai$;

UPDATE "help_articles" a
SET "body" = $itakai$Si no tienes correo, puede que tu docente te haya creado la cuenta. En ese caso no tienes que registrarte ni escribir ningún código: ya estás dentro de su clase. Te habrá dado tres cosas, en una tarjeta o en un mensaje: tu **usuario**, una **contraseña temporal** y la dirección donde se entra.

## Paso a paso

1. Abre la dirección que te han dado: es la pantalla de **Iniciar Sesión**.
2. En **Correo o usuario**, escribe tu usuario, por ejemplo `ana.g.k7`. Da igual si lo pones en mayúsculas o en minúsculas.
3. En **Contraseña**, escribe la temporal tal cual: aquí sí cuentan las mayúsculas.
4. Pulsa **Iniciar Sesión**.

La primera vez, antes de nada, tendrás que cambiar la contraseña. Lo explica [cambiar la contraseña la primera vez](/ayuda/si-eres-alumno/cambiar-la-contrasena-la-primera-vez). Después ya entras siempre con tu usuario y la contraseña que hayas elegido.

## Si no te deja entrar

- **«Credenciales inválidas».** El usuario o la contraseña no coinciden. Revisa que no sobre ningún espacio y que la contraseña tenga las mayúsculas y las minúsculas en su sitio. La temporal nunca lleva ni el cero ni la o, ni el uno, la ele minúscula o la i mayúscula, justo para que no se confundan.
- **«Demasiadas peticiones».** Te has equivocado muchas veces seguidas. Espera el tiempo que dice y vuelve a probar con calma.
- **«Cuenta suspendida o inactiva».** Habla con tu docente.
- **Has olvidado la contraseña.** Mira [he olvidado mi contraseña y no tengo correo](/ayuda/si-eres-alumno/he-olvidado-mi-contrasena-y-no-tengo-correo).

## Tu cuenta

Tu usuario lo tienes en **Mi perfil**, pestaña **Seguridad**, en la tarjeta **Tu cuenta**. No se puede cambiar, y la cuenta no tiene correo ni se le puede añadir: la lleva tu profesorado, así que si necesitas algún cambio, pídeselo.

Con ella puedes unirte a otras clases con su código, como cualquiera: [cómo entro en mi clase](/ayuda/si-eres-alumno/como-entro-en-mi-clase).$itakai$, "updated_at" = CURRENT_TIMESTAMP
FROM "help_categories" c
WHERE c."id" = a."category_id" AND c."slug" = $itakai$si-eres-alumno$itakai$ AND a."locale" = 'es'
  AND a."slug" = $itakai$entrar-con-usuario-y-contrasena$itakai$
  AND a."body" = $itakai$Si no tienes correo, puede que tu profesor te haya creado la cuenta. En ese caso no tienes que registrarte ni escribir ningún código: ya estás dentro de su clase. Te habrá dado tres cosas, en una tarjeta o en un mensaje: tu **usuario**, una **contraseña temporal** y la dirección donde se entra.

## Paso a paso

1. Abre la dirección que te han dado: es la pantalla de **Iniciar Sesión**.
2. En **Correo o usuario**, escribe tu usuario, por ejemplo `ana.g.k7`. Da igual si lo pones en mayúsculas o en minúsculas.
3. En **Contraseña**, escribe la temporal tal cual: aquí sí cuentan las mayúsculas.
4. Pulsa **Iniciar Sesión**.

La primera vez, antes de nada, tendrás que cambiar la contraseña. Lo explica [cambiar la contraseña la primera vez](/ayuda/si-eres-alumno/cambiar-la-contrasena-la-primera-vez). Después ya entras siempre con tu usuario y la contraseña que hayas elegido.

## Si no te deja entrar

- **«Credenciales inválidas».** El usuario o la contraseña no coinciden. Revisa que no sobre ningún espacio y que la contraseña tenga las mayúsculas y las minúsculas en su sitio. La temporal nunca lleva ni el cero ni la o, ni el uno, la ele minúscula o la i mayúscula, justo para que no se confundan.
- **«Demasiadas peticiones».** Te has equivocado muchas veces seguidas. Espera el tiempo que dice y vuelve a probar con calma.
- **«Cuenta suspendida o inactiva».** Habla con tu profesor.
- **Has olvidado la contraseña.** Mira [he olvidado mi contraseña y no tengo correo](/ayuda/si-eres-alumno/he-olvidado-mi-contrasena-y-no-tengo-correo).

## Tu cuenta

Tu usuario lo tienes en **Mi perfil**, pestaña **Seguridad**, en la tarjeta **Tu cuenta**. No se puede cambiar, y la cuenta no tiene correo ni se le puede añadir: la lleva tu profesorado, así que si necesitas algún cambio, pídeselo.

Con ella puedes unirte a otras clases con su código, como cualquiera: [cómo entro en mi clase](/ayuda/si-eres-alumno/como-entro-en-mi-clase).$itakai$;

-- si-eres-alumno/cambiar-la-contrasena-la-primera-vez
UPDATE "help_articles" a
SET "body" = $itakai$La contraseña que te da tu docente es **temporal**: solo sirve para entrar la primera vez. Nada más entrar con ella aparece la pantalla **Cambia tu contraseña**, y hasta que no elijas una tuya no puedes usar el resto de la plataforma.

## Paso a paso

1. En **Contraseña temporal**, escribe la que te han dado.
2. En **Nueva contraseña**, escribe la tuya, de al menos 8 caracteres.
3. Repítela en **Confirmar contraseña**.
4. Pulsa **Guardar contraseña**.

Si todo va bien, verás «¡Contraseña cambiada! Ya puedes empezar.» y entrarás en tu inicio. A partir de ahora entras con tu usuario y esta contraseña; la temporal ya no sirve.

## Elegir una buena

- Que sea **solo tuya**: tu docente no la sabe ni la puede ver, y así tiene que ser.
- Que la recuerdes sin tenerla apuntada donde la vea todo el mundo. Una frase corta con algún número funciona mejor que una palabra rara.
- Que no sea la misma que usas en otras aplicaciones.

## Si da error

«No se ha podido cambiar la contraseña. Comprueba la temporal e inténtalo de nuevo.» casi siempre quiere decir que la temporal no está bien escrita: fíjate en las mayúsculas. Si esa no es tu cuenta —por ejemplo, en un ordenador de clase donde se había quedado otra sesión—, pulsa **Salir y entrar con otra cuenta**.

## Otras veces que sale

Si olvidas la contraseña y tu docente te la restablece, te dará otra temporal y volverá a salir esta pantalla. Y si más adelante quieres cambiarla tú, está en **Mi perfil**, pestaña **Seguridad**, tarjeta **Contraseña**. Cada vez que la cambias se cierran tus sesiones abiertas en otros equipos.$itakai$, "updated_at" = CURRENT_TIMESTAMP
FROM "help_categories" c
WHERE c."id" = a."category_id" AND c."slug" = $itakai$si-eres-alumno$itakai$ AND a."locale" = 'es'
  AND a."slug" = $itakai$cambiar-la-contrasena-la-primera-vez$itakai$
  AND a."body" = $itakai$La contraseña que te da tu profesor es **temporal**: solo sirve para entrar la primera vez. Nada más entrar con ella aparece la pantalla **Cambia tu contraseña**, y hasta que no elijas una tuya no puedes usar el resto de la plataforma.

## Paso a paso

1. En **Contraseña temporal**, escribe la que te han dado.
2. En **Nueva contraseña**, escribe la tuya, de al menos 8 caracteres.
3. Repítela en **Confirmar contraseña**.
4. Pulsa **Guardar contraseña**.

Si todo va bien, verás «¡Contraseña cambiada! Ya puedes empezar.» y entrarás en tu inicio. A partir de ahora entras con tu usuario y esta contraseña; la temporal ya no sirve.

## Elegir una buena

- Que sea **solo tuya**: tu profesor no la sabe ni la puede ver, y así tiene que ser.
- Que la recuerdes sin tenerla apuntada donde la vea todo el mundo. Una frase corta con algún número funciona mejor que una palabra rara.
- Que no sea la misma que usas en otras aplicaciones.

## Si da error

«No se ha podido cambiar la contraseña. Comprueba la temporal e inténtalo de nuevo.» casi siempre quiere decir que la temporal no está bien escrita: fíjate en las mayúsculas. Si esa no es tu cuenta —por ejemplo, en un ordenador de clase donde se había quedado otra sesión—, pulsa **Salir y entrar con otra cuenta**.

## Otras veces que sale

Si olvidas la contraseña y tu profesor te la restablece, te dará otra temporal y volverá a salir esta pantalla. Y si más adelante quieres cambiarla tú, está en **Mi perfil**, pestaña **Seguridad**, tarjeta **Contraseña**. Cada vez que la cambias se cierran tus sesiones abiertas en otros equipos.$itakai$;

-- si-eres-alumno/he-olvidado-mi-contrasena-y-no-tengo-correo
UPDATE "help_articles" a
SET "summary" = $itakai$Sin correo no llega ningún enlace: tu docente te da una contraseña nueva.$itakai$, "updated_at" = CURRENT_TIMESTAMP
FROM "help_categories" c
WHERE c."id" = a."category_id" AND c."slug" = $itakai$si-eres-alumno$itakai$ AND a."locale" = 'es'
  AND a."slug" = $itakai$he-olvidado-mi-contrasena-y-no-tengo-correo$itakai$
  AND a."summary" = $itakai$Sin correo no llega ningún enlace: tu profesor te da una contraseña nueva.$itakai$;

UPDATE "help_articles" a
SET "body" = $itakai$El enlace **¿Olvidaste tu contraseña?**, en la pantalla de entrada, manda un correo para recuperarla. Si entras con un usuario que te dio tu docente, tu cuenta no tiene correo y ese enlace no te sirve: no hay a dónde mandarlo.

## Qué hacer

Pídeselo a tu docente. Puede **restablecer tu contraseña**: la plataforma genera una temporal nueva y te la da, en una tarjeta o como prefiera. Con ella:

1. Entra con tu usuario y esa contraseña temporal.
2. Elige otra vez una contraseña tuya, como la primera vez: [cambiar la contraseña la primera vez](/ayuda/si-eres-alumno/cambiar-la-contrasena-la-primera-vez).

La contraseña de antes deja de funcionar y se cierran todas tus sesiones, también la de un equipo donde te la hubieras dejado abierta.

## Quién puede hacerlo

Tu cuenta la lleva el profesorado de la clase donde se creó, normalmente la de quien te la dio. Si se lo pides a otra persona del profesorado y no puede, la plataforma le dice a quién le toca. También puede hacerlo quien administra la plataforma en tu centro.

## Si has olvidado el usuario

También te lo dice tu docente, que lo ve en tu ficha. Y si todavía tienes la sesión abierta en algún sitio, lo tienes en **Mi perfil**, pestaña **Seguridad**, tarjeta **Tu cuenta**.

## Para que no vuelva a pasar

Nadie más que tú sabe tu contraseña, ni siquiera tu docente: si la pierdes, solo se puede poner una nueva. Elige una que recuerdes.$itakai$, "updated_at" = CURRENT_TIMESTAMP
FROM "help_categories" c
WHERE c."id" = a."category_id" AND c."slug" = $itakai$si-eres-alumno$itakai$ AND a."locale" = 'es'
  AND a."slug" = $itakai$he-olvidado-mi-contrasena-y-no-tengo-correo$itakai$
  AND a."body" = $itakai$El enlace **¿Olvidaste tu contraseña?**, en la pantalla de entrada, manda un correo para recuperarla. Si entras con un usuario que te dio tu profesor, tu cuenta no tiene correo y ese enlace no te sirve: no hay a dónde mandarlo.

## Qué hacer

Pídeselo a tu profesor. Él puede **restablecer tu contraseña**: la plataforma genera una temporal nueva y te la da, en una tarjeta o como prefiera. Con ella:

1. Entra con tu usuario y esa contraseña temporal.
2. Elige otra vez una contraseña tuya, como la primera vez: [cambiar la contraseña la primera vez](/ayuda/si-eres-alumno/cambiar-la-contrasena-la-primera-vez).

La contraseña de antes deja de funcionar y se cierran todas tus sesiones, también la de un equipo donde te la hubieras dejado abierta.

## Quién puede hacerlo

Tu cuenta la lleva el profesorado de la clase donde se creó, normalmente la del profesor que te la dio. Si se lo pides a otro y no puede, la plataforma le dice a quién le toca. También puede hacerlo quien administra la plataforma en tu centro.

## Si has olvidado el usuario

También te lo dice tu profesor, que lo ve en tu ficha. Y si todavía tienes la sesión abierta en algún sitio, lo tienes en **Mi perfil**, pestaña **Seguridad**, tarjeta **Tu cuenta**.

## Para que no vuelva a pasar

Nadie más que tú sabe tu contraseña, ni siquiera tu profesor: si la pierdes, solo se puede poner una nueva. Elige una que recuerdes.$itakai$;

-- cuando-algo-falla/mi-alumno-no-aparece-en-la-clase
UPDATE "help_articles" a
SET "title" = $itakai$Falta alguien en la lista de la clase$itakai$, "updated_at" = CURRENT_TIMESTAMP
FROM "help_categories" c
WHERE c."id" = a."category_id" AND c."slug" = $itakai$cuando-algo-falla$itakai$ AND a."locale" = 'es'
  AND a."slug" = $itakai$mi-alumno-no-aparece-en-la-clase$itakai$
  AND a."title" = $itakai$Mi alumno no aparece en la clase$itakai$;

UPDATE "help_articles" a
SET "summary" = $itakai$Qué comprobar cuando alguien dice que ha usado el código y no sale en tu lista.$itakai$, "updated_at" = CURRENT_TIMESTAMP
FROM "help_categories" c
WHERE c."id" = a."category_id" AND c."slug" = $itakai$cuando-algo-falla$itakai$ AND a."locale" = 'es'
  AND a."slug" = $itakai$mi-alumno-no-aparece-en-la-clase$itakai$
  AND a."summary" = $itakai$Qué comprobar cuando un alumno dice que ha usado el código y no está en tu lista.$itakai$;

UPDATE "help_articles" a
SET "body" = $itakai$Alguien de tu alumnado asegura que ha usado el código y no aparece en la pestaña **Alumnado** de la clase. Con el código se entra directamente, sin que nadie tenga que aceptar nada, así que casi siempre es una de estas cosas.

## La lista es de antes

La lista del alumnado se carga al abrir la pestaña. Si ya la tenías abierta cuando se unió, recarga la página.

## No llegó a unirse

Si el código no vale, quien lo escribe ve el motivo en la ventana de **Unirse a clase** y no entra:

- **«Código de clase inválido»**: está mal copiado (la O y el cero, la I y el uno se confunden) o no es el de ninguna clase. Vuelve a dárselo con **Invitar → Copiar Código**.
- **«Esta clase está archivada y no admite más estudiantes»**: le has dado el código de una clase archivada. Dale el de la clase de este curso.

## Se unió a otra de tus clases

Si tienes varios grupos, o has duplicado la clase, cada una tiene su propio código y es fácil repartir el que no toca. En **Alumnado**, en el menú de la izquierda, está todo tu alumnado con su correo, o con su usuario si no tiene correo: busca a esa persona y abre su ficha para ver en qué clases está.

## Entró con otra cuenta

Quien tiene dos cuentas —la del centro y una personal— puede haberse unido con la que no esperas. Busca en **Alumnado** por su nombre, su correo o su usuario. Si está con una cuenta que no es la que usa en clase, pídele que entre con la buena y vuelva a escribir el código.

## Le han quitado de la clase

Si en la clase hay más docentes, alguien con administración puede haber quitado a esa persona. Míralo en la pestaña **Historial** de la clase, con el tipo **Alumnado**. Si tiene que volver, basta con que use otra vez el código; eso sí, empieza de cero.

## No tiene correo

Si no llega a entrar porque no tiene correo con el que registrarse, créale tú la cuenta: [dar de alta a estudiantes sin correo](/ayuda/alumnado/dar-de-alta-alumnos-sin-correo). Esa cuenta ya nace dentro de la clase.

## Está, pero no das con su cuenta

En la lista de la clase cada estudiante sale con el nombre de su cuenta y, debajo, con su alias de la clase, el que empieza por @. Al unirse le toca un alias mitológico al azar, así que no te fíes del alias: el buscador de la pestaña encuentra por nombre y por alias. Las cuentas que has creado tú llevan además la etiqueta **Sin correo**.$itakai$, "updated_at" = CURRENT_TIMESTAMP
FROM "help_categories" c
WHERE c."id" = a."category_id" AND c."slug" = $itakai$cuando-algo-falla$itakai$ AND a."locale" = 'es'
  AND a."slug" = $itakai$mi-alumno-no-aparece-en-la-clase$itakai$
  AND a."body" = $itakai$Un alumno asegura que ha usado el código y no lo ves en la pestaña **Alumnos** de la clase. Con el código se entra directamente, sin que nadie tenga que aceptar nada, así que casi siempre es una de estas cosas.

## La lista es de antes

La lista de alumnos se carga al abrir la pestaña. Si ya la tenías abierta cuando el alumno se unió, recarga la página.

## No llegó a unirse

Si el código no vale, el alumno ve el motivo en la ventana de **Unirse a clase** y no entra:

- **«Código de clase inválido»**: está mal copiado (la O y el cero, la I y el uno se confunden) o no es el de ninguna clase. Vuelve a dárselo con **Invitar → Copiar Código**.
- **«Esta clase está archivada y no admite nuevos alumnos»**: le has dado el código de una clase archivada. Dale el de la clase de este curso.

## Se unió a otra de tus clases

Si tienes varios grupos, o has duplicado la clase, cada una tiene su propio código y es fácil repartir el que no toca. En **Alumnos**, en el menú de la izquierda, están todos tus alumnos con su correo, o con su usuario si no tienen correo: búscalo y abre su ficha para ver en qué clases está.

## Entró con otra cuenta

Un alumno con dos cuentas —la del centro y una personal— puede haberse unido con la que no esperas. Búscalo en **Alumnos** por su nombre, su correo o su usuario. Si está con una cuenta que no es la que usa en clase, pídele que entre con la buena y vuelva a escribir el código.

## Lo quitó alguien de la clase

Si la clase tiene más profesores, alguien con administración puede haberlo quitado. Míralo en la pestaña **Historial** de la clase, con el tipo **Alumnado**. Si tiene que volver, basta con que use otra vez el código; eso sí, empieza de cero.

## No tiene correo

Si no llega a entrar porque no tiene correo con el que registrarse, créale tú la cuenta: [dar de alta alumnos sin correo](/ayuda/alumnado/dar-de-alta-alumnos-sin-correo). Esa cuenta ya nace dentro de la clase.

## Está, pero no lo reconoces

En la lista de la clase cada alumno sale con el nombre de su cuenta y, debajo, con su alias de la clase, el que empieza por @. Al unirse le toca un alias mitológico al azar, así que no te fíes del alias: el buscador de la pestaña encuentra por nombre y por alias. Las cuentas que has creado tú llevan además la etiqueta **Sin correo**.$itakai$;

-- cuando-algo-falla/un-alumno-no-ve-la-clase
UPDATE "help_articles" a
SET "title" = $itakai$Hay estudiantes que no ven la clase$itakai$, "updated_at" = CURRENT_TIMESTAMP
FROM "help_categories" c
WHERE c."id" = a."category_id" AND c."slug" = $itakai$cuando-algo-falla$itakai$ AND a."locale" = 'es'
  AND a."slug" = $itakai$un-alumno-no-ve-la-clase$itakai$
  AND a."title" = $itakai$Un alumno no ve la clase$itakai$;

UPDATE "help_articles" a
SET "body" = $itakai$Alguien de tu alumnado entra, llega a su panel y la clase no está. Repasa esto en orden.

## ¿Con qué cuenta ha entrado?

Es el motivo número uno. Quien tiene dos cuentas —la del centro y una personal— entra con la que no es. Pídele que mire con qué correo o con qué usuario ha iniciado sesión y compáralo con el que aparece en **Alumnado**, en tu menú.

## ¿Está en la clase de verdad?

Con el código se entra directamente, así que, si se unió, aparece en la pestaña **Alumnado** de la clase. Si no está, no llegó a unirse: pregúntale qué mensaje le salió al escribir el código. Y si estaba y ya no está, mira la pestaña **Historial** de la clase: alguien del profesorado puede haber quitado a esa persona.

## ¿La clase está archivada?

Una clase archivada desaparece de la vista del alumnado. Si acabas de archivarla para ordenar el curso, es eso.

## ¿Es de otro grupo?

Si has duplicado la clase para varios grupos, es fácil dar a alguien el código del grupo equivocado. Mira si aparece en otra de tus clases.

## Última comprobación

Si todo lo anterior está bien, que recargue la página o cierre sesión y vuelva a entrar. El panel se carga al entrar, y una sesión que lleva días abierta puede estar enseñando una lista vieja.$itakai$, "updated_at" = CURRENT_TIMESTAMP
FROM "help_categories" c
WHERE c."id" = a."category_id" AND c."slug" = $itakai$cuando-algo-falla$itakai$ AND a."locale" = 'es'
  AND a."slug" = $itakai$un-alumno-no-ve-la-clase$itakai$
  AND a."body" = $itakai$El alumno entra, llega a su panel y la clase no está. Repasa esto en orden.

## ¿Con qué cuenta ha entrado?

Es el motivo número uno. Un alumno con dos cuentas —la del centro y una personal— entra con la que no es. Pídele que mire con qué correo o con qué usuario ha iniciado sesión y compáralo con el que aparece en **Alumnos**, en tu menú.

## ¿Está en la clase de verdad?

Con el código se entra directamente, así que, si se unió, lo ves en la pestaña **Alumnos** de la clase. Si no está, no llegó a unirse: pregúntale qué mensaje le salió al escribir el código. Y si estaba y ya no está, mira la pestaña **Historial** de la clase: alguien del profesorado puede haberlo quitado.

## ¿La clase está archivada?

Una clase archivada desaparece de la vista del alumnado. Si acabas de archivarla para ordenar el curso, es eso.

## ¿Es de otro grupo?

Si has duplicado la clase para varios grupos, es fácil darle a un alumno el código del grupo equivocado. Mira si aparece en otra de tus clases.

## Última comprobación

Si todo lo anterior está bien, que recargue la página o cierre sesión y vuelva a entrar. El panel se carga al entrar, y una sesión que lleva días abierta puede estar enseñando una lista vieja.$itakai$;

-- cuando-algo-falla/no-puedo-subir-un-archivo
UPDATE "help_articles" a
SET "body" = $itakai$Las subidas fallan casi siempre por el tamaño o por el formato.

## Las entregas

Una entrega es **un solo archivo ZIP, RAR o 7Z de 50 MB como máximo**. Si intentas subir otra cosa —un PDF suelto, una foto, un vídeo—, la ventana te lo dice y no te deja entregar: mételo en un archivo comprimido.

Si ni comprimido baja de 50 MB, suele ser un vídeo grabado con el móvil o una presentación con muchas imágenes. Exportar un documento a PDF suele dejarlo en una fracción de lo que ocupaba; con un vídeo, pregunta a tu docente cómo prefiere recibirlo.

## Lo que sube el profesorado

Los materiales de una misión admiten hasta 50 MB por archivo. Las imágenes de las insignias tienen que ser PNG, JPG, SVG o WebP, de 2 MB como máximo.

## Dónde acaban los archivos

Cada instancia guarda los archivos donde tenga configurado en el panel de administración: en el disco del propio servidor o en un bucket externo. Si **ninguna** subida funciona y acabáis de cambiar esa configuración, ahí está el problema, y se ve en la propia pantalla de almacenamiento.

## Si solo le falla a una persona

Que pruebe desde otro navegador o desde otro dispositivo. Una extensión del navegador que bloquea peticiones puede cortar la subida sin decir nada.$itakai$, "updated_at" = CURRENT_TIMESTAMP
FROM "help_categories" c
WHERE c."id" = a."category_id" AND c."slug" = $itakai$cuando-algo-falla$itakai$ AND a."locale" = 'es'
  AND a."slug" = $itakai$no-puedo-subir-un-archivo$itakai$
  AND a."body" = $itakai$Las subidas fallan casi siempre por el tamaño o por el formato.

## Las entregas

Una entrega es **un solo archivo ZIP, RAR o 7Z de 50 MB como máximo**. Si intentas subir otra cosa —un PDF suelto, una foto, un vídeo—, la ventana te lo dice y no te deja entregar: mételo en un archivo comprimido.

Si ni comprimido baja de 50 MB, suele ser un vídeo grabado con el móvil o una presentación con muchas imágenes. Exportar un documento a PDF suele dejarlo en una fracción de lo que ocupaba; con un vídeo, pregunta a tu profesor cómo prefiere recibirlo.

## Lo que sube el profesorado

Los materiales de una misión admiten hasta 50 MB por archivo. Las imágenes de las insignias tienen que ser PNG, JPG, SVG o WebP, de 2 MB como máximo.

## Dónde acaban los archivos

Cada instancia guarda los archivos donde tenga configurado en el panel de administración: en el disco del propio servidor o en un bucket externo. Si **ninguna** subida funciona y acabáis de cambiar esa configuración, ahí está el problema, y se ve en la propia pantalla de almacenamiento.

## Si falla solo a un alumno

Que pruebe desde otro navegador o desde otro dispositivo. Una extensión del navegador que bloquea peticiones puede cortar la subida sin decir nada.$itakai$;

-- cuando-algo-falla/he-borrado-algo-sin-querer
UPDATE "help_articles" a
SET "body" = $itakai$Antes de nada: no vuelvas a crearlo a toda prisa. Mira primero si de verdad se ha ido.

## Archivar no es borrar

Las clases no se borran: se archivan. Una clase archivada sigue entera y se puede recuperar. No aparece entre tus clases activas, pero está en **Mis Clases**, en **Archivadas**, y desde su tarjeta se desarchiva.

Las misiones tampoco se pueden eliminar.

## Lo que sí desaparece

Lo que eliminas —un enigma, un material de una misión, un artículo de la tienda, un comportamiento, una insignia o, en administración, una categoría de la ayuda con sus artículos— no se puede recuperar desde la aplicación.

Tampoco tiene vuelta atrás **quitar a alguien de una clase**: se borra todo lo que tenía en ella, su progreso, sus entregas y sus saldos. Si vuelve a entrar con el código, empieza de cero.

## Las recompensas ya repartidas

El XP, las monedas y el maná que el alumnado ya ha cobrado **no se van** al eliminar nada de eso. Y un enigma que ya tiene entregas no se puede eliminar, justo para que nadie pierda lo que ganó con él.

## Si falta algo que no has tocado

Si la clase es compartida, mira primero la pestaña **Historial**: dice quién borró o quitó qué, y cuándo.

Habla con quien administre vuestra instancia. Si hay copias de seguridad del servidor, se puede restaurar desde ahí; desde la aplicación, no.

## Para la próxima

Antes de un cambio grande —reorganizar un trimestre, limpiar misiones viejas— duplica la clase. La copia te queda como red de seguridad y se hace en un momento.$itakai$, "updated_at" = CURRENT_TIMESTAMP
FROM "help_categories" c
WHERE c."id" = a."category_id" AND c."slug" = $itakai$cuando-algo-falla$itakai$ AND a."locale" = 'es'
  AND a."slug" = $itakai$he-borrado-algo-sin-querer$itakai$
  AND a."body" = $itakai$Antes de nada: no vuelvas a crearlo a toda prisa. Mira primero si de verdad se ha ido.

## Archivar no es borrar

Las clases no se borran: se archivan. Una clase archivada sigue entera y se puede recuperar. No aparece entre tus clases activas, pero está en **Mis Clases**, en **Archivadas**, y desde su tarjeta se desarchiva.

Las misiones tampoco se pueden eliminar.

## Lo que sí desaparece

Lo que eliminas —un enigma, un material de una misión, un artículo de la tienda, un comportamiento, una insignia o, en administración, una categoría de la ayuda con sus artículos— no se puede recuperar desde la aplicación.

Tampoco tiene vuelta atrás **quitar a un alumno de una clase**: se borra todo lo que tenía en ella, su progreso, sus entregas y sus saldos. Si vuelve a entrar con el código, empieza de cero.

## Las recompensas ya repartidas

El XP, las monedas y el maná que el alumnado ya ha cobrado **no se van** al eliminar nada de eso. Y un enigma que ya tiene entregas no se puede eliminar, justo para que nadie pierda lo que ganó con él.

## Si falta algo que no has tocado

Si la clase es compartida, mira primero la pestaña **Historial**: dice quién borró o quitó qué, y cuándo.

Habla con quien administre vuestra instancia. Si hay copias de seguridad del servidor, se puede restaurar desde ahí; desde la aplicación, no.

## Para la próxima

Antes de un cambio grande —reorganizar un trimestre, limpiar misiones viejas— duplica la clase. La copia te queda como red de seguridad y se hace en un momento.$itakai$;

-- cuando-algo-falla/las-recompensas-no-cuadran
UPDATE "help_articles" a
SET "summary" = $itakai$Alguien recibe menos XP o menos monedas de las que esperaba.$itakai$, "updated_at" = CURRENT_TIMESTAMP
FROM "help_categories" c
WHERE c."id" = a."category_id" AND c."slug" = $itakai$cuando-algo-falla$itakai$ AND a."locale" = 'es'
  AND a."slug" = $itakai$las-recompensas-no-cuadran$itakai$
  AND a."summary" = $itakai$Un alumno recibe menos XP o menos monedas de las que esperaba.$itakai$;

UPDATE "help_articles" a
SET "body" = $itakai$Casi siempre es que se está mirando el número de la misión y cobrando el del enigma, o al revés.

## Se paga por porcentaje

Al revisar una entrega pones cuánto se ha completado, y las recompensas salen de ahí, redondeadas. Un 60 % no cobra lo mismo que un 100 %. Si quien entregó esperaba la cifra entera, pídele que mire el aviso de la revisión: dice el porcentaje que le pusiste.

## Cada enigma paga lo suyo

Las recompensas se reparten por enigma, no de una vez al final de la misión. Quien ha hecho dos de cuatro pasos ha cobrado dos, aunque la misión siga abierta.

## La clase manda

Cada clase decide qué recursos usa. Si una clase no tiene el maná activado, no se paga maná aunque el enigma lo tuviera puesto.

## Al cambiar la configuración

Activar o desactivar un recurso en *Ajustes* afecta a lo que se reparta **a partir de ese momento**: lo ya cobrado no se recalcula.

Con las recompensas de un enigma es distinto. Si las subes cuando alguien ya lo tiene aprobado, se le completa la diferencia, con el mismo porcentaje con el que se le revisó. Bajarlas, en cambio, no se puede, y es a propósito: nadie debería perder por la noche algo que ganó por la mañana.

## Si aun así no sale

Mira lo que se pagó de verdad:

- En el **Resumen** de la clase, **Actividad Reciente** muestra las últimas entregas aprobadas, cada una con la experiencia que dio.
- En la pestaña **Historial** de la clase, con el tipo **Entregas**, cada aprobación con quién la hizo y con qué porcentaje. Si la clase es compartida, puede que la aprobara otra persona del profesorado.
- En **Alumnado**, en el menú de la izquierda, la ficha de cada estudiante reúne su experiencia, sus monedas y su maná en cada una de tus clases y, en **Actividad Reciente**, sus últimas entregas aprobadas y misiones completadas, con la experiencia de cada una.

Las monedas y el maná de cada entrega no aparecen sueltos en esas listas; el saldo de la clase, sí.$itakai$, "updated_at" = CURRENT_TIMESTAMP
FROM "help_categories" c
WHERE c."id" = a."category_id" AND c."slug" = $itakai$cuando-algo-falla$itakai$ AND a."locale" = 'es'
  AND a."slug" = $itakai$las-recompensas-no-cuadran$itakai$
  AND a."body" = $itakai$Casi siempre es que se está mirando el número de la misión y cobrando el del enigma, o al revés.

## Se paga por porcentaje

Al revisar una entrega pones cuánto se ha completado, y las recompensas salen de ahí, redondeadas. Un 60 % no cobra lo mismo que un 100 %. Si el alumno esperaba la cifra entera, pídele que mire el aviso de la revisión: dice el porcentaje que le pusiste.

## Cada enigma paga lo suyo

Las recompensas se reparten por enigma, no de una vez al final de la misión. Quien ha hecho dos de cuatro pasos ha cobrado dos, aunque la misión siga abierta.

## La clase manda

Cada clase decide qué recursos usa. Si una clase no tiene el maná activado, no se paga maná aunque el enigma lo tuviera puesto.

## Al cambiar la configuración

Activar o desactivar un recurso en *Ajustes* afecta a lo que se reparta **a partir de ese momento**: lo ya cobrado no se recalcula.

Con las recompensas de un enigma es distinto. Si las subes cuando algún alumno ya lo tiene aprobado, a esos alumnos se les completa la diferencia, con el mismo porcentaje con el que se les revisó. Bajarlas, en cambio, no se puede, y es a propósito: nadie debería perder por la noche algo que ganó por la mañana.

## Si aun así no sale

Mira lo que se pagó de verdad:

- En el **Resumen** de la clase, **Actividad Reciente** muestra las últimas entregas aprobadas, cada una con la experiencia que dio.
- En la pestaña **Historial** de la clase, con el tipo **Entregas**, cada aprobación con quién la hizo y con qué porcentaje. Si la clase es compartida, puede que la aprobara otra persona del profesorado.
- En **Alumnos**, en el menú de la izquierda, la ficha de cada alumno reúne su experiencia, sus monedas y su maná en cada una de tus clases y, en **Actividad Reciente**, sus últimas entregas aprobadas y misiones completadas, con la experiencia de cada una.

Las monedas y el maná de cada entrega no aparecen sueltos en esas listas; el saldo de la clase, sí.$itakai$;

-- cuando-algo-falla/no-puedo-entrar-en-mi-cuenta
UPDATE "help_articles" a
SET "body" = $itakai$Antes de crear otra cuenta —que es lo que todo el mundo hace y complica el arreglo—, prueba esto.

## ¿Entraste con Google?

Si creaste la cuenta con el botón de Google, no tienes contraseña que recordar: tienes que volver a entrar con Google. Pedir una contraseña nueva no va a servir de nada.

## ¿Entras con un usuario?

Si tu cuenta te la creó tu docente, en **Correo o usuario** se escribe tu usuario, no un correo. Si has olvidado la contraseña, el enlace para recuperarla no te sirve, porque tu cuenta no tiene correo: pídele a tu docente que te la restablezca. Lo explica [he olvidado mi contraseña y no tengo correo](/ayuda/si-eres-alumno/he-olvidado-mi-contrasena-y-no-tengo-correo).

## Restablecer la contraseña

Si entras con correo y contraseña, usa **¿Olvidaste tu contraseña?**, en la pantalla de entrada. Llega un correo con un enlace temporal; si no aparece, mira en spam, que es donde suele acabar.

## Demasiados intentos

Si te equivocas muchas veces seguidas, la entrada se corta un rato y sale **«Demasiadas peticiones»**, con los segundos que faltan. Espera ese tiempo y vuelve a probar con calma.

## La cuenta duplicada

El lío clásico: tener una cuenta con el correo personal y otra con el del centro, y haberse unido a la clase con una sola. Son dos cuentas distintas y la clase solo está en la que usaste para escribir el código. Comprueba con qué correo entras.

Si ya tienes dos, quédate con la que usas en clase. Si la clase no aparece en ella, vuelve a escribir el código desde esa cuenta.

## «Cuenta suspendida o inactiva»

La cuenta existe, pero está desactivada. Solo la puede volver a activar quien administra la instancia.

## Sigo sin poder

Que quien administre la instancia compruebe que la cuenta existe y está activa con el correo o el usuario que tú crees. Desde ahí se ve enseguida si el problema es la cuenta o la contraseña.$itakai$, "updated_at" = CURRENT_TIMESTAMP
FROM "help_categories" c
WHERE c."id" = a."category_id" AND c."slug" = $itakai$cuando-algo-falla$itakai$ AND a."locale" = 'es'
  AND a."slug" = $itakai$no-puedo-entrar-en-mi-cuenta$itakai$
  AND a."body" = $itakai$Antes de crear otra cuenta —que es lo que todo el mundo hace y complica el arreglo—, prueba esto.

## ¿Entraste con Google?

Si creaste la cuenta con el botón de Google, no tienes contraseña que recordar: tienes que volver a entrar con Google. Pedir una contraseña nueva no va a servir de nada.

## ¿Entras con un usuario?

Si tu cuenta te la creó tu profesor, en **Correo o usuario** se escribe tu usuario, no un correo. Si has olvidado la contraseña, el enlace para recuperarla no te sirve, porque tu cuenta no tiene correo: pídele a tu profesor que te la restablezca. Lo explica [he olvidado mi contraseña y no tengo correo](/ayuda/si-eres-alumno/he-olvidado-mi-contrasena-y-no-tengo-correo).

## Restablecer la contraseña

Si entras con correo y contraseña, usa **¿Olvidaste tu contraseña?**, en la pantalla de entrada. Llega un correo con un enlace temporal; si no aparece, mira en spam, que es donde suele acabar.

## Demasiados intentos

Si te equivocas muchas veces seguidas, la entrada se corta un rato y sale **«Demasiadas peticiones»**, con los segundos que faltan. Espera ese tiempo y vuelve a probar con calma.

## La cuenta duplicada

El lío clásico: tener una cuenta con el correo personal y otra con el del centro, y haberse unido a la clase con una sola. Son dos cuentas distintas y la clase solo está en la que usaste para escribir el código. Comprueba con qué correo entras.

Si ya tienes dos, quédate con la que usas en clase. Si la clase no aparece en ella, vuelve a escribir el código desde esa cuenta.

## «Cuenta suspendida o inactiva»

La cuenta existe, pero está desactivada. Solo la puede volver a activar quien administra la instancia.

## Sigo sin poder

Que quien administre la instancia compruebe que la cuenta existe y está activa con el correo o el usuario que tú crees. Desde ahí se ve enseguida si el problema es la cuenta o la contraseña.$itakai$;
