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
    <div class="tpb-oe-events tpb-oe-events--order">
      <div v-for="(line, i) in events" :key="i" class="tpb-oe-event-row">
        <span class="tpb-oe-event-order-slot">
          <select
            v-if="viewMode === 'study'"
            v-model="picks[i]"
            class="tpb-oe-event-order-select"
            :aria-label="`Order for event ${i + 1} of ${events.length}`"
          >
            <option value="">—</option>
            <option v-for="n in events.length" :key="n" :value="String(n)">{{ n }}</option>
          </select>
          <span v-else-if="modelDigits[i]" class="tpb-oe-event-order-model">
            <span class="tpb-oe-event-order-model-k">Model</span>
            <strong class="tpb-oe-event-order-model-num">{{ modelDigits[i] }}</strong>
          </span>
        </span>
        <span class="tpb-oe-event-text tpb-stem" v-html="renderMarkdownInline(line)" />
      </div>
    </div>
  </OpenEndedQuestionShell>
</template>

<script setup lang="ts">
import type { AnswerRow, QuestionRow, ViewMode } from '~/types/paper'
import { renderMarkdownInline } from '~/utils/paperBundle'
import { parseEventOrderModelDigits } from '~/utils/openEndedQuestion'

const props = defineProps<{
  qid: string
  q: QuestionRow
  answerRow?: AnswerRow
  viewMode: ViewMode
  paperId: string
  subjectKey: string
  sectionId?: string | number
}>()

const events = computed(() =>
  Array.isArray(props.q.events) ? props.q.events.map(String) : [],
)

const modelDigits = computed(() =>
  parseEventOrderModelDigits(props.answerRow, events.value.length) || [],
)

const picks = ref<string[]>([])
watch(
  events,
  (ev) => {
    picks.value = ev.map(() => '')
  },
  { immediate: true },
)
</script>
