<template>
  <div
    ref="rootRef"
    class="help-player group/player relative aspect-video w-full select-none overflow-hidden bg-[#03003C] focus:outline-none focus-visible:ring-4 focus-visible:ring-purple/60"
    :class="[rounded ? 'rounded-2xl' : '', isFullscreen ? 'help-player--fs' : '']"
    tabindex="0"
    role="region"
    :aria-label="title"
    @keydown="onKey"
    @mousemove="poke"
    @touchstart.passive="poke"
    @contextmenu.prevent
  >
    <!-- El vídeo no se puede descargar: sin controles nativos, sin menú
         contextual, sin imagen en imagen y sin enlace al fichero. -->
    <video
      ref="videoRef"
      :src="src"
      :poster="poster || undefined"
      preload="metadata"
      playsinline
      disablePictureInPicture
      disableRemotePlayback
      controlslist="nodownload noremoteplayback noplaybackrate"
      class="h-full w-full"
      :aria-label="title"
      @click="toggle"
      @play="playing = true"
      @pause="playing = false"
      @ended="onEnded"
      @timeupdate="onTime"
      @loadedmetadata="onMeta"
      @durationchange="onMeta"
      @volumechange="onVolume"
      @contextmenu.prevent
    />

    <!-- Subtítulos propios: mismo estilo en todos los navegadores -->
    <div
      v-if="captionsOn && cueText"
      class="pointer-events-none absolute inset-x-0 flex justify-center px-4 transition-all duration-200"
      :class="controlsVisible ? 'bottom-20 sm:bottom-24' : 'bottom-6 sm:bottom-10'"
    >
      <p
        class="help-player__cue max-w-[90%] rounded-lg bg-[#03003C]/85 px-3 py-1.5 text-center font-semibold leading-snug text-white"
      >
        {{ cueText }}
      </p>
    </div>

    <!-- Antes de empezar: el póster y un play grande -->
    <button
      v-if="!started"
      type="button"
      class="absolute inset-0 flex items-center justify-center bg-[#03003C]/10 transition-colors hover:bg-[#03003C]/25 focus:outline-none"
      :aria-label="t('common.help.player.play_video', { title })"
      @click="play()"
    >
      <span
        class="flex h-16 w-16 items-center justify-center rounded-full bg-purple text-white shadow-xl ring-4 ring-white/80 transition-transform duration-200 hover:scale-110 sm:h-20 sm:w-20"
      >
        <PlayIcon class="ml-1 h-8 w-8 sm:h-10 sm:w-10" />
      </span>
      <span
        v-if="resumeFrom"
        class="absolute bottom-3 left-3 inline-flex items-center gap-1.5 rounded-md bg-[#03003C]/85 px-2 py-1 text-xs font-semibold text-white"
      >
        <ArrowPathIcon class="h-3.5 w-3.5" aria-hidden="true" />
        {{ t('common.help.courses.resume_at', { time: formatVideoTime(resumeFrom) }) }}
      </span>
      <span
        v-if="duration"
        class="absolute bottom-3 right-3 rounded-md bg-[#03003C]/85 px-2 py-0.5 text-xs font-semibold text-white"
      >
        {{ formatVideoTime(duration) }}
      </span>
    </button>

    <!-- Controles -->
    <div
      v-show="started"
      class="absolute inset-x-0 bottom-0 bg-gradient-to-t from-[#03003C]/90 via-[#03003C]/50 to-transparent px-3 pb-2 pt-10 transition-opacity duration-200 sm:px-4 sm:pb-3"
      :class="controlsVisible ? 'opacity-100' : 'pointer-events-none opacity-0'"
      @click.stop
    >
      <!-- Barra de progreso: un range, así se arrastra y se maneja con el teclado -->
      <div class="relative flex h-5 items-center">
        <div class="absolute inset-x-0 h-1.5 rounded-full bg-white/25" />
        <div
          class="absolute left-0 h-1.5 rounded-full bg-purple"
          :style="{ width: `${progress * 100}%` }"
        />
        <input
          type="range"
          class="help-player__range relative w-full"
          min="0"
          :max="duration || 0"
          step="0.1"
          :value="current"
          :aria-label="t('common.help.player.seek')"
          :aria-valuetext="`${formatVideoTime(current)} / ${formatVideoTime(duration)}`"
          @input="seek(($event.target as HTMLInputElement).valueAsNumber)"
        />
      </div>

      <div class="mt-1 flex items-center gap-1 text-white sm:gap-2">
        <button
          type="button"
          class="help-player__btn"
          :aria-label="playing ? t('common.help.player.pause') : t('common.help.player.play')"
          @click="toggle"
        >
          <PauseIcon v-if="playing" class="h-6 w-6" />
          <PlayIcon v-else class="h-6 w-6" />
        </button>

        <button
          type="button"
          class="help-player__btn"
          :aria-label="muted ? t('common.help.player.unmute') : t('common.help.player.mute')"
          @click="toggleMute"
        >
          <SpeakerXMarkIcon v-if="muted || volume === 0" class="h-6 w-6" />
          <SpeakerWaveIcon v-else class="h-6 w-6" />
        </button>
        <input
          type="range"
          class="help-player__range help-player__range--volume hidden w-20 sm:block"
          min="0"
          max="1"
          step="0.05"
          :value="muted ? 0 : volume"
          :aria-label="t('common.help.player.volume')"
          @input="setVolume(($event.target as HTMLInputElement).valueAsNumber)"
        />

        <span class="ml-1 whitespace-nowrap text-xs font-medium tabular-nums sm:text-sm">
          {{ formatVideoTime(current) }} / {{ formatVideoTime(duration) }}
        </span>

        <span class="flex-1" />

        <button
          v-if="cues.length"
          type="button"
          class="help-player__btn"
          :aria-pressed="captionsOn"
          :aria-label="
            captionsOn ? t('common.help.player.subtitles_off') : t('common.help.player.subtitles_on')
          "
          @click="captionsOn = !captionsOn"
        >
          <span
            class="rounded px-1.5 py-0.5 text-xs font-bold leading-none"
            :class="captionsOn ? 'bg-white text-[#03003C]' : 'border-2 border-white/90'"
          >
            CC
          </span>
        </button>

        <!-- Velocidad -->
        <div class="relative">
          <button
            ref="speedTrigger"
            type="button"
            class="help-player__btn min-w-[3rem] text-sm font-bold"
            :aria-label="`${t('common.help.player.speed')}: ${rateLabel(rate)}`"
            :aria-expanded="speedOpen"
            :aria-controls="speedMenuId"
            @click="speedOpen = !speedOpen"
          >
            {{ rate === 1 ? '1×' : `${formatRate(rate)}×` }}
          </button>
          <div
            v-show="speedOpen"
            :id="speedMenuId"
            role="group"
            :aria-label="t('common.help.player.speed')"
            class="absolute bottom-full right-0 z-10 mb-2 grid w-44 grid-cols-3 gap-1 rounded-xl bg-white p-1.5 text-[#23245D] shadow-xl"
          >
            <button
              v-for="option in RATES"
              :key="option"
              type="button"
              :aria-label="rateLabel(option)"
              :aria-pressed="rate === option"
              class="min-h-10 rounded-lg px-1 text-sm font-semibold hover:bg-purple/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-purple"
              :class="{ 'bg-purple/20 text-[#03003C]': rate === option }"
              @click="setRate(option)"
            >
              {{ formatRate(option) }}×
            </button>
          </div>
        </div>

        <button
          type="button"
          class="help-player__btn"
          :aria-label="
            isFullscreen ? t('common.help.player.exit_fullscreen') : t('common.help.player.fullscreen')
          "
          @click="toggleFullscreen"
        >
          <ArrowsPointingInIcon v-if="isFullscreen" class="h-6 w-6" />
          <ArrowsPointingOutIcon v-else class="h-6 w-6" />
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import {
  ArrowPathIcon,
  ArrowsPointingInIcon,
  ArrowsPointingOutIcon,
  PauseIcon,
  PlayIcon,
  SpeakerWaveIcon,
  SpeakerXMarkIcon,
} from '@heroicons/vue/24/solid'
import { formatVideoTime, parseVtt, subtitlesUrl, type VttCue } from '~/utils/help-video'

