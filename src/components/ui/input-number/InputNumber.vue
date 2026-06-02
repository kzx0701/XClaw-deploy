<template>
  <NumberField
    :model-value="modelValue"
    :min="min"
    :max="max"
    :class="fluid ? 'w-full' : ''"
    @update:model-value="$emit('update:modelValue', Number($event))"
  >
    <NumberFieldContent>
      <NumberFieldDecrement />
      <NumberFieldInput class="h-10 rounded-lg border-[rgba(148,163,184,0.18)] bg-[#101722] px-8 text-[#cbd5e1]" />
      <NumberFieldIncrement />
    </NumberFieldContent>
  </NumberField>
</template>

<script setup lang="ts">
import NumberField from '@/components/ui/number-field/NumberField.vue'
import NumberFieldContent from '@/components/ui/number-field/NumberFieldContent.vue'
import NumberFieldDecrement from '@/components/ui/number-field/NumberFieldDecrement.vue'
import NumberFieldIncrement from '@/components/ui/number-field/NumberFieldIncrement.vue'
import NumberFieldInput from '@/components/ui/number-field/NumberFieldInput.vue'

withDefaults(defineProps<{
  fluid?: boolean
  max?: number
  min?: number
  modelValue?: number
}>(), {
  fluid: false,
  max: Number.MAX_SAFE_INTEGER,
  min: Number.MIN_SAFE_INTEGER,
  modelValue: 0,
})

defineEmits<{
  'update:modelValue': [value: number]
}>()
</script>
