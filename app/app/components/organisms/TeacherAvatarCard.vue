<template>
  <Card type="settings">
    <div class="p-6">
      <div class="mb-4 flex items-center gap-3">
        <FaceSmileIcon class="h-6 w-6 text-navy-700" />
        <h3 class="text-lg font-bold text-navy-700">
          {{ t('teacher.profile.settings.avatar_title') }}
        </h3>
      </div>
      <p class="mb-4 text-sm text-navy-700/70">
        {{ t('teacher.profile.settings.avatar_description') }}
      </p>

      <!-- Cómo sale en el historial, el profesorado de la clase y la actividad -->
      <div class="mb-4 flex items-center gap-3 rounded-xl bg-white p-3">
        <Avatar :avatar-key="current" :seed="userId" :name="name" size="md" />
        <div class="min-w-0">
          <p class="text-xs text-navy-700/70">
            {{ t('teacher.profile.settings.avatar_preview') }}
          </p>
          <p class="truncate font-semibold text-navy-700">{{ name }}</p>
        </div>
      </div>

      <OptionPillGroup
        :model-value="current ?? AUTO"
        :options="options"
        :columns="4"
        fluid
        min-item-width="7.5rem"
        :aria-label="t('teacher.profile.settings.avatar_title')"
        @update:model-value="choose"
      >
        <template #option="{ option }">
          <span class="flex min-w-0 items-center justify-center gap-2">
            <Avatar
              :avatar-key="option.value === AUTO ? null : option.value"
              :seed="userId"
              :name="name"
              size="xxs"
            />
            <span class="min-w-0">{{ option.label }}</span>
          </span>
        </template>
      </OptionPillGroup>
    </div>
  </Card>
</template>

<script setup lang="ts">
import { FaceSmileIcon } from '@heroicons/vue/24/outline'
import { TEACHER_AVATAR_KEYS, teacherAvatarOf } from '~/utils/avatar'

/**
 * El avatar de docente, en la pestaña Configuración del perfil: uno por cuenta,
 * el mismo en todas sus clases. Hoy son sus iniciales sobre un color de la
 * paleta; «Automático» es el color que le toca a la cuenta sin elegir nada. Se
 * aplica al pulsar, como el tema.
 *
 * Las opciones salen del catálogo docente (`utils/avatar.ts`): un retrato que se
 * añada al catálogo aparece aquí sin tocar esta tarjeta.
 */

const AUTO = 'auto'

const { t } = useI18n()
const toast = useToast()
const authStore = useAuthStore()
const profileStore = useProfileStore()

const userId = computed(() => authStore.user?.id ?? '')
const name = computed(() => profileStore.profile?.name ?? authStore.user?.name ?? '')
/** La clave guardada, si sigue en el catálogo; si no, la de siempre. */
const current = computed(() => {
  const key = profileStore.profile?.avatar ?? authStore.user?.avatar ?? null
  return teacherAvatarOf(key) ? key : null
})

const saving = ref(false)

/** Nombre de cada entrada del catálogo docente: hoy, el de su color. */
const labels = computed<Record<string, string>>(() => ({
  purple: t('teacher.teams.colors.purple'),
  yellow: t('teacher.teams.colors.yellow'),
  mint: t('teacher.teams.colors.mint'),
  sky: t('teacher.teams.colors.sky'),
  red: t('teacher.teams.colors.red'),
  peach: t('teacher.teams.colors.peach'),
}))

const options = computed(() => [
  { value: AUTO, label: t('teacher.profile.settings.avatar_auto') },
  ...TEACHER_AVATAR_KEYS.map(key => ({ value: key, label: labels.value[key] ?? key })),
])

// Mientras se guarda no se desactivan las opciones: el foco se iría de la que se
// acaba de pulsar con el teclado. Se ignora la siguiente hasta que termine.
async function choose(value: string) {
  if (saving.value) return
  const avatar = value === AUTO ? null : value
  if (avatar === current.value) return
  saving.value = true
  const saved = await profileStore.updateAvatar(avatar)
  saving.value = false
  if (saved) toast.success(t('teacher.profile.settings.avatar_updated'))
  else toast.error(t('teacher.profile.settings.avatar_error'))
}
</script>
