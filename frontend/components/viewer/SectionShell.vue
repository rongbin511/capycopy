<template>
  <section
    :id="navKey"
    class="tpb-paper-section scroll-mt-4 mx-auto"
    :data-section-id="navKey"
    :data-stem="bucket.stem"
  >
    <div class="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between px-1">
      <h2 class="text-base font-semibold text-highlighted leading-snug">
        {{ bucket.title || bucket.stem || navKey }}
      </h2>
      <UBadge v-if="bucket.marks != null" color="neutral" variant="subtle" class="self-start sm:self-auto">
        {{ bucket.marks }} marks
      </UBadge>
    </div>

    <article class="tpb-paper-sheet" :class="{ 'tpb-paper-sheet--open-ended': isOpenEndedSection }">
      <UAlert
        v-if="bucket.instruction && showInstructions"
        color="neutral"
        variant="subtle"
        icon="i-lucide-info"
        title="Instructions"
        class="mb-4"
      >
        <template #description>
          <span class="tpb-stem" v-html="instructionHtml" />
        </template>
      </UAlert>

      <div class="space-y-6">
        <slot />
      </div>
    </article>
  </section>
</template>

<script setup lang="ts">
import type { SectionBucket } from '~/types/paper'
import { renderMarkdownInline } from '~/utils/paperBundle'

const props = defineProps<{
  bucket: SectionBucket
  navKey: string
  active?: boolean
  showInstructions?: boolean
  headingMeta?: string
}>()

const instructionHtml = computed(() => renderMarkdownInline(props.bucket.instruction || ''))

const isOpenEndedSection = computed(() =>
  String(props.bucket.stem || '').startsWith('109-comprehension-open-ended'),
)
</script>
