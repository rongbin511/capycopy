<template>
  <UCard :ui="{ body: 'space-y-4' }">
    <div class="flex flex-wrap items-center justify-between gap-3">
      <div>
        <p class="text-xs font-medium uppercase tracking-wide text-muted">Selected subject</p>
        <h3 class="text-lg font-semibold text-highlighted">{{ subject.label }}</h3>
      </div>
      <div class="flex items-center gap-2">
        <UBadge color="neutral" variant="subtle">{{ sections.length }} sections</UBadge>
        <UButton color="primary" variant="soft" size="sm" icon="i-lucide-plus" @click="emit('create')">
          New section
        </UButton>
        <UButton color="neutral" variant="soft" size="sm" icon="i-lucide-pencil-line" @click="emit('edit')">
          Edit
        </UButton>
      </div>
    </div>

    <div v-if="sections.length" class="grid gap-3">
      <SectionSettingCard
        v-for="section in sections"
        :key="section.sectionId"
        :section="section"
        :editable="true"
        @edit="emit('editSection', section)"
      />
    </div>

    <UAlert
      v-else
      color="neutral"
      variant="subtle"
      icon="i-lucide-list-tree"
      title="No sections for this subject"
      description="The subject is not linked to any sections in the manifest yet."
    />
  </UCard>
</template>

<script setup lang="ts">
import type { SectionCatalogEntry } from '~/types/paper'

defineProps<{
  subject: { key: string; label: string; sectionids: string[]; defaultPaper: string }
  sections: Array<SectionCatalogEntry & { sectionId: string }>
}>()

const emit = defineEmits<{ edit: []; create: []; editSection: [section: SectionCatalogEntry & { sectionId: string }] }>()
</script>
