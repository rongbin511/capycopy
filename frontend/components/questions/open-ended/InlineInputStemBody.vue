<template>
  <template v-if="trailingAnswerOnly">
    <div class="tpb-stem text-sm sm:text-base" v-html="stemHtml" />
    <div v-if="viewMode === 'study'" class="tpb-oe-study-lines tpb-oe-study-lines--trailing">
      <input
        type="text"
        class="tpb-oe-answer-line"
        maxlength="800"
        spellcheck="true"
        :aria-label="`Question ${qid} answer`"
      />
    </div>
    <div v-else-if="viewMode === 'answers'" class="tpb-oe-study-lines tpb-oe-study-lines--trailing">
      <input
        type="text"
        readonly
        tabindex="-1"
        :value="trailingModel"
        class="tpb-oe-answer-line tpb-oe-answer-line--model"
        :aria-label="`Question ${qid} answer`"
      />
    </div>
  </template>
  <p v-else class="tpb-oe-sub-q tpb-oe-sub-q--inline tpb-oe-sub-q--stem-same-line">
    <template v-for="(seg, i) in segments" :key="i">
      <span v-if="seg.text" class="tpb-stem text-sm sm:text-base" v-html="renderMarkdownInline(seg.text)" />
      <span v-if="seg.blank" class="tpb-oe-inline-slot">
        <input
          v-if="viewMode === 'study'"
          type="text"
          class="tpb-oe-answer-line tpb-oe-answer-line--inline tpb-oe-answer-line--inline-input"
          maxlength="800"
          spellcheck="true"
          :aria-label="`Question ${qid} answer`"
        />
        <input
          v-else-if="viewMode === 'answers'"
          type="text"
          readonly
          tabindex="-1"
          :value="seg.model || ''"
          class="tpb-oe-answer-line tpb-oe-answer-line--inline tpb-oe-answer-line--inline-input tpb-oe-answer-line--model"
          :aria-label="`Question ${qid} answer`"
        />
      </span>
    </template>
  </p>
</template>

<script setup lang="ts">
import type { ViewMode } from '~/types/paper'
import { renderMarkdownInline } from '~/utils/paperBundle'

export interface InlineInputRenderSegment {
  text?: string
  blank?: boolean
  model?: string
}

defineProps<{
  qid: string
  viewMode: ViewMode
  trailingAnswerOnly: boolean
  stemHtml: string
  segments: InlineInputRenderSegment[]
  trailingModel?: string
}>()
</script>
