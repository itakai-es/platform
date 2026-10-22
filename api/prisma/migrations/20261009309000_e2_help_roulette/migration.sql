-- Ayuda del bloque 4, E2: la ruleta. Una guía nueva para el profesorado (usar la
-- ruleta en clase) y tres retoques que la enlazan: los recursos de la clase
-- (efectos, sonido y menos animación), los niveles del profesorado (prácticas
-- también gira) y pasar lista (quien falta no sale en la ruleta).
--
-- Como el resto del contenido de serie, el panel de administración manda. El
-- INSERT solo crea lo que no exista y va al final de su categoría; cada UPDATE
-- solo cambia un campo si sigue exactamente con el texto de serie, así que lo que
-- alguien haya editado se queda como está. Siempre por slug de categoría y de
-- artículo, nunca por id.

-- gamificacion/usar-la-ruleta-en-clase
INSERT INTO "help_articles" ("id", "category_id", "slug", "title", "summary", "cover_image", "body", "locale", "status", "order_index", "featured", "audience", "kind", "published_at", "updated_at")
SELECT gen_random_uuid()::text, c."id", $itakai$usar-la-ruleta-en-clase$itakai$, $itakai$Usar la ruleta en clase$itakai$, $itakai$Elegir a alguien al azar en el proyector: sin repetir, sin quien falta hoy, con equipos, y qué hacer después.$itakai$, $itakai$/app/ayuda/recompensas.svg$itakai$, $itakai$La ruleta elige a alguien al azar delante de la clase, para salir a la pizarra, leer en voz alta o empezar una ronda. Se abre con el botón **Ruleta**, arriba en la página de la clase, y ocupa toda la ventana para que se vea bien en el proyector.

## Girar

Pulsa **Girar**, o la barra espaciadora o Intro. Junto a la rueda sale quien ha tocado y, para volver a girar, **Girar otra vez**. En la rueda se ve el alias de cada estudiante en la clase o, si no tiene, su nombre; nunca nada sacado de su correo. Cada nombre se ajusta al hueco de su sector, en una o dos líneas. Con muchas personas, si alguno no cabe entero, en la rueda sale recortado y en el resultado, completo.

**Pantalla completa** quita además los bordes del navegador, y **Salir** te devuelve a la clase. En algunos móviles no hay pantalla completa, pero la ruleta ya ocupa toda la ventana.

## Sin repetir

**Sin repetir** viene activado: quien ya ha salido no vuelve a salir hasta que pulses **Empezar de nuevo**. Se recuerda en ese dispositivo, para esa clase y durante el día; al día siguiente empieza una ronda nueva. Con **Quitar**, al lado de cada nombre, dejas a alguien fuera solo en esta ronda, y con **Volver a poner** vuelve a entrar.

## Quien falta hoy no sale

Si hoy ya has [pasado lista](/ayuda/alumnado/pasar-lista-y-consultar-la-asistencia), quien está ausente o con falta justificada no entra en la rueda. Como la pantalla la ve toda la clase, solo se dice cuántas personas faltan, nunca quiénes. Si aún no has pasado lista, entra todo el alumnado y se avisa, con un enlace para pasarla.

## Con equipos

Si la clase tiene [equipos](/ayuda/alumnado/formar-equipos), en el recuadro **Estudiantes**, encima de la lista, eliges:

- **Toda la clase**.
- **Un equipo**: solo sus integrantes que han venido.
- **Entre equipos**: los sectores son los equipos de una agrupación. Cuando sale uno, **Girar dentro de…** pasa a girar entre sus integrantes.

## Después del giro

Girar no da ni quita nada, y no se apunta en el historial. Si quieres premiar a quien ha salido, **Aplicar a…** (o **Premiar a…**, si ha salido un equipo) abre la misma ventana que la de [aplicar a varios estudiantes](/ayuda/gamificacion/aplicar-a-varios-estudiantes), con un comportamiento o una recompensa libre; a quien ha salido se le aplica al pulsar **Aplicar**, sin más pasos. Eso sí queda en el historial.

## Sonido y movimiento

Si la clase tiene activados los sonidos, la rueda suena al girar, y el botón **Sonido** la silencia en ese dispositivo. Con los efectos visuales activados, sale confeti con cada resultado. Si tienes activada **Menos animación** en la accesibilidad, o tu dispositivo pide menos movimiento, la rueda no gira: sale «Eligiendo…» un momento y después el resultado, sin confeti. Con lector de pantalla, cada resultado se anuncia una sola vez.

