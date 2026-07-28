<template>
  <div>
    <!-- Hero header - Full width using negative margins (patrón de la app) -->
    <div class="relative overflow-hidden bg-navy-700 -mx-4 md:-mx-6 -mt-4 md:-mt-6 px-4 md:px-6 pt-6 pb-8 mb-8">
      <div class="relative space-y-4">
        <!-- Breadcrumb -->
        <nav class="flex items-center gap-2 text-sm">
          <NuxtLink
            to="/profesor/inicio"
            class="text-white/70 hover:text-white flex items-center gap-1"
          >
            <HomeIcon class="w-4 h-4" />
            <span>{{ t('teacher.about.breadcrumb_home') }}</span>
          </NuxtLink>
          <ChevronRightIcon class="w-4 h-4 text-white/70" />
          <span class="text-white font-medium">{{ t('teacher.about.breadcrumb') }}</span>
        </nav>

        <!-- Header -->
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div class="flex items-center gap-3">
            <div
              class="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-white/15 flex items-center justify-center flex-shrink-0"
            >
              <InformationCircleIcon class="w-6 h-6 text-white" />
            </div>
            <div class="min-w-0">
              <h1 class="text-2xl sm:text-3xl font-bold text-white">
                {{ t('teacher.about.title') }}
              </h1>
              <p class="text-white/70 text-sm mt-0.5">{{ t('teacher.about.subtitle') }}</p>
            </div>
          </div>

          <!-- Versión actual -->
          <div
            class="inline-flex flex-col self-start rounded-2xl bg-white/10 px-4 py-2.5"
          >
            <p class="text-white/60 text-xs">{{ t('teacher.about.current_version') }}</p>
            <p class="text-white font-bold leading-tight">v{{ APP_VERSION }}</p>
          </div>
        </div>
      </div>
    </div>

    <!-- Rejilla 70/30 (patrón del dashboard) -->
    <div class="grid grid-cols-1 xl:grid-cols-[7fr_3fr] gap-6 items-start">
      <!-- Timeline de versiones -->
      <div class="relative min-w-0">
        <!-- Línea vertical -->
        <div
          class="absolute left-[7px] sm:left-[9px] top-4 bottom-4 w-0.5 bg-border-primary"
          aria-hidden="true"
        />

        <div class="space-y-6">
        <article
          v-for="(entry, index) in groupedChangelog"
          :id="`v-${entry.version}`"
          :key="entry.version"
          class="relative pl-8 sm:pl-10 scroll-mt-6"
        >
          <!-- Nodo del timeline -->
          <span
            class="absolute left-0 top-5 h-4 w-4 rounded-full ring-4 ring-bg-primary"
            :class="index === 0 ? 'bg-purple' : 'bg-navy-700/30'"
            aria-hidden="true"
          />

          <!-- Tarjeta -->
          <div
            class="rounded-2xl bg-surface border p-5 sm:p-6 shadow-sm transition-shadow hover:shadow-md"
            :class="index === 0 ? 'border-purple/30' : 'border-border-primary'"
          >
            <!-- Cabecera de la versión -->
            <div class="flex flex-wrap items-center gap-x-3 gap-y-2 mb-4">
              <span
                class="rounded-lg px-2.5 py-1 text-sm font-bold text-white"
                :class="index === 0 ? 'bg-purple' : 'bg-navy-700'"
              >
                v{{ entry.version }}
              </span>
              <Badge v-if="index === 0" variant="epica" size="sm">
                {{ t('teacher.about.latest') }}
              </Badge>
              <time class="text-sm text-text-secondary ml-auto">{{ formatDate(entry.date) }}</time>

              <p
                v-if="entry.title"
                class="w-full text-lg font-semibold text-navy-700 mt-1"
              >
                {{ entry.title }}
              </p>
            </div>

            <!-- Cambios agrupados por tipo -->
            <div class="space-y-5">
              <section v-for="group in entry.groups" :key="group.type">
                <!-- Cabecera del grupo -->
                <div class="flex items-center gap-2 mb-2.5">
                  <span
                    class="inline-flex h-6 w-6 items-center justify-center rounded-lg"
                    :class="groupMeta[group.type].iconClass"
                  >
                    <component :is="groupMeta[group.type].icon" class="w-3.5 h-3.5" />
                  </span>
                  <h3 class="text-xs font-bold uppercase tracking-wide text-navy-700">
                    {{ t(`teacher.about.groups.${group.type}`) }}
                  </h3>
                  <span class="text-xs text-text-secondary">{{ group.items.length }}</span>
                </div>

                <!-- Lista de cambios -->
                <ul class="space-y-2 pl-1">
                  <li
                    v-for="(change, i) in group.items"
                    :key="i"
                    class="flex items-start gap-2.5"
                  >
                    <span
                      class="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full"
                      :class="groupMeta[group.type].dotClass"
                    />
                    <span class="text-sm text-text-primary leading-relaxed">{{ change.text }}</span>
                  </li>
                </ul>
              </section>
            </div>
          </div>
        </article>
        </div>
      </div>

      <!-- Columna lateral: índice de versiones + sugerencias -->
      <aside class="hidden xl:block space-y-4">
        <nav class="sticky top-6 rounded-2xl bg-surface border border-border-primary p-5">
          <h2 class="text-xs font-bold uppercase tracking-wide text-text-secondary mb-3">
            {{ t('teacher.about.versions_index') }}
          </h2>
          <ul class="space-y-0.5">
            <li v-for="(entry, index) in groupedChangelog" :key="entry.version">
              <a
                :href="`#v-${entry.version}`"
                class="flex items-center justify-between gap-2 rounded-lg px-2.5 py-2 transition-colors hover:bg-surface-hover"
              >
                <span class="flex items-center gap-2 min-w-0">
                  <span
                    class="h-2 w-2 shrink-0 rounded-full"
                    :class="index === 0 ? 'bg-purple' : 'bg-navy-700/30'"
                  />
                  <span
                    class="font-semibold"
                    :class="index === 0 ? 'text-navy-700' : 'text-text-secondary'"
                  >
                    v{{ entry.version }}
                  </span>
                </span>
                <span class="text-xs text-text-secondary shrink-0">{{ formatShortDate(entry.date) }}</span>
              </a>
            </li>
          </ul>
        </nav>

        <p class="rounded-2xl bg-bg-tertiary p-4 text-xs text-text-secondary leading-relaxed">
          {{ t('teacher.about.footer_note') }}
        </p>
      </aside>
    </div>

    <!-- Nota final (solo móvil/tablet, donde no hay columna lateral) -->
    <p class="xl:hidden mt-8 text-center text-xs text-text-secondary">
      {{ t('teacher.about.footer_note') }}
    </p>
  </div>
