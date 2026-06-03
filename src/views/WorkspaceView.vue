<template>
  <AppShell>
    <template v-if="appStore.activePanel === 'config' && selectedProjectId" #header>
      <WorkspaceDetailHeader
        :title="appStore.selectedProjectName"
        back-label="返回项目列表"
        delete-label="删除项目"
        @back="handleBackToProjectList"
        @delete="selectedProjectId && openProjectDeleteDialog(selectedProjectId)"
      />
    </template>

    <PageTransition :transition-key="workspacePanelKey">
      <section v-if="appStore.activePanel === 'config' && !selectedProjectId" class="panel-grid">
        <article class="project-list-page">
        <header class="project-toolbar">
          <Button class="app-primary-button" label="导入项目" :icon="Plus" :loading="isImporting" @click="handlePickDirectory" />
        </header>

        <Alert v-if="importError" :variant="resolveAlertVariant('error')" :class="resolveAlertToneClass('error')">
          {{ importError }}
        </Alert>

        <div v-if="projectSummaries.length > 0" class="project-card-list">
          <ResourceCard
            v-for="project in projectSummaries"
            :key="project.id"
            :description="project.path"
            :title="project.name"
            @select="handleSelectProject(project.id)"
          >
            <template #icon>
              <img class="project-icon-image" :src="projectFolderIcon" alt="" aria-hidden="true" />
            </template>

            <template #meta>
              <span class="project-type-badge">{{ project.type }}</span>
            </template>

            <template #actions>
                <Button
                  class="quick-deploy-button"
                  type="button"
                  :icon="Send"
                  severity="primary"
                  text
                  rounded
                  :disabled="!hasQuickDeployOptions(project.id)"
                  title="一键部署"
                  @click.stop="toggleQuickDeployMenu($event, project.id)"
                />
                <button type="button" class="delete-project-button" title="删除项目记录" @click.stop="openProjectDeleteDialog(project.id)">
                  <Trash2 class="h-4 w-4" aria-hidden="true" />
                </button>
            </template>
          </ResourceCard>
        </div>

        <section v-else class="project-empty-shell">
          <div class="project-empty-hero">
            <div class="project-empty-copy">
              <div class="project-empty-copy-head">
                <span class="project-empty-eyebrow">项目工作台</span>
                <span class="project-empty-divider" aria-hidden="true" />
              </div>
              <h2>从项目开始，搭好部署工作台</h2>
              <p>导入一个本地前端项目后，这里会保留项目记录，并串联环境配置、服务器连接和部署执行流程。</p>

              <div class="project-empty-highlights" aria-hidden="true">
                <span>自动识别构建配置</span>
                <span>统一管理部署记录</span>
                <span>面向测试与生产环境</span>
              </div>

              <div class="project-empty-actions">
                <Button class="app-primary-button" :loading="isImporting" @click="handlePickDirectory">
                  <Plus class="h-4 w-4" />
                  <span>{{ isImporting ? "导入中..." : "导入第一个项目" }}</span>
                </Button>
                <div class="project-empty-tip">
                  <small>支持含 `package.json` 的 Vue / React 前端项目</small>
                </div>
              </div>
            </div>

            <div class="project-empty-visual" aria-hidden="true">
              <img class="project-empty-visual-image" :src="projectFolderBackground" alt="" />
            </div>
          </div>

          <div class="project-empty-guide">
            <article class="project-empty-step">
              <span>01</span>
              <strong>导入项目</strong>
              <p>选择本地项目目录，自动识别构建命令和产物目录。</p>
            </article>
            <article class="project-empty-step">
              <span>02</span>
              <strong>配置环境</strong>
              <p>绑定服务器、远端目录和上传策略，准备测试或生产环境。</p>
            </article>
            <article class="project-empty-step">
              <span>03</span>
              <strong>执行部署</strong>
              <p>在一个工作台里完成打包、部署、验证与结果回看。</p>
            </article>
          </div>
        </section>
      </article>

      </section>

      <section v-else-if="appStore.activePanel === 'config'" class="panel-grid">
      <div class="project-detail-workspace">
        <Alert v-if="importError" :variant="resolveAlertVariant('error')" :class="resolveAlertToneClass('error')">
          {{ importError }}
        </Alert>

        <div class="project-insight-row">
          <div class="insight-panel insight-panel-wide">
            <ProjectOverviewCard ref="projectOverviewCardRef" :project="latestScannedProject" />
          </div>

          <div class="insight-panel">
            <article class="panel-card script-card project-script-card" :style="projectScriptCardStyle">
              <header class="card-head">
                <h3>脚本摘要</h3>
              </header>
              <ul v-if="latestScannedProject" class="task-list script-list">
                <li v-for="(command, name) in latestScannedProject.scripts" :key="name">
                  <div class="task-item script-item">
                    <span class="script-name">{{ name }}</span>
                    <code>{{ command }}</code>
                  </div>
                </li>
              </ul>
              <p v-else class="muted-paragraph">导入项目后，这里会展示 `package.json` 中的 scripts。</p>
            </article>
          </div>
        </div>

        <div class="project-detail-stack">
          <ExecutionPanel
            v-model="executionDraft"
            :can-run="canRunExecution"
            :environment-options="executionEnvironmentOptions"
            :project="latestScannedProject"
            :status="executionStatus"
            :status-message="executionStatusMessage"
            :summary="executionSummary"
            @run="handleRunExecution"
          />

          <ProjectConfigPanel
            v-model="projectDraft"
            :ai-recommendation="projectAiRecommendation"
            :is-ai-analyzing="isAiAnalyzingProject"
            :project="latestScannedProject"
            @apply-ai-recommendation="handleApplyProjectAiRecommendation"
            @run-ai-analysis="handleRunProjectAiAnalysis"
            @save-project="handleSaveProjectConfig"
          />

          <EnvironmentConfigPanel
            :can-delete="environmentEditorMode === 'edit' && Boolean(environmentDraft?.name && !isPresetEnvironment)"
            :editor-draft="environmentDraft"
            :editor-mode="environmentEditorMode"
            :editor-visible="isEnvironmentEditorVisible"
            :environment-cards="environmentCards"
            :is-preset-environment="isPresetEnvironment"
            :project-id="selectedProjectId"
            :servers="servers"
            @check-environment="handleCheckEnvironment"
            @close-editor="handleCloseEnvironmentEditor"
            @create-environment="handleCreateEnvironment"
            @delete-environment="handleConfirmDeleteEnvironment"
            @delete-environment-card="handleConfirmDeleteEnvironmentByName"
            @reset-environment="handleResetEnvironmentDraft"
            @save-environment="handleSaveEnvironment"
            @select-environment="handleSelectEnvironment"
            @update:editor-draft="environmentDraft = $event"
          />
        </div>
      </div>
    </section>

    <section v-else-if="appStore.activePanel === 'servers'" class="panel-grid">
      <ServerConfigPanel
        :is-creating="isCreatingServer"
        v-model="serverDraft"
        :selected-server-id="selectedServerId"
        :servers="servers"
        @check-server="handleCheckServer"
        @close-create="handleCloseCreateServer"
        @create-server="handleCreateServer"
        @delete-server-card="handleConfirmDeleteServerById"
        @save-server="handleSaveServer"
        @select-server="handleSelectServer"
      />
    </section>

    <section v-else class="panel-grid">
      <article class="panel-card log-card">
        <header class="card-head">
          <div>
            <h3>鏈杩愯鏃ュ織</h3>
            <p class="section-note">日志页保留更详细的技术信息，方便排查执行问题。</p>
          </div>
          <Badge :variant="resolveBadgeVariant('contrast')" :class="['rounded-full', resolveBadgeToneClass('contrast')]">
            {{ gatewayStage }}
          </Badge>
        </header>
        <div class="log-stream">
          <p v-for="entry in gatewayLogs" :key="entry.id" :data-level="entry.level">
            [{{ entry.timestamp.slice(11, 19) }}] {{ entry.message }}
          </p>
          <p v-if="gatewayLogs.length === 0" class="muted">连接网关后，这里会展示实时消息和日志。</p>
        </div>
      </article>

      <article class="panel-card">
        <header class="card-head">
          <h3>当前状态</h3>
          <Badge :variant="resolveBadgeVariant('contrast')" :class="['rounded-full', resolveBadgeToneClass('contrast')]">
            {{ appStore.connectionLabel }}
          </Badge>
        </header>
        <ul class="task-list">
          <li>项目导入：已完成</li>
          <li>环境配置：已完成</li>
          <li>网关连接：{{ appStore.connectionLabel }}</li>
          <li>当前阶段：{{ gatewayStage }}</li>
        </ul>
        <p class="muted-paragraph">{{ gatewayStageDescription }}</p>
      </article>

      <TaskHistoryPanel
        :records="taskHistoryRecords"
        :selected-record-id="selectedTaskHistoryId"
        @select-record="selectedTaskHistoryId = $event"
      />

      <GatewayPanel
        :auth-mode="gatewayAuthMode"
        :connection-status="appStore.connectionStatus"
        :connection-status-label="gatewayConnectionLabel"
        :gateway-config-source="gatewayConfigSource"
        :gateway-token="gatewayToken"
        :gateway-url="gatewayUrl"
        :is-importing-local-config="isImportingLocalConfig"
        :is-probing="isProbingGateway"
        :is-saving-config="isSavingGatewayConfig"
        :probe-status="gatewayProbeStatus"
        :probe-summary="gatewayProbeSummary"
        @connect="connectGateway"
        @disconnect="disconnectGateway"
        @import-local-config="handleImportLocalGatewayConfig"
        @probe="probeGatewayConnection"
        @save-config="persistGatewayConfig"
        @send-ping="sendGatewayPing"
        @update:gateway-token="gatewayToken = $event"
        @update:gateway-url="gatewayUrl = $event"
      />
    </section>
    </PageTransition>

    <Menu ref="deployMenu" :model="quickDeployMenuItems" popup class="quick-deploy-menu" />

    <Dialog
      v-model:visible="isQuickDeployDialogVisible"
      modal
      :closable="quickDeployStage !== 'running'"
      :dismissable-mask="quickDeployStage !== 'running'"
      :close-on-escape="quickDeployStage !== 'running'"
      class="quick-deploy-dialog"
      :style="{ width: 'min(560px, calc(100vw - 32px))' }"
      @hide="handleCloseQuickDeployDialog"
    >
      <template #header>
        <div class="quick-deploy-dialog-header">
          <div>
            <strong>一键部署确认</strong>
            <p>{{ quickDeployDialogTitle }}</p>
          </div>
          <Badge
            :variant="resolveBadgeVariant(quickDeployStatusSeverity)"
            :class="['rounded-full', resolveBadgeToneClass(quickDeployStatusSeverity)]"
          >
            {{ quickDeployStatusLabel }}
          </Badge>
        </div>
      </template>

      <div class="quick-deploy-dialog-body">
        <div class="quick-deploy-summary-grid">
          <article class="quick-deploy-summary-item">
            <span>项目</span>
            <strong>{{ quickDeploySelectedProject?.name || "--" }}</strong>
          </article>
          <article class="quick-deploy-summary-item">
            <span>环境</span>
            <strong>{{ quickDeploySelectedEnvironmentLabel }}</strong>
          </article>
          <article class="quick-deploy-summary-item">
            <span>部署服务器</span>
            <strong>{{ quickDeploySelectedServerLabel }}</strong>
          </article>
          <article class="quick-deploy-summary-item">
            <span>部署策略</span>
            <strong>{{ quickDeploySelectedStrategyLabel }}</strong>
          </article>
        </div>

        <article class="quick-deploy-path-card">
          <span>远端部署目录</span>
          <code>{{ quickDeploySelectedRemotePath }}</code>
        </article>

        <Alert v-if="quickDeployStage === 'confirm'" :variant="resolveAlertVariant('info')" :class="resolveAlertToneClass('info')">
          灏嗕娇鐢ㄥ綋鍓嶉」鐩殑榛樿鎵撳寘鍛戒护涓庝骇鐗╃洰褰曟墽琛屾瀯寤猴紝鐒跺悗閮ㄧ讲鍒版墍閫夌幆澧冦€?
        </Alert>

        <Alert
          v-else-if="quickDeployStage === 'success'"
          :variant="resolveAlertVariant('success')"
          :class="resolveAlertToneClass('success')"
        >
          {{ quickDeployMessage }}
        </Alert>

        <Alert v-else-if="quickDeployStage === 'error'" :variant="resolveAlertVariant('error')" :class="resolveAlertToneClass('error')">
          {{ quickDeployMessage }}
        </Alert>

        <article class="quick-deploy-log-card">
          <header>
            <span>閮ㄧ讲杩涘害</span>
            <small>{{ quickDeployProgressLabel }}</small>
          </header>
          <div class="quick-deploy-log-stream">
            <p v-for="entry in quickDeployLogs" :key="entry">{{ entry }}</p>
            <p v-if="quickDeployLogs.length === 0" class="muted">确认后会在这里持续展示部署进度。</p>
          </div>
        </article>
      </div>

      <template #footer>
        <div class="quick-deploy-dialog-footer">
          <Button
            v-if="quickDeployStage === 'confirm'"
            label="取消"
            severity="secondary"
            text
            @click="isQuickDeployDialogVisible = false"
          />
          <Button
            v-if="quickDeployStage === 'confirm'"
            class="app-primary-button"
            label="确认部署"
            :icon="Send"
            @click="handleConfirmQuickDeploy"
          />
          <Button v-else label="关闭" severity="secondary" @click="isQuickDeployDialogVisible = false" />
        </div>
      </template>
    </Dialog>
  </AppShell>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, useTemplateRef, watch } from "vue";
