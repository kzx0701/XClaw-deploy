<template>
  <div class="app-shell-root grid h-screen grid-cols-[220px_minmax(0,1fr)] overflow-hidden text-foreground">
    <aside class="app-shell-sidebar flex min-h-0 flex-col bg-sidebar">
      <div class="app-shell-brand-wrap">
        <div class="app-shell-brand">
          <XClawWordmark font-size="1.42rem" @click="openReleasePage" />
          <span class="app-version-badge">v{{ appVersion }}</span>
        </div>
      </div>

      <nav class="app-shell-nav" aria-label="主菜单">
        <button
          v-for="item in navItems"
          :key="item.value"
          type="button"
          :data-active="appStore.activePanel === item.value"
          class="app-shell-nav-item group"
          @click="appStore.setActivePanel(item.value)"
        >
          <component
            :is="item.icon"
            class="h-4 w-4"
          />
          <span>{{ item.label }}</span>
        </button>
      </nav>

      <div class="mt-auto px-3 pb-4">
        <button
          type="button"
          :data-active="appStore.activePanel === 'settings'"
          class="app-shell-footer-entry group"
          @click="appStore.setActivePanel('settings')"
        >
          <Settings2 class="h-4 w-4" />
          <span>设置</span>
        </button>
      </div>
    </aside>

    <main class="app-shell-main min-w-0 bg-background">
      <div :class="['h-screen overflow-auto', contentClass || 'px-8 py-6']">
        <slot />
      </div>
    </main>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from "vue";
import { FileClock, FolderKanban, Server, Settings2 } from "lucide-vue-next";
import { getVersion } from "@tauri-apps/api/app";
import { invoke } from "@tauri-apps/api/core";

import XClawWordmark from "@/components/XClawWordmark.vue";
import { useAppStore } from "@/stores/app";

defineProps<{
  contentClass?: string
}>()

const appStore = useAppStore();
const appVersion = ref("1.0.0");
const releaseUrl = "https://github.com/kzx0701/XClaw/releases";

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
    value: "deployLogs",
    label: "日志",
    icon: FileClock,
  },
] as const;

async function openReleasePage() {
  try {
    await invoke("open_external_url", { url: releaseUrl });
  } catch {
    window.open(releaseUrl, "_blank", "noopener,noreferrer");
  }
}

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
  background: var(--background);
}

.app-shell-sidebar {
  background: var(--sidebar);
  border-right: 1px solid var(--sidebar-border);
}

.app-shell-main {
  background: var(--background);
}

.app-shell-brand-wrap {
  display: flex;
  flex-direction: column;
  justify-content: center;
  height: 76px;
  padding: 0 12px;
}

.app-shell-brand {
  display: flex;
  align-items: baseline;
  justify-content: center;
  gap: 9px;
  min-width: 0;
  color: #201d1d;
}

.app-version-badge {
  display: inline-flex;
  align-items: baseline;
  flex: 0 0 auto;
  height: auto;
  padding: 2px 5px 1px;
  border: 1px solid var(--border);
  border-radius: 4px;
  background: #f8f7f7;
  color: #646262;
  font-size: 11px;
  font-weight: 400;
  line-height: 1;
  letter-spacing: 0;
}

.app-shell-nav {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 10px 12px;
}

.app-shell-nav-item {
  position: relative;
  display: flex;
  align-items: center;
  gap: 11px;
  height: 36px;
  padding: 0 10px;
  border: 1px solid transparent;
  border-radius: 4px;
  background: transparent;
  color: #424245;
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
  letter-spacing: 0;
  text-align: left;
}

.app-shell-nav-item svg {
  color: #646262;
  transition: color 140ms ease;
}

.app-shell-nav-item:hover {
  border-color: var(--border);
  background: #f8f7f7;
  color: #201d1d;
}

.app-shell-nav-item[data-active="true"] {
  border-color: #201d1d;
  background: #201d1d;
  color: #fdfcfc;
}

.app-shell-nav-item[data-active="true"] svg {
  color: #fdfcfc;
}

.app-shell-footer-entry {
  position: relative;
  display: flex;
  align-items: center;
  gap: 11px;
  width: 100%;
  height: 30px;
  padding: 0 10px;
  border: 1px solid transparent;
  border-radius: 10px;
  background: transparent;
  font-size: 14px;
  font-weight: 500;
  letter-spacing: 0;
  color: #424245;
  text-align: left;
  transition:
    background 140ms ease,
    border-color 140ms ease,
    color 140ms ease;
}

.app-shell-footer-entry svg {
  color: #646262;
  transition: color 140ms ease;
}

.app-shell-footer-entry:hover {
  background: #f1eeee;
  color: #201d1d;
}

.app-shell-footer-entry:hover svg,
.app-shell-footer-entry[data-active="true"] svg {
  color: #201d1d;
}

.app-shell-footer-entry[data-active="true"] {
  background: transparent;
  color: #201d1d;
}
</style>
