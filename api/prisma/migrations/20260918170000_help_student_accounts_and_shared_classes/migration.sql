-- Ayuda para las cuentas de alumnado sin correo y las clases con varios profesores:
-- guías nuevas y correcciones de las que ya había, que daban por hecho un solo
-- profesor por clase y el código como única forma de entrar.
--
-- Como el resto del contenido de serie, el panel de administración manda. Los
-- INSERT solo crean lo que no exista y van al final de su categoría; cada UPDATE
-- solo cambia un campo si sigue exactamente con el texto de serie, así que lo que
-- alguien haya editado se queda como está. Siempre por slug de categoría y de
-- artículo, nunca por id.

-- alumnado/dar-de-alta-alumnos-sin-correo
INSERT INTO "help_articles" ("id", "category_id", "slug", "title", "summary", "cover_image", "body", "locale", "status", "order_index", "featured", "audience", "kind", "published_at", "updated_at")
SELECT gen_random_uuid()::text, c."id", $itakai$dar-de-alta-alumnos-sin-correo$itakai$, $itakai$Dar de alta alumnos sin correo$itakai$, $itakai$Crear tú las cuentas del alumnado que no tiene correo: usuario, contraseña temporal y primer acceso.$itakai$, $itakai$/app/ayuda/invitar.svg$itakai$, $itakai$Para el alumnado que no tiene correo —o que prefieres que no se registre por su cuenta— puedes crear tú las cuentas. Cada alumno entra con un **usuario** y una **contraseña temporal** que le das tú, y la cambia la primera vez que entra. La cuenta nace ya matriculada en tu clase: no necesita el código.

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

En la pestaña **Alumnos**, estas cuentas llevan la etiqueta **Sin correo**. Desde el menú **⋮** de cada una puedes [restablecer su contraseña](/ayuda/alumnado/restablecer-la-contrasena-de-un-alumno), y también [cambiar su alias o quitarla de la clase](/ayuda/alumnado/cambiar-el-alias-o-quitar-a-un-alumno-de-la-clase).

## Lo que conviene saber

- Esta clase es su **clase de origen**: su contraseña la restablece quien tiene administración en ella.
- El alumno puede unirse a otras clases con su código, como cualquier otro.
- No puede cambiar su nombre ni su usuario, añadir un correo a la cuenta ni borrarla.
- Se pueden crear cuentas aunque el registro público de la plataforma esté cerrado.

Lo que tiene que hacer el alumno para entrar está en [entrar con usuario y contraseña](/ayuda/si-eres-alumno/entrar-con-usuario-y-contrasena).$itakai$, 'es', 'publicado'::"HelpArticleStatus", (SELECT COALESCE(MAX(a."order_index"), -1) + 1 FROM "help_articles" a WHERE a."category_id" = c."id"), false, 'profesor'::"HelpAudience", 'guia'::"HelpArticleKind", CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM "help_categories" c WHERE c."slug" = $itakai$alumnado$itakai$
ON CONFLICT ("category_id", "slug", "locale") DO NOTHING;

-- alumnado/importar-una-lista-de-alumnos
INSERT INTO "help_articles" ("id", "category_id", "slug", "title", "summary", "cover_image", "body", "locale", "status", "order_index", "featured", "audience", "kind", "published_at", "updated_at")
SELECT gen_random_uuid()::text, c."id", $itakai$importar-una-lista-de-alumnos$itakai$, $itakai$Importar una lista de alumnos$itakai$, $itakai$Pegar la lista desde una hoja de cálculo o subir un CSV para crear muchas cuentas de una vez.$itakai$, $itakai$/app/ayuda/recorrido.svg$itakai$, $itakai$Si tienes la lista del grupo en una hoja de cálculo, no hace falta escribir los nombres uno a uno. Entra en la clase, pulsa **Invitar**, abre la pestaña **Crear cuentas** y elige **Pegar o subir una lista**.

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

Si prefieres escribir los nombres a mano, está explicado en [dar de alta alumnos sin correo](/ayuda/alumnado/dar-de-alta-alumnos-sin-correo).$itakai$, 'es', 'publicado'::"HelpArticleStatus", (SELECT COALESCE(MAX(a."order_index"), -1) + 1 FROM "help_articles" a WHERE a."category_id" = c."id"), false, 'profesor'::"HelpAudience", 'guia'::"HelpArticleKind", CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM "help_categories" c WHERE c."slug" = $itakai$alumnado$itakai$
ON CONFLICT ("category_id", "slug", "locale") DO NOTHING;

-- alumnado/la-hoja-de-credenciales
INSERT INTO "help_articles" ("id", "category_id", "slug", "title", "summary", "cover_image", "body", "locale", "status", "order_index", "featured", "audience", "kind", "published_at", "updated_at")
SELECT gen_random_uuid()::text, c."id", $itakai$la-hoja-de-credenciales$itakai$, $itakai$La hoja de credenciales$itakai$, $itakai$Copiar, descargar o imprimir las contraseñas temporales, que solo se ven una vez.$itakai$, $itakai$/app/ayuda/seguridad.svg$itakai$, $itakai$La hoja de credenciales aparece justo después de [crear cuentas](/ayuda/alumnado/dar-de-alta-alumnos-sin-correo) o de [restablecer una contraseña](/ayuda/alumnado/restablecer-la-contrasena-de-un-alumno). Tiene una tarjeta por alumno con su nombre, su **usuario**, su **contraseña temporal**, la dirección donde se entra y el código de la clase, y le recuerda que al entrar por primera vez tiene que cambiar la contraseña.

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

**Volver a Alumnos** te lleva a la lista de la clase. La hoja no está en ningún menú: solo existe justo después de crear cuentas o de restablecer una contraseña.$itakai$, 'es', 'publicado'::"HelpArticleStatus", (SELECT COALESCE(MAX(a."order_index"), -1) + 1 FROM "help_articles" a WHERE a."category_id" = c."id"), false, 'profesor'::"HelpAudience", 'guia'::"HelpArticleKind", CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM "help_categories" c WHERE c."slug" = $itakai$alumnado$itakai$
ON CONFLICT ("category_id", "slug", "locale") DO NOTHING;

-- alumnado/restablecer-la-contrasena-de-un-alumno
INSERT INTO "help_articles" ("id", "category_id", "slug", "title", "summary", "cover_image", "body", "locale", "status", "order_index", "featured", "audience", "kind", "published_at", "updated_at")
SELECT gen_random_uuid()::text, c."id", $itakai$restablecer-la-contrasena-de-un-alumno$itakai$, $itakai$Restablecer la contraseña de un alumno$itakai$, $itakai$Una contraseña temporal nueva para quien no tiene correo, y quién puede dársela.$itakai$, $itakai$/app/ayuda/cuenta-bloqueada.svg$itakai$, $itakai$Cuando un alumno que entra con usuario olvida su contraseña, no puede recuperarla por correo porque su cuenta no lo tiene: se la restableces tú.

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

Lo tienes en **Alumnos**, en el menú de la izquierda: debajo del nombre de un alumno sin correo aparece su usuario, y también en su ficha.$itakai$, 'es', 'publicado'::"HelpArticleStatus", (SELECT COALESCE(MAX(a."order_index"), -1) + 1 FROM "help_articles" a WHERE a."category_id" = c."id"), false, 'profesor'::"HelpAudience", 'guia'::"HelpArticleKind", CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM "help_categories" c WHERE c."slug" = $itakai$alumnado$itakai$
ON CONFLICT ("category_id", "slug", "locale") DO NOTHING;

