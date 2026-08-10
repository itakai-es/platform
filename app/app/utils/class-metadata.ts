/**
 * Catálogos de metadatos de clase (idioma, asignatura, nivel educativo, provincia).
 *
 * Vocabularios CERRADOS para que los filtros del marketplace de plantillas agrupen
 * bien (si fuera texto libre, "Mates"/"Matemáticas"/"matematicas" fragmentarían).
 * El valor almacenado = la etiqueta en castellano. Ámbito: España.
 *
 * Para editar el catálogo, basta con tocar estas listas.
 */

import { APP_LANGUAGES } from './app-languages'

export interface MetaOption {
  value: string
  label: string
}

const toOptions = (values: string[]): MetaOption[] => values.map(v => ({ value: v, label: v }))

/**
 * Idioma vehicular de la clase: los idiomas que soporta la app (locales).
 * Se deriva de APP_LANGUAGES para que añadir un locale nuevo no requiera tocar
 * esta lista. El valor almacenado sigue siendo el endónimo ("Castellano",
 * "Català"…), que es lo que ya hay guardado en la columna `language`.
 */
export const CLASS_LANGUAGES = toOptions(APP_LANGUAGES.map(lang => lang.endonym))

/**
 * Mapa idioma de la clase → código de locale, para que la IA genere el texto
 * (narrativa, títulos, guía) en el idioma vehicular elegido por el profe.
 */
export const CLASS_LANGUAGE_TO_LOCALE: Record<string, string> = Object.fromEntries(
  APP_LANGUAGES.map(lang => [lang.endonym, lang.code])
)

/** Nivel educativo (sistema español, todos los niveles). */
export const CLASS_EDUCATION_LEVELS = toOptions([
  'Educación Infantil',
  'Educación Primaria',
  'Educación Secundaria (ESO)',
  'Bachillerato',
  'FP Básica',
  'FP de Grado Medio',
  'FP de Grado Superior',
  'Enseñanzas universitarias',
  'Otras enseñanzas',
])

/**
 * Asignatura / área de conocimiento GENÉRICA, transversal a todos los niveles.
 * Se usa como fallback cuando aún no hay nivel elegido y para "Otras enseñanzas".
 * Para cada nivel concreto hay un catálogo propio en `CLASS_SUBJECTS_BY_LEVEL`.
 */
export const CLASS_SUBJECTS = toOptions([
  'Matemáticas',
  'Lengua y Literatura',
  'Lengua extranjera',
  'Lenguas clásicas (Latín / Griego)',
  'Ciencias de la Naturaleza',
  'Biología y Geología',
  'Física y Química',
  'Geografía e Historia',
  'Ciencias Sociales',
  'Economía',
  'Filosofía',
  'Tecnología',
  'Informática / TIC',
  'Educación Física',
  'Música',
  'Educación Artística y Plástica',
  'Religión / Valores',
  'Otra',
])

/** Las 26 familias profesionales de FP: mismo catálogo para Básica, Medio y Superior. */
const FP_FAMILIES = [
  'Actividades Físicas y Deportivas',
  'Administración y Gestión',
  'Agraria',
  'Artes Gráficas',
  'Artes y Artesanías',
  'Comercio y Marketing',
  'Edificación y Obra Civil',
  'Electricidad y Electrónica',
  'Energía y Agua',
  'Fabricación Mecánica',
  'Hostelería y Turismo',
  'Imagen Personal',
  'Imagen y Sonido',
  'Industrias Alimentarias',
  'Industrias Extractivas',
  'Informática y Comunicaciones',
  'Instalación y Mantenimiento',
  'Madera, Mueble y Corcho',
  'Marítimo-Pesquera',
  'Química',
  'Sanidad',
  'Seguridad y Medio Ambiente',
  'Servicios Socioculturales y a la Comunidad',
  'Textil, Confección y Piel',
  'Transporte y Mantenimiento de Vehículos',
  'Vidrio y Cerámica',
  'Otra',
]

/**
 * Asignaturas por nivel educativo (claves = valores de `CLASS_EDUCATION_LEVELS`).
 * Currículo español (LOMLOE): áreas en Infantil, asignaturas en Primaria/ESO/
 * Bachillerato, familias profesionales en FP y ramas de conocimiento en universidad.
 * Todas las listas cierran con "Otra" como escape.
 */
