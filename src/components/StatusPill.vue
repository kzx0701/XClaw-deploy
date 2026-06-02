<template>
  <Badge :variant="variant" class="min-w-[110px] justify-center rounded-lg px-3 py-1.5 text-[12px]">
    {{ label }}
  </Badge>
</template>

<script setup lang="ts">
import { computed } from 'vue'

import Badge from '@/components/ui/badge/Badge.vue'

const props = defineProps<{
  label: string
  status: 'disconnected' | 'connecting' | 'connected'
}>()

const variant = computed(() => {
  if (props.status === 'connected') {
    return 'default'
  }

  if (props.status === 'connecting') {
    return 'secondary'
  }

  return 'outline'
})
</script>
