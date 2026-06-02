<template>
  <article class="panel-card history-card">
    <header class="card-head">
      <div>
        <h3>任务历史</h3>
        <p>展示当前项目最近执行结果，便于回看成功记录和失败原因。</p>
      </div>
      <Badge variant="outline" class="rounded-full border-[rgba(148,163,184,0.18)] bg-transparent text-[#cbd5e1]">{{ records.length }} 条</Badge>
    </header>

    <div v-if="records.length > 0" class="history-layout">
      <div class="history-list">
        <button
          v-for="record in records"
          :key="record.id"
          type="button"
          class="history-item"
          :data-active="record.id === selectedRecordId"
          @click="$emit('select-record', record.id)"
        >
          <div class="history-top">
            <Badge
              :variant="resolveBadgeVariant(record.status === 'success' ? 'success' : 'danger')"
              :class="['rounded-full', resolveBadgeToneClass(record.status === 'success' ? 'success' : 'danger')]"
            >
              {{ record.status === 'success' ? '成功' : '失败' }}
            </Badge>
            <span>{{ formatMode(record.mode) }}</span>
          </div>
          <strong>{{ record.summary }}</strong>
          <small>{{ record.environmentName }} / {{ formatDate(record.finishedAt) }}</small>
        </button>
      </div>

      <div v-if="selectedRecord" class="history-detail">
        <div class="detail-grid">
          <div class="detail-item">
            <span>项目</span>
            <strong>{{ selectedRecord.projectName }}</strong>
          </div>
          <div class="detail-item">
            <span>环境</span>
            <strong>{{ selectedRecord.environmentName }}</strong>
          </div>
          <div class="detail-item">
            <span>模式</span>
            <strong>{{ formatMode(selectedRecord.mode) }}</strong>
          </div>
          <div class="detail-item">
            <span>耗时</span>
            <strong>{{ formatDuration(selectedRecord.durationMs) }}</strong>
          </div>
          <div class="detail-item">
            <span>打包命令</span>
            <strong>{{ selectedRecord.buildCommand || '无' }}</strong>
          </div>
          <div class="detail-item">
            <span>产物目录</span>
            <strong>{{ selectedRecord.outputDir || '无' }}</strong>
          </div>
          <div v-if="selectedRecord.serverName" class="detail-item">
            <span>目标服务器</span>
            <strong>{{ selectedRecord.serverName }} / {{ selectedRecord.serverHost }}</strong>
          </div>
          <div v-if="selectedRecord.remotePath" class="detail-item">
            <span>远端目录</span>
            <strong>{{ selectedRecord.remotePath }}</strong>
          </div>
          <div class="detail-item full-span">
            <span>结果摘要</span>
            <strong>{{ selectedRecord.summary }}</strong>
          </div>
          <div v-if="selectedRecord.errorMessage" class="detail-item full-span">
            <span>失败原因</span>
            <strong class="error-text">{{ selectedRecord.errorMessage }}</strong>
          </div>
        </div>

        <div class="log-preview">
          <header class="log-preview-head">
            <h4>执行记录</h4>
            <Badge
              :variant="resolveBadgeVariant('secondary')"
              :class="['rounded-full', resolveBadgeToneClass('secondary')]"
            >
              {{ selectedRecord.logs.length }} 行
            </Badge>
          </header>
          <div class="log-lines">
            <p v-for="(line, index) in selectedRecord.logs" :key="`${selectedRecord.id}-${index}`">
              {{ line }}
            </p>
          </div>
        </div>
      </div>
    </div>

    <p v-else class="muted-paragraph">当前项目还没有执行历史。完成一次打包或部署后，这里会自动记录结果。</p>
  </article>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import Badge from '@/components/ui/badge/Badge.vue'

import { resolveBadgeToneClass, resolveBadgeVariant } from '@/lib/ui-status'
import type { ExecutionMode, TaskHistoryRecord } from '@/types/task'

const props = defineProps<{
  records: TaskHistoryRecord[]
  selectedRecordId: string | null
}>()

defineEmits<{
  'select-record': [recordId: string]
}>()

const selectedRecord = computed(
  () => props.records.find((record) => record.id === props.selectedRecordId) ?? props.records[0] ?? null,
)

function formatMode(mode: ExecutionMode) {
  if (mode === 'build') {
    return '仅打包'
  }

  if (mode === 'deploy') {
    return '仅部署'
  }

  return '打包 + 部署'
}

function formatDate(value: string) {
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString()
}

function formatDuration(durationMs: number) {
  if (durationMs < 1000) {
    return `${durationMs}ms`
  }

  return `${(durationMs / 1000).toFixed(1)}s`
}
</script>

<style scoped>
.history-card {
  grid-column: 1 / -1;
}

.card-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
}

.card-head h3,
.log-preview-head h4 {
  margin: 0;
}

.card-head p {
  margin: 8px 0 0;
  color: #64748b;
}

.history-layout {
  display: grid;
  grid-template-columns: 320px minmax(0, 1fr);
  gap: 18px;
  min-width: 0;
}

.history-list {
  display: grid;
  gap: 12px;
  align-content: start;
}

.history-item {
  display: grid;
  gap: 8px;
  padding: 14px 16px;
  border: 1px solid rgba(148, 163, 184, 0.14);
  border-radius: 8px;
  background: #101722;
  text-align: left;
  cursor: pointer;
}

.history-item[data-active='true'] {
  border-color: rgba(59, 130, 246, 0.26);
  background: #1c2536;
  box-shadow: inset 0 0 0 1px rgba(59, 130, 246, 0.06);
}

.history-item strong,
.detail-item strong {
  color: #e2e8f0;
  word-break: break-word;
}

.history-item small,
.detail-item span {
  color: #64748b;
}

.history-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  font-size: 12px;
  color: #64748b;
}

.history-detail {
  display: grid;
  gap: 16px;
  min-width: 0;
}

.detail-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 14px 16px;
}

.detail-item {
  display: grid;
  gap: 6px;
}

.full-span {
  grid-column: 1 / -1;
}

.error-text {
  color: #f87171;
}

.log-preview {
  display: grid;
  gap: 12px;
  padding: 16px;
  border-radius: 8px;
  background: #101722;
  min-width: 0;
}

.log-preview-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.log-preview-head h4 {
  color: #f8fafc;
}

.log-lines {
  display: grid;
  gap: 8px;
  max-height: 320px;
  overflow: auto;
}

.log-lines p {
  margin: 0;
  color: #d7e2f0;
  font-family: 'SFMono-Regular', 'Menlo', monospace;
  font-size: 12px;
  line-height: 1.6;
  word-break: break-word;
}

.muted-paragraph {
  margin: 0;
  color: #64748b;
}

@media (max-width: 1100px) {
  .history-layout {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 960px) {
  .card-head {
    flex-direction: column;
  }

  .detail-grid {
    grid-template-columns: 1fr;
  }
}
</style>
