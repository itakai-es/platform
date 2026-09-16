-- Correcciones del contenido de serie del centro de ayuda: describía cosas que la
-- plataforma no hace (invitaciones y solicitudes, la campana, una sección de
-- entregas, abrir una entrega revisada...).
--
-- El panel de administración manda: cada UPDATE solo cambia una fila si ese campo
-- sigue exactamente con el texto de serie, así que lo que alguien haya editado se
-- queda como está. Siempre por slug de categoría y de artículo, nunca por id.

-- primeros-pasos/crear-tu-primera-clase: El botón se llama «Nueva Clase» y el código se ve con «Invitar».
UPDATE "help_articles" a
SET "body" = $itakai$Desde **Mis Clases**, el botón **Nueva Clase** abre un asistente que te va preguntando por partes. Ninguna decisión es definitiva: todo lo que eliges aquí se puede cambiar luego desde los ajustes de la clase.

## Lo que te va a preguntar

**Nombre y datos.** El nombre es lo que verán tus alumnos. Los datos —asignatura, nivel, idioma y provincia— sirven para que otros docentes encuentren tu clase si algún día la publicas como plantilla, y no afectan a nada más.

**La narrativa.** Es la historia que envuelve la asignatura. Puedes escribirla tú o pedirle a la inteligencia artificial que te la proponga a partir de una idea suelta. No es decoración: las misiones que escribas después se apoyan en ella.

**Los recursos.** Aquí decides con qué juega tu clase: experiencia, monedas, maná, puntos de vida, tienda, insignias y niveles. Empieza con poco. Una clase con experiencia y misiones ya funciona, y añadir monedas más adelante no cuesta nada.

**El horario.** Si quieres que la plataforma sepa cuándo tienes esa clase, puedes definir las sesiones. Es opcional.

## Cuando termina

La clase se crea con un **código** de seis caracteres. Ese código es lo que le das a tus alumnos para que se unan; lo tienes siempre a mano con el botón **Invitar**, en la cabecera de la clase.

> Si te has quedado a medias, no pasa nada: el asistente muestra al final una maqueta de cómo va a quedar la clase antes de crearla de verdad.

## Y ahora

Lo siguiente es [meter a tus alumnos](/ayuda/primeros-pasos/invitar-alumnos-a-una-clase) y [escribir la primera misión](/ayuda/misiones/crear-una-mision). Si prefieres no partir de cero, puedes [empezar desde una plantilla publicada por otro docente](/ayuda/clases/crear-una-clase-desde-cero-o-desde-una-plantilla).$itakai$, "updated_at" = CURRENT_TIMESTAMP
FROM "help_categories" c
WHERE c."id" = a."category_id" AND c."slug" = $itakai$primeros-pasos$itakai$ AND a."locale" = 'es'
  AND a."slug" = $itakai$crear-tu-primera-clase$itakai$
  AND a."body" = $itakai$Desde **Mis clases**, el botón *Crear clase* abre un asistente que te va preguntando por partes. Ninguna decisión es definitiva: todo lo que eliges aquí se puede cambiar luego desde los ajustes de la clase.

## Lo que te va a preguntar

**Nombre y datos.** El nombre es lo que verán tus alumnos. Los datos —asignatura, nivel, idioma y provincia— sirven para que otros docentes encuentren tu clase si algún día la publicas como plantilla, y no afectan a nada más.

**La narrativa.** Es la historia que envuelve la asignatura. Puedes escribirla tú o pedirle a la inteligencia artificial que te la proponga a partir de una idea suelta. No es decoración: las misiones que escribas después se apoyan en ella.

**Los recursos.** Aquí decides con qué juega tu clase: experiencia, monedas, maná, puntos de vida, tienda, insignias y niveles. Empieza con poco. Una clase con experiencia y misiones ya funciona, y añadir monedas más adelante no cuesta nada.

**El horario.** Si quieres que la plataforma sepa cuándo tienes esa clase, puedes definir las sesiones. Es opcional.

## Cuando termina

La clase se crea con un **código** de seis caracteres. Ese código es lo que le das a tus alumnos para que se unan; lo tienes siempre a mano en la cabecera de la clase.

> Si te has quedado a medias, no pasa nada: el asistente muestra al final una maqueta de cómo va a quedar la clase antes de crearla de verdad.

## Y ahora

Lo siguiente es [meter a tus alumnos](/ayuda/primeros-pasos/invitar-alumnos-a-una-clase) y [escribir la primera misión](/ayuda/misiones/crear-una-mision). Si prefieres no partir de cero, puedes [empezar desde una plantilla publicada por otro docente](/ayuda/clases/crear-una-clase-desde-cero-o-desde-una-plantilla).$itakai$;

-- primeros-pasos/invitar-alumnos-a-una-clase: Solo existe el código: ni invitaciones personales, ni solicitudes que aceptar.
UPDATE "help_articles" a
SET "summary" = $itakai$El código de la clase: dónde está, cómo compartirlo y qué pasa cuando un alumno lo usa.$itakai$, "updated_at" = CURRENT_TIMESTAMP
FROM "help_categories" c
WHERE c."id" = a."category_id" AND c."slug" = $itakai$primeros-pasos$itakai$ AND a."locale" = 'es'
  AND a."slug" = $itakai$invitar-alumnos-a-una-clase$itakai$
  AND a."summary" = $itakai$El código de clase, las invitaciones directas y qué hacer con las solicitudes que llegan.$itakai$;

UPDATE "help_articles" a
SET "body" = $itakai$Tus alumnos entran en la clase con su **código**, un código de seis caracteres que la plataforma crea junto con la clase. Tú lo compartes, ellos lo escriben y ya están dentro: nadie tiene que aceptar nada.

## Dónde está el código

Entra en la clase y pulsa **Invitar**, en la cabecera (en pantallas estrechas solo se ve su icono, una persona con un signo más). Se abre la ventana **Invitar Alumnos** con el código en grande y el botón **Copiar Código**, para pegarlo donde quieras: el aula virtual, un correo al grupo o un mensaje. Proyectarlo en la pizarra funciona igual de bien.

También lo tienes a la vista al terminar de crear la clase.

## Qué hace el alumno

Con su cuenta de alumno, entra en **Mis Clases**, pulsa **Unirse a clase**, escribe el código y confirma con **Unirse a la clase**. En el móvil tiene **Unirse a Clase** arriba del todo, al abrir el menú. Da igual si lo escribe en mayúsculas o en minúsculas.

Entra directamente y la plataforma le lleva a la clase. Tú lo verás en la pestaña **Alumnos** de la clase la próxima vez que la abras.

Si el código no vale, el alumno ve el motivo en la misma ventana: **«Código de clase inválido»** cuando está mal copiado o no es de ninguna clase, y **«Esta clase está archivada y no admite nuevos alumnos»** cuando es el de una clase archivada.

## Un código por clase

El código es el único camino para entrar: no se puede buscar a un alumno ni añadirlo a mano. Por eso conviene darlo solo a tu grupo. Si tienes varios grupos, cada clase tiene su propio código, y una clase duplicada estrena el suyo: asegúrate de repartir el que toca.

> **Ojo con las clases archivadas.** Una clase archivada no admite alumnos nuevos: el botón **Invitar** aparece desactivado y quien intente unirse con su código recibe el aviso de arriba. Si vas a reutilizar una clase del curso pasado, mejor [duplicarla](/ayuda/clases/duplicar-una-clase-para-el-curso-siguiente) que desarchivarla.$itakai$, "updated_at" = CURRENT_TIMESTAMP
FROM "help_categories" c
WHERE c."id" = a."category_id" AND c."slug" = $itakai$primeros-pasos$itakai$ AND a."locale" = 'es'
  AND a."slug" = $itakai$invitar-alumnos-a-una-clase$itakai$
  AND a."body" = $itakai$Hay dos caminos para que un alumno acabe dentro de tu clase, y conviene conocer los dos porque sirven para situaciones distintas.

