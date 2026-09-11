/**
 * Contenido inicial del centro de ayuda (Fase 3, punto 17).
 *
 * Está escrito leyendo el comportamiento real de la plataforma, no un documento
 * de intenciones: los números (bonus por rareza, umbrales, límites) salen del
 * código. Vive en el repositorio a propósito, para que un cambio de producto y
 * su documentación puedan viajar en el mismo commit.
 *
 * Lo carga `prisma/seed-help.ts`, que es idempotente: se puede volver a pasar
 * sin duplicar nada y respeta lo que se haya editado después desde el panel.
 */

export interface SeedCategory {
  slug: string
  name: string
  description: string
  icon: string
  accent: string
}

export interface SeedArticle {
  category: string
  slug: string
  title: string
  summary: string
  /**
   * Ilustración de portada, en `app/public/app/ayuda`. Son esquemas de la
   * propia interfaz dibujados con la paleta de marca y **sin texto dentro**,
   * así que sirven igual en los diez idiomas de la plataforma.
   */
  cover: string
  featured?: boolean
  body: string
}

export const HELP_CATEGORIES: SeedCategory[] = [
  {
    slug: 'primeros-pasos',
    name: 'Primeros pasos',
    description: 'Lo mínimo para tener tu primera clase funcionando.',
    icon: 'primeros-pasos',
    accent: 'ia',
  },
  {
    slug: 'clases',
    name: 'Clases',
    description: 'Crear, configurar, duplicar y compartir clases.',
    icon: 'clases',
    accent: 'stats',
  },
  {
    slug: 'misiones',
    name: 'Misiones y enigmas',
    description: 'El contenido: misiones, enigmas, entregas y revisión.',
    icon: 'misiones',
    accent: 'clases',
  },
  {
    slug: 'gamificacion',
    name: 'Gamificación',
    description: 'XP, monedas, maná, vidas, insignias, niveles y tienda.',
    icon: 'gamificacion',
    accent: 'pending',
  },
  {
    slug: 'alumnado',
    name: 'Alumnado',
    description: 'Cómo lo ve el alumno y cómo se gestiona.',
    icon: 'alumnado',
    accent: 'ia',
  },
  {
    slug: 'ia-y-configuracion',
    name: 'IA y configuración',
    description: 'Atenea, proveedores de inteligencia artificial y almacenamiento.',
    icon: 'ia-y-configuracion',
    accent: 'stats',
  },
  {
    slug: 'tu-cuenta',
    name: 'Tu cuenta',
    description: 'Accesibilidad, avisos y seguridad de tu perfil.',
    icon: 'tu-cuenta',
    accent: 'clases',
  },
  {
    slug: 'si-eres-alumno',
    name: 'Si eres alumno',
    description: 'Lo que necesitas saber tú, no tu profesor.',
    icon: 'si-eres-alumno',
    accent: 'pending',
  },
  {
    slug: 'cuando-algo-falla',
    name: 'Cuando algo falla',
    description: 'Lo que suele pasar y cómo se arregla.',
    icon: 'cuando-algo-falla',
    accent: 'ia',
  },
]

