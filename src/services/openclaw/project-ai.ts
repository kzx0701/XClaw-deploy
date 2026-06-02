import { invoke } from '@tauri-apps/api/core'

import { isTauriRuntime } from '@/services/project/runtime'
import type { GatewayAiProjectReviewRequest, ProjectAiRecommendation } from '@/types/task'

export async function requestProjectAiRecommendation(
  request: GatewayAiProjectReviewRequest,
): Promise<ProjectAiRecommendation> {
  if (!isTauriRuntime()) {
    throw new Error('当前为浏览器开发模式，暂不支持通过桌面端调用 OpenClaw AI。请使用 pnpm tauri dev 启动桌面环境。')
  }

  return invoke<ProjectAiRecommendation>('request_project_ai_review', {
    request,
  })
}