## Con el código de clase

Es el camino normal. En la cabecera de tu clase tienes un **código de seis caracteres**. Se lo das a tus alumnos —proyectado en la pizarra funciona igual de bien— y ellos lo introducen desde *Mis clases → Unirme a una clase*.

Según cómo esté configurada la clase, el alumno entra directamente o genera una **solicitud** que tú tienes que aceptar. Las solicitudes pendientes te aparecen en la pestaña de alumnos de la clase, con el nombre de quien la ha pedido.

## Invitando directamente

Si el alumno ya tiene cuenta en la plataforma, puedes buscarlo por nombre desde *Invitar alumnos* y mandarle una invitación. Le llega un aviso —y un correo, si lo tiene activado— y la invitación caduca a los siete días.

## Aceptar o rechazar solicitudes

Desde la pestaña de alumnos verás las solicitudes pendientes. Al aceptar, el alumno entra en la clase y recibe el aviso al momento. Al rechazar puedes escribir un motivo; ese texto le llega tal cual, así que merece la pena ser concreto.

> **Ojo con las clases archivadas.** Una clase archivada no admite invitaciones nuevas. Si vas a reutilizar una clase del curso pasado, mejor [duplicarla](/ayuda/clases/duplicar-una-clase-para-el-curso-siguiente) que desarchivarla.$itakai$;

-- misiones/enigmas-los-pasos-de-una-mision: La entrega es siempre un ZIP, RAR o 7Z de hasta 50 MB.
UPDATE "help_articles" a
SET "body" = $itakai$El enigma es la unidad real de trabajo. La misión da el marco; el enigma es lo que el alumno hace, entrega y ve puntuado.


![Las partes de una misión señaladas sobre su ficha: portada, rareza, fecha de entrega y los enigmas.](/app/ayuda/diagramas/anatomia-mision.svg)
## Cómo se componen

Cada enigma tiene un **título**, un **enunciado** y sus propias **recompensas**. Se ordenan dentro de la misión, y ese orden es el que ve el alumnado.

Un enigma puede ser cualquier cosa que acabe en una entrega: resolver un problema, grabar un audio, subir una foto de una maqueta, entregar un documento. El alumno lo entrega siempre en **un archivo comprimido ZIP, RAR o 7Z de hasta 50 MB**, así que dentro cabe lo que haga falta: uno o varios archivos, del formato que sea.

## Qué hace el alumno

Abre la misión, elige un enigma y sube su archivo. La entrega queda **pendiente de revisión** y él ve que está en tu tejado. Mientras tenga una entrega pendiente de ese enigma no puede subir otra, para que no se te acumulen tres versiones de lo mismo.

## Cuántos poner

No hay número mágico, pero conviene que cada enigma sea entregable en una sesión o dos. Una misión de dos enigmas gordos se atasca; una de ocho pequeños da sensación de avance continuo.

## Lo que pasa al completar el último

Cuando apruebas el enigma que faltaba, la misión se marca como completada y el alumno se lleva el bonus de rareza y la insignia asociada, si la misión tiene una. Eso ocurre una sola vez, en esa revisión.$itakai$, "updated_at" = CURRENT_TIMESTAMP
FROM "help_categories" c
WHERE c."id" = a."category_id" AND c."slug" = $itakai$misiones$itakai$ AND a."locale" = 'es'
  AND a."slug" = $itakai$enigmas-los-pasos-de-una-mision$itakai$
  AND a."body" = $itakai$El enigma es la unidad real de trabajo. La misión da el marco; el enigma es lo que el alumno hace, entrega y ve puntuado.


![Las partes de una misión señaladas sobre su ficha: portada, rareza, fecha de entrega y los enigmas.](/app/ayuda/diagramas/anatomia-mision.svg)
## Cómo se componen

Cada enigma tiene un **título**, un **enunciado** y sus propias **recompensas**. Se ordenan dentro de la misión, y ese orden es el que ve el alumnado.

Un enigma puede ser cualquier cosa que acabe en una entrega: resolver un problema, grabar un audio, subir una foto de una maqueta, entregar un documento. La plataforma no impone el formato del archivo.

## Qué hace el alumno

Abre la misión, elige un enigma y sube su archivo. La entrega queda **pendiente de revisión** y él ve que está en tu tejado. Mientras tenga una entrega pendiente de ese enigma no puede subir otra, para que no se te acumulen tres versiones de lo mismo.

## Cuántos poner

No hay número mágico, pero conviene que cada enigma sea entregable en una sesión o dos. Una misión de dos enigmas gordos se atasca; una de ocho pequeños da sensación de avance continuo.

## Lo que pasa al completar el último

Cuando apruebas el enigma que faltaba, la misión se marca como completada y el alumno se lleva el bonus de rareza y la insignia asociada, si la misión tiene una. Eso ocurre una sola vez, en esa revisión.$itakai$;

-- misiones/revisar-entregas: No hay sección «Entregas»: se revisa en la misión, con «Ver entregas (N)».
UPDATE "help_articles" a
SET "body" = $itakai$Cuando un alumno sube su archivo a un enigma, la entrega queda **pendiente** hasta que la revises. La revisión se hace en la propia misión: ahí decides con qué porcentaje se ha completado la tarea, y ese único número reparte todas las recompensas.


![Los tres estados de una entrega: pendiente, entregada y revisada. Los dos primeros los mueve el alumno; el último, el profesorado.](/app/ayuda/diagramas/estados-entrega.svg)
## Dónde están las entregas

Cada vez que un alumno entrega, te llega un aviso en **Avisos**, en el menú de la izquierda. Al pulsarlo vas directamente a la misión, con la ventana de entregas de ese enigma abierta.

También puedes llegar tú: en la clase, pestaña **Misiones**, abre la misión. Cada enigma tiene su botón **Ver entregas (N)**, donde N son las que quedan por revisar; en el móvil está en el menú **⋮** de cada enigma.

Y para saber si te queda algo pendiente, el **Resumen** de la clase muestra cuántas **Entregas por Revisar** hay.

## Cómo se revisa

La ventana de entregas lista las pendientes de ese enigma, con el alias del alumno y cuándo entregó.

1. Pulsa **Descargar** para bajar el archivo y revisarlo.
2. Pulsa **Valorar**.
3. Elige el porcentaje completado: **25%**, **50%**, **75%**, **100%** o el que escribas, de 1 a 100. Al lado, **Recibirá** te enseña lo que se llevará el alumno con ese porcentaje.
4. Pulsa **Aprobar**, que lleva el porcentaje elegido (por ejemplo, **Aprobar 75%**). La entrega sale de la lista y el alumno recibe el aviso al momento, y también por correo si lo tiene activado.

Si cambias de idea antes de aprobar, **Cancelar** cierra la valoración sin tocar nada.

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

Un enigma ya aprobado **no se puede volver a aprobar**: para ese alumno deja de tener el botón **Entregar**, y la plataforma nunca paga dos veces las recompensas del mismo enigma.$itakai$, "updated_at" = CURRENT_TIMESTAMP
FROM "help_categories" c
WHERE c."id" = a."category_id" AND c."slug" = $itakai$misiones$itakai$ AND a."locale" = 'es'
  AND a."slug" = $itakai$revisar-entregas$itakai$
  AND a."body" = $itakai$Cuando un alumno sube un archivo a un enigma, la entrega queda **pendiente** y te aparece en *Entregas*, dentro de la clase. Ahí decides con qué porcentaje se ha completado la tarea, y ese único número reparte todas las recompensas.