-- alumnado/cambiar-el-alias-o-quitar-a-un-alumno-de-la-clase
INSERT INTO "help_articles" ("id", "category_id", "slug", "title", "summary", "cover_image", "body", "locale", "status", "order_index", "featured", "audience", "kind", "published_at", "updated_at")
SELECT gen_random_uuid()::text, c."id", $itakai$cambiar-el-alias-o-quitar-a-un-alumno-de-la-clase$itakai$, $itakai$Cambiar el alias o quitar a un alumno de la clase$itakai$, $itakai$Corregir un alias que no encaja y sacar a alguien de la clase, sabiendo lo que se pierde.$itakai$, $itakai$/app/ayuda/avatares.svg$itakai$, $itakai$El menú **⋮** de cada alumno, en la pestaña **Alumnos** de la clase o en su ficha, tiene también estas dos acciones. Las dos piden acceso de administración en la clase.

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

Si es una cuenta sin correo creada en esta clase, después solo la administración de la plataforma podrá restablecer su contraseña. La ventana te lo avisa antes de confirmar.

> Para cerrar un curso no hace falta quitar a nadie: archiva la clase y todo se queda como estaba.

Las dos acciones quedan anotadas en el [historial de la clase](/ayuda/clases/el-historial-de-la-clase).$itakai$, 'es', 'publicado'::"HelpArticleStatus", (SELECT COALESCE(MAX(a."order_index"), -1) + 1 FROM "help_articles" a WHERE a."category_id" = c."id"), false, 'profesor'::"HelpAudience", 'guia'::"HelpArticleKind", CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM "help_categories" c WHERE c."slug" = $itakai$alumnado$itakai$
ON CONFLICT ("category_id", "slug", "locale") DO NOTHING;

-- clases/compartir-una-clase-con-otros-profesores
INSERT INTO "help_articles" ("id", "category_id", "slug", "title", "summary", "cover_image", "body", "locale", "status", "order_index", "featured", "audience", "kind", "published_at", "updated_at")
SELECT gen_random_uuid()::text, c."id", $itakai$compartir-una-clase-con-otros-profesores$itakai$, $itakai$Compartir una clase con otros profesores$itakai$, $itakai$Añadir a otros docentes a tu clase, cambiar su acceso, quitarlos o salir tú.$itakai$, $itakai$/app/ayuda/clase-nueva.svg$itakai$, $itakai$Una clase no tiene por qué ser de un solo profesor. Puedes compartirla con quien la imparte contigo, con quien te sustituye o con alguien en prácticas, y cada uno entra con el nivel de acceso que le toque.

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

Al duplicar una clase compartida, la copia es solo tuya: el resto del profesorado no pasa a ella.$itakai$, 'es', 'publicado'::"HelpArticleStatus", (SELECT COALESCE(MAX(a."order_index"), -1) + 1 FROM "help_articles" a WHERE a."category_id" = c."id"), false, 'profesor'::"HelpAudience", 'guia'::"HelpArticleKind", CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM "help_categories" c WHERE c."slug" = $itakai$clases$itakai$
ON CONFLICT ("category_id", "slug", "locale") DO NOTHING;

-- clases/niveles-y-perfiles-del-profesorado
INSERT INTO "help_articles" ("id", "category_id", "slug", "title", "summary", "cover_image", "body", "locale", "status", "order_index", "featured", "audience", "kind", "published_at", "updated_at")
SELECT gen_random_uuid()::text, c."id", $itakai$niveles-y-perfiles-del-profesorado$itakai$, $itakai$Niveles y perfiles del profesorado$itakai$, $itakai$Lectura, edición y administración: qué puede hacer cada uno, y qué añade ser el propietario.$itakai$, $itakai$/app/ayuda/recursos.svg$itakai$, $itakai$Cada persona del profesorado de una clase tiene un **perfil** y un **nivel de acceso**. El perfil dice qué papel tiene; el nivel, qué puede hacer.

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

Si alguien te cambia el nivel, te llega un aviso, y la clase se pone al día en cuanto abres el aviso.$itakai$, 'es', 'publicado'::"HelpArticleStatus", (SELECT COALESCE(MAX(a."order_index"), -1) + 1 FROM "help_articles" a WHERE a."category_id" = c."id"), false, 'profesor'::"HelpAudience", 'guia'::"HelpArticleKind", CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM "help_categories" c WHERE c."slug" = $itakai$clases$itakai$
ON CONFLICT ("category_id", "slug", "locale") DO NOTHING;

-- clases/traspasar-una-clase
INSERT INTO "help_articles" ("id", "category_id", "slug", "title", "summary", "cover_image", "body", "locale", "status", "order_index", "featured", "audience", "kind", "published_at", "updated_at")
SELECT gen_random_uuid()::text, c."id", $itakai$traspasar-una-clase$itakai$, $itakai$Traspasar una clase$itakai$, $itakai$Pasar la propiedad de una clase a otro profesor, y qué pasa con tus clases si borras tu cuenta.$itakai$, $itakai$/app/ayuda/publicar.svg$itakai$, $itakai$Cada clase tiene un solo **propietario**. Si deja el centro o la clase pasa a otra persona, puede pasarle la propiedad sin perder nada de lo que hay dentro.

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

Al borrar tu cuenta desde tu perfil, cada clase de la que eres propietario pasa a otra persona con administración en ella, y antes de confirmar ves a quién va cada una. Si en alguna no hay nadie más con administración, la cuenta no se puede borrar todavía: da administración a alguien en esa clase, o pásale la propiedad, y vuelve a intentarlo.$itakai$, 'es', 'publicado'::"HelpArticleStatus", (SELECT COALESCE(MAX(a."order_index"), -1) + 1 FROM "help_articles" a WHERE a."category_id" = c."id"), false, 'profesor'::"HelpAudience", 'guia'::"HelpArticleKind", CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM "help_categories" c WHERE c."slug" = $itakai$clases$itakai$
ON CONFLICT ("category_id", "slug", "locale") DO NOTHING;

-- clases/el-historial-de-la-clase
INSERT INTO "help_articles" ("id", "category_id", "slug", "title", "summary", "cover_image", "body", "locale", "status", "order_index", "featured", "audience", "kind", "published_at", "updated_at")
SELECT gen_random_uuid()::text, c."id", $itakai$el-historial-de-la-clase$itakai$, $itakai$El historial de la clase$itakai$, $itakai$Quién ha hecho qué en la clase, y cómo filtrarlo por profesor o por tipo.$itakai$, $itakai$/app/ayuda/deshacer.svg$itakai$, $itakai$La pestaña **Historial** de la clase cuenta qué ha hecho el profesorado en ella: quién, qué y cuándo. Es lo más útil cuando la clase es compartida y alguien pregunta quién cambió algo. La ve todo el profesorado de la clase, sea cual sea su nivel.

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

El alumnado no ve el historial, pero en su actividad ve quién le aprobó cada entrega y quién le aplicó cada comportamiento.$itakai$, 'es', 'publicado'::"HelpArticleStatus", (SELECT COALESCE(MAX(a."order_index"), -1) + 1 FROM "help_articles" a WHERE a."category_id" = c."id"), false, 'profesor'::"HelpAudience", 'guia'::"HelpArticleKind", CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM "help_categories" c WHERE c."slug" = $itakai$clases$itakai$
ON CONFLICT ("category_id", "slug", "locale") DO NOTHING;

