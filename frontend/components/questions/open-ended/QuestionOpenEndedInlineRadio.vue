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
    <InlineRadioStemBody
      v-if="segments.length"
      :qid="qid"
      :view-mode="viewMode"
      :segments="segments"
      :correct-key="correctKey"
      :user-pick="userPick"
      :is-reviewed="isReviewed"
      @pick="togglePick"
    />
  </OpenEndedQuestionShell>
</template>

<script setup lang="ts">
import type { AnswerRow, QuestionRow, ViewMode } from '~/types/paper'
import { splitInlineRadioCue } from '~/utils/openEndedQuestion'
import InlineRadioStemBody from '~/components/questions/open-ended/InlineRadioStemBody.vue'

const props = defineProps<{
  qid: string
  q: QuestionRow
  answerRow?: AnswerRow
  viewMode: ViewMode
  paperId: string
  subjectKey: string
  sectionId?: string | number
}>()

const studyReview = useStudyReviewStore()

const segments = computed(() => splitInlineRadioCue(String(props.q.cue || '')))

const correctKey = computed(() => {
  const raw = props.answerRow?.answer
  if (Array.isArray(raw)) return String(raw[0] || '').trim()
  if (raw != null) return String(raw).trim()
  return ''
})

const userPick = computed(() => studyReview.getSelection(props.paperId, props.qid))

const isReviewed = computed(
  () =>
    props.viewMode === 'study' &&
    !!props.sectionId &&
    studyReview.isSectionReviewed(props.paperId, String(props.sectionId)),
)

function togglePick(key: string) {
  studyReview.toggleSelection(props.paperId, props.qid, key)
}
</script>
