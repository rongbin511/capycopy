<template>
  <div
    :id="'question-' + qid"
    ref="rootEl"
    class="tpb-question-mcq my-3 space-y-2"
  >
    <div
      :class="[
        mathMode && questionImageUrl && !hasDashQuestionId
          ? 'grid gap-4 md:grid-cols-[minmax(0,2fr)_minmax(0,1fr)] md:items-start'
          : 'space-y-2',
      ]"
    >
      <div class="min-w-0 space-y-2">
        <QuestionHeader
          v-if="!hideStem"
          :qid="qid"
          :clickable="canEditQuestion"
          @question-click="openQuestionEditor"
        >
          <div class="tpb-stem text-sm sm:text-base" v-html="stemHtml" />
        </QuestionHeader>
        <QuestionHeader
          v-else
          :qid="qid"
          :clickable="canEditQuestion"
          @question-click="openQuestionEditor"
        />

        <ul
          class="tpb-mcq-options list-none p-0 m-0 ms-8 grid gap-x-2.5 gap-y-1 grid-cols-1"
          :style="optionsGridStyle"
        >
          <li
            v-for="[key, label] in sortedOptionEntries"
            :key="key"
            class="mcq-option min-w-0 py-0.5 px-1.5 text-sm leading-snug"
            :class="optionClasses(key)"
            :role="viewMode === 'study' ? 'button' : undefined"
            :tabindex="viewMode === 'study' ? 0 : undefined"
            @click="viewMode === 'study' && togglePick(key)"
            @keydown.enter.prevent="viewMode === 'study' && togglePick(key)"
            @keydown.space.prevent="viewMode === 'study' && togglePick(key)"
          >
            <span class="mcq-opt-label text-muted">({{ key }})</span>
            <span class="tpb-stem" v-html="renderQuestionText(label)" />
          </li>
        </ul>

        <AnswerCard v-if="showAnswerCard">
          <div class="tpb-answer-card-body space-y-2 text-sm">
            <p v-if="answerRow.concept" class="tpb-answer-card-concept font-medium">{{ answerRow.concept }}</p>
            <p v-if="answerRow.zh" class="tpb-answer-card-muted tpb-zh-surface">{{ answerRow.zh }}</p>
            <div v-if="answerRow.note" class="tpb-answer-card-muted tpb-stem" v-html="renderQuestionText(String(answerRow.note))" />
            <div v-if="choiceRows.length" class="tpb-mcq-option-breakdown space-y-1.5">
              <p class="tpb-answer-card-label">选项</p>
              <ul class="list-none space-y-1.5 p-0 m-0">
                <li
                  v-for="row in choiceRows"
                  :key="row.opt"
                  class="tpb-mcq-option-breakdown-opt text-sm leading-snug"
                  :class="{ 'is-correct': row.opt === correctKey }"
                >
                  <span class="tpb-mcq-option-breakdown-pill font-semibold">{{ mcqOptionLabel(row.opt) }}</span>
                  <span
                    v-if="row.word"
                    class="tpb-mcq-option-breakdown-en"
                    v-html="renderQuestionText(row.word)"
                  />
                  <span
                    v-if="row.zh"
                    class="tpb-mcq-option-breakdown-zh tpb-zh-surface tpb-answer-card-muted"
                    v-html="renderMarkdownInline(row.zh)"
                  />
                  <span
                    v-if="row.eg && !isPlaceholderVocabOptionExample(row.eg)"
                    class="tpb-mcq-option-breakdown-ex tpb-answer-card-muted"
                    v-html="row.eg"
                  />
                </li>
              </ul>
            </div>
          </div>
        </AnswerCard>
      </div>

      <div
        v-if="questionImageUrl"
        :class="[
          'min-w-0',
          hasDashQuestionId ? 'flex justify-center md:pt-2' : 'md:pt-2',
        ]"
      >
        <img
          :class="[
            'rounded-lg border border-default object-contain',
            hasDashQuestionId ? 'w-full max-w-[66%]' : 'w-full max-w-full',
          ]"
          :src="questionImageUrl"
          :alt="'Question ' + qid + ' image'"
          loading="lazy"
        />
      </div>
    </div>

  </div>
