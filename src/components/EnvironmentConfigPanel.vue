<template>
  <article class="panel-card config-card">
    <header class="card-head">
      <div>
        <h3>部署环境</h3>
        <p>先整理好环境配置，执行发布时就可以直接选择复用。</p>
      </div>
      <div class="actions">
        <Button class="app-primary-button" label="新增配置" :icon="Plus" :disabled="!projectId" @click="$emit('create-environment')" />
      </div>
    </header>

    <div v-if="projectId" class="environment-page">
      <div v-if="environmentCards.length > 0" class="environment-list">
        <button
          v-for="environment in environmentCards"
          :key="environment.name"
          type="button"
          class="environment-card"
          :data-preset="environment.preset ? environment.name : null"
          @click="$emit('select-environment', environment.name)"
        >
          <div class="environment-card-top">
            <div class="environment-card-main">
              <span class="environment-icon">
                <component :is="environment.icon" class="h-5 w-5" aria-hidden="true" />
              </span>

              <div class="environment-card-body">
                <strong>{{ environment.label }}</strong>
                <p>{{ environment.serverLabel }}</p>
              </div>
            </div>

            <div class="environment-card-actions">
              <Button
                v-if="environment.deletable"
                :icon="Trash2"
                severity="danger"
                text
                rounded
                class="delete-environment-button"
                aria-label="删除环境"
                title="删除环境"
                @click.stop="$emit('delete-environment-card', environment.name)"
              />
              <span class="environment-status-text" :data-status="environment.configured ? 'configured' : 'pending'">
                {{ environment.configured ? "已配置" : "待配置" }}
              </span>
            </div>
          </div>

          <div class="environment-card-foot">
            <span>{{ environment.remotePathLabel }}</span>
            <ChevronRight class="h-4 w-4" aria-hidden="true" />
          </div>
        </button>
      </div>

      <div v-else class="empty-state">
        <Compass class="empty-icon" aria-hidden="true" />
        <h4>还没有部署环境</h4>
        <p>先新增一个环境配置，后续执行部署时就可以直接选择。</p>
        <Button class="app-primary-button" label="新增第一个环境" :icon="Plus" @click="$emit('create-environment')" />
      </div>
    </div>

    <p v-else class="muted-paragraph">请先导入并选中项目。</p>

    <Drawer
      :visible="editorVisible"
      position="right"
      dismissable
      modal
      :show-close-icon="false"
      :style="{ width: 'min(560px, 92vw)' }"
      class="environment-drawer"
      @update:visible="handleDrawerVisibleChange"
    >
      <template #header>
        <div class="drawer-head">
          <div class="drawer-head-copy">
            <p class="drawer-eyebrow">环境配置</p>
            <h3>{{ editorTitle }}</h3>
          </div>
        </div>
      </template>

      <div v-if="editorDraft" class="drawer-body">
        <section class="drawer-section">
          <label class="field">
            <span>环境名称</span>
            <InputText
              :model-value="editorDraft.name"
              :disabled="isPresetEnvironment"
              fluid
              placeholder="例如：开发环境"
              @update:model-value="updateField('name', $event)"
            />
          </label>

          <div class="toggle-field">
            <label class="field">
              <span>启用环境</span>
              <div class="switch-row">
                <Switch :model-value="editorDraft.enabled" @update:model-value="updateBoolean('enabled', Boolean($event))" />
              </div>
            </label>
          </div>

          <label class="field">
            <span>目标服务器</span>
            <Select
              :model-value="editorDraft.serverId"
              :options="serverOptions"
              option-label="label"
              option-value="value"
              placeholder="请选择服务器"
              fluid
              @update:model-value="updateField('serverId', $event)"
            />
          </label>

          <label class="field">
            <span>远端部署目录</span>
            <div class="field-inline-action">
              <InputText
                :model-value="editorDraft.remotePath"
                fluid
                placeholder="/root/www/project"
                @update:model-value="updateField('remotePath', $event)"
              />
              <Button
                label="检测"
                :icon="FolderSearch"
                severity="secondary"
                outlined
                @click="$emit('check-environment')"
              />
            </div>
            <small>填写服务器上要发布到的目录，例如 `/root/www/admin`。</small>
          </label>

          <label class="field">
            <span>上传方式</span>
            <Select
              :model-value="editorDraft.uploadStrategy"
              :options="uploadStrategyOptions"
              option-label="label"
              option-value="value"
              fluid
              @update:model-value="updateField('uploadStrategy', $event)"
            />
            <small>一般情况下直接覆盖即可；需要清空目录后再传时，再切换到“清空后上传”。</small>
          </label>

          <label class="field">
            <span>部署后命令</span>
            <InputText
              :model-value="editorDraft.postDeployCommand"
              fluid
              placeholder="例如：nginx -s reload"
              @update:model-value="updateField('postDeployCommand', $event)"
            />
            <small>可选。发布完成后在服务器上执行，例如重载 Nginx。</small>
          </label>
        </section>

        <Alert
          v-if="selectedServer"
          :variant="resolveAlertVariant('secondary')"
          :class="[resolveAlertToneClass('secondary'), 'server-summary']"
        >
          已绑定服务器：{{ selectedServer.name }} / {{ selectedServer.host }}:{{ selectedServer.port }}
        </Alert>
        <Alert
          v-else
          :variant="resolveAlertVariant('secondary')"
          :class="[resolveAlertToneClass('secondary'), 'server-summary']"
        >
          还没有绑定服务器，保存后也可以继续补充。
        </Alert>
      </div>

      <template #footer>
        <div class="drawer-actions">
          <div class="drawer-actions-start">
            <Button v-if="canDelete" label="删除环境" :icon="Trash2" severity="danger" text @click="$emit('delete-environment')" />
            <Button label="重置配置" :icon="RotateCcw" severity="danger" outlined @click="$emit('reset-environment')" />
          </div>
          <div class="drawer-actions-end">
            <Button class="app-primary-button" label="保存配置" :icon="Save" @click="$emit('save-environment')" />
          </div>
        </div>
      </template>
    </Drawer>
  </article>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { ChevronRight, Compass, FolderSearch, Plus, RotateCcw, Save, Trash2 } from 'lucide-vue-next'
