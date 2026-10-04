<template>
  <div ref="viewerRoot" class="relative flex flex-col h-full min-h-0">
    <UDashboardNavbar :title="navbarTitle" class="border-b border-default shrink-0" :toggle="false">
      <template #right>
        <SectionToolbar
          :view-mode="viewMode"
          :writing-ui="activeWritingUi"
          :show-instructions="showInstructions"
          :note-pressed="noteVisible"
          :note-disabled="!activeSectionKey"
          :mark-available="viewMode === 'study' && activeSectionHasMcq"
          :mark-pressed="activeSectionReviewed"
          :mark-disabled="!activeSectionReviewed && !activeSectionAllAnswered"
          :mark-title="sectionMarkTitle"
          @mode="setViewMode"
          @toggle-instructions="toggleInstructions"
          @toggle-note="toggleNote"
          @study-pdf="downloadStudyPdf"
          @edit-model="openSectionModelEdit"
          @writing-image="openWritingImage"
          @mark="toggleSectionReview"
        />
      </template>
    </UDashboardNavbar>

    <div v-if="paper" class="border-b border-default bg-default px-4 py-1.5 overflow-x-auto shrink-0">
      <SectionPillNav
        :catalog-rows="catalogRows"
        :present-ids="presentIds"
        :active-key="activeSectionKey"
        :adding-id="addingSectionId"
        @select="activateSection"
        @add="addSection"
      />
    </div>

    <div
      class="tpb-paper-stage flex-1 overflow-y-auto min-h-0"
      :style="{ '--tpb-paper-zoom': String(paperZoom) }"
    >
      <div v-if="loading" class="flex items-center justify-center py-20">
        <UIcon name="i-lucide-loader-circle" class="size-8 animate-spin text-muted" />
      </div>
      <UAlert
        v-else-if="!paperId"
        color="neutral"
        variant="subtle"
        icon="i-lucide-mouse-pointer-click"
        title="Select a paper"
        description="Choose a paper from the sidebar to start."
      />
      <UAlert
        v-else-if="error"
        color="error"
        variant="subtle"
        icon="i-lucide-circle-alert"
        :title="error"
      />
      <div v-else-if="paper" class="space-y-6 py-6">
        <template v-if="!noteVisible">
          <template v-for="(sec, idx) in orderedSections" :key="sectionNavKey(sec) + ':' + paperContentKey">
            <component
              :is="resolveSectionComponent(sec.stem)"
              v-if="showAllSections || sectionNavKey(sec) === activeSectionKey"
              :bucket="sec"
              :nav-key="sectionNavKey(sec)"
              :paper-id="paper.paperid"
              :subject-key="paper.paper.subject_key"
              :view-mode="viewMode"
              :active="sectionNavKey(sec) === activeSectionKey"
              :show-instructions="showInstructions"
            />
          </template>
        </template>
        <div v-else class="mx-auto w-full max-w-4xl">
          <div class="rounded-2xl border border-default bg-default px-4 py-4 shadow-sm">
            <div class="mb-3 flex items-center justify-between gap-3">
              <div>
                <h3 class="text-sm font-semibold text-highlighted">Note</h3>
                <p class="text-xs text-muted">
                  {{ noteSubtitle }}
                </p>
              </div>
              <div class="flex items-center gap-2">
                <UButton
                  color="neutral"
                  variant="ghost"
                  icon="i-lucide-pencil-line"
                  :disabled="noteLoading"
                  @click="openNoteEdit"
                >
                  Edit
                </UButton>
                <UButton color="neutral" variant="ghost" icon="i-lucide-x" @click="toggleNote">
                  Close
                </UButton>
              </div>
            </div>
            <UAlert
              v-if="noteError"
              color="error"
              variant="subtle"
              icon="i-lucide-circle-alert"
              :title="noteError"
            />
            <div
              v-else-if="noteLoading"
              class="flex items-center gap-2 rounded-xl border border-default bg-default/60 px-4 py-3 text-sm text-muted"
            >
              <UIcon name="i-lucide-loader-circle" class="size-4 animate-spin" />
              Loading note…
            </div>
            <div
              v-else-if="noteHtml"
              class="tpb-note tpb-markdown prose max-w-none rounded-xl bg-default/70 px-4 py-4"
              :class="markdownThemeClass"
              v-html="noteHtml"
            />
            <UAlert
              v-else
              color="neutral"
              variant="subtle"
              icon="i-lucide-file-text"
              title="No note available"
              description="This section does not have a note.md file yet."
            />
          </div>
        </div>
      </div>
    </div>

    <SectionModelEditModal
      ref="sectionModelModal"
      title="Edit model"
      :save-fn="saveSectionModel"
      @request-passage-upload="onPassageImageUpload"
    />
    <QuestionEditModal
      ref="questionModal"
      title="Edit question"
      :save-fn="saveQuestion"
      @request-question-upload="onQuestionImageUpload"
      @request-answer-image-upload="onAnswerImageUpload"
    />
    <MarkdownEditModal ref="noteModal" title="Edit note markdown" :subtitle="noteSubtitle" :save-fn="saveNote" />
    <ImageUploadModal ref="imageModal" @saved="onImageSaved" />
  </div>
