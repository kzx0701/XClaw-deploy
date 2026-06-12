import { ref, onMounted } from "vue"

import { showToast } from "@/services/ui/toast"

export interface LogEntry {
  id: string
  level: "info" | "warn" | "error" | "success"
  message: string
  timestamp: string
}

export function useLogs() {
  const logs = ref<LogEntry[]>([])

  function pushLog(level: LogEntry["level"], message: string) {
    logs.value = [
      {
        id: crypto.randomUUID(),
        level,
        message,
        timestamp: new Date().toISOString(),
      },
      ...logs.value,
    ].slice(0, 100)
  }

  async function copyLogs() {
    const text = logs.value
      .map((entry) => `[${entry.timestamp.slice(11, 19)}] [${entry.level}] ${entry.message}`)
      .join("\n")

    try {
      await navigator.clipboard.writeText(text)
      showToast("日志已复制到剪贴板", "success")
    } catch {
      showToast("复制日志失败", "error")
    }
  }

  onMounted(() => {
    pushLog("info", "日志面板已就绪")
  })

  return {
    logs,
    pushLog,
    copyLogs,
  }
}