/**
 * Reproductor de los vídeos tutoriales del centro de ayuda.
 *
 * Sustituye a los controles del navegador para que el vídeo se vea igual en
 * todas partes, con lo que se pide a un tutorial: velocidad, subtítulos y
 * pantalla completa. Los subtítulos son el `.vtt` que acompaña al `.mp4`
 * (misma URL, otra extensión); si no hay, el botón no sale. Se pintan aquí y no
 * con `<track>`, para que tengan el estilo de itakai y no dependan del
 * navegador.
 *
 * No ofrece descargar el vídeo: no hay controles nativos ni menú contextual ni
 * imagen en imagen. (Quien sepa abrir las herramientas de desarrollo siempre
 * puede llegar al fichero: esto evita la descarga casual, no la protege.)
 *
 * Teclado, con el foco en el reproductor: espacio o k reproduce y pausa, ←/→
 * mueven 5 s, f pantalla completa, c subtítulos y m silencio.
 *
 * En los cursos, además, puede arrancar solo (`autoplay`, al pasar a la
 * siguiente lección), retomar donde se dejó (`startAt`) y avisa de por dónde
 * va (`progress`) para guardar la posición y dar la lección por vista.
 */

const props = withDefaults(
  defineProps<{
    src: string
    title: string
    poster?: string | null
    /** Esquinas redondeadas; sin ellas cuando va pegado a la cabecera de una tarjeta. */
    rounded?: boolean
    /** Intenta reproducir al montarse. Si el navegador no deja, se queda el póster con su play. */
    autoplay?: boolean
    /** Segundo por el que retomar (el vídeo empieza ahí al darle a reproducir). */
    startAt?: number
    /** Sale de pantalla completa al terminar, para que se vea lo que viene después. */
    exitFullscreenOnEnd?: boolean
  }>(),
  { poster: null, rounded: true, autoplay: false, startAt: 0, exitFullscreenOnEnd: false }
)

