-- Ayuda de E3, entrega 2: el mapa de misiones, en pruebas. Una guía nueva para
-- el profesorado (qué es, cómo se enciende, qué ve cada cual y lo que no hace) y
-- una fila más en la tabla de las funcionalidades de la clase.
--
-- Como el resto del contenido de serie, el panel de administración manda. El
-- INSERT solo crea lo que no exista y va al final de su categoría; cada UPDATE
-- solo cambia un campo si sigue exactamente con el texto de serie, así que lo que
-- alguien haya editado se queda como está. Siempre por slug de categoría y de
-- artículo, nunca por id.

-- misiones/el-mapa-de-misiones
INSERT INTO "help_articles" ("id", "category_id", "slug", "title", "summary", "cover_image", "body", "locale", "status", "order_index", "featured", "audience", "kind", "published_at", "updated_at")
SELECT gen_random_uuid()::text, c."id", $itakai$el-mapa-de-misiones$itakai$, $itakai$El mapa de misiones (beta)$itakai$, $itakai$Una vista de mapa en Misiones: el camino de la clase, en su orden, con el estado de cada misión. Está en pruebas.$itakai$, $itakai$/app/ayuda/recorrido.svg$itakai$, $itakai$El **mapa de misiones** enseña las misiones de la clase como un camino, en el [orden de la clase](/ayuda/misiones/el-orden-de-las-misiones): la primera arriba y cada una unida con la siguiente. Es una función **en pruebas**, con la etiqueta **Beta**: su aspecto y su funcionamiento se ajustarán con lo que se vea al usarla.

## Encenderlo

En *Ajustes* de la clase, sección **Funcionalidades**, en **En pruebas**, activa **Mapa de misiones**. Va apagado de entrada, y encenderlo o apagarlo pide acceso de administración en la clase. Apagarlo no borra nada: la clase vuelve a verse como antes.

## Qué se ve

En la pestaña **Misiones** aparece una vista más, **Mapa**, junto a la cuadrícula y la lista. En el mapa no hay filtros: sale la clase entera, en su orden.

- **Tu alumnado** ve el mapa de entrada y, en cada misión, cómo la lleva: completada, en curso con su porcentaje, disponible, urgente, expirada o cerrada por su docente. Una misión bloqueada no se abre: al pulsarla, dice por qué.
- **Tú** ves en cada misión su estado en la clase y cuántas personas la han completado. Al pulsarla, se abre.

El estado va siempre con un icono y un texto, nunca solo con un color. En el móvil el camino es una columna; en pantallas más anchas, va en zigzag. Se recorre con el teclado en el mismo orden que el camino.

## Lo que no hace

El mapa sigue el orden de la clase, pero **no abre ni cierra misiones**: cada una se abre o se bloquea como siempre, desde sus ajustes. Para cambiar el camino, cambia el orden con **Ordenar**.

Al duplicar la clase con sus funcionalidades, el interruptor llega como estaba. En la ficha pública de una plantilla no sale, y quien la importa lo recibe apagado.$itakai$, 'es', 'publicado'::"HelpArticleStatus", (SELECT COALESCE(MAX(a."order_index"), -1) + 1 FROM "help_articles" a WHERE a."category_id" = c."id"), false, 'profesor'::"HelpAudience", 'guia'::"HelpArticleKind", CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM "help_categories" c WHERE c."slug" = $itakai$misiones$itakai$
ON CONFLICT ("category_id", "slug", "locale") DO NOTHING;

-- clases/elegir-que-recursos-usa-tu-clase: el mapa de misiones en la tabla
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
| **Mapa de misiones** | En pruebas y apagado de entrada: una vista más en *Misiones*, con el camino de la clase. Ver [el mapa de misiones](/ayuda/misiones/el-mapa-de-misiones) |

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
| **Efectos visuales** | Animaciones como el confeti al subir de nivel o al salir alguien en la ruleta |
| **Sonidos** | Efectos de sonido al subir de nivel, completar misiones, girar la ruleta y otros momentos |

Los rangos y los umbrales de experiencia no son un interruptor: se configuran en la sección **Niveles** de *Ajustes*. Las insignias se crean desde **Insignias**, en el menú lateral.

## Efectos, sonido y movimiento

Los efectos visuales y los sonidos son de la clase, pero cada persona puede bajarlos en su dispositivo: la [ruleta](/ayuda/gamificacion/usar-la-ruleta-en-clase) tiene un botón **Sonido** que silencia la app en ese dispositivo, y quien activa **Menos animación** en la accesibilidad, o tiene su dispositivo configurado para reducir el movimiento, no ve confeti ni animaciones.

## Apagar un recurso no borra nada

Si desactivas las monedas, dejan de verse y **dejan de repartirse al revisar entregas**, aunque los enigmas tengan monedas configuradas. Los saldos que ya tuviera tu alumnado se quedan guardados: al volver a activarlas, aparecen otra vez tal cual estaban.

## Dependencias

Algunos ajustes necesitan otro para tener sentido —la tienda sin monedas no vende nada— y la propia pantalla te lo dice cuando ocurre. Y **al menos un recurso tiene que estar activo**: una clase sin ninguno no podría repartir nada al revisar una entrega.

> Empieza corto. Una clase con experiencia y misiones ya funciona el primer día; monedas, tienda y poderes se añaden cuando el grupo ya está rodado.$itakai$;
