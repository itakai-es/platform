-- Ayuda del bloque 6 (F1, entrega 9): la analítica, el ranking configurable y
-- lo que ve el alumnado de sí mismo. Cuatro guías nuevas: «La analítica de la
-- clase» y «Tipos de ranking y quién los ve», para el profesorado, y «Mi progreso y
-- mis resultados» y «Comparar con tu clase», para el alumnado. Se reescriben las que
-- prometían lo que no hay («Clasificación y progreso» contaba entregas y
-- comportamientos en la ficha) y la del ranking del alumnado, y se corrigen las que
-- el bloque ha dejado viejas: el ranking ya no pide XP y los equipos son un tipo de
-- ranking; la ficha es un índice de clases y lo de cada estudiante está en su página
-- de la clase; la actividad ya no lleva la XP; los opcionales no cuentan en el
-- progreso; «Bloqueada» en vez de «cerrada» delante del alumnado; «Mis insignias»
-- separa las de ITAKAI; y «Editar» y «Ver entregas» están a la vista en cada enigma.
--
-- Como el resto del contenido de serie, el panel de administración manda. Cada
-- INSERT solo crea lo que no exista y va al final de su categoría; cada UPDATE solo
-- cambia un campo si sigue exactamente con el texto de serie, así que lo que alguien
-- haya editado se queda como está. Siempre por slug de categoría y de artículo,
-- nunca por id.

-- alumnado/la-analitica-de-la-clase
INSERT INTO "help_articles" ("id", "category_id", "slug", "title", "summary", "cover_image", "body", "locale", "status", "order_index", "featured", "audience", "kind", "published_at", "updated_at")
SELECT gen_random_uuid()::text, c."id", $itakai$la-analitica-de-la-clase$itakai$, $itakai$La analítica de la clase$itakai$, $itakai$Cómo va la clase y dónde se atasca: las cifras del Resumen, el periodo, las misiones, las dificultades detectadas y la página de cada estudiante.$itakai$, $itakai$/app/ayuda/entregas.svg$itakai$, $itakai$Al entrar en una clase, el **Resumen** te enseña cómo va y dónde se atasca. Lo ve todo el profesorado de la clase, también con acceso de **lectura**, el perfil de **Prácticas** incluido. Con la clase archivada se sigue viendo; en la papelera, no.

## Las cifras

En **Estadísticas de la clase**, cada cifra dice qué cuenta:

- **Misiones de media**: por ejemplo, **2,8 de 7**. Completar una misión es tener aprobados todos sus enigmas obligatorios. Las que has bloqueado a mano y las que no tienen enigmas no cuentan, porque nadie las puede hacer: por eso puede salir «de 7» aunque la clase tenga 8.
- **Progreso medio**: el % de enigmas obligatorios aprobados en esas misiones. Los opcionales van aparte.
- **Entregas por revisar**, con el enlace **Ir a Misiones**.
- **Asistencia media**, si la clase [pasa lista](/ayuda/alumnado/pasar-lista-y-consultar-la-asistencia).
- **XP media**, si la clase usa XP. Es el saldo, nunca «sobre un máximo»: la XP también llega por comportamientos y recompensas.

Las cuentas que aún no han entrado por primera vez no cuentan en las medias, y tu vista previa como estudiante no cuenta en nada.

## El periodo

Eliges **Este curso** (desde el 1 de septiembre), **Últimos 30 días** o **Últimos 7 días**. El periodo cambia la asistencia, las dificultades, la actividad por semana, las pistas y la media de aprobación. Lo que lleva **Hoy** es la foto de ahora, y no depende del periodo.

## Las misiones

Cada misión lleva una barra con cuántas personas hay en cada estado: **Completada**, **Por revisar** (tiene una entrega esperando), **En curso** (ha entregado algo, tiene un enigma aprobado o ha usado una pista), **Sin empezar**, **Expirada** (pasó la fecha sin completarla) y **Cerrada por el camino** (el [camino del mapa](/ayuda/misiones/montar-el-camino-del-mapa) aún no se la ha abierto). Junto al título salen los avatares de quien la ha completado. Las bloqueadas y las que no tienen enigmas no llevan barra: lo dicen en texto.

**Ver como tabla** enseña lo mismo en una tabla, con la media de aprobación y las pistas, sin depender del color y lista para el lector de pantalla.

## Dificultades detectadas

Aquí salen los avisos del periodo, cada uno con su motivo y un enlace a la persona o a la misión. De un estudiante sale un aviso si:

- una misión le venció sin completarla (no, si entró en la clase después, si el camino nunca se la abrió o si espera tu revisión);
- le aprobaste un enigma con menos de un 50 %, o su media de aprobación no llega al 60 %, con al menos 2 enigmas;
- usó 2 o más pistas en una misión, o una que resta un % de la recompensa;
- lleva 14 días o más sin actividad, con misiones que puede hacer (esto se cuenta siempre hasta hoy);
- su asistencia no llega al 80 %, con al menos 3 sesiones con lista en el periodo.

Y de una misión, si tras la fecha el 30 % o más de quien la empezó no la completó, si su media de aprobación no llega al 60 %, con al menos 3 enigmas aprobados, o si lleva 2 o más pistas de media por estudiante que la empezó.

Los umbrales son iguales para todas las clases. **No son notas ni una puntuación**: son avisos para que mires a tiempo, y no deciden nada. Solo los ve el profesorado. Las entregas sin revisar no son una dificultad de nadie: van en su cifra, arriba.

## Estudiantes y actividad

**Estudiantes** es la tabla de la clase, con buscador: misiones, última actividad, entregas por revisar, pistas, asistencia y señales, para ordenarla por cualquiera de ellas. **Actividad por semana** cuenta, de lunes a domingo, las entregas, las aprobaciones, las pistas y las misiones completadas.

## La página de cada estudiante

Pulsa su nombre en la tabla, en un aviso o en la pestaña **Alumnado** para abrir su página en la clase:

- **Sus cifras**: misiones completadas, XP, entregas por revisar y pistas usadas, cada una con la **Media de la clase**.
- **Misiones**, con su estado, en **Todas**, **Pendientes** o **Hechas**. **% por enigma** dice con qué porcentaje se aprobó cada enigma y cuándo.
- Sus dificultades, con el detalle completo.
- **Historial**: lo que ha pasado en la clase, con quién lo hizo, y su asistencia, con filtro por tipo y **Cargar más**.

**Ver todas sus clases** lleva a su ficha, que es el índice de sus clases.

## No es para proyectar

El panel lleva nombres reales: es para ti, no para la pizarra. Para enseñar la clase en el proyector, usa **Ver como estudiante**, que la enseña como la ve tu alumnado.$itakai$, 'es', 'publicado'::"HelpArticleStatus", (SELECT COALESCE(MAX(a."order_index"), -1) + 1 FROM "help_articles" a WHERE a."category_id" = c."id"), false, 'profesor'::"HelpAudience", 'guia'::"HelpArticleKind", CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM "help_categories" c WHERE c."slug" = $itakai$alumnado$itakai$
ON CONFLICT ("category_id", "slug", "locale") DO NOTHING;

-- gamificacion/tipos-de-ranking-y-quien-los-ve
INSERT INTO "help_articles" ("id", "category_id", "slug", "title", "summary", "cover_image", "body", "locale", "status", "order_index", "featured", "audience", "kind", "published_at", "updated_at")
SELECT gen_random_uuid()::text, c."id", $itakai$tipos-de-ranking-y-quien-los-ve$itakai$, $itakai$Tipos de ranking y quién los ve$itakai$, $itakai$Qué ve tu alumnado del ranking, por qué se ordena (XP, misiones o equipos), los periodos y la temporada, y la comparación con la media.$itakai$, $itakai$/app/ayuda/clasificacion.svg$itakai$, $itakai$El ranking de cada clase se configura en *Ajustes*, sección **Funcionalidades**. Cambiarlo pide acceso de administración en la clase, y cada opción se guarda en cuanto la cambias.

## Encendido o apagado

El interruptor **Ranking** decide si tu alumnado lo ve. Apagado, solo lo ve el profesorado. Tú lo tienes siempre, completo y con todos los tipos que la clase puede usar, encendidos o no, en la pestaña **Alumnado**, vista **Ranking**, con un aviso de lo que ve tu alumnado; por ejemplo, **Tu alumnado ve: los 5 primeros puestos y el suyo.**

Con el interruptor encendido aparecen debajo las **Opciones del ranking**.

## Qué ve el alumnado

En **Qué ve el alumnado** eliges una de tres:

- **La clasificación completa**: cada estudiante ve a toda la clase, con alias, nivel, XP y misiones.
- **Los N primeros puestos y el suyo**: el podio y la lista hasta ese puesto, con quien empate en él, y su propio puesto aparte. En **Cuántos puestos se ven** eliges 3, 5 o 10.
- **Solo su puesto**: por ejemplo, **Puesto 4 de 8**, sin podio ni lista.

Con menores te sugerimos **Los 5 primeros puestos y el suyo (sugerencia)**: quien va arriba tiene su podio y quien va abajo no queda a la vista de toda la clase. Es una sugerencia, no una regla: las clases empiezan con **La clasificación completa**, como siempre.

Lo que tu alumnado no tiene que ver no se esconde en la pantalla: **no llega a su navegador**. Con **Solo su puesto**, a cada estudiante solo le llega lo suyo. Y nunca viaja el nombre real: solo el alias y el avatar de cada clase.

## Tipos de ranking

En **Tipos de ranking** enciendes uno o varios. Si hay más de uno, tu alumnado cambia de uno a otro con pestañas.

| Tipo | Ordena por | Qué pide |
|---|---|---|
| **XP** | La XP acumulada en la clase | Que la clase use la experiencia (XP) |
| **Misiones completadas** | Las misiones completadas; en los empates, la XP, si tu alumnado ve también el ranking de **XP** | Nada |
| **Equipos** | Los puntos del marcador de cada equipo | Una agrupación de base en **Alumnado → Equipos** |

De entrada van encendidos **XP** y **Equipos**, y hace falta al menos un tipo. Si apagas la XP de la clase y solo tenías **XP**, el ranking se apaga. En **Equipos** se ven todos los equipos en cualquier modo; lo cuenta [premiar a un equipo](/ayuda/gamificacion/premiar-a-un-equipo-y-ver-la-clasificacion).

Quien empata comparte puesto, y el siguiente salta: 1, 2, 2, 4. En **Misiones completadas**, la XP solo desempata si tu alumnado ve también el ranking de **XP**: si no, se adivinaría quién tiene más XP, que esa clase no enseña. Quien aún no tiene nada no tiene puesto y va al final. Las cuentas que aún no han entrado por primera vez y tu vista previa como estudiante no salen.

## Periodos y temporada

**XP** solo tiene **Siempre**. **Misiones completadas** y **Equipos** tienen además **Esta semana**, desde el lunes, y **Temporada**, si has empezado una. Los periodos le dan una oportunidad a quien llegó tarde o va abajo: cada semana se empieza de cero.

Con **Misiones completadas** o **Equipos** encendidos, **Empezar temporada** hace que en **Temporada** cuenten desde ese momento. No borra nada y la XP no cambia. No se puede deshacer, pero **Empezar otra temporada** sustituye a la anterior. Cada temporada queda en el [historial de la clase](/ayuda/clases/el-historial-de-la-clase).

## Comparar con la media

Junto al interruptor del ranking está **Comparar con la media**, con su propio interruptor: cada estudiante ve si va por encima, en la media o por debajo del resto de su clase, sin ver a nadie. Funciona aunque apagues el ranking, para quien no quiere competición pero sí que cada cual sepa cómo va. Si nunca lo has tocado, está como el ranking de esa clase.

Tu alumnado lo ve en **Tú y tu clase**, en el **Resumen** de la clase y, con el ranking encendido, también en él, con las mismas cifras. Es lo único de la clase que ve allí: las medias de la clase son para ti. Va redondeado, en palabras, y solo con al menos seis personas en la clase: lo cuenta [comparar con tu clase](/ayuda/si-eres-alumno/comparar-con-tu-clase).

## Al copiar la clase

Al duplicar la clase con sus funcionalidades, o al importarla como plantilla, las opciones del ranking van con ella. La temporada no: es de cada clase.$itakai$, 'es', 'publicado'::"HelpArticleStatus", (SELECT COALESCE(MAX(a."order_index"), -1) + 1 FROM "help_articles" a WHERE a."category_id" = c."id"), false, 'profesor'::"HelpAudience", 'guia'::"HelpArticleKind", CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM "help_categories" c WHERE c."slug" = $itakai$gamificacion$itakai$
ON CONFLICT ("category_id", "slug", "locale") DO NOTHING;

-- si-eres-alumno/mi-progreso-y-mis-resultados
INSERT INTO "help_articles" ("id", "category_id", "slug", "title", "summary", "cover_image", "body", "locale", "status", "order_index", "featured", "audience", "kind", "published_at", "updated_at")
SELECT gen_random_uuid()::text, c."id", $itakai$mi-progreso-y-mis-resultados$itakai$, $itakai$Mi progreso y mis resultados$itakai$, $itakai$Qué significa cada cifra del Resumen de tu clase, cómo leer «Mis resultados» y el % de cada enigma.$itakai$, $itakai$/app/ayuda/vista-alumno.svg$itakai$, $itakai$En cada clase, en la pestaña **Resumen**, tienes cómo vas: arriba, **Mi progreso**, y más abajo, **Mis resultados**, misión a misión. Esto solo lo ves tú y el profesorado de tu clase.

