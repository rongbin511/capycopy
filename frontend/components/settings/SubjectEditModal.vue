<template>
  <UModal
    v-model:open="open"
    title="Edit subject"
    description="Update the subject label and linked section ids."
    :ui="{ content: 'w-[52vw] max-w-[52vw]' }"
  >
    <template #body>
      <div class="space-y-4">
        <UFormField label="Subject id">
          <UInput v-model="subjectId" disabled />
        </UFormField>
        <UFormField label="Label">
          <UInput v-model="label" placeholder="Chinese" />
        </UFormField>
        <UFormField label="Section ids">
          <UTextarea
            v-model="sectionIdsText"
            :rows="5"
            autoresize
            spellcheck="false"
            placeholder="201, 202, 203"
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
        <UButton :loading="saving" @click="save">Save</UButton>
      </div>
    </template>
  </UModal>
</template>

<script setup lang="ts">
type SubjectPayload = {
  subjectId: string
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

function show(initial: SubjectPayload) {
  subjectId.value = initial.subjectId || ''
  label.value = initial.label || ''
  sectionIdsText.value = (initial.sectionids || []).join(', ')
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
    subjectId: subjectId.value.trim(),
    label: label.value.trim(),
    sectionids: parseSectionIds(sectionIdsText.value),
  }
  if (!payload.subjectId) {
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