</template>

<script setup lang="ts">
import {
  HomeIcon,
  ChevronRightIcon,
  InformationCircleIcon,
  SparklesIcon,
  ArrowTrendingUpIcon,
  WrenchScrewdriverIcon,
} from '@heroicons/vue/24/outline'
import { changelog, APP_VERSION, type ChangeType } from '~/data/changelog'

const { t, locale } = useI18n()

// Estilos por tipo de cambio, con los colores oficiales de ITAKAI
const groupMeta: Record<ChangeType, { icon: any; iconClass: string; dotClass: string }> = {
  new: { icon: SparklesIcon, iconClass: 'bg-mint-light text-mint-active', dotClass: 'bg-mint-active' },
  improved: { icon: ArrowTrendingUpIcon, iconClass: 'bg-sky-light text-sky-active', dotClass: 'bg-sky-active' },
  fixed: { icon: WrenchScrewdriverIcon, iconClass: 'bg-yellow-light text-yellow-active', dotClass: 'bg-yellow-active' },
}

// Orden de los grupos dentro de cada versión
const GROUP_ORDER: ChangeType[] = ['new', 'improved', 'fixed']

// Changelog con los cambios agrupados por tipo (solo los grupos con contenido)
const groupedChangelog = computed(() =>
  changelog.map(entry => ({
    ...entry,
    groups: GROUP_ORDER.map(type => ({
      type,
      items: entry.changes.filter(c => c.type === type),
    })).filter(g => g.items.length > 0),
  }))
)

function formatDate(iso: string): string {
  const date = new Date(iso)
  return new Intl.DateTimeFormat(locale.value, {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(date)
}

function formatShortDate(iso: string): string {
  const date = new Date(iso)
  return new Intl.DateTimeFormat(locale.value, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(date)
}

useHead({
  title: computed(() => t('teacher.about.meta.title')),
  meta: [{ name: 'description', content: computed(() => t('teacher.about.meta.description')) }],
})

definePageMeta({
  layout: 'teacher',
  middleware: ['auth', 'onboarding', 'role'],
})
</script>
