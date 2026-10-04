<template>
  <div class="flex flex-wrap items-center gap-2" role="toolbar" aria-label="Section toolbar">
    <UFieldGroup size="sm">
      <UButton
        :color="viewMode === 'study' ? 'primary' : 'neutral'"
        :variant="viewMode === 'study' ? 'solid' : 'ghost'"
        icon="i-lucide-pencil-line"
        @click="emit('mode', 'study')"
      >
        Study
      </UButton>
      <UButton
        :color="viewMode === 'answers' ? 'primary' : 'neutral'"
        :variant="viewMode === 'answers' ? 'solid' : 'ghost'"
        icon="i-lucide-check-circle"
        @click="emit('mode', 'answers')"
      >
        Answer
      </UButton>
      <UButton
        :color="notePressed ? 'primary' : 'neutral'"
        :variant="notePressed ? 'solid' : 'ghost'"
        icon="i-lucide-sticky-note"
        :disabled="noteDisabled"
        @click="emit('toggle-note')"
      >
        Note
      </UButton>
    </UFieldGroup>

    <UFieldGroup size="sm" aria-label="Paper zoom">
      <UButton
        color="neutral"
        variant="ghost"
        icon="i-lucide-minus"
        :disabled="!canZoomOut"
        aria-label="Zoom out"
        @click="zoomOut"
      />
      <UButton
        color="neutral"
        variant="ghost"
        class="min-w-12 tabular-nums"
        title="Reset zoom to 100%"
        @click="resetPaperZoom"
      >
        {{ paperZoomPercent }}
      </UButton>
      <UButton
        color="neutral"
        variant="ghost"
        icon="i-lucide-plus"
        :disabled="!canZoomIn"
        aria-label="Zoom in"
        @click="zoomIn"
      />
    </UFieldGroup>

    <UButton
      size="sm"
      color="neutral"
      variant="ghost"
      :icon="showInstructions ? 'i-lucide-eye' : 'i-lucide-eye-off'"
      @click="emit('toggle-instructions')"
    />

    <UButton size="sm" color="neutral" variant="outline" icon="i-lucide-file-down" @click="emit('study-pdf')">
      PDF
    </UButton>
    <UButton
      v-if="writingUi?.show_image_upload"
      size="sm"
      color="neutral"
      variant="outline"
      icon="i-lucide-image-up"
      @click="emit('writing-image')"
    >
      Image
    </UButton>
    <UButton size="sm" color="neutral" variant="outline" icon="i-lucide-layers-3" @click="emit('edit-model')">
      Model
    </UButton>
    <UButton
      v-if="markAvailable"
      size="sm"
      color="neutral"
      variant="outline"
      :icon="markPressed ? 'i-lucide-badge-check' : 'i-lucide-badge'"
      :disabled="markDisabled"
      :title="markTitle"
      @click="emit('mark')"
    >
      {{ markPressed ? 'Unmark' : 'Mark' }}
    </UButton>
  </div>
</template>

<script setup lang="ts">
import type { ViewMode, WritingUiSpec } from '~/types/paper'

defineProps<{
  viewMode: ViewMode
  writingUi?: WritingUiSpec | null
  showInstructions?: boolean
  notePressed?: boolean
  noteDisabled?: boolean
  markAvailable?: boolean
  markPressed?: boolean
  markDisabled?: boolean
  markTitle?: string
}>()

const emit = defineEmits<{
  mode: [ViewMode]
  'toggle-instructions': []
  'toggle-note': []
  'study-pdf': []
  'edit-model': []
  'writing-image': []
  mark: []
}>()

const {
  paperZoomPercent,
  canZoomOut,
  canZoomIn,
  zoomIn,
  zoomOut,
  resetPaperZoom,
} = useViewerPreferences()
</script>
