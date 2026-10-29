-- Ayuda de E3, entrega 4: el camino del mapa de misiones. La guía del mapa
-- (profesorado) pasa a contar el tablero nuevo y el camino: cómo se monta (en
-- los ajustes de cada misión o encadenando en orden), qué ve el alumnado, cuándo
-- se abre cada misión (los opcionales no cuentan, lo empezado no se cierra, lo
-- caducado o sin enigmas no cierra, «bloqueada» va por encima), cómo se apaga y
-- qué pasa al copiar. Una guía nueva para el alumnado (por qué una misión tiene
-- candado y cómo leer el mapa) y los retoques de las que hablan del orden, de
-- completar una misión, de las copias, del historial y de la vista del alumnado.
--
-- Como el resto del contenido de serie, el panel de administración manda. El
-- INSERT solo crea lo que no exista y va al final de su categoría; cada UPDATE
-- solo cambia un campo si sigue exactamente con el texto de serie, así que lo que
-- alguien haya editado se queda como está. Siempre por slug de categoría y de
-- artículo, nunca por id.

-- si-eres-alumno/el-mapa-y-las-misiones-cerradas
INSERT INTO "help_articles" ("id", "category_id", "slug", "title", "summary", "cover_image", "body", "locale", "status", "order_index", "featured", "audience", "kind", "published_at", "updated_at")
SELECT gen_random_uuid()::text, c."id", $itakai$el-mapa-y-las-misiones-cerradas$itakai$, $itakai$El mapa de misiones y las misiones cerradas$itakai$, $itakai$Por qué una misión sale con candado y cómo se abre, y cómo leer el mapa: «Estás aquí», la leyenda y el detalle de cada misión.$itakai$, $itakai$/app/ayuda/recorrido.svg$itakai$, $itakai$A veces una misión sale con un **candado**: todavía no puedes entrar en ella. Puede ser por dos motivos, y la propia misión te dice cuál.

## Se abre al completar otra

Si tu clase usa el **mapa de misiones**, tu docente puede preparar un camino: unas misiones se abren al completar otras, como los niveles de un juego. Esas misiones dicen **Se abre al completar «…»**, con el nombre de la que te falta. Si salen dos o tres, tienes que completarlas **todas**.

- Una misión está completada cuando tu docente te ha aprobado todos sus enigmas. Los que pone **Opcional** no hacen falta.
- En cuanto completas lo que pide, la misión se te abre sola. No tienes que pedir nada.
- Cada persona va a su ritmo: se te abre cuando tú completas lo que pide, aunque al resto de la clase todavía no.
- Si la misión que te falta ya ha pasado su fecha, o no tiene enigmas, no te cierra nada: la siguiente se abre igualmente.
- Si ya habías empezado una misión (hiciste una entrega, te aprobaron un enigma o usaste una pista), no se te cierra aunque después le pongan un requisito.

Mientras está cerrada no puedes ver su historia, sus enigmas ni sus documentos, ni usar sus pistas. Si llegas a ella desde un enlace, verás **Aún no puedes empezar esta misión** y, si la que te falta ya está abierta, un botón para ir a ella.

## Cerrada por tu docente

Si tiene candado pero no dice qué la abre, la ha cerrado tu docente por ahora, para toda la clase: a lo mejor aún la está preparando. Al pulsarla verás **Tu docente ha cerrado esta misión por ahora. Podrás entrar cuando la abra.** Aquí no tienes que hacer nada: espera a que la abra.

A veces pasan las dos cosas a la vez: la misión que te falta también la tiene cerrada tu docente. Entonces verás, por ejemplo, **Se abre al completar «A» (cerrada por tu docente por ahora)**, y hasta que tu docente abra «A» no puedes seguir por ese camino. Si crees que es un error, pregúntale.

## Cómo leer el mapa

En la pestaña **Misiones** de tu clase, la vista **Mapa** enseña tus misiones como un tablero, de la **Salida** a la **Meta**. Una carretera las une y el tramo que ya has recorrido se ilumina.

- Arriba ves lo que llevas, por ejemplo **Has completado 3 de 8 misiones**, con tu barra.
- **Estás aquí**, con tu avatar, marca la misión en la que vas. El botón **Ir a mi misión** te lleva hasta ella.
- Cada misión lleva un icono con su estado. En la **Leyenda**, debajo del mapa, ves qué es cada uno: **Completada**, **En curso**, **Disponible**, **Urgente** (vence pronto), **Expirada** o **Cerrada**.
- Pulsa un estado de la **Leyenda** para resaltar sus misiones: por ejemplo, **Disponible** te enseña las que puedes empezar ya. Vuelve a pulsarlo para quitarlo.
- Con el teclado, las flechas te llevan de una misión a la siguiente.

Al pulsar una misión se abre su **detalle**: lo que da, cuánto llevas, su fecha límite, qué hay que completar para abrirla y qué abre ella. Si está abierta, tiene el botón para **Empezar**, **Continuar** o **Ver misión**. Si está cerrada, te dice qué te falta o que la ha cerrado tu docente.

El mapa está **en pruebas** (pone **Beta**), así que puede cambiar un poco. Si lo prefieres, también puedes ver tus misiones en **Cuadrícula** o en **Lista**.$itakai$, 'es', 'publicado'::"HelpArticleStatus", (SELECT COALESCE(MAX(a."order_index"), -1) + 1 FROM "help_articles" a WHERE a."category_id" = c."id"), false, 'alumno'::"HelpAudience", 'guia'::"HelpArticleKind", CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM "help_categories" c WHERE c."slug" = $itakai$si-eres-alumno$itakai$
ON CONFLICT ("category_id", "slug", "locale") DO NOTHING;

-- misiones/el-mapa-de-misiones: el resumen, con el tablero y el camino.
UPDATE "help_articles" a
SET "summary" = $itakai$Las misiones de la clase en un tablero, de la Salida a la Meta, y un camino en el que cada misión se abre al completar otras. Está en pruebas.$itakai$, "updated_at" = CURRENT_TIMESTAMP
FROM "help_categories" c
WHERE c."id" = a."category_id" AND c."slug" = $itakai$misiones$itakai$ AND a."locale" = 'es'
  AND a."slug" = $itakai$el-mapa-de-misiones$itakai$
  AND a."summary" = $itakai$Una vista de mapa en Misiones: el camino de la clase, en su orden, con el estado de cada misión. Está en pruebas.$itakai$;

-- misiones/el-mapa-de-misiones: el tablero, montar el camino, qué ve el alumnado, cuándo se abre cada misión, apagarlo y las copias.
UPDATE "help_articles" a
SET "body" = $itakai$El **mapa de misiones** enseña las misiones de la clase como un tablero, de la **Salida** a la **Meta**, con una carretera que las une. Con él puedes montar además un **camino**: que una misión no se abra hasta completar otras. Es una función **en pruebas**, con la etiqueta **Beta**: su aspecto y su funcionamiento se ajustarán con lo que se vea al usarla.

## Encenderlo

En *Ajustes* de la clase, sección **Funcionalidades**, en **En pruebas**, activa **Mapa de misiones**. Va apagado de entrada, y encenderlo o apagarlo pide acceso de administración en la clase. En la pestaña **Misiones** aparece entonces una vista más, **Mapa**, junto a la cuadrícula y la lista. En el mapa no hay filtros: sale la clase entera.

## El tablero

Cada misión es un medallón con su portada, su número de paso y el icono de su estado, que también se dice en texto, nunca solo con un color. Sin camino, las misiones siguen el [orden de la clase](/ayuda/misiones/el-orden-de-las-misiones); con camino, cada una va detrás de lo que pide. El tramo ya recorrido se ilumina.

