-- Ayuda del bloque 4, D1: pasar lista y aplicar a varios estudiantes a la vez.
-- Dos guías nuevas para el profesorado y las correcciones de las que decían que
-- un comportamiento se aplica al pulsar un nombre, que solo mueve XP, monedas y
-- vidas, y que el historial y los niveles no saben de asistencia ni recompensas.
--
-- Como el resto del contenido de serie, el panel de administración manda. El
-- INSERT solo crea lo que no exista y va al final de su categoría; cada UPDATE
-- solo cambia un campo si sigue exactamente con el texto de serie, así que lo que
-- alguien haya editado se queda como está. Siempre por slug de categoría y de
-- artículo, nunca por id.

-- alumnado/pasar-lista-y-consultar-la-asistencia
INSERT INTO "help_articles" ("id", "category_id", "slug", "title", "summary", "cover_image", "body", "locale", "status", "order_index", "featured", "audience", "kind", "published_at", "updated_at")
SELECT gen_random_uuid()::text, c."id", $itakai$pasar-lista-y-consultar-la-asistencia$itakai$, $itakai$Pasar lista y consultar la asistencia$itakai$, $itakai$Todo el alumnado sale presente: marca a quien falta, guarda, y consulta el histórico y el CSV de cada mes.$itakai$, $itakai$/app/ayuda/acceso-clase.svg$itakai$, $itakai$Pasar lista lleva un minuto: **todo el alumnado sale presente** y solo marcas a quien falta. Lo tienes en la pestaña **Alumnos** de la clase, en el apartado **Asistencia**.

## Pasar lista

1. Abre **Alumnos** y pulsa **Asistencia**.
2. Arriba están la **fecha** (hoy) y la **sesión**. Si la clase tiene horario (en **Ajustes**) y hoy toca, se propone su tramo con la hora; si no hay horario o hoy no hay clase, sale **Sesión sin horario**.
3. En cada fila, cambia el estado de quien no está: **Ausente**, **Retraso** o **Justificada**. El resto se queda en **Presente**.
4. Pulsa **Guardar lista**.

La sesión se crea al guardar, nunca antes. Si guardas otra vez la misma sesión, se corrige la lista: no se duplica. Si pasaste lista por error, **Borrar esta lista** la quita entera.

Para pasar lista de otro día, o corregirla, cambia la fecha. Las cuentas sin correo que aún no han entrado también salen en la lista.

## Aplicar a los presentes o a los ausentes

Con la lista guardada aparecen **Aplicar a los presentes…** y **Aplicar a los ausentes…**. Abren la misma ventana que la [aplicación a varios estudiantes](/ayuda/gamificacion/aplicar-a-varios-estudiantes), con la selección ya hecha: eliges un comportamiento o una recompensa libre, revisas a quién y confirmas. En **los ausentes** van elegidos solo los de **Ausente**: las faltas **justificadas** salen en la lista con su estado, pero sin marcar.

**Pasar lista nunca quita ni da nada por sí solo.** Premiar la asistencia o penalizar una falta es siempre una acción aparte, que decides y confirmas tú.

## El histórico

En **Histórico** ves la asistencia de cada mes: por estudiante, cuántas sesiones, cuántas faltas, retrasos y justificadas, y su porcentaje (presente o con retraso, sobre las sesiones en las que consta), con su estado en cada sesión. El calendario marca los días con lista; pulsa uno para abrirlo y corregirlo. En la ficha de cada estudiante tienes además su asistencia del curso en cada clase.

**Descargar CSV** guarda el mes en un fichero para la hoja de cálculo.

## Quién puede qué

Pasar lista, corregirla, borrarla y descargar el CSV es de quien tiene **edición** en la clase (titular y sustitución, por defecto). Con **lectura** (prácticas) se ve la asistencia, pero no se cambia ni se descarga. En una clase archivada no se pasa lista.

## Es un dato personal

