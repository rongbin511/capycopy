<template>
  <OpenEndedQuestionShell
    :qid="qid"
    :q="q"
    :answer-row="answerRow"
    :view-mode="viewMode"
    :paper-id="paperId"
    :subject-key="subjectKey"
    :section-id="sectionId"
    :line-count="lineCount"
    :class="{ 'font-[family-name:var(--font-sans)]': !chinese }"
  >
    <OpenEndedStudyAnswer v-if="viewMode === 'study'" :qid="qid" :q="q" />
  </OpenEndedQuestionShell>
</template>

<script setup lang="ts">
import type { AnswerRow, QuestionRow, ViewMode } from '~/types/paper'
import { openEndedAnswerLinesStudyUi } from '~/utils/openEndedQuestion'

const props = withDefaults(
  defineProps<{
    qid: string
    q: QuestionRow
    answerRow?: AnswerRow
    viewMode: ViewMode
    paperId: string
    subjectKey: string
    sectionId?: string | number
    chinese?: boolean
    lineCount?: number
  }>(),
  { chinese: false },
)

const lineCount = computed(() => props.lineCount ?? openEndedAnswerLinesStudyUi(props.q) ?? 1)
</script>
