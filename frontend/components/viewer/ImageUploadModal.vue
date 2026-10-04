<template>
  <UModal
    v-model:open="isOpen"
    title="Upload image"
    :description="uploadDescription"
    :ui="{ content: 'w-full max-w-2xl' }"
    @update:open="onModalOpenChange"
  >
    <template #body>
      <div class="flex flex-col gap-3">
        <label class="inline-flex cursor-pointer self-start items-center rounded-lg border border-dashed border-slate-400 bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100">
          Choose image file…
          <input ref="fileInput" type="file" accept="image/*" class="sr-only" @change="handleFileSelect" />
        </label>

        <div class="grid gap-1.5">
          <label class="text-sm font-medium text-slate-700" for="upload-filename">File name</label>
          <UInput id="upload-filename" v-model="filename" placeholder="image.jpeg" />
          <p class="text-xs text-slate-500">
            {{ filenameHint }}
          </p>
        </div>

        <div
          ref="pasteZone"
          class="min-h-40 rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4 outline-none transition hover:bg-slate-100 focus:border-slate-400 focus:bg-slate-100"
          tabindex="0"
          @click="focusPasteZone"
          @paste.prevent="handlePaste"
        >
          <p class="text-sm text-slate-600">
            Click here, then press <kbd class="rounded bg-white px-1 py-0.5 shadow-sm">Ctrl+V</kbd> /
            <kbd class="rounded bg-white px-1 py-0.5 shadow-sm">Cmd+V</kbd> to paste an image from the clipboard.
          </p>
          <img
            v-if="previewUrl"
            class="mt-3 max-h-72 w-full rounded-lg border border-default object-contain"
            :src="previewUrl"
            alt="Image preview"
          />
        </div>

        <p class="text-sm text-muted">
          Saves as <code class="rounded bg-slate-100 px-1 py-0.5">{{ filename || 'image.jpeg' }}</code>
          beside <code class="rounded bg-slate-100 px-1 py-0.5">paper.json</code>
        </p>
        <p v-if="status" class="text-sm text-slate-600">{{ status }}</p>
        <p v-if="error" class="text-sm text-red-600" role="alert">{{ error }}</p>
      </div>
    </template>

    <template #footer>
      <div class="flex items-center justify-end gap-2 w-full">
        <UButton color="neutral" variant="ghost" @click="close">Close</UButton>
        <UButton color="primary" :disabled="saving || !jpegBlob" @click="save">
          {{ saving ? 'Saving…' : 'Save image' }}
        </UButton>
      </div>
    </template>
  </UModal>
</template>

<script setup lang="ts">
type OpenPayload = {
  kind: 'writing' | 'question-image' | 'answer-image' | 'passage-image'
  paperId: string
  sectionId?: string | number
  questionId?: string
  filename: string
  filenameAutoFromSource?: boolean
}

const emit = defineEmits<{
  saved: [payload: { kind: 'writing' | 'question-image' | 'answer-image' | 'passage-image'; paperId: string; sectionId?: string; questionId?: string; filename: string; visualAssetsVersion?: string }]
}>()

const isOpen = ref(false)
const kind = ref<'writing' | 'question-image' | 'answer-image' | 'passage-image'>('writing')
const paperId = ref('')
const sectionId = ref('')
const questionId = ref('')
const filename = ref('')
const filenameAutoFromSource = ref(false)
const previewUrl = ref('')
const jpegBlob = ref<Blob | null>(null)
const error = ref('')
const status = ref('')
const saving = ref(false)
const pasteZone = ref<HTMLElement | null>(null)
const fileInput = ref<HTMLInputElement | null>(null)
const uploadDescription = computed(() => `Choose or paste an image to save as ${filename.value || 'image.jpeg'}.`)
const filenameHint = computed(() =>
  filenameAutoFromSource.value
    ? 'We’ll use the uploaded file’s name automatically when possible.'
    : 'You can change this name before saving.',
)

function toJpegFilename(source: string): string {
  const raw = String(source || '').trim()
  if (!raw) return 'image.jpeg'
  return raw.replace(/\.[^.]+$/, '') + '.jpeg'
}

function revokePreview() {
  if (previewUrl.value) {
    try {
      URL.revokeObjectURL(previewUrl.value)
    } catch {
      /* ignore */
    }
  }
  previewUrl.value = ''
}

function resetState() {
  revokePreview()
  jpegBlob.value = null
  error.value = ''
  status.value = ''
  saving.value = false
  if (fileInput.value) fileInput.value.value = ''
}

function open(payload: OpenPayload) {
  kind.value = payload.kind
  paperId.value = String(payload.paperId || '')
  sectionId.value = String(payload.sectionId || '')
  questionId.value = String(payload.questionId || '')
  filename.value = String(payload.filename || '')
  filenameAutoFromSource.value = !!payload.filenameAutoFromSource
  resetState()
  isOpen.value = true
  nextTick(() => {
    try {
      pasteZone.value?.focus()
    } catch {
      /* ignore */
    }
  })
}

