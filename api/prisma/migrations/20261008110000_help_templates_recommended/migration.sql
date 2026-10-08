-- Ayuda de las plantillas recomendadas y de usar una plantilla sin tener cuenta
-- todavía (bloque 3, E11 y E12). Sin artículos nuevos: el catálogo público y
-- publicar tu clase como plantilla cuentan qué es una recomendada, el botón
-- «Usar esta plantilla» sin sesión, el aviso al elegir el perfil de estudiante
-- y «Copiar enlace» junto al interruptor de publicar y en las tarjetas.
--
-- Como el resto del contenido de serie, el panel de administración manda: cada
-- UPDATE solo cambia un campo si sigue exactamente con el texto de serie, así que
-- lo que alguien haya editado se queda como está. Siempre por slug de categoría y
-- de artículo, nunca por id.

-- clases/el-catalogo-publico-de-plantillas: las recomendadas, «Usar esta plantilla» sin cuenta y el enlace en las tarjetas.
UPDATE "help_articles" a
SET "summary" = $itakai$Las plantillas a la vista sin cuenta: las recomendadas, buscar y filtrar, compartir el enlace de una e importarla.$itakai$, "updated_at" = CURRENT_TIMESTAMP
FROM "help_categories" c
WHERE c."id" = a."category_id" AND c."slug" = $itakai$clases$itakai$ AND a."locale" = 'es'
  AND a."slug" = $itakai$el-catalogo-publico-de-plantillas$itakai$
  AND a."summary" = $itakai$Las plantillas a la vista sin cuenta: buscar y filtrar, compartir el enlace de una e importarla.$itakai$;

UPDATE "help_articles" a
SET "body" = $itakai$**Las plantillas publicadas se pueden ver sin tener cuenta.** El [catálogo público de plantillas](/plantillas) está en la página **Plantillas** de la web, enlazada desde la cabecera y el pie de la portada. Sirve para curiosear antes de registrarse y para pasarle a quien quieras el enlace de una plantilla concreta.

## Buscar y filtrar

Arriba tienes el buscador, que busca por el nombre, y el botón **Filtros**, con cuatro filtros: **nivel**, **asignatura**, **idioma** y **provincia**. En cada uno puedes marcar varios valores, y vale cualquiera de ellos. La asignatura se desbloquea al elegir un nivel, porque cada nivel tiene las suyas.

De entrada salen primero las **recomendadas** (más abajo, qué son). También puedes ordenar por las más recientes o por nombre, y la **X** de **Limpiar filtros** lo deja todo como al entrar. Los resultados van por páginas.

> **Ojo con la provincia.** Es el único dato que no se pide al publicar, así que no todas la tienen. Una plantilla sin provincia no sale cuando filtras por provincia, aunque encaje en todo lo demás: si buscas algo que sirve en cualquier sitio, prueba también sin ese filtro.

## Las recomendadas

La administración de la plataforma puede marcar algunas plantillas como **Recomendadas**, para que quien llega encuentre enseguida las que merecen la pena. Llevan la etiqueta **Recomendada**, con una estrella, en su tarjeta y en su ficha, y salen las primeras: aquí y en **Mis Clases → Plantillas**. Si quien la publicó la retira, pierde la recomendación.

## La ficha de una plantilla

**Ver plantilla** abre su ficha: el nombre, la portada, sus datos y, en pestañas, lo que trae.

- **Historia**: la narrativa entera.
- **Funcionalidades**: qué recursos tiene encendidos y cuáles no.
- **Misiones**: de cada una, el título, la rareza, cuántos enigmas tiene y sus recompensas. Los enunciados de los enigmas no se ven hasta importarla.
- **Tienda**: cada objeto con su precio, qué hace y si está oculto al alumnado.
- **Comportamientos**: si son positivos o negativos y qué efecto tienen.

Al lado tienes un resumen con cuántas misiones, objetos de tienda y comportamientos trae. No sale nada de quien la publicó.

## Compartir una plantilla

