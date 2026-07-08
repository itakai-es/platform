<template>
  <div class="flex flex-col h-[calc(100vh-64px)]">
    <!-- Header -->
    <div class="bg-navy-700 -mx-4 md:-mx-6 -mt-4 md:-mt-6 px-4 md:px-6 pt-6 pb-4">
      <div class="space-y-4">
        <nav class="flex items-center gap-1.5 sm:gap-2 text-sm">
          <NuxtLink to="/profesor/inicio" class="text-white/70 hover:text-white flex-shrink-0"
            ><HomeIcon class="w-4 h-4"
          /></NuxtLink>
          <ChevronRightIcon class="w-4 h-4 text-white/70" />
          <NuxtLink
            to="/profesor/clases"
            class="text-white/70 hover:text-white whitespace-nowrap"
            >{{ t('teacher.classes.create.breadcrumb_classes') }}</NuxtLink
          >
          <ChevronRightIcon class="w-4 h-4 text-white/70" />
          <span class="text-white font-medium">{{
            t('teacher.classes.create.breadcrumb_new')
          }}</span>
        </nav>
      </div>
    </div>

    <!-- WIZARD -->
    <div v-if="!showForm" class="flex-1 overflow-y-auto px-4 sm:px-8 py-6">
      <div class="w-full max-w-4xl mx-auto">
        <!-- Progress: mobile = compact bar, desktop = circles -->
        <div class="sm:hidden flex items-center gap-3 mb-5">
          <div class="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
            <div
              class="h-full bg-navy-700 rounded-full transition-all duration-300"
              :style="{ width: `${((step + 1) / 6) * 100}%` }"
            />
          </div>
          <span class="text-sm font-semibold text-navy-700 whitespace-nowrap"
            >{{ step + 1 }}/6</span
          >
        </div>
        <div class="hidden sm:flex items-center justify-center gap-3 mb-5">
          <template v-for="i in 6" :key="i">
            <div
              class="w-7 h-7 rounded-full flex items-center justify-center transition-all duration-300 text-xs font-bold"
              :class="
                i - 1 < step
                  ? 'bg-navy-700 text-white'
                  : i - 1 === step
                    ? 'bg-navy-700 text-white'
                    : 'bg-gray-200 text-gray-400'
              "
            >
              <CheckIcon v-if="i - 1 < step" class="w-3.5 h-3.5" />
              <span v-else>{{ i }}</span>
            </div>
            <div
              v-if="i < 6"
              class="w-8 h-0.5 rounded-full"
              :class="i - 1 < step ? 'bg-navy-700' : 'bg-gray-200'"
            />
          </template>
        </div>

        <!-- Card -->
        <div class="flex flex-col min-h-0 bg-white rounded-2xl shadow-lg border border-gray-100">
          <!-- God + question -->
          <div class="flex items-start gap-4 px-6 pt-6">
            <div class="w-12 h-12 rounded-full flex-shrink-0 overflow-hidden bg-white/30">
              <img :src="god.avatar" :alt="god.name" class="w-full h-full object-contain" />
            </div>
            <div class="flex-1 pt-1">
              <p class="text-lg font-semibold text-navy-700 leading-snug">{{ currentQuestion }}</p>
            </div>
          </div>

          <!-- Content -->
          <div class="flex-1 flex flex-col px-6 pb-6 pt-5 min-h-0">
            <Transition name="fade" mode="out-in">
              <!-- ===== STEP 0: Idea ===== -->
              <div v-if="step === 0" key="s0" class="flex-1 flex flex-col">
                <textarea
                  ref="inputRef"
                  v-model="idea"
                  rows="5"
                  :placeholder="t('teacher.classes.create.onboarding.placeholder_idea')"
                  class="onb-input flex-1 resize-none"
                />

                <!-- Materiales de contexto (opcional): la IA los usa para crear la clase -->
                <div class="mt-3 flex flex-wrap items-center gap-2">
                  <input
                    ref="materialsFileRef"
                    type="file"
                    multiple
                    accept=".pdf,.doc,.docx,.txt,.md,image/*"
                    class="hidden"
                    @change="handleMaterialsUpload"
                  />
                  <button
                    type="button"
                    class="inline-flex items-center gap-1.5 text-sm text-navy-700/70 hover:text-navy-700 disabled:opacity-50"
                    :disabled="extractingDocs"
                    @click="materialsFileRef?.click()"
                  >
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                    </svg>
                    {{ extractingDocs ? t('teacher.classes.create.onboarding.attach_processing') : t('teacher.classes.create.onboarding.attach_materials') }}
                  </button>
                  <span
                    v-for="s in docSources"
                    :key="s.name"
                    class="inline-flex items-center gap-1 text-xs bg-navy-700/5 text-navy-700 px-2 py-1 rounded-full"
                    :title="s.note || ''"
                  >
                    📎 {{ s.name }}<span v-if="s.note"> ⚠️</span>
                  </span>
                </div>
                <p v-if="docSources.length" class="mt-1 text-xs text-navy-700/50">
                  {{ t('teacher.classes.create.onboarding.attach_hint') }}
                </p>

                <div class="onb-actions">
                  <span />
                  <Button
                    variant="primary"
                    size="sm"
                    :disabled="!idea.trim() || loading || extractingDocs"
                    @click="submitIdea"
                    >{{ t('teacher.classes.create.onboarding.btn_next') }}</Button
                  >
                </div>
              </div>

              <!-- ===== STEP 1: Narrative ===== -->
              <div v-else-if="step === 1" key="s1" class="flex-1 flex flex-col min-h-0">
                <div class="flex-1 onb-result-box overflow-y-auto min-h-0">
                  <div
                    v-if="waitingForFirstChunk && !plan"
                    class="flex flex-col items-center justify-center gap-3 py-8"
                  >
                    <SparklesIcon class="w-5 h-5 animate-pulse text-navy-700" />
                    <span class="text-sm text-text-secondary">{{
                      t('teacher.classes.create.onboarding.generating_approach')
                    }}</span>
                    <AILoadingBar
                      :progress="generationProgress"
                      :is-overtime="isOvertime"
                      :remaining-label="remainingTimeLabel"
                    />
                  </div>
                  <template v-else>
                    <div class="md-rendered" v-html="renderPageMarkdown(plan)" />
                    <div v-if="!isStreaming && plan" class="mt-2 flex justify-end">
                      <AIProviderBadge :provider="planProvider" />
                    </div>
                  </template>
                </div>
                <div v-if="!loading && plan && showNarrativeFeedback" class="onb-feedback">
                  <input
                    ref="feedbackRef"
                    v-model="feedback"
                    type="text"
                    :placeholder="
                      t('teacher.classes.create.onboarding.narrative_feedback_placeholder')
                    "
                    class="onb-feedback-input"
                    @keydown.enter.prevent="feedback.trim() && regeneratePlan()"
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
                    @click="regeneratePlan"
                  >
                    <PaperAirplaneIcon class="w-4 h-4" />
                  </button>
                </div>
                <div v-if="!loading && plan && !isStreaming" class="onb-actions">
                  <Button
                    variant="outline"
                    size="sm"
                    @click="step = 0; plan = ''; showNarrativeFeedback = false"
                    >{{ t('teacher.classes.create.onboarding.btn_back') }}</Button
                  >
                  <div v-if="!showNarrativeFeedback" class="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      @click="showNarrativeFeedback = true; nextTick(() => feedbackRef?.focus())"
                      >{{ t('teacher.classes.create.onboarding.btn_change_something') }}</Button
                    >
                    <Button variant="primary" size="sm" @click="acceptPlan">{{
                      t('teacher.classes.create.onboarding.btn_accept_plan')
                    }}</Button>
                  </div>
                </div>
              </div>

              <!-- ===== STEP 2: Titles ===== -->
              <div v-else-if="step === 2" key="s2" class="flex-1 flex flex-col">
                <template v-if="loading">
                  <div class="flex-1 flex flex-col items-center justify-center gap-3">
                    <SparklesIcon class="w-5 h-5 animate-pulse text-navy-700" />
                    <span class="text-sm text-text-secondary">{{
                      t('teacher.classes.create.onboarding.thinking')
                    }}</span>
                    <AILoadingBar
                      v-if="generationProgress > 0 || isOvertime"
                      :progress="generationProgress"
                      :is-overtime="isOvertime"
                      :remaining-label="remainingTimeLabel"
                    />
                  </div>
                </template>
                <template v-else>
                  <div class="space-y-2.5">
                    <TransitionGroup name="title-item" appear>
                      <button
                        v-for="(title, i) in titles"
                        :key="title"
                        type="button"
                        class="w-full text-left px-5 py-3.5 rounded-2xl transition-all text-sm font-medium shadow-sm"
                        :class="
                          selectedTitle === title
                            ? 'bg-navy-700 text-white shadow-md'
                            : 'bg-gray-50 text-navy-700 border border-gray-200 hover:border-navy-700'
                        "
                        :style="{ animationDelay: `${i * 100}ms` }"
                        @click="selectedTitle = title; customTitle = ''"
                      >
                        {{ title }}
                      </button>
                    </TransitionGroup>
                  </div>
                  <input
                    v-model="customTitle"
                    type="text"
                    :placeholder="t('teacher.classes.create.onboarding.custom_title_placeholder')"
                    class="onb-input mt-3"
                    @input="selectedTitle = ''"
                  />
                  <div v-if="showTitleFeedback" class="onb-feedback">
                    <input
                      ref="titleFeedbackRef"
                      v-model="titleFeedback"
                      type="text"
                      :placeholder="
                        t('teacher.classes.create.onboarding.title_feedback_placeholder')
                      "
                      class="onb-feedback-input"
                      @keydown.enter.prevent="titleFeedback.trim() && regenerateTitlesWithFeedback()"
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
                      @click="regenerateTitlesWithFeedback"
                    >
                      <PaperAirplaneIcon class="w-4 h-4" />
                    </button>
                  </div>
                  <div v-if="!showTitleFeedback" class="onb-actions">
                    <Button variant="outline" size="sm" @click="step = 1">{{
                      t('teacher.classes.create.onboarding.btn_back')
                    }}</Button>
                    <div class="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        @click="showTitleFeedback = true; nextTick(() => titleFeedbackRef?.focus())"
                        >{{ t('teacher.classes.create.onboarding.btn_change_something') }}</Button
                      >
                      <Button
                        variant="primary"
                        size="sm"
                        :disabled="!chosenTitle"
                        @click="step = 3"
                        >{{ t('teacher.classes.create.onboarding.btn_accept_plan') }}</Button
                      >
                    </div>
                  </div>
                  <div v-else class="onb-actions">
                    <Button variant="outline" size="sm" @click="step = 1">{{
                      t('teacher.classes.create.onboarding.btn_back')
                    }}</Button>
                  </div>
                </template>
              </div>

              <!-- ===== STEP 3: Schedule ===== -->
              <div v-else-if="step === 3" key="s3" class="flex-1 flex flex-col">
                <ClassScheduleEditor v-model="schedule" />
                <div class="flex-1" />
                <div class="onb-actions">
                  <Button variant="outline" size="sm" @click="step = 2">{{
                    t('teacher.classes.create.onboarding.btn_back')
                  }}</Button>
                  <div class="flex gap-2">
                    <Button variant="outline" size="sm" @click="step = 4">{{
                      t('teacher.classes.create.onboarding.btn_skip')
                    }}</Button>
                    <Button variant="primary" size="sm" @click="step = 4">{{
                      t('teacher.classes.create.onboarding.btn_next')
                    }}</Button>
                  </div>
                </div>
              </div>

              <!-- ===== STEP 4: Cover ===== -->
              <div v-else-if="step === 4" key="s4" class="flex-1 flex flex-col min-h-0">
                <div class="flex-1 flex items-center justify-center min-h-0">
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
                    <span class="text-sm text-text-secondary">{{
                      t('teacher.classes.create.onboarding.generating_cover')
                    }}</span>
                    <AILoadingBar
                      v-if="generationProgress > 0 || isOvertime"
                      :progress="generationProgress"
                      :is-overtime="isOvertime"
                      :remaining-label="remainingTimeLabel"
                    />
                  </div>
                  <div v-else-if="generatedImageUrl" class="w-full max-w-md">
                    <div class="relative aspect-video rounded-2xl overflow-hidden shadow-lg">
                      <img :src="resolvedImageUrl" alt="" class="w-full h-full object-cover" />
                    </div>
                    <div v-if="coverProvider" class="mt-2 flex justify-end">
                      <AIProviderBadge :provider="coverProvider" />
                    </div>
                  </div>
                  <div
                    v-else-if="imageGenerationFailed"
                    class="flex flex-col items-center gap-4 text-text-secondary"
                  >
                    <PhotoIcon class="w-12 h-12 opacity-40" />
                    <p class="text-sm">{{ t('teacher.classes.create.onboarding.cover_error') }}</p>
                    <Button variant="outline" size="sm" @click="coverFileRef?.click()">
                      <ArrowUpTrayIcon class="w-4 h-4 mr-2" />
                      {{ t('teacher.classes.create.onboarding.btn_upload_cover') }}
                    </Button>
                  </div>
                </div>
                <input
                  ref="coverFileRef"
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  class="hidden"
                  @change="handleCoverUpload"
                />
                <div v-if="!isGeneratingImage && showImageFeedback" class="onb-feedback">
                  <input
                    ref="imageFeedbackRef"
                    v-model="imageFeedback"
                    type="text"
                    :placeholder="t('teacher.classes.create.onboarding.image_feedback_placeholder')"
                    class="onb-feedback-input"
                    @keydown.enter.prevent="imageFeedback.trim() && regenerateCover()"
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
                    @click="regenerateCover"
                  >
                    <PaperAirplaneIcon class="w-4 h-4" />
                  </button>
                </div>
                <div v-if="!isGeneratingImage && !showImageFeedback" class="onb-actions">
                  <Button variant="outline" size="sm" @click="step = 3">{{
                    t('teacher.classes.create.onboarding.btn_back')
                  }}</Button>
                  <div class="flex gap-2">
                    <Button
                      v-if="generatedImageUrl"
                      variant="outline"
                      size="sm"
                      @click="showImageFeedback = true; nextTick(() => imageFeedbackRef?.focus())"
                      >{{ t('teacher.classes.create.onboarding.btn_change_something') }}</Button
                    >
                    <Button variant="outline" size="sm" @click="coverFileRef?.click()">
                      <ArrowUpTrayIcon class="w-4 h-4 mr-1.5" />
                      {{ t('teacher.classes.create.onboarding.btn_upload_cover') }}
                    </Button>
                    <Button variant="outline" size="sm" @click="step = 5">{{
                      t('teacher.classes.create.onboarding.btn_skip')
                    }}</Button>
                    <Button
                      v-if="generatedImageUrl"
                      variant="primary"
                      size="sm"
                      @click="step = 5"
                      >{{ t('teacher.classes.create.onboarding.btn_accept_plan') }}</Button
                    >
                  </div>
                </div>
                <div v-else-if="!isGeneratingImage && showImageFeedback" class="onb-actions">
                  <Button variant="outline" size="sm" @click="step = 3">{{
                    t('teacher.classes.create.onboarding.btn_back')
                  }}</Button>
                </div>
              </div>

              <!-- ===== STEP 5: Guide ===== -->
              <div v-else-if="step === 5" key="s5" class="flex-1 flex flex-col min-h-0">
                <div class="flex-1 onb-result-box overflow-y-auto min-h-0">
                  <div
                    v-if="(waitingForFirstChunk || isGeneratingGuide) && !guideContent"
                    class="flex flex-col items-center justify-center gap-3 py-8"
                  >
                    <SparklesIcon class="w-5 h-5 animate-pulse text-navy-700" />
                    <span class="text-sm text-text-secondary">Generando guía del alumno...</span>
                    <AILoadingBar
                      v-if="generationProgress > 0 || isOvertime"
                      :progress="generationProgress"
                      :is-overtime="isOvertime"
                      :remaining-label="remainingTimeLabel"
                    />
                  </div>
                  <div
                    v-else-if="guideGenerationFailed && !guideContent"
                    class="flex flex-col items-center gap-4 text-text-secondary py-8"
                  >
                    <p class="text-sm">No se pudo generar la guía.</p>
                    <Button variant="primary" size="sm" @click="generateGuide()">
                      <ArrowPathIcon class="w-4 h-4 mr-2" />
                      Reintentar
                    </Button>
                  </div>
                  <template v-else>
                    <div class="md-rendered" v-html="renderPageMarkdown(guideContent)" />
                    <div v-if="!isStreaming && guideContent" class="mt-2 flex justify-end">
                      <AIProviderBadge :provider="guideProvider" />
                    </div>
                  </template>
                </div>
                <div
                  v-if="!isGeneratingGuide && guideContent && showGuideFeedback"
                  class="onb-feedback"
                >
                  <input
                    ref="guideFeedbackRef"
                    v-model="guideFeedback"
                    type="text"
                    placeholder="Ej: Añade criterios de evaluación, cambia el tono..."
                    class="onb-feedback-input"
                    @keydown.enter.prevent="guideFeedback.trim() && regenerateGuide()"
                  />
                  <button
                    type="button"
                    class="onb-cancel-btn"
                    title="Cancelar"
                    @click="showGuideFeedback = false"
                  >
                    <XMarkIcon class="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    class="onb-send-btn"
                    :disabled="!guideFeedback.trim() || isGeneratingGuide"
                    @click="regenerateGuide"
                  >
                    <PaperAirplaneIcon class="w-4 h-4" />
                  </button>
                </div>
                <div
                  v-if="!isGeneratingGuide && !isStreaming && guideContent && !showGuideFeedback"
                  class="onb-actions"
                >
                  <Button variant="outline" size="sm" @click="step = 4">{{
                    t('teacher.classes.create.onboarding.btn_back')
                  }}</Button>
                  <div class="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      @click="showGuideFeedback = true; nextTick(() => guideFeedbackRef?.focus())"
                      >{{ t('teacher.classes.create.onboarding.btn_change_something') }}</Button
                    >
                    <Button
                      variant="outline"
                      size="sm"
                      @click="guideContent = ''; finishWizard()"
                      >{{ t('teacher.classes.create.onboarding.btn_skip') }}</Button
                    >
                    <Button variant="primary" size="sm" @click="finishWizard()">{{
                      t('teacher.classes.create.onboarding.btn_accept_plan')
                    }}</Button>
                  </div>
                </div>
                <div v-else-if="!isGeneratingGuide && showGuideFeedback" class="onb-actions">
                  <Button variant="outline" size="sm" @click="step = 4">{{
                    t('teacher.classes.create.onboarding.btn_back')
                  }}</Button>
                </div>
              </div>
            </Transition>
          </div>
        </div>
      </div>
    </div>

    <!-- PREVIEW -->
    <div v-else class="flex-1 overflow-y-auto px-4 sm:px-8 py-6">
      <div class="max-w-4xl mx-auto">
        <!-- Preview label -->
        <p class="text-sm font-medium text-text-secondary mb-4 text-center">
          {{ t('teacher.classes.create.preview_label') }}
        </p>

        <!-- Class card preview -->
        <div class="pointer-events-none">
          <ClassCard
            :icon="BookOpenIcon"
            :name="form.name"
            :schedule="form.schedule"
            :background-image="resolvedImageUrl || form.backgroundImage"
            :missions-count="0"
          />
        </div>

        <!-- Error -->
        <p v-if="errors.name" class="text-sm text-red-600 mt-3 text-center">{{ errors.name }}</p>

        <!-- Actions -->
        <div class="flex justify-center gap-3 mt-6">
          <Button variant="outline" @click="showForm = false">{{
            t('teacher.classes.create.onboarding.btn_back')
          }}</Button>
          <Button
            variant="primary"
            :disabled="isSubmitting || !form.name.trim()"
            @click="handleSubmit"
          >
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
              {{ t('teacher.classes.create.btn_creating') }}
            </template>
            <template v-else>{{ t('teacher.classes.create.btn_create') }}</template>
          </Button>
        </div>
      </div>
    </div>

    <!-- Success Modal -->
    <Teleport to="body"
      ><Transition name="modal">
        <div
          v-if="showSuccessModal"
          class="fixed inset-0 z-50 flex items-center justify-center p-4"
        >
          <div class="absolute inset-0 bg-black/50" />
          <div
            class="relative bg-white rounded-2xl p-6 sm:p-8 max-w-md w-full shadow-xl text-center"
          >
            <div
              class="w-16 h-16 mx-auto mb-4 rounded-full bg-green-100 flex items-center justify-center"
            >
              <CheckIcon class="w-8 h-8 text-green-600" />
            </div>
            <h3 class="text-xl font-bold text-navy-700 mb-2">
              {{ t('teacher.classes.create.success_title') }}
            </h3>
            <p class="text-text-secondary mb-6">
              {{ t('teacher.classes.create.success_message', { name: createdClassName }) }}
            </p>
            <div class="bg-gray-100 rounded-xl p-4 mb-6">
              <p class="text-sm text-text-secondary mb-2">
                {{ t('teacher.classes.create.invite_code_label') }}
              </p>
              <p class="text-2xl font-bold text-navy-700 tracking-[0.2em] font-mono">
                {{ createdInviteCode }}
              </p>
              <p class="text-xs text-text-secondary mt-2">
                {{ t('teacher.classes.create.invite_code_hint') }}
              </p>
            </div>
            <div class="flex flex-col gap-2">
              <Button variant="primary" full-width @click="goToClasses">{{
                t('teacher.classes.create.btn_view_classes')
              }}</Button>
              <Button variant="outline" full-width @click="copyInviteCode"
                ><ClipboardDocumentIcon class="w-4 h-4 mr-2" />{{
                  copiedCode
                    ? t('teacher.classes.create.btn_copied')
                    : t('teacher.classes.create.btn_copy_code')
                }}</Button
              >
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
  AcademicCapIcon,
  SparklesIcon,
  PhotoIcon,
  XMarkIcon,
  CheckIcon,
  ClipboardDocumentIcon,
  PaperAirplaneIcon,
  BookOpenIcon,
  ArrowPathIcon,
  ArrowUpTrayIcon,
} from '@heroicons/vue/24/outline'
import { renderPageMarkdown } from '~/utils/markdown'

