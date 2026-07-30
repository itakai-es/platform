<template>
  <div>
    <!-- Loading State -->
    <div v-if="loading" class="space-y-6">
      <div class="bg-navy-700 -mx-4 md:-mx-6 -mt-4 md:-mt-6 px-4 md:px-6 pt-6 pb-6 mb-6">
        <div class="space-y-4">
          <Skeleton width="w-48" height="h-4" />
          <div class="flex items-start gap-3">
            <Skeleton width="w-12 sm:w-14" height="h-12 sm:h-14" custom-class="rounded-xl" />
            <div class="flex-1 space-y-2">
              <Skeleton width="w-64" height="h-8" />
              <Skeleton width="w-48" height="h-4" />
            </div>
          </div>
          <div class="flex gap-2">
            <Skeleton
              v-for="i in 3"
              :key="i"
              width="w-24"
              height="h-6"
              custom-class="rounded-full"
            />
          </div>
        </div>
      </div>
    </div>

    <!-- Error State -->
    <EmptyState
      v-else-if="error"
      :icon="ExclamationTriangleIcon"
      :title="t('teacher.components.mission_detail_template.error_title')"
      :description="error"
    >
      <template #action>
        <NuxtLink :to="backLink">
          <Button variant="primary">{{
            t('teacher.components.mission_detail_template.btn_back')
          }}</Button>
        </NuxtLink>
      </template>
    </EmptyState>

    <!-- Main Content -->
    <template v-else-if="mission">
      <!-- Mission Header -->
      <div
        class="relative overflow-hidden bg-navy-700 -mx-4 md:-mx-6 -mt-4 md:-mt-6 px-4 md:px-6 pt-6 mb-6"
        :class="showTabs ? 'pb-0' : 'pb-6'"
      >
        <!-- Imagen de portada a la derecha con degradado navy → transparente -->
        <div
          v-if="mission.backgroundImage"
          class="pointer-events-none absolute inset-y-0 right-0 hidden md:block md:w-1/2 lg:w-[45%]"
        >
          <div
            class="absolute inset-0 bg-cover bg-center"
            :style="{ backgroundImage: `url(${getImageUrl(mission.backgroundImage)})` }"
          />
          <div
            class="absolute inset-0 bg-gradient-to-r from-navy-700 via-navy-700/60 to-transparent"
          />
        </div>

        <div class="relative z-10 space-y-4">
          <!-- Breadcrumb + Status -->
          <nav class="flex items-center flex-wrap gap-x-1.5 gap-y-1 sm:gap-x-2 text-sm">
            <NuxtLink :to="dashboardLink" class="text-white/70 hover:text-white flex-shrink-0">
              <HomeIcon class="w-4 h-4" />
            </NuxtLink>
            <ChevronRightIcon class="w-4 h-4 text-white/70 flex-shrink-0 hidden sm:block" />
            <NuxtLink
              :to="classesLink"
              class="text-white/70 hover:text-white whitespace-nowrap hidden sm:inline"
            >
              {{ t('teacher.components.mission_detail_template.breadcrumb_classes') }}
            </NuxtLink>
            <ChevronRightIcon class="w-4 h-4 text-white/70 flex-shrink-0 hidden sm:block" />
            <NuxtLink
              :to="classDetailLink"
              class="text-white/70 hover:text-white whitespace-nowrap hidden sm:inline"
            >
              {{ mission.className }}
            </NuxtLink>
            <ChevronRightIcon class="w-4 h-4 text-white/70 flex-shrink-0" />
            <span class="text-white font-medium">{{ mission.title }}</span>
            <StatusBadge class="flex-shrink-0 ml-auto" :variant="statusVariant">{{
              statusLabel
            }}</StatusBadge>
          </nav>

          <!-- Título + fecha límite (edición en la pestaña Ajustes) -->
          <div class="min-w-0">
            <h1 class="text-xl sm:text-3xl lg:text-4xl font-bold text-white break-words">
              {{ mission.title }}
            </h1>
            <p
              class="text-white/70 mt-1 text-sm sm:text-base flex flex-wrap items-center gap-x-2 gap-y-1"
            >
              <span class="inline-flex items-center gap-1.5">
                <CalendarDaysIcon class="w-4 h-4 text-white/60" />
                <span v-if="mission.deadline">{{ formatDeadline(mission.deadline) }}</span>
                <span v-else class="italic text-white/50">{{
                  t('teacher.components.mission_detail_template.deadline_none')
                }}</span>
              </span>
              <span v-if="mission.unit" aria-hidden="true">&bull;</span>
              <span v-if="mission.unit">{{ mission.unit }}</span>
            </p>
          </div>

          <!-- Tags -->
          <div v-if="mission.tags?.length" class="flex flex-wrap gap-2">
            <span
              v-for="tag in mission.tags"
              :key="tag"
              class="px-3 py-1 bg-navy-800/80 text-white text-sm rounded-full"
            >
              {{ tag }}
            </span>
          </div>

          <!-- Pestañas (solo profesor): scroll horizontal con flechas a los lados -->
          <HeaderTabsNav
            v-if="showTabs"
            :tabs="tabs"
            :active-tab="activeTab"
            :tab-href="resolveTabHref"
          />
        </div>
      </div>

      <!-- Aviso de solo lectura para el alumno cuando la misión ha expirado -->
      <div
        v-if="!isTeacher && missionExpired"
        class="mb-6 flex items-center gap-2 rounded-2xl border border-yellow/30 bg-yellow/10 px-4 py-3 text-sm text-navy-700"
      >
        <ClockIcon class="w-5 h-5 flex-shrink-0 text-yellow-700" />
        <span>{{ t('teacher.components.mission_detail_template.expired_readonly') }}</span>
      </div>

      <!-- Contenido de otras pestañas (p. ej. Ajustes) -->
      <div v-if="showTabs && activeTab !== 'resumen'">
        <slot name="tab" :active-tab="activeTab" />
      </div>

      <!-- Two Column Layout (pestaña Resumen) -->
      <div v-else class="grid grid-cols-1 xl:grid-cols-3 gap-4 xl:gap-6">
        <!-- Left Column (2/3): Main content -->
        <div class="xl:col-span-2 space-y-4 xl:space-y-6">
          <!-- Historia de la Mision - Purple theme -->
          <article
            class="rounded-2xl p-4 sm:p-6 shadow-lg"
            :style="{
              backgroundColor: 'var(--color-section-purple)',
              borderLeft: 'var(--card-accent-left) solid var(--color-card-accent)',
            }"
          >
            <div class="flex flex-wrap items-center justify-between gap-2 mb-4">
              <div class="flex items-center gap-2 min-w-0">
                <BookOpenIcon
                  class="w-5 h-5 sm:w-6 sm:h-6 flex-shrink-0"
                  :style="{ color: 'var(--color-section-heading)' }"
                />
                <h2
                  class="text-lg sm:text-2xl font-extrabold"
                  :style="{ color: 'var(--color-section-heading)' }"
                >
                  {{ t('teacher.components.mission_detail_template.narrative_title') }}
                </h2>
              </div>
              <!-- Teacher: Edit controls -->
              <Button
                v-if="isTeacher"
                variant="primary"
                size="sm"
                :icon-left="PencilIcon"
                @click="emit('editNarrative')"
              >
                {{ t('teacher.components.mission_detail_template.btn_edit') }}
              </Button>
            </div>

            <!-- Narrative box -->
            <div class="bg-white rounded-xl p-5">
              <div class="flex items-center gap-2 mb-4">
                <div class="w-8 h-8 rounded-full overflow-hidden flex-shrink-0 bg-[#4ECDC4]">
                  <img
                    :src="assistantGod.avatar"
                    :alt="assistantGod.name"
                    class="w-full h-full object-contain"
                  />
                </div>
                <p class="font-semibold text-navy-700 text-sm">{{ assistantGod.name }}</p>
              </div>
              <div class="relative">
                <div
                  ref="narrativeContentRef"
                  class="md-rendered transition-[max-height] duration-500 ease-in-out"
                  :class="narrativeClamped ? 'overflow-hidden' : ''"
                  :style="narrativeContentStyle"
                  v-html="renderPageMarkdown(narrativeText)"
                />
                <!-- Fade overlay when collapsed -->
                <Transition
                  enter-active-class="transition-opacity duration-300 ease-out"
                  leave-active-class="transition-opacity duration-300 ease-in"
                  enter-from-class="opacity-0"
                  leave-to-class="opacity-0"
                >
                  <div
                    v-if="narrativeClamped"
                    class="pointer-events-none absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-white to-transparent rounded-b-xl"
                  />
                </Transition>
              </div>
              <!-- Ver más / Ver menos -->
              <button
                v-if="narrativeOverflows"
                type="button"
                class="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-navy-700 hover:opacity-70 transition-opacity"
                @click="narrativeExpanded = !narrativeExpanded"
              >
                {{
                  narrativeExpanded
                    ? t('teacher.components.mission_detail_template.btn_see_less')
                    : t('teacher.components.mission_detail_template.btn_see_more')
                }}
                <ChevronDownIcon
                  class="w-4 h-4 transition-transform"
                  :class="narrativeExpanded ? 'rotate-180' : ''"
                />
              </button>
            </div>
          </article>

          <!-- Enigmas Section - Green theme -->
          <article
            class="rounded-2xl p-4 sm:p-6 shadow-lg"
            :style="{
              backgroundColor: 'var(--color-section-enigmas)',
              borderLeft: 'var(--card-accent-left) solid var(--color-card-accent)',
            }"
          >
            <div class="flex flex-wrap items-center justify-between gap-2 mb-4">
              <div class="flex items-center gap-2 min-w-0">
                <MapIcon
                  class="w-5 h-5 sm:w-6 sm:h-6 flex-shrink-0"
                  :style="{ color: 'var(--color-section-heading)' }"
                />
                <h2
                  class="text-lg sm:text-2xl font-extrabold"
                  :style="{ color: 'var(--color-section-heading)' }"
                >
                  {{ t('teacher.components.mission_detail_template.enigmas_title') }}
                </h2>
              </div>
              <!-- Teacher: Add control -->
              <div v-if="isTeacher" class="flex items-center gap-2">
                <Button
                  variant="primary"
                  size="sm"
                  :icon-left="PlusIcon"
                  @click="emit('addEnigma')"
                >
                  {{ t('teacher.components.mission_detail_template.btn_add') }}
                </Button>
              </div>
            </div>

            <!-- Enigmas list -->
            <div class="space-y-6">
              <!-- Draggable list for teachers (always active, handle appears on hover) -->
              <draggable
                v-if="isTeacher"
                v-model="localEnigmas"
                item-key="id"
                handle=".drag-handle-enigma"
                :animation="200"
                ghost-class="opacity-50"
                :scroll="true"
                :scroll-sensitivity="150"
                :scroll-speed="20"
                :force-fallback="true"
                fallback-class="dragging-card"
                class="space-y-6"
                @end="onEnigmaReorderAndSave"
              >
                <template #item="{ element: enigma, index }">
                  <div class="bg-white rounded-xl p-4 cursor-default group relative">
                    <!-- Mobile/Tablet layout -->
                    <div class="flex 2xl:hidden items-center justify-between mb-3">
                      <!-- Left: drag handle + number -->
                      <div class="flex items-center gap-2">
                        <!-- Mobile/Tablet drag handle (always visible) -->
                        <div
                          class="drag-handle-enigma flex items-center justify-center w-6 h-10 cursor-grab active:cursor-grabbing text-gray-400 hover:text-gray-600 flex-shrink-0 -ml-1"
                        >
                          <svg class="w-4 h-4" viewBox="0 0 16 16" fill="currentColor">
                            <circle cx="5" cy="4" r="1.5" />
                            <circle cx="11" cy="4" r="1.5" />
                            <circle cx="5" cy="8" r="1.5" />
                            <circle cx="11" cy="8" r="1.5" />
                            <circle cx="5" cy="12" r="1.5" />
                            <circle cx="11" cy="12" r="1.5" />
                          </svg>
                        </div>
                        <div
                          class="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
                          :class="getEnigmaIconClass(enigma, index)"
                        >
                          <span class="text-white font-bold text-sm">{{ index + 1 }}</span>
                        </div>
                      </div>
                      <!-- Mobile actions dropdown -->
                      <div class="relative">
                        <button
                          type="button"
                          class="p-2 rounded-lg hover:bg-gray-100 transition-colors"
                          @click="toggleEnigmaDropdown(enigma.id)"
                        >
                          <EllipsisVerticalIcon class="w-5 h-5 text-navy-700" />
                        </button>
                        <Transition name="dropdown">
                          <div
                            v-if="openEnigmaDropdown === enigma.id"
                            class="absolute right-0 top-full mt-1 w-48 bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden z-50"
                          >
                            <button
                              type="button"
                              class="flex items-center gap-3 w-full px-4 py-3 text-sm text-navy-700 hover:bg-gray-50 transition-colors"
                              @click="editEnigmaAction(enigma)"
                            >
                              <PencilIcon class="w-5 h-5" />
                              {{ t('teacher.components.mission_detail_template.btn_edit') }}
                            </button>
                            <button
                              type="button"
                              class="flex items-center gap-3 w-full px-4 py-3 text-sm text-navy-700 hover:bg-gray-50 transition-colors"
                              @click="viewSubmissionsAction(enigma)"
                            >
                              <UserGroupIcon class="w-5 h-5" />
                              {{
                                t(
                                  'teacher.components.mission_detail_template.btn_view_submissions',
                                  { count: enigma.submissionsCount || 0 }
                                )
                              }}
                            </button>
                            <button
                              type="button"
                              class="flex items-center gap-3 w-full px-4 py-3 text-sm text-red-500 hover:bg-red-50 transition-colors"
                              @click="deleteEnigmaAction(enigma.id)"
                            >
                              <TrashIcon class="w-5 h-5" />
                              {{ t('teacher.missions.detail.delete_confirm_btn') }}
                            </button>
                          </div>
                        </Transition>
                      </div>
                    </div>
                    <!-- Mobile/Tablet content -->
                    <div class="2xl:hidden">
                      <div class="flex flex-wrap items-center gap-2 mb-2">
                        <span
                          class="inline-flex items-center gap-3 text-sm font-semibold text-navy-700 flex-shrink-0"
                        >
                          <Tooltip v-if="classCfg.xp" :text="t('common.resources.xp')">
                            <span class="inline-flex items-center gap-1">
                              <XpIcon class="w-5 h-5" />{{ enigma.xp }}
                            </span>
                          </Tooltip>
                          <Tooltip v-if="classCfg.coins" :text="t('common.resources.coins')">
                            <span class="inline-flex items-center gap-1">
                              <CoinIcon class="w-5 h-5" />{{ enigmaCoins(enigma) }}
                            </span>
                          </Tooltip>
                          <Tooltip
                            v-if="enigmaMana(enigma) && classCfg.mana"
                            :text="t('common.resources.mana')"
                          >
                            <span class="inline-flex items-center gap-1">
                              <ManaIcon class="w-5 h-5" />{{ enigmaMana(enigma) }}
                            </span>
                          </Tooltip>
                        </span>
                        <h4 class="font-semibold text-navy-700">{{ enigma.title }}</h4>
                        <span
                          v-if="enigma.isOptional"
                          class="px-2 py-0.5 text-xs font-medium rounded-full bg-gray-100 text-gray-500 flex-shrink-0"
                        >
                          {{ t('teacher.components.mission_detail_template.optional_label') }}
                        </span>
                      </div>
                      <p class="text-sm text-navy-700/80">{{ enigma.description }}</p>
                      <div v-if="enigma.objectives && enigma.objectives.length > 0" class="mt-3">
                        <p class="text-sm font-semibold text-navy-700 mb-2">
                          {{ t('teacher.components.mission_detail_template.objectives_label') }}
                        </p>
                        <ul class="space-y-1">
                          <li
                            v-for="(objective, objIndex) in enigma.objectives"
                            :key="objIndex"
                            class="text-sm text-navy-700/80 flex items-start gap-2"
                          >
                            <span class="text-navy-700">•</span>
                            {{ objective }}
                          </li>
                        </ul>
                      </div>
                    </div>

                    <!-- Desktop layout -->
                    <div class="hidden 2xl:flex items-center gap-3">
                      <!-- Number circle / Drag handle swap container -->
                      <div class="relative w-10 h-10 flex-shrink-0">
                        <!-- Number (hidden on hover) -->
                        <div
                          class="absolute inset-0 rounded-full flex items-center justify-center transition-all duration-200 ease-out group-hover:opacity-0 group-hover:scale-90 group-hover:pointer-events-none"
                          :class="getEnigmaIconClass(enigma, index)"
                        >
                          <span class="text-white font-bold text-sm">{{ index + 1 }}</span>
                        </div>
                        <!-- Drag handle (visible on hover) -->
                        <div
                          class="drag-handle-enigma absolute inset-0 rounded-full flex items-center justify-center cursor-grab active:cursor-grabbing text-gray-400 hover:text-gray-600 opacity-0 scale-110 group-hover:opacity-100 group-hover:scale-100 transition-all duration-200 ease-out pointer-events-none group-hover:pointer-events-auto"
                        >
                          <svg class="w-4 h-4" viewBox="0 0 16 16" fill="currentColor">
                            <circle cx="5" cy="4" r="1.5" />
                            <circle cx="11" cy="4" r="1.5" />
                            <circle cx="5" cy="8" r="1.5" />
                            <circle cx="11" cy="8" r="1.5" />
                            <circle cx="5" cy="12" r="1.5" />
                            <circle cx="11" cy="12" r="1.5" />
                          </svg>
                        </div>
                      </div>

                      <!-- Enigma content -->
                      <div class="flex-1 min-w-0">
                        <div class="flex items-center justify-between gap-2">
                          <div class="flex flex-wrap items-center gap-2">
                            <h4 class="font-semibold text-navy-700">{{ enigma.title }}</h4>
                            <span
                              class="inline-flex items-center gap-3 text-sm font-semibold text-navy-700 flex-shrink-0"
                            >
                              <Tooltip v-if="classCfg.xp" :text="t('common.resources.xp')">
                                <span class="inline-flex items-center gap-1">
                                  <XpIcon class="w-5 h-5" />{{ enigma.xp }}
                                </span>
                              </Tooltip>
                              <Tooltip v-if="classCfg.coins" :text="t('common.resources.coins')">
                                <span class="inline-flex items-center gap-1">
                                  <CoinIcon class="w-5 h-5" />{{ enigmaCoins(enigma) }}
                                </span>
                              </Tooltip>
                              <Tooltip
                                v-if="enigmaMana(enigma) && classCfg.mana"
                                :text="t('common.resources.mana')"
                              >
                                <span class="inline-flex items-center gap-1">
                                  <ManaIcon class="w-5 h-5" />{{ enigmaMana(enigma) }}
                                </span>
                              </Tooltip>
                            </span>
                            <span
                              v-if="enigma.isOptional"
                              class="px-2 py-0.5 text-xs font-medium rounded-full bg-gray-100 text-gray-500 flex-shrink-0"
                            >
                              {{ t('teacher.components.mission_detail_template.optional_label') }}
                            </span>
                          </div>
                          <!-- Ver entregas (siempre visible) -->
                          <div class="flex-shrink-0">
                            <Button
                              variant="primary"
                              size="sm"
                              :icon-left="UserGroupIcon"
                              class="whitespace-nowrap"
                              @click="emit('viewSubmissions', enigma)"
                            >
                              {{
                                t(
                                  'teacher.components.mission_detail_template.btn_view_submissions',
                                  { count: enigma.submissionsCount || 0 }
                                )
                              }}
                            </Button>
                          </div>
                        </div>
                        <p class="text-sm mt-2 text-navy-700/80">{{ enigma.description }}</p>
                        <div v-if="enigma.objectives && enigma.objectives.length > 0" class="mt-3">
                          <p class="text-sm font-semibold text-navy-700 mb-2">
                            {{ t('teacher.components.mission_detail_template.objectives_label') }}
                          </p>
                          <ul class="space-y-1">
                            <li
                              v-for="(objective, objIndex) in enigma.objectives"
                              :key="objIndex"
                              class="text-sm text-navy-700/80 flex items-start gap-2"
                            >
                              <span class="text-navy-700">•</span>
                              {{ objective }}
                            </li>
                          </ul>
                        </div>
                        <!-- Editar / Eliminar -->
                        <div
                          class="flex items-center justify-end gap-2 mt-3 pt-3 border-t border-gray-100"
                        >
                          <Button
                            variant="outline"
                            size="sm"
                            :icon-left="PencilIcon"
                            @click="emit('editEnigma', enigma)"
                          >
                            {{ t('teacher.components.mission_detail_template.btn_edit') }}
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            :icon-left="TrashIcon"
                            @click="emit('deleteEnigma', enigma.id)"
                          >
                            {{ t('teacher.missions.detail.delete_confirm_btn') }}
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                </template>
              </draggable>

              <!-- Regular list for students only -->
              <template v-else>
                <div
                  v-for="(enigma, index) in enigmas"
                  :key="enigma.id"
                  class="rounded-xl p-4"
                  :class="
                    enigma.status === 'completado'
                      ? 'bg-gray-100 border-l-4 border-navy-700'
                      : 'bg-white'
                  "
                >
                  <div class="flex items-center gap-3">
                    <!-- Enigma number (check when completed) -->
                    <div
                      class="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 bg-navy-700"
                    >
                      <CheckIcon v-if="enigma.status === 'completado'" class="w-5 h-5 text-white" />
                      <span v-else class="text-white font-bold text-sm">{{ index + 1 }}</span>
                    </div>

                    <!-- Enigma content -->
                    <div class="flex-1 min-w-0">
                      <div class="flex items-center justify-between gap-2">
                        <div class="flex items-center gap-2 min-w-0">
                          <h4
                            class="font-semibold truncate"
                            :class="
                              enigma.status === 'completado'
                                ? 'text-navy-700/60 line-through'
                                : 'text-navy-700'
                            "
                          >
                            {{ enigma.title }}
                          </h4>
                          <!-- Recompensas (XP parcial si se completó con menos del 100%) -->
                          <span
                            class="inline-flex items-center gap-3 text-sm font-semibold flex-shrink-0 text-navy-700"
                          >
                            <Tooltip v-if="classCfg.xp" :text="t('common.resources.xp')">
                              <span class="inline-flex items-center gap-1">
                                <XpIcon class="w-5 h-5" />
                                <template
                                  v-if="
                                    enigma.status === 'completado' &&
                                    enigma.earnedXp !== undefined &&
                                    enigma.earnedXp < enigma.xp
                                  "
                                >
                                  <span class="font-bold">{{ enigma.earnedXp }}</span>
                                  <span class="opacity-60">/{{ enigma.xp }}</span>
                                </template>
                                <template v-else>{{ enigma.xp }}</template>
                              </span>
                            </Tooltip>
                            <Tooltip v-if="classCfg.coins" :text="t('common.resources.coins')">
                              <span class="inline-flex items-center gap-1">
                                <CoinIcon class="w-5 h-5" />
                                <template
                                  v-if="
                                    enigma.status === 'completado' &&
                                    enigma.earnedCoins !== undefined &&
                                    enigma.earnedCoins < enigmaCoins(enigma)
                                  "
                                >
                                  <span class="font-bold">{{ enigma.earnedCoins }}</span>
                                  <span class="opacity-60">/{{ enigmaCoins(enigma) }}</span>
                                </template>
                                <template v-else>{{ enigmaCoins(enigma) }}</template>
                              </span>
                            </Tooltip>
                            <Tooltip
                              v-if="enigmaMana(enigma) && classCfg.mana"
                              :text="t('common.resources.mana')"
                            >
                              <span class="inline-flex items-center gap-1">
                                <ManaIcon class="w-5 h-5" />
                                <template
                                  v-if="
                                    enigma.status === 'completado' &&
                                    enigma.earnedMana !== undefined &&
                                    enigma.earnedMana < enigmaMana(enigma)
                                  "
                                >
                                  <span class="font-bold">{{ enigma.earnedMana }}</span>
                                  <span class="opacity-60">/{{ enigmaMana(enigma) }}</span>
                                </template>
                                <template v-else>{{ enigmaMana(enigma) }}</template>
                              </span>
                            </Tooltip>
                          </span>
                          <span
                            v-if="enigma.isOptional"
                            class="px-2 py-0.5 text-xs font-medium rounded-full bg-gray-100 text-gray-500 flex-shrink-0"
                          >
                            {{ t('teacher.components.mission_detail_template.optional_label') }}
                          </span>
                        </div>
                        <!-- Actions area -->
                        <div class="flex items-center gap-2 flex-shrink-0">
                          <!-- Submit button when the enigma is still available (una
                               misión expirada es solo lectura: sin botón de entrega). -->
                          <Button
                            v-if="enigma.status === 'disponible' && !missionExpired"
                            variant="primary"
                            size="sm"
                            :icon-left="ArrowUpTrayIcon"
                            @click="emit('uploadSubmission', enigma.id)"
                          >
                            {{ t('teacher.components.mission_detail_template.btn_submit') }}
                          </Button>
                          <Tooltip
                            v-else-if="enigma.status === 'pendiente'"
                            :text="getEnigmaStatusLabel(enigma.status)"
                          >
                            <component
                              :is="getEnigmaStatusIcon(enigma.status)"
                              class="w-6 h-6"
                              :class="getEnigmaStatusIconClass(enigma.status)"
                            />
                          </Tooltip>
                        </div>
                      </div>
                      <p class="text-sm mt-2 text-navy-700/80">
                        {{ enigma.description }}
                      </p>
                      <div v-if="enigma.objectives && enigma.objectives.length > 0" class="mt-3">
                        <p class="text-sm font-semibold text-navy-700 mb-2">
                          {{ t('teacher.components.mission_detail_template.objectives_label') }}
                        </p>
                        <ul class="space-y-1">
                          <li
                            v-for="(objective, objIndex) in enigma.objectives"
                            :key="objIndex"
                            class="text-sm text-navy-700/80 flex items-start gap-2"
                          >
                            <span class="text-navy-700">•</span>
                            {{ objective }}
                          </li>
                        </ul>
                      </div>
                    </div>
                  </div>
                </div>
              </template>

              <!-- Empty state -->
              <div v-if="enigmas.length === 0" class="bg-white rounded-xl p-8 text-center">
                <PuzzlePieceIcon class="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p class="text-gray-500">
                  {{ t('teacher.components.mission_detail_template.no_enigmas') }}
                </p>
                <Button
                  v-if="isTeacher"
                  variant="primary"
                  size="sm"
                  class="mt-4"
                  :icon-left="PlusIcon"
                  @click="emit('addEnigma')"
                >
                  {{ t('teacher.components.mission_detail_template.btn_add_first_enigma') }}
                </Button>
              </div>
            </div>
          </article>

          <!-- Documentos de Apoyo - Purple theme -->
          <article
            id="documentos-apoyo"
            class="rounded-2xl p-4 sm:p-6 shadow-lg scroll-mt-4"
            :style="{
              backgroundColor: 'var(--color-section-purple)',
              borderLeft: 'var(--card-accent-left) solid var(--color-card-accent)',
            }"
          >
            <div class="flex flex-wrap items-center justify-between gap-2 mb-4">
              <div class="flex items-center gap-2 min-w-0">
                <DocumentTextIcon
                  class="w-5 h-5 sm:w-6 sm:h-6 flex-shrink-0"
                  :style="{ color: 'var(--color-section-heading)' }"
                />
                <h2
                  class="text-lg sm:text-2xl font-extrabold"
                  :style="{ color: 'var(--color-section-heading)' }"
                >
                  {{ t('teacher.components.mission_detail_template.documents_title') }}
                </h2>
              </div>
              <!-- Teacher: Add control -->
              <div v-if="isTeacher" class="flex items-center gap-2">
                <Button
                  variant="primary"
                  size="sm"
                  :icon-left="PlusIcon"
                  @click="emit('addDocument')"
                >
                  {{ t('teacher.components.mission_detail_template.btn_add') }}
                </Button>
              </div>
            </div>

            <div class="space-y-6">
              <!-- Draggable list for teachers (always active, handle appears on hover) -->
              <draggable
                v-if="isTeacher"
                v-model="localDocuments"
                item-key="id"
                handle=".drag-handle-doc"
                :animation="200"
                ghost-class="opacity-50"
                :scroll="true"
                :scroll-sensitivity="150"
                :scroll-speed="20"
                :force-fallback="true"
                fallback-class="dragging-card"
                class="space-y-6"
                @end="onDocumentReorderAndSave"
              >
                <template #item="{ element: doc }">
                  <div class="bg-white rounded-xl p-4 cursor-default group relative">
                    <div class="flex items-center gap-3">
                      <!-- Mobile/Tablet drag handle (always visible) -->
                      <div
                        class="drag-handle-doc 2xl:hidden flex items-center justify-center w-6 h-10 cursor-grab active:cursor-grabbing text-gray-400 hover:text-gray-600 flex-shrink-0 -ml-1"
                      >
                        <svg class="w-4 h-4" viewBox="0 0 16 16" fill="currentColor">
                          <circle cx="5" cy="4" r="1.5" />
                          <circle cx="11" cy="4" r="1.5" />
                          <circle cx="5" cy="8" r="1.5" />
                          <circle cx="11" cy="8" r="1.5" />
                          <circle cx="5" cy="12" r="1.5" />
                          <circle cx="11" cy="12" r="1.5" />
                        </svg>
                      </div>

                      <!-- Document icon / Drag handle swap container -->
                      <div class="relative w-10 h-10 flex-shrink-0">
                        <!-- Document icon (hidden on hover in desktop) -->
                        <div
                          class="absolute inset-0 rounded-xl flex items-center justify-center transition-all duration-200 ease-out 2xl:group-hover:opacity-0 2xl:group-hover:scale-90 2xl:group-hover:pointer-events-none"
                          :class="getDocumentIconBg(doc.type)"
                        >
                          <component :is="getDocumentIcon(doc.type)" class="w-5 h-5 text-white" />
                        </div>
                        <!-- Desktop drag handle (visible on hover) -->
                        <div
                          class="drag-handle-doc absolute inset-0 rounded-xl hidden 2xl:flex items-center justify-center cursor-grab active:cursor-grabbing text-gray-400 hover:text-gray-600 opacity-0 scale-110 group-hover:opacity-100 group-hover:scale-100 transition-all duration-200 ease-out pointer-events-none group-hover:pointer-events-auto"
                        >
                          <svg class="w-4 h-4" viewBox="0 0 16 16" fill="currentColor">
                            <circle cx="5" cy="4" r="1.5" />
                            <circle cx="11" cy="4" r="1.5" />
                            <circle cx="5" cy="8" r="1.5" />
                            <circle cx="11" cy="8" r="1.5" />
                            <circle cx="5" cy="12" r="1.5" />
                            <circle cx="11" cy="12" r="1.5" />
                          </svg>
                        </div>
                      </div>

                      <!-- Document content -->
                      <div class="flex-1 min-w-0">
                        <div class="flex items-start justify-between gap-3">
                          <div>
                            <h4 class="font-semibold text-navy-700">{{ doc.title }}</h4>
                            <p class="text-xs text-navy-700/70 mt-0.5">
                              {{ doc.format }} &bull; {{ doc.metadata }}
                            </p>
                          </div>
                          <!-- Desktop: Hover buttons -->
                          <div
                            class="hidden 2xl:flex items-center gap-2 opacity-0 translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-200 ease-out pointer-events-none group-hover:pointer-events-auto"
                          >
                            <Button
                              variant="primary"
                              size="sm"
                              :icon-left="PencilIcon"
                              class="whitespace-nowrap"
                              @click="emit('editDocument', doc)"
                            >
                              {{ t('teacher.components.mission_detail_template.btn_edit') }}
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              :icon-left="TrashIcon"
                              class="whitespace-nowrap"
                              @click="emit('deleteDocument', doc.id)"
                            >
                              {{ t('teacher.missions.detail.delete_confirm_btn') }}
                            </Button>
                          </div>
                          <!-- Mobile/Tablet: Actions dropdown -->
                          <div class="relative 2xl:hidden">
                            <button
                              type="button"
                              class="p-2 rounded-lg hover:bg-gray-100 transition-colors"
                              @click="toggleDocumentDropdown(doc.id)"
                            >
                              <EllipsisVerticalIcon class="w-5 h-5 text-navy-700" />
                            </button>
                            <Transition name="dropdown">
                              <div
                                v-if="openDocumentDropdown === doc.id"
                                class="absolute right-0 top-full mt-1 w-48 bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden z-50"
                              >
                                <button
                                  type="button"
                                  class="flex items-center gap-3 w-full px-4 py-3 text-sm text-navy-700 hover:bg-gray-50 transition-colors"
                                  @click="editDocumentAction(doc)"
                                >
                                  <PencilIcon class="w-5 h-5" />
                                  {{ t('teacher.components.mission_detail_template.btn_edit') }}
                                </button>
                                <button
                                  type="button"
                                  class="flex items-center gap-3 w-full px-4 py-3 text-sm text-red-500 hover:bg-red-50 transition-colors"
                                  @click="deleteDocumentAction(doc.id)"
                                >
                                  <TrashIcon class="w-5 h-5" />
                                  {{ t('teacher.missions.detail.delete_confirm_btn') }}
                                </button>
                              </div>
                            </Transition>
                          </div>
                        </div>
                        <p class="text-sm text-navy-700/80 mt-2">{{ doc.description }}</p>

                        <!-- Tags as chips -->
                        <div v-if="doc.tags?.length" class="flex flex-wrap gap-1.5 mt-3">
                          <span
                            v-for="tag in doc.tags"
                            :key="tag"
                            class="inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full"
                            :class="getDocumentTagClasses(doc.type)"
                          >
                            {{ tag }}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </template>
              </draggable>

              <!-- Regular list for students only -->
              <template v-else>
                <div v-for="doc in supportDocuments" :key="doc.id" class="bg-white rounded-xl p-4">
                  <div class="flex items-start gap-3">
                    <!-- Document icon -->
                    <div
                      class="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                      :class="getDocumentIconBg(doc.type)"
                    >
                      <component :is="getDocumentIcon(doc.type)" class="w-5 h-5 text-white" />
                    </div>

                    <!-- Document content -->
                    <div class="flex-1 min-w-0">
                      <div class="flex items-start justify-between gap-3">
                        <div>
                          <h4 class="font-semibold text-navy-700">{{ doc.title }}</h4>
                          <p class="text-xs text-navy-700/70 mt-0.5">
                            {{ doc.format }} &bull; {{ doc.metadata }}
                          </p>
                        </div>
                        <!-- Teacher: Actions -->
                        <template v-if="isTeacher">
                          <!-- Desktop: Hover buttons -->
                          <div
                            class="hidden 2xl:flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <Button
                              variant="primary"
                              size="sm"
                              :icon-left="PencilIcon"
                              class="whitespace-nowrap"
                              @click="emit('editDocument', doc)"
                            >
                              {{ t('teacher.components.mission_detail_template.btn_edit') }}
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              :icon-left="TrashIcon"
                              class="whitespace-nowrap"
                              @click="emit('deleteDocument', doc.id)"
                            >
                              {{ t('teacher.missions.detail.delete_confirm_btn') }}
                            </Button>
                          </div>
                          <!-- Mobile/Tablet: Actions dropdown -->
                          <div class="relative 2xl:hidden">
                            <button
                              type="button"
                              class="p-2 rounded-lg hover:bg-gray-100 transition-colors"
                              @click="toggleDocumentDropdown(doc.id)"
                            >
                              <EllipsisVerticalIcon class="w-5 h-5 text-navy-700" />
                            </button>
                            <!-- Dropdown menu -->
                            <Transition name="dropdown">
                              <div
                                v-if="openDocumentDropdown === doc.id"
                                class="absolute right-0 top-full mt-1 w-48 bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden z-50"
                              >
                                <button
                                  type="button"
                                  class="flex items-center gap-3 w-full px-4 py-3 text-sm text-navy-700 hover:bg-gray-50 transition-colors"
                                  @click="editDocumentAction(doc)"
                                >
                                  <PencilIcon class="w-5 h-5" />
                                  {{ t('teacher.components.mission_detail_template.btn_edit') }}
                                </button>
                                <button
                                  type="button"
                                  class="flex items-center gap-3 w-full px-4 py-3 text-sm text-red-500 hover:bg-red-50 transition-colors"
                                  @click="deleteDocumentAction(doc.id)"
                                >
                                  <TrashIcon class="w-5 h-5" />
                                  {{ t('teacher.missions.detail.delete_confirm_btn') }}
                                </button>
                              </div>
                            </Transition>
                          </div>
                        </template>
                        <!-- Student: Action button -->
                        <button
                          v-else
                          class="w-10 h-10 rounded-xl bg-navy-700 hover:bg-navy-800 flex items-center justify-center flex-shrink-0 transition-colors shadow-md"
                          :title="
                            doc.type === 'link'
                              ? t('student.mission_detail.documents.action_open_link')
                              : doc.type === 'video'
                                ? t('student.mission_detail.documents.action_play_video')
                                : t('student.mission_detail.documents.action_download')
                          "
                          @click="handleDocumentAction(doc)"
                        >
                          <component
                            :is="
                              doc.type === 'link'
                                ? ArrowTopRightOnSquareIcon
                                : doc.type === 'video'
                                  ? PlayCircleIcon
                                  : ArrowDownTrayIcon
                            "
                            class="w-5 h-5 text-white"
                          />
                        </button>
                      </div>
                      <p class="text-sm text-navy-700/80 mt-2">{{ doc.description }}</p>

                      <!-- Tags as chips -->
                      <div v-if="doc.tags?.length" class="flex flex-wrap gap-1.5 mt-3">
                        <span
                          v-for="tag in doc.tags"
                          :key="tag"
                          class="inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full"
                          :class="getDocumentTagClasses(doc.type)"
                        >
                          {{ tag }}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </template>

              <!-- Empty state -->
              <div v-if="supportDocuments.length === 0" class="bg-white rounded-xl p-8 text-center">
                <DocumentTextIcon class="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p class="text-gray-500">
                  {{ t('teacher.components.mission_detail_template.no_documents') }}
                </p>
              </div>
            </div>
          </article>
        </div>

        <!-- Right Column (1/3): Sidebar widgets -->
        <div class="space-y-4 xl:space-y-6">
          <!-- Student: AI Assistant Card -->
          <AIAssistantCard
            v-if="!isTeacher"
            :message="t('student.mission_detail.atenea.message', { mission_title: mission.title })"
            :actions="missionAIActions"
            @action="handleMissionAIAction"
          />

          <!-- Progress Card - Purple theme (Teacher only) -->
          <Card v-if="isTeacher" type="stats">
            <CardHeader
              :title="t('teacher.components.mission_detail_template.global_progress')"
              :icon="ChartBarIcon"
              title-tag="h3"
            />
            <CardItem layout="column" centered>
              <p class="text-7xl font-bold text-navy-700">{{ missionStats.avgProgress }}%</p>
              <p class="text-sm text-navy-700/80 mt-2">
                {{ t('teacher.components.mission_detail_template.class_average') }}
              </p>
            </CardItem>
          </Card>

          <!-- Rewards Card - Purple theme -->
          <Card type="stats">
            <CardHeader
              :title="t('teacher.components.mission_detail_template.rewards_title')"
              :icon="GiftIcon"
              title-tag="h3"
            />
            <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2 gap-4">
              <!-- Enigma XP Card -->
              <div
                v-if="classCfg.xp"
                class="bg-white rounded-2xl p-4 shadow-sm flex flex-col items-center justify-center text-center"
              >
                <div
                  class="w-24 h-24 rounded-full flex items-center justify-center mb-3"
                  :class="[
                    !isTeacher && xpProgressPercent < 100 ? 'bg-gray-200' : 'bg-purple-light',
                  ]"
                >
                  <XpIcon v-if="isTeacher || xpProgressPercent >= 100" class="w-12 h-12" />
                  <XpIcon v-else mono class="w-12 h-12 text-gray-400" />
                </div>
                <!-- Teacher: just show total enigma XP -->
                <template v-if="isTeacher">
                  <p class="text-2xl font-bold text-navy-700">{{ totalEnigmaXp }}</p>
                  <p class="text-sm text-navy-700/60">
                    {{ t('teacher.components.mission_detail_template.xp_enigmas') }}
                  </p>
                </template>
                <!-- Student: show progress -->
                <template v-else>
                  <div class="flex items-baseline gap-1">
                    <span class="text-2xl font-bold text-navy-700">{{ earnedXp }}</span>
                    <span class="text-sm text-navy-700/50">/ {{ totalEnigmaXp }}</span>
                  </div>
                  <p class="text-sm text-navy-700/60">
                    {{ t('teacher.components.mission_detail_template.xp_enigmas') }}
                  </p>
                  <!-- Progress bar -->
                  <div class="w-full h-2 bg-gray-200 rounded-full overflow-hidden mt-3">
                    <div
                      class="h-full bg-navy-700 rounded-full transition-all duration-500"
                      :style="{ width: `${xpProgressPercent}%` }"
                    />
                  </div>
                </template>
              </div>

              <!-- Bonus Completion Card -->
              <div
                v-if="classCfg.xp"
                class="bg-white rounded-2xl p-4 shadow-sm flex flex-col items-center justify-center text-center"
              >
                <div
                  class="w-24 h-24 rounded-full flex items-center justify-center mb-3"
                  :class="[!isTeacher && !isMissionComplete ? 'bg-gray-200' : 'bg-purple-light']"
                >
                  <LockClosedIcon
                    v-if="!isTeacher && !isMissionComplete"
                    class="w-12 h-12 text-gray-400"
                  />
                  <XpIcon v-else class="w-12 h-12" />
                </div>
                <p
                  class="text-2xl font-bold"
                  :class="!isTeacher && !isMissionComplete ? 'text-gray-400' : 'text-navy-700'"
                >
                  {{ missionCompletionBonus }}
                </p>
                <p class="text-sm text-navy-700/60">
                  {{ t('teacher.components.mission_detail_template.xp_mission') }}
                </p>
                <p v-if="!isTeacher && !isMissionComplete" class="text-xs text-navy-700/50 mt-2">
                  {{ t('teacher.components.mission_detail_template.complete_all_enigmas') }}
                </p>
              </div>

              <!-- Monedas -->
              <div
                v-if="classCfg.coins"
                class="bg-white rounded-2xl p-4 shadow-sm flex flex-col items-center justify-center text-center"
              >
                <div
                  class="w-24 h-24 rounded-full flex items-center justify-center mb-3"
                  :class="[
                    !isTeacher && coinsProgressPercent < 100 ? 'bg-gray-200' : 'bg-yellow-light',
                  ]"
                >
                  <CoinIcon
                    class="w-12 h-12"
                    :class="{ 'grayscale opacity-40': !isTeacher && coinsProgressPercent < 100 }"
                  />
                </div>
                <!-- Teacher: just show total coins -->
                <template v-if="isTeacher">
                  <p class="text-2xl font-bold text-navy-700">{{ totalCoins }}</p>
                  <p class="text-sm text-navy-700/60">{{ t('common.resources.coins') }}</p>
                </template>
                <!-- Student: show progress -->
                <template v-else>
                  <div class="flex items-baseline gap-1">
                    <span class="text-2xl font-bold text-navy-700">{{ earnedCoins }}</span>
                    <span class="text-sm text-navy-700/50">/ {{ totalCoins }}</span>
                  </div>
                  <p class="text-sm text-navy-700/60">{{ t('common.resources.coins') }}</p>
                  <div class="w-full h-2 bg-gray-200 rounded-full overflow-hidden mt-3">
                    <div
                      class="h-full bg-navy-700 rounded-full transition-all duration-500"
                      :style="{ width: `${coinsProgressPercent}%` }"
                    />
                  </div>
                </template>
              </div>

              <!-- Maná -->
              <div
                v-if="totalMana > 0 && classCfg.mana"
                class="bg-white rounded-2xl p-4 shadow-sm flex flex-col items-center justify-center text-center"
              >
                <div
                  class="w-24 h-24 rounded-full flex items-center justify-center mb-3"
                  :class="[
                    !isTeacher && manaProgressPercent < 100 ? 'bg-gray-200' : 'bg-sky-light',
                  ]"
                >
                  <ManaIcon v-if="isTeacher || manaProgressPercent >= 100" class="w-12 h-12" />
                  <ManaIcon v-else mono class="w-12 h-12 text-gray-400" />
                </div>
                <!-- Teacher: just show total mana -->
                <template v-if="isTeacher">
                  <p class="text-2xl font-bold text-navy-700">{{ totalMana }}</p>
                  <p class="text-sm text-navy-700/60">{{ t('common.resources.mana') }}</p>
                </template>
                <!-- Student: show progress -->
                <template v-else>
                  <div class="flex items-baseline gap-1">
                    <span class="text-2xl font-bold text-navy-700">{{ earnedMana }}</span>
                    <span class="text-sm text-navy-700/50">/ {{ totalMana }}</span>
                  </div>
                  <p class="text-sm text-navy-700/60">{{ t('common.resources.mana') }}</p>
                  <div class="w-full h-2 bg-gray-200 rounded-full overflow-hidden mt-3">
                    <div
                      class="h-full bg-navy-700 rounded-full transition-all duration-500"
                      :style="{ width: `${manaProgressPercent}%` }"
                    />
                  </div>
                </template>
              </div>

              <!-- Badge Reward (la rareza mostrada es la de la misión) -->
              <BadgeRewardCard
                v-if="rewardBadge"
                :badge="rewardBadge"
                :unlocked="isTeacher || mission.status === 'completada'"
                @click="openBadgeDetail"
              />
            </div>
          </Card>
        </div>
      </div>
    </template>

    <!-- Badge Detail Modal -->
    <Teleport to="body">
      <Transition name="modal">
        <div
          v-if="selectedBadge"
          class="fixed inset-0 z-50 flex items-center justify-center p-4"
          @click.self="closeBadgeDetail"
        >
          <div class="absolute inset-0 bg-black/50" @click="closeBadgeDetail" />
          <div class="relative bg-white rounded-2xl p-5 xs:p-6 max-w-sm w-full shadow-xl">
            <!-- Close button -->
            <button
              class="absolute top-3 right-3 p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
              @click="closeBadgeDetail"
            >
              <XMarkIcon class="w-5 h-5" />
            </button>

            <div class="flex flex-col items-center text-center">
              <!-- Badge Image (large) -->
              <div class="relative mb-4">
                <img
                  v-if="selectedBadge.imageUrl"
                  :src="getImageUrl(selectedBadge.imageUrl)"
                  :alt="selectedBadge.name"
                  draggable="false"
                  class="w-32 h-32 xs:w-36 xs:h-36 object-cover rounded-full drop-shadow-lg select-none"
                  :class="{
                    'grayscale opacity-40': !isTeacher && mission?.status !== 'completada',
                  }"
                />
                <div
                  v-else
                  class="w-32 h-32 rounded-full bg-purple/20 flex items-center justify-center"
                >
                  <TrophyIcon
                    class="w-16 h-16"
                    :class="
                      isTeacher || mission?.status === 'completada'
                        ? 'text-purple'
                        : 'text-gray-400'
                    "
                  />
                </div>
                <!-- Lock icon for locked badges -->
                <div
                  v-if="!isTeacher && mission?.status !== 'completada'"
                  class="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-gray-400 flex items-center justify-center shadow"
                >
                  <LockClosedIcon class="w-4 h-4 text-white" />
                </div>
              </div>

              <!-- Rarity badge -->
              <span
                class="px-3 py-1 rounded-full text-xs font-semibold mb-3"
                :class="
                  isTeacher || mission?.status === 'completada'
                    ? getRarityClasses(selectedBadge.rarity || 'common')
                    : 'bg-gray-100 text-gray-400'
                "
              >
                {{ getRarityLabel(selectedBadge.rarity || 'common') }}
              </span>

              <!-- Name -->
              <h2 class="text-lg xs:text-xl font-bold text-navy-700 mb-2">
                {{ selectedBadge.name }}
              </h2>

              <!-- Description -->
              <p class="text-sm text-navy-700/70 mb-4">{{ selectedBadge.description }}</p>

              <!-- Info for locked (students only) -->
              <div v-if="!isTeacher && mission?.status !== 'completada'" class="w-full">
                <div class="bg-gray-100 rounded-xl p-4">
                  <p class="text-sm text-navy-700/70">
                    {{ t('student.mission_detail.rewards.unlock_badge_hint') }}
                  </p>
                </div>
              </div>

              <!-- Close button -->
              <Button variant="primary" class="mt-5" full-width @click="closeBadgeDetail">
                {{ t('teacher.components.mission_detail_template.btn_close') }}
              </Button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import {
  HomeIcon,
  ChevronRightIcon,
  ChevronDownIcon,
  BookOpenIcon,
  AcademicCapIcon,
  ExclamationTriangleIcon,
  ChatBubbleLeftRightIcon,
  QuestionMarkCircleIcon,
  PlayIcon,
  LightBulbIcon,
  BoltIcon,
  ChartBarIcon,
  GiftIcon,
  SparklesIcon,
  StarIcon,
  CalendarDaysIcon,
  ClockIcon,
  PuzzlePieceIcon,
  MapIcon,
  CheckIcon,
  LockClosedIcon,
  DocumentTextIcon,
  ArrowDownTrayIcon,
  ArrowTopRightOnSquareIcon,
  ArrowUpTrayIcon,
  PlayCircleIcon,
  DocumentIcon,
  VideoCameraIcon,
  LinkIcon,
  PhotoIcon,
  PencilIcon,
  XMarkIcon,
  PlusIcon,
  TrashIcon,
  Bars3Icon,
  UserGroupIcon,
  TrophyIcon,
  EllipsisVerticalIcon,
  CheckCircleIcon,
} from '@heroicons/vue/24/outline'
import draggable from 'vuedraggable'
import type { Component } from 'vue'
import type { MissionStatus } from '~/types/mission.types'
import { renderPageMarkdown } from '~/utils/markdown'
import { resolveClassSettings } from '~/utils/class-settings'
import type {
  MissionDetail,
  MissionEnigmaDetail as MissionEnigma,
  MissionDocumentDetail as MissionDocument,
  BadgeRewardDetail as BadgeReward,
  TeacherMissionStats,
} from '~/types/mission-detail.types'
import { getMissionCompletionBonus } from '~/utils/xp-calculator'
import type { MissionRarity } from '~/utils/gamification-config'

