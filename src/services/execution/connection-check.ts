import { invoke } from '@tauri-apps/api/core'

import { isTauriRuntime } from '@/services/project/runtime'
import type { ServerConnectionCheckRequest, ServerConnectionCheckResult } from '@/types/task'

export async function runServerConnectionCheck(
  request: ServerConnectionCheckRequest,
): Promise<ServerConnectionCheckResult> {
  if (!isTauriRuntime()) {
    throw new Error('当前为浏览器开发模式，暂不支持测试服务器连接。请使用 pnpm tauri dev 启动桌面环境。')
  }

  try {
    return await invoke<ServerConnectionCheckResult>('check_server_connection', {
      request,
    })
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : typeof error === 'string'
          ? error
          : typeof error === 'object' && error !== null && 'message' in error && typeof error.message === 'string'
            ? error.message
            : JSON.stringify(error)

    throw new Error(message)
  }
}