- **Tu alumnado** ve el mapa de entrada, con lo que lleva (**Has completado 3 de 8 misiones**), **Estás aquí** con su avatar en la misión en la que va y el botón **Ir a mi misión**.
- **Tú** ves en cada medallón un anillo con la parte de la clase que la ha completado y, arriba, cómo va la clase en el recorrido.

Al pulsar una misión se abre su detalle: lo que da, el avance, la fecha límite, qué la abre, qué abre ella y el botón para entrar. Sale al lado del tablero o, en el móvil, desde abajo; ahí el camino es una columna. En la **Leyenda**, debajo del mapa, cada estado resalta sus misiones, y con el teclado las flechas pasan de una misión a la siguiente.

## Montar el camino

Una misión puede pedir que antes se completen **hasta 3** misiones de su clase, y entonces hacen falta **todas**. Hay dos formas de montarlo, y se pueden combinar:

- **Misión a misión.** Abre la misión y ve a **Ajustes**. En la sección **Camino**, marca en **Para abrirla, completar antes** las que hacen falta y pulsa **Guardar cambios**. Junto a cada casilla ves si esa misión está bloqueada o expirada. Las atenuadas no se pueden marcar: ya dependen de esta, y si la pidiera, no se abriría ninguna de las dos.
- **En un paso.** En la pestaña **Misiones**, pulsa **Ordenar**. Debajo de la lista, en **Camino del mapa**, **Encadenar en orden** hace que cada misión pida la anterior y sustituye lo que hubiera; las bloqueadas se quedan fuera, ni piden nada ni las pide nadie. **Quitar los requisitos** los borra todos.

Junto a cada botón se lee lo que va a pasar antes de pulsarlo. Montar el camino pide acceso de **edición** en la clase, cada cambio queda en el [historial](/ayuda/clases/el-historial-de-la-clase) y se puede preparar con el mapa apagado: se guarda, pero no cierra nada hasta que lo enciendas.

Con el mapa encendido, una misión **no puede ir delante de lo que pide**: si estaba delante, al guardar sus requisitos pasa detrás, y en **Ordenar** no se puede volver a poner delante sin quitarle antes lo que pide. Con el mapa apagado ordenas como quieras; al encenderlo, se recoloca solo lo justo.

## Qué ve tu alumnado

Cada estudiante recorre el camino a su ritmo: una misión se le abre en cuanto completa lo que pide. Hasta entonces la ve con candado y **Se abre al completar «…»**, en el mapa y en las tarjetas, y no puede entrar: ni ver su historia ni sus documentos, ni entregar, ni usar sus pistas. Si llega por un enlace, ve **Aún no puedes empezar esta misión** y, si lo que le falta ya está abierto, un botón para ir a ello.

## Cuándo se abre

- **Completar es aprobar los obligatorios.** Una misión está completada cuando alguien tiene aprobados todos sus enigmas obligatorios. Los [opcionales](/ayuda/misiones/enigmas-los-pasos-de-una-mision) dan su recompensa, pero no hacen falta; si todos son opcionales, basta con aprobar uno.
- **Lo empezado no se cierra.** Si alguien ya tiene en una misión una entrega, un enigma aprobado o una pista usada, no se le cierra aunque le pongas requisitos después.
- **Lo que no se puede cumplir no cierra.** Si la misión que se pide ha caducado o no tiene enigmas, no cierra lo que va detrás. Si le alargas la fecha, vuelve a cerrarlo para quien aún no lo haya empezado.
- **Bloqueada va por encima.** Una misión bloqueada está cerrada para toda la clase, pida lo que pida. Si la que se pide está bloqueada, lo que va detrás espera a que la desbloquees, y tu alumnado lee **Se abre al completar «A» (cerrada por tu docente por ahora)**.
- **Tú no tienes cierres.** El profesorado lo ve todo abierto, también con **Ver como estudiante**. Para probar el camino hace falta una cuenta de estudiante.

No se puede abrir una misión a una sola persona: si alguien se queda atascado, quita ese requisito, que cambia para toda la clase, o apaga el mapa.

## Apagarlo

Apagar el mapa **lo abre todo al momento**: solo siguen cerradas las bloqueadas, desaparece la vista **Mapa** y el orden vuelve a ser libre. No se borra nada: los requisitos se quedan guardados y vuelven a cerrar cuando lo enciendas otra vez, salvo lo que cada estudiante haya empezado entretanto.

## Al copiar

- Al [duplicar la clase](/ayuda/clases/duplicar-una-clase-para-el-curso-siguiente) o importar una [plantilla](/ayuda/clases/crear-una-clase-desde-cero-o-desde-una-plantilla) con sus misiones, el camino llega igual, y con las funcionalidades, el interruptor llega como estaba. La ficha pública de una plantilla no lo enseña, por estar en pruebas.
- Una misión [importada de otra clase](/ayuda/misiones/importar-una-mision-de-otra-clase), o que pasas a otra clase, llega **sin requisitos**, y en la de origen ya no la pide nadie.$itakai$, "updated_at" = CURRENT_TIMESTAMP
FROM "help_categories" c
WHERE c."id" = a."category_id" AND c."slug" = $itakai$misiones$itakai$ AND a."locale" = 'es'
  AND a."slug" = $itakai$el-mapa-de-misiones$itakai$
  AND a."body" = $itakai$El **mapa de misiones** enseña las misiones de la clase como un camino, en el [orden de la clase](/ayuda/misiones/el-orden-de-las-misiones): la primera arriba y cada una unida con la siguiente. Es una función **en pruebas**, con la etiqueta **Beta**: su aspecto y su funcionamiento se ajustarán con lo que se vea al usarla.

## Encenderlo

En *Ajustes* de la clase, sección **Funcionalidades**, en **En pruebas**, activa **Mapa de misiones**. Va apagado de entrada, y encenderlo o apagarlo pide acceso de administración en la clase. Apagarlo no borra nada: la clase vuelve a verse como antes.

## Qué se ve

En la pestaña **Misiones** aparece una vista más, **Mapa**, junto a la cuadrícula y la lista. En el mapa no hay filtros: sale la clase entera, en su orden.

- **Tu alumnado** ve el mapa de entrada y, en cada misión, cómo la lleva: completada, en curso con su porcentaje, disponible, urgente, expirada o cerrada por su docente. Una misión bloqueada no se abre: al pulsarla, dice por qué.
- **Tú** ves en cada misión su estado en la clase y cuántas personas la han completado. Al pulsarla, se abre.

El estado va siempre con un icono y un texto, nunca solo con un color. En el móvil el camino es una columna; en pantallas más anchas, va en zigzag. Se recorre con el teclado en el mismo orden que el camino.

## Lo que no hace

El mapa sigue el orden de la clase, pero **no abre ni cierra misiones**: cada una se abre o se bloquea como siempre, desde sus ajustes. Para cambiar el camino, cambia el orden con **Ordenar**.

Al duplicar la clase con sus funcionalidades o al importarla como plantilla, el interruptor llega como estaba, con el resto de funcionalidades. La ficha pública de una plantilla no lo enseña, por estar en pruebas.$itakai$;

-- misiones/el-orden-de-las-misiones: con el mapa encendido, el orden respeta el camino.
UPDATE "help_articles" a
SET "body" = $itakai$Las misiones de una clase tienen un **orden**: el de la progresión, el que decides tú. Es el orden en que las ve tu alumnado en la pestaña *Misiones* y el que sale de entrada, como **Orden de la clase**, en el desplegable de ordenar. Desde ese desplegable cualquiera puede ver la lista por fecha, nombre o XP sin cambiar el orden de la clase.