</template>

<script setup lang="ts">
import { marked } from 'marked'
import type { CombinedManifest, EnrichedPaperBundle } from '~/types/paper'
import {
  isComprehensionOpenEndedSection,
  isPassageClozeWordQuestion,
  isPassageInlineQuestion,
  isSectionAnswerableQuestion,
  isVisualMcqSection,
  isWritingSection,
  paperSectionsOrdered,
  questionHasMcqOptions,
  questionIdsForSection,
  sectionNavKey,
  sectionsByIdMap,
  writingUiForSection,
} from '~/utils/paperBundle'
import { clozeWordAnswerMatches } from '~/utils/clozeWord'
import { isInlineRadioInteraction } from '~/utils/openEndedQuestion'
import { provideQuestionEditor, type QuestionEditorPayload } from '~/composables/useQuestionEditor'
import { sectionComponentForStem } from '~/utils/sectionRegistry'
import { sectionsFromManifest, useTpbApi } from '~/composables/useTpbApi'
import { papersForUserLevel } from '~/composables/useCurrentUser'
import SectionFallback from '~/components/sections/SectionFallback.vue'

const props = defineProps<{
  subject: string
  manifest: CombinedManifest
}>()

const route = useRoute()
const router = useRouter()
const api = useTpbApi()
const paperSidebar = usePaperSidebar()
const { currentUser } = useCurrentUser()
const { viewMode, showInstructions, setViewMode, setShowInstructions, paperZoom, markdownStyle } = useViewerPreferences()
const studyReview = useStudyReviewStore()

function toggleInstructions() {
  setShowInstructions(!showInstructions.value)
}

function toggleNote() {
  noteVisible.value = !noteVisible.value
  if (noteVisible.value) {
    void loadActiveSectionNote()
  }
}

const paper = ref<EnrichedPaperBundle | null>(null)
const paperContentKey = ref(0)
const loading = ref(false)
const error = ref('')
const noteVisible = ref(false)
const noteLoading = ref(false)
const noteError = ref('')
const noteMarkdown = ref('')
const noteHtml = ref('')
const markdownThemeClass = computed(() => `tpb-markdown--${markdownStyle.value}`)
const noteSubtitle = computed(() => {
  const b = activeBucket.value
  if (!b) return ''
  return `${b.title || b.stem} · ${String(b.sectionid || '')}`
})
const activeSectionKey = ref('')
const addingSectionId = ref('')
const editSectionId = ref('')
let noteRequestId = 0

const catalog = computed(() => sectionsFromManifest(props.manifest))
const subjectBlock = computed(() => props.manifest.subjects[props.subject])
const subjectLabel = computed(() => subjectBlock.value?.label || props.subject)

