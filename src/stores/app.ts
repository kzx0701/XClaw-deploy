import { computed, ref } from 'vue'
import { defineStore } from 'pinia'

type ConnectionStatus = 'disconnected' | 'connecting' | 'connected'
type ActivePanel = 'config' | 'servers' | 'deployLogs' | 'settings'

export const useAppStore = defineStore('app', () => {
  const connectionStatus = ref<ConnectionStatus>('disconnected')
  const activePanel = ref<ActivePanel>('config')
  const selectedProjectName = ref('未选择项目')
  const bannerMessage = ref('等待导入项目')

  const connectionLabel = computed(() => {
    if (connectionStatus.value === 'connected') {
      return 'OpenClaw 网关已连接'
    }

    if (connectionStatus.value === 'connecting') {
      return '正在连接 OpenClaw 网关'
    }

    return 'OpenClaw 网关未连接'
  })

  function setConnectionStatus(status: ConnectionStatus) {
    connectionStatus.value = status
  }

  function setActivePanel(panel: ActivePanel) {
    activePanel.value = panel
  }

  function setSelectedProjectName(name: string) {
    selectedProjectName.value = name
  }

  function setBannerMessage(message: string) {
    bannerMessage.value = message
  }

  return {
    activePanel,
    bannerMessage,
    connectionLabel,
    connectionStatus,
    selectedProjectName,
    setActivePanel,
    setBannerMessage,
    setConnectionStatus,
    setSelectedProjectName,
  }
})