La asistencia del alumnado es un dato personal, y en muchos casos de menores. Por eso **el alumnado no la ve**, no sale en su actividad ni en nada que vea el resto de la clase, y el fichero solo lo descarga quien edita. Guárdalo con el mismo cuidado que cualquier lista de la clase. Si quitas a alguien de la clase, su asistencia en ella se borra.

## Quién falta hoy

Quien está **ausente** o con falta **justificada** en la última lista de hoy queda fuera de lo que se elige al azar en el aula, sin que tengas que hacer nada. En la ventana de aplicar a varios estudiantes tienes también **Solo presentes hoy** y **Solo ausentes hoy**.$itakai$, 'es', 'publicado'::"HelpArticleStatus", (SELECT COALESCE(MAX(a."order_index"), -1) + 1 FROM "help_articles" a WHERE a."category_id" = c."id"), false, 'profesor'::"HelpAudience", 'guia'::"HelpArticleKind", CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM "help_categories" c WHERE c."slug" = $itakai$alumnado$itakai$
ON CONFLICT ("category_id", "slug", "locale") DO NOTHING;

-- gamificacion/aplicar-a-varios-estudiantes
INSERT INTO "help_articles" ("id", "category_id", "slug", "title", "summary", "cover_image", "body", "locale", "status", "order_index", "featured", "audience", "kind", "published_at", "updated_at")
SELECT gen_random_uuid()::text, c."id", $itakai$aplicar-a-varios-estudiantes$itakai$, $itakai$Aplicar comportamientos y recompensas a varios estudiantes$itakai$, $itakai$Elegir a varias personas, aplicarles un comportamiento o una recompensa libre con su motivo, y confirmarlo antes.$itakai$, $itakai$/app/ayuda/recompensas.svg$itakai$, $itakai$Puedes aplicar un comportamiento, o dar una recompensa, a varios estudiantes de una vez. **Siempre hay un paso de confirmación**: antes de aplicar nada ves qué se aplica, cuánto mueve de cada recurso y a quién.

## Desde la pestaña **Comportamientos**

1. Pulsa la tarjeta del comportamiento.
2. Marca a quién se lo aplicas: uno, varios, **Todos** o, si ya has pasado lista hoy, **Solo presentes hoy** o **Solo ausentes hoy**. Con muchas personas tienes un buscador.
3. Pulsa **Continuar**, revisa el resumen —por ejemplo, «Aplicar "Participa" a 12 estudiantes. A cada uno: +10 XP, +5 monedas»— y despliega **Ver a quién** si quieres comprobar la lista.
4. Pulsa **Aplicar**, o **Volver** para cambiar algo.

## Desde la pestaña **Alumnos**

En el **Listado**, marca las casillas de las personas que quieras (la de la cabecera marca a todas las que se ven). Abajo aparece una barra con cuántas has elegido y dos botones: **Aplicar comportamiento** y **Dar recompensa**. Llevan a la misma ventana, con tu selección.

## Recompensas libres

A veces lo que quieres premiar, o corregir, no está en el catálogo. Con **Dar recompensa** eliges **Dar** o **Quitar**, cuánto de cada recurso —experiencia, monedas, maná o puntos de vida, solo los que la clase tiene activados— y escribes un **motivo**, que es lo que verá cada estudiante en su actividad. Al quitar, ningún saldo baja de cero.

Las recompensas libres no cuentan en el «+N / −N» de comportamientos del listado.

## Todo o nada

Lo que aplicas a varios se aplica a todos o a ninguno: si algo falla, no cambia ningún saldo y puedes volver a intentarlo. Si alguien cruza un umbral de experiencia, recibe su insignia en el momento.

## En el historial

En el [historial de la clase](/ayuda/clases/el-historial-de-la-clase), lo aplicado a varios de una vez sale en una sola línea —«aplicó "Participa" a 12 estudiantes»— que se despliega para ver a quién. Cada estudiante lo ve en su actividad, con quién se lo aplicó.

## Quién puede