import { FolderOpen, Globe2, Plus, Send, ShieldCheck, TriangleAlert, Trash2 } from "lucide-vue-next";

import Alert from "@/components/ui/alert/Alert.vue";
import Badge from "@/components/ui/badge/Badge.vue";
import Button from "@/components/ui/button/Button.vue";
import Dialog from "@/components/ui/dialog/Dialog.vue";
import Menu from "@/components/ui/menu/Menu.vue";
import projectFolderBackground from "@/assets/images/folder-bg2.png";
import projectFolderIcon from "@/assets/images/folder.png";

import EnvironmentConfigPanel from "@/components/EnvironmentConfigPanel.vue";
import ExecutionPanel from "@/components/ExecutionPanel.vue";
import GatewayPanel from "@/components/GatewayPanel.vue";
import PageTransition from "@/components/PageTransition.vue";
import ProjectConfigPanel from "@/components/ProjectConfigPanel.vue";
import ProjectOverviewCard from "@/components/ProjectOverviewCard.vue";
import ResourceCard from "@/components/ResourceCard.vue";
import ServerConfigPanel from "@/components/ServerConfigPanel.vue";
import TaskHistoryPanel from "@/components/TaskHistoryPanel.vue";
import WorkspaceDetailHeader from "@/components/workspace-header/WorkspaceDetailHeader.vue";
import AppShell from "@/layouts/AppShell.vue";
import { resolveAlertToneClass, resolveAlertVariant, resolveBadgeToneClass, resolveBadgeVariant } from "@/lib/ui-status";
import { runLocalBuild } from "@/services/execution/build";
import { runServerConnectionCheck } from "@/services/execution/connection-check";
import { runLocalDeploy } from "@/services/execution/deploy-local";
import { loadLocalOpenClawGatewayConfig } from "@/services/openclaw/config";
import { requestProjectAiRecommendation } from "@/services/openclaw/project-ai";
import {
  PRESET_ENVIRONMENTS,
  createEnvironmentRecordDraft,
  deleteEnvironment,
  getEnvironmentsByProjectIds,
  getProjectEnvironments,
  upsertEnvironment,
} from "@/services/project/environment-repository";
import { pickProjectDirectory } from "@/services/project/pick";
import { deleteProject, getProjects, markProjectAsUsed, updateProjectConfig, upsertProject } from "@/services/project/repository";
import { scanProject, scanProjectAiContext } from "@/services/project/scan";
import { deleteServer, getServers, upsertServer } from "@/services/server/repository";
import { loadGatewayConfig, saveGatewayConfig } from "@/services/storage/gateway";
import { appendTaskHistory, getTaskHistory } from "@/services/task-history/repository";
import { useConfirm } from "@/services/ui/confirm";
import { showToast } from "@/services/ui/toast";
import { GatewayClient } from "@/services/websocket/client";
import { probeGateway } from "@/services/websocket/probe";
import { useAppStore } from "@/stores/app";
import type { GatewayLogEntry, GatewayMessage } from "@/types/gateway";
import type { ProjectSummary } from "@/types/project";
import type {
  DeployEnvironmentRecord,
  EnvironmentFormValue,
  ExecutionDraft,
  ExecutionStatus,
  ExecutionSummaryItem,
  ProjectAiRecommendation,
  ProjectRecord,
  ServerFormValue,
  ServerRecord,
  TaskHistoryRecord,
  UploadStrategy,
} from "@/types/task";

const appStore = useAppStore();
const confirm = useConfirm();

appStore.setConnectionStatus("disconnected");

const projectPathInput = ref("");
const projectOverviewCardRef = useTemplateRef<InstanceType<typeof ProjectOverviewCard> | null>("projectOverviewCardRef");
const projectInsightHeight = ref<number | null>(null);
const isImporting = ref(false);
const importError = ref("");
const projects = ref<ProjectRecord[]>([]);
const latestScannedProject = ref<ProjectRecord | null>(null);
const selectedProjectId = ref<string | null>(null);
const projectDraft = ref<ProjectRecord | null>(null);
const projectAiRecommendation = ref<ProjectAiRecommendation | null>(null);
const isAiAnalyzingProject = ref(false);
const projectEnvironments = ref<DeployEnvironmentRecord[]>([]);
const projectEnvironmentsMap = ref<Map<string, DeployEnvironmentRecord[]>>(new Map());
const environmentDraft = ref<EnvironmentFormValue | null>(null);
const selectedEnvironmentName = ref<string | null>(null);
const isEnvironmentEditorVisible = ref(false);
const environmentEditorMode = ref<"create" | "edit">("edit");
const servers = ref<ServerRecord[]>([]);
const taskHistoryRecords = ref<TaskHistoryRecord[]>([]);
const selectedTaskHistoryId = ref<string | null>(null);
const isCreatingServer = ref(false);
const selectedServerId = ref<string | null>(null);
const serverDraft = ref<ServerFormValue>(createEmptyServerDraft());
const executionDraft = ref<ExecutionDraft | null>(null);
const executionStatus = ref<ExecutionStatus>("idle");
const executionStatusMessage = ref("");
const gatewayAuthMode = ref<"token">("token");
const gatewayConfigSource = ref<"manual" | "local-openclaw">("manual");
const gatewayToken = ref("");
const gatewayUrl = ref("");
const gatewayLogs = ref<GatewayLogEntry[]>([]);
const gatewayStage = ref("绛夊緟杩炴帴");
const gatewayProbeSummary = ref("");
const gatewayProbeStatus = ref<"idle" | "success" | "warn" | "error">("idle");
const isImportingLocalConfig = ref(false);
const isProbingGateway = ref(false);
const openResponsesEnabled = ref(false);
const reconnectCountdown = ref<number | null>(null);
const isSavingGatewayConfig = ref(false);
const deployMenu = ref();
const projectPendingDeleteId = ref<string | null>(null);
const quickDeployProjectId = ref<string | null>(null);
const quickDeployEnvironmentName = ref<string | null>(null);
const isQuickDeployDialogVisible = ref(false);
const quickDeployStage = ref<"confirm" | "running" | "success" | "error">("confirm");
const quickDeployMessage = ref("");
const quickDeployLogs = ref<string[]>([]);
let gatewayClient: GatewayClient | null = null;
let reconnectTimer: number | null = null;
let reconnectInterval: number | null = null;
let reconnectAttempts = 0;
let manualDisconnectRequested = false;
let shouldReconnectGateway = false;
let projectOverviewResizeObserver: ResizeObserver | null = null;

type GatewayConnectTrigger = "manual" | "startup" | "reconnect";

type QuickDeployEnvironmentOption = {
  environment: DeployEnvironmentRecord;
  project: ProjectRecord;
  server: ServerRecord | null;
};

function createLog(level: GatewayLogEntry["level"], message: string) {
  return {
    id: crypto.randomUUID(),
    level,
    message,
    timestamp: new Date().toISOString(),
  } satisfies GatewayLogEntry;
}

function pushGatewayLog(level: GatewayLogEntry["level"], message: string) {
  gatewayLogs.value = [createLog(level, message), ...gatewayLogs.value].slice(0, 100);
}

function isObjectRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function getErrorMessage(error: unknown, fallback: string) {
  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }

  if (typeof error === "string" && error.trim()) {
    return error;
  }

  if (isObjectRecord(error)) {
    if (typeof error.message === "string" && error.message.trim()) {
      return error.message;
    }

    if (typeof error.error === "string" && error.error.trim()) {
      return error.error;
    }

    try {
      return JSON.stringify(error);
    } catch {
      return fallback;
    }
  }

  return fallback;
}

function summarizeGatewayMessage(message: GatewayMessage): { level: GatewayLogEntry["level"]; text: string } | null {
  if (message.type === "event") {
    const eventName = typeof message.event === "string" ? message.event : "unknown";

    if (eventName === "connect.challenge") {
      return null;
    }

    if (eventName === "tick") {
      return null;
    }

    if (eventName === "health") {
      const payload = isObjectRecord(message.payload) ? message.payload : null;
      const ok = payload && typeof payload.ok === "boolean" ? payload.ok : null;

      if (ok === true) {
        return {
          level: "info",
          text: "网关健康检查正常",
        };
      }

      return {
        level: "warn",
        text: "网关返回健康检查事件，但状态不是 ok",
      };
    }

    return {
      level: "info",
      text: `收到网关事件：${eventName}`,
    };
  }

  if (message.type === "res") {
    const ok = typeof message.ok === "boolean" ? message.ok : null;
    const method = typeof message.method === "string" ? message.method : "";

    if (ok === true) {
      return {
        level: "success",
        text: method ? `请求执行成功：${method}` : "网关请求执行成功",
      };
    }

    const error = isObjectRecord(message.error) && typeof message.error.message === "string" ? message.error.message : "";

    return {
      level: "error",
      text: error || "网关请求返回失败",
    };
  }

  return {
    level: "info",
    text: `收到网关消息：${message.type}`,
  };
}

function createEmptyEnvironmentDraft(name: "dev" | "test" | "prod" = "dev"): EnvironmentFormValue {
  return {
    name,
    serverId: "",
    remotePath: "",
    uploadStrategy: "overwrite",
    postDeployCommand: "",
    enabled: true,
  };
}

function createEmptyServerDraft(): ServerFormValue {
  return {
    name: "",
    host: "",
    port: 22,
    username: "",
    authType: "password",
    password: "",
    privateKeyPath: "",
  };
}

function toEnvironmentDraft(environment: DeployEnvironmentRecord): EnvironmentFormValue {
  return {
    name: environment.name,
    serverId: environment.serverId,
    remotePath: environment.remotePath,
    uploadStrategy: environment.uploadStrategy,
    postDeployCommand: environment.postDeployCommand,
    enabled: environment.enabled,
  };
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
  };
}

function createExecutionDraft(project: ProjectRecord, environmentName = "dev"): ExecutionDraft {
  return {
    environmentName,
    mode: "build",
    overrideBuildCommand: project.defaultBuildCommand,
    overrideOutputDir: project.defaultOutputDir,
    runPrecheck: project.defaultPrecheckEnabled,
  };
}

function formatEnvironmentLabel(name: string) {
  if (name === "test") {
    return "测试环境";
  }

  if (name === "prod") {
    return "生产环境";
  }

  return "自定义环境";
}

function formatUploadStrategyLabel(strategy: UploadStrategy) {
  if (strategy === "clear-and-upload") {
    return "清空后上传";
  }

  return "直接覆盖";
}

function getEnvironmentIcon(name: string) {
  if (name === "test") {
    return Globe2;
  }

  if (name === "prod") {
    return ShieldCheck;
  }

  return Compass;
}

const projectSummaries = computed<ProjectSummary[]>(() =>
  projects.value.map((project) => ({
    id: project.id,
    name: project.name,
    path: project.localPath,
    type: project.projectType,
    updatedAt: project.updatedAt,
  })),
);

