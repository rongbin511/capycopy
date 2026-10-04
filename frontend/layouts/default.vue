<template>
  <UDashboardGroup unit="rem" storage-key="tpb-app" class="min-h-dvh">
    <UDashboardSidebar
      id="app"
      collapsible
      resizable
      :default-size="17"
      :min-size="12"
      :max-size="24"
      class="border-e border-default"
    >
      <template #header="{ collapsed }">
        <NuxtLink to="/" class="flex items-center gap-2 font-semibold text-highlighted truncate">
          <UIcon name="i-lucide-graduation-cap" class="size-5 shrink-0 text-primary" />
          <span v-if="!collapsed" class="truncate">Exam Papers</span>
        </NuxtLink>
      </template>

      <template #default="{ collapsed }">
        <div class="flex flex-col h-full min-h-0">
          <div class="shrink-0">
            <AppNav />
          </div>

          <div
            v-if="sidebarEnabled"
            class="flex-1 min-h-0 overflow-y-auto border-t border-default mt-2 pt-2"
          >
            <PaperListNav :collapsed="collapsed" />
          </div>
        </div>
      </template>
    </UDashboardSidebar>

    <UDashboardPanel id="main" class="min-w-0 flex flex-col min-h-dvh">
      <template #header>
        <slot name="header" />
      </template>
      <template #body>
        <div class="h-full min-h-0 flex flex-col">
          <slot />
        </div>
      </template>
    </UDashboardPanel>
  </UDashboardGroup>
</template>

<script setup lang="ts">
const { enabled: sidebarEnabled } = usePaperSidebar()
</script>
