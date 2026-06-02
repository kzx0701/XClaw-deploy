import { invoke } from '@tauri-apps/api/core'

import { isTauriRuntime } from '@/services/project/runtime'
import type { ProjectAiContext, ProjectScanResult } from '@/types/task'

export async function scanProject(projectPath: string): Promise<ProjectScanResult> {
  if (!projectPath.trim()) {
    throw new Error('项目路径不能为空')
  }

  if (!isTauriRuntime()) {
    throw new Error('当前为浏览器开发模式，暂不支持直接读取本地项目目录。请使用 pnpm tauri dev 启动桌面环境。')
  }

  return invoke<ProjectScanResult>('scan_project', {
    projectPath: projectPath.trim(),
  })
}

export async function scanProjectAiContext(projectPath: string): Promise<ProjectAiContext> {
  if (!projectPath.trim()) {
    throw new Error('项目路径不能为空')
  }

  if (!isTauriRuntime()) {
    throw new Error('当前为浏览器开发模式，暂不支持读取本地项目上下文。请使用 pnpm tauri dev 启动桌面环境。')
  }

  return invoke<ProjectAiContext>('scan_project_ai_context', {
    projectPath: projectPath.trim(),
  })
}
