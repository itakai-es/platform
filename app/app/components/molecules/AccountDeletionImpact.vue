<template>
  <div v-if="check && (blocked || check.transfers.length || trashed.length)" class="space-y-3">
    <div v-if="blocked || check.transfers.length" class="space-y-2 text-left">
      <InfoNote>{{ intro }}</InfoNote>
      <ul class="list-disc space-y-1 pl-8 text-sm text-navy-700">
        <template v-if="blocked">
          <li v-for="cls in check.blockingClasses" :key="cls.id" class="break-words">
            {{ cls.name }}
          </li>
        </template>
        <template v-else>
          <li v-for="item in check.transfers" :key="item.classId" class="break-words">
            {{
              t('common.account_deletion.transfer_item', {
                class: item.className,
                name: item.toUser.name,
              })
            }}
          </li>
        </template>
      </ul>
    </div>

    <!-- Las de la papelera se borran con la cuenta: no pasan a nadie ni lo impiden.
         Si algo lo impide, no se borra nada y no hace falta decirlo aún. -->
    <div v-if="!blocked && trashed.length" class="space-y-2 text-left">
      <InfoNote>{{ trashedIntro }}</InfoNote>
      <ul class="list-disc space-y-1 pl-8 text-sm text-navy-700">
        <li v-for="cls in trashed" :key="cls.id" class="break-words">{{ cls.name }}</li>
      </ul>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { AccountDeletionCheck } from '~/types/profile.types'

/**
 * Qué pasa con las clases de una cuenta al borrarla, antes de confirmar: a quién
 * pasa cada clase o, si en alguna no hay nadie con administración, por qué no
 * se puede borrar todavía; y las de su papelera, que se borran para siempre con
 * ella. La usan el perfil propio y el panel de usuarios.
 */
const props = defineProps<{
  check: AccountDeletionCheck | null
  /** `self`: la cuenta propia; `admin`: la de otra persona, desde el panel. */
  audience: 'self' | 'admin'
}>()

const { t } = useI18n()

const blocked = computed(() => props.check?.canDelete === false)
const trashed = computed(() => props.check?.trashedClasses ?? [])

const intro = computed(() => {
  const self = props.audience === 'self'
  if (blocked.value) {
    return self
      ? t('common.account_deletion.blocked_self')
      : t('common.account_deletion.blocked_admin')
  }
  return self
    ? t('common.account_deletion.transfers_self')
    : t('common.account_deletion.transfers_admin')
})

const trashedIntro = computed(() => {
  const count = trashed.value.length
  return props.audience === 'self'
    ? t('common.account_deletion.trashed_self', { count }, count)
    : t('common.account_deletion.trashed_admin', { count }, count)
})
</script>