const quickDeployOptionsByProject = computed(() => {
  const result = new Map<string, QuickDeployEnvironmentOption[]>();

  projects.value.forEach((project) => {
    const environments = projectEnvironmentsMap.value.get(project.id) ?? [];
    const available = environments
      .filter((environment) => environment.enabled && (environment.name === "test" || environment.name === "prod"))
      .map((environment) => ({
        environment,
        project,
        server: servers.value.find((server) => server.id === environment.serverId) ?? null,
      }))
      .filter((item) => item.server && item.environment.remotePath.trim());

    result.set(project.id, available);
  });

  return result;
});

const quickDeployMenuItems = computed(() =>
  (quickDeployProjectId.value ? (quickDeployOptionsByProject.value.get(quickDeployProjectId.value) ?? []) : []).map((item) => ({
    command: () => {
      openQuickDeployDialog(item);
    },
    icon: item.environment.name === "prod" ? ShieldCheck : Globe2,
    label: `部署到 ${formatEnvironmentLabel(item.environment.name)}`,
  })),
);

const quickDeploySelectedOption = computed<QuickDeployEnvironmentOption | null>(() => {
  if (!quickDeployProjectId.value || !quickDeployEnvironmentName.value) {
    return null;
  }

  const options = quickDeployOptionsByProject.value.get(quickDeployProjectId.value) ?? [];
  return options.find((item) => item.environment.name === quickDeployEnvironmentName.value) ?? null;
});

const quickDeploySelectedProject = computed(() => quickDeploySelectedOption.value?.project ?? null);

const quickDeploySelectedEnvironmentLabel = computed(() =>
  quickDeploySelectedOption.value ? formatEnvironmentLabel(quickDeploySelectedOption.value.environment.name) : "--",
);

const quickDeploySelectedServerLabel = computed(() => {
  const server = quickDeploySelectedOption.value?.server;

  if (!server) {
    return "--";
  }

  return `${server.name} / ${server.host}:${server.port}`;
});

const quickDeploySelectedStrategyLabel = computed(() =>
  quickDeploySelectedOption.value ? formatUploadStrategyLabel(quickDeploySelectedOption.value.environment.uploadStrategy) : "--",
);

const quickDeploySelectedRemotePath = computed(() => quickDeploySelectedOption.value?.environment.remotePath?.trim() || "--");

const quickDeployDialogTitle = computed(() => {
  if (quickDeployStage.value === "running") {
    return "部署任务正在执行，窗口会持续展示实时进度。";
  }

  if (quickDeployStage.value === "success") {
    return "部署已完成，你可以查看结果后手动关闭当前窗口。";
  }

  if (quickDeployStage.value === "error") {
    return "部署已结束，请根据结果信息确认是否需要调整配置。";
  }

  return "请确认本次部署的目标环境与策略。";
});

const quickDeployStatusLabel = computed(() => {
  if (quickDeployStage.value === "running") {
    return "部署中";
  }

  if (quickDeployStage.value === "success") {
    return "閮ㄧ讲鎴愬姛";
  }

  if (quickDeployStage.value === "error") {
    return "閮ㄧ讲澶辫触";
  }

  return "待确认";
});

const quickDeployStatusSeverity = computed(() => {
  if (quickDeployStage.value === "running") {
    return "warn";
  }

  if (quickDeployStage.value === "success") {
    return "success";
  }

  if (quickDeployStage.value === "error") {
    return "danger";
  }

  return "secondary";
});

const quickDeployProgressLabel = computed(() => {
  if (quickDeployStage.value === "running") {
    return "执行中";
  }

  if (quickDeployStage.value === "success") {
    return "已完成";
  }

  if (quickDeployStage.value === "error") {
    return "已失败";
  }

  return "等待开始";
});

const environmentCards = computed(() => {
  const cards = [...PRESET_ENVIRONMENTS].map((name) => {
    const matched = projectEnvironments.value.find((environment) => environment.name === name) ?? null;
    const server = matched ? (servers.value.find((item) => item.id === matched.serverId) ?? null) : null;

    return {
      configured: Boolean(matched),
      deletable: false,
      icon: getEnvironmentIcon(name),
      label: formatEnvironmentLabel(name),
      name,
      preset: true,
      remotePathLabel: matched?.remotePath?.trim() || "还没有设置部署目录",
      serverLabel: server ? `${server.name} / ${server.host}:${server.port}` : "还没有绑定服务器",
    };
  });

  const customCards = projectEnvironments.value
    .filter((environment) => !PRESET_ENVIRONMENTS.includes(environment.name as (typeof PRESET_ENVIRONMENTS)[number]))
    .map((environment) => {
      const server = servers.value.find((item) => item.id === environment.serverId) ?? null;

      return {
        configured: true,
        deletable: true,
        icon: getEnvironmentIcon(environment.name),
        label: environment.name,
        name: environment.name,
        preset: false,
        remotePathLabel: environment.remotePath?.trim() || "还没有设置部署目录",
        serverLabel: server ? `${server.name} / ${server.host}:${server.port}` : "还没有绑定服务器",
      };
    });

  return [...cards, ...customCards];
});

const executionEnvironmentOptions = computed(() => {
  const configuredOptions = projectEnvironments.value.map((environment) => ({
    label: environment.name,
    value: environment.name,
  }));

  const fallbackOptions = PRESET_ENVIRONMENTS.map((name) => ({
    label: name,
    value: name,
  }));

  return configuredOptions.length > 0 ? configuredOptions : fallbackOptions;
});

const isPresetEnvironment = computed(() =>
  environmentDraft.value ? PRESET_ENVIRONMENTS.includes(environmentDraft.value.name as (typeof PRESET_ENVIRONMENTS)[number]) : false,
);

const gatewayConnectionLabel = computed(() => {
  if (appStore.connectionStatus === "connected") {
    return "已连接";
  }

  if (appStore.connectionStatus === "connecting") {
    return "连接中";
  }

  return "未连接";
});

const gatewayStageDescription = computed(() => {
  if (appStore.connectionStatus === "connected") {
    return "网关连接和认证都已完成，可以继续使用 AI 判断、日志分析等辅助能力。";
  }

  if (appStore.connectionStatus === "connecting") {
    return "当前正在建立 WebSocket，并等待 OpenClaw 完成握手认证。";
  }

  if (reconnectCountdown.value !== null) {
    return `网关连接已断开，系统会在 ${reconnectCountdown.value} 秒后自动重连。`;
  }

  return "当前还没有可用的网关连接，AI 判断、日志分析等辅助能力暂不可用，但本地打包和部署主流程不受影响。";
});

const executionSummary = computed<ExecutionSummaryItem[]>(() => {
  if (!latestScannedProject.value || !executionDraft.value) {
    return [];
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
  ];
});

const projectScriptCardStyle = computed(() => {
  if (!projectInsightHeight.value) {
    return undefined;
  }

  return {
    height: `${projectInsightHeight.value}px`,
  };
});

function syncProjectInsightHeight() {
  const element = projectOverviewCardRef.value?.overviewCardRef ?? null;

  if (!element) {
    projectInsightHeight.value = null;
    return;
  }

  projectInsightHeight.value = Math.ceil(element.getBoundingClientRect().height);
}

const canRunExecution = computed(() => {
  if (!latestScannedProject.value || !executionDraft.value) {
    return false;
  }

  if (executionDraft.value.mode === "build") {
    return executionDraft.value.overrideBuildCommand.trim().length > 0;
  }

  if (executionDraft.value.mode === "deploy" || executionDraft.value.mode === "build-and-deploy") {
    return true;
  }

  return false;
});

const workspacePanelKey = computed(() => {
  if (appStore.activePanel === "config") {
    return selectedProjectId.value ? `project-detail:${selectedProjectId.value}` : "project-list";
  }

  return appStore.activePanel;
});

function getSelectedEnvironmentConfig() {
  if (!environmentDraft.value || !executionDraft.value) {
    return null;
  }

  if (environmentDraft.value.name === executionDraft.value.environmentName) {
    return environmentDraft.value;
  }

  return null;
}

function validateDeployContext() {
  if (!latestScannedProject.value || !executionDraft.value) {
    return { ok: false as const, message: "当前没有可执行的项目任务" };
  }

  if (executionDraft.value.mode === "deploy") {
    const outputPath = `${latestScannedProject.value.localPath}/${executionDraft.value.overrideOutputDir}`.trim();

    if (!outputPath) {
      return { ok: false as const, message: "仅部署模式下，本地产物目录不能为空" };
    }
  }

  const environmentConfig = getSelectedEnvironmentConfig();

  if (!environmentConfig) {
    return { ok: false as const, message: "请先为当前环境保存部署配置" };
  }

  if (!environmentConfig.serverId) {
    return { ok: false as const, message: "当前环境还没有绑定默认服务器" };
  }

  if (!environmentConfig.remotePath.trim()) {
    return { ok: false as const, message: "当前环境的远端部署目录不能为空" };
  }

  const server = servers.value.find((item) => item.id === environmentConfig.serverId) ?? null;

  if (!server) {
    return { ok: false as const, message: "当前环境绑定的服务器不存在，请重新选择" };
  }

  if (server.authType === "password" && !server.password.trim()) {
    return { ok: false as const, message: "当前服务器使用密码认证，但密码为空" };
  }

  if (server.authType === "privateKey" && !server.privateKeyPath.trim()) {
    return { ok: false as const, message: "当前服务器使用私钥认证，但私钥路径为空" };
  }

  return {
    ok: true as const,
    environmentConfig,
    server,
  };
}

async function refreshProjects() {
  projects.value = await getProjects();
  await refreshProjectEnvironmentMap();

  if (projects.value.length > 0) {
    const selected = selectedProjectId.value ? (projects.value.find((project) => project.id === selectedProjectId.value) ?? null) : null;

    selectedProjectId.value = selected?.id ?? null;
    latestScannedProject.value = selected;
    projectDraft.value = selected ? { ...selected } : null;
    projectAiRecommendation.value = null;
    executionDraft.value = selected ? createExecutionDraft(selected) : null;
    appStore.setSelectedProjectName(selected?.name ?? "项目");
    appStore.setBannerMessage(`已载入 ${projects.value.length} 条项目记录`);
    projectPathInput.value = selected?.localPath ?? "";

    if (selected) {
      await loadEnvironmentDraft(selected.id);
      await refreshTaskHistory(selected.id);
    } else {
      projectEnvironments.value = [];
      environmentDraft.value = null;
      selectedEnvironmentName.value = null;
      isEnvironmentEditorVisible.value = false;
      taskHistoryRecords.value = [];
      selectedTaskHistoryId.value = null;
    }
  } else {
    selectedProjectId.value = null;
    latestScannedProject.value = null;
    projectDraft.value = null;
    projectAiRecommendation.value = null;
    projectEnvironments.value = [];
    environmentDraft.value = null;
    selectedEnvironmentName.value = null;
    isEnvironmentEditorVisible.value = false;
    executionDraft.value = null;
    taskHistoryRecords.value = [];
    selectedTaskHistoryId.value = null;
    projectPathInput.value = "";
    appStore.setSelectedProjectName("未选择项目");
    appStore.setBannerMessage("等待导入项目");
  }
}

async function refreshServers(preferredServerId?: string | null) {
  servers.value = await getServers();

  const targetId = preferredServerId ?? selectedServerId.value;
  const matchedServer = targetId ? (servers.value.find((server) => server.id === targetId) ?? null) : null;

  if (matchedServer) {
    selectedServerId.value = matchedServer.id;
    serverDraft.value = toServerDraft(matchedServer);
    return;
  }

  selectedServerId.value = null;
  serverDraft.value = createEmptyServerDraft();
}

async function refreshTaskHistory(projectId?: string | null) {
  taskHistoryRecords.value = await getTaskHistory(projectId);
  selectedTaskHistoryId.value = taskHistoryRecords.value[0]?.id ?? null;
}

async function refreshProjectEnvironmentMap() {
  projectEnvironmentsMap.value = await getEnvironmentsByProjectIds(projects.value.map((project) => project.id));
}

async function refreshProjectEnvironments(projectId: string) {
  projectEnvironments.value = await getProjectEnvironments(projectId);
  projectEnvironmentsMap.value = new Map(projectEnvironmentsMap.value);
  projectEnvironmentsMap.value.set(projectId, [...projectEnvironments.value]);
}

