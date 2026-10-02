<template>
  <!-- El pie se queda fijo y solo hace scroll el cuerpo: con la lista de
       misiones larga, en móvil, «Importar» no se queda fuera de la pantalla.
       La ventana crece a medida que se elige, sin pasar de ese alto. -->
  <Modal
    :model-value="modelValue"
    size="lg"
    :title="texts.title"
    :persistent="importing"
    :closable="!importing"
    sticky-chrome
    fit-content
    @update:model-value="close"
  >
    <!-- Hecho: qué ha llegado y dónde. Recibe el foco: el botón de importar ya no está. -->
    <div
      v-if="result"
      ref="successRef"
      role="status"
      tabindex="-1"
      :aria-describedby="copiedId"
      class="text-center focus:outline-none"
    >
      <div class="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-mint/20">
        <CheckCircleIcon class="h-8 w-8 text-mint" aria-hidden="true" />
      </div>
      <p class="text-lg font-bold text-navy-700">{{ texts.successTitle }}</p>
      <p class="mt-1 text-sm">
        {{
          t('teacher.missions.import.success_description', {
            title: result.mission.title,
            name: targetName,
          })
        }}
      </p>
    </div>

    <!-- Elegir: el destino si no es fijo, la clase de origen y la misión si no vienen dadas -->
    <div v-else class="space-y-5">
      <p class="text-sm">{{ texts.subtitle }}</p>

      <MissionImportClassField
        v-if="!classId"
        v-model="pickedTargetId"
        :label="t('teacher.missions.import.target_label')"
        :options="targetOptions"
        :empty-text="t('teacher.missions.import.no_targets')"
        :loading="loadingClasses"
        :failed="classesError"
        :disabled="importing"
      />

      <template v-if="!sourceMission && targetId">
        <MissionImportClassField
          v-model="sourceClassId"
          :label="t('teacher.missions.import.source_label')"
          :options="sourceOptions"
          :empty-text="t('teacher.missions.import.no_classes')"
          :loading="loadingClasses"
          :failed="classesError"
          :disabled="importing"
        >
          <!-- Las archivadas, a petición: de ellas se reaprovecha lo del curso
               pasado. Si son lo único que hay ya salen, y la casilla sobra. -->
          <Checkbox
            v-if="archivedSources.length > 0 && !onlyArchivedSources"
            :id="archivedCheckboxId"
            v-model="showArchived"
            class="mt-3"
            :disabled="importing"
            :label="t('teacher.missions.import.show_archived')"
          />
        </MissionImportClassField>

        <FieldGroup
          v-if="sourceClassId"
          v-slot="{ labelId }"
          :label="t('teacher.missions.import.mission_label')"
        >
          <div v-if="loadingMissions" class="space-y-2">
            <Skeleton v-for="n in 3" :key="n" height="h-[4.5rem]" custom-class="rounded-2xl" />
          </div>
          <template v-else-if="!missionsError">
            <InfoNote v-if="missions.length === 0">
              {{ t('teacher.missions.import.no_missions') }}
            </InfoNote>
            <div v-else class="space-y-3">
              <SearchInput
                v-if="missions.length > SEARCH_FROM"
                v-model="missionQuery"
                :placeholder="t('teacher.missions.import.mission_search')"
              />
              <p v-if="filteredMissions.length === 0" class="text-sm" role="status">
                {{ t('teacher.missions.import.no_matches', { query: missionQuery }) }}
              </p>
              <ul v-else :aria-labelledby="labelId" class="space-y-2">
                <li v-for="mission in filteredMissions" :key="mission.id">
                  <button
                    type="button"
                    :aria-pressed="mission.id === selectedMissionId"
                    :disabled="importing"
                    class="flex w-full items-center gap-3 rounded-2xl border p-3 text-left transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-navy-700 disabled:cursor-not-allowed"
                    :class="
                      mission.id === selectedMissionId
                        ? 'border-navy-700 bg-navy-700/5'
                        : 'border-border-primary hover:border-navy-700/30'
                    "
                    @click="selectMission(mission.id)"
                  >
                    <span
                      class="flex h-12 w-12 flex-shrink-0 items-center justify-center overflow-hidden rounded-xl bg-gray-100"
                    >
                      <img
                        v-if="coverUrl(mission)"
                        :src="coverUrl(mission)"
                        alt=""
                        class="h-full w-full object-cover"
                      />
                      <FlagIcon v-else class="h-6 w-6 text-navy-700/40" aria-hidden="true" />
                    </span>
                    <span class="min-w-0 flex-1">
                      <!-- Entero, aunque ocupe dos líneas: dos misiones que empiezan igual se distinguen -->
                      <span class="block break-words font-semibold text-navy-700">{{
                        mission.title
                      }}</span>
                      <MissionSummaryMeta
                        class="mt-1"
                        :rarity="mission.rarity"
                        :enigmas-count="mission.enigmasCount"
                        v-bind="rewardsOf(mission)"
                      />
                    </span>
                    <CheckCircleIcon
                      v-if="mission.id === selectedMissionId"
                      class="h-6 w-6 flex-shrink-0 text-navy-700"
                      aria-hidden="true"
                    />
                  </button>
                </li>
              </ul>
            </div>
          </template>
        </FieldGroup>
      </template>
    </div>

    <!-- Qué se copia (antes) o qué se ha copiado (después) -->
    <section
      v-if="result || (selectedMissionId && !detailError)"
      :id="copiedId"
      class="mt-5 rounded-2xl bg-navy-700/5 p-4"
      :aria-busy="loadingDetail"
    >
      <p class="text-sm font-medium text-navy-700">
        {{ result ? t('teacher.missions.import.copied') : t('teacher.missions.import.will_copy') }}
      </p>
      <Skeleton v-if="loadingDetail" width="w-48" custom-class="mt-2" />
      <template v-else>
        <ul class="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm font-semibold text-navy-700">
          <li v-for="item in copyItems" :key="item.key" class="inline-flex items-center gap-1.5">
            <component :is="item.icon" class="h-4 w-4" aria-hidden="true" />
            {{ item.label }}
          </li>
        </ul>

        <!-- La insignia se copia como una nueva de quien importa: se puede no llevarla -->
        <div
          v-if="!result && detail?.badge"
          class="mt-3 flex items-center gap-3 border-t border-navy-700/10 pt-3"
        >
          <span
            class="flex h-10 w-10 flex-shrink-0 items-center justify-center overflow-hidden rounded-full bg-white"
          >
            <img
              v-if="detail.badge.imageUrl"
              :src="getImageUrl(detail.badge.imageUrl)"
              alt=""
              class="h-full w-full object-cover"
            />
            <TrophyIcon v-else class="h-5 w-5 text-navy-700/60" aria-hidden="true" />
          </span>
          <div class="min-w-0 flex-1">
            <Checkbox
              :id="badgeCheckboxId"
              v-model="copyBadge"
              :disabled="importing"
              :label="t('teacher.missions.import.copy_badge', { name: detail.badge.name })"
              :described-by="badgeHintId"
            />
            <p :id="badgeHintId" class="ml-6 mt-0.5 text-xs text-navy-700/70">
              {{ t('teacher.missions.import.copy_badge_hint') }}
            </p>
          </div>
        </div>
      </template>
    </section>

    <!-- Lo que no ha llegado (las clases, sus misiones o el detalle de la elegida)
         o lo que no se ha podido importar: aquí, junto al botón, y anunciado -->
    <div
      v-if="!result && (retryLoad || importError)"
      ref="alertRef"
      role="alert"
      class="mt-5 flex items-center justify-between gap-3 rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700"
    >
      <span>{{ retryLoad ? t('teacher.missions.import.load_error') : importError }}</span>
      <Button v-if="retryLoad" variant="outline" size="sm" class="flex-shrink-0" @click="retry">
        {{ t('teacher.missions.import.retry') }}
      </Button>
    </div>

    <InfoNote v-if="!result && hasChoices" class="mt-5">
      {{ t('teacher.missions.import.locked_note') }}
    </InfoNote>

    <template #footer>
      <template v-if="result">
        <Button variant="outline" @click="close">
          {{ t('common.actions.close') }}
        </Button>
        <Button variant="primary" @click="openImported">
          {{ t('teacher.missions.import.open_mission') }}
        </Button>
      </template>
      <template v-else>
        <Button variant="outline" :disabled="importing" @click="close">
          {{ t('common.actions.cancel') }}
        </Button>
        <Button
          :id="confirmId"
          variant="primary"
          :loading="importing"
          :disabled="!canImport"
          @click="confirm"
        >
          {{ texts.confirm }}
        </Button>
      </template>
    </template>
  </Modal>
