import { loadTaskHistory, saveTaskHistory } from '@/services/storage/task-history'
import type { TaskHistoryRecord } from '@/types/task'

function sortRecords(records: TaskHistoryRecord[]) {
  return [...records].sort((left, right) => {
    return new Date(right.finishedAt).getTime() - new Date(left.finishedAt).getTime()
  })
}

export async function getTaskHistory(projectId?: string | null) {
  const records = await loadTaskHistory()

  if (!projectId) {
    return sortRecords(records)
  }

  return sortRecords(records.filter((record) => record.projectId === projectId))
}

export async function appendTaskHistory(record: TaskHistoryRecord) {
  const records = await loadTaskHistory()
  const nextRecords = sortRecords([record, ...records]).slice(0, 50)
  await saveTaskHistory(nextRecords)
  return nextRecords
}