const emit = defineEmits<{ ended: []; progress: [current: number, duration: number] }>()

const { t, locale } = useI18n()

const RATES = [0.75, 1, 1.25, 1.5, 2] as const

const rootRef = ref<HTMLDivElement | null>(null)
const videoRef = ref<HTMLVideoElement | null>(null)
const started = ref(false)
const playing = ref(false)
const current = ref(0)
const duration = ref(0)
const volume = ref(1)
const muted = ref(false)
const rate = useState('help-video-playback-rate', () => 1)
const speedOpen = ref(false)
const speedMenuId = useId()
const speedTrigger = ref<HTMLButtonElement | null>(null)
const isFullscreen = ref(false)
const captionsOn = ref(false)
const cues = ref<VttCue[]>([])
const controlsVisible = ref(true)

const progress = computed(() => (duration.value ? Math.min(1, current.value / duration.value) : 0))

/** Si ya se aplicó `startAt` a este vídeo: solo se retoma una vez. */
let resumed = false

/** El punto por el que se retomará, para avisarlo sobre el póster. */
const resumeFrom = computed(() => (!started.value && props.startAt > 5 ? props.startAt : 0))

const applyStartAt = () => {
  const video = videoRef.value
  if (resumed || !video || !props.startAt || props.startAt <= 5) return
  const total = Number.isFinite(video.duration) ? video.duration : 0
  if (!total) return
  resumed = true
  if (props.startAt < total) {
    video.currentTime = props.startAt
    current.value = props.startAt
  }
}

const cueText = computed(() => {
  const now = current.value
  return cues.value.find(cue => now >= cue.start && now < cue.end)?.text ?? ''
})