</template>

<script setup lang="ts">
import type { Component } from 'vue'
import { CheckCircleIcon, FlagIcon, TrophyIcon } from '@heroicons/vue/24/solid'
import { DocumentTextIcon, PuzzlePieceIcon } from '@heroicons/vue/24/outline'
import { resolveClassSettings } from '~/utils/class-settings'
import { canInClass } from '~/utils/class-access'
import type { Class, MissionImportResult } from '~/types/teacher.types'
import type { MissionRarity } from '~/types/mission.types'

/**
 * Copiar una misión en una clase. Se llega desde tres sitios:
 * - la pestaña Misiones de una clase (`classId`): el destino es esa clase,
 *   archivada o no; se elige la clase de origen (las propias y las
 *   compartidas) y la misión;
 * - el listado general, sin clase: primero el destino y después el origen y
 *   la misión (`initialTargetId` propone el destino);
 * - el detalle de una misión (`sourceMission`): la misión es esa y solo se
 *   elige el destino, que puede ser su propia clase (copiarla ahí es
 *   duplicarla).
 * Cuando se elige, el destino es una clase activa en la que puedes editar
 * misiones: las mismas que ofrece «Nueva misión». Como origen salen las
 * activas y, si se piden, también las archivadas (reaprovechar las misiones
 * del curso pasado).
 * En los tres se ve qué se copia y se decide si llevarse su insignia. La copia
 * es independiente y llega bloqueada y sin fecha límite; la original no
 * cambia. Hecha, la ventana lo dice y ofrece abrir la misión nueva; lo que la
 * página tenga a la vista lo refresca ella al recibir `imported`.
 */
