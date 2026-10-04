<template>
  <SectionEditing v-bind="props" />
</template>

<script setup lang="ts">
import type { SectionBucket, ViewMode } from '~/types/paper'

const props = defineProps<{
  bucket: SectionBucket
  navKey: string
  paperId: string
  subjectKey: string
  sectionId?: string | number
  viewMode: ViewMode
  active?: boolean
  showInstructions?: boolean
}>()
</script>