![Los tres estados de una entrega: pendiente, entregada y revisada. Los dos primeros los mueve el alumno; el último, el profesorado.](/app/ayuda/diagramas/estados-entrega.svg)
## Cómo se revisa

1. Entra en tu clase y abre **Entregas**. Verás las pendientes primero.
2. Abre la entrega para ver el archivo del alumno y el enunciado del enigma.
3. Elige el **porcentaje completado**, de 0 a 100.
4. Confirma. El alumno recibe el aviso al momento, y también por correo si lo tiene activado.

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

Un enigma ya aprobado **no se puede volver a aprobar**, ni siquiera desde una entrega nueva. Si un alumno sube otro archivo del mismo enigma, la plataforma no vuelve a pagar las recompensas. Es lo que evita que un enigma se cobre dos veces.$itakai$;

-- alumnado/la-vista-del-alumno: Las pestañas reales del alumno, el aviso sin recompensas y «Ver como alumno».
UPDATE "help_articles" a
SET "body" = $itakai$Conviene saber cómo se ve la plataforma desde el otro lado, porque muchas dudas de clase se resuelven sabiendo dónde está cada botón.


![Lo que ve el profesorado frente a lo que ve el alumnado en la misma clase.](/app/ayuda/diagramas/vista-roles.svg)
## Su inicio

Al entrar, el alumno ve sus clases, su progreso y lo que tiene pendiente. Si una misión está a punto de vencer, le aparece destacada.

## Dentro de una clase

Cada clase tiene sus pestañas:

- **Resumen**: su nivel, sus números y su actividad en esa clase.
- **Historia** y **Guía**: la narrativa y las reglas que hayas escrito.
- **Misiones**: las activas primero, con su rareza, su fecha y cuánto lleva completado de cada una.
- **Ranking**: dónde está respecto al resto del grupo, si la clase tiene la clasificación activada.
- **Tienda**: qué puede comprar con lo que tiene, si la clase la usa.
- **Avatar**: su alias y su avatar en esa clase.

Las insignias, las conseguidas y las que faltan, las tiene en **Insignias**, en su menú.

## Cómo entrega

Abre la misión, elige un enigma, sube su archivo y espera. Mientras tenga una entrega pendiente de ese enigma no puede subir otra. Cuando la revisas, le llega un aviso con el porcentaje que le has puesto.

## Su perfil

Cada alumno tiene su alias y su avatar **por clase**: puede llamarse de una forma en Matemáticas y de otra en Historia. Eso se explica en [avatares y alias](/ayuda/alumnado/avatares-y-alias-por-clase).

## Ver tu clase como la ven ellos

Con **Ver como alumno**, debajo de tu nombre en el menú de la izquierda (en pantallas anchas), entras en la plataforma como un alumno de prueba, dentro de todas tus clases, para revisarlas desde dentro. Esa matrícula de prueba no cuenta en los listados, ni en el recuento de alumnos, ni en la clasificación.$itakai$, "updated_at" = CURRENT_TIMESTAMP
FROM "help_categories" c
WHERE c."id" = a."category_id" AND c."slug" = $itakai$alumnado$itakai$ AND a."locale" = 'es'
  AND a."slug" = $itakai$la-vista-del-alumno$itakai$
  AND a."body" = $itakai$Conviene saber cómo se ve la plataforma desde el otro lado, porque muchas dudas de clase se resuelven sabiendo dónde está cada botón.


![Lo que ve el profesorado frente a lo que ve el alumnado en la misma clase.](/app/ayuda/diagramas/vista-roles.svg)
## Su inicio

Al entrar, el alumno ve sus clases, su progreso y lo que tiene pendiente. Si una misión está a punto de vencer, le aparece destacada.

## Dentro de una clase

- **Misiones**: las activas primero, con su rareza, su fecha y cuánto lleva completado de cada una.
- **Clasificación**: dónde está respecto al resto del grupo.
- **Tienda**: qué puede comprar con lo que tiene, si la clase la usa.
- **Insignias**: las conseguidas y las que faltan, con su descripción.
- **Guía**: la historia y las reglas que hayas escrito.

## Cómo entrega

Abre la misión, elige un enigma, sube su archivo y espera. Mientras tenga una entrega pendiente de ese enigma no puede subir otra. Cuando la revisas, le llega el aviso con el porcentaje y lo que ha ganado.

## Su perfil

Cada alumno tiene su alias y su avatar **por clase**: puede llamarse de una forma en Matemáticas y de otra en Historia. Eso se explica en [avatares y alias](/ayuda/alumnado/avatares-y-alias-por-clase).

## Ver tu clase como la ven ellos

Puedes matricularte en tu propia clase como alumno de prueba para revisarla desde dentro. Esa matrícula no cuenta en los listados, ni en el recuento de alumnos, ni en la clasificación.$itakai$;

-- alumnado/avatares-y-alias-por-clase: El alias sale al azar y el profesorado no puede editarlo.
UPDATE "help_articles" a
SET "body" = $itakai$En ITAKAI la identidad de un alumno **es por clase, no por cuenta**. La misma persona puede ser "Capitana Nemo" en tu clase de Ciencias y "Aristóteles" en la de Filosofía, con avatares distintos.

## Por qué

Porque la narrativa es de la clase. Un alias que encaja en una travesía por el Egeo no encaja en un laboratorio del futuro, y obligar a elegir uno para todo rompería las dos historias.

## El alias

Al unirse a la clase, cada alumno recibe un alias mitológico al azar, y puede cambiarlo cuando quiera en la pestaña **Avatar** de la clase. Es lo que se ve en la clasificación, en las entregas y en el historial.

## El avatar

Al unirse también recibe uno al azar. Para cambiarlo, en la misma pestaña **Avatar**, hay dos caminos:

1. **Elegir uno del catálogo**, con los personajes de la plataforma.
2. **Generarlo con inteligencia artificial**, describiendo con palabras cómo lo quiere. La descripción se convierte en una imagen a partir de la guía del personaje elegido.

## Moderación

Los alias y los avatares los ves en la pestaña **Alumnos** de la clase, junto al nombre real de cada uno, y en la ficha de cada alumno. Desde tu lado no se pueden editar: si algo no encaja, pide al alumno que lo cambie en su pestaña **Avatar**. Merece la pena dejar claras las reglas del juego el primer día, en la [guía de clase](/ayuda/clases/la-guia-de-clase).$itakai$, "updated_at" = CURRENT_TIMESTAMP
FROM "help_categories" c
WHERE c."id" = a."category_id" AND c."slug" = $itakai$alumnado$itakai$ AND a."locale" = 'es'
  AND a."slug" = $itakai$avatares-y-alias-por-clase$itakai$
  AND a."body" = $itakai$En ITAKAI la identidad de un alumno **es por clase, no por cuenta**. La misma persona puede ser "Capitana Nemo" en tu clase de Ciencias y "Aristóteles" en la de Filosofía, con avatares distintos.

## Por qué

Porque la narrativa es de la clase. Un alias que encaja en una travesía por el Egeo no encaja en un laboratorio del futuro, y obligar a elegir uno para todo rompería las dos historias.

## El alias

Lo elige el alumno al entrar en la clase y puede cambiarlo. Es lo que se ve en la clasificación, en las entregas y en el historial. Si no pone ninguno, se usa su nombre.

## El avatar

Hay dos caminos:

1. **Elegir uno del catálogo**, con los personajes de la plataforma.
2. **Generarlo con inteligencia artificial**, describiendo con palabras cómo lo quiere. La descripción se convierte en una imagen a partir de la guía del personaje elegido.

## Moderación

