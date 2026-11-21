-- Medios de ayuda de ITAKAI 0.9.0. El prefijo inmutable identifica el conjunto publicado.
-- Se conservan los títulos, resúmenes, orden, recuentos e IDs de las guías.
-- Si una instancia editó el texto de serie, conserva su edición y recibe los medios.
BEGIN;

WITH release_media (category_slug, article_slug, cover, video, duration, previous_body_hash, body) AS (
  VALUES
    ('alumnado', 'avatares-y-alias-por-clase', 'https://s3.services.devbeply.es/help-media/itakai/v0.9.0-0275028998de/help-media/alumnado__avatares-y-alias-por-clase/alumnado__avatares-y-alias-por-clase-portada.webp', 'https://s3.services.devbeply.es/help-media/itakai/v0.9.0-0275028998de/help-media/alumnado__avatares-y-alias-por-clase/alumnado__avatares-y-alias-por-clase.mp4?v=audio-20261120', 69, '6fc1790bc71898b9e785959ee3936250', $itakai090$En ITAKAI la identidad de cada estudiante **es por clase, no por cuenta**. La misma persona puede ser "Capitana Nemo" en tu clase de Ciencias y "Aristóteles" en la de Filosofía, con avatares distintos.

## Por qué

Porque la narrativa es de la clase. Un alias que encaja en una travesía por el Egeo no encaja en un laboratorio del futuro, y obligar a elegir uno para todo rompería las dos historias.

## Dónde los ves

En la pestaña **Alumnado** de la clase, cada estudiante sale con su nombre real y, debajo, su alias con **@** y su avatar en esa clase. También en su ficha.

![La pestaña Alumnado: cada estudiante con su nombre real, su alias y su avatar en la clase](https://s3.services.devbeply.es/help-media/itakai/v0.9.0-0275028998de/help-media/alumnado__avatares-y-alias-por-clase/01-alumnado.webp)

## El alias

Al unirse a la clase, cada estudiante recibe un alias mitológico al azar, y puede cambiarlo cuando quiera en la pestaña **Avatar** de la clase. Es lo que se ve en la clasificación, en las entregas y en el historial.

## El avatar

Al unirse también recibe uno al azar. Para cambiarlo, en la misma pestaña **Avatar**, hay dos caminos:

1. **Elegir uno del catálogo**, con los personajes de la plataforma.
2. **Generarlo con inteligencia artificial**, describiendo con palabras cómo lo quiere. La descripción se convierte en una imagen a partir de la guía del personaje elegido.

![La pestaña Avatar que ve el alumnado: su alias en la clase, los personajes y el generador con IA](https://s3.services.devbeply.es/help-media/itakai/v0.9.0-0275028998de/help-media/alumnado__avatares-y-alias-por-clase/02-pestana-avatar.webp)

En las listas, la clasificación y las entregas el avatar sale **en retrato**, de cabeza y hombros, sobre un **color de fondo** que la plataforma da a cada estudiante en cada clase. Así, aunque varias personas elijan el mismo personaje, se distinguen de un vistazo. El color nunca va solo: al lado está siempre el alias o el nombre.

## Cambiar un avatar que no es adecuado

1. En la pestaña **Alumnado**, abre el menú **⋮** de esa persona y elige **Cambiar avatar**.

   ![El menú de una estudiante en el listado, con Cambiar alias y Cambiar avatar](https://s3.services.devbeply.es/help-media/itakai/v0.9.0-0275028998de/help-media/alumnado__avatares-y-alias-por-clase/03-menu.webp)

2. Escoge un personaje del catálogo. Junto al botón ves lo que va a pasar, por ejemplo «Al guardar, Sara Gisbert pasa a llevar a Odiseo en esta clase».

   ![La ventana Avatar en la clase con Odiseo elegido y lo que pasará al guardar](https://s3.services.devbeply.es/help-media/itakai/v0.9.0-0275028998de/help-media/alumnado__avatares-y-alias-por-clase/04-elegir.webp)

3. Pulsa **Guardar**. El nuevo avatar sale al momento en el listado.

   ![Sara Gisbert ya sale con su nuevo avatar en el listado](https://s3.services.devbeply.es/help-media/itakai/v0.9.0-0275028998de/help-media/alumnado__avatares-y-alias-por-clase/05-cambiado.webp)

Pide acceso de **edición**, para que quien sustituye pueda retirarlo al momento. Si era una imagen generada con IA, la imagen se borra. Solo cambia en esa clase y queda anotado en el [historial de la clase](/ayuda/clases/el-historial-de-la-clase).

Si lo que no encaja es el alias y tienes administración en la clase, cámbialo con **Cambiar alias**, en el mismo menú: [cambiar el alias o quitar a alguien de la clase](/ayuda/alumnado/cambiar-el-alias-o-quitar-a-un-alumno-de-la-clase). Como cada estudiante puede volver a cambiar los dos, merece la pena dejar claras las reglas del juego el primer día, en la [guía de clase](/ayuda/clases/la-guia-de-clase).

## Tu avatar

El profesorado también tiene avatar, uno por cuenta y el mismo en todas sus clases: lo cuenta [tu avatar de docente](/ayuda/tu-cuenta/tu-avatar-de-docente).$itakai090$),
    ('alumnado', 'cambiar-el-alias-o-quitar-a-un-alumno-de-la-clase', 'https://s3.services.devbeply.es/help-media/itakai/v0.9.0-0275028998de/help-media/alumnado__cambiar-el-alias-o-quitar-a-un-alumno-de-la-clase/alumnado__cambiar-el-alias-o-quitar-a-un-alumno-de-la-clase-portada.webp', 'https://s3.services.devbeply.es/help-media/itakai/v0.9.0-0275028998de/help-media/alumnado__cambiar-el-alias-o-quitar-a-un-alumno-de-la-clase/alumnado__cambiar-el-alias-o-quitar-a-un-alumno-de-la-clase.mp4?v=audio-20261120', 67, 'ea9962b4a150a36238c06c72674de7d7', $itakai090$El menú **⋮** de cada estudiante, en la pestaña **Alumnado** de la clase o en su ficha, tiene también estas dos acciones. Las dos piden acceso de administración en la clase. En el mismo menú, **Cambiar avatar** devuelve a uno del catálogo un avatar que no es adecuado, y pide edición: lo cuenta [avatares y alias por clase](/ayuda/alumnado/avatares-y-alias-por-clase).

![El menú de la fila de Hugo, con Cambiar alias y Quitar de la clase](https://s3.services.devbeply.es/help-media/itakai/v0.9.0-0275028998de/help-media/alumnado__cambiar-el-alias-o-quitar-a-un-alumno-de-la-clase/01-menu.webp)

## Cambiar el alias

El alias es el nombre con el que cada estudiante sale en esa clase y en su ranking. Al unirse le toca uno al azar, y lo puede cambiar cuando quiera en su pestaña **Avatar**. Si pone uno que no es adecuado, elige **Cambiar alias**, escribe el nuevo en **Alias** (hasta 20 caracteres) y pulsa **Guardar**.

![La ventana Alias en la clase, con el alias nuevo escrito](https://s3.services.devbeply.es/help-media/itakai/v0.9.0-0275028998de/help-media/alumnado__cambiar-el-alias-o-quitar-a-un-alumno-de-la-clase/02-alias.webp)

El alias nuevo aparece al momento debajo de su nombre. Solo cambia en esta clase: en las demás sigue con el suyo. Como puede volver a cambiarlo, conviene que lo habléis.

![La fila de Hugo, con su alias nuevo](https://s3.services.devbeply.es/help-media/itakai/v0.9.0-0275028998de/help-media/alumnado__cambiar-el-alias-o-quitar-a-un-alumno-de-la-clase/03-alias-nuevo.webp)

## Quitar de la clase

**Quitar de la clase** saca a esa persona de esta clase y borra todo lo que tenía en ella:

- su nivel, XP, monedas, maná y vidas;
- su progreso en las misiones, sus entregas y las insignias de esas misiones;
- sus compras y usos en la tienda y los comportamientos que se le han aplicado;
- su historial, sus avisos y sus conversaciones con el asistente sobre esta clase.

Lo que tenga en otras clases no cambia, y su cuenta sigue existiendo. **No se puede deshacer**: si vuelve a entrar con el código, empieza de cero.

Si es una cuenta sin correo creada en esta clase, después solo la administración de la plataforma podrá restablecer su contraseña. Y si además **no ha entrado nunca** y no está en ninguna otra clase, la cuenta se borra del todo, no solo de la clase: es lo que pasa con una cuenta creada por error. La ventana te avisa de cada caso antes de confirmar, y en ese último el botón dice **Quitar y borrar la cuenta**.

![La ventana Quitar de la clase, que avisa de que la cuenta se borrará del todo](https://s3.services.devbeply.es/help-media/itakai/v0.9.0-0275028998de/help-media/alumnado__cambiar-el-alias-o-quitar-a-un-alumno-de-la-clase/04-quitar.webp)

![La lista de la clase, ya sin la cuenta creada por error](https://s3.services.devbeply.es/help-media/itakai/v0.9.0-0275028998de/help-media/alumnado__cambiar-el-alias-o-quitar-a-un-alumno-de-la-clase/05-resultado.webp)

> Para cerrar un curso no hace falta quitar a nadie: archiva la clase y todo se queda como estaba.

Las dos acciones quedan anotadas en el [historial de la clase](/ayuda/clases/el-historial-de-la-clase).$itakai090$),
    ('alumnado', 'clasificacion-y-progreso', 'https://s3.services.devbeply.es/help-media/itakai/v0.9.0-0275028998de/help-media/alumnado__clasificacion-y-progreso/alumnado__clasificacion-y-progreso-portada.webp', 'https://s3.services.devbeply.es/help-media/itakai/v0.9.0-0275028998de/help-media/alumnado__clasificacion-y-progreso/alumnado__clasificacion-y-progreso.mp4?v=audio-20261120', 72, 'cfa89542dd924e3f8933483b3c1c94bf', $itakai090$La clasificación y la ficha del alumnado te ayudan a ver cómo avanza la clase y a preparar una tutoría.

## Consultar la clasificación

1. Abre **Mis clases**, entra en tu clase y ve a **Alumnado → Ranking**.
2. En el **Podio de la clase** ves los tres primeros puestos por experiencia acumulada en esa clase. Debajo, en **Resto del ranking**, aparecen los demás puestos. Cada estudiante tiene su nivel y su avatar. En la vista de estudiante también se destaca su propio puesto.

   ![El podio de la clase con los tres primeros puestos por experiencia](https://s3.services.devbeply.es/help-media/itakai/v0.9.0-0275028998de/help-media/alumnado__clasificacion-y-progreso/01-ranking.webp)

La clasificación es propia de cada clase. La experiencia que alguien gana en una clase no se suma a la clasificación de otra.

## Ordenar el listado

1. En **Alumnado → Listado**, abre **Filtros** y pulsa el orden actual, por ejemplo **Nombre A-Z**.
2. Elige por nombre, nivel o los recursos que use tu clase, como **XP**, monedas, maná o vida. Para empezar por quien tiene más experiencia, elige **XP ↓**.

   ![Opciones de orden del listado del alumnado](https://s3.services.devbeply.es/help-media/itakai/v0.9.0-0275028998de/help-media/alumnado__clasificacion-y-progreso/02-ordenar.webp)

3. El listado se actualiza al elegir el orden. También puedes buscar a alguien por su nombre.

   ![El listado del alumnado ordenado de mayor a menor experiencia](https://s3.services.devbeply.es/help-media/itakai/v0.9.0-0275028998de/help-media/alumnado__clasificacion-y-progreso/03-ordenado.webp)

## Ver el progreso de alguien

1. Pulsa el nombre de un estudiante en el **Listado** para abrir su ficha.
2. En **Clases inscritas** puedes ver su progreso y sus misiones completadas en cada clase, junto a los recursos que use esa clase. A la derecha, **Actividad reciente** recoge sus últimos movimientos con la fecha.

   ![La ficha de una estudiante con el progreso en su clase y la actividad reciente](https://s3.services.devbeply.es/help-media/itakai/v0.9.0-0275028998de/help-media/alumnado__clasificacion-y-progreso/04-ficha.webp)

## Desactivar el ranking

Si prefieres trabajar sin clasificación en tu grupo, abre **Ajustes → Funcionalidades** y apaga **Ranking**.

![El interruptor Ranking en Funcionalidades de la clase](https://s3.services.devbeply.es/help-media/itakai/v0.9.0-0275028998de/help-media/alumnado__clasificacion-y-progreso/05-ajustes.webp)$itakai090$),
    ('alumnado', 'dar-de-alta-alumnos-sin-correo', 'https://s3.services.devbeply.es/help-media/itakai/v0.9.0-0275028998de/help-media/alumnado__dar-de-alta-alumnos-sin-correo/alumnado__dar-de-alta-alumnos-sin-correo-portada.webp', 'https://s3.services.devbeply.es/help-media/itakai/v0.9.0-0275028998de/help-media/alumnado__dar-de-alta-alumnos-sin-correo/alumnado__dar-de-alta-alumnos-sin-correo.mp4?v=audio-20261120', 74, 'f79422561225c49e4425358f00aebb80', $itakai090$Para el alumnado que no tiene correo —o que prefieres que no se registre por su cuenta— puedes crear tú las cuentas. Cada estudiante entra con un **usuario** y una **contraseña temporal** que le das tú, y la cambia la primera vez que entra. La cuenta nace ya matriculada en tu clase: no necesita el código.

## Dónde se hace

Entra en la clase, pulsa **Invitar**, en la cabecera, y abre la pestaña **Crear cuentas**. Hace falta acceso de administración en la clase, y la clase no puede estar archivada.

![El botón Invitar, en la cabecera de la clase](https://s3.services.devbeply.es/help-media/itakai/v0.9.0-0275028998de/help-media/alumnado__dar-de-alta-alumnos-sin-correo/01-invitar.webp)

![La pestaña Crear cuentas de la ventana Invitar al alumnado](https://s3.services.devbeply.es/help-media/itakai/v0.9.0-0275028998de/help-media/alumnado__dar-de-alta-alumnos-sin-correo/02-crear-cuentas.webp)

Hay dos formas, y con las dos puedes crear hasta 50 cuentas de una vez:

- **Escribir los nombres**: una fila por estudiante. Con **Añadir otra fila** sumas una más, y con la papelera de cada fila la quitas.
- **Pegar o subir una lista**: para traerla de una hoja de cálculo o de un CSV. Se explica en [importar una lista de estudiantes](/ayuda/alumnado/importar-una-lista-de-alumnos).

## El usuario

Al escribir el nombre, la plataforma propone un usuario: el nombre, la inicial del apellido y un sufijo corto, como `ana.g.k7`. Puedes cambiarlo antes de crear la cuenta. Admite letras sin tilde, números y los signos `.`, `_` y `-`, de 3 a 30 caracteres.

![Tres filas con el nombre de cada estudiante y el usuario que propone la plataforma](https://s3.services.devbeply.es/help-media/itakai/v0.9.0-0275028998de/help-media/alumnado__dar-de-alta-alumnos-sin-correo/03-nombres.webp)

El usuario es único en toda la plataforma. Si el que escribes ya lo tiene otra cuenta, se usa uno parecido con un sufijo detrás; el definitivo es el que sale en la hoja de credenciales. Al entrar da igual si se escribe en mayúsculas o en minúsculas.

## Al crear las cuentas

Pulsa el botón de crear, en el pie de la ventana, que dice cuántas van (por ejemplo, **Crear 3 cuentas**). Se crean todas a la vez o ninguna: si una fila tiene un problema, no se crea nada hasta que la corrijas o la quites. Cada cuenta queda matriculada en la clase con un alias y un avatar al azar, como cualquiera que entra con el código.

![El botón Crear 3 cuentas, en el pie de la ventana](https://s3.services.devbeply.es/help-media/itakai/v0.9.0-0275028998de/help-media/alumnado__dar-de-alta-alumnos-sin-correo/04-crear.webp)

Al terminar se abre la [hoja de credenciales](/ayuda/alumnado/la-hoja-de-credenciales), con el usuario y la contraseña temporal de cada cuenta. **Es la única vez que se ven las contraseñas**: cópialas, descárgalas o imprímelas antes de recargar la página.

![La hoja de credenciales con el usuario y la contraseña temporal de cada cuenta](https://s3.services.devbeply.es/help-media/itakai/v0.9.0-0275028998de/help-media/alumnado__dar-de-alta-alumnos-sin-correo/05-credenciales.webp)

## En la lista de la clase

Con **Volver a Alumnado** llegas a la pestaña **Alumnado** de la clase. Estas cuentas llevan la etiqueta **Sin correo**, y mientras nadie entre con su contraseña temporal, también **Pendiente de entrar**. Hasta esa primera entrada, el resto de la clase no ve la cuenta: no sale en el ranking ni cuenta en las medias de la clase. Si la contraseña se pierde antes de entrar, restablécela y habrá una nueva.

![Daniel Ortiz en la pestaña Alumnado, con las etiquetas Sin correo y Pendiente de entrar](https://s3.services.devbeply.es/help-media/itakai/v0.9.0-0275028998de/help-media/alumnado__dar-de-alta-alumnos-sin-correo/06-alumnado.webp)

Desde el menú **⋮** de cada una puedes [restablecer su contraseña](/ayuda/alumnado/restablecer-la-contrasena-de-un-alumno), y también [cambiar su alias o quitarla de la clase](/ayuda/alumnado/cambiar-el-alias-o-quitar-a-un-alumno-de-la-clase).

## Lo que conviene saber

- Esta clase es su **clase de origen**: su contraseña la restablece quien tiene administración en ella.
- Con esa cuenta se puede unir a otras clases con su código, como con cualquier otra.
- No puede cambiar su nombre ni su usuario, añadir un correo a la cuenta ni borrarla.
- Se pueden crear cuentas aunque el registro público de la plataforma esté cerrado.

Lo que tiene que hacer cada estudiante para entrar está en [entrar con usuario y contraseña](/ayuda/si-eres-alumno/entrar-con-usuario-y-contrasena).$itakai090$),
    ('alumnado', 'formar-equipos', 'https://s3.services.devbeply.es/help-media/itakai/v0.9.0-0275028998de/help-media/alumnado__formar-equipos/alumnado__formar-equipos-portada.webp', 'https://s3.services.devbeply.es/help-media/itakai/v0.9.0-0275028998de/help-media/alumnado__formar-equipos/alumnado__formar-equipos.mp4?v=audio-20261120', 80, 'c70ec5bbe660cbf0d04b28cc56ec6958', $itakai090$En **Alumnado → Equipos**, cada reparto de la clase se guarda como una **agrupación**. Puedes tener más de una a la vez.

- **De base**. Para los equipos fijos del curso. Sus puntos cuentan en la [clasificación de equipos](/ayuda/gamificacion/premiar-a-un-equipo-y-ver-la-clasificacion).
- **Temporal**. Para una misión o una actividad concreta. Sus puntos quedan fuera de la clasificación. Cuando acabe la actividad, pulsa **Archivar**.

Cada estudiante puede pertenecer a un equipo por agrupación. Puede estar, por ejemplo, en un equipo de base y en otro temporal.

## Formar equipos al azar

1. Pulsa **Formar equipos**, escribe el nombre de la agrupación y elige su **Tipo**.
2. En **Cómo**, elige **Al azar**. Indica el **Número de equipos** o las **Personas por equipo**. Si quieres repartir niveles parecidos entre los grupos, marca **Equilibrar por nivel**.

   ![El formulario para preparar un reparto al azar](https://s3.services.devbeply.es/help-media/itakai/v0.9.0-0275028998de/help-media/alumnado__formar-equipos/01-al-azar.webp)

3. Pulsa **Repartir** para ver la **Propuesta**. Si ya has [pasado lista](/ayuda/alumnado/pasar-lista-y-consultar-la-asistencia), el reparto deja fuera a quienes tengan estado **Ausente** o **Justificada** en la última lista de hoy y te dice quiénes son. Si aún no hay lista, entra toda la clase.
4. Pulsa **Otra vez** para pedir otra propuesta o **Guardar equipos** para quedarte con la que estás viendo.

   ![La propuesta de equipos y quién queda fuera por faltar hoy](https://s3.services.devbeply.es/help-media/itakai/v0.9.0-0275028998de/help-media/alumnado__formar-equipos/02-propuesta.webp)

## Formar equipos a mano

1. En **Formar equipos**, elige **A mano**, indica cuántos equipos quieres y pulsa **Crear equipos**. Se crean vacíos, con el alumnado en **Sin equipo**.

   ![El formulario para crear equipos vacíos a mano](https://s3.services.devbeply.es/help-media/itakai/v0.9.0-0275028998de/help-media/alumnado__formar-equipos/03-a-mano.webp)

2. Marca a una o varias personas y elige su equipo en la barra **Poner en**. También puedes pulsar **Poner aquí** en el equipo o, con ratón, arrastrar el nombre a otro equipo o a **Sin equipo**. Cada movimiento se guarda al momento.

   ![Una estudiante seleccionada y los equipos donde se la puede poner](https://s3.services.devbeply.es/help-media/itakai/v0.9.0-0275028998de/help-media/alumnado__formar-equipos/04-asignar.webp)

3. Si te quedan personas en **Sin equipo**, **Repartir al azar** las reparte llenando primero los equipos más pequeños. En una agrupación temporal, quienes falten hoy se quedan sin equipo.

   ![El equipo con su nueva integrante](https://s3.services.devbeply.es/help-media/itakai/v0.9.0-0275028998de/help-media/alumnado__formar-equipos/05-resultado.webp)

## Editar y archivar

Con **Editar** puedes cambiar el nombre de la agrupación, añadir o quitar equipos y ajustar su nombre, color y emblema. Si quitas un equipo, sus puntos se borran al guardar. Nombre y emblema permiten distinguir los equipos también con los modos de daltonismo.

El profesorado con acceso de **edición** puede formar, cambiar, archivar y borrar equipos. Con acceso de **lectura** puede consultarlos. Las cuentas sin correo que aún no han entrado también se pueden añadir a un equipo.$itakai090$),
    ('alumnado', 'importar-una-lista-de-alumnos', 'https://s3.services.devbeply.es/help-media/itakai/v0.9.0-0275028998de/help-media/alumnado__importar-una-lista-de-alumnos/alumnado__importar-una-lista-de-alumnos-portada.webp', 'https://s3.services.devbeply.es/help-media/itakai/v0.9.0-0275028998de/help-media/alumnado__importar-una-lista-de-alumnos/alumnado__importar-una-lista-de-alumnos.mp4?v=audio-20261120', 73, 'b63bf2f969cea1516f11f3fb2b5c3322', $itakai090$Si tienes la lista del grupo en una hoja de cálculo, no hace falta escribir los nombres uno a uno. Entra en la clase, pulsa **Invitar**, abre la pestaña **Crear cuentas** y elige **Pegar o subir una lista**.

![La opción Pegar o subir una lista, en la pestaña Crear cuentas](https://s3.services.devbeply.es/help-media/itakai/v0.9.0-0275028998de/help-media/alumnado__importar-una-lista-de-alumnos/01-pegar-o-subir.webp)

## Pegar la lista

Copia la columna de nombres de tu hoja de cálculo y pégala en **Lista de estudiantes**: un nombre por línea. Si quieres elegir tú algún usuario, ponlo en una segunda columna, al lado del nombre (si lo escribes a mano, sepáralo con punto y coma); donde no lo haya, lo propone la plataforma. Debajo verás cuántos estudiantes lleva la lista.

![La lista pegada, un nombre por línea, con los botones Subir un CSV y Descargar plantilla CSV](https://s3.services.devbeply.es/help-media/itakai/v0.9.0-0275028998de/help-media/alumnado__importar-una-lista-de-alumnos/02-lista.webp)

## Subir un CSV

Pulsa **Subir un CSV** y elige el fichero. Si no sabes cómo prepararlo, **Descargar plantilla CSV** te da uno de ejemplo con las columnas `nombre` y `usuario`, listo para abrir en una hoja de cálculo. La primera línea puede ser esa cabecera: no cuenta como estudiante.

Solo se admiten ficheros CSV. Si tienes la lista en otro formato de hoja de cálculo, usa **Guardar como** en tu programa y elige CSV.

Caben **50 estudiantes por lista**. Si el grupo es más grande, divídela en dos.

## Revisar antes de crear

Pulsa **Revisar la lista**. Todavía no se crea nada: aparece una tabla con cada línea, el usuario que tendrá y su estado.

![El botón Revisar la lista](https://s3.services.devbeply.es/help-media/itakai/v0.9.0-0275028998de/help-media/alumnado__importar-una-lista-de-alumnos/03-revisar.webp)

- **Lista para crear**: todo en orden.
- **«…» está ocupado: se usará «…»**: el usuario que pusiste ya lo tiene otra cuenta, y se usará el que propone la plataforma.
- **Repetido en la lista**: el nombre o el usuario aparecen dos veces. Añade una inicial para distinguirlos o quita la fila.
- **Falta el nombre**, o el nombre es demasiado corto o demasiado largo (de 2 a 120 caracteres).
- **Usuario no válido**: solo letras sin tilde, números y `.`, `_` o `-`, de 3 a 30 caracteres.

![La revisión de la lista, con la línea repetida marcada](https://s3.services.devbeply.es/help-media/itakai/v0.9.0-0275028998de/help-media/alumnado__importar-una-lista-de-alumnos/04-revision.webp)

Las filas con errores hay que corregirlas en la lista, con **Volver a la lista**, o quitarlas, una a una o todas a la vez con **Quitar las filas con errores**. Mientras quede alguna, el botón de crear está desactivado.

## Crear

Cuando todo esté bien, pulsa el botón de crear, que dice cuántas cuentas van (por ejemplo, **Crear 3 cuentas**). Se crean todas a la vez, o ninguna si algo falla, y se abre la [hoja de credenciales](/ayuda/alumnado/la-hoja-de-credenciales) con las contraseñas temporales.

![La lista sin errores y el botón Crear 3 cuentas](https://s3.services.devbeply.es/help-media/itakai/v0.9.0-0275028998de/help-media/alumnado__importar-una-lista-de-alumnos/05-crear.webp)

![La hoja de credenciales, con Nerea Bonet y el usuario que eligió Natalia](https://s3.services.devbeply.es/help-media/itakai/v0.9.0-0275028998de/help-media/alumnado__importar-una-lista-de-alumnos/06-credenciales.webp)

Si prefieres escribir los nombres a mano, está explicado en [dar de alta a estudiantes sin correo](/ayuda/alumnado/dar-de-alta-alumnos-sin-correo).$itakai090$),
    ('alumnado', 'la-hoja-de-credenciales', 'https://s3.services.devbeply.es/help-media/itakai/v0.9.0-0275028998de/help-media/alumnado__la-hoja-de-credenciales/alumnado__la-hoja-de-credenciales-portada.webp', 'https://s3.services.devbeply.es/help-media/itakai/v0.9.0-0275028998de/help-media/alumnado__la-hoja-de-credenciales/alumnado__la-hoja-de-credenciales.mp4?v=audio-20261120', 66, 'de0973150ae8580657e6181e9fe29e51', $itakai090$La hoja de credenciales aparece justo después de [crear cuentas](/ayuda/alumnado/dar-de-alta-alumnos-sin-correo) o de [restablecer una contraseña](/ayuda/alumnado/restablecer-la-contrasena-de-un-alumno). Tiene una tarjeta por estudiante con su nombre, la clase, su **usuario**, su **contraseña temporal**, la dirección donde se entra y el código de la clase, y le recuerda que al entrar por primera vez tiene que cambiar la contraseña.

![La hoja de credenciales, con una tarjeta por estudiante](https://s3.services.devbeply.es/help-media/itakai/v0.9.0-0275028998de/help-media/alumnado__la-hoja-de-credenciales/02-hoja.webp)

## Solo se ve una vez

Las contraseñas temporales no se guardan en ningún sitio, y la plataforma no puede volver a enseñarlas: lo recuerda el aviso de la propia hoja. Si recargas la página o cierras la sesión, la hoja dice **«Las contraseñas ya no se pueden mostrar»**. No es grave: [restablece la contraseña](/ayuda/alumnado/restablecer-la-contrasena-de-un-alumno) de quien la necesite y se genera una nueva.

![El aviso de que las contraseñas solo se ven ahora](https://s3.services.devbeply.es/help-media/itakai/v0.9.0-0275028998de/help-media/alumnado__la-hoja-de-credenciales/01-aviso.webp)

## Repartirlas

- **Copiar**, en cada tarjeta: las credenciales de esa tarjeta, para pegarlas en un mensaje privado.
- **Copiar todas**: todas seguidas, con el nombre de la clase, la dirección de entrada y el código.
- **Descargar lista (CSV)**: un fichero con el nombre, el usuario, la contraseña, la clase y la dirección de entrada de cada estudiante, que se abre bien en una hoja de cálculo.
- **Imprimir / guardar como PDF**: las tarjetas, listas para recortar y dar en mano.

![El botón Copiar de una tarjeta](https://s3.services.devbeply.es/help-media/itakai/v0.9.0-0275028998de/help-media/alumnado__la-hoja-de-credenciales/03-copiar.webp)

![Copiar todas, Descargar lista (CSV) e Imprimir / guardar como PDF](https://s3.services.devbeply.es/help-media/itakai/v0.9.0-0275028998de/help-media/alumnado__la-hoja-de-credenciales/04-repartir.webp)

> El fichero descargado lleva las contraseñas y se queda en tu ordenador. Guárdalo con cuidado y bórralo cuando las hayas repartido.

Dale a cada estudiante solo la suya. En cuanto la cambie al entrar, la temporal deja de servir, así que una tarjeta que se pierda después ya no abre nada.

## Volver

**Volver a Alumnado**, arriba a la derecha, te lleva a la lista de la clase. La hoja no está en ningún menú: solo existe justo después de crear cuentas o de restablecer una contraseña.

![Volver a Alumnado, arriba a la derecha de la hoja](https://s3.services.devbeply.es/help-media/itakai/v0.9.0-0275028998de/help-media/alumnado__la-hoja-de-credenciales/05-volver.webp)$itakai090$),
    ('alumnado', 'la-vista-del-alumno', 'https://s3.services.devbeply.es/help-media/itakai/v0.9.0-0275028998de/help-media/alumnado__la-vista-del-alumno/alumnado__la-vista-del-alumno-portada.webp', 'https://s3.services.devbeply.es/help-media/itakai/v0.9.0-0275028998de/help-media/alumnado__la-vista-del-alumno/alumnado__la-vista-del-alumno.mp4?v=audio-20261120', 79, 'db0435abc00c848a17065a5efe1ca1e5', $itakai090$Conviene saber cómo se ve la plataforma desde el otro lado, porque muchas dudas de clase se resuelven sabiendo dónde está cada botón.

![Lo que ve el profesorado frente a lo que ve el alumnado en la misma clase.](/app/ayuda/diagramas/vista-roles.svg)

## Ver tu clase como la ve tu alumnado

Con **Ver como estudiante**, debajo de tu nombre en el menú de la izquierda (en pantallas anchas), entras en la plataforma con una cuenta de estudiante de prueba, dentro de todas tus clases, para revisarlas desde dentro.

![Ver como estudiante, debajo de tu nombre en el menú](https://s3.services.devbeply.es/help-media/itakai/v0.9.0-0275028998de/help-media/alumnado__la-vista-del-alumno/01-ver-como.webp)

Mientras estás en esa vista, una franja arriba te recuerda que estás viendo la plataforma como estudiante. Esa matrícula de prueba no cuenta en los listados, ni en el recuento del alumnado, ni en la clasificación. Con ella lo ves todo abierto: el [camino del mapa](/ayuda/misiones/montar-el-camino-del-mapa) solo cierra misiones a las cuentas de estudiante. Para salir, pulsa **Volver a la vista docente**, en esa misma franja.

![El aviso de la vista de estudiante, con Volver a la vista docente](https://s3.services.devbeply.es/help-media/itakai/v0.9.0-0275028998de/help-media/alumnado__la-vista-del-alumno/04-volver.webp)

## Su inicio

Al entrar, cada estudiante ve sus clases, su progreso y sus últimas misiones. Si una misión está a punto de vencer, le aparece destacada. Con **Ver clase** entra en cada una.

## Dentro de una clase

Cada clase tiene sus pestañas (en el móvil, solo con su icono):

- **Resumen**: su nivel, sus números y su actividad en esa clase, su equipo si la clase tiene equipos, y el profesorado que la imparte, con el avatar y el perfil de cada docente.
- **Historia** y **Guía**: la narrativa y las reglas que hayas escrito.
- **Misiones**: en el [orden de la clase](/ayuda/misiones/el-orden-de-las-misiones), con su rareza, su fecha y cuánto lleva completado de cada una. Si la clase tiene encendido el [mapa de misiones](/ayuda/misiones/el-mapa-de-misiones), las ve de entrada en el mapa, con candado las que aún no se le han abierto.
- **Ranking**: dónde está respecto al resto del grupo, si la clase tiene la clasificación activada.
- **Tienda**: qué puede comprar con lo que tiene, si la clase la usa.
- **Avatar**: su alias y su avatar en esa clase.

![La clase vista como estudiante, con sus pestañas](https://s3.services.devbeply.es/help-media/itakai/v0.9.0-0275028998de/help-media/alumnado__la-vista-del-alumno/02-clase.webp)

![La pestaña Misiones, con el mapa de misiones](https://s3.services.devbeply.es/help-media/itakai/v0.9.0-0275028998de/help-media/alumnado__la-vista-del-alumno/03-misiones.webp)

Las insignias, las conseguidas y las que faltan, las tiene en **Insignias**, en su menú.

## Cómo entrega

Abre la misión, elige un enigma, sube su archivo y espera. Mientras tenga una entrega pendiente de ese enigma no puede subir otra. Cuando la revisas, le llega un aviso con el porcentaje que le has puesto, y en su actividad ve quién se la aprobó; lo mismo con los comportamientos que se le aplican. Lo cuenta, desde su lado, [cómo entrego una misión](/ayuda/si-eres-alumno/como-entrego-una-mision).

## Su perfil

Cada estudiante tiene su alias y su avatar **por clase**: puede llamarse de una forma en Matemáticas y de otra en Historia. Eso se explica en [avatares y alias](/ayuda/alumnado/avatares-y-alias-por-clase).

Si le has [creado tú la cuenta](/ayuda/alumnado/dar-de-alta-alumnos-sin-correo), entra con su usuario y la contraseña temporal de la hoja, y lo primero que ve es la pantalla para cambiarla: hasta que no elige una suya, no llega a nada más.$itakai090$),
    ('alumnado', 'pasar-lista-y-consultar-la-asistencia', 'https://s3.services.devbeply.es/help-media/itakai/v0.9.0-0275028998de/help-media/alumnado__pasar-lista-y-consultar-la-asistencia/alumnado__pasar-lista-y-consultar-la-asistencia-portada.webp', 'https://s3.services.devbeply.es/help-media/itakai/v0.9.0-0275028998de/help-media/alumnado__pasar-lista-y-consultar-la-asistencia/alumnado__pasar-lista-y-consultar-la-asistencia.mp4?v=audio-20261120', 72, '02b62fec1aa02937038bec3ca00fb1f9', $itakai090$Al pasar lista, todo el alumnado aparece como **Presente**. Solo tienes que marcar las excepciones.

## Pasar lista

1. Abre tu clase y ve a **Alumnado → Asistencia → Pasar lista**.
2. Comprueba la **Fecha** y la **Sesión**. Si el horario de la clase tiene un tramo para ese día, aparece su hora. Si pasas lista fuera del horario, usa **Sesión sin horario**.

   ![La pantalla Pasar lista con la fecha y la sesión](https://s3.services.devbeply.es/help-media/itakai/v0.9.0-0275028998de/help-media/alumnado__pasar-lista-y-consultar-la-asistencia/01-sesion.webp)

3. En cada fila, cambia el estado a **Ausente**, **Retraso** o **Justificada** según corresponda. Las cuentas sin correo que todavía no han entrado también aparecen en la lista.

   ![Las cuatro opciones de asistencia en la fila de una estudiante](https://s3.services.devbeply.es/help-media/itakai/v0.9.0-0275028998de/help-media/alumnado__pasar-lista-y-consultar-la-asistencia/02-estado.webp)

4. Pulsa **Guardar lista**. Si vuelves a guardar la misma fecha y sesión, se actualiza esa lista. Usa **Borrar esta lista** si la creaste por error.

   ![El resumen de asistencia y el botón Guardar lista](https://s3.services.devbeply.es/help-media/itakai/v0.9.0-0275028998de/help-media/alumnado__pasar-lista-y-consultar-la-asistencia/03-guardar.webp)

## Aplicar algo a quienes asistieron o faltaron

Con la lista guardada puedes pulsar **Aplicar a los presentes…** o **Aplicar a los ausentes…**. Es la misma ventana que al [aplicar a varios estudiantes](/ayuda/gamificacion/aplicar-a-varios-estudiantes), con el alumnado ya seleccionado. Las faltas **Justificadas** quedan fuera de la selección de ausentes. Revisa la selección y confirma con **Aplicar** si quieres añadir un comportamiento o una recompensa. Guardar la lista no cambia sus puntos.

![La lista guardada con las acciones para presentes y ausentes](https://s3.services.devbeply.es/help-media/itakai/v0.9.0-0275028998de/help-media/alumnado__pasar-lista-y-consultar-la-asistencia/04-guardada.webp)

## Consultar el histórico

1. Abre **Histórico** y elige un mes. Por estudiante ves cuántas veces estuvo presente, faltó, llegó tarde o justificó la falta. El porcentaje cuenta como asistencia las sesiones en las que estuvo presente o llegó tarde.
2. Pulsa un día marcado en el calendario para abrir su lista. También puedes abrir una incidencia desde **Faltas y retrasos**. **Descargar CSV** guarda el mes para consultarlo en una hoja de cálculo. La ficha de cada estudiante incluye su asistencia del curso en cada clase.

   ![El histórico del mes con el calendario, las incidencias y la opción de descargar CSV](https://s3.services.devbeply.es/help-media/itakai/v0.9.0-0275028998de/help-media/alumnado__pasar-lista-y-consultar-la-asistencia/05-historico.webp)

## Usar la lista de hoy en la clase

Quien esté **Ausente** o **Justificada** en la última lista de hoy queda fuera de la [ruleta](/ayuda/gamificacion/usar-la-ruleta-en-clase) y de los [equipos al azar](/ayuda/alumnado/formar-equipos). La ventana de aplicación a varios estudiantes también ofrece **Solo presentes hoy** y **Solo ausentes hoy**.

Con permiso de **lectura** puedes consultar la asistencia. Guardar, corregir, borrar y descargar requiere **edición**. En una clase archivada se puede consultar, pero no pasar lista. El historial y el CSV contienen datos personales del alumnado. Si quitas a alguien de una clase, se borra su asistencia en ella.$itakai090$),
    ('alumnado', 'restablecer-la-contrasena-de-un-alumno', 'https://s3.services.devbeply.es/help-media/itakai/v0.9.0-0275028998de/help-media/alumnado__restablecer-la-contrasena-de-un-alumno/alumnado__restablecer-la-contrasena-de-un-alumno-portada.webp', 'https://s3.services.devbeply.es/help-media/itakai/v0.9.0-0275028998de/help-media/alumnado__restablecer-la-contrasena-de-un-alumno/alumnado__restablecer-la-contrasena-de-un-alumno.mp4?v=audio-20261120', 61, '220599e8429faca7eefd562c5a6f2e1f', $itakai090$Cuando alguien que entra con usuario olvida su contraseña, no puede recuperarla por correo porque su cuenta no lo tiene: se la restableces tú.

## Cómo

1. En la pestaña **Alumnado** de la clase, abre el menú **⋮** de su fila. También lo tienes en su ficha, en la tarjeta de cada clase.

   ![El menú de la fila, con Restablecer contraseña](https://s3.services.devbeply.es/help-media/itakai/v0.9.0-0275028998de/help-media/alumnado__restablecer-la-contrasena-de-un-alumno/01-menu.webp)

2. Elige **Restablecer contraseña**. La ventana te recuerda que la contraseña que tiene dejará de funcionar y que se cerrarán sus sesiones abiertas. Confirma con **Restablecer**.

   ![La ventana de confirmación, con el botón Restablecer](https://s3.services.devbeply.es/help-media/itakai/v0.9.0-0275028998de/help-media/alumnado__restablecer-la-contrasena-de-un-alumno/02-confirmar.webp)

3. Se abre la [hoja de credenciales](/ayuda/alumnado/la-hoja-de-credenciales) con su contraseña temporal nueva. Dásela.

   ![La hoja de credenciales con la contraseña temporal nueva de Pau](https://s3.services.devbeply.es/help-media/itakai/v0.9.0-0275028998de/help-media/alumnado__restablecer-la-contrasena-de-un-alumno/03-hoja.webp)

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

Lo tienes en **Alumnado**, en el menú de la izquierda: debajo del nombre de cada estudiante sin correo aparece su usuario, y también en su ficha. En la pestaña **Alumnado** de la clase, en cambio, debajo del nombre sale su alias.

![Alumnado, en el menú de la izquierda, con el usuario debajo del nombre](https://s3.services.devbeply.es/help-media/itakai/v0.9.0-0275028998de/help-media/alumnado__restablecer-la-contrasena-de-un-alumno/04-usuario.webp)$itakai090$),
    ('clases', 'compartir-una-clase-con-otros-profesores', 'https://s3.services.devbeply.es/help-media/itakai/v0.9.0-0275028998de/help-media/clases__compartir-una-clase-con-otros-profesores/clases__compartir-una-clase-con-otros-profesores-portada.webp', 'https://s3.services.devbeply.es/help-media/itakai/v0.9.0-0275028998de/help-media/clases__compartir-una-clase-con-otros-profesores/clases__compartir-una-clase-con-otros-profesores.mp4?v=audio-20261120', 68, '8a824f89ae58b2d563106976a103dfab', $itakai090$Una clase no tiene por qué ser de una sola persona. Puedes compartirla con quien la imparte contigo, con quien te sustituye o con alguien en prácticas, y cada cual entra con el nivel de acceso que le toque.

## Añadir docentes

**1. Abre el profesorado de la clase.** En la clase, abre **Ajustes** y la sección **Profesorado**, y pulsa **Añadir docente**.

![La sección Profesorado, con el botón Añadir docente](https://s3.services.devbeply.es/help-media/itakai/v0.9.0-0275028998de/help-media/clases__compartir-una-clase-con-otros-profesores/01-profesorado.webp)

**2. Escribe su correo y elige perfil y nivel.** En **Correo electrónico**, el correo exacto de su cuenta de docente en la plataforma. Después elige su **Perfil** —titular, sustitución o prácticas— y su **Nivel de acceso**. Cada perfil propone un nivel (de entrada sale *Sustitución*, con *Edición*), que puedes cambiar: lo explica [niveles y perfiles del profesorado](/ayuda/clases/niveles-y-perfiles-del-profesorado). Debajo del nivel ves qué permite.

![La ventana Añadir docente, con el correo, el perfil y el nivel de acceso](https://s3.services.devbeply.es/help-media/itakai/v0.9.0-0275028998de/help-media/clases__compartir-una-clase-con-otros-profesores/02-anadir.webp)

**3. Pulsa Añadir.** Entra al momento, sin tener que aceptar nada, y recibe un aviso. La ves ya en la lista del profesorado.

![La nueva docente en el profesorado, con su menú de acciones](https://s3.services.devbeply.es/help-media/itakai/v0.9.0-0275028998de/help-media/clases__compartir-una-clase-con-otros-profesores/03-lista.webp)

A ella, la clase le aparece en **Mis clases**, y su alumnado y sus misiones en sus listados.

![Mis clases de la docente añadida, con la clase compartida](https://s3.services.devbeply.es/help-media/itakai/v0.9.0-0275028998de/help-media/clases__compartir-una-clase-con-otros-profesores/04-elena.webp)

Para añadir a alguien necesitas acceso de administración en la clase, y la otra persona necesita tener ya su cuenta de docente: si todavía no la tiene, que se registre primero.

## Si no se puede añadir

Si el correo no es el de una cuenta de docente, la plataforma responde «No se puede añadir a esa persona. Comprueba que el correo es el de una cuenta docente.». Revisa que esté bien escrito y que sea el de su cuenta de docente, no el de una cuenta de estudiante. Los intentos tienen un límite: si lo pasas, verás «Has hecho demasiados intentos» y tendrás que esperar un rato antes de volver a probar.

## Cambiar o quitar

En la lista de **Profesorado**, el menú **⋮** de cada persona tiene **Cambiar perfil o nivel** y **Quitar de la clase** (y, si tienes la propiedad, **Pasar la propiedad**). Quien sale deja de ver la clase y recibe un aviso; lo que ya hizo en ella se queda. A quien tiene la propiedad no se le puede cambiar ni quitar.

## Salir de la clase

Cualquiera menos quien tiene la propiedad puede irse con **Salir de la clase**, debajo de la lista. Para volver, alguien con administración tendrá que añadirle otra vez. Quien tiene la propiedad, para salir, tiene que [pasar antes la propiedad](/ayuda/clases/traspasar-una-clase).

## Quién ve qué

La sección **Profesorado** la ve todo el profesorado de la clase, con el perfil y el nivel de cada persona. El alumnado ve en el **Resumen** de la clase quién la imparte, con su [avatar](/ayuda/tu-cuenta/tu-avatar-de-docente) y su perfil. Cada cambio queda en el [historial de la clase](/ayuda/clases/el-historial-de-la-clase).

Al duplicar una clase compartida, la copia es solo tuya: el resto del profesorado no pasa a ella.$itakai090$),
    ('clases', 'crear-una-clase-desde-cero-o-desde-una-plantilla', 'https://s3.services.devbeply.es/help-media/itakai/v0.9.0-0275028998de/help-media/clases__crear-una-clase-desde-cero-o-desde-una-plantilla/clases__crear-una-clase-desde-cero-o-desde-una-plantilla-portada.webp', 'https://s3.services.devbeply.es/help-media/itakai/v0.9.0-0275028998de/help-media/clases__crear-una-clase-desde-cero-o-desde-una-plantilla/clases__crear-una-clase-desde-cero-o-desde-una-plantilla.mp4?v=audio-20261120', 77, '758f809bd28dcf0eccda5df869c4c20a', $itakai090$Además de crear una clase en blanco con **Nueva clase**, puedes partir de una **plantilla**: una clase que alguien del profesorado ha publicado para que cualquiera la reutilice. Empezar en blanco lo explica [crear tu primera clase](/ayuda/primeros-pasos/crear-tu-primera-clase); aquí va cómo se parte de una plantilla y qué te traes.

## Paso a paso

**1. Abre el catálogo.** En el menú, entra en **Mis clases** y pulsa **Plantillas**.

![Mis clases, con el botón Plantillas junto a Nueva clase](https://s3.services.devbeply.es/help-media/itakai/v0.9.0-0275028998de/help-media/clases__crear-una-clase-desde-cero-o-desde-una-plantilla/01-plantillas.webp)

**2. Busca la que te encaje.** El buscador encuentra por nombre y **Filtros** despliega el nivel, la asignatura, el idioma y la provincia (la asignatura se desbloquea al elegir el nivel). Las **recomendadas** salen primero, con su etiqueta. Las mismas plantillas están en el [catálogo público](/ayuda/clases/el-catalogo-publico-de-plantillas), que se abre sin cuenta y sirve para pasarle a alguien el enlace de una.

![El catálogo de plantillas filtrado por nivel](https://s3.services.devbeply.es/help-media/itakai/v0.9.0-0275028998de/help-media/clases__crear-una-clase-desde-cero-o-desde-una-plantilla/02-filtros.webp)

**3. Mírala por dentro.** **Previsualizar** abre la plantilla con sus pestañas: **Historia**, **Funcionalidades**, **Misiones**, **Tienda** y **Comportamientos**. En **Misiones** ves cada una con su rareza, sus enigmas y sus recompensas.

![Vista previa de una plantilla, en la pestaña Misiones](https://s3.services.devbeply.es/help-media/itakai/v0.9.0-0275028998de/help-media/clases__crear-una-clase-desde-cero-o-desde-una-plantilla/03-vista-previa.webp)

**4. Impórtala.** Si la plantilla tiene misiones, abajo está la casilla **Importar también sus misiones**, con cuántas son, marcada de entrada. Déjala o desmárcala y pulsa **Importar**. En una plantilla con misiones, el botón **Importar** de la tarjeta abre también esta vista previa, para que decidas antes.

![La casilla para importar también las misiones y el botón Importar](https://s3.services.devbeply.es/help-media/itakai/v0.9.0-0275028998de/help-media/clases__crear-una-clase-desde-cero-o-desde-una-plantilla/04-importar.webp)

**5. Revisa tu clase nueva.** La plataforma te lleva a ella. Se llama como la plantilla, con «(copia)» detrás, y es tuya: tienes su propiedad y se edita como cualquier otra.

![La clase importada, con sus misiones](https://s3.services.devbeply.es/help-media/itakai/v0.9.0-0275028998de/help-media/clases__crear-una-clase-desde-cero-o-desde-una-plantilla/05-clase-copia.webp)

## Qué te traes al importar

- La **narrativa** y la imagen de portada.
- Los **recursos activos** —qué usa esa clase y qué no— y sus niveles. También el [mapa de misiones](/ayuda/misiones/el-mapa-de-misiones), si lo tenía encendido, aunque la ficha no lo enseñe.
- La **tienda**: recompensas y poderes con sus precios.
- Los **comportamientos** configurados.
- Las **misiones**, si dejas marcada la casilla.

Las misiones llegan con sus enigmas enteros, con sus [pistas](/ayuda/misiones/pistas-en-las-misiones), con lo que pide cada una para abrirse en el mapa de misiones y con el estado que tenían en la plantilla, activas o bloqueadas. No traen fecha límite, ni documentos, ni insignias: si los necesitas, se los añades tú.

> **Revisa las que lleguen activas.** Tu alumnado podrá entregarlas en cuanto entre en la clase. Si quieres repasarlas antes, bloquéalas hasta que estén a tu gusto.

Si desmarcas la casilla, la clase llega sin misiones y el contenido lo pones tú. Más adelante también puedes traerte una misión concreta de otra de tus clases: lo explica [importar una misión de otra clase](/ayuda/misiones/importar-una-mision-de-otra-clase).

## Qué no

Nunca viene la **guía de clase**, ni nada del alumnado ni del profesorado de la clase original: ni personas, ni progreso, ni saldos. Una plantilla es una clase vacía de gente.

Tampoco vienen la asignatura, el nivel educativo, el idioma, la provincia ni el horario: ponlos en **Ajustes → Datos generales**, sobre todo si algún día quieres publicarla tú como plantilla.

## Después de importar

Cambia lo que no encaje —precios, nombres, la propia narrativa, las misiones— antes de dar el código a tu alumnado. La clase importada es independiente: si quien publicó la plantilla la cambia o la retira, tu copia sigue igual.$itakai090$),
    ('clases', 'duplicar-una-clase-para-el-curso-siguiente', 'https://s3.services.devbeply.es/help-media/itakai/v0.9.0-0275028998de/help-media/clases__duplicar-una-clase-para-el-curso-siguiente/clases__duplicar-una-clase-para-el-curso-siguiente-portada.webp', 'https://s3.services.devbeply.es/help-media/itakai/v0.9.0-0275028998de/help-media/clases__duplicar-una-clase-para-el-curso-siguiente/clases__duplicar-una-clase-para-el-curso-siguiente.mp4?v=audio-20261120', 60, '16071054fc36cfc8953b8501a7b0b8d4', $itakai090$Cuando empieza un curso nuevo no hace falta rehacer el trabajo: en los **Ajustes** de la clase, sección **Gestión**, **Duplicar** crea una copia limpia y te deja elegir qué te llevas.

## Paso a paso

**1. Abre la gestión de la clase.** Entra en la clase, abre **Ajustes** y pulsa **Gestión**.

![La sección Gestión de los ajustes, con Duplicar clase](https://s3.services.devbeply.es/help-media/itakai/v0.9.0-0275028998de/help-media/clases__duplicar-una-clase-para-el-curso-siguiente/01-gestion.webp)

**2. Pulsa Duplicar.** Se abre una ventana con un interruptor por cada parte que se puede copiar, todos encendidos de entrada.

![La ventana Duplicar clase, con lo que se copia](https://s3.services.devbeply.es/help-media/itakai/v0.9.0-0275028998de/help-media/clases__duplicar-una-clase-para-el-curso-siguiente/02-opciones.webp)

**3. Elige y confirma.** Apaga lo que no quieras llevarte y pulsa **Duplicar**. La copia se llama como la original, con «(copia)» detrás, y te lleva directamente a ella.

![La clase copiada, con sus misiones y sin alumnado](https://s3.services.devbeply.es/help-media/itakai/v0.9.0-0275028998de/help-media/clases__duplicar-una-clase-para-el-curso-siguiente/03-copia.webp)

## Qué puedes elegir

- **Misiones**: las misiones, en el mismo [orden](/ayuda/misiones/el-orden-de-las-misiones), con todos sus enigmas, sus [pistas](/ayuda/misiones/pistas-en-las-misiones), sus recompensas y lo que pide cada una para abrirse en el [mapa de misiones](/ayuda/misiones/el-mapa-de-misiones).
- **Historia**: la narrativa y la imagen de portada.
- **Funcionalidades**: los recursos activos y los niveles de la clase.
- **Tienda**: los artículos, con sus precios.
- **Comportamientos.**

Lo que apagas se queda en blanco en la copia. Si copias las misiones, sus fechas de entrega vienen tal cual: revísalas antes de abrirlas al grupo.

## Qué no se copia nunca

**Nada del alumnado.** Ni las personas, ni sus entregas, ni la experiencia, ni los saldos, ni las pistas usadas, ni las insignias ganadas. La copia nace vacía de gente, que es justo lo que quieres en septiembre.

Tampoco se copian la **guía de clase**, que tendrás que volver a escribir o pegar, ni el código de clase: la copia tiene el suyo propio. Y la asignatura, el nivel educativo, el idioma, la provincia y el horario se quedan en blanco: ponlos en **Ajustes → Datos generales**.

## La copia es tuya

Para duplicar una clase basta con poder verla, así que también puedes duplicar una que alguien del profesorado comparte contigo. La copia nace solo contigo en el profesorado, y su propiedad es tuya: el resto del profesorado de la original no pasa a ella. Si quieres volver a compartirla, [añade en la copia a quien quieras](/ayuda/clases/compartir-una-clase-con-otros-profesores). En el [historial](/ayuda/clases/el-historial-de-la-clase) de la original queda anotado quién sacó una copia.

## Por qué duplicar y no reutilizar

Es tentador borrar al alumnado del año pasado y volver a usar la misma clase, pero pierdes el histórico de un curso que puede que quieras consultar. Duplicando te quedas con las dos cosas: la clase del año pasado, que puedes archivar desde su tarjeta en **Mis clases** tal cual estaba, y una copia nueva lista para empezar.$itakai090$),
    ('clases', 'el-catalogo-publico-de-plantillas', 'https://s3.services.devbeply.es/help-media/itakai/v0.9.0-0275028998de/help-media/clases__el-catalogo-publico-de-plantillas/clases__el-catalogo-publico-de-plantillas-portada.webp', 'https://s3.services.devbeply.es/help-media/itakai/v0.9.0-0275028998de/help-media/clases__el-catalogo-publico-de-plantillas/clases__el-catalogo-publico-de-plantillas.mp4?v=audio-20261120', 70, '197793d14c6bd323dbcc0d50890af794', $itakai090$**Las plantillas publicadas se pueden ver sin tener cuenta.** El [catálogo público de plantillas](/plantillas) está en la página **Plantillas** de la web, enlazada desde la cabecera y el pie de la portada (en el pie, como **Plantillas de clase**). Sirve para curiosear antes de registrarse y para pasarle a quien quieras el enlace de una plantilla concreta.

## Buscar y filtrar

Arriba tienes el buscador, que busca por el nombre, y el botón **Filtros**, con cuatro filtros: **nivel**, **asignatura**, **idioma** y **provincia**. En cada uno puedes marcar varios valores, y vale cualquiera de ellos. La asignatura se desbloquea al elegir un nivel, porque cada nivel tiene las suyas.

![El catálogo público de plantillas, con el buscador y los filtros](https://s3.services.devbeply.es/help-media/itakai/v0.9.0-0275028998de/help-media/clases__el-catalogo-publico-de-plantillas/01-catalogo.webp)

De entrada salen primero las **recomendadas** (más abajo, qué son). También puedes ordenar por las más recientes o por nombre, y la **X** de **Limpiar filtros** lo deja todo como al entrar. Los resultados van por páginas.

> **Ojo con la provincia.** Es el único dato que no se pide al publicar, así que no todas la tienen. Una plantilla sin provincia no sale cuando filtras por provincia, aunque encaje en todo lo demás: si buscas algo que sirve en cualquier sitio, prueba también sin ese filtro.

## Las recomendadas

La administración de la plataforma puede marcar algunas plantillas como **Recomendadas**, para que quien llega encuentre enseguida las que merecen la pena. Llevan la etiqueta **Recomendada**, con una estrella, en su tarjeta y en su ficha, y salen las primeras: aquí y en **Mis clases → Plantillas**. Si quien la publicó la retira, pierde la recomendación.

## La ficha de una plantilla

**Ver plantilla** abre su ficha: el nombre, la portada, sus datos y, en pestañas, lo que trae.

- **Historia**: la narrativa entera.
- **Funcionalidades**: qué recursos tiene encendidos y cuáles no.
- **Misiones**: de cada una, el título, la rareza, cuántos enigmas tiene y sus recompensas. Los enunciados de los enigmas no se ven hasta importarla.
- **Tienda**: cada objeto con su precio, qué hace y si está oculto al alumnado.
- **Comportamientos**: si son positivos o negativos y qué efecto tienen.

Al lado tienes un resumen con cuántas misiones, objetos de tienda y comportamientos trae. No sale nada de quien la publicó.

![La ficha de una plantilla, en la pestaña Misiones](https://s3.services.devbeply.es/help-media/itakai/v0.9.0-0275028998de/help-media/clases__el-catalogo-publico-de-plantillas/02-ficha.webp)

## Compartir una plantilla

Cada plantilla tiene su propia dirección. **Copiar enlace**, en la cabecera de la ficha, la copia para pegarla en un correo o en un mensaje; en las tarjetas del catálogo, lo mismo hace el botón con el icono de una cadena. Quien la abra ve la misma ficha, tenga cuenta o no.

![El botón Copiar enlace de la ficha](https://s3.services.devbeply.es/help-media/itakai/v0.9.0-0275028998de/help-media/clases__el-catalogo-publico-de-plantillas/03-copiar-enlace.webp)

## Importarla

Importar es cosa del profesorado, desde el recuadro **Usar esta plantilla** de la ficha:

- **Sin haber entrado**, pulsa **Usar esta plantilla**: te lleva a entrar. Si aún no tienes cuenta, desde ahí puedes crearla; al elegir el perfil, elige **Docente**. Al terminar vuelves a la ficha con todo listo para importarla, pero no se importa nada hasta que pulses **Importar**. Ese navegador se acuerda de la plantilla durante un día.
- **Con tu cuenta de docente**, tienes directamente el botón **Importar**. Si trae misiones, encima está la casilla para importar también sus misiones, con cuántas son, marcada de entrada. Al importarla, la plataforma te lleva a tu clase nueva.
- **Con una cuenta de estudiante**, la ficha se ve igual, pero no se puede importar. Si al crear la cuenta desde **Usar esta plantilla** eliges el perfil **Estudiante**, la plataforma te avisa antes de que con esa cuenta no podrás usarla.

![Usar esta plantilla, con la casilla de las misiones y el botón Importar](https://s3.services.devbeply.es/help-media/itakai/v0.9.0-0275028998de/help-media/clases__el-catalogo-publico-de-plantillas/04-importar.webp)

Qué llega exactamente lo cuenta [crear una clase desde cero o desde una plantilla](/ayuda/clases/crear-una-clase-desde-cero-o-desde-una-plantilla).

## Si se retira

Si quien la publicó la retira o archiva su clase, deja de salir en el catálogo y su enlace avisa de que **ya no está disponible**, con un botón para volver al catálogo. Las clases que ya se importaron de ella no cambian: cada importación es una clase independiente.

Si eres tú quien publica, lo que se ve y cómo retirarla está en [publicar tu clase como plantilla](/ayuda/clases/publicar-tu-clase-como-plantilla).$itakai090$),
    ('clases', 'el-historial-de-la-clase', 'https://s3.services.devbeply.es/help-media/itakai/v0.9.0-0275028998de/help-media/clases__el-historial-de-la-clase/clases__el-historial-de-la-clase-portada.webp', 'https://s3.services.devbeply.es/help-media/itakai/v0.9.0-0275028998de/help-media/clases__el-historial-de-la-clase/clases__el-historial-de-la-clase.mp4?v=audio-20261120', 53, '5eabe62b0f9123e395408bbdf39979b8', $itakai090$La pestaña **Historial** de la clase cuenta qué ha hecho el profesorado en ella: quién, qué y cuándo. Es lo más útil cuando la clase es compartida y alguien pregunta quién cambió algo. La ve todo el profesorado de la clase, sea cual sea su nivel.

## Paso a paso

**1. Abre el historial.** Entra en la clase y pulsa la pestaña **Historial** (si no la ves, desliza las pestañas con la flecha de la derecha). Lo más reciente sale primero, y la lista va por páginas.

![La pestaña Historial de la clase](https://s3.services.devbeply.es/help-media/itakai/v0.9.0-0275028998de/help-media/clases__el-historial-de-la-clase/01-historial.webp)

**2. Despliega lo que se hizo a varios.** Lo aplicado o repartido a varios estudiantes de una vez sale en una sola línea; **Ver a quién** la despliega.

![Una recompensa a varios estudiantes, desplegada](https://s3.services.devbeply.es/help-media/itakai/v0.9.0-0275028998de/help-media/clases__el-historial-de-la-clase/02-ver-a-quien.webp)

**3. Filtra.** Arriba tienes dos filtros: el de docente, para ver solo lo de una persona (**Todo el profesorado** lo junta todo), y el de tipo, para quedarte con un tipo de cosa, como **Entregas** o **Alumnado** (**Todos los tipos** vuelve a todo). La **X** quita los filtros, y **Filtros** los muestra u oculta.

![El historial filtrado por docente y por tipo](https://s3.services.devbeply.es/help-media/itakai/v0.9.0-0275028998de/help-media/clases__el-historial-de-la-clase/03-filtros.webp)

## Qué aparece

Todo lo relevante que hace el profesorado, con su autoría: cada línea lleva el nombre y el [avatar](/ayuda/tu-cuenta/tu-avatar-de-docente) de quien lo hizo.

- **Entregas**: cada aprobación, con quien entregó, el enigma y el porcentaje.
- **Comportamientos**: los que se aplican, a quién, y los que se crean, se editan o se borran.
- **Recompensas**: las recompensas libres, con su motivo y a quién.
- **Asistencia**: cada lista que se pasa, se corrige o se borra, con la fecha y cuántas personas vinieron y cuántas no.
- **Equipos**: las agrupaciones que se crean, se editan, se archivan o se borran, los cambios de equipo y cada premio a un equipo, con sus puntos y, si se repartió, a quién.
- **Misiones**, **Enigmas**, **Pistas** y **Documentos**: altas, cambios, borrados, bloqueos, cambios de recompensas, cambios de [orden](/ayuda/misiones/el-orden-de-las-misiones) y cambios en el [camino del mapa](/ayuda/misiones/montar-el-camino-del-mapa), y las misiones [importadas de otra clase](/ayuda/misiones/importar-una-mision-de-otra-clase) o copiadas en otra.
- **Tienda**: artículos añadidos, editados o quitados.
- **Alumnado**: cuentas creadas, contraseñas restablecidas, alias cambiados, avatares devueltos al catálogo y bajas de la clase.
- **Profesorado**: altas, cambios de perfil o de nivel, bajas y salidas.
- **Clase**: cambios de datos y de ajustes, la guía, archivar y desarchivar, publicar como plantilla, la recomendación de la plantilla, duplicar, la papelera y los cambios de propiedad.

Lo que hace el alumnado por su cuenta —entregar, usar una pista, comprar en la tienda— no sale aquí: lo ves en la misión y en la tienda.

## Cuentas y estudiantes que ya no están

Si se borró la cuenta de quien hizo algo, la línea conserva el nombre y el avatar que tenía al hacerlo. Si quien aparece ya no está en la clase, no se muestra su nombre: la línea dice que era alguien del alumnado que ya no está en la clase.

## Lo que ve el alumnado

El alumnado no ve el historial, pero en su actividad ve quién le aprobó cada entrega y quién le aplicó cada comportamiento, con su avatar.$itakai090$),
    ('clases', 'elegir-que-recursos-usa-tu-clase', 'https://s3.services.devbeply.es/help-media/itakai/v0.9.0-0275028998de/help-media/clases__elegir-que-recursos-usa-tu-clase/clases__elegir-que-recursos-usa-tu-clase-portada.webp', 'https://s3.services.devbeply.es/help-media/itakai/v0.9.0-0275028998de/help-media/clases__elegir-que-recursos-usa-tu-clase/clases__elegir-que-recursos-usa-tu-clase.mp4?v=audio-20261120', 75, '4e51cec3c9060f2f66541a5fc453e36f', $itakai090$En **Ajustes** de la clase, sección **Funcionalidades**, decides con qué juega tu grupo. Cada interruptor cambia lo que ve tu alumnado y lo que se reparte al revisar entregas. Cambiarlos pide acceso de administración en la clase.

## Paso a paso

**1. Abre las funcionalidades.** Entra en la clase, abre la pestaña **Ajustes** y pulsa **Funcionalidades**.

![La sección Funcionalidades de los ajustes de la clase](https://s3.services.devbeply.es/help-media/itakai/v0.9.0-0275028998de/help-media/clases__elegir-que-recursos-usa-tu-clase/01-funcionalidades.webp)

**2. Enciende o apaga lo que quieras.** A la derecha están los recursos (experiencia, monedas, maná y vidas) y a la izquierda lo que se hace con ellos. Cada interruptor se guarda al momento, sin botón de guardar. Si apagas algo del que depende otro, el otro se apaga también y te dice qué necesita para volver.

![La tienda apagada: las monedas se apagan con ella y el maná pide la tienda](https://s3.services.devbeply.es/help-media/itakai/v0.9.0-0275028998de/help-media/clases__elegir-que-recursos-usa-tu-clase/02-tienda-apagada.webp)

**3. Comprueba la clase.** Lo que apagas desaparece de la clase en el momento: sin tienda, la pestaña **Tienda** deja de salir, también para tu alumnado.

![La clase sin la pestaña Tienda](https://s3.services.devbeply.es/help-media/itakai/v0.9.0-0275028998de/help-media/clases__elegir-que-recursos-usa-tu-clase/03-clase-sin-tienda.webp)

## Qué hace cada uno

| Interruptor | Para qué sirve |
|---|---|
| **Experiencia (XP)** | Sube de nivel. Es la columna vertebral: casi todas las clases la usan |
| **Monedas** | Se gastan en la tienda que tú montas |
| **Maná** | Paga el uso de los poderes de la tienda |
| **Vidas** | Puntos de vida que suben y bajan con los comportamientos que registras |
| **Ranking** | La clasificación del alumnado de la clase |
| **Tienda** | La pantalla donde el alumnado canjea lo que ha ganado |
| **Comportamientos** | Acciones positivas o negativas que dan o quitan recursos |
| **Efectos visuales** | Animaciones como el confeti al subir de nivel o al salir alguien en la ruleta |
| **Sonidos** | Efectos de sonido al subir de nivel, completar misiones, girar la ruleta y otros momentos |
| **Mapa de misiones** | En el apartado **En pruebas**, con la etiqueta *Beta*, y apagado de entrada: una vista más en *Misiones*, con el camino de la clase. Encendido, una misión puede pedir que se completen otras antes de abrirse. Ver [el mapa de misiones](/ayuda/misiones/el-mapa-de-misiones) |

Los rangos y los umbrales de experiencia no son un interruptor: se configuran en la sección **Niveles** de *Ajustes*. Las insignias se crean desde **Insignias**, en el menú lateral.

## Lo que va unido

Algunos ajustes solo tienen sentido con otro, y la propia pantalla lo resuelve:

- **Tienda y Monedas** van juntas: si apagas una, se apaga la otra, y al encender una se encienden las dos.
- El **Maná** necesita la **Tienda**, el **Ranking** necesita la **Experiencia** y las **Vidas** necesitan los **Comportamientos**. Si apagas el primero, el segundo se apaga y su interruptor queda bloqueado, con el aviso «Necesita…», hasta que vuelvas a encender lo que le falta.
- Los **Comportamientos** necesitan al menos un recurso activo (XP, monedas, maná o vidas), porque son lo que dan o quitan: si los apagas todos, se apagan también y quedan bloqueados.

## Efectos, sonido y movimiento

Los efectos visuales y los sonidos son de la clase, pero cada persona puede bajarlos en su dispositivo: la [ruleta](/ayuda/gamificacion/usar-la-ruleta-en-clase) tiene un botón **Sonido** que silencia la app en ese dispositivo, y quien activa **Menos animación** en la accesibilidad, o tiene su dispositivo configurado para reducir el movimiento, no ve confeti ni animaciones.

## Apagar un recurso no borra nada

Si desactivas las monedas, dejan de verse y **dejan de repartirse al revisar entregas**, aunque los enigmas tengan monedas configuradas. Los saldos que ya tuviera tu alumnado se quedan guardados: al volver a activarlas, aparecen otra vez tal cual estaban. Con el mapa de misiones pasa lo mismo: apagado, lo que pide cada misión se queda guardado, pero no cierra nada.

> Empieza corto. Una clase con experiencia y misiones ya funciona el primer día; monedas, tienda y poderes se añaden cuando el grupo ya está rodado.$itakai090$),
    ('clases', 'la-guia-de-clase', 'https://s3.services.devbeply.es/help-media/itakai/v0.9.0-0275028998de/help-media/clases__la-guia-de-clase/clases__la-guia-de-clase-portada.webp', 'https://s3.services.devbeply.es/help-media/itakai/v0.9.0-0275028998de/help-media/clases__la-guia-de-clase/clases__la-guia-de-clase.mp4?v=audio-20261120', 72, 'aeb362f2b7ebcbf698e66e30a7f8bd58', $itakai090$La **guía de clase** es un documento libre que tu alumnado puede abrir en cualquier momento desde la pestaña **Guía** de la clase. Sirve para lo que tú quieras: las reglas del juego, el contexto de la historia, cómo se puntúa, qué se espera de cada estudiante. Si creaste la clase con el asistente, ya tienes un primer borrador.

## Paso a paso

**1. Abre la guía.** Entra en la clase y pulsa la pestaña **Guía**. Ves la guía tal como la ve tu alumnado.

![La pestaña Guía de la clase](https://s3.services.devbeply.es/help-media/itakai/v0.9.0-0275028998de/help-media/clases__la-guia-de-clase/01-guia.webp)

**2. Edítala.** Pulsa sobre el texto de la guía y se abre el editor: a la izquierda escribes y a la derecha ves cómo queda. Si la clase aún no tiene guía, pulsa **Añadir guía**.

![El editor de la guía, con el texto y la vista previa](https://s3.services.devbeply.es/help-media/itakai/v0.9.0-0275028998de/help-media/clases__la-guia-de-clase/02-editor.webp)

**3. Pide ayuda a la IA (si quieres).** El botón con el nombre del asistente, en la barra del editor, abre una ventana donde le cuentas qué quieres explicar. Te devuelve un borrador y decides qué hacer con él: **Insertar al final**, **Reemplazar todo**, **Quiero cambiar algo** para pedirle otra versión o **Descartar**.

![La propuesta de la IA, con los botones para insertarla, reemplazar, pedir cambios o descartarla](https://s3.services.devbeply.es/help-media/itakai/v0.9.0-0275028998de/help-media/clases__la-guia-de-clase/03-ia.webp)

**4. Guarda.** Pulsa **Guardar**. Con **Cancelar** sales sin cambiar nada.

![La guía con el apartado nuevo, lista para guardar](https://s3.services.devbeply.es/help-media/itakai/v0.9.0-0275028998de/help-media/clases__la-guia-de-clase/04-guardar.webp)

Desde ese momento, tu alumnado ve la guía nueva en su pestaña **Guía**, con la fecha de la última actualización al final.

![La guía vista por una estudiante](https://s3.services.devbeply.es/help-media/itakai/v0.9.0-0275028998de/help-media/clases__la-guia-de-clase/05-alumna.webp)

## Cómo se escribe

El editor admite **markdown**: títulos, listas, negritas, tablas y enlaces. La barra tiene botones para lo más habitual —deshacer, negrita, cursiva, subrayado, tachado, títulos y listas— y lo que escribes se ve exactamente igual que en el resto de la plataforma.

Como con todo lo que genera la IA, lo que sale es una propuesta: la última palabra es tuya, y no se guarda nada hasta que pulsas **Guardar**.

## Qué merece la pena poner

- **Cómo se gana experiencia** en tu clase y qué la hace subir más.
- **Para qué sirven las monedas** y qué hay en la tienda.
- **Qué pasa si no entregas a tiempo.**
- El **contexto de la historia**, si la narrativa es larga.

## Y qué no

La guía no es el sitio para el temario ni para los materiales: para eso están los documentos que puedes adjuntar a cada misión, que quedan junto al contenido al que pertenecen.

La guía es solo de esta clase: no se copia al [duplicarla](/ayuda/clases/duplicar-una-clase-para-el-curso-siguiente) ni viaja en las [plantillas](/ayuda/clases/publicar-tu-clase-como-plantilla). Cambiarla pide acceso de edición en la clase.$itakai090$),
    ('clases', 'la-papelera-de-clases', 'https://s3.services.devbeply.es/help-media/itakai/v0.9.0-0275028998de/help-media/clases__la-papelera-de-clases/clases__la-papelera-de-clases-portada.webp', 'https://s3.services.devbeply.es/help-media/itakai/v0.9.0-0275028998de/help-media/clases__la-papelera-de-clases/clases__la-papelera-de-clases.mp4?v=audio-20261120', 66, '5db7b72ba9f90007ff875689eb17859b', $itakai090$**Eliminar una clase no la borra en el momento: la envía a la papelera.** Allí pasa 30 días, por si hace falta recuperarla; después se borra para siempre, con todo lo que tiene dentro.

## Enviar una clase a la papelera

**1.** En la clase, abre **Ajustes** y la sección **Gestión**. En **Eliminar clase**, pulsa **Eliminar**.

![Eliminar clase, en la sección Gestión](https://s3.services.devbeply.es/help-media/itakai/v0.9.0-0275028998de/help-media/clases__la-papelera-de-clases/01-eliminar.webp)

**2.** Revisa la lista de lo que se borrará pasados los 30 días —la clase, sus misiones, el progreso de su alumnado, las entregas, las compras y las cuentas sin correo que nunca se han usado— y pulsa **Enviar a la papelera**.

![Lo que se borrará pasados los 30 días, antes de enviar la clase a la papelera](https://s3.services.devbeply.es/help-media/itakai/v0.9.0-0275028998de/help-media/clases__la-papelera-de-clases/02-confirmar.webp)

Solo puede hacerlo quien tiene la **propiedad** de la clase: al resto del profesorado no le sale el botón. Si lo que quieres es guardarla hasta el curso que viene, no la elimines: archívala desde su tarjeta en **Mis clases**.

## Mientras está en la papelera

- El alumnado deja de verla: no puede entrar, ni entregar, ni mirar la clasificación, la guía o la tienda. Su código de invitación deja de funcionar.
- El resto del profesorado de la clase deja de tenerla en su lista.
- Si estaba publicada como plantilla, sale del catálogo.
- Todavía no se borra nada: misiones, entregas, progreso y saldos siguen ahí.

## Dónde está la papelera

En **Mis clases**, junto a las pestañas **Activas** y **Archivadas**, aparece **Papelera** con cuántas clases tienes en ella; si no hay ninguna, no sale. De cada clase ves quién la envió y cuándo, cuántos días quedan y el día en que se borrará para siempre. Cuando quedan pocos días, la cuenta atrás se destaca en rojo.

![La papelera, con la clase, cuándo se envió y cuándo se borrará](https://s3.services.devbeply.es/help-media/itakai/v0.9.0-0275028998de/help-media/clases__la-papelera-de-clases/03-papelera.webp)

## Restaurar una clase

Pulsa **Restaurar**. La clase vuelve a **Mis clases**, en **Archivadas**, tal como estaba: alumnado, misiones, entregas y saldos. Vuelve archivada a propósito, para que el alumnado no entre hasta que tú lo decidas: desarchívala desde su tarjeta cuando quieras volver a usarla. Si era una plantilla, no se publica otra vez sola.

## El aviso antes de que se borre

**Tres días antes** de que se cumpla el plazo te llega un aviso en **Avisos**, y también a tu correo si tu cuenta tiene uno, con la fecha y un enlace a la papelera. Llega una sola vez cada vez que la clase entra en la papelera, y si la restauras, el aviso desaparece.

## Borrar ya

Si no quieres esperar a los 30 días, **Borrar ya** la borra en el momento. Antes ves lo que se pierde y tienes que marcar que entiendes que no se puede recuperar; después, pulsa **Borrar para siempre**. **No tiene vuelta atrás**: después nadie puede recuperarla, tampoco la administración de la plataforma.

## Qué se borra para siempre

- La clase, con su historia, su guía, su tienda, sus comportamientos y su [historial](/ayuda/clases/el-historial-de-la-clase).
- Sus misiones, con sus enigmas, sus documentos y sus insignias.
- Lo que el alumnado tenía en ella: el progreso, las entregas con sus archivos, las compras y los saldos.
- Las cuentas sin correo creadas en esta clase que nunca se han usado. Las que sí se han usado se quedan, pero sin clase de origen: desde entonces, solo la administración de la plataforma puede restablecer su contraseña.

Lo que esta clase comparte con otras —la portada o un documento de una copia— no se borra: la otra clase lo sigue usando.

## Si quien tiene la propiedad no puede restaurarla

La administración de vuestra instancia ve la papelera de toda la plataforma en **Panel de administración → Clases**, pestaña **Papelera**, y puede restaurar o borrar ya cualquier clase. Es el respaldo para cuando quien tiene la propiedad no puede hacerlo, por ejemplo porque su cuenta está suspendida. Lo que haga queda apuntado en el historial de la clase y en el registro del sistema.

## Si borras tu cuenta

Las clases que tengas en la papelera no pasan a nadie: se borran para siempre con tu cuenta. El aviso antes de confirmar te dice cuáles son.$itakai090$),
    ('clases', 'niveles-y-perfiles-del-profesorado', 'https://s3.services.devbeply.es/help-media/itakai/v0.9.0-0275028998de/help-media/clases__niveles-y-perfiles-del-profesorado/clases__niveles-y-perfiles-del-profesorado-portada.webp', 'https://s3.services.devbeply.es/help-media/itakai/v0.9.0-0275028998de/help-media/clases__niveles-y-perfiles-del-profesorado/clases__niveles-y-perfiles-del-profesorado.mp4?v=audio-20261120', 66, '85e809a6d63a324ffaba1b48eef6fac5', $itakai090$Cada persona del profesorado de una clase tiene un **perfil** y un **nivel de acceso**. El perfil dice qué papel tiene; el nivel, qué puede hacer. Los ves en **Ajustes → Profesorado**, junto al nombre de cada persona.

![El profesorado de la clase, con el perfil y el nivel de acceso de cada persona](https://s3.services.devbeply.es/help-media/itakai/v0.9.0-0275028998de/help-media/clases__niveles-y-perfiles-del-profesorado/01-perfiles.webp)

## Los perfiles

| Perfil | Nivel con el que entra |
|---|---|
| **Titular** | Administración |
| **Sustitución** | Edición |
| **Prácticas** | Lectura |

El perfil es una etiqueta: el nivel se elige aparte y se puede cambiar cuando haga falta. Si alguien en prácticas va a llevar las misiones durante unas semanas, dale edición y déjale el perfil.

## Los niveles

Cada nivel incluye todo lo del anterior.

**Lectura.** Ve la clase entera —misiones, alumnado, asistencia, equipos, entregas, tienda, comportamientos, profesorado e historial— sin cambiar nada. Puede usar la [ruleta](/ayuda/gamificacion/usar-la-ruleta-en-clase), descargar las entregas, duplicar la clase y salir de ella. No recibe los avisos de entregas nuevas.

**Edición.** Además, cambia el contenido: la historia, la guía, el nombre, el horario y la portada de la clase; crea y edita misiones, enigmas y documentos; lleva la tienda y los comportamientos, y los aplica; da recompensas libres; [pasa lista](/ayuda/alumnado/pasar-lista-y-consultar-la-asistencia) y descarga la asistencia; forma equipos y los premia; aprueba entregas, gestiona las insignias vinculadas a las misiones de la clase y [devuelve al catálogo](/ayuda/alumnado/avatares-y-alias-por-clase) el avatar de un estudiante que no es adecuado. Le llega un aviso con cada entrega nueva.

**Administración.** Además, cambia los ajustes —funcionalidades, niveles, y la asignatura, el nivel educativo, el idioma y la provincia de *Datos generales*—, invita al alumnado, crea sus cuentas y las gestiona: restablece contraseñas, cambia alias y quita estudiantes de la clase. También lleva el profesorado y archiva la clase.

## Qué ves según tu nivel

Cada pantalla de la clase enseña solo lo que tu nivel permite: sin edición no aparece **Nueva misión**, y sin administración no aparece **Invitar**. Donde puedes mirar pero no cambiar nada, verás el aviso «Tu acceso a esta clase te deja ver esto, pero no cambiarlo».

![La clase vista con acceso de lectura, con su aviso y sin Nueva misión ni Invitar](https://s3.services.devbeply.es/help-media/itakai/v0.9.0-0275028998de/help-media/clases__niveles-y-perfiles-del-profesorado/02-lectura.webp)

## Cambiar el perfil o el nivel de alguien

**1.** En **Ajustes → Profesorado**, abre el menú **⋮** de la persona y elige **Cambiar perfil o nivel**.

**2.** Elige el **Perfil** y el **Nivel de acceso** nuevos (debajo del nivel ves qué permite) y pulsa **Guardar**.

![Cambiar el nivel de acceso de una docente a Edición](https://s3.services.devbeply.es/help-media/itakai/v0.9.0-0275028998de/help-media/clases__niveles-y-perfiles-del-profesorado/03-cambiar.webp)

Hace falta acceso de administración en la clase. Si te cambias a ti, la plataforma te avisa: si bajas tu propio acceso, puede que no puedas volver a subirlo.

A la otra persona le llega un aviso, y la clase se pone al día en cuanto lo abre: con edición, ya tiene **Nueva misión**.

![Con acceso de edición, aparece Nueva misión](https://s3.services.devbeply.es/help-media/itakai/v0.9.0-0275028998de/help-media/clases__niveles-y-perfiles-del-profesorado/04-edicion.webp)

## La propiedad de la clase

Cada clase tiene una persona **propietaria**, al principio quien la creó; en la lista lleva la etiqueta **Propiedad**. Tiene administración y es la única que puede [publicarla como plantilla](/ayuda/clases/publicar-tu-clase-como-plantilla), [enviarla a la papelera](/ayuda/clases/la-papelera-de-clases) y [pasar la propiedad](/ayuda/clases/traspasar-una-clase) a otra persona. Nadie le puede cambiar el nivel ni quitarla de la clase, y no puede salir sin pasarla antes.$itakai090$),
    ('clases', 'publicar-tu-clase-como-plantilla', 'https://s3.services.devbeply.es/help-media/itakai/v0.9.0-0275028998de/help-media/clases__publicar-tu-clase-como-plantilla/clases__publicar-tu-clase-como-plantilla-portada.webp', 'https://s3.services.devbeply.es/help-media/itakai/v0.9.0-0275028998de/help-media/clases__publicar-tu-clase-como-plantilla/clases__publicar-tu-clase-como-plantilla.mp4?v=audio-20261120', 60, '3eb7a0822672408f1113f2ed0ea3909a', $itakai090$Si has montado una clase que funciona, puedes publicarla como **plantilla** para que el resto del profesorado parta de ella. Solo puede hacerlo quien tiene la propiedad de la clase.

![El recorrido de una plantilla: publicas tu clase, aparece en el catálogo y alguien del profesorado se lleva una copia.](/app/ayuda/diagramas/flujo-plantillas.svg)

## Paso a paso

**1. Revisa los datos de la clase.** En **Ajustes → Datos generales** tienen que estar guardados la asignatura, el nivel educativo y el idioma: son lo que usa el catálogo para filtrar. La provincia es opcional, pero una plantilla sin provincia no sale cuando alguien filtra por provincia. Si falta algo, al intentar publicar la plataforma te lleva a esa sección y te dice qué guardar.

**2. Publícala.** En **Ajustes**, sección **Gestión**, enciende el interruptor **Publicar como plantilla**. Debajo del título tienes el resumen de lo que se verá y lo que no.

![El interruptor Publicar como plantilla, en la sección Gestión](https://s3.services.devbeply.es/help-media/itakai/v0.9.0-0275028998de/help-media/clases__publicar-tu-clase-como-plantilla/01-publicar.webp)

**3. Comparte el enlace (si quieres).** Mientras está publicada, junto al interruptor aparece **Copiar enlace**: copia la dirección de su ficha pública para pasársela a quien quieras, tenga cuenta o no.

![La plantilla publicada, con el botón Copiar enlace](https://s3.services.devbeply.es/help-media/itakai/v0.9.0-0275028998de/help-media/clases__publicar-tu-clase-como-plantilla/02-copiar-enlace.webp)

**4. Compruébalo en el catálogo.** Tu clase sale ya en **Mis clases → Plantillas**, con la etiqueta **Tuya**, y en el [catálogo público de plantillas](/ayuda/clases/el-catalogo-publico-de-plantillas).

![La plantilla en el catálogo del profesorado](https://s3.services.devbeply.es/help-media/itakai/v0.9.0-0275028998de/help-media/clases__publicar-tu-clase-como-plantilla/03-catalogo.webp)

Mientras está publicada, no puedes dejar sin rellenar la asignatura, el nivel o el idioma: para cambiarlos a «sin especificar», retírala antes.

## Dónde se ve

El catálogo público se abre **sin cuenta**: cualquiera puede ver la ficha de tu plantilla y compartir su enlace. El profesorado de la plataforma la tiene también en **Mis clases → Plantillas**.

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

Puedes retirar tu plantilla del catálogo cuando quieras, apagando el mismo interruptor. Una clase archivada también deja de estar en el catálogo, y una que envías a la papelera se retira. Quien abra después su enlace verá que ya no está disponible. Al retirarla pierde también la recomendación, si la tenía: si la vuelves a publicar, sale sin ella. Quien ya la haya importado se queda con su copia: importar crea una clase independiente, no un enlace a la tuya.

Si [pasas la propiedad](/ayuda/clases/traspasar-una-clase) de la clase, publicarla o retirarla pasa a ser cosa de quien la reciba.$itakai090$),
    ('clases', 'traspasar-una-clase', 'https://s3.services.devbeply.es/help-media/itakai/v0.9.0-0275028998de/help-media/clases__traspasar-una-clase/clases__traspasar-una-clase-portada.webp', 'https://s3.services.devbeply.es/help-media/itakai/v0.9.0-0275028998de/help-media/clases__traspasar-una-clase/clases__traspasar-una-clase.mp4?v=audio-20261120', 67, '2ea972ac885b9be4245eb15ad08330ee', $itakai090$Cada clase tiene una sola persona **propietaria**. Si deja el centro o la clase pasa a otra persona, puede pasarle la propiedad sin perder nada de lo que hay dentro.

## Paso a paso

**1. Abre el profesorado.** En la clase, abre **Ajustes** y la sección **Profesorado**. La persona que la va a recibir tiene que estar ya en la clase con acceso de **administración**. Si todavía no está, [añádela primero](/ayuda/clases/compartir-una-clase-con-otros-profesores); si tiene otro nivel, súbeselo antes con **Cambiar perfil o nivel**: hasta entonces, la opción no aparece.

**2. Elige Pasar la propiedad.** En el menú **⋮** de esa persona, pulsa **Pasar la propiedad**.

![El menú de la docente, con Pasar la propiedad](https://s3.services.devbeply.es/help-media/itakai/v0.9.0-0275028998de/help-media/clases__traspasar-una-clase/01-menu.webp)

**3. Confírmalo.** La ventana te resume qué cambia. Pulsa **Pasar la propiedad**.

![La confirmación antes de pasar la propiedad](https://s3.services.devbeply.es/help-media/itakai/v0.9.0-0275028998de/help-media/clases__traspasar-una-clase/02-confirmar.webp)

Solo lo puede hacer quien tiene la propiedad.

## Qué cambia

- La otra persona pasa a ser la propietaria —lleva la etiqueta **Propiedad** en la lista— y recibe un aviso.
- Tú sigues en la clase con acceso de administración.
- Dejas de poder publicarla como plantilla y de pasar la propiedad. No se puede deshacer desde tu cuenta: solo la nueva propietaria podría devolvértela.

![La nueva propietaria en la lista y, debajo, Salir de la clase](https://s3.services.devbeply.es/help-media/itakai/v0.9.0-0275028998de/help-media/clases__traspasar-una-clase/03-resultado.webp)

El alumnado, las misiones y todo lo demás siguen igual. El cambio queda en el [historial de la clase](/ayuda/clases/el-historial-de-la-clase).

## Si quieres dejar la clase

Quien tiene la propiedad no puede salir de la clase: primero tiene que pasar la propiedad. Después ya puede irse con **Salir**, en el apartado **Salir de la clase** de la misma sección.

## Si borras tu cuenta

Al borrar tu cuenta desde tu perfil, cada clase de la que tienes la propiedad pasa a otra persona con administración en ella, y antes de confirmar ves a quién va cada una. Si en alguna no hay nadie más con administración, la cuenta no se puede borrar todavía: da administración a alguien en esa clase, o pásale la propiedad, y vuelve a intentarlo.

Las clases que tengas en la [papelera](/ayuda/clases/la-papelera-de-clases) no pasan a nadie: se borran para siempre con tu cuenta, y el aviso también te dice cuáles son.$itakai090$),
    ('cuando-algo-falla', 'he-borrado-algo-sin-querer', 'https://s3.services.devbeply.es/help-media/itakai/v0.9.0-0275028998de/help-media/cuando-algo-falla__he-borrado-algo-sin-querer/cuando-algo-falla__he-borrado-algo-sin-querer-portada.webp', 'https://s3.services.devbeply.es/help-media/itakai/v0.9.0-0275028998de/help-media/cuando-algo-falla__he-borrado-algo-sin-querer/cuando-algo-falla__he-borrado-algo-sin-querer.mp4?v=audio-20261120', 57, '5ce879d436691529ff537bc24f11e297', $itakai090$Si una clase que usabas ha desaparecido, busca primero en **Mis clases**. Puede estar archivada o en la papelera.

## Recuperar una clase de la papelera

1. En el menú, entra en **Mis clases**. Abre **Papelera**, junto a **Activas** y **Archivadas**. El botón sale cuando tienes clases propias en la papelera.

   ![El acceso a Papelera junto a Activas y Archivadas](https://s3.services.devbeply.es/help-media/itakai/v0.9.0-0275028998de/help-media/cuando-algo-falla__he-borrado-algo-sin-querer/01-papelera.webp)

2. Busca la clase. La tarjeta indica cuándo se envió y cuándo se borrará definitivamente. Durante esos **30 días**, quien tiene su propiedad puede pulsar **Restaurar** para recuperarla con su alumnado, sus misiones y su progreso.

   ![La fecha de borrado y el botón Restaurar de la clase](https://s3.services.devbeply.es/help-media/itakai/v0.9.0-0275028998de/help-media/cuando-algo-falla__he-borrado-algo-sin-querer/02-restaurar.webp)

3. Vuelve a **Mis clases** y selecciona **Archivadas**. La clase vuelve a esa lista. Usa **Desarchivar clase** en su tarjeta si quieres volver a abrirla al alumnado.

   ![La clase restaurada aparece en Archivadas con el botón Desarchivar clase](https://s3.services.devbeply.es/help-media/itakai/v0.9.0-0275028998de/help-media/cuando-algo-falla__he-borrado-algo-sin-querer/03-archivadas.webp)

Si otra persona tiene la propiedad, pídele que la restaure. Quien administra la instancia también puede restaurarla desde el panel. [La papelera de clases](/ayuda/clases/la-papelera-de-clases) explica el plazo y qué ocurre al pulsar **Borrar ya**.

## Si falta otra cosa

Si compartes la clase, consulta **Historial** para ver quién hizo el cambio y cuándo. Las misiones se conservan y puedes cambiar su estado. Un enigma que ya tiene entregas se conserva para proteger el trabajo del alumnado.

La papelera se aplica a las clases. Para recuperar otros elementos eliminados o una clase después del borrado definitivo, consulta con quien administra vuestra instancia si hay una copia de seguridad. Si se quitó a alguien de la clase y vuelve a entrar con el código, empieza de cero en esa clase. El XP, las monedas y el maná que el alumnado ya recibió se conservan al eliminar el elemento que los concedió.

Antes de reorganizar un trimestre, puedes guardar una copia con [Duplicar una clase para el curso siguiente](/ayuda/clases/duplicar-una-clase-para-el-curso-siguiente).$itakai090$),
    ('cuando-algo-falla', 'la-ia-no-responde', 'https://s3.services.devbeply.es/help-media/itakai/v0.9.0-0275028998de/help-media/cuando-algo-falla__la-ia-no-responde/cuando-algo-falla__la-ia-no-responde-portada.webp', 'https://s3.services.devbeply.es/help-media/itakai/v0.9.0-0275028998de/help-media/cuando-algo-falla__la-ia-no-responde/cuando-algo-falla__la-ia-no-responde.mp4?v=audio-20261120', 66, '933f350180a3bcf9bb1a776decaac8f4', $itakai090$Si el asistente tarda, espera a que termine ese intento. Prueba de nuevo una vez si la petición falla. Comprueba si ocurre con un texto, una imagen o en ambos casos.

## Comprueba el estado del proveedor

1. Si administras la instancia, abre el **Inicio de administración**. En **Estado del sistema**, compara **IA (texto)** e **IA (imágenes)**. **No se pudo conectar con el endpoint** indica que el panel no pudo conectar con el proveedor.

   ![Estado del sistema con el aviso de conexión junto a IA (texto)](https://s3.services.devbeply.es/help-media/itakai/v0.9.0-0275028998de/help-media/cuando-algo-falla__la-ia-no-responde/01-estado.webp)

2. En **Configuración**, abre **Inteligencia artificial** y comprueba la **URL del endpoint**, la **Clave API** y el **Modelo** del servicio que falla. Revisa también si el proveedor tiene servicio y saldo. Si cambias de modelo o proveedor, prueba una vez más desde la misma pantalla en la que falló. Consulta [Configurar el proveedor de IA](/ayuda/ia-y-configuracion/configurar-el-proveedor-de-ia).

Si eres docente, indica a quien administra la instancia qué estabas intentando hacer y el aviso que apareció.

## Sigue preparando la clase

1. Entra en **Mis clases**, abre la tuya y pulsa **Guía**. Si todavía no hay texto, pulsa **Añadir guía**. Si la guía ya tiene contenido, pulsa sobre el texto para abrir el editor.

   ![El botón Añadir guía en la pestaña Guía](https://s3.services.devbeply.es/help-media/itakai/v0.9.0-0275028998de/help-media/cuando-algo-falla__la-ia-no-responde/02-guia.webp)

2. Escribe lo que quieras añadir. En el ordenador, puedes ver cómo queda a la derecha. Pulsa **Guardar** y comprueba que tu apartado aparece en la guía.

   ![El texto escrito a mano aparece en la guía guardada](https://s3.services.devbeply.es/help-media/itakai/v0.9.0-0275028998de/help-media/cuando-algo-falla__la-ia-no-responde/03-guardada.webp)

También puedes editar a mano el contenido y los enigmas de las misiones desde sus formularios.$itakai090$),
    ('cuando-algo-falla', 'las-recompensas-no-cuadran', 'https://s3.services.devbeply.es/help-media/itakai/v0.9.0-0275028998de/help-media/cuando-algo-falla__las-recompensas-no-cuadran/cuando-algo-falla__las-recompensas-no-cuadran-portada.webp', 'https://s3.services.devbeply.es/help-media/itakai/v0.9.0-0275028998de/help-media/cuando-algo-falla__las-recompensas-no-cuadran/cuando-algo-falla__las-recompensas-no-cuadran.mp4?v=audio-20261120', 70, 'd2c5ae88253d7b252008f5030402b6b3', $itakai090$Compara lo que vale el **enigma** con lo que recibió el estudiante. La misión suma varios enigmas y cada uno paga por separado cuando se aprueba su entrega.

## Comprueba lo que se paga

1. Abre la misión desde **Misiones**, o entra desde el aviso de entrega pendiente. En el enigma, pulsa **Ver entregas** y después **Valorar** junto a la entrega.

   ![La lista de entregas de un enigma con el botón Valorar](https://s3.services.devbeply.es/help-media/itakai/v0.9.0-0275028998de/help-media/cuando-algo-falla__las-recompensas-no-cuadran/01-valorar.webp)

2. Selecciona el porcentaje completado. En **Recibirá** aparece lo que se va a pagar con ese porcentaje. Por ejemplo, el **75 %** de un enigma de **40 XP** da **30 XP**. Las cantidades se redondean y, si el estudiante usó una [pista que reduce la recompensa](/ayuda/misiones/pistas-en-las-misiones), también se aplica ese descuento a lo que queda por cobrar. Comprueba el importe antes de pulsar **Aprobar**.

   ![El porcentaje y el importe calculado en Recibirá](https://s3.services.devbeply.es/help-media/itakai/v0.9.0-0275028998de/help-media/cuando-algo-falla__las-recompensas-no-cuadran/02-recibira.webp)

3. Para comprobar una aprobación que ya hiciste, abre **Historial** en la clase y elige **Entregas** en **Todos los tipos**. La línea indica quién aprobó, el porcentaje y el descuento por pistas cuando lo hay.

   ![La aprobación del enigma y su porcentaje en el Historial de la clase](https://s3.services.devbeply.es/help-media/itakai/v0.9.0-0275028998de/help-media/cuando-algo-falla__las-recompensas-no-cuadran/03-historial.webp)

En **Resumen**, **Actividad Reciente** muestra la experiencia de las últimas entregas aprobadas. La ficha de cada estudiante, en **Alumnado**, muestra sus saldos de clase. Para el proceso de revisión completo, consulta [Revisar entregas y puntuar por porcentaje](/ayuda/misiones/revisar-entregas).

## Si cambió la configuración

Solo se pagan recursos habilitados en los **Ajustes** de la clase. Activar o desactivar un recurso afecta a los pagos futuros. Las cantidades ya cobradas se conservan.

Al subir las recompensas de un enigma con entregas ya aprobadas, se abona la diferencia proporcional a lo aprobado y se mantiene el descuento que corresponda por las pistas. Los premios del enigma quedan protegidos contra reducciones una vez hay entregas aprobadas.$itakai090$),
    ('cuando-algo-falla', 'mi-alumno-no-aparece-en-la-clase', 'https://s3.services.devbeply.es/help-media/itakai/v0.9.0-0275028998de/help-media/cuando-algo-falla__mi-alumno-no-aparece-en-la-clase/cuando-algo-falla__mi-alumno-no-aparece-en-la-clase-portada.webp', 'https://s3.services.devbeply.es/help-media/itakai/v0.9.0-0275028998de/help-media/cuando-algo-falla__mi-alumno-no-aparece-en-la-clase/cuando-algo-falla__mi-alumno-no-aparece-en-la-clase.mp4?v=audio-20261120', 70, 'f51e1ed6f0b0376a46572ea50e52f8d9', $itakai090$Alguien de tu alumnado asegura que ha usado el código y no aparece en la pestaña **Alumnado** de la clase. Con el código se entra directamente, sin que nadie tenga que aceptar nada, así que casi siempre es una de estas cosas.

![La pestaña Alumnado de la clase con el buscador](https://s3.services.devbeply.es/help-media/itakai/v0.9.0-0275028998de/help-media/cuando-algo-falla__mi-alumno-no-aparece-en-la-clase/02-buscar.webp)

## No llegó a unirse

Si el código no vale, quien lo escribe ve el motivo en la ventana **Unirse a una clase** y no entra:

- **«Código de clase inválido»**: está mal copiado (la O y el cero, la I y el uno se confunden) o no es el de ninguna clase. Vuelve a dárselo con **Invitar → Copiar código**.
- **«Esta clase está archivada y no admite más estudiantes»**: le has dado el código de una clase archivada. Dale el de la clase de este curso.

Lo más rápido es pedirle que lo vuelva a intentar delante de ti y mirar qué le sale.

![La ventana Unirse a una clase con el aviso Código de clase inválido](https://s3.services.devbeply.es/help-media/itakai/v0.9.0-0275028998de/help-media/cuando-algo-falla__mi-alumno-no-aparece-en-la-clase/03-codigo-invalido.webp)

## La lista es de antes

La lista del alumnado se carga al abrir la pestaña. Si ya la tenías abierta cuando se unió, vuelve a abrir la pestaña **Alumnado** o recarga la página.

![Al volver a abrir la pestaña, la estudiante aparece en la lista de la clase](https://s3.services.devbeply.es/help-media/itakai/v0.9.0-0275028998de/help-media/cuando-algo-falla__mi-alumno-no-aparece-en-la-clase/04-recargada.webp)

## Se unió a otra de tus clases

Si tienes varios grupos, o has duplicado la clase, cada una tiene su propio código y es fácil repartir el que no toca. En **Alumnado**, en el menú de la izquierda, está todo tu alumnado con su correo, o con su usuario si no tiene correo: busca a esa persona y abre su ficha con **Ver** para ver en qué clases está.

![Alumnado, en el menú de la izquierda, con todo el alumnado de tus clases](https://s3.services.devbeply.es/help-media/itakai/v0.9.0-0275028998de/help-media/cuando-algo-falla__mi-alumno-no-aparece-en-la-clase/05-mi-alumnado.webp)

## Entró con otra cuenta

Quien tiene dos cuentas —la del centro y una personal— puede haberse unido con la que no esperas. Busca en **Alumnado** por su nombre, su correo o su usuario. Si está con una cuenta que no es la que usa en clase, pídele que entre con la buena y vuelva a escribir el código.

## Le han quitado de la clase

Si en la clase hay más docentes, alguien con administración puede haber quitado a esa persona. Míralo en la pestaña **Historial** de la clase, con el tipo **Alumnado**. Si tiene que volver, basta con que use otra vez el código; eso sí, empieza de cero.

## No tiene correo

Si no llega a entrar porque no tiene correo con el que registrarse, créale tú la cuenta: [dar de alta a estudiantes sin correo](/ayuda/alumnado/dar-de-alta-alumnos-sin-correo). Esa cuenta ya nace dentro de la clase.

## Está, pero no das con su cuenta

En la lista de la clase cada estudiante sale con el nombre de su cuenta y, debajo, con su alias de la clase, el que empieza por @. Al unirse le toca un alias mitológico al azar, así que no te fíes del alias: el buscador de la pestaña encuentra por nombre y por alias. Las cuentas que has creado tú llevan además la etiqueta **Sin correo**, y **Pendiente de entrar** mientras no hayan iniciado sesión nunca.$itakai090$),
    ('cuando-algo-falla', 'no-puedo-entrar-en-mi-cuenta', 'https://s3.services.devbeply.es/help-media/itakai/v0.9.0-0275028998de/help-media/cuando-algo-falla__no-puedo-entrar-en-mi-cuenta/cuando-algo-falla__no-puedo-entrar-en-mi-cuenta-portada.webp', 'https://s3.services.devbeply.es/help-media/itakai/v0.9.0-0275028998de/help-media/cuando-algo-falla__no-puedo-entrar-en-mi-cuenta/cuando-algo-falla__no-puedo-entrar-en-mi-cuenta.mp4?v=audio-20261120', 67, 'a65136f2226f5e5d522bff090625e5a6', $itakai090$Usa la misma forma de acceso con la que creaste la cuenta. Así vuelves a la cuenta donde están tus clases.

## Revisa cómo entras

1. En **Iniciar sesión**, comprueba el campo **Correo o usuario**. Si entras con correo y contraseña, usa el correo con el que te uniste a la clase. **Credenciales inválidas** indica que la combinación introducida no coincide.

   ![El aviso Credenciales inválidas bajo los campos de acceso](https://s3.services.devbeply.es/help-media/itakai/v0.9.0-0275028998de/help-media/cuando-algo-falla__no-puedo-entrar-en-mi-cuenta/01-credenciales.webp)

2. Si necesitas una contraseña nueva, pulsa **¿Olvidaste tu contraseña?**. En **Recuperar contraseña**, introduce el **Correo electrónico** de tu cuenta y pulsa **Enviar enlace de recuperación**. Revisa tu bandeja de entrada y correo no deseado para encontrar el enlace temporal.

   ![El formulario de recuperación con el campo de correo y el botón de envío](https://s3.services.devbeply.es/help-media/itakai/v0.9.0-0275028998de/help-media/cuando-algo-falla__no-puedo-entrar-en-mi-cuenta/02-recuperar.webp)

3. Usa **Volver al login** para regresar a la pantalla de acceso. Con tu correo y la contraseña correcta, pulsa **Iniciar sesión**. Cuando se abre tu página de inicio, puedes volver a **Mis clases**.

   ![La página de inicio que se abre al iniciar sesión con la cuenta correcta](https://s3.services.devbeply.es/help-media/itakai/v0.9.0-0275028998de/help-media/cuando-algo-falla__no-puedo-entrar-en-mi-cuenta/03-acceso.webp)

Si usaste **Google** para crear la cuenta, vuelve a entrar con ese botón. Si tu docente te dio un usuario sin correo, escríbelo en **Correo o usuario** y pídele una contraseña temporal si la olvidaste. Consulta [He olvidado mi contraseña y no tengo correo](/ayuda/si-eres-alumno/he-olvidado-mi-contrasena-y-no-tengo-correo).

## Otros avisos

- **Demasiadas peticiones.** La pantalla indica cuánto debes esperar para volver a probar.
- **Cuenta suspendida o inactiva.** Pide a quien administra vuestra instancia que compruebe si la cuenta está activa.
- **Entras y falta tu clase.** Comprueba con qué cuenta usaste el código de clase. El correo del centro y el personal pueden corresponder a dos cuentas distintas.$itakai090$),
    ('cuando-algo-falla', 'no-puedo-subir-un-archivo', 'https://s3.services.devbeply.es/help-media/itakai/v0.9.0-0275028998de/help-media/cuando-algo-falla__no-puedo-subir-un-archivo/cuando-algo-falla__no-puedo-subir-un-archivo-portada.webp', 'https://s3.services.devbeply.es/help-media/itakai/v0.9.0-0275028998de/help-media/cuando-algo-falla__no-puedo-subir-un-archivo/cuando-algo-falla__no-puedo-subir-un-archivo.mp4?v=audio-20261120', 65, '9409ba8b6c2bb17d04604382ce02f7a1', $itakai090$Las subidas fallan casi siempre por el tamaño o por el formato.

## Las entregas

En **Misiones**, abre la tarjeta de tu misión y pulsa **Entregar** junto al enigma que quieras enviar.

![El botón Entregar en el primer enigma de la misión](https://s3.services.devbeply.es/help-media/itakai/v0.9.0-0275028998de/help-media/cuando-algo-falla__no-puedo-subir-un-archivo/01-entregar.webp)

Una entrega es **un solo archivo ZIP, RAR o 7Z de 50 MB como máximo**; la ventana **Entregar enigma** lo recuerda bajo la zona de subida. Si eliges un archivo que no cumple, la ventana te dice por qué y no te deja entregar:

- **«El archivo no puede superar los 50MB»**: pesa demasiado.
- **«Solo se permiten archivos ZIP, RAR o 7Z»**: es otra cosa —un PDF suelto, una foto, un vídeo—. Mételo en un archivo comprimido.

![La ventana Entregar enigma con el aviso de que el archivo supera los 50 MB](https://s3.services.devbeply.es/help-media/itakai/v0.9.0-0275028998de/help-media/cuando-algo-falla__no-puedo-subir-un-archivo/02-demasiado-grande.webp)

Si ni comprimido baja de 50 MB, suele ser un vídeo grabado con el móvil o una presentación con muchas imágenes. Exportar un documento a PDF suele dejarlo en una fracción de lo que ocupaba; con un vídeo, pregunta a tu docente cómo prefiere recibirlo. Con un archivo que cumple, la ventana enseña su nombre y su tamaño, y ya puedes pulsar **Entregar**.

![La ventana Entregar enigma con un archivo válido elegido](https://s3.services.devbeply.es/help-media/itakai/v0.9.0-0275028998de/help-media/cuando-algo-falla__no-puedo-subir-un-archivo/03-archivo-valido.webp)

Cuando se envía, el enigma queda en revisión y se identifica con el icono de un reloj.

![El primer enigma aparece en revisión tras el envío](https://s3.services.devbeply.es/help-media/itakai/v0.9.0-0275028998de/help-media/cuando-algo-falla__no-puedo-subir-un-archivo/04-entregado.webp)

## Lo que sube el profesorado

Los materiales de una misión admiten hasta 50 MB por archivo. Las imágenes de las insignias tienen que ser PNG, JPG, SVG o WebP, de 2 MB como máximo.

## Dónde acaban los archivos

Cada instancia guarda los archivos donde tenga configurado en el panel de administración: en el disco del propio servidor o en un bucket externo. Si **ninguna** subida funciona y acabáis de cambiar esa configuración, ahí está el problema, y se ve en la propia pantalla de almacenamiento.

## Si solo le falla a una persona

Que pruebe desde otro navegador o desde otro dispositivo. Una extensión del navegador que bloquea peticiones puede cortar la subida sin decir nada.$itakai090$),
    ('cuando-algo-falla', 'un-alumno-no-ve-la-clase', 'https://s3.services.devbeply.es/help-media/itakai/v0.9.0-0275028998de/help-media/cuando-algo-falla__un-alumno-no-ve-la-clase/cuando-algo-falla__un-alumno-no-ve-la-clase-portada.webp', 'https://s3.services.devbeply.es/help-media/itakai/v0.9.0-0275028998de/help-media/cuando-algo-falla__un-alumno-no-ve-la-clase/cuando-algo-falla__un-alumno-no-ve-la-clase.mp4?v=audio-20261120', 56, '183ae3257fa4086ed53bc64b9bc2a45d', $itakai090$Alguien de tu alumnado entra, llega a su panel y la clase no está. Repasa esto en orden.

![Mis clases de la estudiante, sin ninguna clase](https://s3.services.devbeply.es/help-media/itakai/v0.9.0-0275028998de/help-media/cuando-algo-falla__un-alumno-no-ve-la-clase/01-sin-clases.webp)

## ¿Con qué cuenta ha entrado?

Es el motivo número uno. Quien tiene dos cuentas —la del centro y una personal— entra con la que no es. Pídele que mire con qué correo o con qué usuario ha iniciado sesión y compáralo con el que aparece en **Alumnado**, en tu menú. Ahí mismo ves si está en tus clases activas o en las archivadas.

![Alumnado, en el menú, con la estudiante en clases archivadas](https://s3.services.devbeply.es/help-media/itakai/v0.9.0-0275028998de/help-media/cuando-algo-falla__un-alumno-no-ve-la-clase/02-alumnado.webp)

## ¿Está en la clase de verdad?

Con el código se entra directamente, así que, si se unió, aparece en la pestaña **Alumnado** de la clase. Si no está, no llegó a unirse: pregúntale qué mensaje le salió al escribir el código. Y si estaba y ya no está, mira la pestaña **Historial** de la clase: alguien del profesorado puede haber quitado a esa persona.

## ¿La clase está archivada?

Una clase archivada desaparece de la vista del alumnado. Si acabas de archivarla para ordenar el curso, es eso. Para devolverla, ve a **Mis clases**, pulsa **Archivadas** y, en la tarjeta de la clase, pulsa el botón **Desarchivar clase** (arriba a la derecha) y confirma.

![La clase en Archivadas, con el botón para desarchivarla](https://s3.services.devbeply.es/help-media/itakai/v0.9.0-0275028998de/help-media/cuando-algo-falla__un-alumno-no-ve-la-clase/03-desarchivar.webp)

En cuanto vuelve a estar activa, a tu alumnado le aparece otra vez en **Mis clases** al recargar la página.

![La clase vuelve a aparecer en Mis clases de la estudiante](https://s3.services.devbeply.es/help-media/itakai/v0.9.0-0275028998de/help-media/cuando-algo-falla__un-alumno-no-ve-la-clase/04-clase-visible.webp)

## ¿Es de otro grupo?

Si has duplicado la clase para varios grupos, es fácil dar a alguien el código del grupo equivocado. Mira si aparece en otra de tus clases.

## Última comprobación

Si todo lo anterior está bien, que recargue la página o cierre sesión y vuelva a entrar. El panel se carga al entrar, y una sesión que lleva días abierta puede estar enseñando una lista vieja.$itakai090$),
    ('gamificacion', 'aplicar-a-varios-estudiantes', 'https://s3.services.devbeply.es/help-media/itakai/v0.9.0-0275028998de/help-media/gamificacion__aplicar-a-varios-estudiantes/gamificacion__aplicar-a-varios-estudiantes-portada.webp', 'https://s3.services.devbeply.es/help-media/itakai/v0.9.0-0275028998de/help-media/gamificacion__aplicar-a-varios-estudiantes/gamificacion__aplicar-a-varios-estudiantes.mp4?v=audio-20261120', 75, 'd5460ff67da2971142a507cbbf4b2537', $itakai090$Puedes aplicar un comportamiento, o dar una recompensa, a varios estudiantes de una vez. **Antes de aplicar ves siempre el resumen**: junto al botón **Aplicar** pone qué se aplica, a cuántas personas y cuánto mueve de cada recurso. Nada se aplica hasta que lo pulsas.

## Desde la pestaña **Comportamientos**

1. Pulsa la tarjeta del comportamiento.
2. Marca a quién se lo aplicas: uno, varios o **Todo el alumnado**; si ya has pasado lista hoy, también **Solo presentes hoy** o **Solo ausentes hoy**. Con muchas personas tienes un buscador. Con **A un equipo** se lo das a un equipo entero ([premiar a un equipo](/ayuda/gamificacion/premiar-a-un-equipo-y-ver-la-clasificacion)).
3. Revisa el resumen que sale junto al botón —por ejemplo, «Aplicar «Participa» a 12 estudiantes. Por estudiante: +10 Experiencia (XP), +5 Monedas»— y pulsa **Aplicar**.

## Desde la pestaña **Alumnado**

En el **Listado**, marca las casillas de las personas que quieras (la de la cabecera marca a todas las que se ven). Abajo aparece una barra con cuántas has elegido y dos botones: **Aplicar comportamiento** y **Dar recompensa** (y **Quitar selección**). Llevan a la misma ventana, **Aplicar a varios estudiantes**, con tu selección.

![Tres estudiantes marcados en el listado y la barra con Aplicar comportamiento y Dar recompensa](https://s3.services.devbeply.es/help-media/itakai/v0.9.0-0275028998de/help-media/gamificacion__aplicar-a-varios-estudiantes/01-seleccion.webp)

## Recompensas libres

A veces lo que quieres premiar, o corregir, no está en el catálogo. En **Qué quieres aplicar**, elige **Recompensa libre**: después eliges **Dar** o **Quitar**, cuánto de cada recurso —experiencia, monedas, maná o puntos de vida, solo los que la clase tiene activados— y escribes un **Motivo** (hasta 80 caracteres), que es lo que verá cada estudiante en su actividad. Al quitar, ningún saldo baja de cero.

![Recompensa libre con experiencia, monedas, motivo y el resumen junto al botón Aplicar](https://s3.services.devbeply.es/help-media/itakai/v0.9.0-0275028998de/help-media/gamificacion__aplicar-a-varios-estudiantes/03-recompensa.webp)

Las recompensas libres no cuentan en el «+N / −N» de comportamientos del listado.

## Todo o nada

Lo que aplicas a varios se aplica a todos o a ninguno: si algo falla, no cambia ningún saldo y puedes volver a intentarlo. Si alguien cruza un umbral de experiencia, recibe su insignia en el momento.

## En el historial

En el [historial de la clase](/ayuda/clases/el-historial-de-la-clase), lo aplicado a varios de una vez sale en una sola línea —«dio una recompensa a 3 estudiantes»— con **Ver a quién**, que se despliega para ver a quién. Cada estudiante lo ve en su actividad, con quién se lo aplicó.

![El historial con la recompensa a tres estudiantes en una sola línea, desplegada](https://s3.services.devbeply.es/help-media/itakai/v0.9.0-0275028998de/help-media/gamificacion__aplicar-a-varios-estudiantes/04-historial.webp)

## Quién puede

Aplicar comportamientos y dar recompensas pide acceso de **edición** en la clase. En una clase archivada no se aplica nada.$itakai090$),
    ('gamificacion', 'comportamientos-y-puntos-de-vida', 'https://s3.services.devbeply.es/help-media/itakai/v0.9.0-0275028998de/help-media/gamificacion__comportamientos-y-puntos-de-vida/gamificacion__comportamientos-y-puntos-de-vida-portada.webp', 'https://s3.services.devbeply.es/help-media/itakai/v0.9.0-0275028998de/help-media/gamificacion__comportamientos-y-puntos-de-vida/gamificacion__comportamientos-y-puntos-de-vida.mp4?v=audio-20261120', 79, 'f8a0d6205bd060fc40bae211e446e8ad', $itakai090$Los comportamientos son la forma de que lo que ocurre en el aula —para bien y para mal— tenga efecto en la partida.


![Ejemplos de comportamientos que suman puntos de vida y de comportamientos que los restan.](/app/ayuda/diagramas/vidas.svg)
## Cómo funcionan

Defines una lista de comportamientos para tu clase en su pestaña **Comportamientos**. Cada uno tiene un nombre, si es **positivo** (pulgar arriba) **o negativo** (pulgar abajo), y cuánto mueve de cada recurso: experiencia, monedas, maná y puntos de vida (de los que la clase tenga activados). Crearlos y aplicarlos pide acceso de edición en la clase.

![La pestaña Comportamientos con el catálogo de la clase](https://s3.services.devbeply.es/help-media/itakai/v0.9.0-0275028998de/help-media/gamificacion__comportamientos-y-puntos-de-vida/01-catalogo.webp)

## Crear un comportamiento

1. En la pestaña **Comportamientos**, pulsa **Nuevo comportamiento**. Si prefieres partir de ideas hechas, **Biblioteca** te propone comportamientos sugeridos que añades de un toque.
2. Elige el **Tipo**: **Positivo** o **Negativo**.
3. Escribe el **Nombre** y, si quieres, una **Descripción**.
4. En **Impactos**, pon cuánto mueve de cada recurso. Se escribe la cantidad sin signo: el tipo decide si suma o resta.
5. Pulsa **Crear**. Aparece al momento en el catálogo; para cambiarlo o borrarlo, usa el lápiz de su tarjeta.

![El formulario Nuevo comportamiento con el tipo, el nombre y los impactos](https://s3.services.devbeply.es/help-media/itakai/v0.9.0-0275028998de/help-media/gamificacion__comportamientos-y-puntos-de-vida/02-nuevo.webp)

Ejemplos que suelen funcionar: «ayuda a alguien de clase» (+15 XP, +5 monedas), «trae el material» (+10 XP), «interrumpe la clase» (−10 puntos de vida).

## Aplicarlo

1. Pulsa la tarjeta del comportamiento.
2. Marca a quién: una persona, varias o **Todo el alumnado** (con **A un equipo** se lo das a un equipo entero).
3. Junto al botón **Aplicar** ves el resumen —a cuántas personas y cuánto mueve a cada una—. Pulsa **Aplicar**.

![Ventana de aplicar con dos estudiantes elegidos y el resumen junto al botón Aplicar](https://s3.services.devbeply.es/help-media/itakai/v0.9.0-0275028998de/help-media/gamificacion__comportamientos-y-puntos-de-vida/04-resumen-aplicar.webp)

También puedes elegir estudiantes en la pestaña **Alumnado** y darles una recompensa libre con su motivo, sin pasar por el catálogo: lo tienes en [Aplicar comportamientos y recompensas a varios estudiantes](/ayuda/gamificacion/aplicar-a-varios-estudiantes).

## Los puntos de vida

Cada estudiante empieza con 100 y se mueven solo con los comportamientos y las recompensas libres. No bloquean nada por sí solos: son un termómetro visible, y lo que hagas cuando alguien baje mucho es cosa tuya. Hay docentes que montan un poder en la tienda para recuperarlos, y así el sistema se cierra sobre sí mismo.

## Consejos de uso

- **Pocos y claros.** Con seis u ocho comportamientos bien elegidos se cubre casi todo el curso.
- **Que se vea.** Aplicarlo en el momento y en voz alta es la mitad del efecto.
- **Cuidado con lo negativo.** Un sistema que solo resta se convierte en un castigo con otro nombre.

## El registro

Todo lo aplicado queda con fecha, con quién lo aplicó y sobre quién. Lo ves en la pestaña **Historial** de la clase, con el tipo **Comportamientos** ([el historial de la clase](/ayuda/clases/el-historial-de-la-clase)), y en el **Historial** de la página de cada estudiante en la clase. Cada estudiante también ve en su actividad quién se lo aplicó.

![El historial de la clase filtrado por Comportamientos](https://s3.services.devbeply.es/help-media/itakai/v0.9.0-0275028998de/help-media/gamificacion__comportamientos-y-puntos-de-vida/05-historial.webp)$itakai090$),
    ('gamificacion', 'insignias', 'https://s3.services.devbeply.es/help-media/itakai/v0.9.0-0275028998de/help-media/gamificacion__insignias/gamificacion__insignias-portada.webp', 'https://s3.services.devbeply.es/help-media/itakai/v0.9.0-0275028998de/help-media/gamificacion__insignias/gamificacion__insignias.mp4?v=audio-20261120', 69, '952327491037e9c57f0eb414f5906927', $itakai090$Las insignias son el reconocimiento visible de algo conseguido. A diferencia de la experiencia o las monedas, no se gastan ni se pierden: se quedan en el perfil de cada estudiante dentro de esa clase.

## Cómo se ganan

Una insignia se asocia a una **misión**. Cuando alguien completa esa misión —todos sus enigmas obligatorios aprobados— la insignia entra en su colección automáticamente, junto con el bonus de experiencia por rareza.

## Tus insignias y las de ITAKAI

En **Insignias**, en el menú de la izquierda, tienes en una sola lista las insignias que has creado (y las de las misiones que puedes editar) y las **insignias de ITAKAI**. Estas vienen con la plataforma y se conceden solas según el progreso de cada estudiante: al llegar a un nivel, al completar un número de misiones o al reunir cierta XP en una clase. No se pueden editar; al pulsar una ves cómo se gana. El buscador y los **Filtros** actúan sobre todas.

![Mis insignias, con las insignias de ITAKAI](https://s3.services.devbeply.es/help-media/itakai/v0.9.0-0275028998de/help-media/gamificacion__insignias/01-insignias.webp)

## Crear una

1. Pulsa **Nueva insignia**.
2. Elige la **Misión asociada**. La insignia toma la rareza de la misión.

   ![El desplegable Misión asociada de la nueva insignia](https://s3.services.devbeply.es/help-media/itakai/v0.9.0-0275028998de/help-media/gamificacion__insignias/02-mision.webp)

3. Escribe el **Nombre** y, si quieres, una **Descripción** de por qué se consigue.
4. Pulsa **Subir imagen** y elige la imagen (PNG, JPG o WebP, hasta 2 MB).
5. Comprueba la **Vista previa** y pulsa **Crear insignia**.

![La nueva insignia con su misión, nombre, descripción, imagen y vista previa](https://s3.services.devbeply.es/help-media/itakai/v0.9.0-0275028998de/help-media/gamificacion__insignias/03-nueva-insignia.webp)

La insignia aparece la primera en la lista. Al pulsarla la ves en grande y, con **Editar**, la cambias.

![La insignia creada, la primera de Mis insignias](https://s3.services.devbeply.es/help-media/itakai/v0.9.0-0275028998de/help-media/gamificacion__insignias/04-tus-insignias.webp)

Una insignia sin misión no se entrega a nadie: queda guardada hasta que la vincules a una.

## En una clase compartida

Una insignia vinculada a una misión es de su clase: la puede cambiar cualquiera con acceso de edición en ella. Las que no tienen misión son solo de quien las creó.

## Dónde se ven

En el perfil de cada estudiante dentro de la clase, en su pantalla de insignias, y en las tarjetas de misión completada. Las que todavía no ha ganado aparecen bloqueadas, con su descripción visible: saber lo que falta es parte del incentivo.

## Cuántas poner

Una por misión importante, no una por misión. Si todas las misiones dan insignia, la colección deja de significar nada; si solo la dan las grandes, conseguir una es una noticia.$itakai090$),
    ('gamificacion', 'monedas-y-tienda-de-clase', 'https://s3.services.devbeply.es/help-media/itakai/v0.9.0-0275028998de/help-media/gamificacion__monedas-y-tienda-de-clase/gamificacion__monedas-y-tienda-de-clase-portada.webp', 'https://s3.services.devbeply.es/help-media/itakai/v0.9.0-0275028998de/help-media/gamificacion__monedas-y-tienda-de-clase/gamificacion__monedas-y-tienda-de-clase.mp4?v=audio-20261120', 91, 'd5878e8904782a65906f05e6cff98c8d', $itakai090$La tienda es donde lo que el alumnado gana se convierte en algo que le importa. La montas tú, artículo a artículo, y decides los precios.

## Abrir la tienda de la clase

En **Mis clases**, abre la clase y pulsa la pestaña **Tienda**. Una clase nueva ya trae unos cuantos artículos de ejemplo (una pista de examen, una prórroga, una poción de vida…) que puedes cambiar o borrar, y en **Biblioteca** tienes más ideas listas para añadir.

![La clase con la pestaña Tienda](https://s3.services.devbeply.es/help-media/itakai/v0.9.0-0275028998de/help-media/gamificacion__monedas-y-tienda-de-clase/01-pestana-tienda.webp)

## Dos tipos de artículo

**Recompensas** (icono de regalo). Cosas que se canjean: «saltar una pregunta del examen», «elegir la música de la sesión», «un día sin deberes». Al comprarla, quien la compra gasta las monedas, y cuando la canjea a ti te queda constancia en el historial para cumplir tu parte.

Una recompensa puede ser **de un solo uso** —se canjea una vez y desaparece de su lista— o **ilimitada**, que se puede volver a comprar tantas veces como quiera pagar. Las ilimitadas llevan la etiqueta **Ilimitado** en su tarjeta.

**Poderes** (icono de rayo). Se compran con monedas pero además **cuestan maná cada vez que se usan**: el coste en maná aparece en la tarjeta junto al precio. Sirven para efectos que se repiten: recuperar puntos de vida, una pista, un intento extra. Cada estudiante acumula cargas y las va gastando.

![Recompensas con el icono de regalo y poderes con el rayo y su coste en maná](https://s3.services.devbeply.es/help-media/itakai/v0.9.0-0275028998de/help-media/gamificacion__monedas-y-tienda-de-clase/02-articulos.webp)

La «pista» de la tienda la das tú a mano cuando alguien la usa. Las [pistas de una misión](/ayuda/misiones/pistas-en-las-misiones) son otra cosa: las escribes en la misión y la plataforma las abre y las cobra sola. Puedes tener las dos.

## Añadir un artículo

1. Pulsa **Nuevo artículo**.
2. Escribe el **Nombre** y, si quieres, una **Descripción** de lo que se obtiene.
3. Elige el **Precio** en monedas: pulsa uno de los valores sugeridos o escribe el tuyo.
4. Elige el **Tipo**: **Recompensa** o **Poder**. En una recompensa eliges el **Uso** (**Un solo uso** o **Ilimitado**); en un poder, el **Coste en maná (al usar)**.
5. Si el artículo devuelve puntos de vida, indícalo en **Vida que recupera** (0 si no recupera).
6. Deja activado **Visible para el alumnado** y pulsa **Crear**.

![El formulario Nuevo artículo con una recompensa ilimitada](https://s3.services.devbeply.es/help-media/itakai/v0.9.0-0275028998de/help-media/gamificacion__monedas-y-tienda-de-clase/03-nuevo-articulo.webp)

El artículo aparece al momento en la tienda, y el alumnado lo ve en la suya.

![La recompensa nueva en la tienda, con la etiqueta Ilimitado](https://s3.services.devbeply.es/help-media/itakai/v0.9.0-0275028998de/help-media/gamificacion__monedas-y-tienda-de-clase/04-articulo-creado.webp)

## Poner precios

No hay tabla correcta, pero sí una regla útil: mira cuántas monedas reparte una misión completa y calcula cuántas misiones quieres que cueste cada cosa. Si una misión da 60 monedas y quieres que la recompensa buena cueste «tres misiones», son 180.

## El historial

Cada compra y cada uso quedan registrados con su fecha y con quién lo hizo. Lo tienes en el botón **Historial** de la pestaña **Tienda**, separado en **Compras** y **Usos**, y cada estudiante tiene el suyo en su tienda. Es lo que evita las discusiones de «yo ya lo había canjeado».

![El historial de la tienda con las compras y los usos del alumnado](https://s3.services.devbeply.es/help-media/itakai/v0.9.0-0275028998de/help-media/gamificacion__monedas-y-tienda-de-clase/05-historial.webp)

## Si no quieres tienda

Es perfectamente válido. En **Ajustes → Funcionalidades** de la clase apaga **Tienda** (y, si tampoco las quieres, **Monedas**) y la pantalla desaparece para todo el mundo.

![Ajustes de la clase, Funcionalidades, con el interruptor de la Tienda](https://s3.services.devbeply.es/help-media/itakai/v0.9.0-0275028998de/help-media/gamificacion__monedas-y-tienda-de-clase/06-apagar-tienda.webp)$itakai090$),
    ('gamificacion', 'niveles-y-rangos', 'https://s3.services.devbeply.es/help-media/itakai/v0.9.0-0275028998de/help-media/gamificacion__niveles-y-rangos/gamificacion__niveles-y-rangos-portada.webp', 'https://s3.services.devbeply.es/help-media/itakai/v0.9.0-0275028998de/help-media/gamificacion__niveles-y-rangos/gamificacion__niveles-y-rangos.mp4?v=audio-20261120', 68, 'a86fa8a8578600de3450ecc79eb69b31', $itakai090$El nivel es la traducción de la experiencia acumulada en un número visible, y el rango es el título que lo acompaña.


![La barra de experiencia con sus niveles: al alcanzar ciertos niveles cambia el rango de cada estudiante.](/app/ayuda/diagramas/xp-nivel.svg)
## Dónde se configuran

En la clase, entra en **Ajustes → Niveles**. Ahí tienes dos bloques: la **Curva de experiencia** y los **Rangos**. Cuando termines, pulsa **Guardar niveles**.

![Ajustes de la clase con el apartado Niveles](https://s3.services.devbeply.es/help-media/itakai/v0.9.0-0275028998de/help-media/gamificacion__niveles-y-rangos/01-ajustes-niveles.webp)

## Cuánta experiencia hace falta

En **Curva de experiencia** decides el **Número de niveles** (50 por defecto), la **XP del primer nivel** y **Cómo se gana la XP**: **Por fórmula**, con un **Ritmo de subida** **Lento**, **Normal** o **Rápido**, o **Manual (por nivel)**, escribiendo tú la XP de cada nivel. La tabla de debajo te dice cuánta XP total hace falta para llegar a los niveles 10, 25 y 50 con cada ritmo.

Los umbrales suben progresivamente: los primeros niveles caen rápido y los últimos cuestan. Es a propósito, para que el arranque enganche y el final tenga recorrido durante todo el curso.

![La curva de experiencia con el número de niveles, la XP del primer nivel, el ritmo y la tabla de XP por nivel](https://s3.services.devbeply.es/help-media/itakai/v0.9.0-0275028998de/help-media/gamificacion__niveles-y-rangos/02-curva.webp)

Si al mes de empezar tu grupo ya está en nivel 20, es señal de que las recompensas de los enigmas van altas para el ritmo de tu clase. Puedes poner un ritmo más lento sin tocar las misiones.

## Los rangos por defecto

| Niveles | Título |
|---|---|
| 1 – 4 | Mortal |
| 5 – 9 | Héroe Novato |
| 10 – 14 | Héroe de Bronce |
| 15 – 19 | Héroe de Plata |
| 20 – 24 | Héroe de Oro |
| 25 – 29 | Semidiós |
| 30 – 34 | Titán |
| 35 – 39 | Olímpico Menor |
| 40 – 44 | Olímpico Mayor |
| 45 – 49 | Avatar Divino |
| 50 | Dios del Olimpo |

Cada rango tiene su color, que es el que se ve en la clasificación y en el nivel de cada estudiante en el listado del alumnado; al pasar el ratón por encima sale su título.

## Cambiarlos en tu clase

En **Rangos**, cada fila es un tramo: su color, su título y los niveles que abarca (**Del** … **al** …). Cambia lo que quieras, añade tramos con **Añadir rango**, borra con la papelera o vuelve a los de siempre con **Restaurar por defecto**, y pulsa **Guardar niveles**. Si tu narrativa no es mitológica, cambiar «Semidiós» por lo que encaje en tu historia es de las cosas que más se notan por poco esfuerzo.

![Los rangos con los dos primeros títulos cambiados a Grumete y Marinero](https://s3.services.devbeply.es/help-media/itakai/v0.9.0-0275028998de/help-media/gamificacion__niveles-y-rangos/03-rangos.webp)

## Al subir de nivel

El alumnado ve una animación de subida de nivel al entrar. Si prefieres una clase más sobria, en el perfil de cada cuenta se pueden [reducir las animaciones](/ayuda/tu-cuenta/accesibilidad).$itakai090$),
    ('gamificacion', 'premiar-a-un-equipo-y-ver-la-clasificacion', 'https://s3.services.devbeply.es/help-media/itakai/v0.9.0-0275028998de/help-media/gamificacion__premiar-a-un-equipo-y-ver-la-clasificacion/gamificacion__premiar-a-un-equipo-y-ver-la-clasificacion-portada.webp', 'https://s3.services.devbeply.es/help-media/itakai/v0.9.0-0275028998de/help-media/gamificacion__premiar-a-un-equipo-y-ver-la-clasificacion/gamificacion__premiar-a-un-equipo-y-ver-la-clasificacion.mp4?v=audio-20261120', 67, '2b51247959d830a86866835eaad8777c', $itakai090$Premiar a un equipo hace dos cosas, y eliges cuáles antes de aplicar: **suma puntos a su marcador** y, si quieres, **reparte a cada integrante** un comportamiento o una recompensa.

## Premiar

1. En **Alumnado → Equipos**, pulsa **Premiar** en el equipo. También puedes hacerlo desde la tarjeta de un comportamiento, en **Comportamientos**, eligiendo **A un equipo**.

   ![Los equipos de la clase con su marcador y el botón Premiar](https://s3.services.devbeply.es/help-media/itakai/v0.9.0-0275028998de/help-media/gamificacion__premiar-a-un-equipo-y-ver-la-clasificacion/01-equipos.webp)

2. En la ventana **Premiar a un equipo**, el equipo ya viene marcado (puedes cambiarlo). En **Qué quieres aplicar**, elige un **Comportamiento** o una **Recompensa libre** con su motivo.
3. Escribe los **Puntos para el marcador** (10 de entrada). Si lo que aplicas resta (un comportamiento negativo o **Quitar**), los puntos también restan. Pon 0 si solo quieres repartir.
4. Deja marcado **Repartir también a cada integrante** si quieres que cada persona del equipo reciba el comportamiento o la recompensa, como si se lo aplicaras por separado. Desmárcalo para dar solo puntos.
5. Revisa el resumen que sale junto al botón —por ejemplo, «Equipo «Las Cariátides»: +10 puntos en el marcador. Y «Ayuda a la tripulación» a sus 2 integrantes»— y pulsa **Aplicar**.

![Premiar a un equipo con un comportamiento, los puntos para el marcador y el resumen junto a Aplicar](https://s3.services.devbeply.es/help-media/itakai/v0.9.0-0275028998de/help-media/gamificacion__premiar-a-un-equipo-y-ver-la-clasificacion/02-premiar.webp)

Todo se apunta a la vez: o se hace entero, o no se hace nada. En el historial de la clase sale en una sola línea, con el reparto dentro.

## El marcador y la clasificación

El marcador de un equipo es la suma de los puntos de sus premios, no la XP de sus integrantes: no cambia si mueves a alguien de equipo, y no favorece a los equipos más grandes.

El ranking de **Equipos** usa las agrupaciones **de base**. Puedes abrirlo desde [**Alumnado → Ranking**](/ayuda/alumnado/clasificacion-y-progreso), en el bloque **Clasificación de equipos**, en cuanto hay una agrupación de base y alguien de la clase ha entrado ya en itakai (la clasificación no cuenta a quien aún no ha entrado nunca). Tu alumnado lo ve en su pestaña **Ranking** si la clase tiene el ranking encendido y el tipo **Equipos** también, en *Ajustes → Funcionalidades*: todos los equipos, en cualquier modo, y de los demás, solo el nombre y los puntos.

![La clasificación de equipos en Alumnado, Ranking](https://s3.services.devbeply.es/help-media/itakai/v0.9.0-0275028998de/help-media/gamificacion__premiar-a-un-equipo-y-ver-la-clasificacion/03-clasificacion.webp)

## Misiones por equipos

En los **Ajustes** de una misión, **Por equipos** dice con qué agrupación se hace. El alumnado lo ve en la misión, con su equipo. Cada estudiante sigue entregando lo suyo; lo que cambia es la revisión: al calificar una entrega, **Aprobar al equipo** aprueba con el mismo porcentaje la entrega pendiente de cada integrante de ese equipo. Cada aprobación da sus recompensas y avisa como siempre.

## Quién puede qué

Premiar equipos es de quien tiene **edición** en la clase. En una clase archivada no se premia a nadie.$itakai090$),
    ('gamificacion', 'usar-la-ruleta-en-clase', 'https://s3.services.devbeply.es/help-media/itakai/v0.9.0-0275028998de/help-media/gamificacion__usar-la-ruleta-en-clase/gamificacion__usar-la-ruleta-en-clase-portada.webp', 'https://s3.services.devbeply.es/help-media/itakai/v0.9.0-0275028998de/help-media/gamificacion__usar-la-ruleta-en-clase/gamificacion__usar-la-ruleta-en-clase.mp4?v=audio-20261120', 78, '61447bc6e21a6614e080259678c1b74c', $itakai090$La ruleta elige a alguien al azar delante de la clase, para salir a la pizarra, leer en voz alta o empezar una ronda. Se abre con el botón **Ruleta**, arriba en la página de la clase, y ocupa toda la ventana para que se vea bien en el proyector.

![La clase con el botón Ruleta en la cabecera](https://s3.services.devbeply.es/help-media/itakai/v0.9.0-0275028998de/help-media/gamificacion__usar-la-ruleta-en-clase/01-ruleta.webp)

## Girar

Pulsa **Girar**, o la barra espaciadora o Intro. Junto a la rueda sale quien ha tocado («Ha salido») y, para volver a girar, **Girar otra vez**. En la rueda se ve el alias de cada estudiante en la clase o, si no tiene, su nombre; nunca nada sacado de su correo. En la lista de la derecha, debajo de cada alias, ves su nombre. Cada nombre se ajusta al hueco de su sector, en una o dos líneas. Con muchas personas, si alguno no cabe entero, en la rueda sale recortado y en el resultado, completo.

![La ruleta con la persona que ha salido y los botones Girar otra vez y Aplicar a](https://s3.services.devbeply.es/help-media/itakai/v0.9.0-0275028998de/help-media/gamificacion__usar-la-ruleta-en-clase/02-resultado.webp)

**Pantalla completa** quita además los bordes del navegador, y **Salir** te devuelve a la clase. En algunos móviles no hay pantalla completa, pero la ruleta ya ocupa toda la ventana.

## Sin repetir

**Sin repetir** viene activado: quien ya ha salido no vuelve a salir hasta que pulses **Empezar de nuevo**, y en la lista aparece tachado, con «Ya ha salido». Se recuerda en ese dispositivo, para esa clase y durante el día; al día siguiente empieza una ronda nueva. Con **Quitar**, al lado de cada nombre, dejas a alguien fuera solo en esta ronda, y con **Volver a poner** vuelve a entrar. Arriba, **En la rueda** te dice cuántas personas quedan.

## Quien falta hoy no sale

Si hoy ya has [pasado lista](/ayuda/alumnado/pasar-lista-y-consultar-la-asistencia), quien está ausente o con falta justificada no entra en la rueda. Como la pantalla la ve toda la clase, solo se dice cuántas personas faltan, nunca quiénes. Si aún no has pasado lista, entra todo el alumnado y se avisa, con un enlace para pasarla.

![El panel Estudiantes con el aviso de quien falta hoy y Sin repetir](https://s3.services.devbeply.es/help-media/itakai/v0.9.0-0275028998de/help-media/gamificacion__usar-la-ruleta-en-clase/02-lista.webp)

## Con equipos

Si la clase tiene [equipos](/ayuda/alumnado/formar-equipos), en el recuadro **Estudiantes**, encima de la lista, eliges:

- **Toda la clase**.
- **Un equipo**: solo sus integrantes que han venido.
- **Entre equipos**: los sectores son los equipos de una **Agrupación**. Cuando sale uno, **Girar dentro de…** pasa a girar entre sus integrantes.

![La ruleta en modo Entre equipos, con las tripulaciones](https://s3.services.devbeply.es/help-media/itakai/v0.9.0-0275028998de/help-media/gamificacion__usar-la-ruleta-en-clase/04-entre-equipos.webp)

## Después del giro

Girar no da ni quita nada, y no se apunta en el historial. Si quieres premiar a quien ha salido, **Aplicar a…** (o **Premiar a…**, si ha salido un equipo) abre la misma ventana que la de [aplicar a varios estudiantes](/ayuda/gamificacion/aplicar-a-varios-estudiantes), con un comportamiento o una recompensa libre; a quien ha salido se le aplica al pulsar **Aplicar**, sin más pasos. Eso sí queda en el historial.

![Aplicar el comportamiento Participa a quien ha salido en la ruleta](https://s3.services.devbeply.es/help-media/itakai/v0.9.0-0275028998de/help-media/gamificacion__usar-la-ruleta-en-clase/03-aplicar.webp)

## Sonido y movimiento

Si la clase tiene activados los sonidos, la rueda suena al girar, y el botón **Sonido** la silencia en ese dispositivo. Con los efectos visuales activados, sale confeti con cada resultado. Si tienes activada **Menos animación** en la accesibilidad, o tu dispositivo pide menos movimiento, la rueda no gira: sale «Eligiendo…» un momento y después el resultado, sin confeti. Con lector de pantalla, cada resultado se anuncia una sola vez.

## Quién puede qué

Girar la ruleta lo puede hacer todo el profesorado de la clase, también el de prácticas. Aplicar algo a quien sale es de quien tiene **edición**, y en una clase archivada no se aplica nada.$itakai090$),
    ('ia-y-configuracion', 'almacenamiento-de-archivos', 'https://s3.services.devbeply.es/help-media/itakai/v0.9.0-0275028998de/help-media/ia-y-configuracion__almacenamiento-de-archivos/ia-y-configuracion__almacenamiento-de-archivos-portada.webp', 'https://s3.services.devbeply.es/help-media/itakai/v0.9.0-0275028998de/help-media/ia-y-configuracion__almacenamiento-de-archivos/ia-y-configuracion__almacenamiento-de-archivos.mp4?v=audio-20261120', 70, '8bbb73cfe5c64f9a650648329b39683c', $itakai090$Todo lo que se sube a la plataforma —entregas del alumnado, portadas de misión, insignias, avatares— tiene que guardarse en algún sitio. Se elige desde **Panel de administración → Configuración → Almacenamiento**.

## Las dos opciones

**Disco local.** Los archivos se guardan en el propio servidor. Es lo más simple y lo que viene por defecto: no hay que configurar nada ni contratar nada. A cambio, el espacio es el del servidor y las copias de seguridad son tu responsabilidad.

**Bucket compatible con S3.** Amazon S3, Cloudflare R2 o cualquier servicio compatible. Los archivos salen del servidor, el espacio deja de ser un problema y el proveedor se encarga de la redundancia.

## Qué hace falta para el bucket

- El **endpoint** del servicio y la **región**.
- El **nombre del bucket**.
- La **clave de acceso** y su secreto, que se guardan cifrados.
- La **URL pública** del bucket, si sirves los archivos por un dominio propio.

## Cambiar de uno a otro

El cambio afecta a lo que se suba **a partir de ese momento**. Los archivos que ya estuvieran en disco siguen sirviéndose desde disco, así que no se rompe nada, pero conviene planificar la migración si quieres que todo acabe en el mismo sitio.

## En instancias auto-hospedadas

Si tienes tu propia instancia, el disco local suele ser suficiente para un centro. El bucket empieza a compensar cuando hay varios centros o cuando las entregas incluyen vídeo.

## Elegir el destino de los archivos

1. En el **Panel de administración**, entra en **Configuración** y baja a **Almacenamiento**. **Disco local (por defecto)** guarda los archivos en el servidor.
   ![La sección Almacenamiento con Disco local seleccionado](https://s3.services.devbeply.es/help-media/itakai/v0.9.0-0275028998de/help-media/ia-y-configuracion__almacenamiento-de-archivos/01-almacenamiento.webp)
2. Selecciona **Externo S3 / Cloudflare R2** para introducir el **Endpoint**, el **Bucket**, la **Región**, el **Access Key ID** y el **Secret Access Key**. Si usas un dominio propio para servir los archivos, completa también **URL pública base**.
   ![El formulario de almacenamiento externo con los campos del bucket](https://s3.services.devbeply.es/help-media/itakai/v0.9.0-0275028998de/help-media/ia-y-configuracion__almacenamiento-de-archivos/02-bucket.webp)
3. Con Cloudflare R2, revisa **Usar path-style (recomendado para R2)**. Cuando estén completos los datos de tu proveedor, pulsa **Guardar cambios**.$itakai090$),
    ('ia-y-configuracion', 'configurar-el-proveedor-de-ia', 'https://s3.services.devbeply.es/help-media/itakai/v0.9.0-0275028998de/help-media/ia-y-configuracion__configurar-el-proveedor-de-ia/ia-y-configuracion__configurar-el-proveedor-de-ia-portada.webp', 'https://s3.services.devbeply.es/help-media/itakai/v0.9.0-0275028998de/help-media/ia-y-configuracion__configurar-el-proveedor-de-ia/ia-y-configuracion__configurar-el-proveedor-de-ia.mp4?v=audio-20261120', 65, 'c3a765f0f615a9d5f7c84fe886bba70a', $itakai090$La inteligencia artificial se configura una vez, para toda la instancia, desde **Panel de administración → Configuración**, en el bloque **Inteligencia artificial**. Sirve cualquier proveedor con una API compatible con la de OpenAI: OpenAI, un servidor propio, Groq, Together, OpenRouter, Gemini por su endpoint compatible…

## Paso a paso

**1. Abre la configuración.** En el panel de administración, pulsa **Configuración** en el menú. El primer bloque es **Inteligencia artificial**.

![El bloque Inteligencia artificial de la configuración](https://s3.services.devbeply.es/help-media/itakai/v0.9.0-0275028998de/help-media/ia-y-configuracion__configurar-el-proveedor-de-ia/01-ia.webp)

**2. Rellena el proveedor de texto.** En **Texto**: la **URL del endpoint**, la **Clave API** y el **Modelo**. Es lo que genera narrativas, misiones, enigmas y las respuestas del asistente. En **Razonamiento** eliges cuánto piensa el modelo antes de responder: más razonamiento da respuestas más elaboradas, pero tarda y cuesta más; **Bajo (recomendado)** va bien para casi todo, y si el proveedor no lo admite, se deja de mandar solo.

**3. Rellena el proveedor de imágenes.** En **Imágenes**, los mismos tres datos para las portadas, las insignias y los avatares. Puede ser un proveedor distinto del de texto.

**4. Guarda.** Pulsa **Guardar cambios**, al final del bloque. Sale el aviso «Configuración guardada».

![La clave nueva puesta y el botón Guardar cambios](https://s3.services.devbeply.es/help-media/itakai/v0.9.0-0275028998de/help-media/ia-y-configuracion__configurar-el-proveedor-de-ia/02-guardar.webp)

## Las claves

Se guardan **cifradas** en la base de datos. En este panel, que solo ve la administración, se ven completas: no compartas capturas de esta pantalla. Si necesitas cambiar una clave, borra la anterior y pon la nueva.

## Comprobar que funciona

Después de guardar, la forma rápida de verificarlo es pedir algo a la IA desde una cuenta docente: por ejemplo, en el asistente (**Chatea con…**) o con el botón del asistente en la guía de una clase. Si el proveedor responde, el texto llega en unos segundos.

## El límite de uso

Cada cuenta tiene un máximo de peticiones a la IA por hora (60, salvo que quien instala la plataforma lo cambie en la configuración del servidor). Sirve para que un accidente —o un entusiasmo— no se lleve por delante el presupuesto. Este límite no se cambia desde el panel.

## Si el proveedor falla

Si quien instala la plataforma ha configurado en el servidor un proveedor de respaldo, cuando el endpoint del panel no responde, la petición va por ese respaldo. El profesorado no ve el cambio, solo que la generación tarda un poco más. Si no hay respaldo, la IA no responde hasta que el proveedor vuelva: mira [la IA no responde](/ayuda/cuando-algo-falla/la-ia-no-responde).

## Sin IA

La IA solo propone: todo lo que hace se puede escribir a mano en los mismos formularios. Si tu centro prefiere no usarla, la plataforma funciona igual, aunque los botones de generación siguen a la vista y, sin un proveedor que responda, no devuelven nada.$itakai090$),
    ('ia-y-configuracion', 'gestionar-el-centro-de-ayuda', 'https://s3.services.devbeply.es/help-media/itakai/v0.9.0-0275028998de/help-media/ia-y-configuracion__gestionar-el-centro-de-ayuda/ia-y-configuracion__gestionar-el-centro-de-ayuda-portada.webp', 'https://s3.services.devbeply.es/help-media/itakai/v0.9.0-0275028998de/help-media/ia-y-configuracion__gestionar-el-centro-de-ayuda/ia-y-configuracion__gestionar-el-centro-de-ayuda.mp4?v=audio-20261120', 69, '34b13df14bad4b0f4974c8aa53e93331', $itakai090$El centro de ayuda se gestiona entero desde **Panel de administración → Contenidos → Centro de ayuda**. No hace falta tocar nada en el servidor: todo lo que se ve en la ayuda pública sale de ahí.

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

Los artículos con los que arranca la plataforma vienen incluidos en la instalación. A partir de ahí son vuestros: lo que editéis, borréis o reordenéis no lo sobrescribe ninguna actualización.

## Publicar un artículo paso a paso

1. En **Contenidos → Centro de ayuda**, abre **Artículos** y pulsa **Nuevo artículo**.
   ![Los artículos del centro de ayuda agrupados por categoría](https://s3.services.devbeply.es/help-media/itakai/v0.9.0-0275028998de/help-media/ia-y-configuracion__gestionar-el-centro-de-ayuda/01-centro.webp)
2. Selecciona **Categoría**, **Audiencia** y **Tipo**. Escribe el título, el resumen y el contenido. Pulsa **Guardar** para crear el borrador.
   ![El editor con los campos del artículo y el contenido de ejemplo](https://s3.services.devbeply.es/help-media/itakai/v0.9.0-0275028998de/help-media/ia-y-configuracion__gestionar-el-centro-de-ayuda/02-editor.webp)
3. Abre el menú **⋮** del borrador y selecciona **Previsualizar**.
   ![El menú de acciones de un borrador](https://s3.services.devbeply.es/help-media/itakai/v0.9.0-0275028998de/help-media/ia-y-configuracion__gestionar-el-centro-de-ayuda/03-acciones.webp)
   ![La vista previa del borrador](https://s3.services.devbeply.es/help-media/itakai/v0.9.0-0275028998de/help-media/ia-y-configuracion__gestionar-el-centro-de-ayuda/04-previsualizar.webp)
4. Cierra la vista previa. Vuelve a abrir el menú **⋮** y pulsa **Publicar**. Comprueba el estado en el listado.
   ![El nuevo artículo en el listado del centro de ayuda](https://s3.services.devbeply.es/help-media/itakai/v0.9.0-0275028998de/help-media/ia-y-configuracion__gestionar-el-centro-de-ayuda/05-publicado.webp)$itakai090$),
    ('ia-y-configuracion', 'que-hace-la-inteligencia-artificial', 'https://s3.services.devbeply.es/help-media/itakai/v0.9.0-0275028998de/help-media/ia-y-configuracion__que-hace-la-inteligencia-artificial/ia-y-configuracion__que-hace-la-inteligencia-artificial-portada.webp', 'https://s3.services.devbeply.es/help-media/itakai/v0.9.0-0275028998de/help-media/ia-y-configuracion__que-hace-la-inteligencia-artificial/ia-y-configuracion__que-hace-la-inteligencia-artificial.mp4?v=audio-20261120', 52, 'df6756a471851915a297d2ea6b6d02fe', $itakai090$La inteligencia artificial de ITAKAI es un asistente de escritura, no un piloto automático. **Propone; tú decides.** Nada de lo que genera se publica solo.

![Cómo trabaja la IA: le pides algo, propone un borrador, tú lo revisas y solo se guarda si le das a guardar.](/app/ayuda/diagramas/flujo-ia.svg)

## Dónde aparece

- **Al crear una clase**: propone narrativas, títulos, portada y la guía a partir de una idea suelta.
- **En la guía de clase**: redacta borradores de las reglas o del contexto, que insertas o descartas. Lo explica [la guía de clase](/ayuda/clases/la-guia-de-clase).
- **Al crear misiones y enigmas**: propone títulos, enunciados y recompensas coherentes con tu narrativa.
- **En las imágenes**: portadas de clase y de misión, insignias y avatares del alumnado.
- **En el asistente**, una conversación abierta donde pedirle lo que necesites. Se abre con el botón **Chatea con…**, abajo en el menú lateral.

## Hablar con el asistente

**1.** Pulsa **Chatea con…** en el menú lateral. Puedes escribir lo que quieras o empezar por una de las preguntas sugeridas.

![El asistente, con el campo para preguntar y las preguntas sugeridas](https://s3.services.devbeply.es/help-media/itakai/v0.9.0-0275028998de/help-media/ia-y-configuracion__que-hace-la-inteligencia-artificial/01-asistente.webp)

**2.** Escribe tu petición y pulsa Intro. La respuesta llega en unos segundos y la conversación queda guardada a la izquierda, para volver a ella; **Nueva conversación** empieza otra.

![La respuesta del asistente con tres ideas de enigma](https://s3.services.devbeply.es/help-media/itakai/v0.9.0-0275028998de/help-media/ia-y-configuracion__que-hace-la-inteligencia-artificial/02-respuesta.webp)

## Qué lee antes de responder

La IA no escribe a ciegas. Cuando genera algo para una clase, lee la **narrativa de tu clase**, sus recursos activos y el contexto de lo que estés editando. Por eso una propuesta de misión para una clase de mitología suena distinta que para una de robótica.

## Lo que nunca hace

- No publica nada por su cuenta.
- No modifica misiones existentes salvo que se lo pidas expresamente.
- No toca notas ni revisa entregas.

## Los personajes

Atenea, Odiseo, Penélope, Polifemo y Poseidón son las caras del asistente. El personaje cambia de vez en cuando, y con él el tono y el color: por debajo hacen lo mismo.

## Si la IA no está disponible

Todo lo demás funciona igual: misiones, enigmas, narrativa y guía se pueden escribir a mano desde los mismos formularios. Qué proveedor usa la plataforma lo decide la administración: [configurar el proveedor de IA](/ayuda/ia-y-configuracion/configurar-el-proveedor-de-ia). Si no responde, mira [la IA no responde](/ayuda/cuando-algo-falla/la-ia-no-responde).$itakai090$),
    ('misiones', 'crear-una-mision', 'https://s3.services.devbeply.es/help-media/itakai/v0.9.0-0275028998de/help-media/misiones__crear-una-mision/misiones__crear-una-mision-portada.webp', 'https://s3.services.devbeply.es/help-media/itakai/v0.9.0-0275028998de/help-media/misiones__crear-una-mision/misiones__crear-una-mision.mp4?v=audio-20261120', 99, '1e33431749fb6d22b0f7bd1f773681e5', $itakai090$Una misión es una unidad de trabajo con su propia historia. Se crea desde la pestaña **Misiones** de la clase, con un asistente parecido al de la clase. Si ya la tienes en otra de tus clases, no hace falta escribirla otra vez: [impórtala](/ayuda/misiones/importar-una-mision-de-otra-clase) con sus enigmas y sus documentos.

![Las cinco fases de una misión: la creas, tu alumnado la ve, entrega, la revisas con un porcentaje y cobra las recompensas.](/app/ayuda/diagramas/flujo-mision.svg)

## Paso a paso

**1. Abre el asistente.** Entra en la clase, abre la pestaña **Misiones** y pulsa **Nueva misión**. También puedes empezar desde **Misiones**, en el menú, y elegir allí la clase.

![La pestaña Misiones de la clase con el botón Nueva misión](https://s3.services.devbeply.es/help-media/itakai/v0.9.0-0275028998de/help-media/misiones__crear-una-mision/01-nueva-mision.webp)

**2. Cuenta la idea.** La clase ya viene elegida. Escribe en una o dos frases de qué trata la misión y qué tiene que aprender el alumnado, y pulsa **Siguiente**.

![Primer paso del asistente: la clase y la idea de la misión](https://s3.services.devbeply.es/help-media/itakai/v0.9.0-0275028998de/help-media/misiones__crear-una-mision/02-idea.webp)

**3. Revisa la narrativa.** El asistente escribe la historia de la misión, enlazada con la narrativa de la clase. Acéptala con **Sí, adelante**, cámbiala tú con **Editar a mano** o pulsa **Quiero cambiar algo** y dile qué quieres distinto.

![La narrativa de la misión que propone el asistente](https://s3.services.devbeply.es/help-media/itakai/v0.9.0-0275028998de/help-media/misiones__crear-una-mision/03-narrativa.webp)

**4. Elige el título.** Te propone varios títulos: elige uno y pulsa **Sí, adelante**, o pide otros con **Quiero cambiar algo**.

**5. Revisa los enigmas.** El asistente prepara cuatro enigmas, los pasos concretos que el alumnado entrega, cada uno con su enunciado, sus objetivos y sus recompensas (experiencia y, si tu clase los usa, monedas y maná). Si quieres otros, pulsa **Quiero cambiar algo**; si te valen, **Sí, adelante**. Después podrás editarlos uno a uno.

![Los enigmas que propone el asistente, con sus recompensas](https://s3.services.devbeply.es/help-media/itakai/v0.9.0-0275028998de/help-media/misiones__crear-una-mision/04-enigmas.webp)

**6. Elige la rareza y la fecha.** En **Configuración final** marca la rareza: **Común**, **Rara**, **Épica** o **Legendaria**. Marca el color con el que se ve la misión y, sobre todo, [el bonus que se lleva quien la completa entera](/ayuda/misiones/rarezas-y-fechas-de-entrega). La **Fecha límite** es opcional: si la pones, la misión deja de admitir entregas cuando pasa y tu alumnado recibe un recordatorio 24 horas antes; si la dejas vacía, no caduca. Pulsa **Siguiente**.

![Configuración final: rareza y fecha límite opcional](https://s3.services.devbeply.es/help-media/itakai/v0.9.0-0275028998de/help-media/misiones__crear-una-mision/05-rareza.webp)

**7. Acepta la portada y la guía.** El asistente propone una imagen de portada a partir de la misión; si no te convence, pide otra con **Quiero cambiar algo**. Luego prepara la guía de la misión para el alumnado: qué tiene que hacer, los enigmas, las recompensas y unos consejos. Puedes aceptarla, editarla o **Saltar** este paso.

![Portada propuesta para la misión](https://s3.services.devbeply.es/help-media/itakai/v0.9.0-0275028998de/help-media/misiones__crear-una-mision/06-portada.webp)

![Guía de la misión para el alumnado](https://s3.services.devbeply.es/help-media/itakai/v0.9.0-0275028998de/help-media/misiones__crear-una-mision/07-guia.webp)

**8. Decide la insignia.** Por último te propone una insignia, con nombre, descripción e imagen, para quien complete la misión. Quédate con ella con **Sí, adelante**, pide otra o pulsa **Saltar** si esta misión no lleva insignia.

![La insignia que propone el asistente para la misión](https://s3.services.devbeply.es/help-media/itakai/v0.9.0-0275028998de/help-media/misiones__crear-una-mision/08-insignia.webp)

**9. Crea la misión.** Ves cómo quedará la tarjeta de la misión. Si está a tu gusto, pulsa **Crear Misión**.

![Vista previa de la misión antes de crearla](https://s3.services.devbeply.es/help-media/itakai/v0.9.0-0275028998de/help-media/misiones__crear-una-mision/09-vista-previa.webp)

## Cuando termina

La misión se crea **activa** y aparece en la pestaña **Misiones** de la clase, junto a las demás. Pulsa **Ver misiones** para ir a **Mis misiones**, con las de todas tus clases, o **Crear otra** para seguir.

![Misión creada](https://s3.services.devbeply.es/help-media/itakai/v0.9.0-0275028998de/help-media/misiones__crear-una-mision/10-creada.webp)

Al abrirla tienes dos pestañas. En **Resumen** está la historia de la misión, sus [enigmas](/ayuda/misiones/enigmas-los-pasos-de-una-mision) (con **Añadir**, **Editar** y **Eliminar**), las [pistas](/ayuda/misiones/pistas-en-las-misiones) y los **Documentos de apoyo**: enunciados, plantillas o lecturas que quedan junto a la misión, que es donde el alumnado los busca. En **Ajustes** cambias el título, la fecha límite, la rareza, la portada (generarla con la IA o **Subir la mía**) y el estado.

![La misión creada, con su historia y sus enigmas](https://s3.services.devbeply.es/help-media/itakai/v0.9.0-0275028998de/help-media/misiones__crear-una-mision/11-mision.webp)

## El estado de la misión

Una misión puede estar **Activa** —visible y entregable— o **Bloqueada**: el alumnado la ve con candado y no puede entrar. Sirve para preparar contenido con antelación y abrirla el día que toca. Se cambia en la pestaña **Ajustes** de la misión.

## Y ahora

Una misión sin enigmas no se puede completar: si quieres retocar los que propuso el asistente o añadir más, mira [Enigmas: los pasos de una misión](/ayuda/misiones/enigmas-los-pasos-de-una-mision). Cuando tu alumnado empiece a entregar, lo siguiente es [revisar las entregas](/ayuda/misiones/revisar-entregas).$itakai090$),
    ('misiones', 'el-mapa-de-misiones', 'https://s3.services.devbeply.es/help-media/itakai/v0.9.0-0275028998de/help-media/misiones__el-mapa-de-misiones/misiones__el-mapa-de-misiones-portada.webp', 'https://s3.services.devbeply.es/help-media/itakai/v0.9.0-0275028998de/help-media/misiones__el-mapa-de-misiones/misiones__el-mapa-de-misiones.mp4?v=audio-20261120', 67, 'd7ddd1fa2028b39d8a4bb2ce656a2b24', $itakai090$El **mapa de misiones** muestra las misiones de una clase como un tablero, de la **Salida** a la **Meta**. También puedes [montar un camino](/ayuda/misiones/montar-el-camino-del-mapa) para que unas misiones se abran después de completar otras. La etiqueta **Beta** indica que el mapa está en pruebas.

## Encender el mapa

1. Abre tu clase y ve a **Ajustes → Funcionalidades**. En **En pruebas**, activa **Mapa de misiones**. El interruptor está apagado de entrada. Para cambiarlo necesitas acceso de administración en la clase.

   ![El interruptor Mapa de misiones en las funcionalidades de la clase](https://s3.services.devbeply.es/help-media/itakai/v0.9.0-0275028998de/help-media/misiones__el-mapa-de-misiones/01-encender.webp)

2. Abre **Misiones** y elige **Mapa** junto a **Cuadrícula** y **Lista**. El mapa muestra todas las misiones de la clase.

   ![El selector Mapa junto a las otras vistas de misiones](https://s3.services.devbeply.es/help-media/itakai/v0.9.0-0275028998de/help-media/misiones__el-mapa-de-misiones/02-vista-mapa.webp)

## Leer el tablero

Cada medallón representa una misión con su portada, número de paso e icono de estado. Si la clase no tiene un camino preparado, las misiones siguen [el orden de la clase](/ayuda/misiones/el-orden-de-las-misiones). Si lo tiene, cada misión queda detrás de las que pide. Las ramas más cortas llegan a la **Meta** por un sendero fino.

En la vista docente, el anillo de cada medallón muestra qué parte de la clase ha completado esa misión. Arriba ves el avance conjunto. Debajo del tablero, pulsa un estado en la **Leyenda** para resaltar las misiones correspondientes. Con el teclado, las flechas pasan de un medallón al siguiente.

![El tablero, sus medallones y el avance de la clase](https://s3.services.devbeply.es/help-media/itakai/v0.9.0-0275028998de/help-media/misiones__el-mapa-de-misiones/03-mapa.webp)

## Consultar una misión

Pulsa el medallón de la misión. Su detalle muestra las recompensas, el avance, la fecha límite si la tiene, qué misiones la abren y qué misiones abre. En el móvil, el tablero se ve en columna y el detalle se abre desde abajo.

En tu vista, los avatares identifican a quienes la han completado. Si son más de ocho, el último avatar indica cuántos faltan por mostrar. **En curso** cuenta a quienes han empezado la misión y aún no la han terminado. Pulsa **Abrir misión** para entrar.

![El detalle docente de una misión con su avance y sus requisitos](https://s3.services.devbeply.es/help-media/itakai/v0.9.0-0275028998de/help-media/misiones__el-mapa-de-misiones/04-detalle.webp)

## Qué ve tu alumnado

Al abrir **Misiones**, cada estudiante ve el mapa con su propio avance y el avatar de **Estás aquí**. **Ir a mi misión** lo lleva a ese medallón. Cuando una misión sigue cerrada, el candado y el texto **Bloqueada** indican su estado. En el detalle se explica qué le falta por completar o si su docente la ha cerrado por ahora. Hasta que se abra, su historia, documentos, entregas y pistas permanecen cerrados.

![El mapa de una estudiante con su avance y las misiones bloqueadas](https://s3.services.devbeply.es/help-media/itakai/v0.9.0-0275028998de/help-media/misiones__el-mapa-de-misiones/05-alumna.webp)

Consulta también la [guía del mapa para estudiantes](/ayuda/si-eres-alumno/el-mapa-y-las-misiones-cerradas).

## Apagar o copiar el mapa

- Si apagas **Mapa de misiones**, desaparece la vista y se abren las misiones cerradas por requisitos. Las que has bloqueado tú siguen cerradas. Los requisitos quedan guardados. Si vuelves a encenderlo, se aplican a quienes todavía no han empezado la misión.
- Si [duplicas la clase](/ayuda/clases/duplicar-una-clase-para-el-curso-siguiente) o importas una [plantilla con sus misiones](/ayuda/clases/crear-una-clase-desde-cero-o-desde-una-plantilla), se copia el camino. El interruptor se copia junto a las funcionalidades.
- Una misión [importada de otra clase](/ayuda/misiones/importar-una-mision-de-otra-clase) llega sin requisitos. Si la mueves a otra clase, también desaparece de los requisitos de la clase de origen.$itakai090$),
    ('misiones', 'el-orden-de-las-misiones', 'https://s3.services.devbeply.es/help-media/itakai/v0.9.0-0275028998de/help-media/misiones__el-orden-de-las-misiones/misiones__el-orden-de-las-misiones-portada.webp', 'https://s3.services.devbeply.es/help-media/itakai/v0.9.0-0275028998de/help-media/misiones__el-orden-de-las-misiones/misiones__el-orden-de-las-misiones.mp4?v=audio-20261120', 68, 'af6769451f9c4c4231083787f2072d91', $itakai090$Las misiones de una clase tienen un **orden**: el de la progresión, el que decides tú. Es el orden en que las ve tu alumnado en la pestaña *Misiones* y el que sale de entrada, como **Orden de la clase**, en el desplegable de ordenar que se abre con **Filtros**. Desde ese desplegable cualquiera puede ver la lista por fecha, nombre, XP o rareza sin cambiar el orden de la clase.

![Las misiones de la clase, con el botón Ordenar](https://s3.services.devbeply.es/help-media/itakai/v0.9.0-0275028998de/help-media/misiones__el-orden-de-las-misiones/01-misiones.webp)

![El desplegable de orden de la lista, en Orden de la clase](https://s3.services.devbeply.es/help-media/itakai/v0.9.0-0275028998de/help-media/misiones__el-orden-de-las-misiones/04-ver-orden.webp)

## Cambiar el orden

1. En la pestaña **Misiones** de la clase, pulsa **Ordenar**.
2. Arrastra cada misión por su asa hasta su sitio. Con el teclado, ponte en el asa, pulsa **Espacio** y usa las flechas arriba y abajo: cada paso se anuncia al lector de pantalla.
3. Cada cambio se guarda al momento. Pulsa **Hecho** para volver a las tarjetas.

![Ordenar: cada misión con su asa para moverla](https://s3.services.devbeply.es/help-media/itakai/v0.9.0-0275028998de/help-media/misiones__el-orden-de-las-misiones/02-ordenar.webp)

![La misión ya en su nuevo sitio](https://s3.services.devbeply.es/help-media/itakai/v0.9.0-0275028998de/help-media/misiones__el-orden-de-las-misiones/03-nuevo-orden.webp)

Ordenar pide acceso de **edición** en la clase, como crear o editar misiones. Cada cambio queda en el [historial de la clase](/ayuda/clases/el-historial-de-la-clase).

## Dónde va cada misión

- Una misión **nueva** va al final.
- Una misión [importada de otra clase](/ayuda/misiones/importar-una-mision-de-otra-clase), o que pasas a otra clase, llega al final de la clase que la recibe.
- Al [duplicar la clase](/ayuda/clases/duplicar-una-clase-para-el-curso-siguiente) o importar una plantilla, las misiones llegan **en el mismo orden**.

El orden no abre ni cierra nada por sí solo: una misión bloqueada sigue bloqueada esté donde esté, y el alumnado entrega las que están abiertas en el orden que quiera.

## El orden y el mapa

Con el [mapa de misiones](/ayuda/misiones/el-mapa-de-misiones), cada misión puede pedir que antes se completen otras, y en **Ordenar** se lee bajo su título: **Se abre al completar «…»**. Si el mapa está encendido, **una misión no puede ir delante de lo que pide**: si la arrastras ahí, vuelve a su sitio y un aviso te dice qué lo impide. Con el mapa apagado ordenas como quieras, y al encenderlo se recoloca solo lo justo.

Debajo de la lista, **Camino del mapa** tiene dos atajos: **Encadenar en orden**, para que cada misión pida la anterior, y **Quitar los requisitos**. Cómo se monta el camino y cuándo se abre cada misión lo cuenta [montar el camino del mapa](/ayuda/misiones/montar-el-camino-del-mapa).$itakai090$),
    ('misiones', 'enigmas-los-pasos-de-una-mision', 'https://s3.services.devbeply.es/help-media/itakai/v0.9.0-0275028998de/help-media/misiones__enigmas-los-pasos-de-una-mision/misiones__enigmas-los-pasos-de-una-mision-portada.webp', 'https://s3.services.devbeply.es/help-media/itakai/v0.9.0-0275028998de/help-media/misiones__enigmas-los-pasos-de-una-mision/misiones__enigmas-los-pasos-de-una-mision.mp4?v=audio-20261120', 73, 'a061241b0ab6a0133e4714e9ec62032d', $itakai090$El enigma es la unidad real de trabajo. La misión da el marco; el enigma es lo que el alumnado hace, entrega y ve puntuado.

![Las partes de una misión señaladas sobre su ficha: portada, rareza, fecha de entrega y los enigmas.](/app/ayuda/diagramas/anatomia-mision.svg)

## Cómo se componen

Cada enigma tiene un **título**, un **enunciado**, sus propias **recompensas** y, si quieres, unos **objetivos** de aprendizaje. Están en el **Resumen** de la misión, en la sección **Enigmas**, numerados en el orden en que los ve el alumnado.

![Los enigmas de la misión, con el botón Añadir](https://s3.services.devbeply.es/help-media/itakai/v0.9.0-0275028998de/help-media/misiones__enigmas-los-pasos-de-una-mision/01-enigmas.webp)

Un enigma puede ser cualquier cosa que acabe en una entrega: resolver un problema, grabar un audio, subir una foto de una maqueta, entregar un documento. El alumnado lo entrega siempre en **un archivo comprimido ZIP, RAR o 7Z de hasta 50 MB**, así que dentro cabe lo que haga falta: uno o varios archivos, del formato que sea.

## Añadir un enigma

1. Abre la misión y, en la sección **Enigmas**, pulsa **Añadir**.
2. Escribe el **Título del enigma**.
3. En **Recompensas al completar**, elige la experiencia y, si tu clase los usa, las monedas y el maná. Puedes pulsar uno de los valores sugeridos o escribir el que quieras. Cómo se reparten lo cuenta [recompensas: XP, monedas y maná](/ayuda/misiones/recompensas-xp-monedas-y-mana).
4. Escribe la **Descripción**: lo que hay que hacer y entregar.
5. Si quieres, añade **Objetivos** con **Añadir objetivo**.
6. Pulsa **Añadir**.

![El formulario del enigma: título, recompensas, enunciado, objetivos y la casilla de opcional](https://s3.services.devbeply.es/help-media/itakai/v0.9.0-0275028998de/help-media/misiones__enigmas-los-pasos-de-una-mision/02-formulario.webp)

Para cambiar uno, pulsa **Editar** en su tarjeta; **Eliminar** lo borra. Cada enigma tiene también su botón **Ver entregas**, donde llegan las de tu alumnado para [revisarlas](/ayuda/misiones/revisar-entregas).

## Enigmas opcionales

Al crear o editar un enigma puedes marcar **Este enigma es opcional**. En la misión sale con la etiqueta **Opcional**: da su recompensa como cualquier otro y cuenta en el avance, pero **no hace falta para completar la misión**.

![El nuevo enigma en la misión, con la etiqueta Opcional](https://s3.services.devbeply.es/help-media/itakai/v0.9.0-0275028998de/help-media/misiones__enigmas-los-pasos-de-una-mision/03-nuevo-enigma.webp)

## Qué hace cada estudiante

Abre la misión, elige un enigma y sube su archivo. La entrega queda **pendiente de revisión** y en su pantalla ve que la pelota está en tu tejado. Mientras tenga una entrega pendiente de ese enigma no puede subir otra, para que no se te acumulen tres versiones de lo mismo.

## Cuántos poner

No hay número mágico, pero conviene que cada enigma sea entregable en una sesión o dos. Una misión de dos enigmas gordos se atasca; una de ocho pequeños da sensación de avance continuo.

## Lo que pasa al completar la misión

Cuando apruebas el último enigma obligatorio que le faltaba a alguien, la misión se marca como completada y esa persona se lleva el bonus de rareza y la insignia asociada, si la misión tiene una. Eso ocurre una sola vez, en esa revisión. Si todos los enigmas son opcionales, basta con aprobar uno.

Completar una misión también abre las que la piden en el [camino del mapa](/ayuda/misiones/montar-el-camino-del-mapa).$itakai090$),
    ('misiones', 'importar-una-mision-de-otra-clase', 'https://s3.services.devbeply.es/help-media/itakai/v0.9.0-0275028998de/help-media/misiones__importar-una-mision-de-otra-clase/misiones__importar-una-mision-de-otra-clase-portada.webp', 'https://s3.services.devbeply.es/help-media/itakai/v0.9.0-0275028998de/help-media/misiones__importar-una-mision-de-otra-clase/misiones__importar-una-mision-de-otra-clase.mp4?v=audio-20261120', 71, 'e922c3ae1738e78970b8ac8c3b07ef8d', $itakai090$**Una misión que ya funciona no hay que escribirla dos veces.** Puedes copiarla de una de tus clases a otra con sus enigmas, sus pistas, sus documentos y, si quieres, su insignia. La original no cambia y la copia es independiente: lo que retoques en una no toca la otra.

## Desde la clase que la recibe

En la pestaña **Misiones** de la clase, pulsa **Importar de otra clase**. Si la clase aún no tiene misiones, el botón está junto a **Crear primera misión**.

![La pestaña Misiones con el botón Importar de otra clase](https://s3.services.devbeply.es/help-media/itakai/v0.9.0-0275028998de/help-media/misiones__importar-una-mision-de-otra-clase/01-importar.webp)

1. En **Clase de origen**, elige de qué clase la traes. Salen las tuyas y las que el resto del profesorado comparte contigo, con el nombre de la persona propietaria y cuántas misiones tiene cada una.
2. En **Misión**, elige cuál. Cada una muestra su rareza, sus enigmas y lo que da. Debajo, en **Se copiará**, ves cuántos enigmas, pistas y documentos lleva y, si tiene insignia, la casilla **Copiar también su insignia**. Si la clase tiene muchas, puedes buscarla por el título.
3. Pulsa **Importar**.

![La clase de origen, la misión elegida y lo que se va a copiar](https://s3.services.devbeply.es/help-media/itakai/v0.9.0-0275028998de/help-media/misiones__importar-una-mision-de-otra-clase/02-elegir.webp)

Al terminar, la ventana te confirma lo que **Se ha copiado** y te ofrece **Adaptar con IA**: la IA propone cómo ajustarla a esta clase y tú decides si aplicarlo. Pulsa **Abrir la misión** para ir a ella o **Cerrar** para volver a la lista.

![Misión importada: lo que se ha copiado y la opción de adaptarla con IA](https://s3.services.devbeply.es/help-media/itakai/v0.9.0-0275028998de/help-media/misiones__importar-una-mision-de-otra-clase/03-importada.webp)

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

![La misión importada, al final de la lista y bloqueada](https://s3.services.devbeply.es/help-media/itakai/v0.9.0-0275028998de/help-media/misiones__importar-una-mision-de-otra-clase/04-mision.webp)

Tampoco trae **requisitos** del [camino del mapa](/ayuda/misiones/montar-el-camino-del-mapa): los suyos eran misiones de la otra clase. Si quieres que pida alguna de esta, márcala en sus **Ajustes**, sección **Camino**.

Queda anotada en el [historial](/ayuda/clases/el-historial-de-la-clase) de las dos clases: en la de destino, que se importó; en la de origen, quién se llevó una copia.

## Qué clases salen

**Como destino**, solo las clases activas en las que puedes editar misiones. Si no tienes ninguna, los botones de importar y copiar no aparecen.

**Como origen**, cualquiera de tus clases o de las compartidas contigo, aunque en ella solo tengas acceso de lectura. Las archivadas no salen de entrada: marca **Mostrar también las clases archivadas** para traerte algo del curso pasado.

> **¿Todas las misiones de una clase?** Para empezar el curso siguiente es más rápido [duplicar la clase](/ayuda/clases/duplicar-una-clase-para-el-curso-siguiente). Importar es para traerte una misión concreta.$itakai090$),
    ('misiones', 'montar-el-camino-del-mapa', 'https://s3.services.devbeply.es/help-media/itakai/v0.9.0-0275028998de/help-media/misiones__montar-el-camino-del-mapa/misiones__montar-el-camino-del-mapa-portada.webp', 'https://s3.services.devbeply.es/help-media/itakai/v0.9.0-0275028998de/help-media/misiones__montar-el-camino-del-mapa/misiones__montar-el-camino-del-mapa.mp4?v=audio-20261120', 80, 'be65354a43b7ea339fa1cb13844d56ba', $itakai090$Con el [mapa de misiones](/ayuda/misiones/el-mapa-de-misiones) puedes preparar un recorrido. Una misión se abre cuando cada estudiante completa todas las que has marcado como **requisitos**. Puedes elegir hasta tres por misión, siempre dentro de la misma clase.

## Elegir los requisitos de una misión

1. Abre la misión y pulsa **Ajustes**. En **Camino**, busca **Para abrirla, completar antes**.
2. Marca las misiones que el alumnado debe completar para abrirla. Junto a cada opción puedes ver si está bloqueada o expirada. Si una casilla aparece atenuada porque esa misión ya depende de la que editas, elegirla dejaría las dos sin poder abrirse.

   ![Las casillas de requisitos en la sección Camino de la misión](https://s3.services.devbeply.es/help-media/itakai/v0.9.0-0275028998de/help-media/misiones__montar-el-camino-del-mapa/01-requisitos.webp)

3. Pulsa **Guardar cambios**.

   ![El botón Guardar cambios en los ajustes de la misión](https://s3.services.devbeply.es/help-media/itakai/v0.9.0-0275028998de/help-media/misiones__montar-el-camino-del-mapa/02-guardar.webp)

## Encadenar toda la clase en un paso

1. En la pestaña **Misiones** de la clase, pulsa **Ordenar**. Debajo de la lista está **Camino del mapa**.
2. Pulsa **Encadenar en orden** para que cada misión pida la anterior. Esto sustituye los requisitos que hubiera y deja fuera de la cadena las misiones que has bloqueado a mano.

   ![El botón Encadenar en orden junto al resumen de los cambios](https://s3.services.devbeply.es/help-media/itakai/v0.9.0-0275028998de/help-media/misiones__montar-el-camino-del-mapa/03-encadenar.webp)

3. La lista muestra qué pide cada misión. **Quitar los requisitos** borra todos los enlaces del camino y deja disponibles desde el principio las misiones abiertas por el profesorado.

   ![El orden de la clase con los requisitos ya encadenados](https://s3.services.devbeply.es/help-media/itakai/v0.9.0-0275028998de/help-media/misiones__montar-el-camino-del-mapa/04-encadenadas.webp)

Montar el camino requiere acceso de **edición** en la clase. Los cambios quedan en el [historial](/ayuda/clases/el-historial-de-la-clase). Puedes prepararlo con el mapa apagado. Los requisitos empiezan a cerrar misiones al encenderlo.

## Cómo se abre una misión

Cada estudiante avanza a su ritmo. En el mapa ve **Bloqueada** mientras le falte un requisito. Al pulsar la misión, lee **Para abrirla, completa antes** y puede ir a la que le falta. Si llega por un enlace directo, verá **Aún no puedes empezar esta misión**.

![La misión bloqueada en el mapa de una estudiante y la que necesita completar](https://s3.services.devbeply.es/help-media/itakai/v0.9.0-0275028998de/help-media/misiones__montar-el-camino-del-mapa/05-alumna.webp)

- **Completar la misión** significa aprobar todos sus [enigmas obligatorios](/ayuda/misiones/enigmas-los-pasos-de-una-mision). Si todos son opcionales, basta con aprobar uno.
- **Una misión empezada sigue abierta** para quien ya hizo una entrega, tiene un enigma aprobado o usó una pista, aunque le añadas requisitos después.
- **Una misión caducada o sin enigmas** no impide abrir la siguiente. Si amplías la fecha de una caducada, vuelve a contar para quienes todavía no hayan empezado la misión siguiente.
- **Una misión que has bloqueado a mano** sigue cerrada para toda la clase. Si otra la pide, esa otra espera hasta que la desbloquees y cada estudiante la complete.
- El profesorado ve todas las misiones abiertas, también en **Ver como estudiante**. Para comprobar los cierres, entra con una cuenta de estudiante.

Si alguien se atasca, puedes quitar el requisito o apagar el mapa. El cambio se aplica a toda la clase.

## Cómo afecta al orden

Con el mapa encendido, una misión va detrás de todas las que pide. Si al guardar estaba delante, se mueve. Para adelantarla con **Ordenar**, quita antes el requisito que la retiene. Con el mapa apagado puedes ordenar libremente. Al encenderlo, la app recoloca lo necesario. Consulta [el orden de las misiones](/ayuda/misiones/el-orden-de-las-misiones).$itakai090$),
    ('misiones', 'pistas-en-las-misiones', 'https://s3.services.devbeply.es/help-media/itakai/v0.9.0-0275028998de/help-media/misiones__pistas-en-las-misiones/misiones__pistas-en-las-misiones-portada.webp', 'https://s3.services.devbeply.es/help-media/itakai/v0.9.0-0275028998de/help-media/misiones__pistas-en-las-misiones/misiones__pistas-en-las-misiones.mp4?v=audio-20261120', 68, 'a26d806e39dbbad1045ab9b1b8dec16c', $itakai090$Cada misión puede tener **hasta 10 pistas**. Las escribes tú, decides su orden y lo que cuesta usar cada una. El alumnado ve cuántas hay y lo que cuestan, pero el texto de una pista solo le aparece cuando la usa.

## Añadir y ordenar

1. Abre la misión y, en **Resumen**, ve a la sección **Pistas**.
2. Pulsa **Añadir** (o **Añadir la primera pista**, si aún no tiene ninguna).
3. En **Nueva pista**, escribe el **Texto de la pista** y elige **Cómo se paga** y cuánto.
4. Pulsa **Añadir la pista**.

![La sección Pistas de la misión, todavía vacía](https://s3.services.devbeply.es/help-media/itakai/v0.9.0-0275028998de/help-media/misiones__pistas-en-las-misiones/01-pistas.webp)

![Nueva pista: el texto, cómo se paga, el precio y lo que pagará quien la use](https://s3.services.devbeply.es/help-media/itakai/v0.9.0-0275028998de/help-media/misiones__pistas-en-las-misiones/02-nueva-pista.webp)

El orden de la lista es el orden en que se usan: **solo se puede usar la siguiente**, así que conviene ir de lo general a lo concreto. Para cambiarlo, arrastra cada fila por su asa o, con el teclado, ponte en el asa y usa las flechas arriba y abajo.

Las pistas son de la misión entera: si una habla de un enigma concreto, dilo en su texto.

![Las dos pistas de la misión, en orden y con su coste](https://s3.services.devbeply.es/help-media/itakai/v0.9.0-0275028998de/help-media/misiones__pistas-en-las-misiones/03-lista.webp)

## Lo que cuesta

- **Monedas**: se pagan al usarla. Sin monedas suficientes no se puede usar.
- **XP**: igual que las monedas. Puede bajar de nivel a quien la paga, pero no le quita ninguna insignia.
- **% de la recompensa**: no se paga en el momento. Resta ese porcentaje de **lo que la misión aún tiene que pagar a esa persona**: los enigmas que le quedan por aprobar, también los que están pendientes de revisión, y el bonus por completarla. Lo que ya ha cobrado no cambia. Varias pistas de % se suman, hasta el 100 %.

El % se multiplica con el porcentaje con el que revisas la entrega: un enigma aprobado al 80 % con un −20 % de pistas paga el 64 %. Al [revisar las entregas](/ayuda/misiones/revisar-entregas), bajo el nombre de cada estudiante ves lo que restan sus pistas, y **Recibirá** ya lo lleva descontado.

Las cantidades que se proponen son sugerencias: puedes poner cualquier número entero. Junto a **Guardar** (o **Añadir la pista**, si es nueva) se lee qué pagará quien la use.

Solo se ofrecen los recursos que usa la clase. Si apagas las monedas o la experiencia en *Ajustes*, las pistas que se pagaban con ellas **salen gratis**, y la sección te lo avisa.

## Cuándo se pueden usar

Mientras la misión está en curso: ni completada ni caducada. Una misión bloqueada no la ve el alumnado, y con ella tampoco sus pistas. Tampoco se usan en una misión que alguien aún tiene cerrada por el [camino del mapa](/ayuda/misiones/montar-el-camino-del-mapa). En una misión por equipos, cada estudiante usa y paga las suyas.

Desde la vista previa ves todas las pistas abiertas, pero no se usan: para probar el cobro hace falta una cuenta de estudiante.

## Cambiar o borrar una pista

El texto se puede corregir siempre. Si cambias el coste, el nuevo vale para quien la use a partir de ese momento: lo que ya se pagó no cambia. **Una pista que alguien ha usado no se puede borrar**, porque la ha pagado. Las que nadie ha usado se borran desde su editor, con **Eliminar la pista**, y se borran al momento.

Junto a cada pista ves cuántos estudiantes la han usado, y cada uso sale en la actividad de quien la usó. Los cambios en las pistas quedan en el [historial de la clase](/ayuda/clases/el-historial-de-la-clase).

## Al copiar la misión

Las pistas viajan con la misión al [importarla en otra clase](/ayuda/misiones/importar-una-mision-de-otra-clase), al duplicar la clase y al importar una plantilla, con su orden y su coste. Quién las usó, no. Adaptar una misión con IA no cambia sus pistas: revísalas después.$itakai090$),
    ('misiones', 'rarezas-y-fechas-de-entrega', 'https://s3.services.devbeply.es/help-media/itakai/v0.9.0-0275028998de/help-media/misiones__rarezas-y-fechas-de-entrega/misiones__rarezas-y-fechas-de-entrega-portada.webp', 'https://s3.services.devbeply.es/help-media/itakai/v0.9.0-0275028998de/help-media/misiones__rarezas-y-fechas-de-entrega/misiones__rarezas-y-fechas-de-entrega.mp4?v=audio-20261120', 66, '3e0ba741d2babf3fcf85ac3430480f2a', $itakai090$## Las cuatro rarezas

La rareza marca el color de la misión y el **bonus que se lleva quien la completa entera**:

| Rareza | Bonus al completar |
|---|---|
| Común | 50 XP |
| Rara | 100 XP |
| Épica | 200 XP |
| Legendaria | 400 XP |

Ese bonus es aparte de lo que dan los enigmas, y se entrega una sola vez: en la revisión que cierra la misión.

![La escala de rarezas, de común a legendaria, y la recompensa que corresponde a cada una.](/app/ayuda/diagramas/rarezas-escala.svg)

En la pestaña **Misiones** de la clase, cada tarjeta lleva la etiqueta y el color de su rareza.

![Las misiones de la clase, cada una con la etiqueta de su rareza](https://s3.services.devbeply.es/help-media/itakai/v0.9.0-0275028998de/help-media/misiones__rarezas-y-fechas-de-entrega/01-rarezas.webp)

Al abrir la misión, la fecha límite sale bajo el título y el bonus aparece en el panel **Recompensas** como **XP de misión**.

![La misión con su fecha límite y el bonus por completarla](https://s3.services.devbeply.es/help-media/itakai/v0.9.0-0275028998de/help-media/misiones__rarezas-y-fechas-de-entrega/02-bonus.webp)

## Cambiar la rareza y la fecha

Las dos se eligen al [crear la misión](/ayuda/misiones/crear-una-mision) y se cambian después en la misión, pestaña **Ajustes**:

1. En **Datos de la misión**, la **Fecha límite**. Déjala vacía para que la misión no caduque.
2. En **Dificultad y visibilidad**, la **Rareza**: **Común**, **Rara**, **Épica** o **Legendaria**.
3. Pulsa **Guardar cambios**.

![Ajustes de la misión: la fecha límite y la rareza](https://s3.services.devbeply.es/help-media/itakai/v0.9.0-0275028998de/help-media/misiones__rarezas-y-fechas-de-entrega/03-ajustes.webp)

El bonus de la misión cambia al momento.

![El bonus de la misión, ya legendaria](https://s3.services.devbeply.es/help-media/itakai/v0.9.0-0275028998de/help-media/misiones__rarezas-y-fechas-de-entrega/04-legendaria.webp)

## Cómo usarlas

Lo natural es que la rareza siga al esfuerzo. Una misión de repaso de una sesión, común; el proyecto de trimestre, legendaria. Si todo es legendario, la escala deja de decir nada.

## Las fechas de entrega

La fecha es opcional. Cuando la pones, pasan dos cosas:

1. Tu alumnado recibe un **recordatorio 24 horas antes**, en la plataforma y por correo si lo tiene activado. Quien ya haya completado la misión no lo recibe, y quien haya desactivado los recordatorios en su perfil, tampoco.
2. Cuando la fecha pasa, la misión **deja de admitir entregas nuevas**.

## Después de la fecha

Las entregas que ya estuvieran pendientes las puedes seguir revisando con normalidad: vencer cierra la puerta de entrada, no tu trabajo de corrección. Si necesitas dar margen a alguien, mueve la fecha de la misión — y ojo, porque al moverla se vuelve a mandar el recordatorio con el plazo nuevo.$itakai090$),
    ('misiones', 'recompensas-xp-monedas-y-mana', 'https://s3.services.devbeply.es/help-media/itakai/v0.9.0-0275028998de/help-media/misiones__recompensas-xp-monedas-y-mana/misiones__recompensas-xp-monedas-y-mana-portada.webp', 'https://s3.services.devbeply.es/help-media/itakai/v0.9.0-0275028998de/help-media/misiones__recompensas-xp-monedas-y-mana/misiones__recompensas-xp-monedas-y-mana.mp4?v=audio-20261120', 71, '991ec407421328f78f73457b23d7aa5e', $itakai090$**Las recompensas se configuran en el enigma, no en la misión.** Es el detalle que más despista al principio: la misión no tiene un «vale 300 XP» propio, sino que suma lo de sus enigmas.

![De dónde sale y en qué se gasta cada recurso: el XP sube de nivel y no se gasta en la tienda, las monedas sí se gastan en ella y el maná paga los poderes.](/app/ayuda/diagramas/circuito-recompensas.svg)

## Dónde se ve lo que da una misión

Abre la misión: en su **Resumen**, el panel **Recompensas** muestra la experiencia de sus enigmas (**XP de enigmas**), el bonus por completarla (**XP de misión**) y las monedas y el maná que reparten sus enigmas, si los dan.

![El panel Recompensas de la misión: experiencia de los enigmas, bonus por completarla y monedas](https://s3.services.devbeply.es/help-media/itakai/v0.9.0-0275028998de/help-media/misiones__recompensas-xp-monedas-y-mana/01-recompensas.webp)

## Los tres recursos

Al crear o editar un enigma (botón **Editar** en su tarjeta), en **Recompensas al completar** verás una fila por cada recurso que tu clase tenga activo:

- **XP** (experiencia), que sube de nivel.
- **Monedas**, que se gastan en la tienda.
- **Maná**, que paga los poderes.

Cada uno se pone por separado: pulsa uno de los valores sugeridos o escribe el que quieras en su casilla. Pulsa **Guardar** y el panel **Recompensas** de la misión se actualiza al momento.

![Las recompensas del enigma, una fila por recurso, con el aviso de que solo pueden subir](https://s3.services.devbeply.es/help-media/itakai/v0.9.0-0275028998de/help-media/misiones__recompensas-xp-monedas-y-mana/02-editar-enigma.webp)

## Cómo se calcula el total de la misión

El total que ve el alumnado es la **suma de lo que dan sus enigmas más el bonus por completar la misión**, que depende de la [rareza](/ayuda/misiones/rarezas-y-fechas-de-entrega). Si tienes tres enigmas de 100 XP en una misión épica, el total son 300 más 200 de bonus: 500.

![El total de la misión, actualizado con las nuevas recompensas del enigma](https://s3.services.devbeply.es/help-media/itakai/v0.9.0-0275028998de/help-media/misiones__recompensas-xp-monedas-y-mana/03-total.webp)

## Si cambias una recompensa a mitad de curso

Una vez que alguien ha completado un enigma, su recompensa **solo se puede subir, no bajar**. Es para no dejar a nadie con menos experiencia de la que ya se ganó. El formulario te lo indica con el aviso **Solo puedes aumentar las recompensas: alguien de la clase ya las ha ganado**, y los valores más bajos no se pueden elegir.

## Y si el recurso está apagado

Un enigma puede tener monedas configuradas y no repartir ninguna, si la clase tiene las monedas desactivadas. Se reparte lo que la clase usa, no lo que el enigma dice.

## Si la misión tiene pistas

Quien usa una [pista de la misión](/ayuda/misiones/pistas-en-las-misiones) paga su coste: monedas o XP en el momento, o un % menos de lo que la misión aún le tenga que pagar, bonus incluido. El total que ve el profesorado es el de la misión sin pistas; quien ha usado pistas de % ve el bonus ya descontado.$itakai090$),
    ('misiones', 'revisar-entregas', 'https://s3.services.devbeply.es/help-media/itakai/v0.9.0-0275028998de/help-media/misiones__revisar-entregas/misiones__revisar-entregas-portada.webp', 'https://s3.services.devbeply.es/help-media/itakai/v0.9.0-0275028998de/help-media/misiones__revisar-entregas/misiones__revisar-entregas.mp4?v=audio-20261120', 72, '58231218bc1ee066ad7a9b4ea735a350', $itakai090$Cuando alguien del alumnado sube su archivo a un enigma, la entrega queda **pendiente** hasta que la revises. La revisión se hace en la propia misión: ahí decides con qué porcentaje se ha completado la tarea, y ese único número reparte todas las recompensas.

![Los tres estados de una entrega: pendiente, entregada y revisada. Los dos primeros los mueve el alumnado; el último, el profesorado.](/app/ayuda/diagramas/estados-entrega.svg)
## Dónde están las entregas

Si tienes acceso de edición o de administración en la clase, cada vez que alguien del alumnado entrega te llega un aviso en **Avisos**, en el menú de la izquierda. El aviso dice quién ha entregado (con su alias) y qué enigma. Al pulsarlo vas directamente a la misión, con la ventana de entregas de ese enigma abierta.

![Avisos de entregas nuevas por revisar](https://s3.services.devbeply.es/help-media/itakai/v0.9.0-0275028998de/help-media/misiones__revisar-entregas/01-avisos.webp) En cuanto alguien del profesorado aprueba esa entrega, el aviso queda como leído para todo el profesorado.

También puedes llegar tú: en la clase, pestaña **Misiones**, abre la misión. Cada enigma tiene su botón **Ver entregas (N)**, donde N son las que quedan por revisar; en el móvil está en el menú **⋮** de cada enigma.

![El botón Ver entregas de cada enigma, con las que quedan por revisar](https://s3.services.devbeply.es/help-media/itakai/v0.9.0-0275028998de/help-media/misiones__revisar-entregas/05-ver-entregas.webp)

Y para saber si te queda algo pendiente, el **Resumen** de la clase muestra cuántas **Entregas por revisar** hay.

## Cómo se revisa

La ventana de entregas lista las pendientes de ese enigma, con el alias de quien entrega y cuándo lo hizo.

![Las entregas pendientes del enigma, con Descargar y Valorar](https://s3.services.devbeply.es/help-media/itakai/v0.9.0-0275028998de/help-media/misiones__revisar-entregas/02-entregas.webp)

1. Pulsa **Descargar** para bajar el archivo y revisarlo.
2. Pulsa **Valorar**.
3. Elige el porcentaje completado: **25%**, **50%**, **75%**, **100%** o el que escribas, de 1 a 100. Al lado, **Recibirá** te enseña lo que se llevará esa persona con ese porcentaje y, si ha usado pistas de %, ya con su descuento: lo ves bajo su nombre, por ejemplo «−20 % por sus pistas».
4. Pulsa **Aprobar**, que lleva el porcentaje elegido (por ejemplo, **Aprobar 75%**). La entrega sale de la lista y quien la hizo recibe el aviso al momento, y también por correo si lo tiene activado.

![La valoración: el porcentaje completado, lo que recibirá y el botón Aprobar](https://s3.services.devbeply.es/help-media/itakai/v0.9.0-0275028998de/help-media/misiones__revisar-entregas/03-valorar.webp)

![La entrega aprobada ya no está en la lista](https://s3.services.devbeply.es/help-media/itakai/v0.9.0-0275028998de/help-media/misiones__revisar-entregas/04-aprobada.webp)

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

Cada aprobación queda en el [historial de la clase](/ayuda/clases/el-historial-de-la-clase), con quién la hizo y con qué porcentaje. Cada estudiante también ve en su actividad quién le aprobó la entrega.$itakai090$),
    ('primeros-pasos', 'crear-tu-primera-clase', 'https://s3.services.devbeply.es/help-media/itakai/v0.9.0-0275028998de/help-media/primeros-pasos__crear-tu-primera-clase/primeros-pasos__crear-tu-primera-clase-portada.webp', 'https://s3.services.devbeply.es/help-media/itakai/v0.9.0-0275028998de/help-media/primeros-pasos__crear-tu-primera-clase/primeros-pasos__crear-tu-primera-clase.mp4?v=audio-20261120', 108, 'ea627580ea525752754363bca662e85a', $itakai090$Desde **Mis clases**, el botón **Nueva clase** abre un asistente que te va preguntando por partes. Ninguna decisión es definitiva: todo lo que eliges aquí se puede cambiar después desde la propia clase.

## Paso a paso

**1. Abre el asistente.** En el menú, entra en **Mis clases** y pulsa **Nueva clase**.

![Mis clases con el botón Nueva clase resaltado](https://s3.services.devbeply.es/help-media/itakai/v0.9.0-0275028998de/help-media/primeros-pasos__crear-tu-primera-clase/01-nueva-clase.webp)

**2. Cuenta la temática.** Elige el idioma, la provincia, el nivel educativo y la asignatura, y escribe en una frase el mundo o la historia que quieres para tu clase. Si tienes apuntes o una programación, puedes adjuntarlos para que el asistente los tenga en cuenta. Estos datos también sirven para que el resto del profesorado encuentre tu clase si algún día la publicas como plantilla.

![Primer paso del asistente con los datos de la clase y la idea](https://s3.services.devbeply.es/help-media/itakai/v0.9.0-0275028998de/help-media/primeros-pasos__crear-tu-primera-clase/02-tematica.webp)

**3. Revisa la narrativa.** Pulsa **Siguiente** y el asistente escribe la historia que envuelve la clase. Si te gusta, pulsa **Sí, adelante**; si no, puedes **Editar a mano** o pulsar **Quiero cambiar algo** y decirle qué cambiar. No es decoración: las misiones que escribas después se apoyan en ella.

![La narrativa propuesta, con los botones para editarla, pedir cambios o aceptarla](https://s3.services.devbeply.es/help-media/itakai/v0.9.0-0275028998de/help-media/primeros-pasos__crear-tu-primera-clase/03-narrativa.webp)

**4. Elige el título.** El asistente te propone varios títulos a partir de la narrativa. Elige uno y pulsa **Sí, adelante**. Si ninguno te convence, pide otros con **Quiero cambiar algo**.

![Títulos propuestos, con uno elegido](https://s3.services.devbeply.es/help-media/itakai/v0.9.0-0275028998de/help-media/primeros-pasos__crear-tu-primera-clase/04-titulo.webp)

**5. Ponle horario (opcional).** Si quieres que la plataforma sepa cuándo tienes esa clase, indica cuándo empieza, la hora y los días con **Elegir días de clase**. Puedes dejarlo para más adelante y pulsar **Siguiente**.

![Paso del horario](https://s3.services.devbeply.es/help-media/itakai/v0.9.0-0275028998de/help-media/primeros-pasos__crear-tu-primera-clase/05-horario.webp)

**6. Elige la portada.** El asistente prepara una imagen para la cabecera de la clase. Quédate con ella, pide otra con **Quiero cambiar algo** o sube la tuya con **Subir la mía**.

![Portada propuesta y el botón para subir una propia](https://s3.services.devbeply.es/help-media/itakai/v0.9.0-0275028998de/help-media/primeros-pasos__crear-tu-primera-clase/06-portada.webp)

**7. Revisa la guía del alumnado.** Es el texto que tu alumnado verá al entrar: bienvenida, horario, criterios de evaluación, normas y cómo funciona la clase. Acéptala, edítala o sáltala si prefieres escribirla después.

![Guía para el alumnado preparada por el asistente](https://s3.services.devbeply.es/help-media/itakai/v0.9.0-0275028998de/help-media/primeros-pasos__crear-tu-primera-clase/07-guia.webp)

**8. Comprueba el resumen y crea la clase.** Antes de crearla ves cómo va a quedar: título, portada, historia y guía, con un botón para editar cada parte. Cuando esté a tu gusto, pulsa **Crear clase**.

![Resumen de la clase antes de crearla](https://s3.services.devbeply.es/help-media/itakai/v0.9.0-0275028998de/help-media/primeros-pasos__crear-tu-primera-clase/08-resumen.webp)

## Cuando termina

La clase se crea con un **código de invitación** de seis caracteres. Ese código es lo que le das a tu alumnado para que se una. Puedes copiarlo en ese momento y lo tienes siempre a mano con el botón **Invitar**, en la cabecera de la clase.

![Clase creada con su código de invitación](https://s3.services.devbeply.es/help-media/itakai/v0.9.0-0275028998de/help-media/primeros-pasos__crear-tu-primera-clase/09-codigo.webp)

![La clase creada, con el botón Invitar en la cabecera](https://s3.services.devbeply.es/help-media/itakai/v0.9.0-0275028998de/help-media/primeros-pasos__crear-tu-primera-clase/10-invitar.webp)

> Con qué juega tu clase (experiencia, monedas, maná, vidas, tienda…) no se elige en el asistente: se activa después en los ajustes de la clase. Mira [Elegir qué recursos usa tu clase](/ayuda/clases/elegir-que-recursos-usa-tu-clase).

## Y ahora

Lo siguiente es [meter a tu alumnado](/ayuda/primeros-pasos/invitar-alumnos-a-una-clase) y [escribir la primera misión](/ayuda/misiones/crear-una-mision). Si prefieres no partir de cero, puedes [empezar desde una plantilla publicada por alguien del profesorado](/ayuda/clases/crear-una-clase-desde-cero-o-desde-una-plantilla).$itakai090$),
    ('primeros-pasos', 'donde-encontrar-ayuda', 'https://s3.services.devbeply.es/help-media/itakai/v0.9.0-0275028998de/help-media/primeros-pasos__donde-encontrar-ayuda/primeros-pasos__donde-encontrar-ayuda-portada.webp', 'https://s3.services.devbeply.es/help-media/itakai/v0.9.0-0275028998de/help-media/primeros-pasos__donde-encontrar-ayuda/primeros-pasos__donde-encontrar-ayuda.mp4?v=audio-20261120', 62, '77208aedb472737c4323250f913ebded', $itakai090$Abre **Centro de ayuda** en el menú de la izquierda de tu panel. Si eres docente, está encima de «Acerca de». Si eres estudiante, está debajo de tus secciones, junto a «Mi perfil». En móvil y en tablet, cuando el panel lateral esté plegado, ábrelo con el botón de menú.

![La portada del profesorado en el centro de ayuda](https://s3.services.devbeply.es/help-media/itakai/v0.9.0-0275028998de/help-media/primeros-pasos__donde-encontrar-ayuda/01-portada.webp)

## La ayuda de tu rol

El centro de ayuda tiene tres portadas: **Toda la ayuda**, **Profesorado** y **Alumnado**. Desde el menú entras directamente en la tuya, y puedes cambiar de portada con el selector de arriba.

Si abres un artículo desde un enlace sin haber elegido portada, la ayuda se coloca sola en la del artículo; si el artículo es para todo el mundo, en la de tu rol. La lista del lateral muestra los artículos de su categoría que tocan en esa portada.

## Los cursos

Los **cursos** reúnen en orden los vídeos clave. El profesorado tiene *Primeros pasos con itakai*, *Misiones a fondo* y *Gamifica tu clase*. El alumnado tiene *Empieza en itakai*. Pulsa **Ver todos los cursos** para abrir el índice. En cada curso, el botón **Empezar** te lleva a la primera lección. Avanza con **Siguiente**. La barra de arriba indica por cuál vas y la portada del curso recuerda las que ya has visto.

![La primera lección de un curso, con su barra de progreso](https://s3.services.devbeply.es/help-media/itakai/v0.9.0-0275028998de/help-media/primeros-pasos__donde-encontrar-ayuda/02-curso.webp)

## Buscar

Escribe en el buscador de la portada. No hace falta acertar con las tildes: «configuracion» encuentra «configuración».

![El buscador encuentra resultados aunque escribas sin tildes](https://s3.services.devbeply.es/help-media/itakai/v0.9.0-0275028998de/help-media/primeros-pasos__donde-encontrar-ayuda/03-buscar.webp)

## Vídeos y tipos de artículo

La mayoría de las guías tienen su **vídeo** arriba del todo: puedes cambiar la velocidad, activar los subtítulos con **CC** y verlo a pantalla completa. Debajo están los mismos pasos por escrito, con capturas. Los tutoriales, las preguntas frecuentes y los vídeos sueltos llevan su etiqueta en la lista de artículos de cada categoría, en los resultados de búsqueda y en el propio artículo.

En las guías de **Si eres estudiante**, usa **Ordenador** o **Móvil** para cambiar el vídeo y las capturas. En una tablet, elige la versión que coincida con el menú que ves en la app. La ayuda recuerda el ajuste para la próxima guía.

## Accesibilidad

Los ajustes de tamaño de letra, contraste, daltonismo y animación están en tu **perfil, pestaña Configuración**. Antes de iniciar sesión los tienes arriba, junto al selector de idioma; en la portada, si la pantalla es estrecha, dentro del menú.

## Volver

Si tienes la sesión iniciada, **Volver a la app**, en la cabecera, te lleva de vuelta a tu inicio. En pantallas estrechas, como la del móvil, ese botón no aparece.

Y al final de cada artículo puedes decir si te ha servido: nos ayuda a saber qué reescribir.$itakai090$),
    ('primeros-pasos', 'invitar-alumnos-a-una-clase', 'https://s3.services.devbeply.es/help-media/itakai/v0.9.0-0275028998de/help-media/primeros-pasos__invitar-alumnos-a-una-clase/primeros-pasos__invitar-alumnos-a-una-clase-portada.webp', 'https://s3.services.devbeply.es/help-media/itakai/v0.9.0-0275028998de/help-media/primeros-pasos__invitar-alumnos-a-una-clase/primeros-pasos__invitar-alumnos-a-una-clase.mp4?v=audio-20261120', 64, 'ad5c71abcece8a082f586b8f2b42dcd7', $itakai090$Hay dos formas de meter a tu alumnado en una clase: darle el **código** para que entre con su propia cuenta, o **crearle tú las cuentas**, pensado para quien no tiene correo. Las dos están en el mismo sitio: entra en la clase y pulsa **Invitar**, en la cabecera (en pantallas estrechas solo se ve su icono, una persona con un signo más).

![El botón Invitar, en la cabecera de la clase](https://s3.services.devbeply.es/help-media/itakai/v0.9.0-0275028998de/help-media/primeros-pasos__invitar-alumnos-a-una-clase/01-invitar.webp)

**Invitar** solo aparece si tienes acceso de administración en la clase: lo explica [niveles y perfiles del profesorado](/ayuda/clases/niveles-y-perfiles-del-profesorado).

## El código de la clase

Es un código de seis caracteres que la plataforma crea junto con la clase. La ventana **Invitar al alumnado** se abre en la pestaña **Código de clase**, con el código en grande y el botón **Copiar código**, para pegarlo donde quieras: el aula virtual, un correo al grupo o un mensaje. Proyectarlo en la pizarra funciona igual de bien. Tú lo compartes, tu alumnado lo escribe y ya está dentro: nadie tiene que aceptar nada.

![La pestaña Código de clase, con el código y el botón Copiar código](https://s3.services.devbeply.es/help-media/itakai/v0.9.0-0275028998de/help-media/primeros-pasos__invitar-alumnos-a-una-clase/02-codigo.webp)

También lo tienes a la vista al terminar de crear la clase.

## Qué hace el alumnado

Con su cuenta de estudiante, entra en **Mis clases**, pulsa **Unirse a clase**, escribe el código y confirma con **Unirse a la clase**. En el móvil tiene **Unirse a Clase** arriba del todo, al abrir el menú. Da igual si lo escribe en mayúsculas o en minúsculas.

![Mis clases del alumnado, con el botón Unirse a clase](https://s3.services.devbeply.es/help-media/itakai/v0.9.0-0275028998de/help-media/primeros-pasos__invitar-alumnos-a-una-clase/04-unirse.webp)

![La ventana para unirse, con el código escrito](https://s3.services.devbeply.es/help-media/itakai/v0.9.0-0275028998de/help-media/primeros-pasos__invitar-alumnos-a-una-clase/05-codigo-escrito.webp)

Entra directamente y la plataforma le lleva a la clase. Tú lo verás en la pestaña **Alumnado** de la clase la próxima vez que la abras.

![La pestaña Alumnado con la estudiante recién unida](https://s3.services.devbeply.es/help-media/itakai/v0.9.0-0275028998de/help-media/primeros-pasos__invitar-alumnos-a-una-clase/06-alumnado.webp)

Si el código no vale, quien lo escribe ve el motivo en la misma ventana: **«Código de clase inválido»** cuando está mal copiado o no es de ninguna clase, y **«Esta clase está archivada y no admite más estudiantes»** cuando es el de una clase archivada.

## Cuentas para quien no tiene correo

Si parte del grupo no tiene correo, o prefieres que no se registren por su cuenta, en la pestaña **Crear cuentas** de la misma ventana les das de alta tú, con usuario y contraseña, de uno en uno o con una lista. Las cuentas nacen ya matriculadas en la clase, sin código. Lo explica [dar de alta a estudiantes sin correo](/ayuda/alumnado/dar-de-alta-alumnos-sin-correo).

![La pestaña Crear cuentas, para quien no tiene correo](https://s3.services.devbeply.es/help-media/itakai/v0.9.0-0275028998de/help-media/primeros-pasos__invitar-alumnos-a-una-clase/03-crear-cuentas.webp)

## Un código por clase

Si tienes varios grupos, cada clase tiene su propio código, y una clase duplicada estrena el suyo: asegúrate de repartir el que toca, y dáselo solo a tu grupo.

> **Ojo con las clases archivadas.** Una clase archivada no admite más alumnado: el botón **Invitar** aparece desactivado y quien intente unirse con su código recibe el aviso de arriba. Si vas a reutilizar una clase del curso pasado, mejor [duplicarla](/ayuda/clases/duplicar-una-clase-para-el-curso-siguiente) que desarchivarla.$itakai090$),
    ('primeros-pasos', 'la-narrativa-de-tu-clase', 'https://s3.services.devbeply.es/help-media/itakai/v0.9.0-0275028998de/help-media/primeros-pasos__la-narrativa-de-tu-clase/primeros-pasos__la-narrativa-de-tu-clase-portada.webp', 'https://s3.services.devbeply.es/help-media/itakai/v0.9.0-0275028998de/help-media/primeros-pasos__la-narrativa-de-tu-clase/primeros-pasos__la-narrativa-de-tu-clase.mp4?v=audio-20261120', 55, 'f4d2bb201459e44745154395cbae08cb', $itakai090$La narrativa es la historia que envuelve tu asignatura: un naufragio, una expedición, un misterio por resolver. No es un adorno de la portada — es el hilo del que tiran las misiones.

## Dónde se nota

La narrativa está en la pestaña **Historia** de la clase, la puede leer tu alumnado y se nota sobre todo en el tono de las misiones. Cuando le pides a la inteligencia artificial que te proponga una misión, lo primero que lee es la narrativa: si tu clase va de una travesía por el Mediterráneo, las misiones hablarán de puertos y tormentas, no de "unidad 3".

![La pestaña Historia de la clase](https://s3.services.devbeply.es/help-media/itakai/v0.9.0-0275028998de/help-media/primeros-pasos__la-narrativa-de-tu-clase/01-historia.webp)

## Cómo cambiarla

La primera versión sale del asistente al [crear la clase](/ayuda/primeros-pasos/crear-tu-primera-clase). Para cambiarla, entra en la pestaña **Historia** y **pulsa sobre el texto**: se abre el editor. Puedes escribir tú, con la barra de formato, o pulsar el botón amarillo del asistente y pedirle lo que quieras: lo que propone lo puedes **Insertar al final**, **Reemplazar todo** o descartar. Cuando esté a tu gusto, pulsa **Guardar**.

![El editor de la historia, con el botón del asistente](https://s3.services.devbeply.es/help-media/itakai/v0.9.0-0275028998de/help-media/primeros-pasos__la-narrativa-de-tu-clase/02-editor.webp)

![La propuesta del asistente, con Insertar al final](https://s3.services.devbeply.es/help-media/itakai/v0.9.0-0275028998de/help-media/primeros-pasos__la-narrativa-de-tu-clase/03-propuesta.webp)

![La historia guardada con la sección nueva](https://s3.services.devbeply.es/help-media/itakai/v0.9.0-0275028998de/help-media/primeros-pasos__la-narrativa-de-tu-clase/04-guardada.webp)

Funciona mejor si incluyes:

- **Dónde ocurre** y en qué época o mundo.
- **Qué papel tiene el alumnado** dentro de la historia.
- **Qué está en juego**: qué se consigue al final del curso.

## Los dioses

La plataforma tiene cinco personajes —Atenea, Odiseo, Penélope, Polifemo y Posidón— que dan la cara por la inteligencia artificial: en el chat, en el asistente de crear clases y misiones y en el botón del editor. Se van turnando, cada uno con su color y su carácter, pero detrás está siempre la misma ayuda.$itakai090$),
    ('primeros-pasos', 'que-es-itakai', 'https://s3.services.devbeply.es/help-media/itakai/v0.9.0-0275028998de/help-media/promo/itakai-promo.webp', 'https://s3.services.devbeply.es/help-media/itakai/v0.9.0-0275028998de/help-media/promo/itakai-promo.mp4?v=spot-etapas-20261120', 66, '247a6095a1d9f43d6fcccc294630de82', $itakai090$ITAKAI convierte una asignatura en una aventura. Tú creas una **clase**, le pones una historia, y el temario se reparte en **misiones** que el alumnado completa entregando trabajo. Cada entrega que revisas reparte recursos, y esos recursos suben de nivel, compran cosas en la tienda de clase y aparecen en la clasificación.

## Las tres piezas

**La clase** es el contenedor: tu alumnado, tu narrativa y las reglas del juego. Decides qué recursos usa —puedes tener una clase solo con experiencia, o con monedas y tienda, o con todo— y esa decisión se puede cambiar en cualquier momento.

![La historia de la clase](https://s3.services.devbeply.es/help-media/itakai/v0.9.0-0275028998de/help-media/primeros-pasos__que-es-itakai/01-historia.webp)

**Las misiones** son las unidades de trabajo. Cada una tiene una rareza, opcionalmente una fecha de entrega, y por dentro se divide en **enigmas**: los pasos concretos que el alumnado resuelve uno a uno. El enigma es lo que se entrega y lo que se puntúa.

![Las misiones de la clase, cada una con su rareza](https://s3.services.devbeply.es/help-media/itakai/v0.9.0-0275028998de/help-media/primeros-pasos__que-es-itakai/02-misiones.webp)

![Una misión por dentro: sus enigmas con las recompensas de cada uno](https://s3.services.devbeply.es/help-media/itakai/v0.9.0-0275028998de/help-media/primeros-pasos__que-es-itakai/03-enigmas.webp)

**Los recursos** son lo que gana el alumnado. La experiencia hace subir de nivel, las monedas se gastan en la tienda que tú montas, el maná paga poderes y los puntos de vida suben o bajan con los comportamientos que registras en clase. En la pestaña **Alumnado** de la clase ves cuánta experiencia, cuántas monedas y cuánto maná lleva cada estudiante; la clasificación está en **Ranking**, en la misma pestaña.

![La pestaña Alumnado, con los recursos de cada estudiante](https://s3.services.devbeply.es/help-media/itakai/v0.9.0-0275028998de/help-media/primeros-pasos__que-es-itakai/04-alumnado.webp)

## Quién es quién

- **Profesorado**: crea clases, escribe misiones, revisa entregas y gestiona la tienda y los comportamientos. Una clase la puede impartir más de una persona, cada una con su nivel de acceso: [compartir una clase](/ayuda/clases/compartir-una-clase-con-otros-profesores). Con **Ver como estudiante**, debajo de tu nombre, ves la plataforma tal y como la ve tu alumnado.
- **Alumnado**: se une con un código —o entra con la cuenta que le crea su docente, si no tiene correo—, resuelve enigmas, gasta lo que gana y ve su progreso.
- **Administración**: gestiona la instancia completa — cuentas, clases, inteligencia artificial, almacenamiento y el centro de ayuda.

## Por dónde empezar

Si es tu primera vez, el camino corto es: [crear una clase](/ayuda/primeros-pasos/crear-tu-primera-clase), [invitar a tu alumnado](/ayuda/primeros-pasos/invitar-alumnos-a-una-clase) y [escribir tu primera misión](/ayuda/misiones/crear-una-mision). Con eso ya tienes una clase viva; el resto se añade cuando lo necesites.$itakai090$),
    ('si-eres-alumno', 'cambiar-la-contrasena-la-primera-vez', 'https://s3.services.devbeply.es/help-media/itakai/v0.9.0-0275028998de/help-media/si-eres-alumno__cambiar-la-contrasena-la-primera-vez/si-eres-alumno__cambiar-la-contrasena-la-primera-vez-portada.webp', 'https://s3.services.devbeply.es/help-media/itakai/v0.9.0-0275028998de/help-media/si-eres-alumno__cambiar-la-contrasena-la-primera-vez/si-eres-alumno__cambiar-la-contrasena-la-primera-vez.mp4?v=audio-20261120', 64, '6286f33f597e2a400dfe477e851ea1dc', $itakai090$La contraseña que te da tu docente es **temporal**: solo sirve para entrar la primera vez. Nada más entrar con ella aparece la pantalla **Cambia tu contraseña**, que te recuerda con qué usuario estás entrando, y hasta que no elijas una tuya no puedes usar el resto de la plataforma.

## Paso a paso

1. En **Contraseña temporal**, escribe la que te han dado.
2. En **Nueva contraseña**, escribe la tuya, de al menos 8 caracteres.
3. Repítela en **Confirmar contraseña**.
4. Pulsa **Guardar contraseña**.

![La pantalla Cambia tu contraseña, rellena](https://s3.services.devbeply.es/help-media/itakai/v0.9.0-0275028998de/help-media/si-eres-alumno__cambiar-la-contrasena-la-primera-vez/01-formulario.webp)

Si todo va bien, verás «¡Contraseña cambiada! Ya puedes empezar.» y entrarás en tu inicio, con tu clase en **Mis clases**. A partir de ahora entras con tu usuario y esta contraseña; la temporal ya no sirve.

![El inicio, nada más cambiar la contraseña](https://s3.services.devbeply.es/help-media/itakai/v0.9.0-0275028998de/help-media/si-eres-alumno__cambiar-la-contrasena-la-primera-vez/02-inicio.webp)

## Elegir una buena

- Que sea **solo tuya**: tu docente no la sabe ni la puede ver, y así tiene que ser.
- Que la recuerdes sin tenerla apuntada donde la vea todo el mundo. Una frase corta con algún número funciona mejor que una palabra rara.
- Que no sea la misma que usas en otras aplicaciones.

## Si da error

«No se ha podido cambiar la contraseña. Comprueba la temporal e inténtalo de nuevo.» casi siempre quiere decir que la temporal no está bien escrita: fíjate en las mayúsculas. Si esa no es tu cuenta —por ejemplo, en un ordenador de clase donde se había quedado otra sesión—, pulsa **Salir y entrar con otra cuenta**.

## Otras veces que sale

Si olvidas la contraseña y tu docente te la restablece, te dará otra temporal y volverá a salir esta pantalla. Y si más adelante quieres cambiarla tú, está en **Mi perfil** (en el móvil, dentro del menú), pestaña **Seguridad**, tarjeta **Contraseña**. Ahí mismo, en **Tu cuenta**, tienes tu usuario. Cada vez que la cambias se cierran tus sesiones abiertas en otros equipos.

![Mi perfil, pestaña Seguridad, con tu usuario y la tarjeta Contraseña](https://s3.services.devbeply.es/help-media/itakai/v0.9.0-0275028998de/help-media/si-eres-alumno__cambiar-la-contrasena-la-primera-vez/03-seguridad.webp)$itakai090$),
    ('si-eres-alumno', 'como-entrego-una-mision', 'https://s3.services.devbeply.es/help-media/itakai/v0.9.0-0275028998de/help-media/si-eres-alumno__como-entrego-una-mision/si-eres-alumno__como-entrego-una-mision-portada.webp', 'https://s3.services.devbeply.es/help-media/itakai/v0.9.0-0275028998de/help-media/si-eres-alumno__como-entrego-una-mision/si-eres-alumno__como-entrego-una-mision.mp4?v=audio-20261120', 69, '8e9b6d134ce8206bad7fbeff59bc074e', $itakai090$Una misión es un trabajo con premio. Cuando la abres ves de qué va, qué tienes que hacer y qué te llevas si la completas.

## Abrir la misión

Dentro de tu clase, entra en la pestaña **Misiones** (en el móvil, el icono del cohete) y pulsa la misión. Si tu clase usa el mapa de misiones, se abre su detalle con lo que da y cuánto llevas: pulsa **Empezar** o **Continuar** para entrar.

![El detalle de la misión en el mapa, con el botón Empezar](https://s3.services.devbeply.es/help-media/itakai/v0.9.0-0275028998de/help-media/si-eres-alumno__como-entrego-una-mision/01-detalle.webp)

## Los enigmas son los pasos

Las misiones están partidas en enigmas: los pasos que hay que ir haciendo. Los ves en orden y cada uno tiene su propia recompensa, así que aunque no termines la misión entera, lo que hayas hecho cuenta. Los que pone **Opcional** no hacen falta para completarla, pero también dan su recompensa.

![La sección Enigmas de la misión, con el botón Entregar](https://s3.services.devbeply.es/help-media/itakai/v0.9.0-0275028998de/help-media/si-eres-alumno__como-entrego-una-mision/02-enigmas.webp)

Si te atascas, puede que la misión tenga [pistas](/ayuda/si-eres-alumno/usar-las-pistas-de-una-mision): están debajo de los enigmas, se abren en orden y cada una tiene su coste.

Si una misión sale con candado, aún no puedes entrar: o se abre al completar otra, o la ha cerrado tu docente por ahora. Te lo explica [el mapa de misiones y las misiones bloqueadas](/ayuda/si-eres-alumno/el-mapa-y-las-misiones-cerradas).

## La entrega

1. En el enigma que quieres entregar, pulsa **Entregar**. Se abre la ventana **Entregar enigma**.
2. Toca la zona de subida (en el ordenador también puedes arrastrar el archivo encima) y elige tu archivo. Verás su nombre y su tamaño.
3. Pulsa **Entregar**.

![La ventana Entregar enigma, con el archivo elegido](https://s3.services.devbeply.es/help-media/itakai/v0.9.0-0275028998de/help-media/si-eres-alumno__como-entrego-una-mision/03-archivo.webp)

Se entrega **un archivo comprimido ZIP, RAR o 7Z, de 50 MB como máximo**. Si tienes que mandar varias cosas —un documento, unas fotos, un audio—, mételas todas en el mismo archivo comprimido.

Cuando le das a entregar, la entrega pasa a tu docente: el enigma pierde el botón **Entregar** y sale con un reloj, que quiere decir que está en revisión. Mientras no la revise, no puedes mandar otra de ese enigma. Repásala antes.

![Los enigmas entregados, con el reloj de en revisión](https://s3.services.devbeply.es/help-media/itakai/v0.9.0-0275028998de/help-media/si-eres-alumno__como-entrego-una-mision/04-en-revision.webp)

## Después de entregar

Tu docente la revisa y le pone un porcentaje: cuánto has completado. Las recompensas se reparten según ese porcentaje, así que una entrega a medias también da algo. Cuando la revise, te llega un aviso en **Avisos** con el porcentaje.

## La fecha

Si la misión tiene fecha de entrega, te llega un aviso cuando falten menos de 24 horas, salvo que hayas apagado los recordatorios en tu perfil. Cuando la fecha pasa, la misión ya no admite entregas: no dejes el último enigma para el último momento.$itakai090$),
    ('si-eres-alumno', 'como-entro-en-mi-clase', 'https://s3.services.devbeply.es/help-media/itakai/v0.9.0-0275028998de/help-media/si-eres-alumno__como-entro-en-mi-clase/si-eres-alumno__como-entro-en-mi-clase-portada.webp', 'https://s3.services.devbeply.es/help-media/itakai/v0.9.0-0275028998de/help-media/si-eres-alumno__como-entro-en-mi-clase/si-eres-alumno__como-entro-en-mi-clase.mp4?v=audio-20261120', 56, 'f0fe724fec71edbbe5c668445954c8d9', $itakai090$Para entrar en una clase de ITAKAI solo necesitas su **código**, que te da tu docente: seis caracteres que pueden incluir algún guion o guion bajo, así que cópialo tal cual. Con él entras directamente, sin esperar a que nadie te acepte.

> **¿Tu docente te ha dado un usuario y una contraseña?** Entonces ya estás en su clase y no necesitas código: mira [entrar con usuario y contraseña](/ayuda/si-eres-alumno/entrar-con-usuario-y-contrasena).

## Paso a paso

1. Pide el código a tu docente.
2. Entra en ITAKAI con tu cuenta. Si todavía no tienes, créala con **Crear cuenta nueva**, en la pantalla de inicio de sesión, y cuando te pregunte por tu perfil elige **Estudiante**.
3. Abre el menú (las tres rayas de arriba a la izquierda) y pulsa **Unirse a clase**, arriba del todo.

   ![El botón Unirse a clase](https://s3.services.devbeply.es/help-media/itakai/v0.9.0-0275028998de/help-media/si-eres-alumno__como-entro-en-mi-clase/01-menu.webp)

   En el ordenador, entra en **Mis clases**, en el menú de la izquierda, y pulsa **Unirse a clase**.
4. Escribe el código y pulsa **Unirse a la clase**. Da igual si usas mayúsculas o minúsculas.

   ![La ventana Unirse a una clase, con el código escrito](https://s3.services.devbeply.es/help-media/itakai/v0.9.0-0275028998de/help-media/si-eres-alumno__como-entro-en-mi-clase/02-codigo.webp)

Y ya estás dentro: la plataforma te lleva a la portada de la clase, con tu avatar, tu nivel y tu progreso.

![La portada de la clase nada más entrar](https://s3.services.devbeply.es/help-media/itakai/v0.9.0-0275028998de/help-media/si-eres-alumno__como-entro-en-mi-clase/03-clase.webp)

A partir de ahí la tienes siempre en **Mis clases**.

![Mis clases, con la clase a la que te acabas de unir](https://s3.services.devbeply.es/help-media/itakai/v0.9.0-0275028998de/help-media/si-eres-alumno__como-entro-en-mi-clase/04-mis-clases.webp)

## Si te sale un error

El motivo sale en la misma ventana, debajo del código:

- **«Código de clase inválido».** Revisa que esté bien copiado: es fácil confundir la O con el cero o la I con el uno. Si sigue sin funcionar, pregúntale a tu docente si es el código de tu grupo.
- **«Esta clase está archivada y no admite más estudiantes».** Esa clase ya está cerrada. Díselo a tu docente para que te dé el código de la clase que usa ahora.
- **«Ya estás en esta clase».** Ya estabas dentro: búscala en **Mis clases**.

## Si no aparece la clase

Comprueba con qué cuenta has entrado. Si tienes dos —la del centro y una personal—, la clase solo está en la cuenta con la que escribiste el código.

También puede ser que la clase esté archivada porque el curso ya ha terminado: entonces no la vas a ver aunque estuvieras dentro.

## Tu cuenta es tuya

La misma cuenta te vale para todas las clases y para todos los cursos. No hace falta crear una nueva cada año ni una por asignatura: en ella tienes todas tus clases, con tu progreso y tus insignias. Tu avatar y tu alias, en cambio, son de cada clase: lo cuenta [mi avatar y mi nombre en clase](/ayuda/si-eres-alumno/mi-avatar-y-mi-nombre-en-clase).$itakai090$),
    ('si-eres-alumno', 'el-mapa-y-las-misiones-cerradas', 'https://s3.services.devbeply.es/help-media/itakai/v0.9.0-0275028998de/help-media/si-eres-alumno__el-mapa-y-las-misiones-cerradas/si-eres-alumno__el-mapa-y-las-misiones-cerradas-portada.webp', 'https://s3.services.devbeply.es/help-media/itakai/v0.9.0-0275028998de/help-media/si-eres-alumno__el-mapa-y-las-misiones-cerradas/si-eres-alumno__el-mapa-y-las-misiones-cerradas.mp4?v=audio-20261120', 71, 'f66166aac4cc3a754143401cbd2752ee', $itakai090$A veces una misión sale con un **candado** y como **Bloqueada**: todavía no puedes entrar en ella. Puede ser por dos motivos, y la propia misión te dice cuál.

## Se abre al completar otra

Si tu clase usa el **mapa de misiones**, tu docente puede preparar un camino: unas misiones se abren al completar otras, como los niveles de un juego. En la vista **Cuadrícula**, esas misiones dicen **Se abre al completar «…»**, con el nombre de la que te falta; en el mapa, al pulsarlas, lo ves en **Para abrirla, completa antes**. Si salen dos o tres, tienes que completarlas **todas**.

![El detalle de una misión que se abre al completar otra](https://s3.services.devbeply.es/help-media/itakai/v0.9.0-0275028998de/help-media/si-eres-alumno__el-mapa-y-las-misiones-cerradas/02-requisito.webp)

- Una misión está completada cuando tu docente te ha aprobado todos sus enigmas. Los que pone **Opcional** no hacen falta.
- En cuanto completas lo que pide, la misión se te abre sola. No tienes que pedir nada.
- Cada persona va a su ritmo: se te abre cuando tú completas lo que pide, aunque al resto de la clase todavía no.
- Si la misión que te falta ya ha pasado su fecha, o no tiene enigmas, no te cierra nada: la siguiente se abre igualmente.
- Si ya habías empezado una misión (hiciste una entrega, te aprobaron un enigma o usaste una pista), no se te cierra aunque después le pongan un requisito.

Mientras está bloqueada no puedes ver su historia, sus enigmas ni sus documentos, ni usar sus pistas. Si llegas a ella desde un enlace, verás **Aún no puedes empezar esta misión** y, si la que te falta ya está abierta, un botón para ir a ella.

## Cerrada por tu docente

Si tiene candado pero no dice qué la abre, la ha cerrado tu docente por ahora, para toda la clase: a lo mejor aún la está preparando. Al pulsarla verás **Tu docente ha cerrado esta misión por ahora. Podrás entrar cuando la abra.** Aquí no tienes que hacer nada: espera a que la abra.

![El detalle de una misión cerrada por la docente](https://s3.services.devbeply.es/help-media/itakai/v0.9.0-0275028998de/help-media/si-eres-alumno__el-mapa-y-las-misiones-cerradas/03-cerrada.webp)

A veces pasan las dos cosas a la vez: la misión que te falta también la tiene cerrada tu docente. Entonces verás, por ejemplo, **Se abre al completar «A» (cerrada por tu docente por ahora)**, y hasta que tu docente abra «A» no puedes seguir por ese camino. Si crees que es un error, pregúntale.

## Cómo leer el mapa

En la pestaña **Misiones** de tu clase (en el móvil, la del cohete), la vista **Mapa** enseña tus misiones como un tablero, de la **Salida** a la **Meta**. Una carretera las une y el tramo que ya has recorrido se ilumina.

![El mapa de misiones, con lo que llevas completado arriba](https://s3.services.devbeply.es/help-media/itakai/v0.9.0-0275028998de/help-media/si-eres-alumno__el-mapa-y-las-misiones-cerradas/01-mapa.webp)

- Arriba ves lo que llevas, por ejemplo **Has completado 1 de 5 misiones**, con tu barra.
- **Estás aquí**, con tu avatar, marca la misión en la que vas. El botón **Ir a mi misión** te lleva hasta ella.
- Cada misión lleva un icono con su estado. En la **Leyenda**, debajo del mapa, ves qué es cada uno y cuántas misiones hay de cada estado: **Completada**, **En curso**, **Disponible**, **Urgente** (vence pronto), **Expirada** o **Bloqueada**. Solo salen los estados que hay en tu mapa.
- Pulsa un estado de la **Leyenda** para resaltar sus misiones: por ejemplo, **Disponible** te enseña las que puedes empezar ya. Vuelve a pulsarlo para quitarlo.
- Con el teclado, las flechas te llevan de una misión a la siguiente. Si usas lector de pantalla, en una misión bloqueada oirás también el motivo: **Bloqueada: se abre al completar «…»** o **Bloqueada: cerrada por tu docente por ahora**.

![La leyenda del mapa, con un estado resaltado](https://s3.services.devbeply.es/help-media/itakai/v0.9.0-0275028998de/help-media/si-eres-alumno__el-mapa-y-las-misiones-cerradas/04-leyenda.webp)

Al pulsar una misión se abre su **detalle**: lo que da, cuánto llevas, su fecha límite, qué hay que completar para abrirla y qué abre ella. Si está abierta, tiene el botón para **Empezar**, **Continuar** o **Ver misión**. Si está bloqueada, en vez del botón te dice qué te falta, en **Para abrirla, completa antes**, o que la ha cerrado tu docente.

El mapa está **en pruebas** (pone **Beta**), así que puede cambiar un poco. Si lo prefieres, también puedes ver tus misiones en **Cuadrícula** o en **Lista**, con los botones de arriba.$itakai090$),
    ('si-eres-alumno', 'entrar-con-usuario-y-contrasena', 'https://s3.services.devbeply.es/help-media/itakai/v0.9.0-0275028998de/help-media/si-eres-alumno__entrar-con-usuario-y-contrasena/si-eres-alumno__entrar-con-usuario-y-contrasena-portada.webp', 'https://s3.services.devbeply.es/help-media/itakai/v0.9.0-0275028998de/help-media/si-eres-alumno__entrar-con-usuario-y-contrasena/si-eres-alumno__entrar-con-usuario-y-contrasena.mp4?v=audio-20261120', 57, '376535cf47339beec062a7dd7b994132', $itakai090$Si no tienes correo, puede que tu docente te haya creado la cuenta. En ese caso no tienes que registrarte ni escribir ningún código: ya estás dentro de su clase. Te habrá dado tres cosas, en una tarjeta o en un mensaje: tu **usuario**, una **contraseña temporal** y la dirección donde se entra.

## Paso a paso

1. Abre la dirección que te han dado: es la pantalla de **Iniciar sesión**.
2. En **Correo o usuario**, escribe tu usuario, por ejemplo `ana.g.k7`. Da igual si lo pones en mayúsculas o en minúsculas.
3. En **Contraseña**, escribe la temporal tal cual: aquí sí cuentan las mayúsculas.

   ![La pantalla Iniciar sesión, con el usuario y la contraseña temporal escritos](https://s3.services.devbeply.es/help-media/itakai/v0.9.0-0275028998de/help-media/si-eres-alumno__entrar-con-usuario-y-contrasena/01-usuario.webp)
4. Pulsa **Iniciar sesión**.

La primera vez, antes de nada, sale la pantalla **Cambia tu contraseña**, que te recuerda con qué usuario estás entrando. Ahí eliges tu propia contraseña: lo explica [cambiar la contraseña la primera vez](/ayuda/si-eres-alumno/cambiar-la-contrasena-la-primera-vez). Después ya entras siempre con tu usuario y la contraseña que hayas elegido.

![La pantalla Cambia tu contraseña, nada más entrar la primera vez](https://s3.services.devbeply.es/help-media/itakai/v0.9.0-0275028998de/help-media/si-eres-alumno__entrar-con-usuario-y-contrasena/02-primera-vez.webp)

## Si no te deja entrar

- **«Credenciales inválidas».** El usuario o la contraseña no coinciden. Revisa que no sobre ningún espacio y que la contraseña tenga las mayúsculas y las minúsculas en su sitio. La temporal nunca lleva el cero ni la O mayúscula, ni el uno, la ele minúscula o la i mayúscula, justo para que no se confundan.
- **«Demasiadas peticiones».** Te has equivocado muchas veces seguidas. Espera el tiempo que dice y vuelve a probar con calma.
- **«Cuenta suspendida o inactiva».** Habla con tu docente.
- **Has olvidado la contraseña.** Mira [he olvidado mi contraseña y no tengo correo](/ayuda/si-eres-alumno/he-olvidado-mi-contrasena-y-no-tengo-correo).

## Tu cuenta

Tu usuario lo tienes en **Mi perfil**, pestaña **Seguridad**, en la tarjeta **Tu cuenta**. No se puede cambiar, y la cuenta no tiene correo ni se le puede añadir: la lleva tu profesorado, así que si necesitas algún cambio, pídeselo.

Con ella puedes unirte a otras clases con su código, como cualquiera: [cómo entro en mi clase](/ayuda/si-eres-alumno/como-entro-en-mi-clase).$itakai090$),
    ('si-eres-alumno', 'he-olvidado-mi-contrasena-y-no-tengo-correo', 'https://s3.services.devbeply.es/help-media/itakai/v0.9.0-0275028998de/help-media/si-eres-alumno__he-olvidado-mi-contrasena-y-no-tengo-correo/si-eres-alumno__he-olvidado-mi-contrasena-y-no-tengo-correo-portada.webp', 'https://s3.services.devbeply.es/help-media/itakai/v0.9.0-0275028998de/help-media/si-eres-alumno__he-olvidado-mi-contrasena-y-no-tengo-correo/si-eres-alumno__he-olvidado-mi-contrasena-y-no-tengo-correo.mp4?v=audio-20261120', 66, 'a3aa3c814a0440287b68b1dec49edcf3', $itakai090$El enlace **¿Olvidaste tu contraseña?**, en la pantalla de entrada, manda un correo para recuperarla. Si entras con un usuario que te dio tu docente, tu cuenta no tiene correo y ese enlace no te sirve: no hay a dónde mandarlo. Si escribes mal la contraseña, lo que verás es **«Credenciales inválidas»**.

![El aviso Credenciales inválidas en la pantalla de entrada](https://s3.services.devbeply.es/help-media/itakai/v0.9.0-0275028998de/help-media/si-eres-alumno__he-olvidado-mi-contrasena-y-no-tengo-correo/01-error.webp)

## Qué hacer

Pídeselo a tu docente. Puede **restablecer tu contraseña** desde la pestaña **Alumnado** de la clase, en tu menú: la plataforma genera una temporal nueva y te la da, en una tarjeta o como prefiera.

![El menú de la estudiante en la pestaña Alumnado, con Restablecer contraseña](https://s3.services.devbeply.es/help-media/itakai/v0.9.0-0275028998de/help-media/si-eres-alumno__he-olvidado-mi-contrasena-y-no-tengo-correo/03-restablecer.webp)

Con ella:

1. Entra con tu usuario y esa contraseña temporal.
2. Elige otra vez una contraseña tuya, en la pantalla **Cambia tu contraseña**, como la primera vez: [cambiar la contraseña la primera vez](/ayuda/si-eres-alumno/cambiar-la-contrasena-la-primera-vez).

![La pantalla Cambia tu contraseña, después de entrar con la temporal nueva](https://s3.services.devbeply.es/help-media/itakai/v0.9.0-0275028998de/help-media/si-eres-alumno__he-olvidado-mi-contrasena-y-no-tengo-correo/05-cambiar.webp)

La contraseña de antes deja de funcionar y se cierran todas tus sesiones, también la de un equipo donde te la hubieras dejado abierta.

## Quién puede hacerlo

Tu cuenta la lleva el profesorado de la clase donde se creó, normalmente la de quien te la dio. Si se lo pides a otra persona del profesorado y no puede, la plataforma le dice a quién le toca. También puede hacerlo quien administra la plataforma en tu centro.

## Si has olvidado el usuario

También te lo dice tu docente, que lo ve en tu ficha. Y si todavía tienes la sesión abierta en algún sitio, lo tienes en **Mi perfil**, pestaña **Seguridad**, tarjeta **Tu cuenta**.

## Para que no vuelva a pasar

Nadie más que tú sabe tu contraseña, ni siquiera tu docente: si la pierdes, solo se puede poner una nueva. Elige una que recuerdes.$itakai090$),
    ('si-eres-alumno', 'he-perdido-un-punto-de-vida', 'https://s3.services.devbeply.es/help-media/itakai/v0.9.0-0275028998de/help-media/si-eres-alumno__he-perdido-un-punto-de-vida/si-eres-alumno__he-perdido-un-punto-de-vida-portada.webp', 'https://s3.services.devbeply.es/help-media/itakai/v0.9.0-0275028998de/help-media/si-eres-alumno__he-perdido-un-punto-de-vida/si-eres-alumno__he-perdido-un-punto-de-vida.mp4?v=audio-20261120', 65, '07d5546edac72909f5944bac329be904', $itakai090$Los puntos de vida son la parte de la clase que mide cómo te comportas, no lo que entregas. Los tienes en la cabecera de la clase, junto al corazón: cada clase empieza con 100.

![La cabecera de la clase, con los puntos de vida junto al corazón](https://s3.services.devbeply.es/help-media/itakai/v0.9.0-0275028998de/help-media/si-eres-alumno__he-perdido-un-punto-de-vida/01-vidas.webp)

## Por qué se pierden

Los quita tu docente cuando pasa algo que ha marcado como comportamiento negativo: no entregar a tiempo, interrumpir la clase, saltarse una norma del aula. Cada clase tiene su lista, y la decide quien da la clase, no la aplicación.

En la portada de la clase, en **Actividad reciente**, ves qué comportamiento te han aplicado, quién lo ha hecho y cuántos puntos te ha quitado.

![La actividad reciente, con el comportamiento que ha restado puntos de vida](https://s3.services.devbeply.es/help-media/itakai/v0.9.0-0275028998de/help-media/si-eres-alumno__he-perdido-un-punto-de-vida/02-actividad.webp)

## Qué pasa si me quedo sin

Quedarte sin vidas **no significa suspender**. La nota no depende de esto, y la aplicación no te bloquea nada: puedes seguir entregando y usando la tienda. Lo que pase después lo decide tu docente; mira la **Guía** de tu clase por si lo explica.

## Cómo se recuperan

Igual que se pierden: con comportamientos positivos. Ayudar a alguien de clase, participar, entregar antes de tiempo. Tu docente las devuelve del mismo sitio de donde las quita. Y si tu clase tiene tienda, puede que haya algo en ella que te devuelva puntos de vida: lo verás con un corazón y los puntos que recupera, como la **Poción de vida**.

![Un artículo de la tienda que devuelve puntos de vida](https://s3.services.devbeply.es/help-media/itakai/v0.9.0-0275028998de/help-media/si-eres-alumno__he-perdido-un-punto-de-vida/03-tienda.webp)

## Si crees que hay un error

Habla con tu docente. Los puntos de vida los mueve una persona a mano, así que también se pueden deshacer a mano. En la aplicación no hay ningún automatismo que te quite vidas por su cuenta.$itakai090$),
    ('si-eres-alumno', 'la-clasificacion-de-la-clase', 'https://s3.services.devbeply.es/help-media/itakai/v0.9.0-0275028998de/help-media/si-eres-alumno__la-clasificacion-de-la-clase/si-eres-alumno__la-clasificacion-de-la-clase-portada.webp', 'https://s3.services.devbeply.es/help-media/itakai/v0.9.0-0275028998de/help-media/si-eres-alumno__la-clasificacion-de-la-clase/si-eres-alumno__la-clasificacion-de-la-clase.mp4?v=audio-20261120', 62, '6ae678e214f68756bf09d6a7c0cdf6c3', $itakai090$Algunas clases tienen clasificación y otras no: lo decide tu docente. Si la tuya la tiene, está en la pestaña **Ranking** de la clase (en el móvil, la de las barras).

## Qué mide

Ordena por experiencia acumulada en esa clase. No mide notas, ni cuánto has acertado, ni lo bien que ha salido un trabajo: mide lo que llevas hecho. Arriba del todo tienes el **Podio de la clase**, con los tres primeros puestos.

![El podio de la clase, ordenado por experiencia](https://s3.services.devbeply.es/help-media/itakai/v0.9.0-0275028998de/help-media/si-eres-alumno__la-clasificacion-de-la-clase/02-podio.webp)

Por eso alguien constante suele estar arriba aunque no saque las mejores notas.

Si tu clase tiene equipos, encima del podio ves también la **Clasificación de equipos**, por los puntos de cada equipo: lo cuenta [mi equipo](/ayuda/si-eres-alumno/mi-equipo).

![La pestaña Ranking, con la clasificación de equipos arriba](https://s3.services.devbeply.es/help-media/itakai/v0.9.0-0275028998de/help-media/si-eres-alumno__la-clasificacion-de-la-clase/01-equipos.webp)

## Dónde estás tú

Debajo del podio y de las **Estadísticas** de la clase está el **Resto del ranking**. Tu fila sale marcada con **Tú**. En la portada de la clase, tu tarjeta también te dice en qué puesto vas.

![El resto del ranking, con tu puesto marcado](https://s3.services.devbeply.es/help-media/itakai/v0.9.0-0275028998de/help-media/si-eres-alumno__la-clasificacion-de-la-clase/03-resto.webp)

## Qué no se ve

En la clasificación aparecen el alias, el avatar, el nivel, la experiencia y las misiones completadas de cada persona. **Nadie ve tus entregas ni tus porcentajes**, ni tú los de los demás. Eso es entre tu docente y tú.

## Si te agobia

Díselo a tu docente: la clasificación se puede apagar para toda la clase. Está pensada para picarse un poco, no para pasarlo mal.

## Empezar tarde

Si te has incorporado con el curso empezado vas a estar abajo, y es normal: los demás llevan más misiones hechas. Lo que cuenta para tu nota no es el puesto, es lo que entregas.$itakai090$),
    ('si-eres-alumno', 'mi-avatar-y-mi-nombre-en-clase', 'https://s3.services.devbeply.es/help-media/itakai/v0.9.0-0275028998de/help-media/si-eres-alumno__mi-avatar-y-mi-nombre-en-clase/si-eres-alumno__mi-avatar-y-mi-nombre-en-clase-portada.webp', 'https://s3.services.devbeply.es/help-media/itakai/v0.9.0-0275028998de/help-media/si-eres-alumno__mi-avatar-y-mi-nombre-en-clase/si-eres-alumno__mi-avatar-y-mi-nombre-en-clase.mp4?v=audio-20261120', 70, 'bc9eb49ad94552626a06d1c52d80b334', $itakai090$En cada clase tienes un avatar y un alias. Al unirte te ponen unos al azar, y puedes cambiarlos cuando quieras.

## Son por clase

Lo importante: **el avatar y el alias son de cada clase**, no de tu cuenta. Puedes ser una cosa en Historia y otra en Matemáticas. Al cambiarlos en una clase, las demás se quedan como estaban.

## Dónde se cambian

Dentro de la clase, en la pestaña **Avatar** (en el móvil, la última, la del muñeco). Arriba ves tu avatar grande y, debajo, tu alias. Cambia lo que quieras y pulsa **Guardar cambios**.

![La pestaña Avatar, con el avatar grande y el alias](https://s3.services.devbeply.es/help-media/itakai/v0.9.0-0275028998de/help-media/si-eres-alumno__mi-avatar-y-mi-nombre-en-clase/01-avatar.webp)

## El alias

Es el nombre con el que apareces en la clase: en el ranking, si tu clase lo tiene activado, en tu equipo y en las entregas que revisa tu docente. Puede tener hasta 20 caracteres. Tu docente también ve tu nombre real, que es el que necesita para las notas.

Ponte algo que puedas enseñar en clase: si no lo es, tu docente puede cambiártelo.

## El avatar

En **Elige a tu guía para esta clase**, pulsa uno de los personajes de la lista.

![Los personajes para elegir guía](https://s3.services.devbeply.es/help-media/itakai/v0.9.0-0275028998de/help-media/si-eres-alumno__mi-avatar-y-mi-nombre-en-clase/02-personaje.webp)

Si quieres uno a tu gusto, describe cómo lo quieres en **Describe cómo quieres que sea tu avatar** y pulsa **Genera avatar**: la inteligencia artificial lo crea a partir del personaje que hayas elegido. Cuantos más detalles des de los colores, la ropa y el estilo, mejor.

![La descripción para que la IA genere un avatar a tu gusto](https://s3.services.devbeply.es/help-media/itakai/v0.9.0-0275028998de/help-media/si-eres-alumno__mi-avatar-y-mi-nombre-en-clase/03-generar.webp)

Al guardar, en **Así te ven en esta clase** ves cómo sales en pequeño en el ranking, en tu equipo y en las entregas: con la cara de tu personaje y tu alias.

![El avatar y el alias nuevos, tal y como se ven en la clase](https://s3.services.devbeply.es/help-media/itakai/v0.9.0-0275028998de/help-media/si-eres-alumno__mi-avatar-y-mi-nombre-en-clase/04-guardado.webp)

Como el alias, tiene que poder enseñarse en clase: si no lo es, tu docente puede cambiarlo por uno de los personajes de la lista. Después puedes elegir otro personaje o generar uno nuevo. Si lo que retira es una imagen hecha con IA, esa imagen se borra y no se puede recuperar.$itakai090$),
    ('si-eres-alumno', 'mi-equipo', 'https://s3.services.devbeply.es/help-media/itakai/v0.9.0-0275028998de/help-media/si-eres-alumno__mi-equipo/si-eres-alumno__mi-equipo-portada.webp', 'https://s3.services.devbeply.es/help-media/itakai/v0.9.0-0275028998de/help-media/si-eres-alumno__mi-equipo/si-eres-alumno__mi-equipo.mp4?v=audio-20261120', 49, 'da6047036fbc4acb73a475c0c272407b', $itakai090$Si en tu clase hay equipos, en la portada de la clase tienes la tarjeta **Mi equipo**: con qué equipo estás, en qué agrupación (por ejemplo, la de todo el curso) y quién más está en él, con su alias. Tú sales marcada con **Tú**.

![La tarjeta Mi equipo, en la portada de la clase](https://s3.services.devbeply.es/help-media/itakai/v0.9.0-0275028998de/help-media/si-eres-alumno__mi-equipo/01-mi-equipo.webp)

Puedes estar en más de un equipo a la vez: uno fijo para todo el curso y otro para una misión o una actividad concreta.

## Los puntos de tu equipo

Cuando tu equipo hace algo bien, el profesorado puede darle puntos. Si la clase tiene la clasificación activada, ves los puntos de tu equipo en **Mi equipo** y la **Clasificación de equipos** arriba de la pestaña **Ranking**. De los demás equipos solo se ve el nombre y los puntos.

![La clasificación de equipos, en la pestaña Ranking](https://s3.services.devbeply.es/help-media/itakai/v0.9.0-0275028998de/help-media/si-eres-alumno__mi-equipo/02-clasificacion.webp)

A veces el premio de equipo también te da XP, monedas o maná a ti: lo verás en tu actividad, como cualquier otro comportamiento o recompensa.

## Misiones por equipos

Si una misión se hace por equipos, lo pone arriba al abrirla, con tu equipo y quién más está en él. Aun así, **cada integrante entrega su parte**: ponte de acuerdo con tu equipo y sube tu entrega como siempre.

![Una misión por equipos, con el aviso de tu equipo arriba](https://s3.services.devbeply.es/help-media/itakai/v0.9.0-0275028998de/help-media/si-eres-alumno__mi-equipo/03-mision.webp)$itakai090$),
    ('si-eres-alumno', 'que-son-el-xp-las-monedas-y-el-mana', 'https://s3.services.devbeply.es/help-media/itakai/v0.9.0-0275028998de/help-media/si-eres-alumno__que-son-el-xp-las-monedas-y-el-mana/si-eres-alumno__que-son-el-xp-las-monedas-y-el-mana-portada.webp', 'https://s3.services.devbeply.es/help-media/itakai/v0.9.0-0275028998de/help-media/si-eres-alumno__que-son-el-xp-las-monedas-y-el-mana/si-eres-alumno__que-son-el-xp-las-monedas-y-el-mana.mp4?v=audio-20261120', 69, '1ffeecd0bad336af5330b2d260bd43bc', $itakai090$Las misiones te dan tres cosas y es fácil confundirlas. Se ganan igual, pero no sirven para lo mismo. En la cabecera de tu clase tienes siempre a la vista tus puntos de vida, tus monedas y tu maná.

![La cabecera de la clase, con los puntos de vida, las monedas y el maná](https://s3.services.devbeply.es/help-media/itakai/v0.9.0-0275028998de/help-media/si-eres-alumno__que-son-el-xp-las-monedas-y-el-mana/01-cabecera.webp)

## XP: tu progreso

La experiencia mide lo que llevas hecho en la clase. Es lo que te hace subir de nivel y cambiar de rango: en tu tarjeta, en la portada de la clase, ves tu nivel y cuánto XP te falta para el siguiente. Y **no se gasta en la tienda**: por mucho que compres, tu XP sigue donde estaba. Solo baja si tu docente te aplica un comportamiento negativo que quita XP o si usas una [pista de una misión](/ayuda/si-eres-alumno/usar-las-pistas-de-una-mision) que se paga con XP.

![La tarjeta con el nivel y el XP](https://s3.services.devbeply.es/help-media/itakai/v0.9.0-0275028998de/help-media/si-eres-alumno__que-son-el-xp-las-monedas-y-el-mana/02-xp.webp)

## Monedas: para gastar

Las monedas se ganan igual que el XP, pero son dinero. Se gastan en la **Tienda** de tu clase (en el móvil, la pestaña de la bolsa), en lo que haya puesto tu docente: desde una recompensa de un solo uso hasta algo que te quedas para siempre. Cada artículo lleva su precio junto al botón **Comprar**.

![La tienda de la clase, con el precio de cada artículo](https://s3.services.devbeply.es/help-media/itakai/v0.9.0-0275028998de/help-media/si-eres-alumno__que-son-el-xp-las-monedas-y-el-mana/03-tienda.webp)

Estas sí bajan cuando compras, y cuando usas una pista que se paga con monedas.

## Maná: para los poderes

El maná es para los **poderes** de la tienda, los artículos con el icono del rayo. Un poder se compra con monedas, y cada vez que lo usas gasta el maná que pone en **Usar**. Cada compra te da una carga, y cada uso gasta una.

![Un poder de la tienda: se compra con monedas y se usa con maná](https://s3.services.devbeply.es/help-media/itakai/v0.9.0-0275028998de/help-media/si-eres-alumno__que-son-el-xp-las-monedas-y-el-mana/04-poder.webp)

No todo el profesorado lo activa: si en tu clase no aparece, es que esa clase no lo usa.

## Qué usa tu clase

Cada docente elige qué recursos tiene su clase. Puede que en una uses las tres cosas y en otra solo XP. Mira la cabecera de la clase para ver qué hay en juego, y la **Actividad reciente**, en la portada, para ver de dónde ha salido cada cosa que has ganado o gastado.$itakai090$),
    ('si-eres-alumno', 'usar-las-pistas-de-una-mision', 'https://s3.services.devbeply.es/help-media/itakai/v0.9.0-0275028998de/help-media/si-eres-alumno__usar-las-pistas-de-una-mision/si-eres-alumno__usar-las-pistas-de-una-mision-portada.webp', 'https://s3.services.devbeply.es/help-media/itakai/v0.9.0-0275028998de/help-media/si-eres-alumno__usar-las-pistas-de-una-mision/si-eres-alumno__usar-las-pistas-de-una-mision.mp4?v=audio-20261120', 61, '86041cf81e3420f78ace4fb178536488', $itakai090$Algunas misiones tienen **pistas**: ayudas que ha escrito tu docente para cuando te atascas. Están en la misión, en la sección **Pistas**, debajo de los enigmas.

![La sección Pistas de una misión](https://s3.services.devbeply.es/help-media/itakai/v0.9.0-0275028998de/help-media/si-eres-alumno__usar-las-pistas-de-una-mision/01-pistas.webp)

## Cómo funcionan

- Ves cuántas pistas hay y lo que cuesta cada una, pero **su texto solo aparece cuando la usas**.
- Se usan **en orden**: primero la 1, luego la 2… Las que van después salen con un candado y te dicen cuál tienes que usar antes («Se abre después de la pista 2»).
- Una pista usada se queda abierta, marcada como **Usada**: puedes volver a leerla cuando quieras.

## Lo que cuestan

Debajo del botón **Usar la pista** ves lo que cuesta y lo que tienes, antes de pulsarlo (por ejemplo, «Cuesta 10 Monedas. Tienes 48.»):

- **Monedas** o **XP**: se pagan en el momento. Si no te llega, el botón no se puede pulsar y te dice cuánto te falta. Pagar con XP puede bajarte de nivel, pero no pierdes las insignias que ya tienes.
- **Un % de la recompensa**: no pagas nada en ese momento, pero la misión te dará ese porcentaje menos de **lo que aún te queda por cobrar**: los enigmas que te faltan por aprobar (también los que están en revisión) y el bonus por completarla. Lo que ya has cobrado no cambia. En la tarjeta **Recompensas** de la misión ves cuánto restan tus pistas.
- Si pone **Gratis**, no cuesta nada.

![Una pista con su coste y el botón Usar la pista](https://s3.services.devbeply.es/help-media/itakai/v0.9.0-0275028998de/help-media/si-eres-alumno__usar-las-pistas-de-una-mision/02-coste.webp)

Al pulsar **Usar la pista** se usa al momento, sin más preguntas, y no tiene vuelta atrás: piénsalo antes. Su texto aparece en ese mismo sitio.

![La pista recién usada, con su texto a la vista](https://s3.services.devbeply.es/help-media/itakai/v0.9.0-0275028998de/help-media/si-eres-alumno__usar-las-pistas-de-una-mision/03-usada.webp)

## Cuándo se pueden usar

Mientras la misión sigue en curso. Cuando la completas, o si pasa su fecha de entrega, ya no se pueden usar más pistas; las que usaste siguen abiertas.

## Las pistas de la tienda

Si en la tienda de tu clase hay una pista que se compra, esa es distinta: te la da tu docente cuando la usas. Las pistas de una misión se abren solas.$itakai090$),
    ('tu-cuenta', 'accesibilidad', 'https://s3.services.devbeply.es/help-media/itakai/v0.9.0-0275028998de/help-media/tu-cuenta__accesibilidad/tu-cuenta__accesibilidad-portada.webp', 'https://s3.services.devbeply.es/help-media/itakai/v0.9.0-0275028998de/help-media/tu-cuenta__accesibilidad/tu-cuenta__accesibilidad.mp4?v=audio-20261120', 76, 'da87bce514505b7232ac4c0c27065530', $itakai090$La plataforma tiene cuatro ajustes de accesibilidad que se guardan **en tu cuenta**, así que te acompañan de un ordenador del aula a otro.

Están en **Mi perfil**, pestaña **Configuración**, en el bloque **Accesibilidad**. También los tienes en el botón **Accesibilidad** de las pantallas públicas, como la de inicio de sesión, porque quien no puede leer esa pantalla tampoco puede entrar a agrandarla.

![Mi perfil, con la pestaña Configuración](https://s3.services.devbeply.es/help-media/itakai/v0.9.0-0275028998de/help-media/tu-cuenta__accesibilidad/01-configuracion.webp)

Cada cambio se aplica y se guarda al momento: no hay botón de guardar.

## Tamaño de letra

**Normal**, **Grande** o **Muy grande**. Agranda el texto y los iconos de toda la plataforma, no solo de una pantalla.

![El bloque Accesibilidad con sus cuatro ajustes](https://s3.services.devbeply.es/help-media/itakai/v0.9.0-0275028998de/help-media/tu-cuenta__accesibilidad/02-letra.webp)

## Contraste

El contraste **Alto** refuerza los textos secundarios, los bordes y el foco del teclado. Es útil con baja visión y también con un proyector malo o un aula muy iluminada.

## Visión del color

Tres modos, uno por tipo de daltonismo: **Protanopía**, **Deuteranopía** y **Tritanopía** (**Sin ajuste** deja la paleta normal). Cambian la paleta de toda la plataforma para que los estados sigan distinguiéndose: lo que estaba en rojo pasa a bermellón y lo verde a verde azulado, conservando el mismo nivel de claridad.

Debajo hay una tira de muestras —Correcto, Error, Aviso, Información, Destacado— que cambia contigo, para que compruebes de un vistazo si los distingues.

![Los modos de visión del color y la tira de muestras](https://s3.services.devbeply.es/help-media/itakai/v0.9.0-0275028998de/help-media/tu-cuenta__accesibilidad/03-color.webp)

## Menos animación

El interruptor **Menos animación** reduce las transiciones y los efectos de movimiento, incluida la animación de subir de nivel. Complementa al ajuste del sistema operativo, que en un ordenador compartido no siempre está a mano.

![El inicio con la letra grande y el contraste alto](https://s3.services.devbeply.es/help-media/itakai/v0.9.0-0275028998de/help-media/tu-cuenta__accesibilidad/04-inicio.webp)

Si eres estudiante, los ajustes están en el mismo sitio: tu perfil, pestaña **Configuración**.$itakai090$),
    ('tu-cuenta', 'avisos-y-recordatorios', 'https://s3.services.devbeply.es/help-media/itakai/v0.9.0-0275028998de/help-media/tu-cuenta__avisos-y-recordatorios/tu-cuenta__avisos-y-recordatorios-portada.webp', 'https://s3.services.devbeply.es/help-media/itakai/v0.9.0-0275028998de/help-media/tu-cuenta__avisos-y-recordatorios/tu-cuenta__avisos-y-recordatorios.mp4?v=audio-20261120', 79, '6a892bcff0398ef67ae93fcabdbb5bab', $itakai090$Los avisos aparecen **siempre dentro de la plataforma**, en **Avisos**, en el menú de la izquierda. Al lado verás cuántos tienes sin leer; en el móvil, ese número sale también sobre el botón que abre el menú.

En **Avisos** puedes ver **Todos** o solo los **Sin leer**, marcarlos como leídos (uno a uno o con **Marcar todos como leídos**) y eliminarlos con la papelera. Si un aviso lleva a algún sitio, al pulsarlo vas directamente allí.

![Avisos de la docente, con el filtro Sin leer](https://s3.services.devbeply.es/help-media/itakai/v0.9.0-0275028998de/help-media/tu-cuenta__avisos-y-recordatorios/01-avisos.webp)

## Qué te avisa

Si eres **docente**:

- Cuando alguien del alumnado hace una entrega en una clase donde tienes acceso de edición o de administración. El aviso te lleva directamente a la misión, con la ventana de entregas de ese enigma abierta para que la revises. En cuanto alguien del profesorado la aprueba, el aviso queda como leído para todo el profesorado.
- Cuando cambia tu sitio en el profesorado de una clase: te añaden, te cambian el perfil o el nivel, te quitan o pasa a ser tuya su propiedad.
- **Tres días antes de que se borre para siempre** una clase tuya que está en la [papelera](/ayuda/clases/la-papelera-de-clases). El aviso lleva a la papelera, por si quieres restaurarla.

![Un aviso de entrega nueva, sin leer](https://s3.services.devbeply.es/help-media/itakai/v0.9.0-0275028998de/help-media/tu-cuenta__avisos-y-recordatorios/02-aviso.webp)

![La ventana de entregas del enigma, abierta desde el aviso](https://s3.services.devbeply.es/help-media/itakai/v0.9.0-0275028998de/help-media/tu-cuenta__avisos-y-recordatorios/03-entregas.webp)

Si eres **estudiante**:

- Cuando tu docente ha revisado una entrega, con el porcentaje que te ha puesto.
- **Cuando faltan menos de 24 horas para el final de una misión** que todavía no has completado.
- Cuando consigues una de las insignias de la plataforma, las que se ganan por misiones completadas, experiencia o nivel. Este aviso solo sale en la plataforma, nunca por correo.

![El menú de la estudiante, con el número de avisos sin leer](https://s3.services.devbeply.es/help-media/itakai/v0.9.0-0275028998de/help-media/tu-cuenta__avisos-y-recordatorios/04-alumna.webp)

![Avisos de la estudiante: entregas revisadas e insignia nueva](https://s3.services.devbeply.es/help-media/itakai/v0.9.0-0275028998de/help-media/tu-cuenta__avisos-y-recordatorios/05-revisada.webp)

## Los dos interruptores del alumnado

En tu perfil, pestaña **Configuración**, tarjeta **Avisos**:

- **Avisos por correo.** Con él encendido, las entregas revisadas y los recordatorios te llegan también al correo. Si lo apagas, los sigues viendo en la plataforma. Si tu cuenta no tiene correo, este interruptor no aparece: tus avisos se quedan en la plataforma.
- **Recordatorios de entrega.** Si lo apagas, dejas de recibir el aviso de las 24 horas, tanto en la plataforma como por correo. Las entregas revisadas te siguen llegando.

Cada cambio se guarda al momento.

![La tarjeta Avisos del perfil de la estudiante, con sus dos interruptores](https://s3.services.devbeply.es/help-media/itakai/v0.9.0-0275028998de/help-media/tu-cuenta__avisos-y-recordatorios/06-interruptores.webp)

## Los correos del profesorado

Los avisos del profesorado —entregas nuevas y cambios en el profesorado de una clase— **no se mandan por correo**, y es a propósito: treinta estudiantes entregando la misma misión llenarían el buzón. Se ven en **Avisos** y, clase a clase, en el **Resumen**, que cuenta las entregas por revisar.

La única excepción es el aviso de que una clase de tu papelera se va a borrar: llega una sola vez y lo que anuncia no tiene vuelta atrás, así que te llega también al correo, si tu cuenta tiene uno.

## En qué idioma llegan

En el idioma de tu cuenta, el que eliges en tu perfil. El aviso se escribe en tu idioma en el momento de crearse, así que si lo cambias después, los anteriores se quedan como estaban. La excepción, de momento, es el aviso de insignia nueva, que llega siempre en castellano.$itakai090$),
    ('tu-cuenta', 'seguridad-de-tu-cuenta', 'https://s3.services.devbeply.es/help-media/itakai/v0.9.0-0275028998de/help-media/tu-cuenta__seguridad-de-tu-cuenta/tu-cuenta__seguridad-de-tu-cuenta-portada.webp', 'https://s3.services.devbeply.es/help-media/itakai/v0.9.0-0275028998de/help-media/tu-cuenta__seguridad-de-tu-cuenta/tu-cuenta__seguridad-de-tu-cuenta.mp4?v=audio-20261120', 71, 'bcef1f912790f1523a85062fa93fe8e9', $itakai090$Todo está en **Mi perfil**, pestaña **Seguridad**: la contraseña, el correo y las sesiones abiertas.

![Mi perfil, pestaña Seguridad](https://s3.services.devbeply.es/help-media/itakai/v0.9.0-0275028998de/help-media/tu-cuenta__seguridad-de-tu-cuenta/01-seguridad.webp)

## Cambiar la contraseña

En la tarjeta **Contraseña**, escribe la **Contraseña actual** y dos veces la nueva (**Nueva contraseña** y **Confirmar contraseña**), de al menos 8 caracteres, y pulsa **Cambiar contraseña**. Al cambiarla se cierran tus sesiones abiertas en otros equipos; la del que estás usando sigue abierta. Si tu cuenta tiene correo, la plataforma te manda uno avisando del cambio: si no has sido tú, es la señal para reaccionar rápido.

![La tarjeta Contraseña rellena, con el botón Cambiar contraseña](https://s3.services.devbeply.es/help-media/itakai/v0.9.0-0275028998de/help-media/tu-cuenta__seguridad-de-tu-cuenta/03-contrasena.webp)

## Cambiar el correo

En la tarjeta **Correo electrónico**, escribe el **Correo nuevo** y tu **Contraseña actual**, y pulsa **Cambiar correo**. Te pide la contraseña porque el correo es lo que permite recuperar la cuenta. A partir de ese momento entras con el nuevo.

![La tarjeta Correo electrónico](https://s3.services.devbeply.es/help-media/itakai/v0.9.0-0275028998de/help-media/tu-cuenta__seguridad-de-tu-cuenta/04-correo.webp)

Si entras con Google y tu cuenta todavía no tiene contraseña, crea una antes: cierra sesión y usa **¿Olvidaste tu contraseña?**, en la pantalla de entrada.

## Si entras con un usuario

Si tu cuenta te la creó tu docente, en Seguridad verás la tarjeta **Tu cuenta**, con tu usuario. Esa cuenta no tiene correo ni se le puede añadir, y la lleva tu profesorado: cualquier cambio en ella se lo pides a tu docente. La contraseña sí la cambias tú, en la tarjeta **Contraseña**.

## Si la has olvidado

Desde la pantalla de inicio de sesión, **¿Olvidaste tu contraseña?** manda un enlace al correo de la cuenta. **El enlace caduca en una hora.** Si no llega, revisa la carpeta de no deseado antes de volver a pedirlo.

Si tu cuenta no tiene correo, ese enlace no te sirve: [tu docente te da una contraseña nueva](/ayuda/si-eres-alumno/he-olvidado-mi-contrasena-y-no-tengo-correo).

## Sesiones abiertas

En la tarjeta **Sesiones** ves dónde está abierta tu cuenta, con el navegador y cuándo se usó cada sesión por última vez. La del equipo que estás usando lleva la marca **Actual**.

Puedes cerrar una suelta con **Cerrar** o todas de golpe con **Cerrar todas**, que es lo que hay que hacer si te dejaste la sesión abierta en un ordenador del aula. Cerrarlas todas no te echa de la sesión desde la que lo haces.

![Las sesiones abiertas, con la actual marcada y el botón Cerrar todas](https://s3.services.devbeply.es/help-media/itakai/v0.9.0-0275028998de/help-media/tu-cuenta__seguridad-de-tu-cuenta/02-sesiones.webp)

## En equipos compartidos

Si usas un ordenador de aula, cierra sesión al terminar. Los [ajustes de accesibilidad](/ayuda/tu-cuenta/accesibilidad) se quedan guardados en tu cuenta, así que al volver a entrar en cualquier equipo los tienes otra vez sin tocar nada.$itakai090$),
    ('tu-cuenta', 'tu-avatar-de-docente', 'https://s3.services.devbeply.es/help-media/itakai/v0.9.0-0275028998de/help-media/tu-cuenta__tu-avatar-de-docente/tu-cuenta__tu-avatar-de-docente-portada.webp', 'https://s3.services.devbeply.es/help-media/itakai/v0.9.0-0275028998de/help-media/tu-cuenta__tu-avatar-de-docente/tu-cuenta__tu-avatar-de-docente.mp4?v=audio-20261120', 60, 'f53c12f622d7ebcb30de6579d5c5e5a4', $itakai090$Cada docente tiene un avatar, **uno por cuenta**: el mismo en todas sus clases. Sirve para que se sepa de un vistazo quién ha hecho qué, sobre todo en una [clase compartida](/ayuda/clases/compartir-una-clase-con-otros-profesores).

## Cómo es

Puede ser **uno de los personajes** (Atenea, Odiseo, Penélope, Polifemo o Poseidón) o **tus iniciales sobre un color**. Si no eliges nada, salen tus iniciales sobre un color que te da la plataforma, siempre el mismo. No hay fotos: no hace falta subir ni guardar imágenes de nadie.

## Cambiarlo

1. Abre **Mi perfil** y la pestaña **Configuración**.

![Mi perfil, con la pestaña Configuración](https://s3.services.devbeply.es/help-media/itakai/v0.9.0-0275028998de/help-media/tu-cuenta__tu-avatar-de-docente/01-configuracion.webp)

2. En **Tu avatar**, pulsa un personaje o, en **Tus iniciales sobre un color**, el color que quieras. **Automático** es el que te da la plataforma.

![Los personajes y los colores para tus iniciales](https://s3.services.devbeply.es/help-media/itakai/v0.9.0-0275028998de/help-media/tu-cuenta__tu-avatar-de-docente/02-personaje.webp)

Se aplica al momento, sin botón de guardar. Encima ves **Así te ven en tus clases**, con tu nombre, y el avatar nuevo aparece también junto a tu nombre en el menú.

![El avatar elegido junto al nombre, en el menú](https://s3.services.devbeply.es/help-media/itakai/v0.9.0-0275028998de/help-media/tu-cuenta__tu-avatar-de-docente/03-resultado.webp)

## Dónde sale

Junto a tu nombre:

- en el [historial de la clase](/ayuda/clases/el-historial-de-la-clase), en cada cosa que hayas hecho;
- en la sección **Profesorado** de los ajustes de cada clase, y en el **Resumen** de la clase que ve el alumnado;
- en la actividad del alumnado, en «Por…», cuando apruebas una entrega o aplicas un comportamiento o una recompensa;
- en la [asistencia](/ayuda/alumnado/pasar-lista-y-consultar-la-asistencia), en «Lista guardada por…».

Si cambias de avatar, todo eso pasa a enseñar el nuevo, también en lo que hiciste antes. Si algún día se borra tu cuenta, el historial conserva tu nombre y el avatar que tenías.

El avatar del alumnado es otra cosa: cada estudiante tiene uno en cada clase, como cuenta [avatares y alias por clase](/ayuda/alumnado/avatares-y-alias-por-clase).$itakai090$)
)
UPDATE help_articles AS a
SET cover_image = releases.cover,
    video_url = releases.video,
    video_duration_seconds = releases.duration,
    body = CASE WHEN md5(a.body) = releases.previous_body_hash THEN releases.body ELSE a.body END,
    updated_at = now()
FROM release_media AS releases
JOIN help_categories AS c ON c.slug = releases.category_slug AND c.area = 'ayuda'
WHERE a.category_id = c.id AND a.slug = releases.article_slug
  AND a.locale = 'es' AND a.status = 'publicado';


INSERT INTO help_categories (id, slug, name, description, icon, accent, area, order_index, updated_at)
VALUES (
  gen_random_uuid()::text, 'desarrollo', 'Desarrollo de ITAKAI',
  'Vídeos y materiales para empezar a desarrollar en ITAKAI.',
  'desarrollo', 'ia', 'ayuda', 100, now()
)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  icon = EXCLUDED.icon,
  accent = EXCLUDED.accent,
  updated_at = now();

WITH lessons (slug, position, title, summary, duration, steps, links) AS (
  VALUES
    (
      'bienvenida', 1, 'Bienvenida al curso de Itakai',
      'Conoce Itakai y el recorrido del curso. Veremos cómo encajan las herramientas de IA, el método BMAD y el entorno de desarrollo antes de trabajar sobre una funcionalidad real.',
      190, $md$1. Conoce las herramientas de IA del curso y cómo darles contexto para que trabajen sobre el proyecto.
2. Prepara el entorno de desarrollo y conecta herramientas al agente mediante MCP.
3. Usa BMAD-METHOD para convertir una idea o petición de cambio en un plan de trabajo.
4. Arranca ITAKAI en local, revisa cómo está organizado y comprueba que funciona.
5. Aplica el proceso al onboarding del profesorado y prueba y versiona el cambio.$md$,
      $md$- [BMAD-METHOD](https://github.com/bmad-code-org/BMAD-METHOD)$md$
    ),
    (
      'herramientas-ia', 2, 'Herramientas de IA para desarrollar',
      'Explora Claude Code, Codex, Antigravity CLI y OpenCode. Verás cómo cambia el trabajo al usar un asistente desde la terminal y qué contexto darle cuando le pides que trabaje sobre un proyecto.',
      458, $md$### Instalar las herramientas

Elige el sistema donde se ejecutan los comandos. Si usas WSL o te conectas a un servidor Linux desde VS Code, elige **Linux**.

<!-- commands:windows -->

Abre **PowerShell** y ejecuta el bloque de la herramienta que quieras instalar.

**Codex**

```powershell
powershell -ExecutionPolicy ByPass -c "irm https://chatgpt.com/codex/install.ps1 | iex"
```

**Claude Code**

```powershell
irm https://claude.ai/install.ps1 | iex
```

**Antigravity CLI**

```powershell
irm https://antigravity.google/cli/install.ps1 | iex
```

**OpenCode**

Descarga y extrae el binario oficial para equipos x64 o ARM64. Ejecuta `opencode` desde la misma ventana de PowerShell.

```powershell
$arch = if ([System.Runtime.InteropServices.RuntimeInformation]::OSArchitecture -eq 'Arm64') { 'arm64' } else { 'x64' }
$zip = Join-Path $env:TEMP "opencode-windows-$arch.zip"
$dest = Join-Path $env:LOCALAPPDATA 'OpenCode'
Invoke-WebRequest -Uri "https://opencode.ai/update/api/latest/cli/opencode/opencode-windows-$arch.zip" -OutFile $zip -ErrorAction Stop
Expand-Archive -LiteralPath $zip -DestinationPath $dest -Force -ErrorAction Stop
$opencode = Get-ChildItem -LiteralPath $dest -Filter opencode.exe -Recurse | Select-Object -First 1
if (-not $opencode) { throw 'No se encontró opencode.exe en el ZIP.' }
$env:Path = "$($opencode.DirectoryName);$env:Path"
```

<!-- commands:linux -->

Estos son los comandos de la terminal Linux del vídeo.

**Codex**

```bash
curl -fsSL https://chatgpt.com/codex/install.sh | sh
```

**Claude Code**

```bash
curl -fsSL https://claude.ai/install.sh | bash
```

**Antigravity CLI**

```bash
curl -fsSL https://antigravity.google/cli/install.sh | bash
```

**OpenCode**

```bash
curl -fsSL https://opencode.ai/v2/install | bash
```

<!-- commands:macos -->

Abre **Terminal**. Los bloques con `brew` requieren Homebrew.

**Codex**

```bash
brew install --cask codex
```

**Claude Code**

```bash
brew install --cask claude-code
```

**Antigravity CLI**

```bash
curl -fsSL https://antigravity.google/cli/install.sh | bash
```

**OpenCode**

```bash
brew install anomalyco/tap/opencode-v2
```

<!-- commands:end -->

### Abrir y probar un asistente

1. Abre una terminal en la carpeta del proyecto y ejecuta `codex`, `claude`, `agy` u `opencode`, según la herramienta que quieras probar.
2. Sigue el inicio de sesión que te muestre la herramienta.
3. En Antigravity CLI, escribe `/model` para ver los modelos disponibles. En el vídeo se usa Artificial Analysis para comparar inteligencia, tiempo por tarea y coste.

### Mensaje de prueba

Escribe el mismo mensaje que se usa en la demostración para comprobar que el asistente responde.

```text
hola
```$md$,
      $md$- [Guía de inicio de Claude Code](https://code.claude.com/docs/en/quickstart)
- [Guía de instalación de Codex CLI](https://learn.chatgpt.com/docs/codex/cli#getting-started)
- [Guía de Antigravity CLI](https://antigravity.google/docs/getting-started?tab=cli)
- [Instalación de OpenCode](https://opencode.ai/docs/)
- [Homebrew para macOS](https://brew.sh/)
- [Artificial Analysis](https://artificialanalysis.ai/)$md$
    ),
    (
      'entorno-y-mcp', 3, 'Prepara el entorno de Itakai con VS Code, Codex y MCP',
      'Sigue la configuración del entorno desde VS Code, abre el repositorio y recorre sus carpetas. Después verás cómo instalar los MCP de Playwright, Git y Context7 y comprobar desde Codex que responden.',
      558, $md$### Abrir el proyecto en VS Code

1. Instala VS Code. Si trabajas en un servidor como en el vídeo, instala la extensión **Remote - SSH**, conéctate al servidor y abre allí la terminal.
2. En VS Code, elige **Clonar repositorio**, pega la URL de ITAKAI y abre la carpeta `platform`. También puedes clonarlo desde la terminal.

```bash
git clone https://github.com/itakai-es/platform.git
cd platform
```

3. Abre la terminal integrada con `Ctrl+J`. Revisa el `README.md`, los archivos de Docker y los scripts. En `api/` está el backend con Prisma y en `app/` está el frontend, con sus páginas, componentes y traducciones. Instala la extensión de Vue si VS Code te la ofrece al abrir un archivo `.vue`.

### Configurar las herramientas con Codex

Desde la raíz del repositorio, ejecuta `codex`. Si tienes que iniciar sesión, hazlo en la terminal que vas a usar. En el vídeo se revisan las solicitudes de permisos según aparecen.

Pega el mensaje de instalación dentro de Codex.

```text
Instala:
Docker.
git, y los mcp para codex de playwright, git, y context7

dime que tengo que logear
```

### Comandos para configurar el entorno a mano

Elige el sistema de tu terminal. Ejecuta los bloques de Git y Playwright desde la carpeta `platform`. Playwright MCP requiere Node.js 20 o posterior.

<!-- commands:windows -->

**Dependencias en Windows con PowerShell**

```powershell
winget install --id Git.Git --exact
winget install --id OpenJS.NodeJS.LTS --exact
winget install --id Python.Python.3.13 --exact
winget install --id Docker.DockerDesktop --exact
```

Abre Docker Desktop y sigue la configuración inicial. Abre una ventana nueva de PowerShell para que reconozca los programas instalados.

**Git**

```powershell
$gitMcp = Join-Path $env:LOCALAPPDATA 'codex-mcp\git'
py -3.13 -m venv $gitMcp
& "$gitMcp\Scripts\python.exe" -m pip install mcp-server-git
codex mcp add git -- "$gitMcp\Scripts\mcp-server-git.exe" --repository (Get-Location).Path
```

**Playwright con Chromium**

```powershell
$playwrightMcp = Join-Path $env:LOCALAPPDATA 'codex-mcp\playwright'
New-Item -ItemType Directory -Path $playwrightMcp -Force | Out-Null
npm.cmd install --prefix $playwrightMcp @playwright/mcp
node "$playwrightMcp\node_modules\playwright\cli.js" install chromium
codex mcp add playwright -- node "$playwrightMcp\node_modules\@playwright\mcp\cli.js" --headless --browser chromium
```

<!-- commands:linux -->

**Dependencias en Ubuntu 26.04**

Git ya estaba instalado en el servidor de la grabación. El bloque también lo incluye para empezar en un equipo nuevo.

```bash
sudo apt-get update
sudo apt-get install -y git docker.io docker-compose-v2 nodejs npm python3-venv
```

Las rutas de los bloques siguientes usan tu carpeta de usuario.

**Git**

```bash
python3 -m venv "$HOME/.local/share/codex-mcp/git"
"$HOME/.local/share/codex-mcp/git/bin/pip" install mcp-server-git
codex mcp add git -- "$HOME/.local/share/codex-mcp/git/bin/mcp-server-git" --repository "$PWD"
```

**Playwright con Chromium**

Comprueba con `node --version` que tienes Node.js 20 o posterior.

```bash
mkdir -p "$HOME/.local/share/codex-mcp/playwright"
npm install --prefix "$HOME/.local/share/codex-mcp/playwright" @playwright/mcp
node "$HOME/.local/share/codex-mcp/playwright/node_modules/playwright/cli.js" install --with-deps chromium
codex mcp add playwright -- "$HOME/.local/share/codex-mcp/playwright/node_modules/.bin/playwright-mcp" --headless --browser chromium
```

<!-- commands:macos -->

**Dependencias en macOS con Homebrew**

```bash
brew install git node python
brew install --cask docker-desktop
```

Abre Docker Desktop y sigue la configuración inicial.

**Git**

```bash
python3 -m venv "$HOME/.local/share/codex-mcp/git"
"$HOME/.local/share/codex-mcp/git/bin/python" -m pip install mcp-server-git
codex mcp add git -- "$HOME/.local/share/codex-mcp/git/bin/mcp-server-git" --repository "$PWD"
```

**Playwright con Chromium**

```bash
mkdir -p "$HOME/.local/share/codex-mcp/playwright"
npm install --prefix "$HOME/.local/share/codex-mcp/playwright" @playwright/mcp
node "$HOME/.local/share/codex-mcp/playwright/node_modules/playwright/cli.js" install chromium
codex mcp add playwright -- "$HOME/.local/share/codex-mcp/playwright/node_modules/.bin/playwright-mcp" --headless --browser chromium
```

<!-- commands:end -->

**Context7**

```bash
codex mcp add context7 --url https://mcp.context7.com/mcp
```

Si Context7 te pide iniciar sesión, usa `codex mcp login context7`.

### Comprobar que funciona

Abre otra pestaña de la terminal para listar los servidores registrados.

```bash
codex mcp list
```

Abre una nueva sesión de Codex y pega el mensaje de comprobación.

```text
quiero que hagas una prueba para cada mcp instalado
```

En la grabación, Context7 buscó documentación de React, Playwright abrió el navegador y Git devolvió el estado del repositorio.$md$,
      $md$- [VS Code](https://code.visualstudio.com/)
- [Extensión Remote - SSH](https://marketplace.visualstudio.com/items?itemName=ms-vscode-remote.remote-ssh)
- [Repositorio de ITAKAI](https://github.com/itakai-es/platform)
- [Instalación de Docker](https://docs.docker.com/engine/install/)
- [Docker Desktop para Windows](https://docs.docker.com/desktop/setup/install/windows-install/)
- [Docker Desktop para macOS](https://docs.docker.com/desktop/setup/install/mac-install/)
- [Homebrew para macOS](https://brew.sh/)
- [Descarga de Node.js](https://nodejs.org/en/download)
- [Comandos MCP de Codex](https://learn.chatgpt.com/docs/developer-commands#codex-mcp)
- [Playwright MCP](https://github.com/microsoft/playwright-mcp)
- [Git MCP](https://github.com/modelcontextprotocol/servers/tree/main/src/git)
- [Context7](https://context7.com/docs/overview)$md$
    ),
    (
      'bmad-method', 4, 'BMAD-Method en Itakai',
      'Instala BMAD en el proyecto, consulta la ayuda desde Codex y revisa las opciones para planificar una funcionalidad.',
      246, $md$### Qué se hace en el vídeo

1. Instala BMAD desde Codex aprovechando la configuración de Itakai.
2. Consulta la ayuda para decidir cómo abordar una funcionalidad. En la grabación, `bmad-spec` ayuda a definir el alcance y los criterios y `bmad-build` ayuda a implementar.
3. Revisa la propuesta y divide el trabajo en análisis, requisitos, tareas, implementación y comprobación.

### Prompts de la guía para copiar

```text
Instala BMAD para Codex en este proyecto. Usa la configuración BMAD que ya tiene Itakai.
```

```text
$bmad-help ¿Cómo procedo para desarrollar una funcionalidad?
```

### Instalación en una copia nueva

Ejecuta los comandos desde la raíz del proyecto con Node.js, npm, Git y uv. Sirven para Linux, macOS y PowerShell. Si trabajas en Ubuntu por SSH, ejecútalos en Ubuntu.

```sh
npx skills add bmad-code-org/BMAD-METHOD/skills/core-tools --skill '*'
npx skills add bmad-code-org/BMAD-METHOD/skills/method --skill '*'
```

Elige Codex y el ámbito del proyecto. Abre Codex y ejecuta esta instrucción. Las skills disponibles pueden variar con la versión instalada.

```text
Usa la skill bmad para ejecutar bmad setup y después bmad status.
```

### Para practicar

```text
Queremos un asistente de primer acceso para profesores. Antes de implementar, revisa qué existe y hazme las preguntas necesarias para definir los criterios de aceptación.
```$md$,
      $md$- [Instalación y requisitos de BMAD](https://docs.bmad-method.org/start/install-bmad/)
- [Repositorio BMAD-METHOD](https://github.com/bmad-code-org/BMAD-METHOD)$md$
    ),
    (
      'itakai-en-local', 5, 'Arrancar Itakai en local',
      'Revisa los servicios de Docker Compose y las variables de entorno, arranca la plataforma y comprueba el acceso de usuarios y el chat desde Itakai.',
      684, $md$### Preparar el entorno

1. Abre `docker-compose.yml`. `postgres` guarda los datos, `api` atiende las peticiones y `app` sirve la interfaz. Adminer es opcional.
2. Crea los archivos `.env` que falten a partir de las plantillas de la raíz, `api/` y `app/`.

<!-- commands:windows -->

Ejecuta este bloque en PowerShell desde la raíz. Conserva los archivos `.env` que ya existan.

```powershell
foreach ($d in '.', 'api', 'app') {
  if (!(Test-Path "$d/.env")) { Copy-Item "$d/.env.example" "$d/.env" }
}
```

<!-- commands:linux -->

Ejecuta este bloque desde la raíz. Conserva los archivos `.env` que ya existan.

```bash
for d in . api app; do
  test -e "$d/.env" || cp "$d/.env.example" "$d/.env"
done
```

<!-- commands:macos -->

Ejecuta este bloque en Terminal desde la raíz. Conserva los archivos `.env` que ya existan.

```bash
for d in . api app; do
  test -e "$d/.env" || cp "$d/.env.example" "$d/.env"
done
```

<!-- commands:end -->

3. Revisa `POSTGRES_USER`, `POSTGRES_PASSWORD` y `POSTGRES_DB` en el archivo de la raíz. Compose construye la conexión de la API con el servicio `postgres` en el puerto 5432.
4. Define `NUXT_PUBLIC_API_BASE=http://localhost:3003` en el `.env` de la raíz y `CORS_ORIGIN=http://localhost:4000` en `api/.env`. Usa valores distintos para `JWT_ACCESS_SECRET` y `JWT_REFRESH_SECRET`.

### Arrancar y comprobar

Estos comandos son iguales en Linux, macOS y PowerShell. Ejecútalos desde la raíz.

```sh
docker compose config --services
docker compose up -d --build
docker compose ps
docker compose logs --tail=30 app api
```

Abre [http://localhost:4000](http://localhost:4000). Si trabajas por SSH en VS Code, reenvía 4000 para la web y 3003 para la API a los mismos puertos en tu equipo.

### Primer acceso

Con la API arrancada y el esquema inicializado, el comando de arranque inicial crea un administrador si aún no existe uno. Ejecuta el comando fuera de la grabación para mantener privada la contraseña generada.

```sh
docker compose exec api pnpm db:bootstrap
```

### Configurar el chat y probarlo como alumno

1. Ve a **Administración → Configuración → Inteligencia artificial → Texto**. Para reproducir la prueba con Gemini, usa el endpoint compatible con OpenAI que se indica abajo y una clave de Google AI Studio. En la prueba del curso se usó `gemini-3.1-flash-lite`.

```text
https://generativelanguage.googleapis.com/v1beta/openai/
```

2. Guarda los cambios. En **Administración → Cuentas**, comprueba que aparezca la cuenta de alumno que uses para la prueba.
3. Entra con esa cuenta, abre el asistente y compara la respuesta con las clases del panel del alumno.

```text
¿Cuántas clases tengo?
```

### Prompts de la guía para copiar

```text
Despliega la aplicación en local y configura las variables del entorno de desarrollo. Verifica que la web y la API están accesibles.
```

```text
Crea una cuenta local de prueba con rol de alumno. Indícame cómo acceder para comprobar el primer inicio de sesión.
```$md$,
      $md$- [Repositorio ITAKAI](https://github.com/itakai-es/platform)
- [Docker Compose de la revisión del vídeo](https://github.com/itakai-es/platform/blob/57e0fef/docker-compose.yml)
- [Plantilla de entorno de la raíz](https://github.com/itakai-es/platform/blob/57e0fef/.env.example)
- [Plantilla de entorno de la API](https://github.com/itakai-es/platform/blob/57e0fef/api/.env.example)
- [Google AI Studio](https://aistudio.google.com/)$md$
    ),
    (
      'onboarding-del-profesor', 6, 'Implementar el onboarding del profesor',
      'Sigue una funcionalidad real desde la especificación con BMAD hasta las pruebas del asistente de registro y la revisión de la PR en GitHub.',
      1191, $md$### Del encargo a la especificación

1. Localiza el registro del profesor, el primer acceso y dónde se guarda su perfil.
2. Abre Codex con el proyecto y pega el prompt que se escribe en el vídeo.

```text
$bmad-spec Queremos desarrollar un wizard para los profesores cuando se registren para pedir campos como colegio, experiencia, etc.
```

3. Concreta las preguntas del asistente, el catálogo de centros, la vista de administración y cómo retomar un registro pendiente.
4. Revisa `_bmad-output/specs/spec-registro-docente/SPEC.md` antes de implementar.

### Prompts de práctica de la guía

**Análisis**

```text
Localiza el registro, los roles, el perfil del profesor y el primer acceso. Indica los archivos y cómo se persiste el estado actual.
```

**Plan**

```text
Propón tareas pequeñas para detectar al profesor nuevo, mostrar el wizard, validar, guardar y marcar el onboarding como completado. Añade un criterio de aceptación por tarea.
```

**Implementación**

```text
Implementa la primera tarea acordada siguiendo las convenciones del proyecto. Resume los archivos que cambian y cómo probarla.
```

**Validación**

```text
Prueba el recorrido con un profesor nuevo, un profesor que ya terminó y un alumno. Comprueba qué ocurre con datos incompletos y después de recargar la página.
```

### Recorrer el asistente y revisar la PR

- **12:23**. Entra con la cuenta docente de pruebas, busca un centro y completa el cuestionario hasta llegar al panel.
- **14:34**. Abre **Mi perfil** y verifica los datos guardados.
- **15:18**. Busca al docente desde **Administración** y comprueba los filtros por centro en **Analítica del sistema**.
- **17:13**. Comprueba que la instancia de desarrollo usa otro puerto y su propia configuración.
- **17:41**. Sube la rama y abre una PR para que el equipo revise los cambios.
- **18:31**. Revisa el resumen, el commit y los archivos de la PR.

### Comandos de revisión

Los mismos comandos funcionan en Linux, macOS y PowerShell. Actualiza la referencia local de `origin/main` si necesitas compararla con su versión más reciente.

```sh
git status --short
git branch --show-current
git log -1 --oneline
git diff --stat origin/main...HEAD
git diff
```$md$,
      $md$- [Repositorio de ITAKAI](https://github.com/itakai-es/platform)
- [PR de onboarding que se revisa en el vídeo](https://github.com/itakai-es/platform/pull/20)
- [BMAD-METHOD](https://docs.bmad-method.org/)
- [Playwright](https://playwright.dev/docs/intro)
- [Revisión de cambios con Git](https://git-scm.com/docs/git-diff)$md$
    )
), lesson_media AS (
  SELECT lessons.*,
    'https://s3.services.devbeply.es/help-media/itakai/v0.9.0-0275028998de' || '/help-media/desarrollo__' || slug || '/' AS media,
    CASE WHEN slug = 'onboarding-del-profesor' THEN 'guia-de-la-leccion.txt' ELSE 'diapositivas.pdf' END AS material,
    CASE WHEN slug = 'onboarding-del-profesor' THEN 'Descargar guía de la lección (TXT)' ELSE 'Descargar diapositivas (PDF)' END AS material_label
  FROM lessons
)
INSERT INTO help_articles (
  id, category_id, slug, title, summary, cover_image, body, locale, status, order_index,
  audience, kind, video_url, video_duration_seconds, published_at, updated_at
)
SELECT
  gen_random_uuid()::text, category.id, lesson.slug, lesson.title, lesson.summary,
  lesson.media || 'desarrollo__' || lesson.slug || '-portada.webp',
  lesson.summary || E'\n\n## Material de la lección\n\n'
    || '- [' || lesson.material_label || '](' || lesson.media || lesson.material || E')\n\n'
    || E'## Pasos del vídeo\n\n' || lesson.steps
    || E'\n\n## Enlaces de interés\n\n' || lesson.links,
  'es', 'publicado', lesson.position, 'ambos', 'video',
  lesson.media || 'desarrollo__' || lesson.slug || '.mp4',
  lesson.duration, now(), now()
FROM lesson_media lesson
CROSS JOIN help_categories category
WHERE category.slug = 'desarrollo'

ON CONFLICT (category_id, slug, locale) DO UPDATE SET
  title = EXCLUDED.title,
  summary = EXCLUDED.summary,
  cover_image = EXCLUDED.cover_image,
  body = EXCLUDED.body,
  status = EXCLUDED.status,
  order_index = EXCLUDED.order_index,
  audience = EXCLUDED.audience,
  kind = EXCLUDED.kind,
  video_url = EXCLUDED.video_url,
  video_duration_seconds = EXCLUDED.video_duration_seconds,
  published_at = COALESCE(help_articles.published_at, EXCLUDED.published_at),
  updated_at = now();

COMMIT;
