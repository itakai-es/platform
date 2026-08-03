<template>
  <!-- Rompe el padding del <main> del layout (-m) y ocupa todo el alto; la card
       llena el hueco sin desbordar. Mismo patrón que el wizard de clases. -->
  <div class="flex flex-col h-[calc(100vh-56px)] lg:h-screen -m-4 md:-m-6">
    <!-- Header (el root ya rompe el padding del layout) -->
    <div class="bg-navy-700 px-4 md:px-6 pt-6 pb-4">
      <nav class="flex items-center gap-1.5 sm:gap-2 text-sm">
        <NuxtLink to="/profesor/inicio" class="text-white/70 hover:text-white flex-shrink-0"
          ><HomeIcon class="w-4 h-4"
        /></NuxtLink>
        <ChevronRightIcon class="w-4 h-4 text-white/70" />
        <NuxtLink to="/profesor/misiones" class="text-white/70 hover:text-white whitespace-nowrap"
          >Misiones</NuxtLink
        >
        <ChevronRightIcon class="w-4 h-4 text-white/70" />
        <span class="text-white font-medium">Nueva</span>
      </nav>
    </div>

    <!-- WIZARD: alto fijo (no desborda pantalla); solo scrollea el contenido. -->
    <div v-if="!showPreview" class="flex-1 min-h-0 px-4 md:px-6 py-4 flex">
      <div class="w-full flex flex-1 min-h-0 flex-col">
        <!-- Card compartida (cabecera de paso + pasos). Ver OnboardingCard.vue -->
        <OnboardingCard
          :step="step"
          :total-steps="totalSteps"
          :god="god"
          :question="currentQuestion"
        >
          <Transition name="onb-fade" mode="out-in">
              <!-- STEP 0: Idea -->
              <div v-if="step === 0" key="s0" class="flex-1 flex flex-col">
                <!-- Class selector -->
                <div class="onb-reveal mb-4" style="animation-delay: 0.12s">
                  <label class="block text-sm font-medium text-navy-700 mb-1.5">Clase</label>
                  <SelectDropdown
                    :model-value="selectedClassId"
                    :options="classSelectOptions"
                    :placeholder="t('teacher.missions.create.pick_class')"
                    @update:model-value="selectedClassId = String($event)"
                  />
                </div>
                <textarea
                  ref="inputRef"
                  v-model="idea"
                  rows="6"
                  :placeholder="t('teacher.missions.create.idea_placeholder')"
                  class="onb-input onb-reveal resize-none"
                  style="animation-delay: 0.2s"
                />
                <div class="onb-actions !mt-auto">
                  <span />
                  <Button
                    variant="primary"
                    size="sm"
                    :disabled="!idea.trim() || !selectedClassId || loading"
                    @click="submitIdea"
                    >{{ t('teacher.classes.create.onboarding.btn_next') }}</Button
                  >
                </div>
              </div>

              <!-- STEP 1: Narrative -->
              <div v-else-if="step === 1" key="s1" class="flex-1 flex flex-col min-h-0">
                <EditableMarkdown
                  v-model="narrative"
                  :god-name="god.name"
                  :god-avatar="god.avatar"
                  ai-placeholder="Ej: Hazlo más épico, añade referencias al tema..."
                  context-label="Editando la narrativa de la misión"
                  ai-modal-hint="Dile a la IA qué quieres añadir o cambiar de la narrativa."
                  ai-system-context="El profesor está editando la NARRATIVA de una misión gamificada. Es la historia que ambienta la misión y engancha a los alumnos. Genera contenido narrativo, inmersivo y épico acorde a la temática."
                >
                  <template #default="{ edit }">
                    <div class="flex-1 onb-result-box overflow-y-auto min-h-0">
                      <OnboardingLoading
                        v-if="waitingForFirstChunk && !narrative"
                        text="Creando la narrativa de tu misión..."
                        :progress="generationProgress"
                        :is-overtime="isOvertime"
                        :remaining-label="remainingTimeLabel"
                      />
                      <div
                        v-else-if="narrativeGenerationFailed && !narrative"
                        class="h-full flex flex-col items-center justify-center gap-4 text-center px-4"
                      >
                        <ExclamationTriangleIcon class="w-8 h-8 text-navy-700/30" />
                        <p class="text-base font-semibold text-navy-700">
                          {{ t('teacher.missions.create.narrative_error') }}
                        </p>
                        <p class="text-sm text-text-secondary max-w-sm">
                          Puede que el asistente esté saturado ahora mismo. Espera un momento y
                          reinténtalo.
                        </p>
                        <div class="flex gap-2">
                          <Button variant="outline" size="sm" @click="step = 0">{{ t('teacher.classes.create.onboarding.btn_back') }}</Button>
                          <Button variant="primary" size="sm" @click="submitIdea">
                            <ArrowPathIcon class="w-4 h-4 mr-1.5" />Reintentar
                          </Button>
                        </div>
                      </div>
                      <template v-else>
                        <div class="md-rendered" v-html="renderPageMarkdown(narrative)" />
                      </template>
                    </div>
                    <div
                      v-if="!loading && !isStreaming && narrative && showNarrativeFeedback"
                      class="onb-feedback"
                    >
                      <input
                        ref="feedbackRef"
                        v-model="feedback"
                        type="text"
                        placeholder="Ej: Quiero que sea más épica, con más referencias al tema..."
                        class="onb-feedback-input"
                        @keydown.enter.prevent="feedback.trim() && regenerateNarrative()"
                      />
                      <button
                        type="button"
                        class="onb-cancel-btn"
                        title="Cancelar"
                        @click="showNarrativeFeedback = false"
                      >
                        <XMarkIcon class="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        class="onb-send-btn"
                        :disabled="!feedback.trim() || loading"
                        @click="regenerateNarrative"
                      >
                        <PaperAirplaneIcon class="w-4 h-4" />
                      </button>
                    </div>
                    <div v-if="!loading && !isStreaming && narrative" class="onb-actions">
                      <Button variant="outline" size="sm" @click="backToStep0">{{ t('teacher.classes.create.onboarding.btn_back') }}</Button>
                      <div v-if="!showNarrativeFeedback" class="flex gap-2">
                        <Button variant="outline" size="sm" @click="edit"
                          ><PencilSquareIcon class="w-4 h-4 mr-1.5" />{{ t('teacher.classes.create.onboarding.btn_edit_by_hand') }}</Button
                        >
                        <Button variant="outline" size="sm" @click="openNarrativeFeedback">
                          <SparklesIcon class="w-4 h-4 mr-1.5" />{{ t('teacher.classes.create.onboarding.btn_change_something') }}
                        </Button>
                        <Button variant="primary" size="sm" @click="acceptNarrative"
                          >{{ t('teacher.classes.create.onboarding.btn_accept_plan') }}</Button
                        >
                      </div>
                    </div>
                  </template>
                </EditableMarkdown>
              </div>

              <!-- STEP 2: Titles -->
              <div v-else-if="step === 2" key="s2" class="flex-1 flex flex-col min-h-0">
                <OnboardingLoading
                  v-if="loading"
                  text="Generando títulos..."
                  :show-bar="generationProgress > 0 || isOvertime"
                  :progress="generationProgress"
                  :is-overtime="isOvertime"
                  :remaining-label="remainingTimeLabel"
                />
                <template v-else>
                  <TransitionGroup
                    name="title-item"
                    appear
                    tag="div"
                    class="grid grid-cols-1 sm:grid-cols-2 gap-2.5 flex-1 min-h-0 overflow-y-auto content-start pr-1"
                  >
                    <button
                      v-for="(title, i) in titles"
                      :key="title"
                      type="button"
                      class="group flex items-center gap-3 w-full text-left px-4 py-3 rounded-xl border transition-all"
                      :class="
                        selectedTitle === title
                          ? 'bg-navy-700 border-navy-700 shadow-md'
                          : 'bg-white border-gray-200 hover:border-navy-700/40 hover:shadow-md'
                      "
                      :style="{ animationDelay: `${Math.min(i, 10) * 40}ms` }"
                      @click="selectTitle(title)"
                    >
                      <span
                        class="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 transition-colors"
                        :class="
                          selectedTitle === title
                            ? 'bg-white/15'
                            : 'bg-navy-700/5 group-hover:bg-navy-700/10'
                        "
                      >
                        <CheckIcon v-if="selectedTitle === title" class="w-4 h-4 text-white" />
                        <SparklesIcon v-else class="w-4 h-4 text-navy-700/50" />
                      </span>
                      <span
                        class="text-sm font-medium truncate"
                        :class="selectedTitle === title ? 'text-white' : 'text-navy-700'"
                      >
                        {{ title }}
                      </span>
                    </button>
                  </TransitionGroup>
                  <input
                    v-model="customTitle"
                    type="text"
                    placeholder="O escribe tu propio título..."
                    class="onb-input mt-3"
                    @input="selectedTitle = ''"
                  />
                  <div v-if="showTitleFeedback" class="onb-feedback">
                    <input
                      ref="titleFeedbackRef"
                      v-model="titleFeedback"
                      type="text"
                      placeholder="Ej: Quiero títulos más épicos..."
                      class="onb-feedback-input"
                      @keydown.enter.prevent="titleFeedback.trim() && regenerateTitles()"
                    />
                    <button
                      type="button"
                      class="onb-cancel-btn"
                      title="Cancelar"
                      @click="showTitleFeedback = false"
                    >
                      <XMarkIcon class="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      class="onb-send-btn"
                      :disabled="!titleFeedback.trim() || loading"
                      @click="regenerateTitles"
                    >
                      <PaperAirplaneIcon class="w-4 h-4" />
                    </button>
                  </div>
                  <div v-if="!showTitleFeedback" class="onb-actions">
                    <Button variant="outline" size="sm" @click="step = 1">{{ t('teacher.classes.create.onboarding.btn_back') }}</Button>
                    <div class="flex gap-2">
                      <Button variant="outline" size="sm" @click="openTitleFeedback"
                        >{{ t('teacher.classes.create.onboarding.btn_change_something') }}</Button
                      >
                      <Button
                        variant="primary"
                        size="sm"
                        :disabled="!chosenTitle"
                        @click="acceptTitle"
                        >{{ t('teacher.classes.create.onboarding.btn_accept_plan') }}</Button
                      >
                    </div>
                  </div>
                  <div v-else class="onb-actions">
                    <Button variant="outline" size="sm" @click="step = 1">{{ t('teacher.classes.create.onboarding.btn_back') }}</Button>
                  </div>
                </template>
              </div>

              <!-- STEP 3: Enigmas -->
              <div v-else-if="step === 3" key="s3" class="flex-1 flex flex-col min-h-0">
                <template v-if="enigmaError && enigmas.length === 0 && !loading && !isStreaming">
                  <div class="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-700">
                    <p class="font-medium mb-1">No hemos podido generar los enigmas</p>
                    <p class="text-red-600/90">{{ enigmaError }}</p>
                  </div>
                  <div class="flex-1" />
                  <div class="onb-actions">
                    <Button variant="outline" size="sm" @click="step = 2">{{ t('teacher.classes.create.onboarding.btn_back') }}</Button>
                    <Button variant="primary" size="sm" @click="retryEnigmas">Reintentar</Button>
                  </div>
                </template>
                <template v-else-if="loading || (isStreaming && enigmas.length === 0)">
                  <div class="space-y-3">
                    <div
                      v-for="i in 4"
                      :key="i"
                      class="bg-gray-50 rounded-xl p-4 border border-gray-100 animate-pulse"
                    >
                      <div class="flex items-center justify-between mb-3">
                        <div class="h-4 bg-gray-200 rounded w-2/3" />
                        <div class="h-5 bg-gray-200 rounded-full w-14" />
                      </div>
                      <div class="space-y-2">
                        <div class="h-3 bg-gray-200 rounded w-full" />
                        <div class="h-3 bg-gray-200 rounded w-4/5" />
                      </div>
                      <div class="space-y-1.5 mt-3">
                        <div class="h-3 bg-gray-200 rounded w-3/4" />
                        <div class="h-3 bg-gray-200 rounded w-2/3" />
                      </div>
                    </div>
                  </div>
                  <div class="flex flex-col items-center gap-2 mt-4">
                    <div class="onb-loading justify-center">
                      <SparklesIcon class="w-4 h-4 animate-pulse" /><span
                        >Generando enigmas...</span
                      >
                    </div>
                    <AILoadingBar
                      v-if="waitingForFirstChunk"
                      :progress="generationProgress"
                      :is-overtime="isOvertime"
                    />
                  </div>
                </template>
                <template v-else>
                  <div class="flex-1 overflow-y-auto space-y-3 min-h-0">
                    <TransitionGroup name="title-item" appear>
                      <div
                        v-for="(enigma, i) in enigmas"
                        :key="enigma.title"
                        class="bg-gray-50 rounded-xl p-4 border border-gray-100"
                        :style="{ animationDelay: `${i * 120}ms` }"
                      >
                        <div class="flex items-center justify-between gap-2 mb-1">
                          <h4 class="font-semibold text-navy-700 text-sm">{{ enigma.title }}</h4>
                          <div
                            class="flex items-center gap-2 shrink-0 text-xs font-semibold text-navy-700"
                          >
                            <span
                              class="px-2 py-0.5 rounded-full"
                              style="
                                background-color: var(--color-badge-xp-bg);
                                color: var(--color-badge-xp-text);
                              "
                              >{{ enigma.xp }} XP</span
                            >
                            <span
                              v-if="enigmaResources.coins && enigma.coins"
                              class="inline-flex items-center gap-1"
                            >
                              <CoinIcon class="w-4 h-4" />{{ enigma.coins }}
                            </span>
                            <span
                              v-if="enigmaResources.mana && enigma.mana"
                              class="inline-flex items-center gap-1"
                            >
                              <ManaIcon class="w-4 h-4" />{{ enigma.mana }}
                            </span>
                          </div>
                        </div>
                        <p class="text-xs text-text-secondary leading-relaxed mb-2">
                          {{ enigma.description }}
                        </p>
                        <div v-if="enigma.objectives?.length" class="space-y-1">
                          <p
                            v-for="(obj, j) in enigma.objectives"
                            :key="j"
                            class="text-xs text-navy-700/70 flex items-start gap-1.5"
                          >
                            <span class="text-green-500 mt-0.5">✓</span>{{ obj }}
                          </p>
                        </div>
                      </div>
                    </TransitionGroup>
                  </div>
                  <div v-if="showEnigmaFeedback" class="onb-feedback">
                    <input
                      ref="enigmaFeedbackRef"
                      v-model="enigmaFeedback"
                      type="text"
                      placeholder="Ej: Quiero más enigmas, o que sean más difíciles..."
                      class="onb-feedback-input"
                      @keydown.enter.prevent="enigmaFeedback.trim() && regenerateEnigmas()"
                    />
                    <button
                      type="button"
                      class="onb-cancel-btn"
                      title="Cancelar"
                      @click="showEnigmaFeedback = false"
                    >
                      <XMarkIcon class="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      class="onb-send-btn"
                      :disabled="!enigmaFeedback.trim() || loading"
                      @click="regenerateEnigmas"
                    >
                      <PaperAirplaneIcon class="w-4 h-4" />
                    </button>
                  </div>
                  <div
                    v-if="enigmaError && enigmas.length"
                    class="mt-2 bg-amber-50 border border-amber-200 rounded-lg p-2 text-xs text-amber-700 flex items-center justify-between gap-2"
                  >
                    <span>{{ enigmaError }}</span>
                    <button
                      type="button"
                      class="font-medium underline hover:no-underline"
                      @click="enigmaError = ''"
                    >
                      Cerrar
                    </button>
                  </div>
                  <div v-if="!showEnigmaFeedback" class="onb-actions">
                    <Button
                      variant="outline"
                      size="sm"
                      :disabled="isStreaming || loading"
                      @click="step = 2"
                      >{{ t('teacher.classes.create.onboarding.btn_back') }}</Button
                    >
                    <div class="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        :disabled="isStreaming || loading"
                        @click="openEnigmaFeedback"
                        >{{ t('teacher.classes.create.onboarding.btn_change_something') }}</Button
                      >
                      <Button
                        variant="primary"
                        size="sm"
                        :disabled="isStreaming || loading"
                        @click="step = 4"
                        >{{ t('teacher.classes.create.onboarding.btn_accept_plan') }}</Button
                      >
                    </div>
                  </div>
                  <div v-else class="onb-actions">
                    <Button
                      variant="outline"
                      size="sm"
                      :disabled="isStreaming || loading"
                      @click="step = 2"
                      >{{ t('teacher.classes.create.onboarding.btn_back') }}</Button
                    >
                  </div>
                </template>
              </div>

              <!-- STEP 4: Config -->
              <div v-else-if="step === 4" key="s4" class="flex-1 flex flex-col">
                <div class="space-y-4">
                  <div>
                    <label class="block text-sm font-medium text-navy-700 mb-1.5">Dificultad</label>
                    <div class="flex gap-2">
                      <button
                        v-for="r in rarities"
                        :key="r.value"
                        type="button"
                        class="px-4 py-2 rounded-xl text-sm font-medium transition-all"
                        :class="
                          rarity === r.value
                            ? 'bg-navy-700 text-white'
                            : 'bg-gray-50 text-navy-700 border border-gray-200 hover:border-navy-700'
                        "
                        @click="rarity = r.value"
                      >
                        {{ r.label }}
                      </button>
                    </div>
                  </div>
                  <div>
                    <label class="block text-sm font-medium text-navy-700 mb-1.5"
                      >Fecha límite (opcional)</label
                    >
                    <input v-model="deadline" type="date" class="onb-input" />
                  </div>
                </div>
                <div class="flex-1" />
                <div class="onb-actions">
                  <Button variant="outline" size="sm" @click="step = 3">{{ t('teacher.classes.create.onboarding.btn_back') }}</Button>
                  <Button variant="primary" size="sm" @click="step = 5">{{ t('teacher.classes.create.onboarding.btn_next') }}</Button>
                </div>
              </div>

              <!-- STEP 5: Cover -->
              <div v-else-if="step === 5" key="s5" class="flex-1 flex flex-col min-h-0">
                <div class="flex-1 flex items-center justify-center min-h-0">
                  <!-- Loading skeleton -->
                  <div
                    v-if="isGeneratingImage && !generatedImageUrl"
                    class="w-full max-w-md flex flex-col items-center gap-3"
                  >
                    <div
                      class="w-full aspect-video rounded-2xl bg-gray-100 animate-pulse flex items-center justify-center"
                    >
                      <PhotoIcon class="w-12 h-12 text-gray-300" />
                    </div>
                    <SparklesIcon class="w-5 h-5 animate-pulse text-navy-700" />
                    <span class="text-sm text-text-secondary">Generando portada...</span>
                    <AILoadingBar
                      v-if="generationProgress > 0 || isOvertime"
                      :progress="generationProgress"
                      :is-overtime="isOvertime"
                      :remaining-label="remainingTimeLabel"
                    />
                  </div>
                  <!-- Generated image -->
                  <div v-else-if="generatedImageUrl" class="w-full max-w-md">
                    <div class="relative aspect-video rounded-2xl overflow-hidden shadow-lg">
                      <img :src="generatedImageUrl" alt="" class="w-full h-full object-cover" />
                    </div>
                    <!-- Acción de la portada, justo bajo la imagen generada -->
                    <div v-if="!showImageFeedback" class="mt-3 flex flex-wrap justify-center gap-2">
                      <Button variant="outline" size="sm" @click="openImageFeedback"
                        >{{ t('teacher.classes.create.onboarding.btn_change_something') }}</Button
                      >
                    </div>
                  </div>
                  <!-- Error with retry -->
                  <div
                    v-else-if="imageGenerationFailed"
                    class="flex flex-col items-center gap-4 text-text-secondary"
                  >
                    <PhotoIcon class="w-12 h-12 opacity-40" />
                    <p class="text-sm">
                      No se pudo generar la portada. Puedes reintentar o saltar este paso.
                    </p>
                    <Button variant="primary" size="sm" @click="generateMissionCover()">
                      <ArrowPathIcon class="w-4 h-4 mr-2" />
                      Reintentar
                    </Button>
                  </div>
                </div>
                <div v-if="!isGeneratingImage && showImageFeedback" class="onb-feedback">
                  <input
                    ref="imageFeedbackRef"
                    v-model="imageFeedback"
                    type="text"
                    placeholder="Ej: Quiero que sea más oscura, con un fondo de batalla..."
                    class="onb-feedback-input"
                    @keydown.enter.prevent="imageFeedback.trim() && regenerateMissionCover()"
                  />
                  <button
                    type="button"
                    class="onb-cancel-btn"
                    title="Cancelar"
                    @click="showImageFeedback = false"
                  >
                    <XMarkIcon class="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    class="onb-send-btn"
                    :disabled="!imageFeedback.trim() || isGeneratingImage"
                    @click="regenerateMissionCover"
                  >
                    <PaperAirplaneIcon class="w-4 h-4" />
                  </button>
                </div>
                <div v-if="!isGeneratingImage && !showImageFeedback" class="onb-actions">
                  <Button variant="outline" size="sm" @click="step = 4">{{ t('teacher.classes.create.onboarding.btn_back') }}</Button>
                  <Button variant="primary" size="sm" @click="step = 6">{{ t('teacher.classes.create.onboarding.btn_accept_plan') }}</Button>
                </div>
                <div v-else-if="!isGeneratingImage && showImageFeedback" class="onb-actions">
                  <Button variant="outline" size="sm" @click="step = 4">{{ t('teacher.classes.create.onboarding.btn_back') }}</Button>
                </div>
              </div>

              <!-- STEP 6: Mission Guide / Briefing -->
              <div v-else-if="step === 6" key="s6" class="flex-1 flex flex-col min-h-0">
                <EditableMarkdown
                  v-model="missionGuide"
                  :god-name="god.name"
                  :god-avatar="god.avatar"
                  ai-placeholder="Ej: Añade consejos para los enigmas, hazlo más épico..."
                  context-label="Editando la guía de la misión"
                  ai-modal-hint="Dile a la IA qué quieres añadir o cambiar de la guía."
                  ai-system-context="El profesor está editando la GUÍA para los alumnos de una misión gamificada. Orienta a los alumnos sobre cómo abordar la misión y sus enigmas. Genera contenido claro, útil y motivador."
                >
                  <template #default="{ edit }">
                    <div class="flex-1 onb-result-box overflow-y-auto min-h-0">
                      <OnboardingLoading
                        v-if="(waitingForFirstChunk || isGeneratingMissionGuide) && !missionGuide"
                        text="Generando guía para los alumnos..."
                        :show-bar="generationProgress > 0 || isOvertime"
                        :progress="generationProgress"
                        :is-overtime="isOvertime"
                        :remaining-label="remainingTimeLabel"
                      />
                      <div
                        v-else-if="missionGuideGenerationFailed && !missionGuide"
                        class="flex flex-col items-center gap-4 text-text-secondary py-8"
                      >
                        <p class="text-sm">No se pudo generar la guía.</p>
                        <Button variant="primary" size="sm" @click="generateMissionGuide()">
                          <ArrowPathIcon class="w-4 h-4 mr-2" />
                          Reintentar
                        </Button>
                      </div>
                      <template v-else>
                        <div class="md-rendered" v-html="renderPageMarkdown(missionGuide)" />
                      </template>
                    </div>
                    <div
                      v-if="!isGeneratingMissionGuide && missionGuide && showMissionGuideFeedback"
                      class="onb-feedback"
                    >
                      <input
                        ref="missionGuideFeedbackRef"
                        v-model="missionGuideFeedback"
                        type="text"
                        placeholder="Ej: Hazlo más épico, añade consejos para los enigmas..."
                        class="onb-feedback-input"
                        @keydown.enter.prevent="
                          missionGuideFeedback.trim() && regenerateMissionGuide()
                        "
                      />
                      <button
                        type="button"
                        class="onb-cancel-btn"
                        title="Cancelar"
                        @click="showMissionGuideFeedback = false"
                      >
                        <XMarkIcon class="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        class="onb-send-btn"
                        :disabled="!missionGuideFeedback.trim() || isGeneratingMissionGuide"
                        @click="regenerateMissionGuide"
                      >
                        <PaperAirplaneIcon class="w-4 h-4" />
                      </button>
                    </div>
                    <div
                      v-if="
                        !isGeneratingMissionGuide &&
                        !isStreaming &&
                        missionGuide &&
                        !showMissionGuideFeedback
                      "
                      class="onb-actions"
                    >
                      <Button variant="outline" size="sm" @click="step = 5">{{ t('teacher.classes.create.onboarding.btn_back') }}</Button>
                      <div class="flex gap-2">
                        <Button variant="outline" size="sm" @click="edit"
                          ><PencilSquareIcon class="w-4 h-4 mr-1.5" />{{ t('teacher.classes.create.onboarding.btn_edit_by_hand') }}</Button
                        >
                        <Button variant="outline" size="sm" @click="openMissionGuideFeedback">
                          <SparklesIcon class="w-4 h-4 mr-1.5" />{{ t('teacher.classes.create.onboarding.btn_change_something') }}
                        </Button>
                        <Button variant="outline" size="sm" @click="skipMissionGuide"
                          >{{ t('teacher.classes.create.onboarding.btn_skip') }}</Button
                        >
                        <Button variant="primary" size="sm" @click="step = 7">{{ t('teacher.classes.create.onboarding.btn_accept_plan') }}</Button>
                      </div>
                    </div>
                    <div
                      v-else-if="!isGeneratingMissionGuide && showMissionGuideFeedback"
                      class="onb-actions"
                    >
                      <Button variant="outline" size="sm" @click="step = 5">{{ t('teacher.classes.create.onboarding.btn_back') }}</Button>
                    </div>
                  </template>
                </EditableMarkdown>
              </div>

              <!-- STEP 7: Badge -->
              <div v-else-if="step === 7" key="s7" class="flex-1 flex flex-col min-h-0">
                <div class="flex-1 flex items-center justify-center min-h-0">
                  <!-- Generating -->
                  <div
                    v-if="isGeneratingBadge"
                    class="w-full max-w-md flex flex-col items-center gap-3"
                  >
                    <div
                      class="w-32 h-32 rounded-full bg-gray-100 animate-pulse flex items-center justify-center"
                    >
                      <TrophyIcon class="w-12 h-12 text-gray-300" />
                    </div>
                    <SparklesIcon class="w-5 h-5 animate-pulse text-navy-700" />
                    <span class="text-sm text-text-secondary">Generando insignia...</span>
                    <AILoadingBar
                      v-if="generationProgress > 0 || isOvertime"
                      :progress="generationProgress"
                      :is-overtime="isOvertime"
                      :remaining-label="remainingTimeLabel"
                    />
                  </div>
                  <!-- Generated -->
                  <div v-else-if="badgeImageUrl" class="flex flex-col items-center gap-3">
                    <img
                      :src="badgeImageUrl"
                      alt=""
                      class="w-32 h-32 rounded-full object-cover shadow-lg"
                    />
                    <h4 class="text-lg font-bold text-navy-700">{{ badgeName }}</h4>
                    <p class="text-sm text-text-secondary text-center max-w-xs">
                      {{ badgeDescription }}
                    </p>
                  </div>
                  <!-- Error -->
                  <div
                    v-else-if="badgeGenerationFailed"
                    class="flex flex-col items-center gap-4 text-text-secondary"
                  >
                    <TrophyIcon class="w-12 h-12 opacity-40" />
                    <p class="text-sm">{{ t('teacher.badges.generate_error') }}</p>
                    <Button variant="primary" size="sm" @click="generateBadge()">
                      <ArrowPathIcon class="w-4 h-4 mr-2" />
                      Reintentar
                    </Button>
                  </div>
                </div>
                <div
                  v-if="!isGeneratingBadge && badgeImageUrl && showBadgeFeedback"
                  class="onb-feedback"
                >
                  <input
                    ref="badgeFeedbackRef"
                    v-model="badgeFeedback"
                    type="text"
                    placeholder="Ej: Quiero que sea más épica, con temática de fuego..."
                    class="onb-feedback-input"
                    @keydown.enter.prevent="badgeFeedback.trim() && regenerateBadge()"
                  />
                  <button
                    type="button"
                    class="onb-cancel-btn"
                    title="Cancelar"
                    @click="showBadgeFeedback = false"
                  >
                    <XMarkIcon class="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    class="onb-send-btn"
                    :disabled="!badgeFeedback.trim() || isGeneratingBadge"
                    @click="regenerateBadge"
                  >
                    <PaperAirplaneIcon class="w-4 h-4" />
                  </button>
                </div>
                <div v-if="!isGeneratingBadge && !showBadgeFeedback" class="onb-actions">
                  <Button variant="outline" size="sm" @click="step = 6">{{ t('teacher.classes.create.onboarding.btn_back') }}</Button>
                  <div class="flex gap-2">
                    <Button
                      v-if="badgeImageUrl"
                      variant="outline"
                      size="sm"
                      @click="openBadgeFeedback"
                      >{{ t('teacher.classes.create.onboarding.btn_change_something') }}</Button
                    >
                    <Button variant="outline" size="sm" @click="skipBadge">{{ t('teacher.classes.create.onboarding.btn_skip') }}</Button>
                    <Button v-if="badgeImageUrl" variant="primary" size="sm" @click="finishWizard"
                      >{{ t('teacher.classes.create.onboarding.btn_accept_plan') }}</Button
                    >
                  </div>
                </div>
                <div v-else-if="!isGeneratingBadge && showBadgeFeedback" class="onb-actions">
                  <Button variant="outline" size="sm" @click="step = 6">{{ t('teacher.classes.create.onboarding.btn_back') }}</Button>
                </div>
              </div>
            </Transition>
        </OnboardingCard>
      </div>
    </div>

    <!-- PREVIEW -->
    <div v-else class="flex-1 overflow-y-auto px-4 sm:px-8 py-6">
      <div class="max-w-md mx-auto">
        <p class="text-sm font-medium text-text-secondary mb-4 text-center">
          Así quedará tu misión
        </p>

        <!-- Mission card preview -->
        <div class="pointer-events-none">
          <MissionCardEnhanced
            id="preview"
            :title="form.title"
            :description="form.description"
            status="activa"
            :rarity="form.rarity"
            :completed-count="0"
            :total-students="0"
            :deadline="form.deadline"
            :xp-reward="totalXp"
            :background-image="generatedImageUrl || rawImagePath"
          />
        </div>

        <p v-if="errors.submit" class="text-sm text-red-600 mt-3 text-center">
          {{ errors.submit }}
        </p>

        <div class="flex justify-center gap-3 mt-6">
          <Button variant="outline" @click="showPreview = false">{{ t('teacher.classes.create.onboarding.btn_back') }}</Button>
          <Button variant="primary" :disabled="isSubmitting" @click="handleSubmit">
            <template v-if="isSubmitting">
              <svg class="animate-spin w-4 h-4 mr-2" viewBox="0 0 24 24" fill="none">
                <circle
                  class="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  stroke-width="4"
                />
                <path
                  class="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
              Creando...
            </template>
            <template v-else>Crear Misión</template>
          </Button>
        </div>
      </div>
    </div>

    <!-- Success Modal -->
    <Teleport to="body"
      ><Transition name="modal">
        <div v-if="showSuccess" class="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div class="absolute inset-0 bg-black/50" />
          <div
            class="relative bg-white rounded-2xl p-6 sm:p-8 max-w-md w-full shadow-xl text-center"
          >
            <div
              class="w-16 h-16 mx-auto mb-4 rounded-full bg-green-100 flex items-center justify-center"
            >
              <CheckIcon class="w-8 h-8 text-green-600" />
            </div>
            <h3 class="text-xl font-bold text-navy-700 mb-2">Misión creada!</h3>
            <p class="text-text-secondary mb-6">Tu misión "{{ form.title }}" está lista.</p>
            <div class="flex flex-col gap-2">
              <Button variant="primary" full-width @click="goToMissions">Ver misiones</Button>
              <Button variant="outline" full-width @click="resetWizard">Crear otra</Button>
            </div>
          </div>
        </div>
      </Transition></Teleport
    >
  </div>
