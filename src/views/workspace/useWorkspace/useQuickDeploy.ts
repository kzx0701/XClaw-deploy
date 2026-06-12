import { ref, computed, nextTick } from "vue"

import { runLocalBuild } from "@/services/execution/build"
import { runLocalDeploy } from "@/services/execution/deploy-local"
import { appendTaskHistory } from "@/services/task-history/repository"
import { showToast } from "@/services/ui/toast"
import { useAppStore } from "@/stores/app"
import type { ExecutionMode, ProjectRecord, ServerRecord, TaskHistoryRecord } from "@/types/task"
import { getErrorMessage, formatEnvironmentLabel, formatUploadStrategyLabel } from "./utils"
import type { QuickDeployEnvironmentOption } from "../types"
import type { Ref } from "vue"

interface UseQuickDeployOptions {
  selectedProjectId: Ref<string | null>
  projects: Ref<ProjectRecord[]>
  servers: Ref<ServerRecord[]>
  projectEnvironmentsMap: Ref<Map<string, any[]>>
  executionLogs: Ref<any[]>
  pushExecutionLog: (level: any, message: string) => void
  refreshDeploymentHistory: () => Promise<void>
  refreshTaskHistory: (projectId?: string) => Promise<void>
}

export function useQuickDeploy(options: UseQuickDeployOptions) {
  const appStore = useAppStore()

  const {
    selectedProjectId,
    projects,
    servers,
    projectEnvironmentsMap,
    executionLogs,
    pushExecutionLog,
    refreshDeploymentHistory,
    refreshTaskHistory,
  } = options

  const quickDeployProjectId = ref<string | null>(null)
  const quickDeployEnvironmentName = ref<string | null>(null)
  const isQuickDeployDialogVisible = ref(false)
  const quickDeployStage = ref<"confirm" | "running" | "success" | "error">("confirm")
  const quickDeployMessage = ref("")
  const quickDeployLogs = ref<string[]>([])

  const quickDeployOptionsByProject = computed(() => {
    const result = new Map<string, QuickDeployEnvironmentOption[]>()

    projects.value.forEach((project) => {
      const environments = projectEnvironmentsMap.value.get(project.id) ?? []
      const available = environments
        .filter((environment) => environment.enabled && (environment.name === "test" || environment.name === "prod"))
        .map((environment) => ({
          environment,
          project,
          server: servers.value.find((server) => server.id === environment.serverId) ?? null,
        }))
        .filter((item) => item.server && item.environment.remotePath.trim())

      result.set(project.id, available)
    })

    return result
  })

  const quickDeployDialogOptions = computed(() =>
    quickDeployProjectId.value ? (quickDeployOptionsByProject.value.get(quickDeployProjectId.value) ?? []) : [],
  )

  const quickDeploySelectedOption = computed<QuickDeployEnvironmentOption | null>(() => {
    if (!quickDeployProjectId.value || !quickDeployEnvironmentName.value) {
      return null
    }

    const options = quickDeployOptionsByProject.value.get(quickDeployProjectId.value) ?? []
    return options.find((item) => item.environment.name === quickDeployEnvironmentName.value) ?? null
  })

  const quickDeploySelectedProject = computed(() => {
    if (quickDeploySelectedOption.value?.project) {
      return quickDeploySelectedOption.value.project
    }

    if (!quickDeployProjectId.value) {
      return null
    }

    return projects.value.find((project) => project.id === quickDeployProjectId.value) ?? null
  })

  const quickDeploySelectedEnvironmentLabel = computed(() =>
    quickDeploySelectedOption.value ? formatEnvironmentLabel(quickDeploySelectedOption.value.environment.name) : "--",
  )

  const quickDeploySelectedServerLabel = computed(() => {
    const server = quickDeploySelectedOption.value?.server

    if (!server) {
      return "--"
    }

    return `${server.name} / ${server.host}:${server.port}`
  })

  const quickDeploySelectedStrategyLabel = computed(() =>
    quickDeploySelectedOption.value ? formatUploadStrategyLabel(quickDeploySelectedOption.value.environment.uploadStrategy) : "--",
  )

  const quickDeploySelectedRemotePath = computed(() => quickDeploySelectedOption.value?.environment.remotePath?.trim() || "--")

  const quickDeployDialogTitle = computed(() => {
    return "选择当前项目已配置的环境，直接发起部署。"
  })

  function hasQuickDeployOptions(projectId: string) {
    return (quickDeployOptionsByProject.value.get(projectId) ?? []).length > 0
  }

  function pushQuickDeployLog(message: string) {
    const timestamp = new Date().toLocaleTimeString("zh-CN", {
      hour12: false,
    })
    quickDeployLogs.value = [...quickDeployLogs.value, `[${timestamp}] ${message}`]
  }

  function resetQuickDeployState() {
    quickDeployProjectId.value = null
    quickDeployEnvironmentName.value = null
    quickDeployStage.value = "confirm"
    quickDeployMessage.value = ""
    quickDeployLogs.value = []
  }

  function openQuickDeployWorkspace(projectId: string) {
    if (!hasQuickDeployOptions(projectId)) {
      return
    }

    quickDeployProjectId.value = projectId
    quickDeployStage.value = "confirm"
    quickDeployMessage.value = ""
    quickDeployLogs.value = []
    isQuickDeployDialogVisible.value = true
  }

  function openQuickDeployDialog(option: QuickDeployEnvironmentOption) {
    quickDeployProjectId.value = option.project.id
    quickDeployEnvironmentName.value = option.environment.name
    quickDeployStage.value = "confirm"
    quickDeployMessage.value = ""
    quickDeployLogs.value = []
    isQuickDeployDialogVisible.value = true
  }

  async function startQuickDeploy(option: QuickDeployEnvironmentOption) {
    openQuickDeployDialog(option)
    await nextTick()
    await new Promise((resolve) => requestAnimationFrame(() => resolve(undefined)))
    await handleConfirmQuickDeploy()
  }

  function handleCloseQuickDeployDialog() {
    quickDeployStage.value = "confirm"
    quickDeployMessage.value = ""
  }

  async function handleConfirmQuickDeploy() {
    const option = quickDeploySelectedOption.value

    if (!option) {
      showToast("当前项目没有可用的测试环境或生产环境配置", "warning")
      isQuickDeployDialogVisible.value = false
      return
    }

    if (!option.project.defaultBuildCommand.trim()) {
      quickDeployStage.value = "error"
      quickDeployMessage.value = "当前项目缺少默认打包命令，请先在项目配置中保存后再执行一键部署。"
      pushQuickDeployLog(quickDeployMessage.value)
      showToast(quickDeployMessage.value, "warning")
      return
    }

    if (!option.project.defaultOutputDir.trim()) {
      quickDeployStage.value = "error"
      quickDeployMessage.value = "当前项目缺少默认产物目录，请先在项目配置中保存后再执行一键部署。"
      pushQuickDeployLog(quickDeployMessage.value)
      showToast(quickDeployMessage.value, "warning")
      return
    }

    if (!option.server) {
      quickDeployStage.value = "error"
      quickDeployMessage.value = "当前环境绑定的服务器不存在，请先重新保存环境配置。"
      pushQuickDeployLog(quickDeployMessage.value)
      showToast(quickDeployMessage.value, "error")
      return
    }

    if (option.server.authType === "password" && !option.server.password.trim()) {
      quickDeployStage.value = "error"
      quickDeployMessage.value = "当前服务器使用密码认证，但密码为空。"
      pushQuickDeployLog(quickDeployMessage.value)
      showToast(quickDeployMessage.value, "error")
      return
    }

    if (option.server.authType === "privateKey" && !option.server.privateKeyPath.trim()) {
      quickDeployStage.value = "error"
      quickDeployMessage.value = "当前服务器使用私钥认证，但私钥路径为空。"
      pushQuickDeployLog(quickDeployMessage.value)
      showToast(quickDeployMessage.value, "error")
      return
    }

    const startedAt = new Date().toISOString()
    const logStartCount = executionLogs.value.length
    const deployMode = option.environment.deployMode
    let buildOutputPath = `${option.project.localPath}/${option.project.defaultOutputDir}`
    let historySummary = ""
    let historyErrorMessage = ""

    quickDeployStage.value = "running"
    quickDeployMessage.value = "部署任务正在执行，请稍候。"
    quickDeployLogs.value = []

    pushQuickDeployLog(`准备部署项目 ${option.project.name}`)
    pushQuickDeployLog(`目标环境：${formatEnvironmentLabel(option.environment.name)}`)
    pushQuickDeployLog(`部署方式：${deployMode === "deploy" ? "直接部署" : "打包 + 部署"}`)
    pushQuickDeployLog(`部署策略：${formatUploadStrategyLabel(option.environment.uploadStrategy)}`)
    pushQuickDeployLog(`目标目录：${option.environment.remotePath}`)

    pushExecutionLog("info", `开始一键部署：${option.project.name} -> ${formatEnvironmentLabel(option.environment.name)}`)

    try {
      if (deployMode === "build-and-deploy") {
        const buildResult = await runLocalBuild({
          projectPath: option.project.localPath,
          buildCommand: option.project.defaultBuildCommand,
          outputDir: option.project.defaultOutputDir,
          precheckCommand: option.project.defaultPrecheckCommand,
          runPrecheck: option.project.defaultPrecheckEnabled,
        })

        if (buildResult.precheckRan) {
          pushQuickDeployLog(buildResult.precheckSuccess ? "前置校验执行成功" : "前置校验执行失败")
          pushExecutionLog(
            buildResult.precheckSuccess ? "success" : "error",
            buildResult.precheckSuccess ? "前置校验执行成功" : "前置校验执行失败",
          )

          if (buildResult.precheckOutput.trim()) {
            pushQuickDeployLog(buildResult.precheckOutput.trim())
            pushExecutionLog(buildResult.precheckSuccess ? "info" : "error", buildResult.precheckOutput.trim())
          }
        }

        if (!buildResult.success) {
          throw new Error(buildResult.buildOutput.trim() || "本地打包执行失败")
        }

        buildOutputPath = buildResult.outputPath
        pushQuickDeployLog(`本地打包完成：${buildResult.outputPath}`)
        pushExecutionLog("success", `一键部署打包完成：${buildResult.outputPath}`)
        if (buildResult.artifactMessage.trim()) {
          pushQuickDeployLog(buildResult.artifactMessage)
          pushExecutionLog(buildResult.artifactVerified ? "info" : "warn", buildResult.artifactMessage)
        }
        if (buildResult.artifactCandidates.length > 0) {
          pushExecutionLog("info", `候选产物目录：${buildResult.artifactCandidates.join("、")}`)
        }

        if (buildResult.buildOutput.trim()) {
          pushQuickDeployLog(buildResult.buildOutput.trim())
          pushExecutionLog("info", buildResult.buildOutput.trim())
        }
      } else {
        pushQuickDeployLog(`直接使用已有产物目录：${buildOutputPath}`)
        pushExecutionLog("info", `一键部署直接使用已有产物目录：${buildOutputPath}`)
      }

      pushQuickDeployLog(`开始连接服务器：${option.server.host}:${option.server.port}`)
      pushQuickDeployLog(`远端部署目录：${option.environment.remotePath}`)
      pushQuickDeployLog("部署任务已提交到桌面端后台线程执行。")

      const deployResult = await runLocalDeploy({
        environmentName: option.environment.name,
        outputPath: buildOutputPath,
        postDeployCommand: option.environment.postDeployCommand,
        projectName: option.project.name,
        remotePath: option.environment.remotePath,
        server: option.server,
        uploadStrategy: option.environment.uploadStrategy,
      })

      deployResult.steps.forEach((step) => {
        pushQuickDeployLog(step)
        pushExecutionLog("info", step)
      })

      if (!deployResult.success) {
        throw new Error(deployResult.errorMessage || deployResult.commandOutput || "远端部署执行失败")
      }

      if (deployResult.commandOutput.trim()) {
        pushQuickDeployLog(deployResult.commandOutput.trim())
        pushExecutionLog("info", deployResult.commandOutput.trim())
      }

      historySummary = `一键部署成功，已发布到${formatEnvironmentLabel(option.environment.name)}`
      quickDeployStage.value = "success"
      quickDeployMessage.value = `${option.project.name} 已成功部署到 ${formatEnvironmentLabel(option.environment.name)}。`
      pushQuickDeployLog(quickDeployMessage.value)
      pushExecutionLog("success", quickDeployMessage.value)
      appStore.setBannerMessage(quickDeployMessage.value)
      showToast("一键部署成功", "success")
    } catch (error) {
      const message = getErrorMessage(error, "一键部署失败")
      historySummary = `一键部署失败，目标环境 ${formatEnvironmentLabel(option.environment.name)}`
      historyErrorMessage = message
      quickDeployStage.value = "error"
      quickDeployMessage.value = message
      pushQuickDeployLog(message)
      pushExecutionLog("error", message)
      appStore.setBannerMessage(message)
      showToast(message, "error")
    } finally {
      const finishedAt = new Date().toISOString()
      const newLogs = executionLogs.value
        .slice(0, Math.max(executionLogs.value.length - logStartCount, 0))
        .map((entry) => `[${entry.timestamp.slice(11, 19)}] ${entry.message}`)
        .reverse()

      const historyRecord: TaskHistoryRecord = {
        id: crypto.randomUUID(),
        projectId: option.project.id,
        projectName: option.project.name,
        environmentName: option.environment.name,
        mode: deployMode,
        status: quickDeployStage.value === "success" ? "success" : "error",
        buildCommand: option.project.defaultBuildCommand,
        outputDir: option.project.defaultOutputDir,
        outputPath: buildOutputPath,
        serverName: option.server.name,
        serverHost: `${option.server.host}:${option.server.port}`,
        remotePath: option.environment.remotePath,
        startedAt,
        finishedAt,
        durationMs: Math.max(new Date(finishedAt).getTime() - new Date(startedAt).getTime(), 0),
        summary: historySummary || (quickDeployStage.value === "success" ? "一键部署成功" : "一键部署失败"),
        errorMessage: historyErrorMessage || undefined,
        logs: [...quickDeployLogs.value, ...newLogs].slice(-200),
      }

      await appendTaskHistory(historyRecord)
      await refreshDeploymentHistory()

      if (selectedProjectId.value === option.project.id) {
        await refreshTaskHistory(option.project.id)
      }
    }
  }

  return {
    quickDeployProjectId,
    quickDeployEnvironmentName,
    isQuickDeployDialogVisible,
    quickDeployStage,
    quickDeployMessage,
    quickDeployLogs,
    quickDeployOptionsByProject,
    quickDeployDialogOptions,
    quickDeploySelectedOption,
    quickDeploySelectedProject,
    quickDeploySelectedEnvironmentLabel,
    quickDeploySelectedServerLabel,
    quickDeploySelectedStrategyLabel,
    quickDeploySelectedRemotePath,
    quickDeployDialogTitle,
    hasQuickDeployOptions,
    openQuickDeployWorkspace,
    openQuickDeployDialog,
    startQuickDeploy,
    handleCloseQuickDeployDialog,
    handleConfirmQuickDeploy,
  }
}
