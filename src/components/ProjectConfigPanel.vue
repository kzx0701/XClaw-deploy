<template>
  <article class="panel-card config-card">
    <header class="card-head">
      <div>
        <h3>构建配置</h3>
        <p>系统会先自动识别项目的构建方式，你只需要确认或少量修改。</p>
      </div>
      <div class="header-actions">
        <Button class="app-primary-button" :disabled="!project" @click="$emit('save-project')">
          <Save class="h-4 w-4" />
          <span>保存项目配置</span>
        </Button>
      </div>
    </header>

    <div v-if="project && modelValue" class="form-grid">
      <label class="field">
        <span>默认打包命令</span>
        <InputText
          :model-value="modelValue.defaultBuildCommand"
          class="w-full"
          @update:model-value="updateField('defaultBuildCommand', $event)"
        />
        <small>执行时默认使用这条命令，可以在“立即执行”里临时改。</small>
      </label>

      <label class="field">
        <span>默认产物目录</span>
        <InputText
          :model-value="modelValue.defaultOutputDir"
          class="w-full"
          @update:model-value="updateField('defaultOutputDir', $event)"
        />
        <small>填写构建完成后的目录名称，例如 `dist` 或 `build`。</small>
      </label>

      <div class="toggle-field">
        <label class="field">
          <span>执行前检查</span>
          <div class="switch-row">
            <Switch
              :model-value="modelValue.defaultPrecheckEnabled"
              @update:model-value="updateBoolean('defaultPrecheckEnabled', Boolean($event))"
            />
            <small>{{ modelValue.defaultPrecheckEnabled ? '已启用' : '未启用' }}</small>
          </div>
        </label>
      </div>

      <label class="field">
        <span>检查命令</span>
        <InputText
          :model-value="modelValue.defaultPrecheckCommand"
          class="w-full"
          @update:model-value="updateField('defaultPrecheckCommand', $event)"
        />
        <small>例如 `npm run lint`，留空则不执行额外检查。</small>
      </label>
    </div>

    <p v-else class="muted-paragraph">请先导入并选中项目。</p>
  </article>
</template>

<script setup lang="ts">
import { Save } from 'lucide-vue-next'

import { Button } from '@/components/ui/button'
import { Input as InputText } from '@/components/ui/input'
import Switch from '@/components/ui/switch/Switch.vue'

import type { ProjectAiRecommendation, ProjectRecord } from '@/types/task'

const props = defineProps<{
  aiRecommendation: ProjectAiRecommendation | null
  isAiAnalyzing: boolean
  modelValue: ProjectRecord | null
  project: ProjectRecord | null
}>()

const emit = defineEmits<{
  'apply-ai-recommendation': []
  'run-ai-analysis': []
  'save-project': []
  'update:modelValue': [value: ProjectRecord | null]
}>()

function updateField(field: keyof ProjectRecord, value: string | undefined) {
  if (!props.modelValue) {
    return
  }

  emit('update:modelValue', {
    ...props.modelValue,
    [field]: value ?? '',
  })
}

function updateBoolean(field: keyof ProjectRecord, value: boolean | undefined) {
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
.config-card {
  grid-column: 1 / -1;
}

.card-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 18px;
}

.header-actions {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
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

.form-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 18px 20px;
}

.field,
.toggle-field {
  display: grid;
  gap: 9px;
}

.field span {
  color: #cbd5e1;
  font-size: 13px;
  font-weight: 700;
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
  color: #64748b;
}

.muted-paragraph {
  margin: 0;
  color: #64748b;
}

@media (max-width: 960px) {
  .card-head {
    flex-direction: column;
  }

  .header-actions {
    width: 100%;
  }

  .form-grid {
    grid-template-columns: 1fr;
  }
}
</style>