async function loadEnvironmentDraft(projectId: string) {
  await refreshProjectEnvironments(projectId);
  const currentProject = projects.value.find((project) => project.id === projectId) ?? latestScannedProject.value;
  const preferredName = executionDraft.value?.environmentName ?? "dev";
  const selectedEnvironment =
    projectEnvironments.value.find((environment) => environment.name === preferredName) ??
    projectEnvironments.value.find((environment) => environment.name === "test") ??
    projectEnvironments.value.find((environment) => environment.name === "prod") ??
    null;

  selectedEnvironmentName.value = selectedEnvironment?.name ?? preferredName;
  environmentDraft.value = selectedEnvironment ? toEnvironmentDraft(selectedEnvironment) : createEnvironmentRecordDraft(preferredName);

  if (
    environmentDraft.value &&
    !environmentDraft.value.serverId &&
    currentProject?.defaultDeployServerIdByEnv?.[environmentDraft.value.name]
  ) {
    environmentDraft.value.serverId = currentProject.defaultDeployServerIdByEnv[environmentDraft.value.name] ?? "";
  }

  if (latestScannedProject.value) {
    executionDraft.value = createExecutionDraft(latestScannedProject.value, environmentDraft.value.name);
  }
}

async function handleImport() {
  importError.value = "";
  isImporting.value = true;
  let importedProjectName = "";

  try {
    const scanResult = await scanProject(projectPathInput.value);
    const project = await upsertProject(scanResult);

    selectedProjectId.value = null;
    await refreshProjects();
    appStore.setSelectedProjectName("项目");
    appStore.setBannerMessage(`已导入项目：${project.name}`);
    importedProjectName = project.name;
  } catch (error) {
    importError.value = getErrorMessage(error, "项目导入失败");
    appStore.setBannerMessage("项目导入失败，请检查路径和 package.json");
  } finally {
    isImporting.value = false;
  }

  return importedProjectName;
}

async function handlePickDirectory() {
  try {
    const selectedPath = await pickProjectDirectory();

    if (!selectedPath) {
      return;
    }

    projectPathInput.value = selectedPath;
    const importedProjectName = await handleImport();

    if (importedProjectName) {
      showToast(`项目 ${importedProjectName} 导入成功`, "success");
    }
  } catch (error) {
    importError.value = getErrorMessage(error, "鐩綍閫夋嫨澶辫触");
    appStore.setBannerMessage("鐩綍閫夋嫨澶辫触");
  }
}

async function handleSelectProject(projectId: string) {
  const selected = projects.value.find((project) => project.id === projectId);

  if (!selected) {
    return;
  }

  selectedProjectId.value = projectId;
  latestScannedProject.value = selected;
  projectDraft.value = { ...selected };
  projectAiRecommendation.value = null;
  executionDraft.value = createExecutionDraft(selected, environmentDraft.value?.name ?? "dev");
  projectPathInput.value = selected.localPath;
  appStore.setSelectedProjectName(selected.name);
  appStore.setBannerMessage(`宸插垏鎹㈠埌 ${selected.name}`);

  projects.value = await markProjectAsUsed(projectId);
  latestScannedProject.value = projects.value.find((project) => project.id === projectId) ?? selected;
  projectDraft.value = latestScannedProject.value ? { ...latestScannedProject.value } : null;
  projectAiRecommendation.value = null;
  executionDraft.value = latestScannedProject.value
    ? createExecutionDraft(latestScannedProject.value, environmentDraft.value?.name ?? "dev")
    : null;
  await loadEnvironmentDraft(projectId);
  await refreshTaskHistory(projectId);
}

async function syncEnvironmentByName(environmentName: string) {
  if (!selectedProjectId.value) {
    return;
  }

  await refreshProjectEnvironments(selectedProjectId.value);
  const matchedEnvironment = projectEnvironments.value.find((environment) => environment.name === environmentName) ?? null;
  const currentProject = projects.value.find((project) => project.id === selectedProjectId.value) ?? latestScannedProject.value;

  selectedEnvironmentName.value = environmentName;
  environmentDraft.value = matchedEnvironment ? toEnvironmentDraft(matchedEnvironment) : createEnvironmentRecordDraft(environmentName);

  if (
    environmentDraft.value &&
    !environmentDraft.value.serverId &&
    currentProject?.defaultDeployServerIdByEnv?.[environmentDraft.value.name]
  ) {
    environmentDraft.value.serverId = currentProject.defaultDeployServerIdByEnv[environmentDraft.value.name] ?? "";
  }
}

function handleCreateEnvironment() {
  environmentEditorMode.value = "create";
  selectedEnvironmentName.value = null;
  environmentDraft.value = createEnvironmentRecordDraft("");
  isEnvironmentEditorVisible.value = true;
  appStore.setBannerMessage("宸叉墦寮€鏂板鐜闈㈡澘");
}

async function handleSelectEnvironment(name: string) {
  if (!selectedProjectId.value) {
    return;
  }

  environmentEditorMode.value = "edit";
  selectedEnvironmentName.value = name;
  await syncEnvironmentByName(name);
  isEnvironmentEditorVisible.value = true;
  appStore.setBannerMessage(`宸茶浇鍏ョ幆澧冿細${name}`);
  appStore.setBannerMessage(`已载入环境：${name}`);
}

function handleCloseEnvironmentEditor() {
  isEnvironmentEditorVisible.value = false;
  environmentEditorMode.value = "edit";
  appStore.setBannerMessage("已关闭环境编辑面板");
}

function handleResetEnvironmentDraft() {
  if (!environmentDraft.value) {
    return;
  }

  environmentDraft.value = {
    ...environmentDraft.value,
    name: "",
    serverId: "",
    remotePath: "",
    uploadStrategy: "overwrite",
    postDeployCommand: "",
    enabled: false,
  };

  appStore.setBannerMessage("已清空当前环境表单");
  showToast("当前环境配置已重置", "success");
}

function hasQuickDeployOptions(projectId: string) {
  return (quickDeployOptionsByProject.value.get(projectId) ?? []).length > 0;
}

function pushQuickDeployLog(message: string) {
  const timestamp = new Date().toLocaleTimeString("zh-CN", {
    hour12: false,
  });
  quickDeployLogs.value = [...quickDeployLogs.value, `[${timestamp}] ${message}`];
}

function resetQuickDeployState() {
  quickDeployProjectId.value = null;
  quickDeployEnvironmentName.value = null;
  quickDeployStage.value = "confirm";
  quickDeployMessage.value = "";
  quickDeployLogs.value = [];
}

function toggleQuickDeployMenu(event: Event, projectId: string) {
  if (!hasQuickDeployOptions(projectId)) {
    return;
  }

  quickDeployProjectId.value = projectId;
  deployMenu.value?.toggle(event);
}

function openQuickDeployDialog(option: QuickDeployEnvironmentOption) {
  quickDeployProjectId.value = option.project.id;
  quickDeployEnvironmentName.value = option.environment.name;
  quickDeployStage.value = "confirm";
  quickDeployMessage.value = "";
  quickDeployLogs.value = [];
  isQuickDeployDialogVisible.value = true;
}

function handleCloseQuickDeployDialog() {
  if (quickDeployStage.value === "running") {
    isQuickDeployDialogVisible.value = true;
    return;
  }

  resetQuickDeployState();
}

async function handleConfirmQuickDeploy() {
  const option = quickDeploySelectedOption.value;

  if (!option) {
    showToast("当前项目没有可用的测试环境或生产环境配置", "warning");
    isQuickDeployDialogVisible.value = false;
    return;
  }

  if (!option.project.defaultBuildCommand.trim()) {
    quickDeployStage.value = "error";
    quickDeployMessage.value = "当前项目缺少默认打包命令，请先在项目配置中保存后再执行一键部署。";
    pushQuickDeployLog(quickDeployMessage.value);
    showToast(quickDeployMessage.value, "warning");
    return;
  }

  if (!option.project.defaultOutputDir.trim()) {
    quickDeployStage.value = "error";
    quickDeployMessage.value = "当前项目缺少默认产物目录，请先在项目配置中保存后再执行一键部署。";
    pushQuickDeployLog(quickDeployMessage.value);
    showToast(quickDeployMessage.value, "warning");
    return;
  }

  if (!option.server) {
    quickDeployStage.value = "error";
    quickDeployMessage.value = "当前环境绑定的服务器不存在，请先重新保存环境配置。";
    pushQuickDeployLog(quickDeployMessage.value);
    showToast(quickDeployMessage.value, "error");
    return;
  }

  if (option.server.authType === "password" && !option.server.password.trim()) {
    quickDeployStage.value = "error";
    quickDeployMessage.value = "当前服务器使用密码认证，但密码为空。";
    pushQuickDeployLog(quickDeployMessage.value);
    showToast(quickDeployMessage.value, "error");
    return;
  }

  if (option.server.authType === "privateKey" && !option.server.privateKeyPath.trim()) {
    quickDeployStage.value = "error";
    quickDeployMessage.value = "当前服务器使用私钥认证，但私钥路径为空。";
    pushQuickDeployLog(quickDeployMessage.value);
    showToast(quickDeployMessage.value, "error");
    return;
  }

  const startedAt = new Date().toISOString();
  const logStartCount = gatewayLogs.value.length;
  let buildOutputPath = `${option.project.localPath}/${option.project.defaultOutputDir}`;
  let historySummary = "";
  let historyErrorMessage = "";

  quickDeployStage.value = "running";
  quickDeployMessage.value = "部署任务正在执行，请稍候。";
  quickDeployLogs.value = [];

  pushQuickDeployLog(`准备部署项目 ${option.project.name}`);
  pushQuickDeployLog(`目标环境：${formatEnvironmentLabel(option.environment.name)}`);
  pushQuickDeployLog(`部署策略：${formatUploadStrategyLabel(option.environment.uploadStrategy)}`);
  pushQuickDeployLog(`目标目录：${option.environment.remotePath}`);

  pushGatewayLog("info", `开始一键部署：${option.project.name} -> ${formatEnvironmentLabel(option.environment.name)}`);

  try {
    const buildResult = await runLocalBuild({
      projectPath: option.project.localPath,
      buildCommand: option.project.defaultBuildCommand,
      outputDir: option.project.defaultOutputDir,
      precheckCommand: option.project.defaultPrecheckCommand,
      runPrecheck: option.project.defaultPrecheckEnabled,
    });

    if (buildResult.precheckRan) {
      pushQuickDeployLog(buildResult.precheckSuccess ? "前置校验执行成功" : "前置校验执行失败");
      pushGatewayLog(
        buildResult.precheckSuccess ? "success" : "error",
        buildResult.precheckSuccess ? "前置校验执行成功" : "前置校验执行失败",
      );

      if (buildResult.precheckOutput.trim()) {
        pushQuickDeployLog(buildResult.precheckOutput.trim());
        pushGatewayLog(buildResult.precheckSuccess ? "info" : "error", buildResult.precheckOutput.trim());
      }
    }

    if (!buildResult.success) {
      throw new Error(buildResult.buildOutput.trim() || "本地打包执行失败");
    }

    buildOutputPath = buildResult.outputPath;
    pushQuickDeployLog(`本地打包完成：${buildResult.outputPath}`);
    pushGatewayLog("success", `一键部署打包完成：${buildResult.outputPath}`);

    if (buildResult.buildOutput.trim()) {
      pushQuickDeployLog(buildResult.buildOutput.trim());
      pushGatewayLog("info", buildResult.buildOutput.trim());
    }

    pushQuickDeployLog(`开始连接服务器：${option.server.host}:${option.server.port}`);
    pushQuickDeployLog(`远端部署目录：${option.environment.remotePath}`);
    pushQuickDeployLog("部署任务已提交到桌面端后台线程执行。");

    const deployResult = await runLocalDeploy({
      environmentName: option.environment.name,
      outputPath: buildOutputPath,
      postDeployCommand: option.environment.postDeployCommand,
      projectName: option.project.name,
      remotePath: option.environment.remotePath,
      server: option.server,
      uploadStrategy: option.environment.uploadStrategy,
    });

    deployResult.steps.forEach((step) => {
      pushQuickDeployLog(step);
      pushGatewayLog("info", step);
    });

    if (!deployResult.success) {
      throw new Error(deployResult.errorMessage || deployResult.commandOutput || "远端部署执行失败");
    }

    if (deployResult.commandOutput.trim()) {
      pushQuickDeployLog(deployResult.commandOutput.trim());
      pushGatewayLog("info", deployResult.commandOutput.trim());
    }

    historySummary = `一键部署成功，已发布到${formatEnvironmentLabel(option.environment.name)}`;
    quickDeployStage.value = "success";
    quickDeployMessage.value = `${option.project.name} 已成功部署到 ${formatEnvironmentLabel(option.environment.name)}。`;
    pushQuickDeployLog(quickDeployMessage.value);
    pushGatewayLog("success", quickDeployMessage.value);
    appStore.setBannerMessage(quickDeployMessage.value);
    showToast("一键部署成功", "success");
  } catch (error) {
    const message = getErrorMessage(error, "一键部署失败");
    historySummary = `一键部署失败，目标环境 ${formatEnvironmentLabel(option.environment.name)}`;
    historyErrorMessage = message;
    quickDeployStage.value = "error";
    quickDeployMessage.value = message;
    pushQuickDeployLog(message);
    pushGatewayLog("error", message);
    appStore.setBannerMessage(message);
    showToast(message, "error");
  } finally {
    const finishedAt = new Date().toISOString();
    const newLogs = gatewayLogs.value
      .slice(0, Math.max(gatewayLogs.value.length - logStartCount, 0))
      .map((entry) => `[${entry.timestamp.slice(11, 19)}] ${entry.message}`)
      .reverse();

    const historyRecord: TaskHistoryRecord = {
      id: crypto.randomUUID(),
      projectId: option.project.id,
      projectName: option.project.name,
      environmentName: option.environment.name,
      mode: "build-and-deploy",
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
    };

    await appendTaskHistory(historyRecord);

    if (selectedProjectId.value === option.project.id) {
      await refreshTaskHistory(option.project.id);
    }
  }
}