const { getImageUrl } = useImageUrl()
const { t, locale } = useI18n()
const aiStore = useAIAssistantStore()

// Monedas y maná que otorga cada enigma (vienen del backend en cada enigma).
const enigmaMana = (enigma: { mana?: number }) => enigma.mana ?? 0
const enigmaCoins = (enigma: { coins?: number }) => enigma.coins ?? 0
const assistantGod = computed(
  () =>
    aiStore.currentGod || {
      id: 'atenea',
      name: 'Atenea',
      avatar: '/app/avatars/atenea.svg',
      color: '#FFC338',
    }
)

// Mission-specific AI action pool — all reference the current mission
const missionActionPool = computed(() => {
  const title = props.mission?.title || 'esta misión'
  const god = assistantGod.value.name
  return [
    {
      id: 'm1',
      label: 'Charlar sobre la misión',
      icon: ChatBubbleLeftRightIcon,
      chatMessage: `Hola ${god}, quiero charlar sobre la misión "${title}"`,
    },
    {
      id: 'm2',
      label: 'Pedir ayuda',
      icon: QuestionMarkCircleIcon,
      chatMessage: `Hola ${god}, necesito ayuda con la misión "${title}"`,
    },
    {
      id: 'm3',
      label: '¡Vamos a empezar!',
      icon: PlayIcon,
      chatMessage: `Hola ${god}, estoy listo para empezar la misión "${title}". ¿Por dónde empiezo?`,
    },
    {
      id: 'm4',
      label: 'Explícame los enigmas',
      icon: AcademicCapIcon,
      chatMessage: `Hola ${god}, ¿puedes explicarme los enigmas de la misión "${title}"?`,
    },
    {
      id: 'm5',
      label: 'Dame pistas sin spoilers',
      icon: LightBulbIcon,
      chatMessage: `Hola ${god}, estoy atascado en la misión "${title}". ¿Puedes darme alguna pista sin spoilers?`,
    },
    {
      id: 'm6',
      label: '¿Cómo mejorar mi entrega?',
      icon: ChartBarIcon,
      chatMessage: `Hola ${god}, ¿qué puedo hacer para mejorar mi entrega en la misión "${title}"?`,
    },
    {
      id: 'm7',
      label: 'Resumen de lo aprendido',
      icon: BookOpenIcon,
      chatMessage: `Hola ${god}, hazme un resumen de lo que debería haber aprendido con la misión "${title}"`,
    },
    {
      id: 'm8',
      label: 'Prepárame para el reto',
      icon: BoltIcon,
      chatMessage: `Hola ${god}, quiero prepararme bien para el reto de la misión "${title}". ¿Qué debería repasar?`,
    },
  ]
})