## Mi progreso

- **Misiones completadas**: por ejemplo, **3 de 7**. Una misión está completada cuando tu docente te ha aprobado todos sus enigmas obligatorios. Solo cuentan las que puedes hacer: si tu docente ha bloqueado una misión o aún no tiene enigmas, no entra en la cuenta. Si hay enigmas opcionales, debajo pone **Extra** con los que llevas.
- **XP total**: tu experiencia en esta clase, si tu clase la usa. Es todo lo que has ganado, también con comportamientos y recompensas.
- **Insignias obtenidas**: cuántas tienes de las que dan las misiones de esta clase, con su imagen.

Tus vidas, tus monedas y tu maná están arriba, en la cabecera de la clase. Y en **Inicio** y en **Mis clases**, cada clase te dice cuántas misiones llevas, por ejemplo **4 de 8 misiones**.

Si tu docente lo ha encendido, debajo sale también **Tú y tu clase**: lo cuenta [comparar con tu clase](/ayuda/si-eres-alumno/comparar-con-tu-clase).

## Mis resultados

Tus misiones, en dos pestañas: **Pendientes** y **Hechas**. En cada misión ves:

- su estado: **Completada**, **En curso**, **Sin empezar**, **Expirada** (pasó la fecha sin completarla), **1 en revisión** (tienes una entrega esperando a tu docente) o **Bloqueada**;
- la fecha: cuándo la completaste, o cuándo vence o venció;
- cuántos enigmas obligatorios llevas aprobados, las pistas que has usado y lo que has cobrado con sus enigmas.

**Bloqueada** quiere decir que todavía no puedes entrar: se abre al completar otra misión, y debajo te dice cuál. Te lo explica [el mapa de misiones y las misiones bloqueadas](/ayuda/si-eres-alumno/el-mapa-y-las-misiones-cerradas).

Aquí no hay etiquetas de «vas con retraso»: solo lo que hay, como **vence el 8 nov** o **1 en revisión**.

## El % de cada enigma

Pulsa **% de cada enigma** para ver, enigma a enigma, con qué porcentaje te lo aprobó tu docente y cuándo, por ejemplo **80 % · 3 nov**. Si aún no lo ha revisado, pone **En revisión desde el** día que lo entregaste; si no lo has entregado, **Sin entregar**. Los opcionales llevan **(opcional)**.

Ese porcentaje es el que te puso tu docente al revisar tu entrega, y es el que decide lo que cobras: con un 80 %, te llevas el 80 % de lo que daba el enigma. El resto de tu clase no ve tus porcentajes.

## Las recompensas no llevan el bonus

Lo que sale en cada misión es lo que has cobrado con sus enigmas. **No incluye el bonus por completar la misión**, que se cobra aparte. Por eso, si sumas lo de todas tus misiones, no te sale tu saldo: la pantalla también te lo avisa.$itakai$, 'es', 'publicado'::"HelpArticleStatus", (SELECT COALESCE(MAX(a."order_index"), -1) + 1 FROM "help_articles" a WHERE a."category_id" = c."id"), false, 'alumno'::"HelpAudience", 'guia'::"HelpArticleKind", CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM "help_categories" c WHERE c."slug" = $itakai$si-eres-alumno$itakai$
ON CONFLICT ("category_id", "slug", "locale") DO NOTHING;

-- si-eres-alumno/comparar-con-tu-clase
INSERT INTO "help_articles" ("id", "category_id", "slug", "title", "summary", "cover_image", "body", "locale", "status", "order_index", "featured", "audience", "kind", "published_at", "updated_at")
SELECT gen_random_uuid()::text, c."id", $itakai$comparar-con-tu-clase$itakai$, $itakai$Comparar con tu clase$itakai$, $itakai$Qué es «Tú y tu clase»: si vas por encima, en la media o por debajo del resto de tu clase, sin ver a nadie.$itakai$, $itakai$/app/ayuda/niveles.svg$itakai$, $itakai$En el **Resumen** de tu clase puede salir la tarjeta **Tú y tu clase**. Te dice si vas por encima, en la media o por debajo del resto de tu clase, sin enseñarte a nadie.

## Qué se compara

Tu XP, si tu clase la usa, y tus misiones completadas. Si tu docente ha empezado una temporada, también las **Misiones de esta temporada**. Nunca tus notas ni tu asistencia.

En cada cifra ves una barra con tu sitio, **Tú**, y el de la **Media**, y una frase:

- **Vas por encima de la media del resto de tu clase.**
- **Estás en la media del resto de tu clase.**
- **Vas por debajo de la media del resto de tu clase.**

«En la media» es estar cerca de ella: a un 10 % o menos, por encima o por debajo.

## La media del resto de tu clase

Es la media de tus compañeros y compañeras, **sin contarte a ti**. Nunca se compara con otras clases.

Va **redondeada**: la XP, a la decena, y las misiones, a la unidad. Así nadie puede sacar la cifra de otra persona, ni siquiera juntando lo que ven dos. Por eso mismo, a veces solo verás la frase, sin la media: pasa cuando tu clase enseña solo los primeros puestos del ranking y quedan pocas personas fuera de ellos.

## Nadie ve a nadie

Tú ves tu cifra y la media, nada más. El resto de tu clase tampoco ve la tuya: cada cual ve solo lo suyo. Además, la media te llega ya calculada: a tu dispositivo no llega lo de nadie.

## Cuándo no sale

- **Si tu clase es pequeña.** Hacen falta al menos cinco personas además de ti, seis en total. Con menos, verás **Tu clase aún es pequeña para comparar.** Con tres o cuatro personas sería fácil adivinar lo de cada cual.
- **Si tu docente la ha apagado.** Tiene su propio interruptor, aparte del ranking: hay clases con ranking y sin comparación, y al revés.

Si tu clase tiene ranking, también la tienes en la pestaña **Ranking**, con las mismas cifras.

## Si vas por debajo

No es una nota: es una pista de cómo vas. Si llegaste tarde a la clase, es normal estar por debajo al principio. Mira en [mi progreso y mis resultados](/ayuda/si-eres-alumno/mi-progreso-y-mis-resultados) qué te queda pendiente, y si tienes dudas, pregúntale a tu docente.$itakai$, 'es', 'publicado'::"HelpArticleStatus", (SELECT COALESCE(MAX(a."order_index"), -1) + 1 FROM "help_articles" a WHERE a."category_id" = c."id"), false, 'alumno'::"HelpAudience", 'guia'::"HelpArticleKind", CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM "help_categories" c WHERE c."slug" = $itakai$si-eres-alumno$itakai$
ON CONFLICT ("category_id", "slug", "locale") DO NOTHING;

-- alumnado/clasificacion-y-progreso: el resumen, con lo que hay ahora.
UPDATE "help_articles" a
SET "summary" = $itakai$Dónde ves el ranking y cómo sigues a cada estudiante: la vista Ranking, el panel del Resumen, su página en la clase y su ficha.$itakai$, "updated_at" = CURRENT_TIMESTAMP
FROM "help_categories" c
WHERE c."id" = a."category_id" AND c."slug" = $itakai$alumnado$itakai$ AND a."locale" = 'es'
  AND a."slug" = $itakai$clasificacion-y-progreso$itakai$
  AND a."summary" = $itakai$Cómo se ordena el ranking, qué ve cada estudiante y cómo seguir a alguien en concreto.$itakai$;

-- alumnado/clasificacion-y-progreso: el ranking con sus tipos, la página del estudiante en la clase y la ficha como índice (ya no promete entregas ni comportamientos en la ficha).
UPDATE "help_articles" a
SET "body" = $itakai$## La clasificación

Cada clase tiene la suya, y lo de una no cuenta en otra. Puede ordenar por XP, por misiones completadas o por los puntos de los equipos, con el podio y el resto en lista. Tú la ves siempre completa en la pestaña **Alumnado**, vista **Ranking**, aunque tu alumnado no la tenga, y cada nombre lleva a la página de esa persona.

Qué ve tu alumnado, qué tipos hay y los periodos lo cuenta [tipos de ranking y quién los ve](/ayuda/gamificacion/tipos-de-ranking-y-quien-los-ve).

## Si no quieres competición

El ranking se puede apagar en *Ajustes → Funcionalidades*, o dejar que cada estudiante vea solo su puesto o los primeros. Hay grupos donde el ranking motiva y grupos donde desanima a quien más lo necesita: es una decisión pedagógica, y la plataforma no la toma por ti. Con el ranking apagado puedes dejar encendida **Comparar con la media**, para que cada cual sepa cómo va sin ver a nadie.

## El progreso de cada estudiante

- En el **Resumen** de la clase tienes cómo va la clase entera y quién se atasca: lo cuenta [la analítica de la clase](/ayuda/alumnado/la-analitica-de-la-clase).
- Al pulsar el nombre de un estudiante, en la pestaña **Alumnado** o en el Resumen, se abre su página en esa clase: sus cifras frente a la media de la clase, sus misiones con el % de cada enigma y su **Historial**, con lo que ha hecho, lo que se le ha aplicado y su asistencia, con fechas. Es la vista que sirve para una tutoría.
- Su ficha, en **Alumnado**, en el menú de la izquierda, es el índice de sus clases: en cada una, su alias, cuántas misiones lleva y su nivel, y **Ver en la clase** para ir a su página.

## Ordenar el listado

El listado de la pestaña **Alumnado** se ordena por nombre, nivel, experiencia, monedas, maná o vida. Para encontrar a quien lleva días sin entregar o tiene trabajo por revisar, ordena la tabla **Estudiantes** del Resumen por la actividad o por las entregas por revisar.$itakai$, "updated_at" = CURRENT_TIMESTAMP
FROM "help_categories" c
WHERE c."id" = a."category_id" AND c."slug" = $itakai$alumnado$itakai$ AND a."locale" = 'es'
  AND a."slug" = $itakai$clasificacion-y-progreso$itakai$
  AND a."body" = $itakai$## La clasificación

Ordena al alumnado de una clase por la **experiencia acumulada en esa clase**. No es global: cada clase tiene la suya, y la experiencia de una no cuenta en otra.

Los tres primeros puestos salen en un podio y el resto en lista, cada estudiante con su nivel, su rango y su avatar. Cada estudiante ve siempre su puesto destacado, esté donde esté.

## Si no quieres competición

La clasificación se puede desactivar en los ajustes de la clase. Hay grupos donde el ranking motiva y grupos donde desanima a quien más lo necesita — es una decisión pedagógica, y la plataforma no la toma por ti.

## El progreso de cada estudiante

Desde la pestaña del alumnado, al abrir una ficha tienes todo lo suyo: experiencia, nivel, monedas, maná, puntos de vida, misiones completadas, insignias, entregas y el historial de comportamientos aplicados, con fechas.

Es la vista que sirve para una tutoría: en una pantalla está lo que ha hecho y cuándo.

## Ordenar el listado

El listado del alumnado se puede ordenar por nombre, nivel, experiencia, monedas, maná o vida, para encontrar rápido a quien va con retraso o a quien lleva semanas sin entregar.$itakai$;

-- si-eres-alumno/la-clasificacion-de-la-clase: los tipos y los periodos, qué se ve según la clase y la comparación.
UPDATE "help_articles" a
SET "body" = $itakai$Algunas clases tienen ranking y otras no: lo decide tu docente. Si tu clase lo tiene, está en la pestaña **Ranking**.

## Qué mide

Puede haber uno o varios, cada uno en su pestaña:

- **XP**: la experiencia que llevas en esa clase.
- **Misiones**: las misiones que has completado. Si empatas, decide la XP, si tu clase tiene también el ranking de **XP**; si no, compartís puesto.
- **Equipos**: los puntos de cada equipo, como cuenta [mi equipo](/ayuda/si-eres-alumno/mi-equipo).

No mide notas, ni cuánto has acertado, ni lo bien que ha salido un trabajo: mide lo que llevas hecho. Por eso alguien constante suele estar arriba aunque no saque las mejores notas.

En **Misiones** y **Equipos** puedes mirar **Siempre**, **Esta semana**, que empieza cada lunes, o **Temporada**, si tu docente ha empezado una.

## Qué ves

Depende de lo que haya elegido tu docente:

- toda la clase, con el podio y el resto en lista;
- los primeros puestos y, aparte, el tuyo;
- o solo tu puesto, por ejemplo **Puesto 4 de 8**, sin ver a nadie más.

En el ranking sale el alias y el avatar de cada cual en esa clase, nunca el nombre real. Si empatas con alguien, compartís puesto. Si aún no tienes nada, todavía no tienes puesto: en cuanto consigas algo, entras.

## Qué no se ve

**Nadie ve tus entregas ni tus porcentajes**, ni tú los de los demás. Eso es entre tu docente y tú. Y lo que no te toca ver no está escondido en la pantalla: ni siquiera llega a tu dispositivo.

## Si te agobia

Díselo a tu docente: el ranking se puede apagar para toda la clase, o dejar que cada cual vea solo su puesto. Está pensado para picarse un poco, no para pasarlo mal. Si quieres saber cómo vas sin compararte con nadie en concreto, mira [comparar con tu clase](/ayuda/si-eres-alumno/comparar-con-tu-clase).

