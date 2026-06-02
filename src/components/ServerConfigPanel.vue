<template>
  <div class="server-page">
    <article v-if="!selectedServerId" class="panel-card config-card">
      <header class="server-toolbar">
        <Button class="app-primary-button" label="新增服务器" :icon="Plus" @click="$emit('create-server')" />
      </header>

      <div v-if="servers.length > 0" class="server-list">
        <button
          v-for="server in servers"
          :key="server.id"
          class="server-card"
          type="button"
          @click="$emit('select-server', server.id)"
        >
          <div class="server-card-top">
            <div class="server-card-main">
              <span class="server-icon">
                <Server class="h-5 w-5" aria-hidden="true" />
              </span>

              <div class="server-card-body">
                <strong>{{ server.name }}</strong>
                <p>{{ server.host }}:{{ server.port }}</p>
              </div>
            </div>
            <Badge
              :variant="resolveBadgeVariant(server.authType === 'password' ? 'warn' : 'success')"
              :class="['server-auth-tag rounded-full', resolveBadgeToneClass(server.authType === 'password' ? 'warn' : 'success')]"
            >
              {{ server.authType === 'password' ? '密码认证' : '私钥认证' }}
            </Badge>
          </div>

          <div class="server-card-foot">
            <span>{{ server.username }}</span>
            <ChevronRight class="h-4 w-4" aria-hidden="true" />
          </div>
        </button>
      </div>

      <div v-else class="empty-state">
        <Server class="empty-icon" aria-hidden="true" />
        <h4>还没有配置服务器</h4>
        <p>先新增一个服务器，后续在项目环境里就可以直接选择。</p>
        <Button class="app-primary-button" label="新增第一台服务器" :icon="Plus" @click="$emit('create-server')" />
      </div>
    </article>

    <article v-else class="panel-card detail-card">
      <header class="card-head">
        <div>
          <Button
            label="返回列表"
            :icon="ArrowLeft"
            severity="secondary"
            text
            class="back-button"
            @click="$emit('back-to-list')"
          />
          <h3>{{ modelValue.name || '新服务器' }}</h3>
          <p>在这里查看和编辑服务器配置。</p>
        </div>
        <div class="actions">
          <Button label="删除服务器" :icon="Trash2" severity="danger" text @click="$emit('delete-server')" />
          <Button label="测试连接" :icon="Wifi" severity="secondary" outlined @click="$emit('check-server')" />
          <Button class="app-primary-button" label="保存服务器" :icon="Save" @click="$emit('save-server')" />
        </div>
      </header>

      <div class="detail-summary">
        <div class="summary-item">
          <span>主机地址</span>
          <strong>{{ modelValue.host || '未填写' }}</strong>
        </div>
        <div class="summary-item">
          <span>端口</span>
          <strong>{{ modelValue.port || 22 }}</strong>
        </div>
        <div class="summary-item">
          <span>用户名</span>
          <strong>{{ modelValue.username || '未填写' }}</strong>
        </div>
        <div class="summary-item">
          <span>认证方式</span>
          <strong>{{ modelValue.authType === 'password' ? '密码认证' : '私钥认证' }}</strong>
        </div>
      </div>

      <div class="form-grid">
        <label class="field">
          <span>服务器名称</span>
          <InputText :model-value="modelValue.name" fluid @update:model-value="updateText('name', $event)" />
        </label>

        <label class="field">
          <span>认证方式</span>
          <Select
            :model-value="modelValue.authType"
            :options="authTypeOptions"
            option-label="label"
            option-value="value"
            fluid
            @update:model-value="updateText('authType', $event)"
          />
        </label>

        <label class="field">
          <span>SSH 主机</span>
          <InputText :model-value="modelValue.host" fluid @update:model-value="updateText('host', $event)" />
        </label>

        <label class="field">
          <span>SSH 端口</span>
          <InputNumber
            :model-value="modelValue.port"
            :min="1"
            :max="65535"
            fluid
            @update:model-value="updateNumber('port', $event)"
          />
        </label>

        <label class="field">
          <span>用户名</span>
          <InputText :model-value="modelValue.username" fluid @update:model-value="updateText('username', $event)" />
        </label>

        <label v-if="modelValue.authType === 'password'" class="field">
          <span>密码</span>
          <Password
            :model-value="modelValue.password"
            :feedback="false"
            toggle-mask
            fluid
            @update:model-value="updateText('password', $event)"
          />
        </label>

        <label v-else class="field">
          <span>私钥路径</span>
          <InputText
            :model-value="modelValue.privateKeyPath"
            fluid
            @update:model-value="updateText('privateKeyPath', $event)"
          />
        </label>
      </div>
    </article>

    <Drawer
      :visible="isCreating"
      position="right"
      dismissable
      modal
      class="create-drawer"
      @update:visible="handleDrawerVisibleChange"
    >
      <template #header>
        <div class="drawer-head">
          <div>
            <p class="drawer-eyebrow">新增服务器</p>
            <h3>填写服务器配置</h3>
            <p>保存后，这台服务器就可以在项目环境里直接选择。</p>
          </div>
        </div>
      </template>

      <div class="drawer-summary">
        <div class="summary-item">
          <span>主机地址</span>
          <strong>{{ modelValue.host || '未填写' }}</strong>
        </div>
        <div class="summary-item">
          <span>认证方式</span>
          <strong>{{ modelValue.authType === 'password' ? '密码认证' : '私钥认证' }}</strong>
        </div>
      </div>

      <div class="form-grid">
        <label class="field">
          <span>服务器名称</span>
          <InputText :model-value="modelValue.name" fluid @update:model-value="updateText('name', $event)" />
        </label>

        <label class="field">
          <span>认证方式</span>
          <Select
            :model-value="modelValue.authType"
            :options="authTypeOptions"
            option-label="label"
            option-value="value"
            fluid
            @update:model-value="updateText('authType', $event)"
          />
        </label>

        <label class="field">
          <span>SSH 主机</span>
          <InputText :model-value="modelValue.host" fluid @update:model-value="updateText('host', $event)" />
        </label>

        <label class="field">
          <span>SSH 端口</span>
          <InputNumber
            :model-value="modelValue.port"
            :min="1"
            :max="65535"
            fluid
            @update:model-value="updateNumber('port', $event)"
          />
        </label>

        <label class="field">
          <span>用户名</span>
          <InputText :model-value="modelValue.username" fluid @update:model-value="updateText('username', $event)" />
        </label>

        <label v-if="modelValue.authType === 'password'" class="field">
          <span>密码</span>
          <Password
            :model-value="modelValue.password"
            :feedback="false"
            toggle-mask
            fluid
            @update:model-value="updateText('password', $event)"
          />
        </label>

        <label v-else class="field">
          <span>私钥路径</span>
          <InputText
            :model-value="modelValue.privateKeyPath"
            fluid
            @update:model-value="updateText('privateKeyPath', $event)"
          />
        </label>
      </div>

      <div class="drawer-actions">
        <Button label="取消" severity="secondary" outlined @click="$emit('close-create')" />
        <Button label="测试连接" :icon="Wifi" severity="secondary" outlined @click="$emit('check-server')" />
        <Button class="app-primary-button" label="保存服务器" :icon="Save" @click="$emit('save-server')" />
      </div>
    </Drawer>
  </div>
