<template>
  <Teleport to="body">
    <div class="fixed top-4 right-4 z-[99999] flex flex-col gap-2 pointer-events-none print:hidden">
      <TransitionGroup name="toast">
        <div
          v-for="toast in toasts"
          :key="toast.id"
          :class="[
            'pointer-events-auto min-w-[280px] max-w-[360px] rounded-xl shadow-lg overflow-hidden',
            typeStyles[toast.type].bg,
          ]"
        >
          <!-- Content -->
          <div class="flex items-center gap-3 px-4 py-3">
            <component
              :is="typeStyles[toast.type].icon"
              :class="['w-5 h-5 flex-shrink-0', typeStyles[toast.type].iconColor]"
            />
            <p :class="['text-sm font-medium flex-1', typeStyles[toast.type].text]">
              {{ toast.message }}
            </p>
            <button
              :class="[
                'p-1 rounded-full hover:bg-black/10 transition-colors',
                typeStyles[toast.type].text,
              ]"
              @click="removeToast(toast.id)"
            >
              <XMarkIcon class="w-4 h-4" />
            </button>
          </div>
          <!-- Progress bar -->
          <div class="h-1.5 bg-black/20">
            <div
              :class="['h-full progress-bar', typeStyles[toast.type].progress]"
              :style="{ '--duration': `${toast.duration}ms` }"
            />
          </div>
        </div>
      </TransitionGroup>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import {
  CheckCircleIcon,
  ExclamationCircleIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon,
  XMarkIcon,
} from '@heroicons/vue/24/solid'

const { toasts, removeToast } = useToast()

const typeStyles = {
  success: {
    bg: 'bg-mint',
    text: 'text-navy-700',
    iconColor: 'text-navy-700',
    progress: 'bg-navy-700',
    icon: CheckCircleIcon,
  },
  error: {
    bg: 'bg-red',
    text: 'text-white',
    iconColor: 'text-white',
    progress: 'bg-white',
    icon: ExclamationCircleIcon,
  },
  warning: {
    bg: 'bg-yellow',
    text: 'text-navy-700',
    iconColor: 'text-navy-700',
    progress: 'bg-navy-700',
    icon: ExclamationTriangleIcon,
  },
  info: {
    bg: 'bg-purple',
    text: 'text-white',
    iconColor: 'text-white',
    progress: 'bg-white',
    icon: InformationCircleIcon,
  },
}
</script>

<style>
/* Global styles for animations */
.progress-bar {
  width: 100%;
  animation: toast-shrink var(--duration, 2000ms) linear forwards;
}

@keyframes toast-shrink {
  from {
    width: 100%;
  }
  to {
    width: 0%;
  }
}

.toast-enter-active {
  animation: toast-slide-in 0.2s ease-out;
}

.toast-leave-active {
  animation: toast-slide-out 0.2s ease-in;
}

@keyframes toast-slide-in {
  from {
    opacity: 0;
    transform: translateX(100%);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
}

@keyframes toast-slide-out {
  from {
    opacity: 1;
    transform: translateX(0);
  }
  to {
    opacity: 0;
    transform: translateX(100%);
  }
}
</style>