async function handleDeleteProject(projectId: string) {
  const deleted = projects.value.find((project) => project.id === projectId);

  projects.value = await deleteProject(projectId);
  projectPendingDeleteId.value = null;

  if (selectedProjectId.value === projectId) {
    selectedProjectId.value = null;
  }

  if (deleted) {
    appStore.setBannerMessage(`已删除项目：${deleted.name}`);
    showToast(`项目 ${deleted.name} 已删除`, "success");
  }

  await refreshProjects();
}

function openProjectDeleteDialog(projectId: string) {
  const project = projects.value.find((item) => item.id === projectId);

  if (!project) {
    return;
  }

  confirm.require({
    message: `删除后会移除应用中的项目 “${project.name}” 记录，不会删除你的本地源码目录。`,
    header: "确认删除项目",
    icon: TriangleAlert,
    rejectLabel: "取消",
    acceptLabel: "删除",
    acceptClass: "p-button-danger",
    accept: () => {
      projectPendingDeleteId.value = projectId;
      void handleDeleteProject(projectId);
    },
  });
}

function handleBackToProjectList() {
  selectedProjectId.value = null;
  latestScannedProject.value = null;
  projectEnvironments.value = [];
  projectDraft.value = null;
  projectAiRecommendation.value = null;
  environmentDraft.value = null;
  selectedEnvironmentName.value = null;
  isEnvironmentEditorVisible.value = false;
  executionDraft.value = null;
  taskHistoryRecords.value = [];
  selectedTaskHistoryId.value = null;
  projectPathInput.value = "";
  appStore.setSelectedProjectName("项目");
  appStore.setBannerMessage("已返回项目列表");
}

async function handleSaveProjectConfig() {
  if (!projectDraft.value) {
    return;
  }

  projects.value = await updateProjectConfig(projectDraft.value);
  latestScannedProject.value = projects.value.find((project) => project.id === projectDraft.value?.id) ?? null;
  projectDraft.value = latestScannedProject.value ? { ...latestScannedProject.value } : null;

  if (latestScannedProject.value && executionDraft.value) {
    executionDraft.value = {
      ...executionDraft.value,
      overrideBuildCommand: latestScannedProject.value.defaultBuildCommand,
      overrideOutputDir: latestScannedProject.value.defaultOutputDir,
      runPrecheck: latestScannedProject.value.defaultPrecheckEnabled,
    };
  }

  appStore.setBannerMessage(`已保存项目配置：${projectDraft.value?.name ?? ""}`);
  showToast("项目配置已保存", "success");
}

async function handleRunProjectAiAnalysis() {
  if (!latestScannedProject.value) {
    showToast("请先导入并选中项目", "warning");
    return;
  }

  if (!gatewayUrl.value.trim() || !gatewayToken.value.trim()) {
    showToast("请先填写并保存 OpenClaw 网关地址和 Token，再执行 AI 判断", "warning");
    return;
  }

  if (gatewayConfigSource.value === "local-openclaw" && !openResponsesEnabled.value) {
    showToast("当前 OpenClaw 未启用 OpenResponses 能力，AI 判断暂不可用，需要先在 OpenClaw 配置中开启该 HTTP 端点。", "warning");
    return;
  }

  isAiAnalyzingProject.value = true;
  projectAiRecommendation.value = null;
  pushGatewayLog("info", `开始对项目 ${latestScannedProject.value.name} 执行 AI 判断`);

  try {
    const context = await scanProjectAiContext(latestScannedProject.value.localPath);
    const recommendation = await requestProjectAiRecommendation({
      context,
      token: gatewayToken.value.trim(),
      url: gatewayUrl.value.trim(),
    });

    projectAiRecommendation.value = recommendation;
    pushGatewayLog("success", "AI 已返回项目构建建议");
    pushGatewayLog(
      "info",
      `AI 建议：命令 ${recommendation.recommendedBuildCommand || "未给出"}，目录 ${recommendation.recommendedOutputDir || "未给出"}`,
    );
    appStore.setBannerMessage("AI 已返回项目构建建议");
    showToast("AI 判断完成", "success");
  } catch (error) {
    const rawMessage = getErrorMessage(error, "AI 判断失败，请确认 OpenClaw 网关已启用 /v1/responses，并且当前 Token 有调用权限。");
    const message = rawMessage.includes("HTTP 404")
      ? "当前 OpenClaw Gateway 未暴露 /v1/responses 接口，所以 AI 判断不可用。请先在 OpenClaw 配置中启用 OpenResponses HTTP 端点，再重试。"
      : rawMessage;
    pushGatewayLog("error", message);
    appStore.setBannerMessage(message);
    showToast(message, "error");
  } finally {
    isAiAnalyzingProject.value = false;
  }
}

function handleApplyProjectAiRecommendation() {
  if (!projectDraft.value || !projectAiRecommendation.value) {
    return;
  }

  const nextProjectDraft: ProjectRecord = {
    ...projectDraft.value,
    defaultBuildCommand: projectAiRecommendation.value.recommendedBuildCommand || projectDraft.value.defaultBuildCommand,
    defaultOutputDir: projectAiRecommendation.value.recommendedOutputDir || projectDraft.value.defaultOutputDir,
  };

  projectDraft.value = nextProjectDraft;

  if (executionDraft.value) {
    executionDraft.value = {
      ...executionDraft.value,
      overrideBuildCommand: nextProjectDraft.defaultBuildCommand,
      overrideOutputDir: nextProjectDraft.defaultOutputDir,
    };
  }

  appStore.setBannerMessage("已应用 AI 推荐值，请按需保存项目配置");
  showToast("已应用 AI 推荐值", "success");
}

async function handleSaveEnvironment() {
  if (!selectedProjectId.value || !environmentDraft.value) {
    return;
  }

  if (!environmentDraft.value.name.trim()) {
    showToast("请先填写环境名称", "warning");
    return;
  }

  await upsertEnvironment(selectedProjectId.value, environmentDraft.value);
  await refreshProjectEnvironments(selectedProjectId.value);
  selectedEnvironmentName.value = environmentDraft.value.name;
  const currentProject = projects.value.find((project) => project.id === selectedProjectId.value) ?? null;

  if (currentProject) {
    const nextProject: ProjectRecord = {
      ...currentProject,
      defaultDeployServerIdByEnv: {
        ...(currentProject.defaultDeployServerIdByEnv ?? {}),
        [environmentDraft.value.name]: environmentDraft.value.serverId,
      },
    };

    projects.value = await updateProjectConfig(nextProject);
    latestScannedProject.value = projects.value.find((project) => project.id === selectedProjectId.value) ?? nextProject;
    projectDraft.value = latestScannedProject.value ? { ...latestScannedProject.value } : null;
  }

  appStore.setBannerMessage(`已保存 ${environmentDraft.value.name} 环境配置`);
  showToast(`${environmentDraft.value.name} 环境配置已保存`, "success");
  isEnvironmentEditorVisible.value = false;
  await refreshProjectEnvironmentMap();

  if (executionDraft.value) {
    executionDraft.value = {
      ...executionDraft.value,
      environmentName: environmentDraft.value.name,
    };
  }
}

async function handleDeleteEnvironment() {
  if (!selectedProjectId.value || !environmentDraft.value?.name) {
    return;
  }

  const environmentName = environmentDraft.value.name;
  await deleteEnvironment(selectedProjectId.value, environmentName);
  await refreshProjectEnvironments(selectedProjectId.value);

  isEnvironmentEditorVisible.value = false;
  selectedEnvironmentName.value = null;
  environmentDraft.value = null;

  if (executionDraft.value?.environmentName === environmentName) {
    const fallbackName = projectEnvironments.value[0]?.name ?? PRESET_ENVIRONMENTS[0];
    executionDraft.value = {
      ...executionDraft.value,
      environmentName: fallbackName,
    };
    await syncEnvironmentByName(fallbackName);
  }

  appStore.setBannerMessage(`已删除环境：${environmentName}`);
  showToast("环境已删除", "success");
  await refreshProjectEnvironmentMap();
}

function handleConfirmDeleteEnvironment() {
  if (!environmentDraft.value?.name) {
    return;
  }

  const environmentName = environmentDraft.value.name;
  confirm.require({
    message: `删除后将移除环境配置 “${environmentName}”。这个操作不会删除服务器记录。`,
    header: "确认删除环境",
    icon: TriangleAlert,
    rejectLabel: "取消",
    acceptLabel: "删除",
    acceptClass: "p-button-danger",
    accept: () => {
      void handleDeleteEnvironment();
    },
  });
}

function handleConfirmDeleteEnvironmentByName(name: string) {
  confirm.require({
    message: `删除后将移除环境配置 “${name}”。这个操作不会删除服务器记录。`,
    header: "确认删除环境",
    icon: TriangleAlert,
    rejectLabel: "取消",
    acceptLabel: "删除",
    acceptClass: "p-button-danger",
    accept: () => {
      selectedEnvironmentName.value = name;
      environmentDraft.value = createEnvironmentRecordDraft(name);
      void handleDeleteEnvironment();
    },
  });
}

function handleConfirmDeleteServerById(serverId: string) {
  const targetServer = servers.value.find((server) => server.id === serverId);

  if (!targetServer) {
    return;
  }

  confirm.require({
    message: `删除后将移除服务器 “${targetServer.name}” 的保存记录。这个操作不会删除真实服务器。`,
    header: "确认删除服务器",
    icon: TriangleAlert,
    rejectLabel: "取消",
    acceptLabel: "删除",
    acceptClass: "p-button-danger",
    accept: () => {
      selectedServerId.value = serverId;
      serverDraft.value = toServerDraft(targetServer);
      void handleDeleteServer();
    },
  });
}

async function handleSaveServer() {
  if (!serverDraft.value.name.trim() || !serverDraft.value.host.trim() || !serverDraft.value.username.trim()) {
    showToast("请先填写完整的服务器名称、主机和用户名", "warning");
    return;
  }

  if (serverDraft.value.authType === "password" && !serverDraft.value.password.trim()) {
    showToast("瀵嗙爜璁よ瘉妯″紡涓嬪繀椤诲～鍐欐湇鍔″櫒瀵嗙爜", "warning");
    return;
  }

  if (serverDraft.value.authType === "privateKey" && !serverDraft.value.privateKeyPath.trim()) {
    showToast("私钥认证模式下必须填写私钥路径", "warning");
    return;
  }

  const isEditingServer = Boolean(selectedServerId.value);
  const savedServer = await upsertServer(serverDraft.value, selectedServerId.value);

  await refreshServers(isEditingServer ? savedServer.id : null);
  selectedServerId.value = null;
  serverDraft.value = createEmptyServerDraft();
  isCreatingServer.value = false;

  if (environmentDraft.value && !environmentDraft.value.serverId) {
    environmentDraft.value = {
      ...environmentDraft.value,
      serverId: savedServer.id,
    };
  }

  if (selectedProjectId.value) {
    await refreshProjectEnvironments(selectedProjectId.value);
  }

  appStore.setBannerMessage(`已保存服务器：${savedServer.name}`);
  showToast(`服务器 ${savedServer.name} 已保存`, "success");
}

