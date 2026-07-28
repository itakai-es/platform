/**
 * Composable for calling the centralized AI prompt endpoint.
 * Frontend sends intent type + params, backend builds the prompt.
 */
export function useAIPrompt() {
  const config = useRuntimeConfig()
  const authStore = useAuthStore()
  const { locale } = useI18n()

  /** Which provider generated the last response */
  const lastProvider = ref<'spark' | 'gemini' | 'flux' | null>(null)

  /** Seconds remaining (counts down) */
  const remainingSeconds = ref(0)

  /** Formatted remaining time for display */
  const remainingTimeLabel = computed(() => {
    const s = remainingSeconds.value
    if (s <= 0) return ''
    if (s < 60) return `~${s}s`
    const m = Math.floor(s / 60)
    const sec = s % 60
    return sec > 0 ? `~${m}min ${sec}s` : `~${m}min`
  })

  /** Progress 0-100 during generation */
  const generationProgress = ref(0)

  /** Whether we're waiting for the first chunk */
  const waitingForFirstChunk = ref(false)

  /** True when elapsed time exceeded the estimate — UI should switch to indeterminate */
  const isOvertime = ref(false)

  let progressTimer: ReturnType<typeof setInterval> | null = null
  let startTime = 0
  let totalEstimate = 0

  function startProgress(totalSeconds: number) {
    generationProgress.value = 0
    remainingSeconds.value = totalSeconds
    waitingForFirstChunk.value = true
    isOvertime.value = false
    if (totalSeconds <= 0) {
      isOvertime.value = true
      return
    }

    totalEstimate = totalSeconds
    startTime = Date.now()

    if (progressTimer) clearInterval(progressTimer)
    progressTimer = setInterval(() => {
      const elapsed = (Date.now() - startTime) / 1000
      if (elapsed >= totalEstimate) {
        isOvertime.value = true
        remainingSeconds.value = 0
        generationProgress.value = 100
        if (progressTimer) {
          clearInterval(progressTimer)
          progressTimer = null
        }
        return
      }
      generationProgress.value = (elapsed / totalEstimate) * 100
      remainingSeconds.value = Math.max(0, Math.round(totalEstimate - elapsed))
    }, 500)
  }

  function stopProgress() {
    if (progressTimer) {
      clearInterval(progressTimer)
      progressTimer = null
    }
    generationProgress.value = 100
    remainingSeconds.value = 0
    waitingForFirstChunk.value = false
    isOvertime.value = false
    setTimeout(() => {
      generationProgress.value = 0
    }, 800)
  }

  /** Fetch estimated generation time from Spark timings (always fresh, no cache) */
  async function fetchEstimate(type: 'chat' | 'image' | 'avatar' = 'chat'): Promise<number> {
    // Show indeterminate loading immediately while we fetch the estimate
    waitingForFirstChunk.value = true
    isOvertime.value = true
    try {
      const timings = await $fetch<{
        chat_estimated_seconds?: number
        image_estimated_seconds?: number
        avatar_estimated_seconds?: number
      }>(`${config.public.apiBase}/ai/timings`, {
        headers: { Authorization: `Bearer ${authStore.tokens?.accessToken}` },
      })

      if (type === 'avatar') return timings.avatar_estimated_seconds ?? 0
      if (type === 'image') return timings.image_estimated_seconds ?? 0
      return timings.chat_estimated_seconds ?? 0
    } catch {
      return 0
    }
  }

  /**
   * Stream a prompt response. Accumulates text into the target ref.
   * Shows progress bar while waiting for first chunk.
   */
  async function streamPrompt(
    type: string,
    params: Record<string, string | number | boolean>,
    target: Ref<string>,
    localeOverride?: string
  ): Promise<'spark' | 'gemini' | 'flux' | null> {
    const maxAttempts = 3
    let lastErr: unknown = null

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      lastProvider.value = null
      target.value = ''

      const estimate = await fetchEstimate('chat')
      startProgress(estimate)

      try {
        const response = await fetch(`${config.public.apiBase}/ai/prompt/stream`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${authStore.tokens?.accessToken}`,
          },
          body: JSON.stringify({ type, locale: localeOverride || locale.value, params }),
        })

        if (!response.ok) throw new Error(`AI error: ${response.status}`)

        const reader = response.body?.getReader()
        const decoder = new TextDecoder()
        let buffer = ''
        let streamErrorMessage: string | null = null
        let streamErrorCode: string | null = null
        let sawDoneEvent = false

        if (reader) {
          let streamDone = false
          while (!streamDone) {
            const { done, value } = await reader.read()
            if (done) break
            buffer += decoder.decode(value, { stream: true })
            const lines = buffer.split('\n')
            buffer = lines.pop() || ''
            for (const line of lines) {
              if (!line.startsWith('data: ')) continue
              try {
                const d = JSON.parse(line.slice(6))
                if (d.type === 'chunk' && d.text) {
                  if (waitingForFirstChunk.value) stopProgress()
                  target.value += d.text
                }
                if (d.type === 'error') {
                  streamErrorMessage =
                    d.message || 'La IA no pudo procesar tu petición. Inténtalo de nuevo.'
                  streamErrorCode = d.code || 'AI_ERROR'
                }
                if (d.type === 'done') {
                  sawDoneEvent = true
                  if (d.provider) lastProvider.value = d.provider
                  if (d.error)
                    streamErrorMessage =
                      streamErrorMessage ||
                      'La IA no pudo procesar tu petición. Inténtalo de nuevo.'
                  streamDone = true
                }
              } catch {
                /* skip malformed */
              }
            }
          }
          reader.cancel().catch(() => {})
        }

        if (streamErrorMessage) {
          const err = new Error(streamErrorMessage) as Error & { code?: string }
          err.code = streamErrorCode || 'AI_ERROR'
          throw err
        }

        // Stream ended without a `done` event → upstream cut the connection mid-generation.
        // Treat as truncated and let the outer retry loop try again.
        if (!sawDoneEvent) {
          const err = new Error(
            'Stream truncado: la conexión se cerró antes de terminar'
          ) as Error & { code?: string }
          err.code = 'STREAM_TRUNCATED'
          throw err
        }

        if (waitingForFirstChunk.value) stopProgress()
        return lastProvider.value
      } catch (err) {
        lastErr = err
        stopProgress()
        if (attempt < maxAttempts) {
          await new Promise(r => setTimeout(r, 1000 * attempt))
        }
      }
    }

    throw lastErr instanceof Error ? lastErr : new Error('AI error')
  }

  /**
   * Call prompt and get full response as string (non-streaming).
   */
  async function callPrompt(
    type: string,
    params: Record<string, string>,
    localeOverride?: string
  ): Promise<string> {
    const target = ref('')
    await streamPrompt(type, params, target, localeOverride)
    return target.value
  }

  return {
    streamPrompt,
    callPrompt,
    lastProvider,
    remainingSeconds,
    remainingTimeLabel,
    generationProgress,
    waitingForFirstChunk,
    isOvertime,
    fetchEstimate,
    startProgress,
    stopProgress,
  }
}
