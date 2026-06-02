<script setup lang="ts">
import { computed } from 'vue'
import { DialogRoot } from 'reka-ui'
import { cn } from '@/lib/utils'
import DialogContent from './DialogContent.vue'
import DialogFooter from './DialogFooter.vue'
import DialogHeader from './DialogHeader.vue'

const props = withDefaults(defineProps<{
  class?: string
  closable?: boolean
  closeOnEscape?: boolean
  defaultOpen?: boolean
  dismissableMask?: boolean
  modal?: boolean
  open?: boolean
  style?: string | Record<string, string | number>
  visible?: boolean
}>(), {
  class: '',
  closable: true,
  closeOnEscape: true,
  defaultOpen: false,
  dismissableMask: true,
  modal: true,
  open: undefined,
  style: undefined,
  visible: undefined,
})

const emit = defineEmits<{
  hide: []
  'update:open': [value: boolean]
  'update:visible': [value: boolean]
}>()

const resolvedOpen = computed(() => props.visible ?? props.open)

function handleOpenChange(nextOpen: boolean) {
  if (resolvedOpen.value && !nextOpen) {
    emit('hide')
  }

  emit('update:visible', nextOpen)
  emit('update:open', nextOpen)
}

function handleOutsideInteract(event: Event) {
  if (!props.dismissableMask) {
    event.preventDefault()
  }
}

function handleEscapeKey(event: Event) {
  if (!props.closeOnEscape) {
    event.preventDefault()
  }
}
</script>

<template>
  <DialogRoot
    data-slot="dialog"
    :modal="modal"
    :default-open="defaultOpen"
    :open="resolvedOpen"
    @update:open="handleOpenChange"
  >
    <DialogContent
      :show-close-button="closable"
      :class="cn('border-[rgba(148,163,184,0.12)] bg-[#141a28] text-[#cbd5e1] shadow-[0_18px_40px_rgba(2,6,23,0.45)]', props.class)"
      :style="style"
      @escape-key-down="handleEscapeKey"
      @interact-outside="handleOutsideInteract"
      @pointer-down-outside="handleOutsideInteract"
    >
      <DialogHeader v-if="$slots.header">
        <slot name="header" />
      </DialogHeader>

      <slot />

      <DialogFooter v-if="$slots.footer">
        <slot name="footer" />
      </DialogFooter>
    </DialogContent>
  </DialogRoot>
</template>