Aplicar comportamientos y dar recompensas pide acceso de **edición** en la clase. En una clase archivada no se aplica nada.$itakai$, 'es', 'publicado'::"HelpArticleStatus", (SELECT COALESCE(MAX(a."order_index"), -1) + 1 FROM "help_articles" a WHERE a."category_id" = c."id"), false, 'profesor'::"HelpAudience", 'guia'::"HelpArticleKind", CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM "help_categories" c WHERE c."slug" = $itakai$gamificacion$itakai$
ON CONFLICT ("category_id", "slug", "locale") DO NOTHING;

-- gamificacion/comportamientos-y-puntos-de-vida: se aplica eligiendo a quién y confirmando; hay maná y recompensas libres.
UPDATE "help_articles" a
SET "body" = $itakai$Los comportamientos son la forma de que lo que ocurre en el aula —para bien y para mal— tenga efecto en la partida.


![Ejemplos de comportamientos que suman puntos de vida y de comportamientos que los restan.](/app/ayuda/diagramas/vidas.svg)
## Cómo funcionan

Defines una lista de comportamientos para tu clase. Cada uno tiene un nombre, si es **positivo o negativo**, y cuánto mueve de cada recurso: experiencia, monedas, maná y puntos de vida (de los que la clase tenga activados). Para aplicarlo, pulsa su tarjeta en la pestaña **Comportamientos**, marca a quién —una persona, varias o toda la clase— y confirma: antes de aplicar ves el resumen y la lista de nombres. Crearlos y aplicarlos pide acceso de edición en la clase.

También puedes elegir estudiantes en la pestaña **Alumnos** y darles una recompensa libre con su motivo, sin pasar por el catálogo: lo tienes en [Aplicar comportamientos y recompensas a varios estudiantes](/ayuda/gamificacion/aplicar-a-varios-estudiantes).

Ejemplos que suelen funcionar: "ayuda a alguien de clase" (+15 XP, +5 monedas), "trae el material" (+10 XP), "interrumpe la clase" (−10 puntos de vida).

## Los puntos de vida

Cada estudiante empieza con 100 y se mueven solo con los comportamientos y las recompensas libres. No bloquean nada por sí solos: son un termómetro visible, y lo que hagas cuando alguien baje mucho es cosa tuya. Hay docentes que montan un poder en la tienda para recuperarlos, y así el sistema se cierra sobre sí mismo.

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

Defines una lista de comportamientos para tu clase. Cada uno tiene un nombre, si es **positivo o negativo**, y cuánto mueve de cada recurso: experiencia, monedas y puntos de vida. Luego, en el momento, se lo aplicas a cualquier estudiante con dos clics desde la pestaña **Comportamientos** de la clase. Crearlos y aplicarlos pide acceso de edición en la clase.

Ejemplos que suelen funcionar: "ayuda a alguien de clase" (+15 XP, +5 monedas), "trae el material" (+10 XP), "interrumpe la clase" (−10 puntos de vida).

## Los puntos de vida

Cada estudiante empieza con 100 y se mueven solo con los comportamientos. No bloquean nada por sí solos: son un termómetro visible, y lo que hagas cuando alguien baje mucho es cosa tuya. Hay docentes que montan un poder en la tienda para recuperarlos, y así el sistema se cierra sobre sí mismo.

## Consejos de uso

- **Pocos y claros.** Con seis u ocho comportamientos bien elegidos se cubre casi todo el curso.
- **Que se vea.** Aplicarlo en el momento y en voz alta es la mitad del efecto.
- **Cuidado con lo negativo.** Un sistema que solo resta se convierte en un castigo con otro nombre.

## El registro

Todo lo aplicado queda con fecha, con quién lo aplicó y sobre quién. Lo ves en la pestaña **Historial** de la clase, con el tipo **Comportamientos** ([el historial de la clase](/ayuda/clases/el-historial-de-la-clase)), y en la ficha de cada estudiante, que también ve en su actividad quién se lo aplicó.$itakai$;

