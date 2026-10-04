<template>
  <OpenEndedQuestionShell
    :qid="qid"
    :q="q"
    :answer-row="answerRow"
    :view-mode="viewMode"
    :paper-id="paperId"
    :subject-key="subjectKey"
    :section-id="sectionId"
    :line-count="blankPlan.length"
  >
    <OpenEndedTableView :q="q" :view-mode="viewMode" :answer-row="answerRow" />
  </OpenEndedQuestionShell>
</template>

<script setup lang="ts">
import type { AnswerRow, QuestionRow, ViewMode } from '~/types/paper'
import { openEndedTableBlankPlan } from '~/utils/openEndedTable'
import OpenEndedTableView from '~/components/questions/open-ended/OpenEndedTableView.vue'

const props = defineProps<{
  qid: string
  q: QuestionRow
  answerRow?: AnswerRow
  viewMode: ViewMode
  paperId: string
  subjectKey: string
  sectionId?: string | number
}>()

const blankPlan = computed(() => openEndedTableBlankPlan(props.q.table))
</script>