function handleCreateServer() {
  isCreatingServer.value = true;
  selectedServerId.value = null;
  serverDraft.value = createEmptyServerDraft();
  appStore.setBannerMessage("已切换到新建服务器模式");
}

function handleCloseCreateServer() {
  isCreatingServer.value = false;
  selectedServerId.value = null;
  serverDraft.value = createEmptyServerDraft();
  appStore.setBannerMessage("宸插叧闂柊澧炴湇鍔″櫒闈㈡澘");
}

function handleSelectServer(serverId: string) {
  const matchedServer = servers.value.find((server) => server.id === serverId);

  if (!matchedServer) {
    return;
  }

  isCreatingServer.value = true;
  selectedServerId.value = serverId;
  serverDraft.value = toServerDraft(matchedServer);
  appStore.setBannerMessage(`已载入服务器：${matchedServer.name}`);
}

async function handleDeleteServer() {
  if (!selectedServerId.value) {
    return;
  }

  const currentServer = servers.value.find((server) => server.id === selectedServerId.value) ?? null;
  servers.value = await deleteServer(selectedServerId.value);
  isCreatingServer.value = false;
  selectedServerId.value = null;
  serverDraft.value = createEmptyServerDraft();

  if (selectedProjectId.value) {
    await refreshProjectEnvironments(selectedProjectId.value);
  }

  appStore.setBannerMessage(`已删除服务器：${currentServer?.name ?? ""}`);
  showToast(`服务器 ${currentServer?.name ?? ""} 已删除`, "success");
}

async function handleCheckServer() {
  if (!serverDraft.value.host.trim() || !serverDraft.value.username.trim()) {
    showToast("请先填写服务器主机、用户名和认证信息", "warning");
    return;
  }

  if (serverDraft.value.authType === "password" && !serverDraft.value.password.trim()) {
    showToast("瀵嗙爜璁よ瘉妯″紡涓嬪繀椤诲～鍐欐湇鍔″櫒瀵嗙爜", "warning");
    return;
  }

  if (serverDraft.value.authType === "privateKey" && !serverDraft.value.privateKeyPath.trim()) {
    showToast("私钥认证模式下必须填写私钥路径", "warning");
    return;
  }

  pushGatewayLog("info", `开始测试服务器连接：${serverDraft.value.host}:${serverDraft.value.port}`);

  try {
    const result = await runServerConnectionCheck({
      authType: serverDraft.value.authType,
      host: serverDraft.value.host,
      password: serverDraft.value.password,
      port: serverDraft.value.port,
      privateKeyPath: serverDraft.value.privateKeyPath,
      username: serverDraft.value.username,
    });

    result.steps.forEach((step) => pushGatewayLog("info", step));
    pushGatewayLog("success", "服务器连接检测通过");
    appStore.setBannerMessage("服务器连接检测通过");
    showToast("服务器连接检测通过", "success");
  } catch (error) {
    const message = getErrorMessage(error, "服务器连接检测失败");
    pushGatewayLog("error", message);
    appStore.setBannerMessage(message);
    showToast(message, "error");
  }
}

async function handleCheckEnvironment() {
  if (!environmentDraft.value) {
    showToast("请先选择一个项目环境", "warning");
    return;
  }

  if (!environmentDraft.value.serverId) {
    showToast("请先为当前环境绑定服务器", "warning");
    return;
  }

  if (!environmentDraft.value.remotePath.trim()) {
    showToast("请先填写远端部署目录", "warning");
    return;
  }

  const server = servers.value.find((item) => item.id === environmentDraft.value?.serverId) ?? null;

  if (!server) {
    showToast("当前环境绑定的服务器不存在，请重新选择", "error");
    return;
  }

  pushGatewayLog("info", `开始检测环境 ${environmentDraft.value.name} 的远端目录权限`);

  try {
    const result = await runServerConnectionCheck({
      authType: server.authType,
      host: server.host,
      password: server.password,
      port: server.port,
      privateKeyPath: server.privateKeyPath,
      remotePath: environmentDraft.value.remotePath,
      username: server.username,
    });

    result.steps.forEach((step) => pushGatewayLog("info", step));
    pushGatewayLog("success", `环境 ${environmentDraft.value.name} 连接与目录检测通过`);
    appStore.setBannerMessage(`环境 ${environmentDraft.value.name} 检测通过`);
    showToast(`环境 ${environmentDraft.value.name} 检测通过`, "success");
  } catch (error) {
    const message = getErrorMessage(error, "环境连接检测失败");
    pushGatewayLog("error", message);
    appStore.setBannerMessage(message);
    showToast(message, "error");
  }
}

async function handleRunExecution() {
  if (!latestScannedProject.value || !executionDraft.value) {
    return;
  }

  const mode = executionDraft.value.mode;
  const startedAt = new Date().toISOString();
  const logStartCount = gatewayLogs.value.length;
  let buildOutputPath = `${latestScannedProject.value.localPath}/${executionDraft.value.overrideOutputDir}`;
  let historySummary = "";
  let historyErrorMessage = "";
  let historyServerName = "";
  let historyServerHost = "";
  let historyRemotePath = "";

  if (mode === "deploy" || mode === "build-and-deploy") {
    const validation = validateDeployContext();

    if (!validation.ok) {
      executionStatus.value = "error";
      executionStatusMessage.value = validation.message;
      pushGatewayLog("error", validation.message);
      showToast(validation.message, "warning");
      return;
    }
  }

  executionStatus.value = "running";
  executionStatusMessage.value =
    mode === "build" ? "正在执行本地打包任务..." : mode === "deploy" ? "正在执行远端部署任务..." : "正在执行打包与部署任务...";

  const summary = [
    `模式=${executionDraft.value.mode}`,
    `环境=${executionDraft.value.environmentName}`,
    `命令=${executionDraft.value.overrideBuildCommand}`,
    `输出目录=${executionDraft.value.overrideOutputDir}`,
    `前置校验=${executionDraft.value.runPrecheck ? "开启" : "关闭"}`,
  ].join(" | ");

  pushGatewayLog("info", `已创建执行任务：${summary}`);

  try {
    if (mode === "build" || mode === "build-and-deploy") {
      const result = await runLocalBuild({
        projectPath: latestScannedProject.value.localPath,
        buildCommand: executionDraft.value.overrideBuildCommand,
        outputDir: executionDraft.value.overrideOutputDir,
        precheckCommand: latestScannedProject.value.defaultPrecheckCommand,
        runPrecheck: executionDraft.value.runPrecheck,
      });

      if (result.precheckRan) {
        pushGatewayLog(result.precheckSuccess ? "success" : "error", result.precheckSuccess ? "前置校验执行成功" : "前置校验执行失败");

        if (result.precheckOutput.trim()) {
          pushGatewayLog(result.precheckSuccess ? "info" : "error", result.precheckOutput.trim());
        }
      }

      if (!result.success) {
        executionStatus.value = "error";
        executionStatusMessage.value = "打包执行失败，请查看任务日志。";
        pushGatewayLog("error", "本地打包执行失败");
        if (result.buildOutput.trim()) {
          pushGatewayLog("error", result.buildOutput.trim());
        }
        appStore.setBannerMessage("本地打包执行失败");
        showToast("本地打包执行失败", "error");
        throw new Error(result.buildOutput.trim() || "本地打包执行失败");
      }

      buildOutputPath = result.outputPath;
      pushGatewayLog("success", `本地打包完成：${result.outputPath}`);
      if (result.buildOutput.trim()) {
        pushGatewayLog("info", result.buildOutput.trim());
      }
    }

    if (mode === "deploy" || mode === "build-and-deploy") {
      const validation = validateDeployContext();

      if (!validation.ok) {
        throw new Error(validation.message);
      }

      executionStatusMessage.value = mode === "deploy" ? "正在执行远端部署..." : "本地打包完成，正在执行远端部署...";

      const deployContext = {
        environmentName: executionDraft.value.environmentName,
        outputPath: buildOutputPath,
        postDeployCommand: validation.environmentConfig.postDeployCommand,
        projectName: latestScannedProject.value.name,
        remotePath: validation.environmentConfig.remotePath,
        server: validation.server,
        uploadStrategy: validation.environmentConfig.uploadStrategy,
      };

      historyServerName = deployContext.server.name;
      historyServerHost = `${deployContext.server.host}:${deployContext.server.port}`;
      historyRemotePath = deployContext.remotePath;

      pushGatewayLog("info", `开始连接服务器：${deployContext.server.host}:${deployContext.server.port}`);
      pushGatewayLog("info", `认证方式：${deployContext.server.authType === "password" ? "密码认证" : "私钥认证"}`);
      pushGatewayLog("info", `目标远端目录：${deployContext.remotePath}`);
      pushGatewayLog("info", "部署任务已提交到桌面端后台线程执行，界面保持可操作。");

      const deployResult = await runLocalDeploy(deployContext);

      if (!deployResult.success) {
        throw new Error(deployResult.errorMessage || deployResult.commandOutput || "远端部署执行失败");
      }

      deployResult.steps.forEach((step) => pushGatewayLog("info", step));
      if (deployResult.commandOutput.trim()) {
        pushGatewayLog("info", deployResult.commandOutput.trim());
      }
      pushGatewayLog("success", "远端部署执行完成");
    }

    historySummary =
      mode === "build"
        ? `本地打包成功，产物目录 ${executionDraft.value.overrideOutputDir}`
        : mode === "deploy"
          ? `远端部署成功，已发布到 ${executionDraft.value.environmentName} 环境`
          : `打包并部署成功，已发布到 ${executionDraft.value.environmentName} 环境`;

    executionStatus.value = "success";
    executionStatusMessage.value =
      mode === "build"
        ? `打包完成，产物目录：${buildOutputPath}`
        : mode === "deploy"
          ? "远端部署执行完成"
          : `打包与部署完成，产物目录：${buildOutputPath}`;

    appStore.setBannerMessage(mode === "build" ? "本地打包执行成功" : mode === "deploy" ? "远端部署执行成功" : "打包与部署执行成功");
    showToast(mode === "build" ? "本地打包执行成功" : mode === "deploy" ? "远端部署执行成功" : "打包与部署执行成功", "success");
  } catch (error) {
    const message = getErrorMessage(error, mode === "build" ? "鎵ц鏈湴鎵撳寘澶辫触" : "鎵ц閮ㄧ讲浠诲姟澶辫触");
    historySummary =
      mode === "build"
        ? "本地打包失败"
        : mode === "deploy"
          ? `远端部署失败，目标环境 ${executionDraft.value.environmentName}`
          : `打包并部署失败，目标环境 ${executionDraft.value.environmentName}`;
    historyErrorMessage = message;
    executionStatus.value = "error";
    executionStatusMessage.value = message;
    pushGatewayLog("error", message);
    appStore.setBannerMessage(message);
    showToast(message, "error");
  } finally {
    const finishedAt = new Date().toISOString();
    const newLogs = gatewayLogs.value
      .slice(0, Math.max(gatewayLogs.value.length - logStartCount, 0))
      .map((entry) => `[${entry.timestamp.slice(11, 19)}] ${entry.message}`)
      .reverse();

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
    };

    await appendTaskHistory(historyRecord);
    await refreshTaskHistory(latestScannedProject.value.id);
  }
}

async function persistGatewayConfig() {
  isSavingGatewayConfig.value = true;

  try {
    await saveGatewayConfig({
      authMode: gatewayAuthMode.value,
      source: gatewayConfigSource.value,
      token: gatewayToken.value,
      url: gatewayUrl.value,
    });
    pushGatewayLog("success", "已保存网关连接配置");
    appStore.setBannerMessage("已保存网关连接配置");
    showToast("网关配置已保存", "success");
  } catch (error) {
    const message = getErrorMessage(error, "淇濆瓨缃戝叧杩炴帴閰嶇疆澶辫触");
    pushGatewayLog("error", message);
    appStore.setBannerMessage("淇濆瓨缃戝叧杩炴帴閰嶇疆澶辫触");
    showToast("淇濆瓨缃戝叧閰嶇疆澶辫触", "error");
  } finally {
    isSavingGatewayConfig.value = false;
  }
}