Cada plantilla tiene su propia dirección. **Copiar enlace**, en la cabecera de la ficha, la copia para pegarla en un correo o en un mensaje; en las tarjetas del catálogo, lo mismo hace el botón con el icono de una cadena. Quien la abra ve la misma ficha, tenga cuenta o no.

## Importarla

Importar es cosa del profesorado:

- **Sin haber entrado**, pulsa **Usar esta plantilla**: te lleva a entrar. Si aún no tienes cuenta, desde ahí puedes crearla; al elegir el perfil, elige **Docente**. Al terminar vuelves a la ficha con todo listo para importarla, pero no se importa nada hasta que pulses **Importar**. Ese navegador se acuerda de la plantilla durante un día.
- **Con tu cuenta de docente**, en **Usar esta plantilla** tienes el botón **Importar**. Si trae misiones, encima está la casilla para importar también sus misiones, con cuántas son, marcada de entrada. Al importarla, la plataforma te lleva a tu clase nueva.
- **Con una cuenta de estudiante**, la ficha se ve igual, pero no se puede importar. Si al crear la cuenta desde **Usar esta plantilla** eliges el perfil **Estudiante**, la plataforma te avisa antes de que con esa cuenta no podrás usarla.

Qué llega exactamente lo cuenta [crear una clase desde cero o desde una plantilla](/ayuda/clases/crear-una-clase-desde-cero-o-desde-una-plantilla).

## Si se retira

Si quien la publicó la retira o archiva su clase, deja de salir en el catálogo y su enlace avisa de que **ya no está disponible**, con un botón para volver al catálogo. Las clases que ya se importaron de ella no cambian: cada importación es una clase independiente.

Si eres tú quien publica, lo que se ve y cómo retirarla está en [publicar tu clase como plantilla](/ayuda/clases/publicar-tu-clase-como-plantilla).$itakai$, "updated_at" = CURRENT_TIMESTAMP
FROM "help_categories" c
WHERE c."id" = a."category_id" AND c."slug" = $itakai$clases$itakai$ AND a."locale" = 'es'
  AND a."slug" = $itakai$el-catalogo-publico-de-plantillas$itakai$
  AND a."body" = $itakai$**Las plantillas publicadas se pueden ver sin tener cuenta.** El [catálogo público de plantillas](/plantillas) está en la página **Plantillas** de la web, enlazada desde la cabecera y el pie de la portada. Sirve para curiosear antes de registrarse y para pasarle a quien quieras el enlace de una plantilla concreta.

## Buscar y filtrar

Arriba tienes el buscador, que busca por el nombre, y el botón **Filtros**, con cuatro filtros: **nivel**, **asignatura**, **idioma** y **provincia**. En cada uno puedes marcar varios valores, y vale cualquiera de ellos. La asignatura se desbloquea al elegir un nivel, porque cada nivel tiene las suyas.

Puedes ordenar por las más recientes o por nombre, y la **X** de **Limpiar filtros** lo deja todo como al entrar. Los resultados van por páginas.

> **Ojo con la provincia.** Es el único dato que no se pide al publicar, así que no todas la tienen. Una plantilla sin provincia no sale cuando filtras por provincia, aunque encaje en todo lo demás: si buscas algo que sirve en cualquier sitio, prueba también sin ese filtro.

## La ficha de una plantilla

**Ver plantilla** abre su ficha: el nombre, la portada, sus datos y, en pestañas, lo que trae.

- **Historia**: la narrativa entera.
- **Funcionalidades**: qué recursos tiene encendidos y cuáles no.
- **Misiones**: de cada una, el título, la rareza, cuántos enigmas tiene y sus recompensas. Los enunciados de los enigmas no se ven hasta importarla.
- **Tienda**: cada objeto con su precio, qué hace y si está oculto al alumnado.
- **Comportamientos**: si son positivos o negativos y qué efecto tienen.

Al lado tienes un resumen con cuántas misiones, objetos de tienda y comportamientos trae. No sale nada de quien la publicó.

## Compartir una plantilla

Cada plantilla tiene su propia dirección. **Copiar enlace**, en la cabecera de la ficha, la copia para pegarla en un correo o en un mensaje. Quien la abra ve la misma ficha, tenga cuenta o no.

