<template>
  <div class="flex flex-col min-h-0 px-1 pb-2">
    <p v-if="!collapsed" class="px-2 pb-2 text-xs font-medium text-muted uppercase tracking-wide">
      {{ subjectLabel }}
    </p>

    <div class="flex flex-col gap-0.5">
      <div v-for="group in yearGroups" :key="group.year">
        <UButton
          color="neutral"
          variant="ghost"
          block
          size="sm"
          class="justify-between font-medium"
          :trailing-icon="isYearCollapsed(group.year) ? 'i-lucide-chevron-right' : 'i-lucide-chevron-down'"
          @click="toggleYear(group.year)"
        >
          <span v-if="!collapsed">{{ group.year }}</span>
          <span v-else class="text-xs">{{ group.year.slice(-2) }}</span>
        </UButton>

        <div v-show="!isYearCollapsed(group.year) && !collapsed" class="mt-0.5 flex flex-col gap-0.5 ps-1">
          <UButton
            v-for="p in group.papers"
            :key="p.id"
            color="neutral"
            :variant="p.id === activePaperId ? 'soft' : 'ghost'"
            block
            size="sm"
            class="justify-start text-left h-auto py-1.5"
            @click="selectPaper(p.id)"
          >
            <span class="truncate text-xs">{{ p.navTitle || p.title || p.id }}</span>
          </UButton>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  collapsed?: boolean
}>()

const route = useRoute()
const router = useRouter()
const {
  subject,
  subjectLabel,
  yearGroups,
  paperId: activePaperId,
  toggleYear,
  isYearCollapsed,
} = usePaperSidebar()

function selectPaper(id: string) {
  router.push({
    path: `/papers/${subject.value}`,
    query: { ...route.query, paper: id },
  })
}
</script>
