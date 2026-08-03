<template>
  <Card type="ia">
    <CardHeader :title="godName" :icon="SparklesIcon" title-tag="h3">
      <template #actions>
        <div
          class="w-12 h-12 rounded-full flex-shrink-0 overflow-hidden bg-white shadow-sm flex items-center justify-center"
        >
          <img :src="godAvatar" :alt="godName" class="w-10 h-10 object-contain" />
        </div>
      </template>
    </CardHeader>

    <!-- Message + Action Buttons -->
    <CardItem layout="column" padding="md">
      <p class="text-sm text-navy-700 leading-relaxed line-clamp-3 mb-4">
        {{ displayMessage }}
      </p>
      <div class="space-y-3 w-full">
        <Button
          v-for="action in aiActions"
          :key="action.id"
          variant="secondary-yellow"
          size="sm"
          align="left"
          full-width
          :icon-left="action.icon"
          @click="handleAction(action)"
        >
          {{ action.label }}
        </Button>
      </div>
    </CardItem>
  </Card>
</template>

<script setup lang="ts">
import { computed, ref, onMounted } from 'vue'
import {
  AcademicCapIcon,
  LightBulbIcon,
  ChatBubbleLeftRightIcon,
  SparklesIcon,
  RocketLaunchIcon,
  TrophyIcon,
  PuzzlePieceIcon,
  StarIcon,
  BookOpenIcon,
  ChartBarIcon,
  BoltIcon,
  FireIcon,
} from '@heroicons/vue/24/outline'

const { t } = useI18n()
const aiStore = useAIAssistantStore()
const authStore = useAuthStore()

interface AIAction {
  id: string
  label: string
  icon: typeof AcademicCapIcon
  chatMessage: string
}

interface Props {
  message?: string
  actions?: AIAction[]
  classId?: string
  missionId?: string
}

const props = defineProps<Props>()

const emit = defineEmits<{
  action: [action: AIAction]
}>()

const godName = computed(() => aiStore.currentGod?.name || 'Atenea')
const godAvatar = computed(() => aiStore.currentGod?.avatar || '/app/avatars/atenea.svg')

const displayMessage = computed(() => {
  if (props.message) return props.message
  const userName = authStore.user?.name?.split(' ')[0] || ''
  const greeting = userName ? `¡Hola ${userName}!` : '¡Hola!'
  return `${greeting} Soy ${godName.value}, tu asistente de IA. ¿En qué puedo ayudarte?`
})

const chatPath = computed(() => {
  const role = authStore.user?.role
  return role === 'teacher' ? '/profesor/asistente' : '/alumno/asistente'
})

const isTeacher = computed(() => authStore.user?.role === 'teacher')

// Pool of suggestions per role
const teacherPool = computed<AIAction[]>(() => {
  return [
    {
      id: 't1',
      label: t('chat.ai_actions.teacher.t1.label'),
      icon: RocketLaunchIcon,
      chatMessage: t('chat.ai_actions.teacher.t1.message'),
    },
    {
      id: 't2',
      label: t('chat.ai_actions.teacher.t2.label'),
      icon: PuzzlePieceIcon,
      chatMessage: t('chat.ai_actions.teacher.t2.message'),
    },
    {
      id: 't3',
      label: t('chat.ai_actions.teacher.t3.label'),
      icon: BookOpenIcon,
      chatMessage: t('chat.ai_actions.teacher.t3.message'),
    },
    {
      id: 't4',
      label: t('chat.ai_actions.teacher.t4.label'),
      icon: ChartBarIcon,
      chatMessage: t('chat.ai_actions.teacher.t4.message'),
    },
    {
      id: 't5',
      label: t('chat.ai_actions.teacher.t5.label'),
      icon: TrophyIcon,
      chatMessage: t('chat.ai_actions.teacher.t5.message'),
    },
    {
      id: 't6',
      label: t('chat.ai_actions.teacher.t6.label'),
      icon: AcademicCapIcon,
      chatMessage: t('chat.ai_actions.teacher.t6.message'),
    },
    {
      id: 't7',
      label: t('chat.ai_actions.teacher.t7.label'),
      icon: BoltIcon,
      chatMessage: t('chat.ai_actions.teacher.t7.message'),
    },
    {
      id: 't8',
      label: t('chat.ai_actions.teacher.t8.label'),
      icon: FireIcon,
      chatMessage: t('chat.ai_actions.teacher.t8.message'),
    },
    {
      id: 't9',
      label: t('chat.ai_actions.teacher.t9.label'),
      icon: StarIcon,
      chatMessage: t('chat.ai_actions.teacher.t9.message'),
    },
    {
      id: 't10',
      label: t('chat.ai_actions.teacher.t10.label'),
      icon: LightBulbIcon,
      chatMessage: t('chat.ai_actions.teacher.t10.message'),
    },
    {
      id: 't11',
      label: t('chat.ai_actions.teacher.t11.label'),
      icon: ChatBubbleLeftRightIcon,
      chatMessage: t('chat.ai_actions.teacher.t11.message'),
    },
    {
      id: 't12',
      label: t('chat.ai_actions.teacher.t12.label'),
      icon: BookOpenIcon,
      chatMessage: t('chat.ai_actions.teacher.t12.message'),
    },
  ]
})

