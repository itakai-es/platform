-- Ayuda de E4: los avatares. Una guía nueva para el profesorado (tu avatar de
-- docente) y los retoques de las que hablan de avatares, del historial y del
-- profesorado de la clase: el avatar del alumnado sale en retrato y sobre un
-- color, el profesorado con edición puede devolverlo a uno del catálogo, y cada
-- docente tiene su avatar, que sale junto a su nombre en lo que hace.
--
-- Como el resto del contenido de serie, el panel de administración manda. El
-- INSERT solo crea lo que no exista y va al final de su categoría; cada UPDATE
-- solo cambia un campo si sigue exactamente con el texto de serie, así que lo que
-- alguien haya editado se queda como está. Siempre por slug de categoría y de
-- artículo, nunca por id.

-- tu-cuenta/tu-avatar-de-docente
INSERT INTO "help_articles" ("id", "category_id", "slug", "title", "summary", "cover_image", "body", "locale", "status", "order_index", "featured", "audience", "kind", "published_at", "updated_at")
SELECT gen_random_uuid()::text, c."id", $itakai$tu-avatar-de-docente$itakai$, $itakai$Tu avatar de docente$itakai$, $itakai$Elegir el color de tu avatar, con el que te reconocen el alumnado y el resto del profesorado en tus clases.$itakai$, $itakai$/app/ayuda/avatares.svg$itakai$, $itakai$Cada docente tiene un avatar, **uno por cuenta**: el mismo en todas sus clases. Sirve para que se sepa de un vistazo quién ha hecho qué, sobre todo en una [clase compartida](/ayuda/clases/compartir-una-clase-con-otros-profesores).

## Cómo es

Son **tus iniciales sobre un color**. Si no eliges ninguno, la plataforma te da uno, siempre el mismo. No hay fotos: no hace falta subir ni guardar imágenes de nadie.

## Cambiarlo

1. Abre tu **perfil** y la pestaña **Configuración**.
2. En **Tu avatar**, pulsa el color que quieras. **Automático** es el que te da la plataforma.

Se aplica al momento. Encima de los colores ves **Así te ven en tus clases**, con tu nombre.

## Dónde sale

Junto a tu nombre:

- en el [historial de la clase](/ayuda/clases/el-historial-de-la-clase), en cada cosa que hayas hecho;
- en la sección **Profesorado** de los ajustes de cada clase, y en el **Resumen** de la clase que ve el alumnado;
- en la actividad del alumnado, en «Por…», cuando apruebas una entrega o aplicas un comportamiento o una recompensa;
- en la [asistencia](/ayuda/alumnado/pasar-lista-y-consultar-la-asistencia), en «Lista guardada por…».

Si cambias de color, todo eso pasa a enseñar el nuevo, también en lo que hiciste antes. Si algún día se borra tu cuenta, el historial conserva tu nombre y el avatar que tenías.

El avatar del alumnado es otra cosa: cada estudiante tiene uno en cada clase, como cuenta [avatares y alias por clase](/ayuda/alumnado/avatares-y-alias-por-clase).$itakai$, 'es', 'publicado'::"HelpArticleStatus", (SELECT COALESCE(MAX(a."order_index"), -1) + 1 FROM "help_articles" a WHERE a."category_id" = c."id"), false, 'profesor'::"HelpAudience", 'guia'::"HelpArticleKind", CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM "help_categories" c WHERE c."slug" = $itakai$tu-cuenta$itakai$
ON CONFLICT ("category_id", "slug", "locale") DO NOTHING;

-- alumnado/avatares-y-alias-por-clase: retrato y color, devolver un avatar al catálogo y el avatar docente.
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

En las listas, la clasificación y las entregas el avatar sale **en retrato**, de cabeza y hombros, sobre un **color de fondo** que la plataforma da a cada estudiante en cada clase. Así, aunque varias personas elijan el mismo personaje, se distinguen de un vistazo. El color nunca va solo: al lado está siempre el alias o el nombre.

## Moderación

Los alias y los avatares los ves en la pestaña **Alumnado** de la clase, junto al nombre real de cada estudiante, y en su ficha.

Si un avatar no es adecuado, elige **Cambiar avatar** en el menú **⋮** de esa persona, escoge un personaje del catálogo y pulsa **Guardar**: junto al botón ves lo que va a pasar. Pide acceso de **edición**, para que quien sustituye pueda retirarlo al momento. Si era una imagen generada con IA, la imagen se borra. Solo cambia en esa clase y queda anotado en el [historial de la clase](/ayuda/clases/el-historial-de-la-clase).

