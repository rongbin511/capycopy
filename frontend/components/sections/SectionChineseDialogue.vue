<script setup lang="ts">
import type { SectionBucket, ViewMode } from '~/types/paper'
import {
  CLOZE_PASSAGE_PARA_CLASS,
  chineseClozeResolvedAnswers,
  isPassageInlineQuestion,
  passageClozeList,
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
const qids = computed(() => questionIdsForSection(props.bucket))
const passages = computed(() => passageClozeList(props.bucket.passages))
const resolvedAnswers = computed(() => chineseClozeResolvedAnswers(props.bucket))

const dialogueBank = computed(() => {
  const passages = props.bucket.passages as { bank?: Record<string, unknown> } | undefined
  return passages?.bank || null
})

const standaloneQids = computed(() =>
  qids.value.filter((qid) => {
    if (isPassageInlineQuestion(props.bucket, qid)) return false
    const q = props.bucket.questions[qid]
    if (!q) return false
    if (String(q.stem_plain || '').trim()) return true
    return q.options != null
  }),
)

const passageHtml = computed(() => {
  if (!Array.isArray(passages.value)) return ''
  return passages.value
    .map((para) => {
      const inner = wrapComprehensionClozePassageHtml(
        String(para || ''),
        resolvedAnswers.value,
        {},
        props.viewMode,
      )
      return `<p class="${CLOZE_PASSAGE_PARA_CLASS}">${inner}</p>`
    })
    .join('')
})

const reloadKey = computed(() => [passageHtml.value, props.viewMode, props.paperId].join('|'))
useComprehensionClozePassage(passageRoot, toRef(props, 'viewMode'), reloadKey, toRef(props, 'paperId'), { inputWidth: '14em' })
</script>

<template>
  <SectionShell
    :bucket="bucket"
    :nav-key="navKey"
    :active="active"
    :show-instructions="showInstructions"
  >
    <ChineseDialogueOptionBank :options="dialogueBank" :items-per-line="2" />
    <div
      v-if="passageHtml"
      ref="passageRoot"
      class="tpb-passage tpb-markdown text-[15px] leading-relaxed"
      lang="zh-Hans"
      v-html="passageHtml"
    />
    <div v-if="standaloneQids.length" class="space-y-4">
      <QuestionMcq
        v-for="qid in standaloneQids"
        :key="qid"
        :qid="qid"
        :q="bucket.questions[qid]"
        :answer-row="bucket.answers[qid]"
        :view-mode="viewMode"
        :paper-id="paperId"
        :subject-key="subjectKey"
        :section-id="bucket.sectionid"
        :inline-answers="false"
      />
    </div>
  </SectionShell>
</template>