Los alias y los avatares generados los ves tú en la ficha de cada alumno. Si algo no encaja, puedes pedir el cambio o editarlo desde la propia ficha. Merece la pena dejar claras las reglas del juego el primer día, en la [guía de clase](/ayuda/clases/la-guia-de-clase).$itakai$;

-- tu-cuenta/avisos-y-recordatorios: Sin campana, solicitudes ni invitaciones: la sección «Avisos» y lo que avisa de verdad.
UPDATE "help_articles" a
SET "body" = $itakai$Los avisos aparecen **siempre dentro de la plataforma**, en **Avisos**, en el menú de la izquierda. Al lado verás cuántos tienes sin leer; en el móvil, ese número sale también sobre el botón que abre el menú.

En **Avisos** puedes ver todos o solo los que no has leído, marcarlos como leídos y eliminarlos. Si un aviso lleva a algún sitio, al pulsarlo vas directamente allí.

## Qué te avisa

Si eres **profesor**: cuando un alumno hace una entrega. El aviso te lleva directamente a la misión, con la ventana de entregas de ese enigma abierta para que la revises.

Si eres **alumno**:

- Cuando tu profesor ha revisado una entrega, con el porcentaje que te ha puesto.
- **Cuando faltan menos de 24 horas para el final de una misión** que todavía no has completado.
- Cuando consigues una de las insignias de la plataforma, las que se ganan por misiones completadas, experiencia o nivel. Este aviso solo sale en la plataforma, nunca por correo.

## Los dos interruptores del alumnado

En tu perfil, pestaña **Configuración**, tarjeta **Avisos**:

- **Avisos por correo.** Con él encendido, las entregas revisadas y los recordatorios te llegan también al correo. Si lo apagas, los sigues viendo en la plataforma.
- **Recordatorios de entrega.** Si lo apagas, dejas de recibir el aviso de las 24 horas, tanto en la plataforma como por correo. Las entregas revisadas te siguen llegando.

## El profesorado no recibe correos

Las entregas nuevas **no se mandan por correo al profesorado**, y es a propósito: treinta alumnos entregando la misma misión llenarían el buzón. Se ven en **Avisos** y, clase a clase, en el **Resumen**, que cuenta las entregas por revisar.

## En qué idioma llegan

En el idioma de tu cuenta, el que eliges en tu perfil. El aviso se escribe en tu idioma en el momento de crearse, así que si lo cambias después, los anteriores se quedan como estaban. La excepción, de momento, es el aviso de insignia nueva, que llega siempre en castellano.$itakai$, "updated_at" = CURRENT_TIMESTAMP
FROM "help_categories" c
WHERE c."id" = a."category_id" AND c."slug" = $itakai$tu-cuenta$itakai$ AND a."locale" = 'es'
  AND a."slug" = $itakai$avisos-y-recordatorios$itakai$
  AND a."body" = $itakai$Los avisos aparecen **siempre dentro de la plataforma**, en la campana y en la página de notificaciones. El correo es opcional y se controla desde tu perfil.

## Qué te avisa

Si eres **profesor**: cuando un alumno sube una entrega pendiente de revisar, cuando alguien pide unirse a tu clase y las confirmaciones de lo que haces.

Si eres **alumno**: cuando tu entrega ha sido revisada y con qué porcentaje, cuando te aceptan o rechazan una solicitud, cuando te invitan a una clase y **cuando faltan menos de 24 horas para el final de una misión**.

## Los dos interruptores

En tu perfil, pestaña Configuración:

- **Avisos por correo.** Si lo apagas, sigues viendo todo en la plataforma pero no recibes correos.
- **Recordatorios de entrega.** Apaga solo los avisos de fecha límite, dejando el resto.

## Lo que no llega por correo

Las entregas nuevas **no se mandan por correo al profesorado**, y es a propósito: treinta alumnos entregando la misma misión llenarían el buzón. Se ven agrupadas en la plataforma, que es donde se van a revisar de todas formas.

## En qué idioma llegan

En el que tengas puesta la interfaz. El aviso se compone en tu idioma en el momento de crearse, así que si lo cambias después, los anteriores se quedan como estaban.$itakai$;

-- si-eres-alumno/como-entro-en-mi-clase: Sin invitación por correo: el código y ya.
UPDATE "help_articles" a
SET "summary" = $itakai$Con el código que te da tu profesor: dónde se escribe y qué hacer si no funciona.$itakai$, "updated_at" = CURRENT_TIMESTAMP
FROM "help_categories" c
WHERE c."id" = a."category_id" AND c."slug" = $itakai$si-eres-alumno$itakai$ AND a."locale" = 'es'
  AND a."slug" = $itakai$como-entro-en-mi-clase$itakai$
  AND a."summary" = $itakai$Con la invitación del profesor o con el código de la clase.$itakai$;

UPDATE "help_articles" a
SET "body" = $itakai$Para entrar en una clase de ITAKAI solo necesitas su **código**, que te da tu profesor: seis caracteres que pueden incluir algún guion o guion bajo, así que cópialo tal cual. Con él entras directamente, sin esperar a que nadie te acepte.

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

La misma cuenta te vale para todas las clases y para todos los cursos. No hace falta crear una nueva cada año ni una por asignatura: tu progreso, tus insignias y tu avatar viajan contigo.$itakai$, "updated_at" = CURRENT_TIMESTAMP
FROM "help_categories" c
WHERE c."id" = a."category_id" AND c."slug" = $itakai$si-eres-alumno$itakai$ AND a."locale" = 'es'
  AND a."slug" = $itakai$como-entro-en-mi-clase$itakai$
  AND a."body" = $itakai$Para estar en una clase de ITAKAI hace falta que tu profesor te meta. Hay dos caminos y los dos acaban en el mismo sitio.

## Te llega una invitación

Tu profesor manda la invitación al correo que tiene tuyo. Ábrelo, pulsa el enlace y sigue los pasos. Si es la primera vez que entras en ITAKAI, ahí mismo creas tu cuenta; si ya tenías una, la clase se añade a las que ya tengas.

## Te dan un código

La otra forma es el código de la clase. Entras en ITAKAI con tu cuenta, vas a tus clases y pones el código que te haya dado tu profesor. Cópialo tal cual, sin espacios de más.

## Si no aparece la clase

Lo más común es que estés entrando con un correo distinto del que tiene tu profesor apuntado. Comprueba con qué cuenta has entrado y díselo si no coincide.

También puede ser que la clase esté archivada porque el curso ya ha terminado: entonces no la vas a ver aunque estuvieras dentro.

## Tu cuenta es tuya

La misma cuenta te vale para todas las clases y para todos los cursos. No hace falta crear una nueva cada año ni una por asignatura: tu progreso, tus insignias y tu avatar viajan contigo.$itakai$;

-- si-eres-alumno/como-entrego-una-mision: Un archivo comprimido, y tras la fecha no se entrega.
UPDATE "help_articles" a
SET "body" = $itakai$Una misión es un trabajo con premio. Cuando la abres ves de qué va, qué tienes que hacer y qué te llevas si la completas.

## Los enigmas son los pasos

Las misiones están partidas en enigmas: los pasos que hay que ir haciendo. Los ves en orden y cada uno tiene su propia recompensa, así que aunque no termines la misión entera, lo que hayas hecho cuenta.

## La entrega

Cada enigma que puedes entregar tiene su botón **Entregar**. Al pulsarlo se abre la ventana **Entregar Enigma**: arrastra tu archivo o haz clic para elegirlo, y pulsa **Entregar**.

Se entrega **un archivo comprimido ZIP, RAR o 7Z, de 50 MB como máximo**. Si tienes que mandar varias cosas —un documento, unas fotos, un audio—, mételas todas en el mismo archivo comprimido.

Cuando le das a entregar, la entrega pasa a tu profesor y, mientras no la revise, no puedes mandar otra de ese enigma. Repásala antes.

