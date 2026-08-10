/**
 * Registro de versiones de ITAKAI (changelog).
 *
 * Fuente única de la página "Acerca de". Para publicar una versión nueva:
 *   1. Añade su entrada AL PRINCIPIO del array `changelog` (más reciente primero).
 *   2. Sube el número en `app/package.json` y `api/package.json` para que coincida.
 *   3. Etiqueta la release en git: `git tag vX.Y.Z && git push --tags`.
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
