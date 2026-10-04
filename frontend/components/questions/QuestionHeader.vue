<template>
  <div class="flex items-start gap-2.5">
    <button
      v-if="clickable"
      type="button"
      class="tpb-question-num shrink-0 inline-flex min-w-[2rem] font-semibold text-sm text-muted tabular-nums"
      :aria-label="'Edit question ' + qid"
      :title="title || 'Edit question JSON'"
      @click="emit('question-click')"
    >
      Q{{ qid }}
    </button>
    <span
      v-else
      class="shrink-0 inline-flex min-w-[2rem] font-semibold text-sm text-muted tabular-nums"
      :aria-label="'Question ' + qid"
    >
      Q{{ qid }}
    </span>
    <div class="flex-1 min-w-0 space-y-1">
      <slot />
    </div>
  </div>
</template>

<script setup lang="ts">
withDefaults(defineProps<{
  qid: string
  clickable?: boolean
  title?: string
}>(), {
  clickable: false,
})

const emit = defineEmits<{
  'question-click': []
}>()
</script>