## Cambiar el orden

1. En la pestaña **Misiones** de la clase, pulsa **Ordenar**.
2. Arrastra cada misión por su asa hasta su sitio. Con el teclado, ponte en el asa y usa las flechas arriba y abajo: cada paso se anuncia al lector de pantalla.
3. Cada cambio se guarda al momento. Pulsa **Hecho** para volver a las tarjetas.

Ordenar pide acceso de **edición** en la clase, como crear o editar misiones. Cada cambio queda en el [historial de la clase](/ayuda/clases/el-historial-de-la-clase).

## Dónde va cada misión

- Una misión **nueva** va al final.
- Una misión [importada de otra clase](/ayuda/misiones/importar-una-mision-de-otra-clase), o que pasas a otra clase, llega al final de la clase que la recibe.
- Al [duplicar la clase](/ayuda/clases/duplicar-una-clase-para-el-curso-siguiente) o importar una plantilla, las misiones llegan **en el mismo orden**.

El orden no abre ni cierra nada por sí solo: una misión bloqueada sigue bloqueada esté donde esté, y el alumnado entrega las que están abiertas en el orden que quiera.

## El orden y el mapa

Con el [mapa de misiones](/ayuda/misiones/el-mapa-de-misiones), cada misión puede pedir que antes se completen otras, y en **Ordenar** se lee bajo su título: **Se abre al completar «…»**. Si el mapa está encendido, **una misión no puede ir delante de lo que pide**: si la arrastras ahí, vuelve a su sitio y un aviso te dice qué lo impide. Con el mapa apagado ordenas como quieras, y al encenderlo se recoloca solo lo justo.

Debajo de la lista, **Camino del mapa** tiene dos atajos: **Encadenar en orden**, para que cada misión pida la anterior, y **Quitar los requisitos**.$itakai$, "updated_at" = CURRENT_TIMESTAMP
FROM "help_categories" c
WHERE c."id" = a."category_id" AND c."slug" = $itakai$misiones$itakai$ AND a."locale" = 'es'
  AND a."slug" = $itakai$el-orden-de-las-misiones$itakai$
  AND a."body" = $itakai$Las misiones de una clase tienen un **orden**: el de la progresión, el que decides tú. Es el orden en que las ve tu alumnado en la pestaña *Misiones* y el que sale de entrada, como **Orden de la clase**, en el desplegable de ordenar. Desde ese desplegable cualquiera puede ver la lista por fecha, nombre o XP sin cambiar el orden de la clase.

## Cambiar el orden

1. En la pestaña **Misiones** de la clase, pulsa **Ordenar**.
2. Arrastra cada misión por su asa hasta su sitio. Con el teclado, ponte en el asa y usa las flechas arriba y abajo: cada paso se anuncia al lector de pantalla.
3. Cada cambio se guarda al momento. Pulsa **Hecho** para volver a las tarjetas.

Ordenar pide acceso de **edición** en la clase, como crear o editar misiones. Cada cambio queda en el [historial de la clase](/ayuda/clases/el-historial-de-la-clase).

## Dónde va cada misión

- Una misión **nueva** va al final.
- Una misión [importada de otra clase](/ayuda/misiones/importar-una-mision-de-otra-clase), o que pasas a otra clase, llega al final de la clase que la recibe.
- Al [duplicar la clase](/ayuda/clases/duplicar-una-clase-para-el-curso-siguiente) o importar una plantilla, las misiones llegan **en el mismo orden**.

El orden no abre ni cierra nada: una misión bloqueada sigue bloqueada esté donde esté, y el alumnado entrega las que están abiertas en el orden que quiera.$itakai$;

-- misiones/enigmas-los-pasos-de-una-mision: los opcionales no hacen falta para completar la misión.
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

## Enigmas opcionales

Al crear o editar un enigma puedes marcar **Este enigma es opcional**. En la misión sale con la etiqueta **Opcional**: da su recompensa como cualquier otro y cuenta en el avance, pero **no hace falta para completar la misión**.

## Lo que pasa al completar la misión

Cuando apruebas el último enigma obligatorio que le faltaba a alguien, la misión se marca como completada y esa persona se lleva el bonus de rareza y la insignia asociada, si la misión tiene una. Eso ocurre una sola vez, en esa revisión. Si todos los enigmas son opcionales, basta con aprobar uno.

Completar una misión también abre las que la piden en el camino del [mapa de misiones](/ayuda/misiones/el-mapa-de-misiones).$itakai$, "updated_at" = CURRENT_TIMESTAMP
FROM "help_categories" c
WHERE c."id" = a."category_id" AND c."slug" = $itakai$misiones$itakai$ AND a."locale" = 'es'
  AND a."slug" = $itakai$enigmas-los-pasos-de-una-mision$itakai$
  AND a."body" = $itakai$El enigma es la unidad real de trabajo. La misión da el marco; el enigma es lo que el alumnado hace, entrega y ve puntuado.


![Las partes de una misión señaladas sobre su ficha: portada, rareza, fecha de entrega y los enigmas.](/app/ayuda/diagramas/anatomia-mision.svg)
## Cómo se componen

Cada enigma tiene un **título**, un **enunciado** y sus propias **recompensas**. Se ordenan dentro de la misión, y ese orden es el que ve el alumnado.

Un enigma puede ser cualquier cosa que acabe en una entrega: resolver un problema, grabar un audio, subir una foto de una maqueta, entregar un documento. El alumnado lo entrega siempre en **un archivo comprimido ZIP, RAR o 7Z de hasta 50 MB**, así que dentro cabe lo que haga falta: uno o varios archivos, del formato que sea.

## Qué hace cada estudiante

Abre la misión, elige un enigma y sube su archivo. La entrega queda **pendiente de revisión** y en su pantalla ve que la pelota está en tu tejado. Mientras tenga una entrega pendiente de ese enigma no puede subir otra, para que no se te acumulen tres versiones de lo mismo.

## Cuántos poner

No hay número mágico, pero conviene que cada enigma sea entregable en una sesión o dos. Una misión de dos enigmas gordos se atasca; una de ocho pequeños da sensación de avance continuo.

## Lo que pasa al completar el último

Cuando apruebas el enigma que faltaba, la misión se marca como completada y quien la ha hecho se lleva el bonus de rareza y la insignia asociada, si la misión tiene una. Eso ocurre una sola vez, en esa revisión.$itakai$;

-- misiones/revisar-entregas: el bonus llega con el último enigma obligatorio.
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
3. Elige el porcentaje completado: **25%**, **50%**, **75%**, **100%** o el que escribas, de 1 a 100. Al lado, **Recibirá** te enseña lo que se llevará esa persona con ese porcentaje y, si ha usado pistas de %, ya con su descuento: lo ves bajo su nombre, por ejemplo «−20 % por sus pistas».
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

Si esa persona ha usado en la misión [pistas](/ayuda/misiones/pistas-en-las-misiones) que restan un % de la recompensa, el porcentaje de la revisión se multiplica con lo que le queda: un 70 % con un −20 % de pistas da el 56 %. Cada estudiante lleva su propio descuento, también al aprobar a todo un equipo.

## Al completar la misión entera

Quien termina el último enigma obligatorio que le quedaba se lleva además el **bonus por completar la misión** —entre 50 y 400 XP [según la rareza](/ayuda/misiones/rarezas-y-fechas-de-entrega)— y con él la insignia asociada, si la misión tiene una. Los [enigmas opcionales](/ayuda/misiones/enigmas-los-pasos-de-una-mision) no hacen falta para completarla.

## Lo que no se puede repetir

