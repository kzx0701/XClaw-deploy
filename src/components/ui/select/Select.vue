<script setup lang="ts">
import { computed, useSlots } from 'vue'
import { SelectRoot } from 'reka-ui'
import { cn } from '@/lib/utils'
import SelectContent from './SelectContent.vue'
import SelectItem from './SelectItem.vue'
import SelectTrigger from './SelectTrigger.vue'
import SelectValue from './SelectValue.vue'

type SelectOption = Record<string, unknown> | string | number

const props = withDefaults(defineProps<{
  class?: string
  disabled?: boolean
  fluid?: boolean
  modelValue?: string | number | null
  optionLabel?: string
  optionValue?: string
  options?: SelectOption[]
  placeholder?: string
}>(), {
  class: '',
  disabled: false,
  fluid: false,
  modelValue: undefined,
  optionLabel: 'label',
  optionValue: 'value',
  options: () => [],
  placeholder: '请选择',
})

const emit = defineEmits<{
  'update:modelValue': [value: string | number | undefined]
}>()

const slots = useSlots()

const normalizedOptions = computed(() =>
  props.options.map((option) => {
    if (typeof option === 'object' && option !== null) {
      const labelValue = option[props.optionLabel]
      const rawValue = option[props.optionValue]
      return {
        key: String(rawValue ?? ''),
        label: String(labelValue ?? rawValue ?? ''),
        rawValue: rawValue as string | number | undefined,
      }
    }

    return {
      key: String(option),
      label: String(option),
      rawValue: option,
    }
  }),
)

const selectedKey = computed(() => {
  if (props.modelValue === undefined || props.modelValue === null || props.modelValue === '') {
    return undefined
  }

  return String(props.modelValue)
})

function handleValueChange(nextValue: string) {
  if (useCustomSlot.value) {
    emit('update:modelValue', nextValue)
    return
  }

  const matched = normalizedOptions.value.find((option) => option.key === nextValue)
  emit('update:modelValue', matched?.rawValue)
}

const useCustomSlot = computed(() => Boolean(slots.default))
</script>

<template>
  <SelectRoot
    data-slot="select"
    :model-value="selectedKey"
    :disabled="disabled"
    @update:model-value="handleValueChange"
  >
    <slot v-if="useCustomSlot" />

    <template v-else>
      <SelectTrigger :class="cn(fluid ? 'w-full' : 'w-fit', props.class)">
        <SelectValue :placeholder="placeholder" />
      </SelectTrigger>

      <SelectContent>
        <SelectItem
          v-for="option in normalizedOptions"
          :key="option.key"
          :value="option.key"
        >
          {{ option.label }}
        </SelectItem>
      </SelectContent>
    </template>
  </SelectRoot>
</template>
