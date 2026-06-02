import { invoke } from '@tauri-apps/api/core'

import { isTauriRuntime } from '@/services/project/runtime'

export interface LocalOpenClawGatewayConfig {
  authMode: 'token'
  openResponsesEnabled: boolean
  sourcePath: string
  token: string
  url: string
}

export async function loadLocalOpenClawGatewayConfig(): Promise<LocalOpenClawGatewayConfig> {
  if (!isTauriRuntime()) {
    throw new Error('当前为浏览器开发模式，暂不支持读取本机 OpenClaw 配置。请使用 pnpm tauri dev 启动桌面环境。')
  }

  return invoke<LocalOpenClawGatewayConfig>('load_local_openclaw_gateway_config')
}