const props = defineProps<{
  modelValue: boolean
  /** Destino fijo: la clase en la que se está. */
  classId?: string
  className?: string
  /** Origen fijo: la misión que se está viendo, en su clase. */
  sourceMission?: { id: string; title: string; classId: string }
  /** Destino propuesto cuando se elige (el listado filtrado por una clase), si es uno de los posibles. */
  initialTargetId?: string
  /**
   * Adónde va el foco al cerrar si el botón que abrió la ventana ya no está
   * (el del estado vacío, que se va con la primera misión importada).
   */
  returnFocus?: () => HTMLElement | null | undefined
}>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  imported: [result: MissionImportResult]
}>()

/** Una clase del listado de profesor, que también dice cuántas misiones tiene. */
type TeacherClass = Class & { missionCount?: number }

/** Una misión del listado de la clase de origen (`GET /teacher/classes/:id/missions`). */
interface SourceMission {
  id: string
  title: string
  rarity: MissionRarity
  backgroundImage?: string | null
  enigmasCount: number
  xpReward: number
  coinReward: number
  manaReward: number
}

/** Lo que se copia de la misión elegida: enigmas, documentos e insignia. */
interface MissionExtras {
  enigmas: number
  documents: number
  badge: { name: string; imageUrl?: string | null } | null
}

/** Con más misiones que estas, la lista lleva buscador. */
const SEARCH_FROM = 6

const { t } = useI18n()
const teacherStore = useTeacherStore()
const missionStore = useMissionStore()
const { getImageUrl } = useImageUrl()
const badgeCheckboxId = useId()
const badgeHintId = useId()
const archivedCheckboxId = useId()
const copiedId = useId()
const confirmId = useId()

const classes = ref<TeacherClass[]>([])
const loadingClasses = ref(false)
const classesError = ref(false)
const pickedTargetId = ref<string | number>('')
const sourceClassId = ref<string | number>('')
/** Si el origen se elige también entre las clases archivadas. */
const showArchived = ref(false)

const missions = ref<SourceMission[]>([])
const loadingMissions = ref(false)
const missionsError = ref(false)
const missionQuery = ref('')
const selectedMissionId = ref('')

const detail = ref<MissionExtras | null>(null)
const loadingDetail = ref(false)
const detailError = ref(false)
const copyBadge = ref(true)

const importing = ref(false)
/** Por qué no se ha podido importar: el motivo que da la API o uno general. */
const importError = ref('')
const result = ref<MissionImportResult | null>(null)
const successRef = ref<HTMLElement | null>(null)
const alertRef = ref<HTMLElement | null>(null)
/** Quien tenía el foco al abrir: al cerrar se mira si sigue en la página. */
let opener: HTMLElement | null = null