Un enigma ya aprobado **no se puede volver a aprobar**: en la vista de quien lo entregó deja de tener el botón **Entregar**, y la plataforma nunca paga dos veces las recompensas del mismo enigma.

## Quién aprobó qué

Cada aprobación queda en el [historial de la clase](/ayuda/clases/el-historial-de-la-clase), con quién la hizo y con qué porcentaje. Cada estudiante también ve en su actividad quién le aprobó la entrega.$itakai$, "updated_at" = CURRENT_TIMESTAMP
FROM "help_categories" c
WHERE c."id" = a."category_id" AND c."slug" = $itakai$misiones$itakai$ AND a."locale" = 'es'
  AND a."slug" = $itakai$revisar-entregas$itakai$
  AND a."body" = $itakai$Cuando alguien del alumnado sube su archivo a un enigma, la entrega queda **pendiente** hasta que la revises. La revisión se hace en la propia misión: ahí decides con qué porcentaje se ha completado la tarea, y ese único número reparte todas las recompensas.


![Los tres estados de una entrega: pendiente, entregada y revisada. Los dos primeros los mueve el alumnado; el último, el profesorado.](/app/ayuda/diagramas/estados-entrega.svg)
## Dónde están las entregas

Si tienes acceso de edición o de administración en la clase, cada vez que alguien del alumnado entrega te llega un aviso en **Avisos**, en el menú de la izquierda. Al pulsarlo vas directamente a la misión, con la ventana de entregas de ese enigma abierta. En cuanto alguien del profesorado aprueba esa entrega, el aviso queda como leído para todo el profesorado.

También puedes llegar tú: en la clase, pestaña **Misiones**, abre la misión. Cada enigma tiene su botón **Ver entregas (N)**, donde N son las que quedan por revisar; en el móvil está en el menú **⋮** de cada enigma.

Y para saber si te queda algo pendiente, el **Resumen** de la clase muestra cuántas **Entregas por Revisar** hay.

## Cómo se revisa

La ventana de entregas lista las pendientes de ese enigma, con el alias de quien entrega y cuándo lo hizo.

1. Pulsa **Descargar** para bajar el archivo y revisarlo.
2. Pulsa **Valorar**.
3. Elige el porcentaje completado: **25%**, **50%**, **75%**, **100%** o el que escribas, de 1 a 100. Al lado, **Recibirá** te enseña lo que se llevará esa persona con ese porcentaje y, si ha usado pistas de %, ya con su descuento: lo ves bajo su nombre, por ejemplo «−20 % por sus pistas».
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

Si esa persona ha usado en la misión [pistas](/ayuda/misiones/pistas-en-las-misiones) que restan un % de la recompensa, el porcentaje de la revisión se multiplica con lo que le queda: un 70 % con un −20 % de pistas da el 56 %. Cada estudiante lleva su propio descuento, también al aprobar a todo un equipo.

## Al completar la misión entera

Quien termina el último enigma pendiente se lleva además el **bonus por completar la misión** —entre 50 y 400 XP [según la rareza](/ayuda/misiones/rarezas-y-fechas-de-entrega)— y con él la insignia asociada, si la misión tiene una.

## Lo que no se puede repetir

Un enigma ya aprobado **no se puede volver a aprobar**: en la vista de quien lo entregó deja de tener el botón **Entregar**, y la plataforma nunca paga dos veces las recompensas del mismo enigma.

## Quién aprobó qué

Cada aprobación queda en el [historial de la clase](/ayuda/clases/el-historial-de-la-clase), con quién la hizo y con qué porcentaje. Cada estudiante también ve en su actividad quién le aprobó la entrega.$itakai$;

-- misiones/importar-una-mision-de-otra-clase: la copia llega sin requisitos del camino.
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

Tampoco trae **requisitos** del [mapa de misiones](/ayuda/misiones/el-mapa-de-misiones): los suyos eran misiones de la otra clase. Si quieres que pida alguna de esta, márcala en sus **Ajustes**, sección **Camino**.

Queda anotada en el [historial](/ayuda/clases/el-historial-de-la-clase) de las dos clases: en la de destino, que se importó; en la de origen, quién se llevó una copia.

## Qué clases salen

**Como destino**, solo las clases activas en las que puedes editar misiones. Si no tienes ninguna, los botones de importar y copiar no aparecen.

**Como origen**, cualquiera de tus clases o de las compartidas contigo, aunque en ella solo tengas acceso de lectura. Las archivadas no salen de entrada: marca **Mostrar también las clases archivadas** para traerte algo del curso pasado.

> **¿Todas las misiones de una clase?** Para empezar el curso siguiente es más rápido [duplicar la clase](/ayuda/clases/duplicar-una-clase-para-el-curso-siguiente). Importar es para traerte una misión concreta.$itakai$, "updated_at" = CURRENT_TIMESTAMP
FROM "help_categories" c
WHERE c."id" = a."category_id" AND c."slug" = $itakai$misiones$itakai$ AND a."locale" = 'es'
  AND a."slug" = $itakai$importar-una-mision-de-otra-clase$itakai$
  AND a."body" = $itakai$**Una misión que ya funciona no hay que escribirla dos veces.** Puedes copiarla de una de tus clases a otra con sus enigmas, sus pistas, sus documentos y, si quieres, su insignia. La original no cambia y la copia es independiente: lo que retoques en una no toca la otra.

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

> **¿Todas las misiones de una clase?** Para empezar el curso siguiente es más rápido [duplicar la clase](/ayuda/clases/duplicar-una-clase-para-el-curso-siguiente). Importar es para traerte una misión concreta.$itakai$;

-- misiones/pistas-en-las-misiones: tampoco se usan en una misión cerrada por el camino.
UPDATE "help_articles" a
SET "body" = $itakai$Cada misión puede tener **hasta 10 pistas**. Las escribes tú, decides su orden y lo que cuesta usar cada una. El alumnado ve cuántas hay y lo que cuestan, pero el texto de una pista solo le aparece cuando la usa.

## Añadir y ordenar

1. Abre la misión y, en **Resumen**, ve a la sección **Pistas**.
2. Pulsa **Añadir**, escribe el texto y elige **cómo se paga** y cuánto.
3. Pulsa **Añadir la pista**.

El orden de la lista es el orden en que se usan: **solo se puede usar la siguiente**, así que conviene ir de lo general a lo concreto. Para cambiarlo, arrastra cada fila por su asa o, con el teclado, ponte en el asa y usa las flechas arriba y abajo.

Las pistas son de la misión entera: si una habla de un enigma concreto, dilo en su texto.

## Lo que cuesta

- **Monedas**: se pagan al usarla. Sin monedas suficientes no se puede usar.
- **XP**: igual que las monedas. Puede bajar de nivel a quien la paga, pero no le quita ninguna insignia.
- **% de la recompensa**: no se paga en el momento. Resta ese porcentaje de **lo que la misión aún tiene que pagar a esa persona**: los enigmas que le quedan por aprobar, también los que están pendientes de revisión, y el bonus por completarla. Lo que ya ha cobrado no cambia. Varias pistas de % se suman, hasta el 100 %.

El % se multiplica con el porcentaje con el que revisas la entrega: un enigma aprobado al 80 % con un −20 % de pistas paga el 64 %. Al [revisar las entregas](/ayuda/misiones/revisar-entregas), bajo el nombre de cada estudiante ves lo que restan sus pistas, y **Recibirá** ya lo lleva descontado.

Las cantidades que se proponen son sugerencias: puedes poner cualquier número entero. Junto a **Guardar** (o **Añadir la pista**, si es nueva) se lee qué pagará quien la use.

Solo se ofrecen los recursos que usa la clase. Si apagas las monedas o la experiencia en *Ajustes*, las pistas que se pagaban con ellas **salen gratis**, y la sección te lo avisa.

