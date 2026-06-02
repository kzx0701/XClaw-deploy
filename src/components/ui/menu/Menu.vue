<script setup lang="ts">
import { ref } from 'vue'
import { cn } from '@/lib/utils'
import DropdownMenu from '@/components/ui/dropdown-menu/DropdownMenu.vue'
import DropdownMenuContent from '@/components/ui/dropdown-menu/DropdownMenuContent.vue'
import DropdownMenuItem from '@/components/ui/dropdown-menu/DropdownMenuItem.vue'
import DropdownMenuTrigger from '@/components/ui/dropdown-menu/DropdownMenuTrigger.vue'

type MenuItem = {
  command?: () => void
  icon?: object
  label: string
}

const props = withDefaults(defineProps<{
  class?: string
  model?: MenuItem[]
  popup?: boolean
}>(), {
  class: '',
  model: () => [],
  popup: false,
})

const open = ref(false)
const position = ref({ x: 0, y: 0 })

function toggle(event: Event) {
  const target = event.currentTarget as HTMLElement | null
  const rect = target?.getBoundingClientRect()

  position.value = {
    x: rect ? rect.left : 0,
    y: rect ? rect.bottom + 8 : 0,
  }

  open.value = !open.value
}

function handleSelect(item: MenuItem) {
  open.value = false
  item.command?.()
}

function handleOpenChange(nextOpen: boolean) {
  open.value = nextOpen
}

defineExpose({
  toggle,
})
</script>

<template>
  <DropdownMenu :open="open" @update:open="handleOpenChange">
    <DropdownMenuTrigger as-child>
      <button
        type="button"
        aria-hidden="true"
        tabindex="-1"
        class="pointer-events-none fixed h-0 w-0 opacity-0"
        :style="{ left: `${position.x}px`, top: `${position.y}px` }"
      />
    </DropdownMenuTrigger>

    <DropdownMenuContent
      align="start"
      side="bottom"
      :class="cn('min-w-[180px] border-[rgba(148,163,184,0.12)] bg-[#141a28] text-[#cbd5e1] shadow-[0_18px_40px_rgba(2,6,23,0.45)]', props.class)"
    >
      <DropdownMenuItem
        v-for="item in model"
        :key="item.label"
        class="gap-2 text-sm text-[#cbd5e1] focus:bg-[#1c2536] focus:text-[#f8fafc]"
        @select="handleSelect(item)"
      >
        <component :is="item.icon" v-if="item.icon" class="h-4 w-4 text-[#94a3b8]" />
        <span>{{ item.label }}</span>
      </DropdownMenuItem>
    </DropdownMenuContent>
  </DropdownMenu>
</template>