-- clases/el-historial-de-la-clase: lotes agrupados, recompensas y asistencia.
UPDATE "help_articles" a
SET "body" = $itakai$La pestaña **Historial** de la clase cuenta qué ha hecho el profesorado en ella: quién, qué y cuándo. Es lo más útil cuando la clase es compartida y alguien pregunta quién cambió algo. La ve todo el profesorado de la clase, sea cual sea su nivel.

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

El alumnado no ve el historial, pero en su actividad ve quién le aprobó cada entrega y quién le aplicó cada comportamiento.$itakai$, "updated_at" = CURRENT_TIMESTAMP
FROM "help_categories" c
WHERE c."id" = a."category_id" AND c."slug" = $itakai$clases$itakai$ AND a."locale" = 'es'
  AND a."slug" = $itakai$el-historial-de-la-clase$itakai$
  AND a."body" = $itakai$La pestaña **Historial** de la clase cuenta qué ha hecho el profesorado en ella: quién, qué y cuándo. Es lo más útil cuando la clase es compartida y alguien pregunta quién cambió algo. La ve todo el profesorado de la clase, sea cual sea su nivel.

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

El alumnado no ve el historial, pero en su actividad ve quién le aprobó cada entrega y quién le aplicó cada comportamiento.$itakai$;

-- clases/niveles-y-perfiles-del-profesorado: asistencia y recompensas por nivel.
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

**Lectura.** Ve la clase entera —misiones, alumnado, asistencia, entregas, tienda, comportamientos, profesorado e historial— sin cambiar nada. Puede descargar las entregas, duplicar la clase y salir de ella. No recibe los avisos de entregas nuevas.

**Edición.** Además, cambia el contenido: la historia, la guía, el nombre, el horario y la portada de la clase; crea y edita misiones, enigmas y documentos; lleva la tienda y los comportamientos, y los aplica; da recompensas libres; [pasa lista](/ayuda/alumnado/pasar-lista-y-consultar-la-asistencia) y descarga la asistencia; aprueba entregas y gestiona las insignias vinculadas a las misiones de la clase. Le llega un aviso con cada entrega nueva.

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

**Lectura.** Ve la clase entera —misiones, alumnado, entregas, tienda, comportamientos, profesorado e historial— sin cambiar nada. Puede descargar las entregas, duplicar la clase y salir de ella. No recibe los avisos de entregas nuevas.

**Edición.** Además, cambia el contenido: la historia, la guía, el nombre, el horario y la portada de la clase; crea y edita misiones, enigmas y documentos; lleva la tienda y los comportamientos, y los aplica; aprueba entregas y gestiona las insignias vinculadas a las misiones de la clase. Le llega un aviso con cada entrega nueva.

**Administración.** Además, cambia los ajustes —funcionalidades, niveles, y la asignatura, el nivel educativo, el idioma y la provincia de *Datos generales*—, invita al alumnado, crea sus cuentas y las gestiona: restablece contraseñas, cambia alias y quita estudiantes de la clase. También lleva el profesorado y archiva la clase.

## La propiedad de la clase

Cada clase tiene una persona **propietaria**, al principio quien la creó. Tiene administración y es la única que puede [publicarla como plantilla](/ayuda/clases/publicar-tu-clase-como-plantilla) y [pasar la propiedad](/ayuda/clases/traspasar-una-clase) a otra persona. Nadie le puede cambiar el nivel ni quitarla de la clase, y no puede salir sin pasarla antes.

## Qué ves según tu nivel

Cada pantalla de la clase enseña solo lo que tu nivel permite: sin edición no aparece **Nueva Misión**, y sin administración no aparece **Invitar**. Donde puedes mirar pero no cambiar nada, verás el aviso «Tu acceso a esta clase te deja ver esto, pero no cambiarlo».

Si alguien te cambia el nivel, te llega un aviso, y la clase se pone al día en cuanto abres el aviso.$itakai$;
