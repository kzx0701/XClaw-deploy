import type { UploadStrategy } from "@/types/task"

export function formatEnvironmentLabel(name: string) {
  if (name === "dev") {
    return "开发环境"
  }

  if (name === "test") {
    return "测试环境"
  }

  if (name === "prod") {
    return "生产环境"
  }

  return "自定义环境"
}

export function formatUploadStrategyLabel(strategy: UploadStrategy) {
  if (strategy === "clear-and-upload") {
    return "清空后上传"
  }

  return "直接覆盖"
}
