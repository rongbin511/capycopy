<template>
  <SectionShell
    :bucket="bucket"
    :nav-key="navKey"
    :active="active"
    :show-instructions="showInstructions"
  >
    <div class="tpb-oe-questions">
      <template
        v-for="block in questionBlocks"
        :key="block.kind === 'question' ? block.qid : `group-${block.groupId}`"
      >
        <div v-if="block.kind === 'group'" class="tpb-oe-group">
          <OpenEndedGroupIntro
            :group-id="block.groupId"
            :stem="block.stem"
            :image-url="groupImageUrl(block.groupId)"
            :question="groupQuestion(block.groupId)"
            :view-mode="viewMode"
            :answer-row="groupAnswerRow(block.groupId)"
            :clickable="canEditQuestion"
            :math-mode="true"
            @edit="onEditGroupQuestion(block.groupId)"
          />
          <SectionOpenEndedQuestion
            v-for="qid in block.qids"
            :key="qid"
            :qid="qid"
            :question="questionFor(qid)!"
            :answer-row="answerRowFor(qid)"
            :view-mode="viewMode"
            :paper-id="paperId"
            :subject-key="subjectKey"
            :section-id="bucket.sectionid"
            :math-mode="true"
            :can-edit-question="false"
            hide-question-header
          />
        </div>
        <div
          v-else-if="block.kind === 'group_header'"
          class="tpb-stem text-sm sm:text-base"
          v-html="stemHtml(block.stem)"
        />
        <SectionOpenEndedQuestion
          v-else
          :qid="block.qid"
          :question="questionFor(block.qid)!"
          :answer-row="answerRowFor(block.qid)"
          :view-mode="viewMode"
          :paper-id="paperId"
          :subject-key="subjectKey"
          :section-id="bucket.sectionid"
          :math-mode="true"
          :can-edit-question="canEditQuestion"
          @edit="onEditQuestion"
        />
      </template>
    </div>
  </SectionShell>
</template>

<script setup lang="ts">
import type { AnswerRow, QuestionRow, SectionBucket, ViewMode } from '~/types/paper'
import {
  questionRowForSection,
  sectionQuestionBlocks,
  renderMarkdownInline,
  paperAssetUrl,
  questionImageFilename,
} from '~/utils/paperBundle'
import { useQuestionEditor } from '~/composables/useQuestionEditor'
import { synthesizedOpenEndedAnswerRow } from '~/utils/openEndedQuestion'

const props = defineProps<{
  bucket: SectionBucket
  navKey: string
  paperId: string
  subjectKey: string
  viewMode: ViewMode
  active?: boolean
  showInstructions?: boolean
}>()

const questionBlocks = computed(() => sectionQuestionBlocks(props.bucket))
const stemHtml = (text: string | undefined) => renderMarkdownInline(text || '')
const openQuestionEditorFn = useQuestionEditor()
const canEditQuestion = computed(() => props.viewMode === 'answers' && !!openQuestionEditorFn)

function questionFor(qid: string): QuestionRow | undefined {
  return questionRowForSection(props.bucket, qid)
}

function answerRowFor(qid: string): AnswerRow | undefined {
  const q = questionFor(qid)
  if (!q) return props.bucket.answers?.[qid] as AnswerRow | undefined
  return synthesizedOpenEndedAnswerRow(
    qid,
    q,
    props.bucket.answers as Record<string, AnswerRow | undefined>,
  )
}

function onEditQuestion(qid: string) {
  if (!openQuestionEditorFn) return
  const q = questionFor(qid)
  if (!q) return
  openQuestionEditorFn({
    paperId: props.paperId,
    subjectKey: props.subjectKey,
    sectionId: props.bucket.sectionid,
    questionId: qid,
    question: q,
    answer: props.bucket.answers?.[qid],
  })
}

function onEditGroupQuestion(groupId: string) {
  if (!openQuestionEditorFn) return
  const q = props.bucket.questions?.[groupId]
  if (!q) return
  openQuestionEditorFn({
    paperId: props.paperId,
    subjectKey: props.subjectKey,
    sectionId: props.bucket.sectionid,
    questionId: groupId,
    question: q,
    answer: props.bucket.answers?.[groupId],
  })
}

function groupImageUrl(groupId: string) {
  const row = props.bucket.questions?.[groupId]
  if (!row) return ''
  const filename = questionImageFilename(row, groupId)
  return filename ? paperAssetUrl(props.paperId, props.subjectKey, filename) : ''
}

function groupQuestion(groupId: string): QuestionRow | undefined {
  return props.bucket.questions?.[groupId]
}

function groupAnswerRow(groupId: string): AnswerRow | undefined {
  return props.bucket.answers?.[groupId] as AnswerRow | undefined
}
</script>
