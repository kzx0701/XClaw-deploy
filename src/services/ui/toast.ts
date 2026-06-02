import { toast } from 'vue-sonner'

export type ToastType = 'success' | 'error' | 'info' | 'warning'

function getToastTitle(type: ToastType) {
  if (type === 'success') {
    return '操作成功'
  }

  if (type === 'error') {
    return '操作失败'
  }

  if (type === 'warning') {
    return '请注意'
  }

  return '提示'
}

export function showToast(content: string, type: ToastType = 'info') {
  toast[type === 'warning' ? 'warning' : type](content, {
    description: getToastTitle(type),
    duration: 2600,
  })
}