const formatRate = (value: number) =>
  new Intl.NumberFormat(locale.value, { maximumFractionDigits: 2 }).format(value)

const rateLabel = (value: number) =>
  value === 1 ? t('common.help.player.speed_normal') : `${formatRate(value)}×`

let hideTimer: ReturnType<typeof setTimeout> | null = null

/** Enseña los controles y, si está sonando, los esconde al rato sin tocar nada. */
const poke = () => {
  controlsVisible.value = true
  if (hideTimer) clearTimeout(hideTimer)
  hideTimer = setTimeout(() => {
    if (playing.value && !speedOpen.value) controlsVisible.value = false
  }, 2500)
}

const play = async (auto = false) => {
  const video = videoRef.value
  if (!video) return
  applyStartAt()
  started.value = true
  try {
    await video.play()
  } catch {
    // El navegador puede negarse (sin interacción): se queda en pausa. Si era
    // el arranque automático, vuelve el póster con su play grande.
    if (auto) started.value = false
    return
  }
  if (!auto) rootRef.value?.focus({ preventScroll: true })
  poke()
}

const toggle = () => {
  const video = videoRef.value
  if (!video) return
  if (video.paused) play()
  else {
    video.pause()
    controlsVisible.value = true
  }
}

const seek = (time: number) => {
  const video = videoRef.value
  if (!video || Number.isNaN(time)) return
  video.currentTime = Math.max(0, Math.min(duration.value || 0, time))
  current.value = video.currentTime
  poke()
}

const toggleMute = () => {
  const video = videoRef.value
  if (!video) return
  video.muted = !video.muted
  if (!video.muted && video.volume === 0) video.volume = 0.6
}

const setVolume = (value: number) => {
  const video = videoRef.value
  if (!video || Number.isNaN(value)) return
  video.volume = value
  video.muted = value === 0
}

const setRate = (value: number) => {
  rate.value = value
  if (speedOpen.value) speedTrigger.value?.focus({ preventScroll: true })
  speedOpen.value = false
  poke()
}

const applyRate = () => {
  const video = videoRef.value
  if (video) {
    video.defaultPlaybackRate = rate.value
    video.playbackRate = rate.value
  }
}

watch(rate, applyRate)

const toggleFullscreen = async () => {
  const root = rootRef.value
  if (!root) return
  try {
    if (document.fullscreenElement) await document.exitFullscreen()
    else await root.requestFullscreen()
  } catch {
    // Sin permiso para pantalla completa (iframe, iOS antiguo): no pasa nada.
  }
}

const onFullscreenChange = () => {
  isFullscreen.value = document.fullscreenElement === rootRef.value
}

const onTime = () => {
  current.value = videoRef.value?.currentTime ?? 0
  if (started.value) emit('progress', current.value, duration.value)
}

const onMeta = () => {
  const value = videoRef.value?.duration ?? 0
  duration.value = Number.isFinite(value) ? value : 0
  // Si arrancó antes de conocer la duración (arranque automático), se retoma ahora.
  if (started.value) applyStartAt()
}

const onVolume = () => {
  volume.value = videoRef.value?.volume ?? 1
  muted.value = videoRef.value?.muted ?? false
}

const onEnded = () => {
  controlsVisible.value = true
  if (props.exitFullscreenOnEnd && document.fullscreenElement) {
    document.exitFullscreen().catch(() => {})
  }
  emit('ended')
}

