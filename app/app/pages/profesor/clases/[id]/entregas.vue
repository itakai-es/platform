<template>
  <div class="space-y-6">
    <PageHeader
      :title="classData ? `Entregas de ${classData.name}` : 'Entregas pendientes'"
      :subtitle="t('teacher.submissions.subtitle')"
    >
      <template #actions>
        <NuxtLink :to="`/profesor/clases/${classId}`">
          <Button variant="outline"> {{ t('teacher.submissions.back_to_class') }} </Button>
        </NuxtLink>
      </template>
    </PageHeader>

    <div v-if="loading" class="space-y-4">
      <Skeleton v-for="i in 4" :key="i" height="h-24" />
    </div>

    <EmptyState
      v-else-if="!submissions.length"
      :icon="CheckCircleIcon"
      title="No hay entregas pendientes"
      description="Esta clase no tiene nada pendiente de revisión ahora mismo."
    >
      <template #action>
        <NuxtLink :to="`/profesor/clases/${classId}`">
          <Button variant="primary">Volver al detalle</Button>
        </NuxtLink>
      </template>
    </EmptyState>

    <div v-else class="space-y-4">
      <div
        v-for="submission in submissions"
        :key="submission.id"
        class="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm"
      >
        <div class="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div class="min-w-0 space-y-2">
            <div class="flex flex-wrap items-center gap-2">
              <h2 class="text-lg font-bold text-navy-700">{{ submission.student.name }}</h2>
              <span
                class="rounded-full bg-yellow/15 px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em] text-navy-700"
              >
                {{ submission.status }}
              </span>
            </div>

            <div class="grid gap-1 text-sm text-navy-700/75">
              <p>
                <span class="font-semibold text-navy-700">Enigma:</span>
                {{ submission.enigmaTitle }}
              </p>
              <p>
                <span class="font-semibold text-navy-700">Misión:</span>
                {{ submission.missionTitle }}
              </p>
              <p>
                <span class="font-semibold text-navy-700">Archivo:</span>
                {{ submission.fileName || 'Sin archivo adjunto' }}
              </p>
              <p>
                <span class="font-semibold text-navy-700">Enviado:</span>
                {{ formatDate(submission.submittedAt) }}
              </p>
            </div>
          </div>

          <div class="flex flex-wrap gap-2 lg:justify-end">
            <Button
              v-if="submission.fileUrl"
              variant="outline"
              :disabled="processingId === submission.id"
              @click="downloadFile(submission)"
            >
              Descargar
            </Button>
            <Button
              variant="primary"
              :disabled="processingId === submission.id"
              @click="approveSubmission(submission.id)"
            >
              Aprobar
            </Button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
const { t } = useI18n()

import { CheckCircleIcon } from '@heroicons/vue/24/outline'

interface SubmissionItem {
  id: string
  student: {
    id: string
    name: string
  }
  enigmaId: string
  enigmaTitle: string
  missionTitle: string
  status: 'pendiente' | 'aprobada'
  fileName?: string
  fileUrl?: string
  submittedAt: string
}

definePageMeta({
  layout: 'teacher',
  middleware: ['auth', 'role'],
})

const route = useRoute()
const config = useRuntimeConfig()
const teacherStore = useTeacherStore()
const toast = useToast()
const effects = useEffects()

const classId = computed(() => route.params.id as string)

const loading = ref(true)
const processingId = ref<string | null>(null)

// Leemos clase + submissions directamente del store (cacheado por classId).
const classData = computed(() => {
  const cached = teacherStore.classes.find(c => c.id === classId.value)
  return cached ? { id: cached.id, name: cached.name } : null
})

const submissions = computed<SubmissionItem[]>(() => {
  const cached = teacherStore.classSubmissions.get(classId.value)
  return (cached?.submissions as SubmissionItem[]) || []
})

const loadPageData = async () => {
  loading.value = true
  try {
    await Promise.all([
      teacherStore.ensureTeacherClassById(classId.value),
      teacherStore.ensureClassSubmissions(classId.value),
    ])
  } catch (error) {
    console.error('Error loading class submissions:', error)
    toast.error('No se pudieron cargar las entregas pendientes')
  } finally {
    loading.value = false
  }
}

const approveSubmission = async (submissionId: string) => {
  processingId.value = submissionId

  try {
    await $fetch(`${config.public.apiBase}/submissions/${submissionId}/approve`, {
      method: 'POST',
    })

    // Mantiene la cache del store en sincronía sin forzar un refetch.
    teacherStore.removeSubmissionFromCache(classId.value, submissionId)
    toast.success('Entrega aprobada')
    effects.play('enigma_approved')
  } catch (error) {
    console.error('Error approving submission:', error)
    toast.error('No se pudo aprobar la entrega')
  } finally {
    processingId.value = null
  }
}

const downloadFile = async (submission: SubmissionItem) => {
  try {
    if (!submission.fileUrl) {
      toast.error('No hay archivo para descargar')
      return
    }

    const fileUrl = submission.fileUrl.startsWith('http')
      ? submission.fileUrl
      : `${config.public.apiBase}${submission.fileUrl}`

    const response = await fetch(fileUrl)
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`)
    }

    const blob = await response.blob()
    const url = window.URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = submission.fileName || 'entrega'
    document.body.appendChild(link)
    link.click()
    window.URL.revokeObjectURL(url)
    document.body.removeChild(link)
  } catch (error) {
    console.error('Error downloading submission file:', error)
    toast.error('No se pudo descargar el archivo')
  }
}

const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleString('es-ES', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

watch(classId, async (newId, oldId) => {
  if (newId && newId !== oldId) {
    await loadPageData()
  }
})

onMounted(async () => {
  await loadPageData()
})
</script>
