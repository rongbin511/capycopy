<template>
  <UModal
    v-model:open="open"
    title="New subject"
    description="Create a subject catalog entry."
    :ui="{ content: 'w-[52vw] max-w-[52vw]' }"
  >
    <template #body>
      <div class="space-y-4">
        <UFormField label="Subject id">
          <UInput v-model="subjectId" placeholder="science" />
        </UFormField>
        <UFormField label="Label">
          <UInput v-model="label" placeholder="Science" />
        </UFormField>
        <UFormField label="Section ids">
          <UTextarea
            v-model="sectionIdsText"
            :rows="4"
            autoresize
            spellcheck="false"
            placeholder="101, 102"
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
type SubjectPayload = {
  subject_id: string
  label: string
  sectionids: string[]
}

const props = defineProps<{
  saveFn?: (payload: SubjectPayload) => void | Promise<void>
}>()

const emit = defineEmits<{ save: [payload: SubjectPayload]; close: [] }>()

const open = ref(false)
const subjectId = ref('')
const label = ref('')
const sectionIdsText = ref('')
const error = ref('')
const saving = ref(false)

function show() {
  subjectId.value = ''
  label.value = ''
  sectionIdsText.value = ''
  error.value = ''
  open.value = true
}

function close() {
  open.value = false
  emit('close')
}

function parseSectionIds(text: string): string[] {
  return text
    .split(/[\n,]/g)
    .map((part) => part.trim())
    .filter(Boolean)
}

async function save() {
  error.value = ''
  const payload: SubjectPayload = {
    subject_id: subjectId.value.trim(),
    label: label.value.trim(),
    sectionids: parseSectionIds(sectionIdsText.value),
  }
  if (!payload.subject_id) {
    error.value = 'Subject id is required.'
    return
  }
  if (!payload.label) {
    error.value = 'Label is required.'
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
