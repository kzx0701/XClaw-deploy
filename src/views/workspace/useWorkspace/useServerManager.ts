import { ref } from "vue"
import { TriangleAlert } from "lucide-vue-next"

import { runServerConnectionCheck } from "@/services/execution/connection-check"
import { deleteServer, getServers, upsertServer } from "@/services/server/repository"
import { deleteEnvironmentsByServerId } from "@/services/project/environment-repository"
import { updateProjectConfig } from "@/services/project/repository"
import { useConfirm } from "@/services/ui/confirm"
import { showToast } from "@/services/ui/toast"
import { useAppStore } from "@/stores/app"
import type { ServerFormValue, ServerRecord, DeployEnvironmentRecord, ProjectRecord } from "@/types/task"
import { getErrorMessage, formatEnvironmentLabel } from "./utils"
import type { Ref } from "vue"

interface UseServerManagerOptions {
  selectedProjectId: Ref<string | null>
  environmentDraft: Ref<any>
  projectEnvironmentsMap: Ref<Map<string, DeployEnvironmentRecord[]>>
  projects: Ref<any[]>
  loadEnvironmentDraft: (projectId: string) => Promise<void>
  refreshProjectEnvironmentMap: () => Promise<void>
  pushServerLog: (level: any, message: string) => void
}

