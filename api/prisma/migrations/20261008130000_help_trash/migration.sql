-- Ayuda de la papelera de clases: una guía nueva, y las correcciones de las que
-- decían que las clases no se borran, que tus clases pasan a otra persona al
-- borrar tu cuenta (las de la papelera no) o que el profesorado nunca recibe
-- correos (el aviso de que una clase de la papelera se va a borrar, sí).
--
-- Como el resto del contenido de serie, el panel de administración manda. El
-- INSERT solo crea lo que no exista y va al final de su categoría; cada UPDATE
-- solo cambia un campo si sigue exactamente con el texto de serie, así que lo que
-- alguien haya editado se queda como está. Siempre por slug de categoría y de
-- artículo, nunca por id.

-- clases/la-papelera-de-clases
INSERT INTO "help_articles" ("id", "category_id", "slug", "title", "summary", "cover_image", "body", "locale", "status", "order_index", "featured", "audience", "kind", "published_at", "updated_at")
SELECT gen_random_uuid()::text, c."id", $itakai$la-papelera-de-clases$itakai$, $itakai$La papelera de clases$itakai$, $itakai$Eliminar una clase, restaurarla durante 30 días o borrarla ya, y qué se pierde cuando se borra para siempre.$itakai$, $itakai$/app/ayuda/deshacer.svg$itakai$, $itakai$**Eliminar una clase no la borra en el momento: la envía a la papelera.** Allí pasa 30 días, por si hace falta recuperarla; después se borra para siempre, con todo lo que tiene dentro.

## Enviar una clase a la papelera

1. En la clase, abre **Ajustes** y la sección **Gestión**.
2. En **Eliminar clase**, pulsa **Eliminar**.
3. Revisa la lista de lo que se borrará pasados los 30 días y pulsa **Enviar a la papelera**.

Solo puede hacerlo quien tiene la **propiedad** de la clase: al resto del profesorado no le sale el botón. Si lo que quieres es guardarla hasta el curso que viene, no la elimines: archívala desde su tarjeta en **Mis Clases**.

## Mientras está en la papelera

- El alumnado deja de verla: no puede entrar, ni entregar, ni mirar la clasificación, la guía o la tienda. Su código de invitación deja de funcionar.
- El resto del profesorado de la clase deja de tenerla en su lista.
- Si estaba publicada como plantilla, sale del catálogo.
- Todavía no se borra nada: misiones, entregas, progreso y saldos siguen ahí.

## Dónde está la papelera

En **Mis Clases**, junto a las pestañas **Activas** y **Archivadas**, aparece el botón **Papelera** con cuántas clases tienes en ella; si no hay ninguna, no sale. De cada clase ves quién la envió y cuándo, y el día en que se borrará para siempre. Cuando quedan pocos días, la cuenta atrás se destaca en rojo.

## Restaurar una clase

Pulsa **Restaurar**. La clase vuelve a **Mis Clases**, en **Archivadas**, tal como estaba: alumnado, misiones, entregas y saldos. Vuelve archivada a propósito, para que el alumnado no entre hasta que tú lo decidas: desarchívala desde su tarjeta cuando quieras volver a usarla. Si era una plantilla, no se publica otra vez sola.

## El aviso antes de que se borre

**Tres días antes** de que se cumpla el plazo te llega un aviso en **Avisos**, y también a tu correo si tu cuenta tiene uno, con la fecha y un enlace a la papelera. Llega una sola vez cada vez que la clase entra en la papelera, y si la restauras, el aviso desaparece.

## Borrar ya

Si no quieres esperar a los 30 días, **Borrar ya** la borra en el momento. Antes ves lo que se pierde y tienes que marcar que entiendes que no se puede recuperar. **No tiene vuelta atrás**: después nadie puede recuperarla, tampoco la administración de la plataforma.

## Qué se borra para siempre

- La clase, con su historia, su guía, su tienda, sus comportamientos y su [historial](/ayuda/clases/el-historial-de-la-clase).
- Sus misiones, con sus enigmas, sus documentos y sus insignias.
- Lo que el alumnado tenía en ella: el progreso, las entregas con sus archivos, las compras y los saldos.
- Las cuentas sin correo creadas en esta clase que nunca se han usado. Las que sí se han usado se quedan, pero sin clase de origen: desde entonces, solo la administración de la plataforma puede restablecer su contraseña.

Lo que esta clase comparte con otras —la portada o un documento de una copia— no se borra: la otra clase lo sigue usando.

## Si quien tiene la propiedad no puede restaurarla

La administración de vuestra instancia ve la papelera de toda la plataforma en **Panel de administración → Clases**, pestaña **Papelera**, y puede restaurar o borrar ya cualquier clase. Es el respaldo para cuando quien tiene la propiedad no puede hacerlo, por ejemplo porque su cuenta está suspendida. Lo que haga queda apuntado en el historial de la clase y en el registro del sistema.