const levelFilteredPapers = computed(() =>
  papersForUserLevel(subjectBlock.value?.papers, currentUser.value?.level || ''),
)

const paperId = computed(() => {
  const queryPaper = typeof route.query.paper === 'string' ? route.query.paper : ''
  const papers = levelFilteredPapers.value
  if (queryPaper && papers.some((p) => p.id === queryPaper)) return queryPaper
  const fallback = subjectBlock.value?.default || ''
  if (fallback && papers.some((p) => p.id === fallback)) return fallback
  return papers[0]?.id || queryPaper || fallback || ''
})

const navbarTitle = computed(() => {
  if (!paper.value) return subjectLabel.value
  return paper.value.paper.navTitle || paper.value.paper.title || paperId.value
})

const showAllSections = computed(() => {
  const q = route.query
  return q.all === '1' || q.sections === 'all' || q.full === '1'
})

const routeSectionKey = computed(() =>
  typeof route.query.section === 'string' ? route.query.section : '',
)

const yearGroups = computed(() => {
  const papers = levelFilteredPapers.value
  const map = new Map<string, typeof papers>()
  for (const p of papers) {
    const y = String(p.year)
    if (!map.has(y)) map.set(y, [])
    map.get(y)!.push(p)
  }
  return [...map.entries()]
    .sort((a, b) => Number(b[0]) - Number(a[0]))
    .map(([year, ps]) => ({ year, papers: ps }))
})

const catalogRows = computed(() => {
  const ids = catalog.value.subjects[props.subject]?.sectionids || []
  return ids.map((sid) => {
    const row = catalog.value.sections[sid]
    return {
      sectionId: sid,
      stem: row?.stem || sid,
      label: row?.label || sid,
      title: row?.title || sid,
    }
  })
})

const presentIds = computed(() => {
  if (!paper.value) return new Set<string>()
  return new Set(Object.keys(sectionsByIdMap(paper.value)))
})

const orderedSections = computed(() =>
  paper.value ? paperSectionsOrdered(paper.value, catalog.value) : [],
)

const activeBucket = computed(() => {
  if (!paper.value || !activeSectionKey.value) return null
  return (
    orderedSections.value.find((sec) => sectionNavKey(sec) === activeSectionKey.value) ||
    paper.value.sections[activeSectionKey.value] ||
    null
  )
})

const activeSectionQuestionIds = computed(() =>
  activeBucket.value ? questionIdsForSection(activeBucket.value) : [],
)

const activeSectionHasMcq = computed(() =>
  !!activeBucket.value &&
  activeSectionQuestionIds.value.some((qid) =>
    isSectionAnswerableQuestion(activeBucket.value!, qid),
  ),
)

const activeSectionAnsweredCount = computed(() => {
  if (!paperId.value || !activeBucket.value) return 0
  return activeSectionQuestionIds.value.filter(
    (qid) =>
      isSectionAnswerableQuestion(activeBucket.value!, qid) &&
      !!studyReview.getSelection(paperId.value, qid),
  ).length
})

const activeSectionAnswerableCount = computed(() => {
  if (!activeBucket.value) return 0
  return activeSectionQuestionIds.value.filter((qid) =>
    isSectionAnswerableQuestion(activeBucket.value!, qid),
  ).length
})

const activeSectionAllAnswered = computed(() =>
  activeSectionHasMcq.value &&
  activeSectionAnswerableCount.value > 0 &&
  activeSectionAnsweredCount.value === activeSectionAnswerableCount.value,
)

const activeSectionReviewed = computed(() =>
  !!paperId.value &&
  !!activeBucket.value &&
  studyReview.isSectionReviewed(paperId.value, String(activeBucket.value.sectionid || '')),
)

const activeWritingUi = computed(() =>
  activeBucket.value ? writingUiForSection(activeBucket.value) : null,
)

