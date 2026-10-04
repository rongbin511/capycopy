<template>
  <UModal
    v-model:open="open"
    title="Edit section"
    :description="subjectLabel ? `Update the section for ${subjectLabel}.` : 'Update a section catalog entry.'"
    :ui="{ content: 'w-[66vw] max-w-[66vw]' }"
  >
    <template #body>
      <div class="grid gap-6 lg:grid-cols-[18rem_16rem_minmax(0,1fr)]">
        <div class="space-y-4">
          <div class="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-4">
            <UFormField label="Subject">
              <UInput v-model="subjectId" disabled />
            </UFormField>
            <UFormField label="Section id">
              <UInput v-model="sectionId" disabled />
            </UFormField>
          </div>
        </div>

        <div class="space-y-4 min-w-0">
          <UFormField label="Stem" class="w-full">
            <UInput v-model="stem" class="w-full" placeholder="207-reading" />
          </UFormField>
          <UFormField label="Label" class="w-full">
            <UInput v-model="label" class="w-full" placeholder="Reading" />
          </UFormField>
          <UFormField label="Title" class="w-full">
            <UInput v-model="title" class="w-full" placeholder="Reading Two C" />
          </UFormField>
          <UFormField label="Interaction" class="w-full">
            <UInput v-model="interaction" class="w-full" placeholder="open_ended" />
          </UFormField>
          <div class="grid gap-4 sm:grid-cols-2">
            <UFormField label="Marks" class="w-full">
              <UInput v-model.number="marks" class="w-full" type="number" min="0" />
            </UFormField>
          </div>
        </div>

        <div class="space-y-4 min-w-0">
          <UFormField label="Instruction" class="w-full">
            <UTextarea
              v-model="instruction"
              :rows="6"
              autoresize
              class="w-full"
              placeholder="Answer the questions..."
            />
          </UFormField>
          <UFormField label="Template JSON" class="w-full">
            <UTextarea
              v-model="templateText"
              :rows="14"
              autoresize
              class="w-full font-mono text-sm"
              spellcheck="false"
              placeholder='{"render_mode":"writing"}'
            />
          </UFormField>
        </div>
      </div>
      <UAlert
        v-if="error"
        color="error"
        variant="subtle"
        icon="i-lucide-circle-alert"
        :title="error"
        class="mt-4"
      />
    </template>
    <template #footer>
      <div class="flex justify-end gap-2 w-full">
        <UButton color="neutral" variant="ghost" @click="close">Cancel</UButton>
        <UButton :loading="saving" @click="save">Save</UButton>
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

type SectionEditDefaults = {
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

function show(initial: Partial<SectionEditDefaults> = {}) {
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
