import { watch, onMounted, ref } from "vue"

import { getTaskHistory, deleteTaskHistoryRecord } from "@/services/task-history/repository"
import { showToast } from "@/services/ui/toast"
import { runServerConnectionCheck } from "@/services/execution/connection-check"
import { useAppStore } from "@/stores/app"
import type { ExecutionDraft, ExecutionStatus, TaskHistoryRecord } from "@/types/task"
import { useProjectManager } from "./useWorkspace/useProjectManager"
import { useEnvironmentManager } from "./useWorkspace/useEnvironmentManager"
import { useServerManager } from "./useWorkspace/useServerManager"
import { useExecutionEngine } from "./useWorkspace/useExecutionEngine"
import { useQuickDeploy } from "./useWorkspace/useQuickDeploy"
import { useLogs } from "./useWorkspace/useLogs"

export function useWorkspaceController() {
  const appStore = useAppStore()

  appStore.setConnectionStatus("disconnected")

  const projectPathInput = ref("")
  const selectedProjectId = ref<string | null>(null)
  const latestScannedProject = ref<any>(null)
  const projectDraft = ref<any>(null)
  const executionDraft = ref<ExecutionDraft | null>(null)
  const executionStatus = ref<ExecutionStatus>("idle")
  const executionStatusMessage = ref("")
  const taskHistoryRecords = ref<TaskHistoryRecord[]>([])
  const deploymentHistoryRecords = ref<TaskHistoryRecord[]>([])
  const selectedTaskHistoryId = ref<string | null>(null)

  const logs = useLogs()

  const environmentManager = useEnvironmentManager({
    selectedProjectId,
    latestScannedProject,
    executionDraft,
    servers: ref([]),
  })

  const serverManager = useServerManager({
    selectedProjectId,
    environmentDraft: environmentManager.environmentDraft,
    projectEnvironmentsMap: environmentManager.projectEnvironmentsMap,
    projects: ref([]),
    loadEnvironmentDraft: async () => {},
    refreshProjectEnvironmentMap: async () => {},
    pushServerLog: logs.pushLog,
  })

  environmentManager.servers = serverManager.servers

  const projectManager = useProjectManager({
    selectedProjectId,
    latestScannedProject,
    projectDraft,
    projectPathInput,
    executionDraft,
    environmentDraft: environmentManager.environmentDraft,
    selectedEnvironmentName: environmentManager.selectedEnvironmentName,
    isEnvironmentEditorVisible: environmentManager.isEnvironmentEditorVisible,
    taskHistoryRecords,
    selectedTaskHistoryId,
    projectEnvironments: environmentManager.projectEnvironments,
  })

  serverManager.projects = projectManager.projects
  serverManager.loadEnvironmentDraft = async (projectId: string) => {
    await environmentManager.loadEnvironmentDraft(projectId, projectManager.projects.value)
  }
  serverManager.refreshProjectEnvironmentMap = async () => {
    await environmentManager.refreshProjectEnvironmentMapWithData(projectManager.projects.value.map((p: any) => p.id))
  }

  async function refreshTaskHistory(projectId?: string | null) {
    taskHistoryRecords.value = await getTaskHistory(projectId)
    selectedTaskHistoryId.value = taskHistoryRecords.value[0]?.id ?? null
  }

  async function refreshDeploymentHistory() {
    deploymentHistoryRecords.value = await getTaskHistory()
  }

  async function handleDeleteDeploymentHistoryRecord(recordId: string) {
    await deleteTaskHistoryRecord(recordId)
    await refreshDeploymentHistory()

    if (selectedProjectId.value) {
      await refreshTaskHistory(selectedProjectId.value)
    } else {
      await refreshTaskHistory()
    }

    showToast("部署日志已删除", "success")
  }

  const execution = useExecutionEngine({
    latestScannedProject,
    executionDraft,
    executionStatus,
    executionStatusMessage,
    servers: serverManager.servers,
    environmentDraft: environmentManager.environmentDraft,
    executionLogs: logs.logs,
    pushExecutionLog: logs.pushLog,
    refreshDeploymentHistory,
    refreshTaskHistory,
  })

  const quickDeploy = useQuickDeploy({
    selectedProjectId,
    projects: projectManager.projects,
    servers: serverManager.servers,
    projectEnvironmentsMap: environmentManager.projectEnvironmentsMap,
    executionLogs: logs.logs,
    pushExecutionLog: logs.pushLog,
    refreshDeploymentHistory,
    refreshTaskHistory,
  })

  async function handleSelectProject(projectId: string) {
    await projectManager.handleSelectProject(projectId)

    if (selectedProjectId.value === projectId && projectManager.projects.value.length > 0) {
      await environmentManager.loadEnvironmentDraft(projectId, projectManager.projects.value)
      await refreshTaskHistory(projectId)
    }
  }

  onMounted(async () => {
    await projectManager.refreshProjects()
    await serverManager.refreshServers()
    await refreshDeploymentHistory()

    if (selectedProjectId.value) {
      await environmentManager.loadEnvironmentDraft(selectedProjectId.value, projectManager.projects.value)
      await refreshTaskHistory(selectedProjectId.value)
    }
  })

  watch(
    () => executionDraft.value?.environmentName,
    (environmentName, previousName) => {
      if (!environmentName || environmentName === previousName || !selectedProjectId.value) {
        return
      }

      void environmentManager.syncEnvironmentByName(environmentName, projectManager.projects.value)
    },
  )

  return {
    appStore,
    projectPathInput,
    isImporting: projectManager.isImporting,
    importError: projectManager.importError,
    projects: projectManager.projects,
    latestScannedProject,
    selectedProjectId,
    projectDraft,
    environmentDraft: environmentManager.environmentDraft,
    selectedEnvironmentName: environmentManager.selectedEnvironmentName,
    isEnvironmentEditorVisible: environmentManager.isEnvironmentEditorVisible,
    environmentEditorMode: environmentManager.environmentEditorMode,
    isCheckingEnvironment: environmentManager.isCheckingEnvironment,
    servers: serverManager.servers,
    taskHistoryRecords,
    deploymentHistoryRecords,
    selectedTaskHistoryId,
    isCreatingServer: serverManager.isCreatingServer,
    selectedServerId: serverManager.selectedServerId,
    serverDraft: serverManager.serverDraft,
    executionDraft,
    executionStatus,
    executionStatusMessage,
    quickDeployProjectId: quickDeploy.quickDeployProjectId,
    quickDeployEnvironmentName: quickDeploy.quickDeployEnvironmentName,
    isQuickDeployDialogVisible: quickDeploy.isQuickDeployDialogVisible,
    quickDeployStage: quickDeploy.quickDeployStage,
    quickDeployMessage: quickDeploy.quickDeployMessage,
    quickDeployLogs: quickDeploy.quickDeployLogs,
    projectSummaries: projectManager.projectSummaries,
    quickDeployDialogOptions: quickDeploy.quickDeployDialogOptions,
    quickDeploySelectedProject: quickDeploy.quickDeploySelectedProject,
    quickDeploySelectedEnvironmentLabel: quickDeploy.quickDeploySelectedEnvironmentLabel,
    quickDeploySelectedServerLabel: quickDeploy.quickDeploySelectedServerLabel,
    quickDeploySelectedStrategyLabel: quickDeploy.quickDeploySelectedStrategyLabel,
    quickDeploySelectedRemotePath: quickDeploy.quickDeploySelectedRemotePath,
    quickDeployDialogTitle: quickDeploy.quickDeployDialogTitle,
    environmentCards: environmentManager.environmentCards,
    executionEnvironmentOptions: environmentManager.executionEnvironmentOptions,
    isPresetEnvironment: environmentManager.isPresetEnvironment,
    executionSummary: execution.executionSummary,
    canRunExecution: execution.canRunExecution,
    workspacePanelKey: projectManager.workspacePanelKey,
    copyLogs: logs.copyLogs,
    formatEnvironmentLabel: environmentManager.formatEnvironmentLabel,
    hasQuickDeployOptions: quickDeploy.hasQuickDeployOptions,
    handlePickDirectory: projectManager.handlePickDirectory,
    handleSelectProject,
    openQuickDeployWorkspace: quickDeploy.openQuickDeployWorkspace,
    openProjectDeleteDialog: projectManager.openProjectDeleteDialog,
    handleBackToProjectList: projectManager.handleBackToProjectList,
    handleRunExecution: execution.handleRunExecution,
    handleSaveProjectConfig: projectManager.handleSaveProjectConfig,
    handleCheckEnvironment: async () => {
      if (!environmentManager.environmentDraft.value) {
        showToast("请先选择一个项目环境", "warning")
        return
      }
      if (!environmentManager.environmentDraft.value.serverId) {
        showToast("请先为当前环境绑定服务器", "warning")
        return
      }
      if (!environmentManager.environmentDraft.value.remotePath.trim()) {
        showToast("请先填写远端部署目录", "warning")
        return
      }

      const server = serverManager.servers.value.find((item) => item.id === environmentManager.environmentDraft.value?.serverId) ?? null

      if (!server) {
        showToast("当前环境绑定的服务器不存在，请重新选择", "error")
        return
      }

      const envLabel = environmentManager.formatEnvironmentLabel(environmentManager.environmentDraft.value.name)
      logs.pushLog("info", `开始检测环境 ${envLabel} 的远端目录权限`)
      environmentManager.isCheckingEnvironment.value = true

      try {
        const result = await runServerConnectionCheck({
          authType: server.authType,
          host: server.host,
          password: server.password,
          port: server.port,
          privateKeyPath: server.privateKeyPath,
          remotePath: environmentManager.environmentDraft.value.remotePath,
          username: server.username,
        })

        result.steps.forEach((step) => logs.pushLog("info", step))
        logs.pushLog("success", `环境 ${envLabel} 连接与目录检测通过`)
        appStore.setBannerMessage(`${envLabel} 检测通过`)
        showToast(`${envLabel} 检测通过`, "success")
      } catch (error) {
        const message = error instanceof Error ? error.message : "环境连接检测失败"
        logs.pushLog("error", message)
        appStore.setBannerMessage(message)
        showToast(message, "error")
      } finally {
        environmentManager.isCheckingEnvironment.value = false
      }
    },
    handleCloseEnvironmentEditor: environmentManager.handleCloseEnvironmentEditor,
    handleCreateEnvironment: environmentManager.handleCreateEnvironment,
    handleConfirmDeleteEnvironment: environmentManager.handleConfirmDeleteEnvironment,
    handleConfirmDeleteEnvironmentByName: environmentManager.handleConfirmDeleteEnvironmentByName,
    handleResetEnvironmentDraft: environmentManager.handleResetEnvironmentDraft,
    handleSaveEnvironment: () => environmentManager.handleSaveEnvironment(projectManager.projects.value, projectManager.handleSaveProjectConfig as any),
    handleSelectEnvironment: environmentManager.handleSelectEnvironment,
    handleCheckServer: serverManager.handleCheckServer,
    handleCloseCreateServer: serverManager.handleCloseCreateServer,
    handleCreateServer: serverManager.handleCreateServer,
    handleConfirmDeleteServerById: serverManager.handleConfirmDeleteServerById,
    handleDeleteDeploymentHistoryRecord,
    handleSaveServer: serverManager.handleSaveServer,
    handleSelectServer: serverManager.handleSelectServer,
    startQuickDeploy: quickDeploy.startQuickDeploy,
    handleCloseQuickDeployDialog: quickDeploy.handleCloseQuickDeployDialog,
  }
}