// Solo cuenta la última petición: la de una clase o misión elegida antes no pisa a la de ahora.
let classesSeq = 0
let missionsSeq = 0
let detailSeq = 0

const targetId = computed(() => props.classId || String(pickedTargetId.value))
/** Dónde va la copia o, hecha, dónde ha llegado: eso lo dice la respuesta, no el desplegable. */
const copyClassId = computed(() => result.value?.mission.classId ?? targetId.value)
const targetName = computed(
  () => props.className ?? classes.value.find(c => c.id === copyClassId.value)?.name ?? ''
)
const sourceClass = computed(() => classes.value.find(c => c.id === sourceClassId.value))
const sourceSettings = computed(() => resolveClassSettings(sourceClass.value?.settings))

/** Desde una misión, con su propia clase como destino: la copia es un duplicado. */
const duplicating = computed(() => copyClassId.value === props.sourceMission?.classId)

/**
 * Textos que cambian si se copia la misión que se está viendo (y si eso es
 * duplicarla: el desplegable ya no lo dice una vez elegida) o se importa una.
 */
const texts = computed(() =>
  props.sourceMission
    ? {
        title: t('teacher.missions.import.copy_title'),
        subtitle: t('teacher.missions.import.copy_subtitle', { title: props.sourceMission.title }),
        confirm: duplicating.value
          ? t('teacher.missions.import.duplicate_confirm')
          : t('teacher.missions.import.copy_confirm'),
        error: t('teacher.missions.import.copy_error'),
        successTitle: duplicating.value
          ? t('teacher.missions.import.duplicate_success_title')
          : t('teacher.missions.import.copy_success_title'),
      }
    : {
        title: t('teacher.missions.import.title'),
        subtitle: props.classId
          ? t('teacher.missions.import.subtitle', { name: targetName.value })
          : t('teacher.missions.import.subtitle_free'),
        confirm: t('teacher.missions.import.confirm'),
        error: t('teacher.missions.import.error'),
        successTitle: t('teacher.missions.import.success_title'),
      }
)

/**
 * Destinos: las clases activas donde puedes editar misiones, como en «Nueva
 * misión». Una archivada no se ofrece nunca, ni siquiera la de la misión que
 * se está viendo; esa, si cumple, va marcada: copiarla en ella es duplicarla.
 */
const targetOptions = computed(() =>
  classes.value
    .filter(c => !c.archived && canInClass(c.myAccess, 'mission.edit'))
    .map(c =>
      classOption(
        c,
        c.id === props.sourceMission?.classId ? t('teacher.missions.import.target_same') : undefined
      )
    )
)

/** Orígenes posibles: todas las clases a las que llegas menos la de destino, activas y archivadas aparte. */
const activeSources = computed(() =>
  classes.value.filter(c => c.id !== targetId.value && !c.archived)
)
const archivedSources = computed(() =>
  classes.value.filter(c => c.id !== targetId.value && c.archived)
)

/**
 * Sin ninguna activa de la que traerla, las archivadas son lo único que hay:
 * salen sin pedirlas (y sin casilla; cada una ya dice que está archivada).
 */
const onlyArchivedSources = computed(
  () => activeSources.value.length === 0 && archivedSources.value.length > 0
)

/** Las activas y, si se piden (o no hay otras), detrás las archivadas. */
const sourceOptions = computed(() =>
  (showArchived.value || onlyArchivedSources.value
    ? [...activeSources.value, ...archivedSources.value]
    : activeSources.value
  ).map(c => classOption(c))
)

function classOption(c: TeacherClass, lead?: string) {
  return { value: c.id, label: c.name, hint: classHint(c, lead) }
}

/**
 * Segunda línea de cada clase: cuántas misiones tiene, de quién es si no es
 * tuya y si está archivada; delante, `lead` si lo hay.
 */
function classHint(c: TeacherClass, lead?: string): string {
  const count = c.missionCount ?? 0
  const parts = [t('teacher.missions.import.class_missions', { count }, count)]
  if (lead) parts.unshift(lead)
  const owner = c.myAccess?.isOwner ? undefined : c.teachers?.find(x => x.isOwner)?.name
  if (owner) parts.push(t('teacher.missions.import.class_shared', { name: owner }))
  if (c.archived) parts.push(t('teacher.missions.import.class_archived'))
  return parts.join(' · ')
}