-- si-eres-alumno/entrar-con-usuario-y-contrasena
INSERT INTO "help_articles" ("id", "category_id", "slug", "title", "summary", "cover_image", "body", "locale", "status", "order_index", "featured", "audience", "kind", "published_at", "updated_at")
SELECT gen_random_uuid()::text, c."id", $itakai$entrar-con-usuario-y-contrasena$itakai$, $itakai$Entrar con usuario y contraseña$itakai$, $itakai$Si tu profesor te ha creado la cuenta: dónde se escribe el usuario y qué hacer si no te deja entrar.$itakai$, $itakai$/app/ayuda/acceso-clase.svg$itakai$, $itakai$Si no tienes correo, puede que tu profesor te haya creado la cuenta. En ese caso no tienes que registrarte ni escribir ningún código: ya estás dentro de su clase. Te habrá dado tres cosas, en una tarjeta o en un mensaje: tu **usuario**, una **contraseña temporal** y la dirección donde se entra.

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

Con ella puedes unirte a otras clases con su código, como cualquiera: [cómo entro en mi clase](/ayuda/si-eres-alumno/como-entro-en-mi-clase).$itakai$, 'es', 'publicado'::"HelpArticleStatus", (SELECT COALESCE(MAX(a."order_index"), -1) + 1 FROM "help_articles" a WHERE a."category_id" = c."id"), false, 'alumno'::"HelpAudience", 'guia'::"HelpArticleKind", CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM "help_categories" c WHERE c."slug" = $itakai$si-eres-alumno$itakai$
ON CONFLICT ("category_id", "slug", "locale") DO NOTHING;

-- si-eres-alumno/cambiar-la-contrasena-la-primera-vez
INSERT INTO "help_articles" ("id", "category_id", "slug", "title", "summary", "cover_image", "body", "locale", "status", "order_index", "featured", "audience", "kind", "published_at", "updated_at")
SELECT gen_random_uuid()::text, c."id", $itakai$cambiar-la-contrasena-la-primera-vez$itakai$, $itakai$Cambiar la contraseña la primera vez$itakai$, $itakai$La pantalla que sale al entrar con una contraseña temporal, y cómo elegir la tuya.$itakai$, $itakai$/app/ayuda/seguridad.svg$itakai$, $itakai$La contraseña que te da tu profesor es **temporal**: solo sirve para entrar la primera vez. Nada más entrar con ella aparece la pantalla **Cambia tu contraseña**, y hasta que no elijas una tuya no puedes usar el resto de la plataforma.

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

Si olvidas la contraseña y tu profesor te la restablece, te dará otra temporal y volverá a salir esta pantalla. Y si más adelante quieres cambiarla tú, está en **Mi perfil**, pestaña **Seguridad**, tarjeta **Contraseña**. Cada vez que la cambias se cierran tus sesiones abiertas en otros equipos.$itakai$, 'es', 'publicado'::"HelpArticleStatus", (SELECT COALESCE(MAX(a."order_index"), -1) + 1 FROM "help_articles" a WHERE a."category_id" = c."id"), false, 'alumno'::"HelpAudience", 'guia'::"HelpArticleKind", CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM "help_categories" c WHERE c."slug" = $itakai$si-eres-alumno$itakai$
ON CONFLICT ("category_id", "slug", "locale") DO NOTHING;

-- si-eres-alumno/he-olvidado-mi-contrasena-y-no-tengo-correo
INSERT INTO "help_articles" ("id", "category_id", "slug", "title", "summary", "cover_image", "body", "locale", "status", "order_index", "featured", "audience", "kind", "published_at", "updated_at")
SELECT gen_random_uuid()::text, c."id", $itakai$he-olvidado-mi-contrasena-y-no-tengo-correo$itakai$, $itakai$He olvidado mi contraseña y no tengo correo$itakai$, $itakai$Sin correo no llega ningún enlace: tu profesor te da una contraseña nueva.$itakai$, $itakai$/app/ayuda/cuenta-bloqueada.svg$itakai$, $itakai$El enlace **¿Olvidaste tu contraseña?**, en la pantalla de entrada, manda un correo para recuperarla. Si entras con un usuario que te dio tu profesor, tu cuenta no tiene correo y ese enlace no te sirve: no hay a dónde mandarlo.

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

Nadie más que tú sabe tu contraseña, ni siquiera tu profesor: si la pierdes, solo se puede poner una nueva. Elige una que recuerdes.$itakai$, 'es', 'publicado'::"HelpArticleStatus", (SELECT COALESCE(MAX(a."order_index"), -1) + 1 FROM "help_articles" a WHERE a."category_id" = c."id"), false, 'alumno'::"HelpAudience", 'guia'::"HelpArticleKind", CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM "help_categories" c WHERE c."slug" = $itakai$si-eres-alumno$itakai$
ON CONFLICT ("category_id", "slug", "locale") DO NOTHING;

-- primeros-pasos/que-es-itakai: Varios profesores por clase, cuentas sin correo y sin la sección de centros.
UPDATE "help_articles" a
SET "body" = $itakai$ITAKAI convierte una asignatura en una aventura. Tú creas una **clase**, le pones una historia, y el temario se reparte en **misiones** que los alumnos completan entregando trabajo. Cada entrega que revisas reparte recursos, y esos recursos suben de nivel, compran cosas en la tienda de clase y aparecen en la clasificación.

## Las tres piezas

**La clase** es el contenedor: tus alumnos, tu narrativa y las reglas del juego. Decides qué recursos usa —puedes tener una clase solo con experiencia, o con monedas y tienda, o con todo— y esa decisión se puede cambiar en cualquier momento.

**Las misiones** son las unidades de trabajo. Cada una tiene una rareza, opcionalmente una fecha de entrega, y por dentro se divide en **enigmas**: los pasos concretos que el alumno resuelve uno a uno. El enigma es lo que se entrega y lo que se puntúa.

**Los recursos** son lo que el alumno gana. La experiencia hace subir de nivel, las monedas se gastan en la tienda que tú montas, el maná paga poderes y los puntos de vida suben o bajan con los comportamientos que registras en clase.

## Quién es quién

- **Profesorado**: crea clases, escribe misiones, revisa entregas y gestiona la tienda y los comportamientos. Una clase puede tener varios profesores, cada uno con su nivel de acceso: [compartir una clase](/ayuda/clases/compartir-una-clase-con-otros-profesores).
- **Alumnado**: se une con un código —o entra con la cuenta que le crea su profesor, si no tiene correo—, resuelve enigmas, gasta lo que gana y ve su progreso.
- **Administración**: gestiona la instancia completa — usuarios, clases, inteligencia artificial, almacenamiento y el centro de ayuda.

## Por dónde empezar

Si es tu primera vez, el camino corto es: [crear una clase](/ayuda/primeros-pasos/crear-tu-primera-clase), [invitar a tus alumnos](/ayuda/primeros-pasos/invitar-alumnos-a-una-clase) y [escribir tu primera misión](/ayuda/misiones/crear-una-mision). Con eso ya tienes una clase viva; el resto se añade cuando lo necesites.$itakai$, "updated_at" = CURRENT_TIMESTAMP
FROM "help_categories" c
WHERE c."id" = a."category_id" AND c."slug" = $itakai$primeros-pasos$itakai$ AND a."locale" = 'es'
  AND a."slug" = $itakai$que-es-itakai$itakai$
  AND a."body" = $itakai$ITAKAI convierte una asignatura en una aventura. Tú creas una **clase**, le pones una historia, y el temario se reparte en **misiones** que los alumnos completan entregando trabajo. Cada entrega que revisas reparte recursos, y esos recursos suben de nivel, compran cosas en la tienda de clase y aparecen en la clasificación.

