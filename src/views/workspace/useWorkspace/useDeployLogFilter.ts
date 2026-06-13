import { ref, computed } from "vue"
import type { Ref } from "vue"
import type { ExecutionMode, TaskHistoryRecord, TaskHistoryStatus } from "@/types/task"

export interface DeployLogFilterState {
  projectId: string | null
  environmentName: string | null
  status: TaskHistoryStatus | null
  mode: ExecutionMode | null
  keyword: string
}

export function useDeployLogFilter(records: Ref<TaskHistoryRecord[]>) {
  const filter = ref<DeployLogFilterState>({
    projectId: null,
    environmentName: null,
    status: null,
    mode: null,
    keyword: "",
  })

  const filteredRecords = computed(() => {
    return records.value
      .filter((record) => record.mode === "deploy" || record.mode === "build-and-deploy")
      .filter((record) => {
        if (filter.value.projectId && record.projectId !== filter.value.projectId) {
          return false
        }

        if (filter.value.environmentName && record.environmentName !== filter.value.environmentName) {
          return false
        }

        if (filter.value.status && record.status !== filter.value.status) {
          return false
        }

        if (filter.value.mode && record.mode !== filter.value.mode) {
          return false
        }

        if (filter.value.keyword) {
          const kw = filter.value.keyword.toLowerCase()
          const matchIn = [record.projectName, record.serverName, record.serverHost, record.summary].some(
            (field) => field?.toLowerCase().includes(kw),
          )
          if (!matchIn) {
            return false
          }
        }

        return true
      })
  })

  const hasActiveFilter = computed(() => {
    return (
      filter.value.projectId !== null ||
      filter.value.environmentName !== null ||
      filter.value.status !== null ||
      filter.value.mode !== null ||
      filter.value.keyword !== ""
    )
  })

  function resetFilter() {
    filter.value = {
      projectId: null,
      environmentName: null,
      status: null,
      mode: null,
      keyword: "",
    }
  }

  return {
    filter,
    filteredRecords,
    hasActiveFilter,
    resetFilter,
  }
}