Si lo que no encaja es el alias y tienes administración en la clase, cámbialo con **Cambiar alias**, en el mismo menú: [cambiar el alias o quitar a alguien de la clase](/ayuda/alumnado/cambiar-el-alias-o-quitar-a-un-alumno-de-la-clase). Como cada estudiante puede volver a cambiar los dos, merece la pena dejar claras las reglas del juego el primer día, en la [guía de clase](/ayuda/clases/la-guia-de-clase).

## Tu avatar

El profesorado también tiene avatar, uno por cuenta y el mismo en todas sus clases: lo cuenta [tu avatar de docente](/ayuda/tu-cuenta/tu-avatar-de-docente).$itakai$, "updated_at" = CURRENT_TIMESTAMP
FROM "help_categories" c
WHERE c."id" = a."category_id" AND c."slug" = $itakai$alumnado$itakai$ AND a."locale" = 'es'
  AND a."slug" = $itakai$avatares-y-alias-por-clase$itakai$
  AND a."body" = $itakai$En ITAKAI la identidad de cada estudiante **es por clase, no por cuenta**. La misma persona puede ser "Capitana Nemo" en tu clase de Ciencias y "Aristóteles" en la de Filosofía, con avatares distintos.

## Por qué

Porque la narrativa es de la clase. Un alias que encaja en una travesía por el Egeo no encaja en un laboratorio del futuro, y obligar a elegir uno para todo rompería las dos historias.

## El alias

Al unirse a la clase, cada estudiante recibe un alias mitológico al azar, y puede cambiarlo cuando quiera en la pestaña **Avatar** de la clase. Es lo que se ve en la clasificación, en las entregas y en el historial.

## El avatar

Al unirse también recibe uno al azar. Para cambiarlo, en la misma pestaña **Avatar**, hay dos caminos:

1. **Elegir uno del catálogo**, con los personajes de la plataforma.
2. **Generarlo con inteligencia artificial**, describiendo con palabras cómo lo quiere. La descripción se convierte en una imagen a partir de la guía del personaje elegido.

## Moderación

Los alias y los avatares los ves en la pestaña **Alumnado** de la clase, junto al nombre real de cada estudiante, y en su ficha. Si un alias no encaja y tienes administración en la clase, cámbialo con **Cambiar alias**, en su menú **⋮**: [cambiar el alias o quitar a alguien de la clase](/ayuda/alumnado/cambiar-el-alias-o-quitar-a-un-alumno-de-la-clase). El avatar no se edita desde tu lado: si no encaja, pide que lo cambie en su pestaña **Avatar**. Merece la pena dejar claras las reglas del juego el primer día, en la [guía de clase](/ayuda/clases/la-guia-de-clase).$itakai$;

-- si-eres-alumno/mi-avatar-y-mi-nombre-en-clase: cómo te ven en la clase y que tu docente puede cambiar el avatar.
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

Elige a tu guía entre los personajes de la lista. Si quieres uno a tu gusto, describe cómo lo quieres y pulsa **Genera avatar**: la inteligencia artificial lo crea a partir del personaje que hayas elegido. Cuantos más detalles des de los colores, la ropa y el estilo, mejor.

Debajo de tu avatar grande ves **Así te ven en esta clase**: en el ranking, en tu equipo y en las entregas sales en pequeño, con la cara de tu personaje sobre un color de fondo que es el tuyo en esa clase.

Como el alias, tiene que poder enseñarse en clase: si no lo es, tu docente puede cambiarlo por uno de los personajes de la lista. Después puedes elegir otro personaje o generar uno nuevo. Si lo que retira es una imagen hecha con IA, esa imagen se borra y no se puede recuperar.$itakai$, "updated_at" = CURRENT_TIMESTAMP
FROM "help_categories" c
WHERE c."id" = a."category_id" AND c."slug" = $itakai$si-eres-alumno$itakai$ AND a."locale" = 'es'
  AND a."slug" = $itakai$mi-avatar-y-mi-nombre-en-clase$itakai$
  AND a."body" = $itakai$En cada clase tienes un avatar y un alias. Al unirte te ponen unos al azar, y puedes cambiarlos cuando quieras.

## Son por clase