export const HELP_ARTICLES: SeedArticle[] = [
  // ==================== PRIMEROS PASOS ====================
  {
    category: 'primeros-pasos',
    slug: 'que-es-itakai',
    cover: '/app/ayuda/recorrido.svg',
    title: 'Qué es ITAKAI y cómo funciona',
    summary: 'La idea en cinco minutos: clases con historia, misiones que se entregan y recursos que se ganan.',
    featured: true,
    body: `ITAKAI convierte una asignatura en una aventura. Tú creas una **clase**, le pones una historia, y el temario se reparte en **misiones** que los alumnos completan entregando trabajo. Cada entrega que revisas reparte recursos, y esos recursos suben de nivel, compran cosas en la tienda de clase y aparecen en la clasificación.

## Las tres piezas

**La clase** es el contenedor: tus alumnos, tu narrativa y las reglas del juego. Decides qué recursos usa —puedes tener una clase solo con experiencia, o con monedas y tienda, o con todo— y esa decisión se puede cambiar en cualquier momento.

**Las misiones** son las unidades de trabajo. Cada una tiene una rareza, opcionalmente una fecha de entrega, y por dentro se divide en **enigmas**: los pasos concretos que el alumno resuelve uno a uno. El enigma es lo que se entrega y lo que se puntúa.

**Los recursos** son lo que el alumno gana. La experiencia hace subir de nivel, las monedas se gastan en la tienda que tú montas, el maná paga poderes y los puntos de vida suben o bajan con los comportamientos que registras en clase.

## Quién es quién

- **Profesorado**: crea clases, escribe misiones, revisa entregas y gestiona la tienda y los comportamientos.
- **Alumnado**: se une con un código, resuelve enigmas, gasta lo que gana y ve su progreso.
- **Administración**: gestiona la instancia completa — usuarios, centros, inteligencia artificial y almacenamiento.

## Por dónde empezar

Si es tu primera vez, el camino corto es: [crear una clase](/ayuda/primeros-pasos/crear-tu-primera-clase), [invitar a tus alumnos](/ayuda/primeros-pasos/invitar-alumnos-a-una-clase) y [escribir tu primera misión](/ayuda/misiones/crear-una-mision). Con eso ya tienes una clase viva; el resto se añade cuando lo necesites.`,
  },
  {
    category: 'primeros-pasos',
    slug: 'crear-tu-primera-clase',
    cover: '/app/ayuda/clase-nueva.svg',
    title: 'Crear tu primera clase',
    summary: 'El asistente de creación, paso a paso, y qué decisiones puedes cambiar después.',
    featured: true,
    body: `Desde **Mis clases**, el botón *Crear clase* abre un asistente que te va preguntando por partes. Ninguna decisión es definitiva: todo lo que eliges aquí se puede cambiar luego desde los ajustes de la clase.

## Lo que te va a preguntar

**Nombre y datos.** El nombre es lo que verán tus alumnos. Los datos —asignatura, nivel, idioma y provincia— sirven para que otros docentes encuentren tu clase si algún día la publicas como plantilla, y no afectan a nada más.

**La narrativa.** Es la historia que envuelve la asignatura. Puedes escribirla tú o pedirle a la inteligencia artificial que te la proponga a partir de una idea suelta. No es decoración: las misiones que escribas después se apoyan en ella.

**Los recursos.** Aquí decides con qué juega tu clase: experiencia, monedas, maná, puntos de vida, tienda, insignias y niveles. Empieza con poco. Una clase con experiencia y misiones ya funciona, y añadir monedas más adelante no cuesta nada.

**El horario.** Si quieres que la plataforma sepa cuándo tienes esa clase, puedes definir las sesiones. Es opcional.

## Cuando termina

La clase se crea con un **código** de seis caracteres. Ese código es lo que le das a tus alumnos para que se unan; lo tienes siempre a mano en la cabecera de la clase.

> Si te has quedado a medias, no pasa nada: el asistente muestra al final una maqueta de cómo va a quedar la clase antes de crearla de verdad.

## Y ahora

Lo siguiente es [meter a tus alumnos](/ayuda/primeros-pasos/invitar-alumnos-a-una-clase) y [escribir la primera misión](/ayuda/misiones/crear-una-mision). Si prefieres no partir de cero, puedes [empezar desde una plantilla publicada por otro docente](/ayuda/clases/crear-una-clase-desde-cero-o-desde-una-plantilla).`,
  },
  {
    category: 'primeros-pasos',
    slug: 'invitar-alumnos-a-una-clase',
    cover: '/app/ayuda/invitar.svg',
    title: 'Invitar alumnos a una clase',
    summary: 'El código de clase, las invitaciones directas y qué hacer con las solicitudes que llegan.',
    body: `Hay dos caminos para que un alumno acabe dentro de tu clase, y conviene conocer los dos porque sirven para situaciones distintas.

## Con el código de clase

Es el camino normal. En la cabecera de tu clase tienes un **código de seis caracteres**. Se lo das a tus alumnos —proyectado en la pizarra funciona igual de bien— y ellos lo introducen desde *Mis clases → Unirme a una clase*.

Según cómo esté configurada la clase, el alumno entra directamente o genera una **solicitud** que tú tienes que aceptar. Las solicitudes pendientes te aparecen en la pestaña de alumnos de la clase, con el nombre de quien la ha pedido.

## Invitando directamente

Si el alumno ya tiene cuenta en la plataforma, puedes buscarlo por nombre desde *Invitar alumnos* y mandarle una invitación. Le llega un aviso —y un correo, si lo tiene activado— y la invitación caduca a los siete días.

## Aceptar o rechazar solicitudes

Desde la pestaña de alumnos verás las solicitudes pendientes. Al aceptar, el alumno entra en la clase y recibe el aviso al momento. Al rechazar puedes escribir un motivo; ese texto le llega tal cual, así que merece la pena ser concreto.

> **Ojo con las clases archivadas.** Una clase archivada no admite invitaciones nuevas. Si vas a reutilizar una clase del curso pasado, mejor [duplicarla](/ayuda/clases/duplicar-una-clase-para-el-curso-siguiente) que desarchivarla.`,
  },
  {
    category: 'primeros-pasos',
    slug: 'la-narrativa-de-tu-clase',
    cover: '/app/ayuda/narrativa.svg',
    title: 'La narrativa: por qué tu clase tiene una historia',
    summary: 'Qué es la narrativa, dónde aparece y cómo escribirla con ayuda de la IA.',
    body: `La narrativa es la historia que envuelve tu asignatura: un naufragio, una expedición, un misterio por resolver. No es un adorno de la portada — es el hilo del que tiran las misiones.

## Dónde se nota

La narrativa aparece en la portada de la clase, en la **guía de clase** que tus alumnos pueden consultar, y sobre todo en el tono de las misiones. Cuando le pides a la inteligencia artificial que te proponga una misión, lo primero que lee es la narrativa: si tu clase va de una travesía por el Mediterráneo, las misiones hablarán de puertos y tormentas, no de "unidad 3".

## Cómo escribirla

Puedes escribirla entera tú, en el editor de la clase, o darle a la IA una idea suelta —"quiero algo de mitología griega para 1º de la ESO, asignatura de matemáticas"— y quedarte con lo que te proponga. Lo que devuelve es un punto de partida editable, no algo cerrado.

Funciona mejor si incluyes:

- **Dónde ocurre** y en qué época o mundo.
- **Qué papel tiene el alumnado** dentro de la historia.
- **Qué está en juego**: qué se consigue al final del curso.

## Los dioses

La plataforma tiene cinco personajes que acompañan al alumnado —Atenea, Odiseo, Penélope, Polifemo y Posidón— y cada uno tiene su color y su carácter. El que elijas para tu clase es quien da la cara en el asistente y en los mensajes del sistema. Es un detalle pequeño que hace mucho por la coherencia.`,
  },

  // ==================== CLASES ====================
  {
    category: 'clases',
    slug: 'crear-una-clase-desde-cero-o-desde-una-plantilla',
    cover: '/app/ayuda/plantilla.svg',
    title: 'Crear una clase desde cero o desde una plantilla',
    summary: 'Qué te traes al importar una plantilla de otro docente y qué tienes que montar tú.',
    body: `Además de crear una clase en blanco, puedes partir de una **plantilla**: una clase que otro docente ha publicado para que cualquiera la reutilice.

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

La clase importada es tuya y se edita como cualquier otra. Cambia lo que no encaje —precios, nombres, la propia narrativa— antes de dar el código a tus alumnos.`,
  },
  {
    category: 'clases',
    slug: 'elegir-que-recursos-usa-tu-clase',
    cover: '/app/ayuda/recursos.svg',
    title: 'Elegir qué recursos usa tu clase',
    summary: 'Experiencia, monedas, maná, vidas, tienda, insignias y niveles: qué hace cada uno y cómo apagarlos.',
    body: `En *Ajustes* de la clase decides con qué juega tu grupo. Cada interruptor cambia lo que ven tus alumnos y lo que se reparte al revisar entregas.

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

> Empieza corto. Una clase con experiencia y misiones ya funciona el primer día; monedas, tienda y poderes se añaden cuando el grupo ya está rodado.`,
  },
  {
    category: 'clases',
    slug: 'la-guia-de-clase',
    cover: '/app/ayuda/guia.svg',
    title: 'La guía de clase y la historia',
    summary: 'El documento que tus alumnos consultan para saber de qué va todo esto.',
    body: `La **guía de clase** es un documento libre que tus alumnos pueden abrir en cualquier momento. Sirve para lo que tú quieras: las reglas del juego, el contexto de la historia, cómo se puntúa, qué se espera de ellos.

## Cómo se escribe

Con el editor de la clase, que admite **markdown**: títulos, listas, negritas, tablas y enlaces. Lo que escribes se ve exactamente igual que en el resto de la plataforma.

Tienes también el botón de la inteligencia artificial: le cuentas qué quieres explicar y te devuelve un borrador que puedes editar. Como con todo lo que genera la IA, lo que sale es una propuesta — la última palabra es tuya.

## Qué merece la pena poner

- **Cómo se gana experiencia** en tu clase y qué la hace subir más.
- **Para qué sirven las monedas** y qué hay en la tienda.
- **Qué pasa si no entregas a tiempo.**
- El **contexto de la historia**, si la narrativa es larga.

## Y qué no

La guía no es el sitio para el temario ni para los materiales: para eso están los documentos que puedes adjuntar a cada misión, que quedan junto al contenido al que pertenecen.`,
  },
  {
    category: 'clases',
    slug: 'duplicar-una-clase-para-el-curso-siguiente',
    cover: '/app/ayuda/duplicar.svg',
    title: 'Duplicar una clase para el curso siguiente',
    summary: 'Qué partes puedes copiar, qué se queda fuera siempre y por qué no conviene reutilizar la de siempre.',
    featured: true,
    body: `Cuando empieza un curso nuevo no hace falta rehacer el trabajo: desde el menú de la clase, *Duplicar* crea una copia limpia y te deja elegir qué te llevas.

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

Es tentador borrar a los alumnos del año pasado y volver a usar la misma clase, pero pierdes el histórico de un curso que puede que quieras consultar. Duplicando te quedas con las dos cosas: la clase del año pasado archivada y tal cual estaba, y una copia nueva lista para empezar.`,
  },
  {
    category: 'clases',
    slug: 'publicar-tu-clase-como-plantilla',
    cover: '/app/ayuda/publicar.svg',
    title: 'Publicar tu clase como plantilla',
    summary: 'Compartir tu trabajo con el resto del profesorado, y qué se limpia antes de publicarlo.',
    body: `Si has montado una clase que funciona, puedes publicarla como **plantilla** para que cualquier otro docente de la instancia parta de ella.


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

Puedes retirar tu plantilla del catálogo cuando quieras. Quien ya la haya importado se queda con su copia: importar crea una clase independiente, no un enlace a la tuya.`,
  },
// ==================== MISIONES Y ENIGMAS ====================
  {
    category: 'misiones',
    slug: 'crear-una-mision',
    cover: '/app/ayuda/mision.svg',
    title: 'Crear una misión',
    summary: 'Título, rareza, fecha de entrega, portada y materiales: todo lo que define una misión.',
    featured: true,
    body: `Una misión es una unidad de trabajo con su propia historia. Se crea desde la pestaña *Misiones* de la clase, con un asistente parecido al de la clase.


![Las cinco fases de una misión: la creas, el alumno la ve, entrega, la revisas con un porcentaje y cobra las recompensas.](/app/ayuda/diagramas/flujo-mision.svg)
## Lo que define una misión

**Título y descripción.** La descripción es lo que lee el alumno antes de empezar: para qué sirve lo que va a hacer y qué papel juega en la historia de la clase.

**Rareza.** Común, rara, épica o legendaria. Marca el color con el que se ve la misión y, sobre todo, [el bonus que se lleva quien la completa entera](/ayuda/misiones/rarezas-y-fechas-de-entrega).

**Fecha de entrega.** Opcional. Si la pones, la misión deja de admitir entregas cuando pasa, y tus alumnos reciben un recordatorio 24 horas antes.

**Portada.** Una imagen que puedes subir o generar con la inteligencia artificial a partir de la descripción.

**Materiales.** Puedes adjuntar documentos a la misión: enunciados, plantillas, lecturas. Quedan junto al contenido al que pertenecen, que es donde el alumno los busca.

## Y después, los enigmas

Una misión sin enigmas no se puede completar: los enigmas son los pasos concretos que se entregan y se puntúan. Al terminar de crear la misión, lo siguiente es [añadirle enigmas](/ayuda/misiones/enigmas-los-pasos-de-una-mision).

## El estado de la misión

Una misión puede estar **activa** —visible y entregable— o **bloqueada**, que la deja a la vista pero sin admitir entregas. Sirve para preparar contenido con antelación y abrirlo el día que toca.`,
  },
  {
    category: 'misiones',
    slug: 'enigmas-los-pasos-de-una-mision',
    cover: '/app/ayuda/enigmas.svg',
    title: 'Enigmas: los pasos de una misión',
    summary: 'Qué es un enigma, cómo se ordenan y qué entrega el alumno en cada uno.',
    body: `El enigma es la unidad real de trabajo. La misión da el marco; el enigma es lo que el alumno hace, entrega y ve puntuado.


![Las partes de una misión señaladas sobre su ficha: portada, rareza, fecha de entrega y los enigmas.](/app/ayuda/diagramas/anatomia-mision.svg)
## Cómo se componen

Cada enigma tiene un **título**, un **enunciado** y sus propias **recompensas**. Se ordenan dentro de la misión, y ese orden es el que ve el alumnado.

Un enigma puede ser cualquier cosa que acabe en una entrega: resolver un problema, grabar un audio, subir una foto de una maqueta, entregar un documento. La plataforma no impone el formato del archivo.

## Qué hace el alumno

Abre la misión, elige un enigma y sube su archivo. La entrega queda **pendiente de revisión** y él ve que está en tu tejado. Mientras tenga una entrega pendiente de ese enigma no puede subir otra, para que no se te acumulen tres versiones de lo mismo.

## Cuántos poner

No hay número mágico, pero conviene que cada enigma sea entregable en una sesión o dos. Una misión de dos enigmas gordos se atasca; una de ocho pequeños da sensación de avance continuo.

## Lo que pasa al completar el último

Cuando apruebas el enigma que faltaba, la misión se marca como completada y el alumno se lleva el bonus de rareza y la insignia asociada, si la misión tiene una. Eso ocurre una sola vez, en esa revisión.`,
  },
  {
    category: 'misiones',
    slug: 'recompensas-xp-monedas-y-mana',
    cover: '/app/ayuda/recompensas.svg',
    title: 'Recompensas: XP, monedas y maná por enigma',
    summary: 'Dónde se configura lo que vale cada cosa y cómo se calcula el total de una misión.',
    featured: true,
    body: `**Las recompensas se configuran en el enigma, no en la misión.** Es el detalle que más despista al principio: la misión no tiene un "vale 300 XP" propio, sino que suma lo de sus enigmas.


![De dónde sale y en qué se gasta cada recurso: el XP sube de nivel y no se gasta, las monedas se gastan en la tienda y el maná en los poderes.](/app/ayuda/diagramas/circuito-recompensas.svg)
## Los tres recursos

Al crear o editar un enigma verás una fila por cada recurso que tu clase tenga activo:

- **Experiencia**, que sube de nivel.
- **Monedas**, que se gastan en la tienda.
- **Maná**, que paga los poderes.

Cada uno se pone por separado, con valores sugeridos a mano para no tener que pensarlos cada vez.

## Cómo se calcula el total de la misión

El total que ve el alumno es la **suma de lo que dan sus enigmas más el bonus por completar la misión**, que depende de la rareza. Si tienes tres enigmas de 100 XP en una misión épica, el total son 300 más 200 de bonus: 500.

## Si cambias una recompensa a mitad de curso

Una vez que un alumno ha completado un enigma, su recompensa **solo se puede subir, no bajar**. Es para no dejar a nadie con menos experiencia de la que ya se ganó. La plataforma te lo impide directamente en el formulario.

## Y si el recurso está apagado

Un enigma puede tener monedas configuradas y no repartir ninguna, si la clase tiene las monedas desactivadas. Se reparte lo que la clase usa, no lo que el enigma dice.`,
  },
  {
    category: 'misiones',
    slug: 'rarezas-y-fechas-de-entrega',
    cover: '/app/ayuda/rarezas.svg',
    title: 'Rarezas y fechas de entrega',
    summary: 'Qué cambia según la rareza y qué pasa exactamente cuando vence una misión.',
    body: `## Las cuatro rarezas

La rareza marca el color de la misión y el **bonus que se lleva quien la completa entera**:

| Rareza | Bonus al completar |
|---|---|
| Común | 50 XP |
| Rara | 100 XP |
| Épica | 200 XP |
| Legendaria | 400 XP |

Ese bonus es aparte de lo que dan los enigmas, y se entrega una sola vez: en la revisión que cierra la misión.


![La escala de rarezas, de común a legendaria, y la recompensa que corresponde a cada una.](/app/ayuda/diagramas/rarezas-escala.svg)
## Cómo usarlas

Lo natural es que la rareza siga al esfuerzo. Una misión de repaso de una sesión, común; el proyecto de trimestre, legendaria. Si todo es legendario, la escala deja de decir nada.

## Las fechas de entrega

La fecha es opcional. Cuando la pones, pasan dos cosas:

1. Tus alumnos reciben un **recordatorio 24 horas antes**, en la plataforma y por correo si lo tienen activado. Quien ya haya completado la misión no lo recibe, y quien haya desactivado los recordatorios en su perfil, tampoco.
2. Cuando la fecha pasa, la misión **deja de admitir entregas nuevas**.

## Después de la fecha

Las entregas que ya estuvieran pendientes las puedes seguir revisando con normalidad: vencer cierra la puerta de entrada, no tu trabajo de corrección. Si necesitas dar margen a alguien, mueve la fecha de la misión — y ojo, porque al moverla se vuelve a mandar el recordatorio con el plazo nuevo.`,
  },
  {
    category: 'misiones',
    slug: 'revisar-entregas',
    cover: '/app/ayuda/entregas.svg',
    title: 'Revisar entregas y puntuar por porcentaje',
    summary: 'Un solo número reparte las tres recompensas. Cómo se calcula y qué no se puede deshacer.',
    featured: true,
    body: `Cuando un alumno sube un archivo a un enigma, la entrega queda **pendiente** y te aparece en *Entregas*, dentro de la clase. Ahí decides con qué porcentaje se ha completado la tarea, y ese único número reparte todas las recompensas.


![Los tres estados de una entrega: pendiente, entregada y revisada. Los dos primeros los mueve el alumno; el último, el profesorado.](/app/ayuda/diagramas/estados-entrega.svg)
## Cómo se revisa

1. Entra en tu clase y abre **Entregas**. Verás las pendientes primero.
2. Abre la entrega para ver el archivo del alumno y el enunciado del enigma.
3. Elige el **porcentaje completado**, de 0 a 100.
4. Confirma. El alumno recibe el aviso al momento, y también por correo si lo tiene activado.

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

Un enigma ya aprobado **no se puede volver a aprobar**, ni siquiera desde una entrega nueva. Si un alumno sube otro archivo del mismo enigma, la plataforma no vuelve a pagar las recompensas. Es lo que evita que un enigma se cobre dos veces.`,
  },

  // ==================== GAMIFICACIÓN ====================
  {
    category: 'gamificacion',
    slug: 'monedas-y-tienda-de-clase',
    cover: '/app/ayuda/tienda.svg',
    title: 'Monedas y tienda de clase',
    summary: 'Montar la tienda: recompensas de un solo uso, recompensas para siempre y poderes que cuestan maná.',
    featured: true,
    body: `La tienda es donde lo que el alumnado gana se convierte en algo que le importa. La montas tú, artículo a artículo, y decides los precios.

## Dos tipos de artículo

**Recompensas.** Cosas que se canjean: "saltar una pregunta del examen", "elegir la música de la sesión", "un día sin deberes". Al canjearla, el alumno gasta las monedas y a ti te queda constancia en el historial para cumplir tu parte.

Una recompensa puede ser **de un solo uso** —se canjea una vez y desaparece de su lista— o **ilimitada**, que se puede volver a comprar tantas veces como quiera pagar.

**Poderes.** Se compran con monedas pero además **cuestan maná cada vez que se usan**. Sirven para efectos que se repiten: recuperar puntos de vida, una pista, un intento extra. El alumno acumula cargas y las va gastando.

## Poner precios

No hay tabla correcta, pero sí una regla útil: mira cuántas monedas reparte una misión completa y calcula cuántas misiones quieres que cueste cada cosa. Si una misión da 60 monedas y quieres que la recompensa buena cueste "tres misiones", son 180.

## El historial

Cada compra y cada uso quedan registrados con su fecha. Lo tienes en la pestaña de tienda de la clase, y el alumno tiene el suyo. Es lo que evita las discusiones de "yo ya lo había canjeado".

## Si no quieres tienda

Es perfectamente válido. Desactiva las monedas y la tienda en los ajustes de la clase y la pantalla desaparece para todos.`,
  },
  {
    category: 'gamificacion',
    slug: 'comportamientos-y-puntos-de-vida',
    cover: '/app/ayuda/comportamientos.svg',
    title: 'Comportamientos y puntos de vida',
    summary: 'Registrar lo que pasa en clase y que tenga consecuencia en el juego.',
    body: `Los comportamientos son la forma de que lo que ocurre en el aula —para bien y para mal— tenga efecto en la partida.


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

Todo lo aplicado queda con fecha, con quién lo aplicó y sobre quién. Está en el historial de la clase y en la ficha del alumno.`,
  },
  {
    category: 'gamificacion',
    slug: 'insignias',
    cover: '/app/ayuda/insignias.svg',
    title: 'Insignias',
    summary: 'Reconocimientos que se ganan al completar misiones, con su imagen y su significado.',
    body: `Las insignias son el reconocimiento visible de algo conseguido. A diferencia de la experiencia o las monedas, no se gastan ni se pierden: se quedan en el perfil del alumno dentro de esa clase.

## Cómo se ganan

Una insignia se asocia a una **misión**. Cuando un alumno completa esa misión entera —todos sus enigmas aprobados— la insignia entra en su colección automáticamente, junto con el bonus de experiencia por rareza.

## Crear una

Desde la pestaña de insignias de la clase. Necesitas un nombre, una descripción de por qué se consigue y una imagen. La imagen puedes subirla o generarla con la inteligencia artificial a partir de la descripción, que para insignias funciona sorprendentemente bien.

## Dónde se ven

En el perfil del alumno dentro de la clase, en su pantalla de insignias, y en las tarjetas de misión completada. Las que todavía no ha ganado aparecen bloqueadas, con su descripción visible: saber lo que falta es parte del incentivo.

## Cuántas poner

Una por misión importante, no una por misión. Si todas las misiones dan insignia, la colección deja de significar nada; si solo la dan las grandes, conseguir una es una noticia.`,
  },
  {
    category: 'gamificacion',
    slug: 'niveles-y-rangos',
    cover: '/app/ayuda/niveles.svg',
    title: 'Niveles y rangos',
    summary: 'Cómo se sube de nivel, qué títulos hay y cómo cambiar los umbrales de tu clase.',
    body: `El nivel es la traducción de la experiencia acumulada en un número visible, y el rango es el título que lo acompaña.


![La barra de experiencia con sus niveles: al alcanzar ciertos niveles cambia el rango del alumno.](/app/ayuda/diagramas/xp-nivel.svg)
## Los rangos por defecto

| Niveles | Título |
|---|---|
| 1 – 4 | Mortal |
| 5 – 9 | Héroe Novato |
| 10 – 19 | Héroe |
| 20 – 29 | Semidiós |
| 30 – 50 | Dios del Olimpo |

Cada rango tiene su color, que es el que se ve en la clasificación y en la ficha del alumno.

## Cambiarlos en tu clase

Desde *Ajustes → Niveles* puedes tocar tanto los umbrales de experiencia como los tramos y los títulos. Si tu narrativa no es mitológica, cambiar "Semidiós" por lo que encaje en tu historia es de las cosas que más se notan por poco esfuerzo.

## Cuánta experiencia hace falta

Los umbrales suben progresivamente: los primeros niveles caen rápido y los últimos cuestan. Es a propósito, para que el arranque enganche y el final tenga recorrido durante todo el curso.

Si al mes de empezar tu grupo ya está en nivel 20, es señal de que las recompensas de los enigmas van altas para el ritmo de tu clase. Puedes subir los umbrales sin tocar las misiones.

## Al subir de nivel

El alumno ve una animación de subida de nivel al entrar. Si prefieres una clase más sobria, en el perfil de cada usuario se pueden [reducir las animaciones](/ayuda/tu-cuenta/accesibilidad).`,
  },
// ==================== ALUMNADO ====================
  {
    category: 'alumnado',
    slug: 'la-vista-del-alumno',
    cover: '/app/ayuda/vista-alumno.svg',
    title: 'La vista del alumno',
    summary: 'Qué ve tu alumnado al entrar y dónde encuentra cada cosa.',
    body: `Conviene saber cómo se ve la plataforma desde el otro lado, porque muchas dudas de clase se resuelven sabiendo dónde está cada botón.


![Lo que ve el profesorado frente a lo que ve el alumnado en la misma clase.](/app/ayuda/diagramas/vista-roles.svg)
## Su inicio

Al entrar, el alumno ve sus clases, su progreso y lo que tiene pendiente. Si una misión está a punto de vencer, le aparece destacada.

## Dentro de una clase

- **Misiones**: las activas primero, con su rareza, su fecha y cuánto lleva completado de cada una.
- **Clasificación**: dónde está respecto al resto del grupo.
- **Tienda**: qué puede comprar con lo que tiene, si la clase la usa.
- **Insignias**: las conseguidas y las que faltan, con su descripción.
- **Guía**: la historia y las reglas que hayas escrito.

## Cómo entrega

Abre la misión, elige un enigma, sube su archivo y espera. Mientras tenga una entrega pendiente de ese enigma no puede subir otra. Cuando la revisas, le llega el aviso con el porcentaje y lo que ha ganado.

## Su perfil

Cada alumno tiene su alias y su avatar **por clase**: puede llamarse de una forma en Matemáticas y de otra en Historia. Eso se explica en [avatares y alias](/ayuda/alumnado/avatares-y-alias-por-clase).

## Ver tu clase como la ven ellos

Puedes matricularte en tu propia clase como alumno de prueba para revisarla desde dentro. Esa matrícula no cuenta en los listados, ni en el recuento de alumnos, ni en la clasificación.`,
  },
  {
    category: 'alumnado',
    slug: 'avatares-y-alias-por-clase',
    cover: '/app/ayuda/avatares.svg',
    title: 'Avatares y alias por clase',
    summary: 'Por qué la identidad es por clase y cómo se genera un avatar con inteligencia artificial.',
    body: `En ITAKAI la identidad de un alumno **es por clase, no por cuenta**. La misma persona puede ser "Capitana Nemo" en tu clase de Ciencias y "Aristóteles" en la de Filosofía, con avatares distintos.

## Por qué

Porque la narrativa es de la clase. Un alias que encaja en una travesía por el Egeo no encaja en un laboratorio del futuro, y obligar a elegir uno para todo rompería las dos historias.

## El alias

Lo elige el alumno al entrar en la clase y puede cambiarlo. Es lo que se ve en la clasificación, en las entregas y en el historial. Si no pone ninguno, se usa su nombre.

## El avatar

Hay dos caminos:

1. **Elegir uno del catálogo**, con los personajes de la plataforma.
2. **Generarlo con inteligencia artificial**, describiendo con palabras cómo lo quiere. La descripción se convierte en una imagen a partir de la guía del personaje elegido.

## Moderación

Los alias y los avatares generados los ves tú en la ficha de cada alumno. Si algo no encaja, puedes pedir el cambio o editarlo desde la propia ficha. Merece la pena dejar claras las reglas del juego el primer día, en la [guía de clase](/ayuda/clases/la-guia-de-clase).`,
  },
  {
    category: 'alumnado',
    slug: 'clasificacion-y-progreso',
    cover: '/app/ayuda/clasificacion.svg',
    title: 'Clasificación y progreso',
    summary: 'Cómo se ordena el ranking, qué ve cada alumno y cómo seguir a uno en concreto.',
    body: `## La clasificación

Ordena a los alumnos de una clase por la **experiencia acumulada en esa clase**. No es global: cada clase tiene la suya, y la experiencia de una no cuenta en otra.

Los tres primeros salen en un podio y el resto en lista, cada uno con su nivel, su rango y su avatar. El alumno se ve siempre a sí mismo destacado, esté donde esté.

## Si no quieres competición

La clasificación se puede desactivar en los ajustes de la clase. Hay grupos donde el ranking motiva y grupos donde desanima a quien más lo necesita — es una decisión pedagógica, y la plataforma no la toma por ti.

## Seguir a un alumno

Desde la pestaña de alumnos, al abrir una ficha tienes todo lo suyo: experiencia, nivel, monedas, maná, puntos de vida, misiones completadas, insignias, entregas y el historial de comportamientos aplicados, con fechas.

Es la vista que sirve para una tutoría: en una pantalla está lo que ha hecho y cuándo.

## Ordenar el listado

El listado de alumnos se puede ordenar por nombre, nivel, experiencia, monedas, maná o vida, para encontrar rápido a quien va rezagado o a quien lleva semanas sin entregar.`,
  },

  // ==================== IA Y CONFIGURACIÓN ====================
  {
    category: 'ia-y-configuracion',
    slug: 'que-hace-la-inteligencia-artificial',
    cover: '/app/ayuda/atenea.svg',
    title: 'Atenea y los dioses: qué hace la IA',
    summary: 'En qué te ayuda el asistente, dónde aparece y qué decide siempre el profesorado.',
    featured: true,
    body: `La inteligencia artificial de ITAKAI es un asistente de escritura, no un piloto automático. **Propone; tú decides.** Nada de lo que genera se publica solo.


![Cómo trabaja la IA: le pides algo, propone un borrador, tú lo revisas y solo se guarda si le das a guardar.](/app/ayuda/diagramas/flujo-ia.svg)
## Dónde aparece

- **Al crear una clase**: propone narrativas a partir de una idea suelta.
- **En la guía de clase**: redacta borradores de las reglas o del contexto.
- **Al crear misiones y enigmas**: propone títulos, enunciados y recompensas coherentes con tu narrativa.
- **En las imágenes**: portadas de misión, insignias y avatares del alumnado.
- **En el asistente**, una conversación abierta donde pedirle lo que necesites.

## Qué lee antes de responder

Lo importante: la IA no escribe a ciegas. Lee la **narrativa de tu clase**, sus recursos activos y el contexto de lo que estés editando. Por eso una propuesta de misión para una clase de mitología suena distinta que para una de robótica.

## Lo que nunca hace

- No publica nada por su cuenta.
- No modifica misiones existentes salvo que se lo pidas expresamente.
- No toca notas ni revisa entregas.

## Los personajes

Atenea, Odiseo, Penélope, Polifemo y Posidón son las caras del asistente. Cada clase tiene el suyo, y solo cambia el tono y el color: por debajo hacen lo mismo.

## Si tu instancia no tiene IA configurada

Todo lo demás funciona igual. Los botones de generación no aparecen y las clases se escriben a mano. Configurarla es cosa de administración: [configurar el proveedor de IA](/ayuda/ia-y-configuracion/configurar-el-proveedor-de-ia).`,
  },
  {
    category: 'ia-y-configuracion',
    slug: 'configurar-el-proveedor-de-ia',
    cover: '/app/ayuda/proveedor-ia.svg',
    title: 'Configurar el proveedor de IA',
    summary: 'Para administración: claves, modelos y límite de uso por hora.',
    body: `La inteligencia artificial se configura una vez, para toda la instancia, desde **Panel de administración → Configuración → Inteligencia artificial**.

## Qué hay que rellenar

**El proveedor de texto**, con su clave de API y el modelo que quieras usar. Es lo que genera narrativas, misiones, enigmas y las respuestas del asistente.

**El proveedor de imágenes**, para portadas, insignias y avatares. Puede ser distinto del de texto.

**El límite por hora**, que es cuántas generaciones puede hacer un usuario en una hora. Sirve para que un accidente —o un entusiasmo— no se lleve por delante el presupuesto de la cuenta.

## Las claves

Se guardan **cifradas** y no se vuelven a mostrar enteras: en el panel se ven enmascaradas. Si necesitas cambiarlas, se pegan de nuevo.

## Comprobar que funciona

Después de guardar, la forma rápida de verificarlo es entrar en cualquier clase y pedir una generación de narrativa. Si el proveedor responde, el botón devuelve texto en unos segundos.

## Si el proveedor principal falla

La plataforma tiene un camino de respaldo: si el endpoint principal no responde, la petición se reintenta por el proveedor alternativo configurado. El profesorado no ve el cambio, solo que la generación tarda un poco más.

## Sin configurar

Si no rellenas nada, la plataforma funciona igual pero sin los botones de generación. Es una opción legítima: hay centros que prefieren no usar IA.`,
  },
  {
    category: 'ia-y-configuracion',
    slug: 'almacenamiento-de-archivos',
    cover: '/app/ayuda/almacenamiento.svg',
    title: 'Almacenamiento: disco local o bucket S3/R2',
    summary: 'Para administración: dónde se guardan las entregas y las imágenes, y cómo cambiarlo.',
    body: `Todo lo que se sube a la plataforma —entregas del alumnado, portadas de misión, insignias, avatares— tiene que guardarse en algún sitio. Se elige desde **Panel de administración → Configuración → Almacenamiento**.

## Las dos opciones

**Disco local.** Los archivos se guardan en el propio servidor. Es lo más simple y lo que viene por defecto: no hay que configurar nada ni contratar nada. A cambio, el espacio es el del servidor y las copias de seguridad son tu responsabilidad.

**Bucket compatible con S3.** Amazon S3, Cloudflare R2 o cualquier servicio compatible. Los archivos salen del servidor, el espacio deja de ser un problema y el proveedor se encarga de la redundancia.

## Qué hace falta para el bucket

- El **endpoint** del servicio y la **región**.
- El **nombre del bucket**.
- La **clave de acceso** y su secreto, que se guardan cifrados.
- La **URL pública** del bucket, si sirves los archivos por un dominio propio.

## Cambiar de uno a otro

El cambio afecta a lo que se suba **a partir de ese momento**. Los archivos que ya estuvieran en disco siguen sirviéndose desde disco, así que no se rompe nada, pero conviene planificar la migración si quieres que todo acabe en el mismo sitio.

## En instancias auto-hospedadas

Si tienes tu propia instancia, el disco local suele ser suficiente para un centro. El bucket empieza a compensar cuando hay varios centros o cuando las entregas incluyen vídeo.`,
  },

  // ==================== TU CUENTA ====================
  {
    category: 'tu-cuenta',
    slug: 'accesibilidad',
    cover: '/app/ayuda/accesibilidad.svg',
    title: 'Ajustes de accesibilidad',
    summary: 'Tamaño de letra, contraste, modos para daltonismo y menos animación.',
    featured: true,
    body: `La plataforma tiene cuatro ajustes de accesibilidad que se guardan **en tu cuenta**, así que te acompañan de un ordenador del aula a otro.

Están en tu **perfil, pestaña Configuración**, y también en el menú de accesibilidad de las pantallas públicas — porque quien no puede leer la pantalla de inicio de sesión tampoco puede entrar a agrandarla.

## Tamaño de letra

Normal, grande o muy grande. Agranda el texto y los iconos de toda la plataforma, no solo de una pantalla.

## Contraste

El modo de alto contraste refuerza los textos secundarios, los bordes y el foco del teclado. Es útil con baja visión y también con un proyector malo o un aula muy iluminada.

## Visión del color

Tres modos, uno por tipo de daltonismo: **protanopía**, **deuteranopía** y **tritanopía**. Cambian la paleta de toda la plataforma para que los estados sigan distinguiéndose: lo que estaba en rojo pasa a bermellón y lo verde a verde azulado, conservando el mismo nivel de claridad.

La propia pantalla de ajustes tiene una tira de muestras —correcto, error, aviso, información, destacado— que cambia contigo, para que compruebes de un vistazo si los distingues.

## Menos animación

Reduce las transiciones y los efectos de movimiento, incluida la animación de subir de nivel. Complementa al ajuste del sistema operativo, que en un ordenador compartido no siempre está a mano.`,
  },
  {
    category: 'tu-cuenta',
    slug: 'avisos-y-recordatorios',
    cover: '/app/ayuda/avisos.svg',
    title: 'Avisos y recordatorios',
    summary: 'Qué te avisa la plataforma, por dónde te llega y cómo apagarlo.',
    body: `Los avisos aparecen **siempre dentro de la plataforma**, en la campana y en la página de notificaciones. El correo es opcional y se controla desde tu perfil.

## Qué te avisa

Si eres **profesor**: cuando un alumno sube una entrega pendiente de revisar, cuando alguien pide unirse a tu clase y las confirmaciones de lo que haces.

Si eres **alumno**: cuando tu entrega ha sido revisada y con qué porcentaje, cuando te aceptan o rechazan una solicitud, cuando te invitan a una clase y **cuando faltan menos de 24 horas para el final de una misión**.

## Los dos interruptores

En tu perfil, pestaña Configuración:

- **Avisos por correo.** Si lo apagas, sigues viendo todo en la plataforma pero no recibes correos.
- **Recordatorios de entrega.** Apaga solo los avisos de fecha límite, dejando el resto.

## Lo que no llega por correo

Las entregas nuevas **no se mandan por correo al profesorado**, y es a propósito: treinta alumnos entregando la misma misión llenarían el buzón. Se ven agrupadas en la plataforma, que es donde se van a revisar de todas formas.

## En qué idioma llegan

En el que tengas puesta la interfaz. El aviso se compone en tu idioma en el momento de crearse, así que si lo cambias después, los anteriores se quedan como estaban.`,
  },
  {
    category: 'tu-cuenta',
    slug: 'seguridad-de-tu-cuenta',
    cover: '/app/ayuda/seguridad.svg',
    title: 'Seguridad de tu cuenta',
    summary: 'Cambiar la contraseña o el correo, y cerrar sesiones abiertas en otros equipos.',
    body: `Todo está en tu **perfil, pestaña Seguridad**.

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

Si usas un ordenador de aula, cierra sesión al terminar. Los ajustes de accesibilidad se quedan guardados en tu cuenta, así que al volver a entrar en cualquier equipo los tienes otra vez sin tocar nada.`,
  },
  // ==================== SI ERES ALUMNO ====================
  {
    category: 'si-eres-alumno',
    slug: 'como-entro-en-mi-clase',
    cover: '/app/ayuda/invitar.svg',
    title: 'Cómo entro en mi clase',
    summary: 'Con la invitación del profesor o con el código de la clase.',
    body: `Para estar en una clase de ITAKAI hace falta que tu profesor te meta. Hay dos caminos y los dos acaban en el mismo sitio.

## Te llega una invitación

Tu profesor manda la invitación al correo que tiene tuyo. Ábrelo, pulsa el enlace y sigue los pasos. Si es la primera vez que entras en ITAKAI, ahí mismo creas tu cuenta; si ya tenías una, la clase se añade a las que ya tengas.

## Te dan un código

La otra forma es el código de la clase. Entras en ITAKAI con tu cuenta, vas a tus clases y pones el código que te haya dado tu profesor. Cópialo tal cual, sin espacios de más.

## Si no aparece la clase

Lo más común es que estés entrando con un correo distinto del que tiene tu profesor apuntado. Comprueba con qué cuenta has entrado y díselo si no coincide.

También puede ser que la clase esté archivada porque el curso ya ha terminado: entonces no la vas a ver aunque estuvieras dentro.

## Tu cuenta es tuya

La misma cuenta te vale para todas las clases y para todos los cursos. No hace falta crear una nueva cada año ni una por asignatura: tu progreso, tus insignias y tu avatar viajan contigo.`,
  },
  {
    category: 'si-eres-alumno',
    slug: 'como-entrego-una-mision',
    cover: '/app/ayuda/entregas.svg',
    title: 'Cómo entrego una misión',
    summary: 'Dónde se entrega, qué se puede mandar y qué pasa después.',
    body: `Una misión es un trabajo con premio. Cuando la abres ves de qué va, qué tienes que hacer y qué te llevas si la completas.

## Los enigmas son los pasos

Casi todas las misiones están partidas en enigmas: los pasos que hay que ir haciendo. Los ves en orden y cada uno tiene su propia recompensa, así que aunque no termines la misión entera, lo que hayas hecho cuenta.

## La entrega

Según lo que haya pedido tu profesor, entregas escribiendo un texto, subiendo un archivo o pegando un enlace. Puedes mandar más de una cosa si te lo permite.

Cuando le das a entregar, la entrega pasa a tu profesor y ya no la puedes cambiar. Repásala antes.

## Después de entregar

Tu profesor la revisa y le pone un porcentaje: cuánto has completado. Las recompensas se reparten según ese porcentaje, así que una entrega a medias también da algo.

## La fecha

Si la misión tiene fecha de entrega, te llega un aviso antes de que se cumpla. Entregar tarde puede costarte puntos de vida, según lo que haya decidido tu profesor para la clase.`,
  },
  {
    category: 'si-eres-alumno',
    slug: 'que-son-el-xp-las-monedas-y-el-mana',
    cover: '/app/ayuda/recompensas.svg',
    title: 'Qué son el XP, las monedas y el maná',
    summary: 'Tres cosas distintas que se ganan igual pero se usan para cosas muy diferentes.',
    body: `Las misiones te dan tres cosas y es fácil confundirlas. Se ganan igual, pero no sirven para lo mismo.

## XP: tu progreso

La experiencia mide lo que llevas hecho en la clase. Sube y no baja nunca, y **no se gasta**: por mucho que compres en la tienda, tu XP sigue donde estaba. Es lo que te hace subir de nivel y cambiar de rango.

## Monedas: para gastar

Las monedas se ganan igual que el XP, pero son dinero. Se gastan en la tienda de tu clase, en lo que haya puesto tu profesor: desde una recompensa de un solo uso hasta algo que te quedas para siempre.

Estas sí bajan cuando compras.

## Maná: para los poderes

El maná es para los poderes de la tienda, esas cosas que se usan una vez y luego se recargan. No todos los profesores lo activan: si en tu clase no aparece, es que esa clase no lo usa.

## Qué usa tu clase

Cada profesor elige qué recursos tiene su clase. Puede que en una uses las tres cosas y en otra solo XP. Mira el panel de la clase para ver qué hay en juego.`,
  },
  {
    category: 'si-eres-alumno',
    slug: 'he-perdido-un-punto-de-vida',
    cover: '/app/ayuda/comportamientos.svg',
    title: 'He perdido un punto de vida, ¿y ahora qué?',
    summary: 'Qué son las vidas, por qué se pierden y cómo se recuperan.',
    body: `Los puntos de vida son la parte de la clase que mide cómo te comportas, no lo que entregas.

## Por qué se pierden

Los quita tu profesor cuando pasa algo que ha marcado como comportamiento negativo: no entregar a tiempo, interrumpir la clase, saltarse una norma del aula. Cada clase tiene su lista, y la decide quien da la clase, no la aplicación.

## Qué pasa si me quedo sin

Quedarte sin vidas **no significa suspender**. La nota no depende de esto. Lo que suele pasar es que pierdes acceso a la tienda hasta que recuperes alguna, así que se te acaban los caprichos, no el curso.

## Cómo se recuperan

Igual que se pierden: con comportamientos positivos. Ayudar a un compañero, participar, entregar antes de tiempo. Tu profesor las devuelve del mismo sitio de donde las quita.

## Si crees que hay un error

Habla con tu profesor. Los puntos de vida los mueve una persona a mano, así que también se pueden deshacer a mano. En la aplicación no hay ningún automatismo que te quite vidas por su cuenta.`,
  },
  {
    category: 'si-eres-alumno',
    slug: 'mi-avatar-y-mi-nombre-en-clase',
    cover: '/app/ayuda/avatares.svg',
    title: 'Mi avatar y mi nombre en clase',
    summary: 'Cómo cambiar tu cara y tu alias, y dónde los ven los demás.',
    body: `En cada clase tienes un avatar y un alias. Son tuyos y puedes cambiarlos.

## Son por clase

Lo importante: **el avatar y el alias son de cada clase**, no de tu cuenta. Puedes ser una cosa en Historia y otra en Matemáticas. Al cambiarlos en una clase, las demás se quedan como estaban.

## El alias

Es el nombre con el que apareces ante el resto: en la clasificación, en las insignias, en el ranking si tu clase lo tiene activado. Tu profesor sigue viendo tu nombre real, que es el que necesita para las notas.

Ponte algo que puedas enseñar en clase. Tu profesor puede cambiarlo si no es apropiado.

## El avatar

Se elige de los que haya disponibles en tu clase. Algunos aparecen al subir de nivel o al conseguir ciertas insignias, así que la lista puede crecer según avanzas.

## Si no puedes cambiarlo

Hay clases donde el profesor deja el alias fijo para saber quién es quién. Si no te deja tocarlo, es eso: no es un fallo.`,
  },
  {
    category: 'si-eres-alumno',
    slug: 'la-clasificacion-de-la-clase',
    cover: '/app/ayuda/clasificacion.svg',
    title: 'La clasificación de la clase',
    summary: 'Qué mide el ranking, quién lo ve y qué no se enseña nunca.',
    body: `Algunas clases tienen clasificación y otras no: lo decide tu profesor.

## Qué mide

Ordena por experiencia acumulada en esa clase. No mide notas, ni cuánto has acertado, ni lo bien que ha salido un trabajo: mide lo que llevas hecho.

Por eso alguien constante suele estar arriba aunque no saque las mejores notas.

## Qué no se ve

En la clasificación aparecen alias y progreso. **Nadie ve tus entregas ni tus porcentajes**, ni tú los de los demás. Eso es entre tu profesor y tú.

## Si te agobia

Díselo a tu profesor: la clasificación se puede apagar para toda la clase. Está pensada para picarse un poco, no para pasarlo mal.

## Empezar tarde

Si te has incorporado con el curso empezado vas a estar abajo, y es normal: los demás llevan más misiones hechas. Lo que cuenta para tu nota no es el puesto, es lo que entregas.`,
  },

  // ==================== CUANDO ALGO FALLA ====================
  {
    category: 'cuando-algo-falla',
    slug: 'no-llega-el-correo-de-invitacion',
    cover: '/app/ayuda/correo-invitacion.svg',
    title: 'No llega el correo de invitación',
    summary: 'Los tres motivos habituales, por orden de probabilidad.',
    body: `Es lo que más se pregunta al empezar el curso. Casi siempre es una de estas tres cosas.

## Está en la carpeta de spam

El primer sitio donde mirar. Los correos automáticos de una plataforma nueva acaban ahí a menudo, sobre todo en cuentas de centro con filtros estrictos. Pídele al alumno que busque «ITAKAI» en todo el buzón, no solo en la bandeja de entrada.

## La dirección tiene una errata

Comprueba en tu lista de alumnos la dirección exacta. Un punto de más o un dominio del centro mal escrito y el correo no llega a ninguna parte.

## El centro bloquea el correo externo

Algunos centros solo dejan entrar correo de dominios de la comunidad. Si le pasa a varios alumnos a la vez y todos tienen cuenta del centro, es esto: habla con quien lleve la informática del centro.

## Mientras tanto

No hace falta esperar: pásale el **código de la clase** y que entre con él. Es el mismo resultado y no depende del correo.

Si tu instancia está recién montada y no ha salido ningún correo todavía, revisa la configuración de envío en el panel de administración antes de buscar culpables fuera.`,
  },
  {
    category: 'cuando-algo-falla',
    slug: 'un-alumno-no-ve-la-clase',
    cover: '/app/ayuda/acceso-clase.svg',
    title: 'Un alumno no ve la clase',
    summary: 'Dice que ha entrado pero su clase no aparece por ningún lado.',
    body: `El alumno entra, llega a su panel y la clase no está. Repasa esto en orden.

## ¿Con qué cuenta ha entrado?

Es el motivo número uno. Un alumno con dos cuentas —la del centro y una personal— entra con la que no es. Pídele que mire con qué correo ha iniciado sesión y compáralo con el que aparece en tu lista.

## ¿Está matriculado de verdad?

Que le hayas mandado la invitación no significa que la haya aceptado. En tu lista de alumnos se ve quién ha entrado y quién sigue pendiente.

## ¿La clase está archivada?

Una clase archivada desaparece de la vista del alumnado. Si acabas de archivarla para ordenar el curso, es eso.

## ¿Es de otro grupo?

Si has duplicado la clase para varios grupos, es fácil invitar a un alumno al grupo equivocado. Mira si aparece en otra de tus clases.

## Última comprobación

Si todo lo anterior está bien, que cierre sesión y vuelva a entrar. El panel se carga al entrar, y una sesión que lleva días abierta puede estar enseñando una lista vieja.`,
  },
  {
    category: 'cuando-algo-falla',
    slug: 'la-ia-no-responde',
    cover: '/app/ayuda/ia-en-silencio.svg',
    title: 'La IA no responde',
    summary: 'Qué mirar cuando Atenea se queda en blanco o tarda demasiado.',
    body: `La IA de ITAKAI habla con un proveedor externo. Cuando no contesta, el problema suele estar en ese enlace.

## Vuelve a pedirlo

Lo primero, y no es broma: reintenta. Una petición que se pierde por el camino se arregla sola al segundo intento.

## Revisa el proveedor

En el panel de administración está configurado qué proveedor de IA se usa y con qué credenciales. Si esas credenciales han caducado, se ha agotado el crédito o el servicio está caído, aquí no va a funcionar nada.

## Prueba con otro modelo

Si tienes más de un proveedor configurado, cambia y vuelve a probar. Sirve además para saber si el problema es de uno concreto o de la conexión en general.

## Nada de esto bloquea la clase

Y esto es lo importante: **la IA solo propone**. Todo lo que hace se puede escribir a mano —misiones, enigmas, narrativa— desde el mismo formulario. Que Atenea esté callada te da más trabajo, pero no te deja tirado.

## Si tarda mucho

Generar un texto largo o una imagen lleva su tiempo. Dale unos segundos antes de darlo por perdido y no pulses el botón varias veces: cada pulsación es una petición nueva.`,
  },
  {
    category: 'cuando-algo-falla',
    slug: 'no-puedo-subir-un-archivo',
    cover: '/app/ayuda/subida-fallida.svg',
    title: 'No puedo subir un archivo',
    summary: 'Tamaño, formato y dónde se guardan las cosas.',
    body: `Las subidas fallan casi siempre por el tamaño o por el formato.

## El tamaño

Hay un tope por archivo. Un vídeo grabado con el móvil se lo salta con facilidad, y las presentaciones con muchas imágenes también.

Si es un vídeo, súbelo a donde lo tengáis en el centro y entrega el enlace. Si es un documento, exportarlo a PDF suele dejarlo en una fracción de lo que ocupaba.

## El formato

Para imágenes se admiten los formatos habituales: JPG, PNG, WEBP. Un archivo con la extensión cambiada a mano no cuela: lo que se comprueba es el contenido, no el nombre.

## Dónde acaban los archivos

Cada instancia guarda los archivos donde tenga configurado en el panel de administración: en el disco del propio servidor o en un bucket externo. Si **ninguna** subida funciona y acabáis de cambiar esa configuración, ahí está el problema, y se ve en la propia pantalla de almacenamiento.

## Si falla solo a un alumno

Que pruebe desde otro navegador o desde otro dispositivo. Una extensión del navegador que bloquea peticiones puede cortar la subida sin decir nada.`,
  },
  {
    category: 'cuando-algo-falla',
    slug: 'he-borrado-algo-sin-querer',
    cover: '/app/ayuda/deshacer.svg',
    title: 'He borrado algo sin querer',
    summary: 'Qué se puede recuperar, qué no, y cómo evitar el susto.',
    body: `Antes de nada: no vuelvas a crearlo a toda prisa. Mira primero si de verdad se ha ido.

## Archivar no es borrar

Las clases se archivan mucho más de lo que se borran. Una clase archivada sigue entera y se puede recuperar: no aparece en tu lista de clases activas, pero está.

## Lo que sí desaparece

Borrar una misión se lleva por delante sus enigmas y sus entregas. Borrar una categoría de la ayuda se lleva sus artículos. En estos casos la aplicación avisa antes justo por eso.

## Las recompensas ya repartidas

El XP, las monedas y las insignias que ya se han dado **no se van** porque borres la misión que las repartió. Lo que el alumnado ya tiene, lo tiene.

## Si has borrado una clase entera

Habla con quien administre vuestra instancia. Si hay copias de seguridad del servidor, se puede restaurar desde ahí; desde la aplicación, no.

## Para la próxima

Antes de un cambio grande —reorganizar un trimestre, limpiar misiones viejas— duplica la clase. La copia te queda como red de seguridad y se hace en un momento.`,
  },
  {
    category: 'cuando-algo-falla',
    slug: 'las-recompensas-no-cuadran',
    cover: '/app/ayuda/recompensas-descuadradas.svg',
    title: 'Las recompensas no cuadran',
    summary: 'Un alumno recibe menos XP o menos monedas de las que esperaba.',
    body: `Casi siempre es que se está mirando el número de la misión y cobrando el del enigma, o al revés.

## Se paga por porcentaje

Al revisar una entrega pones cuánto se ha completado, y las recompensas salen de ahí. Un 60 % no cobra lo mismo que un 100 %. Si el alumno esperaba la cifra entera, mira qué porcentaje le pusiste.

## Cada enigma paga lo suyo

Las recompensas se reparten por enigma, no de una vez al final de la misión. Quien ha hecho dos de cuatro pasos ha cobrado dos, aunque la misión siga abierta.

## La clase manda

Cada clase decide qué recursos usa y con qué límites. Si una clase no tiene maná activado, no se paga maná aunque la misión lo tuviera puesto. Y si hay topes configurados, se aplican al repartir.

## Al cambiar la configuración

Tocar la configuración de recompensas afecta a lo que se reparta **a partir de ese momento**. Lo ya cobrado no se recalcula, y es a propósito: nadie debería perder por la noche algo que ganó por la mañana.

## Si aun así no sale

Abre la entrega concreta: ahí se ve el porcentaje que pusiste y lo que se pagó por él.`,
  },
  {
    category: 'cuando-algo-falla',
    slug: 'no-puedo-entrar-en-mi-cuenta',
    cover: '/app/ayuda/cuenta-bloqueada.svg',
    title: 'No puedo entrar en mi cuenta',
    summary: 'Contraseña, Google y las cuentas duplicadas.',
    body: `Antes de crear otra cuenta —que es lo que todo el mundo hace y complica el arreglo—, prueba esto.

## ¿Entraste con Google?

Si creaste la cuenta con el botón de Google, no tienes contraseña que recordar: tienes que volver a entrar con Google. Pedir una contraseña nueva no va a servir de nada.

## Restablecer la contraseña

Si entraste con correo y contraseña, usa el enlace para restablecerla. Llega un correo con un enlace temporal; si no aparece, mira en spam, que es donde suele acabar.

## La cuenta duplicada

El lío clásico: registrarse con el correo personal y que el profesor haya invitado al del centro. Son dos cuentas distintas y la clase está en una sola. Comprueba con qué correo entras.

Si ya tienes dos, díselo a tu profesor: es más fácil que te invite a la que usas que arreglar la otra.

## Sigo sin poder

Que tu profesor o quien administre la instancia compruebe que la cuenta existe y está activa con el correo que tú crees. Desde ahí se ve enseguida si el problema es la cuenta o la contraseña.`,
  },
]
