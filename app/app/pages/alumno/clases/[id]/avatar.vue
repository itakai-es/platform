<template>
  <div class="space-y-6">
    <div class="flex flex-col xl:flex-row gap-6">
      <!-- Columna izq: avatar actual + nickname + guardar -->
      <div class="xl:w-80 2xl:w-96 flex-shrink-0">
        <Card type="clases">
          <div class="flex flex-col items-center text-center">
            <!-- Avatar -->
            <div class="relative mb-4">
              <div
                class="w-64 h-72 sm:w-72 sm:h-80 md:w-80 md:h-[22rem] xl:w-72 xl:h-80 2xl:w-80 2xl:h-[22rem] rounded-3xl flex items-center justify-center overflow-hidden border-4 border-white shadow-lg p-4 bg-white mx-auto"
              >
                <div
                  v-if="generatingAvatar"
                  class="w-full h-full flex flex-col items-center justify-center gap-4 p-4"
                >
                  <SparklesIcon class="w-16 h-16 text-navy-700 animate-pulse" />
                  <p class="text-sm font-bold text-navy-700 text-center px-2">
                    {{ t('student.classes.detail.avatar_tab.generating') }}
                  </p>
                  <div class="w-full max-w-[200px]">
                    <AILoadingBar
                      :progress="generationProgress"
                      :is-overtime="isOvertime"
                      :remaining-label="remainingTimeLabel"
                    />
                  </div>
                </div>
                <img
                  v-else-if="selectedSrc"
                  :src="getImageUrl(selectedSrc)"
                  :alt="classGamification?.username"
                  class="w-full h-full object-contain"
                />
                <div v-else class="flex flex-col items-center justify-center text-center p-4">
                  <UserIcon class="w-20 h-20 text-navy-700/20 mb-4" />
                  <p class="text-navy-700/70 text-sm font-medium">
                    {{ t('student.classes.detail.avatar_tab.no_guide_hint') }}
                  </p>
                </div>
              </div>
            </div>

            <!-- Cómo sale en el resto de la clase: retrato pequeño sobre su color -->
            <div
              class="mb-4 flex w-full max-w-sm items-center gap-3 rounded-xl bg-white p-3 text-left"
            >
              <Avatar
                :src="selectedSrc"
                :name="nickname || classGamification?.username"
                :seed="avatarSeed"
                size="sm"
              />
              <div class="min-w-0">
                <p class="text-xs text-navy-700/70">
                  {{ t('student.classes.detail.avatar_tab.how_others_see') }}
                </p>
                <p class="truncate font-semibold text-navy-700">
                  {{ nickname || classGamification?.username }}
                </p>
              </div>
            </div>

            <!-- Editable nickname -->
            <div class="w-full max-w-sm">
              <div class="relative group">
                <span
                  class="absolute left-4 top-1/2 -translate-y-1/2 text-xl font-bold text-navy-700/50"
                  >@</span
                >
                <input
                  v-model="nickname"
                  type="text"
                  maxlength="20"
                  :disabled="generatingAvatar"
                  class="w-full text-xl font-bold text-navy-700 bg-white rounded-xl border-2 border-navy-700/20 hover:border-navy-700/40 focus:border-navy-700 focus:outline-none focus:ring-2 focus:ring-navy-700/20 transition-all py-3 pl-10 pr-12 disabled:opacity-50 disabled:cursor-not-allowed"
                  :placeholder="t('student.classes.detail.avatar_tab.nickname_placeholder')"
                />
                <PencilSquareIcon
                  class="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-navy-700/50 group-hover:text-navy-700/60 pointer-events-none"
                />
              </div>
            </div>

            <div class="mt-6 w-full max-w-sm">
              <Button
                variant="primary"
                size="lg"
                full-width
                :disabled="!hasProfileChanges || generatingAvatar"
                :icon-left="CheckCircleIcon"
                @click="saveProfile"
              >
                {{ t('student.classes.detail.avatar_tab.save_changes') }}
              </Button>
            </div>
          </div>
        </Card>
      </div>

      <!-- Columna der: guides + generador -->
      <div class="flex-1 space-y-6">
        <!-- Guide selector -->
        <div class="bg-gradient-to-br from-sky-200 to-sky-300 rounded-3xl p-6">
          <div class="flex items-center gap-3 mb-6">
            <UserIcon class="w-6 h-6 text-navy-700" />
            <h3 class="text-lg font-bold text-navy-700">
              {{ t('student.classes.detail.avatar_tab.choose_guide') }}
            </h3>
          </div>
          <AvatarCatalogGrid
            v-model="selectedSrc"
            :options="options"
            :label="t('student.classes.detail.avatar_tab.choose_guide')"
            :disabled="generatingAvatar"
            class="grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-3 2xl:grid-cols-5"
          />
        </div>

        <!-- Generador -->
        <div class="bg-gradient-to-br from-sky-200 to-sky-300 rounded-3xl p-6">
          <div class="flex items-center gap-3 mb-4">
            <PencilSquareIcon class="w-6 h-6 text-navy-700" />
            <h3 class="text-lg font-bold text-navy-700">
              {{ t('student.classes.detail.avatar_tab.describe_avatar') }}
            </h3>
          </div>
          <div :class="generatingAvatar ? 'opacity-60 pointer-events-none' : ''">
            <div class="bg-white/50 rounded-2xl p-4 mb-4">
              <p class="text-navy-700/80 text-sm">
                <span class="font-semibold">{{
                  t('student.classes.detail.avatar_tab.example_label')
                }}</span>
                {{ t('student.classes.detail.avatar_tab.example_text') }}
              </p>
            </div>
            <TextArea
              v-model="description"
              :placeholder="t('student.classes.detail.avatar_tab.placeholder')"
              :rows="4"
              resize="none"
              :disabled="generatingAvatar"
            />
            <div class="flex items-start gap-2 mt-4 text-navy-700/70 text-sm">
              <LightBulbIcon class="w-5 h-5 flex-shrink-0 mt-0.5" />
              <p>{{ t('student.classes.detail.avatar_tab.tip') }}</p>
            </div>
          </div>
          <div class="flex flex-col sm:flex-row gap-3 mt-6">
            <Button
              variant="primary"
              size="lg"
              class="w-full"
              :icon-left="SparklesIcon"
              :loading="generatingAvatar"
              :disabled="!description.trim() || generatingAvatar"
              @click="generate"
            >
              {{
                generatingAvatar
                  ? t('student.classes.detail.avatar_tab.generating')
                  : t('student.classes.detail.avatar_tab.generate_button')
              }}
            </Button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import {
  UserIcon,
  PencilSquareIcon,
  SparklesIcon,
  LightBulbIcon,
  CheckCircleIcon,
} from '@heroicons/vue/24/outline'
import { catalogKeyOf, studentAvatarSeed } from '~/utils/avatar'