const sectionMarkTitle = computed(() => {
  if (!activeSectionHasMcq.value || !paperId.value || !activeBucket.value) return ''
  if (activeSectionReviewed.value) return 'Unmark this section'
  if (!activeSectionAllAnswered.value) {
    return `Answer every question in this section first (${activeSectionAnsweredCount.value} / ${activeSectionAnswerableCount.value})`
  }
  return `Mark this section (${activeSectionAnsweredCount.value} / ${activeSectionAnswerableCount.value} answered)`
})

function sectionIdForActiveBucket() {
  return activeBucket.value ? String(activeBucket.value.sectionid || '') : ''
}

function buildSectionErrors(section: typeof activeBucket.value) {
  const out: Record<string, string> = {}
  if (!section) return out
  for (const qid of questionIdsForSection(section)) {
    const q = section.questions[qid]
    if (!q) continue
    if (!isSectionAnswerableQuestion(section, qid)) continue
    const picked = String(studyReview.getSelection(paperId.value, qid) || '').trim()
    const answerRow = section.answers[qid] as Record<string, unknown> | undefined
    const answer = answerRow && answerRow.answer != null ? String(answerRow.answer).trim() : ''
    if (isPassageClozeWordQuestion(section, qid)) {
      if (!picked || !answer || clozeWordAnswerMatches(picked, answer)) continue
      out[String(qid)] = picked
      continue
    }
    if (isPassageInlineQuestion(section, qid)) {
      // §301 / dialogue bank: answers are option keys (e.g. "3").
      if (!picked || !answer || picked === answer) continue
      out[String(qid)] = picked
      continue
    }
    if (isInlineRadioInteraction(String(q.interaction || ''))) {
      if (!picked || !answer || picked === answer) continue
      out[String(qid)] = picked
      continue
    }
    if (!questionHasMcqOptions(q)) continue
    if (!picked || !answer || picked === answer) continue
    out[String(qid)] = picked
  }
  return out
}

async function sendSectionMarking(reviewed: boolean) {
  if (!paperId.value || !activeBucket.value) return
  const sectionId = sectionIdForActiveBucket()
  if (!sectionId) return
  const errors = reviewed ? buildSectionErrors(activeBucket.value) : {}
  const res = await fetch(
    `/api/papers/${encodeURIComponent(paperId.value)}/marking/${encodeURIComponent(sectionId)}`,
    {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ paper_id: paperId.value, errors }),
    },
  )
  const body = await res.json().catch(() => ({}))
  if (!res.ok) {
    throw new Error(typeof body.detail === 'string' ? body.detail : res.statusText)
  }
}

const editSubtitle = computed(() => {
  const b = activeBucket.value
  if (!b) return ''
  return `${b.title || b.stem} · ${paperId.value}`
})

const sectionModelModal = ref<{ show: (payload: unknown) => void; close: () => void } | null>(null)
const questionModal = ref<{
  open: (payload: QuestionEditorPayload) => void
  close: () => void
  setAnswerImageFilename: (filename: string, visualVersion?: string) => void
  setQuestionImageFilename: (filename: string, visualVersion?: string) => void
} | null>(null)
const noteModal = ref<{ show: (content: string) => void; close: () => void } | null>(null)
const imageModal = ref<{
  open: (payload: {
    kind: 'writing' | 'question-image' | 'answer-image'
    paperId: string
    sectionId?: string | number
    questionId?: string
    filename: string
  }) => void
} | null>(null)
const viewerRoot = ref<HTMLElement | null>(null)

provideQuestionEditor(openQuestionEditor)

function resolveSectionComponent(stem: string) {
  return sectionComponentForStem(stem) || SectionFallback
}

