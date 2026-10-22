import type { ClassDeletionImpact } from '~/types/class.types'

/**
 * useClassDeletionImpact — los números de lo que se pierde al borrar una clase
 * (`GET /teacher/classes/:id/deletion-impact`), para el aviso antes de
 * confirmar. Lo usan enviarla a la papelera y borrarla ya desde ella, con
 * `ClassDeletionImpactSummary` para pintarlos. Con `scope: 'admin'`, los de
 * cualquier clase de la instancia (`GET /admin/classes/:id/deletion-impact`),
 * para la papelera del panel de administración.
 *
 * Cada apertura los pide de nuevo; una respuesta vieja no pisa la nueva.
 */
export function useClassDeletionImpact(scope: 'teacher' | 'admin' = 'teacher') {
  const fetchImpact =
    scope === 'admin'
      ? useAdminStore().fetchClassDeletionImpact
      : useTeacherStore().fetchClassDeletionImpact

  const impact = ref<ClassDeletionImpact | null>(null)
  const loading = ref(false)
  const error = ref(false)
  let run = 0

  async function load(classId: string) {
    const current = ++run
    impact.value = null
    error.value = false
    loading.value = true
    try {
      const result = await fetchImpact(classId)
      if (current === run) impact.value = result
    } catch {
      if (current === run) error.value = true
    } finally {
      if (current === run) loading.value = false
    }
  }

  return { impact, loading, error, load }
}
