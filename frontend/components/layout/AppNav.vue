<template>
  <div class="flex flex-col gap-1 p-2">
    <UNavigationMenu
      :items="items"
      orientation="vertical"
      class="w-full"
    />
  </div>
</template>

<script setup lang="ts">
import type { NavigationMenuItem } from '@nuxt/ui'

const route = useRoute()

const items = computed<NavigationMenuItem[]>(() => [
  {
    label: 'Home',
    icon: 'i-lucide-house',
    to: '/',
    active: route.path === '/',
  },
  {
    label: 'English',
    icon: 'i-lucide-book-open',
    to: '/papers/english',
    active: route.path.startsWith('/papers/english'),
  },
  {
    label: 'Math',
    icon: 'i-lucide-sigma',
    to: '/papers/math',
    active: route.path.startsWith('/papers/math'),
  },
  {
    label: 'Science',
    icon: 'i-lucide-atom',
    to: '/papers/science',
    active: route.path.startsWith('/papers/science'),
  },
  {
    label: 'Chinese',
    icon: 'i-lucide-languages',
    to: '/papers/chinese',
    active: route.path.startsWith('/papers/chinese'),
  },
  {
    label: 'Higher Chinese',
    icon: 'i-lucide-graduation-cap',
    to: '/papers/hcl',
    active: route.path.startsWith('/papers/hcl'),
  },
  {
    label: 'Settings',
    icon: 'i-lucide-settings',
    to: '/settings',
    active: route.path === '/settings',
  },
])
</script>
