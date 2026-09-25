import { defineStore } from 'pinia'
import type { ManagedCredentials } from '~/types/auth.types'

/**
 * La hoja de credenciales que se acaba de generar: las contraseñas temporales
 * de las cuentas recién creadas o restablecidas en una clase.
 *
 * Vive solo en la memoria de esta pestaña: ni en la URL, ni en `localStorage`,
 * ni en `sessionStorage`. Las contraseñas no se guardan en ningún otro sitio
 * (la API solo las devuelve una vez), así que al recargar o al cerrar sesión
 * desaparecen y la única salida es restablecerlas.
 */
export const useCredentialsSheetStore = defineStore('credentialsSheet', () => {
  const classId = ref<string | null>(null)
  const entries = ref<ManagedCredentials[]>([])

  /** Deja lista la hoja de una clase; sustituye a la que hubiera. */
  function show(forClassId: string, list: ManagedCredentials[]) {
    classId.value = forClassId
    entries.value = list
  }

  /** Las credenciales de la hoja de esa clase, o ninguna si la hoja es de otra. */
  function entriesFor(forClassId: string): ManagedCredentials[] {
    return classId.value === forClassId ? entries.value : []
  }

  function reset() {
    classId.value = null
    entries.value = []
  }

  return { classId, entries, show, entriesFor, reset }
})
