import { ref, computed } from "vue"
import { TriangleAlert } from "lucide-vue-next"

import {
  PRESET_ENVIRONMENTS,
  createEnvironmentRecordDraft,
  deleteEnvironment,
  getEnvironmentsByProjectIds,
  getProjectEnvironments,
  upsertEnvironment,
} from "@/services/project/environment-repository"
import { useConfirm } from "@/services/ui/confirm"
import { showToast } from "@/services/ui/toast"
import { useAppStore } from "@/stores/app"
import type { DeployEnvironmentRecord, EnvironmentFormValue, ProjectRecord } from "@/types/task"
import { formatEnvironmentLabel, getEnvironmentIcon } from "./utils"
import type { Ref } from "vue"

interface UseEnvironmentManagerOptions {
  selectedProjectId: Ref<string | null>
  latestScannedProject: Ref<ProjectRecord | null>
  executionDraft: Ref<any>
  servers: Ref<any[]>
}

export function useEnvironmentManager(options: UseEnvironmentManagerOptions) {
  const appStore = useAppStore()
  const confirm = useConfirm()

  const { selectedProjectId, latestScannedProject, executionDraft, servers } = options

  const projectEnvironments = ref<DeployEnvironmentRecord[]>([])
  const projectEnvironmentsMap = ref<Map<string, DeployEnvironmentRecord[]>>(new Map())
  const environmentDraft = ref<EnvironmentFormValue | null>(null)
  const selectedEnvironmentName = ref<string | null>(null)
  const isEnvironmentEditorVisible = ref(false)
  const environmentEditorMode = ref<"create" | "edit">("edit")
  const isCheckingEnvironment = ref(false)

  const environmentCards = computed(() => {
    const cards = [...PRESET_ENVIRONMENTS].map((name) => {
      const matched = projectEnvironments.value.find((environment) => environment.name === name) ?? null
      const server = matched ? (servers.value.find((item) => item.id === matched.serverId) ?? null) : null

      return {
        configured: Boolean(matched),
        deletable: false,
        icon: getEnvironmentIcon(name),
        label: formatEnvironmentLabel(name),
        name,
        preset: true,
        remotePathLabel: matched?.remotePath?.trim() || "还没有设置部署目录",
        serverLabel: server ? `${server.name} / ${server.host}:${server.port}` : "还没有绑定服务器",
      }
    })

    const customCards = projectEnvironments.value
      .filter((environment) => !PRESET_ENVIRONMENTS.includes(environment.name as (typeof PRESET_ENVIRONMENTS)[number]))
      .map((environment) => {
        const server = servers.value.find((item) => item.id === environment.serverId) ?? null

        return {
          configured: true,
          deletable: true,
          icon: getEnvironmentIcon(environment.name),
          label: environment.name,
          name: environment.name,
          preset: false,
          remotePathLabel: environment.remotePath?.trim() || "还没有设置部署目录",
          serverLabel: server ? `${server.name} / ${server.host}:${server.port}` : "还没有绑定服务器",
        }
      })

    return [...cards, ...customCards]
  })

  const executionEnvironmentOptions = computed(() => {
    const configuredOptions = projectEnvironments.value.map((environment) => ({
      label: environment.name,
      value: environment.name,
    }))

    const fallbackOptions = PRESET_ENVIRONMENTS.map((name) => ({
      label: name,
      value: name,
    }))

    return configuredOptions.length > 0 ? configuredOptions : fallbackOptions
  })

  const isPresetEnvironment = computed(() =>
    environmentDraft.value ? PRESET_ENVIRONMENTS.includes(environmentDraft.value.name as (typeof PRESET_ENVIRONMENTS)[number]) : false,
  )

  function toEnvironmentDraft(environment: DeployEnvironmentRecord): EnvironmentFormValue {
    return {
      name: environment.name,
      serverId: environment.serverId,
      remotePath: environment.remotePath,
      deployMode: environment.deployMode ?? "build-and-deploy",
      uploadStrategy: environment.uploadStrategy,
      postDeployCommand: environment.postDeployCommand,
      enabled: environment.enabled,
    }
  }

  async function refreshProjectEnvironmentMap(projectIds?: string[]) {
    const ids = projectIds ?? []
    projectEnvironmentsMap.value = await getEnvironmentsByProjectIds(ids)
  }

  async function refreshProjectEnvironmentMapWithData(projectIds: string[]) {
    projectEnvironmentsMap.value = await getEnvironmentsByProjectIds(projectIds)
  }

  async function refreshProjectEnvironments(projectId: string) {
    projectEnvironments.value = await getProjectEnvironments(projectId)
    projectEnvironmentsMap.value = new Map(projectEnvironmentsMap.value)
    projectEnvironmentsMap.value.set(projectId, [...projectEnvironments.value])
  }

  async function loadEnvironmentDraft(projectId: string, projects: ProjectRecord[]) {
    await refreshProjectEnvironments(projectId)
    const currentProject = projects.find((project) => project.id === projectId) ?? latestScannedProject.value
    const preferredName = executionDraft.value?.environmentName ?? "dev"
    const selectedEnvironment =
      projectEnvironments.value.find((environment) => environment.name === preferredName) ??
      projectEnvironments.value.find((environment) => environment.name === "test") ??
      projectEnvironments.value.find((environment) => environment.name === "prod") ??
      null

    selectedEnvironmentName.value = selectedEnvironment?.name ?? preferredName
    environmentDraft.value = selectedEnvironment ? toEnvironmentDraft(selectedEnvironment) : createEnvironmentRecordDraft(preferredName)

    if (
      environmentDraft.value &&
      !environmentDraft.value.serverId &&
      currentProject?.defaultDeployServerIdByEnv?.[environmentDraft.value.name]
    ) {
      environmentDraft.value.serverId = currentProject.defaultDeployServerIdByEnv[environmentDraft.value.name] ?? ""
    }

    if (latestScannedProject.value) {
      executionDraft.value = {
        environmentName: environmentDraft.value.name,
        mode: "build",
        overrideBuildCommand: latestScannedProject.value.defaultBuildCommand,
        overrideOutputDir: latestScannedProject.value.defaultOutputDir,
        runPrecheck: latestScannedProject.value.defaultPrecheckEnabled,
      }
    }
  }

  async function syncEnvironmentByName(environmentName: string, projects?: ProjectRecord[]) {
    if (!selectedProjectId.value) {
      return
    }

    await refreshProjectEnvironments(selectedProjectId.value)
    const matchedEnvironment = projectEnvironments.value.find((environment) => environment.name === environmentName) ?? null
    const projectList = projects ?? []
    const currentProject = projectList.find((project) => project.id === selectedProjectId.value) ?? latestScannedProject.value

    selectedEnvironmentName.value = environmentName
    environmentDraft.value = matchedEnvironment ? toEnvironmentDraft(matchedEnvironment) : createEnvironmentRecordDraft(environmentName)

    if (
      environmentDraft.value &&
      !environmentDraft.value.serverId &&
      currentProject?.defaultDeployServerIdByEnv?.[environmentDraft.value.name]
    ) {
      environmentDraft.value.serverId = currentProject.defaultDeployServerIdByEnv[environmentDraft.value.name] ?? ""
    }
  }

  function handleCreateEnvironment() {
    environmentEditorMode.value = "create"
    selectedEnvironmentName.value = null
    environmentDraft.value = createEnvironmentRecordDraft("")
    isEnvironmentEditorVisible.value = true
    appStore.setBannerMessage("已打开新建环境面板")
  }

  async function handleSelectEnvironment(name: string) {
    if (!selectedProjectId.value) {
      return
    }

    environmentEditorMode.value = "edit"
    selectedEnvironmentName.value = name
    await syncEnvironmentByName(name, [])
    isEnvironmentEditorVisible.value = true
    appStore.setBannerMessage(`已载入环境：${name}`)
  }

  function handleCloseEnvironmentEditor() {
    isEnvironmentEditorVisible.value = false
    environmentEditorMode.value = "edit"
    appStore.setBannerMessage("已关闭环境编辑面板")
  }

  function handleResetEnvironmentDraft() {
    if (!environmentDraft.value) {
      return
    }

    environmentDraft.value = {
      ...environmentDraft.value,
      name: "",
      serverId: "",
      remotePath: "",
      deployMode: "build-and-deploy",
      uploadStrategy: "overwrite",
      postDeployCommand: "",
      enabled: false,
    }

    appStore.setBannerMessage("已清空当前环境表单")
    showToast("当前环境配置已重置", "success")
  }

  async function handleSaveEnvironment(projects: ProjectRecord[], updateProjectConfig: (p: ProjectRecord) => Promise<ProjectRecord[]>) {
    if (!selectedProjectId.value || !environmentDraft.value) {
      return
    }

    if (!environmentDraft.value.name.trim()) {
      showToast("请先填写环境名称", "warning")
      return
    }

    await upsertEnvironment(selectedProjectId.value, environmentDraft.value)
    await refreshProjectEnvironments(selectedProjectId.value)
    selectedEnvironmentName.value = environmentDraft.value.name
    const currentProject = projects.find((project) => project.id === selectedProjectId.value) ?? null

    if (currentProject) {
      const nextProject: ProjectRecord = {
        ...currentProject,
        defaultDeployServerIdByEnv: {
          ...(currentProject.defaultDeployServerIdByEnv ?? {}),
          [environmentDraft.value.name]: environmentDraft.value.serverId,
        },
      }

      const updatedProjects = await updateProjectConfig(nextProject)
      projects = updatedProjects
      latestScannedProject.value = updatedProjects.find((project) => project.id === selectedProjectId.value) ?? nextProject
    }

    const environmentLabel = formatEnvironmentLabel(environmentDraft.value.name)
    appStore.setBannerMessage(`已保存 ${environmentLabel} 配置`)
    showToast(`${environmentLabel} 配置已保存`, "success")
    isEnvironmentEditorVisible.value = false
    await refreshProjectEnvironmentMap()

    if (executionDraft.value) {
      executionDraft.value = {
        ...executionDraft.value,
        environmentName: environmentDraft.value.name,
      }
    }
  }

  async function handleDeleteEnvironment() {
    if (!selectedProjectId.value || !environmentDraft.value?.name) {
      return
    }

    const environmentName = environmentDraft.value.name
    await deleteEnvironment(selectedProjectId.value, environmentName)
    await refreshProjectEnvironments(selectedProjectId.value)

    isEnvironmentEditorVisible.value = false
    selectedEnvironmentName.value = null
    environmentDraft.value = null

    if (executionDraft.value?.environmentName === environmentName) {
      const fallbackName = projectEnvironments.value[0]?.name ?? PRESET_ENVIRONMENTS[0]
      executionDraft.value = {
        ...executionDraft.value,
        environmentName: fallbackName,
      }
      await syncEnvironmentByName(fallbackName, [])
    }

    appStore.setBannerMessage(`已删除环境：${environmentName}`)
    showToast("环境已删除", "success")
    await refreshProjectEnvironmentMap()
  }

  function handleConfirmDeleteEnvironment() {
    if (!environmentDraft.value?.name) {
      return
    }

    const environmentName = environmentDraft.value.name
    confirm.require({
      message: `删除后将移除环境配置 "${environmentName}"。这个操作不会删除服务器记录。`,
      header: "确认删除环境",
      icon: TriangleAlert,
      rejectLabel: "取消",
      acceptLabel: "删除",
      acceptClass: "p-button-danger",
      accept: () => {
        void handleDeleteEnvironment()
      },
    })
  }

  function handleConfirmDeleteEnvironmentByName(name: string) {
    confirm.require({
      message: `删除后将移除环境配置 "${name}"。这个操作不会删除服务器记录。`,
      header: "确认删除环境",
      icon: TriangleAlert,
      rejectLabel: "取消",
      acceptLabel: "删除",
      acceptClass: "p-button-danger",
      accept: () => {
        selectedEnvironmentName.value = name
        environmentDraft.value = createEnvironmentRecordDraft(name)
        void handleDeleteEnvironment()
      },
    })
  }

  return {
    projectEnvironments,
    projectEnvironmentsMap,
    environmentDraft,
    selectedEnvironmentName,
    isEnvironmentEditorVisible,
    environmentEditorMode,
    isCheckingEnvironment,
    environmentCards,
    executionEnvironmentOptions,
    isPresetEnvironment,
    refreshProjectEnvironmentMap,
    refreshProjectEnvironmentMapWithData,
    refreshProjectEnvironments,
    loadEnvironmentDraft,
    syncEnvironmentByName,
    handleCreateEnvironment,
    handleSelectEnvironment,
    handleCloseEnvironmentEditor,
    handleResetEnvironmentDraft,
    handleSaveEnvironment,
    handleDeleteEnvironment,
    handleConfirmDeleteEnvironment,
    handleConfirmDeleteEnvironmentByName,
    formatEnvironmentLabel,
  }
}