definePageMeta({ layout: 'student', middleware: ['auth', 'role'] })

const { t } = useI18n()
const toast = useToast()
const route = useRoute()
const config = useRuntimeConfig()
const authStore = useAuthStore()
const classGamificationStore = useClassGamificationStore()

const classId = computed(() => route.params.id as string)
const { ui, classGamification } = useStudentClassDetail(classId)
const { catalog, customOption } = useStudentAvatarCatalog()
const { getImageUrl } = useImageUrl()

// Progreso de la generación con la IA (estima tiempo y muestra barra).
const {
  fetchEstimate,
  startProgress,
  stopProgress,
  generationProgress,
  isOvertime,
  remainingTimeLabel,
} = useAIPrompt()

// Estado local: alias editable, avatar elegido (su ruta) y generación.
const nickname = ref('')
const originalNickname = ref('')
const selectedSrc = ref<string | null>(null)
const originalSrc = ref<string | null>(null)
/** El avatar generado con IA de esta matrícula, si lo tiene: sale como una opción más. */
const customSrc = ref<string | null>(null)
const description = ref('')
const generatingAvatar = ref(false)

const options = computed(() =>
  customSrc.value ? [customOption(customSrc.value), ...catalog.value] : catalog.value
)

/** El color del avatar sale de la matrícula: la clase y quien la tiene. */
const avatarSeed = computed(() => studentAvatarSeed(classId.value, authStore.user?.id ?? ''))

