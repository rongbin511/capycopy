<template>
  <SectionShell
    :bucket="bucket"
    :nav-key="navKey"
    :active="active"
    :show-instructions="showInstructions"
  >
    <div
      ref="passageRoot"
      :lang="isChinesePassage ? 'zh-Hans' : undefined"
    >
      <PassageBlock
        :bucket="bucket"
        :paper-id="paperId"
        :subject-key="subjectKey"
        mode="paragraphs"
      />
    </div>
  </SectionShell>
</template>

<script setup lang="ts">
import type { SectionBucket, ViewMode } from '~/types/paper'

const props = defineProps<{
  bucket: SectionBucket
  navKey: string
  paperId: string
  subjectKey: string
  viewMode: ViewMode
  active?: boolean
  showInstructions?: boolean
}>()

const passageRoot = ref<HTMLElement | null>(null)
const reloadKey = computed(() => props.bucket.passages)
const isChinesePassage = computed(() =>
  props.subjectKey === 'hcl' || props.subjectKey === 'chinese',
)

useEditingPassage(passageRoot, toRef(props, 'viewMode'), reloadKey)
</script>
