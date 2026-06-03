<template>
  <article class="panel-card config-card">
    <header class="card-head">
      <div>
        <h3>部署环境</h3>
        <p>先整理好环境配置，执行发布时就可以直接选择复用。</p>
      </div>
      <div class="actions">
        <Button class="app-primary-button" :disabled="!projectId" @click="$emit('create-environment')">
          <Plus class="h-4 w-4" />
          <span>新增配置</span>
        </Button>
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
                variant="ghost"
                size="icon"
                class="delete-environment-button"
                aria-label="删除环境"
                title="删除环境"
                @click.stop="$emit('delete-environment-card', environment.name)"
              >
                <Trash2 class="h-4 w-4" />
              </Button>
              <span class="environment-status-text" :data-status="environment.configured ? 'configured' : 'pending'">
                {{ environment.configured ? '已配置' : '待配置' }}
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
        <Button class="app-primary-button" @click="$emit('create-environment')">
          <Plus class="h-4 w-4" />
          <span>新增第一个环境</span>
        </Button>
      </div>
    </div>

    <p v-else class="muted-paragraph">请先导入并选中项目。</p>

    <Drawer :open="editorVisible" direction="right" dismissible modal @update:open="handleDrawerOpenChange">
      <DrawerContent
        class="environment-drawer border-[rgba(148,163,184,0.12)] bg-[#141a28] text-[#cbd5e1] shadow-[0_18px_40px_rgba(2,6,23,0.45)]"
        :style="{ width: 'clamp(720px, 46vw, 860px)', maxWidth: '94vw' }"
      >
        <DrawerHeader class="drawer-head">
          <div class="drawer-head-copy">
            <p class="drawer-eyebrow">环境配置</p>
            <DrawerTitle>{{ editorTitle }}</DrawerTitle>
            <DrawerDescription>保存后，这个环境就可以在执行部署时直接选择复用。</DrawerDescription>
          </div>
        </DrawerHeader>

        <div v-if="editorDraft" class="environment-drawer-scroll">
          <section class="drawer-section">
            <div class="drawer-section-head">
              <h4>基础配置</h4>
              <p>先确认环境名称、启用状态、目标服务器与部署目录。</p>
            </div>

            <div class="create-form-grid">
              <label class="field">
                <span>环境名称</span>
                <InputText
                  :model-value="displayEnvironmentName"
                  :disabled="isPresetEnvironment"
                  class="w-full"
                  placeholder="例如：开发环境"
                  @update:model-value="updateField('name', $event)"
                />
              </label>

              <label class="field">
                <span>目标服务器</span>
                <Select :model-value="editorDraft.serverId" @update:model-value="updateField('serverId', $event)">
                  <SelectTrigger class="w-full">
                    <SelectValue placeholder="请选择服务器" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem v-for="server in serverOptions" :key="server.value" :value="server.value">
                      {{ server.label }}
                    </SelectItem>
                  </SelectContent>
                </Select>
              </label>

              <label class="field full-span">
                <span>启用环境</span>
                <div class="switch-row">
                  <Switch :model-value="editorDraft.enabled" @update:model-value="updateBoolean('enabled', Boolean($event))" />
                  <small>{{ editorDraft.enabled ? '已启用，执行部署时可直接选择' : '未启用，执行部署时不会出现在可选环境中' }}</small>
                </div>
              </label>

              <label class="field full-span">
                <span>远端部署目录</span>
                <div class="field-inline-action">
                  <InputText
                    :model-value="editorDraft.remotePath"
                    class="w-full"
                    placeholder="/root/www/project"
                    @update:model-value="updateField('remotePath', $event)"
                  />
                  <Button variant="outline" @click="$emit('check-environment')">
                    <FolderSearch class="h-4 w-4" />
                    <span>检测</span>
                  </Button>
                </div>
                <small>填写服务器上要发布到的目录，例如 `/root/www/admin`。</small>
              </label>
            </div>
          </section>

          <section class="drawer-section">
            <div class="drawer-section-head">
              <h4>部署策略</h4>
              <p>设置上传方式，以及发布完成后的可选后置命令。</p>
            </div>

            <div class="create-form-grid">
              <label class="field">
                <span>上传方式</span>
                <Select :model-value="editorDraft.uploadStrategy" @update:model-value="updateField('uploadStrategy', $event)">
                  <SelectTrigger class="w-full">
                    <SelectValue placeholder="请选择上传方式" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem v-for="option in uploadStrategyOptions" :key="option.value" :value="option.value">
                      {{ option.label }}
                    </SelectItem>
                  </SelectContent>
                </Select>
                <small>一般情况下直接覆盖即可；需要清空目录后再传时，再切换到“清空后上传”。</small>
              </label>

              <label class="field">
                <span>部署后命令</span>
                <InputText
                  :model-value="editorDraft.postDeployCommand"
                  class="w-full"
                  placeholder="例如：nginx -s reload"
                  @update:model-value="updateField('postDeployCommand', $event)"
                />
                <small>可选。发布完成后在服务器上执行，例如重载 Nginx。</small>
              </label>
            </div>
          </section>
        </div>

        <div class="drawer-actions environment-create-actions">
          <Button variant="secondary" @click="$emit('reset-environment')">
            <RotateCcw class="h-4 w-4" />
            <span>重置配置</span>
          </Button>
          <Button class="app-primary-button" @click="$emit('save-environment')">
            <Save class="h-4 w-4" />
            <span>保存配置</span>
          </Button>
        </div>
      </DrawerContent>
    </Drawer>
  </article>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { ChevronRight, Compass, FolderSearch, Plus, RotateCcw, Save, Trash2 } from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import { Drawer, DrawerContent, DrawerDescription, DrawerHeader, DrawerTitle } from '@/components/ui/drawer'