import Alert from '@/components/ui/alert/Alert.vue'
import Button from '@/components/ui/button/Button.vue'
import Drawer from '@/components/ui/drawer/Drawer.vue'
import InputText from '@/components/ui/input/Input.vue'
import Select from '@/components/ui/select/Select.vue'
import Switch from '@/components/ui/switch/Switch.vue'

import { resolveAlertToneClass, resolveAlertVariant } from '@/lib/ui-status'
import type { Component } from 'vue'
import type { EnvironmentFormValue, ServerRecord, UploadStrategy } from '@/types/task'

const uploadStrategyOptions: Array<{ label: string; value: UploadStrategy }> = [
  { label: '直接覆盖', value: 'overwrite' },
  { label: '清空后上传', value: 'clear-and-upload' },
]

type EnvironmentCardItem = {
  configured: boolean
  deletable: boolean
  icon: Component
  label: string
  name: string
  preset: boolean
  remotePathLabel: string
  serverLabel: string
}

const props = defineProps<{
  canDelete: boolean
  editorDraft: EnvironmentFormValue | null
  editorMode: 'create' | 'edit'
  editorVisible: boolean
  environmentCards: EnvironmentCardItem[]
  isPresetEnvironment: boolean
  projectId: string | null
  servers: ServerRecord[]
}>()

const emit = defineEmits<{
  'check-environment': []
  'close-editor': []
  'create-environment': []
  'delete-environment': []
  'delete-environment-card': [name: string]
  'reset-environment': []
  'save-environment': []
  'select-environment': [name: string]
  'update:editorDraft': [value: EnvironmentFormValue | null]
}>()

const selectedServer = computed(() =>
  props.editorDraft ? (props.servers.find((server) => server.id === props.editorDraft?.serverId) ?? null) : null,
)

const serverOptions = computed(() =>
  props.servers.map((server) => ({
    label: `${server.name} / ${server.host}:${server.port}`,
    value: server.id,
  })),
)

const editorTitle = computed(() => {
  if (props.editorMode === 'create') {
    return '新增自定义环境'
  }

  const environmentName =
    props.editorDraft?.name === 'test' ? '测试环境' : props.editorDraft?.name === 'prod' ? '生产环境' : props.editorDraft?.name

  return `编辑 ${environmentName}`;
})

function updateField(field: keyof EnvironmentFormValue, value: string | UploadStrategy | undefined) {
  if (!props.editorDraft) {
    return
  }

  emit('update:editorDraft', {
    ...props.editorDraft,
    [field]: value ?? '',
  })
}

function handleDrawerVisibleChange(nextVisible: boolean) {
  if (!nextVisible) {
    emit('close-editor')
  }
}
</script>

<style scoped>
.config-card {
  min-height: 320px;
  gap: 18px;
}

.card-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 18px;
}

.card-head h3 {
  margin: 0;
}

.card-head p {
  margin: 8px 0 0;
  color: #64748b;
}

.actions {
  display: flex;
  align-items: center;
  gap: 10px;
}

.environment-page {
  display: grid;
}

.environment-list {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 360px));
  gap: 16px;
  justify-content: start;
}

