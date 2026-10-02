/**
 * Importar una plantilla: crea una clase nueva del profesor con lo
 * reutilizable de la plantilla (historia, portada, funcionalidades, tienda y
 * comportamientos) y, si se piden, sus misiones, que llegan sin fecha límite,
 * sin documentos y sin insignias. Es el mismo paso desde la tarjeta y la
 * previsualización del catálogo del profesorado y desde la ficha pública, con
 * los mismos avisos.
 *
 * Solo lo puede hacer un profesor con sesión: la ruta cuelga de `/teacher`.
 * Adónde ir después lo decide quien importa; lo normal, a la clase nueva.
 */
export function useTemplateImport() {
  const config = useRuntimeConfig()
  const toast = useToast()
  const { t } = useI18n()
  const classesStore = useClassesStore()
  const teacherStore = useTeacherStore()

  /** La plantilla que se está importando; una cada vez. */
  const importingId = ref<string | null>(null)

  /**
   * Importa la plantilla `id`; con `missions`, también sus misiones. Devuelve
   * la clase nueva, o `null` si no se ha podido.
   */
  async function importTemplate(id: string, { missions = false }: { missions?: boolean } = {}) {
    if (importingId.value) return null
    importingId.value = id
    try {
      const res = await $fetch<{ class: { id: string; name: string }; missions?: number }>(
        `${config.public.apiBase}/teacher/templates/${id}/import`,
        { method: 'POST', body: { missions } }
      )
      // Se vuelven a pedir las clases (la nueva) y, como al importar una misión,
      // el listado general de misiones, que ya puede traer las suyas.
      classesStore.hasLoadedClasses = false
      teacherStore.hasLoadedClasses = false
      teacherStore.hasLoadedMissions = false
      // Las que ha copiado la API, que son las que tenía la plantilla al importarla.
      const copied = res.missions ?? 0
      toast.success(
        copied > 0
          ? t(
              'teacher.templates.import_success_missions',
              { name: res.class.name, count: copied },
              copied
            )
          : t('teacher.templates.import_success', { name: res.class.name })
      )
      return res.class
    } catch {
      toast.error(t('teacher.templates.import_error'))
      return null
    } finally {
      importingId.value = null
    }
  }

  return { importingId, importTemplate }
}
