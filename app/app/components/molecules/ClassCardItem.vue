<template>
  <div class="relative">
    <ClassCard
      :icon="AcademicCapIcon"
      :name="classItem.name"
      :background-image="resolvedImage"
      :student-count="classItem.studentCount"
      :missions-count="
        classItem.stats?.totalMissions ?? classItem.missionCount ?? classItem.totalMissions
      "
      :schedule="classItem.schedule"
      :coins="coins"
      :mana="mana"
      :lives="lives"
      @click="$emit('click')"
    />

    <!-- Overlay actions (duplicate + archive) -->
    <div
      v-if="showArchiveAction || showDuplicateAction"
      class="absolute top-3 right-3 z-20 flex items-center gap-1.5"
      @click.stop
    >
      <!-- Duplicate action (oculto mientras se confirma archivar, para no saturar) -->
      <button
        v-if="showDuplicateAction && !classItem.archived && !confirming"
        class="w-8 h-8 rounded-xl bg-white/90 backdrop-blur-sm shadow-md border border-white/60 flex items-center justify-center text-text-secondary hover:text-navy-700 hover:bg-white transition-all duration-150 disabled:opacity-60"
        title="Duplicar clase"
        :disabled="duplicating"
        @click="$emit('duplicate')"
      >
        <Spinner v-if="duplicating" size="sm" class="!w-3.5 !h-3.5" />
        <DocumentDuplicateIcon v-else class="w-4 h-4" />
      </button>

      <!-- Archive/unarchive action -->
      <Transition v-if="showArchiveAction" name="fade-scale">
        <!-- Confirm state -->
        <div
          v-if="confirming"
          class="flex items-center gap-1 bg-white rounded-xl shadow-lg border border-gray-200 px-2 py-1.5"
        >
          <span class="text-xs font-medium text-navy-700 whitespace-nowrap">
            {{ classItem.archived ? '¿Desarchivar?' : '¿Archivar?' }}
          </span>
          <button
            class="w-6 h-6 rounded-lg bg-navy-700 text-white flex items-center justify-center hover:opacity-90 transition-opacity"
            :disabled="loading"
            @click="confirm"
          >
            <Spinner v-if="loading" size="sm" class="!w-3 !h-3" />
            <CheckIcon v-else class="w-3.5 h-3.5" />
          </button>
          <button
            class="w-6 h-6 rounded-lg bg-gray-100 text-gray-500 flex items-center justify-center hover:bg-gray-200 transition-colors"
            :disabled="loading"
            @click="cancel"
          >
            <XMarkIcon class="w-3.5 h-3.5" />
          </button>
        </div>

        <!-- Idle state -->
        <button
          v-else
          class="w-8 h-8 rounded-xl bg-white/90 backdrop-blur-sm shadow-md border border-white/60 flex items-center justify-center text-text-secondary hover:text-navy-700 hover:bg-white transition-all duration-150"
          :title="classItem.archived ? 'Desarchivar clase' : 'Archivar clase'"
          @click="confirming = true"
        >
          <ArchiveBoxArrowDownIcon v-if="classItem.archived" class="w-4 h-4" />
          <ArchiveBoxIcon v-else class="w-4 h-4" />
        </button>
      </Transition>
    </div>
  </div>
</template>

<script setup lang="ts">
import {
  AcademicCapIcon,
  ArchiveBoxIcon,
  ArchiveBoxArrowDownIcon,
  CheckIcon,
  DocumentDuplicateIcon,
  XMarkIcon,
} from '@heroicons/vue/24/outline'
import type { ClassSettings } from '~/types/class.types'
import { resolveClassSettings } from '~/utils/class-settings'

interface ClassItemData {
  id?: string
  name: string
  backgroundImage?: string
  studentCount?: number
  schedule?: string
  archived?: boolean
  totalMissions?: number
  missionCount?: number
  coins?: number
  mana?: number
  lives?: number
  settings?: Partial<ClassSettings>
  stats?: {
    totalMissions?: number
  }
}

const props = defineProps<{
  classItem: ClassItemData
  showArchiveAction?: boolean
  showDuplicateAction?: boolean
  loading?: boolean
  duplicating?: boolean
  showCoins?: boolean
}>()

// Saldo de monedas, maná y puntos de vida de la clase. Solo en la vista del alumno,
// y respetando los ajustes de la clase (monedas → coins, maná → tienda, vidas → lives).
const cfg = computed(() => resolveClassSettings(props.classItem.settings))
const coins = computed(() =>
  props.showCoins && cfg.value.coins ? props.classItem.coins : undefined
)
const mana = computed(() => (props.showCoins && cfg.value.mana ? props.classItem.mana : undefined))
const lives = computed(() =>
  props.showCoins && cfg.value.lives ? (props.classItem.lives ?? 100) : undefined
)

const emit = defineEmits<{
  click: []
  archive: []
  unarchive: []
  duplicate: []
}>()

const config = useRuntimeConfig()
const confirming = ref(false)

const resolvedImage = computed(() => {
  const url = props.classItem.backgroundImage
  if (!url) return undefined
  if (url.startsWith('http')) return url
  return `${config.public.apiBase}${url}`
})

function confirm() {
  if (props.classItem.archived) {
    emit('unarchive')
  } else {
    emit('archive')
  }
  confirming.value = false
}

function cancel() {
  confirming.value = false
}
</script>

<style scoped>
.fade-scale-enter-active,
.fade-scale-leave-active {
  transition:
    opacity 0.15s ease,
    transform 0.15s ease;
}
.fade-scale-enter-from,
.fade-scale-leave-to {
  opacity: 0;
  transform: scale(0.9);
}
</style>