async function persistGatewayConfigSilently() {
  await saveGatewayConfig({
    authMode: gatewayAuthMode.value,
    source: gatewayConfigSource.value,
    token: gatewayToken.value,
    url: gatewayUrl.value,
  });
}

function clearReconnectState() {
  if (reconnectTimer !== null) {
    window.clearTimeout(reconnectTimer);
    reconnectTimer = null;
  }

  if (reconnectInterval !== null) {
    window.clearInterval(reconnectInterval);
    reconnectInterval = null;
  }

  reconnectCountdown.value = null;
}

function scheduleGatewayReconnect() {
  if (!shouldReconnectGateway) {
    return;
  }

  clearReconnectState();
  reconnectAttempts += 1;

  const delaySeconds = Math.min(3 + reconnectAttempts * 2, 12);
  reconnectCountdown.value = delaySeconds;
  gatewayStage.value = "等待重连";
  pushGatewayLog("warn", `${delaySeconds} 秒后自动重连网关`);
  appStore.setBannerMessage(`网关连接已断开，${delaySeconds} 秒后自动重连`);

  reconnectInterval = window.setInterval(() => {
    if (reconnectCountdown.value === null) {
      return;
    }

    if (reconnectCountdown.value <= 1) {
      reconnectCountdown.value = 0;
      return;
    }

    reconnectCountdown.value -= 1;
  }, 1000);

  reconnectTimer = window.setTimeout(() => {
    clearReconnectState();
    void connectGateway("reconnect");
  }, delaySeconds * 1000);
}

async function probeGatewayConnection() {
  const url = gatewayUrl.value.trim();

  if (!url) {
    gatewayProbeStatus.value = "error";
    gatewayProbeSummary.value = "请先填写网关地址，再执行检测。";
    pushGatewayLog("error", gatewayProbeSummary.value);
    appStore.setBannerMessage("璇峰厛濉啓缃戝叧鍦板潃");
    return;
  }

  isProbingGateway.value = true;
  gatewayProbeStatus.value = "idle";
  gatewayProbeSummary.value = "";
  gatewayStage.value = "检测网关";
  pushGatewayLog("info", `开始检测网关地址：${url}`);

  try {
    const result = await probeGateway(url);

    if (result.status === "challenge") {
      gatewayProbeStatus.value = "success";
      gatewayStage.value = "检测通过";
      gatewayProbeSummary.value = result.message;
      pushGatewayLog("success", result.message);
      appStore.setBannerMessage("网关检测通过，可以继续填写 Token 并连接");
      return;
    }

    if (result.status === "open" || result.status === "closed") {
      gatewayProbeStatus.value = "warn";
      gatewayStage.value = "检测异常";
      gatewayProbeSummary.value = result.message;
      pushGatewayLog("warn", result.message);
      appStore.setBannerMessage("网关可达，但返回结果不符合预期");
      return;
    }

    gatewayProbeStatus.value = "error";
    gatewayStage.value = "检测失败";
    gatewayProbeSummary.value = result.message;
    pushGatewayLog("error", result.message);
    appStore.setBannerMessage("网关检测失败");
  } catch (error) {
    const message = getErrorMessage(error, "网关检测失败");
    gatewayProbeStatus.value = "error";
    gatewayStage.value = "检测失败";
    gatewayProbeSummary.value = message;
    pushGatewayLog("error", message);
    appStore.setBannerMessage("网关检测失败");
  } finally {
    isProbingGateway.value = false;
  }
}

async function handleImportLocalGatewayConfig() {
  isImportingLocalConfig.value = true;

  try {
    const config = await loadLocalOpenClawGatewayConfig();
    gatewayAuthMode.value = "token";
    gatewayConfigSource.value = "local-openclaw";
    gatewayUrl.value = config.url;
    gatewayToken.value = config.token;
    openResponsesEnabled.value = config.openResponsesEnabled;
    await persistGatewayConfigSilently();
    pushGatewayLog("success", `已导入本机 OpenClaw 配置：${config.sourcePath}`);
    if (!config.openResponsesEnabled) {
      pushGatewayLog("warn", "当前 OpenClaw 配置未启用 OpenResponses，AI 判断按钮会返回 404。");
    }
    appStore.setBannerMessage("已导入本机 OpenClaw 网关配置");
    showToast("已导入本机 OpenClaw 配置", "success");
  } catch (error) {
    const message = getErrorMessage(error, "导入本机 OpenClaw 配置失败");
    pushGatewayLog("error", message);
    appStore.setBannerMessage("导入本机 OpenClaw 配置失败");
    showToast("导入本机 OpenClaw 配置失败", "error");
  } finally {
    isImportingLocalConfig.value = false;
  }
}

function handleGatewayMessage(message: GatewayMessage | string) {
  if (typeof message === "string") {
    pushGatewayLog("info", message);
    return;
  }

  const summary = summarizeGatewayMessage(message);

  if (!summary) {
    return;
  }

  gatewayStage.value = typeof message.type === "string" && message.type !== "event" ? message.type : gatewayStage.value;
  pushGatewayLog(summary.level, summary.text);
}

async function connectGateway(trigger: GatewayConnectTrigger = "manual") {
  const url = gatewayUrl.value.trim();
  const token = gatewayToken.value.trim();

  if (!url) {
    if (trigger === "manual") {
      pushGatewayLog("error", "网关地址不能为空");
      appStore.setBannerMessage("请先填写网关地址");
    }
    return;
  }

  if (!token) {
    if (trigger === "manual") {
      pushGatewayLog("error", "当前网关鉴权模式为 token，必须先填写 Gateway Token");
      appStore.setBannerMessage("请先填写 Gateway Token");
    }
    return;
  }

  if (trigger === "manual" && gatewayConfigSource.value !== "local-openclaw") {
    gatewayConfigSource.value = "manual";
  }

  await persistGatewayConfigSilently();
  clearReconnectState();
  manualDisconnectRequested = false;
  shouldReconnectGateway = true;
  appStore.setConnectionStatus("connecting");
  gatewayStage.value = "建立连接";

  if (trigger === "manual") {
    pushGatewayLog("info", `尝试连接 ${url}`);
  } else if (trigger === "startup") {
    pushGatewayLog("info", `检测到已保存的网关配置，自动连接 ${url}`);
  } else {
    pushGatewayLog("info", `开始第 ${reconnectAttempts} 次自动重连：${url}`);
  }

  gatewayClient?.disconnect();
  gatewayClient = new GatewayClient(url, {
    token,
    onOpen: () => {
      gatewayStage.value = "等待握手";
      pushGatewayLog("info", "WebSocket 已连接，等待 OpenClaw challenge");
      appStore.setBannerMessage("WebSocket 已连接，正在进行网关握手");
    },
    onClose: (event) => {
      appStore.setConnectionStatus("disconnected");
      gatewayStage.value = "连接关闭";
      pushGatewayLog("warn", `杩炴帴宸插叧闂紝code=${event.code}${event.reason ? `, reason=${event.reason}` : ""}`);

      if (!manualDisconnectRequested) {
        scheduleGatewayReconnect();
      }
    },
    onError: () => {
      appStore.setConnectionStatus("disconnected");
      gatewayStage.value = "连接异常";
      pushGatewayLog("error", "连接 OpenClaw 网关失败");
      appStore.setBannerMessage("OpenClaw 网关连接失败");
    },
    onLog: (message) => {
      pushGatewayLog("info", message);
    },
    onMessage: handleGatewayMessage,
    onAuthenticated: () => {
      clearReconnectState();
      reconnectAttempts = 0;
      appStore.setConnectionStatus("connected");
      gatewayStage.value = "握手完成";
      pushGatewayLog("success", "OpenClaw connect 握手完成");
      appStore.setBannerMessage("OpenClaw 网关已认证连接");
    },
  });
  gatewayClient.connect();
}

function disconnectGateway() {
  manualDisconnectRequested = true;
  shouldReconnectGateway = false;
  clearReconnectState();
  gatewayClient?.disconnect();
  gatewayClient = null;
  appStore.setConnectionStatus("disconnected");
  gatewayStage.value = "手动断开";
  pushGatewayLog("warn", "已手动断开 OpenClaw 网关连接");
}

function sendGatewayPing() {
  try {
    gatewayClient?.send({
      type: "ping",
      source: "claw-deploy",
      timestamp: new Date().toISOString(),
    });
    pushGatewayLog("info", "已发送测试消息 ping");
  } catch (error) {
    pushGatewayLog("error", getErrorMessage(error, "发送测试消息失败"));
  }
}

onMounted(() => {
  void refreshProjects();
  void refreshServers();
  pushGatewayLog("info", "网关日志面板已就绪");
  syncProjectInsightHeight();

  projectOverviewResizeObserver = new ResizeObserver(() => {
    syncProjectInsightHeight();
  });

  const overviewElement = projectOverviewCardRef.value?.overviewCardRef ?? null;
  if (overviewElement) {
    projectOverviewResizeObserver.observe(overviewElement);
  }

  void loadGatewayConfig()
    .then((config) => {
      gatewayAuthMode.value = config.authMode;
      gatewayConfigSource.value = config.source;
      gatewayToken.value = config.token;
      gatewayUrl.value = config.url;
      openResponsesEnabled.value = false;
      pushGatewayLog("info", "已加载应用本地网关连接配置");

      if (config.url.trim() && config.token.trim()) {
        void connectGateway("startup");
      }
    })
    .catch((error) => {
      pushGatewayLog("warn", getErrorMessage(error, "璇诲彇鏈湴缃戝叧閰嶇疆澶辫触"));
    });
});

onBeforeUnmount(() => {
  clearReconnectState();
  gatewayClient?.disconnect();
  projectOverviewResizeObserver?.disconnect();
  projectOverviewResizeObserver = null;
});

watch(
  () => executionDraft.value?.environmentName,
  (environmentName, previousName) => {
    if (!environmentName || environmentName === previousName || !selectedProjectId.value) {
      return;
    }

    void syncEnvironmentByName(environmentName);
  },
);

watch(
  () => [selectedProjectId.value, latestScannedProject.value?.id, latestScannedProject.value?.updatedAt],
  () => {
    requestAnimationFrame(() => {
      projectOverviewResizeObserver?.disconnect();
      const overviewElement = projectOverviewCardRef.value?.overviewCardRef ?? null;

      if (overviewElement) {
        projectOverviewResizeObserver?.observe(overviewElement);
      }

      syncProjectInsightHeight();
    });
  },
);
</script>

<style scoped>
.project-toolbar {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  padding-bottom: 6px;
}

.project-list-page {
  display: grid;
  gap: 14px;
  grid-column: 1 / -1;
}

.project-card-list {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(360px, 420px));
  gap: 16px;
  align-items: start;
  justify-content: start;
}

.project-icon-image {
  width: 22px;
  height: 22px;
  object-fit: contain;
}

.project-type-badge {
  margin: 0;
  display: inline-flex;
  align-items: center;
  justify-self: start;
  min-height: 22px;
  padding: 0 9px;
  border: 1px solid rgba(59, 130, 246, 0.2);
  border-radius: 999px;
  background: rgba(59, 130, 246, 0.11);
  color: #93c5fd;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.04em;
  line-height: 1;
  text-transform: uppercase;
}

.quick-deploy-button {
  flex: 0 0 auto;
  color: #60a5fa;
  border: 1px solid transparent;
  background: transparent;
}

.quick-deploy-button:not(:disabled):hover {
  background: rgba(59, 130, 246, 0.12);
  border-color: rgba(59, 130, 246, 0.18);
  color: #bfdbfe;
}

.quick-deploy-button:disabled {
  color: rgba(100, 116, 139, 0.5);
  opacity: 1;
}

.delete-project-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex: 0 0 auto;
  width: 28px;
  height: 28px;
  padding: 0;
  border: 1px solid transparent;
  border-radius: 999px;
  background: transparent;
  color: #94a3b8;
  cursor: pointer;
  transition:
    background-color 150ms ease,
    border-color 150ms ease,
    color 150ms ease,
    transform 150ms ease;
}

