-- Ayuda de E1: las pistas de las misiones. Una guía para el profesorado (pistas
-- en las misiones) y otra para el alumnado (usar las pistas de una misión), y
-- los retoques de las que hablan de recompensas, entregas, la tienda y el XP:
-- las pistas se pagan con monedas, XP o un % de lo que la misión aún tiene que
-- pagar, y el XP ya no es algo que «no baja nunca».
--
-- Como el resto del contenido de serie, el panel de administración manda. El
-- INSERT solo crea lo que no exista y va al final de su categoría; cada UPDATE
-- solo cambia un campo si sigue exactamente con el texto de serie, así que lo que
-- alguien haya editado se queda como está. Siempre por slug de categoría y de
-- artículo, nunca por id.

-- misiones/pistas-en-las-misiones
INSERT INTO "help_articles" ("id", "category_id", "slug", "title", "summary", "cover_image", "body", "locale", "status", "order_index", "featured", "audience", "kind", "published_at", "updated_at")
SELECT gen_random_uuid()::text, c."id", $itakai$pistas-en-las-misiones$itakai$, $itakai$Pistas en las misiones$itakai$, $itakai$Pistas en orden, de lo general a lo concreto, que el alumnado abre pagando monedas, XP o un % de la recompensa.$itakai$, $itakai$/app/ayuda/enigmas.svg$itakai$, $itakai$Cada misión puede tener **hasta 10 pistas**. Las escribes tú, decides su orden y lo que cuesta usar cada una. El alumnado ve cuántas hay y lo que cuestan, pero el texto de una pista solo le aparece cuando la usa.

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

Las pistas viajan con la misión al [importarla en otra clase](/ayuda/misiones/importar-una-mision-de-otra-clase), al duplicar la clase y al importar una plantilla, con su orden y su coste. Quién las usó, no. Adaptar una misión con IA no cambia sus pistas: revísalas después.$itakai$, 'es', 'publicado'::"HelpArticleStatus", (SELECT COALESCE(MAX(a."order_index"), -1) + 1 FROM "help_articles" a WHERE a."category_id" = c."id"), false, 'profesor'::"HelpAudience", 'guia'::"HelpArticleKind", CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM "help_categories" c WHERE c."slug" = $itakai$misiones$itakai$
ON CONFLICT ("category_id", "slug", "locale") DO NOTHING;

-- si-eres-alumno/usar-las-pistas-de-una-mision
INSERT INTO "help_articles" ("id", "category_id", "slug", "title", "summary", "cover_image", "body", "locale", "status", "order_index", "featured", "audience", "kind", "published_at", "updated_at")
SELECT gen_random_uuid()::text, c."id", $itakai$usar-las-pistas-de-una-mision$itakai$, $itakai$Usar las pistas de una misión$itakai$, $itakai$Si te atascas, una pista te ayuda. Se abren en orden y cada una tiene su coste.$itakai$, $itakai$/app/ayuda/recompensas.svg$itakai$, $itakai$Algunas misiones tienen **pistas**: ayudas que ha escrito tu docente para cuando te atascas. Están en la misión, en la sección **Pistas**, debajo de los enigmas.

## Cómo funcionan

- Ves cuántas pistas hay y lo que cuesta cada una, pero **su texto solo aparece cuando la usas**.
- Se usan **en orden**: primero la 1, luego la 2… Las que van después salen con un candado y te dicen cuál tienes que usar antes.
- Una pista usada se queda abierta: puedes volver a leerla cuando quieras.

## Lo que cuestan

Junto al botón **Usar la pista** ves lo que cuesta y lo que tienes, antes de pulsarlo:

- **Monedas** o **XP**: se pagan en el momento. Si no te llega, el botón no se puede pulsar y te dice cuánto te falta. Pagar con XP puede bajarte de nivel, pero no pierdes las insignias que ya tienes.
- **Un % de la recompensa**: no pagas nada en ese momento, pero la misión te dará ese porcentaje menos de **lo que aún te queda por cobrar**: los enigmas que te faltan por aprobar (también los que están en revisión) y el bonus por completarla. Lo que ya has cobrado no cambia. En la tarjeta **Recompensas** de la misión ves cuánto restan tus pistas.
- Si pone **Gratis**, no cuesta nada.

Al pulsar **Usar la pista** se usa al momento y no tiene vuelta atrás: piénsalo antes.

## Cuándo se pueden usar

Mientras la misión sigue en curso. Cuando la completas, o si pasa su fecha de entrega, ya no se pueden usar más pistas; las que usaste siguen abiertas.

## Las pistas de la tienda

