-- Ayuda del bloque 4, D2: equipos. Dos guías nuevas para el profesorado (formar
-- equipos, y premiarlos con su clasificación y las misiones por equipos), una
-- para el alumnado (mi equipo), y las correcciones del historial y de los
-- niveles del profesorado, que no sabían de equipos.
--
-- Como el resto del contenido de serie, el panel de administración manda. El
-- INSERT solo crea lo que no exista y va al final de su categoría; cada UPDATE
-- solo cambia un campo si sigue exactamente con el texto de serie, así que lo que
-- alguien haya editado se queda como está. Siempre por slug de categoría y de
-- artículo, nunca por id.

-- alumnado/formar-equipos
INSERT INTO "help_articles" ("id", "category_id", "slug", "title", "summary", "cover_image", "body", "locale", "status", "order_index", "featured", "audience", "kind", "published_at", "updated_at")
SELECT gen_random_uuid()::text, c."id", $itakai$formar-equipos$itakai$, $itakai$Formar equipos a mano o al azar$itakai$, $itakai$Equipos de base y temporales, al azar con solo quien ha venido o a mano, y cómo mover a alguien de equipo.$itakai$, $itakai$/app/ayuda/invitar.svg$itakai$, $itakai$Los equipos están en la pestaña **Alumnos** de la clase, en el apartado **Equipos**. Puedes tener varias formas de repartir la clase a la vez: cada una es una **agrupación**.

## De base o temporal

- **De base**: los equipos fijos del curso, las casas o facciones de siempre. Sus puntos cuentan en la [clasificación de equipos](/ayuda/gamificacion/premiar-a-un-equipo-y-ver-la-clasificacion).
- **Temporal**: para una misión o una dinámica concreta, por ejemplo juntar a quien más sabe de cada equipo. No puntúa en la clasificación; cuando acabe, **archívala** y deja de estorbar.

Nadie puede estar en dos equipos de la misma agrupación, pero sí en un equipo de base y en otro temporal.

## Formarlos al azar

1. Pulsa **Formar equipos**.
2. Ponle nombre a la agrupación y elige si es de base o temporal.
3. En **Cómo**, deja **Al azar** y elige **Número de equipos** o **Personas por equipo**. Si quieres, marca **Equilibrar por nivel**: cada equipo recibe una mezcla parecida de niveles.
4. Pulsa **Repartir**. Ves la propuesta, pero aún no se guarda nada: **Otra vez** hace otra.
5. Cuando te convenza, pulsa **Guardar equipos**.

**Solo entra quien ha venido.** Si hoy ya has [pasado lista](/ayuda/alumnado/pasar-lista-y-consultar-la-asistencia), quien está ausente o con falta justificada queda fuera del reparto, y la propuesta te dice quién. Si aún no has pasado lista, entra todo el alumnado.

## Formarlos a mano

Elige **A mano** y cuántos equipos quieres: se crean vacíos, con todo el alumnado en **Sin equipo**, y lo repartes tú.

## Mover a alguien de equipo

- **Marcando**: marca la casilla de una o varias personas y elige su equipo en la barra que sale abajo, o pulsa **Poner aquí** en ese equipo. Sirve con el ratón, en la tableta y con el teclado.
- **Arrastrando**: con el ratón, arrastra el nombre de una persona hasta otro equipo, o a **Sin equipo**.
- **Al azar**: **Repartir al azar** reparte entre los equipos a quien está en **Sin equipo**, llenando primero los más pequeños. En una agrupación temporal, quien falta hoy se queda fuera.

Cada cambio se guarda en el momento.

## Nombre, color y emblema

Con **Editar** cambias el nombre de la agrupación y, de cada equipo, su nombre, su color y su emblema; también añades o quitas equipos. El color siempre va con el emblema y el nombre, para que se distinga también con los modos de daltonismo. Si quitas un equipo, se borran sus puntos.

## Quién puede qué

Formar, cambiar, archivar y borrar equipos es de quien tiene **edición** en la clase (titular y sustitución, por defecto). Con **lectura** (prácticas) se ven los equipos, pero no se cambian. Las cuentas sin correo que aún no han entrado también se pueden poner en un equipo.$itakai$, 'es', 'publicado'::"HelpArticleStatus", (SELECT COALESCE(MAX(a."order_index"), -1) + 1 FROM "help_articles" a WHERE a."category_id" = c."id"), false, 'profesor'::"HelpAudience", 'guia'::"HelpArticleKind", CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM "help_categories" c WHERE c."slug" = $itakai$alumnado$itakai$
ON CONFLICT ("category_id", "slug", "locale") DO NOTHING;

