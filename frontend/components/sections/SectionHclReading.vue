<script setup lang="ts">
import SectionComprehensionOpenEnded from './SectionComprehensionOpenEnded.vue'

defineOptions({ inheritAttrs: false })
</script>

<template>
  <SectionComprehensionOpenEnded v-bind="$attrs" :chinese="true" />
</template>
