<template>
  <article class="panel-card execution-card">
    <header class="card-head">
      <div>
        <h3>立即执行</h3>
        <p>确认当前环境和构建产物后，直接开始本次任务。</p>
      </div>
      <Button class="app-primary-button" :disabled="!canRun || status === 'running'" @click="$emit('run')">
        <Play class="h-4 w-4" />
        <span>{{ status === 'running' ? '执行中...' : '开始执行' }}</span>
      </Button>
    </header>

    <div v-if="modelValue && project" class="execution-grid">
      <Alert :variant="resolveAlertVariant('secondary')" :class="[resolveAlertToneClass('secondary'), 'full-span helper-message']">
        <AlertDescription class="helper-message-copy">
          当前会优先使用项目默认配置，你可以在这里按本次任务临时修改，不会自动覆盖项目默认值。
        </AlertDescription>
      </Alert>

      <label class="field">
        <span>本次任务</span>
        <Select :model-value="modelValue.mode" @update:model-value="updateField('mode', $event)">
          <SelectTrigger class="w-full">
            <SelectValue placeholder="请选择任务类型" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem v-for="option in modeOptions" :key="option.value" :value="option.value">
              {{ option.label }}
            </SelectItem>
          </SelectContent>
        </Select>
      </label>

      <label class="field">
        <span>部署环境</span>
        <Select :model-value="modelValue.environmentName" @update:model-value="updateField('environmentName', $event)">
          <SelectTrigger class="w-full">
            <SelectValue placeholder="请选择部署环境" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem v-for="option in props.environmentOptions" :key="option.value" :value="option.value">
              {{ option.label }}
            </SelectItem>
          </SelectContent>
        </Select>
      </label>

      <label v-if="modelValue.mode !== 'deploy'" class="field">
        <span>本次打包命令</span>
        <InputText
          :model-value="modelValue.overrideBuildCommand"
          class="w-full"
          @update:model-value="updateField('overrideBuildCommand', $event)"
        />
      </label>

      <label v-if="modelValue.mode !== 'deploy'" class="field">
        <span>本次产物目录</span>
        <InputText
          :model-value="modelValue.overrideOutputDir"
          class="w-full"
          @update:model-value="updateField('overrideOutputDir', $event)"
        />
      </label>

      <div v-if="modelValue.mode !== 'deploy'" class="toggle-field">
        <label class="field">
          <span>执行前检查</span>
          <div class="switch-row">
            <Switch :model-value="modelValue.runPrecheck" @update:model-value="updateBoolean('runPrecheck', Boolean($event))" />
            <small>{{ modelValue.runPrecheck ? '已启用' : '未启用' }}</small>
          </div>
        </label>
      </div>

      <Alert
        v-if="modelValue.mode === 'deploy'"
        :variant="resolveAlertVariant('secondary')"
        :class="[resolveAlertToneClass('secondary'), 'mode-note']"
      >
        <AlertDescription class="helper-message-copy">
          当前模式会直接使用当前环境的服务器和部署目录执行发布，不会先重新打包。
        </AlertDescription>
      </Alert>
    </div>

    <section v-if="summary.length > 0" class="summary-section">
      <header class="summary-head">
        <h4>本次任务摘要</h4>
        <small>执行前再确认一次关键参数</small>
      </header>
      <div class="summary-board">
        <div v-for="item in summary" :key="item.label" class="summary-item">
          <span>{{ item.label }}</span>
          <strong>{{ item.value }}</strong>
        </div>
      </div>
    </section>

    <Alert v-if="statusMessage" :variant="resolveAlertVariant(statusSeverity)" :class="resolveAlertToneClass(statusSeverity)">
      <AlertDescription class="helper-message-copy">
        {{ statusMessage }}
      </AlertDescription>
    </Alert>
    <p v-if="!project || !modelValue" class="muted-paragraph">请先导入并选中项目。</p>
  </article>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { Play } from 'lucide-vue-next'
import Alert from '@/components/ui/alert/Alert.vue'
import AlertDescription from '@/components/ui/alert/AlertDescription.vue'
import { Button } from '@/components/ui/button'
import { Input as InputText } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import Switch from '@/components/ui/switch/Switch.vue'

import { resolveAlertToneClass, resolveAlertVariant } from '@/lib/ui-status'
import type { ExecutionDraft, ExecutionStatus, ExecutionSummaryItem, ProjectRecord } from '@/types/task'

const props = defineProps<{
  canRun: boolean
  environmentOptions: Array<{ label: string; value: string }>
  modelValue: ExecutionDraft | null
  project: ProjectRecord | null
  status: ExecutionStatus
  statusMessage: string
  summary: ExecutionSummaryItem[]
}>()

const emit = defineEmits<{
  run: []
  'update:modelValue': [value: ExecutionDraft | null]
}>()

const modeOptions = [
  { label: '仅打包', value: 'build' },
  { label: '仅部署', value: 'deploy' },
  { label: '打包 + 部署', value: 'build-and-deploy' },
]

const statusSeverity = computed(() => {
  if (props.status === 'success') {
    return 'success'
  }

  if (props.status === 'error') {
    return 'error'
  }

  return 'secondary'
})

function updateField(field: keyof ExecutionDraft, value: string | undefined) {
  if (!props.modelValue) {
    return
  }

  emit('update:modelValue', {
    ...props.modelValue,
    [field]: value ?? '',
  })
}

function updateBoolean(field: keyof ExecutionDraft, value: boolean | undefined) {
  if (!props.modelValue) {
    return
  }

  emit('update:modelValue', {
    ...props.modelValue,
    [field]: Boolean(value),
  })
}
</script>

<style scoped>
.execution-card {
  grid-column: 1 / -1;
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

.execution-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 18px 20px;
}

.full-span {
  grid-column: 1 / -1;
}

.helper-message {
  margin: 0;
  padding: 14px 16px;
}

.helper-message-copy {
  display: block;
  color: #b8c4d8;
  line-height: 1.7;
  white-space: normal;
  word-break: break-word;
}

.field,
.toggle-field {
  display: grid;
  gap: 9px;
}

.field span {
  color: #e2e8f0;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.03em;
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

.mode-note {
  grid-column: 1 / -1;
}

.summary-section {
  display: grid;
  gap: 12px;
}

.summary-head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 12px;
}

.summary-head h4,
.summary-head small {
  margin: 0;
}

.summary-head h4 {
  color: #f8fafc;
  font-size: 14px;
  line-height: 1.3;
}

.summary-head small {
  color: #8b9bb3;
  font-size: 12px;
}

.summary-board {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 14px;
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
  color: #8fa1bc;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

.summary-item strong {
  color: #f8fafc;
  font-size: 14px;
  line-height: 1.5;
  word-break: break-word;
}

.muted-paragraph {
  margin: 0;
  color: #8b9bb3;
}

@media (max-width: 960px) {
  .card-head {
    flex-direction: column;
  }

  .summary-head {
    flex-direction: column;
    align-items: flex-start;
  }

  .execution-grid,
  .summary-board {
    grid-template-columns: 1fr;
  }
}
</style>
