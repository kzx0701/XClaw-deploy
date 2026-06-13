<template>
  <section class="deployment-log-page">
    <WorkspaceToolbarPanel>
      <template #search>
        <div class="deployment-log-search-field">
          <Search class="deployment-log-search-icon" :size="16" />
          <InputText
            :model-value="filter.keyword"
            class="deployment-log-search-input"
            placeholder="搜索项目名 / 服务器..."
            @update:model-value="(v: any) => (filter.keyword = v ?? '')"
          />
        </div>
      </template>
    </WorkspaceToolbarPanel>

    <article class="deployment-log-table" aria-label="部署日志">
      <header class="deployment-log-head">
        <div class="deployment-log-cell deployment-log-date">
          <span>部署时间</span>
        </div>
        <div class="deployment-log-cell deployment-log-project">
          <span>部署项目</span>
          <Popover v-model:open="projectFilterOpen">
            <PopoverTrigger as-child>
              <button
                type="button"
                class="deployment-log-header-filter"
                :data-active="filter.projectId !== null"
                title="按项目筛选"
              >
                <Filter :size="12" />
              </button>
            </PopoverTrigger>
            <PopoverContent class="deployment-log-popover" align="start" :side-offset="4">
              <div class="deployment-log-popover-header">
                <span>选择项目</span>
              </div>
              <div class="deployment-log-popover-list">
                <button
                  type="button"
                  class="deployment-log-popover-item"
                  :data-active="filter.projectId === null"
                  @click="selectProject(null)"
                >
                  全部项目
                </button>
                <button
                  v-for="project in projects"
                  :key="project.id"
                  type="button"
                  class="deployment-log-popover-item"
                  :data-active="filter.projectId === project.id"
                  @click="selectProject(project.id)"
                >
                  {{ project.name }}
                </button>
              </div>
            </PopoverContent>
          </Popover>
        </div>
        <div class="deployment-log-cell deployment-log-mode">
          <span>部署方式</span>
        </div>
        <div class="deployment-log-cell deployment-log-environment">
          <span>部署环境</span>
          <Popover v-model:open="environmentFilterOpen">
            <PopoverTrigger as-child>
              <button
                type="button"
                class="deployment-log-header-filter"
                :data-active="filter.environmentName !== null"
                title="按环境筛选"
              >
                <Filter :size="12" />
              </button>
            </PopoverTrigger>
            <PopoverContent class="deployment-log-popover" align="start" :side-offset="4">
              <div class="deployment-log-popover-header">
                <span>选择环境</span>
              </div>
              <div class="deployment-log-popover-list">
                <button
                  type="button"
                  class="deployment-log-popover-item"
                  :data-active="filter.environmentName === null"
                  @click="selectEnvironment(null)"
                >
                  全部环境
                </button>
                <button
                  type="button"
                  class="deployment-log-popover-item"
                  :data-active="filter.environmentName === 'dev'"
                  @click="selectEnvironment('dev')"
                >
                  开发环境
                </button>
                <button
                  type="button"
                  class="deployment-log-popover-item"
                  :data-active="filter.environmentName === 'test'"
                  @click="selectEnvironment('test')"
                >
                  测试环境
                </button>
                <button
                  type="button"
                  class="deployment-log-popover-item"
                  :data-active="filter.environmentName === 'prod'"
                  @click="selectEnvironment('prod')"
                >
                  生产环境
                </button>
              </div>
            </PopoverContent>
          </Popover>
        </div>
        <div class="deployment-log-cell deployment-log-server">
          <span>部署服务器</span>
        </div>
        <div class="deployment-log-cell deployment-log-result">
          <span>部署结果</span>
          <Popover v-model:open="statusFilterOpen">
            <PopoverTrigger as-child>
              <button
                type="button"
                class="deployment-log-header-filter"
                :data-active="filter.status !== null"
                title="按状态筛选"
              >
                <Filter :size="12" />
              </button>
            </PopoverTrigger>
            <PopoverContent class="deployment-log-popover" align="start" :side-offset="4">
              <div class="deployment-log-popover-header">
                <span>选择状态</span>
              </div>
              <div class="deployment-log-popover-list">
                <button
                  type="button"
                  class="deployment-log-popover-item"
                  :data-active="filter.status === null"
                  @click="selectStatus(null)"
                >
                  全部状态
                </button>
                <button
                  type="button"
                  class="deployment-log-popover-item"
                  :data-active="filter.status === 'success'"
                  @click="selectStatus('success')"
                >
                  成功
                </button>
                <button
                  type="button"
                  class="deployment-log-popover-item"
                  :data-active="filter.status === 'error'"
                  @click="selectStatus('error')"
                >
                  失败
                </button>
              </div>
            </PopoverContent>
          </Popover>
        </div>
        <div class="deployment-log-action-head">操作</div>
      </header>

      <div v-if="filteredRecords.length > 0" class="deployment-log-body">
        <div v-for="record in filteredRecords" :key="record.id" class="deployment-log-row">
          <div class="deployment-log-cell deployment-log-date">
            <strong>{{ formatDate(record.finishedAt) }}</strong>
            <span>{{ formatFinishedMeta(record.finishedAt, record.durationMs) }}</span>
          </div>

          <div class="deployment-log-cell deployment-log-project">
            <strong>{{ record.projectName }}</strong>
          </div>

          <div class="deployment-log-cell deployment-log-mode">
            <span class="mode-chip" :data-mode="record.mode">{{ formatMode(record.mode) }}</span>
          </div>

          <div class="deployment-log-cell deployment-log-environment">
            <span class="environment-chip">{{ formatEnvironmentLabel(record.environmentName) }}</span>
          </div>

          <div class="deployment-log-cell deployment-log-server">
            <strong>{{ record.serverName || "未记录服务器" }}</strong>
            <span>{{ record.serverHost || record.remotePath || "无服务器信息" }}</span>
          </div>

          <div class="deployment-log-cell deployment-log-result">
            <span class="result-badge" :data-status="record.status">
              {{ record.status === "success" ? "成功" : "失败" }}
            </span>
          </div>

          <button
            type="button"
            class="deployment-log-delete"
            title="删除记录"
            aria-label="删除部署记录"
            @click="$emit('delete-record', record.id)"
          >
            <Trash2 class="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      </div>

      <div v-else-if="hasActiveFilter" class="deployment-log-empty">
        <Search class="h-5 w-5" aria-hidden="true" />
        <p>没有匹配的记录</p>
        <small>尝试调整筛选条件或重置筛选。</small>
      </div>

      <div v-else class="deployment-log-empty">
        <FileClock class="h-5 w-5" aria-hidden="true" />
        <p>暂无部署日志</p>
        <small>完成部署任务后，所有项目的部署记录会集中显示在这里。</small>
      </div>
    </article>
  </section>
