<template>
  <component
    :is="openEndedComponent(question)"
    v-if="openEndedComponent(question)"
    :qid="qid"
    :q="question"
    :answer-row="answerRow"
    :view-mode="viewMode"
    :paper-id="paperId"
    :subject-key="subjectKey"
    :section-id="sectionId"
    :chinese="chinese"
    :math-mode="mathMode"
    :can-edit-question="canEditQuestion"
    :hide-question-header="hideQuestionHeader"
    :shared-question-image-url="sharedQuestionImageUrl"
  />
  <QuestionMcq
    v-else-if="isMcqSubtype(question)"
    :qid="qid"
    :q="question"
    :answer-row="answerRow"
    :view-mode="viewMode"
    :paper-id="paperId"
    :subject-key="subjectKey"
    :section-id="sectionId"
  />
  <div v-else :id="'question-' + qid" class="tpb-oe-question tpb-oe-question--fallback">
    <QuestionHeader
      :qid="qid"
      :clickable="canEditQuestion"
      @question-click="emit('edit', qid)"
    >
      <div class="tpb-stem text-sm" v-html="stemHtml" />
    </QuestionHeader>
    <img
      v-if="imageSrc"
      class="mt-2 max-w-full rounded-lg border border-default"
      :src="imageSrc"
      :alt="`Question ${qid} image`"
      loading="lazy"
    />
  </div>
</template>

<script setup lang="ts">
import type { AnswerRow, QuestionRow, ViewMode } from '~/types/paper'
import {
  paperAssetUrl,
  answerImageFilename,
  questionImageFilename,
  renderMarkdownInline,
} from '~/utils/paperBundle'
import { openEndedQuestionComponent } from '~/utils/openEndedRegistry'

const props = defineProps<{
  qid: string
  question: QuestionRow
  answerRow?: AnswerRow
  viewMode: ViewMode
  paperId: string
  subjectKey: string
  sectionId?: string | number
  chinese?: boolean
  canEditQuestion?: boolean
  mathMode?: boolean
  hideQuestionHeader?: boolean
  sharedQuestionImageUrl?: string
}>()

const emit = defineEmits<{
  edit: [qid: string]
}>()

const stemHtml = computed(() => renderMarkdownInline(props.question.stem_plain || ''))

function openEndedComponent(q: QuestionRow) {
  return openEndedQuestionComponent(q)
}

function isMcqSubtype(q: QuestionRow) {
  return String(q?.interaction || '').startsWith('mcq_')
}

const imageSrc = computed(() => {
  const filename =
    questionImageFilename(props.question, props.qid) ||
    answerImageFilename(props.question, props.qid, props.answerRow)
  return filename ? paperAssetUrl(props.paperId, props.subjectKey, filename) : ''
})
</script>
