<script setup lang="ts">
import { getDashboardByRole, ROUTE_NAMES } from '~/utils/navigation'

definePageMeta({ layout: 'auth', middleware: ['auth'] })

const auth = useAuthStore()
const { t } = useI18n()
const router = useRouter()
useHead({ title: computed(() => t('auth.teacher_registration.title')) })

if (!auth.user?.teacherRegistrationPending) {
  await navigateTo(
    auth.user?.isOnboarded ? getDashboardByRole(auth.user.role ?? '') : '/onboarding/seleccion-rol',
    { replace: true }
  )
}

async function finish() {
  auth.markTeacherRegistrationComplete()
  await router.replace(ROUTE_NAMES.TEACHER_DASHBOARD)
}

async function logout() {
  await auth.logout()
  await router.replace(ROUTE_NAMES.LOGIN)
}
</script>

<template>
  <main class="mx-auto max-w-2xl space-y-5 px-4 pb-12 pt-20 sm:min-h-screen sm:px-6 sm:pt-24">
    <div class="flex items-center justify-between gap-3">
      <img src="/logo/itakai_color.svg" alt="ITAKAI" class="h-9 sm:h-11" />
      <Button variant="secondary" size="sm" @click="logout">{{
        t('auth.teacher_registration.logout')
      }}</Button>
    </div>
    <div
      class="space-y-6 rounded-3xl border-t-4 border-yellow bg-surface p-5 text-text-primary shadow-2xl sm:p-8"
    >
      <h1 class="text-2xl font-bold text-navy-700 sm:text-3xl">
        {{ t('auth.teacher_registration.title') }}
      </h1>
      <TeacherProfileForm wizard @completed="finish" />
    </div>
  </main>
</template>
