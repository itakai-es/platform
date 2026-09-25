import type { MaybeRefOrGetter } from 'vue'
import type { ClassAccess } from '~/types/class.types'
import { canInClass, type ClassAction } from '~/utils/class-access'

/**
 * Qué puede hacer el usuario en una clase, a partir de su acceso propio
 * (`myAccess`). Las pantallas preguntan por la acción (`can('mission.edit')`),
 * nunca por el nivel: el nivel de cada acción está en una sola tabla
 * (`utils/class-access.ts`). Mientras no se sabe el acceso, no se ofrece nada.
 */
export function useClassPermissions(access: MaybeRefOrGetter<ClassAccess | null | undefined>) {
  const current = computed(() => toValue(access) ?? null)
  const can = (action: ClassAction) => canInClass(current.value, action)
  const isOwner = computed(() => current.value?.isOwner === true)
  return { access: current, can, isOwner }
}

/**
 * Lo mismo para una pantalla que no tiene la clase cargada (el detalle de una
 * misión): busca el acceso en las clases que ya tiene el almacén y, si no está,
 * pide la clase. `known` dice si ya se sabe: hasta entonces `can()` responde que
 * no, y la pantalla debe esperar para no enseñar un «solo lectura» que no es.
 */
export function useClassPermissionsById(classId: MaybeRefOrGetter<string>) {
  const teacherStore = useTeacherStore()
  const access = ref<ClassAccess | null | undefined>(undefined)

  // También cuando se avisa de un cambio de acceso a la clase (lo guardado ya no vale).
  watch(
    [() => toValue(classId), () => teacherStore.classAccessRevision[toValue(classId)]],
    async ([id]) => {
      access.value = teacherStore.cachedClassAccess(id)
      if (access.value !== undefined) return
      try {
        const cls = await teacherStore.fetchClassById(id)
        if (toValue(classId) === id) access.value = cls?.myAccess ?? null
      } catch {
        if (toValue(classId) === id) access.value = null
      }
    },
    { immediate: true }
  )

  const known = computed(() => access.value !== undefined)
  return { ...useClassPermissions(access), known }
}