## Las tres piezas

**La clase** es el contenedor: tus alumnos, tu narrativa y las reglas del juego. Decides qué recursos usa —puedes tener una clase solo con experiencia, o con monedas y tienda, o con todo— y esa decisión se puede cambiar en cualquier momento.

**Las misiones** son las unidades de trabajo. Cada una tiene una rareza, opcionalmente una fecha de entrega, y por dentro se divide en **enigmas**: los pasos concretos que el alumno resuelve uno a uno. El enigma es lo que se entrega y lo que se puntúa.

**Los recursos** son lo que el alumno gana. La experiencia hace subir de nivel, las monedas se gastan en la tienda que tú montas, el maná paga poderes y los puntos de vida suben o bajan con los comportamientos que registras en clase.

## Quién es quién

- **Profesorado**: crea clases, escribe misiones, revisa entregas y gestiona la tienda y los comportamientos.
- **Alumnado**: se une con un código, resuelve enigmas, gasta lo que gana y ve su progreso.
- **Administración**: gestiona la instancia completa — usuarios, centros, inteligencia artificial y almacenamiento.

## Por dónde empezar

Si es tu primera vez, el camino corto es: [crear una clase](/ayuda/primeros-pasos/crear-tu-primera-clase), [invitar a tus alumnos](/ayuda/primeros-pasos/invitar-alumnos-a-una-clase) y [escribir tu primera misión](/ayuda/misiones/crear-una-mision). Con eso ya tienes una clase viva; el resto se añade cuando lo necesites.$itakai$;

-- primeros-pasos/invitar-alumnos-a-una-clase: El código ya no es el único camino: también se crean cuentas sin correo, y solo con administración.
UPDATE "help_articles" a
SET "summary" = $itakai$El código de la clase y las cuentas sin correo: las dos formas de meter a tus alumnos.$itakai$, "updated_at" = CURRENT_TIMESTAMP
FROM "help_categories" c
WHERE c."id" = a."category_id" AND c."slug" = $itakai$primeros-pasos$itakai$ AND a."locale" = 'es'
  AND a."slug" = $itakai$invitar-alumnos-a-una-clase$itakai$
  AND a."summary" = $itakai$El código de la clase: dónde está, cómo compartirlo y qué pasa cuando un alumno lo usa.$itakai$;

UPDATE "help_articles" a
SET "body" = $itakai$Hay dos formas de meter a tus alumnos en una clase: darles el **código** para que entren con su propia cuenta, o **crearles tú las cuentas**, pensado para quien no tiene correo. Las dos están en el mismo sitio: entra en la clase y pulsa **Invitar**, en la cabecera (en pantallas estrechas solo se ve su icono, una persona con un signo más).

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

> **Ojo con las clases archivadas.** Una clase archivada no admite alumnos nuevos: el botón **Invitar** aparece desactivado y quien intente unirse con su código recibe el aviso de arriba. Si vas a reutilizar una clase del curso pasado, mejor [duplicarla](/ayuda/clases/duplicar-una-clase-para-el-curso-siguiente) que desarchivarla.$itakai$, "updated_at" = CURRENT_TIMESTAMP
FROM "help_categories" c
WHERE c."id" = a."category_id" AND c."slug" = $itakai$primeros-pasos$itakai$ AND a."locale" = 'es'
  AND a."slug" = $itakai$invitar-alumnos-a-una-clase$itakai$
  AND a."body" = $itakai$Tus alumnos entran en la clase con su **código**, un código de seis caracteres que la plataforma crea junto con la clase. Tú lo compartes, ellos lo escriben y ya están dentro: nadie tiene que aceptar nada.

## Dónde está el código

Entra en la clase y pulsa **Invitar**, en la cabecera (en pantallas estrechas solo se ve su icono, una persona con un signo más). Se abre la ventana **Invitar Alumnos** con el código en grande y el botón **Copiar Código**, para pegarlo donde quieras: el aula virtual, un correo al grupo o un mensaje. Proyectarlo en la pizarra funciona igual de bien.

También lo tienes a la vista al terminar de crear la clase.

## Qué hace el alumno

Con su cuenta de alumno, entra en **Mis Clases**, pulsa **Unirse a clase**, escribe el código y confirma con **Unirse a la clase**. En el móvil tiene **Unirse a Clase** arriba del todo, al abrir el menú. Da igual si lo escribe en mayúsculas o en minúsculas.

Entra directamente y la plataforma le lleva a la clase. Tú lo verás en la pestaña **Alumnos** de la clase la próxima vez que la abras.

Si el código no vale, el alumno ve el motivo en la misma ventana: **«Código de clase inválido»** cuando está mal copiado o no es de ninguna clase, y **«Esta clase está archivada y no admite nuevos alumnos»** cuando es el de una clase archivada.

## Un código por clase

El código es el único camino para entrar: no se puede buscar a un alumno ni añadirlo a mano. Por eso conviene darlo solo a tu grupo. Si tienes varios grupos, cada clase tiene su propio código, y una clase duplicada estrena el suyo: asegúrate de repartir el que toca.

> **Ojo con las clases archivadas.** Una clase archivada no admite alumnos nuevos: el botón **Invitar** aparece desactivado y quien intente unirse con su código recibe el aviso de arriba. Si vas a reutilizar una clase del curso pasado, mejor [duplicarla](/ayuda/clases/duplicar-una-clase-para-el-curso-siguiente) que desarchivarla.$itakai$;

-- clases/crear-una-clase-desde-cero-o-desde-una-plantilla: Importar no trae la guía de clase; sí la portada y los niveles. La copia es tuya como propietario.
UPDATE "help_articles" a
SET "body" = $itakai$Además de crear una clase en blanco, puedes partir de una **plantilla**: una clase que otro docente ha publicado para que cualquiera la reutilice.

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

La clase importada es tuya —eres su propietario— y se edita como cualquier otra. Se llama como la plantilla, con «(copia)» detrás. Cambia lo que no encaje —precios, nombres, la propia narrativa— antes de dar el código a tus alumnos.$itakai$, "updated_at" = CURRENT_TIMESTAMP
FROM "help_categories" c
WHERE c."id" = a."category_id" AND c."slug" = $itakai$clases$itakai$ AND a."locale" = 'es'
  AND a."slug" = $itakai$crear-una-clase-desde-cero-o-desde-una-plantilla$itakai$
  AND a."body" = $itakai$Además de crear una clase en blanco, puedes partir de una **plantilla**: una clase que otro docente ha publicado para que cualquiera la reutilice.

## Dónde están

En *Plantillas* tienes el catálogo con todo lo publicado en tu instancia. Puedes filtrar por asignatura, nivel e idioma, y ver una vista previa antes de decidir.

## Qué te traes al importar

Al importar una plantilla se copia:

- La **narrativa** y la guía de clase.
- Los **recursos activos**: qué usa esa clase y qué no.
- La **tienda**: recompensas y poderes con sus precios.
- Los **comportamientos** configurados.

## Qué no

**Las misiones no vienen en la importación.** La plantilla te da el marco —la historia, las reglas, la economía— y el contenido lo pones tú. Es una decisión deliberada: las misiones son lo más pegado a tu programación y a tu grupo.

Tampoco viene nada del alumnado de la clase original: ni personas, ni progreso, ni saldos. Una plantilla es una clase vacía de gente.

## Después de importar

La clase importada es tuya y se edita como cualquier otra. Cambia lo que no encaje —precios, nombres, la propia narrativa— antes de dar el código a tus alumnos.$itakai$;