## Si borras tu cuenta

Las clases que tengas en la papelera no pasan a nadie: se borran para siempre con tu cuenta. El aviso antes de confirmar te dice cuáles son.$itakai$, 'es', 'publicado'::"HelpArticleStatus", (SELECT COALESCE(MAX(a."order_index"), -1) + 1 FROM "help_articles" a WHERE a."category_id" = c."id"), false, 'profesor'::"HelpAudience", 'guia'::"HelpArticleKind", CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM "help_categories" c WHERE c."slug" = $itakai$clases$itakai$
ON CONFLICT ("category_id", "slug", "locale") DO NOTHING;

-- cuando-algo-falla/he-borrado-algo-sin-querer: Las clases eliminadas pasan 30 días en la papelera y se restauran desde ahí.
UPDATE "help_articles" a
SET "body" = $itakai$Antes de nada: no vuelvas a crearlo a toda prisa. Mira primero si de verdad se ha ido.

## Una clase eliminada está en la papelera

Eliminar una clase no la borra en el momento: pasa **30 días en la papelera**, y desde ahí se restaura con todo lo que tenía. La papelera está en **Mis Clases**, en el botón **Papelera**, junto a **Activas** y **Archivadas**. Solo quien tiene la propiedad de la clase puede restaurarla: si no eres tú, pídeselo antes de que se cumpla el plazo. Lo tienes todo en [La papelera de clases](/ayuda/clases/la-papelera-de-clases).

Lo que ya no tiene arreglo es una clase que se borró con **Borrar ya** o que pasó sus 30 días en la papelera.

## Archivar no es borrar

Una clase archivada sigue entera y se puede recuperar. No aparece entre tus clases activas, pero está en **Mis Clases**, en **Archivadas**, y desde su tarjeta se desarchiva.

Las misiones no se pueden eliminar.

## Lo que sí desaparece

Lo que eliminas —un enigma, un material de una misión, un artículo de la tienda, un comportamiento, una insignia o, en administración, una categoría de la ayuda con sus artículos— no se puede recuperar desde la aplicación.

Tampoco tiene vuelta atrás **quitar a alguien de una clase**: se borra todo lo que tenía en ella, su progreso, sus entregas y sus saldos. Si vuelve a entrar con el código, empieza de cero.

## Las recompensas ya repartidas

El XP, las monedas y el maná que el alumnado ya ha cobrado **no se van** al eliminar nada de eso. Y un enigma que ya tiene entregas no se puede eliminar, justo para que nadie pierda lo que ganó con él.

## Si falta algo que no has tocado

Si la clase es compartida, mira primero la pestaña **Historial**: dice quién borró o quitó qué, y cuándo. Si lo que falta es la clase entera, puede que quien tiene su propiedad la haya enviado a la papelera: pregúntale.

Habla con quien administre vuestra instancia: desde su panel puede restaurar una clase de la papelera aunque quien tiene su propiedad no pueda. Lo demás solo se puede recuperar de las copias de seguridad del servidor, si las hay; desde la aplicación, no.

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

Tampoco tiene vuelta atrás **quitar a alguien de una clase**: se borra todo lo que tenía en ella, su progreso, sus entregas y sus saldos. Si vuelve a entrar con el código, empieza de cero.

## Las recompensas ya repartidas

El XP, las monedas y el maná que el alumnado ya ha cobrado **no se van** al eliminar nada de eso. Y un enigma que ya tiene entregas no se puede eliminar, justo para que nadie pierda lo que ganó con él.

## Si falta algo que no has tocado

Si la clase es compartida, mira primero la pestaña **Historial**: dice quién borró o quitó qué, y cuándo.

Habla con quien administre vuestra instancia. Si hay copias de seguridad del servidor, se puede restaurar desde ahí; desde la aplicación, no.

## Para la próxima

Antes de un cambio grande —reorganizar un trimestre, limpiar misiones viejas— duplica la clase. La copia te queda como red de seguridad y se hace en un momento.$itakai$;

-- clases/traspasar-una-clase: Al borrar tu cuenta, las clases de la papelera se borran con ella.
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

Al borrar tu cuenta desde tu perfil, cada clase de la que tienes la propiedad pasa a otra persona con administración en ella, y antes de confirmar ves a quién va cada una. Si en alguna no hay nadie más con administración, la cuenta no se puede borrar todavía: da administración a alguien en esa clase, o pásale la propiedad, y vuelve a intentarlo.

