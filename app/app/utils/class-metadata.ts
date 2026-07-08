/**
 * Catálogos de metadatos de clase (idioma, asignatura, nivel educativo, provincia).
 *
 * Vocabularios CERRADOS para que los filtros del marketplace de plantillas agrupen
 * bien (si fuera texto libre, "Mates"/"Matemáticas"/"matematicas" fragmentarían).
 * El valor almacenado = la etiqueta en castellano. Ámbito: España.
 *
 * Para editar el catálogo, basta con tocar estas listas.
 */

export interface MetaOption {
  value: string
  label: string
}

const toOptions = (values: string[]): MetaOption[] => values.map(v => ({ value: v, label: v }))

/** Idioma vehicular de la clase: los 5 idiomas que soporta la app (locales). */
export const CLASS_LANGUAGES = toOptions(['Castellano', 'English', 'Català', 'Euskara', 'Galego'])

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
 * Asignatura / área de conocimiento. Catálogo de ÁREAS (no de asignaturas
 * concretas), transversal a todos los niveles: en Infantil/FP/Universidad, donde
 * no hay una asignatura fija, sirve el área más próxima o "Otra". El nivel se
 * captura aparte en `educationLevel`, así que con (área + nivel) el filtro acota bien.
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
