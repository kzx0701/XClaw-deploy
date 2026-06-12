import { ref, computed } from "vue"

import { runLocalBuild } from "@/services/execution/build"
import { runLocalDeploy } from "@/services/execution/deploy-local"
import { appendTaskHistory } from "@/services/task-history/repository"
import { showToast } from "@/services/ui/toast"
import { useAppStore } from "@/stores/app"
import type { ExecutionDraft, ExecutionStatus, ExecutionSummaryItem, ProjectRecord, ServerRecord, TaskHistoryRecord } from "@/types/task"
import { getErrorMessage, isLikelyNetworkPermissionPrompt } from "./utils"
import type { Ref } from "vue"

interface UseExecutionEngineOptions {
  latestScannedProject: Ref<ProjectRecord | null>
  executionDraft: Ref<ExecutionDraft | null>
  executionStatus: Ref<ExecutionStatus>
  executionStatusMessage: Ref<string>
  servers: Ref<ServerRecord[]>
  environmentDraft: Ref<any>
  executionLogs: Ref<any[]>
  pushExecutionLog: (level: any, message: string) => void
  refreshDeploymentHistory: () => Promise<void>
  refreshTaskHistory: (projectId?: string) => Promise<void>
}

export function useExecutionEngine(options: UseExecutionEngineOptions) {
  const appStore = useAppStore()

  const {
    latestScannedProject,
    executionDraft,
    executionStatus,
    executionStatusMessage,
    servers,
    environmentDraft,
    executionLogs,
    pushExecutionLog,
    refreshDeploymentHistory,
    refreshTaskHistory,
  } = options

  const executionSummary = computed<ExecutionSummaryItem[]>(() => {
    if (!latestScannedProject.value || !executionDraft.value) {
      return []
    }

    return [
      {
        label: "执行模式",
        value: executionDraft.value.mode === "build" ? "仅打包" : executionDraft.value.mode,
      },
      {
        label: "目标环境",
        value: executionDraft.value.environmentName || "dev",
      },
      {
        label: "打包命令",
        value: executionDraft.value.overrideBuildCommand || "未配置",
      },
      {
        label: "输出目录",
        value: executionDraft.value.overrideOutputDir || latestScannedProject.value.defaultOutputDir,
      },
    ]
  })

  const canRunExecution = computed(() => {
    if (!latestScannedProject.value || !executionDraft.value) {
      return false
    }

    if (executionDraft.value.mode === "build") {
      return executionDraft.value.overrideBuildCommand.trim().length > 0
    }

    if (executionDraft.value.mode === "deploy" || executionDraft.value.mode === "build-and-deploy") {
      return true
    }

    return false
  })

  function getSelectedEnvironmentConfig() {
    if (!environmentDraft.value || !executionDraft.value) {
      return null
    }

    if (environmentDraft.value.name === executionDraft.value.environmentName) {
      return environmentDraft.value
    }

    return null
  }

  function validateDeployContext() {
    if (!latestScannedProject.value || !executionDraft.value) {
      return { ok: false as const, message: "当前没有可执行的项目任务" }
    }

    if (executionDraft.value.mode === "deploy") {
      if (!executionDraft.value.overrideOutputDir.trim()) {
        return { ok: false as const, message: "仅部署模式下，本地产物目录不能为空" }
      }
    }

    const environmentConfig = getSelectedEnvironmentConfig()

    if (!environmentConfig) {
      return { ok: false as const, message: "请先为当前环境保存部署配置" }
    }

    if (!environmentConfig.serverId) {
      return { ok: false as const, message: "当前环境还没有绑定默认服务器" }
    }

    if (!environmentConfig.remotePath.trim()) {
      return { ok: false as const, message: "当前环境的远端部署目录不能为空" }
    }

    const server = servers.value.find((item) => item.id === environmentConfig.serverId) ?? null

    if (!server) {
      return { ok: false as const, message: "当前环境绑定的服务器不存在，请重新选择" }
    }

    if (server.authType === "password" && !server.password.trim()) {
      return { ok: false as const, message: "当前服务器使用密码认证，但密码为空" }
    }

    if (server.authType === "privateKey" && !server.privateKeyPath.trim()) {
      return { ok: false as const, message: "当前服务器使用私钥认证，但私钥路径为空" }
    }

    return {
      ok: true as const,
      environmentConfig,
      server,
    }
  }

  async function handleRunExecution() {
    if (!latestScannedProject.value || !executionDraft.value) {
      return
    }

    const mode = executionDraft.value.mode
    const startedAt = new Date().toISOString()
    const logStartCount = executionLogs.value.length
    let buildOutputPath = `${latestScannedProject.value.localPath}/${executionDraft.value.overrideOutputDir}`
    let historySummary = ""
    let historyErrorMessage = ""
    let historyServerName = ""
    let historyServerHost = ""
    let historyRemotePath = ""

    if (mode === "deploy" || mode === "build-and-deploy") {
      const validation = validateDeployContext()

      if (!validation.ok) {
        executionStatus.value = "error"
        executionStatusMessage.value = validation.message
        pushExecutionLog("error", validation.message)
        showToast(validation.message, "warning")
        return
      }
    }

    executionStatus.value = "running"
    executionStatusMessage.value =
      mode === "build" ? "正在执行本地打包任务..." : mode === "deploy" ? "正在执行远端部署任务..." : "正在执行打包与部署任务..."

    const summary = [
      `模式=${executionDraft.value.mode}`,
      `环境=${executionDraft.value.environmentName}`,
      `命令=${executionDraft.value.overrideBuildCommand}`,
      `输出目录=${executionDraft.value.overrideOutputDir}`,
      `前置校验=${executionDraft.value.runPrecheck ? "开启" : "关闭"}`,
    ].join(" | ")

    pushExecutionLog("info", `已创建执行任务：${summary}`)

    try {
      if (mode === "build" || mode === "build-and-deploy") {
        const result = await runLocalBuild({
          projectPath: latestScannedProject.value.localPath,
          buildCommand: executionDraft.value.overrideBuildCommand,
          outputDir: executionDraft.value.overrideOutputDir,
          precheckCommand: latestScannedProject.value.defaultPrecheckCommand,
          runPrecheck: executionDraft.value.runPrecheck,
        })

        if (result.precheckRan) {
          pushExecutionLog(result.precheckSuccess ? "success" : "error", result.precheckSuccess ? "前置校验执行成功" : "前置校验执行失败")

          if (result.precheckOutput.trim()) {
            pushExecutionLog(result.precheckSuccess ? "info" : "error", result.precheckOutput.trim())
          }
        }

        if (!result.success) {
          executionStatus.value = "error"
          executionStatusMessage.value = "打包执行失败，请查看任务日志。"
          pushExecutionLog("error", "本地打包执行失败")
          if (result.buildOutput.trim()) {
            pushExecutionLog("error", result.buildOutput.trim())
          }
          appStore.setBannerMessage("本地打包执行失败")
          showToast("本地打包执行失败", "error")
          throw new Error(result.buildOutput.trim() || "本地打包执行失败")
        }

        buildOutputPath = result.outputPath
        pushExecutionLog("success", `本地打包完成：${result.outputPath}`)
        if (result.artifactMessage.trim()) {
          pushExecutionLog(result.artifactVerified ? "info" : "warn", result.artifactMessage)
        }
        if (result.artifactCandidates.length > 0) {
          pushExecutionLog("info", `候选产物目录：${result.artifactCandidates.join("、")}`)
        }
        if (result.buildOutput.trim()) {
          pushExecutionLog("info", result.buildOutput.trim())
        }
      }

      if (mode === "deploy" || mode === "build-and-deploy") {
        const validation = validateDeployContext()

        if (!validation.ok) {
          throw new Error(validation.message)
        }

        executionStatusMessage.value = mode === "deploy" ? "正在执行远端部署..." : "本地打包完成，正在执行远端部署..."

        const deployContext = {
          environmentName: executionDraft.value.environmentName,
          outputPath: buildOutputPath,
          postDeployCommand: validation.environmentConfig.postDeployCommand,
          projectName: latestScannedProject.value.name,
          remotePath: validation.environmentConfig.remotePath,
          server: validation.server,
          uploadStrategy: validation.environmentConfig.uploadStrategy,
        }

        historyServerName = deployContext.server.name
        historyServerHost = `${deployContext.server.host}:${deployContext.server.port}`
        historyRemotePath = deployContext.remotePath

        pushExecutionLog("info", `开始连接服务器：${deployContext.server.host}:${deployContext.server.port}`)
        pushExecutionLog("info", `认证方式：${deployContext.server.authType === "password" ? "密码认证" : "私钥认证"}`)
        pushExecutionLog("info", `目标远端目录：${deployContext.remotePath}`)
        pushExecutionLog("info", "部署任务已提交到桌面端后台线程执行，界面保持可操作。")

        const deployResult = await runLocalDeploy(deployContext)

        if (!deployResult.success) {
          throw new Error(deployResult.errorMessage || deployResult.commandOutput || "远端部署执行失败")
        }

        deployResult.steps.forEach((step) => pushExecutionLog("info", step))
        if (deployResult.commandOutput.trim()) {
          pushExecutionLog("info", deployResult.commandOutput.trim())
        }
        pushExecutionLog("success", "远端部署执行完成")
      }

      historySummary =
        mode === "build"
          ? `本地打包成功，产物目录 ${executionDraft.value.overrideOutputDir}`
          : mode === "deploy"
            ? `远端部署成功，已发布到 ${executionDraft.value.environmentName} 环境`
            : `打包并部署成功，已发布到 ${executionDraft.value.environmentName} 环境`

      executionStatus.value = "success"
      executionStatusMessage.value =
        mode === "build"
          ? `打包完成，产物目录：${buildOutputPath}`
          : mode === "deploy"
            ? "远端部署执行完成"
            : `打包与部署完成，产物目录：${buildOutputPath}`

      appStore.setBannerMessage(mode === "build" ? "本地打包执行成功" : mode === "deploy" ? "远端部署执行成功" : "打包与部署执行成功")
      showToast(mode === "build" ? "本地打包执行成功" : mode === "deploy" ? "远端部署执行成功" : "打包与部署执行成功", "success")
    } catch (error) {
      const message = getErrorMessage(error, mode === "build" ? "本地打包执行失败" : "远端部署任务失败")
      const isPermissionPrompt = mode !== "build" && isLikelyNetworkPermissionPrompt(message)
      historySummary =
        mode === "build"
          ? "本地打包失败"
          : mode === "deploy"
            ? `远端部署失败，目标环境 ${executionDraft.value.environmentName}`
            : `打包并部署失败，目标环境 ${executionDraft.value.environmentName}`
      historyErrorMessage = isPermissionPrompt ? "首次网络访问需要系统授权，请点击允许后重新执行。" : message
      executionStatus.value = isPermissionPrompt ? "idle" : "error"
      executionStatusMessage.value = isPermissionPrompt ? "首次网络访问需要系统授权，请先点击允许，然后重新执行任务。" : message
      pushExecutionLog(
        isPermissionPrompt ? "warn" : "error",
        isPermissionPrompt ? "检测到系统本地网络访问授权弹窗，请允许后重新执行任务。" : message,
      )
      appStore.setBannerMessage(isPermissionPrompt ? "请先允许 XClaw 访问本地网络，然后重新执行任务。" : message)
      showToast(isPermissionPrompt ? "请先允许 XClaw 访问本地网络，然后重新执行任务。" : message, isPermissionPrompt ? "warning" : "error")
    } finally {
      const finishedAt = new Date().toISOString()
      const newLogs = executionLogs.value
        .slice(0, Math.max(executionLogs.value.length - logStartCount, 0))
        .map((entry) => `[${entry.timestamp.slice(11, 19)}] ${entry.message}`)
        .reverse()

      const historyRecord: TaskHistoryRecord = {
        id: crypto.randomUUID(),
        projectId: latestScannedProject.value.id,
        projectName: latestScannedProject.value.name,
        environmentName: executionDraft.value.environmentName,
        mode,
        status: executionStatus.value === "success" ? "success" : "error",
        buildCommand: executionDraft.value.overrideBuildCommand,
        outputDir: executionDraft.value.overrideOutputDir,
        outputPath: buildOutputPath,
        serverName: historyServerName || undefined,
        serverHost: historyServerHost || undefined,
        remotePath: historyRemotePath || undefined,
        startedAt,
        finishedAt,
        durationMs: Math.max(new Date(finishedAt).getTime() - new Date(startedAt).getTime(), 0),
        summary: historySummary || (executionStatus.value === "success" ? "执行成功" : "执行失败"),
        errorMessage: historyErrorMessage || undefined,
        logs: newLogs.slice(-200),
      }

      await appendTaskHistory(historyRecord)
      await refreshDeploymentHistory()

      if (latestScannedProject.value) {
        await refreshTaskHistory(latestScannedProject.value.id)
      }
    }
  }

  return {
    executionSummary,
    canRunExecution,
    validateDeployContext,
    handleRunExecution,
  }
}