</template>

<script setup lang="ts">
import { ref } from "vue"
import { FileClock, Filter, Search, Trash2 } from "lucide-vue-next"

import WorkspaceToolbarPanel from "@/components/workspace-header/WorkspaceToolbarPanel.vue"
import { Input as InputText } from "@/components/ui/input"
import Popover from "@/components/ui/popover/Popover.vue"
import PopoverContent from "@/components/ui/popover/PopoverContent.vue"
import PopoverTrigger from "@/components/ui/popover/PopoverTrigger.vue"
import type { ExecutionMode, ProjectRecord, TaskHistoryRecord, TaskHistoryStatus } from "@/types/task"
import { formatEnvironmentLabel } from "./formatters"
import type { DeployLogFilterState } from "./useDeployLogFilter"

defineProps<{
  records: TaskHistoryRecord[]
  projects: ProjectRecord[]
  filter: DeployLogFilterState
  filteredRecords: TaskHistoryRecord[]
  hasActiveFilter: boolean
}>()

const emit = defineEmits<{
  "delete-record": [recordId: string]
  "reset-filter": []
  "update:filter-project": [projectId: string | null]
  "update:filter-environment": [environmentName: string | null]
  "update:filter-status": [status: TaskHistoryStatus | null]
}>()

const projectFilterOpen = ref(false)
const environmentFilterOpen = ref(false)
const statusFilterOpen = ref(false)

function selectProject(projectId: string | null) {
  emit("update:filter-project", projectId)
  projectFilterOpen.value = false
}

