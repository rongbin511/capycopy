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
    <div class="tpb-oe-radio-textarea">
      <ul class="tpb-oe-radio-options tpb-oe-radio-options--row">
        <li
          v-for="opt in options"
          :key="opt"
          class="tpb-oe-radio-row"
          :class="{ 'is-correct': viewMode === 'answers' && isCorrect(opt) }"
        >
          <label class="tpb-oe-radio-label">
            <input
              type="radio"
              class="tpb-oe-radio-inp"
              :name="`tpb-oe-rb-${qid}`"
              :value="opt"
              :disabled="viewMode === 'answers'"
              :checked="viewMode === 'answers' && isCorrect(opt)"
            />
            <span class="tpb-oe-radio-text tpb-stem" v-html="renderMarkdownInline(opt)" />
            <span v-if="viewMode === 'answers' && isCorrect(opt)" class="tpb-oe-model-pill">✓</span>
          </label>
        </li>
      </ul>
      <OpenEndedStudyAnswer v-if="viewMode === 'study'" :qid="qid" :q="q" />
    </div>
  </OpenEndedQuestionShell>
</template>

<script setup lang="ts">
import type { AnswerRow, QuestionRow, ViewMode } from '~/types/paper'
import { renderMarkdownInline } from '~/utils/paperBundle'
import { openEndedRadioOptionIsCorrect } from '~/utils/openEndedQuestion'

const props = defineProps<{
  qid: string
  q: QuestionRow
  answerRow?: AnswerRow
  viewMode: ViewMode
  paperId: string
  subjectKey: string
  sectionId?: string | number
}>()

const options = computed(() =>
  Array.isArray(props.q.options) ? props.q.options.map((o) => String(o).trim()) : [],
)

function isCorrect(opt: string) {
  return openEndedRadioOptionIsCorrect(opt, props.answerRow)
}
</script>