export function useServerManager(options: UseServerManagerOptions) {
  const appStore = useAppStore()
  const confirm = useConfirm()

  const {
    selectedProjectId,
    environmentDraft,
    projectEnvironmentsMap,
    projects,
    loadEnvironmentDraft,
    refreshProjectEnvironmentMap,
    pushServerLog,
  } = options

  const servers = ref<ServerRecord[]>([])
  const isCreatingServer = ref(false)
  const selectedServerId = ref<string | null>(null)
  const serverDraft = ref<ServerFormValue>(createEmptyServerDraft())

  function createEmptyServerDraft(): ServerFormValue {
    return {
      name: "",
      host: "",
      port: 22,
      username: "",
      authType: "password",
      password: "",
      privateKeyPath: "",
    }
  }

  function toServerDraft(server: ServerRecord): ServerFormValue {
    return {
      name: server.name,
      host: server.host,
      port: server.port,
      username: server.username,
      authType: server.authType,
      password: server.password,
      privateKeyPath: server.privateKeyPath,
    }
  }

  async function refreshServers(preferredServerId?: string | null) {
    servers.value = await getServers()

    const targetId = preferredServerId ?? selectedServerId.value
    const matchedServer = targetId ? (servers.value.find((server) => server.id === targetId) ?? null) : null

    if (matchedServer) {
      selectedServerId.value = matchedServer.id
      serverDraft.value = toServerDraft(matchedServer)
      return
    }

    selectedServerId.value = null
    serverDraft.value = createEmptyServerDraft()
    appStore.setBannerMessage("已关闭新建服务器面板")
  }

  async function handleSaveServer() {
    if (!serverDraft.value.name.trim() || !serverDraft.value.host.trim() || !serverDraft.value.username.trim()) {
      showToast("请先填写完整的服务器名称、主机和用户名", "warning")
      return
    }

    if (serverDraft.value.authType === "password" && !serverDraft.value.password.trim()) {
      showToast("密码认证模式下必须填写服务器密码", "warning")
      return
    }

    if (serverDraft.value.authType === "privateKey" && !serverDraft.value.privateKeyPath.trim()) {
      showToast("私钥认证模式下必须填写私钥路径", "warning")
      return
    }

    const isEditingServer = Boolean(selectedServerId.value)
    const savedServer = await upsertServer(serverDraft.value, selectedServerId.value)

    await refreshServers(isEditingServer ? savedServer.id : null)
    selectedServerId.value = null
    serverDraft.value = createEmptyServerDraft()
    isCreatingServer.value = false

    if (environmentDraft.value && !environmentDraft.value.serverId) {
      environmentDraft.value = {
        ...environmentDraft.value,
        serverId: savedServer.id,
      }
    }

    if (selectedProjectId.value) {
      await loadEnvironmentDraft(selectedProjectId.value)
    }

    appStore.setBannerMessage(`已保存服务器：${savedServer.name}`)
    showToast(`服务器 ${savedServer.name} 已保存`, "success")
  }

  function handleCreateServer() {
    isCreatingServer.value = true
    selectedServerId.value = null
    serverDraft.value = createEmptyServerDraft()
    appStore.setBannerMessage("已切换到新建服务器模式")
  }

  function handleCloseCreateServer() {
    isCreatingServer.value = false
    selectedServerId.value = null
    serverDraft.value = createEmptyServerDraft()
    appStore.setBannerMessage("已关闭新建服务器面板")
  }

  function handleSelectServer(serverId: string) {
    const matchedServer = servers.value.find((server) => server.id === serverId)

    if (!matchedServer) {
      return
    }

    isCreatingServer.value = true
    selectedServerId.value = serverId
    serverDraft.value = toServerDraft(matchedServer)
    appStore.setBannerMessage(`已载入服务器：${matchedServer.name}`)
  }

  async function handleDeleteServer() {
    if (!selectedServerId.value) {
      return
    }

    const serverId = selectedServerId.value
    const currentServer = servers.value.find((server) => server.id === serverId) ?? null
    const { affectedEnvironments } = await deleteEnvironmentsByServerId(serverId)
    servers.value = await deleteServer(serverId)

    if (affectedEnvironments.length > 0) {
      const affectedProjectIds = new Set(affectedEnvironments.map((environment) => environment.projectId))

      for (const project of projects.value.filter((item: any) => affectedProjectIds.has(item.id))) {
        const nextDefaultDeployServerIdByEnv = { ...(project.defaultDeployServerIdByEnv ?? {}) }
        let didChange = false

        affectedEnvironments.forEach((environment: any) => {
          if (environment.projectId !== project.id) {
            return
          }

          if (nextDefaultDeployServerIdByEnv[environment.environmentName]) {
            delete nextDefaultDeployServerIdByEnv[environment.environmentName]
            didChange = true
          }
        })

        if (!didChange) {
          continue
        }

        const updatedProject: ProjectRecord = {
          ...project,
          defaultDeployServerIdByEnv: nextDefaultDeployServerIdByEnv,
        }

        await updateProjectConfig(updatedProject)
      }
    }

    isCreatingServer.value = false
    selectedServerId.value = null
    serverDraft.value = createEmptyServerDraft()

    if (selectedProjectId.value) {
      await loadEnvironmentDraft(selectedProjectId.value)
    }

    await refreshProjectEnvironmentMap()

    appStore.setBannerMessage(`已删除服务器：${currentServer?.name ?? ""}`)
    showToast(`服务器 ${currentServer?.name ?? ""} 已删除`, "success")
  }

  function handleConfirmDeleteServerById(serverId: string) {
    const targetServer = servers.value.find((server) => server.id === serverId)

    if (!targetServer) {
      return
    }

    const affectedProjects = projects.value
      .map((project: any) => {
        const matchedEnvironments = (projectEnvironmentsMap.value.get(project.id) ?? [])
          .filter((environment) => environment.serverId === serverId)
          .map((environment) => formatEnvironmentLabel(environment.name))

        if (matchedEnvironments.length === 0) {
          return null
        }

        return `${project.name}（${matchedEnvironments.join("、")}）`
      })
      .filter((item: any): item is string => Boolean(item))

    confirm.require({
      message:
        affectedProjects.length > 0
          ? `已绑定 ${affectedProjects.join("、")}，删除时会一并删除对应环境。`
          : "将删除当前服务器配置。",
      header: "确认删除服务器",
      icon: TriangleAlert,
      rejectLabel: "取消",
      acceptLabel: "删除",
      acceptClass: "p-button-danger",
      accept: () => {
        selectedServerId.value = serverId
        serverDraft.value = toServerDraft(targetServer)
        void handleDeleteServer()
      },
    })
  }

  async function handleCheckServer() {
    if (!serverDraft.value.host.trim() || !serverDraft.value.username.trim()) {
      showToast("请先填写服务器主机、用户名和认证信息", "warning")
      return
    }

    if (serverDraft.value.authType === "password" && !serverDraft.value.password.trim()) {
      showToast("密码认证模式下必须填写服务器密码", "warning")
      return
    }

    if (serverDraft.value.authType === "privateKey" && !serverDraft.value.privateKeyPath.trim()) {
      showToast("私钥认证模式下必须填写私钥路径", "warning")
      return
    }

    pushServerLog("info", `开始测试服务器连接：${serverDraft.value.host}:${serverDraft.value.port}`)

    try {
      const result = await runServerConnectionCheck({
        authType: serverDraft.value.authType,
        host: serverDraft.value.host,
        password: serverDraft.value.password,
        port: serverDraft.value.port,
        privateKeyPath: serverDraft.value.privateKeyPath,
        username: serverDraft.value.username,
      })

      result.steps.forEach((step) => pushServerLog("info", step))
      pushServerLog("success", "服务器连接检测通过")
      appStore.setBannerMessage("服务器连接检测通过")
      showToast("服务器连接检测通过", "success")
    } catch (error) {
      const message = getErrorMessage(error, "服务器连接检测失败")
      pushServerLog("error", message)
      appStore.setBannerMessage(message)
      showToast(message, "error")
    }
  }

  return {
    servers,
    isCreatingServer,
    selectedServerId,
    serverDraft,
    refreshServers,
    handleSaveServer,
    handleCreateServer,
    handleCloseCreateServer,
    handleSelectServer,
    handleDeleteServer,
    handleConfirmDeleteServerById,
    handleCheckServer,
  }
}
