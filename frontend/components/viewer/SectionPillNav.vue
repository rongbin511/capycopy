<template>
  <nav class="flex flex-wrap gap-1.5" aria-label="Sections">
    <template v-for="row in catalogRows" :key="row.sectionId">
      <UButton
        v-if="presentIds.has(row.sectionId)"
        size="sm"
        :color="activeKey === row.sectionId ? 'primary' : 'neutral'"
        :variant="activeKey === row.sectionId ? 'solid' : 'soft'"
        :title="row.title"
        @click="emit('select', row.sectionId)"
      >
        {{ row.label }}
      </UButton>
      <UButton
        v-else
        size="sm"
        color="neutral"
        variant="outline"
        :title="'Add ' + row.title"
        :loading="addingId === row.sectionId"
        icon="i-lucide-plus"
        @click="emit('add', row.sectionId)"
      >
        {{ row.label }}
      </UButton>
    </template>
  </nav>
</template>

<script setup lang="ts">
defineProps<{
  catalogRows: Array<{ sectionId: string; stem: string; label: string; title: string }>
  presentIds: Set<string>
  activeKey: string
  addingId?: string
}>()

const emit = defineEmits<{ select: [id: string]; add: [id: string] }>()
</script>
