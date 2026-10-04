<template>
  <UModal
    v-model:open="isOpen"
    :title="title"
    :description="subtitle"
    :ui="{ content: 'w-[86vw] max-w-[86vw]' }"
  >
    <template #body>
      <div class="space-y-4">
        <div class="flex flex-wrap items-center gap-2 border-b border-default pb-3">
          <UButton
            color="neutral"
            :variant="activeTab === 'all' ? 'solid' : 'ghost'"
            size="sm"
            icon="i-lucide-braces"
            @click="activeTab = 'all'"
          >
            All
          </UButton>
          <UButton
            color="neutral"
            :variant="activeTab === 'passage' ? 'solid' : 'ghost'"
            size="sm"
            icon="i-lucide-file-text"
            @click="activeTab = 'passage'"
          >
            Passage
          </UButton>
          <UButton
            color="neutral"
            :variant="activeTab === 'questions' ? 'solid' : 'ghost'"
            size="sm"
            icon="i-lucide-list"
            @click="activeTab = 'questions'"
          >
            Questions
          </UButton>
          <UButton
            color="neutral"
            :variant="activeTab === 'answers' ? 'solid' : 'ghost'"
            size="sm"
            icon="i-lucide-list-checks"
            @click="activeTab = 'answers'"
          >
            Answers
          </UButton>
        </div>

        <div
          v-if="activeTab === 'passage' && showPassageImage"
          class="grid gap-4 lg:grid-cols-[minmax(0,0.92fr)_minmax(0,1.08fr)]"
        >
          <section class="space-y-3 rounded-xl border border-default bg-default/70 p-4">
            <div>
              <p class="text-sm font-medium text-highlighted">Passage image</p>
              <p class="text-xs text-muted">
                Shown in answer mode only. Stored as <code class="rounded bg-default px-1 py-0.5">passages.image</code>.
              </p>
              <p class="mt-1 text-xs text-muted">
                {{ passageImageFilename || 'No image set' }}
              </p>
            </div>
            <div class="flex flex-wrap items-center gap-2">
              <UButton
                color="neutral"
                variant="outline"
                icon="i-lucide-image-up"
                @click="emit('request-passage-upload', passageUploadTarget)"
              >
                Upload passage image
              </UButton>
              <UButton
                v-if="passageImageFilename"
                color="neutral"
                variant="ghost"
                icon="i-lucide-x"
                @click="clearPassageImage"
              >
                Remove
              </UButton>
            </div>
            <img
              v-if="passageImagePreviewUrl"
              class="max-h-72 w-full rounded-lg border border-default object-contain"
              :src="passageImagePreviewUrl"
              alt="Passage image preview"
            />
            <div
              v-else
              class="flex min-h-56 items-center justify-center rounded-lg border border-dashed border-default bg-default/60 text-sm text-muted"
            >
              No passage image attached
            </div>
          </section>

          <section class="space-y-3 rounded-xl border border-default bg-default/70 p-4">
            <div>
              <p class="text-sm font-medium text-highlighted">Passage JSON</p>
              <p class="text-xs text-muted">Lines, paragraph glosses, and the image filename live here.</p>
            </div>
            <UTextarea
              v-model="passageJsonText"
              :rows="22"
              autoresize
              class="font-mono text-sm w-full"
              spellcheck="false"
            />
          </section>
        </div>

        <div
          v-else-if="activeTab === 'passage' && showVisualImages"
          class="grid gap-4 lg:grid-cols-[minmax(0,0.92fr)_minmax(0,1.08fr)]"
        >
          <div class="space-y-4">
            <section
              v-for="slot in visualImageSlots"
              :key="slot.filename"
              class="space-y-3 rounded-xl border border-default bg-default/70 p-4"
            >
              <div>
                <p class="text-sm font-medium text-highlighted">{{ slot.label }}</p>
                <p class="text-xs text-muted">
                  Stored in <code class="rounded bg-default px-1 py-0.5">passages.images</code>
                  as <code class="rounded bg-default px-1 py-0.5">{{ slot.filename }}</code>.
                </p>
                <p class="mt-1 text-xs text-muted">
                  {{ visualImagePresent(slot.filename) ? slot.filename : 'No image set' }}
                </p>
              </div>
              <div class="flex flex-wrap items-center gap-2">
                <UButton
                  color="neutral"
                  variant="outline"
                  icon="i-lucide-image-up"
                  @click="emit('request-passage-upload', visualUploadTarget(slot.filename))"
                >
                  Upload {{ slot.filename }}
                </UButton>
                <UButton
                  v-if="visualImagePresent(slot.filename)"
                  color="neutral"
                  variant="ghost"
                  icon="i-lucide-x"
                  @click="clearVisualImage(slot.filename)"
                >
                  Remove
                </UButton>
              </div>
              <img
                v-if="visualImagePreviewUrl(slot.filename)"
                class="max-h-56 w-full rounded-lg border border-default object-contain"
                :src="visualImagePreviewUrl(slot.filename)"
                :alt="`${slot.label} preview`"
              />
              <div
                v-else
                class="flex min-h-40 items-center justify-center rounded-lg border border-dashed border-default bg-default/60 text-sm text-muted"
              >
                No image attached
              </div>
            </section>
          </div>

          <section class="space-y-3 rounded-xl border border-default bg-default/70 p-4">
            <div>
              <p class="text-sm font-medium text-highlighted">Passage JSON</p>
              <p class="text-xs text-muted">Visual filenames live in <code class="rounded bg-default px-1 py-0.5">images</code>.</p>
            </div>
            <UTextarea
              v-model="passageJsonText"
              :rows="22"
              autoresize
              class="font-mono text-sm w-full"
              spellcheck="false"
            />
          </section>
        </div>

        <div v-else class="grid gap-4 lg:grid-cols-[minmax(0,0.92fr)_minmax(0,1.08fr)]">
          <section class="space-y-3 rounded-xl border border-default bg-default/70 p-4">
            <div>
              <p class="text-sm font-medium text-highlighted">
                {{ activeMeta.title }}
              </p>
              <p class="text-xs text-muted">
                {{ activeMeta.description }}
              </p>
            </div>
            <div class="rounded-lg border border-dashed border-default bg-default/60 px-3 py-2 text-xs text-muted">
              <p v-if="activeTab === 'all'">
                Edit the full section bucket JSON (<code class="rounded bg-default px-1 py-0.5">questions</code>,
                <code class="rounded bg-default px-1 py-0.5">answers</code>,
                <code class="rounded bg-default px-1 py-0.5">passages</code>).
              </p>
              <p v-else-if="activeTab === 'passage' && writingMode">
                This section keeps its writing-side content in <code class="rounded bg-default px-1 py-0.5">questions</code>
                and <code class="rounded bg-default px-1 py-0.5">answers</code>.
              </p>
              <p v-else-if="activeTab === 'passage'">
                Edit the section passage JSON here.
              </p>
              <p v-else-if="activeTab === 'questions'">
                Edit the question rows for the active section.
              </p>
              <p v-else>
                Edit the answer rows for the active section.
              </p>
            </div>
            <UAlert
              v-if="activeMeta.hint"
              color="neutral"
              variant="subtle"
              :title="activeMeta.hint"
            />
          </section>

          <section class="space-y-3 rounded-xl border border-default bg-default/70 p-4">
            <UTextarea
              v-model="activeJsonText"
              :rows="22"
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
        <UButton :loading="saving" @click="save">{{ saveLabel }}</UButton>
      </div>
    </template>
  </UModal>
