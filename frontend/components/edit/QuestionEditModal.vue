<template>
  <UModal
    v-model:open="isOpen"
    :title="dialogTitle"
    :description="subtitle"
    :ui="{ content: 'w-[84vw] max-w-[84vw]' }"
  >
    <template #body>
      <div class="space-y-4">
        <div class="flex flex-wrap items-center gap-2 border-b border-default pb-3">
          <UButton
            color="neutral"
            :variant="activeTab === 'question' ? 'solid' : 'ghost'"
            size="sm"
            icon="i-lucide-file-text"
            @click="activeTab = 'question'"
          >
            Question
          </UButton>
          <UButton
            color="neutral"
            :variant="activeTab === 'answer' ? 'solid' : 'ghost'"
            size="sm"
            icon="i-lucide-list-checks"
            @click="activeTab = 'answer'"
          >
            Answer
          </UButton>
        </div>

        <div v-if="activeTab === 'question'" class="grid gap-4 lg:grid-cols-[minmax(0,0.92fr)_minmax(0,1.08fr)]">
          <section class="space-y-3 rounded-xl border border-default bg-default/70 p-4">
            <div>
              <p class="text-sm font-medium text-highlighted">Question image</p>
              <p class="text-xs text-muted">
                {{ questionImageFilename || 'No image set' }}
              </p>
            </div>
            <div class="flex flex-wrap items-center gap-2">
              <UButton
                color="neutral"
                variant="outline"
                icon="i-lucide-image-up"
                @click="emit('request-question-upload', questionUploadTarget)"
              >
                Upload question image
              </UButton>
              <UButton
                v-if="questionImageFilename"
                color="neutral"
                variant="ghost"
                icon="i-lucide-x"
                @click="clearQuestionImage"
              >
                Remove
              </UButton>
            </div>
            <img
              v-if="questionImagePreviewUrl"
              class="max-h-72 w-full rounded-lg border border-default object-contain"
              :src="questionImagePreviewUrl"
              :alt="`Question ${questionId} image preview`"
            />
            <div
              v-else
              class="flex min-h-56 items-center justify-center rounded-lg border border-dashed border-default bg-default/60 text-sm text-muted"
            >
              No question image attached
            </div>
          </section>

          <section class="space-y-3 rounded-xl border border-default bg-default/70 p-4">
            <div>
              <p class="text-sm font-medium text-highlighted">Question JSON</p>
              <p class="text-xs text-muted">This tab keeps the question-side content only.</p>
            </div>
            <UTextarea
              v-model="questionJsonText"
              :rows="20"
              autoresize
              class="font-mono text-sm w-full"
              spellcheck="false"
            />
          </section>
        </div>

        <div v-else class="grid gap-4 lg:grid-cols-[minmax(0,0.92fr)_minmax(0,1.08fr)]">
          <section class="space-y-3 rounded-xl border border-default bg-default/70 p-4">
            <div>
              <p class="text-sm font-medium text-highlighted">Answer image</p>
              <p class="text-xs text-muted">
                {{ answerImageFilename || 'No image set' }}
              </p>
            </div>
            <div class="flex flex-wrap items-center gap-2">
              <UButton
                color="neutral"
                variant="outline"
                icon="i-lucide-image-up"
                @click="emit('request-answer-image-upload', answerUploadTarget)"
              >
                Upload answer image
              </UButton>
              <UButton
                v-if="answerImageFilename"
                color="neutral"
                variant="ghost"
                icon="i-lucide-x"
                @click="clearAnswerImage"
              >
                Remove
              </UButton>
            </div>
            <img
              v-if="answerImagePreviewUrl"
              class="max-h-72 w-full rounded-lg border border-default object-contain"
              :src="answerImagePreviewUrl"
              :alt="`Question ${questionId} answer image preview`"
            />
            <div
              v-else
              class="flex min-h-56 items-center justify-center rounded-lg border border-dashed border-default bg-default/60 text-sm text-muted"
            >
              No answer image attached
            </div>
          </section>

          <section class="space-y-3 rounded-xl border border-default bg-default/70 p-4">
            <div>
              <p class="text-sm font-medium text-highlighted">Answer JSON</p>
              <p class="text-xs text-muted">The image filename stays here together with the answer data.</p>
            </div>
            <UTextarea
              v-model="answerJsonText"
              :rows="20"
              autoresize
              class="font-mono text-sm w-full"
              spellcheck="false"
            />
          </section>
        </div>

        <UAlert v-if="error" color="error" variant="subtle" :title="error" />
      </div>
    </template>
    <template #footer>
      <div class="flex justify-between gap-2 w-full">
        <div class="flex items-center gap-2">
          <UButton color="neutral" variant="ghost" @click="close">Cancel</UButton>
        </div>
        <UButton :loading="saving" @click="save">Save</UButton>
      </div>
    </template>
  </UModal>