## Cuándo se pueden usar

Mientras la misión está en curso: ni completada ni caducada. Una misión bloqueada no la ve el alumnado, y con ella tampoco sus pistas. Tampoco se usan en una misión que alguien aún tiene cerrada por el camino del [mapa de misiones](/ayuda/misiones/el-mapa-de-misiones). En una misión por equipos, cada estudiante usa y paga las suyas.

Desde la vista previa ves todas las pistas abiertas, pero no se usan: para probar el cobro hace falta una cuenta de estudiante.

## Cambiar o borrar una pista

El texto se puede corregir siempre. Si cambias el coste, el nuevo vale para quien la use a partir de ese momento: lo que ya se pagó no cambia. **Una pista que alguien ha usado no se puede borrar**, porque la ha pagado. Las que nadie ha usado se borran desde su editor, con **Eliminar la pista**, y se borran al momento.

Junto a cada pista ves cuántos estudiantes la han usado, y cada uso sale en la actividad de quien la usó. Los cambios en las pistas quedan en el [historial de la clase](/ayuda/clases/el-historial-de-la-clase).

## Al copiar la misión

Las pistas viajan con la misión al [importarla en otra clase](/ayuda/misiones/importar-una-mision-de-otra-clase), al duplicar la clase y al importar una plantilla, con su orden y su coste. Quién las usó, no. Adaptar una misión con IA no cambia sus pistas: revísalas después.$itakai$, "updated_at" = CURRENT_TIMESTAMP
FROM "help_categories" c
WHERE c."id" = a."category_id" AND c."slug" = $itakai$misiones$itakai$ AND a."locale" = 'es'
  AND a."slug" = $itakai$pistas-en-las-misiones$itakai$
  AND a."body" = $itakai$Cada misión puede tener **hasta 10 pistas**. Las escribes tú, decides su orden y lo que cuesta usar cada una. El alumnado ve cuántas hay y lo que cuestan, pero el texto de una pista solo le aparece cuando la usa.

## Añadir y ordenar

1. Abre la misión y, en **Resumen**, ve a la sección **Pistas**.
2. Pulsa **Añadir**, escribe el texto y elige **cómo se paga** y cuánto.
3. Pulsa **Añadir la pista**.

El orden de la lista es el orden en que se usan: **solo se puede usar la siguiente**, así que conviene ir de lo general a lo concreto. Para cambiarlo, arrastra cada fila por su asa o, con el teclado, ponte en el asa y usa las flechas arriba y abajo.

Las pistas son de la misión entera: si una habla de un enigma concreto, dilo en su texto.

## Lo que cuesta

- **Monedas**: se pagan al usarla. Sin monedas suficientes no se puede usar.
- **XP**: igual que las monedas. Puede bajar de nivel a quien la paga, pero no le quita ninguna insignia.
- **% de la recompensa**: no se paga en el momento. Resta ese porcentaje de **lo que la misión aún tiene que pagar a esa persona**: los enigmas que le quedan por aprobar, también los que están pendientes de revisión, y el bonus por completarla. Lo que ya ha cobrado no cambia. Varias pistas de % se suman, hasta el 100 %.

El % se multiplica con el porcentaje con el que revisas la entrega: un enigma aprobado al 80 % con un −20 % de pistas paga el 64 %. Al [revisar las entregas](/ayuda/misiones/revisar-entregas), bajo el nombre de cada estudiante ves lo que restan sus pistas, y **Recibirá** ya lo lleva descontado.

Las cantidades que se proponen son sugerencias: puedes poner cualquier número entero. Junto a **Guardar** (o **Añadir la pista**, si es nueva) se lee qué pagará quien la use.

Solo se ofrecen los recursos que usa la clase. Si apagas las monedas o la experiencia en *Ajustes*, las pistas que se pagaban con ellas **salen gratis**, y la sección te lo avisa.

## Cuándo se pueden usar

Mientras la misión está en curso: ni completada ni caducada. Una misión bloqueada no la ve el alumnado, y con ella tampoco sus pistas. En una misión por equipos, cada estudiante usa y paga las suyas.

Desde la vista previa ves todas las pistas abiertas, pero no se usan: para probar el cobro hace falta una cuenta de estudiante.

## Cambiar o borrar una pista

El texto se puede corregir siempre. Si cambias el coste, el nuevo vale para quien la use a partir de ese momento: lo que ya se pagó no cambia. **Una pista que alguien ha usado no se puede borrar**, porque la ha pagado. Las que nadie ha usado se borran desde su editor, con **Eliminar la pista**, y se borran al momento.

Junto a cada pista ves cuántos estudiantes la han usado, y cada uso sale en la actividad de quien la usó. Los cambios en las pistas quedan en el [historial de la clase](/ayuda/clases/el-historial-de-la-clase).

## Al copiar la misión

Las pistas viajan con la misión al [importarla en otra clase](/ayuda/misiones/importar-una-mision-de-otra-clase), al duplicar la clase y al importar una plantilla, con su orden y su coste. Quién las usó, no. Adaptar una misión con IA no cambia sus pistas: revísalas después.$itakai$;

-- clases/elegir-que-recursos-usa-tu-clase: con el mapa, una misión puede pedir otras; apagarlo no borra el camino.
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
| **Efectos visuales** | Animaciones como el confeti al subir de nivel o al salir alguien en la ruleta |
| **Sonidos** | Efectos de sonido al subir de nivel, completar misiones, girar la ruleta y otros momentos |
| **Mapa de misiones** | En pruebas y apagado de entrada: una vista más en *Misiones*, con el camino de la clase. Encendido, una misión puede pedir que se completen otras antes de abrirse. Ver [el mapa de misiones](/ayuda/misiones/el-mapa-de-misiones) |

Los rangos y los umbrales de experiencia no son un interruptor: se configuran en la sección **Niveles** de *Ajustes*. Las insignias se crean desde **Insignias**, en el menú lateral.

## Efectos, sonido y movimiento

Los efectos visuales y los sonidos son de la clase, pero cada persona puede bajarlos en su dispositivo: la [ruleta](/ayuda/gamificacion/usar-la-ruleta-en-clase) tiene un botón **Sonido** que silencia la app en ese dispositivo, y quien activa **Menos animación** en la accesibilidad, o tiene su dispositivo configurado para reducir el movimiento, no ve confeti ni animaciones.

## Apagar un recurso no borra nada

Si desactivas las monedas, dejan de verse y **dejan de repartirse al revisar entregas**, aunque los enigmas tengan monedas configuradas. Los saldos que ya tuviera tu alumnado se quedan guardados: al volver a activarlas, aparecen otra vez tal cual estaban. Con el mapa de misiones pasa lo mismo: apagado, lo que pide cada misión se queda guardado, pero no cierra nada.

## Dependencias

Algunos ajustes necesitan otro para tener sentido —la tienda sin monedas no vende nada— y la propia pantalla te lo dice cuando ocurre. Y **al menos un recurso tiene que estar activo**: una clase sin ninguno no podría repartir nada al revisar una entrega.