-- gamificacion/premiar-a-un-equipo-y-ver-la-clasificacion
INSERT INTO "help_articles" ("id", "category_id", "slug", "title", "summary", "cover_image", "body", "locale", "status", "order_index", "featured", "audience", "kind", "published_at", "updated_at")
SELECT gen_random_uuid()::text, c."id", $itakai$premiar-a-un-equipo-y-ver-la-clasificacion$itakai$, $itakai$Premiar a un equipo y ver la clasificación$itakai$, $itakai$Puntos para el marcador, reparto a cada integrante, la clasificación de equipos y las misiones por equipos.$itakai$, $itakai$/app/ayuda/clasificacion.svg$itakai$, $itakai$Premiar a un equipo hace dos cosas, y eliges cuáles al confirmar: **suma puntos a su marcador** y, si quieres, **reparte a cada integrante** un comportamiento o una recompensa.

## Premiar

1. En **Alumnos → Equipos**, pulsa **Premiar** en el equipo. También puedes hacerlo desde la tarjeta de un comportamiento, en **Comportamientos**, eligiendo **A un equipo**.
2. Elige un **comportamiento** o una **recompensa libre** con su motivo.
3. Escribe los **puntos para el marcador**. Si lo que aplicas resta (un comportamiento negativo o **Quitar**), los puntos también restan. Pon 0 si solo quieres repartir.
4. Deja marcado **Repartir también a cada integrante** si quieres que cada persona del equipo reciba el comportamiento o la recompensa, como si se lo aplicaras por separado. Desmárcalo para dar solo puntos.
5. Pulsa **Continuar**, revisa el resumen y pulsa **Aplicar**.

Todo se apunta a la vez: o se hace entero, o no se hace nada. En el historial de la clase sale en una sola línea, con el reparto dentro.

## El marcador y la clasificación

El marcador de un equipo es la suma de los puntos de sus premios, no la XP de sus integrantes: no cambia si mueves a alguien de equipo, y no favorece a los equipos más grandes.

La **clasificación de equipos** sale en **Alumnos → Ranking**, encima del podio, con las agrupaciones **de base**. Solo aparece si la clase tiene activada la clasificación en sus ajustes. El alumnado la ve en su pestaña de ranking: de los demás equipos, solo el nombre y los puntos.

## Misiones por equipos

En los **Ajustes** de una misión, **Por equipos** dice con qué agrupación se hace. El alumnado lo ve en la misión, con su equipo. Cada estudiante sigue entregando lo suyo; lo que cambia es la revisión: al calificar una entrega, **Aprobar al equipo** aprueba con el mismo porcentaje la entrega pendiente de cada integrante de ese equipo. Cada aprobación da sus recompensas y avisa como siempre.

## Quién puede qué

Premiar equipos es de quien tiene **edición** en la clase. En una clase archivada no se premia a nadie.$itakai$, 'es', 'publicado'::"HelpArticleStatus", (SELECT COALESCE(MAX(a."order_index"), -1) + 1 FROM "help_articles" a WHERE a."category_id" = c."id"), false, 'profesor'::"HelpAudience", 'guia'::"HelpArticleKind", CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM "help_categories" c WHERE c."slug" = $itakai$gamificacion$itakai$
ON CONFLICT ("category_id", "slug", "locale") DO NOTHING;

-- si-eres-alumno/mi-equipo
INSERT INTO "help_articles" ("id", "category_id", "slug", "title", "summary", "cover_image", "body", "locale", "status", "order_index", "featured", "audience", "kind", "published_at", "updated_at")
SELECT gen_random_uuid()::text, c."id", $itakai$mi-equipo$itakai$, $itakai$Mi equipo$itakai$, $itakai$Con quién estás, los puntos de tu equipo y cómo van las misiones por equipos.$itakai$, $itakai$/app/ayuda/vista-alumno.svg$itakai$, $itakai$Si en tu clase hay equipos, en la portada de la clase tienes la tarjeta **Mi equipo**: con qué equipo estás y quién más está en él.

Puedes estar en más de un equipo a la vez: uno fijo para todo el curso y otro para una misión o una actividad concreta.

## Los puntos de tu equipo

Cuando tu equipo hace algo bien, el profesorado puede darle puntos. Si la clase tiene la clasificación activada, ves los puntos de tu equipo en **Mi equipo** y la **clasificación de equipos** en la pestaña de ranking. De los demás equipos solo se ve el nombre y los puntos.

A veces el premio de equipo también te da XP, monedas o maná a ti: lo verás en tu actividad, como cualquier otro comportamiento o recompensa.

## Misiones por equipos

