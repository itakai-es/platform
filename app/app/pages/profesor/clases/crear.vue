<template>
  <!-- Rompe el padding del <main> del layout (-m) y ocupa todo el alto disponible;
       así la card llena el hueco sin márgenes muertos ni desbordar la pantalla. -->
  <div class="flex flex-col h-[calc(100vh-56px)] lg:h-screen -m-4 md:-m-6">
    <!-- Header (el root ya rompe el padding del layout) -->
    <div class="bg-navy-700 px-4 md:px-6 pt-6 pb-4">
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

    <!-- WIZARD: alto fijo (no desborda pantalla); solo scrollea el contenido. -->
    <div v-if="!showForm" class="flex-1 min-h-0 px-4 md:px-6 py-4 flex">
      <div class="w-full flex flex-1 min-h-0 flex-col">
        <!-- Card compartida (cabecera de paso + pasos). Ver OnboardingCard.vue -->
        <OnboardingCard
          :step="step"
          :total-steps="5"
          :god="god"
          :question="currentQuestion"
        >
          <Transition name="onb-fade" mode="out-in">
              <!-- ===== STEP 0: Idea ===== -->
              <div v-if="step === 0" key="s0" class="flex-1 flex flex-col">
                <!-- Datos básicos: se configuran antes de nada. El idioma manda
                     el idioma en el que la IA genera todo en esta clase. -->
                <div
                  class="onb-reveal grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4"
                  style="animation-delay: 0.18s"
                >
                  <div>
                    <label class="text-sm font-medium text-text-primary mb-1.5 block">
                      {{ t('teacher.classes.detail.settings.general.language_label') }}
                    </label>
                    <SelectDropdown
                      :model-value="meta.language"
                      :options="languageOptions"
                      @update:model-value="meta.language = String($event)"
                    />
                  </div>
                  <div>
                    <label class="text-sm font-medium text-text-primary mb-1.5 block">
                      {{ t('teacher.classes.detail.settings.general.province_label') }}
                    </label>
                    <SelectDropdown
                      :model-value="meta.province"
                      :error="showMetaErrors && !meta.province"
                      :options="provinceOptions"
                      searchable
                      :placeholder="t('teacher.classes.detail.settings.general.metadata_none')"
                      :search-placeholder="
                        t('teacher.classes.detail.settings.general.metadata_search')
                      "
                      @update:model-value="meta.province = String($event)"
                    />
                  </div>
                  <div>
                    <label class="text-sm font-medium text-text-primary mb-1.5 block">
                      {{ t('teacher.classes.detail.settings.general.level_label') }}
                    </label>
                    <SelectDropdown
                      :model-value="meta.educationLevel"
                      :error="showMetaErrors && !meta.educationLevel"
                      :options="educationLevelOptions"
                      :placeholder="t('teacher.classes.detail.settings.general.metadata_none')"
                      @update:model-value="meta.educationLevel = String($event)"
                    />
                  </div>
                  <div>
                    <label class="text-sm font-medium text-text-primary mb-1.5 block">
                      {{ t('teacher.classes.detail.settings.general.subject_label') }}
                    </label>
                    <SelectDropdown
                      :model-value="meta.subject"
                      :disabled="!meta.educationLevel"
                      :error="showMetaErrors && !meta.subject"
                      :options="subjectOptions"
                      searchable
                      :placeholder="
                        meta.educationLevel
                          ? t('teacher.classes.detail.settings.general.metadata_none')
                          : t('teacher.classes.detail.settings.general.subject_needs_level')
                      "
                      :search-placeholder="
                        t('teacher.classes.detail.settings.general.metadata_search')
                      "
                      @update:model-value="meta.subject = String($event)"
                    />
                  </div>
                </div>

                <textarea
                  ref="inputRef"
                  v-model="idea"
                  rows="6"
                  :placeholder="t('teacher.classes.create.onboarding.placeholder_idea')"
                  class="onb-input onb-reveal resize-none"
                  style="animation-delay: 0.26s"
                />

                <!-- Materiales de contexto (opcional): la IA los usa para crear la clase -->
                <div class="onb-reveal mt-3" style="animation-delay: 0.32s">
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
                      <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        stroke-width="2"
                        d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13"
                      />
                    </svg>
                    {{
                      extractingDocs
                        ? t('teacher.classes.create.onboarding.attach_processing')
                        : t('teacher.classes.create.onboarding.attach_materials')
                    }}
                  </button>
                  <!-- El tope se avisa antes de elegir archivo: si no, el profe
                       se entera al fallar la subida. -->
                  <span v-if="!extractingDocs" class="ml-2 text-xs text-navy-700/50">
                    {{
                      t('teacher.classes.create.onboarding.attach_hint', { max: MAX_MATERIAL_MB })
                    }}
                  </span>

                  <!-- Archivos subidos: tarjeta con icono coloreado según el formato,
                       al estilo de los documentos de apoyo de las misiones. -->
                  <div v-if="docSources.length" class="mt-2 flex flex-wrap gap-2">
                    <div
                      v-for="(s, i) in docSources"
                      :key="`${s.name}-${i}`"
                      class="group inline-flex items-center gap-2.5 rounded-xl border border-border-primary bg-white py-1.5 pl-1.5 pr-2"
                      :title="s.note || ''"
                    >
                      <span
                        class="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg"
                        :class="docBg(s.kind)"
                      >
                        <component :is="docIcon(s.kind)" class="h-5 w-5 text-white" />
                      </span>
                      <span class="min-w-0">
                        <span
                          class="block max-w-[200px] truncate text-sm font-medium text-navy-700"
                        >
                          {{ s.name }}
                        </span>
                        <span v-if="s.note" class="block text-xs text-yellow-700"
                          >⚠️ {{ s.note }}</span
                        >
                      </span>
                      <button
                        type="button"
                        class="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full text-navy-700/40 hover:bg-navy-700/5 hover:text-navy-700 transition-colors"
                        :title="t('teacher.classes.create.onboarding.attach_remove')"
                        @click="removeMaterial(i)"
                      >
                        <XMarkIcon class="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>

                <div class="onb-actions !mt-auto">
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
                <EditableMarkdown
                  v-model="plan"
                  :god-name="god.name"
                  :god-avatar="god.avatar"
                  ai-placeholder="Ej: Añade un giro en la trama, una casa nueva..."
                  context-label="Editando la historia de la clase"
                  ai-modal-hint="Dile a la IA qué quieres añadir o cambiar de la historia."
                  ai-system-context="El profesor está editando la NARRATIVA/HISTORIA de su clase gamificada. Es la historia que envuelve toda la clase y motiva a los alumnos. Genera contenido narrativo, inmersivo y creativo que encaje con la temática de la clase."
                >
                  <template #default="{ edit }">
                    <div class="flex-1 onb-result-box overflow-y-auto min-h-0">
                      <OnboardingLoading
                        v-if="waitingForFirstChunk && !plan"
                        :text="t('teacher.classes.create.onboarding.generating_approach')"
                        :progress="generationProgress"
                        :is-overtime="isOvertime"
                        :remaining-label="remainingTimeLabel"
                      />
                      <div
                        v-else-if="planGenerationFailed && !plan"
                        class="h-full flex flex-col items-center justify-center gap-4 text-center px-4"
                      >
                        <ExclamationTriangleIcon class="w-8 h-8 text-navy-700/30" />
                        <p class="text-base font-semibold text-navy-700">
                          {{ t('teacher.classes.create.narrative_error') }}
                        </p>
                        <p class="text-sm text-text-secondary max-w-sm">
                          Puede que el asistente esté saturado ahora mismo. Espera un momento y
                          reinténtalo.
                        </p>
                        <div class="flex gap-2">
                          <Button variant="outline" size="sm" @click="backToStep0">{{
                            t('teacher.classes.create.onboarding.btn_back')
                          }}</Button>
                          <Button variant="primary" size="sm" @click="submitIdea">
                            <ArrowPathIcon class="w-4 h-4 mr-1.5" />Reintentar
                          </Button>
                        </div>
                      </div>
                      <template v-else>
                        <div class="md-rendered" v-html="renderPageMarkdown(plan)" />
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
                      <Button variant="outline" size="sm" @click="backToStep0">{{
                        t('teacher.classes.create.onboarding.btn_back')
                      }}</Button>
                      <div v-if="!showNarrativeFeedback" class="flex gap-2">
                        <Button variant="outline" size="sm" @click="edit"
                          ><PencilSquareIcon class="w-4 h-4 mr-1.5" />Editar a mano</Button
                        >
                        <Button variant="outline" size="sm" @click="openNarrativeFeedback">
                          <SparklesIcon class="w-4 h-4 mr-1.5" />{{
                            t('teacher.classes.create.onboarding.btn_change_something')
                          }}
                        </Button>
                        <Button variant="primary" size="sm" @click="acceptPlan">{{
                          t('teacher.classes.create.onboarding.btn_accept_plan')
                        }}</Button>
                      </div>
                    </div>
                  </template>
                </EditableMarkdown>
              </div>

              <!-- ===== STEP 2: Titles ===== -->
              <div v-else-if="step === 2" key="s2" class="flex-1 flex flex-col min-h-0">
                <OnboardingLoading
                  v-if="loading"
                  :text="t('teacher.classes.create.onboarding.thinking')"
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
                      @keydown.enter.prevent="
                        titleFeedback.trim() && regenerateTitlesWithFeedback()
                      "
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
                      <Button variant="outline" size="sm" @click="openTitleFeedback">{{
                        t('teacher.classes.create.onboarding.btn_change_something')
                      }}</Button>
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
              <!-- ===== STEP 3: Horario + Portada ===== -->
              <div v-else-if="step === 3" key="s3" class="flex-1 flex flex-col min-h-0">
                <div
                  class="grid flex-1 min-h-0 grid-cols-1 gap-6 overflow-y-auto pr-1 lg:grid-cols-2 lg:items-start"
                >
                  <!-- Horario -->
                  <div>
                    <h3
                      class="mb-3 text-xs font-semibold uppercase tracking-wide text-text-secondary"
                    >
                      {{ t('teacher.schedule.section_schedule') }}
                    </h3>
                    <ClassScheduleCalendar v-model="scheduleConfig" />
                  </div>

                  <!-- Portada -->
                  <div>
                    <h3
                      class="mb-3 text-xs font-semibold uppercase tracking-wide text-text-secondary"
                    >
                      {{ t('teacher.schedule.section_cover') }}
                    </h3>
                    <div class="flex flex-col items-center justify-center gap-3">
                      <div
                        v-if="isGeneratingImage && !generatedImageUrl"
                        class="w-full max-w-md flex flex-col items-center gap-3"
                      >
                        <div
                          class="w-full aspect-video rounded-2xl bg-gray-100 animate-pulse flex items-center justify-center"
                        >
                          <PhotoIcon class="w-12 h-12 text-gray-300" />
                        </div>
                        <SparklesIcon class="w-8 h-8 animate-pulse text-navy-700" />
                        <span class="text-lg font-semibold text-navy-700">{{
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
                        <!-- Acciones de la portada, justo bajo la imagen generada -->
                        <div
                          v-if="!showImageFeedback"
                          class="mt-3 flex flex-wrap justify-center gap-2"
                        >
                          <Button variant="outline" size="sm" @click="openImageFeedback">{{
                            t('teacher.classes.create.onboarding.btn_change_something')
                          }}</Button>
                          <Button variant="outline" size="sm" @click="coverFileRef?.click()">
                            <ArrowUpTrayIcon class="w-4 h-4 mr-1.5" />
                            {{ t('teacher.classes.create.onboarding.btn_upload_cover') }}
                          </Button>
                        </div>
                      </div>
                      <div
                        v-else-if="imageGenerationFailed"
                        class="flex flex-col items-center gap-4 text-text-secondary"
                      >
                        <PhotoIcon class="w-12 h-12 opacity-40" />
                        <p class="text-sm">
                          {{ t('teacher.classes.create.onboarding.cover_error') }}
                        </p>
                        <Button variant="outline" size="sm" @click="coverFileRef?.click()">
                          <ArrowUpTrayIcon class="w-4 h-4 mr-2" />
                          {{ t('teacher.classes.create.onboarding.btn_upload_cover') }}
                        </Button>
                      </div>
                    </div>
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
                  <Button variant="outline" size="sm" @click="step = 2">{{
                    t('teacher.classes.create.onboarding.btn_back')
                  }}</Button>
                  <Button variant="primary" size="sm" @click="step = 4">{{
                    t('teacher.classes.create.onboarding.btn_accept_plan')
                  }}</Button>
                </div>
                <div v-else-if="!isGeneratingImage && showImageFeedback" class="onb-actions">
                  <Button variant="outline" size="sm" @click="step = 2">{{
                    t('teacher.classes.create.onboarding.btn_back')
                  }}</Button>
                </div>
              </div>

              <!-- ===== STEP 5: Guide ===== -->
              <div v-else-if="step === 4" key="s4" class="flex-1 flex flex-col min-h-0">
                <EditableMarkdown
                  v-model="guideContent"
                  :god-name="god.name"
                  :god-avatar="god.avatar"
                  ai-placeholder="Ej: Añade criterios de evaluación, cambia el tono..."
                  context-label="Editando la guía del alumno"
                  ai-modal-hint="Dile a la IA qué quieres añadir o cambiar de la guía."
                  ai-system-context="El profesor está editando la GUÍA del alumno de su clase gamificada. Es el documento que explica a los alumnos cómo funciona la clase, sus normas y cómo progresar. Genera contenido claro, útil y bien estructurado."
                >
                  <template #default="{ edit }">
                    <div class="flex-1 onb-result-box overflow-y-auto min-h-0">
                      <OnboardingLoading
                        v-if="(waitingForFirstChunk || isGeneratingGuide) && !guideContent"
                        text="Generando guía del alumno..."
                        :show-bar="generationProgress > 0 || isOvertime"
                        :progress="generationProgress"
                        :is-overtime="isOvertime"
                        :remaining-label="remainingTimeLabel"
                      />
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
                      v-if="
                        !isGeneratingGuide && !isStreaming && guideContent && !showGuideFeedback
                      "
                      class="onb-actions"
                    >
                      <Button variant="outline" size="sm" @click="step = 3">{{
                        t('teacher.classes.create.onboarding.btn_back')
                      }}</Button>
                      <div class="flex gap-2">
                        <Button variant="outline" size="sm" @click="edit"
                          ><PencilSquareIcon class="w-4 h-4 mr-1.5" />Editar a mano</Button
                        >
                        <Button variant="outline" size="sm" @click="openGuideFeedback">
                          <SparklesIcon class="w-4 h-4 mr-1.5" />{{
                            t('teacher.classes.create.onboarding.btn_change_something')
                          }}
                        </Button>
                        <Button variant="outline" size="sm" @click="skipGuide">{{
                          t('teacher.classes.create.onboarding.btn_skip')
                        }}</Button>
                        <Button variant="primary" size="sm" @click="finishWizard()">{{
                          t('teacher.classes.create.onboarding.btn_accept_plan')
                        }}</Button>
                      </div>
                    </div>
                    <div v-else-if="!isGeneratingGuide && showGuideFeedback" class="onb-actions">
                      <Button variant="outline" size="sm" @click="step = 3">{{
                        t('teacher.classes.create.onboarding.btn_back')
                      }}</Button>
                    </div>
                  </template>
                </EditableMarkdown>
              </div>
            </Transition>
        </OnboardingCard>
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
  ExclamationTriangleIcon,
  SparklesIcon,
  PencilSquareIcon,
  PhotoIcon,
  XMarkIcon,
  CheckIcon,
  ClipboardDocumentIcon,
  PaperAirplaneIcon,
  BookOpenIcon,
  ArrowPathIcon,
  ArrowUpTrayIcon,
  DocumentTextIcon,
  DocumentIcon,
} from '@heroicons/vue/24/outline'
import { renderPageMarkdown } from '~/utils/markdown'
import {
  emptyScheduleConfig,
  scheduleSlotHasContent,
  type ScheduleConfig,
} from '~/types/schedule.types'
import {
  subjectsForLevel,
  CLASS_EDUCATION_LEVELS,
  CLASS_LANGUAGES,
  SPANISH_PROVINCES,
  CLASS_LANGUAGE_TO_LOCALE,
} from '~/utils/class-metadata'

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
    t('teacher.schedule.wizard_question'),
    'He preparado una guía para tus alumnos',
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

// Datos básicos de la clase que el profe configura antes de nada. El idioma
// vehicular manda el locale con el que la IA genera todo (narrativa, títulos,
// guía): si elige Català, la IA le habla en catalán en esta clase.
const meta = reactive({
  subject: '',
  educationLevel: '',
  language: 'Castellano',
  province: '',
})
const classLocale = computed(() => CLASS_LANGUAGE_TO_LOCALE[meta.language] || locale.value)

// Opciones de los selects. El idioma es obligatorio (manda la IA), el resto
// lleva un "sin especificar" delante para poder dejarlo vacío.
const noneOption = computed(() => ({
  value: '',
  label: t('teacher.classes.detail.settings.general.metadata_none'),
}))
const languageOptions = CLASS_LANGUAGES
// La asignatura depende del nivel: cada nivel tiene su propio catálogo.
const subjectOptions = computed(() => [noneOption.value, ...subjectsForLevel(meta.educationLevel)])
const educationLevelOptions = computed(() => [noneOption.value, ...CLASS_EDUCATION_LEVELS])

// Al cambiar el nivel, una asignatura del catálogo anterior deja de ser válida.
watch(
  () => meta.educationLevel,
  () => {
    if (meta.subject && !subjectsForLevel(meta.educationLevel).some(o => o.value === meta.subject)) {
      meta.subject = ''
    }
  }
)
const provinceOptions = computed(() => [noneOption.value, ...SPANISH_PROVINCES])

// Los metadatos son obligatorios para poder empezar a crear la clase.
const metaComplete = computed(
  () => !!meta.language && !!meta.subject && !!meta.educationLevel && !!meta.province
)
// Se activa al intentar avanzar sin completar los metadatos; pinta los selects vacíos en rojo.
const showMetaErrors = ref(false)

const idea = ref('')
const plan = ref('')
// Cuando la IA no consigue generar la narrativa (p. ej. rate limit), mostramos un
// estado de error con reintento en vez de volcar la idea como si fuera narrativa.
const planGenerationFailed = ref(false)
const titles = ref<string[]>([])
const selectedTitle = ref('')
const customTitle = ref('')
const chosenTitle = computed(() => customTitle.value.trim() || selectedTitle.value)
const scheduleConfig = ref<ScheduleConfig[]>([emptyScheduleConfig()])
// Texto legible derivado del patrón semanal (para el campo `schedule` y las tarjetas).
const { scheduleText: schedule } = useClassCalendar(scheduleConfig)
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
  // Texto extraído del fichero (lo devuelve el backend por fichero). Permite
  // reconstruir el contexto cuando el profe quita uno de la lista.
  text?: string
}
const docSources = ref<DocSource[]>([])
// El contexto que se envía a la IA se deriva de los archivos actuales, así al
// quitar uno desaparece también su texto sin tener que trocear un blob.
const docsContext = computed(() =>
  docSources.value
    .filter(s => s.text)
    .map(s => `### ${s.name}\n${s.text}`)
    .join('\n\n')
)
const extractingDocs = ref(false)
const materialsFileRef = ref<HTMLInputElement>()

