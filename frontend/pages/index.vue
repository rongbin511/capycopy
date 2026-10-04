<template>
  <UDashboardNavbar title="Exam Papers">
    <template v-if="isLoggedIn && currentUser" #right>
      <UBadge color="primary" variant="subtle" class="hidden sm:inline-flex">
        {{ currentUser.user_id }}
      </UBadge>
    </template>
  </UDashboardNavbar>

  <div class="flex-1 overflow-y-auto p-4 sm:p-6 space-y-8">
    <section class="space-y-4">
      <div class="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 class="text-lg font-semibold text-highlighted">Log in as</h2>
          <p class="text-sm text-muted">
            Choose who is using the app. Preferences are loaded from the user profile.
          </p>
        </div>
        <UButton
          v-if="isLoggedIn"
          color="neutral"
          variant="ghost"
          size="sm"
          @click="logout"
        >
          Switch user
        </UButton>
      </div>

      <UAlert
        v-if="!users.length"
        color="neutral"
        variant="subtle"
        icon="i-lucide-user-plus"
        title="No users yet"
        description="Add a learner profile in Settings before continuing."
      >
        <template #actions>
          <UButton to="/settings?tab=users" icon="i-lucide-plus">
            Add user
          </UButton>
        </template>
      </UAlert>

      <div v-else class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <UCard
          v-for="user in users"
          :key="user.user_id"
          :ui="{ body: 'space-y-3' }"
          class="transition-shadow cursor-pointer"
          :class="user.user_id === userId
            ? 'ring-2 ring-primary border-primary/30'
            : 'hover:ring-2 hover:ring-primary/20'"
          @click="login(user)"
        >
          <div class="flex items-center gap-2 flex-wrap">
            <UBadge color="primary" variant="subtle">{{ user.level || '—' }}</UBadge>
            <UBadge color="neutral" variant="outline">{{ formatUserGender(user.gender) }}</UBadge>
            <UBadge v-if="user.role" color="neutral" variant="soft">{{ user.role }}</UBadge>
          </div>
          <h3 class="font-semibold text-highlighted">{{ user.user_id }}</h3>
          <p v-if="user.last_viewed" class="text-sm text-muted truncate">
            Last paper: {{ user.last_viewed }}
          </p>
          <p v-else class="text-sm text-muted">No paper viewed yet</p>
          <UButton
            block
            :variant="user.user_id === userId ? 'solid' : 'soft'"
            :color="user.user_id === userId ? 'primary' : 'neutral'"
            @click.stop="login(user)"
          >
            {{ user.user_id === userId ? 'Logged in' : 'Log in' }}
          </UButton>
        </UCard>
      </div>
    </section>

    <section v-if="isLoggedIn && currentUser" class="space-y-4">
      <div>
        <h2 class="text-lg font-semibold text-highlighted">Choose a subject</h2>
        <p class="text-sm text-muted">
          Logged in as <strong class="text-highlighted">{{ currentUser.user_id }}</strong>
          <span v-if="currentUser.level"> · {{ currentUser.level }} papers only</span>.
        </p>
      </div>

      <div v-if="subjectChoices.length" class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <UCard
          v-for="subject in subjectChoices"
          :key="subject.key"
          :ui="{ body: 'space-y-3' }"
          class="hover:ring-2 hover:ring-primary/20 transition-shadow cursor-pointer"
          @click="openSubject(subject.key)"
        >
          <div class="flex items-center gap-3">
            <UIcon :name="subject.icon" class="size-6 text-primary shrink-0" />
            <div class="min-w-0">
              <h3 class="font-semibold text-highlighted">{{ subject.label }}</h3>
              <p class="text-sm text-muted">
                {{ subject.paperCount }} paper{{ subject.paperCount === 1 ? '' : 's' }}
              </p>
            </div>
          </div>
          <UButton
            block
            trailing-icon="i-lucide-arrow-right"
            @click.stop="openSubject(subject.key)"
          >
            Open
          </UButton>
        </UCard>
      </div>

      <UAlert
        v-else
        color="neutral"
        variant="subtle"
        icon="i-lucide-book-open"
        title="No subjects for this level"
        :description="`No papers found for ${currentUser.level || 'this level'} yet.`"
      />
    </section>

    <UAlert
      v-else-if="users.length"
      color="neutral"
      variant="subtle"
      icon="i-lucide-user"
      title="Select a user to continue"
      description="Pick a profile above, then choose a subject."
    />
  </div>
</template>

<script setup lang="ts">
import type { CombinedManifest } from '~/types/paper'
import { useTpbApi } from '~/composables/useTpbApi'
import { useCurrentUser } from '~/composables/useCurrentUser'

const SUBJECT_META: Record<string, { label: string; icon: string }> = {
  english: { label: 'English', icon: 'i-lucide-book-open' },
  math: { label: 'Math', icon: 'i-lucide-sigma' },
  science: { label: 'Science', icon: 'i-lucide-atom' },
  chinese: { label: 'Chinese (华文)', icon: 'i-lucide-languages' },
  hcl: { label: 'Higher Chinese (高华)', icon: 'i-lucide-graduation-cap' },
}

const api = useTpbApi()
const {
  userId,
  isLoggedIn,
  currentUser,
  users,
  login,
  logout,
  paperHrefForSubject,
  subjectChoicesForUser,
  formatUserGender,
} = useCurrentUser()

const { data: manifest } = await useAsyncData('home-manifest', () => api.getManifest())

const subjectChoices = computed(() =>
  subjectChoicesForUser(
    manifest.value as CombinedManifest | null,
    currentUser.value?.level || '',
    SUBJECT_META,
  ),
)

async function openSubject(subjectKey: string) {
  await navigateTo(paperHrefForSubject(subjectKey, manifest.value as CombinedManifest | null))
}
</script>