// El confeti se dispara via useEffects() para pasar por los mismos gates
// (`visualEffects`/`sounds`) que el resto del UI.
const effects = useEffects()

const { t, locale } = useI18n()
const config = useRuntimeConfig()
const toast = useToast()

useHead({ title: () => t('teacher.classes.create.meta.title') })
definePageMeta({ layout: 'teacher', middleware: ['auth', 'role'] })

const router = useRouter()
const teacherStore = useTeacherStore()
const classesStore = useClassesStore()
const authStore = useAuthStore()
const aiStore = useAIAssistantStore()

const god = computed(
  () =>
    aiStore.currentGod || {
      id: 'atenea',
      name: 'Atenea',
      avatar: '/app/avatars/atenea.svg',
      color: '#FFC338',
    }
)
const teacherName = computed(() => authStore.user?.name?.split(' ')[0] || '')
const currentQuestion = computed(() => {
  const questions = [
    t('teacher.classes.create.onboarding.ask_idea', {
      name: teacherName.value,
      god: god.value.name,
    }),
    t('teacher.classes.create.onboarding.review_approach'),
    t('teacher.classes.create.onboarding.pick_title'),
    t('teacher.classes.create.onboarding.ask_schedule'),
    t('teacher.classes.create.onboarding.ask_image'),
    'He preparado una guía para tus alumnos',
    '¿Quieres crear una insignia para esta clase?',
  ]
  return questions[step.value] || ''
})