/** Hay algo que elegir: sin ello, la nota de cómo llega la copia sobra. */
const hasChoices = computed(() => {
  if (loadingClasses.value || classesError.value) return false
  if (!props.classId && targetOptions.value.length === 0) return false
  return !!props.sourceMission || sourceOptions.value.length > 0
})

/** Normaliza para buscar sin distinguir mayúsculas ni acentos. */
const normalize = (s: string) =>
  s
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')

const filteredMissions = computed(() => {
  const q = normalize(missionQuery.value.trim())
  return q ? missions.value.filter(m => normalize(m.title).includes(q)) : missions.value
})

function coverUrl(mission: SourceMission): string | undefined {
  const url = mission.backgroundImage
  if (!url) return undefined
  return url.startsWith('/app/') ? url : getImageUrl(url)
}

/** Recompensas de la misión; las de recursos apagados en su clase van a 0 y no se enseñan. */
function rewardsOf(mission: SourceMission) {
  const s = sourceSettings.value
  return {
    xp: s.xp ? mission.xpReward : 0,
    coins: s.coins ? mission.coinReward : 0,
    mana: s.mana ? mission.manaReward : 0,
  }
}

/**
 * Qué se copia: antes de importar, los enigmas y los documentos de la misión
 * elegida (la insignia va aparte, con su casilla); después, lo que ha llegado.
 */
const copyItems = computed(() => {
  const counts = result.value
    ? { ...result.value.copied, badges: result.value.copied.badges.length }
    : detail.value
      ? { enigmas: detail.value.enigmas, documents: detail.value.documents, badges: 0 }
      : null
  if (!counts) return []
  const items: { key: string; icon: Component; label: string }[] = [
    {
      key: 'enigmas',
      icon: PuzzlePieceIcon,
      label: t('teacher.missions.import.enigmas', { count: counts.enigmas }, counts.enigmas),
    },
  ]
  if (counts.documents > 0) {
    items.push({
      key: 'documents',
      icon: DocumentTextIcon,
      label: t('teacher.missions.import.documents', { count: counts.documents }, counts.documents),
    })
  }
  if (counts.badges > 0) {
    items.push({
      key: 'badges',
      icon: TrophyIcon,
      label: t('teacher.missions.import.badges', { count: counts.badges }, counts.badges),
    })
  }
  return items
})

/** Lo que hay que volver a pedir, si algo no ha llegado. */
const retryLoad = computed(() => {
  if (classesError.value) return loadClasses
  if (missionsError.value) return loadMissions
  if (detailError.value) return loadDetail
  return null
})

function retry() {
  retryLoad.value?.()
}

const canImport = computed(
  () =>
    !!targetId.value &&
    !!selectedMissionId.value &&
    !!detail.value &&
    !loadingDetail.value &&
    !importing.value
)

/** Todas las clases a las que llegas, las activas delante: de ellas salen el destino y el origen. */
async function loadClasses() {
  const seq = ++classesSeq
  loadingClasses.value = true
  classesError.value = false
  try {
    const [active, archived] = await Promise.all([
      teacherStore.fetchClasses(undefined, true),
      teacherStore.fetchArchivedClasses(true),
    ])
    if (seq !== classesSeq) return
    classes.value = [...active.classes, ...archived.classes]
    proposeTarget()
  } catch {
    if (seq === classesSeq) classesError.value = true
  } finally {
    if (seq === classesSeq) loadingClasses.value = false
  }
}

/**
 * Sin destino fijo ni elegido, el de entrada: el que propone la página si es
 * uno de los posibles (activa y editable) o, si no, el único que hay. La
 * propia clase de la misión no se da por hecha: ahí sería duplicarla.
 */
function proposeTarget() {
  if (props.classId || pickedTargetId.value) return
  const ids = targetOptions.value.map(o => o.value)
  if (props.initialTargetId && ids.includes(props.initialTargetId)) {
    pickedTargetId.value = props.initialTargetId
  } else if (ids.length === 1 && ids[0] !== props.sourceMission?.classId) {
    pickedTargetId.value = ids[0]!
  }
}

async function loadMissions() {
  const id = String(sourceClassId.value)
  const seq = ++missionsSeq
  missions.value = []
  missionsError.value = false
  loadingMissions.value = true
  try {
    const res = await teacherStore.fetchClassMissions(id, true)
    if (seq === missionsSeq) missions.value = res.missions as SourceMission[]
  } catch {
    if (seq === missionsSeq) missionsError.value = true
  } finally {
    if (seq === missionsSeq) loadingMissions.value = false
  }
}

