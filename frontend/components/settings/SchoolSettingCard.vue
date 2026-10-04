<template>
  <UCard :ui="{ body: 'space-y-3' }" class="h-full">
    <div class="flex items-start justify-between gap-3">
      <div>
        <p class="text-xs font-medium uppercase tracking-wide text-muted">School</p>
        <h3 class="text-base font-semibold text-highlighted">{{ school.official_name }}</h3>
      </div>
      <UBadge color="neutral" variant="subtle">{{ school.schoolId }}</UBadge>
    </div>

    <div v-if="school.zh" class="text-sm text-muted">
      {{ school.zh }}
    </div>

    <div class="flex flex-wrap gap-2">
      <UBadge color="neutral" variant="soft">{{ school.slug }}</UBadge>
      <UBadge v-if="school.short_name" color="neutral" variant="soft">{{ school.short_name }}</UBadge>
    </div>

    <div class="flex flex-wrap justify-end gap-2 pt-1">
      <UButton color="neutral" variant="soft" size="sm" icon="i-lucide-pencil-line" @click="emit('edit')">
        Edit
      </UButton>
      <UButton color="error" variant="soft" size="sm" icon="i-lucide-trash-2" @click="emit('delete')">
        Delete
      </UButton>
    </div>
  </UCard>
</template>

<script setup lang="ts">
import type { SchoolEntry } from '~/types/paper'

defineProps<{
  school: SchoolEntry & { schoolId: string }
}>()

const emit = defineEmits<{ edit: []; delete: [] }>()
</script>
