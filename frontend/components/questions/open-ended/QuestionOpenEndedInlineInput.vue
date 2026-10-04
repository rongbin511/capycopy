<template>
  <div :id="'question-' + qid" ref="rootEl" class="tpb-oe-question">
    <QuestionHeader
      v-if="!hideQuestionHeader"
      :qid="qid"
      :clickable="canEdit"
      @question-click="openQuestionEditor"
    >
      <InlineInputStemBody
        :qid="qid"
        :view-mode="viewMode"
        :trailing-answer-only="trailingAnswerOnly"
        :stem-html="stemHtml"
        :segments="renderedSegments"
        :trailing-model="trailingModel"
      />
    </QuestionHeader>
    <div v-else class="tpb-oe-question-body">
      <InlineInputStemBody
        :qid="qid"
        :view-mode="viewMode"
        :trailing-answer-only="trailingAnswerOnly"
        :stem-html="stemHtml"
        :segments="renderedSegments"
        :trailing-model="trailingModel"
      />
    </div>
    <QuestionFigureImages
      :question-url="displayQuestionImageUrl"
      :answer-url="displayAnswerImageUrl"
      :question-alt="'Question ' + qid + ' image'"
      :answer-alt="'Answer ' + qid + ' image'"
      :grouped="!!sharedQuestionImageUrl && !questionImageUrl"
    />
    <OpenEndedModelAnswer
      v-if="viewMode === 'answers' && answerRow"
      :lines="[]"
      :answer-row="answerRow"
    />
  </div>
</template>

<script setup lang="ts">
import renderMathInElement from 'katex/dist/contrib/auto-render.mjs'
import type { AnswerRow, QuestionRow, ViewMode } from '~/types/paper'
import {
  paperAssetUrl,
  answerImageFilename,
  questionImageFilename,
  renderMarkdownInline,
} from '~/utils/paperBundle'
import {
  itemsCompAnswerToken,
  openEndedModelLinesForSlots,
  splitItemsCompSubQuestion,
} from '~/utils/openEndedQuestion'
import type { InlineInputRenderSegment } from '~/components/questions/open-ended/InlineInputStemBody.vue'
import { useQuestionEditor } from '~/composables/useQuestionEditor'
import InlineInputStemBody from '~/components/questions/open-ended/InlineInputStemBody.vue'

const props = defineProps<{
  qid: string
  q: QuestionRow
  answerRow?: AnswerRow
  viewMode: ViewMode
  paperId: string
  subjectKey: string
  sectionId?: string | number
  mathMode?: boolean
  canEditQuestion?: boolean
  hideQuestionHeader?: boolean
  sharedQuestionImageUrl?: string
}>()

const rootEl = ref<HTMLElement | null>(null)
const openQuestionEditorFn = useQuestionEditor()
const canEdit = computed(() => {
  if (props.canEditQuestion === false) return false
  if (props.canEditQuestion === true) return true
  return props.viewMode === 'answers' && !!openQuestionEditorFn
})

const rawSegments = computed(() => splitItemsCompSubQuestion(String(props.q.stem_plain || '')))
const trailingAnswerOnly = computed(() => !rawSegments.value.some((seg) => seg.blank))
const segments = computed(() => rawSegments.value)
const stemHtml = computed(() => renderMarkdownInline(String(props.q.stem_plain || '')))

const modelLines = computed(() =>
  openEndedModelLinesForSlots(props.answerRow, blankCount.value),
)

const renderedSegments = computed((): InlineInputRenderSegment[] => {
  const lines = modelLines.value
  let slot = 0
  return segments.value.map((seg) => {
    if (!seg.blank) return { ...seg }
    const model = itemsCompAnswerToken(
      props.answerRow,
      props.qid,
      slot,
      seg.answerKey,
      lines[slot] || '',
    )
    slot += 1
    return { ...seg, model }
  })
})

const trailingModel = computed(() => modelLines.value[0] || '')

const blankCount = computed(() => {
  if (trailingAnswerOnly.value) return 1
  return segments.value.filter((seg) => seg.blank).length || 1
})

const questionImageUrl = computed(() => {
  const filename = questionImageFilename(props.q, props.qid)
  return filename ? paperAssetUrl(props.paperId, props.subjectKey, filename) : ''
})

const answerImageUrl = computed(() => {
  const filename = answerImageFilename(props.q, props.qid, props.answerRow)
  return filename ? paperAssetUrl(props.paperId, props.subjectKey, filename) : ''
})

const displayQuestionImageUrl = computed(
  () => questionImageUrl.value || props.sharedQuestionImageUrl || '',
)

const displayAnswerImageUrl = computed(() => {
  if (props.viewMode !== 'answers' || !answerImageUrl.value) return ''
  if (answerImageUrl.value === displayQuestionImageUrl.value) return ''
  return answerImageUrl.value
})

onMounted(renderMath)
onUpdated(renderMath)

function renderMath() {
  if (!props.mathMode || !rootEl.value) return
  renderMathInElement(rootEl.value, {
    delimiters: [
      { left: '$$', right: '$$', display: true },
      { left: '$', right: '$', display: false },
    ],
    throwOnError: false,
  })
}

function openQuestionEditor() {
  if (!canEdit.value || !openQuestionEditorFn) return
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