## Importarla

Importar es cosa del profesorado:

- **Sin haber entrado**, la ficha lo dice y ofrece **Entrar**. Entra con tu cuenta de docente y vuelve a abrir el enlace, o busca la plantilla en **Mis Clases → Plantillas**, donde está el mismo catálogo.
- **Con tu cuenta de docente**, en **Usar esta plantilla** tienes el botón **Importar**. Si trae misiones, encima está la casilla para importar también sus misiones, con cuántas son, marcada de entrada. Al importarla, la plataforma te lleva a tu clase nueva.
- **Con una cuenta de estudiante**, la ficha se ve igual, pero no se puede importar.

Qué llega exactamente lo cuenta [crear una clase desde cero o desde una plantilla](/ayuda/clases/crear-una-clase-desde-cero-o-desde-una-plantilla).

## Si se retira

Si quien la publicó la retira o archiva su clase, deja de salir en el catálogo y su enlace avisa de que **ya no está disponible**, con un botón para volver al catálogo. Las clases que ya se importaron de ella no cambian: cada importación es una clase independiente.

Si eres tú quien publica, lo que se ve y cómo retirarla está en [publicar tu clase como plantilla](/ayuda/clases/publicar-tu-clase-como-plantilla).$itakai$;

-- clases/publicar-tu-clase-como-plantilla: «Copiar enlace» junto al interruptor, qué es una recomendada y que retirarla se la quita.
UPDATE "help_articles" a
SET "body" = $itakai$Si has montado una clase que funciona, puedes publicarla como **plantilla** para que el resto del profesorado parta de ella. Se hace en los **Ajustes** de la clase, sección **Gestión**, con el interruptor **Publicar como plantilla**. Solo lo ve quien tiene la propiedad de la clase, y antes hay que guardar la asignatura, el nivel educativo y el idioma en **Datos generales**. La provincia es opcional, pero una plantilla sin provincia no sale cuando alguien filtra por provincia.


![El recorrido de una plantilla: publicas tu clase, aparece en el catálogo y alguien del profesorado se lleva una copia.](/app/ayuda/diagramas/flujo-plantillas.svg)
## Dónde se ve

Tu plantilla aparece en el [catálogo público de plantillas](/ayuda/clases/el-catalogo-publico-de-plantillas), que se abre **sin cuenta**: cualquiera puede ver su ficha y compartir su enlace. El profesorado de la plataforma la tiene también en **Mis Clases → Plantillas**.

Mientras está publicada, junto al interruptor tienes **Copiar enlace**: copia la dirección de su ficha para pasársela a quien quieras, tenga cuenta o no.

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

Quien la importa se lleva el marco de la clase: la narrativa y la portada, los recursos activos y los niveles, la tienda y los comportamientos. Si tu plantilla tiene misiones, puede llevárselas también, con sus enigmas enteros y el estado de cada una, activa o bloqueada. Llegan sin fecha límite, sin documentos y sin insignias: las fechas son de tu calendario, y los documentos y las insignias se quedan en tu clase.

La guía de clase no se copia nunca.

## Qué se queda fuera

**Todo lo que tenga que ver con personas.** No se comparte el alumnado, ni sus entregas, saldos o estadísticas, ni el resto del profesorado de la clase. Quien importe tu plantilla recibe una clase vacía.

## Antes de publicar

Lo que publicas lo puede leer cualquiera, así que merece la pena repasar tres cosas:

1. **La narrativa**, por si menciona a tu grupo concreto, a tu centro o a un curso específico.
2. **Las misiones y sus enigmas.** Los títulos se ven en abierto, y quien importe la plantilla se lleva los enunciados enteros: que no lleven nombres de estudiantes, datos de tu centro ni instrucciones que solo entienda tu grupo.
3. **Los nombres de la tienda y los comportamientos**, por si hay bromas internas que fuera de contexto no se entienden.

## Despublicar