function removeMaterial(index: number) {
  docSources.value = docSources.value.filter((_, i) => i !== index)
}

// Icono + color del cuadradito según el tipo de archivo (mismo criterio visual
// que los "documentos de apoyo" de las misiones).
function docIcon(kind: string) {
  if (kind === 'image') return PhotoIcon
  if (kind === 'word') return DocumentIcon
  return DocumentTextIcon // pdf, text y fallback
}
function docBg(kind: string) {
  const map: Record<string, string> = {
    pdf: 'bg-red-500',
    word: 'bg-blue-500',
    image: 'bg-green-500',
    text: 'bg-navy-700',
  }
  return map[kind] || 'bg-gray-400' // unsupported / desconocido
}

// Tope por archivo. Va por debajo del límite del proxy y del API (50MB) para
// que el profe vea un aviso claro en vez de un 413 opaco a mitad de subida.
// Estos materiales no se guardan en disco: se leen en memoria y solo se queda
// el texto extraído (8.000 caracteres por archivo), así que no compensa
// aceptar ficheros enormes.
const MAX_MATERIAL_MB = 15

async function handleMaterialsUpload(event: Event) {
  const input = event.target as HTMLInputElement
  const files = Array.from(input.files || [])
  input.value = ''
  if (!files.length) return
  const tooBig = files.find(f => f.size > MAX_MATERIAL_MB * 1024 * 1024)
  if (tooBig) {
    toast.error(
      t('teacher.classes.create.onboarding.attach_error_size', {
        name: tooBig.name,
        size: (tooBig.size / (1024 * 1024)).toFixed(1),
        max: MAX_MATERIAL_MB,
      })
    )
    return
  }
  extractingDocs.value = true
  try {
    const fd = new FormData()
    for (const f of files) fd.append('file', f)
    const config = useRuntimeConfig()
    const res = await $fetch<{ context: string; sources: DocSource[] }>(
      `${config.public.apiBase}/ai/extract-context`,
      { method: 'POST', body: fd }
    )
    docSources.value = [...docSources.value, ...res.sources]
  } catch (err: unknown) {
    // 413: el conjunto pasa del límite del proxy aunque cada archivo entre.
    const status = (err as { response?: { status?: number }; statusCode?: number })?.response
      ?.status ?? (err as { statusCode?: number })?.statusCode
    toast.error(
      status === 413
        ? t('teacher.classes.create.onboarding.attach_error_too_large', { max: MAX_MATERIAL_MB })
        : t('teacher.classes.create.onboarding.attach_error')
    )
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

// Metadatos legibles (asignatura y nivel) para que la IA sepa realmente de qué va
// la clase al sugerir títulos. El nivel es contexto, NO para meterlo en el nombre.
const metaContextLine = computed(() => {
  const subj = subjectOptions.value.find(o => o.value === meta.subject)?.label
  const lvl = educationLevelOptions.value.find(o => o.value === meta.educationLevel)?.label
  const parts: string[] = []
  if (meta.subject && subj) parts.push(`Asignatura: ${subj}`)
  if (meta.educationLevel && lvl) parts.push(`Nivel educativo: ${lvl}`)
  return parts.join(' | ')
})

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
  generationProgress,
  waitingForFirstChunk,
  isOvertime,
  remainingTimeLabel,
  fetchEstimate,
  startProgress,
  stopProgress,
} = useAIPrompt()

async function submitIdea() {
  if (!idea.value.trim() || loading.value) return
  // Metadatos obligatorios: si faltan, resaltamos en rojo los selects vacíos y no avanzamos.
  if (!metaComplete.value) {
    showMetaErrors.value = true
    return
  }
  step.value = 1
  plan.value = ''
  planGenerationFailed.value = false
  loading.value = true

  try {
    loading.value = false
    isStreaming.value = true
    await streamPrompt(
      'class.narrative.generate',
      { idea: ideaWithMaterials() },
      plan,
      classLocale.value
    )
    plan.value = cleanAIText(plan.value).slice(0, 8000)
  } catch {
    planGenerationFailed.value = true
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
      plan,
      classLocale.value
    )
    plan.value = cleanAIText(plan.value).slice(0, 8000)
  } catch {
    // Si la regeneración falla, no perdemos la narrativa que ya había.
    plan.value = previousPlan
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
          locale: classLocale.value,
          context: `${ctx}\nNarrativa: ${plan.value.slice(0, 500)}${
            metaContextLine.value ? `\n${metaContextLine.value}` : ''
          }`.slice(0, 1500),
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
          locale: classLocale.value,
          context: `${ctx}\nNarrativa: ${plan.value.slice(0, 500)}${
            metaContextLine.value ? `\n${metaContextLine.value}` : ''
          }`.slice(0, 1500),
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
  if (s === 3 && !generatedImageUrl.value) generateCover()
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
            body: { name: chosenTitle.value, description, locale: classLocale.value },
          }
        )
        rawImagePath.value = res.imageUrl
        generatedImageUrl.value = res.imageUrl
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
  if (s === 4 && !guideContent.value && !isGeneratingGuide.value) generateGuide()
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
      guideContent,
      classLocale.value
    )
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

