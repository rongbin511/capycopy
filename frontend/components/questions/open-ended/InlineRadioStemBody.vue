<template>
  <p class="tpb-oe-sub-q tpb-oe-sub-q--inline tpb-oe-inline-radio-cue">
    <template v-for="(seg, i) in segments" :key="i">
      <span v-if="seg.text" class="tpb-stem text-sm sm:text-base" v-html="renderMarkdownInline(seg.text)" />
      <span
        v-if="seg.option"
        class="tpb-oe-inline-radio-slot"
        :class="optionClasses(seg.option.key)"
      >
        <label class="tpb-oe-inline-radio-label">
          <input
            type="radio"
            class="tpb-oe-radio-inp"
            :name="`tpb-oe-ir-${qid}`"
            :value="seg.option.key"
            :disabled="viewMode === 'answers' || isReviewed"
            :checked="isChecked(seg.option.key)"
            @change="onPick(seg.option!.key)"
          />
          <span class="tpb-oe-inline-radio-text tpb-stem text-sm sm:text-base">
            ({{ seg.option.key }}) {{ seg.option.label }}
          </span>
          <span
            v-if="showCorrectPill(seg.option.key)"
            class="tpb-oe-model-pill"
            aria-hidden="true"
          >✓</span>
        </label>
      </span>
    </template>
  </p>
</template>

<script setup lang="ts">
import type { ViewMode } from '~/types/paper'
import type { InlineRadioCueSegment } from '~/utils/openEndedQuestion'
import { renderMarkdownInline } from '~/utils/paperBundle'

const props = defineProps<{
  qid: string
  viewMode: ViewMode
  segments: InlineRadioCueSegment[]
  correctKey: string
  userPick: string
  isReviewed: boolean
}>()

const emit = defineEmits<{
  pick: [key: string]
}>()

function isChecked(key: string) {
  if (props.viewMode === 'answers') return props.correctKey === key
  if (props.isReviewed) return props.userPick === key
  return props.userPick === key
}

function showCorrectPill(key: string) {
  if (props.viewMode !== 'answers' && !props.isReviewed) return false
  return props.correctKey === key
}

function onPick(key: string) {
  if (props.viewMode !== 'study' || props.isReviewed) return
  emit('pick', key)
}

function optionClasses(key: string) {
  if (props.viewMode === 'answers') {
    if (key === props.correctKey) return 'is-correct'
    if (props.userPick === key) return 'is-incorrect'
    return ''
  }
  if (!props.isReviewed) {
    return props.userPick === key ? 'is-selected' : ''
  }
  if (key === props.correctKey) {
    return props.userPick === key ? 'is-selected is-correct' : 'is-correct'
  }
  return props.userPick === key ? 'is-selected is-incorrect' : ''
}
</script>