Lo importante: **el avatar y el alias son de cada clase**, no de tu cuenta. Puedes ser una cosa en Historia y otra en Matemáticas. Al cambiarlos en una clase, las demás se quedan como estaban.

## Dónde se cambian

Dentro de la clase, en la pestaña **Avatar**. Cambia lo que quieras y pulsa **Guardar cambios**.

## El alias

Es el nombre con el que apareces en la clase: en el ranking, si tu clase lo tiene activado, y en las entregas que revisa tu docente. Puede tener hasta 20 caracteres. Tu docente también ve tu nombre real, que es el que necesita para las notas.

Ponte algo que puedas enseñar en clase: si no lo es, tu docente puede cambiártelo.

## El avatar

Elige a tu guía entre los personajes de la lista. Si quieres uno a tu gusto, describe cómo lo quieres y pulsa **Genera avatar**: la inteligencia artificial lo crea a partir del personaje que hayas elegido. Cuanto más concreto seas con los colores, la ropa y el estilo, mejor.$itakai$;

-- alumnado/cambiar-el-alias-o-quitar-a-un-alumno-de-la-clase: el avatar ya se cambia desde el mismo menú.
UPDATE "help_articles" a
SET "body" = $itakai$El menú **⋮** de cada estudiante, en la pestaña **Alumnado** de la clase o en su ficha, tiene también estas dos acciones. Las dos piden acceso de administración en la clase. En el mismo menú, **Cambiar avatar** devuelve a uno del catálogo un avatar que no es adecuado, y pide edición: lo cuenta [avatares y alias por clase](/ayuda/alumnado/avatares-y-alias-por-clase).

## Cambiar el alias

El alias es el nombre con el que cada estudiante sale en esa clase y en su ranking. Al unirse le toca uno al azar, y lo puede cambiar cuando quiera en su pestaña **Avatar**. Si pone uno que no es adecuado, elige **Cambiar alias**, escribe el nuevo (hasta 20 caracteres) y pulsa **Guardar**.

Solo cambia en esta clase: en las demás sigue con el suyo. Como puede volver a cambiarlo, conviene que lo habléis.

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
  AND a."body" = $itakai$El menú **⋮** de cada estudiante, en la pestaña **Alumnado** de la clase o en su ficha, tiene también estas dos acciones. Las dos piden acceso de administración en la clase.

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

Las dos acciones quedan anotadas en el [historial de la clase](/ayuda/clases/el-historial-de-la-clase).$itakai$;

-- clases/niveles-y-perfiles-del-profesorado: con edición se devuelve un avatar al catálogo.
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

**Edición.** Además, cambia el contenido: la historia, la guía, el nombre, el horario y la portada de la clase; crea y edita misiones, enigmas y documentos; lleva la tienda y los comportamientos, y los aplica; da recompensas libres; [pasa lista](/ayuda/alumnado/pasar-lista-y-consultar-la-asistencia) y descarga la asistencia; forma equipos y los premia; aprueba entregas, gestiona las insignias vinculadas a las misiones de la clase y [devuelve al catálogo](/ayuda/alumnado/avatares-y-alias-por-clase) el avatar de un estudiante que no es adecuado. Le llega un aviso con cada entrega nueva.

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

**Lectura.** Ve la clase entera —misiones, alumnado, asistencia, equipos, entregas, tienda, comportamientos, profesorado e historial— sin cambiar nada. Puede usar la [ruleta](/ayuda/gamificacion/usar-la-ruleta-en-clase), descargar las entregas, duplicar la clase y salir de ella. No recibe los avisos de entregas nuevas.

**Edición.** Además, cambia el contenido: la historia, la guía, el nombre, el horario y la portada de la clase; crea y edita misiones, enigmas y documentos; lleva la tienda y los comportamientos, y los aplica; da recompensas libres; [pasa lista](/ayuda/alumnado/pasar-lista-y-consultar-la-asistencia) y descarga la asistencia; forma equipos y los premia; aprueba entregas y gestiona las insignias vinculadas a las misiones de la clase. Le llega un aviso con cada entrega nueva.

**Administración.** Además, cambia los ajustes —funcionalidades, niveles, y la asignatura, el nivel educativo, el idioma y la provincia de *Datos generales*—, invita al alumnado, crea sus cuentas y las gestiona: restablece contraseñas, cambia alias y quita estudiantes de la clase. También lleva el profesorado y archiva la clase.

