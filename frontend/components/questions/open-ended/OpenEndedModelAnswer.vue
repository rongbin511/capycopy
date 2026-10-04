<template>
  <div v-if="hasContent" class="tpb-oe-model-below">
    <p class="tpb-oe-model-below-h">答案（ANSWER）</p>
    <p v-if="concept" class="tpb-oe-teaching-concept">{{ concept }}</p>
    <ol v-if="lines.length > 1" class="tpb-oe-model-below-list">
      <li v-for="(line, i) in lines" :key="i">
        <span v-if="line" class="tpb-stem" v-html="renderMarkdownInline(line)" />
        <span v-else class="tpb-oe-model-empty">—</span>
      </li>
    </ol>
    <div v-else-if="lines.length === 1 && lines[0]" class="tpb-oe-model-below-body">
      <span class="tpb-stem" v-html="renderMarkdownInline(lines[0])" />
    </div>
    <div
      v-if="noteHtml"
      class="tpb-oe-teaching-note tpb-stem"
      :class="{ 'tpb-oe-model-below-note': lines.some(Boolean) || concept }"
      v-html="noteHtml"
    />
  </div>
</template>

<script setup lang="ts">
import type { AnswerRow } from '~/types/paper'
import { renderMarkdownInline } from '~/utils/paperBundle'
import { openEndedTeachingNote } from '~/utils/openEndedQuestion'

const props = defineProps<{
  lines: string[]
  answerRow?: AnswerRow
}>()

const concept = computed(() => {
  const c = props.answerRow?.concept
  return c != null ? String(c).trim() : ''
})

const noteHtml = computed(() => openEndedTeachingNote(props.answerRow))

const hasContent = computed(
  () => props.lines.some(Boolean) || !!concept.value || !!noteHtml.value,
)
</script>