## Quién puede qué

Girar la ruleta lo puede hacer todo el profesorado de la clase, también el de prácticas. Aplicar algo a quien sale es de quien tiene **edición**, y en una clase archivada no se aplica nada.$itakai$, 'es', 'publicado'::"HelpArticleStatus", (SELECT COALESCE(MAX(a."order_index"), -1) + 1 FROM "help_articles" a WHERE a."category_id" = c."id"), false, 'profesor'::"HelpAudience", 'guia'::"HelpArticleKind", CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM "help_categories" c WHERE c."slug" = $itakai$gamificacion$itakai$
ON CONFLICT ("category_id", "slug", "locale") DO NOTHING;

-- clases/elegir-que-recursos-usa-tu-clase: la ruleta, el botón de sonido y menos animación.
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

Los rangos y los umbrales de experiencia no son un interruptor: se configuran en la sección **Niveles** de *Ajustes*. Las insignias se crean desde **Insignias**, en el menú lateral.

## Efectos, sonido y movimiento

Los efectos visuales y los sonidos son de la clase, pero cada persona puede bajarlos en su dispositivo: la [ruleta](/ayuda/gamificacion/usar-la-ruleta-en-clase) tiene un botón **Sonido** que silencia la app en ese dispositivo, y quien activa **Menos animación** en la accesibilidad, o tiene su dispositivo configurado para reducir el movimiento, no ve confeti ni animaciones.

## Apagar un recurso no borra nada

Si desactivas las monedas, dejan de verse y **dejan de repartirse al revisar entregas**, aunque los enigmas tengan monedas configuradas. Los saldos que ya tuviera tu alumnado se quedan guardados: al volver a activarlas, aparecen otra vez tal cual estaban.

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
| **Efectos visuales** | Animaciones como el confeti al subir de nivel |
| **Sonidos** | Efectos de sonido al subir de nivel, completar misiones y otros momentos |

Los rangos y los umbrales de experiencia no son un interruptor: se configuran en la sección **Niveles** de *Ajustes*. Las insignias se crean desde **Insignias**, en el menú lateral.

## Apagar un recurso no borra nada

Si desactivas las monedas, dejan de verse y **dejan de repartirse al revisar entregas**, aunque los enigmas tengan monedas configuradas. Los saldos que ya tuviera tu alumnado se quedan guardados: al volver a activarlas, aparecen otra vez tal cual estaban.

## Dependencias

Algunos ajustes necesitan otro para tener sentido —la tienda sin monedas no vende nada— y la propia pantalla te lo dice cuando ocurre. Y **al menos un recurso tiene que estar activo**: una clase sin ninguno no podría repartir nada al revisar una entrega.

> Empieza corto. Una clase con experiencia y misiones ya funciona el primer día; monedas, tienda y poderes se añaden cuando el grupo ya está rodado.$itakai$;

-- clases/niveles-y-perfiles-del-profesorado: con lectura también se gira la ruleta.
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

**Lectura.** Ve la clase entera —misiones, alumnado, asistencia, equipos, entregas, tienda, comportamientos, profesorado e historial— sin cambiar nada. Puede usar la [ruleta](/ayuda/gamificacion/usar-la-ruleta-en-clase), descargar las entregas, duplicar la clase y salir de ella. No recibe los avisos de entregas nuevas.

**Edición.** Además, cambia el contenido: la historia, la guía, el nombre, el horario y la portada de la clase; crea y edita misiones, enigmas y documentos; lleva la tienda y los comportamientos, y los aplica; da recompensas libres; [pasa lista](/ayuda/alumnado/pasar-lista-y-consultar-la-asistencia) y descarga la asistencia; forma equipos y los premia; aprueba entregas y gestiona las insignias vinculadas a las misiones de la clase. Le llega un aviso con cada entrega nueva.

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
| **Sustitución** | Edición |
| **Prácticas** | Lectura |

El perfil es una etiqueta: el nivel se elige aparte y se puede cambiar cuando haga falta. Si alguien en prácticas va a llevar la tienda durante unas semanas, dale edición y déjale el perfil.

## Los niveles

Cada nivel incluye todo lo del anterior.

**Lectura.** Ve la clase entera —misiones, alumnado, asistencia, equipos, entregas, tienda, comportamientos, profesorado e historial— sin cambiar nada. Puede descargar las entregas, duplicar la clase y salir de ella. No recibe los avisos de entregas nuevas.