> Empieza corto. Una clase con experiencia y misiones ya funciona el primer día; monedas, tienda y poderes se añaden cuando el grupo ya está rodado.$itakai$, "updated_at" = CURRENT_TIMESTAMP
FROM "help_categories" c
WHERE c."id" = a."category_id" AND c."slug" = $itakai$clases$itakai$ AND a."locale" = 'es'
  AND a."slug" = $itakai$elegir-que-recursos-usa-tu-clase$itakai$
  AND a."body" = $itakai$En *Ajustes* de la clase, sección **Funcionalidades**, decides con qué juega tu grupo. Cada interruptor cambia lo que ve tu alumnado y lo que se reparte al revisar entregas. Cambiarlos pide acceso de administración en la clase.

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
| **Efectos visuales** | Animaciones como el confeti al subir de nivel o al salir alguien en la ruleta |
| **Sonidos** | Efectos de sonido al subir de nivel, completar misiones, girar la ruleta y otros momentos |
| **Mapa de misiones** | En pruebas y apagado de entrada: una vista más en *Misiones*, con el camino de la clase. Ver [el mapa de misiones](/ayuda/misiones/el-mapa-de-misiones) |

Los rangos y los umbrales de experiencia no son un interruptor: se configuran en la sección **Niveles** de *Ajustes*. Las insignias se crean desde **Insignias**, en el menú lateral.

## Efectos, sonido y movimiento

Los efectos visuales y los sonidos son de la clase, pero cada persona puede bajarlos en su dispositivo: la [ruleta](/ayuda/gamificacion/usar-la-ruleta-en-clase) tiene un botón **Sonido** que silencia la app en ese dispositivo, y quien activa **Menos animación** en la accesibilidad, o tiene su dispositivo configurado para reducir el movimiento, no ve confeti ni animaciones.

## Apagar un recurso no borra nada

Si desactivas las monedas, dejan de verse y **dejan de repartirse al revisar entregas**, aunque los enigmas tengan monedas configuradas. Los saldos que ya tuviera tu alumnado se quedan guardados: al volver a activarlas, aparecen otra vez tal cual estaban.

## Dependencias

Algunos ajustes necesitan otro para tener sentido —la tienda sin monedas no vende nada— y la propia pantalla te lo dice cuando ocurre. Y **al menos un recurso tiene que estar activo**: una clase sin ninguno no podría repartir nada al revisar una entrega.

> Empieza corto. Una clase con experiencia y misiones ya funciona el primer día; monedas, tienda y poderes se añaden cuando el grupo ya está rodado.$itakai$;

-- clases/duplicar-una-clase-para-el-curso-siguiente: las misiones llegan con su camino.
UPDATE "help_articles" a
SET "body" = $itakai$Cuando empieza un curso nuevo no hace falta rehacer el trabajo: en los **Ajustes** de la clase, sección **Gestión**, **Duplicar** crea una copia limpia y te deja elegir qué te llevas.

## Qué puedes elegir

- **Misiones**: las misiones, en el mismo [orden](/ayuda/misiones/el-orden-de-las-misiones), con todos sus enigmas, sus [pistas](/ayuda/misiones/pistas-en-las-misiones), sus recompensas y lo que pide cada una para abrirse en el [mapa de misiones](/ayuda/misiones/el-mapa-de-misiones).
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

Es tentador borrar al alumnado del año pasado y volver a usar la misma clase, pero pierdes el histórico de un curso que puede que quieras consultar. Duplicando te quedas con las dos cosas: la clase del año pasado archivada y tal cual estaba, y una copia nueva lista para empezar.$itakai$;

-- clases/crear-una-clase-desde-cero-o-desde-una-plantilla: las misiones llegan con su camino.
UPDATE "help_articles" a
SET "body" = $itakai$Además de crear una clase en blanco, puedes partir de una **plantilla**: una clase que alguien del profesorado ha publicado para que cualquiera la reutilice.

## Dónde están

En **Mis Clases**, el botón **Plantillas** abre el catálogo con todo lo publicado. Puedes buscar, filtrar por nivel, asignatura, idioma y provincia, y abrir una vista previa con **Previsualizar** antes de decidir. Las mismas plantillas están en el [catálogo público](/ayuda/clases/el-catalogo-publico-de-plantillas), que se abre sin cuenta y sirve para pasarle a alguien el enlace de una.

## Qué te traes al importar

Al importar una plantilla se crea una clase nueva con:

- La **narrativa** y la imagen de portada.
- Los **recursos activos** —qué usa esa clase y qué no— y sus niveles. También el [mapa de misiones](/ayuda/misiones/el-mapa-de-misiones), si lo tenía encendido, aunque la ficha no lo enseñe.
- La **tienda**: recompensas y poderes con sus precios.
- Los **comportamientos** configurados.

## Las misiones, si quieres

Si la plantilla tiene misiones, al importarla aparece la casilla para importar también sus misiones, con cuántas son, marcada de entrada. Por eso, en una plantilla con misiones, **Importar** abre primero la vista previa: en su pestaña **Misiones** ves cada una con su rareza, sus enigmas y sus recompensas, y decides si te las llevas.

Llegan con sus enigmas enteros, con sus [pistas](/ayuda/misiones/pistas-en-las-misiones), con lo que pide cada una para abrirse en el mapa de misiones y con el estado que tenían en la plantilla, activas o bloqueadas. No traen fecha límite, ni documentos, ni insignias: si los necesitas, se los añades tú.

> **Revisa las que lleguen activas.** Tu alumnado podrá entregarlas en cuanto entre en la clase. Si quieres repasarlas antes, bloquéalas hasta que estén a tu gusto.

Si desmarcas la casilla, la clase llega sin misiones y el contenido lo pones tú. Más adelante también puedes traerte una misión concreta de otra de tus clases: lo explica [importar una misión de otra clase](/ayuda/misiones/importar-una-mision-de-otra-clase).

## Qué no

Nunca viene la **guía de clase**, ni nada del alumnado ni del profesorado de la clase original: ni personas, ni progreso, ni saldos. Una plantilla es una clase vacía de gente.

## Después de importar

La clase importada es tuya —tienes su propiedad— y se edita como cualquier otra. Se llama como la plantilla, con «(copia)» detrás. Cambia lo que no encaje —precios, nombres, la propia narrativa, las misiones— antes de dar el código a tu alumnado.$itakai$, "updated_at" = CURRENT_TIMESTAMP
FROM "help_categories" c
WHERE c."id" = a."category_id" AND c."slug" = $itakai$clases$itakai$ AND a."locale" = 'es'
  AND a."slug" = $itakai$crear-una-clase-desde-cero-o-desde-una-plantilla$itakai$
  AND a."body" = $itakai$Además de crear una clase en blanco, puedes partir de una **plantilla**: una clase que alguien del profesorado ha publicado para que cualquiera la reutilice.

## Dónde están

En **Mis Clases**, el botón **Plantillas** abre el catálogo con todo lo publicado. Puedes buscar, filtrar por nivel, asignatura, idioma y provincia, y abrir una vista previa con **Previsualizar** antes de decidir. Las mismas plantillas están en el [catálogo público](/ayuda/clases/el-catalogo-publico-de-plantillas), que se abre sin cuenta y sirve para pasarle a alguien el enlace de una.

## Qué te traes al importar

Al importar una plantilla se crea una clase nueva con:

- La **narrativa** y la imagen de portada.
- Los **recursos activos** —qué usa esa clase y qué no— y sus niveles. También el [mapa de misiones](/ayuda/misiones/el-mapa-de-misiones), si lo tenía encendido, aunque la ficha no lo enseñe.
- La **tienda**: recompensas y poderes con sus precios.
- Los **comportamientos** configurados.

## Las misiones, si quieres

Si la plantilla tiene misiones, al importarla aparece la casilla para importar también sus misiones, con cuántas son, marcada de entrada. Por eso, en una plantilla con misiones, **Importar** abre primero la vista previa: en su pestaña **Misiones** ves cada una con su rareza, sus enigmas y sus recompensas, y decides si te las llevas.

Llegan con sus enigmas enteros, con sus [pistas](/ayuda/misiones/pistas-en-las-misiones) y con el estado que tenían en la plantilla, activas o bloqueadas. No traen fecha límite, ni documentos, ni insignias: si los necesitas, se los añades tú.