// The raw image path from API (e.g. /uploads/ai-generated/covers/xxx.png)
// This is what gets stored in the DB - no apiBase prefix
const rawImagePath = ref('')

// ---- State ----
const step = ref(0)
const loading = ref(false)
const isStreaming = ref(false)
const inputRef = ref<HTMLInputElement | HTMLTextAreaElement>()

const idea = ref('')
const plan = ref('')
const titles = ref<string[]>([])
const selectedTitle = ref('')
const customTitle = ref('')
const chosenTitle = computed(() => customTitle.value.trim() || selectedTitle.value)
const schedule = ref('')
const generatedImageUrl = ref('')
// The AI cover arrives as a relative /uploads/... path served by the API host,
// while a teacher-uploaded cover is a base64 data URL. getImageUrl resolves
// both correctly for display (prefixes apiBase, leaves data: URLs as-is).
const { getImageUrl } = useImageUrl()
const resolvedImageUrl = computed(() => getImageUrl(generatedImageUrl.value) || '')
const feedback = ref('')
const showNarrativeFeedback = ref(false)
const feedbackRef = ref<HTMLInputElement>()
const titleFeedback = ref('')
const showTitleFeedback = ref(false)
const titleFeedbackRef = ref<HTMLInputElement>()
const imageFeedback = ref('')
const showImageFeedback = ref(false)
const guideContent = ref('')
const isGeneratingGuide = ref(false)
const guideGenerationFailed = ref(false)
const guideFeedback = ref('')
const showGuideFeedback = ref(false)
const guideFeedbackRef = ref<HTMLInputElement>()
const imageGenerationFailed = ref(false)
const imageFeedbackRef = ref<HTMLInputElement>()
const coverFileRef = ref<HTMLInputElement>()

