import { STUDENT_AVATAR_KEYS, studentAvatarSrc, type StudentAvatarKey } from '~/utils/avatar'

export interface StudentAvatarOption {
  /** La clave del personaje, o `custom` para el avatar generado con IA. */
  id: StudentAvatarKey | 'custom'
  /** La ruta que se guarda en la matrícula. */
  src: string
  name: string
  trait: string
}

/**
 * Los personajes del catálogo del alumnado con su nombre y su rasgo en el idioma
 * de la interfaz. Lo usan la pestaña Avatar del alumnado y la ventana con la que
 * el profesorado devuelve un avatar al catálogo.
 */
export function useStudentAvatarCatalog() {
  const { t } = useI18n()

  const names = computed<Record<StudentAvatarKey, { name: string; trait: string }>>(() => ({
    atenea: {
      name: t('common.avatars.characters.atenea.name'),
      trait: t('common.avatars.characters.atenea.trait'),
    },
    odiseo: {
      name: t('common.avatars.characters.odiseo.name'),
      trait: t('common.avatars.characters.odiseo.trait'),
    },
    penelope: {
      name: t('common.avatars.characters.penelope.name'),
      trait: t('common.avatars.characters.penelope.trait'),
    },
    polifemo: {
      name: t('common.avatars.characters.polifemo.name'),
      trait: t('common.avatars.characters.polifemo.trait'),
    },
    poseidon: {
      name: t('common.avatars.characters.poseidon.name'),
      trait: t('common.avatars.characters.poseidon.trait'),
    },
  }))

  const catalog = computed<StudentAvatarOption[]>(() =>
    STUDENT_AVATAR_KEYS.map(key => ({ id: key, src: studentAvatarSrc(key), ...names.value[key] }))
  )

  /** El avatar generado con IA de una matrícula, como una opción más. */
  function customOption(src: string): StudentAvatarOption {
    return {
      id: 'custom',
      src,
      name: t('common.avatars.custom_name'),
      trait: t('common.avatars.custom_trait'),
    }
  }

  return { catalog, customOption }
}
