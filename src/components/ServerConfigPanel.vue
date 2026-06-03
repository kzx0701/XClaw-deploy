<template>
  <div class="server-page">
    <article class="server-list-page">
      <header class="server-toolbar">
        <Button class="app-primary-button" @click="$emit('create-server')">
          <Plus class="h-4 w-4" />
          <span>新增服务器</span>
        </Button>
      </header>

      <div v-if="servers.length > 0" class="server-card-list">
        <ResourceCard
          v-for="server in servers"
          :key="server.id"
          :description="`${server.host}:${server.port}，${server.username}`"
          :title="server.name"
          @select="$emit('select-server', server.id)"
        >
          <template #icon>
            <Server class="h-5 w-5" aria-hidden="true" />
          </template>

          <template #meta>
            <span class="server-auth-badge" :data-auth-type="server.authType">
              {{ server.authType === "password" ? "密码认证" : "私钥认证" }}
            </span>
          </template>

          <template #actions>
            <button
              type="button"
              class="delete-server-button"
              title="删除服务器"
              aria-label="删除服务器"
              @click.stop="$emit('delete-server-card', server.id)"
            >
              <Trash2 class="h-4 w-4" aria-hidden="true" />
            </button>
          </template>
        </ResourceCard>
      </div>

      <section v-else class="server-empty-shell">
        <div class="server-empty-hero">
          <div class="server-empty-copy">
            <div class="server-empty-copy-head">
              <span class="server-empty-eyebrow">服务器工作台</span>
              <span class="server-empty-divider" aria-hidden="true" />
            </div>
            <h2>接入服务器，部署链路才算完整</h2>
            <p>新增服务器后，就可以在项目环境里直接绑定目标机器，继续完成连接检测、目录配置和部署执行。</p>

            <div class="server-empty-highlights" aria-hidden="true">
              <span>统一管理服务器信息</span>
              <span>支持密码与私钥认证</span>
              <span>直接复用到项目环境</span>
            </div>

            <div class="server-empty-actions">
              <Button class="app-primary-button" @click="$emit('create-server')">
                <Plus class="h-4 w-4" />
                <span>新增第一台服务器</span>
              </Button>
              <div class="server-empty-tip">
                <small>支持常见 Linux 服务器</small>
              </div>
            </div>
          </div>

          <div class="server-empty-visual" aria-hidden="true">
            <img class="server-empty-visual-image" :src="serverBackground" alt="" />
          </div>
        </div>

        <div class="server-empty-guide">
          <article class="server-empty-step">
            <span>01</span>
            <strong>新增服务器</strong>
            <p>填写主机、端口、用户名和认证方式，建立可复用的服务器记录。</p>
          </article>
          <article class="server-empty-step">
            <span>02</span>
            <strong>检测连接</strong>
            <p>在保存前先完成连接测试，确认凭据和目标机器可正常访问。</p>
          </article>
          <article class="server-empty-step">
            <span>03</span>
            <strong>绑定环境</strong>
            <p>回到项目环境中直接选用这台服务器，继续配置远端目录与部署策略。</p>
          </article>
        </div>
      </section>
    </article>

    <Drawer :open="isCreating" direction="right" dismissible modal @update:open="handleDrawerOpenChange">
      <DrawerContent
        class="create-drawer server-create-drawer border-[rgba(148,163,184,0.12)] bg-[#141a28] text-[#cbd5e1] shadow-[0_18px_40px_rgba(2,6,23,0.45)]"
      >
        <DrawerHeader class="server-create-header">
          <div class="server-create-head-copy">
            <p class="drawer-eyebrow">{{ editorMode === "edit" ? "编辑服务器" : "新增服务器" }}</p>
            <DrawerTitle>{{ editorMode === "edit" ? "编辑服务器配置" : "填写服务器配置" }}</DrawerTitle>
            <DrawerDescription>保存后，这台服务器就可以在项目环境里直接选择。</DrawerDescription>
          </div>
        </DrawerHeader>

        <div class="server-create-scroll">
          <section class="server-create-section">
            <div class="server-create-section-head">
              <h4>基础信息</h4>
              <p>先填写名称、主机与端口，建立一条可复用的服务器记录。</p>
            </div>

            <div class="create-form-grid">
              <Field class="server-create-field">
                <FieldLabel class="server-create-field-label">服务器名称</FieldLabel>
                <FieldContent class="server-create-field-content">
                  <InputText
                    :model-value="modelValue.name"
                    class="w-full"
                    placeholder="例如：生产服务器"
                    @update:model-value="updateText('name', $event)"
                  />
                </FieldContent>
              </Field>

              <div class="create-form-row">
                <Field class="server-create-field">
                  <FieldLabel class="server-create-field-label">认证方式</FieldLabel>
                  <FieldContent class="server-create-field-content">
                    <Select :model-value="modelValue.authType" @update:model-value="updateText('authType', $event)">
                      <SelectTrigger class="w-full">
                        <SelectValue placeholder="请选择认证方式" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem v-for="option in authTypeOptions" :key="option.value" :value="option.value">
                          {{ option.label }}
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </FieldContent>
                </Field>

                <Field class="server-create-field server-create-field-compact">
                  <FieldLabel class="server-create-field-label">SSH 端口</FieldLabel>
                  <FieldContent class="server-create-field-content">
                    <InputText
                      :model-value="String(modelValue.port || 22)"
                      class="w-full"
                      inputmode="numeric"
                      @update:model-value="updatePort($event)"
                    />
                  </FieldContent>
                </Field>
              </div>

              <Field class="server-create-field">
                <FieldLabel class="server-create-field-label">SSH 主机</FieldLabel>
                <FieldContent class="server-create-field-content">
                  <InputText
                    :model-value="modelValue.host"
                    class="w-full"
                    placeholder="例如：192.168.1.20"
                    @update:model-value="updateText('host', $event)"
                  />
                </FieldContent>
              </Field>
            </div>
          </section>

          <section class="server-create-section">
            <div class="server-create-section-head">
              <h4>登录凭据</h4>
              <p>根据认证方式填写用户名与密码，或配置服务器私钥路径。</p>
            </div>

            <div class="create-form-grid">
              <Field class="server-create-field">
                <FieldLabel class="server-create-field-label">用户名</FieldLabel>
                <FieldContent class="server-create-field-content">
                  <InputText
                    :model-value="modelValue.username"
                    class="w-full"
                    placeholder="例如：root"
                    @update:model-value="updateText('username', $event)"
                  />
                </FieldContent>
              </Field>

              <Field v-if="modelValue.authType === 'password'" class="server-create-field">
                <FieldLabel class="server-create-field-label">密码</FieldLabel>
                <FieldContent class="server-create-field-content">
                  <div class="password-field">
                    <InputText
                      :model-value="modelValue.password"
                      :type="showPassword ? 'text' : 'password'"
                      class="w-full pr-11"
                      placeholder="输入服务器密码"
                      @update:model-value="updateText('password', $event)"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      class="password-toggle"
                      :aria-label="showPassword ? '隐藏密码' : '显示密码'"
                      @click="showPassword = !showPassword"
                    >
                      <EyeOff v-if="showPassword" class="h-4 w-4" />
                      <Eye v-else class="h-4 w-4" />
                    </Button>
                  </div>
                </FieldContent>
              </Field>

              <Field v-else class="server-create-field">
                <FieldLabel class="server-create-field-label">私钥路径</FieldLabel>
                <FieldContent class="server-create-field-content">
                  <InputText
                    :model-value="modelValue.privateKeyPath"
                    class="w-full"
                    placeholder="例如：~/.ssh/id_rsa"
                    @update:model-value="updateText('privateKeyPath', $event)"
                  />
                </FieldContent>
              </Field>
            </div>
          </section>
        </div>

        <div class="drawer-actions server-create-actions">
          <Button variant="secondary" @click="$emit('check-server')">
            <Wifi class="h-4 w-4" />
            <span>测试连接</span>
          </Button>
          <Button class="app-primary-button" @click="$emit('save-server')">
            <Save class="h-4 w-4" />
            <span>保存配置</span>
          </Button>
        </div>
      </DrawerContent>
    </Drawer>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from "vue";