import { Input as InputText } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import Switch from '@/components/ui/switch/Switch.vue'

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
  props.editorDraft ? (props.servers.find((server) => server.id === props.editorDraft.serverId) ?? null) : null,
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
    props.editorDraft?.name === 'test'
      ? '测试环境'
      : props.editorDraft?.name === 'prod'
        ? '生产环境'
        : props.editorDraft?.name

  return `编辑 ${environmentName}`
})

const displayEnvironmentName = computed(() => {
  if (!props.editorDraft) {
    return ''
  }

  if (props.editorDraft.name === 'test') {
    return '测试环境'
  }

  if (props.editorDraft.name === 'prod') {
    return '生产环境'
  }

  return props.editorDraft.name
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

function updateBoolean(field: keyof EnvironmentFormValue, value: boolean | undefined) {
  if (!props.editorDraft) {
    return
  }

  emit('update:editorDraft', {
    ...props.editorDraft,
    [field]: Boolean(value),
  })
}

function handleDrawerOpenChange(nextOpen: boolean) {
  if (!nextOpen) {
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
  color: #f8fafc;
  font-size: 17px;
  line-height: 1.25;
  letter-spacing: -0.01em;
}

.card-head p {
  margin: 8px 0 0;
  color: #8b9bb3;
  font-size: 12px;
  line-height: 1.6;
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

.environment-card[data-preset='test'] {
  background:
    linear-gradient(180deg, rgba(59, 130, 246, 0.12) 0%, rgba(20, 26, 40, 0.98) 42%),
    #141a28;
}

.environment-card[data-preset='prod'] {
  background:
    linear-gradient(180deg, rgba(16, 185, 129, 0.1) 0%, rgba(20, 26, 40, 0.98) 42%),
    #141a28;
}

.environment-card:hover {
  border-color: rgba(59, 130, 246, 0.24);
  background: #1c2536;
  box-shadow: 0 14px 28px rgba(2, 6, 23, 0.22);
}

.environment-card-top,
.environment-card-foot,
.environment-card-main,
.drawer-actions {
  display: flex;
  align-items: center;
}

.environment-card-top,
.environment-card-foot,
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
  content: '';
  width: 7px;
  height: 7px;
  margin-right: 6px;
  border-radius: 999px;
  background: rgba(148, 163, 184, 0.35);
}

.environment-status-text[data-status='configured'] {
  color: #86efac;
}

.environment-status-text[data-status='configured']::before {
  background: #10b981;
}

.environment-status-text[data-status='pending'] {
  color: #fbbf24;
}

.environment-status-text[data-status='pending']::before {
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
  padding: 22px 24px 18px;
  border-bottom: 1px solid rgba(148, 163, 184, 0.1);
  background: linear-gradient(180deg, rgba(23, 32, 48, 0.98), rgba(20, 26, 40, 0.94)), #141a28;
}

.drawer-head-copy {
  display: grid;
  gap: 8px;
}

.drawer-eyebrow {
  margin: 0 0 10px;
  color: #64748b;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
}

.environment-drawer-scroll {
  flex: 1;
  min-height: 0;
  overflow: auto;
  display: grid;
  align-content: start;
  gap: 18px;
  padding: 18px 10px 20px;
}

.drawer-section {
  display: grid;
  gap: 14px;
  padding: 18px;
  border: 1px solid rgba(148, 163, 184, 0.1);
  border-radius: 12px;
  background: rgba(16, 23, 34, 0.32);
}

.drawer-section-head {
  display: grid;
  gap: 6px;
}

.drawer-section-head h4,
.drawer-section-head p {
  margin: 0;
}

.drawer-section-head h4 {
  color: #f8fafc;
  font-size: 14px;
  line-height: 1.3;
}

.drawer-section-head p {
  color: #8b9bb3;
  font-size: 12px;
  line-height: 1.7;
}

.create-form-grid {
  display: grid;
  gap: 14px;
}

.field {
  display: grid;
  gap: 9px;
}

.full-span {
  grid-column: 1 / -1;
}

.field-inline-action {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 10px;
  align-items: center;
}

.field span {
  color: #cbd5e1;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.03em;
}

.field small {
  color: #64748b;
  line-height: 1.6;
}

.switch-row {
  display: flex;
  align-items: center;
  gap: 12px;
  min-height: 44px;
}

.switch-row small {
  color: #93a4bd;
  font-size: 12px;
}

.drawer-actions {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  flex-wrap: wrap;
  padding-top: 6px;
}

.environment-create-actions {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  align-items: center;
  justify-content: stretch;
  padding: 16px 24px 18px;
  border-top: 1px solid rgba(148, 163, 184, 0.1);
  background: linear-gradient(180deg, rgba(20, 26, 40, 0.92), rgba(17, 24, 39, 0.98)), #141a28;
}

.environment-create-actions :deep(button) {
  height: 36px;
  min-height: 36px;
  width: 100%;
  min-width: 0;
  padding-inline: 14px;
  justify-content: center;
}

:deep(.environment-drawer) {
  display: flex;
  flex-direction: column;
  width: clamp(720px, 46vw, 860px);
  max-width: 94vw;
  height: 100vh;
  padding: 0;
  overflow: hidden;
  background: #141a28;
}

@media (max-width: 960px) {
  .card-head,
  .drawer-actions {
    flex-direction: column;
    align-items: stretch;
  }

  .environment-list {
    grid-template-columns: 1fr;
  }

  .environment-create-actions {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 640px) {
  .drawer-head {
    padding: 20px 18px 16px;
  }

  .environment-drawer-scroll {
    padding: 16px 18px 18px;
  }

  .environment-create-actions {
    padding: 14px 18px 18px;
  }
}
</style>