</template>

<script setup lang="ts">
import { paperAssetUrl } from '~/utils/paperBundle'

type SectionModelTab = 'all' | 'passage' | 'questions' | 'answers'

type OpenPayload = {
  title?: string
  subtitle?: string
  writingMode?: boolean
  showPassageImage?: boolean
  showVisualImages?: boolean
  paperId?: string
  subjectKey?: string
  sectionId?: string | number
  initialTab?: SectionModelTab
  allJsonText: string
  passageJsonText: string
  questionsJsonText: string
  answersJsonText: string
}

type SavePayload = {
  tab: SectionModelTab
  value: unknown
}

const VISUAL_IMAGE_SLOTS = [
  { filename: 'visual1.jpeg', label: 'Visual 1' },
  { filename: 'visual2.jpeg', label: 'Visual 2' },
] as const

const props = defineProps<{
  title?: string
  saveFn?: (payload: SavePayload) => void | Promise<void>
}>()

const emit = defineEmits<{
  'request-passage-upload': [{ paperId: string; sectionId: string | number; filename: string }]
}>()

const open = ref(false)
const isOpen = computed({
  get: () => open.value,
  set: (value) => {
    open.value = value
  },
})
const subtitle = ref('')
const error = ref('')
const saving = ref(false)
const activeTab = ref<SectionModelTab>('all')
const writingMode = ref(false)
const showPassageImage = ref(false)
const showVisualImages = ref(false)
const paperId = ref('')
const subjectKey = ref('english')
const sectionId = ref<string | number>('')
const visualVersion = ref('')
const allJsonText = ref('{}')
const passageJsonText = ref('{}')
const questionsJsonText = ref('{}')
const answersJsonText = ref('{}')
const passageImageFilename = ref('')
const passageImagePreviewUrl = ref('')
const visualImageNames = ref<string[]>([])

