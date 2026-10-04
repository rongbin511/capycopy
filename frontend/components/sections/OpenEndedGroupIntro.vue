<template>
  <div ref="rootEl" class="tpb-oe-group-intro space-y-3">
    <QuestionHeader
      :qid="groupId"
      :clickable="clickable"
      title="Edit grouped question"
      @question-click="emit('edit')"
    >
      <div
        v-if="stemHtml"
        class="tpb-stem text-sm sm:text-base"
        v-html="stemHtml"
      />
    </QuestionHeader>
    <img
      v-if="imageUrl"
      class="tpb-oe-group-image tpb-question-figure tpb-question-figure--group w-[80%] max-w-[80%] mx-auto block rounded-lg border border-default object-contain"
      :src="imageUrl"
      :alt="resolvedImageAlt"
      loading="lazy"
    />
    <OpenEndedTableView
      v-if="question && viewMode"
      :q="question"
      :view-mode="viewMode"
      :answer-row="answerRow"
    />
  </div>
</template>

<script setup lang="ts">
import renderMathInElement from 'katex/dist/contrib/auto-render.mjs'
import type { AnswerRow, QuestionRow, ViewMode } from '~/types/paper'
import { renderMarkdownInline } from '~/utils/paperBundle'
import OpenEndedTableView from '~/components/questions/open-ended/OpenEndedTableView.vue'

const props = defineProps<{
  groupId: string
  stem?: string
  imageUrl?: string
  imageAlt?: string
  mathMode?: boolean
  clickable?: boolean
  question?: QuestionRow
  viewMode?: ViewMode
  answerRow?: AnswerRow
}>()

const emit = defineEmits<{
  edit: []
}>()

const rootEl = ref<HTMLElement | null>(null)

const resolvedImageAlt = computed(() => props.imageAlt || `Question ${props.groupId} image`)

const stemHtml = computed(() => {
  const text = String(props.stem || '').trim()
  if (!text) return ''
  return renderMarkdownInline(text)
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
</script>