async function loadPaper(id: string, opts?: { bypassCache?: boolean }) {
  if (!id) return
  loading.value = true
  error.value = ''
  try {
    paper.value = await api.getPaper(id, { bypassCache: opts?.bypassCache })
    const sections = paperSectionsOrdered(paper.value, catalog.value)
    const querySection = routeSectionKey.value
    const queryMatch = querySection
      ? sections.find((sec) => sectionNavKey(sec) === querySection) || paper.value.sections[querySection] || null
      : null
    if (queryMatch) {
      activeSectionKey.value = sectionNavKey(queryMatch)
    } else if (!activeSectionKey.value && sections[0]) {
      activateSection(sectionNavKey(sections[0]))
    } else if (activeSectionKey.value && !sections.some((sec) => sectionNavKey(sec) === activeSectionKey.value) && sections[0]) {
      activateSection(sectionNavKey(sections[0]))
    }
  } catch (e) {
    error.value = e instanceof Error ? e.message : String(e)
  } finally {
    loading.value = false
  }
}

async function refreshPaperAfterEdit() {
  const id = paperId.value
  if (!id) return
  const sectionKey = activeSectionKey.value
  api.invalidatePaper(id)
  try {
    paper.value = await api.getPaper(id, { bypassCache: true })
    paperContentKey.value += 1
    if (sectionKey && paper.value.sections[sectionKey]) {
      activeSectionKey.value = sectionKey
    }
  } catch (e) {
    error.value = e instanceof Error ? e.message : String(e)
  }
}

async function loadActiveSectionNote() {
  const b = activeBucket.value
  if (!paper.value || !b || !noteVisible.value) {
    noteMarkdown.value = ''
    noteHtml.value = ''
    noteError.value = ''
    noteLoading.value = false
    return
  }
  const sectionId = String(b.sectionid || '')
  if (!sectionId) {
    noteMarkdown.value = ''
    noteHtml.value = ''
    noteError.value = ''
    noteLoading.value = false
    return
  }
  const subjectKey = paper.value.paper.subject_key || props.subject
  const requestId = ++noteRequestId
  noteLoading.value = true
  noteError.value = ''
  try {
    const res = await fetch(
      `/papers/${encodeURIComponent(subjectKey)}/${encodeURIComponent(sectionId)}/note.md`,
      { cache: 'no-store' },
    )
    if (requestId !== noteRequestId) return
    if (res.status === 404) {
      noteMarkdown.value = ''
      noteHtml.value = ''
      return
    }
    const md = await res.text()
    if (!res.ok) {
      throw new Error(md || res.statusText)
    }
    noteMarkdown.value = md
    noteHtml.value = marked.parse(md, { gfm: true, breaks: false }) as string
  } catch (e) {
    if (requestId !== noteRequestId) return
    noteMarkdown.value = ''
    noteHtml.value = ''
    noteError.value = e instanceof Error ? e.message : String(e)
  } finally {
    if (requestId === noteRequestId) {
      noteLoading.value = false
    }
  }
}

function activateSection(key: string) {
  activeSectionKey.value = key
  if (!import.meta.client) return
  const nextUrl = new URL(window.location.href)
  nextUrl.searchParams.set('section', key)
  window.history.replaceState(window.history.state, '', `${nextUrl.pathname}${nextUrl.search}${nextUrl.hash}`)
  const b = paper.value?.sections[key]
  if (b?.title) document.title = b.title
}

async function addSection(sectionId: string) {
  if (!paperId.value) return
  addingSectionId.value = sectionId
  try {
    const res = await fetch(
      `/api/papers/${encodeURIComponent(paperId.value)}/sections/${encodeURIComponent(sectionId)}`,
      { method: 'POST', headers: { Accept: 'application/json' } },
    )
    const body = await res.json()
    if (!res.ok) throw new Error(typeof body.detail === 'string' ? body.detail : res.statusText)
    if (body.sections) paper.value!.sections = body.sections
    else if (body.section) paper.value!.sections[sectionId] = body.section
    api.setPaper(paperId.value, paper.value!)
    await loadPaper(paperId.value)
    activateSection(sectionId)
  } catch (e) {
    alert(e instanceof Error ? e.message : String(e))
  } finally {
    addingSectionId.value = ''
  }
}

function sectionBucketForEdit(bucket: NonNullable<typeof activeBucket.value>) {
  return {
    questions: bucket.questions || {},
    answers: bucket.answers || {},
    passages: bucket.passages || {},
  }
}