// Manejadores de los botones del asistente. Se extraen a métodos (en vez de
// expresiones inline con varias sentencias) porque Prettier reformatea los
// @click multi-sentencia a varias líneas y el compilador de Vue 3.5 no los
// acepta. Con una sola llamada, ni Prettier los toca ni Vue los rechaza.
function backToStep0() {
  step.value = 0
  plan.value = ''
  showNarrativeFeedback.value = false
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

function openImageFeedback() {
  showImageFeedback.value = true
  nextTick(() => imageFeedbackRef.value?.focus())
}

function openGuideFeedback() {
  showGuideFeedback.value = true
  nextTick(() => guideFeedbackRef.value?.focus())
}

function skipGuide() {
  guideContent.value = ''
  finishWizard()
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
      subject: meta.subject || undefined,
      language: meta.language || undefined,
      educationLevel: meta.educationLevel || undefined,
      province: meta.province || undefined,
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
    // Guardar la configuración de horario si el profe la rellenó (no bloquea el alta).
    const filledSlots = scheduleConfig.value.filter(scheduleSlotHasContent)
    if (res.class.id && filledSlots.length) {
      try {
        await classesStore.updateClass(res.class.id, { scheduleConfig: filledSlots })
      } catch {
        /* schedule save failed silently - teacher can edit later */
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
/* Transición del modal de éxito (específica de esta página). El resto de estilos
   del onboarding (onb-*, animaciones de entrada, transición onb-fade entre pasos)
   viven en assets/css/tailwind.css y en OnboardingCard/OnboardingLoading. */
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
