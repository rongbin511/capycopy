<script setup lang="ts">
import type { SectionBucket, ViewMode } from '~/types/paper'
import {
  clozeUiForSection,
  paperAssetUrl,
  questionIdsForSection,
  answerImageFilename,
  questionImageFilename,
  renderMarkdownInline,
} from '~/utils/paperBundle'
import { useQuestionEditor } from '~/composables/useQuestionEditor'
import { useInlinePassageCloze } from '~/composables/useInlinePassageCloze'

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

const qids = computed(() => questionIdsForSection(props.bucket))
const openQuestionEditorFn = useQuestionEditor()
const canEditQuestion = computed(() => props.viewMode === 'answers' && !!openQuestionEditorFn)
const sectionUi = computed(() => clozeUiForSection(props.bucket))

const {
  passageRoot,
  passageHtml,
  passageWordBank,
  passagePhraseBank,
  clozeAnswerRows,
  handleInput,
  handleCompositionStart,
  handleCompositionEnd,
  handleCommit,
  handleFocus,
} = useInlinePassageCloze({
  bucket: toRef(props, 'bucket'),
  viewMode: toRef(props, 'viewMode'),
  paperId: toRef(props, 'paperId'),
})

const showQuestionCards = computed(() => props.viewMode !== 'answers' && !!sectionUi.value?.show_question_cards)

const showAnswerList = computed(
  () =>
    props.viewMode === 'answers' &&
    clozeAnswerRows.value.length > 0 &&
    !String(props.bucket.stem || '').startsWith('301-cloze'),
)

const bankItemsPerLine = computed(() => sectionUi.value?.items_per_line ?? 1)

const isChinesePassage = computed(() =>
  props.subjectKey === 'hcl' ||
  props.subjectKey === 'chinese'
)

const stemHtml = (qid: string) => renderMarkdownInline(props.bucket.questions[qid]?.stem_plain || '')

function openQuestionEditor(qid: string) {
  const editor = openQuestionEditorFn
  if (!editor) return
  const question = props.bucket.questions[qid]
  if (!question) return
  editor({
    paperId: props.paperId,
    subjectKey: props.subjectKey,
    sectionId: props.bucket.sectionid,
    questionId: qid,
    question,
    answer: props.bucket.answers[qid],
  })
}

function imageUrl(qid: string) {
  const question = props.bucket.questions[qid]
  if (!question) return ''
  const filename = questionImageFilename(question, qid) || answerImageFilename(question, qid, props.bucket.answers[qid])
  return filename ? paperAssetUrl(props.paperId, props.subjectKey, filename) : ''
}
</script>

<template>
  <SectionShell
    :bucket="bucket"
    :nav-key="navKey"
    :active="active"
    :show-instructions="showInstructions"
  >
    <WordBankGrid
      v-if="passageWordBank"
      :word-bank="passageWordBank"
      :items-per-line="bankItemsPerLine"
    />
    <ChineseDialogueOptionBank
      v-else-if="passagePhraseBank"
      :options="passagePhraseBank"
      :items-per-line="bankItemsPerLine"
    />
    <div
      v-if="passageHtml"
      ref="passageRoot"
      class="tpb-passage tpb-markdown text-[15px] leading-relaxed"
      :lang="isChinesePassage ? 'zh-Hans' : undefined"
      v-html="passageHtml"
      @input="handleInput"
      @change="handleCommit"
      @focusin="handleFocus"
      @focusout="handleCommit"
      @compositionstart="handleCompositionStart"
      @compositionend="handleCompositionEnd"
    />
    <AnswerCard
      v-if="showAnswerList"
      class="mt-4"
    >
      <div class="tpb-answer-card-body space-y-3 text-sm">
        <div class="flex flex-wrap items-baseline justify-between gap-2">
          <div>
            <p class="tpb-answer-card-label">Answer list</p>
            <p class="tpb-answer-card-muted">Answer / concept / note</p>
          </div>
          <p class="tpb-answer-card-muted text-xs font-medium uppercase tracking-[0.08em]">
            {{ clozeAnswerRows.length }} items
          </p>
        </div>
        <ol class="space-y-3">
          <li
            v-for="row in clozeAnswerRows"
            :key="row.qid"
            class="rounded-lg border border-slate-200/80 bg-white/70 p-3"
          >
            <div class="flex items-start justify-between gap-4">
              <p class="min-w-0 flex-1 font-semibold text-slate-900">
                <span>Q{{ row.qid }}</span>
                <span v-if="row.answer" class="ml-2 tpb-answer-card-answer">{{ row.answer }}</span>
              </p>
              <p v-if="row.concept" class="shrink-0 text-right tpb-answer-card-concept font-medium">
                {{ row.concept }}
              </p>
            </div>
            <div
              v-if="row.noteHtml"
              class="mt-1 tpb-answer-card-muted tpb-stem"
              v-html="row.noteHtml"
            />
          </li>
        </ol>
      </div>
    </AnswerCard>
    <div v-if="showQuestionCards" class="space-y-2">
      <div
        v-for="qid in qids"
        :key="qid"
        :id="'question-' + qid"
        class="rounded-md bg-elevated/50 px-3 py-2"
      >
        <QuestionHeader
          :qid="qid"
          :clickable="canEditQuestion"
          @question-click="openQuestionEditor(qid)"
        >
          <div class="tpb-stem text-sm" v-html="stemHtml(qid)" />
        </QuestionHeader>
        <img
          v-if="imageUrl(qid)"
          class="mt-2 max-w-full rounded-lg border border-default"
          :src="imageUrl(qid)"
          :alt="`Question ${qid} image`"
          loading="lazy"
        />
      </div>
    </div>
  </SectionShell>
</template>