-- clases/elegir-que-recursos-usa-tu-clase: Los interruptores están en Funcionalidades y piden administración.
UPDATE "help_articles" a
SET "body" = $itakai$En *Ajustes* de la clase, sección **Funcionalidades**, decides con qué juega tu grupo. Cada interruptor cambia lo que ven tus alumnos y lo que se reparte al revisar entregas. Cambiarlos pide acceso de administración en la clase.

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

> Empieza corto. Una clase con experiencia y misiones ya funciona el primer día; monedas, tienda y poderes se añaden cuando el grupo ya está rodado.$itakai$, "updated_at" = CURRENT_TIMESTAMP
FROM "help_categories" c
WHERE c."id" = a."category_id" AND c."slug" = $itakai$clases$itakai$ AND a."locale" = 'es'
  AND a."slug" = $itakai$elegir-que-recursos-usa-tu-clase$itakai$
  AND a."body" = $itakai$En *Ajustes* de la clase decides con qué juega tu grupo. Cada interruptor cambia lo que ven tus alumnos y lo que se reparte al revisar entregas.

## Qué hace cada uno

| Recurso | Para qué sirve |
|---|---|
| **Experiencia (XP)** | Sube de nivel. Es la columna vertebral: casi todas las clases la usan |
| **Monedas** | Se gastan en la tienda que tú montas |
| **Maná** | Paga el uso de los poderes de la tienda |
| **Puntos de vida** | Suben y bajan con los comportamientos que registras |
| **Tienda** | La pantalla donde el alumnado canjea lo que ha ganado |
| **Insignias** | Reconocimientos por completar misiones |
| **Niveles** | Los rangos y los umbrales de experiencia |

## Apagar un recurso no borra nada

Si desactivas las monedas, dejan de verse y **dejan de repartirse al revisar entregas**, aunque los enigmas tengan monedas configuradas. Los saldos que ya tuvieran tus alumnos se quedan guardados: al volver a activarlas, aparecen otra vez tal cual estaban.

## Dependencias

Algunos ajustes necesitan otro para tener sentido —la tienda sin monedas no vende nada— y la propia pantalla te lo dice cuando ocurre. Y **al menos un recurso tiene que estar activo**: una clase sin ninguno no podría repartir nada al revisar una entrega.

> Empieza corto. Una clase con experiencia y misiones ya funciona el primer día; monedas, tienda y poderes se añaden cuando el grupo ya está rodado.$itakai$;

-- clases/duplicar-una-clase-para-el-curso-siguiente: Se duplica desde Ajustes → Gestión, con las opciones reales; la guía no se copia y la copia es solo tuya.
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

Para duplicar una clase basta con poder verla, así que también puedes duplicar una que otro profesor comparte contigo. La copia nace con un solo profesor, tú, como propietario: el resto del profesorado de la original no pasa a ella. Si quieres volver a compartirla, [añádelos en la copia](/ayuda/clases/compartir-una-clase-con-otros-profesores).

## Por qué duplicar y no reutilizar

Es tentador borrar a los alumnos del año pasado y volver a usar la misma clase, pero pierdes el histórico de un curso que puede que quieras consultar. Duplicando te quedas con las dos cosas: la clase del año pasado archivada y tal cual estaba, y una copia nueva lista para empezar.$itakai$, "updated_at" = CURRENT_TIMESTAMP
FROM "help_categories" c
WHERE c."id" = a."category_id" AND c."slug" = $itakai$clases$itakai$ AND a."locale" = 'es'
  AND a."slug" = $itakai$duplicar-una-clase-para-el-curso-siguiente$itakai$
  AND a."body" = $itakai$Cuando empieza un curso nuevo no hace falta rehacer el trabajo: desde el menú de la clase, *Duplicar* crea una copia limpia y te deja elegir qué te llevas.

## Qué puedes elegir

- **La narrativa** y la guía de clase.
- **Los recursos activos** y su configuración.
- **La tienda** completa, con precios.
- **Los comportamientos.**
- **Las misiones**, con todos sus enigmas y sus recompensas.

Marcas lo que quieras y el resto se queda en blanco.

## Qué no se copia nunca

**Nada del alumnado.** Ni las personas, ni sus entregas, ni la experiencia, ni los saldos, ni las insignias ganadas. La copia nace vacía de gente, que es justo lo que quieres en septiembre.

Tampoco se copia el código de clase: la copia tiene el suyo propio.

## Por qué duplicar y no reutilizar

Es tentador borrar a los alumnos del año pasado y volver a usar la misma clase, pero pierdes el histórico de un curso que puede que quieras consultar. Duplicando te quedas con las dos cosas: la clase del año pasado archivada y tal cual estaba, y una copia nueva lista para empezar.$itakai$;

-- clases/publicar-tu-clase-como-plantilla: Solo el propietario publica, desde Ajustes → Gestión; la guía no llega a quien importa.
UPDATE "help_articles" a
SET "body" = $itakai$Si has montado una clase que funciona, puedes publicarla como **plantilla** para que cualquier otro docente de la instancia parta de ella. Se hace en los **Ajustes** de la clase, sección **Gestión**, con el interruptor **Publicar como plantilla**. Solo lo tiene el propietario de la clase, y antes hay que guardar la asignatura, el nivel educativo y el idioma en **Datos generales**.


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

Si [pasas la propiedad](/ayuda/clases/traspasar-una-clase) de la clase, publicarla o retirarla pasa a ser cosa del nuevo propietario.$itakai$, "updated_at" = CURRENT_TIMESTAMP
FROM "help_categories" c
WHERE c."id" = a."category_id" AND c."slug" = $itakai$clases$itakai$ AND a."locale" = 'es'
  AND a."slug" = $itakai$publicar-tu-clase-como-plantilla$itakai$
  AND a."body" = $itakai$Si has montado una clase que funciona, puedes publicarla como **plantilla** para que cualquier otro docente de la instancia parta de ella.


![El recorrido de una plantilla: publicas tu clase, aparece en el catálogo y otro profesor se lleva una copia.](/app/ayuda/diagramas/flujo-plantillas.svg)
## Qué se comparte

Se publica el marco de la clase: la narrativa, la guía, los recursos activos, la tienda y los comportamientos. Es la parte reutilizable — lo que a otro docente le ahorra las horas de montaje.

## Qué se queda fuera

**Todo lo que tenga que ver con personas.** No se comparte ningún alumno, ninguna entrega, ningún saldo ni ninguna estadística. Quien importe tu plantilla recibe una clase vacía.

## Antes de publicar

Merece la pena repasar dos cosas:

1. **La narrativa**, por si menciona a tu grupo concreto, a tu centro o a un curso específico.
2. **Los nombres de la tienda y los comportamientos**, por si hay bromas internas que fuera de contexto no se entienden.

## Despublicar

Puedes retirar tu plantilla del catálogo cuando quieras. Quien ya la haya importado se queda con su copia: importar crea una clase independiente, no un enlace a la tuya.$itakai$;

-- misiones/revisar-entregas: Los avisos solo llegan con edición, la lectura no aprueba y cada aprobación deja autor.
UPDATE "help_articles" a
SET "body" = $itakai$Cuando un alumno sube su archivo a un enigma, la entrega queda **pendiente** hasta que la revises. La revisión se hace en la propia misión: ahí decides con qué porcentaje se ha completado la tarea, y ese único número reparte todas las recompensas.


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