import { Eye, EyeOff, Plus, Save, Server, Trash2, Wifi } from "lucide-vue-next";

import serverBackground from "@/assets/images/server-bg.png";
import ResourceCard from "@/components/ResourceCard.vue";
import { Button } from "@/components/ui/button";
import { Drawer, DrawerContent, DrawerDescription, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { Field, FieldContent, FieldLabel } from "@/components/ui/field";
import { Input as InputText } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

import type { AuthType, ServerFormValue, ServerRecord } from "@/types/task";

const authTypeOptions: Array<{ label: string; value: AuthType }> = [
  { label: "密码认证", value: "password" },
  { label: "私钥认证", value: "privateKey" },
];

const emit = defineEmits<{
  "check-server": [];
  "close-create": [];
  "create-server": [];
  "delete-server-card": [serverId: string];
  "save-server": [];
  "select-server": [serverId: string];
  "update:modelValue": [value: ServerFormValue];
}>();

const props = defineProps<{
  isCreating: boolean;
  modelValue: ServerFormValue;
  selectedServerId: string | null;
  servers: ServerRecord[];
}>();

const showPassword = ref(false);

const editorMode = computed(() => (props.selectedServerId ? "edit" : "create"));

function updateText(field: keyof ServerFormValue, value: string | AuthType | undefined) {
  emit("update:modelValue", {
    ...props.modelValue,
    [field]: value ?? "",
  });
}

function updateNumber(field: keyof ServerFormValue, value: number | null | undefined) {
  emit("update:modelValue", {
    ...props.modelValue,
    [field]: value ?? 22,
  });
}

function updatePort(value: string | undefined) {
  const digitsOnly = (value ?? "").replace(/\D+/g, "");
  const nextPort = digitsOnly ? Math.min(Math.max(Number(digitsOnly), 1), 65535) : 22;

  updateNumber("port", Number.isNaN(nextPort) ? 22 : nextPort);
}

function handleDrawerOpenChange(nextOpen: boolean) {
  if (!nextOpen) {
    emit("close-create");
  }
}
</script>

<style scoped>
.server-page {
  grid-column: 1 / -1;
  position: relative;
}

.server-list-page {
  grid-column: 1 / -1;
  display: grid;
  gap: 14px;
}

.server-toolbar {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  padding-bottom: 4px;
}

.server-card-list {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(360px, 420px));
  gap: 16px;
  align-items: start;
  justify-content: start;
}