</template>

<script setup lang="ts">
import { ArrowLeft, ChevronRight, Plus, Save, Server, Trash2, Wifi } from 'lucide-vue-next'

import Button from '@/components/ui/button/Button.vue'
import Badge from '@/components/ui/badge/Badge.vue'
import Drawer from '@/components/ui/drawer/Drawer.vue'
import InputNumber from '@/components/ui/input-number/InputNumber.vue'
import InputText from '@/components/ui/input/Input.vue'
import Password from '@/components/ui/password/Password.vue'
import Select from '@/components/ui/select/Select.vue'

import { resolveBadgeToneClass, resolveBadgeVariant } from '@/lib/ui-status'
import type { AuthType, ServerFormValue, ServerRecord } from '@/types/task'

const authTypeOptions: Array<{ label: string; value: AuthType }> = [
  { label: '密码认证', value: 'password' },
  { label: '私钥认证', value: 'privateKey' },
]

const props = defineProps<{
  isCreating: boolean
  modelValue: ServerFormValue
  selectedServerId: string | null
  servers: ServerRecord[]
}>()

const emit = defineEmits<{
  'back-to-list': []
  'check-server': []
  'close-create': []
  'create-server': []
  'delete-server': []
  'save-server': []
  'select-server': [serverId: string]
  'update:modelValue': [value: ServerFormValue]
}>()