function openSectionModelEdit() {
  const b = activeBucket.value
  if (!b || !paperId.value) return
  editSectionId.value = activeSectionKey.value
  const bucketPayload = sectionBucketForEdit(b)
  sectionModelModal.value?.show({
    subtitle: editSubtitle.value,
    writingMode: isWritingSection(b),
    showPassageImage: isComprehensionOpenEndedSection(b),
    showVisualImages: isVisualMcqSection(b),
    paperId: paperId.value,
    subjectKey: paper.value?.paper.subject_key || props.subject,
    sectionId: b.sectionid,
    initialTab: 'all',
    allJsonText: JSON.stringify(bucketPayload, null, 2),
    passageJsonText: isWritingSection(b)
      ? JSON.stringify(
          {
            questions: bucketPayload.questions,
            answers: bucketPayload.answers,
          },
          null,
          2,
        )
      : JSON.stringify(bucketPayload.passages || {}, null, 2),
    questionsJsonText: JSON.stringify(bucketPayload.questions, null, 2),
    answersJsonText: JSON.stringify(bucketPayload.answers, null, 2),
  })
}

function openNoteEdit() {
  if (!paperId.value || !activeBucket.value || !noteVisible.value) return
  noteModal.value?.show(noteMarkdown.value || '')
}

function toggleSectionReview() {
  if (!paperId.value || !activeBucket.value) return
  if (activeSectionReviewed.value) {
    sendSectionMarking(false)
      .then(() => {
        studyReview.setSectionReviewed(paperId.value, String(activeBucket.value.sectionid || ''), false)
      })
      .catch((e) => {
        alert(e instanceof Error ? e.message : String(e))
      })
    return
  }
  if (!activeSectionAllAnswered.value) return
  sendSectionMarking(true)
    .then(() => {
      studyReview.setSectionReviewed(paperId.value, String(activeBucket.value.sectionid || ''), true)
    })
    .catch((e) => {
      alert(e instanceof Error ? e.message : String(e))
    })
}

async function saveSectionModel(payload: { tab: 'all' | 'passage' | 'questions' | 'answers'; value: unknown }) {
  if (!paperId.value || !editSectionId.value) return
  if (payload.tab === 'all') {
    await api.replaceSection(paperId.value, editSectionId.value, payload.value)
    await refreshPaperAfterEdit()
    return
  }
  if (payload.tab === 'questions') {
    await api.updateSectionQuestions(paperId.value, editSectionId.value, payload.value)
    await refreshPaperAfterEdit()
    return
  }
  if (payload.tab === 'answers') {
    await api.updateSectionAnswers(paperId.value, editSectionId.value, payload.value)
    await refreshPaperAfterEdit()
    return
  }
  if (isWritingSection(activeBucket.value)) {
    const body = (payload.value && typeof payload.value === 'object' && !Array.isArray(payload.value) ? payload.value : {}) as {
      questions?: unknown
      answers?: unknown
    }
    await api.updateSectionQuestions(paperId.value, editSectionId.value, body.questions || {})
    await api.updateSectionAnswers(paperId.value, editSectionId.value, body.answers || {})
    await refreshPaperAfterEdit()
    return
  }
  const res = await fetch(
    `/api/papers/${encodeURIComponent(paperId.value)}/passages/${encodeURIComponent(editSectionId.value)}`,
    {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ passage: payload.value }),
    },
  )
  if (!res.ok) throw new Error((await res.text()) || res.statusText)
  await refreshPaperAfterEdit()
}

function openQuestionEditor(payload: QuestionEditorPayload) {
  if (!paperId.value || !payload.questionId) return
  questionModal.value?.open(payload)
}

async function saveQuestion(payload: QuestionEditorPayload) {
  if (!payload.paperId || !payload.sectionId || !payload.questionId) return
  await api.updateQuestion(
    payload.paperId,
    payload.sectionId,
    payload.questionId,
    payload.question,
  )
  await api.updateAnswer(
    payload.paperId,
    payload.sectionId,
    payload.questionId,
    payload.answer || {},
  )
  await refreshPaperAfterEdit()
}