## Después de entregar

Tu profesor la revisa y le pone un porcentaje: cuánto has completado. Las recompensas se reparten según ese porcentaje, así que una entrega a medias también da algo. Cuando la revise, te llega un aviso en **Avisos** con el porcentaje.

## La fecha

Si la misión tiene fecha de entrega, te llega un aviso cuando falten menos de 24 horas, salvo que hayas apagado los recordatorios en tu perfil. Cuando la fecha pasa, la misión ya no admite entregas: no dejes el último enigma para el último momento.$itakai$, "updated_at" = CURRENT_TIMESTAMP
FROM "help_categories" c
WHERE c."id" = a."category_id" AND c."slug" = $itakai$si-eres-alumno$itakai$ AND a."locale" = 'es'
  AND a."slug" = $itakai$como-entrego-una-mision$itakai$
  AND a."body" = $itakai$Una misión es un trabajo con premio. Cuando la abres ves de qué va, qué tienes que hacer y qué te llevas si la completas.

## Los enigmas son los pasos

Casi todas las misiones están partidas en enigmas: los pasos que hay que ir haciendo. Los ves en orden y cada uno tiene su propia recompensa, así que aunque no termines la misión entera, lo que hayas hecho cuenta.

## La entrega

Según lo que haya pedido tu profesor, entregas escribiendo un texto, subiendo un archivo o pegando un enlace. Puedes mandar más de una cosa si te lo permite.

Cuando le das a entregar, la entrega pasa a tu profesor y ya no la puedes cambiar. Repásala antes.

## Después de entregar

Tu profesor la revisa y le pone un porcentaje: cuánto has completado. Las recompensas se reparten según ese porcentaje, así que una entrega a medias también da algo.

## La fecha

Si la misión tiene fecha de entrega, te llega un aviso antes de que se cumpla. Entregar tarde puede costarte puntos de vida, según lo que haya decidido tu profesor para la clase.$itakai$;

-- si-eres-alumno/he-perdido-un-punto-de-vida: Quedarse sin vidas no bloquea la tienda.
UPDATE "help_articles" a
SET "body" = $itakai$Los puntos de vida son la parte de la clase que mide cómo te comportas, no lo que entregas.

## Por qué se pierden

Los quita tu profesor cuando pasa algo que ha marcado como comportamiento negativo: no entregar a tiempo, interrumpir la clase, saltarse una norma del aula. Cada clase tiene su lista, y la decide quien da la clase, no la aplicación.

## Qué pasa si me quedo sin

Quedarte sin vidas **no significa suspender**. La nota no depende de esto, y la aplicación no te bloquea nada: puedes seguir entregando y usando la tienda. Lo que pase después lo decide tu profesor; mira la **Guía** de tu clase por si lo explica.

## Cómo se recuperan

Igual que se pierden: con comportamientos positivos. Ayudar a un compañero, participar, entregar antes de tiempo. Tu profesor las devuelve del mismo sitio de donde las quita. Y si tu clase tiene tienda, puede que haya algo en ella que te devuelva puntos de vida.

## Si crees que hay un error

Habla con tu profesor. Los puntos de vida los mueve una persona a mano, así que también se pueden deshacer a mano. En la aplicación no hay ningún automatismo que te quite vidas por su cuenta.$itakai$, "updated_at" = CURRENT_TIMESTAMP
FROM "help_categories" c
WHERE c."id" = a."category_id" AND c."slug" = $itakai$si-eres-alumno$itakai$ AND a."locale" = 'es'
  AND a."slug" = $itakai$he-perdido-un-punto-de-vida$itakai$
  AND a."body" = $itakai$Los puntos de vida son la parte de la clase que mide cómo te comportas, no lo que entregas.

## Por qué se pierden

Los quita tu profesor cuando pasa algo que ha marcado como comportamiento negativo: no entregar a tiempo, interrumpir la clase, saltarse una norma del aula. Cada clase tiene su lista, y la decide quien da la clase, no la aplicación.

## Qué pasa si me quedo sin

Quedarte sin vidas **no significa suspender**. La nota no depende de esto. Lo que suele pasar es que pierdes acceso a la tienda hasta que recuperes alguna, así que se te acaban los caprichos, no el curso.

## Cómo se recuperan

Igual que se pierden: con comportamientos positivos. Ayudar a un compañero, participar, entregar antes de tiempo. Tu profesor las devuelve del mismo sitio de donde las quita.

## Si crees que hay un error

Habla con tu profesor. Los puntos de vida los mueve una persona a mano, así que también se pueden deshacer a mano. En la aplicación no hay ningún automatismo que te quite vidas por su cuenta.$itakai$;

-- si-eres-alumno/mi-avatar-y-mi-nombre-en-clase: La pestaña Avatar tal cual es; el profesorado no toca el alias.
UPDATE "help_articles" a
SET "body" = $itakai$En cada clase tienes un avatar y un alias. Al unirte te ponen unos al azar, y puedes cambiarlos cuando quieras.

## Son por clase

Lo importante: **el avatar y el alias son de cada clase**, no de tu cuenta. Puedes ser una cosa en Historia y otra en Matemáticas. Al cambiarlos en una clase, las demás se quedan como estaban.

## Dónde se cambian

Dentro de la clase, en la pestaña **Avatar**. Cambia lo que quieras y pulsa **Guardar cambios**.

## El alias

Es el nombre con el que apareces en la clase: en el ranking, si tu clase lo tiene activado, y en las entregas que revisa tu profesor. Puede tener hasta 20 caracteres. Tu profesor también ve tu nombre real, que es el que necesita para las notas.

Ponte algo que puedas enseñar en clase.

## El avatar

Elige a tu guía entre los personajes de la lista. Si quieres uno a tu gusto, describe cómo lo quieres y pulsa **Genera avatar**: la inteligencia artificial lo crea a partir del personaje que hayas elegido. Cuanto más concreto seas con los colores, la ropa y el estilo, mejor.$itakai$, "updated_at" = CURRENT_TIMESTAMP
FROM "help_categories" c
WHERE c."id" = a."category_id" AND c."slug" = $itakai$si-eres-alumno$itakai$ AND a."locale" = 'es'
  AND a."slug" = $itakai$mi-avatar-y-mi-nombre-en-clase$itakai$
  AND a."body" = $itakai$En cada clase tienes un avatar y un alias. Son tuyos y puedes cambiarlos.

## Son por clase

Lo importante: **el avatar y el alias son de cada clase**, no de tu cuenta. Puedes ser una cosa en Historia y otra en Matemáticas. Al cambiarlos en una clase, las demás se quedan como estaban.

## El alias

Es el nombre con el que apareces ante el resto: en la clasificación, en las insignias, en el ranking si tu clase lo tiene activado. Tu profesor sigue viendo tu nombre real, que es el que necesita para las notas.

Ponte algo que puedas enseñar en clase. Tu profesor puede cambiarlo si no es apropiado.

## El avatar

Se elige de los que haya disponibles en tu clase. Algunos aparecen al subir de nivel o al conseguir ciertas insignias, así que la lista puede crecer según avanzas.

## Si no puedes cambiarlo

Hay clases donde el profesor deja el alias fijo para saber quién es quién. Si no te deja tocarlo, es eso: no es un fallo.$itakai$;

-- cuando-algo-falla/no-llega-el-correo-de-invitacion: No hay correo de invitación: el artículo pasa a «Mi alumno no aparece en la clase».
UPDATE "help_articles" a
SET "body" = $itakai$Un alumno asegura que ha usado el código y no lo ves en la pestaña **Alumnos** de la clase. Con el código se entra directamente, sin que nadie tenga que aceptar nada, así que casi siempre es una de estas cosas.

