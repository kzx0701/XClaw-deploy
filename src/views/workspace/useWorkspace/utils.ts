import { Globe2, ShieldCheck, Compass } from "lucide-vue-next"

import { formatEnvironmentLabel, formatUploadStrategyLabel } from "../formatters"

export function isObjectRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

export function getErrorMessage(error: unknown, fallback: string) {
  if (error instanceof Error && error.message.trim()) {
    return error.message
  }

  if (typeof error === "string" && error.trim()) {
    return error
  }

  if (isObjectRecord(error)) {
    if (typeof error.message === "string" && error.message.trim()) {
      return error.message
    }

    if (typeof error.error === "string" && error.error.trim()) {
      return error.error
    }

    try {
      return JSON.stringify(error)
    } catch {
      return fallback
    }
  }

  return fallback
}

export function isLikelyNetworkPermissionPrompt(message: string) {
  const normalized = message.toLowerCase()

  return (
    normalized.includes("no route to host") ||
    normalized.includes("network is unreachable") ||
    normalized.includes("os error 65") ||
    normalized.includes("couldn't connect to host")
  )
}

export function deferAfterPanelTransition() {
  return new Promise<void>((resolve) => {
    window.setTimeout(() => {
      requestAnimationFrame(() => resolve())
    }, 280)
  })
}

export { formatEnvironmentLabel, formatUploadStrategyLabel }

export function getEnvironmentIcon(name: string) {
  if (name === "test") return Globe2
  if (name === "prod") return ShieldCheck
  return Compass
}