// ---- Materiales de contexto del profesor (opcional) ----
// El profe adjunta PDFs/Word/texto/imágenes; el backend extrae el texto (y
// describe las imágenes con visión) y lo devolvemos aquí para usarlo como
// contexto al generar narrativa, títulos, portada y guía.
interface DocSource {
  name: string
  kind: string
  chars: number
  note?: string
}
const docsContext = ref('')
const docSources = ref<DocSource[]>([])
const extractingDocs = ref(false)
const materialsFileRef = ref<HTMLInputElement>()

async function handleMaterialsUpload(event: Event) {
  const input = event.target as HTMLInputElement
  const files = Array.from(input.files || [])
  input.value = ''
  if (!files.length) return
  extractingDocs.value = true
  try {
    const fd = new FormData()
    for (const f of files) fd.append('file', f)
    const config = useRuntimeConfig()
    const res = await $fetch<{ context: string; sources: DocSource[] }>(
      `${config.public.apiBase}/ai/extract-context`,
      { method: 'POST', body: fd }
    )
    docsContext.value = [docsContext.value, res.context].filter(Boolean).join('\n\n')
    docSources.value = [...docSources.value, ...res.sources]
  } catch {
    toast.error(t('teacher.classes.create.onboarding.attach_error'))
  } finally {
    extractingDocs.value = false
  }
}