## La lista es de antes

La lista de alumnos se carga al abrir la pestaña. Si ya la tenías abierta cuando el alumno se unió, recarga la página.

## No llegó a unirse

Si el código no vale, el alumno ve el motivo en la ventana de **Unirse a clase** y no entra:

- **«Código de clase inválido»**: está mal copiado (la O y el cero, la I y el uno se confunden) o no es el de ninguna clase. Vuelve a dárselo con **Invitar → Copiar Código**.
- **«Esta clase está archivada y no admite nuevos alumnos»**: le has dado el código de una clase archivada. Dale el de la clase de este curso.

## Se unió a otra de tus clases

Si tienes varios grupos, o has duplicado la clase, cada una tiene su propio código y es fácil repartir el que no toca. En **Alumnos**, en el menú de la izquierda, están todos tus alumnos con su correo: búscalo y abre su ficha para ver en qué clases está.

## Entró con otra cuenta

Un alumno con dos cuentas —la del centro y una personal— puede haberse unido con la que no esperas. Búscalo en **Alumnos** por su nombre o por su correo. Si está con una cuenta que no es la que usa en clase, pídele que entre con la buena y vuelva a escribir el código.

## Está, pero no lo reconoces

En la lista de la clase cada alumno sale con el nombre de su cuenta y, debajo, con su alias de la clase, el que empieza por @. Al unirse le toca un alias mitológico al azar, así que no te fíes del alias: el buscador de la pestaña encuentra por nombre y por alias.$itakai$, "updated_at" = CURRENT_TIMESTAMP
FROM "help_categories" c
WHERE c."id" = a."category_id" AND c."slug" = $itakai$cuando-algo-falla$itakai$ AND a."locale" = 'es'
  AND a."slug" = $itakai$no-llega-el-correo-de-invitacion$itakai$
  AND a."body" = $itakai$Es lo que más se pregunta al empezar el curso. Casi siempre es una de estas tres cosas.

## Está en la carpeta de spam

El primer sitio donde mirar. Los correos automáticos de una plataforma nueva acaban ahí a menudo, sobre todo en cuentas de centro con filtros estrictos. Pídele al alumno que busque «ITAKAI» en todo el buzón, no solo en la bandeja de entrada.

## La dirección tiene una errata

Comprueba en tu lista de alumnos la dirección exacta. Un punto de más o un dominio del centro mal escrito y el correo no llega a ninguna parte.

## El centro bloquea el correo externo

Algunos centros solo dejan entrar correo de dominios de la comunidad. Si le pasa a varios alumnos a la vez y todos tienen cuenta del centro, es esto: habla con quien lleve la informática del centro.

## Mientras tanto

No hace falta esperar: pásale el **código de la clase** y que entre con él. Es el mismo resultado y no depende del correo.

Si tu instancia está recién montada y no ha salido ningún correo todavía, revisa la configuración de envío en el panel de administración antes de buscar culpables fuera.$itakai$;

-- Título, resumen y slug, solo si el cuerpo ya es el nuevo: sin él cambiarían de tema a medias.
UPDATE "help_articles" a
SET "title" = $itakai$Mi alumno no aparece en la clase$itakai$, "updated_at" = CURRENT_TIMESTAMP
FROM "help_categories" c
WHERE c."id" = a."category_id" AND c."slug" = $itakai$cuando-algo-falla$itakai$ AND a."locale" = 'es'
  AND a."slug" = $itakai$no-llega-el-correo-de-invitacion$itakai$
  AND a."title" = $itakai$No llega el correo de invitación$itakai$
  AND a."body" = $itakai$Un alumno asegura que ha usado el código y no lo ves en la pestaña **Alumnos** de la clase. Con el código se entra directamente, sin que nadie tenga que aceptar nada, así que casi siempre es una de estas cosas.

## La lista es de antes

La lista de alumnos se carga al abrir la pestaña. Si ya la tenías abierta cuando el alumno se unió, recarga la página.

## No llegó a unirse

Si el código no vale, el alumno ve el motivo en la ventana de **Unirse a clase** y no entra:

- **«Código de clase inválido»**: está mal copiado (la O y el cero, la I y el uno se confunden) o no es el de ninguna clase. Vuelve a dárselo con **Invitar → Copiar Código**.
- **«Esta clase está archivada y no admite nuevos alumnos»**: le has dado el código de una clase archivada. Dale el de la clase de este curso.

## Se unió a otra de tus clases

Si tienes varios grupos, o has duplicado la clase, cada una tiene su propio código y es fácil repartir el que no toca. En **Alumnos**, en el menú de la izquierda, están todos tus alumnos con su correo: búscalo y abre su ficha para ver en qué clases está.

## Entró con otra cuenta

Un alumno con dos cuentas —la del centro y una personal— puede haberse unido con la que no esperas. Búscalo en **Alumnos** por su nombre o por su correo. Si está con una cuenta que no es la que usa en clase, pídele que entre con la buena y vuelva a escribir el código.

## Está, pero no lo reconoces

En la lista de la clase cada alumno sale con el nombre de su cuenta y, debajo, con su alias de la clase, el que empieza por @. Al unirse le toca un alias mitológico al azar, así que no te fíes del alias: el buscador de la pestaña encuentra por nombre y por alias.$itakai$;

UPDATE "help_articles" a
SET "summary" = $itakai$Qué comprobar cuando un alumno dice que ha usado el código y no está en tu lista.$itakai$, "updated_at" = CURRENT_TIMESTAMP
FROM "help_categories" c
WHERE c."id" = a."category_id" AND c."slug" = $itakai$cuando-algo-falla$itakai$ AND a."locale" = 'es'
  AND a."slug" = $itakai$no-llega-el-correo-de-invitacion$itakai$
  AND a."summary" = $itakai$Los tres motivos habituales, por orden de probabilidad.$itakai$
  AND a."body" = $itakai$Un alumno asegura que ha usado el código y no lo ves en la pestaña **Alumnos** de la clase. Con el código se entra directamente, sin que nadie tenga que aceptar nada, así que casi siempre es una de estas cosas.

## La lista es de antes

La lista de alumnos se carga al abrir la pestaña. Si ya la tenías abierta cuando el alumno se unió, recarga la página.

## No llegó a unirse

Si el código no vale, el alumno ve el motivo en la ventana de **Unirse a clase** y no entra:

- **«Código de clase inválido»**: está mal copiado (la O y el cero, la I y el uno se confunden) o no es el de ninguna clase. Vuelve a dárselo con **Invitar → Copiar Código**.
- **«Esta clase está archivada y no admite nuevos alumnos»**: le has dado el código de una clase archivada. Dale el de la clase de este curso.

## Se unió a otra de tus clases

Si tienes varios grupos, o has duplicado la clase, cada una tiene su propio código y es fácil repartir el que no toca. En **Alumnos**, en el menú de la izquierda, están todos tus alumnos con su correo: búscalo y abre su ficha para ver en qué clases está.

## Entró con otra cuenta

Un alumno con dos cuentas —la del centro y una personal— puede haberse unido con la que no esperas. Búscalo en **Alumnos** por su nombre o por su correo. Si está con una cuenta que no es la que usa en clase, pídele que entre con la buena y vuelva a escribir el código.

## Está, pero no lo reconoces

En la lista de la clase cada alumno sale con el nombre de su cuenta y, debajo, con su alias de la clase, el que empieza por @. Al unirse le toca un alias mitológico al azar, así que no te fíes del alias: el buscador de la pestaña encuentra por nombre y por alias.$itakai$;