</template>

<script setup lang="ts">
import {
  HomeIcon,
  ChevronRightIcon,
  SparklesIcon,
  PencilSquareIcon,
  PaperAirplaneIcon,
  CheckIcon,
  PhotoIcon,
  ArrowPathIcon,
  TrophyIcon,
  XMarkIcon,
  ExclamationTriangleIcon,
} from '@heroicons/vue/24/outline'
import { renderPageMarkdown } from '~/utils/markdown'
import { MISSION_COMPLETION_BONUS, type MissionRarity } from '~/utils/gamification-config'
import { resolveClassSettings } from '~/utils/class-settings'
import type { ClassSettings } from '~/types/class.types'
import CoinIcon from '~/components/atoms/CoinIcon.vue'
import ManaIcon from '~/components/atoms/ManaIcon.vue'

definePageMeta({ layout: 'teacher', middleware: ['auth', 'role'] })
const { t, locale } = useI18n()
const effects = useEffects()
useHead({ title: () => t('teacher.missions.create.meta.title') })

const router = useRouter()
const route = useRoute()
const config = useRuntimeConfig()
const authStore = useAuthStore()
const aiStore = useAIAssistantStore()
const teacherStore = useTeacherStore()
const classesStore = useClassesStore()
const missionStore = useMissionStore()