.environment-card {
  display: flex;
  flex-direction: column;
  gap: 14px;
  min-height: 146px;
  padding: 18px;
  border: 1px solid rgba(148, 163, 184, 0.14);
  border-radius: 8px;
  background: #141a28;
  color: inherit;
  text-align: left;
  cursor: pointer;
  transition:
    border-color 160ms ease,
    box-shadow 160ms ease,
    background-color 160ms ease;
}

.environment-card[data-preset="test"] {
  background: #162033;
}

.environment-card[data-preset="prod"] {
  background: #182132;
}

.environment-card:hover {
  border-color: rgba(59, 130, 246, 0.24);
  background: #1c2536;
  box-shadow: 0 14px 28px rgba(2, 6, 23, 0.22);
}

.environment-card-top,
.environment-card-foot,
.environment-card-main,
.server-preview-head,
.drawer-actions {
  display: flex;
  align-items: center;
}

.environment-card-top,
.environment-card-foot,
.server-preview-head,
.drawer-actions {
  justify-content: space-between;
}

.environment-card-main {
  gap: 12px;
  min-width: 0;
}

.environment-card-actions {
  display: flex;
  align-items: center;
  gap: 6px;
  flex: 0 0 auto;
}

.environment-status-text {
  display: inline-flex;
  align-items: center;
  color: #94a3b8;
  font-size: 12px;
  font-weight: 600;
  line-height: 1;
  white-space: nowrap;
}

.environment-status-text::before {
  content: "";
  width: 7px;
  height: 7px;
  margin-right: 6px;
  border-radius: 999px;
  background: rgba(148, 163, 184, 0.35);
}

.environment-status-text[data-status="configured"] {
  color: #86efac;
}

.environment-status-text[data-status="configured"]::before {
  background: #10b981;
}

.environment-status-text[data-status="pending"] {
  color: #fbbf24;
}

.environment-status-text[data-status="pending"]::before {
  background: #f97316;
}

.environment-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 42px;
  height: 42px;
  border-radius: 8px;
  background: #101722;
  color: #93c5fd;
  font-size: 16px;
  flex: 0 0 auto;
}

.environment-card-body {
  display: grid;
  gap: 5px;
  min-width: 0;
}

.environment-card-body strong {
  color: #e2e8f0;
  font-size: 14px;
  line-height: 1.25;
}

.environment-card-body p,
.environment-card-foot span,
.muted-paragraph {
  margin: 0;
  color: #64748b;
}

.environment-card-body p,
.environment-card-foot span {
  font-size: 12px;
  line-height: 1.5;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.environment-card-foot {
  gap: 12px;
  margin-top: auto;
  padding-top: 12px;
  border-top: 1px solid rgba(148, 163, 184, 0.12);
}

.empty-state {
  display: grid;
  justify-items: center;
  gap: 10px;
  padding: 22px 18px;
  border: 1px dashed rgba(148, 163, 184, 0.18);
  border-radius: 8px;
  background: #101722;
  text-align: center;
}

.empty-icon {
  width: 20px;
  height: 20px;
  color: #64748b;
}

.empty-state h4,
.empty-state p {
  margin: 0;
}

.drawer-head {
  display: grid;
  gap: 10px;
  padding: 4px 4px 0;
}

.drawer-head-copy {
  display: grid;
  gap: 6px;
}

.drawer-eyebrow {
  margin: 0;
  color: #64748b;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
}

.drawer-head h3 {
  margin: 0;
}

.drawer-body {
  display: grid;
  gap: 12px;
}

.drawer-section {
  display: grid;
  gap: 12px;
  padding: 16px;
  border: 1px solid rgba(148, 163, 184, 0.12);
  border-radius: 8px;
  background: #101722;
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.02);
}

.summary-item {
  display: grid;
  gap: 8px;
  padding: 14px 16px;
  border: 1px solid rgba(148, 163, 184, 0.12);
  border-radius: 8px;
  background: #101722;
}

.summary-item span,
.field small,
.server-preview p {
  color: #64748b;
}

.summary-item strong {
  color: #e2e8f0;
}

.field {
  display: grid;
  gap: 8px;
}

.field-inline-action {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 10px;
  align-items: center;
}

.field span {
  color: #cbd5e1;
  font-size: 13px;
  font-weight: 700;
}

.field small {
  line-height: 1.6;
}

.toggle-field {
  display: grid;
}

.switch-row {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  min-height: 36px;
}

.switch-row small {
  margin: 0;
  line-height: 1;
}

.drawer-actions {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
}

.drawer-actions-start,
.drawer-actions-end {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

.server-summary {
  margin: 0;
  border-radius: 8px;
  background: #101722;
}

:deep(.environment-drawer) {
  background: #111722;
}

@media (max-width: 960px) {
  .card-head,
  .drawer-actions {
    flex-direction: column;
    align-items: stretch;
  }

  .environment-list,
  .summary-grid {
    grid-template-columns: 1fr;
  }
}
</style>
