<template>
  <div class="app-shell-root grid h-screen grid-cols-[236px_minmax(0,1fr)] overflow-hidden text-foreground">
    <aside class="app-shell-sidebar flex min-h-0 flex-col border-r border-border">
      <div class="flex h-24 flex-col justify-center border-b border-border px-5">
        <div class="flex justify-center">
          <XClawWordmark font-size="1.52rem" />
        </div>
        <p class="mt-2 text-center text-[12px] font-medium leading-4 tracking-[0.04em] text-[#6f819d]">企业级项目自动化打包部署工具</p>
        <p class="mt-0.5 text-center text-[12px] font-medium leading-4 tracking-[0.04em] text-[#6f819d]">v {{ appVersion }}</p>
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
        <div class="gateway-status-compact">
          <span class="gateway-status-label">网关</span>
          <StatusPill :label="gatewayStatusLabel" :status="appStore.connectionStatus" />
        </div>
      </div>
    </aside>

    <main class="app-shell-main min-w-0">
      <header class="flex h-24 items-center border-b border-border px-8">
        <Transition name="shell-title" mode="out-in">
          <div :key="headerTransitionKey" class="app-shell-header-content">
            <slot v-if="$slots.header" name="header" />
            <template v-else>
              <div>
                <h2 class="text-[22px] tracking-tight text-slate-100">{{ panelTitle }}</h2>
              </div>
              <slot name="header-actions" />
            </template>
          </div>
        </Transition>
      </header>

      <div class="h-[calc(100vh-97px)] overflow-auto px-8 py-7">
        <slot />
      </div>
    </main>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, useSlots } from "vue";
import { FolderKanban, FileText, Server } from "lucide-vue-next";
import { getVersion } from "@tauri-apps/api/app";

import StatusPill from "@/components/StatusPill.vue";
import XClawWordmark from "@/components/XClawWordmark.vue";
import { useAppStore } from "@/stores/app";

const appStore = useAppStore();
const slots = useSlots();
const appVersion = ref("1.0.0");

const navItems = [
  {
    value: "config",
    label: "项目",
    icon: FolderKanban,
  },
  {
    value: "servers",
    label: "服务器",
    icon: Server,
  },
  {
    value: "logs",
    label: "日志",
    icon: FileText,
  },
] as const;

const panelTitle = computed(() => {
  if (appStore.activePanel === "servers") {
    return "服务器";
  }

  if (appStore.activePanel === "logs") {
    return "日志";
  }

  return appStore.selectedProjectName && appStore.selectedProjectName !== "未选择项目" ? appStore.selectedProjectName : "项目";
});

const headerTransitionKey = computed(() => {
  return slots.header ? `custom:${panelTitle.value}` : `default:${panelTitle.value}`;
});

const gatewayStatusLabel = computed(() => {
  if (appStore.connectionStatus === "connected") {
    return "已连接";
  }

  if (appStore.connectionStatus === "connecting") {
    return "连接中";
  }

  return "未连接";
});

onMounted(async () => {
  try {
    appVersion.value = await getVersion();
  } catch {
    appVersion.value = "1.0.0";
  }
});
</script>

<style scoped>
.app-shell-root {
  background:
    radial-gradient(circle at top right, rgba(59, 130, 246, 0.12), transparent 28%),
    radial-gradient(circle at bottom left, rgba(37, 99, 235, 0.08), transparent 32%),
    linear-gradient(180deg, #111a2a 0%, #0f1726 100%);
}

.app-shell-sidebar {
  background:
    linear-gradient(180deg, rgba(17, 26, 42, 0.98), rgba(13, 20, 34, 0.98)),
    #0d1422;
}

.app-shell-main {
  background: linear-gradient(180deg, rgba(17, 26, 42, 0.54), rgba(15, 23, 38, 0.82));
}

.gateway-status-compact {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  min-height: 32px;
  padding: 0 2px;
}

.gateway-status-label {
  color: #7f8ea7;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
}

.app-shell-header-content {
  display: flex;
  width: 100%;
  align-items: center;
  justify-content: space-between;
  gap: 20px;
}

.shell-title-enter-active,
.shell-title-leave-active {
  transition:
    opacity 160ms ease,
    transform 160ms ease;
}

.shell-title-enter-from {
  opacity: 0;
  transform: translateY(4px);
}

.shell-title-leave-to {
  opacity: 0;
  transform: translateY(-3px);
}

@media (prefers-reduced-motion: reduce) {
  .shell-title-enter-active,
  .shell-title-leave-active {
    transition: none;
  }

  .shell-title-enter-from,
  .shell-title-leave-to {
    opacity: 1;
    transform: none;
  }
}
</style>