function selectEnvironment(environmentName: string | null) {
  emit("update:filter-environment", environmentName)
  environmentFilterOpen.value = false
}

function selectStatus(status: TaskHistoryStatus | null) {
  emit("update:filter-status", status)
  statusFilterOpen.value = false
}

function formatDate(value: string) {
  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return value
  }

  return date.toLocaleDateString("zh-CN", {
    month: "short",
    day: "numeric",
    year: "numeric",
  })
}

function formatFinishedMeta(finishedAt: string, durationMs: number) {
  const finish = new Date(finishedAt)

  if (Number.isNaN(finish.getTime())) {
    return "--"
  }

  const formatter = new Intl.DateTimeFormat("zh-CN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  })

  return `${formatter.format(finish)} · 耗时 ${formatDuration(durationMs)}`
}

function formatDuration(durationMs: number) {
  if (!Number.isFinite(durationMs) || durationMs <= 0) {
    return "<1s"
  }

  if (durationMs < 1000) {
    return "<1s"
  }

  if (durationMs < 60_000) {
    return `${Math.round(durationMs / 1000)}s`
  }

  const minutes = Math.floor(durationMs / 60_000)
  const seconds = Math.round((durationMs % 60_000) / 1000)

  return seconds > 0 ? `${minutes}m ${seconds}s` : `${minutes}m`
}

function formatMode(mode: ExecutionMode) {
  if (mode === "deploy") {
    return "仅部署"
  }

  if (mode === "build-and-deploy") {
    return "打包 + 部署"
  }

  return "仅打包"
}
</script>

<style scoped>
.deployment-log-page {
  display: grid;
  align-content: start;
  min-width: 0;
}

.deployment-log-search-field {
  position: relative;
  width: 100%;
}

.deployment-log-search-icon {
  position: absolute;
  top: 50%;
  left: 14px;
  color: #646262;
  transform: translateY(-50%);
  pointer-events: none;
}

.deployment-log-search-input {
  padding-left: 38px !important;
}

.deployment-log-table {
  --deployment-log-grid: minmax(140px, 1.2fr) minmax(120px, 1fr) minmax(100px, 0.8fr) minmax(100px, 0.8fr) minmax(180px, 1.2fr) minmax(80px, 0.6fr) minmax(60px, 0.4fr);

  display: grid;
  min-width: 0;
  background: transparent;
}

.deployment-log-body {
  overflow: hidden;
  display: grid;
  border: 1px solid var(--border);
  border-radius: 4px;
  background: #fdfcfc;
}

.deployment-log-head,
.deployment-log-row {
  display: grid;
  grid-template-columns: var(--deployment-log-grid);
  align-items: center;
}

.deployment-log-head {
  min-height: 54px;
  background: transparent;
  color: #646262;
  font-size: 14px;
  font-weight: 600;
  letter-spacing: 0;
}

.deployment-log-head .deployment-log-cell {
  display: flex;
  align-items: center;
  gap: 6px;
}

.deployment-log-row {
  min-height: 60px;
  border-bottom: 1px solid var(--border);
  background: #fdfcfc;
  transition: background-color 140ms ease;
}

.deployment-log-row:last-child {
  border-bottom: 0;
}

.deployment-log-row:hover {
  background: #f8f7f7;
}

.deployment-log-cell {
  display: grid;
  gap: 5px;
  min-width: 0;
  padding: 0 18px;
}

.deployment-log-cell span {
  overflow: hidden;
  min-width: 0;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.deployment-log-cell strong {
  overflow: hidden;
  min-width: 0;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: #201d1d;
  font-size: 14px;
  font-weight: 700;
  line-height: 1.5;
}

.deployment-log-cell span {
  color: #646262;
  font-size: 14px;
  line-height: 1.5;
}

.deployment-log-action-head {
  min-width: 0;
  padding: 0 18px;
  text-align: center;
  white-space: nowrap;
  justify-self: center;
}

.deployment-log-mode,
.deployment-log-environment,
.deployment-log-result {
  padding-inline: 14px;
}

.deployment-log-result {
  justify-items: start;
}

.deployment-log-header-filter {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 18px;
  height: 18px;
  border: 1px solid transparent;
  border-radius: 3px;
  background: transparent;
  color: #a0a0a0;
  cursor: pointer;
  transition: all 100ms ease;
}

.deployment-log-header-filter:hover {
  background: #f1eeee;
  color: #201d1d;
  border-color: var(--border);
}

.deployment-log-header-filter[data-active="true"] {
  background: #201d1d;
  border-color: #201d1d;
  color: #fdfcfc;
}

.deployment-log-popover {
  width: 130px;
  padding: 2px;
  border: 1px solid var(--border);
  border-radius: 6px;
  background: #fdfcfc;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
}

.deployment-log-popover-header {
  padding: 4px 6px 2px;
  font-size: 12px;
  font-weight: 500;
  color: #a0a0a0;
  letter-spacing: 0;
}

.deployment-log-popover-list {
  display: flex;
  flex-direction: column;
  gap: 0;
}

.deployment-log-popover-item {
  display: block;
  width: 100%;
  padding: 6px 8px;
  border: none;
  border-radius: 3px;
  background: transparent;
  color: #201d1d;
  font-size: 13px;
  text-align: left;
  cursor: pointer;
  transition: background-color 80ms ease;
}

.deployment-log-popover-item:hover {
  background: #f1eeee;
}

.deployment-log-popover-item[data-active="true"] {
  background: #201d1d;
  color: #fdfcfc;
}

.environment-chip,
.mode-chip,
.result-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  justify-self: start;
  width: fit-content;
  min-height: 24px;
  padding: 0 9px;
  border: 1px solid var(--border);
  border-radius: 4px;
  font-size: var(--tag-font-size);
  line-height: var(--tag-line-height);
}

.environment-chip {
  background: var(--info-tint);
  color: #007aff !important;
  font-weight: 600;
}

.mode-chip {
  background: var(--neutral-tint);
  color: #424245 !important;
  font-weight: 600;
}

.result-badge {
  font-weight: 600;
}

.result-badge[data-status="success"] {
  background: var(--success-tint);
  color: var(--success-soft) !important;
}

.result-badge[data-status="error"] {
  background: var(--danger-tint);
  color: var(--danger-soft) !important;
}

.deployment-log-delete {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  justify-self: center;
  width: 30px;
  height: 30px;
  border: 1px solid transparent;
  border-radius: 4px;
  background: transparent;
  color: #d70015;
  cursor: pointer;
  transition:
    background-color 140ms ease,
    color 140ms ease;
}

.deployment-log-delete:hover {
  border-color: rgba(255, 59, 48, 0.22);
  background: var(--danger-tint);
  color: #a50011;
}

.deployment-log-delete:active {
  transform: none;
}

.deployment-log-empty {
  display: grid;
  justify-items: center;
  gap: 8px;
  padding: 72px 24px;
  color: #646262;
  text-align: center;
}

.deployment-log-empty p,
.deployment-log-empty small {
  margin: 0;
}

.deployment-log-empty p {
  color: #201d1d;
  font-size: 16px;
  font-weight: 700;
}

.deployment-log-empty small {
  max-width: 360px;
  line-height: 1.7;
}

@media (max-width: 1180px) {
  .deployment-log-cell {
    padding-inline: 14px;
  }

  .deployment-log-action-head,
  .deployment-log-mode,
  .deployment-log-environment,
  .deployment-log-result {
    padding-inline: 10px;
  }

  .deployment-log-table {
    --deployment-log-grid: minmax(120px, 1fr) minmax(100px, 0.8fr) minmax(80px, 0.6fr) minmax(80px, 0.6fr) minmax(150px, 1fr) minmax(70px, 0.5fr) minmax(50px, 0.3fr);
  }
}

@media (max-width: 860px) {
  .deployment-log-table {
    overflow-x: auto;
    --deployment-log-grid: minmax(140px, 1.2fr) minmax(120px, 1fr) minmax(100px, 0.8fr) minmax(100px, 0.8fr) minmax(180px, 1.2fr) minmax(80px, 0.6fr) minmax(60px, 0.4fr);
  }

  .deployment-log-head,
  .deployment-log-row {
    min-width: 980px;
  }
}
</style>
