<template>
  <OpenEndedQuestionShell
    :qid="qid"
    :q="q"
    :answer-row="answerRow"
    :view-mode="viewMode"
    :paper-id="paperId"
    :subject-key="subjectKey"
    :section-id="sectionId"
  >
    <OpenEndedStudyAnswer v-if="viewMode === 'study'" :qid="qid" :q="q" />
  </OpenEndedQuestionShell>
</template>

<script setup lang="ts">
import type { AnswerRow, QuestionRow, ViewMode } from '~/types/paper'

defineProps<{
  qid: string
  q: QuestionRow
  answerRow?: AnswerRow
  viewMode: ViewMode
  paperId: string
  subjectKey: string
  sectionId?: string | number
}>()
</script>
