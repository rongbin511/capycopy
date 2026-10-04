<template>
  <div v-if="hasCells" class="tpb-word-bank-wrap">
    <div
      class="tpb-word-bank-grid"
      role="group"
      aria-label="Grammar cloze word bank"
      :style="gridStyle"
    >
      <div v-for="cell in cells" :key="cell.letter" class="tpb-word-bank-cell">
        <template v-if="cell.word">
          <span class="tpb-word-bank-letter">({{ cell.letter }})</span>
          <span class="tpb-stem" v-html="cell.wordHtml" />
        </template>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { renderMarkdownInline } from '~/utils/paperBundle'

const WORD_BANK_ROWS = [
  ['A', 'D', 'G', 'K', 'N'],
  ['B', 'E', 'H', 'L', 'P'],
  ['C', 'F', 'J', 'M', 'Q'],
] as const

const props = defineProps<{
  wordBank?: Record<string, string> | null
  itemsPerLine?: number
}>()

const gridStyle = computed(() => ({
  '--tpb-bank-items-per-line': String(Math.max(1, props.itemsPerLine ?? 1)),
}))

const cells = computed(() => {
  const wb = props.wordBank
  if (!wb || typeof wb !== 'object') return []

  const out: Array<{ letter: string; word: string; wordHtml: string }> = []
  for (const row of WORD_BANK_ROWS) {
    for (const letter of row) {
      const word = wb[letter]
      const text = word != null ? String(word).trim() : ''
      out.push({
        letter,
        word: text,
        wordHtml: text ? renderMarkdownInline(text) : '',
      })
    }
  }
  return out
})

const hasCells = computed(() => cells.value.some((cell) => cell.word))
</script>