const god = computed(
  () => aiStore.currentGod || { id: 'atenea', name: 'Atenea', avatar: '/app/avatars/atenea.svg' }
)
const teacherName = computed(() => authStore.user?.name?.split(' ')[0] || '')
const teacherClasses = computed(() => classesStore.classes || [])

// Wizard
const totalSteps = 8
const step = ref(0)
const loading = ref(false)
const isStreaming = ref(false)
const showPreview = ref(false)
const showSuccess = ref(false)
const inputRef = ref<HTMLInputElement | HTMLTextAreaElement>()
const feedbackRef = ref<HTMLInputElement>()
const titleFeedbackRef = ref<HTMLInputElement>()
const enigmaFeedbackRef = ref<HTMLInputElement>()

// Accumulated context
const selectedClassId = ref('')
const idea = ref('')
const narrative = ref('')
// Estado de error de generación de narrativa (p. ej. rate limit): mostramos aviso
// + reintento en vez de volcar la idea como si fuera la narrativa.
const narrativeGenerationFailed = ref(false)
const titles = ref<string[]>([])
const selectedTitle = ref('')
const customTitle = ref('')
const chosenTitle = computed(() => customTitle.value.trim() || selectedTitle.value)
const enigmas = ref<
  Array<{
    title: string
    description: string
    xp: number
    coins: number
    mana: number
    objectives: string[]
  }>