-- Nada enlaza el slug antiguo; el nuevo no puede chocar con otro de la categoría.
UPDATE "help_articles" a
SET "slug" = $itakai$mi-alumno-no-aparece-en-la-clase$itakai$, "updated_at" = CURRENT_TIMESTAMP
FROM "help_categories" c
WHERE c."id" = a."category_id" AND c."slug" = $itakai$cuando-algo-falla$itakai$ AND a."locale" = 'es'
  AND a."slug" = $itakai$no-llega-el-correo-de-invitacion$itakai$
  AND a."body" = $itakai$Un alumno asegura que ha usado el código y no lo ves en la pestaña **Alumnos** de la clase. Con el código se entra directamente, sin que nadie tenga que aceptar nada, así que casi siempre es una de estas cosas.

## La lista es de antes

La lista de alumnos se carga al abrir la pestaña. Si ya la tenías abierta cuando el alumno se unió, recarga la página.

## No llegó a unirse

Si el código no vale, el alumno ve el motivo en la ventana de **Unirse a clase** y no entra:

- **«Código de clase inválido»**: está mal copiado (la O y el cero, la I y el uno se confunden) o no es el de ninguna clase. Vuelve a dárselo con **Invitar → Copiar Código**.
- **«Esta clase está archivada y no admite nuevos alumnos»**: le has dado el código de una clase archivada. Dale el de la clase de este curso.

## Se unió a otra de tus clases

Si tienes varios grupos, o has duplicado la clase, cada una tiene su propio código y es fácil repartir el que no toca. En **Alumnos**, en el menú de la izquierda, están todos tus alumnos con su correo: búscalo y abre su ficha para ver en qué clases está.

## Entró con otra cuenta

Un alumno con dos cuentas —la del centro y una personal— puede haberse unido con la que no esperas. Búscalo en **Alumnos** por su nombre o por su correo. Si está con una cuenta que no es la que usa en clase, pídele que entre con la buena y vuelva a escribir el código.

## Está, pero no lo reconoces

En la lista de la clase cada alumno sale con el nombre de su cuenta y, debajo, con su alias de la clase, el que empieza por @. Al unirse le toca un alias mitológico al azar, así que no te fíes del alias: el buscador de la pestaña encuentra por nombre y por alias.$itakai$
  AND NOT EXISTS (
    SELECT 1 FROM "help_articles" x
    WHERE x."category_id" = a."category_id" AND x."locale" = a."locale" AND x."slug" = $itakai$mi-alumno-no-aparece-en-la-clase$itakai$
  );

-- cuando-algo-falla/un-alumno-no-ve-la-clase: Sin invitaciones pendientes.
UPDATE "help_articles" a
SET "body" = $itakai$El alumno entra, llega a su panel y la clase no está. Repasa esto en orden.

## ¿Con qué cuenta ha entrado?

Es el motivo número uno. Un alumno con dos cuentas —la del centro y una personal— entra con la que no es. Pídele que mire con qué correo ha iniciado sesión y compáralo con el que aparece en **Alumnos**, en tu menú.

## ¿Está en la clase de verdad?

Con el código se entra directamente, así que, si se unió, lo ves en la pestaña **Alumnos** de la clase. Si no está, no llegó a unirse: pregúntale qué mensaje le salió al escribir el código.

## ¿La clase está archivada?

Una clase archivada desaparece de la vista del alumnado. Si acabas de archivarla para ordenar el curso, es eso.

## ¿Es de otro grupo?

Si has duplicado la clase para varios grupos, es fácil darle a un alumno el código del grupo equivocado. Mira si aparece en otra de tus clases.

## Última comprobación

Si todo lo anterior está bien, que recargue la página o cierre sesión y vuelva a entrar. El panel se carga al entrar, y una sesión que lleva días abierta puede estar enseñando una lista vieja.$itakai$, "updated_at" = CURRENT_TIMESTAMP
FROM "help_categories" c
WHERE c."id" = a."category_id" AND c."slug" = $itakai$cuando-algo-falla$itakai$ AND a."locale" = 'es'
  AND a."slug" = $itakai$un-alumno-no-ve-la-clase$itakai$
  AND a."body" = $itakai$El alumno entra, llega a su panel y la clase no está. Repasa esto en orden.

## ¿Con qué cuenta ha entrado?

Es el motivo número uno. Un alumno con dos cuentas —la del centro y una personal— entra con la que no es. Pídele que mire con qué correo ha iniciado sesión y compáralo con el que aparece en tu lista.

## ¿Está matriculado de verdad?

Que le hayas mandado la invitación no significa que la haya aceptado. En tu lista de alumnos se ve quién ha entrado y quién sigue pendiente.

## ¿La clase está archivada?

Una clase archivada desaparece de la vista del alumnado. Si acabas de archivarla para ordenar el curso, es eso.

## ¿Es de otro grupo?

Si has duplicado la clase para varios grupos, es fácil invitar a un alumno al grupo equivocado. Mira si aparece en otra de tus clases.

## Última comprobación

Si todo lo anterior está bien, que cierre sesión y vuelva a entrar. El panel se carga al entrar, y una sesión que lleva días abierta puede estar enseñando una lista vieja.$itakai$;

-- cuando-algo-falla/no-puedo-subir-un-archivo: Los formatos y límites reales de cada subida.
UPDATE "help_articles" a
SET "body" = $itakai$Las subidas fallan casi siempre por el tamaño o por el formato.

## Las entregas

Una entrega es **un solo archivo ZIP, RAR o 7Z de 50 MB como máximo**. Si intentas subir otra cosa —un PDF suelto, una foto, un vídeo—, la ventana te lo dice y no te deja entregar: mételo en un archivo comprimido.

Si ni comprimido baja de 50 MB, suele ser un vídeo grabado con el móvil o una presentación con muchas imágenes. Exportar un documento a PDF suele dejarlo en una fracción de lo que ocupaba; con un vídeo, pregunta a tu profesor cómo prefiere recibirlo.

## Lo que sube el profesorado

Los materiales de una misión admiten hasta 50 MB por archivo. Las imágenes de las insignias tienen que ser PNG, JPG, SVG o WebP, de 2 MB como máximo.

## Dónde acaban los archivos

Cada instancia guarda los archivos donde tenga configurado en el panel de administración: en el disco del propio servidor o en un bucket externo. Si **ninguna** subida funciona y acabáis de cambiar esa configuración, ahí está el problema, y se ve en la propia pantalla de almacenamiento.

## Si falla solo a un alumno

Que pruebe desde otro navegador o desde otro dispositivo. Una extensión del navegador que bloquea peticiones puede cortar la subida sin decir nada.$itakai$, "updated_at" = CURRENT_TIMESTAMP
FROM "help_categories" c
WHERE c."id" = a."category_id" AND c."slug" = $itakai$cuando-algo-falla$itakai$ AND a."locale" = 'es'
  AND a."slug" = $itakai$no-puedo-subir-un-archivo$itakai$
  AND a."body" = $itakai$Las subidas fallan casi siempre por el tamaño o por el formato.

## El tamaño

Hay un tope por archivo. Un vídeo grabado con el móvil se lo salta con facilidad, y las presentaciones con muchas imágenes también.

Si es un vídeo, súbelo a donde lo tengáis en el centro y entrega el enlace. Si es un documento, exportarlo a PDF suele dejarlo en una fracción de lo que ocupaba.

## El formato

Para imágenes se admiten los formatos habituales: JPG, PNG, WEBP. Un archivo con la extensión cambiada a mano no cuela: lo que se comprueba es el contenido, no el nombre.

## Dónde acaban los archivos

Cada instancia guarda los archivos donde tenga configurado en el panel de administración: en el disco del propio servidor o en un bucket externo. Si **ninguna** subida funciona y acabáis de cambiar esa configuración, ahí está el problema, y se ve en la propia pantalla de almacenamiento.

## Si falla solo a un alumno

