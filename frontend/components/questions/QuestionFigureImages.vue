<template>
  <div v-if="questionUrl || answerUrl" class="tpb-question-figures mt-2 space-y-2">
    <img
      v-if="questionUrl"
      class="tpb-question-figure max-w-full rounded-lg border border-default object-contain"
      :class="grouped ? 'tpb-question-figure--group w-[80%] max-w-[80%] mx-auto block' : ''"
      :src="questionUrl"
      :alt="questionAlt"
      loading="lazy"
    />
    <img
      v-if="answerUrl"
      class="tpb-answer-figure max-w-full rounded-lg border border-default object-contain"
      :src="answerUrl"
      :alt="answerAlt"
      loading="lazy"
    />
  </div>
</template>

<script setup lang="ts">
defineProps<{
  questionUrl?: string
  answerUrl?: string
  questionAlt?: string
  answerAlt?: string
  grouped?: boolean
}>()
</script>