>([])
const rarity = ref('comun')
const deadline = ref('')
const feedback = ref('')
const titleFeedback = ref('')
const enigmaFeedback = ref('')
const enigmaRaw = ref('')
const enigmaError = ref('')
const showNarrativeFeedback = ref(false)
const showTitleFeedback = ref(false)
const showEnigmaFeedback = ref(false)
const generatedImageUrl = ref('')
const rawImagePath = ref('')
const isGeneratingImage = ref(false)
const imageGenerationFailed = ref(false)
const imageFeedback = ref('')
const showImageFeedback = ref(false)
const imageFeedbackRef = ref<HTMLInputElement>()
const missionGuide = ref('')
const isGeneratingMissionGuide = ref(false)
const badgeName = ref('')
const badgeDescription = ref('')
const badgeImageUrl = ref('')
const rawBadgeImagePath = ref('')
const isGeneratingBadge = ref(false)
const badgeGenerationFailed = ref(false)
const badgeFeedback = ref('')
const showBadgeFeedback = ref(false)
const badgeFeedbackRef = ref<HTMLInputElement>()
const missionGuideGenerationFailed = ref(false)
const missionGuideFeedback = ref('')
const showMissionGuideFeedback = ref(false)
const missionGuideFeedbackRef = ref<HTMLInputElement>()