> **Revisa las que lleguen activas.** Tu alumnado podrá entregarlas en cuanto entre en la clase. Si quieres repasarlas antes, bloquéalas hasta que estén a tu gusto.

Si desmarcas la casilla, la clase llega sin misiones y el contenido lo pones tú. Más adelante también puedes traerte una misión concreta de otra de tus clases: lo explica [importar una misión de otra clase](/ayuda/misiones/importar-una-mision-de-otra-clase).

## Qué no

Nunca viene la **guía de clase**, ni nada del alumnado ni del profesorado de la clase original: ni personas, ni progreso, ni saldos. Una plantilla es una clase vacía de gente.

## Después de importar

La clase importada es tuya —tienes su propiedad— y se edita como cualquier otra. Se llama como la plantilla, con «(copia)» detrás. Cambia lo que no encaje —precios, nombres, la propia narrativa, las misiones— antes de dar el código a tu alumnado.$itakai$;

-- clases/publicar-tu-clase-como-plantilla: las misiones se llevan sus pistas y su camino.
UPDATE "help_articles" a
SET "body" = $itakai$Si has montado una clase que funciona, puedes publicarla como **plantilla** para que el resto del profesorado parta de ella. Se hace en los **Ajustes** de la clase, sección **Gestión**, con el interruptor **Publicar como plantilla**. Solo lo ve quien tiene la propiedad de la clase, y antes hay que guardar la asignatura, el nivel educativo y el idioma en **Datos generales**. La provincia es opcional, pero una plantilla sin provincia no sale cuando alguien filtra por provincia.


![El recorrido de una plantilla: publicas tu clase, aparece en el catálogo y alguien del profesorado se lleva una copia.](/app/ayuda/diagramas/flujo-plantillas.svg)
## Dónde se ve

Tu plantilla aparece en el [catálogo público de plantillas](/ayuda/clases/el-catalogo-publico-de-plantillas), que se abre **sin cuenta**: cualquiera puede ver su ficha y compartir su enlace. El profesorado de la plataforma la tiene también en **Mis Clases → Plantillas**.

Mientras está publicada, junto al interruptor tienes **Copiar enlace**: copia la dirección de su ficha para pasársela a quien quieras, tenga cuenta o no.

Su ficha enseña:

- el nombre, la portada, los datos de la clase y la **historia** entera;
- las **funcionalidades** que tiene encendidas;
- las **misiones**: de cada una, el título, la rareza, cuántos enigmas tiene y sus recompensas;
- la **tienda**: cada objeto con su precio, qué hace y si está oculto al alumnado;
- los **comportamientos**: si son positivos o negativos y sus efectos.

En el catálogo público no sale nada de quien la publica. Dentro de la plataforma, el profesorado sí ve tu nombre en la tarjeta de la plantilla.

## Recomendada

La administración de la plataforma puede marcar tu plantilla como **Recomendada**: sale de las primeras en los catálogos, con esa etiqueta. No hace falta pedirlo ni hacer nada, y queda anotado en el [historial](/ayuda/clases/el-historial-de-la-clase) de la clase.

## Qué se copia

Quien la importa se lleva el marco de la clase: la narrativa y la portada, los recursos activos y los niveles, la tienda y los comportamientos. Si tu plantilla tiene misiones, puede llevárselas también, con sus enigmas enteros, sus pistas, lo que pide cada una para abrirse en el [mapa de misiones](/ayuda/misiones/el-mapa-de-misiones) y el estado de cada una, activa o bloqueada. Llegan sin fecha límite, sin documentos y sin insignias: las fechas son de tu calendario, y los documentos y las insignias se quedan en tu clase.

La guía de clase no se copia nunca.

## Qué se queda fuera

**Todo lo que tenga que ver con personas.** No se comparte el alumnado, ni sus entregas, saldos o estadísticas, ni el resto del profesorado de la clase. Quien importe tu plantilla recibe una clase vacía.

## Antes de publicar

Lo que publicas lo puede leer cualquiera, así que merece la pena repasar tres cosas:

1. **La narrativa**, por si menciona a tu grupo concreto, a tu centro o a un curso específico.
2. **Las misiones y sus enigmas.** Los títulos se ven en abierto, y quien importe la plantilla se lleva los enunciados enteros: que no lleven nombres de estudiantes, datos de tu centro ni instrucciones que solo entienda tu grupo.
3. **Los nombres de la tienda y los comportamientos**, por si hay bromas internas que fuera de contexto no se entienden.

## Despublicar

Puedes retirar tu plantilla del catálogo cuando quieras, con el mismo interruptor. Una clase archivada también deja de estar en el catálogo, y una que envías a la papelera se retira. Quien abra después su enlace verá que ya no está disponible. Al retirarla pierde también la recomendación, si la tenía: si la vuelves a publicar, sale sin ella. Quien ya la haya importado se queda con su copia: importar crea una clase independiente, no un enlace a la tuya.

Si [pasas la propiedad](/ayuda/clases/traspasar-una-clase) de la clase, publicarla o retirarla pasa a ser cosa de quien la reciba.$itakai$, "updated_at" = CURRENT_TIMESTAMP
FROM "help_categories" c
WHERE c."id" = a."category_id" AND c."slug" = $itakai$clases$itakai$ AND a."locale" = 'es'
  AND a."slug" = $itakai$publicar-tu-clase-como-plantilla$itakai$
  AND a."body" = $itakai$Si has montado una clase que funciona, puedes publicarla como **plantilla** para que el resto del profesorado parta de ella. Se hace en los **Ajustes** de la clase, sección **Gestión**, con el interruptor **Publicar como plantilla**. Solo lo ve quien tiene la propiedad de la clase, y antes hay que guardar la asignatura, el nivel educativo y el idioma en **Datos generales**. La provincia es opcional, pero una plantilla sin provincia no sale cuando alguien filtra por provincia.


![El recorrido de una plantilla: publicas tu clase, aparece en el catálogo y alguien del profesorado se lleva una copia.](/app/ayuda/diagramas/flujo-plantillas.svg)
## Dónde se ve

Tu plantilla aparece en el [catálogo público de plantillas](/ayuda/clases/el-catalogo-publico-de-plantillas), que se abre **sin cuenta**: cualquiera puede ver su ficha y compartir su enlace. El profesorado de la plataforma la tiene también en **Mis Clases → Plantillas**.

Mientras está publicada, junto al interruptor tienes **Copiar enlace**: copia la dirección de su ficha para pasársela a quien quieras, tenga cuenta o no.

Su ficha enseña:

- el nombre, la portada, los datos de la clase y la **historia** entera;
- las **funcionalidades** que tiene encendidas;
- las **misiones**: de cada una, el título, la rareza, cuántos enigmas tiene y sus recompensas;
- la **tienda**: cada objeto con su precio, qué hace y si está oculto al alumnado;
- los **comportamientos**: si son positivos o negativos y sus efectos.

En el catálogo público no sale nada de quien la publica. Dentro de la plataforma, el profesorado sí ve tu nombre en la tarjeta de la plantilla.

## Recomendada

La administración de la plataforma puede marcar tu plantilla como **Recomendada**: sale de las primeras en los catálogos, con esa etiqueta. No hace falta pedirlo ni hacer nada, y queda anotado en el [historial](/ayuda/clases/el-historial-de-la-clase) de la clase.

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