const studentPool = computed<AIAction[]>(() => {
  return [
    {
      id: 's1',
      label: t('chat.ai_actions.student.s1.label'),
      icon: AcademicCapIcon,
      chatMessage: t('chat.ai_actions.student.s1.message'),
    },
    {
      id: 's2',
      label: t('chat.ai_actions.student.s2.label'),
      icon: PuzzlePieceIcon,
      chatMessage: t('chat.ai_actions.student.s2.message'),
    },
    {
      id: 's3',
      label: t('chat.ai_actions.student.s3.label'),
      icon: StarIcon,
      chatMessage: t('chat.ai_actions.student.s3.message'),
    },
    {
      id: 's4',
      label: t('chat.ai_actions.student.s4.label'),
      icon: BookOpenIcon,
      chatMessage: t('chat.ai_actions.student.s4.message'),
    },
    {
      id: 's5',
      label: t('chat.ai_actions.student.s5.label'),
      icon: ChatBubbleLeftRightIcon,
      chatMessage: t('chat.ai_actions.student.s5.message'),
    },
    {
      id: 's6',
      label: t('chat.ai_actions.student.s6.label'),
      icon: LightBulbIcon,
      chatMessage: t('chat.ai_actions.student.s6.message'),
    },
    {
      id: 's7',
      label: t('chat.ai_actions.student.s7.label'),
      icon: RocketLaunchIcon,
      chatMessage: t('chat.ai_actions.student.s7.message'),
    },
    {
      id: 's8',
      label: t('chat.ai_actions.student.s8.label'),
      icon: FireIcon,
      chatMessage: t('chat.ai_actions.student.s8.message'),
    },
    {
      id: 's9',
      label: t('chat.ai_actions.student.s9.label'),
      icon: BoltIcon,
      chatMessage: t('chat.ai_actions.student.s9.message'),
    },
    {
      id: 's10',
      label: t('chat.ai_actions.student.s10.label'),
      icon: TrophyIcon,
      chatMessage: t('chat.ai_actions.student.s10.message'),
    },
    {
      id: 's11',
      label: t('chat.ai_actions.student.s11.label'),
      icon: ChartBarIcon,
      chatMessage: t('chat.ai_actions.student.s11.message'),
    },
    {
      id: 's12',
      label: t('chat.ai_actions.student.s12.label'),
      icon: PuzzlePieceIcon,
      chatMessage: t('chat.ai_actions.student.s12.message'),
    },
  ]
})

// Pick 3 random actions, refresh on mount
const pickedIndices = ref<number[]>([])

function pickRandom() {
  const pool = isTeacher.value ? teacherPool.value : studentPool.value
  const indices = Array.from({ length: pool.length }, (_, i) => i)
  for (let i = indices.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[indices[i], indices[j]] = [indices[j], indices[i]]
  }
  pickedIndices.value = indices.slice(0, 5)
}

onMounted(pickRandom)

const aiActions = computed(() => {
  if (props.actions?.length) return props.actions
  const pool = isTeacher.value ? teacherPool.value : studentPool.value
  return pickedIndices.value.map(i => pool[i]).filter(Boolean)
})

const handleAction = (action: AIAction) => {
  if (props.actions?.length) {
    emit('action', action)
    return
  }
  navigateTo({
    path: chatPath.value,
    query: {
      message: action.chatMessage,
      assistantId: aiStore.currentGod?.id,
      ...(props.classId && { classId: props.classId }),
      ...(props.missionId && { missionId: props.missionId }),
    },
  })
}
</script>
