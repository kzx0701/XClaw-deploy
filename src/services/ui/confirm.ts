import { reactive } from 'vue'
import type { Component } from 'vue'

export type ConfirmRequest = {
  accept?: () => void
  acceptClass?: string
  acceptLabel?: string
  header?: string
  icon?: Component | null
  message: string
  rejectLabel?: string
}

export const confirmState = reactive<{
  current: ConfirmRequest | null
  visible: boolean
}>({
  current: null,
  visible: false,
})

export function useConfirm() {
  return {
    require(options: ConfirmRequest) {
      confirmState.current = options
      confirmState.visible = true
    },
  }
}

export function closeConfirm() {
  confirmState.visible = false
  confirmState.current = null
}

export function acceptConfirm() {
  const current = confirmState.current
  closeConfirm()
  current?.accept?.()
}