const className = computed(
  () => teacherClasses.value.find(c => c.id === selectedClassId.value)?.name || ''
)
const classSelectOptions = computed(() =>
  teacherClasses.value.map(c => ({ value: c.id, label: c.name }))
)
const classMissions = ref<Array<{ title: string; description?: string }>>([])

// Recursos activos de la clase seleccionada. Determinan si la IA propone (y si
// se muestran/envían) monedas y maná en los enigmas.
const selectedClassSettings = ref<ClassSettings>(resolveClassSettings(null))
const enigmaResources = computed(() => ({
  coins: selectedClassSettings.value.coins,
  mana: selectedClassSettings.value.mana,
}))

// Load existing missions + settings when class changes
watch(selectedClassId, async classId => {
  if (!classId) {
    classMissions.value = []
    selectedClassSettings.value = resolveClassSettings(null)
    return
  }
  try {
    const res = await $fetch<{
      missions: Array<{ title: string; description?: string }>
      settings?: Partial<ClassSettings>
    }>(`${config.public.apiBase}/teacher/classes/${classId}`)
    classMissions.value =
      (res as any)?.missions?.map((m: any) => ({
        title: m.title,
        description: (m.description || '').slice(0, 200),
      })) || []
    selectedClassSettings.value = resolveClassSettings((res as any)?.settings ?? null)
  } catch {
    classMissions.value = []
    selectedClassSettings.value = resolveClassSettings(null)
  }
})