Si en la tienda de tu clase hay una pista que se compra, esa es distinta: te la da tu docente cuando la usas. Las pistas de una misión se abren solas.$itakai$, 'es', 'publicado'::"HelpArticleStatus", (SELECT COALESCE(MAX(a."order_index"), -1) + 1 FROM "help_articles" a WHERE a."category_id" = c."id"), false, 'alumno'::"HelpAudience", 'guia'::"HelpArticleKind", CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM "help_categories" c WHERE c."slug" = $itakai$si-eres-alumno$itakai$
ON CONFLICT ("category_id", "slug", "locale") DO NOTHING;

-- misiones/recompensas-xp-monedas-y-mana: las pistas: lo que pagan y que restan de lo que queda por cobrar.
UPDATE "help_articles" a
SET "body" = $itakai$**Las recompensas se configuran en el enigma, no en la misión.** Es el detalle que más despista al principio: la misión no tiene un "vale 300 XP" propio, sino que suma lo de sus enigmas.


![De dónde sale y en qué se gasta cada recurso: el XP sube de nivel y no se gasta en la tienda, las monedas sí se gastan en ella y el maná paga los poderes.](/app/ayuda/diagramas/circuito-recompensas.svg)
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

Un enigma puede tener monedas configuradas y no repartir ninguna, si la clase tiene las monedas desactivadas. Se reparte lo que la clase usa, no lo que el enigma dice.

## Si la misión tiene pistas

Quien usa una [pista de la misión](/ayuda/misiones/pistas-en-las-misiones) paga su coste: monedas o XP en el momento, o un % menos de lo que la misión aún le tenga que pagar, bonus incluido. El total que ve el profesorado es el de la misión sin pistas; quien ha usado pistas de % ve el bonus ya descontado.$itakai$, "updated_at" = CURRENT_TIMESTAMP
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

El total que ve el alumnado es la **suma de lo que dan sus enigmas más el bonus por completar la misión**, que depende de la rareza. Si tienes tres enigmas de 100 XP en una misión épica, el total son 300 más 200 de bonus: 500.

## Si cambias una recompensa a mitad de curso

Una vez que alguien ha completado un enigma, su recompensa **solo se puede subir, no bajar**. Es para no dejar a nadie con menos experiencia de la que ya se ganó. La plataforma te lo impide directamente en el formulario.

## Y si el recurso está apagado

Un enigma puede tener monedas configuradas y no repartir ninguna, si la clase tiene las monedas desactivadas. Se reparte lo que la clase usa, no lo que el enigma dice.$itakai$;

-- misiones/revisar-entregas: Recibirá ya descontado y cómo se combina el % de las pistas.
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

Quien termina el último enigma pendiente se lleva además el **bonus por completar la misión** —entre 50 y 400 XP [según la rareza](/ayuda/misiones/rarezas-y-fechas-de-entrega)— y con él la insignia asociada, si la misión tiene una.

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

Cada aprobación queda en el [historial de la clase](/ayuda/clases/el-historial-de-la-clase), con quién la hizo y con qué porcentaje. Cada estudiante también ve en su actividad quién le aprobó la entrega.$itakai$;

-- gamificacion/monedas-y-tienda-de-clase: en qué se diferencia la pista de la tienda de las pistas de una misión.
UPDATE "help_articles" a
SET "body" = $itakai$La tienda es donde lo que el alumnado gana se convierte en algo que le importa. La montas tú, artículo a artículo, y decides los precios.

## Dos tipos de artículo

**Recompensas.** Cosas que se canjean: "saltar una pregunta del examen", "elegir la música de la sesión", "un día sin deberes". Al canjearla, quien la compra gasta las monedas y a ti te queda constancia en el historial para cumplir tu parte.

Una recompensa puede ser **de un solo uso** —se canjea una vez y desaparece de su lista— o **ilimitada**, que se puede volver a comprar tantas veces como quiera pagar.

**Poderes.** Se compran con monedas pero además **cuestan maná cada vez que se usan**. Sirven para efectos que se repiten: recuperar puntos de vida, una pista, un intento extra. Cada estudiante acumula cargas y las va gastando.

La «pista» de la tienda la das tú a mano cuando alguien la usa. Las [pistas de una misión](/ayuda/misiones/pistas-en-las-misiones) son otra cosa: las escribes en la misión y la plataforma las abre y las cobra sola. Puedes tener las dos.

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

**Recompensas.** Cosas que se canjean: "saltar una pregunta del examen", "elegir la música de la sesión", "un día sin deberes". Al canjearla, quien la compra gasta las monedas y a ti te queda constancia en el historial para cumplir tu parte.

Una recompensa puede ser **de un solo uso** —se canjea una vez y desaparece de su lista— o **ilimitada**, que se puede volver a comprar tantas veces como quiera pagar.

**Poderes.** Se compran con monedas pero además **cuestan maná cada vez que se usan**. Sirven para efectos que se repiten: recuperar puntos de vida, una pista, un intento extra. Cada estudiante acumula cargas y las va gastando.