const pickedMissionIndices = ref<number[]>([])

function pickMissionActions() {
  const indices = Array.from({ length: missionActionPool.value.length }, (_, i) => i)
  for (let i = indices.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[indices[i], indices[j]] = [indices[j], indices[i]]
  }
  pickedMissionIndices.value = indices.slice(0, 3)
}

onMounted(pickMissionActions)

const missionAIActions = computed(() => {
  return pickedMissionIndices.value.map(i => missionActionPool.value[i]).filter(Boolean)
})

const handleMissionAIAction = (action: { chatMessage: string }) => {
  navigateTo({
    path: '/alumno/asistente',
    query: {
      message: action.chatMessage,
      assistantId: aiStore.currentGod?.id,
      missionId: props.missionId,
      classId: props.classId,
    },
  })
}

type TabLink = string | { query: Record<string, string | undefined> }

interface Props {
  mode: 'teacher' | 'student'
  classId: string
  missionId: string
  mission: MissionDetail | null
  loading: boolean
  error: string | null
  /** Pestañas del detalle (solo profesor). Sin ellas, se muestra solo el resumen. */
  tabs?: Array<{ id: string; label: string; icon: Component }>
  /** ID de la pestaña activa (por defecto 'resumen'). */
  activeTab?: string
  /** Constructor del destino (:to) de una pestaña por su id. */
  tabHref?: (tabId: string) => TabLink
}