function close() {
  isOpen.value = false
  resetState()
}

function onModalOpenChange(open: boolean) {
  if (!open) resetState()
}

function clipboardImageFileFromPasteEvent(event: ClipboardEvent) {
  const items = event.clipboardData?.items
  if (!items) return null
  for (const item of Array.from(items)) {
    if (item.type.startsWith('image/')) return item.getAsFile()
  }
  return null
}

function fileToJpegBlob(file: File): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => {
      URL.revokeObjectURL(url)
      const canvas = document.createElement('canvas')
      canvas.width = img.naturalWidth || img.width || 1
      canvas.height = img.naturalHeight || img.height || 1
      const ctx = canvas.getContext('2d')
      if (!ctx) {
        reject(new Error('Canvas not supported'))
        return
      }
      ctx.fillStyle = '#ffffff'
      ctx.fillRect(0, 0, canvas.width, canvas.height)
      ctx.drawImage(img, 0, 0)
      canvas.toBlob((blob) => {
        if (blob) resolve(blob)
        else reject(new Error('Could not encode JPEG'))
      }, 'image/jpeg', 0.92)
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('Could not read image'))
    }
    img.src = url
  })
}

async function setImage(file: File) {
  if (!file.type.startsWith('image/')) {
    error.value = 'Choose an image file (JPEG, PNG, etc.).'
    return
  }
  error.value = ''
  status.value = 'Processing image…'
  if (filenameAutoFromSource.value) {
    filename.value = toJpegFilename(file.name)
  } else if (!filename.value) {
    filename.value = toJpegFilename(file.name)
  }
  const blob = await fileToJpegBlob(file)
  revokePreview()
  jpegBlob.value = blob
  previewUrl.value = URL.createObjectURL(blob)
  status.value = `Ready to save as ${filename.value || 'image.jpeg'}`
}

async function handleFileSelect(ev: Event) {
  const input = ev.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return
  try {
    await setImage(file)
  } catch (err) {
    error.value = err instanceof Error ? err.message : String(err)
    status.value = ''
  }
}

async function handlePaste(ev: ClipboardEvent) {
  const file = clipboardImageFileFromPasteEvent(ev)
  if (!file) {
    error.value = 'Clipboard has no image. Copy a screenshot or image first.'
    return
  }
  try {
    await setImage(file)
  } catch (err) {
    error.value = err instanceof Error ? err.message : String(err)
    status.value = ''
  }
}

async function save() {
  if (!paperId.value) return
  if ((kind.value === 'writing' || kind.value === 'passage-image') && !sectionId.value) return
  if ((kind.value === 'question-image' || kind.value === 'answer-image') && !questionId.value) return
  if (saving.value) return
  if (!jpegBlob.value) {
    error.value = 'Choose or paste an image first.'
    return
  }
  saving.value = true
  error.value = ''
  status.value = 'Saving…'
  try {
    const url =
      kind.value === 'answer-image'
        ? `/api/papers/${encodeURIComponent(paperId.value)}/answer-slides/${encodeURIComponent(questionId.value)}`
        : kind.value === 'question-image'
          ? `/api/papers/${encodeURIComponent(paperId.value)}/question-images/${encodeURIComponent(questionId.value)}`
          : kind.value === 'passage-image'
            ? `/api/papers/${encodeURIComponent(paperId.value)}/passage-images/${encodeURIComponent(sectionId.value)}`
            : `/api/papers/${encodeURIComponent(paperId.value)}/images/${encodeURIComponent(sectionId.value)}`
    const res = await fetch(url, {
      method: 'PUT',
      headers: {
        'Content-Type': 'image/jpeg',
        'X-Image-Filename': filename.value,
      },
      body: jpegBlob.value,
    })
    const body = await res.json().catch(() => ({}))
    if (!res.ok) {
      throw new Error(typeof body.detail === 'string' ? body.detail : res.statusText)
    }
    status.value = `Saved ${body.filename || filename.value}`
    emit('saved', {
      kind: kind.value,
      paperId: paperId.value,
      sectionId: sectionId.value || undefined,
      questionId: questionId.value || undefined,
      filename: String(body.filename || filename.value),
    })
    close()
  } catch (err) {
    error.value = err instanceof Error ? err.message : String(err)
    status.value = ''
  } finally {
    saving.value = false
  }
}

function focusPasteZone() {
  try {
    pasteZone.value?.focus()
  } catch {
    /* ignore */
  }
}

onBeforeUnmount(() => {
  revokePreview()
})

defineExpose({ open, close })
</script>
