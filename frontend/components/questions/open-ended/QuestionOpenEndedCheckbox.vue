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
    <ul class="tpb-oe-checkbox-options" :data-max="maxSelections">
      <li
        v-for="opt in options"
        :key="opt"
        class="tpb-oe-checkbox-row"
        :class="{ 'is-correct': viewMode === 'answers' && isCorrect(opt) }"
      >
        <label class="tpb-oe-checkbox-label">
          <input
            type="checkbox"
            class="tpb-oe-checkbox-inp"
            :disabled="viewMode === 'answers'"
            :checked="viewMode === 'answers' && isCorrect(opt)"
            @change="onToggle(opt, $event)"
          />
          <span class="tpb-oe-checkbox-text tpb-stem" v-html="renderMarkdownInline(opt)" />
          <span v-if="viewMode === 'answers' && isCorrect(opt)" class="tpb-oe-model-pill">✓</span>
        </label>
      </li>
    </ul>
  </OpenEndedQuestionShell>
</template>

<script setup lang="ts">
import type { AnswerRow, QuestionRow, ViewMode } from '~/types/paper'
import { renderMarkdownInline } from '~/utils/paperBundle'

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

const maxSelections = computed(() => {
  const m = props.q.max_selections
  const n = m != null ? parseInt(String(m), 10) : 2
  if (Number.isNaN(n) || n < 1) return 2
  return Math.min(n, options.value.length || n)
})

const correctSet = computed(() => {
  const set = new Set<string>()
  const raw = props.answerRow?.answer
  const arr = Array.isArray(raw) ? raw : raw != null ? [raw] : []
  for (const x of arr) {
    const k = String(x).trim().toLowerCase()
    if (k) set.add(k)
  }
  return set
})

function isCorrect(opt: string) {
  return correctSet.value.has(opt.trim().toLowerCase())
}

const picked = ref<Set<string>>(new Set())

function onToggle(opt: string, ev: Event) {
  const el = ev.target as HTMLInputElement
  const key = opt.trim().toLowerCase()
  const next = new Set(picked.value)
  if (el.checked) {
    if (next.size >= maxSelections.value) {
      el.checked = false
      return
    }
    next.add(key)
  } else {
    next.delete(key)
  }
  picked.value = next
}
</script>