## Empezar tarde

Si te has incorporado con el curso empezado vas a estar abajo en **Siempre**, y es normal: los demás llevan más misiones hechas. Mira **Esta semana**, si tu clase la tiene: cada lunes se empieza de cero. Lo que cuenta para tu nota no es el puesto, es lo que entregas.$itakai$, "updated_at" = CURRENT_TIMESTAMP
FROM "help_categories" c
WHERE c."id" = a."category_id" AND c."slug" = $itakai$si-eres-alumno$itakai$ AND a."locale" = 'es'
  AND a."slug" = $itakai$la-clasificacion-de-la-clase$itakai$
  AND a."body" = $itakai$Algunas clases tienen clasificación y otras no: lo decide tu docente.

## Qué mide

Ordena por experiencia acumulada en esa clase. No mide notas, ni cuánto has acertado, ni lo bien que ha salido un trabajo: mide lo que llevas hecho.

Por eso alguien constante suele estar arriba aunque no saque las mejores notas.

## Qué no se ve

En la clasificación aparecen alias y progreso. **Nadie ve tus entregas ni tus porcentajes**, ni tú los de los demás. Eso es entre tu docente y tú.

## Si te agobia

Díselo a tu docente: la clasificación se puede apagar para toda la clase. Está pensada para picarse un poco, no para pasarlo mal.

## Empezar tarde

Si te has incorporado con el curso empezado vas a estar abajo, y es normal: los demás llevan más misiones hechas. Lo que cuenta para tu nota no es el puesto, es lo que entregas.$itakai$;

-- clases/elegir-que-recursos-usa-tu-clase: el ranking ya no pide XP, y la comparación con la media.
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
| **Ranking** | La clasificación del alumnado de la clase. Apagado, solo la ve el profesorado; encendido, eliges qué ve tu alumnado y por qué se ordena: XP, misiones o equipos. Ver [tipos de ranking y quién los ve](/ayuda/gamificacion/tipos-de-ranking-y-quien-los-ve) |
| **Comparar con la media** | Cada estudiante ve si va por encima, en la media o por debajo del resto de su clase, sin ver a nadie. Va aparte del ranking |
| **Comportamientos** | Acciones positivas o negativas que dan o quitan recursos |
| **Efectos visuales** | Animaciones como el confeti al subir de nivel o al salir alguien en la ruleta |
| **Sonidos** | Efectos de sonido al subir de nivel, completar misiones, girar la ruleta y otros momentos |
| **Mapa de misiones** | En pruebas y apagado de entrada: una vista más en *Misiones*, con el camino de la clase. Encendido, una misión puede pedir que se completen otras antes de abrirse. Ver [el mapa de misiones](/ayuda/misiones/el-mapa-de-misiones) |

Los rangos y los umbrales de experiencia no son un interruptor: se configuran en la sección **Niveles** de *Ajustes*. Las insignias se crean desde **Insignias**, en el menú lateral.

## Efectos, sonido y movimiento

Los efectos visuales y los sonidos son de la clase, pero cada persona puede bajarlos en su dispositivo: la [ruleta](/ayuda/gamificacion/usar-la-ruleta-en-clase) tiene un botón **Sonido** que silencia la app en ese dispositivo, y quien activa **Menos animación** en la accesibilidad, o tiene su dispositivo configurado para reducir el movimiento, no ve confeti ni animaciones.

## Apagar un recurso no borra nada

Si desactivas las monedas, dejan de verse y **dejan de repartirse al revisar entregas**, aunque los enigmas tengan monedas configuradas. Los saldos que ya tuviera tu alumnado se quedan guardados: al volver a activarlas, aparecen otra vez tal cual estaban. Con el mapa de misiones pasa lo mismo: apagado, lo que pide cada misión se queda guardado, pero no cierra nada.

## Dependencias

Algunos ajustes necesitan otro para tener sentido —la tienda sin monedas no vende nada— y la propia pantalla te lo dice cuando ocurre. El ranking no necesita la XP: sin ella, puede ordenar por misiones completadas o por equipos. Y **al menos un recurso tiene que estar activo**: una clase sin ninguno no podría repartir nada al revisar una entrega.

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
| **Mapa de misiones** | En pruebas y apagado de entrada: una vista más en *Misiones*, con el camino de la clase. Encendido, una misión puede pedir que se completen otras antes de abrirse. Ver [el mapa de misiones](/ayuda/misiones/el-mapa-de-misiones) |

Los rangos y los umbrales de experiencia no son un interruptor: se configuran en la sección **Niveles** de *Ajustes*. Las insignias se crean desde **Insignias**, en el menú lateral.

## Efectos, sonido y movimiento

Los efectos visuales y los sonidos son de la clase, pero cada persona puede bajarlos en su dispositivo: la [ruleta](/ayuda/gamificacion/usar-la-ruleta-en-clase) tiene un botón **Sonido** que silencia la app en ese dispositivo, y quien activa **Menos animación** en la accesibilidad, o tiene su dispositivo configurado para reducir el movimiento, no ve confeti ni animaciones.

## Apagar un recurso no borra nada

Si desactivas las monedas, dejan de verse y **dejan de repartirse al revisar entregas**, aunque los enigmas tengan monedas configuradas. Los saldos que ya tuviera tu alumnado se quedan guardados: al volver a activarlas, aparecen otra vez tal cual estaban. Con el mapa de misiones pasa lo mismo: apagado, lo que pide cada misión se queda guardado, pero no cierra nada.

## Dependencias

Algunos ajustes necesitan otro para tener sentido —la tienda sin monedas no vende nada— y la propia pantalla te lo dice cuando ocurre. Y **al menos un recurso tiene que estar activo**: una clase sin ninguno no podría repartir nada al revisar una entrega.

> Empieza corto. Una clase con experiencia y misiones ya funciona el primer día; monedas, tienda y poderes se añaden cuando el grupo ya está rodado.$itakai$;

-- gamificacion/premiar-a-un-equipo-y-ver-la-clasificacion: los equipos son un tipo de ranking, con sus periodos.
UPDATE "help_articles" a
SET "body" = $itakai$Premiar a un equipo hace dos cosas, y eliges cuáles antes de aplicar: **suma puntos a su marcador** y, si quieres, **reparte a cada integrante** un comportamiento o una recompensa.

## Premiar

1. En **Alumnado → Equipos**, pulsa **Premiar** en el equipo. También puedes hacerlo desde la tarjeta de un comportamiento, en **Comportamientos**, eligiendo **A un equipo**.
2. Elige un **comportamiento** o una **recompensa libre** con su motivo.
3. Escribe los **puntos para el marcador**. Si lo que aplicas resta (un comportamiento negativo o **Quitar**), los puntos también restan. Pon 0 si solo quieres repartir.
4. Deja marcado **Repartir también a cada integrante** si quieres que cada persona del equipo reciba el comportamiento o la recompensa, como si se lo aplicaras por separado. Desmárcalo para dar solo puntos.
5. Pulsa **Continuar**, revisa el resumen y pulsa **Aplicar**.

Todo se apunta a la vez: o se hace entero, o no se hace nada. En el historial de la clase sale en una sola línea, con el reparto dentro.

## El marcador y la clasificación

El marcador de un equipo es la suma de los puntos de sus premios, no la XP de sus integrantes: no cambia si mueves a alguien de equipo, y no favorece a los equipos más grandes.

Los equipos son uno de los [tipos de ranking](/ayuda/gamificacion/tipos-de-ranking-y-quien-los-ve): **Equipos**, con las agrupaciones **de base**. Tú lo ves en **Alumnado → Ranking**, en su pestaña **Equipos**, en cuanto hay una agrupación de base. Tu alumnado lo ve en su pestaña **Ranking** si la clase tiene el ranking encendido y el tipo **Equipos** también, en *Ajustes → Funcionalidades*: todos los equipos, en cualquier modo, y de los demás, solo el nombre y los puntos.

Además de **Siempre**, se puede mirar **Esta semana**, desde el lunes, y **Temporada**, si has empezado una: cuentan los premios desde entonces.

## Misiones por equipos

En los **Ajustes** de una misión, **Por equipos** dice con qué agrupación se hace. El alumnado lo ve en la misión, con su equipo. Cada estudiante sigue entregando lo suyo; lo que cambia es la revisión: al calificar una entrega, **Aprobar al equipo** aprueba con el mismo porcentaje la entrega pendiente de cada integrante de ese equipo. Cada aprobación da sus recompensas y avisa como siempre.

## Quién puede qué

Premiar equipos es de quien tiene **edición** en la clase. En una clase archivada no se premia a nadie.$itakai$, "updated_at" = CURRENT_TIMESTAMP
FROM "help_categories" c
WHERE c."id" = a."category_id" AND c."slug" = $itakai$gamificacion$itakai$ AND a."locale" = 'es'
  AND a."slug" = $itakai$premiar-a-un-equipo-y-ver-la-clasificacion$itakai$
  AND a."body" = $itakai$Premiar a un equipo hace dos cosas, y eliges cuáles antes de aplicar: **suma puntos a su marcador** y, si quieres, **reparte a cada integrante** un comportamiento o una recompensa.

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

Premiar equipos es de quien tiene **edición** en la clase. En una clase archivada no se premia a nadie.$itakai$;

-- si-eres-alumno/mi-equipo: el ranking de equipos, con sus periodos.
UPDATE "help_articles" a
SET "body" = $itakai$Si en tu clase hay equipos, en la portada de la clase tienes la tarjeta **Mi equipo**: con qué equipo estás y quién más está en él.

Puedes estar en más de un equipo a la vez: uno fijo para todo el curso y otro para una misión o una actividad concreta.

## Los puntos de tu equipo

Cuando tu equipo hace algo bien, el profesorado puede darle puntos. Si tu clase tiene el ranking de equipos, ves los puntos de tu equipo en **Mi equipo** y la clasificación de los equipos en la pestaña **Ranking**, en **Equipos**: de **Siempre**, de **Esta semana** o de la **Temporada**, si tu docente ha empezado una. De los demás equipos solo se ve el nombre y los puntos.

A veces el premio de equipo también te da XP, monedas o maná a ti: lo verás en tu actividad, como cualquier otro comportamiento o recompensa.

## Misiones por equipos

Si una misión se hace por equipos, lo pone al abrirla, con tu equipo. Aun así, **cada integrante entrega su parte**: ponte de acuerdo con tu equipo y sube tu entrega como siempre.$itakai$, "updated_at" = CURRENT_TIMESTAMP
FROM "help_categories" c
WHERE c."id" = a."category_id" AND c."slug" = $itakai$si-eres-alumno$itakai$ AND a."locale" = 'es'
  AND a."slug" = $itakai$mi-equipo$itakai$
  AND a."body" = $itakai$Si en tu clase hay equipos, en la portada de la clase tienes la tarjeta **Mi equipo**: con qué equipo estás y quién más está en él.

Puedes estar en más de un equipo a la vez: uno fijo para todo el curso y otro para una misión o una actividad concreta.

## Los puntos de tu equipo

Cuando tu equipo hace algo bien, el profesorado puede darle puntos. Si la clase tiene la clasificación activada, ves los puntos de tu equipo en **Mi equipo** y la **clasificación de equipos** en la pestaña de ranking. De los demás equipos solo se ve el nombre y los puntos.

A veces el premio de equipo también te da XP, monedas o maná a ti: lo verás en tu actividad, como cualquier otro comportamiento o recompensa.

## Misiones por equipos

Si una misión se hace por equipos, lo pone al abrirla, con tu equipo. Aun así, **cada integrante entrega su parte**: ponte de acuerdo con tu equipo y sube tu entrega como siempre.$itakai$;

-- alumnado/la-vista-del-alumno: el inicio con «4 de 8 misiones», el Resumen con «Mi progreso», el ranking según lo que vea y la vista previa fuera de la analítica.
UPDATE "help_articles" a
SET "body" = $itakai$Conviene saber cómo se ve la plataforma desde el otro lado, porque muchas dudas de clase se resuelven sabiendo dónde está cada botón.


![Lo que ve el profesorado frente a lo que ve el alumnado en la misma clase.](/app/ayuda/diagramas/vista-roles.svg)
## Su inicio

Al entrar, cada estudiante ve sus clases, con cuántas misiones lleva en cada una (por ejemplo, **4 de 8 misiones**), y lo que tiene pendiente. Si una misión está a punto de vencer, le aparece destacada.

## Dentro de una clase

Cada clase tiene sus pestañas:

- **Resumen**: su nivel; **Mi progreso**, con sus misiones completadas, su XP y sus insignias; **Tú y tu clase**, si la clase compara con la media; **Mis resultados**, misión a misión, con el % de cada enigma; su actividad, y el profesorado que la imparte, con el avatar y el perfil de cada docente. Lo cuenta [mi progreso y mis resultados](/ayuda/si-eres-alumno/mi-progreso-y-mis-resultados).
- **Historia** y **Guía**: la narrativa y las reglas que hayas escrito.
- **Misiones**: en el [orden de la clase](/ayuda/misiones/el-orden-de-las-misiones), con su rareza, su fecha y cuánto lleva completado de cada una. Si la clase tiene encendido el [mapa de misiones](/ayuda/misiones/el-mapa-de-misiones), las ve de entrada en el mapa, con candado las que aún no se le han abierto.
- **Ranking**: si la clase lo tiene encendido, lo que hayas elegido que vea: toda la clasificación, los primeros puestos y el suyo, o solo su puesto. Lo cuenta [tipos de ranking y quién los ve](/ayuda/gamificacion/tipos-de-ranking-y-quien-los-ve).
- **Tienda**: qué puede comprar con lo que tiene, si la clase la usa.
- **Avatar**: su alias y su avatar en esa clase.

