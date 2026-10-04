<script setup lang="ts">
import SectionMcqBase from './_SectionMcqBase.vue'
defineOptions({ inheritAttrs: false })
</script>
<template>
  <SectionMcqBase v-bind="$attrs" :show-passage="true" passage-mode="paragraphs" :inline-answers="false" />
</template>