const props = withDefaults(defineProps<Props>(), {
  tabs: () => [],
  activeTab: 'resumen',
  tabHref: undefined,
})

// Sin tabHref las pestañas no navegan a ningún sitio (caso por defecto: sin pestañas).
const resolveTabHref = (tabId: string): TabLink => (props.tabHref ? props.tabHref(tabId) : '#')

// Las pestañas solo se muestran para el profesor y cuando se le pasan.
const showTabs = computed(() => props.mode === 'teacher' && props.tabs.length > 0)

// Misión expirada (solo lectura para el alumno: puede consultarla, no entregar).
const missionExpired = computed(() => props.mission?.status === 'expirada')

// Per-class feature flags (from the mission's class). Hide XP/coins/mana where disabled.
const classCfg = computed(() => resolveClassSettings(props.mission?.classSettings))

// Narrative text (rendered in full, no typewriter effect)
const narrativeText = computed(
  () => props.mission?.narrative?.description || props.mission?.description || ''
)

// Collapse long narratives behind a "ver más" button
const NARRATIVE_COLLAPSED_HEIGHT = 140 // px
const narrativeContentRef = ref<HTMLElement>()
const narrativeExpanded = ref(false)
const narrativeOverflows = ref(false)
const narrativeFullHeight = ref(0)