Cada aprobación queda en el [historial de la clase](/ayuda/clases/el-historial-de-la-clase), con quién la hizo y con qué porcentaje. El alumno también ve en su actividad quién le aprobó la entrega.$itakai$, "updated_at" = CURRENT_TIMESTAMP
FROM "help_categories" c
WHERE c."id" = a."category_id" AND c."slug" = $itakai$misiones$itakai$ AND a."locale" = 'es'
  AND a."slug" = $itakai$revisar-entregas$itakai$
  AND a."body" = $itakai$Cuando un alumno sube su archivo a un enigma, la entrega queda **pendiente** hasta que la revises. La revisión se hace en la propia misión: ahí decides con qué porcentaje se ha completado la tarea, y ese único número reparte todas las recompensas.


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

Un enigma ya aprobado **no se puede volver a aprobar**: para ese alumno deja de tener el botón **Entregar**, y la plataforma nunca paga dos veces las recompensas del mismo enigma.$itakai$;

-- gamificacion/comportamientos-y-puntos-de-vida: Se aplican desde su pestaña con edición, y el registro está en Historial.
UPDATE "help_articles" a
SET "body" = $itakai$Los comportamientos son la forma de que lo que ocurre en el aula —para bien y para mal— tenga efecto en la partida.


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

Todo lo aplicado queda con fecha, con quién lo aplicó y sobre quién. Lo ves en la pestaña **Historial** de la clase, con el tipo **Comportamientos** ([el historial de la clase](/ayuda/clases/el-historial-de-la-clase)), y en la ficha del alumno. El alumno también ve en su actividad quién se lo aplicó.$itakai$, "updated_at" = CURRENT_TIMESTAMP
FROM "help_categories" c
WHERE c."id" = a."category_id" AND c."slug" = $itakai$gamificacion$itakai$ AND a."locale" = 'es'
  AND a."slug" = $itakai$comportamientos-y-puntos-de-vida$itakai$
  AND a."body" = $itakai$Los comportamientos son la forma de que lo que ocurre en el aula —para bien y para mal— tenga efecto en la partida.


![Ejemplos de comportamientos que suman puntos de vida y de comportamientos que los restan.](/app/ayuda/diagramas/vidas.svg)
## Cómo funcionan

Defines una lista de comportamientos para tu clase. Cada uno tiene un nombre, si es **positivo o negativo**, y cuánto mueve de cada recurso: experiencia, monedas y puntos de vida. Luego, en el momento, se lo aplicas a un alumno con dos clics.

Ejemplos que suelen funcionar: "ayuda a un compañero" (+15 XP, +5 monedas), "trae el material" (+10 XP), "interrumpe la clase" (−10 puntos de vida).

## Los puntos de vida

Cada alumno empieza con 100 y se mueven solo con los comportamientos. No bloquean nada por sí solos: son un termómetro visible, y lo que hagas cuando alguien baje mucho es cosa tuya. Muchos docentes montan un poder en la tienda que permite recuperarlos, y así el sistema se cierra sobre sí mismo.

## Consejos de uso

- **Pocos y claros.** Con seis u ocho comportamientos bien elegidos se cubre casi todo el curso.
- **Que se vea.** Aplicarlo en el momento y en voz alta es la mitad del efecto.
- **Cuidado con lo negativo.** Un sistema que solo resta se convierte en un castigo con otro nombre.

## El registro

Todo lo aplicado queda con fecha, con quién lo aplicó y sobre quién. Está en el historial de la clase y en la ficha del alumno.$itakai$;

-- gamificacion/insignias: Se crean desde Insignias, en el menú; la misión, y con ella quién la gestiona, es lo que decide.
UPDATE "help_articles" a
SET "body" = $itakai$Las insignias son el reconocimiento visible de algo conseguido. A diferencia de la experiencia o las monedas, no se gastan ni se pierden: se quedan en el perfil del alumno dentro de esa clase.

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

Una por misión importante, no una por misión. Si todas las misiones dan insignia, la colección deja de significar nada; si solo la dan las grandes, conseguir una es una noticia.$itakai$, "updated_at" = CURRENT_TIMESTAMP
FROM "help_categories" c
WHERE c."id" = a."category_id" AND c."slug" = $itakai$gamificacion$itakai$ AND a."locale" = 'es'
  AND a."slug" = $itakai$insignias$itakai$
  AND a."body" = $itakai$Las insignias son el reconocimiento visible de algo conseguido. A diferencia de la experiencia o las monedas, no se gastan ni se pierden: se quedan en el perfil del alumno dentro de esa clase.

## Cómo se ganan

Una insignia se asocia a una **misión**. Cuando un alumno completa esa misión entera —todos sus enigmas aprobados— la insignia entra en su colección automáticamente, junto con el bonus de experiencia por rareza.

## Crear una

Desde la pestaña de insignias de la clase. Necesitas un nombre, una descripción de por qué se consigue y una imagen. La imagen puedes subirla o generarla con la inteligencia artificial a partir de la descripción, que para insignias funciona sorprendentemente bien.

## Dónde se ven

En el perfil del alumno dentro de la clase, en su pantalla de insignias, y en las tarjetas de misión completada. Las que todavía no ha ganado aparecen bloqueadas, con su descripción visible: saber lo que falta es parte del incentivo.

## Cuántas poner

Una por misión importante, no una por misión. Si todas las misiones dan insignia, la colección deja de significar nada; si solo la dan las grandes, conseguir una es una noticia.$itakai$;

-- alumnado/la-vista-del-alumno: Ve el profesorado de su clase y quién le aprobó o le aplicó algo; las cuentas sin correo empiezan cambiando la contraseña.
UPDATE "help_articles" a
SET "body" = $itakai$Conviene saber cómo se ve la plataforma desde el otro lado, porque muchas dudas de clase se resuelven sabiendo dónde está cada botón.


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

Con **Ver como alumno**, debajo de tu nombre en el menú de la izquierda (en pantallas anchas), entras en la plataforma como un alumno de prueba, dentro de todas tus clases, para revisarlas desde dentro. Esa matrícula de prueba no cuenta en los listados, ni en el recuento de alumnos, ni en la clasificación.$itakai$, "updated_at" = CURRENT_TIMESTAMP
FROM "help_categories" c
WHERE c."id" = a."category_id" AND c."slug" = $itakai$alumnado$itakai$ AND a."locale" = 'es'
  AND a."slug" = $itakai$la-vista-del-alumno$itakai$
  AND a."body" = $itakai$Conviene saber cómo se ve la plataforma desde el otro lado, porque muchas dudas de clase se resuelven sabiendo dónde está cada botón.


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

Con **Ver como alumno**, debajo de tu nombre en el menú de la izquierda (en pantallas anchas), entras en la plataforma como un alumno de prueba, dentro de todas tus clases, para revisarlas desde dentro. Esa matrícula de prueba no cuenta en los listados, ni en el recuento de alumnos, ni en la clasificación.$itakai$;

-- alumnado/avatares-y-alias-por-clase: Con administración en la clase, el profesorado ya puede cambiar el alias.
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

Los alias y los avatares los ves en la pestaña **Alumnos** de la clase, junto al nombre real de cada uno, y en la ficha de cada alumno. Si un alias no encaja y tienes administración en la clase, cámbialo con **Cambiar alias**, en el menú **⋮** del alumno: [cambiar el alias o quitar a un alumno](/ayuda/alumnado/cambiar-el-alias-o-quitar-a-un-alumno-de-la-clase). El avatar no se edita desde tu lado: si no encaja, pide al alumno que lo cambie en su pestaña **Avatar**. Merece la pena dejar claras las reglas del juego el primer día, en la [guía de clase](/ayuda/clases/la-guia-de-clase).$itakai$, "updated_at" = CURRENT_TIMESTAMP
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

