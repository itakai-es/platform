<template>
  <ul ref="listRef" class="space-y-3">
    <li
      v-for="cls in classes"
      :key="cls.id"
      data-trash-item
      class="flex flex-col gap-3 rounded-2xl bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:gap-4"
    >
      <div class="flex min-w-0 flex-1 items-center gap-3 sm:gap-4">
        <!-- Miniatura de la portada, como en «Mis clases» -->
        <div
          class="h-12 w-16 flex-shrink-0 rounded-xl bg-gray-100 bg-cover bg-center sm:h-14 sm:w-20"
          :style="coverStyle(cls.backgroundImage)"
          aria-hidden="true"
        />
        <div class="min-w-0 flex-1">
          <!-- El nombre entero, sin cortar: copias de una misma clase empiezan
               igual y hay que distinguirlas antes de restaurar -->
          <h2
            :id="`trash-${cls.id}`"
            class="break-words text-base font-bold text-navy-700 sm:text-lg"
          >
            {{ cls.name }}
          </h2>
          <!-- Quién la envió y cuándo (y, en administración, de quién es) -->
          <slot name="details" :cls="cls" />
          <p class="mt-0.5 text-sm text-navy-700">
            {{
              t('teacher.classes.trash.purge_on', {
                date: formatTrashDate(cls.purgeAt, locale, isFew(cls)),
              })
            }}
          </p>
        </div>
      </div>

      <div class="flex flex-wrap items-center justify-between gap-3 sm:justify-end">
        <!-- Cuenta atrás: se destaca cuando quedan pocos días -->
        <Badge :variant="isFew(cls) ? 'danger' : 'default'" size="sm">
          <ClockIcon class="mr-1 h-3.5 w-3.5" aria-hidden="true" />
          {{ countdown(cls) }}
        </Badge>
        <div class="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="md"
            :icon-left="ArrowUturnLeftIcon"
            :loading="restoringId === cls.id"
            :disabled="!!restoringId"
            :aria-describedby="`trash-${cls.id}`"
            @click="emit('restore', cls)"
          >
            {{ t('teacher.classes.trash.restore') }}
          </Button>
          <!-- Sin esperar a los días: con aviso y confirmación reforzada -->
          <Button
            variant="outline"
            size="md"
            :icon-left="TrashIcon"
            :disabled="!!restoringId"
            :aria-describedby="`trash-${cls.id}`"
            data-purge
            @click="emit('purge', cls)"
          >
            {{ t('teacher.classes.trash.purge.cta') }}
          </Button>
        </div>
      </div>
    </li>
  </ul>
</template>

<script setup lang="ts" generic="T extends ClassTrashListItem">
import { ArrowUturnLeftIcon, ClockIcon, TrashIcon } from '@heroicons/vue/24/outline'
import type { ClassTrashListItem } from '~/types/class.types'
import { CLASS_TRASH_FEW_DAYS, formatTrashDate } from '~/utils/class-trash'

/**
 * Las filas de una papelera de clases: portada, nombre, cuándo se borra, la
 * cuenta atrás y los botones de restaurar y borrar ya. La misma para la
 * papelera propia del profesorado y para la de toda la instancia en el panel
 * de administración; lo que cambia entre las dos (quién la envió, de quién es)
 * va en el hueco `details`. Restaurar y borrar los resuelve quien la usa.
 */
defineProps<{
  classes: T[]
  /** La que se está restaurando; mientras, ninguna otra acción. */
  restoringId: string
}>()

const emit = defineEmits<{
  restore: [cls: T]
  purge: [cls: T]
}>()

const { t, locale } = useI18n()
const { getImageUrl } = useImageUrl()

const listRef = ref<HTMLElement | null>(null)

function coverStyle(url?: string | null) {
  const src = getImageUrl(url)
  return src ? { backgroundImage: `url(${src})` } : undefined
}

const isFew = (cls: T) => cls.daysLeft <= CLASS_TRASH_FEW_DAYS

function countdown(cls: T) {
  if (cls.daysLeft <= 0) return t('teacher.classes.trash.purge_today')
  return t('teacher.classes.trash.days_left', { count: cls.daysLeft }, cls.daysLeft)
}

/**
 * Tras quitar una fila (restaurada o borrada), el foco va al «Restaurar» de la
 * que ocupa su sitio (o de la anterior si era la última): quien usa el teclado
 * no vuelve al principio del documento. False si ya no queda ninguna, para que
 * la página lo lleve a su título.
 */
async function focusAfterRemoval(index: number): Promise<boolean> {
  await nextTick()
  const rows = listRef.value?.querySelectorAll<HTMLElement>('[data-trash-item]')
  const next = rows?.length ? rows[Math.min(index, rows.length - 1)] : undefined
  const target = next?.querySelector<HTMLElement>('button')
  target?.focus()
  return !!target
}

defineExpose({ focusAfterRemoval })
</script>