**Edición.** Además, cambia el contenido: la historia, la guía, el nombre, el horario y la portada de la clase; crea y edita misiones, enigmas y documentos; lleva la tienda y los comportamientos, y los aplica; da recompensas libres; [pasa lista](/ayuda/alumnado/pasar-lista-y-consultar-la-asistencia) y descarga la asistencia; forma equipos y los premia; aprueba entregas y gestiona las insignias vinculadas a las misiones de la clase. Le llega un aviso con cada entrega nueva.

**Administración.** Además, cambia los ajustes —funcionalidades, niveles, y la asignatura, el nivel educativo, el idioma y la provincia de *Datos generales*—, invita al alumnado, crea sus cuentas y las gestiona: restablece contraseñas, cambia alias y quita estudiantes de la clase. También lleva el profesorado y archiva la clase.

## La propiedad de la clase

Cada clase tiene una persona **propietaria**, al principio quien la creó. Tiene administración y es la única que puede [publicarla como plantilla](/ayuda/clases/publicar-tu-clase-como-plantilla) y [pasar la propiedad](/ayuda/clases/traspasar-una-clase) a otra persona. Nadie le puede cambiar el nivel ni quitarla de la clase, y no puede salir sin pasarla antes.

## Qué ves según tu nivel

Cada pantalla de la clase enseña solo lo que tu nivel permite: sin edición no aparece **Nueva Misión**, y sin administración no aparece **Invitar**. Donde puedes mirar pero no cambiar nada, verás el aviso «Tu acceso a esta clase te deja ver esto, pero no cambiarlo».

Si alguien te cambia el nivel, te llega un aviso, y la clase se pone al día en cuanto abres el aviso.$itakai$;

-- alumnado/pasar-lista-y-consultar-la-asistencia: quien falta no sale en la ruleta ni en los equipos al azar.
UPDATE "help_articles" a
SET "body" = $itakai$Pasar lista lleva un minuto: **todo el alumnado sale presente** y solo marcas a quien falta. Lo tienes en la pestaña **Alumnos** de la clase, en el apartado **Asistencia**.

## Pasar lista

1. Abre **Alumnos** y pulsa **Asistencia**.
2. Arriba están la **fecha** (hoy) y la **sesión**. Si la clase tiene horario (en **Ajustes**) y hoy toca, se propone su tramo con la hora; si no hay horario o hoy no hay clase, sale **Sesión sin horario**.
3. En cada fila, cambia el estado de quien no está: **Ausente**, **Retraso** o **Justificada**. El resto se queda en **Presente**.
4. Pulsa **Guardar lista**.

La sesión se crea al guardar, nunca antes. Si guardas otra vez la misma sesión, se corrige la lista: no se duplica. Si pasaste lista por error, **Borrar esta lista** la quita entera.

Para pasar lista de otro día, o corregirla, cambia la fecha. Las cuentas sin correo que aún no han entrado también salen en la lista.

## Aplicar a los presentes o a los ausentes

Con la lista guardada aparecen **Aplicar a los presentes…** y **Aplicar a los ausentes…**. Abren la misma ventana que la [aplicación a varios estudiantes](/ayuda/gamificacion/aplicar-a-varios-estudiantes), con la selección ya hecha: eliges un comportamiento o una recompensa libre, revisas el resumen y pulsas **Aplicar**. En **los ausentes** van elegidos solo los de **Ausente**: las faltas **justificadas** salen en la lista con su estado, pero sin marcar.

**Pasar lista nunca quita ni da nada por sí solo.** Premiar la asistencia o penalizar una falta es siempre una acción aparte, que decides y confirmas tú.

## El histórico

En **Histórico** ves la asistencia de cada mes: por estudiante, cuántas sesiones, cuántas faltas, retrasos y justificadas, y su porcentaje (presente o con retraso, sobre las sesiones en las que consta), con su estado en cada sesión. El calendario marca los días con lista; pulsa uno para abrirlo y corregirlo. En la ficha de cada estudiante tienes además su asistencia del curso en cada clase.

**Descargar CSV** guarda el mes en un fichero para la hoja de cálculo.

## Quién puede qué

Pasar lista, corregirla, borrarla y descargar el CSV es de quien tiene **edición** en la clase (titular y sustitución, por defecto). Con **lectura** (prácticas) se ve la asistencia, pero no se cambia ni se descarga. En una clase archivada no se pasa lista.