async function saveNote(payload: { markdown: string }) {
  if (!paperId.value || !activeBucket.value) return
  const sectionId = sectionIdForActiveBucket()
  if (!sectionId) return
  await api.updateSectionNote(paperId.value, sectionId, payload.markdown)
  await loadActiveSectionNote()
}

function openWritingImage() {
  const sectionId = sectionIdForActiveBucket()
  const ui = activeWritingUi.value
  if (!paperId.value || !sectionId || !activeBucket.value || !ui?.show_image_upload) return
  const questions = activeBucket.value.questions as { image?: string } | undefined
  const filename = String(questions?.image || '').trim()
  if (!filename) return
  openVisualImageUpload(sectionId, filename)
}

function openVisualImageUpload(sectionId: string, filename: string) {
  if (!paperId.value || !sectionId || !filename) return
  imageModal.value?.open({
    kind: 'writing',
    paperId: paperId.value,
    sectionId,
    filename,
  })
}

function onPassageImageUpload(target: { paperId: string; sectionId: string | number; filename: string }) {
  if (!target.paperId || target.sectionId == null || target.sectionId === '') return
  imageModal.value?.open({
    kind: 'passage-image',
    paperId: target.paperId,
    sectionId: target.sectionId,
    filename: target.filename,
    filenameAutoFromSource: false,
  })
}

function onQuestionImageUpload(target: { paperId: string; sectionId: string | number; questionId: string; filename: string }) {
  if (!target.paperId || !target.questionId) return
  imageModal.value?.open({
    kind: 'question-image',
    paperId: target.paperId,
    sectionId: target.sectionId,
    questionId: target.questionId,
    filename: target.filename,
    filenameAutoFromSource: false,
  })
}

function onAnswerImageUpload(target: { paperId: string; sectionId: string | number; questionId: string; filename: string }) {
  if (!target.paperId || !target.questionId) return
  imageModal.value?.open({
    kind: 'answer-image',
    paperId: target.paperId,
    sectionId: target.sectionId,
    questionId: target.questionId,
    filename: target.filename,
    filenameAutoFromSource: false,
  })
}

async function onImageSaved(payload: {
  kind: 'writing' | 'question-image' | 'answer-image' | 'passage-image'
  paperId: string
  sectionId?: string
  questionId?: string
  filename: string
  visualAssetsVersion?: string
}) {
  if (payload.kind === 'question-image' && payload.questionId) {
    questionModal.value?.setQuestionImageFilename(payload.filename, payload.visualAssetsVersion)
  }
  if (payload.kind === 'answer-image' && payload.questionId) {
    questionModal.value?.setAnswerImageFilename(payload.filename, payload.visualAssetsVersion)
  }
  if (payload.kind === 'passage-image') {
    sectionModelModal.value?.setPassageImageFilename(payload.filename, payload.visualAssetsVersion)
  }
  await refreshPaperAfterEdit()
}

