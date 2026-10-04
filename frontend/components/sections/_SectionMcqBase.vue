<template>
  <SectionShell
    :bucket="bucket"
    :nav-key="navKey"
    :active="active"
    :show-instructions="showInstructions"
  >
    <PassageBlock
      v-if="showPassageComputed"
      :bucket="bucket"
      :paper-id="paperId"
      :subject-key="subjectKey"
      :view-mode="viewMode"
      :mode="passageModeComputed"
    />
    <div class="tpb-mcq-questions space-y-4">
      <template v-for="block in questionBlocks" :key="blockKey(block)">
        <div v-if="block.kind === 'group'" class="tpb-mcq-group space-y-2">
          <McqGroupIntro
            v-if="block.stem || groupImageUrl(block.groupId)"
            :stem="block.stem"
            :image-url="groupImageUrl(block.groupId)"
            :image-alt="`Questions ${block.groupId} image`"
            :math-mode="mathMode"
          />
          <QuestionMcq
            v-for="qid in block.qids"
            :key="qid"
            :qid="qid"
            :q="questionFor(qid)!"
            :answer-row="bucket.answers[qid]"
            :view-mode="viewMode"
            :paper-id="paperId"
            :subject-key="subjectKey"
            :section-id="bucket.sectionid"
            :section-stem="bucket.stem"
            :inline-answers="inlineAnswers"
            :options-per-line="mcqOptionsPerLine"
            :math-mode="mathMode"
          />
        </div>
        <McqGroupIntro
          v-else-if="block.kind === 'group_header'"
          :stem="block.stem"
          :math-mode="mathMode"
        />
        <QuestionMcq
          v-else-if="block.kind === 'question' && questionFor(block.qid)"
          :qid="block.qid"
          :q="questionFor(block.qid)!"
          :answer-row="bucket.answers[block.qid]"
          :view-mode="viewMode"
          :paper-id="paperId"
          :subject-key="subjectKey"
          :section-id="bucket.sectionid"
          :section-stem="bucket.stem"
          :inline-answers="inlineAnswers"
          :options-per-line="mcqOptionsPerLine"
          :math-mode="mathMode"
        />
      </template>
    </div>
  </SectionShell>
</template>

<script setup lang="ts">
import type { SectionBucket, ViewMode } from '~/types/paper'
import {
  mcqUiForSection,
  paperAssetUrl,
  questionImageFilename,
  questionRowForSection,
  sectionQuestionBlocks,
  type SectionQuestionBlock,
} from '~/utils/paperBundle'

const props = withDefaults(
  defineProps<{
    bucket: SectionBucket
    navKey: string
    paperId: string
    subjectKey: string
    sectionId?: string | number
    viewMode: ViewMode
    active?: boolean
    showInstructions?: boolean
    showPassage?: boolean
    passageMode?: 'images' | 'paragraphs' | 'dialogue' | 'writing'
    inlineAnswers?: boolean
    mathMode?: boolean
  }>(),
  { showPassage: false, inlineAnswers: true },
)

const questionBlocks = computed(() => sectionQuestionBlocks(props.bucket))
const sectionUi = computed(() => mcqUiForSection(props.bucket))

const showPassageComputed = computed(() =>
  sectionUi.value?.show_passage ?? props.showPassage,
)
const passageModeComputed = computed(() =>
  sectionUi.value?.passage_mode ?? props.passageMode ?? 'paragraphs',
)
const mcqOptionsPerLine = computed(() =>
  sectionUi.value?.options_per_line ?? 4,
)

function questionFor(qid: string) {
  return questionRowForSection(props.bucket, qid)
}

function blockKey(block: SectionQuestionBlock) {
  return block.kind === 'question' ? block.qid : `group-${block.groupId}`
}

function groupImageUrl(groupId: string) {
  const row = props.bucket.questions?.[groupId]
  if (!row) return ''
  const filename = questionImageFilename(row, groupId)
  return filename ? paperAssetUrl(props.paperId, props.subjectKey, filename) : ''
}
</script>
