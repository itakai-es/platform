<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { XMarkIcon } from '@heroicons/vue/24/outline'
import Button from '@/components/atoms/Button.vue'

const { t } = useI18n()

interface Reward {
  type: 'xp' | 'item' | 'badge'
  name: string
  amount?: number
  icon?: string
}

interface Props {
  show: boolean
  oldLevel: number
  newLevel: number
  className?: string
  /** Color del tramo del nuevo nivel (config de niveles de la clase). */
  color?: string
  rewards?: Reward[]
  /** When false, the celebratory confetti is skipped (class has visual effects disabled). */
  effects?: boolean
}

interface Emits {
  (e: 'close'): void
}

const props = withDefaults(defineProps<Props>(), {
  rewards: () => [],
  effects: true,
})

const emit = defineEmits<Emits>()

const confettiCanvas = ref<HTMLCanvasElement | null>(null)
let confettiInterval: ReturnType<typeof setInterval> | null = null
let animationFrame: number | null = null

interface ConfettiParticle {
  x: number
  y: number
  vx: number
  vy: number
  color: string
  size: number
  rotation: number
  rotationSpeed: number
}

const particles: ConfettiParticle[] = []

function createConfetti() {
  if (!confettiCanvas.value) return

  const canvas = confettiCanvas.value
  canvas.width = window.innerWidth
  canvas.height = window.innerHeight

  const colors = ['#FFD166', '#6FEDB7', '#C4B5FD', '#10B981', '#EF4444', '#3B82F6'] as const

  for (let i = 0; i < 100; i++) {
    particles.push({
      x: Math.random() * canvas.width,
      y: -10,
      vx: (Math.random() - 0.5) * 4,
      vy: Math.random() * 3 + 2,
      color: colors[Math.floor(Math.random() * colors.length)] as string,
      size: Math.random() * 8 + 4,
      rotation: Math.random() * 360,
      rotationSpeed: (Math.random() - 0.5) * 10,
    })
  }
}

function animateConfetti() {
  if (!confettiCanvas.value) return

  const canvas = confettiCanvas.value
  const ctx = canvas.getContext('2d')
  if (!ctx) return

  ctx.clearRect(0, 0, canvas.width, canvas.height)

  particles.forEach((p, index) => {
    ctx.save()
    ctx.translate(p.x, p.y)
    ctx.rotate((p.rotation * Math.PI) / 180)
    ctx.fillStyle = p.color
    ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size)
    ctx.restore()

    p.x += p.vx
    p.y += p.vy
    p.rotation += p.rotationSpeed
    p.vy += 0.1 // gravity

    if (p.y > canvas.height) {
      particles.splice(index, 1)
    }
  })

  if (particles.length > 0) {
    animationFrame = requestAnimationFrame(animateConfetti)
  }
}

function startConfetti() {
  createConfetti()
  animateConfetti()

  confettiInterval = setInterval(() => {
    createConfetti()
  }, 300)
}

function stopConfetti() {
  if (confettiInterval) {
    clearInterval(confettiInterval)
    confettiInterval = null
  }
  if (animationFrame) {
    cancelAnimationFrame(animationFrame)
    animationFrame = null
  }
  particles.length = 0
}

function handleClose() {
  stopConfetti()
  emit('close')
}

onMounted(() => {
  if (props.show && props.effects) {
    startConfetti()
  }
})

onUnmounted(() => {
  stopConfetti()
})

function getRewardIcon(type: string): string {
  const icons: Record<string, string> = {
    xp: '✨',
    item: '🎁',
    badge: '🏆',
  }
  return icons[type] || '🎁'
}
</script>

<template>
  <Transition name="modal">
    <div
      v-if="show"
      class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
      data-testid="level-up-modal-overlay"
      @click.self="handleClose"
    >
      <!-- Confetti Canvas -->
      <canvas
        ref="confettiCanvas"
        class="absolute inset-0 pointer-events-none"
        data-testid="confetti-canvas"
      />

      <!-- Modal Content -->
      <div
        class="relative bg-white rounded-3xl p-8 max-w-md w-full text-center shadow-2xltransition-all"
        data-testid="level-up-modal"
      >
        <!-- Close Button -->
        <button
          class="absolute top-4 right-4 text-text-secondary hover:text-text-muted transition-colors"
          data-testid="level-up-close-btn"
          @click="handleClose"
        >
          <XMarkIcon class="w-6 h-6" />
        </button>

        <!-- Celebration Icon -->
        <div class="text-6xl mb-4 animate-bounce">🎉</div>

        <!-- Level Up Message -->
        <h2 class="text-3xl font-bold mb-2" data-testid="level-up-title">
          {{ t('common.level_up.title') }}
        </h2>

        <div class="flex items-center justify-center gap-4 mb-6">
          <span class="text-5xl font-bold text-text-secondary" data-testid="old-level">
            {{ oldLevel }}
          </span>
          <span class="text-3xl text-student">→</span>
          <span
            class="text-5xl font-bold text-student"
            :style="color ? { color } : undefined"
            data-testid="new-level"
          >
            {{ newLevel }}
          </span>
        </div>

        <p class="text-text-muted mb-6">
          {{
            className
              ? t('common.level_up.congratulations_class', { level: newLevel, className })
              : t('common.level_up.congratulations', { level: newLevel })
          }}
        </p>

        <!-- Rewards Section -->
        <div v-if="rewards.length > 0" class="mb-6">
          <h3 class="text-lg font-semibold mb-3">
            {{ t('common.level_up.rewards_title') }}
          </h3>
          <div class="space-y-2">
            <div
              v-for="(reward, index) in rewards"
              :key="index"
              class="flex items-center justify-between bg-gray-50 rounded-lg p-3"
              data-testid="level-up-reward"
            >
              <div class="flex items-center gap-2">
                <span class="text-2xl" data-testid="reward-icon">
                  {{ reward.icon ?? getRewardIcon(reward.type) }}
                </span>
                <span class="font-medium" data-testid="reward-name">
                  {{ reward.name }}
                </span>
              </div>
              <span v-if="reward.amount" class="text-student font-bold" data-testid="reward-amount">
                +{{ reward.amount }}
              </span>
            </div>
          </div>
        </div>

        <!-- Close Button -->
        <Button
          variant="primary"
          size="lg"
          class="w-full"
          data-testid="level-up-continue-btn"
          @click="handleClose"
        >
          {{ t('common.level_up.continue') }}
        </Button>
      </div>
    </div>
  </Transition>
</template>

<style scoped>
.modal-enter-active,
.modal-leave-active {
  transition: opacity 0.3s ease;
}

.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}

.modal-enter-active .relative,
.modal-leave-active .relative {
  transition: 0.3s ease;
}

.modal-enter-from .relative {
  transform: scale(0.9);
}

.modal-leave-to .relative {
  transform: scale(0.9);
}
</style>
