<template>
  <Badge :variant="variant" :class="[rounded ? 'rounded-full' : 'rounded-lg', props.class]">
    <slot />
  </Badge>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import Badge from '@/components/ui/badge/Badge.vue'

const props = withDefaults(defineProps<{
  class?: string
  rounded?: boolean
  severity?: 'success' | 'warn' | 'danger' | 'secondary' | 'contrast'
}>(), {
  class: '',
  rounded: false,
  severity: 'secondary',
})

const variant = computed(() => {
  if (props.severity === 'success') {
    return 'default'
  }

  if (props.severity === 'warn') {
    return 'secondary'
  }

  if (props.severity === 'danger') {
    return 'destructive'
  }

  if (props.severity === 'contrast') {
    return 'outline'
  }

  return 'secondary'
})
</script>
