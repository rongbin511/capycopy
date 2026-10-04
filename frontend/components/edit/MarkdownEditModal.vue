<template>
  <UModal
    v-model:open="isOpen"
    :title="title"
    :description="subtitle"
    :ui="{ content: 'w-[72vw] max-w-[72vw]' }"
  >
    <template #body>
      <div class="space-y-3">
        <UTextarea
          v-model="markdownText"
          :rows="20"
          autoresize
          class="font-mono text-sm w-full"
          spellcheck="false"
        />
        <UAlert v-if="error" color="error" variant="subtle" :title="error" />
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
const props = defineProps<{
  title: string
  subtitle?: string
  saveFn?: (payload: { markdown: string }) => void | Promise<void>
}>()

const emit = defineEmits<{ save: [{ markdown: string }]; close: [] }>()

const isOpen = ref(false)
const markdownText = ref('')
const error = ref('')
const saving = ref(false)

function show(initial: string) {
  markdownText.value = initial
  error.value = ''
  isOpen.value = true
}

function close() {
  isOpen.value = false
  emit('close')
}

async function save() {
  error.value = ''
  saving.value = true
  try {
    const payload = { markdown: markdownText.value }
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
