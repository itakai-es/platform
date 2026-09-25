<template>
  <NavSectionHeader :label="t('common.nav.section_account')" />
  <NavItem
    v-if="profileRoute"
    :to="profileRoute"
    :label="t('common.nav.profile')"
    :icon="UserCircleIcon"
    @click="emit('navigate')"
  />
  <NavItem
    :label="t('common.nav.logout')"
    :icon="ArrowRightStartOnRectangleIcon"
    @click="handleLogout"
  />
</template>

<script setup lang="ts">
import { ArrowRightStartOnRectangleIcon, UserCircleIcon } from '@heroicons/vue/24/outline'
import { getProfileByRole } from '~/utils/navigation'

/**
 * El bloque «Cuenta» al final del menú lateral, con su título como los demás
 * bloques: perfil y cerrar sesión, a la vista y no dentro de un desplegable.
 * En un aula los ordenadores se comparten, así que salir tiene que
 * encontrarse sin buscarlo. El administrador no tiene página de perfil y solo
 * ve «Cerrar sesión». Los ajustes de accesibilidad siguen en la pestaña
 * Configuración del perfil. Emite `navigate` al pulsar cualquiera de los dos,
 * para que el menú móvil se cierre.
 */
const emit = defineEmits<{ navigate: [] }>()

const { t } = useI18n()
const authStore = useAuthStore()
const logout = useLogout()

const profileRoute = computed(() => getProfileByRole(authStore.user?.role))

const handleLogout = async () => {
  emit('navigate')
  await logout()
}
</script>