const rarities = [
  { value: 'comun', label: 'Común' },
  { value: 'rara', label: 'Rara' },
  { value: 'epica', label: 'Épica' },
  { value: 'legendaria', label: 'Legendaria' },
]

const rarityLabel = computed(() => rarities.find(r => r.value === rarity.value)?.label || 'Común')
const rarityClass = computed(() => {
  const map: Record<string, string> = {
    comun: 'bg-gray-100 text-gray-600',
    rara: 'bg-blue-100 text-blue-700',
    epica: 'bg-purple/10 text-purple',
    legendaria: 'bg-yellow/20 text-yellow-700',
  }
  return map[rarity.value] || map.comun
})

const totalXp = computed(() => {
  const enigmasXp = enigmas.value.reduce((sum, e) => sum + e.xp, 0)
  const rarityBonus = MISSION_COMPLETION_BONUS[rarity.value as MissionRarity] ?? 0
  return enigmasXp + rarityBonus
})

const form = computed(() => ({
  title: chosenTitle.value,
  description: missionGuide.value || narrative.value,
  classId: selectedClassId.value,
  status: 'activa' as const,
  rarity: rarity.value as MissionRarity,
  deadline: deadline.value || undefined,
  backgroundImage: rawImagePath.value || undefined,
  enigmas: enigmas.value.map(e => ({
    title: e.title,
    description: e.description,
    xp: e.xp,
    coins: e.coins,
    mana: e.mana,
    objectives: e.objectives,
  })),
}))

const errors = reactive({ submit: '' })
const isSubmitting = ref(false)

const currentQuestion = computed(() => {
  const questions = [
    `${teacherName.value ? `${teacherName.value}, ` : ''}¿de qué quieres que sea tu misión?`,
    'Esta es la narrativa que he creado, ¿te gusta?',
    '¿Qué título le ponemos a la misión?',
    'Estos son los enigmas que he preparado',
    'Configuración final',
    'He creado esta portada para tu misión',
    'Esta es la guía para tus alumnos',
    '¿Quieres crear una insignia para esta misión?',
  ]
  return questions[step.value] || ''
})

// Load classes
onMounted(async () => {
  await classesStore.fetchTeacherClasses()
  // Preselect class from query param
  const qClassId = route.query.classId as string
  if (qClassId && teacherClasses.value.some(c => c.id === qClassId)) {
    selectedClassId.value = qClassId
  }
  nextTick(() => inputRef.value?.focus())
})

watch(step, () => {
  showNarrativeFeedback.value = false
  showTitleFeedback.value = false
  showEnigmaFeedback.value = false
  showImageFeedback.value = false
  showMissionGuideFeedback.value = false
  nextTick(() => inputRef.value?.focus())
})

// Context builder
function buildContext() {
  const parts = [`Idea: ${idea.value}`, `Clase: ${className.value}`]
  if (classMissions.value.length > 0) {
    const missionSummaries = classMissions.value
      .map(m => `- "${m.title}": ${m.description?.slice(0, 150) || 'sin descripción'}`)
      .join('\n')
    parts.push(
      `Misiones ya creadas en esta clase:\n${missionSummaries}\n\nLa nueva misión debe ser DIFERENTE, complementar las existentes y avanzar en dificultad o temática respecto a lo que ya hay.`
    )
  }
  if (narrative.value) parts.push(`Narrativa: ${narrative.value.slice(0, 500)}`)
  if (chosenTitle.value) parts.push(`Título: ${chosenTitle.value}`)
  return parts.join('\n')
}

// AI helpers (centralized prompts)
const {
  streamPrompt,
  callPrompt,
  generationProgress,
  waitingForFirstChunk,
  isOvertime,
  remainingTimeLabel,
  fetchEstimate,
  startProgress,
  stopProgress,
} = useAIPrompt()

async function streamAI(
  type: string,
  params: Record<string, string | number | boolean>,
  target: Ref<string>
) {
  loading.value = false
  isStreaming.value = true
  await streamPrompt(type, params, target)
}

async function callAI(type: string, params: Record<string, string>) {
  try {
    const result = await callPrompt(type, params)
    return { message: result }
  } catch {
    return null
  }
}

// Step 0 → 1: Generate narrative
async function submitIdea() {
  if (!idea.value.trim() || !selectedClassId.value || loading.value) return
  step.value = 1
  narrative.value = ''
  narrativeGenerationFailed.value = false
  loading.value = true
  try {
    await streamAI(
      'mission.narrative.generate',
      { idea: idea.value, className: className.value },
      narrative
    )
    narrative.value = narrative.value
      .replace(/^(Aqui tienes|Claro|Por supuesto)[^.]*[.:]\s*/i, '')
      .trim()
      .slice(0, 8000)
  } catch {
    narrativeGenerationFailed.value = true
  } finally {
    loading.value = false
    isStreaming.value = false
  }
}

async function regenerateNarrative() {
  const fb = feedback.value.trim()
  if (!fb) return
  feedback.value = ''
  showNarrativeFeedback.value = false
  const prev = narrative.value
  narrative.value = ''
  loading.value = true
  try {
    await streamAI(
      'mission.narrative.modify',
      { idea: idea.value, current: prev.slice(0, 800), feedback: fb },
      narrative
    )
    narrative.value = narrative.value
      .replace(/^(Aqui tienes|Claro|Por supuesto)[^.]*[.:]\s*/i, '')
      .trim()
      .slice(0, 8000)
  } catch {
    narrative.value = prev
  } finally {
    loading.value = false
    isStreaming.value = false
  }
}

