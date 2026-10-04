<template>
  <div v-if="hasOptions" class="tpb-zh-dialogue-option-bank" role="group" aria-label="Chinese dialogue options">
    <div class="tpb-zh-dialogue-option-grid" :style="gridStyle">
      <div v-for="option in options" :key="option.key" class="tpb-zh-dialogue-option-cell">
        <span class="tpb-zh-dialogue-option-key">({{ option.key }})</span>
        <span class="tpb-stem" v-html="option.html" />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { renderMarkdownInline } from '~/utils/paperBundle'

const props = defineProps<{
  options?: Record<string, unknown> | null
  itemsPerLine?: number
}>()

const gridStyle = computed(() => ({
  '--tpb-bank-items-per-line': String(Math.max(1, props.itemsPerLine ?? 1)),
}))

const options = computed(() => {
  const source = props.options
  if (!source || typeof source !== 'object' || Array.isArray(source)) return []

  return Object.keys(source)
    .sort((a, b) => Number(a) - Number(b))
    .map((key) => {
      const text = source[key] != null ? String(source[key]).trim() : ''
      return {
        key,
        text,
        html: text ? renderMarkdownInline(text) : '',
      }
    })
    .filter((option) => option.text)
})

const hasOptions = computed(() => options.value.length > 0)
</script>
