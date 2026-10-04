<template>
  <UModal
    v-model:open="open"
    title="New paper"
    description="Creates a minimal paper.json bundle from the subject template."
    :ui="{ content: 'w-[56vw] max-w-[56vw]' }"
  >
    <template #body>
      <p class="text-sm text-muted mb-4">
        Start the API server:
        <code class="text-xs bg-elevated px-1 rounded">./scripts/run_api_server.sh</code>
      </p>
      <div class="grid gap-4 sm:grid-cols-4">
        <UFormField label="Level">
          <USelect v-model="level" :items="levelItems" />
        </UFormField>
        <UFormField label="Subject">
          <USelect v-model="subjectKey" :items="subjectItems" />
        </UFormField>
        <UFormField label="Year">
          <UInput v-model.number="year" type="number" min="2000" max="2100" />
        </UFormField>
        <UFormField label="Term">
          <USelect v-model="term" :items="termItems" />
        </UFormField>
      </div>
      <UFormField label="School" class="mt-4 w-1/2">
        <USelect
          v-model="schoolKey"
          :items="schoolItems"
          class="w-full"
          :ui="{ base: 'w-full' }"
        />
      </UFormField>
      <UAlert
        v-if="error"
        color="error"
        variant="subtle"
        icon="i-lucide-circle-alert"
        class="mt-4"
        :title="error"
      />
    </template>
    <template #footer>
      <div class="flex flex-wrap items-center justify-between gap-3 w-full">
        <UCheckbox v-model="redirectToNewPaper" label="Redirect to new paper" />
        <div class="flex gap-2">
          <UButton color="neutral" variant="ghost" @click="dismiss">Cancel</UButton>
          <UButton :loading="saving" @click="save">Create</UButton>
        </div>
      </div>
    </template>
  </UModal>
</template>

<script setup lang="ts">
import { useTpbApi } from '~/composables/useTpbApi'

type PaperCreatePayload = {
  school_key: string
  year: number
  level: string
  subject_key: string
  term: string
}

type PaperCreateResult = {
  paper_id: string
  subject: string
}

type PrototypeOptions = {
  levels: string[]
  terms: string[]
  subjects: Array<{ key: string; label: string }>
  schools: Array<{ schkey: string; name: string }>
}

const props = defineProps<{
  saveFn?: (payload: PaperCreatePayload) => PaperCreateResult | void | Promise<PaperCreateResult | void>
}>()

const emit = defineEmits<{ created: [result: PaperCreateResult]; close: [] }>()

const api = useTpbApi()
const open = ref(false)
const level = ref('P6')
const subjectKey = ref('english')
const term = ref('sa2')
const schoolKey = ref('')
const year = ref(new Date().getFullYear())
const error = ref('')
const saving = ref(false)
const redirectToNewPaper = ref(true)
const lastCreatedPaper = ref<PaperCreateResult | null>(null)

const levelItems = ref<string[]>(['P6'])
const termItems = ref<string[]>(['sa2'])
const subjectItems = ref<Array<{ label: string; value: string }>>([])
const schoolItems = ref<Array<{ label: string; value: string }>>([])

async function loadOptions() {
  error.value = ''
  const opts = await api.fetchJson<PrototypeOptions>('/api/prototype-options')
  levelItems.value = opts.levels?.length ? opts.levels : ['P6']
  termItems.value = opts.terms?.length ? opts.terms : ['sa2']
  subjectItems.value = (opts.subjects || []).map((s) => ({ label: s.label, value: s.key }))
  schoolItems.value = (opts.schools || []).map((s) => ({ label: s.name, value: s.schkey }))
  if (!levelItems.value.includes(level.value)) level.value = levelItems.value[0]
  if (!termItems.value.includes(term.value)) term.value = termItems.value[0]
  if (!subjectItems.value.some((s) => s.value === subjectKey.value) && subjectItems.value[0]) {
    subjectKey.value = subjectItems.value[0].value
  }
  if (!schoolKey.value && schoolItems.value[0]) schoolKey.value = schoolItems.value[0].value
}

async function redirectToPaper(result: PaperCreateResult) {
  await navigateTo(`/papers/${result.subject}?paper=${encodeURIComponent(result.paper_id)}`)
}

async function show(initial?: { level?: string; subject_key?: string }) {
  level.value = initial?.level || 'P6'
  subjectKey.value = initial?.subject_key || 'english'
  term.value = 'sa2'
  schoolKey.value = ''
  year.value = new Date().getFullYear()
  error.value = ''
  redirectToNewPaper.value = true
  lastCreatedPaper.value = null
  open.value = true
  try {
    await loadOptions()
    if (initial?.level && levelItems.value.includes(initial.level)) level.value = initial.level
    if (initial?.subject_key) subjectKey.value = initial.subject_key
  } catch (e) {
    error.value = e instanceof Error ? e.message : String(e)
  }
}

function dismiss() {
  open.value = false
}

function close() {
  dismiss()
}

watch(open, async (isOpen, wasOpen) => {
  if (!wasOpen || isOpen) return
  const pending = lastCreatedPaper.value
  lastCreatedPaper.value = null
  redirectToNewPaper.value = true
  emit('close')
  if (pending) {
    await redirectToPaper(pending)
  }
})

async function save() {
  error.value = ''
  if (!schoolKey.value) {
    error.value = 'School is required.'
    return
  }
  const payload: PaperCreatePayload = {
    school_key: schoolKey.value,
    year: year.value,
    level: level.value,
    subject_key: subjectKey.value,
    term: term.value,
  }
  saving.value = true
  try {
    let result: PaperCreateResult | void
    if (props.saveFn) {
      result = await props.saveFn(payload)
    } else {
      result = await api.fetchJson<PaperCreateResult>('/api/prototype', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
    }
    if (result) {
      emit('created', result)
      if (redirectToNewPaper.value) {
        await redirectToPaper(result)
        open.value = false
      } else {
        lastCreatedPaper.value = result
      }
    }
  } catch (e) {
    error.value = e instanceof Error ? e.message : String(e)
  } finally {
    saving.value = false
  }
}

defineExpose({ show, close })
</script>