.delete-project-button:hover {
  background: rgba(239, 68, 68, 0.1);
  border-color: rgba(239, 68, 68, 0.18);
  color: #fca5a5;
}

.delete-project-button:active {
  transform: scale(0.98);
}

.project-detail-workspace {
  display: grid;
  gap: 20px;
  min-width: 0;
  grid-column: 1 / -1;
}

.project-detail-stack {
  display: grid;
  gap: 20px;
}

.project-insight-row {
  display: grid;
  grid-template-columns: minmax(0, 1.35fr) minmax(320px, 0.75fr);
  gap: 20px;
  align-items: start;
}

.insight-panel {
  min-width: 0;
}

.project-script-card {
  min-height: 372px;
  overflow: hidden;
}

.panel-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 20px;
  min-width: 0;
}

.panel-card {
  display: flex;
  flex-direction: column;
  gap: 16px;
  min-width: 0;
  min-height: 240px;
  padding: 20px;
  border: 1px solid rgba(148, 163, 184, 0.14);
  border-radius: 8px;
  background: #141a28;
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.02),
    0 12px 24px rgba(2, 6, 23, 0.18);
}

:deep(.quick-deploy-menu) {
  min-width: 176px;
}

.quick-deploy-dialog-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  width: 100%;
}

.quick-deploy-dialog-header strong {
  display: block;
  color: #e2e8f0;
  font-size: 16px;
  line-height: 1.2;
}

.quick-deploy-dialog-header p {
  margin: 6px 0 0;
  color: #64748b;
  font-size: 12px;
  line-height: 1.5;
}

.quick-deploy-dialog-body {
  display: grid;
  gap: 14px;
}

.quick-deploy-summary-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}

.quick-deploy-summary-item,
.quick-deploy-path-card,
.quick-deploy-log-card {
  border: 1px solid rgba(148, 163, 184, 0.12);
  border-radius: 8px;
  background: #101722;
}

.quick-deploy-summary-item {
  display: grid;
  gap: 6px;
  padding: 14px 16px;
}

.quick-deploy-summary-item span,
.quick-deploy-path-card span,
.quick-deploy-log-card header span,
.quick-deploy-log-card header small {
  color: #64748b;
  font-size: 11px;
}

.quick-deploy-summary-item strong,
.quick-deploy-path-card code {
  color: #e2e8f0;
  font-size: 13px;
  line-height: 1.5;
  word-break: break-all;
}

.quick-deploy-path-card {
  display: grid;
  gap: 8px;
  padding: 14px 16px;
}

.quick-deploy-path-card code {
  padding: 0;
  background: transparent;
}

.quick-deploy-log-card {
  display: grid;
  gap: 10px;
  padding: 14px 16px;
}

.quick-deploy-log-card header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.quick-deploy-log-stream {
  max-height: 220px;
  overflow: auto;
  padding-right: 4px;
}

.quick-deploy-log-stream p {
  margin: 0;
  color: #cbd5e1;
  font-size: 12px;
  line-height: 1.55;
  white-space: pre-wrap;
  word-break: break-word;
}

.quick-deploy-dialog-footer {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 10px;
  width: 100%;
}

.panel-card h3 {
  margin: 0;
  color: #e2e8f0;
  font-size: 17px;
  line-height: 1.25;
  letter-spacing: -0.01em;
}

.field {
  display: grid;
  gap: 8px;
}

.field span {
  color: #cbd5e1;
  font-size: 12px;
  font-weight: 700;
}

.card-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}

.card-head span {
  color: #64748b;
  font-size: 12px;
}

.section-note {
  margin: 8px 0 0;
  color: #8b9bb3;
  font-size: 12px;
  line-height: 1.6;
}

.task-list {
  display: grid;
  gap: 12px;
  margin: 0;
  padding: 0;
  list-style: none;
  color: #cbd5e1;
}

.task-item {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  flex-wrap: wrap;
  min-width: 0;
}

.task-item code {
  padding: 6px 10px;
  border-radius: 8px;
  background: #101722;
  color: #dbeafe;
  font-family: "SFMono-Regular", "Menlo", monospace;
  font-size: 11px;
  overflow-wrap: anywhere;
  word-break: break-word;
}

.script-list {
  flex: 1;
  min-height: 0;
  overflow: auto;
  gap: 10px;
  padding-right: 4px;
}

.script-item {
  display: grid;
  grid-template-columns: 112px minmax(0, 1fr);
  align-items: start;
  gap: 10px 12px;
}

.script-name {
  display: inline-flex;
  align-items: center;
  min-height: 32px;
  padding: 0 10px;
  border-radius: 999px;
  background: rgba(59, 130, 246, 0.12);
  color: #93c5fd;
  font-size: 11px;
  font-weight: 700;
  line-height: 1;
}

.script-item code {
  flex: 1;
  display: block;
  min-width: 0;
  color: #dbe7ff;
  font-size: 13px;
  line-height: 1.65;
  white-space: normal;
  word-break: break-word;
}

.log-card {
  grid-column: 1 / -1;
  min-width: 0;
}

.log-stream {
  display: grid;
  gap: 10px;
  padding: 16px;
  border-radius: 8px;
  background: #101722;
  color: #d8ebe4;
  font-family: "SFMono-Regular", "Menlo", monospace;
  font-size: 12px;
  min-width: 0;
  overflow-x: hidden;
}

.log-stream p {
  margin: 0;
  min-width: 0;
  white-space: pre-wrap;
  overflow-wrap: anywhere;
  word-break: break-word;
  line-height: 1.55;
}

.log-stream p[data-level="success"] {
  color: #b5efca;
}

.log-stream p[data-level="warn"] {
  color: #f3d382;
}

.log-stream p[data-level="error"] {
  color: #ffb0a2;
}

.muted {
  color: #64748b;
}

.muted-paragraph {
  margin: 0;
  color: #64748b;
}

.project-empty-shell {
  display: grid;
  gap: 22px;
  grid-column: 1 / -1;
}

.project-empty-hero {
  position: relative;
  overflow: hidden;
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: 0;
  align-items: stretch;
  min-height: 420px;
  padding: 34px 34px 32px;
  border: 1px solid rgba(148, 163, 184, 0.14);
  border-radius: 14px;
  background:
    radial-gradient(circle at top left, rgba(59, 130, 246, 0.14), transparent 34%),
    linear-gradient(90deg, rgba(15, 23, 42, 0.96) 0%, rgba(15, 23, 42, 0.9) 48%, rgba(15, 23, 42, 0.62) 72%, rgba(15, 23, 42, 0.28) 100%),
    linear-gradient(180deg, rgba(15, 23, 42, 0.94), rgba(15, 23, 42, 0.84));
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.03),
    0 20px 40px rgba(2, 6, 23, 0.22);
}

.project-empty-hero::after {
  content: "";
  position: absolute;
  right: -140px;
  bottom: -160px;
  width: 340px;
  height: 340px;
  border-radius: 999px;
  background: radial-gradient(circle, rgba(59, 130, 246, 0.14), transparent 70%);
  pointer-events: none;
}

.project-empty-copy {
  position: relative;
  z-index: 1;
  display: grid;
  align-content: flex-start;
  gap: 26px;
  min-width: 0;
  max-width: 640px;
  padding-top: 10px;
}

.project-empty-copy-head {
  display: grid;
  gap: 12px;
}

.project-empty-eyebrow {
  color: #8fb4ff;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.18em;
  text-transform: uppercase;
}

.project-empty-divider {
  width: 44px;
  height: 1px;
  background: linear-gradient(90deg, rgba(96, 165, 250, 0.65), rgba(96, 165, 250, 0));
}

.project-empty-copy h2 {
  margin: 0;
  max-width: 560px;
  color: #f8fafc;
  font-size: 32px;
  line-height: 1.08;
  letter-spacing: -0.038em;
  text-wrap: balance;
}

.project-empty-copy p {
  margin: 0;
  max-width: 560px;
  color: #93a4bf;
  font-size: 15px;
  line-height: 1.95;
}

.project-empty-highlights {
  display: flex;
  flex-wrap: wrap;
  gap: 8px 10px;
  max-width: 540px;
  margin-top: -2px;
}

.project-empty-highlights span {
  display: inline-flex;
  align-items: center;
  min-height: 26px;
  padding: 0 10px;
  border: 1px solid rgba(148, 163, 184, 0.08);
  border-radius: 999px;
  background: rgba(15, 23, 42, 0.22);
  color: #9fb0c9;
  font-size: 11px;
  letter-spacing: 0.01em;
  line-height: 1;
}

.project-empty-actions {
  display: grid;
  gap: 14px;
  width: fit-content;
  padding-top: 18px;
}

.project-empty-actions :deep(.app-primary-button) {
  min-width: 272px;
  min-height: 44px;
  padding-inline: 20px;
  border-radius: 12px;
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.1),
    0 10px 26px rgba(37, 99, 235, 0.22);
}

.project-empty-actions :deep(.app-primary-button span) {
  font-weight: 700;
  letter-spacing: 0.01em;
}

.project-empty-tip {
  display: grid;
  gap: 3px;
  padding-left: 4px;
}

.project-empty-tip span {
  color: #e2e8f0;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.02em;
}

.project-empty-tip small {
  color: #708198;
  font-size: 11px;
  line-height: 1.6;
}

.project-empty-visual {
  position: relative;
  position: absolute;
  inset: 0;
  pointer-events: none;
  overflow: hidden;
}

.project-empty-visual-image {
  position: absolute;
  right: -60px;
  top: 50%;
  width: min(550px, 56vw);
  max-width: none;
  transform: translateY(-48%);
  opacity: 0.76;
  filter: drop-shadow(0 28px 60px rgba(2, 6, 23, 0.34));
  user-select: none;
}

.project-empty-guide {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 16px;
}

.project-empty-step {
  display: grid;
  gap: 10px;
  padding: 20px 18px 18px;
  border: 1px solid rgba(148, 163, 184, 0.12);
  border-radius: 12px;
  background: linear-gradient(180deg, rgba(30, 41, 59, 0.16), rgba(20, 26, 40, 0.96)), #141a28;
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.02),
    0 8px 20px rgba(2, 6, 23, 0.14);
  transition:
    border-color 0.2s ease,
    transform 0.2s ease,
    background 0.2s ease;
}

.project-empty-step::before {
  content: "";
  width: 28px;
  height: 2px;
  border-radius: 999px;
  background: linear-gradient(90deg, #60a5fa, rgba(96, 165, 250, 0));
}

.project-empty-step span {
  color: #60a5fa;
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.12em;
  text-transform: uppercase;
}

.project-empty-step strong {
  color: #f8fafc;
  font-size: 15px;
  line-height: 1.3;
}

.project-empty-step p {
  margin: 0;
  color: #8fa1bc;
  font-size: 13px;
  line-height: 1.7;
}

.project-empty-step:hover {
  border-color: rgba(96, 165, 250, 0.18);
  transform: translateY(-1px);
}

@media (max-width: 960px) {
  .panel-grid {
    grid-template-columns: 1fr;
  }

  .project-insight-row {
    grid-template-columns: 1fr;
  }

  .project-card-list {
    grid-template-columns: 1fr;
  }

  .project-empty-guide {
    grid-template-columns: 1fr;
  }

  .project-empty-hero {
    padding: 20px;
    min-height: 360px;
  }

  .project-empty-copy h2 {
    font-size: 26px;
  }

  .project-empty-copy {
    gap: 22px;
    max-width: 100%;
  }

  .project-empty-visual-image {
    right: -150px;
    width: min(620px, 78vw);
    opacity: 0.18;
  }
}

@media (max-width: 640px) {
  .project-empty-shell {
    gap: 16px;
  }

  .project-empty-hero {
    padding: 18px;
    min-height: 320px;
  }

  .project-empty-copy h2 {
    font-size: 22px;
  }

  .project-empty-highlights {
    gap: 8px;
  }

  .project-empty-actions :deep(.app-primary-button) {
    min-width: 240px;
  }

  .project-empty-copy {
    gap: 18px;
    max-width: 100%;
  }

  .project-empty-copy p,
  .project-empty-highlights {
    max-width: 100%;
  }

  .project-empty-visual-image {
    right: -160px;
    width: 520px;
    opacity: 0.14;
  }
}
</style>