// True while the box is clamped to the collapsed height
const narrativeClamped = computed(() => narrativeOverflows.value && !narrativeExpanded.value)

// Animate max-height between collapsed and full height (smooth open/close)
const narrativeContentStyle = computed(() => {
  if (!narrativeOverflows.value) return {}
  return {
    maxHeight:
      (narrativeClamped.value ? NARRATIVE_COLLAPSED_HEIGHT : narrativeFullHeight.value) + 'px',
  }
})

function measureNarrativeOverflow() {
  const el = narrativeContentRef.value
  if (!el) return
  narrativeFullHeight.value = el.scrollHeight
  narrativeOverflows.value = el.scrollHeight > NARRATIVE_COLLAPSED_HEIGHT + 24
}

// Re-measure whenever the narrative content changes
watch(narrativeText, () => nextTick(measureNarrativeOverflow), { immediate: true })

onMounted(() => {
  measureNarrativeOverflow()
  window.addEventListener('resize', measureNarrativeOverflow)
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', measureNarrativeOverflow)
})

// La fecha límite se muestra en modo lectura; su edición vive en la pestaña Ajustes.
function formatDeadline(input: string | Date | null | undefined): string {
  if (!input) return ''
  const d = input instanceof Date ? input : new Date(input)
  if (isNaN(d.getTime())) return ''
  return d.toLocaleDateString(locale.value, { day: 'numeric', month: 'short', year: 'numeric' })
}

