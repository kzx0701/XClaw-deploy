import type { TaskHistoryRecord } from '@/types/task'

const STORAGE_KEY = 'claw-deploy:task-history'

function hasWindow() {
  return typeof window !== 'undefined'
}

export async function loadTaskHistory(): Promise<TaskHistoryRecord[]> {
  if (!hasWindow()) {
    return []
  }

  const raw = window.localStorage.getItem(STORAGE_KEY)

  if (!raw) {
    return []
  }

  try {
    const parsed = JSON.parse(raw) as TaskHistoryRecord[]
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

export async function saveTaskHistory(records: TaskHistoryRecord[]) {
  if (!hasWindow()) {
    return
  }

  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(records))
}