Las insignias, las conseguidas y las que faltan, las tiene en **Insignias**, en su menú.

## Cómo entrega

Abre la misión, elige un enigma, sube su archivo y espera. Mientras tenga una entrega pendiente de ese enigma no puede subir otra. Cuando la revisas, le llega un aviso con el porcentaje que le has puesto, y en su actividad ve quién se la aprobó; lo mismo con los comportamientos que se le aplican.

## Su perfil

Cada estudiante tiene su alias y su avatar **por clase**: puede llamarse de una forma en Matemáticas y de otra en Historia. Eso se explica en [avatares y alias](/ayuda/alumnado/avatares-y-alias-por-clase).

Si le has [creado tú la cuenta](/ayuda/alumnado/dar-de-alta-alumnos-sin-correo), entra con su usuario y la contraseña temporal de la hoja, y lo primero que ve es la pantalla para cambiarla: hasta que no elige una suya, no llega a nada más.

## Ver tu clase como la ve tu alumnado

Con **Ver como estudiante**, debajo de tu nombre en el menú de la izquierda (en pantallas anchas), entras en la plataforma con una cuenta de estudiante de prueba, dentro de todas tus clases, para revisarlas desde dentro. Esa matrícula de prueba no cuenta en los listados, ni en el recuento del alumnado, ni en la clasificación, ni en la analítica. Con ella lo ves todo abierto: el [camino del mapa](/ayuda/misiones/montar-el-camino-del-mapa) solo cierra misiones a las cuentas de estudiante.$itakai$, "updated_at" = CURRENT_TIMESTAMP
FROM "help_categories" c
WHERE c."id" = a."category_id" AND c."slug" = $itakai$alumnado$itakai$ AND a."locale" = 'es'
  AND a."slug" = $itakai$la-vista-del-alumno$itakai$
  AND a."body" = $itakai$Conviene saber cómo se ve la plataforma desde el otro lado, porque muchas dudas de clase se resuelven sabiendo dónde está cada botón.


![Lo que ve el profesorado frente a lo que ve el alumnado en la misma clase.](/app/ayuda/diagramas/vista-roles.svg)
## Su inicio

Al entrar, cada estudiante ve sus clases, su progreso y lo que tiene pendiente. Si una misión está a punto de vencer, le aparece destacada.

## Dentro de una clase

Cada clase tiene sus pestañas:

- **Resumen**: su nivel, sus números y su actividad en esa clase, y el profesorado que la imparte, con el avatar y el perfil de cada docente.
- **Historia** y **Guía**: la narrativa y las reglas que hayas escrito.
- **Misiones**: en el [orden de la clase](/ayuda/misiones/el-orden-de-las-misiones), con su rareza, su fecha y cuánto lleva completado de cada una. Si la clase tiene encendido el [mapa de misiones](/ayuda/misiones/el-mapa-de-misiones), las ve de entrada en el mapa, con candado las que aún no se le han abierto.
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

Con **Ver como estudiante**, debajo de tu nombre en el menú de la izquierda (en pantallas anchas), entras en la plataforma con una cuenta de estudiante de prueba, dentro de todas tus clases, para revisarlas desde dentro. Esa matrícula de prueba no cuenta en los listados, ni en el recuento del alumnado, ni en la clasificación. Con ella lo ves todo abierto: el [camino del mapa](/ayuda/misiones/montar-el-camino-del-mapa) solo cierra misiones a las cuentas de estudiante.$itakai$;

-- gamificacion/insignias: el resumen, con las de ITAKAI.
UPDATE "help_articles" a
SET "summary" = $itakai$Reconocimientos que se ganan al completar misiones, con su imagen y su significado; las tuyas y las de ITAKAI, que se conceden solas.$itakai$, "updated_at" = CURRENT_TIMESTAMP
FROM "help_categories" c
WHERE c."id" = a."category_id" AND c."slug" = $itakai$gamificacion$itakai$ AND a."locale" = 'es'
  AND a."slug" = $itakai$insignias$itakai$
  AND a."summary" = $itakai$Reconocimientos que se ganan al completar misiones, con su imagen y su significado.$itakai$;

-- gamificacion/insignias: completar es aprobar los obligatorios, y «Mis insignias» separa las tuyas de las de ITAKAI.
UPDATE "help_articles" a
SET "body" = $itakai$Las insignias son el reconocimiento visible de algo conseguido. A diferencia de la experiencia o las monedas, no se gastan ni se pierden: se quedan en el perfil de cada estudiante dentro de esa clase.

## Cómo se ganan

Una insignia se asocia a una **misión**. Cuando alguien completa esa misión —todos sus enigmas obligatorios aprobados— la insignia entra en su colección automáticamente, junto con el bonus de experiencia por rareza.

## Crear una

En **Insignias**, en el menú de la izquierda, pulsa **Nueva insignia**. Eliges la **misión asociada**, le pones un nombre y una imagen y, si quieres, una descripción de por qué se consigue. La imagen puedes subirla o, con la misión elegida, pulsar **Generar con IA**, que propone el nombre, la descripción y la imagen; para insignias funciona sorprendentemente bien.

Una insignia sin misión no se entrega a nadie: queda guardada hasta que la vincules a una.

## Tus insignias y las de ITAKAI

**Mis insignias** tiene dos bloques, y el buscador y los filtros actúan sobre los dos:

- **Tus insignias**: las que has creado y las de las misiones que puedes editar. Al pulsar una, puedes cambiarla.
- **Insignias de ITAKAI**: vienen con la plataforma y se conceden solas según el progreso de cada estudiante: al llegar a un nivel, al completar un número de misiones o al reunir cierta XP en una clase. No se pueden editar. Al abrir una ves cómo se gana y, si quieres una así, **Crear una parecida** abre una nueva con su nombre, su rareza y su imagen, para que la cambies a tu gusto.

## En una clase compartida

Una insignia vinculada a una misión es de su clase: la puede cambiar cualquiera con acceso de edición en ella. Las que no tienen misión son solo de quien las creó.

## Dónde se ven

En el perfil de cada estudiante dentro de la clase, en su pantalla de insignias, y en las tarjetas de misión completada. Las que todavía no ha ganado aparecen bloqueadas, con su descripción visible: saber lo que falta es parte del incentivo.

## Cuántas poner

Una por misión importante, no una por misión. Si todas las misiones dan insignia, la colección deja de significar nada; si solo la dan las grandes, conseguir una es una noticia.$itakai$, "updated_at" = CURRENT_TIMESTAMP
FROM "help_categories" c
WHERE c."id" = a."category_id" AND c."slug" = $itakai$gamificacion$itakai$ AND a."locale" = 'es'
  AND a."slug" = $itakai$insignias$itakai$
  AND a."body" = $itakai$Las insignias son el reconocimiento visible de algo conseguido. A diferencia de la experiencia o las monedas, no se gastan ni se pierden: se quedan en el perfil de cada estudiante dentro de esa clase.

## Cómo se ganan

Una insignia se asocia a una **misión**. Cuando alguien completa esa misión entera —todos sus enigmas aprobados— la insignia entra en su colección automáticamente, junto con el bonus de experiencia por rareza.

## Crear una

En **Insignias**, en el menú de la izquierda, pulsa **Nueva insignia**. Eliges la **misión asociada**, le pones un nombre y una imagen y, si quieres, una descripción de por qué se consigue. La imagen puedes subirla o, con la misión elegida, pulsar **Generar con IA**, que propone el nombre, la descripción y la imagen; para insignias funciona sorprendentemente bien.

Una insignia sin misión no se entrega a nadie: queda guardada hasta que la vincules a una.

## En una clase compartida

Una insignia vinculada a una misión es de su clase: la puede cambiar cualquiera con acceso de edición en ella. Las que no tienen misión son solo de quien las creó.

## Dónde se ven

En el perfil de cada estudiante dentro de la clase, en su pantalla de insignias, y en las tarjetas de misión completada. Las que todavía no ha ganado aparecen bloqueadas, con su descripción visible: saber lo que falta es parte del incentivo.

## Cuántas poner

Una por misión importante, no una por misión. Si todas las misiones dan insignia, la colección deja de significar nada; si solo la dan las grandes, conseguir una es una noticia.$itakai$;

-- misiones/enigmas-los-pasos-de-una-mision: los opcionales no cuentan en el progreso, y dónde están Editar, Ver entregas y Eliminar.
UPDATE "help_articles" a
SET "body" = $itakai$El enigma es la unidad real de trabajo. La misión da el marco; el enigma es lo que el alumnado hace, entrega y ve puntuado.


![Las partes de una misión señaladas sobre su ficha: portada, rareza, fecha de entrega y los enigmas.](/app/ayuda/diagramas/anatomia-mision.svg)
## Cómo se componen

Cada enigma tiene un **título**, un **enunciado** y sus propias **recompensas**. Se ordenan dentro de la misión, y ese orden es el que ve el alumnado.

Un enigma puede ser cualquier cosa que acabe en una entrega: resolver un problema, grabar un audio, subir una foto de una maqueta, entregar un documento. El alumnado lo entrega siempre en **un archivo comprimido ZIP, RAR o 7Z de hasta 50 MB**, así que dentro cabe lo que haga falta: uno o varios archivos, del formato que sea.

## Qué hace cada estudiante

Abre la misión, elige un enigma y sube su archivo. La entrega queda **pendiente de revisión** y en su pantalla ve que la pelota está en tu tejado. Mientras tenga una entrega pendiente de ese enigma no puede subir otra, para que no se te acumulen tres versiones de lo mismo.

## Editar, revisar y borrar

En la misión, cada enigma tiene a la vista **Ver entregas (N)**, para todo el profesorado de la clase, y **Editar**, si tienes acceso de edición. **Eliminar** está en su menú **⋮**. Los documentos de apoyo, igual: **Editar** a la vista y **Eliminar** en **⋮**.

## Cuántos poner

No hay número mágico, pero conviene que cada enigma sea entregable en una sesión o dos. Una misión de dos enigmas gordos se atasca; una de ocho pequeños da sensación de avance continuo.

## Enigmas opcionales

Al crear o editar un enigma puedes marcar **Este enigma es opcional**. En la misión sale con la etiqueta **Opcional**: da su recompensa como cualquier otro, pero **no hace falta para completar la misión** ni cuenta en el progreso: sale aparte, como **Extra**.

## Lo que pasa al completar la misión

Cuando apruebas el último enigma obligatorio que le faltaba a alguien, la misión se marca como completada y esa persona se lleva el bonus de rareza y la insignia asociada, si la misión tiene una. Eso ocurre una sola vez, en esa revisión. Si todos los enigmas son opcionales, basta con aprobar uno.

Completar una misión también abre las que la piden en el [camino del mapa](/ayuda/misiones/montar-el-camino-del-mapa).$itakai$, "updated_at" = CURRENT_TIMESTAMP
FROM "help_categories" c
WHERE c."id" = a."category_id" AND c."slug" = $itakai$misiones$itakai$ AND a."locale" = 'es'
  AND a."slug" = $itakai$enigmas-los-pasos-de-una-mision$itakai$
  AND a."body" = $itakai$El enigma es la unidad real de trabajo. La misión da el marco; el enigma es lo que el alumnado hace, entrega y ve puntuado.


![Las partes de una misión señaladas sobre su ficha: portada, rareza, fecha de entrega y los enigmas.](/app/ayuda/diagramas/anatomia-mision.svg)
## Cómo se componen

Cada enigma tiene un **título**, un **enunciado** y sus propias **recompensas**. Se ordenan dentro de la misión, y ese orden es el que ve el alumnado.

Un enigma puede ser cualquier cosa que acabe en una entrega: resolver un problema, grabar un audio, subir una foto de una maqueta, entregar un documento. El alumnado lo entrega siempre en **un archivo comprimido ZIP, RAR o 7Z de hasta 50 MB**, así que dentro cabe lo que haga falta: uno o varios archivos, del formato que sea.

## Qué hace cada estudiante

Abre la misión, elige un enigma y sube su archivo. La entrega queda **pendiente de revisión** y en su pantalla ve que la pelota está en tu tejado. Mientras tenga una entrega pendiente de ese enigma no puede subir otra, para que no se te acumulen tres versiones de lo mismo.

## Cuántos poner

No hay número mágico, pero conviene que cada enigma sea entregable en una sesión o dos. Una misión de dos enigmas gordos se atasca; una de ocho pequeños da sensación de avance continuo.

## Enigmas opcionales

Al crear o editar un enigma puedes marcar **Este enigma es opcional**. En la misión sale con la etiqueta **Opcional**: da su recompensa como cualquier otro y cuenta en el avance, pero **no hace falta para completar la misión**.

## Lo que pasa al completar la misión

Cuando apruebas el último enigma obligatorio que le faltaba a alguien, la misión se marca como completada y esa persona se lleva el bonus de rareza y la insignia asociada, si la misión tiene una. Eso ocurre una sola vez, en esa revisión. Si todos los enigmas son opcionales, basta con aprobar uno.

