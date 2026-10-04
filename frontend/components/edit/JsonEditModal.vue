<template>
  <UModal
    v-model:open="open"
    :title="title"
    :description="subtitle"
    :ui="{ content: 'w-[66vw] max-w-[66vw]' }"
  >
    <template #body>
      <UTextarea
        v-model="jsonText"
        :rows="18"
        autoresize
        class="font-mono text-sm w-full"
        spellcheck="false"
      />
      <UAlert v-if="error" color="error" variant="subtle" class="mt-3" :title="error" />
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
const props = defineProps<{
  title: string
  subtitle?: string
  saveFn?: (payload: unknown) => void | Promise<void>
}>()

const emit = defineEmits<{ save: [payload: unknown]; close: [] }>()

const open = ref(false)
const jsonText = ref('{}')
const error = ref('')
const saving = ref(false)

function show(initial: string) {
  jsonText.value = initial
  error.value = ''
  open.value = true
}

function close() {
  open.value = false
  emit('close')
}

async function save() {
  error.value = ''
  let parsed: unknown
  try {
    parsed = JSON.parse(jsonText.value || '{}')
  } catch (e) {
    error.value = 'Invalid JSON: ' + (e instanceof Error ? e.message : String(e))
    return
  }
  saving.value = true
  try {
    if (props.saveFn) {
      await props.saveFn(parsed)
    } else {
      emit('save', parsed)
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