const visualImageSlots = VISUAL_IMAGE_SLOTS

const passageUploadTarget = computed(() => ({
  paperId: paperId.value,
  sectionId: sectionId.value,
  filename: passageImageFilename.value || `${sectionId.value}-passage.jpeg`,
}))

const activeJsonText = computed({
  get: () => {
    if (activeTab.value === 'all') return allJsonText.value
    if (activeTab.value === 'questions') return questionsJsonText.value
    if (activeTab.value === 'answers') return answersJsonText.value
    return passageJsonText.value
  },
  set: (value: string) => {
    if (activeTab.value === 'all') allJsonText.value = value
    else if (activeTab.value === 'questions') questionsJsonText.value = value
    else if (activeTab.value === 'answers') answersJsonText.value = value
    else passageJsonText.value = value
  },
})

const activeMeta = computed(() => {
  if (activeTab.value === 'all') {
    return {
      title: 'Section JSON',
      description: 'Full section bucket saved as a whole.',
      hint: 'Replaces questions, answers, and passages together. Catalog fields (stem, title, etc.) are not stored here.',
    }
  }
  if (activeTab.value === 'questions') {
    return {
      title: 'Question JSON',
      description: 'These rows are merged into the active section questions.',
      hint: 'Use this tab when you only want to edit the question-side content.',
    }
  }
  if (activeTab.value === 'answers') {
    return {
      title: 'Answer JSON',
      description: 'These rows are merged into the active section answers.',
      hint: 'Use this tab when you only want to edit the answer-side content.',
    }
  }
  return {
    title: writingMode.value ? 'Writing content JSON' : 'Passage JSON',
    description: writingMode.value
      ? 'This preserves the current writing-section behavior.'
      : 'These fields are merged into the active section passage.',
    hint: writingMode.value
      ? 'For writing sections, this tab saves both questions and answers together.'
      : 'Passage edits are saved independently from questions and answers.',
  }
})

const saveLabel = computed(() => {
  if (activeTab.value === 'all') return 'Save section'
  if (activeTab.value === 'questions') return 'Save questions'
  if (activeTab.value === 'answers') return 'Save answers'
  return writingMode.value ? 'Save writing content' : 'Save passage'
})

function cloneJsonText(text: string): string {
  try {
    const parsed = JSON.parse(text || '{}')
    return JSON.stringify(parsed, null, 2)
  } catch {
    return text || '{}'
  }
}

function syncPassageJsonImage(filename: string) {
  try {
    const parsed = JSON.parse(passageJsonText.value || '{}')
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return
    const row = parsed as Record<string, unknown>
    const next = String(filename || '').trim()
    if (next) row.image = next
    else delete row.image
    passageJsonText.value = JSON.stringify(row, null, 2)
  } catch {
    /* ignore invalid JSON until save */
  }
}

function orderedVisualImages(names: string[]): string[] {
  const set = new Set(names.map((n) => String(n || '').trim()).filter(Boolean))
  const fixed = VISUAL_IMAGE_SLOTS.map((s) => s.filename).filter((name) => set.has(name))
  const extras = [...set].filter((name) => !VISUAL_IMAGE_SLOTS.some((s) => s.filename === name))
  return [...fixed, ...extras]
}

function syncPassageJsonImages(names: string[]) {
  try {
    const parsed = JSON.parse(passageJsonText.value || '{}')
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return
    const row = parsed as Record<string, unknown>
    const next = orderedVisualImages(names)
    if (next.length) row.images = next
    else delete row.images
    passageJsonText.value = JSON.stringify(row, null, 2)
    visualImageNames.value = next
  } catch {
    /* ignore invalid JSON until save */
  }
}