// Step 1 → 2: Generate titles
async function acceptNarrative() {
  step.value = 2
  loading.value = true
  const est = await fetchEstimate('chat')
  startProgress(est)
  try {
    const ctx = buildContext()
    const res = await callAI('mission.titles.generate', { context: ctx.slice(0, 800) })
    if (res?.message) {
      const match = res.message.match(/\[[\s\S]*\]/)
      if (match) {
        const parsed = JSON.parse(match[0])
        if (Array.isArray(parsed))
          titles.value = parsed.slice(0, 6).map((t: any) => String(t).slice(0, 80))
      }
    }
  } catch {
  } finally {
    stopProgress()
    loading.value = false
  }
}

async function regenerateTitles() {
  const fb = titleFeedback.value.trim()
  if (!fb) return
  titleFeedback.value = ''
  showTitleFeedback.value = false
  loading.value = true
  titles.value = []
  selectedTitle.value = ''
  const est = await fetchEstimate('chat')
  startProgress(est)
  try {
    const ctx = buildContext()
    const res = await callAI('mission.titles.regenerate', {
      context: ctx.slice(0, 800),
      feedback: fb,
    })
    if (res?.message) {
      const match = res.message.match(/\[[\s\S]*\]/)
      if (match) {
        const parsed = JSON.parse(match[0])
        if (Array.isArray(parsed))
          titles.value = parsed.slice(0, 6).map((t: any) => String(t).slice(0, 80))
      }
    }
  } catch {
  } finally {
    stopProgress()
    loading.value = false
  }
}

// Entero ≥ suelo, o el suelo si no es un número válido.
function clampInt(v: unknown, floor = 0): number {
  const n = Math.floor(Number(v))
  return Number.isFinite(n) ? Math.max(floor, n) : floor
}

// Parsea el JSON de enigmas que devuelve la IA. XP/monedas/maná se normalizan a
// enteros ≥ 0; coins/mana se ponen a 0 si la clase no usa ese recurso.
function parseEnigmasJson(rawText: string): typeof enigmas.value {
  const cleaned = rawText
    .replace(/```(?:json)?\s*/gi, '')
    .replace(/```/g, '')
    .trim()
  const match = cleaned.match(/\[[\s\S]*\]/)
  if (!match) return []
  try {
    const parsed = JSON.parse(match[0])
    if (!Array.isArray(parsed)) return []
    const useCoins = enigmaResources.value.coins
    const useMana = enigmaResources.value.mana
    return parsed.map((e: any) => ({
      title: String(e.title || '').slice(0, 100),
      description: String(e.description || '').slice(0, 300),
      xp: clampInt(e.xp ?? 20, 0),
      coins: useCoins ? clampInt(e.coins ?? 0, 0) : 0,
      mana: useMana ? clampInt(e.mana ?? 0, 0) : 0,
      objectives: Array.isArray(e.objectives)
        ? e.objectives.map((o: any) => String(o).slice(0, 200))
        : [],
    }))
  } catch {
    console.error('Failed to parse enigmas JSON from AI')
    return []
  }
}

// Step 2 → 3: Generate enigmas
async function acceptTitle() {
  step.value = 3
  enigmaError.value = ''
  loading.value = true
  try {
    enigmaRaw.value = ''
    await streamAI(
      'mission.enigmas.generate',
      {
        idea: idea.value,
        narrative: narrative.value,
        title: chosenTitle.value,
        className: className.value,
        coins: enigmaResources.value.coins,
        mana: enigmaResources.value.mana,
      },
      enigmaRaw
    )
    enigmas.value = parseEnigmasJson(enigmaRaw.value)
    if (enigmas.value.length === 0) {
      enigmaError.value = 'No hemos podido generar los enigmas. Inténtalo de nuevo.'
    }
  } catch (err) {
    enigmaError.value =
      err instanceof Error && err.message
        ? err.message
        : t('teacher.missions.create.ai_unavailable')
  } finally {
    loading.value = false
    isStreaming.value = false
  }
}

async function retryEnigmas() {
  enigmas.value = []
  await acceptTitle()
}

async function regenerateEnigmas() {
  const fb = enigmaFeedback.value.trim()
  if (!fb) return
  enigmaFeedback.value = ''
  showEnigmaFeedback.value = false
  loading.value = true
  const prevEnigmas = JSON.stringify(enigmas.value)
  enigmas.value = []
  try {
    const ctx = buildContext()
    enigmaRaw.value = ''
    await streamAI(
      'mission.enigmas.regenerate',
      {
        context: ctx,
        currentEnigmas: prevEnigmas,
        feedback: fb,
        className: className.value,
        coins: enigmaResources.value.coins,
        mana: enigmaResources.value.mana,
      },
      enigmaRaw
    )
    enigmas.value = parseEnigmasJson(enigmaRaw.value)
    if (enigmas.value.length === 0) {
      enigmaError.value = 'No hemos podido regenerar los enigmas. Inténtalo de nuevo.'
      try {
        enigmas.value = JSON.parse(prevEnigmas)
      } catch {
        /* keep empty */
      }
    }
  } catch (err) {
    enigmaError.value =
      err instanceof Error && err.message
        ? err.message
        : t('teacher.missions.create.ai_unavailable')
    try {
      enigmas.value = JSON.parse(prevEnigmas)
    } catch {
      /* keep empty */
    }
  } finally {
    loading.value = false
    isStreaming.value = false
  }
}

// Step 5: Cover
watch(step, s => {
  if (s === 5 && !generatedImageUrl.value && !isGeneratingImage.value) generateMissionCover()
})

async function generateMissionCover(extraPrompt?: string) {
  if (isGeneratingImage.value) return
  isGeneratingImage.value = true
  imageGenerationFailed.value = false
  const est = await fetchEstimate('image')
  startProgress(est)
  try {
    const narrativeText = extraPrompt ? `${narrative.value}. ${extraPrompt}` : narrative.value
    const res = await $fetch<{ imageUrl: string; provider?: string }>(
      `${config.public.apiBase}/ai/mission-cover`,
      {
        method: 'POST',
        headers: { Authorization: `Bearer ${authStore.tokens?.accessToken}` },
        body: { title: chosenTitle.value, narrative: narrativeText, locale: locale.value },
      }
    )
    rawImagePath.value = res.imageUrl
    generatedImageUrl.value = res.imageUrl
  } catch {
    imageGenerationFailed.value = true
  } finally {
    stopProgress()
    isGeneratingImage.value = false
  }
}

async function regenerateMissionCover() {
  const fb = imageFeedback.value.trim()
  if (!fb) return
  imageFeedback.value = ''
  showImageFeedback.value = false
  generatedImageUrl.value = ''
  rawImagePath.value = ''
  await generateMissionCover(fb)
}

// Step 6: Mission guide/guía
watch(step, s => {
  if (s === 6 && !missionGuide.value && !isGeneratingMissionGuide.value) generateMissionGuide()
})

async function generateMissionGuide(extraPrompt?: string) {
  if (isGeneratingMissionGuide.value) return
  isGeneratingMissionGuide.value = true
  missionGuideGenerationFailed.value = false
  missionGuide.value = ''
  try {
    const enigmaSummary = enigmas.value
      .map(e => `- ${e.title} (${e.xp} XP): ${e.description.slice(0, 100)}`)
      .join('\n')
    isGeneratingMissionGuide.value = false
    isStreaming.value = true
    await streamPrompt(
      'mission.guide.generate',
      {
        title: chosenTitle.value,
        narrative: narrative.value,
        enigmasSummary: enigmaSummary,
        totalXp: String(totalXp.value),
      },
      missionGuide
    )
    missionGuide.value = missionGuide.value
      .replace(/^(Aqui tienes|Claro|Por supuesto)[^.]*[.:]\s*/i, '')
      .trim()
  } catch {
    missionGuideGenerationFailed.value = true
  } finally {
    isGeneratingMissionGuide.value = false
    isStreaming.value = false
  }
}