// La idea que se manda a la IA incluye los materiales del profe como contexto.
function ideaWithMaterials() {
  if (!docsContext.value) return idea.value
  return `${idea.value}\n\nMateriales de referencia del profesor:\n${docsContext.value.slice(0, 4000)}`
}

// Let the teacher use their own cover instead of (or after) the AI one. The
// image is read as a base64 data URL; the backend persists it to /uploads on
// class creation (see teachers.service saveBase64Image).
function handleCoverUpload(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return
  const validTypes = ['image/png', 'image/jpeg', 'image/webp']
  if (!validTypes.includes(file.type)) {
    toast.error(t('teacher.classes.create.onboarding.cover_upload_type_error'))
    input.value = ''
    return
  }
  if (file.size > 5 * 1024 * 1024) {
    toast.error(t('teacher.classes.create.onboarding.cover_upload_size_error'))
    input.value = ''
    return
  }
  const reader = new FileReader()
  reader.onload = e => {
    const dataUrl = e.target?.result as string
    generatedImageUrl.value = dataUrl
    rawImagePath.value = dataUrl
    coverProvider.value = null
    imageGenerationFailed.value = false
    showImageFeedback.value = false
  }
  reader.readAsDataURL(file)
  input.value = ''
}

function buildContext() {
  const parts = [`Idea: ${idea.value}`]
  if (plan.value) parts.push(`Plan: ${plan.value.slice(0, 500)}`)
  if (chosenTitle.value) parts.push(`Titulo: ${chosenTitle.value}`)
  if (docsContext.value) parts.push(`Materiales del profesor:\n${docsContext.value.slice(0, 4000)}`)
  return parts.join('\n')
}

