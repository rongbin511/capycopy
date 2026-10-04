<template>
  <UModal
    v-model:open="open"
    title="New section"
    :description="subjectLabel ? `Create a section for ${subjectLabel}.` : 'Create a section catalog entry.'"
    :ui="{ content: 'w-[58vw] max-w-[58vw]' }"
  >
    <template #body>
      <div class="space-y-4">
        <UFormField label="Subject">
          <UInput v-model="subjectId" disabled />
        </UFormField>
        <UFormField label="Section id">
          <UInput v-model="sectionId" placeholder="207" />
        </UFormField>
        <UFormField label="Stem">
          <UInput v-model="stem" placeholder="207-reading" />
        </UFormField>
        <UFormField label="Label">
          <UInput v-model="label" placeholder="Reading" />
        </UFormField>
        <UFormField label="Title">
          <UInput v-model="title" placeholder="Reading Two C" />
        </UFormField>
        <UFormField label="Interaction">
          <UInput v-model="interaction" placeholder="open_ended" />
        </UFormField>
        <div class="grid gap-4 sm:grid-cols-2">
          <UFormField label="Marks">
            <UInput v-model.number="marks" type="number" min="0" />
          </UFormField>
          <UFormField label="Instruction">
            <UInput v-model="instruction" placeholder="Answer the questions..." />
          </UFormField>
        </div>
        <UFormField label="Template JSON">
          <UTextarea
            v-model="templateText"
            :rows="8"
            autoresize
            class="font-mono text-sm"
            spellcheck="false"
            placeholder='{"render_mode":"writing"}'
          />
        </UFormField>
        <UAlert
          v-if="error"
          color="error"
          variant="subtle"
          icon="i-lucide-circle-alert"
          :title="error"
        />
      </div>
    </template>
    <template #footer>
      <div class="flex justify-end gap-2 w-full">
        <UButton color="neutral" variant="ghost" @click="close">Cancel</UButton>
        <UButton :loading="saving" @click="save">Create</UButton>
      </div>
    </template>
  </UModal>
</template>

<script setup lang="ts">
type SectionPayload = {
  subject_id: string
  section_id: string
  stem: string
  label: string
  title: string
  interaction: string
  marks: number
  instruction: string
  template: Record<string, unknown>
}

type SectionCreateDefaults = {
  subject_id: string
  subject_label: string
  section_id: string
  stem: string
  label: string
  title: string
  interaction: string
  marks: number
  instruction: string
  template?: Record<string, unknown>
}

const props = defineProps<{
  saveFn?: (payload: SectionPayload) => void | Promise<void>
}>()

const emit = defineEmits<{ save: [payload: SectionPayload]; close: [] }>()

const open = ref(false)
const subjectLabel = ref('')
const subjectId = ref('')
const sectionId = ref('')
const stem = ref('')
const label = ref('')
const title = ref('')
const interaction = ref('')
const marks = ref(0)
const instruction = ref('')
const templateText = ref('{}')
const error = ref('')
const saving = ref(false)

function show(initial: Partial<SectionCreateDefaults> = {}) {
  subjectLabel.value = initial.subject_label || ''
  subjectId.value = initial.subject_id || ''
  sectionId.value = initial.section_id || ''
  stem.value = initial.stem || ''
  label.value = initial.label || ''
  title.value = initial.title || ''
  interaction.value = initial.interaction || ''
  marks.value = initial.marks ?? 0
  instruction.value = initial.instruction || ''
  templateText.value = JSON.stringify(initial.template ?? {}, null, 2)
  error.value = ''
  open.value = true
}

function close() {
  open.value = false
  emit('close')
}

async function save() {
  error.value = ''
  const payload: SectionPayload = {
    subject_id: subjectId.value.trim(),
    section_id: sectionId.value.trim(),
    stem: stem.value.trim(),
    label: label.value.trim(),
    title: title.value.trim(),
    interaction: interaction.value.trim(),
    marks: Number.isFinite(Number(marks.value)) ? Number(marks.value) : 0,
    instruction: instruction.value.trim(),
    template: {},
  }
  if (!payload.section_id) {
    error.value = 'Section id is required.'
    return
  }
  if (!payload.subject_id) {
    error.value = 'Subject is required.'
    return
  }
  if (!payload.stem) {
    error.value = 'Stem is required.'
    return
  }
  if (!payload.label) {
    error.value = 'Label is required.'
    return
  }
  if (!payload.title) {
    error.value = 'Title is required.'
    return
  }
  if (!payload.interaction) {
    error.value = 'Interaction is required.'
    return
  }
  try {
    const parsed = JSON.parse(templateText.value || '{}')
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      throw new Error('Template must be a JSON object.')
    }
    payload.template = parsed as Record<string, unknown>
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Template JSON is invalid.'
    return
  }
  saving.value = true
  try {
    if (props.saveFn) {
      await props.saveFn(payload)
    } else {
      emit('save', payload)
    }
    close()
  } catch (e) {
    error.value = e instanceof Error ? e.message : String(e)
  } finally {
    saving.value = false
  }
}

defineExpose({ show, close })
</script>
