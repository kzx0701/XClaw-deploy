<template>
  <AlertDialog :open="confirmState.visible">
    <AlertDialogContent class="max-w-[440px] border-border bg-[#141a28] text-slate-100 shadow-[0_24px_60px_rgba(2,6,23,0.55)]">
      <AlertDialogHeader>
        <div class="flex items-start gap-3">
          <div class="mt-0.5 flex h-9 w-9 items-center justify-center rounded-lg border border-[#3b1d1f] bg-[#241116] text-[#fca5a5]">
            <component :is="confirmState.current?.icon || TriangleAlert" class="h-4 w-4" />
          </div>
          <div class="min-w-0 flex-1">
            <AlertDialogTitle class="text-base font-semibold text-slate-100">
              {{ confirmState.current?.header || '请确认操作' }}
            </AlertDialogTitle>
          </div>
        </div>
        <AlertDialogDescription class="text-sm leading-7 text-slate-300">
          {{ confirmState.current?.message }}
        </AlertDialogDescription>
      </AlertDialogHeader>
      <AlertDialogFooter>
        <AlertDialogCancel
          class="border-[rgba(148,163,184,0.18)] bg-[#141a28] text-[#cbd5e1] hover:bg-[#1c2536] hover:text-[#e2e8f0]"
          @click="closeConfirm"
        >
          {{ confirmState.current?.rejectLabel || '取消' }}
        </AlertDialogCancel>
        <AlertDialogAction
          :class="confirmState.current?.acceptClass === 'p-button-danger'
            ? 'border-[#dc2626] bg-[#dc2626] text-[#fff1f2] hover:border-[#b91c1c] hover:bg-[#b91c1c]'
            : 'border-[#2563eb] bg-[#2563eb] text-[#eff6ff] hover:border-[#1d4ed8] hover:bg-[#1d4ed8]'"
          @click="acceptConfirm"
        >
          {{ confirmState.current?.acceptLabel || '确认' }}
        </AlertDialogAction>
      </AlertDialogFooter>
    </AlertDialogContent>
  </AlertDialog>
</template>

<script setup lang="ts">
import { TriangleAlert } from 'lucide-vue-next'

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { acceptConfirm, closeConfirm, confirmState } from '@/services/ui/confirm'
</script>
