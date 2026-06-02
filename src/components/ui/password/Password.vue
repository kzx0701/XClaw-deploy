<script setup lang="ts">
import { ref } from 'vue'
import { Eye, EyeOff } from 'lucide-vue-next'
import { cn } from '@/lib/utils'
import Button from '@/components/ui/button/Button.vue'
import InputText from '@/components/ui/input/Input.vue'

const props = withDefaults(defineProps<{
  class?: string
  feedback?: boolean
  fluid?: boolean
  modelValue?: string
  placeholder?: string
  toggleMask?: boolean
}>(), {
  class: '',
  feedback: false,
  fluid: false,
  modelValue: '',
  placeholder: '',
  toggleMask: false,
})

defineEmits<{
  'update:modelValue': [value: string]
}>()

const show = ref(false)
</script>

<template>
  <div :class="cn('relative', props.fluid ? 'w-full' : 'w-fit', props.class)">
    <InputText
      :model-value="modelValue"
      :type="show ? 'text' : 'password'"
      :placeholder="placeholder"
      :fluid="fluid"
      :class="toggleMask ? 'pr-11' : ''"
      @update:model-value="$emit('update:modelValue', String($event ?? ''))"
    />

    <Button
      v-if="toggleMask"
      type="button"
      variant="ghost"
      size="icon"
      class="absolute top-1/2 right-1 h-7 w-7 -translate-y-1/2 text-[#94a3b8] hover:text-[#e2e8f0]"
      :aria-label="show ? '隐藏密码' : '显示密码'"
      @click="show = !show"
    >
      <EyeOff v-if="show" class="h-4 w-4" />
      <Eye v-else class="h-4 w-4" />
    </Button>
  </div>
</template>
