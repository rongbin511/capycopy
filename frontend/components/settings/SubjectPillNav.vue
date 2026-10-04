<template>
  <nav class="flex flex-wrap gap-2" aria-label="Subjects">
    <UButton
      v-for="item in items"
      :key="item.key"
      size="sm"
      :color="activeKey === item.key ? 'primary' : 'neutral'"
      :variant="activeKey === item.key ? 'solid' : 'soft'"
      :title="item.label"
      @click="emit('select', item.key)"
    >
      {{ item.label }}
    </UButton>
  </nav>
</template>

<script setup lang="ts">
defineProps<{
  items: Array<{ key: string; label: string }>
  activeKey: string
}>()

const emit = defineEmits<{ select: [key: string] }>()
</script>
