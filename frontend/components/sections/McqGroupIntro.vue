<template>
  <div ref="rootEl" class="tpb-mcq-group-intro space-y-3">
    <div
      v-if="stemHtml"
      class="tpb-mcq-group-stem tpb-stem text-sm sm:text-base whitespace-pre-line"
      v-html="stemHtml"
    />
    <img
      v-if="imageUrl"
      class="tpb-mcq-group-image w-[80%] max-w-[80%] mx-auto block rounded-lg border border-default object-contain"
      :src="imageUrl"
      :alt="imageAlt"
      loading="lazy"
    />
  </div>
</template>

<script setup lang="ts">
import renderMathInElement from 'katex/dist/contrib/auto-render.mjs'
import { renderMarkdownInline } from '~/utils/paperBundle'

const props = defineProps<{
  stem?: string
  imageUrl?: string
  imageAlt?: string
  mathMode?: boolean
}>()

const rootEl = ref<HTMLElement | null>(null)

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