## Poner precios

No hay tabla correcta, pero sí una regla útil: mira cuántas monedas reparte una misión completa y calcula cuántas misiones quieres que cueste cada cosa. Si una misión da 60 monedas y quieres que la recompensa buena cueste "tres misiones", son 180.

## El historial

Cada compra y cada uso quedan registrados con su fecha. Lo tienes en la pestaña de tienda de la clase, y cada estudiante tiene el suyo. Es lo que evita las discusiones de "yo ya lo había canjeado".

## Si no quieres tienda

Es perfectamente válido. Desactiva las monedas y la tienda en los ajustes de la clase y la pantalla desaparece para todo el mundo.$itakai$;

-- si-eres-alumno/que-son-el-xp-las-monedas-y-el-mana: el XP baja con una pista que se paga con XP; las monedas, también con las pistas.
UPDATE "help_articles" a
SET "body" = $itakai$Las misiones te dan tres cosas y es fácil confundirlas. Se ganan igual, pero no sirven para lo mismo.

## XP: tu progreso

La experiencia mide lo que llevas hecho en la clase. Es lo que te hace subir de nivel y cambiar de rango, y **no se gasta en la tienda**: por mucho que compres, tu XP sigue donde estaba. Solo baja si tu docente te aplica un comportamiento negativo o si usas una [pista de una misión](/ayuda/si-eres-alumno/usar-las-pistas-de-una-mision) que se paga con XP.

## Monedas: para gastar

Las monedas se ganan igual que el XP, pero son dinero. Se gastan en la tienda de tu clase, en lo que haya puesto tu docente: desde una recompensa de un solo uso hasta algo que te quedas para siempre.

Estas sí bajan cuando compras, y cuando usas una pista que se paga con monedas.

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

Las monedas se ganan igual que el XP, pero son dinero. Se gastan en la tienda de tu clase, en lo que haya puesto tu docente: desde una recompensa de un solo uso hasta algo que te quedas para siempre.

Estas sí bajan cuando compras.

## Maná: para los poderes

El maná es para los poderes de la tienda, esas cosas que se usan una vez y luego se recargan. No todo el profesorado lo activa: si en tu clase no aparece, es que esa clase no lo usa.

## Qué usa tu clase

Cada docente elige qué recursos tiene su clase. Puede que en una uses las tres cosas y en otra solo XP. Mira el panel de la clase para ver qué hay en juego.$itakai$;

-- si-eres-alumno/como-entrego-una-mision: las pistas, para cuando te atascas.
UPDATE "help_articles" a
SET "body" = $itakai$Una misión es un trabajo con premio. Cuando la abres ves de qué va, qué tienes que hacer y qué te llevas si la completas.

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

Cuando le das a entregar, la entrega pasa a tu docente y, mientras no la revise, no puedes mandar otra de ese enigma. Repásala antes.

## Después de entregar

Tu docente la revisa y le pone un porcentaje: cuánto has completado. Las recompensas se reparten según ese porcentaje, así que una entrega a medias también da algo. Cuando la revise, te llega un aviso en **Avisos** con el porcentaje.

## La fecha

Si la misión tiene fecha de entrega, te llega un aviso cuando falten menos de 24 horas, salvo que hayas apagado los recordatorios en tu perfil. Cuando la fecha pasa, la misión ya no admite entregas: no dejes el último enigma para el último momento.$itakai$;

-- cuando-algo-falla/las-recompensas-no-cuadran: el descuento de las pistas de %.
UPDATE "help_articles" a
SET "body" = $itakai$Casi siempre es que se está mirando el número de la misión y cobrando el del enigma, o al revés.

## Se paga por porcentaje

Al revisar una entrega pones cuánto se ha completado, y las recompensas salen de ahí, redondeadas. Un 60 % no cobra lo mismo que un 100 %. Si quien entregó esperaba la cifra entera, pídele que mire el aviso de la revisión: dice el porcentaje que le pusiste.

## Cada enigma paga lo suyo

Las recompensas se reparten por enigma, no de una vez al final de la misión. Quien ha hecho dos de cuatro pasos ha cobrado dos, aunque la misión siga abierta.

## Las pistas de %

Si alguien usó en la misión una [pista que resta un % de la recompensa](/ayuda/misiones/pistas-en-las-misiones), lo que le quedaba por cobrar le llega con ese descuento, multiplicado con el porcentaje de la revisión. Lo ves bajo su nombre en la ventana de entregas y en la aprobación, en el **Historial**. Lo que ya había cobrado antes de usarla no cambia, y subir después la recompensa del enigma tampoco le devuelve el descuento.

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

Las monedas y el maná de cada entrega no aparecen sueltos en esas listas; el saldo de la clase, sí.$itakai$;