export const CLASS_SUBJECTS_BY_LEVEL: Record<string, MetaOption[]> = {
  'Educación Infantil': toOptions([
    'Crecimiento en Armonía',
    'Descubrimiento y Exploración del Entorno',
    'Comunicación y Representación de la Realidad',
    'Lengua Extranjera',
    'Religión',
    'Otra',
  ]),
  'Educación Primaria': toOptions([
    'Matemáticas',
    'Lengua Castellana y Literatura',
    'Lengua Cooficial y Literatura',
    'Lengua Extranjera',
    'Conocimiento del Medio Natural, Social y Cultural',
    'Ciencias de la Naturaleza',
    'Ciencias Sociales',
    'Educación Artística',
    'Educación Física',
    'Educación en Valores Cívicos y Éticos',
    'Religión',
    'Otra',
  ]),
  'Educación Secundaria (ESO)': toOptions([
    'Matemáticas',
    'Lengua Castellana y Literatura',
    'Lengua Cooficial y Literatura',
    'Lengua Extranjera',
    'Biología y Geología',
    'Física y Química',
    'Geografía e Historia',
    'Tecnología y Digitalización',
    'Digitalización',
    'Educación Física',
    'Educación Plástica, Visual y Audiovisual',
    'Música',
    'Economía y Emprendimiento',
    'Latín',
    'Cultura Clásica',
    'Filosofía',
    'Educación en Valores Cívicos y Éticos',
    'Religión',
    'Otra',
  ]),
  Bachillerato: toOptions([
    'Matemáticas',
    'Matemáticas Aplicadas a las Ciencias Sociales',
    'Lengua Castellana y Literatura',
    'Lengua Cooficial y Literatura',
    'Lengua Extranjera',
    'Filosofía',
    'Historia de la Filosofía',
    'Historia de España',
    'Historia del Arte',
    'Geografía',
    'Biología',
    'Geología y Ciencias Ambientales',
    'Física',
    'Química',
    'Física y Química',
    'Dibujo Técnico',
    'Tecnología e Ingeniería',
    'Economía',
    'Empresa y Diseño de Modelos de Negocio',
    'Latín',
    'Griego',
    'Literatura Universal',
    'Educación Física',
    'Música',
    'Artes Escénicas',
    'Otra',
  ]),
  'FP Básica': toOptions(FP_FAMILIES),
  'FP de Grado Medio': toOptions(FP_FAMILIES),
  'FP de Grado Superior': toOptions(FP_FAMILIES),
  'Enseñanzas universitarias': toOptions([
    'Artes y Humanidades',
    'Ciencias',
    'Ciencias de la Salud',
    'Ciencias Sociales y Jurídicas',
    'Ingeniería y Arquitectura',
    'Otra',
  ]),
  'Otras enseñanzas': CLASS_SUBJECTS,
}

/**
 * Asignaturas aplicables a un nivel. Sin nivel (o nivel desconocido) devuelve
 * el catálogo genérico transversal.
 */
export function subjectsForLevel(level?: string | null): MetaOption[] {
  return (level && CLASS_SUBJECTS_BY_LEVEL[level]) || CLASS_SUBJECTS
}

/** Une catálogos sin duplicados, con "Otra" siempre al final. */
const mergeSubjects = (catalogs: MetaOption[][]): MetaOption[] => {
  const seen = new Set<string>()
  const unique = catalogs
    .flat()
    .filter(o => o.value !== 'Otra' && !seen.has(o.value) && seen.add(o.value))
  return [...unique, { value: 'Otra', label: 'Otra' }]
}

/**
 * Unión del catálogo genérico y los de todos los niveles.
 * Para filtros que cruzan niveles, como el marketplace de plantillas.
 */
export const CLASS_SUBJECTS_ALL: MetaOption[] = mergeSubjects([
  CLASS_SUBJECTS,
  ...Object.values(CLASS_SUBJECTS_BY_LEVEL),
])

/**
 * Asignaturas aplicables a un conjunto de niveles (filtros multi-selección).
 * Sin niveles elegidos devuelve la unión completa.
 */
export function subjectsForLevels(levels: string[]): MetaOption[] {
  if (!levels.length) return CLASS_SUBJECTS_ALL
  return mergeSubjects(levels.map(l => subjectsForLevel(l)))
}

/**
 * Línea legible de metadatos para el contexto que se le pasa a la IA ("Asignatura:
 * Matemáticas | Nivel educativo: Bachillerato"). Los valores almacenados ya SON la
 * etiqueta, así que no hay que resolverlos contra los catálogos.
 *
 * Vive aquí y no en cada asistente para que la clase y la misión describan su
 * contexto igual: si difieren, la IA recibe cosas distintas según el paso.
 */
export function classMetaLine(meta: {
  subject?: string | null
  educationLevel?: string | null
}): string {
  const parts: string[] = []
  if (meta.subject) parts.push(`Asignatura: ${meta.subject}`)
  if (meta.educationLevel) parts.push(`Nivel educativo: ${meta.educationLevel}`)
  return parts.join(' | ')
}

/** Las 50 provincias españolas. */
export const SPANISH_PROVINCES = toOptions([
  'A Coruña',
  'Álava',
  'Albacete',
  'Alicante',
  'Almería',
  'Asturias',
  'Ávila',
  'Badajoz',
  'Barcelona',
  'Bizkaia',
  'Burgos',
  'Cáceres',
  'Cádiz',
  'Cantabria',
  'Castellón',
  'Ciudad Real',
  'Córdoba',
  'Cuenca',
  'Gipuzkoa',
  'Girona',
  'Granada',
  'Guadalajara',
  'Huelva',
  'Huesca',
  'Illes Balears',
  'Jaén',
  'La Rioja',
  'Las Palmas',
  'León',
  'Lleida',
  'Lugo',
  'Madrid',
  'Málaga',
  'Murcia',
  'Navarra',
  'Ourense',
  'Palencia',
  'Pontevedra',
  'Salamanca',
  'Santa Cruz de Tenerife',
  'Segovia',
  'Sevilla',
  'Soria',
  'Tarragona',
  'Teruel',
  'Toledo',
  'Valencia',
  'Valladolid',
  'Zamora',
  'Zaragoza',
])
