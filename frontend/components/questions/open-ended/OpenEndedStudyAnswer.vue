<template>
  <div class="tpb-oe-study-lines">
    <template v-if="lineCount > 1">
      <div v-for="slot in lineCount" :key="slot" class="tpb-oe-answer-line-row">
        <input
          type="text"
          class="tpb-oe-answer-line"
          maxlength="800"
          spellcheck="true"
          :aria-label="`Question ${qid} — answer line ${slot} of ${lineCount}`"
        />
      </div>
    </template>
    <UTextarea
      v-else-if="textareaRows > 0"
      :rows="textareaRows"
      :aria-label="`Question ${qid} — answer (${textareaRows} lines)`"
      maxlength="800"
      class="w-full tpb-oe-study-textarea"
    />
    <input
      v-else
      type="text"
      class="tpb-oe-answer-line"
      maxlength="800"
      spellcheck="true"
      :aria-label="`Question ${qid} — answer`"
    />
  </div>
</template>

<script setup lang="ts">
import type { QuestionRow } from '~/types/paper'
import { openEndedAnswerLinesStudyUi, openEndedStudyTextareaRows } from '~/utils/openEndedQuestion'

const props = defineProps<{
  qid: string
  q: QuestionRow
}>()

const lineCount = computed(() => openEndedAnswerLinesStudyUi(props.q))
const textareaRows = computed(() => openEndedStudyTextareaRows(props.q))
</script>
