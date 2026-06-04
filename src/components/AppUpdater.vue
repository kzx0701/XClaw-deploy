<template>
  <Dialog
    v-model:visible="visible"
    modal
    :closable="!installing"
    :dismissable-mask="!installing"
    :close-on-escape="!installing"
    class="update-dialog"
    :style="{ width: 'min(480px, calc(100vw - 32px))' }"
  >
    <template #header>
      <div class="update-dialog-header">
        <div>
          <strong>发现新版本</strong>
          <p>{{ headerText }}</p>
        </div>
      </div>
    </template>

    <div class="update-dialog-body">
      <p class="update-copy">
        当前版本：<strong>{{ updateInfo?.currentVersion || currentVersion }}</strong>
      </p>
      <p class="update-copy">
        可更新到：<strong>{{ updateInfo?.version || "--" }}</strong>
      </p>

      <div v-if="installing" class="update-progress-shell" aria-hidden="true">
        <div class="update-progress-bar" :style="{ width: `${progressPercent}%` }" />
      </div>

      <p class="update-note">
        {{ installing ? "正在下载并安装更新，完成后应用会自动重启。" : "点击立即更新后，应用会下载更新并自动完成安装。" }}
      </p>
    </div>

    <template #footer>
      <div class="update-dialog-footer">
        <Button
          v-if="!installing"
          label="稍后再说"
          severity="secondary"
          @click="visible = false"
        />
        <Button
          class="app-primary-button"
          :label="installing ? '更新中...' : '立即更新'"
          :loading="installing"
          :disabled="installing"
          @click="handleInstall"
        />
      </div>
    </template>
  </Dialog>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from "vue";
import { getVersion } from "@tauri-apps/api/app";
import { invoke } from "@tauri-apps/api/core";
import { listen, type UnlistenFn } from "@tauri-apps/api/event";

import Button from "@/components/ui/button/Button.vue";
import Dialog from "@/components/ui/dialog/Dialog.vue";
import { showToast } from "@/services/ui/toast";

type UpdateInfo = {
  version: string;
  currentVersion: string;
} | null;

const visible = ref(false);
const installing = ref(false);
const currentVersion = ref("1.0.0");
const progressPercent = ref(0);
const updateInfo = ref<UpdateInfo>(null);
let unlistenProgress: UnlistenFn | null = null;

const headerText = computed(() => {
  if (!updateInfo.value) {
    return "正在检查可用更新";
  }

  return `新版本 ${updateInfo.value.version} 已可用`;
});

async function checkForUpdates() {
  try {
    currentVersion.value = await getVersion();
  } catch {
    currentVersion.value = "1.0.0";
  }

  try {
    const result = await invoke<UpdateInfo>("fetch_update");
    updateInfo.value = result;

    if (result) {
      visible.value = true;
    }
  } catch (error) {
    console.error("Failed to check for updates", error);
  }
}

async function handleInstall() {
  if (!updateInfo.value || installing.value) {
    return;
  }

  installing.value = true;
  progressPercent.value = 12;

  try {
    await invoke("install_update");
  } catch (error) {
    installing.value = false;
    progressPercent.value = 0;
    showToast(typeof error === "string" ? error : "安装更新失败", "error");
  }
}

onMounted(async () => {
  unlistenProgress = await listen<{ chunkLength: number; contentLength: number }>(
    "updater-download-progress",
    (event) => {
      const contentLength = event.payload.contentLength || 0;
      const chunkLength = event.payload.chunkLength || 0;

      if (contentLength > 0) {
        progressPercent.value = Math.max(12, Math.min(100, Math.round((chunkLength / contentLength) * 100)));
      }
    },
  );

  window.setTimeout(() => {
    void checkForUpdates();
  }, 1800);
});

onUnmounted(() => {
  unlistenProgress?.();
});
</script>

<style scoped>
.update-dialog-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}

.update-dialog-header strong {
  display: block;
  color: #f8fafc;
  font-size: 16px;
  line-height: 1.2;
}

.update-dialog-header p {
  margin: 6px 0 0;
  color: #94a3b8;
  font-size: 13px;
  line-height: 1.6;
}

.update-dialog-body {
  display: grid;
  gap: 12px;
}

.update-copy {
  margin: 0;
  color: #cbd5e1;
  font-size: 13px;
  line-height: 1.7;
}

.update-copy strong {
  color: #f8fafc;
  font-weight: 600;
}

.update-note {
  margin: 0;
  color: #94a3b8;
  font-size: 12px;
  line-height: 1.7;
}

.update-progress-shell {
  overflow: hidden;
  height: 8px;
  border-radius: 999px;
  background: rgba(30, 41, 59, 0.9);
}

.update-progress-bar {
  height: 100%;
  min-width: 12%;
  border-radius: inherit;
  background: linear-gradient(90deg, #3b82f6, #60a5fa);
  transition: width 180ms ease;
}

.update-dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
}
</style>