Completar una misión también abre las que la piden en el [camino del mapa](/ayuda/misiones/montar-el-camino-del-mapa).$itakai$;

-- misiones/revisar-entregas: «Ver entregas» siempre a la vista, y las entregas por revisar en el Resumen.
UPDATE "help_articles" a
SET "body" = $itakai$Cuando alguien del alumnado sube su archivo a un enigma, la entrega queda **pendiente** hasta que la revises. La revisión se hace en la propia misión: ahí decides con qué porcentaje se ha completado la tarea, y ese único número reparte todas las recompensas.


![Los tres estados de una entrega: pendiente, entregada y revisada. Los dos primeros los mueve el alumnado; el último, el profesorado.](/app/ayuda/diagramas/estados-entrega.svg)
## Dónde están las entregas

Si tienes acceso de edición o de administración en la clase, cada vez que alguien del alumnado entrega te llega un aviso en **Avisos**, en el menú de la izquierda. Al pulsarlo vas directamente a la misión, con la ventana de entregas de ese enigma abierta. En cuanto alguien del profesorado aprueba esa entrega, el aviso queda como leído para todo el profesorado.

También puedes llegar tú: en la clase, pestaña **Misiones**, abre la misión. Cada enigma tiene a la vista su botón **Ver entregas (N)**, donde N son las que quedan por revisar.

Y para saber si te queda algo pendiente, el **Resumen** de la clase muestra cuántas **Entregas por revisar** hay, con el enlace **Ir a Misiones**, y en cada misión cuántas personas tienen algo **Por revisar**. Lo cuenta [la analítica de la clase](/ayuda/alumnado/la-analitica-de-la-clase).

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

Quien termina el último enigma obligatorio que le quedaba se lleva además el **bonus por completar la misión** —entre 50 y 400 XP [según la rareza](/ayuda/misiones/rarezas-y-fechas-de-entrega)— y con él la insignia asociada, si la misión tiene una. Los [enigmas opcionales](/ayuda/misiones/enigmas-los-pasos-de-una-mision) no hacen falta para completarla.

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

Quien termina el último enigma obligatorio que le quedaba se lleva además el **bonus por completar la misión** —entre 50 y 400 XP [según la rareza](/ayuda/misiones/rarezas-y-fechas-de-entrega)— y con él la insignia asociada, si la misión tiene una. Los [enigmas opcionales](/ayuda/misiones/enigmas-los-pasos-de-una-mision) no hacen falta para completarla.

## Lo que no se puede repetir

Un enigma ya aprobado **no se puede volver a aprobar**: en la vista de quien lo entregó deja de tener el botón **Entregar**, y la plataforma nunca paga dos veces las recompensas del mismo enigma.

## Quién aprobó qué

Cada aprobación queda en el [historial de la clase](/ayuda/clases/el-historial-de-la-clase), con quién la hizo y con qué porcentaje. Cada estudiante también ve en su actividad quién le aprobó la entrega.$itakai$;

-- misiones/el-mapa-de-misiones: el estado de una misión bloqueada a mano y la media de la clase, como en la pantalla.
UPDATE "help_articles" a
SET "body" = $itakai$El **mapa de misiones** enseña las misiones de la clase como un tablero, de la **Salida** a la **Meta**, con una carretera que las une. Con él puedes [montar además un camino](/ayuda/misiones/montar-el-camino-del-mapa), en el que una misión no se abre hasta completar otras. Está **en pruebas**, con la etiqueta **Beta**: su aspecto y su funcionamiento pueden cambiar.

## Encenderlo

En *Ajustes* de la clase, sección **Funcionalidades**, en **En pruebas**, activa **Mapa de misiones**. Va apagado de entrada, y encenderlo o apagarlo pide acceso de administración en la clase. En la pestaña **Misiones** aparece entonces una vista más, **Mapa**, junto a la cuadrícula y la lista. En el mapa no hay filtros: sale la clase entera.

## El tablero

Cada misión es un medallón con su portada, su número de paso y el icono de su estado, que también se dice en texto, nunca solo con un color. Sin camino, las misiones siguen el [orden de la clase](/ayuda/misiones/el-orden-de-las-misiones); con camino, cada una va detrás de lo que pide, y las ramas que acaban antes llegan a la **Meta** por un sendero más fino, para que destaque el camino principal. El tramo ya recorrido se ilumina.

- **Tu alumnado** ve el mapa de entrada, con lo que lleva (**Has completado 3 de 8 misiones**), **Estás aquí** con su avatar en la misión en la que va y el botón **Ir a mi misión**.
- **Tú** ves en cada medallón un anillo con la parte de la clase que la ha completado y, arriba, cuántas misiones ha completado la clase de media, por ejemplo **De media, 3 de 8 misiones completadas**.

Al pulsar una misión se abre su detalle, al lado del tablero o, en el móvil, desde abajo (ahí el camino es una columna): lo que da, el avance, la fecha límite, qué la abre, qué abre ella y el botón para entrar.

En tu detalle, el avance es el de la clase: cuántas personas la han completado y, con sus avatares, quién (si son más de ocho, el último dice cuántas más; al pasar el ratón, ves quiénes). Mientras quede alguien por completarla, **En curso: 2** dice cuántas la han empezado sin terminarla. Tu vista previa como estudiante no cuenta.

En la **Leyenda**, debajo del mapa, cada estado resalta sus misiones, y con el teclado las flechas pasan de una misión a la siguiente.

## Qué ve tu alumnado

Una misión que aún no se le ha abierto la ve con candado, y no puede ver su historia ni sus documentos, ni entregar, ni usar sus pistas. En el mapa, en la **Leyenda** y en el detalle sale como **Bloqueada**, y el lector de pantalla dice además el motivo:

- **Bloqueada: se abre al completar «…»**, si le falta algo del camino. En las tarjetas lee **Se abre al completar «…»** y en el detalle, **Para abrirla, completa antes**.
- **Bloqueada por tu docente por ahora**, si la has bloqueado tú. El detalle dice **Tu docente ha cerrado esta misión por ahora. Podrás entrar cuando la abra.**

Cuándo se abre cada una lo cuenta [montar el camino del mapa](/ayuda/misiones/montar-el-camino-del-mapa), y a tu alumnado, [el mapa de misiones y las misiones bloqueadas](/ayuda/si-eres-alumno/el-mapa-y-las-misiones-cerradas).

## Apagarlo

Apagar el mapa **lo abre todo al momento**: solo siguen cerradas las bloqueadas, desaparece la vista **Mapa** y el orden vuelve a ser libre. No se borra nada: los requisitos se quedan guardados y vuelven a cerrar cuando lo enciendas otra vez, salvo lo que cada estudiante haya empezado entretanto.

## Al copiar

- Al [duplicar la clase](/ayuda/clases/duplicar-una-clase-para-el-curso-siguiente) o importar una [plantilla](/ayuda/clases/crear-una-clase-desde-cero-o-desde-una-plantilla) con sus misiones, el camino llega igual y, con las funcionalidades, el interruptor también. La ficha pública de una plantilla no lo enseña, por estar en pruebas.
- Una misión [importada de otra clase](/ayuda/misiones/importar-una-mision-de-otra-clase), o que pasas a otra clase, llega **sin requisitos**, y en la de origen ya no la pide nadie.$itakai$, "updated_at" = CURRENT_TIMESTAMP
FROM "help_categories" c
WHERE c."id" = a."category_id" AND c."slug" = $itakai$misiones$itakai$ AND a."locale" = 'es'
  AND a."slug" = $itakai$el-mapa-de-misiones$itakai$
  AND a."body" = $itakai$El **mapa de misiones** enseña las misiones de la clase como un tablero, de la **Salida** a la **Meta**, con una carretera que las une. Con él puedes [montar además un camino](/ayuda/misiones/montar-el-camino-del-mapa), en el que una misión no se abre hasta completar otras. Está **en pruebas**, con la etiqueta **Beta**: su aspecto y su funcionamiento pueden cambiar.

## Encenderlo

En *Ajustes* de la clase, sección **Funcionalidades**, en **En pruebas**, activa **Mapa de misiones**. Va apagado de entrada, y encenderlo o apagarlo pide acceso de administración en la clase. En la pestaña **Misiones** aparece entonces una vista más, **Mapa**, junto a la cuadrícula y la lista. En el mapa no hay filtros: sale la clase entera.

## El tablero

Cada misión es un medallón con su portada, su número de paso y el icono de su estado, que también se dice en texto, nunca solo con un color. Sin camino, las misiones siguen el [orden de la clase](/ayuda/misiones/el-orden-de-las-misiones); con camino, cada una va detrás de lo que pide, y las ramas que acaban antes llegan a la **Meta** por un sendero más fino, para que destaque el camino principal. El tramo ya recorrido se ilumina.

- **Tu alumnado** ve el mapa de entrada, con lo que lleva (**Has completado 3 de 8 misiones**), **Estás aquí** con su avatar en la misión en la que va y el botón **Ir a mi misión**.
- **Tú** ves en cada medallón un anillo con la parte de la clase que la ha completado y, arriba, cómo va la clase en el recorrido.

Al pulsar una misión se abre su detalle, al lado del tablero o, en el móvil, desde abajo (ahí el camino es una columna): lo que da, el avance, la fecha límite, qué la abre, qué abre ella y el botón para entrar.

En tu detalle, el avance es el de la clase: cuántas personas la han completado y, con sus avatares, quién (si son más de ocho, el último dice cuántas más; al pasar el ratón, ves quiénes). Mientras quede alguien por completarla, **En curso: 2** dice cuántas la han empezado sin terminarla. Tu vista previa como estudiante no cuenta.

En la **Leyenda**, debajo del mapa, cada estado resalta sus misiones, y con el teclado las flechas pasan de una misión a la siguiente.

## Qué ve tu alumnado

Una misión que aún no se le ha abierto la ve con candado, y no puede ver su historia ni sus documentos, ni entregar, ni usar sus pistas. En el mapa, en la **Leyenda** y en el detalle sale como **Bloqueada**, y el lector de pantalla dice además el motivo:

- **Bloqueada: se abre al completar «…»**, si le falta algo del camino. En las tarjetas lee **Se abre al completar «…»** y en el detalle, **Para abrirla, completa antes**.
- **Bloqueada: cerrada por tu docente por ahora**, si la has bloqueado tú. El detalle dice **Tu docente ha cerrado esta misión por ahora. Podrás entrar cuando la abra.**

Cuándo se abre cada una lo cuenta [montar el camino del mapa](/ayuda/misiones/montar-el-camino-del-mapa), y a tu alumnado, [el mapa de misiones y las misiones bloqueadas](/ayuda/si-eres-alumno/el-mapa-y-las-misiones-cerradas).

## Apagarlo

Apagar el mapa **lo abre todo al momento**: solo siguen cerradas las bloqueadas, desaparece la vista **Mapa** y el orden vuelve a ser libre. No se borra nada: los requisitos se quedan guardados y vuelven a cerrar cuando lo enciendas otra vez, salvo lo que cada estudiante haya empezado entretanto.

## Al copiar

- Al [duplicar la clase](/ayuda/clases/duplicar-una-clase-para-el-curso-siguiente) o importar una [plantilla](/ayuda/clases/crear-una-clase-desde-cero-o-desde-una-plantilla) con sus misiones, el camino llega igual y, con las funcionalidades, el interruptor también. La ficha pública de una plantilla no lo enseña, por estar en pruebas.
- Una misión [importada de otra clase](/ayuda/misiones/importar-una-mision-de-otra-clase), o que pasas a otra clase, llega **sin requisitos**, y en la de origen ya no la pide nadie.$itakai$;

-- misiones/montar-el-camino-del-mapa: «bloqueada», como en la pantalla.
UPDATE "help_articles" a
SET "body" = $itakai$Con el [mapa de misiones](/ayuda/misiones/el-mapa-de-misiones) puedes montar un **camino**: que una misión no se abra hasta que cada estudiante complete otras, como los niveles de un juego. Lo que pide cada misión son sus **requisitos**.

## Qué puede pedir una misión

Una misión puede pedir que antes se completen **hasta 3** misiones de su clase, y entonces hacen falta **todas**. Hay dos formas de montar el camino, y se pueden combinar.

## Misión a misión

Abre la misión y ve a **Ajustes**. En la sección **Camino**, marca en **Para abrirla, completar antes** las que hacen falta y pulsa **Guardar cambios**. Junto a cada casilla ves si esa misión está bloqueada o expirada. Las atenuadas no se pueden marcar: ya dependen de esta, y si la pidiera, no se abriría ninguna de las dos.

## En un paso

En la pestaña **Misiones**, pulsa **Ordenar**. Debajo de la lista, en **Camino del mapa**, hay dos botones:

- **Encadenar en orden** hace que cada misión pida la anterior y sustituye lo que hubiera. Las bloqueadas se quedan fuera: ni piden nada ni las pide nadie.
- **Quitar los requisitos** los borra todos, y todas las misiones se abren desde el principio.

Junto a cada botón se lee lo que va a pasar antes de pulsarlo.

Montar el camino pide acceso de **edición** en la clase, y cada cambio queda en el [historial](/ayuda/clases/el-historial-de-la-clase). Se puede preparar con el mapa apagado: se guarda, pero no cierra nada hasta que lo enciendas.

## Cuándo se abre cada misión