Si una misión se hace por equipos, lo pone al abrirla, con tu equipo. Aun así, **cada integrante entrega su parte**: ponte de acuerdo con tu equipo y sube tu entrega como siempre.$itakai$, 'es', 'publicado'::"HelpArticleStatus", (SELECT COALESCE(MAX(a."order_index"), -1) + 1 FROM "help_articles" a WHERE a."category_id" = c."id"), false, 'alumno'::"HelpAudience", 'guia'::"HelpArticleKind", CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM "help_categories" c WHERE c."slug" = $itakai$si-eres-alumno$itakai$
ON CONFLICT ("category_id", "slug", "locale") DO NOTHING;

-- clases/el-historial-de-la-clase: equipos y premios de equipo.
UPDATE "help_articles" a
SET "body" = $itakai$La pestaña **Historial** de la clase cuenta qué ha hecho el profesorado en ella: quién, qué y cuándo. Es lo más útil cuando la clase es compartida y alguien pregunta quién cambió algo. La ve todo el profesorado de la clase, sea cual sea su nivel.

## Qué aparece

Todo lo relevante que hace el profesorado, con su autoría:

- **Entregas**: cada aprobación, con quien entregó, el enigma y el porcentaje.
- **Comportamientos**: los que se aplican, a quién, y los que se crean, se editan o se borran. Lo aplicado a varios estudiantes de una vez sale en una sola línea, que se despliega para ver a quién.
- **Recompensas**: las recompensas libres, con su motivo y a quién.
- **Asistencia**: cada lista que se pasa, se corrige o se borra, con la fecha y cuántas personas vinieron y cuántas no.
- **Equipos**: las agrupaciones que se crean, se editan, se archivan o se borran, los cambios de equipo y cada premio a un equipo, con sus puntos y, si se repartió, a quién.
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

Todo lo relevante que hace el profesorado, con su autoría:

- **Entregas**: cada aprobación, con quien entregó, el enigma y el porcentaje.
- **Comportamientos**: los que se aplican, a quién, y los que se crean, se editan o se borran. Lo aplicado a varios estudiantes de una vez sale en una sola línea, que se despliega para ver a quién.
- **Recompensas**: las recompensas libres, con su motivo y a quién.
- **Asistencia**: cada lista que se pasa, se corrige o se borra, con la fecha y cuántas personas vinieron y cuántas no.
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

El alumnado no ve el historial, pero en su actividad ve quién le aprobó cada entrega y quién le aplicó cada comportamiento.$itakai$;

-- clases/niveles-y-perfiles-del-profesorado: equipos por nivel.
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

**Lectura.** Ve la clase entera —misiones, alumnado, asistencia, equipos, entregas, tienda, comportamientos, profesorado e historial— sin cambiar nada. Puede descargar las entregas, duplicar la clase y salir de ella. No recibe los avisos de entregas nuevas.

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

**Lectura.** Ve la clase entera —misiones, alumnado, asistencia, entregas, tienda, comportamientos, profesorado e historial— sin cambiar nada. Puede descargar las entregas, duplicar la clase y salir de ella. No recibe los avisos de entregas nuevas.

**Edición.** Además, cambia el contenido: la historia, la guía, el nombre, el horario y la portada de la clase; crea y edita misiones, enigmas y documentos; lleva la tienda y los comportamientos, y los aplica; da recompensas libres; [pasa lista](/ayuda/alumnado/pasar-lista-y-consultar-la-asistencia) y descarga la asistencia; aprueba entregas y gestiona las insignias vinculadas a las misiones de la clase. Le llega un aviso con cada entrega nueva.

**Administración.** Además, cambia los ajustes —funcionalidades, niveles, y la asignatura, el nivel educativo, el idioma y la provincia de *Datos generales*—, invita al alumnado, crea sus cuentas y las gestiona: restablece contraseñas, cambia alias y quita estudiantes de la clase. También lleva el profesorado y archiva la clase.

## La propiedad de la clase

Cada clase tiene una persona **propietaria**, al principio quien la creó. Tiene administración y es la única que puede [publicarla como plantilla](/ayuda/clases/publicar-tu-clase-como-plantilla) y [pasar la propiedad](/ayuda/clases/traspasar-una-clase) a otra persona. Nadie le puede cambiar el nivel ni quitarla de la clase, y no puede salir sin pasarla antes.

## Qué ves según tu nivel

Cada pantalla de la clase enseña solo lo que tu nivel permite: sin edición no aparece **Nueva Misión**, y sin administración no aparece **Invitar**. Donde puedes mirar pero no cambiar nada, verás el aviso «Tu acceso a esta clase te deja ver esto, pero no cambiarlo».

Si alguien te cambia el nivel, te llega un aviso, y la clase se pone al día en cuanto abres el aviso.$itakai$;
