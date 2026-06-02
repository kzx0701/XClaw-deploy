<template>
  <Switch
    :model-value="modelValue"
    @update:model-value="$emit('update:modelValue', Boolean($event))"
  />
</template>

<script setup lang="ts">
import Switch from '@/components/ui/switch/Switch.vue'

withDefaults(defineProps<{
  modelValue?: boolean
}>(), {
  modelValue: false,
})

defineEmits<{
  'update:modelValue': [value: boolean]
}>()
</script>