Las clases que tengas en la [papelera](/ayuda/clases/la-papelera-de-clases) no pasan a nadie: se borran para siempre con tu cuenta, y el aviso también te dice cuáles son.$itakai$, "updated_at" = CURRENT_TIMESTAMP
FROM "help_categories" c
WHERE c."id" = a."category_id" AND c."slug" = $itakai$clases$itakai$ AND a."locale" = 'es'
  AND a."slug" = $itakai$traspasar-una-clase$itakai$
  AND a."body" = $itakai$Cada clase tiene una sola persona **propietaria**. Si deja el centro o la clase pasa a otra persona, puede pasarle la propiedad sin perder nada de lo que hay dentro.

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

Al borrar tu cuenta desde tu perfil, cada clase de la que tienes la propiedad pasa a otra persona con administración en ella, y antes de confirmar ves a quién va cada una. Si en alguna no hay nadie más con administración, la cuenta no se puede borrar todavía: da administración a alguien en esa clase, o pásale la propiedad, y vuelve a intentarlo.$itakai$;

-- tu-cuenta/avisos-y-recordatorios: El aviso de la papelera, y que es el único del profesorado que llega por correo.
UPDATE "help_articles" a
SET "body" = $itakai$Los avisos aparecen **siempre dentro de la plataforma**, en **Avisos**, en el menú de la izquierda. Al lado verás cuántos tienes sin leer; en el móvil, ese número sale también sobre el botón que abre el menú.

En **Avisos** puedes ver todos o solo los que no has leído, marcarlos como leídos y eliminarlos. Si un aviso lleva a algún sitio, al pulsarlo vas directamente allí.

## Qué te avisa

Si eres **docente**:

- Cuando alguien del alumnado hace una entrega en una clase donde tienes acceso de edición o de administración. El aviso te lleva directamente a la misión, con la ventana de entregas de ese enigma abierta para que la revises. En cuanto alguien del profesorado la aprueba, el aviso queda como leído para todo el profesorado.
- Cuando cambia tu sitio en el profesorado de una clase: te añaden, te cambian el perfil o el nivel, te quitan o pasa a ser tuya su propiedad.
- **Tres días antes de que se borre para siempre** una clase tuya que está en la [papelera](/ayuda/clases/la-papelera-de-clases). El aviso lleva a la papelera, por si quieres restaurarla.

Si eres **estudiante**:

- Cuando tu docente ha revisado una entrega, con el porcentaje que te ha puesto.
- **Cuando faltan menos de 24 horas para el final de una misión** que todavía no has completado.
- Cuando consigues una de las insignias de la plataforma, las que se ganan por misiones completadas, experiencia o nivel. Este aviso solo sale en la plataforma, nunca por correo.

## Los dos interruptores del alumnado

En tu perfil, pestaña **Configuración**, tarjeta **Avisos**:

- **Avisos por correo.** Con él encendido, las entregas revisadas y los recordatorios te llegan también al correo. Si lo apagas, los sigues viendo en la plataforma. Si tu cuenta no tiene correo, este interruptor no aparece: tus avisos se quedan en la plataforma.
- **Recordatorios de entrega.** Si lo apagas, dejas de recibir el aviso de las 24 horas, tanto en la plataforma como por correo. Las entregas revisadas te siguen llegando.

## Los correos del profesorado

Los avisos del profesorado —entregas nuevas y cambios en el profesorado de una clase— **no se mandan por correo**, y es a propósito: treinta estudiantes entregando la misma misión llenarían el buzón. Se ven en **Avisos** y, clase a clase, en el **Resumen**, que cuenta las entregas por revisar.

La única excepción es el aviso de que una clase de tu papelera se va a borrar: llega una sola vez y lo que anuncia no tiene vuelta atrás, así que te llega también al correo, si tu cuenta tiene uno.

## En qué idioma llegan

En el idioma de tu cuenta, el que eliges en tu perfil. El aviso se escribe en tu idioma en el momento de crearse, así que si lo cambias después, los anteriores se quedan como estaban. La excepción, de momento, es el aviso de insignia nueva, que llega siempre en castellano.$itakai$, "updated_at" = CURRENT_TIMESTAMP
FROM "help_categories" c
WHERE c."id" = a."category_id" AND c."slug" = $itakai$tu-cuenta$itakai$ AND a."locale" = 'es'
  AND a."slug" = $itakai$avisos-y-recordatorios$itakai$
  AND a."body" = $itakai$Los avisos aparecen **siempre dentro de la plataforma**, en **Avisos**, en el menú de la izquierda. Al lado verás cuántos tienes sin leer; en el móvil, ese número sale también sobre el botón que abre el menú.

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

En el idioma de tu cuenta, el que eliges en tu perfil. El aviso se escribe en tu idioma en el momento de crearse, así que si lo cambias después, los anteriores se quedan como estaban. La excepción, de momento, es el aviso de insignia nueva, que llega siempre en castellano.$itakai$;
