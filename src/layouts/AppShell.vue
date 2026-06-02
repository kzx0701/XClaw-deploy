<template>
  <div class="grid h-screen grid-cols-[236px_minmax(0,1fr)] overflow-hidden bg-background text-foreground">
    <aside class="flex min-h-0 flex-col border-r border-border bg-[#0a0f19]">
      <div class="border-b border-border px-5 py-5">
        <p class="text-[11px] font-semibold uppercase tracking-[0.24em] text-muted-foreground">Claw Deploy</p>
        <div class="mt-3 flex items-center gap-3">
          <div class="flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-[#101722] text-[#94a3b8]">
            <Boxes class="h-4 w-4" />
          </div>
          <h1 class="text-[20px] font-semibold tracking-tight text-slate-100">部署工作台</h1>
        </div>
        <p class="mt-3 max-w-[176px] text-[12px] leading-6 text-muted-foreground">
          把项目、服务器和日志整理到一套稳定顺手的桌面工作流里。
        </p>
      </div>

      <nav class="flex flex-col gap-2 px-4 py-5" aria-label="主菜单">
        <button
          v-for="item in navItems"
          :key="item.value"
          type="button"
          :data-active="appStore.activePanel === item.value"
          class="group flex h-11 items-center gap-3 rounded-lg border border-transparent px-3 text-left text-sm font-medium text-slate-300 transition-all duration-150 hover:bg-[#141b28] hover:text-slate-100 data-[active=true]:border-[#22324c] data-[active=true]:bg-[#141d2a] data-[active=true]:text-slate-50"
          @click="appStore.setActivePanel(item.value)"
        >
          <component
            :is="item.icon"
            class="h-4 w-4 text-slate-500 transition-colors duration-150 group-data-[active=true]:text-primary group-hover:text-slate-200"
          />
          <span>{{ item.label }}</span>
        </button>
      </nav>

      <div class="mt-auto px-4 pb-4">
        <div class="rounded-lg border border-border bg-[#101722] px-4 py-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.02)]">
          <p class="text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground">网关状态</p>
          <div class="mt-3">
            <StatusPill :label="appStore.connectionLabel" :status="appStore.connectionStatus" />
          </div>
        </div>
      </div>
    </aside>

    <main class="min-w-0 bg-background">
      <header class="flex items-start justify-between gap-5 border-b border-border px-8 py-6">
        <div>
          <h2 class="text-[22px] font-semibold tracking-tight text-slate-100">{{ panelTitle }}</h2>
        </div>
        <slot name="header-actions" />
      </header>

      <div class="h-[calc(100vh-97px)] overflow-auto px-8 py-7">
        <slot />
      </div>
    </main>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { Boxes, FolderKanban, FileText, Server } from 'lucide-vue-next'

import StatusPill from '@/components/StatusPill.vue'
import { useAppStore } from '@/stores/app'

const appStore = useAppStore()

const navItems = [
  {
    value: 'config',
    label: '项目',
    icon: FolderKanban,
  },
  {
    value: 'servers',
    label: '服务器',
    icon: Server,
  },
  {
    value: 'logs',
    label: '日志',
    icon: FileText,
  },
] as const

const panelTitle = computed(() => {
  if (appStore.activePanel === 'servers') {
    return '服务器'
  }

  if (appStore.activePanel === 'logs') {
    return '日志'
  }

  return appStore.selectedProjectName && appStore.selectedProjectName !== '未选择项目'
    ? appStore.selectedProjectName
    : '项目'
})
</script>
