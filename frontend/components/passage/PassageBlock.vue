<template>
  <div
    v-if="passageHtml"
    class="tpb-passage tpb-markdown text-[15px] leading-relaxed"
    :class="markdownThemeClass"
    v-html="passageHtml"
  />
</template>

<script setup lang="ts">
import { marked } from 'marked'
import type { SectionBucket, ViewMode } from '~/types/paper'
import { escapeHtml, renderPassageHtml } from '~/utils/paperBundle'

const props = defineProps<{
  bucket: SectionBucket
  paperId: string
  subjectKey: string
  viewMode?: ViewMode
  mode?: 'images' | 'paragraphs' | 'dialogue' | 'writing'
  plainTextPassage?: boolean
  markdownBody?: boolean
}>()

const { markdownStyle } = useViewerPreferences()
const studyReview = useStudyReviewStore()

const markdownThemeClass = computed(() => `tpb-markdown--${markdownStyle.value}`)

const studySelections = computed(() => {
  if (props.viewMode !== 'study') return {}
  const out: Record<string, string> = {}
  for (const qid of Object.keys(props.bucket.questions || {})) {
    const selected = studyReview.getSelection(props.paperId, qid)
    if (selected) out[qid] = selected
  }
  return out
})

const passageHtml = computed(() => {
  const html = renderPassageHtml(props.bucket, {
    mode: props.mode,
    paperId: props.paperId,
    subjectKey: props.subjectKey,
    sectionId: props.bucket.sectionid,
    viewMode: props.viewMode,
    studySelections: studySelections.value,
    plainTextPassage: props.plainTextPassage,
  })
  if (html) return html

  const body = props.bucket.passages?.body
  if (typeof body === 'string' && body) {
    return props.markdownBody === false ? escapeHtml(body) : (marked.parse(body) as string)
  }

  return ''
})
</script>
