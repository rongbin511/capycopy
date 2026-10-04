<template>
  <SectionShell
    :bucket="bucket"
    :nav-key="navKey"
    :active="active"
    :show-instructions="showInstructions"
  >
    <PassageBlock
      :bucket="bucket"
      :paper-id="paperId"
      :subject-key="subjectKey"
      mode="writing"
    />
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
