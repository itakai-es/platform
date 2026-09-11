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
                  v-else-if="selectedGuide?.avatar || classGamification?.avatar"
                  :src="selectedGuide?.avatar || classGamification?.avatar"
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
          <div
            class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-3 2xl:grid-cols-5 gap-2 sm:gap-4 justify-items-center transition-opacity"
            :class="generatingAvatar ? 'opacity-50 pointer-events-none' : ''"
          >
            <SelectionCard
              v-for="guide in allGuides"
              :key="guide.id"
              :image="guide.avatar"
              :title="guide.name"
              :subtitle="guide.trait"
              :selected="selectedGuideId === guide.id"
              @click="selectGuide(guide.id)"
            />
          </div>
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

interface Guide {
  id: string
  name: string
  avatar: string
  trait: string
  bgColor: string
}

definePageMeta({ layout: 'student', middleware: ['auth', 'role'] })

const { t } = useI18n()
const toast = useToast()
const route = useRoute()
const config = useRuntimeConfig()
const gamificationStore = useGamificationStore()
const classGamificationStore = useClassGamificationStore()

const classId = computed(() => route.params.id as string)
const { ui, classGamification, ensureAvatarGuides } = useStudentClassDetail(classId)

// Progreso de la generación con la IA (estima tiempo y muestra barra).
const {
  fetchEstimate,
  startProgress,
  stopProgress,
  generationProgress,
  isOvertime,
  remainingTimeLabel,
} = useAIPrompt()

// Estado local: nickname editable, selección de guide, generación.
const nickname = ref('')
const originalNickname = ref('')
const selectedGuideId = ref('')
const originalGuideId = ref('')
const description = ref('')
const generatingAvatar = ref(false)
const generatedGuide = ref<Guide | null>(null)

const avatarGuides = computed(() => gamificationStore.guides as Guide[])
const allGuides = computed(() =>
  generatedGuide.value ? [generatedGuide.value, ...avatarGuides.value] : avatarGuides.value
)
const selectedGuide = computed(() =>
  allGuides.value.find(g => g.id === selectedGuideId.value)
)
const hasProfileChanges = computed(
  () =>
    selectedGuideId.value !== originalGuideId.value ||
    nickname.value !== originalNickname.value
)

function selectGuide(id: string) {
  selectedGuideId.value = id
}

async function saveProfile() {
  if (!hasProfileChanges.value) return
  try {
    const guide = allGuides.value.find(g => g.id === selectedGuideId.value)
    const avatarUrl = guide?.avatar || undefined
    await $fetch(`${config.public.apiBase}/students/classes/${classId.value}/profile`, {
      method: 'PUT',
      body: { nickname: nickname.value.trim() || undefined, avatarUrl },
    })
    originalNickname.value = nickname.value.trim()
    originalGuideId.value = selectedGuideId.value
    await classGamificationStore.fetchClassXp(classId.value, true)
    // Invalida el ranking cacheado para que se vuelva a fetchear con el avatar nuevo.
    ui.value.rankingData = null
    toast.success(t('student.classes.detail.avatar_tab.save_success'))
  } catch (err) {
    console.error('Error saving class profile:', err)
    toast.error(t('student.classes.detail.avatar_tab.save_error'))
  }
}

function guideToAvatarId(avatarPath: string): string {
  const match = avatarPath.match(/\/([^/]+)\.svg$/)
  return match?.[1] ?? 'polifemo'
}

async function generate() {
  if (!description.value.trim()) return
  try {
    generatingAvatar.value = true
    const avgSeconds = await fetchEstimate('avatar')
    startProgress(avgSeconds)
    const avatarPath = selectedGuide.value?.avatar ?? '/app/avatars/polifemo.svg'
    const avatar_id = guideToAvatarId(avatarPath)
    const response = await $fetch<{ avatarUrl: string; message: string }>(
      `${config.public.apiBase}/students/classes/${classId.value}/avatar/generate`,
      { method: 'POST', body: { avatar_id, prompt: description.value.trim() } }
    )
    stopProgress()
    generatedGuide.value = {
      id: 'generated-avatar',
      name: 'Avatar IA',
      avatar: response.avatarUrl,
      trait: t('student.classes.detail.avatar_tab.generated_trait'),
      bgColor: 'bg-violet-200',
    }
    selectedGuideId.value = generatedGuide.value.id
    originalGuideId.value = selectedGuideId.value
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

// Inicializar nickname y selectedGuideId a partir de classGamification y guides.
watch(
  () => classGamification.value,
  data => {
    if (!data) return
    if (data.username) {
      nickname.value = data.username
      originalNickname.value = data.username
    }
    if (data.avatar && avatarGuides.value.length > 0) {
      const match = avatarGuides.value.find(g => g.avatar === data.avatar)
      if (match) {
        selectedGuideId.value = match.id
        originalGuideId.value = match.id
      }
    }
  },
  { immediate: true }
)
watch(
  () => avatarGuides.value,
  guides => {
    if (guides.length > 0 && classGamification.value?.avatar && !selectedGuideId.value) {
      const match = guides.find(g => g.avatar === classGamification.value?.avatar)
      if (match) {
        selectedGuideId.value = match.id
        originalGuideId.value = match.id
      }
    }
  },
  { immediate: true }
)

// Al entrar a /avatar, asegurar que las guides están cargadas (no-op si ya lo están).
onMounted(() => void ensureAvatarGuides())
</script>
