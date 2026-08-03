<template>
  <div class="space-y-4">
    <!-- Loading State -->
    <div v-if="loading" class="space-y-3">
      <div v-for="i in 3" :key="i" class="animate-pulse">
        <div class="bg-surface border border-border-primary rounded-xl p-4">
          <div class="flex items-start gap-4">
            <div class="w-10 h-10 bg-border-primary rounded-full" />
            <div class="flex-1 space-y-2">
              <div class="h-4 bg-border-primary rounded w-1/3" />
              <div class="h-3 bg-border-primary rounded w-1/2" />
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Empty State -->
    <div v-else-if="requests.length === 0" class="text-center py-8">
      <div class="w-14 h-14 bg-mint/10 rounded-full flex items-center justify-center mx-auto mb-3">
        <CheckCircleIcon class="w-7 h-7 text-mint" />
      </div>
      <h3 class="text-base font-semibold text-navy-700 mb-1">{{ t('teacher.classes.detail.join_requests.empty_title') }}</h3>
      <p class="text-text-secondary text-sm">{{ t('teacher.classes.detail.join_requests.empty_description') }}</p>
    </div>

    <!-- Requests List -->
    <div v-else class="space-y-3">
      <div
        v-for="request in requests"
        :key="request.id"
        class="bg-surface border border-border-primary rounded-xl p-4 hover:border-purple/30 transition-colors"
      >
        <div class="flex items-start gap-3">
          <!-- Avatar -->
          <Avatar :src="request.studentAvatar" :alt="request.studentName" size="md" />

          <!-- Content -->
          <div class="flex-1 min-w-0">
            <div class="flex items-center gap-2">
              <h4 class="font-semibold text-navy-700">{{ request.studentName }}</h4>
              <span
                v-if="request.studentLevel"
                class="px-2 py-0.5 bg-purple/10 text-purple text-xs font-medium rounded-full"
              >
                Nivel {{ request.studentLevel }}
              </span>
            </div>
            <p class="text-sm text-text-secondary">@{{ request.studentUsername }}</p>
            <p v-if="request.message" class="text-sm text-text-muted mt-2 italic">
              "{{ request.message }}"
            </p>
            <p class="text-xs text-text-muted mt-2">
              Solicitado {{ formatDate(request.createdAt) }}
            </p>
          </div>

          <!-- Actions -->
          <div class="flex gap-2 flex-shrink-0">
            <Button
              variant="outline"
              size="sm"
              :disabled="processingId === request.id"
              @click="handleReject(request)"
            >
              Rechazar
            </Button>
            <Button
              variant="primary"
              size="sm"
              :disabled="processingId === request.id"
              @click="handleAccept(request)"
            >
              <CheckIcon class="w-4 h-4 mr-1" />
              Aceptar
            </Button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { CheckCircleIcon, CheckIcon } from '@heroicons/vue/24/outline'
import type { JoinRequest } from '~/types/enrollment.types'

interface Props {
  requests: JoinRequest[]
  classId: string
  loading?: boolean
}

const props = defineProps<Props>()

const emit = defineEmits<{
  accept: [request: JoinRequest]
  reject: [request: JoinRequest]
}>()

// Store
const teacherStore = useTeacherStore()
const toast = useToast()
const { t } = useI18n()

// State
const processingId = ref<string | null>(null)

// Format date
const formatDate = (date: Date | string) => {
  const d = new Date(date)
  const now = new Date()
  const diffMs = now.getTime() - d.getTime()
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

  if (diffHours < 1) return 'hace unos minutos'
  if (diffHours < 24) return `hace ${diffHours} hora${diffHours > 1 ? 's' : ''}`
  if (diffDays < 7) return `hace ${diffDays} día${diffDays > 1 ? 's' : ''}`
  return d.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })
}

// Handle accept request
const handleAccept = async (request: JoinRequest) => {
  processingId.value = request.id

  try {
    await teacherStore.acceptJoinRequest(props.classId, request.id)
    toast.success(t('common.toast.join_request_accepted', { name: request.studentName }))
    emit('accept', request)
  } catch (error: any) {
    toast.error(error.data?.message || t('common.toast.join_request_accept_error'))
  } finally {
    processingId.value = null
  }
}

// Handle reject request
const handleReject = async (request: JoinRequest) => {
  processingId.value = request.id

  try {
    await teacherStore.rejectJoinRequest(props.classId, request.id)
    toast.success(t('common.toast.join_request_rejected'))
    emit('reject', request)
  } catch (error: any) {
    toast.error(error.data?.message || t('common.toast.join_request_reject_error'))
  } finally {
    processingId.value = null
  }
}
</script>