const form = reactive({ name: '', schedule: '', backgroundImage: '' })
const errors = reactive({ name: '' })
const isSubmitting = ref(false)
const showForm = ref(false)
const showSuccessModal = ref(false)
const createdClassName = ref('')
const createdInviteCode = ref('')
const copiedCode = ref(false)
const isGeneratingImage = ref(false)

onMounted(() => nextTick(() => inputRef.value?.focus()))
watch(step, () => {
  showNarrativeFeedback.value = false
  showTitleFeedback.value = false
  showImageFeedback.value = false
  nextTick(() => inputRef.value?.focus())
})

// ---- AI ----

function cleanAIText(text: string) {
  return text
    .replace(
      /^(Aqui tienes|Here is|Esta es|Claro|Sure|Por supuesto|Entendido|I understood|Hola \w+,)[^.]*[.:]\s*/i,
      ''
    )
    .trim()
}

// Step 0 → 1: Stream the full plan
const {
  streamPrompt,
  callPrompt,
  lastProvider,
  generationProgress,
  waitingForFirstChunk,
  isOvertime,
  remainingTimeLabel,
  fetchEstimate,
  startProgress,
  stopProgress,
} = useAIPrompt()
type AIProviderName = 'spark' | 'gemini' | 'flux' | null
const planProvider = ref<AIProviderName>(null)
const coverProvider = ref<AIProviderName>(null)
const guideProvider = ref<AIProviderName>(null)

async function submitIdea() {
  if (!idea.value.trim() || loading.value) return
  step.value = 1
  plan.value = ''
  loading.value = true

  try {
    loading.value = false
    isStreaming.value = true
    await streamPrompt('class.narrative.generate', { idea: ideaWithMaterials() }, plan)
    plan.value = cleanAIText(plan.value).slice(0, 8000)
    planProvider.value = lastProvider.value
  } catch {
    plan.value = idea.value
  } finally {
    loading.value = false
    isStreaming.value = false
  }
}

