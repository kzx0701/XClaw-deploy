<template>
  <AlertDialog :open="confirmState.visible" @update:open="handleOpenChange">
    <AlertDialogContent
      v-if="activeConfirm"
      size="sm"
      class="max-w-[380px] gap-5 border-[rgba(148,163,184,0.14)] bg-[#141a28] p-6 text-[#e2e8f0] shadow-[0_24px_60px_rgba(2,6,23,0.48)]"
    >
      <AlertDialogHeader class="items-center gap-3 text-center">
        <AlertDialogMedia class="bg-[rgba(239,68,68,0.12)] text-[#f87171]">
          <component :is="activeConfirm.icon || Trash2" class="size-4" />
        </AlertDialogMedia>
        <AlertDialogTitle class="text-center text-[17px] font-semibold tracking-[-0.01em] text-[#f8fafc]">
          {{ activeConfirm.header }}
        </AlertDialogTitle>
        <AlertDialogDescription class="max-w-[280px] text-center text-[13px] leading-6 text-[#94a3b8]">
          {{ activeConfirm.message }}
        </AlertDialogDescription>
      </AlertDialogHeader>

      <div
        v-if="activeConfirm.detailValue || activeConfirm.detailCode"
        class="rounded-lg border border-[rgba(148,163,184,0.14)] bg-[#111827] px-4 py-3"
      >
        <p v-if="activeConfirm.detailLabel" class="mb-2 text-[11px] font-medium tracking-[0.08em] text-[#64748b] uppercase">
          {{ activeConfirm.detailLabel }}
        </p>
        <p v-if="activeConfirm.detailValue" class="m-0 break-words text-[13px] font-semibold leading-6 text-[#e2e8f0]">
          {{ activeConfirm.detailValue }}
        </p>
        <code
          v-if="activeConfirm.detailCode"
          class="mt-1 block break-all text-[12px] leading-6 text-[#94a3b8]"
        >
          {{ activeConfirm.detailCode }}
        </code>
      </div>

      <AlertDialogFooter class="grid grid-cols-2 gap-3 sm:grid-cols-2">
        <AlertDialogCancel
          variant="secondary"
          class="mt-0 h-9 w-full border border-[rgba(59,130,246,0.14)] bg-[#111827] px-3 text-sm text-[#dbe4f0] shadow-none hover:bg-[#182132] hover:text-[#f8fafc]"
        >
          {{ activeConfirm.rejectLabel }}
        </AlertDialogCancel>
        <AlertDialogAction
          :variant="activeConfirm.acceptClass === 'p-button-danger' ? 'destructive' : 'default'"
          class="h-9 w-full border border-transparent px-3 text-sm shadow-none"
          @click="acceptConfirm"
        >
          {{ activeConfirm.acceptLabel }}
        </AlertDialogAction>
      </AlertDialogFooter>
    </AlertDialogContent>
  </AlertDialog>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { Trash2 } from 'lucide-vue-next'

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogMedia,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { acceptConfirm, confirmState } from '@/services/ui/confirm'

const activeConfirm = computed(() => {
  if (!confirmState.current) {
    return null
  }

  return {
    ...confirmState.current,
    acceptLabel: confirmState.current.acceptLabel || '确认',
    header: confirmState.current.header || '请确认操作',
    rejectLabel: confirmState.current.rejectLabel || '取消',
  }
})

function handleOpenChange(open: boolean) {
  confirmState.visible = open
}
</script>
