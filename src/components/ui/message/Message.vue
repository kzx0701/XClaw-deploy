<template>
  <Alert :class="[toneClass, props.class]" :variant="variant">
    <slot />
  </Alert>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import Alert from '@/components/ui/alert/Alert.vue'

const props = withDefaults(defineProps<{
  class?: string
  closable?: boolean
  severity?: 'success' | 'warn' | 'error' | 'secondary' | 'info'
}>(), {
  class: '',
  closable: false,
  severity: 'info',
})

const variant = computed(() => {
  if (props.severity === 'error') {
    return 'destructive'
  }

  return 'default'
})

const toneClass = computed(() => {
  if (props.severity === 'success') {
    return 'border-[#14532d] bg-[#06271a] text-[#a7f3d0]'
  }

  if (props.severity === 'warn') {
    return 'border-[#7c2d12] bg-[#2d160d] text-[#fdba74]'
  }

  if (props.severity === 'error') {
    return 'border-[#7f1d1d] bg-[#2f1116] text-[#fecaca]'
  }

  if (props.severity === 'secondary') {
    return 'border-[rgba(148,163,184,0.14)] bg-[#111827] text-[#94a3b8]'
  }

  return 'border-[#1d4ed8] bg-[#0f1f3a] text-[#bfdbfe]'
})
</script>
