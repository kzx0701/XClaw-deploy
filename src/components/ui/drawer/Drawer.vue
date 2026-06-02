<script lang="ts" setup>
import { computed } from 'vue'
import { DrawerRoot } from 'vaul-vue'
import { cn } from '@/lib/utils'
import DrawerContent from './DrawerContent.vue'
import DrawerFooter from './DrawerFooter.vue'
import DrawerHeader from './DrawerHeader.vue'

const props = withDefaults(defineProps<{
  class?: string
  dismissable?: boolean
  modal?: boolean
  open?: boolean
  position?: 'left' | 'right' | 'top' | 'bottom'
  showCloseIcon?: boolean
  style?: string | Record<string, string | number>
  visible?: boolean
}>(), {
  class: '',
  dismissable: true,
  modal: true,
  open: undefined,
  position: 'right',
  showCloseIcon: true,
  style: undefined,
  visible: undefined,
})

const emit = defineEmits<{
  'update:open': [value: boolean]
  'update:visible': [value: boolean]
}>()

const resolvedOpen = computed(() => props.visible ?? props.open)
const direction = computed(() => props.position)

function handleOpenChange(nextOpen: boolean) {
  emit('update:visible', nextOpen)
  emit('update:open', nextOpen)
}

function handleOutsideInteract(event: Event) {
  if (!props.dismissable) {
    event.preventDefault()
  }
}
</script>

<template>
  <DrawerRoot
    data-slot="drawer"
    :open="resolvedOpen"
    :direction="direction"
    :dismissible="dismissable"
    :modal="modal"
    :should-scale-background="false"
    @update:open="handleOpenChange"
  >
    <DrawerContent
      :class="cn('border-[rgba(148,163,184,0.12)] bg-[#141a28] text-[#cbd5e1] shadow-[0_18px_40px_rgba(2,6,23,0.45)]', props.class)"
      :style="style"
      @interact-outside="handleOutsideInteract"
      @pointer-down-outside="handleOutsideInteract"
    >
      <DrawerHeader v-if="$slots.header">
        <slot name="header" />
      </DrawerHeader>

      <slot />

      <DrawerFooter v-if="$slots.footer">
        <slot name="footer" />
      </DrawerFooter>
    </DrawerContent>
  </DrawerRoot>
</template>
