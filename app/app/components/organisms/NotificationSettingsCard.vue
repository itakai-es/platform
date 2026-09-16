<template>
  <Card type="settings">
    <div class="p-6">
      <div class="flex items-center gap-3 mb-4">
        <BellIcon class="w-6 h-6 text-navy-700" />
        <h3 class="text-lg font-bold text-navy-700">
          {{ title }}
        </h3>
      </div>
      <p class="text-sm text-navy-700/70 mb-5">
        {{ t('common.notification_settings.description', { section: title }) }}
      </p>

      <div class="space-y-5">
        <div v-for="row in rows" :key="row.key" class="flex items-start justify-between gap-4">
          <div>
            <p class="text-sm font-semibold text-navy-700">{{ row.label }}</p>
            <p class="text-xs text-navy-700/70">{{ row.hint }}</p>
          </div>
          <Toggle :model-value="row.value" @update:model-value="save(row.key, $event)" />
        </div>
      </div>
    </div>
  </Card>
</template>

<script setup lang="ts">
import { BellIcon } from '@heroicons/vue/24/outline'

/**
 * Avisos de la plataforma (Fase 3, punto 3).
 *
 * Los dos interruptores existían ya en `UserSettings` pero no había ninguna
 * pantalla donde tocarlos: `missionReminders` era un ajuste huérfano que nadie
 * leía ni podía cambiar. Ahora manda de verdad — el planificador lo consulta
 * antes de mandar cada recordatorio de entrega.
 *
 * Solo la monta el perfil del alumnado: al profesorado no le llega ningún
 * correo ni recordatorio de entrega, así que estos interruptores no le cambian
 * nada. Si algún día se le mandan avisos por correo, vuelve a su perfil.
 */

type PreferenceKey = 'emailNotifications' | 'missionReminders'

const { t } = useI18n()
const toast = useToast()
const profileStore = useProfileStore()

// Se llama igual que el menú y la página de avisos, a los que remite el texto.
const title = computed(() => t('common.notifications.title'))

// Valor optimista mientras el guardado va de camino: el interruptor se mueve al
// momento y el perfil (canónico) manda en cuanto responde el servidor.
const pending = reactive<Partial<Record<PreferenceKey, boolean>>>({})

const valueOf = (key: PreferenceKey) => pending[key] ?? profileStore.preferences[key]

const rows = computed(() => [
  {
    key: 'emailNotifications' as PreferenceKey,
    label: t('common.notification_settings.email.title'),
    hint: t('common.notification_settings.email.description'),
    value: valueOf('emailNotifications'),
  },
  {
    key: 'missionReminders' as PreferenceKey,
    label: t('common.notification_settings.reminders.title'),
    hint: t('common.notification_settings.reminders.description'),
    value: valueOf('missionReminders'),
  },
])

const save = async (key: PreferenceKey, value: boolean) => {
  pending[key] = value

  const result = await profileStore.updatePreferences({ [key]: value })
  if (result.success) toast.success(t('common.notification_settings.updated'))
  else toast.error(result.message || t('common.notification_settings.update_error'))

  // Se suelta el valor optimista: a partir de aquí manda el perfil, tanto si se
  // guardó como si el fallo dejó el ajuste anterior.
  pending[key] = undefined
}
</script>
