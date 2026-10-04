<template>
  <SectionShell
    :bucket="bucket"
    :nav-key="navKey"
    :active="active"
    :show-instructions="showInstructions"
  >
    <div class="space-y-4">
      <div
        v-for="qid in qids"
        :key="qid"
        :id="'question-' + qid"
        class="tpb-question-synthesis my-3"
      >
        <QuestionHeader
          :qid="qid"
          :clickable="canEditQuestion"
          @question-click="openQuestionEditor(bucket.questions[qid], bucket.answers[qid], qid)"
        >
          <div class="tpb-stem text-sm sm:text-base" v-html="stemHtml(bucket.questions[qid])" />
        </QuestionHeader>
        <img
          v-if="imageUrl(bucket.questions[qid], qid, bucket.answers[qid])"
          class="mt-2 max-w-full rounded-lg border border-default"
          :src="imageUrl(bucket.questions[qid], qid, bucket.answers[qid])"
          :alt="`Question ${qid} image`"
          loading="lazy"
        />
        <div
          v-if="bucket.questions[qid]?.cue"
          class="tpb-synthesis-cue tpb-stem"
          v-html="cueHtml(bucket.questions[qid])"
        />
        <textarea
          v-if="viewMode === 'study'"
          class="tpb-synthesis-input"
          rows="2"
          placeholder="Your answer"
        />
        <AnswerCard v-else-if="bucket.answers[qid]?.answer || bucket.answers[qid]?.note">
          <div class="tpb-answer-card-body space-y-2 text-sm">
            <p v-if="bucket.answers[qid]?.answer" class="tpb-answer-card-answer">
              {{ bucket.answers[qid]?.answer }}
            </p>
            <div
              v-if="bucket.answers[qid]?.note"
              class="tpb-answer-card-muted tpb-stem"
              v-html="noteHtml(bucket.answers[qid])"
            />
          </div>
        </AnswerCard>
      </div>
    </div>
  </SectionShell>
</template>

<script setup lang="ts">
import type { AnswerRow, QuestionRow, SectionBucket, ViewMode } from '~/types/paper'
import {
  paperAssetUrl,
  questionIdsForSection,
  answerImageFilename,
  questionImageFilename,
  renderMarkdownInline,
} from '~/utils/paperBundle'
import { useQuestionEditor } from '~/composables/useQuestionEditor'

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
const stemHtml = (q: QuestionRow) => renderMarkdownInline(q?.stem_plain || '')
const cueHtml = (q: QuestionRow) => renderMarkdownInline(String(q?.cue || ''))
const noteHtml = (ans?: AnswerRow) => renderMarkdownInline(String(ans?.note || ''))
const openQuestionEditorFn = useQuestionEditor()
const canEditQuestion = computed(() => props.viewMode === 'answers' && !!openQuestionEditorFn)

function openQuestionEditor(q: QuestionRow, answerRow: AnswerRow | undefined, qid: string) {
  if (!openQuestionEditorFn) return
  openQuestionEditorFn({
    paperId: props.paperId,
    subjectKey: props.subjectKey,
    sectionId: props.bucket.sectionid,
    questionId: qid,
    question: q,
    answer: answerRow,
  })
}

function imageUrl(q: QuestionRow, qid: string, answerRow: AnswerRow | undefined) {
  const filename = questionImageFilename(q, qid) || answerImageFilename(q, qid, answerRow)
  return filename ? paperAssetUrl(props.paperId, props.subjectKey, filename) : ''
}
</script>