Cada estudiante recorre el camino a su ritmo: una misión se le abre en cuanto completa lo que pide. Hasta entonces la ve como **Bloqueada**, con lo que le falta: **Se abre al completar «…»**. Si llega por un enlace, ve **Aún no puedes empezar esta misión** y, si lo que le falta ya está abierto, un botón para ir a ello.

- **Completar es aprobar los obligatorios.** Una misión está completada cuando alguien tiene aprobados todos sus enigmas obligatorios. Los [opcionales](/ayuda/misiones/enigmas-los-pasos-de-una-mision) dan su recompensa, pero no hacen falta; si todos son opcionales, basta con aprobar uno.
- **Lo empezado no se cierra.** Si alguien ya tiene en una misión una entrega, un enigma aprobado o una pista usada, no se le cierra aunque le pongas requisitos después.
- **Lo que no se puede cumplir no cierra.** Si la misión que se pide ha caducado o no tiene enigmas, no cierra lo que va detrás. Si le alargas la fecha, vuelve a cerrarlo para quien aún no lo haya empezado.
- **Bloqueada va por encima.** Una misión bloqueada está cerrada para toda la clase, pida lo que pida. Si la que se pide está bloqueada, lo que va detrás espera a que la desbloquees, y tu alumnado lee **Se abre al completar «A» (bloqueada por tu docente por ahora)**.
- **Tú no tienes cierres.** El profesorado lo ve todo abierto, también con **Ver como estudiante**. Para probar el camino hace falta una cuenta de estudiante.

No se puede abrir una misión a una sola persona: si alguien se queda atascado, quita ese requisito, que cambia para toda la clase, o apaga el mapa.

## El camino y el orden

Con el mapa encendido, una misión **no puede ir delante de lo que pide**: si estaba delante, al guardar sus requisitos pasa detrás, y en **Ordenar** no se puede volver a poner delante sin quitarle antes lo que pide. Con el mapa apagado ordenas como quieras; al encenderlo, se recoloca solo lo justo. Lo cuenta [el orden de las misiones](/ayuda/misiones/el-orden-de-las-misiones).$itakai$, "updated_at" = CURRENT_TIMESTAMP
FROM "help_categories" c
WHERE c."id" = a."category_id" AND c."slug" = $itakai$misiones$itakai$ AND a."locale" = 'es'
  AND a."slug" = $itakai$montar-el-camino-del-mapa$itakai$
  AND a."body" = $itakai$Con el [mapa de misiones](/ayuda/misiones/el-mapa-de-misiones) puedes montar un **camino**: que una misión no se abra hasta que cada estudiante complete otras, como los niveles de un juego. Lo que pide cada misión son sus **requisitos**.

## Qué puede pedir una misión

Una misión puede pedir que antes se completen **hasta 3** misiones de su clase, y entonces hacen falta **todas**. Hay dos formas de montar el camino, y se pueden combinar.

## Misión a misión

Abre la misión y ve a **Ajustes**. En la sección **Camino**, marca en **Para abrirla, completar antes** las que hacen falta y pulsa **Guardar cambios**. Junto a cada casilla ves si esa misión está bloqueada o expirada. Las atenuadas no se pueden marcar: ya dependen de esta, y si la pidiera, no se abriría ninguna de las dos.

## En un paso

En la pestaña **Misiones**, pulsa **Ordenar**. Debajo de la lista, en **Camino del mapa**, hay dos botones:

- **Encadenar en orden** hace que cada misión pida la anterior y sustituye lo que hubiera. Las bloqueadas se quedan fuera: ni piden nada ni las pide nadie.
- **Quitar los requisitos** los borra todos, y todas las misiones se abren desde el principio.

Junto a cada botón se lee lo que va a pasar antes de pulsarlo.

Montar el camino pide acceso de **edición** en la clase, y cada cambio queda en el [historial](/ayuda/clases/el-historial-de-la-clase). Se puede preparar con el mapa apagado: se guarda, pero no cierra nada hasta que lo enciendas.

## Cuándo se abre cada misión

Cada estudiante recorre el camino a su ritmo: una misión se le abre en cuanto completa lo que pide. Hasta entonces la ve como **Bloqueada**, con lo que le falta: **Se abre al completar «…»**. Si llega por un enlace, ve **Aún no puedes empezar esta misión** y, si lo que le falta ya está abierto, un botón para ir a ello.

- **Completar es aprobar los obligatorios.** Una misión está completada cuando alguien tiene aprobados todos sus enigmas obligatorios. Los [opcionales](/ayuda/misiones/enigmas-los-pasos-de-una-mision) dan su recompensa, pero no hacen falta; si todos son opcionales, basta con aprobar uno.
- **Lo empezado no se cierra.** Si alguien ya tiene en una misión una entrega, un enigma aprobado o una pista usada, no se le cierra aunque le pongas requisitos después.
- **Lo que no se puede cumplir no cierra.** Si la misión que se pide ha caducado o no tiene enigmas, no cierra lo que va detrás. Si le alargas la fecha, vuelve a cerrarlo para quien aún no lo haya empezado.
- **Bloqueada va por encima.** Una misión bloqueada está cerrada para toda la clase, pida lo que pida. Si la que se pide está bloqueada, lo que va detrás espera a que la desbloquees, y tu alumnado lee **Se abre al completar «A» (cerrada por tu docente por ahora)**.
- **Tú no tienes cierres.** El profesorado lo ve todo abierto, también con **Ver como estudiante**. Para probar el camino hace falta una cuenta de estudiante.

No se puede abrir una misión a una sola persona: si alguien se queda atascado, quita ese requisito, que cambia para toda la clase, o apaga el mapa.

## El camino y el orden

Con el mapa encendido, una misión **no puede ir delante de lo que pide**: si estaba delante, al guardar sus requisitos pasa detrás, y en **Ordenar** no se puede volver a poner delante sin quitarle antes lo que pide. Con el mapa apagado ordenas como quieras; al encenderlo, se recoloca solo lo justo. Lo cuenta [el orden de las misiones](/ayuda/misiones/el-orden-de-las-misiones).$itakai$;

-- si-eres-alumno/el-mapa-y-las-misiones-cerradas: «Bloqueada» delante del alumnado, como en la pantalla.
UPDATE "help_articles" a
SET "body" = $itakai$A veces una misión sale con un **candado** y como **Bloqueada**: todavía no puedes entrar en ella. Puede ser por dos motivos, y la propia misión te dice cuál.

## Se abre al completar otra

Si tu clase usa el **mapa de misiones**, tu docente puede preparar un camino: unas misiones se abren al completar otras, como los niveles de un juego. En las tarjetas, esas misiones dicen **Se abre al completar «…»**, con el nombre de la que te falta. Si salen dos o tres, tienes que completarlas **todas**.

- Una misión está completada cuando tu docente te ha aprobado todos sus enigmas. Los que pone **Opcional** no hacen falta.
- En cuanto completas lo que pide, la misión se te abre sola. No tienes que pedir nada.
- Cada persona va a su ritmo: se te abre cuando tú completas lo que pide, aunque al resto de la clase todavía no.
- Si la misión que te falta ya ha pasado su fecha, o no tiene enigmas, no te cierra nada: la siguiente se abre igualmente.
- Si ya habías empezado una misión (hiciste una entrega, te aprobaron un enigma o usaste una pista), no se te cierra aunque después le pongan un requisito.

Mientras está bloqueada no puedes ver su historia, sus enigmas ni sus documentos, ni usar sus pistas. Si llegas a ella desde un enlace, verás **Aún no puedes empezar esta misión** y, si la que te falta ya está abierta, un botón para ir a ella.

## Bloqueada por tu docente

Si tiene candado pero no dice qué la abre, la ha cerrado tu docente por ahora, para toda la clase: a lo mejor aún la está preparando. Al pulsarla verás **Tu docente ha cerrado esta misión por ahora. Podrás entrar cuando la abra.** Aquí no tienes que hacer nada: espera a que la abra.

A veces pasan las dos cosas a la vez: la misión que te falta también la tiene cerrada tu docente. Entonces verás, por ejemplo, **Se abre al completar «A» (bloqueada por tu docente por ahora)**, y hasta que tu docente abra «A» no puedes seguir por ese camino. Si crees que es un error, pregúntale.

## Cómo leer el mapa

En la pestaña **Misiones** de tu clase, la vista **Mapa** enseña tus misiones como un tablero, de la **Salida** a la **Meta**. Una carretera las une y el tramo que ya has recorrido se ilumina.

- Arriba ves lo que llevas, por ejemplo **Has completado 3 de 8 misiones**, con tu barra.
- **Estás aquí**, con tu avatar, marca la misión en la que vas. El botón **Ir a mi misión** te lleva hasta ella.
- Cada misión lleva un icono con su estado. En la **Leyenda**, debajo del mapa, ves qué es cada uno: **Completada**, **En curso**, **Disponible**, **Urgente** (vence pronto), **Expirada** o **Bloqueada**.
- Pulsa un estado de la **Leyenda** para resaltar sus misiones: por ejemplo, **Disponible** te enseña las que puedes empezar ya. Vuelve a pulsarlo para quitarlo.
- Con el teclado, las flechas te llevan de una misión a la siguiente. Si usas lector de pantalla, en una misión bloqueada oirás también el motivo: **Bloqueada: se abre al completar «…»** o **Bloqueada por tu docente por ahora**.

Al pulsar una misión se abre su **detalle**: lo que da, cuánto llevas, su fecha límite, qué hay que completar para abrirla y qué abre ella. Si está abierta, tiene el botón para **Empezar**, **Continuar** o **Ver misión**. Si está bloqueada, en vez del botón te dice qué te falta, en **Para abrirla, completa antes**, o que la ha cerrado tu docente.

El mapa está **en pruebas** (pone **Beta**), así que puede cambiar un poco. Si lo prefieres, también puedes ver tus misiones en **Cuadrícula** o en **Lista**.$itakai$, "updated_at" = CURRENT_TIMESTAMP
FROM "help_categories" c
WHERE c."id" = a."category_id" AND c."slug" = $itakai$si-eres-alumno$itakai$ AND a."locale" = 'es'
  AND a."slug" = $itakai$el-mapa-y-las-misiones-cerradas$itakai$
  AND a."body" = $itakai$A veces una misión sale con un **candado** y como **Bloqueada**: todavía no puedes entrar en ella. Puede ser por dos motivos, y la propia misión te dice cuál.

## Se abre al completar otra

Si tu clase usa el **mapa de misiones**, tu docente puede preparar un camino: unas misiones se abren al completar otras, como los niveles de un juego. En las tarjetas, esas misiones dicen **Se abre al completar «…»**, con el nombre de la que te falta. Si salen dos o tres, tienes que completarlas **todas**.

- Una misión está completada cuando tu docente te ha aprobado todos sus enigmas. Los que pone **Opcional** no hacen falta.
- En cuanto completas lo que pide, la misión se te abre sola. No tienes que pedir nada.
- Cada persona va a su ritmo: se te abre cuando tú completas lo que pide, aunque al resto de la clase todavía no.
- Si la misión que te falta ya ha pasado su fecha, o no tiene enigmas, no te cierra nada: la siguiente se abre igualmente.
- Si ya habías empezado una misión (hiciste una entrega, te aprobaron un enigma o usaste una pista), no se te cierra aunque después le pongan un requisito.

Mientras está bloqueada no puedes ver su historia, sus enigmas ni sus documentos, ni usar sus pistas. Si llegas a ella desde un enlace, verás **Aún no puedes empezar esta misión** y, si la que te falta ya está abierta, un botón para ir a ella.

## Cerrada por tu docente

Si tiene candado pero no dice qué la abre, la ha cerrado tu docente por ahora, para toda la clase: a lo mejor aún la está preparando. Al pulsarla verás **Tu docente ha cerrado esta misión por ahora. Podrás entrar cuando la abra.** Aquí no tienes que hacer nada: espera a que la abra.

A veces pasan las dos cosas a la vez: la misión que te falta también la tiene cerrada tu docente. Entonces verás, por ejemplo, **Se abre al completar «A» (cerrada por tu docente por ahora)**, y hasta que tu docente abra «A» no puedes seguir por ese camino. Si crees que es un error, pregúntale.

## Cómo leer el mapa

En la pestaña **Misiones** de tu clase, la vista **Mapa** enseña tus misiones como un tablero, de la **Salida** a la **Meta**. Una carretera las une y el tramo que ya has recorrido se ilumina.

- Arriba ves lo que llevas, por ejemplo **Has completado 3 de 8 misiones**, con tu barra.
- **Estás aquí**, con tu avatar, marca la misión en la que vas. El botón **Ir a mi misión** te lleva hasta ella.
- Cada misión lleva un icono con su estado. En la **Leyenda**, debajo del mapa, ves qué es cada uno: **Completada**, **En curso**, **Disponible**, **Urgente** (vence pronto), **Expirada** o **Bloqueada**.
- Pulsa un estado de la **Leyenda** para resaltar sus misiones: por ejemplo, **Disponible** te enseña las que puedes empezar ya. Vuelve a pulsarlo para quitarlo.
- Con el teclado, las flechas te llevan de una misión a la siguiente. Si usas lector de pantalla, en una misión bloqueada oirás también el motivo: **Bloqueada: se abre al completar «…»** o **Bloqueada: cerrada por tu docente por ahora**.

