<template>
  <SectionShell
    :bucket="bucket"
    :nav-key="navKey"
    :active="active"
    :show-instructions="showInstructions"
  >
    <p class="qv-fallback-msg">No dedicated component for section <code>{{ bucket.stem }}</code>.</p>
    <div class="qv-questions">
      <pre>{{ JSON.stringify(bucket.questions, null, 2) }}</pre>
    </div>
  </SectionShell>
</template>

<script setup lang="ts">
import type { SectionBucket, ViewMode } from '~/types/paper'

defineProps<{
  bucket: SectionBucket
  navKey: string
  paperId: string
  subjectKey: string
  viewMode: ViewMode
  active?: boolean
  showInstructions?: boolean
}>()
</script>