</template>

<script setup lang="ts">
import type { AnswerRow, QuestionRow } from '~/types/paper'
import {
  paperAssetUrl,
  questionImageFilename as resolveQuestionImageFilename,
  answerImageFilename as resolveAnswerImageFilename,
} from '~/utils/paperBundle'

type OpenPayload = {
  paperId: string
  subjectKey: string
  sectionId: string | number
  questionId: string
  question: QuestionRow
  answer?: AnswerRow
}

type SavePayload = {
  paperId: string
  subjectKey: string
  sectionId: string | number
  questionId: string
  question: QuestionRow
  answer?: AnswerRow
}

const props = defineProps<{
  title?: string
  saveFn?: (payload: SavePayload) => void | Promise<void>
}>()

const emit = defineEmits<{
  close: []
  'request-question-upload': [{ paperId: string; sectionId: string | number; questionId: string; filename: string }]
  'request-answer-image-upload': [{ paperId: string; sectionId: string | number; questionId: string; filename: string }]
}>()

const isOpen = ref(false)
const dialogTitle = computed(() => props.title || 'Edit question')
const subtitle = ref('')
const error = ref('')
const saving = ref(false)
const activeTab = ref<'question' | 'answer'>('question')

const paperId = ref('')
const subjectKey = ref('')
const sectionId = ref<string | number>('')
const questionId = ref('')
const visualVersion = ref('')

const questionJsonText = ref('{}')
const answerJsonText = ref('{}')
const questionImageFilename = ref('')
const answerImageFilename = ref('')
const questionImagePreviewUrl = ref('')
const answerImagePreviewUrl = ref('')

const questionUploadTarget = computed(() => ({
  paperId: paperId.value,
  sectionId: sectionId.value,
  questionId: questionId.value,
  filename: questionImageFilename.value || `q${questionId.value}.jpeg`,
}))

const answerUploadTarget = computed(() => ({
  paperId: paperId.value,
  sectionId: sectionId.value,
  questionId: questionId.value,
  filename: answerImageFilename.value || `a${questionId.value}.jpeg`,
}))

function cloneJsonObject<T extends Record<string, unknown>>(value: unknown): T {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {} as T
  return JSON.parse(JSON.stringify(value)) as T
}

function stripLegacyImageFields(row: Record<string, unknown>) {
  delete row.slide
  delete row.slide_filename
  delete row.slideFilename
  delete row.slide_image
  delete row.slideImage
  delete row.image_filename
  delete row.imageFilename
}

function syncImageRow(row: Record<string, unknown>, filename: string) {
  const next = String(filename || '').trim()
  if (next) {
    row.image = next
  } else {
    delete row.image
  }
  stripLegacyImageFields(row)
}

function syncJsonText(text: typeof questionJsonText, mutator: (row: Record<string, unknown>) => void) {
  try {
    const parsed = JSON.parse(text.value || '{}')
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return
    const row = parsed as Record<string, unknown>
    mutator(row)
    text.value = JSON.stringify(row, null, 2)
  } catch {
    /* ignore invalid JSON until save */
  }
}

function updateQuestionImagePreview() {
  if (!paperId.value || !subjectKey.value || !questionImageFilename.value) {
    questionImagePreviewUrl.value = ''
    return
  }
  questionImagePreviewUrl.value = paperAssetUrl(
    paperId.value,
    subjectKey.value,
    questionImageFilename.value,
    visualVersion.value,
  )
}

function updateAnswerImagePreview() {
  if (!paperId.value || !subjectKey.value || !answerImageFilename.value) {
    answerImagePreviewUrl.value = ''
    return
  }
  answerImagePreviewUrl.value = paperAssetUrl(
    paperId.value,
    subjectKey.value,
    answerImageFilename.value,
    visualVersion.value,
  )
}

