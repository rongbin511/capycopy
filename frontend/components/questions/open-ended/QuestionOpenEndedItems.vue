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
    <div class="tpb-oe-sub-parts tpb-oe-sub-parts--inline">
      <div
        v-for="(part, si) in renderedParts"
        :key="si"
        class="tpb-oe-sub-part"
      >
        <template v-if="part.kind === 'radio'">
          <div class="tpb-oe-sub-stem tpb-stem" v-html="part.stemHtml" />
          <ul class="tpb-oe-radio-options">
            <li
              v-for="opt in part.options"
              :key="opt"
              class="tpb-oe-radio-row"
              :class="{ 'is-correct': viewMode === 'answers' && part.modelLc === opt.toLowerCase() }"
            >
              <label class="tpb-oe-radio-label">
                <input type="radio" :name="`tpb-oe-rb-${qid}-${si}`" :disabled="viewMode === 'answers'" />
                <span class="tpb-oe-radio-text tpb-stem" v-html="renderMarkdownInline(opt)" />
                <span v-if="viewMode === 'answers' && part.modelLc === opt.toLowerCase()" class="tpb-oe-model-pill">✓</span>
              </label>
            </li>
          </ul>
        </template>

        <template v-else-if="part.kind === 'checkbox'">
          <div class="tpb-oe-sub-stem tpb-stem" v-html="part.stemHtml" />
          <ul class="tpb-oe-checkbox-options">
            <li
              v-for="opt in part.options"
              :key="opt"
              class="tpb-oe-checkbox-row"
              :class="{ 'is-correct': viewMode === 'answers' && part.modelLc === opt.toLowerCase() }"
            >
              <label class="tpb-oe-checkbox-label">
                <input type="checkbox" :disabled="viewMode === 'answers'" />
                <span class="tpb-oe-checkbox-text tpb-stem" v-html="renderMarkdownInline(opt)" />
                <span v-if="viewMode === 'answers' && part.modelLc === opt.toLowerCase()" class="tpb-oe-model-pill">✓</span>
              </label>
            </li>
          </ul>
        </template>

        <template v-else>
          <p
            v-if="part.sameLineStem"
            class="tpb-oe-sub-q tpb-oe-sub-q--inline tpb-oe-sub-q--stem-same-line"
          >
            <span class="tpb-oe-sub-stem tpb-oe-sub-stem--inline tpb-stem" v-html="part.stemHtml" />
            <template v-for="(seg, pi) in part.segments" :key="pi">
              <span v-if="seg.text" class="tpb-stem" v-html="renderMarkdownInline(seg.text)" />
              <span v-if="seg.blank" class="tpb-oe-inline-slot">
                <input
                  v-if="viewMode === 'study'"
                  type="text"
                  class="tpb-oe-answer-line tpb-oe-answer-line--inline"
                  maxlength="800"
                />
                <span
                  v-else-if="seg.model"
                  class="tpb-oe-inline-model tpb-stem"
                  v-html="renderMarkdownInline(seg.model)"
                />
              </span>
            </template>
          </p>
          <template v-else>
            <div class="tpb-oe-sub-stem tpb-stem" v-html="part.stemHtml" />
            <p class="tpb-oe-sub-q tpb-oe-sub-q--inline">
              <template v-for="(seg, pi) in part.segments" :key="pi">
                <span v-if="seg.text" class="tpb-stem" v-html="renderMarkdownInline(seg.text)" />
                <span v-if="seg.blank" class="tpb-oe-inline-slot">
                  <input
                    v-if="viewMode === 'study'"
                    type="text"
                    class="tpb-oe-answer-line tpb-oe-answer-line--inline"
                    maxlength="800"
                  />
                  <span
                    v-else-if="seg.model"
                    class="tpb-oe-inline-model tpb-stem"
                    v-html="renderMarkdownInline(seg.model)"
                  />
                </span>
              </template>
            </p>
          </template>
        </template>
      </div>
    </div>
  </OpenEndedQuestionShell>
</template>

<script setup lang="ts">
import type { AnswerRow, QuestionRow, ViewMode } from '~/types/paper'
import { renderMarkdownInline } from '~/utils/paperBundle'
import {
  itemsCompAnswerToken,
  normalizeOeSubQuestionUnderscoresForDisplay,
  openEndedItemsSubSlotCount,
  openEndedModelLinesFromQuestion,
  openEndedSubPartIsCheckbox,
  openEndedSubPartIsRadio,
  openEndedSubPartModelToken,
  splitItemsCompSubQuestion,
  openEndedSubStemIsSingleLetterParen,
} from '~/utils/openEndedQuestion'

const props = defineProps<{
  qid: string
  q: QuestionRow
  answerRow?: AnswerRow
  viewMode: ViewMode
  paperId: string
  subjectKey: string
  sectionId?: string | number
}>()

const subParts = computed(() => (Array.isArray(props.q.sub) ? props.q.sub : []))

const modelLines = computed(() => {
  const n = openEndedItemsSubSlotCount(props.q) || openEndedAnswerSlotCountFallback()
  return openEndedModelLinesFromQuestion(props.q, props.answerRow, n, props.qid)
})

function openEndedAnswerSlotCountFallback() {
  return Math.max(1, subParts.value.length)
}

interface BlankSeg {
  text?: string
  blank?: boolean
  model?: string
}

type RenderedPart =
  | {
      kind: 'radio' | 'checkbox'
      stemHtml: string
      options: string[]
      modelLc: string
    }
  | {
      kind: 'blanks'
      stemHtml: string
      sameLineStem: boolean
      segments: BlankSeg[]
    }

const renderedParts = computed((): RenderedPart[] => {
  const lines = modelLines.value
  let slot = 0
  const out: RenderedPart[] = []

  for (const sp of subParts.value) {
    const stemHtml = renderMarkdownInline(String(sp.stem_plain || ''))
    if (openEndedSubPartIsRadio(sp)) {
      const model = itemsCompAnswerToken(props.answerRow, props.qid, slot, undefined, openEndedSubPartModelToken(sp, lines[slot] || ''))
      slot += 1
      out.push({
        kind: 'radio',
        stemHtml,
        options: (sp.options || []).map(String),
        modelLc: model.toLowerCase(),
      })
      continue
    }
    if (openEndedSubPartIsCheckbox(sp)) {
      const model = itemsCompAnswerToken(props.answerRow, props.qid, slot, undefined, openEndedSubPartModelToken(sp, lines[slot] || ''))
      slot += 1
      out.push({
        kind: 'checkbox',
        stemHtml,
        options: (sp.options || []).map(String),
        modelLc: model.toLowerCase(),
      })
      continue
    }

    const qu = normalizeOeSubQuestionUnderscoresForDisplay(sp?.question != null ? String(sp.question) : '')
    const parts = splitItemsCompSubQuestion(qu)
    const segments: BlankSeg[] = []
    for (const part of parts) {
      if (part.text) segments.push({ text: part.text })
      if (part.blank) {
        const model = itemsCompAnswerToken(props.answerRow, props.qid, slot, part.answerKey, openEndedSubPartModelToken(sp, lines[slot] || ''))
        slot += 1
        segments.push({ blank: true, model })
      }
    }
    out.push({
      kind: 'blanks',
      stemHtml,
      sameLineStem: openEndedSubStemIsSingleLetterParen(String(sp.stem_plain || '')),
      segments,
    })
  }

  return out
})
</script>