// Local editing state (only for narrative which still needs manual save)
const isEditingNarrative = ref(false)

// Dropdown state for mobile actions
const openEnigmaDropdown = ref<string | null>(null)
const openDocumentDropdown = ref<string | null>(null)

const toggleEnigmaDropdown = (enigmaId: string) => {
  openEnigmaDropdown.value = openEnigmaDropdown.value === enigmaId ? null : enigmaId
}

const toggleDocumentDropdown = (docId: string) => {
  openDocumentDropdown.value = openDocumentDropdown.value === docId ? null : docId
}

// La insignia-recompensa hereda la rareza de la MISIÓN (no la suya propia): así
// una misión Legendaria muestra su insignia como Legendaria. Las escalas difieren
// (misión: comun/rara/epica/legendaria; insignia: common/rare/epic/legendary).
const MISSION_TO_BADGE_RARITY: Record<string, 'common' | 'rare' | 'epic' | 'legendary'> = {
  comun: 'common',
  rara: 'rare',
  epica: 'epic',
  legendaria: 'legendary',
}
const rewardBadge = computed<BadgeReward | null>(() => {
  const badge = props.mission?.badgeReward
  if (!badge) return null
  return { ...badge, rarity: MISSION_TO_BADGE_RARITY[props.mission?.rarity ?? ''] ?? badge.rarity }
})

