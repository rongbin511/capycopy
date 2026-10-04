<template>
  <PaperViewer v-if="manifest" :subject="subject" :manifest="manifest" class="h-full min-h-0" />
  <div v-else-if="manifestError" class="flex items-center justify-center p-6 h-full">
    <UAlert color="error" variant="subtle" icon="i-lucide-circle-alert" :title="String(manifestError)" />
  </div>
  <div v-else class="flex items-center justify-center p-6 h-full">
    <UIcon name="i-lucide-loader-circle" class="size-8 animate-spin text-muted" />
  </div>
</template>

<script setup lang="ts">
import type { CombinedManifest } from '~/types/paper'
import { useTpbApi } from '~/composables/useTpbApi'

const route = useRoute()
const subject = computed(() => String(route.params.subject || 'english'))

const api = useTpbApi()
const { data: manifest, error: manifestError } = await useAsyncData(
  () => `manifest-${subject.value}`,
  () => api.getManifest() as Promise<CombinedManifest>,
)

useHead({
  title: () => (subject.value === 'chinese' ? 'Chinese Papers' : 'English Papers'),
})

definePageMeta({
  validate: (r) => ['english', 'math', 'science', 'hcl', 'chinese'].includes(String(r.params.subject)),
})
</script>