## Es un dato personal

La asistencia del alumnado es un dato personal, y en muchos casos de menores. Por eso **el alumnado no la ve**, no sale en su actividad ni en nada que vea el resto de la clase, y el fichero solo lo descarga quien edita. Guárdalo con el mismo cuidado que cualquier lista de la clase. Si quitas a alguien de la clase, su asistencia en ella se borra.

## Quién falta hoy

Quien está **ausente** o con falta **justificada** en la última lista de hoy queda fuera de la [ruleta](/ayuda/gamificacion/usar-la-ruleta-en-clase) y de los [equipos al azar](/ayuda/alumnado/formar-equipos), sin que tengas que hacer nada. En la ventana de aplicar a varios estudiantes tienes también **Solo presentes hoy** y **Solo ausentes hoy**.$itakai$, "updated_at" = CURRENT_TIMESTAMP
FROM "help_categories" c
WHERE c."id" = a."category_id" AND c."slug" = $itakai$alumnado$itakai$ AND a."locale" = 'es'
  AND a."slug" = $itakai$pasar-lista-y-consultar-la-asistencia$itakai$
  AND a."body" = $itakai$Pasar lista lleva un minuto: **todo el alumnado sale presente** y solo marcas a quien falta. Lo tienes en la pestaña **Alumnos** de la clase, en el apartado **Asistencia**.

## Pasar lista

1. Abre **Alumnos** y pulsa **Asistencia**.
2. Arriba están la **fecha** (hoy) y la **sesión**. Si la clase tiene horario (en **Ajustes**) y hoy toca, se propone su tramo con la hora; si no hay horario o hoy no hay clase, sale **Sesión sin horario**.
3. En cada fila, cambia el estado de quien no está: **Ausente**, **Retraso** o **Justificada**. El resto se queda en **Presente**.
4. Pulsa **Guardar lista**.

La sesión se crea al guardar, nunca antes. Si guardas otra vez la misma sesión, se corrige la lista: no se duplica. Si pasaste lista por error, **Borrar esta lista** la quita entera.

Para pasar lista de otro día, o corregirla, cambia la fecha. Las cuentas sin correo que aún no han entrado también salen en la lista.

## Aplicar a los presentes o a los ausentes

Con la lista guardada aparecen **Aplicar a los presentes…** y **Aplicar a los ausentes…**. Abren la misma ventana que la [aplicación a varios estudiantes](/ayuda/gamificacion/aplicar-a-varios-estudiantes), con la selección ya hecha: eliges un comportamiento o una recompensa libre, revisas el resumen y pulsas **Aplicar**. En **los ausentes** van elegidos solo los de **Ausente**: las faltas **justificadas** salen en la lista con su estado, pero sin marcar.

**Pasar lista nunca quita ni da nada por sí solo.** Premiar la asistencia o penalizar una falta es siempre una acción aparte, que decides y confirmas tú.

## El histórico

En **Histórico** ves la asistencia de cada mes: por estudiante, cuántas sesiones, cuántas faltas, retrasos y justificadas, y su porcentaje (presente o con retraso, sobre las sesiones en las que consta), con su estado en cada sesión. El calendario marca los días con lista; pulsa uno para abrirlo y corregirlo. En la ficha de cada estudiante tienes además su asistencia del curso en cada clase.

**Descargar CSV** guarda el mes en un fichero para la hoja de cálculo.

## Quién puede qué

Pasar lista, corregirla, borrarla y descargar el CSV es de quien tiene **edición** en la clase (titular y sustitución, por defecto). Con **lectura** (prácticas) se ve la asistencia, pero no se cambia ni se descarga. En una clase archivada no se pasa lista.

## Es un dato personal

La asistencia del alumnado es un dato personal, y en muchos casos de menores. Por eso **el alumnado no la ve**, no sale en su actividad ni en nada que vea el resto de la clase, y el fichero solo lo descarga quien edita. Guárdalo con el mismo cuidado que cualquier lista de la clase. Si quitas a alguien de la clase, su asistencia en ella se borra.

## Quién falta hoy

Quien está **ausente** o con falta **justificada** en la última lista de hoy queda fuera de lo que se elige al azar en el aula, sin que tengas que hacer nada. En la ventana de aplicar a varios estudiantes tienes también **Solo presentes hoy** y **Solo ausentes hoy**.$itakai$;
