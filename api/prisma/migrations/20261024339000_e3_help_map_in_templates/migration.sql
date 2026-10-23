-- Ayuda de E3, retoques: el interruptor del mapa de misiones va con las
-- funcionalidades también al importar una plantilla (decisión 11 del mapa),
-- aunque su ficha no lo enseñe. Ya que se toca la guía de crear una clase desde
-- una plantilla, también que sus misiones llegan con sus pistas (E1).
--
-- Como el resto del contenido de serie, el panel de administración manda. Cada
-- UPDATE solo cambia un campo si sigue exactamente con el texto de serie, así
-- que lo que alguien haya editado se queda como está. Siempre por slug de
-- categoría y de artículo, nunca por id.

-- misiones/el-mapa-de-misiones: el interruptor llega como estaba también al importar una plantilla.
UPDATE "help_articles" a
SET "body" = $itakai$El **mapa de misiones** enseña las misiones de la clase como un camino, en el [orden de la clase](/ayuda/misiones/el-orden-de-las-misiones): la primera arriba y cada una unida con la siguiente. Es una función **en pruebas**, con la etiqueta **Beta**: su aspecto y su funcionamiento se ajustarán con lo que se vea al usarla.

## Encenderlo

En *Ajustes* de la clase, sección **Funcionalidades**, en **En pruebas**, activa **Mapa de misiones**. Va apagado de entrada, y encenderlo o apagarlo pide acceso de administración en la clase. Apagarlo no borra nada: la clase vuelve a verse como antes.

## Qué se ve

En la pestaña **Misiones** aparece una vista más, **Mapa**, junto a la cuadrícula y la lista. En el mapa no hay filtros: sale la clase entera, en su orden.

- **Tu alumnado** ve el mapa de entrada y, en cada misión, cómo la lleva: completada, en curso con su porcentaje, disponible, urgente, expirada o cerrada por su docente. Una misión bloqueada no se abre: al pulsarla, dice por qué.
- **Tú** ves en cada misión su estado en la clase y cuántas personas la han completado. Al pulsarla, se abre.

El estado va siempre con un icono y un texto, nunca solo con un color. En el móvil el camino es una columna; en pantallas más anchas, va en zigzag. Se recorre con el teclado en el mismo orden que el camino.

## Lo que no hace

El mapa sigue el orden de la clase, pero **no abre ni cierra misiones**: cada una se abre o se bloquea como siempre, desde sus ajustes. Para cambiar el camino, cambia el orden con **Ordenar**.

Al duplicar la clase con sus funcionalidades o al importarla como plantilla, el interruptor llega como estaba, con el resto de funcionalidades. La ficha pública de una plantilla no lo enseña, por estar en pruebas.$itakai$, "updated_at" = CURRENT_TIMESTAMP
FROM "help_categories" c
WHERE c."id" = a."category_id" AND c."slug" = $itakai$misiones$itakai$ AND a."locale" = 'es'
  AND a."slug" = $itakai$el-mapa-de-misiones$itakai$
  AND a."body" = $itakai$El **mapa de misiones** enseña las misiones de la clase como un camino, en el [orden de la clase](/ayuda/misiones/el-orden-de-las-misiones): la primera arriba y cada una unida con la siguiente. Es una función **en pruebas**, con la etiqueta **Beta**: su aspecto y su funcionamiento se ajustarán con lo que se vea al usarla.

## Encenderlo

En *Ajustes* de la clase, sección **Funcionalidades**, en **En pruebas**, activa **Mapa de misiones**. Va apagado de entrada, y encenderlo o apagarlo pide acceso de administración en la clase. Apagarlo no borra nada: la clase vuelve a verse como antes.

## Qué se ve

En la pestaña **Misiones** aparece una vista más, **Mapa**, junto a la cuadrícula y la lista. En el mapa no hay filtros: sale la clase entera, en su orden.

- **Tu alumnado** ve el mapa de entrada y, en cada misión, cómo la lleva: completada, en curso con su porcentaje, disponible, urgente, expirada o cerrada por su docente. Una misión bloqueada no se abre: al pulsarla, dice por qué.
- **Tú** ves en cada misión su estado en la clase y cuántas personas la han completado. Al pulsarla, se abre.

El estado va siempre con un icono y un texto, nunca solo con un color. En el móvil el camino es una columna; en pantallas más anchas, va en zigzag. Se recorre con el teclado en el mismo orden que el camino.

## Lo que no hace

El mapa sigue el orden de la clase, pero **no abre ni cierra misiones**: cada una se abre o se bloquea como siempre, desde sus ajustes. Para cambiar el camino, cambia el orden con **Ordenar**.

Al duplicar la clase con sus funcionalidades, el interruptor llega como estaba. En la ficha pública de una plantilla no sale, y quien la importa lo recibe apagado.$itakai$;

-- clases/crear-una-clase-desde-cero-o-desde-una-plantilla: el mapa de misiones va con los recursos, y las misiones llegan con sus pistas.
UPDATE "help_articles" a
SET "body" = $itakai$Además de crear una clase en blanco, puedes partir de una **plantilla**: una clase que alguien del profesorado ha publicado para que cualquiera la reutilice.

