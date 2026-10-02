/**
 * Registro de versiones de ITAKAI (changelog).
 *
 * Fuente única de la página "Acerca de". Para publicar una versión nueva:
 *   1. Añade su entrada AL PRINCIPIO del array `changelog` (más reciente primero).
 *   2. Sube el número en `app/package.json` y `api/package.json` para que coincida.
 *   3. Comprueba que `python3 scripts/release-check.py` pasa (textos legales sin
 *      marcadores «[PENDIENTE»). Si no pasa, la versión no sale.
 *   4. Etiqueta la release en git: `git tag vX.Y.Z && git push --tags`.
 *
 * Versionado SemVer (MAJOR.MINOR.PATCH). La app está en BETA, así que estamos en
 * la serie 0.x.x (major 0 = desarrollo inicial). El 1.0.0 se reservará para cuando
 * salga oficialmente de beta y se considere estable.
 *   - PATCH (0.3.0 → 0.3.1): solo arreglos de fallos.        → cambios 'fixed'
 *   - MINOR (0.3.0 → 0.4.0): funcionalidad nueva.            → cambios 'new' / 'improved'
 *   - Salida de beta: 0.x.x → 1.0.0.
 *
 * IMPORTANTE: no añadas aquí trabajo que todavía no se ha publicado. Cada entrada
 * debe corresponder a una versión realmente lanzada, para que lo que ven
 * profesores y alumnos sea 100% oficial. Escribe los cambios en lenguaje claro,
 * no jerga técnica.
 */

export type ChangeType = 'new' | 'improved' | 'fixed'

export interface ChangelogChange {
  type: ChangeType
  /** Descripción del cambio, en lenguaje claro. */
  text: string
}

export interface ChangelogEntry {
  /** Número de versión, ej. '1.1.0'. Debe coincidir con la etiqueta de git. */
  version: string
  /** Fecha ISO (YYYY-MM-DD) de publicación. */
  date: string
  /** Título opcional destacado para la versión. */
  title?: string
  changes: ChangelogChange[]
}