function handleViewerClick(e: MouseEvent) {
  const target = e.target as HTMLElement | null
  const inlineOpt = target?.closest?.('.tpb-inline-mcq-opt') as HTMLElement | null
  if (inlineOpt && viewerRoot.value?.contains(inlineOpt)) {
    e.preventDefault()
    e.stopPropagation()
    const questionId = inlineOpt.getAttribute('data-question-id') || ''
    const opt = inlineOpt.getAttribute('data-opt') || ''
    if (!paperId.value || !questionId || !opt) return
    const current = studyReview.getSelection(paperId.value, questionId)
    studyReview.setSelection(paperId.value, questionId, current === opt ? '' : opt)
    return
  }

  const questionMarker = target?.closest?.('.tpb-inline-question-marker')
  if (questionMarker && viewerRoot.value?.contains(questionMarker)) {
    e.preventDefault()
    e.stopPropagation()
    const sectionId = questionMarker.getAttribute('data-section-id') || ''
    const questionId = questionMarker.getAttribute('data-question-id') || ''
    const bucket = paper.value?.sections[String(sectionId)]
    const question = bucket?.questions?.[String(questionId)]
    const answer = bucket?.answers?.[String(questionId)]
    if (!paper.value || !bucket || !questionId || !question) return
    questionModal.value?.open({
      paperId: paper.value.paperid,
      subjectKey: paper.value.paper.subject_key,
      sectionId: bucket.sectionid,
      questionId,
      question,
      answer,
    })
    return
  }

  const visualBtn = target?.closest?.('.tpb-visual-figure-upload-btn')
  if (!visualBtn || !viewerRoot.value?.contains(visualBtn)) return
  e.preventDefault()
  e.stopPropagation()
  const fig = visualBtn.closest('.tpb-visual-figure')
  const sectionId = visualBtn.getAttribute('data-section-id') || fig?.getAttribute('data-section-id') || ''
  const filename = visualBtn.getAttribute('data-visual-filename') || fig?.getAttribute('data-visual-filename') || ''
  if (!sectionId || !filename) return
  openVisualImageUpload(sectionId, filename)
}

function handleViewerChange(e: Event) {
  const target = e.target as HTMLElement | null
  const select = target?.closest?.('.tpb-inline-mcq-select') as HTMLSelectElement | null
  if (!select || !viewerRoot.value?.contains(select)) return
  const questionId = select.getAttribute('data-question-id') || ''
  if (!paperId.value || !questionId) return
  studyReview.setSelection(paperId.value, questionId, select.value || '')
}

function downloadStudyPdf() {
  if (!paperId.value || !activeSectionKey.value) return
  window.open(
    `/api/papers/${encodeURIComponent(paperId.value)}/sections/${activeSectionKey.value}/study-pdf`,
    '_blank',
  )
}

watch(
  () => props.subject,
  () => {
    activeSectionKey.value = ''
    paper.value = null
    error.value = ''
  },
)

watch(
  () => [props.subject, subjectLabel.value, paperId.value, yearGroups.value, currentUser.value?.level] as const,
  () => {
    if (!props.manifest.subjects[props.subject]) return
    paperSidebar.enable({
      subject: props.subject,
      subjectLabel: subjectLabel.value,
      yearGroups: yearGroups.value,
      paperId: paperId.value,
    })
  },
  { immediate: true },
)

watch(
  () => [paperId.value, route.query.paper] as const,
  ([effectiveId, queryPaper]) => {
    if (!effectiveId || effectiveId === queryPaper) return
    router.replace({
      path: route.path,
      query: { ...route.query, paper: effectiveId },
    })
  },
)

watch(paperId, (id) => paperSidebar.setPaperId(id))

watch(routeSectionKey, (key) => {
  if (key && key !== activeSectionKey.value) {
    activeSectionKey.value = key
  }
})

watch(
  () => [activeSectionKey.value, noteVisible.value, paper.value?.paper.subject_key] as const,
  () => {
    if (noteVisible.value) {
      void loadActiveSectionNote()
    } else {
      noteHtml.value = ''
      noteError.value = ''
      noteLoading.value = false
    }
  },
)

onBeforeRouteLeave((to) => {
  if (!to.path.startsWith('/papers/')) {
    paperSidebar.disable()
  }
})

watch(
  () => paperId.value,
  (id) => {
    if (id) loadPaper(id)
  },
  { immediate: true },
)

onMounted(() => {
  viewerRoot.value?.addEventListener('click', handleViewerClick)
  viewerRoot.value?.addEventListener('change', handleViewerChange)
  const initialSection = routeSectionKey.value
  if (initialSection) activeSectionKey.value = initialSection
})

onBeforeUnmount(() => {
  viewerRoot.value?.removeEventListener('click', handleViewerClick)
  viewerRoot.value?.removeEventListener('change', handleViewerChange)
})
</script>
