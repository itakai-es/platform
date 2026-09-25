<template>
  <div v-if="check && (blocked || check.transfers.length)" class="space-y-2 text-left">
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
</template>

<script setup lang="ts">
import type { AccountDeletionCheck } from '~/types/profile.types'

/**
 * Qué pasa con las clases de una cuenta al borrarla, antes de confirmar: a quién
 * pasa cada clase o, si en alguna no hay nadie con administración, por qué no
 * se puede borrar todavía. La usan el perfil propio y el panel de usuarios.
 */
const props = defineProps<{
  check: AccountDeletionCheck | null
  /** `self`: la cuenta propia; `admin`: la de otra persona, desde el panel. */
  audience: 'self' | 'admin'
}>()

const { t } = useI18n()

const blocked = computed(() => props.check?.canDelete === false)

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
</script>