function updateText(field: keyof ServerFormValue, value: string | AuthType | undefined) {
  emit('update:modelValue', {
    ...props.modelValue,
    [field]: value ?? '',
  })
}

function updateNumber(field: keyof ServerFormValue, value: number | null | undefined) {
  emit('update:modelValue', {
    ...props.modelValue,
    [field]: value ?? 22,
  })
}

function handleDrawerVisibleChange(nextVisible: boolean) {
  if (!nextVisible) {
    emit('close-create')
  }
}
</script>

<style scoped>
.server-page {
  grid-column: 1 / -1;
  position: relative;
}

.config-card,
.detail-card {
  grid-column: 1 / -1;
}

.config-card {
  gap: 18px;
}

.server-toolbar {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  padding-bottom: 2px;
}

.card-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 18px;
}

.actions {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

.card-head h3 {
  margin: 0;
  font-size: 14px;
  line-height: 1.2;
}

.card-head p {
  margin: 8px 0 0;
  color: #64748b;
}

.form-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 18px 20px;
}

.field {
  display: grid;
  gap: 9px;
}

.field span {
  color: #cbd5e1;
  font-size: 12px;
  font-weight: 700;
}

.server-list {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 320px));
  gap: 14px;
  align-items: start;
  justify-content: start;
  padding-top: 4px;
}

.server-card {
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  height: 120px;
  padding: 12px 16px 10px;
  border: 1px solid rgba(148, 163, 184, 0.14);
  border-radius: 8px;
  background: #141a28;
  color: #e2e8f0;
  text-align: left;
  cursor: pointer;
  transition:
    border-color 160ms ease,
    box-shadow 160ms ease,
    background-color 160ms ease;
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.02),
    0 10px 24px rgba(2, 6, 23, 0.2);
}

.server-card:hover {
  border-color: rgba(59, 130, 246, 0.26);
  background: #1c2536;
}

.server-card-top {
  display: flex;
  flex: 1;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  min-height: 0;
  padding-bottom: 6px;
}

.server-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border-radius: 8px;
  background: #101722;
  color: #93c5fd;
  font-size: 14px;
  flex: 0 0 auto;
}

.server-card-main {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
  flex: 1;
}

.server-card-body {
  display: grid;
  gap: 2px;
  min-width: 0;
}

.server-card-body strong,
.server-card-body p,
.server-card-foot span {
  margin: 0;
}

.server-card-body strong {
  font-size: 13px;
  line-height: 1.2;
  letter-spacing: -0.02em;
}

.server-card-body p {
  color: #94a3b8;
  font-size: 11px;
  line-height: 1.25;
  word-break: break-all;
}

.server-auth-tag {
  flex: 0 0 auto;
}

.server-card-foot {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding-top: 7px;
  border-top: 1px solid rgba(148, 163, 184, 0.12);
  color: #64748b;
  font-size: 11px;
  font-weight: 600;
}

.empty-state {
  display: grid;
  justify-items: start;
  gap: 10px;
  padding: 18px;
  border: 1px dashed rgba(148, 163, 184, 0.18);
  border-radius: 8px;
  background: #101722;
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

.empty-state p {
  color: #64748b;
  line-height: 1.7;
}

.drawer-head {
  display: flex;
  align-items: flex-start;
  gap: 12px;
}

.drawer-head h3,
.drawer-head p {
  margin: 0;
}

.drawer-head h3 {
  color: #e2e8f0;
  font-size: 18px;
  line-height: 1.15;
}

.drawer-head p {
  margin-top: 8px;
  color: #64748b;
  font-size: 13px;
  line-height: 1.6;
}

.drawer-eyebrow {
  margin: 0 0 10px;
  color: #64748b;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
}

.drawer-summary {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}

.drawer-actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  flex-wrap: wrap;
  padding-top: 6px;
}

.back-button {
  padding-left: 0;
}

.detail-summary {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 12px;
}

.summary-item {
  display: grid;
  gap: 6px;
  padding: 14px 16px;
  border: 1px solid rgba(148, 163, 184, 0.12);
  border-radius: 8px;
  background: #101722;
}

.summary-item span {
  color: #64748b;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

.summary-item strong {
  color: #e2e8f0;
  word-break: break-word;
}

@media (max-width: 960px) {
  .card-head {
    flex-direction: column;
  }

  .form-grid,
  .server-list,
  .detail-summary,
  .drawer-summary {
    grid-template-columns: 1fr;
  }
}
</style>
