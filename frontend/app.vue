<template>
  <NuxtLayout>
    <NuxtPage />
  </NuxtLayout>
</template>

<script setup lang="ts">
const { viewMode, answerDesign, markdownStyle } = useViewerPreferences()

useHead(() => ({
  htmlAttrs: {
    'data-qv-mode': viewMode.value,
    'data-answer-design': answerDesign.value,
    'data-markdown-style': markdownStyle.value,
  },
}))
</script>
