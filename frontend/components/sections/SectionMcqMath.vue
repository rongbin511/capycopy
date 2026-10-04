<script setup lang="ts">
import SectionMcqBase from './_SectionMcqBase.vue'

defineOptions({ inheritAttrs: false })
</script>

<template>
  <SectionMcqBase v-bind="$attrs" :math-mode="true" :inline-answers="false" />
</template>