// Regenerate plan with teacher feedback (streamed)
async function regeneratePlan() {
  const fb = feedback.value.trim()
  if (!fb) return
  feedback.value = ''
  showNarrativeFeedback.value = false
  const previousPlan = plan.value
  plan.value = ''
  loading.value = true
  try {
    loading.value = false
    isStreaming.value = true
    await streamPrompt(
      'class.narrative.modify',
      { idea: idea.value, current: previousPlan.slice(0, 800), feedback: fb },
      plan
    )
    plan.value = cleanAIText(plan.value).slice(0, 8000)
    planProvider.value = lastProvider.value
  } catch {
    /* keep current */
  } finally {
    loading.value = false
    isStreaming.value = false
  }
}

// Step 1 → 2: Accept plan, generate titles + description
async function acceptPlan() {
  step.value = 2
  loading.value = true
  const est = await fetchEstimate('chat')
  startProgress(est)
  try {
    const ctx = buildContext()
    const titlesRes = await $fetch<{ names: string[] }>(
      `${config.public.apiBase}/ai/suggest-class-names`,
      {
        method: 'POST',
        body: {
          locale: locale.value,
          context: `${ctx}\nNarrativa: ${plan.value.slice(0, 500)}`.slice(0, 1500),
        },
      }
    ).catch(() => null)
    if (titlesRes?.names?.length) titles.value = titlesRes.names
  } finally {
    stopProgress()
    loading.value = false
  }
}

async function regenerateTitlesWithFeedback() {
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
    const res = await $fetch<{ names: string[] }>(
      `${config.public.apiBase}/ai/suggest-class-names`,
      {
        method: 'POST',
        body: {
          locale: locale.value,
          context: `${ctx}\nNarrativa: ${plan.value.slice(0, 500)}`.slice(0, 1500),
          feedback: fb,
        },
      }
    )
    if (res.names?.length) titles.value = res.names
  } catch {
    /* silent */
  } finally {
    stopProgress()
    loading.value = false
  }
}

// Cover
watch(step, s => {
  if (s === 4 && !generatedImageUrl.value) generateCover()
})

async function generateCover(extraPrompt?: string) {
  if (isGeneratingImage.value) return
  isGeneratingImage.value = true
  imageGenerationFailed.value = false
  const description = extraPrompt ? `${plan.value}. ${extraPrompt}` : plan.value
  const maxAttempts = 3
  try {
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      const est = await fetchEstimate('image')
      startProgress(est)
      try {
        const res = await $fetch<{ imageUrl: string; provider?: string }>(
          `${config.public.apiBase}/ai/class-cover`,
          {
            method: 'POST',
            headers: { Authorization: `Bearer ${authStore.tokens?.accessToken}` },
            body: { name: chosenTitle.value, description, locale: locale.value },
          }
        )
        rawImagePath.value = res.imageUrl
        generatedImageUrl.value = res.imageUrl
        if (res.provider) coverProvider.value = res.provider as AIProviderName
        return
      } catch (err) {
        stopProgress()
        if (attempt === maxAttempts) throw err
        await new Promise(r => setTimeout(r, 1000 * attempt))
      }
    }
  } catch {
    imageGenerationFailed.value = true
  } finally {
    stopProgress()
    isGeneratingImage.value = false
  }
}

async function regenerateCover() {
  const fb = imageFeedback.value.trim()
  if (!fb) return
  imageFeedback.value = ''
  showImageFeedback.value = false
  generatedImageUrl.value = ''
  rawImagePath.value = ''
  await generateCover(fb)
}

// Step 5: Guide generation
watch(step, s => {
  if (s === 5 && !guideContent.value && !isGeneratingGuide.value) generateGuide()
})

async function generateGuide(extraPrompt?: string) {
  if (isGeneratingGuide.value) return
  isGeneratingGuide.value = true
  guideGenerationFailed.value = false
  guideContent.value = ''
  try {
    const ctx = `Clase: ${chosenTitle.value}\nNarrativa: ${plan.value.slice(0, 600)}\nHorario: ${schedule.value || 'No especificado'}`
    isGeneratingGuide.value = false
    isStreaming.value = true
    await streamPrompt(
      'class.guide.generate',
      { title: chosenTitle.value, context: ctx },
      guideContent
    )
    guideProvider.value = lastProvider.value
    guideContent.value = guideContent.value
      .replace(/^(Aqui tienes|Claro|Por supuesto)[^.]*[.:]\s*/i, '')
      .trim()
  } catch {
    guideGenerationFailed.value = true
  } finally {
    isGeneratingGuide.value = false
    isStreaming.value = false
  }
}

async function regenerateGuide() {
  const fb = guideFeedback.value.trim()
  if (!fb) return
  guideFeedback.value = ''
  showGuideFeedback.value = false
  await generateGuide(fb)
}

function finishWizard() {
  form.name = chosenTitle.value
  form.schedule = schedule.value
  form.backgroundImage = generatedImageUrl.value
  showForm.value = true
}