async function loadDetail() {
  const id = selectedMissionId.value
  const seq = ++detailSeq
  detail.value = null
  detailError.value = false
  loadingDetail.value = true
  try {
    const mission = (await missionStore.fetchTeacherMissionById(id, true)) as unknown as {
      enigmas?: unknown[]
      documents?: unknown[]
      badgeReward?: MissionExtras['badge']
    }
    if (seq === detailSeq) {
      detail.value = {
        enigmas: mission.enigmas?.length ?? 0,
        documents: mission.documents?.length ?? 0,
        badge: mission.badgeReward ?? null,
      }
    }
  } catch {
    if (seq === detailSeq) detailError.value = true
  } finally {
    if (seq === detailSeq) loadingDetail.value = false
  }
}

function selectMission(id: string) {
  if (id === selectedMissionId.value) return
  selectedMissionId.value = id
  copyBadge.value = true
  loadDetail()
}

/** Ninguna misión elegida: fuera la lista y el detalle de antes, y lo que de ellos venga aún en camino. */
function clearMission() {
  ++missionsSeq
  ++detailSeq
  missions.value = []
  missionsError.value = false
  loadingMissions.value = false
  missionQuery.value = ''
  selectedMissionId.value = ''
  detail.value = null
  detailError.value = false
  loadingDetail.value = false
}

// El origen elegido tiene que seguir entre los que se ofrecen: si deja de
// estarlo (es ahora el destino, o es una archivada y se han vuelto a ocultar),
// se vuelve a elegir, y con él la misión.
watch(sourceOptions, options => {
  if (sourceClassId.value && !options.some(o => o.value === sourceClassId.value)) {
    sourceClassId.value = ''
  }
})

// Otra clase de origen: su lista, y nada elegido todavía.
watch(sourceClassId, id => {
  clearMission()
  if (id) loadMissions()
})

// Un aviso de que no se ha podido importar habla de la elección de entonces.
watch([targetId, selectedMissionId], () => {
  importError.value = ''
})

async function confirm() {
  if (!canImport.value) return
  importing.value = true
  importError.value = ''
  try {
    result.value = await teacherStore.importMission(
      selectedMissionId.value,
      targetId.value,
      !!detail.value?.badge && copyBadge.value
    )
    emit('imported', result.value)
  } catch (err) {
    // El motivo que da la API (sin permiso, la misión ya no está…) o uno general.
    const message = (err as { data?: { message?: string } })?.data?.message
    importError.value = message || texts.value.error
  } finally {
    importing.value = false
  }
  // El botón, deshabilitado mientras tanto, ha perdido el foco: hecha, al aviso
  // de hecho; si no, de vuelta al botón para reintentar (el error ya se anuncia),
  // con el aviso a la vista aunque la lista de misiones lo deje más abajo.
  await nextTick()
  if (result.value) {
    successRef.value?.focus()
  } else {
    document.getElementById(confirmId)?.focus()
    alertRef.value?.scrollIntoView({ block: 'nearest' })
  }
}

/** A la misión nueva, en la clase de destino. */
function openImported() {
  const mission = result.value?.mission
  close()
  if (mission) navigateTo(`/profesor/clases/${mission.classId}/misiones/${mission.id}`)
}

function close() {
  emit('update:modelValue', false)
}

// Cada vez que se abre, empieza de cero con las clases al día. Desde una
// misión, lo que se copia se ve ya: la misión no hay que elegirla.
// Al cerrar, la ventana devuelve el foco a quien la abrió; si ese botón ya no
// está en la página, se lo lleva el que diga `returnFocus`.
watch(
  () => props.modelValue,
  open => {
    if (!open) {
      const gone = opener && !opener.isConnected
      opener = null
      if (gone) nextTick(() => props.returnFocus?.()?.focus())
      return
    }
    opener = import.meta.client ? (document.activeElement as HTMLElement | null) : null
    result.value = null
    importError.value = ''
    pickedTargetId.value = ''
    sourceClassId.value = ''
    showArchived.value = false
    clearMission()
    if (props.sourceMission) selectMission(props.sourceMission.id)
    loadClasses()
  },
  { immediate: true }
)
</script>