Puedes retirar tu plantilla del catálogo cuando quieras, con el mismo interruptor. Una clase archivada también deja de estar en el catálogo, y una que envías a la papelera se retira. Quien abra después su enlace verá que ya no está disponible. Al retirarla pierde también la recomendación, si la tenía: si la vuelves a publicar, sale sin ella. Quien ya la haya importado se queda con su copia: importar crea una clase independiente, no un enlace a la tuya.

Si [pasas la propiedad](/ayuda/clases/traspasar-una-clase) de la clase, publicarla o retirarla pasa a ser cosa de quien la reciba.$itakai$;

-- clases/el-historial-de-la-clase: también los cambios en el camino del mapa.
UPDATE "help_articles" a
SET "body" = $itakai$La pestaña **Historial** de la clase cuenta qué ha hecho el profesorado en ella: quién, qué y cuándo. Es lo más útil cuando la clase es compartida y alguien pregunta quién cambió algo. La ve todo el profesorado de la clase, sea cual sea su nivel.

## Qué aparece

Todo lo relevante que hace el profesorado, con su autoría: cada línea lleva el nombre y el [avatar](/ayuda/tu-cuenta/tu-avatar-de-docente) de quien lo hizo.

- **Entregas**: cada aprobación, con quien entregó, el enigma y el porcentaje.
- **Comportamientos**: los que se aplican, a quién, y los que se crean, se editan o se borran. Lo aplicado a varios estudiantes de una vez sale en una sola línea, que se despliega para ver a quién.
- **Recompensas**: las recompensas libres, con su motivo y a quién.
- **Asistencia**: cada lista que se pasa, se corrige o se borra, con la fecha y cuántas personas vinieron y cuántas no.
- **Equipos**: las agrupaciones que se crean, se editan, se archivan o se borran, los cambios de equipo y cada premio a un equipo, con sus puntos y, si se repartió, a quién.
- **Misiones**, **Enigmas**, **Pistas** y **Documentos**: altas, cambios, borrados, bloqueos, cambios de recompensas, cambios de [orden](/ayuda/misiones/el-orden-de-las-misiones) y cambios en el camino del [mapa de misiones](/ayuda/misiones/el-mapa-de-misiones), y las misiones [importadas de otra clase](/ayuda/misiones/importar-una-mision-de-otra-clase) o copiadas en otra.
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

El alumnado no ve el historial, pero en su actividad ve quién le aprobó cada entrega y quién le aplicó cada comportamiento, con su avatar.$itakai$;

-- alumnado/la-vista-del-alumno: las misiones van en el orden de la clase, o en el mapa; y la vista previa no tiene cierres.
UPDATE "help_articles" a
SET "body" = $itakai$Conviene saber cómo se ve la plataforma desde el otro lado, porque muchas dudas de clase se resuelven sabiendo dónde está cada botón.


![Lo que ve el profesorado frente a lo que ve el alumnado en la misma clase.](/app/ayuda/diagramas/vista-roles.svg)
## Su inicio

Al entrar, cada estudiante ve sus clases, su progreso y lo que tiene pendiente. Si una misión está a punto de vencer, le aparece destacada.

## Dentro de una clase

Cada clase tiene sus pestañas:

- **Resumen**: su nivel, sus números y su actividad en esa clase, y el profesorado que la imparte, con el avatar y el perfil de cada docente.
- **Historia** y **Guía**: la narrativa y las reglas que hayas escrito.
- **Misiones**: en el [orden de la clase](/ayuda/misiones/el-orden-de-las-misiones), con su rareza, su fecha y cuánto lleva completado de cada una. Si la clase tiene encendido el [mapa de misiones](/ayuda/misiones/el-mapa-de-misiones), las ve de entrada en el mapa, con candado las que aún no se le han abierto.
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

Con **Ver como estudiante**, debajo de tu nombre en el menú de la izquierda (en pantallas anchas), entras en la plataforma con una cuenta de estudiante de prueba, dentro de todas tus clases, para revisarlas desde dentro. Esa matrícula de prueba no cuenta en los listados, ni en el recuento del alumnado, ni en la clasificación. Con ella lo ves todo abierto: el camino del mapa solo cierra misiones a las cuentas de estudiante.$itakai$, "updated_at" = CURRENT_TIMESTAMP
FROM "help_categories" c
WHERE c."id" = a."category_id" AND c."slug" = $itakai$alumnado$itakai$ AND a."locale" = 'es'
  AND a."slug" = $itakai$la-vista-del-alumno$itakai$
  AND a."body" = $itakai$Conviene saber cómo se ve la plataforma desde el otro lado, porque muchas dudas de clase se resuelven sabiendo dónde está cada botón.


![Lo que ve el profesorado frente a lo que ve el alumnado en la misma clase.](/app/ayuda/diagramas/vista-roles.svg)
## Su inicio

Al entrar, cada estudiante ve sus clases, su progreso y lo que tiene pendiente. Si una misión está a punto de vencer, le aparece destacada.

## Dentro de una clase

Cada clase tiene sus pestañas:

- **Resumen**: su nivel, sus números y su actividad en esa clase, y el profesorado que la imparte, con el avatar y el perfil de cada docente.
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

Con **Ver como estudiante**, debajo de tu nombre en el menú de la izquierda (en pantallas anchas), entras en la plataforma con una cuenta de estudiante de prueba, dentro de todas tus clases, para revisarlas desde dentro. Esa matrícula de prueba no cuenta en los listados, ni en el recuento del alumnado, ni en la clasificación.$itakai$;

-- si-eres-alumno/como-entrego-una-mision: los enigmas opcionales y qué hacer con una misión con candado.
UPDATE "help_articles" a
SET "body" = $itakai$Una misión es un trabajo con premio. Cuando la abres ves de qué va, qué tienes que hacer y qué te llevas si la completas.

## Los enigmas son los pasos

Las misiones están partidas en enigmas: los pasos que hay que ir haciendo. Los ves en orden y cada uno tiene su propia recompensa, así que aunque no termines la misión entera, lo que hayas hecho cuenta. Los que pone **Opcional** no hacen falta para completarla, pero también dan su recompensa.

Si te atascas, puede que la misión tenga [pistas](/ayuda/si-eres-alumno/usar-las-pistas-de-una-mision): se abren en orden y cada una tiene su coste.

Si una misión sale con candado, aún no puedes entrar: o se abre al completar otra, o la ha cerrado tu docente por ahora. Te lo explica [el mapa de misiones y las misiones cerradas](/ayuda/si-eres-alumno/el-mapa-y-las-misiones-cerradas).

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

Si te atascas, puede que la misión tenga [pistas](/ayuda/si-eres-alumno/usar-las-pistas-de-una-mision): se abren en orden y cada una tiene su coste.

## La entrega

Cada enigma que puedes entregar tiene su botón **Entregar**. Al pulsarlo se abre la ventana **Entregar Enigma**: arrastra tu archivo o haz clic para elegirlo, y pulsa **Entregar**.

Se entrega **un archivo comprimido ZIP, RAR o 7Z, de 50 MB como máximo**. Si tienes que mandar varias cosas —un documento, unas fotos, un audio—, mételas todas en el mismo archivo comprimido.

Cuando le das a entregar, la entrega pasa a tu docente y, mientras no la revise, no puedes mandar otra de ese enigma. Repásala antes.

## Después de entregar

Tu docente la revisa y le pone un porcentaje: cuánto has completado. Las recompensas se reparten según ese porcentaje, así que una entrega a medias también da algo. Cuando la revise, te llega un aviso en **Avisos** con el porcentaje.

## La fecha

Si la misión tiene fecha de entrega, te llega un aviso cuando falten menos de 24 horas, salvo que hayas apagado los recordatorios en tu perfil. Cuando la fecha pasa, la misión ya no admite entregas: no dejes el último enigma para el último momento.$itakai$;
