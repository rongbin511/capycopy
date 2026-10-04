<template>
  <UCard :ui="{ body: 'space-y-3' }" class="h-full">
    <div class="flex items-start justify-between gap-3">
      <div>
        <p class="text-xs font-medium uppercase tracking-wide text-muted">Section</p>
        <h3 class="text-base font-semibold text-highlighted">
          <span class="mr-2 text-muted">{{ section.sectionId }}</span>{{ section.title }}
        </h3>
      </div>
      <UButton
        v-if="editable"
        color="neutral"
        variant="ghost"
        size="sm"
        icon="i-lucide-pencil-line"
        class="-mt-1 -mr-1"
        @click="emit('edit')"
      >
        Edit
      </UButton>
    </div>

    <div class="flex flex-wrap gap-2">
      <UBadge color="neutral" variant="soft">{{ section.stem }}</UBadge>
      <UBadge color="neutral" variant="soft">{{ section.label }}</UBadge>
      <UBadge v-if="section.interaction" color="primary" variant="soft">{{ section.interaction }}</UBadge>
      <UBadge v-if="section.marks != null" color="neutral" variant="soft">{{ section.marks }} marks</UBadge>
      <UBadge v-if="section.template && Object.keys(section.template).length" color="neutral" variant="subtle">
        template
      </UBadge>
    </div>

    <p v-if="section.instruction" class="text-sm text-muted">
      {{ section.instruction }}
    </p>

  </UCard>
</template>

<script setup lang="ts">
import type { SectionCatalogEntry } from '~/types/paper'

const { section, editable = false } = defineProps<{
  section: SectionCatalogEntry & { sectionId: string }
  editable?: boolean
}>()

const emit = defineEmits<{ edit: [] }>()
</script>
