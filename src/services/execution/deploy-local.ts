import { invoke } from '@tauri-apps/api/core'

import { isTauriRuntime } from '@/services/project/runtime'
import type { DeployExecutionContext } from '@/types/task'

export interface LocalDeployResult {
  commandOutput: string
  errorMessage?: string
  filesUploaded: number
  steps: string[]
  success: boolean
}

export async function runLocalDeploy(context: DeployExecutionContext): Promise<LocalDeployResult> {
  if (!isTauriRuntime()) {
    throw new Error('当前为浏览器开发模式，暂不支持本地部署。请使用 pnpm tauri dev 启动桌面环境。')
  }

  try {
    return await invoke<LocalDeployResult>('run_local_deploy', {
      request: {
        authType: context.server.authType,
        host: context.server.host,
        outputPath: context.outputPath,
        password: context.server.password,
        port: context.server.port,
        postDeployCommand: context.postDeployCommand,
        privateKeyPath: context.server.privateKeyPath,
        projectName: context.projectName,
        remotePath: context.remotePath,
        uploadStrategy: context.uploadStrategy,
        username: context.server.username,
      },
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