const onKey = (event: KeyboardEvent) => {
  // Las teclas de los controles (rango, menú) siguen siendo suyas.
  const target = event.target as HTMLElement
  if (target.tagName === 'INPUT' && ['ArrowLeft', 'ArrowRight'].includes(event.key)) return
  if (event.metaKey || event.ctrlKey || event.altKey) return
  const key = event.key.toLowerCase()
  if (key === ' ' || key === 'k') {
    if (target.tagName === 'BUTTON' && key === ' ') return
    event.preventDefault()
    toggle()
  } else if (key === 'arrowleft' || key === 'arrowright') {
    event.preventDefault()
    if (!started.value) started.value = true
    seek(current.value + (key === 'arrowleft' ? -5 : 5))
  } else if (key === 'f') {
    event.preventDefault()
    toggleFullscreen()
  } else if (key === 'c' && cues.value.length) {
    event.preventDefault()
    captionsOn.value = !captionsOn.value
  } else if (key === 'm') {
    event.preventDefault()
    toggleMute()
  } else if (key === 'escape' && speedOpen.value) {
    speedOpen.value = false
    speedTrigger.value?.focus({ preventScroll: true })
  }
}

/** Los subtítulos del vídeo, si los hay. Un fallo solo esconde el botón. */
const loadSubtitles = async () => {
  cues.value = []
  const url = subtitlesUrl(props.src)
  if (!url) return
  try {
    const response = await fetch(url)
    if (!response.ok) return
    cues.value = parseVtt(await response.text())
  } catch {
    cues.value = []
  }
}

/** Un clic fuera del menú de velocidad lo cierra. */
const onDocumentClick = (event: MouseEvent) => {
  if (speedOpen.value && !rootRef.value?.contains(event.target as Node)) speedOpen.value = false
}

watch(
  () => props.src,
  () => {
    started.value = false
    current.value = 0
    duration.value = 0
    resumed = false
    loadSubtitles()
    if (props.autoplay) nextTick(() => play(true))
  }
)

onMounted(() => {
  applyRate()
  loadSubtitles()
  if (props.autoplay) play(true)
  document.addEventListener('fullscreenchange', onFullscreenChange)
  document.addEventListener('click', onDocumentClick)
})

onBeforeUnmount(() => {
  if (hideTimer) clearTimeout(hideTimer)
  document.removeEventListener('fullscreenchange', onFullscreenChange)
  document.removeEventListener('click', onDocumentClick)
})
</script>

<style scoped>
.help-player__btn {
  display: inline-flex;
  height: 2.5rem;
  min-width: 2.5rem;
  align-items: center;
  justify-content: center;
  border-radius: 0.75rem;
  color: #fff;
  transition: background-color 150ms;
}

.help-player__btn:hover {
  background: rgb(255 255 255 / 0.15);
}

.help-player__btn:focus-visible {
  outline: 3px solid #ac74fd;
  outline-offset: 1px;
}

.help-player__cue {
  font-size: clamp(0.85rem, 2.2vw, 1.35rem);
}

.help-player--fs .help-player__cue {
  font-size: clamp(1.2rem, 2.6vw, 2.1rem);
}

/* Rango transparente sobre la barra pintada: solo se ve el tirador. */
.help-player__range {
  height: 1.25rem;
  cursor: pointer;
  appearance: none;
  background: transparent;
}

.help-player__range:focus-visible {
  outline: 3px solid #ac74fd;
  outline-offset: 2px;
  border-radius: 9999px;
}

.help-player__range::-webkit-slider-thumb {
  appearance: none;
  height: 1rem;
  width: 1rem;
  border-radius: 9999px;
  background: #fff;
  box-shadow: 0 0 0 3px #ac74fd;
}

.help-player__range::-moz-range-thumb {
  height: 1rem;
  width: 1rem;
  border: 0;
  border-radius: 9999px;
  background: #fff;
  box-shadow: 0 0 0 3px #ac74fd;
}

.help-player__range--volume {
  border-radius: 9999px;
  background: rgb(255 255 255 / 0.3);
  height: 0.375rem;
}

/* En pantalla completa el vídeo ocupa la pantalla sin deformarse. */
.help-player--fs {
  aspect-ratio: auto;
  border-radius: 0;
}

.help-player--fs video {
  object-fit: contain;
}

@media (pointer: coarse) {
  .help-player__btn {
    height: 2.75rem;
    min-width: 2.75rem;
  }
}
</style>