function openModal(payload: OpenPayload) {
  paperId.value = String(payload.paperId || '')
  subjectKey.value = String(payload.subjectKey || 'english')
  sectionId.value = payload.sectionId
  questionId.value = String(payload.questionId || '')
  visualVersion.value = ''
  activeTab.value = 'question'

  const questionObject = cloneJsonObject<Record<string, unknown>>(payload.question)
  const answerObject = cloneJsonObject<Record<string, unknown>>(payload.answer)
  const nextQuestionImageFilename =
    resolveQuestionImageFilename(questionObject, questionId.value) ||
    (typeof questionObject.image === 'string' ? String(questionObject.image).trim() : '')
  const nextAnswerImageFilename =
    resolveAnswerImageFilename(questionObject, questionId.value, answerObject) ||
    (typeof answerObject.image === 'string' ? String(answerObject.image).trim() : '')

  syncImageRow(questionObject, nextQuestionImageFilename)
  syncImageRow(answerObject, nextAnswerImageFilename)

  questionImageFilename.value = nextQuestionImageFilename
  answerImageFilename.value = nextAnswerImageFilename
  subtitle.value = `Q${questionId.value}`
  questionJsonText.value = JSON.stringify(questionObject, null, 2)
  answerJsonText.value = JSON.stringify(answerObject, null, 2)
  error.value = ''
  saving.value = false
  isOpen.value = true
  updateQuestionImagePreview()
  updateAnswerImagePreview()
}

function close() {
  isOpen.value = false
  error.value = ''
  saving.value = false
  emit('close')
}

function clearQuestionImage() {
  questionImageFilename.value = ''
  syncJsonText(questionJsonText, (row) => {
    delete row.image
    stripLegacyImageFields(row)
  })
  updateQuestionImagePreview()
}

function clearAnswerImage() {
  answerImageFilename.value = ''
  syncJsonText(answerJsonText, (row) => {
    delete row.image
    stripLegacyImageFields(row)
  })
  updateAnswerImagePreview()
}

async function save() {
  error.value = ''

  let questionParsed: unknown
  let answerParsed: unknown

  try {
    questionParsed = JSON.parse(questionJsonText.value || '{}')
  } catch (e) {
    error.value = 'Invalid question JSON: ' + (e instanceof Error ? e.message : String(e))
    return
  }
  try {
    answerParsed = JSON.parse(answerJsonText.value || '{}')
  } catch (e) {
    error.value = 'Invalid answer JSON: ' + (e instanceof Error ? e.message : String(e))
    return
  }

  if (!questionParsed || typeof questionParsed !== 'object' || Array.isArray(questionParsed)) {
    error.value = 'Question must be a JSON object.'
    return
  }
  if (!answerParsed || typeof answerParsed !== 'object' || Array.isArray(answerParsed)) {
    error.value = 'Answer must be a JSON object.'
    return
  }

  const questionObject = questionParsed as Record<string, unknown>
  const answerObject = answerParsed as Record<string, unknown>

  stripLegacyImageFields(questionObject)
  stripLegacyImageFields(answerObject)

  const resolvedQuestionImageFilename = String(
    questionImageFilename.value ||
      resolveQuestionImageFilename(questionObject, questionId.value) ||
      (typeof questionObject.image === 'string' ? questionObject.image : '') ||
      '',
  ).trim()
  if (resolvedQuestionImageFilename) {
    syncImageRow(questionObject, resolvedQuestionImageFilename)
  } else {
    delete questionObject.image
  }

  const resolvedAnswerImageFilename = String(
    answerImageFilename.value ||
      resolveAnswerImageFilename(questionObject, questionId.value, answerObject) ||
      (typeof answerObject.image === 'string' ? answerObject.image : '') ||
      '',
  ).trim()
  if (resolvedAnswerImageFilename) {
    syncImageRow(answerObject, resolvedAnswerImageFilename)
  } else {
    delete answerObject.image
  }

  saving.value = true
  try {
    if (props.saveFn) {
      await props.saveFn({
        paperId: paperId.value,
        subjectKey: subjectKey.value,
        sectionId: sectionId.value,
        questionId: questionId.value,
        question: questionObject as QuestionRow,
        answer: answerObject,
      })
    }
    close()
  } catch (e) {
    error.value = e instanceof Error ? e.message : String(e)
  } finally {
    saving.value = false
  }
}

function setAnswerImageFilename(filename: string, version?: string) {
  answerImageFilename.value = String(filename || '').trim()
  if (version != null) {
    visualVersion.value = String(version || '')
  }
  syncJsonText(answerJsonText, (row) => {
    if (answerImageFilename.value) {
      syncImageRow(row, answerImageFilename.value)
    } else {
      delete row.image
      stripLegacyImageFields(row)
    }
  })
  updateAnswerImagePreview()
}

function setQuestionImageFilename(filename: string, version?: string) {
  questionImageFilename.value = String(filename || '').trim()
  if (version != null) {
    visualVersion.value = String(version || '')
  }
  syncJsonText(questionJsonText, (row) => {
    if (questionImageFilename.value) {
      syncImageRow(row, questionImageFilename.value)
    } else {
      delete row.image
      stripLegacyImageFields(row)
    }
  })
  updateQuestionImagePreview()
}

defineExpose({ open: openModal, close, setAnswerImageFilename, setQuestionImageFilename })
</script>