Los alias y los avatares los ves en la pestaña **Alumnos** de la clase, junto al nombre real de cada uno, y en la ficha de cada alumno. Desde tu lado no se pueden editar: si algo no encaja, pide al alumno que lo cambie en su pestaña **Avatar**. Merece la pena dejar claras las reglas del juego el primer día, en la [guía de clase](/ayuda/clases/la-guia-de-clase).$itakai$;

-- tu-cuenta/avisos-y-recordatorios: Los avisos de entregas solo llegan con edición, hay avisos de profesorado y el correo solo con cuenta con correo.
UPDATE "help_articles" a
SET "body" = $itakai$Los avisos aparecen **siempre dentro de la plataforma**, en **Avisos**, en el menú de la izquierda. Al lado verás cuántos tienes sin leer; en el móvil, ese número sale también sobre el botón que abre el menú.

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

En el idioma de tu cuenta, el que eliges en tu perfil. El aviso se escribe en tu idioma en el momento de crearse, así que si lo cambias después, los anteriores se quedan como estaban. La excepción, de momento, es el aviso de insignia nueva, que llega siempre en castellano.$itakai$, "updated_at" = CURRENT_TIMESTAMP
FROM "help_categories" c
WHERE c."id" = a."category_id" AND c."slug" = $itakai$tu-cuenta$itakai$ AND a."locale" = 'es'
  AND a."slug" = $itakai$avisos-y-recordatorios$itakai$
  AND a."body" = $itakai$Los avisos aparecen **siempre dentro de la plataforma**, en **Avisos**, en el menú de la izquierda. Al lado verás cuántos tienes sin leer; en el móvil, ese número sale también sobre el botón que abre el menú.

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

En el idioma de tu cuenta, el que eliges en tu perfil. El aviso se escribe en tu idioma en el momento de crearse, así que si lo cambias después, los anteriores se quedan como estaban. La excepción, de momento, es el aviso de insignia nueva, que llega siempre en castellano.$itakai$;

-- tu-cuenta/seguridad-de-tu-cuenta: El aviso por correo solo con correo, se cierran las demás sesiones, el correo pide contraseña y las cuentas con usuario.
UPDATE "help_articles" a
SET "body" = $itakai$Todo está en tu **perfil, pestaña Seguridad**.

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

Si usas un ordenador de aula, cierra sesión al terminar. Los ajustes de accesibilidad se quedan guardados en tu cuenta, así que al volver a entrar en cualquier equipo los tienes otra vez sin tocar nada.$itakai$, "updated_at" = CURRENT_TIMESTAMP
FROM "help_categories" c
WHERE c."id" = a."category_id" AND c."slug" = $itakai$tu-cuenta$itakai$ AND a."locale" = 'es'
  AND a."slug" = $itakai$seguridad-de-tu-cuenta$itakai$
  AND a."body" = $itakai$Todo está en tu **perfil, pestaña Seguridad**.

## Cambiar la contraseña

Necesitas la actual. Al guardarla, la plataforma te manda un correo avisando del cambio: si no has sido tú, es la señal para reaccionar rápido.

## Cambiar el correo

Pide la contraseña, porque el correo es lo que permite recuperar la cuenta.

## Si la has olvidado

Desde la pantalla de inicio de sesión, *¿Olvidaste tu contraseña?* manda un enlace al correo de la cuenta. **El enlace caduca en una hora y solo funciona una vez.** Si no llega, revisa la carpeta de no deseado antes de volver a pedirlo.

## Sesiones abiertas

En Seguridad ves las sesiones activas de tu cuenta, con el dispositivo, el navegador y cuándo se usó cada una por última vez. La actual está marcada.

Puedes cerrar una suelta o **cerrar todas de golpe**, que es lo que hay que hacer si te dejaste la sesión abierta en un ordenador del aula. Cerrarlas todas no te echa de la sesión desde la que lo haces.

## En equipos compartidos

Si usas un ordenador de aula, cierra sesión al terminar. Los ajustes de accesibilidad se quedan guardados en tu cuenta, así que al volver a entrar en cualquier equipo los tienes otra vez sin tocar nada.$itakai$;

-- si-eres-alumno/como-entro-en-mi-clase: Quien tiene cuenta creada por su profesor ya está en la clase y no necesita código.
UPDATE "help_articles" a
SET "body" = $itakai$Para entrar en una clase de ITAKAI solo necesitas su **código**, que te da tu profesor: seis caracteres que pueden incluir algún guion o guion bajo, así que cópialo tal cual. Con él entras directamente, sin esperar a que nadie te acepte.

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

La misma cuenta te vale para todas las clases y para todos los cursos. No hace falta crear una nueva cada año ni una por asignatura: tu progreso, tus insignias y tu avatar viajan contigo.$itakai$, "updated_at" = CURRENT_TIMESTAMP
FROM "help_categories" c
WHERE c."id" = a."category_id" AND c."slug" = $itakai$si-eres-alumno$itakai$ AND a."locale" = 'es'
  AND a."slug" = $itakai$como-entro-en-mi-clase$itakai$
  AND a."body" = $itakai$Para entrar en una clase de ITAKAI solo necesitas su **código**, que te da tu profesor: seis caracteres que pueden incluir algún guion o guion bajo, así que cópialo tal cual. Con él entras directamente, sin esperar a que nadie te acepte.

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

-- si-eres-alumno/mi-avatar-y-mi-nombre-en-clase: El profesorado puede cambiar un alias que no sea adecuado.
UPDATE "help_articles" a
SET "body" = $itakai$En cada clase tienes un avatar y un alias. Al unirte te ponen unos al azar, y puedes cambiarlos cuando quieras.

## Son por clase

Lo importante: **el avatar y el alias son de cada clase**, no de tu cuenta. Puedes ser una cosa en Historia y otra en Matemáticas. Al cambiarlos en una clase, las demás se quedan como estaban.

## Dónde se cambian

Dentro de la clase, en la pestaña **Avatar**. Cambia lo que quieras y pulsa **Guardar cambios**.

## El alias

Es el nombre con el que apareces en la clase: en el ranking, si tu clase lo tiene activado, y en las entregas que revisa tu profesor. Puede tener hasta 20 caracteres. Tu profesor también ve tu nombre real, que es el que necesita para las notas.

Ponte algo que puedas enseñar en clase: si no lo es, tu profesor puede cambiártelo.

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

Ponte algo que puedas enseñar en clase.

## El avatar

Elige a tu guía entre los personajes de la lista. Si quieres uno a tu gusto, describe cómo lo quieres y pulsa **Genera avatar**: la inteligencia artificial lo crea a partir del personaje que hayas elegido. Cuanto más concreto seas con los colores, la ropa y el estilo, mejor.$itakai$;

-- cuando-algo-falla/mi-alumno-no-aparece-en-la-clase: Búsqueda por usuario, alumnos quitados por otro profesor y cuentas sin correo.
UPDATE "help_articles" a
SET "body" = $itakai$Un alumno asegura que ha usado el código y no lo ves en la pestaña **Alumnos** de la clase. Con el código se entra directamente, sin que nadie tenga que aceptar nada, así que casi siempre es una de estas cosas.

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