Que pruebe desde otro navegador o desde otro dispositivo. Una extensión del navegador que bloquea peticiones puede cortar la subida sin decir nada.$itakai$;

-- cuando-algo-falla/he-borrado-algo-sin-querer: Clases y misiones no se eliminan; lo que sí, no se recupera.
UPDATE "help_articles" a
SET "body" = $itakai$Antes de nada: no vuelvas a crearlo a toda prisa. Mira primero si de verdad se ha ido.

## Archivar no es borrar

Las clases no se borran: se archivan. Una clase archivada sigue entera y se puede recuperar. No aparece entre tus clases activas, pero está en **Mis Clases**, en **Archivadas**, y desde su tarjeta se desarchiva.

Las misiones tampoco se pueden eliminar.

## Lo que sí desaparece

Lo que eliminas —un enigma, un material de una misión, un artículo de la tienda, un comportamiento, una insignia o, en administración, una categoría de la ayuda con sus artículos— no se puede recuperar desde la aplicación.

## Las recompensas ya repartidas

El XP, las monedas y el maná que el alumnado ya ha cobrado **no se van** al eliminar nada de eso. Y un enigma que ya tiene entregas no se puede eliminar, justo para que nadie pierda lo que ganó con él.

## Si falta algo que no has tocado

Habla con quien administre vuestra instancia. Si hay copias de seguridad del servidor, se puede restaurar desde ahí; desde la aplicación, no.

## Para la próxima

Antes de un cambio grande —reorganizar un trimestre, limpiar misiones viejas— duplica la clase. La copia te queda como red de seguridad y se hace en un momento.$itakai$, "updated_at" = CURRENT_TIMESTAMP
FROM "help_categories" c
WHERE c."id" = a."category_id" AND c."slug" = $itakai$cuando-algo-falla$itakai$ AND a."locale" = 'es'
  AND a."slug" = $itakai$he-borrado-algo-sin-querer$itakai$
  AND a."body" = $itakai$Antes de nada: no vuelvas a crearlo a toda prisa. Mira primero si de verdad se ha ido.

## Archivar no es borrar

Las clases se archivan mucho más de lo que se borran. Una clase archivada sigue entera y se puede recuperar: no aparece en tu lista de clases activas, pero está.

## Lo que sí desaparece

Borrar una misión se lleva por delante sus enigmas y sus entregas. Borrar una categoría de la ayuda se lleva sus artículos. En estos casos la aplicación avisa antes justo por eso.

## Las recompensas ya repartidas

El XP, las monedas y las insignias que ya se han dado **no se van** porque borres la misión que las repartió. Lo que el alumnado ya tiene, lo tiene.

## Si has borrado una clase entera

Habla con quien administre vuestra instancia. Si hay copias de seguridad del servidor, se puede restaurar desde ahí; desde la aplicación, no.

## Para la próxima

Antes de un cambio grande —reorganizar un trimestre, limpiar misiones viejas— duplica la clase. La copia te queda como red de seguridad y se hace en un momento.$itakai$;

-- cuando-algo-falla/las-recompensas-no-cuadran: No se puede abrir una entrega revisada; dónde se ve lo pagado.
UPDATE "help_articles" a
SET "body" = $itakai$Casi siempre es que se está mirando el número de la misión y cobrando el del enigma, o al revés.

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
- En **Alumnos**, en el menú de la izquierda, la ficha de cada alumno reúne su experiencia, sus monedas y su maná en cada una de tus clases y, en **Actividad Reciente**, sus últimas entregas aprobadas y misiones completadas, con la experiencia de cada una.

Las monedas y el maná de cada entrega no aparecen sueltos en esas listas; el saldo de la clase, sí.$itakai$, "updated_at" = CURRENT_TIMESTAMP
FROM "help_categories" c
WHERE c."id" = a."category_id" AND c."slug" = $itakai$cuando-algo-falla$itakai$ AND a."locale" = 'es'
  AND a."slug" = $itakai$las-recompensas-no-cuadran$itakai$
  AND a."body" = $itakai$Casi siempre es que se está mirando el número de la misión y cobrando el del enigma, o al revés.

## Se paga por porcentaje

Al revisar una entrega pones cuánto se ha completado, y las recompensas salen de ahí. Un 60 % no cobra lo mismo que un 100 %. Si el alumno esperaba la cifra entera, mira qué porcentaje le pusiste.

## Cada enigma paga lo suyo

Las recompensas se reparten por enigma, no de una vez al final de la misión. Quien ha hecho dos de cuatro pasos ha cobrado dos, aunque la misión siga abierta.

## La clase manda

Cada clase decide qué recursos usa y con qué límites. Si una clase no tiene maná activado, no se paga maná aunque la misión lo tuviera puesto. Y si hay topes configurados, se aplican al repartir.

## Al cambiar la configuración

Tocar la configuración de recompensas afecta a lo que se reparta **a partir de ese momento**. Lo ya cobrado no se recalcula, y es a propósito: nadie debería perder por la noche algo que ganó por la mañana.

## Si aun así no sale

Abre la entrega concreta: ahí se ve el porcentaje que pusiste y lo que se pagó por él.$itakai$;

-- cuando-algo-falla/no-puedo-entrar-en-mi-cuenta: Sin invitaciones del profesor.
UPDATE "help_articles" a
SET "body" = $itakai$Antes de crear otra cuenta —que es lo que todo el mundo hace y complica el arreglo—, prueba esto.

## ¿Entraste con Google?

Si creaste la cuenta con el botón de Google, no tienes contraseña que recordar: tienes que volver a entrar con Google. Pedir una contraseña nueva no va a servir de nada.

## Restablecer la contraseña

Si entraste con correo y contraseña, usa el enlace para restablecerla. Llega un correo con un enlace temporal; si no aparece, mira en spam, que es donde suele acabar.

## La cuenta duplicada

El lío clásico: tener una cuenta con el correo personal y otra con el del centro, y haberse unido a la clase con una sola. Son dos cuentas distintas y la clase solo está en la que usaste para escribir el código. Comprueba con qué correo entras.

Si ya tienes dos, quédate con la que usas en clase. Si la clase no aparece en ella, vuelve a escribir el código desde esa cuenta.

## Sigo sin poder

Que quien administre la instancia compruebe que la cuenta existe y está activa con el correo que tú crees. Desde ahí se ve enseguida si el problema es la cuenta o la contraseña.$itakai$, "updated_at" = CURRENT_TIMESTAMP
FROM "help_categories" c
WHERE c."id" = a."category_id" AND c."slug" = $itakai$cuando-algo-falla$itakai$ AND a."locale" = 'es'
  AND a."slug" = $itakai$no-puedo-entrar-en-mi-cuenta$itakai$
  AND a."body" = $itakai$Antes de crear otra cuenta —que es lo que todo el mundo hace y complica el arreglo—, prueba esto.

## ¿Entraste con Google?

Si creaste la cuenta con el botón de Google, no tienes contraseña que recordar: tienes que volver a entrar con Google. Pedir una contraseña nueva no va a servir de nada.

## Restablecer la contraseña

Si entraste con correo y contraseña, usa el enlace para restablecerla. Llega un correo con un enlace temporal; si no aparece, mira en spam, que es donde suele acabar.

## La cuenta duplicada

El lío clásico: registrarse con el correo personal y que el profesor haya invitado al del centro. Son dos cuentas distintas y la clase está en una sola. Comprueba con qué correo entras.

Si ya tienes dos, díselo a tu profesor: es más fácil que te invite a la que usas que arreglar la otra.

## Sigo sin poder

Que tu profesor o quien administre la instancia compruebe que la cuenta existe y está activa con el correo que tú crees. Desde ahí se ve enseguida si el problema es la cuenta o la contraseña.$itakai$;
