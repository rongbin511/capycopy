<template>
  <UModal
    v-model:open="open"
    title="New school"
    description="Create a school catalog entry."
    :ui="{ content: 'w-[56vw] max-w-[56vw]' }"
  >
    <template #body>
      <div class="space-y-4">
        <UFormField label="School id">
          <UInput v-model="schoolId" placeholder="nanyang" />
        </UFormField>
        <UFormField label="Slug">
          <UInput v-model="slug" placeholder="Nanyang" />
        </UFormField>
        <UFormField label="Official name">
          <UInput v-model="officialName" placeholder="Nanyang Primary School" />
        </UFormField>
        <UFormField label="Chinese name">
          <UInput v-model="zh" placeholder="南洋" />
        </UFormField>
        <UFormField label="Short name">
          <UInput v-model="shortName" placeholder="NYPS" />
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
type SchoolPayload = {
  school_id: string
  slug: string
  official_name: string
  zh: string
  short_name: string
}

const props = defineProps<{
  saveFn?: (payload: SchoolPayload) => void | Promise<void>
}>()

const emit = defineEmits<{ save: [payload: SchoolPayload]; close: [] }>()

const open = ref(false)
const schoolId = ref('')
const slug = ref('')
const officialName = ref('')
const zh = ref('')
const shortName = ref('')
const error = ref('')
const saving = ref(false)

function show() {
  schoolId.value = ''
  slug.value = ''
  officialName.value = ''
  zh.value = ''
  shortName.value = ''
  error.value = ''
  open.value = true
}

function close() {
  open.value = false
  emit('close')
}

async function save() {
  error.value = ''
  const payload: SchoolPayload = {
    school_id: schoolId.value.trim(),
    slug: slug.value.trim(),
    official_name: officialName.value.trim(),
    zh: zh.value.trim(),
    short_name: shortName.value.trim(),
  }
  if (!payload.school_id) {
    error.value = 'School id is required.'
    return
  }
  if (!payload.slug) {
    error.value = 'Slug is required.'
    return
  }
  if (!payload.official_name) {
    error.value = 'Official name is required.'
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
