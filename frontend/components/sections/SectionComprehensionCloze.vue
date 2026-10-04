<script setup lang="ts">
import type { SectionBucket, ViewMode } from '~/types/paper'
import {
  CLOZE_PASSAGE_PARA_CLASS,
  clozeZhPassageRows,
  renderMarkdownInline,
  questionIdsForSection,
  wrapComprehensionClozePassageHtml,
} from '~/utils/paperBundle'
import { useComprehensionClozePassage } from '~/composables/useComprehensionClozePassage'

defineOptions({ inheritAttrs: false })

const props = defineProps<{
  bucket: SectionBucket
  navKey: string
  paperId: string
  subjectKey: string
  sectionId?: string | number
  viewMode: ViewMode
  active?: boolean
  showInstructions?: boolean
}>()

const passageRoot = ref<HTMLElement | null>(null)
const passageRows = computed(() => clozeZhPassageRows(props.bucket.passages))
const clozeQids = computed(() =>
  questionIdsForSection(props.bucket).filter((qid) => !!props.bucket.questions[qid]),
)

const clozeAnswerRows = computed(() =>
  clozeQids.value
    .map((qid) => {
      const question = props.bucket.questions[qid]
      const answerRow = props.bucket.answers?.[qid] as Record<string, unknown> | undefined
      if (!question && !answerRow) return null

      const rawAnswer = answerRow?.answer
      const answer = Array.isArray(rawAnswer)
        ? rawAnswer.map((item) => String(item ?? '').trim()).filter(Boolean).join(' ')
        : typeof rawAnswer === 'string'
          ? rawAnswer.trim()
          : ''
      const concept = String(answerRow?.concept || '').trim()
      const note = String(answerRow?.note || '').trim()

      return {
        qid,
        answer,
        concept,
        noteHtml: note ? renderMarkdownInline(note) : '',
      }
    })
    .filter((row): row is { qid: string; answer: string; concept: string; noteHtml: string } => Boolean(row)),
)
const passageHtml = computed(() => {
  if (!passageRows.value.length) return ''
  return passageRows.value
    .map(({ en, zh }) => {
      const inner = wrapComprehensionClozePassageHtml(
        en,
        props.bucket.answers || {},
        props.bucket.questions || {},
        props.viewMode,
      )
      return (
        `<p class="${CLOZE_PASSAGE_PARA_CLASS}">${inner}</p>` +
        (zh ? `<div class="tpb-passage-zh tpb-zh-surface">${renderMarkdownInline(zh)}</div>` : '')
      )
    })
    .join('')
})

const reloadKey = computed(() => [passageHtml.value, props.viewMode, props.paperId].join('|'))
useComprehensionClozePassage(passageRoot, toRef(props, 'viewMode'), reloadKey, toRef(props, 'paperId'))
</script>

<template>
  <SectionShell
    :bucket="bucket"
    :nav-key="navKey"
    :active="active"
    :show-instructions="showInstructions"
  >
    <div
      v-if="passageHtml"
      ref="passageRoot"
      class="tpb-passage tpb-markdown text-[15px] leading-relaxed"
      v-html="passageHtml"
    />
    <AnswerCard v-if="viewMode === 'answers' && clozeAnswerRows.length" class="mt-4">
      <div class="tpb-answer-card-body space-y-3 text-sm">
        <div class="flex flex-wrap items-baseline justify-between gap-2">
          <div>
            <p class="tpb-answer-card-label">Answer list</p>
            <p class="tpb-answer-card-muted">Answer / concept / note</p>
          </div>
          <p class="tpb-answer-card-muted text-xs font-medium uppercase tracking-[0.08em]">
            {{ clozeAnswerRows.length }} items
          </p>
        </div>
        <ol class="space-y-3">
          <li
            v-for="row in clozeAnswerRows"
            :key="row.qid"
            class="rounded-lg border border-slate-200/80 bg-white/70 p-3"
          >
            <div class="flex items-start justify-between gap-4">
              <p class="min-w-0 flex-1 font-semibold text-slate-900">
                <span>Q{{ row.qid }}</span>
                <span v-if="row.answer" class="ml-2 tpb-answer-card-answer">{{ row.answer }}</span>
              </p>
              <p v-if="row.concept" class="shrink-0 text-right tpb-answer-card-concept font-medium">
                {{ row.concept }}
              </p>
            </div>
            <div
              v-if="row.noteHtml"
              class="mt-1 tpb-answer-card-muted tpb-stem"
              v-html="row.noteHtml"
            />
          </li>
        </ol>
      </div>
    </AnswerCard>
  </SectionShell>
</template>