.server-auth-badge {
  margin: 0;
}

.server-auth-badge {
  display: inline-flex;
  align-items: center;
  justify-self: start;
  min-height: 22px;
  padding: 0 9px;
  border: 1px solid rgba(148, 163, 184, 0.14);
  border-radius: 999px;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.04em;
  line-height: 1;
}

.server-auth-badge[data-auth-type="password"] {
  border-color: rgba(249, 115, 22, 0.22);
  background: rgba(249, 115, 22, 0.12);
  color: #fdba74;
}

.server-auth-badge[data-auth-type="privateKey"] {
  border-color: rgba(16, 185, 129, 0.24);
  background: rgba(16, 185, 129, 0.12);
  color: #6ee7b7;
}

.delete-server-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex: 0 0 auto;
  width: 30px;
  height: 30px;
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

.delete-server-button:hover {
  background: rgba(239, 68, 68, 0.1);
  border-color: rgba(239, 68, 68, 0.18);
  color: #fca5a5;
}

.delete-server-button:active {
  transform: scale(0.98);
}

.server-empty-shell {
  display: grid;
  gap: 22px;
}

.server-empty-hero {
  position: relative;
  overflow: hidden;
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  min-height: 400px;
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

.server-empty-hero::after {
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

.server-empty-copy {
  position: relative;
  z-index: 1;
  display: grid;
  align-content: flex-start;
  gap: 26px;
  min-width: 0;
  max-width: 640px;
  padding-top: 10px;
}

.server-empty-copy-head {
  display: grid;
  gap: 12px;
}

.server-empty-eyebrow {
  color: #8fb4ff;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.18em;
  text-transform: uppercase;
}

.server-empty-divider {
  width: 44px;
  height: 1px;
  background: linear-gradient(90deg, rgba(96, 165, 250, 0.65), rgba(96, 165, 250, 0));
}

.server-empty-copy h2 {
  margin: 0;
  max-width: 560px;
  color: #f8fafc;
  font-size: 32px;
  line-height: 1.08;
  letter-spacing: -0.038em;
  text-wrap: balance;
}

.server-empty-copy p {
  margin: 0;
  max-width: 560px;
  color: #93a4bf;
  font-size: 15px;
  line-height: 1.95;
}

.server-empty-highlights {
  display: flex;
  flex-wrap: wrap;
  gap: 8px 10px;
  max-width: 540px;
  margin-top: -2px;
}

.server-empty-highlights span {
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

.server-empty-actions {
  display: grid;
  gap: 14px;
  width: fit-content;
  padding-top: 18px;
}

.server-empty-actions :deep(.app-primary-button) {
  min-width: 272px;
  min-height: 44px;
  padding-inline: 20px;
  border-radius: 12px;
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.1),
    0 10px 26px rgba(37, 99, 235, 0.22);
}

.server-empty-actions :deep(.app-primary-button span) {
  font-weight: 700;
  letter-spacing: 0.01em;
}

.server-empty-tip {
  display: grid;
  gap: 3px;
  padding-left: 4px;
}

.server-empty-tip small {
  color: #708198;
  font-size: 11px;
  line-height: 1.6;
}

.server-empty-visual {
  position: absolute;
  inset: 0;
  pointer-events: none;
  overflow: hidden;
}

.server-empty-visual-image {
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

.server-empty-guide {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 16px;
}

.server-empty-step {
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

.server-empty-step::before {
  content: "";
  width: 28px;
  height: 2px;
  border-radius: 999px;
  background: linear-gradient(90deg, #60a5fa, rgba(96, 165, 250, 0));
}

.server-empty-step span {
  color: #60a5fa;
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.12em;
  text-transform: uppercase;
}

.server-empty-step strong {
  color: #f8fafc;
  font-size: 15px;
  line-height: 1.3;
}

.server-empty-step p {
  margin: 0;
  color: #8fa1bc;
  font-size: 13px;
  line-height: 1.7;
}

.server-empty-step:hover {
  border-color: rgba(96, 165, 250, 0.18);
  transform: translateY(-1px);
}

.password-field {
  position: relative;
}

.password-toggle {
  position: absolute;
  top: 50%;
  right: 4px;
  height: 28px;
  width: 28px;
  transform: translateY(-50%);
  color: #94a3b8;
}

.password-toggle:hover {
  color: #e2e8f0;
}

.drawer-eyebrow {
  margin: 0 0 10px;
  color: #64748b;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
}

.drawer-actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  flex-wrap: wrap;
  padding-top: 6px;
}

.server-create-drawer {
  display: flex;
  flex-direction: column;
  width: min(680px, 94vw);
  max-width: min(680px, 94vw);
  height: 100vh;
  padding: 0;
  overflow: hidden;
}

.server-create-header {
  padding: 22px 24px 18px;
  border-bottom: 1px solid rgba(148, 163, 184, 0.1);
  background: linear-gradient(180deg, rgba(23, 32, 48, 0.98), rgba(20, 26, 40, 0.94)), #141a28;
}

.server-create-head-copy {
  display: grid;
  gap: 8px;
}

.server-create-header :deep(h2),
.server-create-header :deep(p) {
  margin: 0;
}

.server-create-header :deep(h2) {
  color: #f8fafc;
  font-size: 24px;
  line-height: 1.15;
  letter-spacing: -0.03em;
}

.server-create-header :deep(p:last-child) {
  color: #8fa1bc;
  font-size: 13px;
  line-height: 1.7;
}

.server-create-scroll {
  flex: 1;
  min-height: 0;
  overflow: auto;
  display: grid;
  align-content: start;
  gap: 18px;
  padding: 18px 10px 20px;
}

.server-create-section {
  display: grid;
  gap: 14px;
  padding: 18px;
  border: 1px solid rgba(148, 163, 184, 0.1);
  border-radius: 12px;
  background: rgba(16, 23, 34, 0.32);
}

.server-create-section-head {
  display: grid;
  gap: 6px;
}

.server-create-section-head h4 {
  margin: 0;
  color: #f8fafc;
  font-size: 14px;
  line-height: 1.3;
}

.server-create-section-head p {
  margin: 0;
  color: #8fa1bc;
  font-size: 12px;
  line-height: 1.7;
}

.create-form-row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 132px;
  gap: 10px;
  align-items: end;
}

.create-form-grid {
  display: grid;
  gap: 14px;
}

.server-create-field {
  gap: 8px;
}

.server-create-field-label {
  color: #cbd5e1;
  font-size: 12px;
  font-weight: 700;
}

.server-create-field-content {
  gap: 0;
}

.server-create-field-compact {
  min-width: 0;
}

.server-create-actions {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  align-items: center;
  justify-content: stretch;
  padding: 16px 24px 18px;
  border-top: 1px solid rgba(148, 163, 184, 0.1);
  background: linear-gradient(180deg, rgba(20, 26, 40, 0.92), rgba(17, 24, 39, 0.98)), #141a28;
}

.server-create-actions :deep(button) {
  height: 36px;
  min-height: 36px;
  width: 100%;
  min-width: 0;
  padding-inline: 14px;
  justify-content: center;
}

@media (max-width: 960px) {
  .server-empty-guide,
  .server-card-list {
    grid-template-columns: 1fr;
  }

  .server-empty-hero {
    padding: 20px;
    min-height: 360px;
  }

  .server-empty-copy {
    gap: 22px;
    max-width: 100%;
  }

  .server-empty-copy h2 {
    font-size: 26px;
  }

  .server-empty-visual-image {
    right: -150px;
    width: min(600px, 78vw);
    opacity: 0.16;
  }

  .create-form-row {
    grid-template-columns: 1fr;
  }

  .server-create-actions {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 640px) {
  .server-empty-shell {
    gap: 16px;
  }

  .server-empty-hero {
    padding: 18px;
    min-height: 320px;
  }

  .server-empty-copy {
    gap: 18px;
    max-width: 100%;
  }

  .server-empty-copy h2 {
    font-size: 22px;
  }

  .server-empty-copy p,
  .server-empty-highlights {
    max-width: 100%;
  }

  .server-empty-actions :deep(.app-primary-button) {
    min-width: 240px;
  }

  .server-empty-visual-image {
    right: -160px;
    width: 500px;
    opacity: 0.12;
  }

  .server-create-header {
    padding: 20px 18px 16px;
  }

  .server-create-scroll {
    padding: 16px 18px 18px;
  }

  .server-create-actions {
    padding: 14px 18px 18px;
  }
}
</style>