Al pulsar una misión se abre su **detalle**: lo que da, cuánto llevas, su fecha límite, qué hay que completar para abrirla y qué abre ella. Si está abierta, tiene el botón para **Empezar**, **Continuar** o **Ver misión**. Si está bloqueada, en vez del botón te dice qué te falta, en **Para abrirla, completa antes**, o que la ha cerrado tu docente.

El mapa está **en pruebas** (pone **Beta**), así que puede cambiar un poco. Si lo prefieres, también puedes ver tus misiones en **Cuadrícula** o en **Lista**.$itakai$;

-- cuando-algo-falla/las-recompensas-no-cuadran: dónde se ve lo cobrado ahora (la actividad ya no lleva la XP, y la ficha no tiene los saldos).
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

- En la pestaña **Historial** de la clase, con el tipo **Entregas**, cada aprobación con quién la hizo y con qué porcentaje. Si la clase es compartida, puede que la aprobara otra persona del profesorado.
- En la página de cada estudiante en la clase (pulsa su nombre en la pestaña **Alumnado**), cada misión dice lo que ha cobrado con sus enigmas y, al desplegar **% por enigma**, con qué porcentaje se aprobó cada uno y cuándo. Su **Historial** tiene además los comportamientos y las recompensas que se le han aplicado, con lo que movió cada uno.
- En la pestaña **Alumnado** de la clase, el listado tiene el saldo de cada estudiante: su experiencia, sus monedas y su maná.

Lo cobrado en cada misión no lleva el bonus por completarla; el saldo, sí.$itakai$, "updated_at" = CURRENT_TIMESTAMP
FROM "help_categories" c
WHERE c."id" = a."category_id" AND c."slug" = $itakai$cuando-algo-falla$itakai$ AND a."locale" = 'es'
  AND a."slug" = $itakai$las-recompensas-no-cuadran$itakai$
  AND a."body" = $itakai$Casi siempre es que se está mirando el número de la misión y cobrando el del enigma, o al revés.

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

Las monedas y el maná de cada entrega no aparecen sueltos en esas listas; el saldo de la clase, sí.$itakai$;

-- alumnado/pasar-lista-y-consultar-la-asistencia: la asistencia de cada estudiante está ahora en su página de la clase, y la pestaña se llama «Alumnado».
UPDATE "help_articles" a
SET "body" = $itakai$Pasar lista lleva un minuto: **todo el alumnado sale presente** y solo marcas a quien falta. Lo tienes en la pestaña **Alumnado** de la clase, en el apartado **Asistencia**.

## Pasar lista

1. Abre **Alumnado** y pulsa **Asistencia**.
2. Arriba están la **fecha** (hoy) y la **sesión**. Si la clase tiene horario (en **Ajustes**) y hoy toca, se propone su tramo con la hora; si no hay horario o hoy no hay clase, sale **Sesión sin horario**.
3. En cada fila, cambia el estado de quien no está: **Ausente**, **Retraso** o **Justificada**. El resto se queda en **Presente**.
4. Pulsa **Guardar lista**.

La sesión se crea al guardar, nunca antes. Si guardas otra vez la misma sesión, se corrige la lista: no se duplica. Si pasaste lista por error, **Borrar esta lista** la quita entera.

Para pasar lista de otro día, o corregirla, cambia la fecha. Las cuentas sin correo que aún no han entrado también salen en la lista.

## Aplicar a los presentes o a los ausentes

Con la lista guardada aparecen **Aplicar a los presentes…** y **Aplicar a los ausentes…**. Abren la misma ventana que la [aplicación a varios estudiantes](/ayuda/gamificacion/aplicar-a-varios-estudiantes), con la selección ya hecha: eliges un comportamiento o una recompensa libre, revisas el resumen y pulsas **Aplicar**. En **los ausentes** van elegidos solo los de **Ausente**: las faltas **justificadas** salen en la lista con su estado, pero sin marcar.

**Pasar lista nunca quita ni da nada por sí solo.** Premiar la asistencia o penalizar una falta es siempre una acción aparte, que decides y confirmas tú.

## El histórico

En **Histórico** ves la asistencia de cada mes: por estudiante, cuántas sesiones, cuántas faltas, retrasos y justificadas, y su porcentaje (presente o con retraso, sobre las sesiones en las que consta), con su estado en cada sesión. El calendario marca los días con lista; pulsa uno para abrirlo y corregirlo. En la página de cada estudiante en la clase tienes además su asistencia del periodo que elijas y, en su **Historial**, cada sesión.

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

Quien está **ausente** o con falta **justificada** en la última lista de hoy queda fuera de la [ruleta](/ayuda/gamificacion/usar-la-ruleta-en-clase) y de los [equipos al azar](/ayuda/alumnado/formar-equipos), sin que tengas que hacer nada. En la ventana de aplicar a varios estudiantes tienes también **Solo presentes hoy** y **Solo ausentes hoy**.$itakai$;

-- gamificacion/comportamientos-y-puntos-de-vida: lo aplicado a cada estudiante está en su página de la clase, y la pestaña se llama «Alumnado».
UPDATE "help_articles" a
SET "body" = $itakai$Los comportamientos son la forma de que lo que ocurre en el aula —para bien y para mal— tenga efecto en la partida.


![Ejemplos de comportamientos que suman puntos de vida y de comportamientos que los restan.](/app/ayuda/diagramas/vidas.svg)
## Cómo funcionan

Defines una lista de comportamientos para tu clase. Cada uno tiene un nombre, si es **positivo o negativo**, y cuánto mueve de cada recurso: experiencia, monedas, maná y puntos de vida (de los que la clase tenga activados). Para aplicarlo, pulsa su tarjeta en la pestaña **Comportamientos**, marca a quién —una persona, varias o toda la clase— y pulsa **Aplicar**: junto al botón ves antes el resumen. Crearlos y aplicarlos pide acceso de edición en la clase.

También puedes elegir estudiantes en la pestaña **Alumnado** y darles una recompensa libre con su motivo, sin pasar por el catálogo: lo tienes en [Aplicar comportamientos y recompensas a varios estudiantes](/ayuda/gamificacion/aplicar-a-varios-estudiantes).

Ejemplos que suelen funcionar: "ayuda a alguien de clase" (+15 XP, +5 monedas), "trae el material" (+10 XP), "interrumpe la clase" (−10 puntos de vida).

## Los puntos de vida

Cada estudiante empieza con 100 y se mueven solo con los comportamientos y las recompensas libres. No bloquean nada por sí solos: son un termómetro visible, y lo que hagas cuando alguien baje mucho es cosa tuya. Hay docentes que montan un poder en la tienda para recuperarlos, y así el sistema se cierra sobre sí mismo.

## Consejos de uso

- **Pocos y claros.** Con seis u ocho comportamientos bien elegidos se cubre casi todo el curso.
- **Que se vea.** Aplicarlo en el momento y en voz alta es la mitad del efecto.
- **Cuidado con lo negativo.** Un sistema que solo resta se convierte en un castigo con otro nombre.

## El registro

Todo lo aplicado queda con fecha, con quién lo aplicó y sobre quién. Lo ves en la pestaña **Historial** de la clase, con el tipo **Comportamientos** ([el historial de la clase](/ayuda/clases/el-historial-de-la-clase)), y en el **Historial** de la página de cada estudiante en la clase. Cada estudiante también ve en su actividad quién se lo aplicó.$itakai$, "updated_at" = CURRENT_TIMESTAMP
FROM "help_categories" c
WHERE c."id" = a."category_id" AND c."slug" = $itakai$gamificacion$itakai$ AND a."locale" = 'es'
  AND a."slug" = $itakai$comportamientos-y-puntos-de-vida$itakai$
  AND a."body" = $itakai$Los comportamientos son la forma de que lo que ocurre en el aula —para bien y para mal— tenga efecto en la partida.


![Ejemplos de comportamientos que suman puntos de vida y de comportamientos que los restan.](/app/ayuda/diagramas/vidas.svg)
## Cómo funcionan

Defines una lista de comportamientos para tu clase. Cada uno tiene un nombre, si es **positivo o negativo**, y cuánto mueve de cada recurso: experiencia, monedas, maná y puntos de vida (de los que la clase tenga activados). Para aplicarlo, pulsa su tarjeta en la pestaña **Comportamientos**, marca a quién —una persona, varias o toda la clase— y pulsa **Aplicar**: junto al botón ves antes el resumen. Crearlos y aplicarlos pide acceso de edición en la clase.

También puedes elegir estudiantes en la pestaña **Alumnos** y darles una recompensa libre con su motivo, sin pasar por el catálogo: lo tienes en [Aplicar comportamientos y recompensas a varios estudiantes](/ayuda/gamificacion/aplicar-a-varios-estudiantes).

Ejemplos que suelen funcionar: "ayuda a alguien de clase" (+15 XP, +5 monedas), "trae el material" (+10 XP), "interrumpe la clase" (−10 puntos de vida).

## Los puntos de vida

Cada estudiante empieza con 100 y se mueven solo con los comportamientos y las recompensas libres. No bloquean nada por sí solos: son un termómetro visible, y lo que hagas cuando alguien baje mucho es cosa tuya. Hay docentes que montan un poder en la tienda para recuperarlos, y así el sistema se cierra sobre sí mismo.

## Consejos de uso

- **Pocos y claros.** Con seis u ocho comportamientos bien elegidos se cubre casi todo el curso.
- **Que se vea.** Aplicarlo en el momento y en voz alta es la mitad del efecto.
- **Cuidado con lo negativo.** Un sistema que solo resta se convierte en un castigo con otro nombre.

## El registro

Todo lo aplicado queda con fecha, con quién lo aplicó y sobre quién. Lo ves en la pestaña **Historial** de la clase, con el tipo **Comportamientos** ([el historial de la clase](/ayuda/clases/el-historial-de-la-clase)), y en la ficha de cada estudiante, que también ve en su actividad quién se lo aplicó.$itakai$;

-- gamificacion/niveles-y-rangos: el color del rango, en la página de cada estudiante en la clase.
UPDATE "help_articles" a
SET "body" = $itakai$El nivel es la traducción de la experiencia acumulada en un número visible, y el rango es el título que lo acompaña.


![La barra de experiencia con sus niveles: al alcanzar ciertos niveles cambia el rango de cada estudiante.](/app/ayuda/diagramas/xp-nivel.svg)
## Los rangos por defecto

| Niveles | Título |
|---|---|
| 1 – 4 | Mortal |
| 5 – 9 | Héroe Novato |
| 10 – 19 | Héroe |
| 20 – 29 | Semidiós |
| 30 – 50 | Dios del Olimpo |

Cada rango tiene su color, que es el que se ve en la clasificación y en la página de cada estudiante en la clase.

## Cambiarlos en tu clase

Desde *Ajustes → Niveles* puedes tocar tanto los umbrales de experiencia como los tramos y los títulos. Si tu narrativa no es mitológica, cambiar "Semidiós" por lo que encaje en tu historia es de las cosas que más se notan por poco esfuerzo.

## Cuánta experiencia hace falta

Los umbrales suben progresivamente: los primeros niveles caen rápido y los últimos cuestan. Es a propósito, para que el arranque enganche y el final tenga recorrido durante todo el curso.

Si al mes de empezar tu grupo ya está en nivel 20, es señal de que las recompensas de los enigmas van altas para el ritmo de tu clase. Puedes subir los umbrales sin tocar las misiones.

## Al subir de nivel

El alumnado ve una animación de subida de nivel al entrar. Si prefieres una clase más sobria, en el perfil de cada cuenta se pueden [reducir las animaciones](/ayuda/tu-cuenta/accesibilidad).$itakai$, "updated_at" = CURRENT_TIMESTAMP
FROM "help_categories" c
WHERE c."id" = a."category_id" AND c."slug" = $itakai$gamificacion$itakai$ AND a."locale" = 'es'
  AND a."slug" = $itakai$niveles-y-rangos$itakai$
  AND a."body" = $itakai$El nivel es la traducción de la experiencia acumulada en un número visible, y el rango es el título que lo acompaña.


![La barra de experiencia con sus niveles: al alcanzar ciertos niveles cambia el rango de cada estudiante.](/app/ayuda/diagramas/xp-nivel.svg)
## Los rangos por defecto

| Niveles | Título |
|---|---|
| 1 – 4 | Mortal |
| 5 – 9 | Héroe Novato |
| 10 – 19 | Héroe |
| 20 – 29 | Semidiós |
| 30 – 50 | Dios del Olimpo |

Cada rango tiene su color, que es el que se ve en la clasificación y en la ficha de cada estudiante.

## Cambiarlos en tu clase

Desde *Ajustes → Niveles* puedes tocar tanto los umbrales de experiencia como los tramos y los títulos. Si tu narrativa no es mitológica, cambiar "Semidiós" por lo que encaje en tu historia es de las cosas que más se notan por poco esfuerzo.

## Cuánta experiencia hace falta

Los umbrales suben progresivamente: los primeros niveles caen rápido y los últimos cuestan. Es a propósito, para que el arranque enganche y el final tenga recorrido durante todo el curso.

Si al mes de empezar tu grupo ya está en nivel 20, es señal de que las recompensas de los enigmas van altas para el ritmo de tu clase. Puedes subir los umbrales sin tocar las misiones.

## Al subir de nivel

El alumnado ve una animación de subida de nivel al entrar. Si prefieres una clase más sobria, en el perfil de cada cuenta se pueden [reducir las animaciones](/ayuda/tu-cuenta/accesibilidad).$itakai$;