## Dónde están

En **Mis Clases**, el botón **Plantillas** abre el catálogo con todo lo publicado. Puedes buscar, filtrar por nivel, asignatura, idioma y provincia, y abrir una vista previa con **Previsualizar** antes de decidir. Las mismas plantillas están en el [catálogo público](/ayuda/clases/el-catalogo-publico-de-plantillas), que se abre sin cuenta y sirve para pasarle a alguien el enlace de una.

## Qué te traes al importar

Al importar una plantilla se crea una clase nueva con:

- La **narrativa** y la imagen de portada.
- Los **recursos activos** —qué usa esa clase y qué no— y sus niveles. También el [mapa de misiones](/ayuda/misiones/el-mapa-de-misiones), si lo tenía encendido, aunque la ficha no lo enseñe.
- La **tienda**: recompensas y poderes con sus precios.
- Los **comportamientos** configurados.

## Las misiones, si quieres

Si la plantilla tiene misiones, al importarla aparece la casilla para importar también sus misiones, con cuántas son, marcada de entrada. Por eso, en una plantilla con misiones, **Importar** abre primero la vista previa: en su pestaña **Misiones** ves cada una con su rareza, sus enigmas y sus recompensas, y decides si te las llevas.

Llegan con sus enigmas enteros, con sus [pistas](/ayuda/misiones/pistas-en-las-misiones) y con el estado que tenían en la plantilla, activas o bloqueadas. No traen fecha límite, ni documentos, ni insignias: si los necesitas, se los añades tú.

> **Revisa las que lleguen activas.** Tu alumnado podrá entregarlas en cuanto entre en la clase. Si quieres repasarlas antes, bloquéalas hasta que estén a tu gusto.

Si desmarcas la casilla, la clase llega sin misiones y el contenido lo pones tú. Más adelante también puedes traerte una misión concreta de otra de tus clases: lo explica [importar una misión de otra clase](/ayuda/misiones/importar-una-mision-de-otra-clase).

## Qué no

Nunca viene la **guía de clase**, ni nada del alumnado ni del profesorado de la clase original: ni personas, ni progreso, ni saldos. Una plantilla es una clase vacía de gente.

## Después de importar

La clase importada es tuya —tienes su propiedad— y se edita como cualquier otra. Se llama como la plantilla, con «(copia)» detrás. Cambia lo que no encaje —precios, nombres, la propia narrativa, las misiones— antes de dar el código a tu alumnado.$itakai$, "updated_at" = CURRENT_TIMESTAMP
FROM "help_categories" c
WHERE c."id" = a."category_id" AND c."slug" = $itakai$clases$itakai$ AND a."locale" = 'es'
  AND a."slug" = $itakai$crear-una-clase-desde-cero-o-desde-una-plantilla$itakai$
  AND a."body" = $itakai$Además de crear una clase en blanco, puedes partir de una **plantilla**: una clase que alguien del profesorado ha publicado para que cualquiera la reutilice.

## Dónde están

En **Mis Clases**, el botón **Plantillas** abre el catálogo con todo lo publicado. Puedes buscar, filtrar por nivel, asignatura, idioma y provincia, y abrir una vista previa con **Previsualizar** antes de decidir. Las mismas plantillas están en el [catálogo público](/ayuda/clases/el-catalogo-publico-de-plantillas), que se abre sin cuenta y sirve para pasarle a alguien el enlace de una.

## Qué te traes al importar

Al importar una plantilla se crea una clase nueva con:

- La **narrativa** y la imagen de portada.
- Los **recursos activos** —qué usa esa clase y qué no— y sus niveles.
- La **tienda**: recompensas y poderes con sus precios.
- Los **comportamientos** configurados.

## Las misiones, si quieres

Si la plantilla tiene misiones, al importarla aparece la casilla para importar también sus misiones, con cuántas son, marcada de entrada. Por eso, en una plantilla con misiones, **Importar** abre primero la vista previa: en su pestaña **Misiones** ves cada una con su rareza, sus enigmas y sus recompensas, y decides si te las llevas.

Llegan con sus enigmas enteros y con el estado que tenían en la plantilla, activas o bloqueadas. No traen fecha límite, ni documentos, ni insignias: si los necesitas, se los añades tú.

> **Revisa las que lleguen activas.** Tu alumnado podrá entregarlas en cuanto entre en la clase. Si quieres repasarlas antes, bloquéalas hasta que estén a tu gusto.

Si desmarcas la casilla, la clase llega sin misiones y el contenido lo pones tú. Más adelante también puedes traerte una misión concreta de otra de tus clases: lo explica [importar una misión de otra clase](/ayuda/misiones/importar-una-mision-de-otra-clase).

## Qué no

Nunca viene la **guía de clase**, ni nada del alumnado ni del profesorado de la clase original: ni personas, ni progreso, ni saldos. Una plantilla es una clase vacía de gente.

## Después de importar

La clase importada es tuya —tienes su propiedad— y se edita como cualquier otra. Se llama como la plantilla, con «(copia)» detrás. Cambia lo que no encaje —precios, nombres, la propia narrativa, las misiones— antes de dar el código a tu alumnado.$itakai$;
