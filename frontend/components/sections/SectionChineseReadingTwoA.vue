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
      mode="paragraphs"
    />
    <div class="qv-questions">
      <template v-for="qid in qids" :key="qid">
        <QuestionMcq
          v-if="questionHasMcqOptions(bucket.questions[qid])"
          :qid="qid"
          :q="bucket.questions[qid]"
          :answer-row="bucket.answers[qid]"
          :view-mode="viewMode"
          :paper-id="paperId"
          :subject-key="subjectKey"
          :section-id="bucket.sectionid"
          :section-stem="bucket.stem"
          :inline-answers="false"
        />
        <QuestionOpenEnded
          v-else
          :qid="qid"
          :q="bucket.questions[qid]"
          :answer-row="answerRowFor(qid)"
          :view-mode="viewMode"
          :paper-id="paperId"
          :subject-key="subjectKey"
          :section-id="bucket.sectionid"
          :section-stem="bucket.stem"
          chinese
        />
      </template>
    </div>
  </SectionShell>
</template>

<script setup lang="ts">
import type { AnswerRow, SectionBucket, ViewMode } from '~/types/paper'
import { questionHasMcqOptions, questionIdsForSection } from '~/utils/paperBundle'
import { synthesizedOpenEndedAnswerRow } from '~/utils/openEndedQuestion'

const props = defineProps<{
  bucket: SectionBucket
  navKey: string
  paperId: string
  subjectKey: string
  viewMode: ViewMode
  active?: boolean
  showInstructions?: boolean
}>()

const qids = computed(() => questionIdsForSection(props.bucket))

function answerRowFor(qid: string): AnswerRow | undefined {
  return synthesizedOpenEndedAnswerRow(
    qid,
    props.bucket.questions[qid],
    props.bucket.answers as Record<string, AnswerRow | undefined>,
  )
}
</script>