const hasProfileChanges = computed(
  () => selectedSrc.value !== originalSrc.value || nickname.value !== originalNickname.value
)

async function saveProfile() {
  if (!hasProfileChanges.value) return
  try {
    await $fetch(`${config.public.apiBase}/students/classes/${classId.value}/profile`, {
      method: 'PUT',
      body: {
        nickname: nickname.value.trim() || undefined,
        avatarUrl: selectedSrc.value || undefined,
      },
    })
    originalNickname.value = nickname.value.trim()
    originalSrc.value = selectedSrc.value
    // Al dejar el generado con IA por un personaje, la imagen se borra y ya no se
    // puede volver a ella: deja de ofrecerse.
    if (catalogKeyOf(selectedSrc.value)) customSrc.value = null
    await classGamificationStore.fetchClassXp(classId.value, true)
    // Invalida el ranking cacheado para que se vuelva a fetchear con el avatar nuevo.
    ui.value.rankingData = null
    toast.success(t('student.classes.detail.avatar_tab.save_success'))
  } catch (err) {
    console.error('Error saving class profile:', err)
    toast.error(t('student.classes.detail.avatar_tab.save_error'))
  }
}

async function generate() {
  if (!description.value.trim()) return
  try {
    generatingAvatar.value = true
    const avgSeconds = await fetchEstimate('avatar')
    startProgress(avgSeconds)
    // La IA parte del personaje elegido; con el generado elegido, del de siempre.
    const avatar_id = catalogKeyOf(selectedSrc.value) ?? 'polifemo'
    const response = await $fetch<{ avatarUrl: string; message: string }>(
      `${config.public.apiBase}/students/classes/${classId.value}/avatar/generate`,
      { method: 'POST', body: { avatar_id, prompt: description.value.trim() } }
    )
    stopProgress()
    // El servidor ya lo ha guardado en la matrícula.
    customSrc.value = response.avatarUrl
    selectedSrc.value = response.avatarUrl
    originalSrc.value = response.avatarUrl
    await classGamificationStore.fetchClassXp(classId.value, true)
    toast.success(response.message || t('student.classes.detail.avatar_tab.save_success'))
  } catch (err) {
    stopProgress()
    console.error('Error generating avatar:', err)
    const detail =
      (err as { data?: { message?: string }; message?: string })?.data?.message ||
      (err as { message?: string })?.message
    toast.error(
      detail
        ? t('student.classes.detail.avatar_tab.generate_error_with_detail', { detail })
        : t('student.classes.detail.avatar_tab.generate_error')
    )
  } finally {
    generatingAvatar.value = false
    stopProgress()
  }
}

// Alias y avatar de partida, de la matrícula. Un avatar que no es del catálogo
// es el generado con IA: se ofrece para poder quedárselo. Si cambia fuera (su
// docente lo devuelve al catálogo) y aquí no hay nada sin guardar, se sigue al de
// la matrícula: el generado que se retiró ya no está.
watch(
  () => classGamification.value,
  data => {
    if (!data) return
    if (data.username) {
      nickname.value = data.username
      originalNickname.value = data.username
    }
    const untouched = selectedSrc.value === originalSrc.value
    if (
      data.avatar &&
      (originalSrc.value === null || (untouched && data.avatar !== originalSrc.value))
    ) {
      customSrc.value = catalogKeyOf(data.avatar) ? null : data.avatar
      selectedSrc.value = data.avatar
      originalSrc.value = data.avatar
    }
  },
  { immediate: true }
)
</script>