Puedes retirar tu plantilla del catálogo cuando quieras, con el mismo interruptor. Una clase archivada también deja de estar en el catálogo, y una que envías a la papelera se retira. Quien abra después su enlace verá que ya no está disponible. Al retirarla pierde también la recomendación, si la tenía: si la vuelves a publicar, sale sin ella. Quien ya la haya importado se queda con su copia: importar crea una clase independiente, no un enlace a la tuya.

Si [pasas la propiedad](/ayuda/clases/traspasar-una-clase) de la clase, publicarla o retirarla pasa a ser cosa de quien la reciba.$itakai$, "updated_at" = CURRENT_TIMESTAMP
FROM "help_categories" c
WHERE c."id" = a."category_id" AND c."slug" = $itakai$clases$itakai$ AND a."locale" = 'es'
  AND a."slug" = $itakai$publicar-tu-clase-como-plantilla$itakai$
  AND a."body" = $itakai$Si has montado una clase que funciona, puedes publicarla como **plantilla** para que el resto del profesorado parta de ella. Se hace en los **Ajustes** de la clase, sección **Gestión**, con el interruptor **Publicar como plantilla**. Solo lo ve quien tiene la propiedad de la clase, y antes hay que guardar la asignatura, el nivel educativo y el idioma en **Datos generales**. La provincia es opcional, pero una plantilla sin provincia no sale cuando alguien filtra por provincia.


![El recorrido de una plantilla: publicas tu clase, aparece en el catálogo y alguien del profesorado se lleva una copia.](/app/ayuda/diagramas/flujo-plantillas.svg)
## Dónde se ve

Tu plantilla aparece en el [catálogo público de plantillas](/ayuda/clases/el-catalogo-publico-de-plantillas), que se abre **sin cuenta**: cualquiera puede ver su ficha y compartir su enlace. El profesorado de la plataforma la tiene también en **Mis Clases → Plantillas**.

Su ficha enseña:

- el nombre, la portada, los datos de la clase y la **historia** entera;
- las **funcionalidades** que tiene encendidas;
- las **misiones**: de cada una, el título, la rareza, cuántos enigmas tiene y sus recompensas;
- la **tienda**: cada objeto con su precio, qué hace y si está oculto al alumnado;
- los **comportamientos**: si son positivos o negativos y sus efectos.

En el catálogo público no sale nada de quien la publica. Dentro de la plataforma, el profesorado sí ve tu nombre en la tarjeta de la plantilla.

## Qué se copia

Quien la importa se lleva el marco de la clase: la narrativa y la portada, los recursos activos y los niveles, la tienda y los comportamientos. Si tu plantilla tiene misiones, puede llevárselas también, con sus enigmas enteros y el estado de cada una, activa o bloqueada. Llegan sin fecha límite, sin documentos y sin insignias: las fechas son de tu calendario, y los documentos y las insignias se quedan en tu clase.

La guía de clase no se copia nunca.

## Qué se queda fuera

**Todo lo que tenga que ver con personas.** No se comparte el alumnado, ni sus entregas, saldos o estadísticas, ni el resto del profesorado de la clase. Quien importe tu plantilla recibe una clase vacía.

## Antes de publicar

Lo que publicas lo puede leer cualquiera, así que merece la pena repasar tres cosas:

1. **La narrativa**, por si menciona a tu grupo concreto, a tu centro o a un curso específico.
2. **Las misiones y sus enigmas.** Los títulos se ven en abierto, y quien importe la plantilla se lleva los enunciados enteros: que no lleven nombres de estudiantes, datos de tu centro ni instrucciones que solo entienda tu grupo.
3. **Los nombres de la tienda y los comportamientos**, por si hay bromas internas que fuera de contexto no se entienden.

## Despublicar

Puedes retirar tu plantilla del catálogo cuando quieras, con el mismo interruptor. Una clase archivada también deja de estar en el catálogo. Quien abra después su enlace verá que ya no está disponible. Quien ya la haya importado se queda con su copia: importar crea una clase independiente, no un enlace a la tuya.

Si [pasas la propiedad](/ayuda/clases/traspasar-una-clase) de la clase, publicarla o retirarla pasa a ser cosa de quien la reciba.$itakai$;