-- gamificacion/aplicar-a-varios-estudiantes: la pestaña se llama «Alumnado».
UPDATE "help_articles" a
SET "body" = $itakai$Puedes aplicar un comportamiento, o dar una recompensa, a varios estudiantes de una vez. **Antes de aplicar ves siempre el resumen**: junto al botón **Aplicar** pone qué se aplica, a cuántas personas y cuánto mueve de cada recurso. Nada se aplica hasta que lo pulsas.

## Desde la pestaña **Comportamientos**

1. Pulsa la tarjeta del comportamiento.
2. Marca a quién se lo aplicas: uno, varios, **Todos** o, si ya has pasado lista hoy, **Solo presentes hoy** o **Solo ausentes hoy**. Con muchas personas tienes un buscador.
3. Revisa el resumen que sale junto al botón —por ejemplo, «Aplicar "Participa" a 12 estudiantes. Por estudiante: +10 XP, +5 monedas»— y pulsa **Aplicar**.

## Desde la pestaña **Alumnado**

En el **Listado**, marca las casillas de las personas que quieras (la de la cabecera marca a todas las que se ven). Abajo aparece una barra con cuántas has elegido y dos botones: **Aplicar comportamiento** y **Dar recompensa**. Llevan a la misma ventana, con tu selección.

## Recompensas libres

A veces lo que quieres premiar, o corregir, no está en el catálogo. Con **Dar recompensa** eliges **Dar** o **Quitar**, cuánto de cada recurso —experiencia, monedas, maná o puntos de vida, solo los que la clase tiene activados— y escribes un **motivo**, que es lo que verá cada estudiante en su actividad. Al quitar, ningún saldo baja de cero.

Las recompensas libres no cuentan en el «+N / −N» de comportamientos del listado.

## Todo o nada

Lo que aplicas a varios se aplica a todos o a ninguno: si algo falla, no cambia ningún saldo y puedes volver a intentarlo. Si alguien cruza un umbral de experiencia, recibe su insignia en el momento.

## En el historial

En el [historial de la clase](/ayuda/clases/el-historial-de-la-clase), lo aplicado a varios de una vez sale en una sola línea —«aplicó "Participa" a 12 estudiantes»— que se despliega para ver a quién. Cada estudiante lo ve en su actividad, con quién se lo aplicó.

## Quién puede

Aplicar comportamientos y dar recompensas pide acceso de **edición** en la clase. En una clase archivada no se aplica nada.$itakai$, "updated_at" = CURRENT_TIMESTAMP
FROM "help_categories" c
WHERE c."id" = a."category_id" AND c."slug" = $itakai$gamificacion$itakai$ AND a."locale" = 'es'
  AND a."slug" = $itakai$aplicar-a-varios-estudiantes$itakai$
  AND a."body" = $itakai$Puedes aplicar un comportamiento, o dar una recompensa, a varios estudiantes de una vez. **Antes de aplicar ves siempre el resumen**: junto al botón **Aplicar** pone qué se aplica, a cuántas personas y cuánto mueve de cada recurso. Nada se aplica hasta que lo pulsas.

## Desde la pestaña **Comportamientos**

1. Pulsa la tarjeta del comportamiento.
2. Marca a quién se lo aplicas: uno, varios, **Todos** o, si ya has pasado lista hoy, **Solo presentes hoy** o **Solo ausentes hoy**. Con muchas personas tienes un buscador.
3. Revisa el resumen que sale junto al botón —por ejemplo, «Aplicar "Participa" a 12 estudiantes. Por estudiante: +10 XP, +5 monedas»— y pulsa **Aplicar**.

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

Aplicar comportamientos y dar recompensas pide acceso de **edición** en la clase. En una clase archivada no se aplica nada.$itakai$;

-- alumnado/formar-equipos: la pestaña se llama «Alumnado».
UPDATE "help_articles" a
SET "body" = $itakai$Los equipos están en la pestaña **Alumnado** de la clase, en el apartado **Equipos**. Puedes tener varias formas de repartir la clase a la vez: cada una es una **agrupación**.

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

Formar, cambiar, archivar y borrar equipos es de quien tiene **edición** en la clase (titular y sustitución, por defecto). Con **lectura** (prácticas) se ven los equipos, pero no se cambian. Las cuentas sin correo que aún no han entrado también se pueden poner en un equipo.$itakai$, "updated_at" = CURRENT_TIMESTAMP
FROM "help_categories" c
WHERE c."id" = a."category_id" AND c."slug" = $itakai$alumnado$itakai$ AND a."locale" = 'es'
  AND a."slug" = $itakai$formar-equipos$itakai$
  AND a."body" = $itakai$Los equipos están en la pestaña **Alumnos** de la clase, en el apartado **Equipos**. Puedes tener varias formas de repartir la clase a la vez: cada una es una **agrupación**.

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

Formar, cambiar, archivar y borrar equipos es de quien tiene **edición** en la clase (titular y sustitución, por defecto). Con **lectura** (prácticas) se ven los equipos, pero no se cambian. Las cuentas sin correo que aún no han entrado también se pueden poner en un equipo.$itakai$;

-- clases/niveles-y-perfiles-del-profesorado: la analítica es de lectura, y el ranking va con los ajustes.
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

**Lectura.** Ve la clase entera —misiones, alumnado, asistencia, equipos, entregas, tienda, comportamientos, profesorado, historial y la [analítica](/ayuda/alumnado/la-analitica-de-la-clase) del **Resumen**— sin cambiar nada. Puede usar la [ruleta](/ayuda/gamificacion/usar-la-ruleta-en-clase), descargar las entregas, duplicar la clase y salir de ella. No recibe los avisos de entregas nuevas.

**Edición.** Además, cambia el contenido: la historia, la guía, el nombre, el horario y la portada de la clase; crea y edita misiones, enigmas y documentos; lleva la tienda y los comportamientos, y los aplica; da recompensas libres; [pasa lista](/ayuda/alumnado/pasar-lista-y-consultar-la-asistencia) y descarga la asistencia; forma equipos y los premia; aprueba entregas, gestiona las insignias vinculadas a las misiones de la clase y [devuelve al catálogo](/ayuda/alumnado/avatares-y-alias-por-clase) el avatar de un estudiante que no es adecuado. Le llega un aviso con cada entrega nueva.

**Administración.** Además, cambia los ajustes —funcionalidades (también las opciones del ranking y sus temporadas), niveles, y la asignatura, el nivel educativo, el idioma y la provincia de *Datos generales*—, invita al alumnado, crea sus cuentas y las gestiona: restablece contraseñas, cambia alias y quita estudiantes de la clase. También lleva el profesorado y archiva la clase.

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

**Edición.** Además, cambia el contenido: la historia, la guía, el nombre, el horario y la portada de la clase; crea y edita misiones, enigmas y documentos; lleva la tienda y los comportamientos, y los aplica; da recompensas libres; [pasa lista](/ayuda/alumnado/pasar-lista-y-consultar-la-asistencia) y descarga la asistencia; forma equipos y los premia; aprueba entregas, gestiona las insignias vinculadas a las misiones de la clase y [devuelve al catálogo](/ayuda/alumnado/avatares-y-alias-por-clase) el avatar de un estudiante que no es adecuado. Le llega un aviso con cada entrega nueva.

**Administración.** Además, cambia los ajustes —funcionalidades, niveles, y la asignatura, el nivel educativo, el idioma y la provincia de *Datos generales*—, invita al alumnado, crea sus cuentas y las gestiona: restablece contraseñas, cambia alias y quita estudiantes de la clase. También lleva el profesorado y archiva la clase.

## La propiedad de la clase

Cada clase tiene una persona **propietaria**, al principio quien la creó. Tiene administración y es la única que puede [publicarla como plantilla](/ayuda/clases/publicar-tu-clase-como-plantilla) y [pasar la propiedad](/ayuda/clases/traspasar-una-clase) a otra persona. Nadie le puede cambiar el nivel ni quitarla de la clase, y no puede salir sin pasarla antes.

## Qué ves según tu nivel

Cada pantalla de la clase enseña solo lo que tu nivel permite: sin edición no aparece **Nueva Misión**, y sin administración no aparece **Invitar**. Donde puedes mirar pero no cambiar nada, verás el aviso «Tu acceso a esta clase te deja ver esto, pero no cambiarlo».

Si alguien te cambia el nivel, te llega un aviso, y la clase se pone al día en cuanto abres el aviso.$itakai$;

-- clases/el-historial-de-la-clase: las temporadas del ranking.
UPDATE "help_articles" a
SET "body" = $itakai$La pestaña **Historial** de la clase cuenta qué ha hecho el profesorado en ella: quién, qué y cuándo. Es lo más útil cuando la clase es compartida y alguien pregunta quién cambió algo. La ve todo el profesorado de la clase, sea cual sea su nivel.

## Qué aparece

Todo lo relevante que hace el profesorado, con su autoría: cada línea lleva el nombre y el [avatar](/ayuda/tu-cuenta/tu-avatar-de-docente) de quien lo hizo.

- **Entregas**: cada aprobación, con quien entregó, el enigma y el porcentaje.
- **Comportamientos**: los que se aplican, a quién, y los que se crean, se editan o se borran. Lo aplicado a varios estudiantes de una vez sale en una sola línea, que se despliega para ver a quién.
- **Recompensas**: las recompensas libres, con su motivo y a quién.
- **Asistencia**: cada lista que se pasa, se corrige o se borra, con la fecha y cuántas personas vinieron y cuántas no.
- **Equipos**: las agrupaciones que se crean, se editan, se archivan o se borran, los cambios de equipo y cada premio a un equipo, con sus puntos y, si se repartió, a quién.
- **Misiones**, **Enigmas**, **Pistas** y **Documentos**: altas, cambios, borrados, bloqueos, cambios de recompensas, cambios de [orden](/ayuda/misiones/el-orden-de-las-misiones) y cambios en el [camino del mapa](/ayuda/misiones/montar-el-camino-del-mapa), y las misiones [importadas de otra clase](/ayuda/misiones/importar-una-mision-de-otra-clase) o copiadas en otra.
- **Tienda**: artículos añadidos, editados o quitados.
- **Alumnado**: cuentas creadas, contraseñas restablecidas, alias cambiados, avatares devueltos al catálogo y bajas de la clase.
- **Profesorado**: altas, cambios de perfil o de nivel, bajas y salidas.
- **Clase**: cambios de datos y de ajustes, la guía, archivar y desarchivar, publicar como plantilla, duplicar, los cambios de propiedad y cada temporada del ranking que se empieza.

Lo que hace el alumnado por su cuenta —entregar, usar una pista, comprar en la tienda— no sale aquí: lo ves en la misión y en la tienda.

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

Todo lo relevante que hace el profesorado, con su autoría: cada línea lleva el nombre y el [avatar](/ayuda/tu-cuenta/tu-avatar-de-docente) de quien lo hizo.

- **Entregas**: cada aprobación, con quien entregó, el enigma y el porcentaje.
- **Comportamientos**: los que se aplican, a quién, y los que se crean, se editan o se borran. Lo aplicado a varios estudiantes de una vez sale en una sola línea, que se despliega para ver a quién.
- **Recompensas**: las recompensas libres, con su motivo y a quién.
- **Asistencia**: cada lista que se pasa, se corrige o se borra, con la fecha y cuántas personas vinieron y cuántas no.
- **Equipos**: las agrupaciones que se crean, se editan, se archivan o se borran, los cambios de equipo y cada premio a un equipo, con sus puntos y, si se repartió, a quién.
- **Misiones**, **Enigmas**, **Pistas** y **Documentos**: altas, cambios, borrados, bloqueos, cambios de recompensas, cambios de [orden](/ayuda/misiones/el-orden-de-las-misiones) y cambios en el [camino del mapa](/ayuda/misiones/montar-el-camino-del-mapa), y las misiones [importadas de otra clase](/ayuda/misiones/importar-una-mision-de-otra-clase) o copiadas en otra.
- **Tienda**: artículos añadidos, editados o quitados.
- **Alumnado**: cuentas creadas, contraseñas restablecidas, alias cambiados, avatares devueltos al catálogo y bajas de la clase.
- **Profesorado**: altas, cambios de perfil o de nivel, bajas y salidas.
- **Clase**: cambios de datos y de ajustes, la guía, archivar y desarchivar, publicar como plantilla, duplicar y los cambios de propiedad.

Lo que hace el alumnado por su cuenta —entregar, usar una pista, comprar en la tienda— no sale aquí: lo ves en la misión y en la tienda.

## Filtrar

Arriba tienes dos filtros: **Docente**, para ver solo lo de una persona (**Todo el profesorado** lo junta todo), y **Tipo**, para quedarte con un tipo de cosa, como **Entregas** o **Alumnado**. Lo más reciente sale primero, y la lista va por páginas.

## Cuentas y estudiantes que ya no están

Si se borró la cuenta de quien hizo algo, la línea conserva el nombre y el avatar que tenía al hacerlo. Si quien aparece ya no está en la clase, no se muestra su nombre: la línea dice que era alguien del alumnado que ya no está en la clase.

## Lo que ve el alumnado

El alumnado no ve el historial, pero en su actividad ve quién le aprobó cada entrega y quién le aplicó cada comportamiento, con su avatar.$itakai$;