function updatePassageImagePreview() {
  if (!paperId.value || !subjectKey.value || !passageImageFilename.value) {
    passageImagePreviewUrl.value = ''
    return
  }
  passageImagePreviewUrl.value = paperAssetUrl(
    paperId.value,
    subjectKey.value,
    passageImageFilename.value,
    visualVersion.value,
  )
}

function visualImagePresent(filename: string): boolean {
  return visualImageNames.value.includes(filename)
}

function visualImagePreviewUrl(filename: string): string {
  if (!paperId.value || !subjectKey.value || !visualImagePresent(filename)) return ''
  return paperAssetUrl(paperId.value, subjectKey.value, filename, visualVersion.value)
}

function visualUploadTarget(filename: string) {
  return {
    paperId: paperId.value,
    sectionId: sectionId.value,
    filename,
  }
}

function readPassageImageFilename(text: string): string {
  try {
    const parsed = JSON.parse(text || '{}')
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return ''
    const image = (parsed as Record<string, unknown>).image
    return image != null ? String(image).trim() : ''
  } catch {
    return ''
  }
}

function readPassageImages(text: string): string[] {
  try {
    const parsed = JSON.parse(text || '{}')
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return []
    const images = (parsed as Record<string, unknown>).images
    if (!Array.isArray(images)) return []
    return orderedVisualImages(images.map((n) => (n != null ? String(n) : '')))
  } catch {
    return []
  }
}

function show(payload: OpenPayload) {
  subtitle.value = payload.subtitle || ''
  writingMode.value = !!payload.writingMode
  showPassageImage.value = !!payload.showPassageImage
  showVisualImages.value = !!payload.showVisualImages
  paperId.value = String(payload.paperId || '')
  subjectKey.value = String(payload.subjectKey || 'english')
  sectionId.value = payload.sectionId ?? ''
  visualVersion.value = ''
  activeTab.value = payload.initialTab || 'all'
  allJsonText.value = cloneJsonText(payload.allJsonText)
  passageJsonText.value = cloneJsonText(payload.passageJsonText)
  questionsJsonText.value = cloneJsonText(payload.questionsJsonText)
  answersJsonText.value = cloneJsonText(payload.answersJsonText)
  passageImageFilename.value = readPassageImageFilename(passageJsonText.value)
  visualImageNames.value = readPassageImages(passageJsonText.value)
  error.value = ''
  open.value = true
  updatePassageImagePreview()
}

function close() {
  open.value = false
}

function clearPassageImage() {
  passageImageFilename.value = ''
  syncPassageJsonImage('')
  updatePassageImagePreview()
}

function clearVisualImage(filename: string) {
  const current = readPassageImages(passageJsonText.value)
  syncPassageJsonImages(current.filter((name) => name !== filename))
}

function setPassageImageFilename(filename: string, version?: string) {
  const next = String(filename || '').trim()
  if (version != null) {
    visualVersion.value = String(version || '')
  } else if (next) {
    visualVersion.value = String(Date.now())
  }
  if (showVisualImages.value) {
    const names = new Set(readPassageImages(passageJsonText.value))
    if (next) names.add(next)
    syncPassageJsonImages([...names])
    return
  }
  passageImageFilename.value = next
  syncPassageJsonImage(passageImageFilename.value)
  updatePassageImagePreview()
}

async function save() {
  error.value = ''
  let parsed: unknown
  try {
    const text =
      activeTab.value === 'all'
        ? allJsonText.value
        : activeTab.value === 'questions'
          ? questionsJsonText.value
          : activeTab.value === 'answers'
            ? answersJsonText.value
            : passageJsonText.value
    parsed = JSON.parse(text || '{}')
  } catch (e) {
    error.value = 'Invalid JSON: ' + (e instanceof Error ? e.message : String(e))
    return
  }

  saving.value = true
  try {
    if (props.saveFn) {
      await props.saveFn({ tab: activeTab.value, value: parsed })
    }
    close()
  } catch (e) {
    error.value = e instanceof Error ? e.message : String(e)
  } finally {
    saving.value = false
  }
}

defineExpose({ show, close, setPassageImageFilename })
</script>