## La propiedad de la clase

Cada clase tiene una persona **propietaria**, al principio quien la creó. Tiene administración y es la única que puede [publicarla como plantilla](/ayuda/clases/publicar-tu-clase-como-plantilla) y [pasar la propiedad](/ayuda/clases/traspasar-una-clase) a otra persona. Nadie le puede cambiar el nivel ni quitarla de la clase, y no puede salir sin pasarla antes.

## Qué ves según tu nivel

Cada pantalla de la clase enseña solo lo que tu nivel permite: sin edición no aparece **Nueva Misión**, y sin administración no aparece **Invitar**. Donde puedes mirar pero no cambiar nada, verás el aviso «Tu acceso a esta clase te deja ver esto, pero no cambiarlo».

Si alguien te cambia el nivel, te llega un aviso, y la clase se pone al día en cuanto abres el aviso.$itakai$;

-- clases/el-historial-de-la-clase: cada línea con el avatar de quien la hizo, y los avatares devueltos al catálogo.
UPDATE "help_articles" a
SET "body" = $itakai$La pestaña **Historial** de la clase cuenta qué ha hecho el profesorado en ella: quién, qué y cuándo. Es lo más útil cuando la clase es compartida y alguien pregunta quién cambió algo. La ve todo el profesorado de la clase, sea cual sea su nivel.

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

El alumnado no ve el historial, pero en su actividad ve quién le aprobó cada entrega y quién le aplicó cada comportamiento, con su avatar.$itakai$, "updated_at" = CURRENT_TIMESTAMP
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

El alumnado no ve el historial, pero en su actividad ve quién le aprobó cada entrega y quién le aplicó cada comportamiento.$itakai$;

-- clases/compartir-una-clase-con-otros-profesores: el alumnado ve también el avatar de cada docente.
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

La sección **Profesorado** la ve todo el profesorado de la clase, con el perfil y el nivel de cada persona. El alumnado ve en el **Resumen** de la clase quién la imparte, con su [avatar](/ayuda/tu-cuenta/tu-avatar-de-docente) y su perfil. Cada cambio queda en el [historial de la clase](/ayuda/clases/el-historial-de-la-clase).

Al duplicar una clase compartida, la copia es solo tuya: el resto del profesorado no pasa a ella.$itakai$, "updated_at" = CURRENT_TIMESTAMP
FROM "help_categories" c
WHERE c."id" = a."category_id" AND c."slug" = $itakai$clases$itakai$ AND a."locale" = 'es'
  AND a."slug" = $itakai$compartir-una-clase-con-otros-profesores$itakai$
  AND a."body" = $itakai$Una clase no tiene por qué ser de una sola persona. Puedes compartirla con quien la imparte contigo, con quien te sustituye o con alguien en prácticas, y cada cual entra con el nivel de acceso que le toque.

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

Al duplicar una clase compartida, la copia es solo tuya: el resto del profesorado no pasa a ella.$itakai$;

-- alumnado/la-vista-del-alumno: el profesorado sale con su avatar en el Resumen.
UPDATE "help_articles" a
SET "body" = $itakai$Conviene saber cómo se ve la plataforma desde el otro lado, porque muchas dudas de clase se resuelven sabiendo dónde está cada botón.


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

Con **Ver como estudiante**, debajo de tu nombre en el menú de la izquierda (en pantallas anchas), entras en la plataforma con una cuenta de estudiante de prueba, dentro de todas tus clases, para revisarlas desde dentro. Esa matrícula de prueba no cuenta en los listados, ni en el recuento del alumnado, ni en la clasificación.$itakai$, "updated_at" = CURRENT_TIMESTAMP
FROM "help_categories" c
WHERE c."id" = a."category_id" AND c."slug" = $itakai$alumnado$itakai$ AND a."locale" = 'es'
  AND a."slug" = $itakai$la-vista-del-alumno$itakai$
  AND a."body" = $itakai$Conviene saber cómo se ve la plataforma desde el otro lado, porque muchas dudas de clase se resuelven sabiendo dónde está cada botón.


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

Con **Ver como estudiante**, debajo de tu nombre en el menú de la izquierda (en pantallas anchas), entras en la plataforma con una cuenta de estudiante de prueba, dentro de todas tus clases, para revisarlas desde dentro. Esa matrícula de prueba no cuenta en los listados, ni en el recuento del alumnado, ni en la clasificación.$itakai$;