En la lista de la clase cada alumno sale con el nombre de su cuenta y, debajo, con su alias de la clase, el que empieza por @. Al unirse le toca un alias mitológico al azar, así que no te fíes del alias: el buscador de la pestaña encuentra por nombre y por alias. Las cuentas que has creado tú llevan además la etiqueta **Sin correo**.$itakai$, "updated_at" = CURRENT_TIMESTAMP
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

Si tienes varios grupos, o has duplicado la clase, cada una tiene su propio código y es fácil repartir el que no toca. En **Alumnos**, en el menú de la izquierda, están todos tus alumnos con su correo: búscalo y abre su ficha para ver en qué clases está.

## Entró con otra cuenta

Un alumno con dos cuentas —la del centro y una personal— puede haberse unido con la que no esperas. Búscalo en **Alumnos** por su nombre o por su correo. Si está con una cuenta que no es la que usa en clase, pídele que entre con la buena y vuelva a escribir el código.

## Está, pero no lo reconoces

En la lista de la clase cada alumno sale con el nombre de su cuenta y, debajo, con su alias de la clase, el que empieza por @. Al unirse le toca un alias mitológico al azar, así que no te fíes del alias: el buscador de la pestaña encuentra por nombre y por alias.$itakai$;

-- cuando-algo-falla/un-alumno-no-ve-la-clase: Se compara el correo o el usuario, y un alumno puede haber sido quitado de la clase.
UPDATE "help_articles" a
SET "body" = $itakai$El alumno entra, llega a su panel y la clase no está. Repasa esto en orden.

## ¿Con qué cuenta ha entrado?

Es el motivo número uno. Un alumno con dos cuentas —la del centro y una personal— entra con la que no es. Pídele que mire con qué correo o con qué usuario ha iniciado sesión y compáralo con el que aparece en **Alumnos**, en tu menú.

## ¿Está en la clase de verdad?

Con el código se entra directamente, así que, si se unió, lo ves en la pestaña **Alumnos** de la clase. Si no está, no llegó a unirse: pregúntale qué mensaje le salió al escribir el código. Y si estaba y ya no está, mira la pestaña **Historial** de la clase: alguien del profesorado puede haberlo quitado.

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

Es el motivo número uno. Un alumno con dos cuentas —la del centro y una personal— entra con la que no es. Pídele que mire con qué correo ha iniciado sesión y compáralo con el que aparece en **Alumnos**, en tu menú.

## ¿Está en la clase de verdad?

Con el código se entra directamente, así que, si se unió, lo ves en la pestaña **Alumnos** de la clase. Si no está, no llegó a unirse: pregúntale qué mensaje le salió al escribir el código.

## ¿La clase está archivada?

Una clase archivada desaparece de la vista del alumnado. Si acabas de archivarla para ordenar el curso, es eso.

## ¿Es de otro grupo?

Si has duplicado la clase para varios grupos, es fácil darle a un alumno el código del grupo equivocado. Mira si aparece en otra de tus clases.

## Última comprobación

Si todo lo anterior está bien, que recargue la página o cierre sesión y vuelva a entrar. El panel se carga al entrar, y una sesión que lleva días abierta puede estar enseñando una lista vieja.$itakai$;

-- cuando-algo-falla/he-borrado-algo-sin-querer: Quitar a un alumno de la clase tampoco tiene vuelta atrás, y el historial dice quién hizo qué.
UPDATE "help_articles" a
SET "body" = $itakai$Antes de nada: no vuelvas a crearlo a toda prisa. Mira primero si de verdad se ha ido.

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

## Las recompensas ya repartidas

El XP, las monedas y el maná que el alumnado ya ha cobrado **no se van** al eliminar nada de eso. Y un enigma que ya tiene entregas no se puede eliminar, justo para que nadie pierda lo que ganó con él.

## Si falta algo que no has tocado

Habla con quien administre vuestra instancia. Si hay copias de seguridad del servidor, se puede restaurar desde ahí; desde la aplicación, no.

## Para la próxima

Antes de un cambio grande —reorganizar un trimestre, limpiar misiones viejas— duplica la clase. La copia te queda como red de seguridad y se hace en un momento.$itakai$;

-- cuando-algo-falla/las-recompensas-no-cuadran: El historial dice quién aprobó cada entrega y con qué porcentaje.
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
- En la pestaña **Historial** de la clase, con el tipo **Entregas**, cada aprobación con quién la hizo y con qué porcentaje. Si la clase es compartida, puede que la aprobara otra persona del profesorado.
- En **Alumnos**, en el menú de la izquierda, la ficha de cada alumno reúne su experiencia, sus monedas y su maná en cada una de tus clases y, en **Actividad Reciente**, sus últimas entregas aprobadas y misiones completadas, con la experiencia de cada una.

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
- En **Alumnos**, en el menú de la izquierda, la ficha de cada alumno reúne su experiencia, sus monedas y su maná en cada una de tus clases y, en **Actividad Reciente**, sus últimas entregas aprobadas y misiones completadas, con la experiencia de cada una.

Las monedas y el maná de cada entrega no aparecen sueltos en esas listas; el saldo de la clase, sí.$itakai$;

-- cuando-algo-falla/no-puedo-entrar-en-mi-cuenta: Cuentas con usuario, el límite de intentos y la cuenta desactivada.
UPDATE "help_articles" a
SET "summary" = $itakai$Contraseña, usuario, Google, demasiados intentos y las cuentas duplicadas.$itakai$, "updated_at" = CURRENT_TIMESTAMP
FROM "help_categories" c
WHERE c."id" = a."category_id" AND c."slug" = $itakai$cuando-algo-falla$itakai$ AND a."locale" = 'es'
  AND a."slug" = $itakai$no-puedo-entrar-en-mi-cuenta$itakai$
  AND a."summary" = $itakai$Contraseña, Google y las cuentas duplicadas.$itakai$;

UPDATE "help_articles" a
SET "body" = $itakai$Antes de crear otra cuenta —que es lo que todo el mundo hace y complica el arreglo—, prueba esto.

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

Que quien administre la instancia compruebe que la cuenta existe y está activa con el correo o el usuario que tú crees. Desde ahí se ve enseguida si el problema es la cuenta o la contraseña.$itakai$, "updated_at" = CURRENT_TIMESTAMP
FROM "help_categories" c
WHERE c."id" = a."category_id" AND c."slug" = $itakai$cuando-algo-falla$itakai$ AND a."locale" = 'es'
  AND a."slug" = $itakai$no-puedo-entrar-en-mi-cuenta$itakai$
  AND a."body" = $itakai$Antes de crear otra cuenta —que es lo que todo el mundo hace y complica el arreglo—, prueba esto.

## ¿Entraste con Google?

Si creaste la cuenta con el botón de Google, no tienes contraseña que recordar: tienes que volver a entrar con Google. Pedir una contraseña nueva no va a servir de nada.

## Restablecer la contraseña

Si entraste con correo y contraseña, usa el enlace para restablecerla. Llega un correo con un enlace temporal; si no aparece, mira en spam, que es donde suele acabar.

## La cuenta duplicada

El lío clásico: tener una cuenta con el correo personal y otra con el del centro, y haberse unido a la clase con una sola. Son dos cuentas distintas y la clase solo está en la que usaste para escribir el código. Comprueba con qué correo entras.

Si ya tienes dos, quédate con la que usas en clase. Si la clase no aparece en ella, vuelve a escribir el código desde esa cuenta.

## Sigo sin poder

Que quien administre la instancia compruebe que la cuenta existe y está activa con el correo que tú crees. Desde ahí se ve enseguida si el problema es la cuenta o la contraseña.$itakai$;