// Badge detail modal state
const selectedBadge = ref<BadgeReward | null>(null)

const openBadgeDetail = () => {
  if (rewardBadge.value) {
    selectedBadge.value = rewardBadge.value
  }
}

const closeBadgeDetail = () => {
  selectedBadge.value = null
}

const getRarityClasses = (rarity: string) => {
  const classes: Record<string, string> = {
    common: 'bg-gray-200 text-gray-700',
    rare: 'bg-sky/20 text-sky',
    epic: 'bg-purple/20 text-purple',
    legendary: 'bg-yellow/25 text-yellow-dark',
  }
  return classes[rarity] || classes.common
}

const getRarityLabel = (rarity: string) => {
  const key = `teacher.components.mission_detail_template.badge_rarity.${rarity}`
  return t(key, t('teacher.components.mission_detail_template.badge_rarity.common'))
}

const emit = defineEmits<{
  updateTitle: [title: string]
  updateDeadline: [deadline: string | null]
  editNarrative: []
  addEnigma: []
  editEnigma: [enigma: MissionEnigma]
  deleteEnigma: [id: string]
  reorderEnigmas: [enigmaIds: string[]]
  addDocument: []
  editDocument: [doc: MissionDocument]
  deleteDocument: [id: string]
  reorderDocuments: [docIds: string[]]
  editRewards: []
  uploadSubmission: [enigmaId: string]
  viewSubmissions: [enigma: MissionEnigma]
  resourceClick: [resource: string]
  ateneaAction: [action: 'chat' | 'help' | 'start']
}>()

// Acciones de los dropdowns: emiten el evento y cierran el menú. Se extraen a
// métodos porque Vue 3.5 no admite @click con varias sentencias inline.
const editEnigmaAction = (enigma: MissionEnigma) => {
  emit('editEnigma', enigma)
  openEnigmaDropdown.value = null
}
const viewSubmissionsAction = (enigma: MissionEnigma) => {
  emit('viewSubmissions', enigma)
  openEnigmaDropdown.value = null
}
const deleteEnigmaAction = (enigmaId: string) => {
  emit('deleteEnigma', enigmaId)
  openEnigmaDropdown.value = null
}
const editDocumentAction = (doc: MissionDocument) => {
  emit('editDocument', doc)
  openDocumentDropdown.value = null
}
const deleteDocumentAction = (docId: string) => {
  emit('deleteDocument', docId)
  openDocumentDropdown.value = null
}

// Local state for draggable items
const localEnigmas = ref<MissionEnigma[]>([])
const localDocuments = ref<MissionDocument[]>([])

// Sync local state with props
watch(
  () => props.mission?.enigmas,
  newEnigmas => {
    if (newEnigmas) {
      localEnigmas.value = [...newEnigmas]
    }
  },
  { immediate: true }
)

watch(
  () => props.mission?.documents,
  newDocs => {
    if (newDocs) {
      localDocuments.value = [...newDocs]
    }
  },
  { immediate: true }
)

// Handle enigma reorder - auto-save on drag end
const onEnigmaReorderAndSave = () => {
  emit(
    'reorderEnigmas',
    localEnigmas.value.map(e => e.id)
  )
}

// Handle document reorder - auto-save on drag end
const onDocumentReorderAndSave = () => {
  emit(
    'reorderDocuments',
    localDocuments.value.map(d => d.id)
  )
}

// Computed
const isTeacher = computed(() => props.mode === 'teacher')
const baseRoute = computed(() => (isTeacher.value ? '/profesor' : '/alumno'))
const dashboardLink = computed(() => `${baseRoute.value}/inicio`)
const classesLink = computed(() => `${baseRoute.value}/clases`)
const classDetailLink = computed(() => `${baseRoute.value}/clases/${props.classId}`)
const backLink = computed(() => `${baseRoute.value}/clases/${props.classId}`)