async function regenerateMissionGuide() {
  const fb = missionGuideFeedback.value.trim()
  if (!fb) return
  missionGuideFeedback.value = ''
  showMissionGuideFeedback.value = false
  await generateMissionGuide(fb)
}

// Step 7: Badge
watch(step, s => {
  if (s === 7 && !badgeImageUrl.value && !isGeneratingBadge.value) generateBadge()
})

async function generateBadge(extraPrompt?: string) {
  if (isGeneratingBadge.value) return
  isGeneratingBadge.value = true
  badgeGenerationFailed.value = false
  const est = await fetchEstimate('image')
  startProgress(est)
  try {
    // First: generate badge name + description via AI
    if (!badgeName.value) {
      const badgeContext = `Misión "${chosenTitle.value}" de la clase "${className.value}".
Narrativa: ${narrative.value.slice(0, 400)}
Enigmas: ${enigmas.value.map(e => e.title).join(', ')}
Dificultad: ${rarityLabel.value}
IMPORTANTE: el nombre NO puede ser igual al título de la misión ("${chosenTitle.value}"). Debe ser épico y único, representar el LOGRO de completar la misión.`
      const res = await callAI('badge.generate', { context: badgeContext })
      if (res?.message) {
        const rawMsg = res.message
          .replace(/```(?:json)?\s*/gi, '')
          .replace(/```/g, '')
          .trim()
        const match = rawMsg.match(/\{[\s\S]*\}/)
        if (match) {
          const parsed = JSON.parse(match[0])
          badgeName.value = parsed.name || ''
          badgeDescription.value = parsed.description || ''
        }
      }
      if (!badgeName.value) badgeName.value = `Insignia: ${chosenTitle.value}`
    }

    // Then: generate badge image
    const prompt = extraPrompt
      ? `${badgeName.value}. ${badgeDescription.value}. ${extraPrompt}`
      : `${badgeName.value}. ${badgeDescription.value}. Context: ${chosenTitle.value}, ${className.value}`

    const res = await $fetch<{ imageUrl: string }>(`${config.public.apiBase}/ai/badge-image`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${authStore.tokens?.accessToken}` },
      body: {
        prompt,
        name: badgeName.value,
        description: badgeDescription.value,
        locale: locale.value,
      },
    })
    rawBadgeImagePath.value = res.imageUrl
    badgeImageUrl.value = res.imageUrl?.startsWith('http')
      ? res.imageUrl
      : `${config.public.apiBase}${res.imageUrl}`
  } catch {
    badgeGenerationFailed.value = true
  } finally {
    stopProgress()
    isGeneratingBadge.value = false
  }
}

async function regenerateBadge() {
  const fb = badgeFeedback.value.trim()
  if (!fb) return
  badgeFeedback.value = ''
  showBadgeFeedback.value = false
  badgeImageUrl.value = ''
  rawBadgeImagePath.value = ''
  await generateBadge(fb)
}

// Manejadores de los botones del asistente. Se extraen a métodos (en vez de
// expresiones inline con varias sentencias) porque Prettier reformatea los
// @click multi-sentencia a varias líneas y el compilador de Vue 3.5 no los
// acepta. Con una sola llamada, ni Prettier los toca ni Vue los rechaza.
function backToStep0() {
  step.value = 0
  narrative.value = ''
}

function selectTitle(title: string) {
  selectedTitle.value = title
  customTitle.value = ''
}

function openNarrativeFeedback() {
  showNarrativeFeedback.value = true
  nextTick(() => feedbackRef.value?.focus())
}

function openTitleFeedback() {
  showTitleFeedback.value = true
  nextTick(() => titleFeedbackRef.value?.focus())
}

function openEnigmaFeedback() {
  showEnigmaFeedback.value = true
  nextTick(() => enigmaFeedbackRef.value?.focus())
}

function openImageFeedback() {
  showImageFeedback.value = true
  nextTick(() => imageFeedbackRef.value?.focus())
}

function openMissionGuideFeedback() {
  showMissionGuideFeedback.value = true
  nextTick(() => missionGuideFeedbackRef.value?.focus())
}

function skipMissionGuide() {
  missionGuide.value = ''
  step.value = 7
}

function openBadgeFeedback() {
  showBadgeFeedback.value = true
  nextTick(() => badgeFeedbackRef.value?.focus())
}

function skipBadge() {
  badgeName.value = ''
  finishWizard()
}

function finishWizard() {
  showPreview.value = true
}

// Submit
async function handleSubmit() {
  errors.submit = ''
  isSubmitting.value = true
  try {
    const created = await missionStore.createMission(form.value as any)
    // Create badge if generated
    if (badgeName.value && rawBadgeImagePath.value && created?.id) {
      try {
        await $fetch(`${config.public.apiBase}/teacher/badges`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${authStore.tokens?.accessToken}` },
          body: {
            name: badgeName.value,
            description: badgeDescription.value,
            imageUrl: rawBadgeImagePath.value,
            rarity:
              rarity.value === 'comun'
                ? 'common'
                : rarity.value === 'rara'
                  ? 'rare'
                  : rarity.value === 'epica'
                    ? 'epic'
                    : 'legendary',
            missionId: created.id,
          },
        })
      } catch {
        /* badge creation failed silently */
      }
    }
    // Invalida caches para que misiones/listas se recarguen al volver.
    missionStore.hasLoadedMissions = false
    missionStore.hasLoadedTeacherMissions = false
    showSuccess.value = true
    // Sparkle + SFX por el composable (mismos gates que el resto del sitio).
    effects.play('enigma_approved')
  } catch (err: any) {
    errors.submit = err?.data?.message || missionStore.error || 'Error al crear la misión'
  } finally {
    isSubmitting.value = false
  }
}

async function goToMissions() {
  showSuccess.value = false
  await teacherStore.fetchStats(true)
  await teacherStore.fetchRecentMissions(undefined, true)
  router.push('/profesor/misiones')
}

function resetWizard() {
  step.value = 0
  idea.value = ''
  narrative.value = ''
  titles.value = []
  selectedTitle.value = ''
  customTitle.value = ''
  enigmas.value = []
  rarity.value = 'comun'
  deadline.value = ''
  generatedImageUrl.value = ''
  rawImagePath.value = ''
  imageGenerationFailed.value = false
  missionGuide.value = ''
  missionGuideGenerationFailed.value = false
  badgeName.value = ''
  badgeDescription.value = ''
  badgeImageUrl.value = ''
  rawBadgeImagePath.value = ''
  badgeGenerationFailed.value = false
  showPreview.value = false
  showSuccess.value = false
}
</script>

<style scoped>
/* Transición del modal (específica de esta página). El resto de estilos del
   onboarding (onb-*, animaciones de entrada, transición onb-fade entre pasos)
   viven en assets/css/tailwind.css y en OnboardingCard/OnboardingLoading. */
.modal-enter-active,
.modal-leave-active {
  transition: opacity 0.2s ease;
}
.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}
</style>