</template>

<script setup lang="ts">
import type { AnswerRow, QuestionRow, ViewMode } from '~/types/paper'
import renderMathInElement from 'katex/dist/contrib/auto-render.mjs'
import {
  isPlaceholderVocabOptionExample,
  mcqOptionLabel,
  choiceEntries,
  paperAssetUrl,
  questionImageFilename,
  renderMarkdownInline,
} from '~/utils/paperBundle'
import { useQuestionEditor } from '~/composables/useQuestionEditor'

const props = defineProps<{
  qid: string
  q: QuestionRow
  answerRow?: AnswerRow
  viewMode: ViewMode
  paperId: string
  subjectKey: string
  sectionId?: string | number
  inlineAnswers?: boolean
  optionsPerLine?: number
  mathMode?: boolean
  hideStem?: boolean
}>()

const rootEl = ref<HTMLElement | null>(null)
const studyReview = useStudyReviewStore()
const openQuestionEditorFn = useQuestionEditor()
const canEditQuestion = computed(() => props.viewMode === 'answers' && !!openQuestionEditorFn)

const optionsMap = computed(() => {
  const o = props.q.options
  if (!o || typeof o !== 'object' || Array.isArray(o)) return {}
  return o as Record<string, string>
})

const optionCount = computed(() => sortedOptionEntries.value.length)

const optionsPerLineResolved = computed(() => Math.max(1, props.optionsPerLine ?? 4))

const optionsGridStyle = computed(() => {
  const perLine = optionsPerLineResolved.value
  if (perLine === 1 || optionCount.value <= 2) return undefined
  return { '--tpb-mcq-options-per-line': String(perLine) }
})

const sortedOptionEntries = computed(() => {
  const entries = Object.entries(optionsMap.value)
  entries.sort((a, b) => {
    const na = Number(a[0])
    const nb = Number(b[0])
    if (!Number.isNaN(na) && !Number.isNaN(nb)) return na - nb
    return a[0].localeCompare(b[0])
  })
  return entries
})

const stemHtml = computed(() => renderQuestionText(props.q.stem_plain || ''))

const correctKey = computed(() => {
  const raw = props.answerRow?.answer
  if (Array.isArray(raw)) return String(raw[0] || '').trim()
  if (typeof raw === 'string') return raw.trim()
  return ''
})

const userPick = computed(() => studyReview.getSelection(props.paperId, props.qid))

const isReviewed = computed(() =>
  props.viewMode === 'study' &&
  !!props.sectionId &&
  studyReview.isSectionReviewed(props.paperId, String(props.sectionId)),
)

const choiceRows = computed(() => choiceEntries(props.answerRow?.choices))

const showAnswerCard = computed(() => {
  if (props.viewMode !== 'answers' || !props.answerRow) return false
  const row = props.answerRow
  if (String(row.concept || '').trim()) return true
  if (String(row.zh || '').trim()) return true
  if (String(row.note || '').trim()) return true
  return choiceRows.value.length > 0
})

const questionImageUrl = computed(() => {
  const filename = questionImageFilename(props.q, props.qid)
  return filename ? paperAssetUrl(props.paperId, props.subjectKey, filename) : ''
})

const hasDashQuestionId = computed(() => props.qid.includes('-'))

onMounted(renderMath)
onUpdated(renderMath)

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

function togglePick(key: string) {
  studyReview.toggleSelection(props.paperId, props.qid, key)
}

function renderQuestionText(text: string): string {
  return renderMarkdownInline(text)
}

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

function optionClasses(key: string) {
  if (props.viewMode !== 'answers') {
    if (!isReviewed.value) return userPick.value === key ? 'tpb-mcq-selected' : ''
    if (key === correctKey.value) {
      return userPick.value === key ? 'tpb-mcq-selected is-correct' : 'is-correct'
    }
    return userPick.value === key ? 'tpb-mcq-selected is-incorrect' : ''
  }
  const selectedClass = userPick.value === key ? 'tpb-mcq-selected qv-mcq-study-selected ' : ''
  if (key === correctKey.value) {
    return `${selectedClass}is-correct`.trim()
  }
  return `${selectedClass}is-incorrect`.trim()
}
</script>
