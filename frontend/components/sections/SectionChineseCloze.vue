<script setup lang="ts">
import type { SectionBucket, ViewMode } from '~/types/paper'
import { questionHasMcqOptions, questionIdsForSection } from '~/utils/paperBundle'

defineOptions({ inheritAttrs: false })

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

/**
 * §202 blanks live in the passage. Ignore stem_plain (should stay blank) so the
 * same sentence is not rendered again as a QuestionMcq stem.
 */
const standaloneQids = computed(() =>
  questionIdsForSection(props.bucket).filter((qid) => {
    const q = props.bucket.questions[qid]
    if (!q) return false
    if (questionHasMcqOptions(q)) return false
    return String(q.stem_plain || '').trim().length > 0
  }),
)
</script>

<template>
  <SectionShell
    :bucket="bucket"
    :nav-key="navKey"
    :active="active"
    :show-instructions="showInstructions"
  >
    <div lang="zh-Hans">
      <PassageBlock
        :bucket="bucket"
        :paper-id="paperId"
        :subject-key="subjectKey"
        :view-mode="viewMode"
      />
    </div>
    <div v-if="standaloneQids.length" class="space-y-4">
      <QuestionMcq
        v-for="qid in standaloneQids"
        :key="qid"
        :qid="qid"
        :q="bucket.questions[qid]"
        :answer-row="bucket.answers[qid]"
        :view-mode="viewMode"
        :paper-id="paperId"
        :subject-key="subjectKey"
        :section-id="bucket.sectionid"
        :inline-answers="false"
      />
    </div>
  </SectionShell>
</template>