// Status
const getStatusLabel = (status: MissionStatus): string => {
  const labels: Record<MissionStatus, string> = {
    activa: isTeacher.value
      ? t('student.missions.status.activa')
      : t('student.missions.status.en_progreso'),
    urgente: t('student.missions.status.urgente'),
    completada: t('student.missions.status.completada'),
    bloqueada: t('student.missions.status.bloqueada'),
    expirada: t('student.missions.status.expirada'),
    pendiente: t('student.missions.status.pendiente'),
  }
  return labels[status] || t('student.missions.status.activa')
}

const statusLabel = computed(() => {
  if (!props.mission) return ''
  return getStatusLabel(props.mission.status)
})

const statusVariant = computed(() => {
  if (!props.mission) return 'activa'
  return props.mission.status
})

// Enigmas
const enigmas = computed(() => {
  // For teachers, always use local state (draggable uses localEnigmas)
  if (isTeacher.value) {
    return localEnigmas.value
  }
  return props.mission?.enigmas || []
})
const enigmasCompleted = computed(() => enigmas.value.filter(e => e.status === 'completado').length)
const enigmaProgressPercent = computed(() =>
  enigmas.value.length > 0 ? Math.round((enigmasCompleted.value / enigmas.value.length) * 100) : 0
)

// XP calculations for students
const totalEnigmaXp = computed(() => enigmas.value.reduce((sum, e) => sum + e.xp, 0))
// Use earnedXp if available (for partial XP), otherwise use full xp for completed enigmas
const earnedXp = computed(() =>
  enigmas.value
    .filter(e => e.status === 'completado')
    .reduce((sum, e) => sum + (e.earnedXp !== undefined ? e.earnedXp : e.xp), 0)
)
const xpProgressPercent = computed(() =>
  totalEnigmaXp.value > 0 ? Math.round((earnedXp.value / totalEnigmaXp.value) * 100) : 0
)

// Mission completion bonus based on rarity
const missionCompletionBonus = computed(() => {
  if (!props.mission?.rarity) return 0
  return getMissionCompletionBonus(props.mission.rarity as MissionRarity)
})

// Total XP (enigmas + bonus)
const totalMissionXp = computed(() => totalEnigmaXp.value + missionCompletionBonus.value)

const totalCoins = computed(() => enigmas.value.reduce((sum, e) => sum + enigmaCoins(e), 0))
const totalMana = computed(() => enigmas.value.reduce((sum, e) => sum + enigmaMana(e), 0))

// Check if mission is fully completed (all enigmas done)
const isMissionComplete = computed(
  () => enigmas.value.length > 0 && enigmas.value.every(e => e.status === 'completado')
)

// Misión completada: solo al alumno y solo en la transición false → true, para no
// disparar el confeti cada vez que entre a una misión ya cerrada.
const effects = useEffects()
watch(isMissionComplete, (done, prev) => {
  if (done && !prev && !isTeacher.value) {
    effects.play('mission_completed', { settings: classCfg.value })
  }
})

// Monedas y maná ganados: igual que XP, usa el valor parcial si el profesor aprobó <100%.
const earnedCoins = computed(() =>
  enigmas.value
    .filter(e => e.status === 'completado')
    .reduce((sum, e) => sum + (e.earnedCoins !== undefined ? e.earnedCoins : enigmaCoins(e)), 0)
)
const coinsProgressPercent = computed(() =>
  totalCoins.value > 0 ? Math.round((earnedCoins.value / totalCoins.value) * 100) : 0
)

const earnedMana = computed(() =>
  enigmas.value
    .filter(e => e.status === 'completado')
    .reduce((sum, e) => sum + (e.earnedMana !== undefined ? e.earnedMana : enigmaMana(e)), 0)
)
const manaProgressPercent = computed(() =>
  totalMana.value > 0 ? Math.round((earnedMana.value / totalMana.value) * 100) : 0
)

const getEnigmaIconClass = (enigma: MissionEnigma, _index: number) => {
  if (isTeacher.value) return 'bg-navy-700'
  if (enigma.status === 'disponible') return 'bg-navy-700'
  if (enigma.status === 'pendiente') return 'bg-yellow'
  if (enigma.status === 'completado') return 'bg-[#6CF3AF]'
  return 'bg-gray-300'
}

const getEnigmaStatusLabel = (status: MissionEnigma['status']) => {
  const labels: Record<MissionEnigma['status'], string> = {
    disponible: t('teacher.components.mission_detail_template.status_available'),
    pendiente: t('teacher.components.mission_detail_template.status_in_review'),
    completado: t('teacher.components.mission_detail_template.status_completed'),
  }
  return labels[status]
}

const getEnigmaStatusIcon = (status: MissionEnigma['status']) => {
  const icons: Record<MissionEnigma['status'], Component> = {
    disponible: PlayCircleIcon,
    pendiente: ClockIcon,
    completado: CheckCircleIcon,
  }
  return icons[status]
}

// Color del icono de estado, en los colores de identidad de la app.
const getEnigmaStatusIconClass = (status: MissionEnigma['status']) => {
  const classes: Record<MissionEnigma['status'], string> = {
    disponible: 'text-navy-700',
    pendiente: 'text-navy-700',
    completado: 'text-navy-700',
  }
  return classes[status]
}

// Documents
const supportDocuments = computed(() => {
  // For teachers, always use local state (draggable uses localDocuments)
  const docs = isTeacher.value ? localDocuments.value : props.mission?.documents || []

  // Auto-fix document types based on format (for backwards compatibility)
  return docs.map(doc => {
    const format = doc.format.toLowerCase()

    // Define format groups
    const imageFormats = ['png', 'jpg', 'jpeg', 'gif', 'svg', 'webp']
    const pdfFormats = ['pdf']
    const videoFormats = ['mp4', 'webm', 'ogg', 'mov']
    const docFormats = ['doc', 'docx']

    // Auto-correct type based on format
    if (imageFormats.includes(format)) {
      return { ...doc, type: 'image' as const }
    }
    if (pdfFormats.includes(format)) {
      return { ...doc, type: 'pdf' as const }
    }
    if (videoFormats.includes(format)) {
      return { ...doc, type: 'video' as const }
    }
    if (docFormats.includes(format)) {
      return { ...doc, type: 'docx' as const }
    }

    return doc
  })
})

const getDocumentIcon = (type: MissionDocument['type']) => {
  const icons: Record<MissionDocument['type'], any> = {
    pdf: DocumentTextIcon,
    video: VideoCameraIcon,
    docx: DocumentIcon,
    link: LinkIcon,
    image: PhotoIcon,
  }
  return icons[type]
}

const getDocumentIconBg = (type: MissionDocument['type']) => {
  const colors: Record<MissionDocument['type'], string> = {
    pdf: 'bg-red-500',
    video: 'bg-purple',
    docx: 'bg-blue-500',
    link: 'bg-mint',
    image: 'bg-green-500',
  }
  return colors[type]
}

const getDocumentTagClasses = (type: MissionDocument['type']) => {
  const classes: Record<MissionDocument['type'], string> = {
    pdf: 'bg-red-100 text-red-700',
    video: 'bg-purple/20 text-purple',
    docx: 'bg-blue-100 text-blue-700',
    link: 'bg-[#6CF3AF]/30 text-navy-700',
    image: 'bg-green-100 text-green-700',
  }
  return classes[type]
}

// Handle document action (download/open)
const handleDocumentAction = (doc: MissionDocument & { url?: string; fileUrl?: string }) => {
  const url = doc.url || doc.fileUrl

  if (!url) {
    console.warn('Document has no URL:', doc)
    return
  }

  if (doc.type === 'link') {
    // Open link in new tab
    window.open(url, '_blank', 'noopener,noreferrer')
  } else if (doc.type === 'video') {
    // Open video in new tab
    window.open(url, '_blank', 'noopener,noreferrer')
  } else {
    // Download file (pdf, docx)
    const link = document.createElement('a')
    link.href = url
    link.download = doc.title || 'documento'
    link.target = '_blank'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }
}

// Teacher stats (from API)
const missionStats = computed<TeacherMissionStats>(() => {
  // Use real data from API if available
  if (props.mission?.teacherStats) {
    return props.mission.teacherStats
  }
  // Fallback to zeros if no data
  return {
    totalStudents: 0,
    completed: 0,
    inProgress: 0,
    notStarted: 0,
    avgProgress: 0,
  }
})
</script>

<style scoped>
.dropdown-enter-active,
.dropdown-leave-active {
  transition:
    opacity 0.2s ease,
    transform 0.2s ease;
}

.dropdown-enter-from,
.dropdown-leave-to {
  opacity: 0;
  transform: translateY(-10px);
}

/* Drag handles - prevent browser scroll on touch */
.drag-handle-enigma,
.drag-handle-doc {
  touch-action: none;
  -webkit-touch-callout: none;
  -webkit-user-select: none;
  user-select: none;
}

/* Dragging state */
.dragging-card {
  opacity: 0.9;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.15);
  transform: rotate(2deg);
  z-index: 9999;
}

/* Modal transitions */
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