function skipToForm() {
  showForm.value = true
}

// ---- Submit ----

async function handleSubmit() {
  errors.name = ''
  if (!form.name.trim()) {
    errors.name = t('teacher.classes.create.validation.name_required')
    return
  }
  if (form.name.trim().length < 3) {
    errors.name = t('teacher.classes.create.validation.name_min_length')
    return
  }
  isSubmitting.value = true
  try {
    const res = await classesStore.createClass({
      name: form.name.trim(),
      narrative: plan.value.trim() || undefined,
      schedule: form.schedule.trim() || undefined,
      backgroundImage: rawImagePath.value || undefined,
    })
    // Invalidar caché del store del profesor para que dashboard/lista
    // recarguen al volver a entrar.
    teacherStore.hasLoadedClasses = false
    // Save guide if generated
    if (guideContent.value.trim() && res.class.id) {
      try {
        await $fetch(`${config.public.apiBase}/teacher/classes/${res.class.id}/guide`, {
          method: 'PUT',
          headers: { Authorization: `Bearer ${authStore.tokens?.accessToken}` },
          body: { content: guideContent.value.trim() },
        })
      } catch {
        /* guide save failed silently - teacher can edit later */
      }
    }
    createdClassName.value = res.class.name
    createdInviteCode.value = res.class.invitationCode
    showSuccessModal.value = true
    // Clase recién creada: el alumno aún no tiene ajustes que respetar, así que
    // disparamos el evento "celebratorio" sin gate. Pasa por el composable para
    // mantener todo el sitio con el mismo lenguaje de confeti/SFX.
    effects.play('mission_completed')
  } catch {
    errors.name = t('teacher.classes.create.validation.create_error')
  } finally {
    isSubmitting.value = false
  }
}

async function goToClasses() {
  showSuccessModal.value = false
  // Invalidamos la caché del store del profesor; la pantalla destino
  // hará el fetch fresco al montarse.
  teacherStore.hasLoadedClasses = false
  router.push('/profesor/clases')
}

async function copyInviteCode() {
  try {
    if (navigator.clipboard?.writeText) await navigator.clipboard.writeText(createdInviteCode.value)
    else {
      const ta = document.createElement('textarea')
      ta.value = createdInviteCode.value
      ta.style.cssText = 'position:fixed;opacity:0'
      document.body.appendChild(ta)
      ta.select()
      document.execCommand('copy')
      document.body.removeChild(ta)
    }
    copiedCode.value = true
    setTimeout(() => {
      copiedCode.value = false
    }, 2000)
  } catch {
    /* silent */
  }
}
</script>

<style scoped>
/* Onboarding reusable styles */
.onb-input {
  @apply w-full px-5 py-4 rounded-2xl bg-gray-50 text-sm text-navy-700 leading-relaxed border border-gray-200 outline-none;
}
.onb-input:focus {
  @apply ring-2 ring-gray-300;
}
.onb-input::placeholder {
  @apply text-text-secondary;
}
.onb-result-box {
  @apply bg-gray-50 rounded-2xl p-5 border border-gray-100;
}
.onb-actions {
  @apply flex items-center justify-between mt-5 pt-4 border-t border-gray-100;
}
.onb-loading {
  @apply flex items-center gap-2 text-text-secondary text-sm;
}
.onb-feedback {
  @apply flex gap-2 mt-4;
}
.onb-feedback-input {
  @apply flex-1 px-4 py-2.5 rounded-2xl bg-gray-50 border border-gray-200 text-sm text-navy-700 outline-none;
}
.onb-feedback-input:focus {
  @apply ring-2 ring-gray-300;
}
.onb-feedback-input::placeholder {
  @apply text-text-secondary;
}
.onb-send-btn {
  @apply px-3.5 py-2.5 rounded-2xl bg-navy-700 text-white transition-colors;
}
.onb-send-btn:hover {
  @apply opacity-90;
}
.onb-send-btn:disabled {
  @apply opacity-40 cursor-not-allowed;
}
.onb-cancel-btn {
  @apply px-3.5 py-2.5 rounded-2xl bg-gray-100 text-navy-700 border border-gray-200 transition-colors;
}
.onb-cancel-btn:hover {
  @apply bg-gray-200;
}
.btn-back {
  @apply text-sm font-medium text-text-secondary transition-colors;
}
.btn-back:hover {
  @apply text-navy-700;
}
.title-item-enter-active {
  animation: slideUp 0.3s ease both;
}
@keyframes slideUp {
  from {
    opacity: 0;
    transform: translateY(12px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
.fade-enter-active,
.fade-leave-active {
  transition:
    opacity 0.2s ease,
    transform 0.2s ease;
}
.fade-enter-from {
  opacity: 0;
  transform: translateX(20px);
}
.fade-leave-to {
  opacity: 0;
  transform: translateX(-20px);
}
.modal-enter-active,
.modal-leave-active {
  transition: opacity 0.2s ease;
}
.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}
.modal-enter-active .relative,
.modal-leave-active .relative {
  transition: transform 0.2s ease;
}
.modal-enter-from .relative,
.modal-leave-to .relative {
  transform: scale(0.95);
}
</style>