export const changelog: ChangelogEntry[] = [
  {
    version: '0.5.0',
    date: '2026-10-02',
    title: 'Blog, catálogo público de plantillas e importar misiones',
    changes: [
      {
        type: 'new',
        text: 'El blog de ITAKAI ya se lee en la propia web, en «Blog»: entradas con portada, fecha y autor, categorías, buscador y, al final de cada una, otras entradas para seguir leyendo.',
      },
      {
        type: 'new',
        text: 'Catálogo público de plantillas en «Plantillas», sin necesidad de cuenta. Puedes buscar y filtrar por nivel, asignatura, idioma y provincia.',
      },
      {
        type: 'new',
        text: 'Cada plantilla tiene su propia página con la historia, las funcionalidades, las misiones, la tienda y los comportamientos. Con «Copiar enlace» la compartes con quien quieras. No se muestra quién la publicó.',
      },
      {
        type: 'new',
        text: 'Al importar una plantilla puedes traer también sus misiones. Llegan con sus enigmas y sin fecha límite. Los documentos y las insignias no se copian.',
      },
      {
        type: 'new',
        text: 'Importar misiones entre tus clases. En la pestaña «Misiones» de una clase, «Importar de otra clase» copia una misión de otra de tus clases, o de una compartida contigo, con sus enigmas, sus documentos y, si quieres, su insignia.',
      },
      {
        type: 'new',
        text: 'También puedes importar una misión desde «Misiones», el listado de todas tus misiones, eligiendo antes a qué clase va. Y desde una misión, «Copiar en otra clase» la lleva a otra clase o la duplica en la suya.',
      },
      {
        type: 'new',
        text: 'La misión importada llega bloqueada y sin fecha límite, para que la revises antes de abrirla al alumnado. Queda apuntada en el historial de las dos clases. Las clases archivadas también sirven de origen si las pides.',
      },
      {
        type: 'new',
        text: 'Papelera de clases. Quien es propietario de una clase puede enviarla a la papelera desde sus ajustes, en «Gestión». Antes, un aviso dice todo lo que se pierde: estudiantes, entregas, cuentas sin correo, misiones y compras.',
      },
      {
        type: 'new',
        text: 'En «Mis clases», la «Papelera» enseña las clases enviadas y los días que quedan. Con «Restaurar» vuelve como archivada. Mientras está en la papelera no aparece en ningún listado, ni al alumnado. A los 30 días se borra para siempre, o antes con «Borrar ya».',
      },
      {
        type: 'improved',
        text: 'Los textos de la aplicación usan un lenguaje que vale para todo el mundo: «docente» y «alumnado» en lugar de «profesor» y «alumno», y saludos y avisos sin masculino genérico. En castellano, catalán, valenciano, gallego, asturiano, portugués y rumano. La IA también escribe así.',
      },
      {
        type: 'improved',
        text: '«Acerca de», con las novedades de cada versión, aparece también en el menú de administración.',
      },
      {
        type: 'improved',
        text: 'Nuevas guías en el centro de ayuda: importar una misión de otra clase y el catálogo público de plantillas.',
      },
      {
        type: 'improved',
        text: 'Más contraste en los textos grises de los avisos de lista vacía, la paginación y el contador de los filtros.',
      },
      {
        type: 'fixed',
        text: 'Al borrar tu propia cuenta desde el perfil, la ventana se quedaba abierta. Ahora la app te lleva a la pantalla de entrar.',
      },
      {
        type: 'fixed',
        text: 'En el editor de la ayuda y del blog, la vista previa no enseñaba las imágenes.',
      },
      {
        type: 'fixed',
        text: 'El icono de ITAKAI no salía en la pestaña de algunos navegadores, como Safari, Edge o Firefox. Ahora sale en todos, y también al añadir la web a la pantalla de inicio del móvil.',
      },
      {
        type: 'fixed',
        text: 'El botón de la IA no aparecía en algunos editores de texto. Además, en el editor de la ayuda y del blog sobraban unos botones de guardar y cancelar que no hacían nada.',
      },
      {
        type: 'fixed',
        text: 'Más seguridad en las historias de clases y misiones. Si se escribe HTML, ya no puede imitar botones ni tapar la pantalla.',
      },
    ],
  },
  {
    version: '0.4.0',
    date: '2026-09-25',
    title: 'Clases compartidas y cuentas sin correo',
    changes: [
      {
        type: 'new',
        text: 'Una clase puede tener varios profesores. En los ajustes de la clase, sección «Profesorado», añades a un compañero con el correo de su cuenta. Entra al momento y recibe un aviso.',
      },
      {
        type: 'new',
        text: 'Cada profesor tiene un perfil (titular, sustituto o en prácticas) y un nivel de acceso: lectura, edición o administración. El perfil propone un nivel, pero puedes cambiarlo. Cada uno ve solo los botones que su nivel le permite usar.',
      },
      {
        type: 'new',
        text: 'Quien crea la clase es su propietario. Puede pasar la propiedad a otro profesor con administración. El resto del profesorado puede salir de la clase cuando quiera.',
      },
      {
        type: 'new',
        text: 'Nueva pestaña «Historial» en cada clase: qué ha hecho cada profesor y cuándo. Puedes filtrar por profesor y por tipo de acción.',
      },
      {
        type: 'new',
        text: 'Cuentas para alumnado sin correo. En «Invitar», pestaña «Crear cuentas», las creas una a una o pegando una lista de hasta 50 nombres. ITAKAI propone un usuario y una contraseña temporal para cada alumno.',
      },
      {
        type: 'new',
        text: 'Al crear las cuentas verás la hoja de credenciales. Puedes copiarlas todas o una a una, descargar la lista o imprimirla. Las contraseñas solo se ven en ese momento: guárdalas bien.',
      },
      {
        type: 'new',
        text: 'La primera vez que el alumno entra, con su usuario y su contraseña temporal, tiene que cambiar la contraseña.',
      },
      {
        type: 'new',
        text: 'Cada alumno tiene un menú en la clase para restablecer su contraseña (en las cuentas sin correo creadas en esa clase), cambiar su alias o quitarlo de la clase.',
      },
      {
        type: 'new',
        text: 'El alumnado ve quién es el profesorado de su clase y quién le ha aprobado una entrega o le ha aplicado un comportamiento.',
      },
      {
        type: 'improved',
        text: 'Para cambiar tu correo tienes que escribir tu contraseña actual.',
      },
      {
        type: 'improved',
        text: 'Los archivos de las entregas y los documentos de las misiones solo se abren con la sesión iniciada.',
      },
      {
        type: 'improved',
        text: 'Los lectores de pantalla leen en voz alta los errores de los formularios.',
      },
      {
        type: 'improved',
        text: 'El menú lateral agrupa sus entradas bajo títulos («Clases», «Ayuda», «Cuenta»), también en el móvil.',
      },
      {
        type: 'improved',
        text: 'Las tarjetas de clase y la cabecera de cada clase resumen el horario en días y horas.',
      },
      {
        type: 'improved',
        text: 'Textos de toda la aplicación repasados en los diez idiomas: títulos y botones con mayúscula solo al principio.',
      },
      {
        type: 'fixed',
        text: 'El enlace del correo de «¿Olvidaste tu contraseña?» llevaba a una página vacía. Ahora abre la pantalla de crear la contraseña nueva, también en los correos ya enviados.',
      },
      {
        type: 'fixed',
        text: 'El alias que la clase reparte al azar podía repetirse entre compañeros. Ahora cada alumno recibe uno distinto.',
      },
      {
        type: 'fixed',
        text: 'En pantallas bajas, los botones de idioma y accesibilidad ya no tapan el formulario de entrada, el menú lateral enseña su barra de desplazamiento cuando la lista sigue, y el primer paso de crear una clase ya no se sale por debajo.',
      },
      {
        type: 'fixed',
        text: 'El horario de la clase no siempre se guardaba desde «Ajustes», y el calendario a veces salía vacío. Ahora se guarda y muestra el horario que ya tenías.',
      },
      {
        type: 'fixed',
        text: 'Cuando el asistente de IA fallaba, a veces usaba un mensaje de disculpa como historia o como nombre de la clase. Ahora te avisa del error y puedes volver a intentarlo.',
      },
      {
        type: 'fixed',
        text: 'Al crear una misión desde el asistente, la portada se perdía: la misión nacía sin imagen y había que volver a ponerla editándola. Ahora se guarda a la primera.',
      },
      {
        type: 'fixed',
        text: 'En la vista previa del asistente de misiones faltaban las monedas y el maná que se ganan; ahora se ven junto a la experiencia (XP).',
      },
    ],
  },
  {
    version: '0.3.0',
    date: '2026-09-16',
    title: 'Centro de ayuda, accesibilidad y avisos',
    changes: [
      {
        type: 'new',
        text: 'Centro de ayuda con guías para el profesorado y para el alumnado. Cada uno tiene su propia portada. El buscador encuentra lo que buscas aunque no pongas tildes.',
      },
      {
        type: 'new',
        text: 'Los artículos de ayuda tienen índice de apartados y enlaces al anterior y al siguiente, y puedes decirnos si te han sido útiles. Cada uno indica si es un tutorial, una pregunta frecuente o un vídeo, y los vídeos se ven dentro del propio artículo.',
      },
      {
        type: 'new',
        text: 'Ajustes de accesibilidad: tamaño de letra, alto contraste, modos para daltonismo y menos animación. Se guardan en tu cuenta y te acompañan de un ordenador a otro. Los tienes en tu perfil, pestaña «Configuración», y también arriba, junto al selector de idioma, en la portada y en el centro de ayuda.',
      },
      {
        type: 'new',
        text: 'Avisos dentro de ITAKAI: en el menú de la izquierda tienes «Avisos», con el número de los que no has leído (en el móvil, también sobre el botón del menú). Cada aviso te lleva a lo que avisa, y puedes marcarlos como leídos o borrarlos.',
      },
      {
        type: 'new',
        text: 'Cuando un alumno entrega un enigma te llega un aviso que abre directamente sus entregas, listas para valorar.',
      },
      {
        type: 'new',
        text: 'Avisos por correo para el alumnado: un recordatorio un día antes de que venza una misión, y un aviso cuando se revisa su entrega, con el porcentaje de completado. Cada correo sale en el idioma de quien lo recibe.',
      },
      {
        type: 'new',
        text: 'El alumnado elige en su perfil, en la tarjeta «Avisos», si quiere recibir esos correos y si quiere recordatorios de entrega.',
      },
      {
        type: 'new',
        text: 'Para administración: el centro de ayuda y el blog tienen cada uno su sección en el panel, con sus artículos y sus categorías, que se crean, editan y borran desde ahí. Hay borradores, vista previa antes de publicar y un orden que se cambia arrastrando o con el teclado. En la ayuda, los artículos pueden llevar un vídeo. La guía «Gestionar el centro de ayuda» lo explica paso a paso.',
      },
      {
        type: 'improved',
        text: 'Menú de la izquierda más claro: ya no hay desplegable con tu nombre; la ayuda, tu perfil y «Cerrar sesión» están siempre a la vista. La ayuda te lleva directamente a las guías pensadas para ti. En el móvil los encontrarás dentro del menú. La guía «Dónde encontrar ayuda» te lo resume.',
      },
      {
        type: 'improved',
        text: 'La portada de ITAKAI enlaza al centro de ayuda, también desde el pie de página. Dentro de la ayuda, si ya has iniciado sesión, el botón «Volver a la app» te devuelve a tu panel desde el ordenador. En el móvil, el menú de la portada incluye también los ajustes de accesibilidad.',
      },
      {
        type: 'improved',
        text: 'Los colores del tema «Modo Universidad» se aplican en muchos más sitios, y los textos secundarios y los fondos suaves se ven como deben.',
      },
      {
        type: 'improved',
        text: 'Las ventanas emergentes funcionan mejor con el teclado y con lectores de pantalla. El foco se queda dentro y vuelve a su sitio al cerrarlas, y las confirmaciones se cierran con Escape y muestran «Procesando» en tu idioma. Los desplegables y las ayudas emergentes también se alcanzan con el teclado.',
      },
      {
        type: 'improved',
        text: 'Las etiquetas de color claro tienen más contraste y se leen mejor.',
      },
      {
        type: 'improved',
        text: 'Cada página indica al lector de pantalla el idioma que has elegido, para que pronuncie bien los menús y los botones.',
      },
      {
        type: 'improved',
        text: 'El asistente de IA del editor de texto se abre en una ventana que funciona con teclado y lector de pantalla, y el mensaje «Generando» ya sale en tu idioma.',
      },
      {
        type: 'improved',
        text: 'La ventana para revisar entregas muestra las horas en tu idioma y se maneja mejor con el teclado.',
      },
      {
        type: 'fixed',
        text: 'El asistente de IA a veces tardaba mucho en cada paso. Ahora responde sin esas esperas.',
      },
    ],
  },
  {
    version: '0.2.1',
    date: '2026-08-10',
    title: 'Más idiomas, horarios flexibles y un asistente que te escucha',
    changes: [
      {
        type: 'new',
        text: 'Cinco idiomas nuevos: valencià, asturianu, português, ελληνικά y română. Ya son diez en total.',
      },
      {
        type: 'new',
        text: 'Configura varios tramos de horario por clase, por ejemplo lunes a primera hora y jueves a última.',
      },
      {
        type: 'new',
        text: 'Al crear una clase, indica su nivel educativo y su asignatura: las asignaturas se ajustan al nivel que elijas.',
      },
      {
        type: 'new',
        text: 'El último paso del asistente de creación te enseña una maqueta de cómo va a quedar la clase antes de crearla.',
      },
      {
        type: 'improved',
        text: 'Los filtros de plantillas se afinan solos: al marcar un nivel educativo solo te ofrecen las asignaturas de ese nivel.',
      },
      {
        type: 'improved',
        text: 'El asistente de IA tiene en cuenta lo que le pides en TODOS los pasos, no solo en el primero. Si dices que el proyecto es individual, la guía y los enigmas lo respetan.',
      },
      {
        type: 'improved',
        text: 'El asistente conoce la asignatura y el nivel de la clase al generar, y una misión conoce la historia de la clase en la que vive.',
      },
      {
        type: 'improved',
        text: 'Ya puedes adjuntar materiales de hasta 50 MB, y se te avisa del límite antes de subirlos.',
      },
      {
        type: 'fixed',
        text: 'Los enigmas de una misión dejaron de generarse desde la versión anterior. Ya vuelven a funcionar.',
      },
      {
        type: 'fixed',
        text: 'Al archivar una clase, sus alumnos se archivan con ella. La página de Alumnos tiene ahora dos pestañas, activos y archivados.',
      },
      {
        type: 'fixed',
        text: 'El botón de "quiero cambiar algo" de las guías no hacía caso a lo que le pedías: volvía a darte lo mismo.',
      },
      {
        type: 'fixed',
        text: 'Al pedir cambios sobre lo generado se perdían los materiales que habías adjuntado.',
      },
      {
        type: 'fixed',
        text: 'El nombre de la clase se partía letra a letra en la cabecera.',
      },
      {
        type: 'fixed',
        text: 'Los botones con textos largos se desbordaban en vez de crecer, y el pie del asistente se aplastaba.',
      },
      {
        type: 'fixed',
        text: 'Las fechas de la vista previa del horario ahora se leen con claridad.',
      },
    ],
  },
  {
    version: '0.2.0',
    date: '2026-07-28',
    title: 'Clases más personalizables y a tu medida',
    changes: [
      {
        type: 'new',
        text: 'Personaliza la gamificación de cada clase: niveles, XP y recompensas a tu medida, con presets como punto de partida.',
      },
      {
        type: 'new',
        text: 'Nueva pestaña "Alumnos" en cada clase con todas las estadísticas de cada estudiante de un vistazo.',
      },
      {
        type: 'new',
        text: 'Duplica una clase entera eligiendo qué copiar: misiones, historia, funcionalidades, tienda y comportamientos.',
      },
      {
        type: 'new',
        text: 'Adjunta materiales (PDF, Word, texto o imágenes) al crear una clase para que la IA genere contenido basado en ellos.',
      },
      {
        type: 'new',
        text: 'Configura el horario de la clase.',
      },
      {
        type: 'new',
        text: '"Ver como alumno": explora la plataforma tal y como la vería un estudiante y vuelve a tu vista de profesor cuando quieras.',
      },
      {
        type: 'new',
        text: 'Nueva página "Acerca de" con las novedades de cada versión.',
      },
      {
        type: 'new',
        text: 'Alterna entre vista de lista y de cuadrícula en los listados de clases y misiones.',
      },
      {
        type: 'new',
        text: 'Nueva pestaña de Ajustes en las misiones para personalizarlas, con mejor control de bloqueo y expiración.',
      },
      {
        type: 'improved',
        text: 'El asistente de IA genera el contenido en el idioma vehicular de la clase.',
      },
      {
        type: 'improved',
        text: 'Elige cómo ver el menú de pestañas: solo iconos, solo texto o ambos.',
      },
      {
        type: 'improved',
        text: 'Las clases archivadas dejan de mostrar sus misiones en los listados, y las misiones expiradas se pueden consultar en solo lectura.',
      },
      {
        type: 'fixed',
        text: 'Los menús desplegables ya no se recortan cuando aparecen dentro de tarjetas u otras zonas con scroll.',
      },
    ],
  },
  {
    version: '0.1.0',
    date: '2026-07-02',
    title: '¡ITAKAI ya está aquí!',
    changes: [
      {
        type: 'new',
        text: 'Plataforma educativa gamificada con temática de mitología griega para convertir tus clases en una aventura.',
      },
      {
        type: 'new',
        text: 'Sistema de experiencia (XP) y niveles con títulos mitológicos, de Mortal a Dios del Olimpo.',
      },
      {
        type: 'new',
        text: 'Crea clases y personalízalas: activa los módulos y recursos que quieras, con código de invitación para tus alumnos.',
      },
      {
        type: 'new',
        text: 'Diseña misiones con enigmas, fechas límite, rarezas y recompensas, adaptadas a la historia de cada clase.',
      },
      {
        type: 'new',
        text: 'Revisa las entregas y aprueba indicando el porcentaje de completado; las recompensas se ajustan a ese porcentaje.',
      },
      {
        type: 'new',
        text: 'Insignias y logros que se desbloquean automáticamente para premiar el progreso de cada estudiante.',
      },
      {
        type: 'new',
        text: 'Tienda por clase con monedas y maná para que los alumnos canjeen poderes y recompensas.',
      },
      {
        type: 'new',
        text: 'Comportamientos por clase y sistema de vidas para gestionar la actitud del aula.',
      },
      {
        type: 'new',
        text: 'Ranking de clase con podio para fomentar una competición sana.',
      },
      {
        type: 'new',
        text: 'Asistente de IA con los dioses del Olimpo que te ayuda a crear contenido y genera portadas para tus clases.',
      },
      {
        type: 'new',
        text: 'Vista del alumno con su progreso por enigmas, insignias y actividad reciente de la clase.',
      },
      {
        type: 'new',
        text: 'Disponible en 5 idiomas: castellano, inglés, catalán, euskera y gallego, con acceso mediante Google.',
      },
    ],
  },
]

/**
 * Versión actual publicada: siempre la primera entrada del changelog.
 * Fuente única de verdad, no hace falta mantenerla a mano en otro sitio.
 */
export const APP_VERSION = changelog[0]?.version ?? '0.0.0'
