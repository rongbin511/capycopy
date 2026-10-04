<template>
  <div :id="'question-' + qid" class="tpb-oe-question" :class="{ 'tpb-oe-question--textarea': isTextarea }">
    <QuestionHeader
      :qid="qid"
      :clickable="canEditQuestion"
      @question-click="openQuestionEditor"
    >
      <div class="tpb-stem text-sm sm:text-base" v-html="stemHtml" />
      <div
        v-if="hintHtml"
        class="tpb-oe-hint tpb-stem text-sm sm:text-base"
        lang="zh-Hans"
        v-html="hintHtml"
      />
      <template v-if="isTextarea">
        <slot v-if="viewMode === 'study'" />
        <OpenEndedModelAnswer
          v-else-if="viewMode === 'answers' && answerRow"
          :lines="modelLines"
          :answer-row="answerRow"
        />
      </template>
    </QuestionHeader>
    <QuestionFigureImages
      :question-url="questionImageUrl"
      :answer-url="displayAnswerImageUrl"
      :question-alt="'Question ' + qid + ' image'"
      :answer-alt="'Answer ' + qid + ' image'"
    />
    <slot v-if="showBodySlot" />
    <OpenEndedModelAnswer
      v-if="!isTextarea && viewMode === 'answers' && answerRow"
      :lines="hasTableUi ? [] : modelLines"
      :answer-row="answerRow"
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
import {
  openEndedAnswerLinesStudyUi,
  openEndedBodyUiInBothModes,
  openEndedModelLinesFromQuestion,
  isTextareaInteraction,
} from '~/utils/openEndedQuestion'
import { openEndedTableHasShape } from '~/utils/openEndedTable'
import { useQuestionEditor } from '~/composables/useQuestionEditor'

const props = defineProps<{
  qid: string
  q: QuestionRow
  answerRow?: AnswerRow
  viewMode: ViewMode
  paperId: string
  subjectKey: string
  sectionId?: string | number
  lineCount?: number
}>()

const isTextarea = computed(() => isTextareaInteraction(props.q))
const hasTableUi = computed(() => openEndedTableHasShape(props.q.table))
/** Widgets that render their own study/answer UI stay mounted in both modes. */
const showBodySlot = computed(
  () =>
    !isTextarea.value &&
    (props.viewMode === 'study' || openEndedBodyUiInBothModes(props.q)),
)

const openQuestionEditorFn = useQuestionEditor()
const canEditQuestion = computed(() => props.viewMode === 'answers' && !!openQuestionEditorFn)
const stemHtml = computed(() => renderMarkdownInline(props.q.stem_plain || ''))
const hintHtml = computed(() => {
  const hint = String(props.q.hint ?? '').trim()
  if (!hint) return ''
  return renderMarkdownInline(hint).replace(/\n/g, '<br />')
})

const slotCount = computed(() => props.lineCount ?? openEndedAnswerLinesStudyUi(props.q) ?? 1)

const modelLines = computed(() =>
  openEndedModelLinesFromQuestion(props.q, props.answerRow, slotCount.value, props.qid),
)

const questionImageUrl = computed(() => {
  const filename = questionImageFilename(props.q, props.qid)
  return filename ? paperAssetUrl(props.paperId, props.subjectKey, filename) : ''
})

const answerImageUrl = computed(() => {
  const filename = answerImageFilename(props.q, props.qid, props.answerRow)
  return filename ? paperAssetUrl(props.paperId, props.subjectKey, filename) : ''
})

const displayAnswerImageUrl = computed(() => {
  if (props.viewMode !== 'answers' || !answerImageUrl.value) return ''
  if (answerImageUrl.value === questionImageUrl.value) return ''
  return answerImageUrl.value
})

function openQuestionEditor() {
  if (!openQuestionEditorFn) return
  openQuestionEditorFn({
    paperId: props.paperId,
    subjectKey: props.subjectKey,
    sectionId: props.sectionId ?? '',
    questionId: props.qid,
    question: props.q,
    answer: props.answerRow,
  })
}
</script>
