<template>
  <article ref="overviewCardRef" class="panel-card overview-card">
    <header class="card-head">
      <div>
        <h3>项目概览</h3>
        <p>展示导入识别结果，便于核对当前项目上下文。</p>
      </div>
    </header>

    <div v-if="project" class="overview-grid">
      <div class="overview-item">
        <span>项目名称</span>
        <strong>{{ project.name }}</strong>
      </div>
      <div class="overview-item">
        <span>项目类型</span>
        <strong>{{ project.projectType }}</strong>
      </div>
      <div class="overview-item">
        <span>包管理器</span>
        <strong>{{ project.packageManager }}</strong>
      </div>
      <div class="overview-item">
        <span>自动识别命令</span>
        <strong>{{ project.detectedBuildCommand || project.defaultBuildCommand || '未识别' }}</strong>
      </div>
      <div class="overview-item">
        <span>自动识别目录</span>
        <strong>{{ project.detectedOutputDir || project.defaultOutputDir }}</strong>
      </div>
      <div class="overview-item">
        <span>当前使用命令</span>
        <strong>{{ project.defaultBuildCommand || '未配置' }}</strong>
      </div>
      <div class="overview-item">
        <span>当前使用目录</span>
        <strong>{{ project.defaultOutputDir || '未配置' }}</strong>
      </div>
      <div class="overview-item wide path-item">
        <span>本地路径</span>
        <strong>{{ project.localPath }}</strong>
      </div>
    </div>

    <p v-else class="muted-paragraph">导入项目后，这里会展示识别出的项目基础信息。</p>
  </article>
</template>

<script setup lang="ts">
import { useTemplateRef } from 'vue'

import type { ProjectRecord } from '@/types/task'

defineProps<{
  project: ProjectRecord | null
}>()

const overviewCardRef = useTemplateRef<HTMLElement>('overviewCardRef')

defineExpose({
  overviewCardRef,
})
</script>

<style scoped>
.overview-card {
  grid-column: 1 / -1;
  min-height: 372px;
  height: auto;
}

.card-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
}

.card-head h3 {
  margin: 0;
  color: #f8fafc;
  font-size: 17px;
  line-height: 1.25;
}

.card-head p {
  margin: 8px 0 0;
  color: #8b9bb3;
  font-size: 12px;
  line-height: 1.6;
}

.overview-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16px 18px;
}

.overview-item {
  display: grid;
  gap: 8px;
  min-width: 0;
}

.overview-item span {
  color: #8fa1bc;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

.overview-item strong {
  display: block;
  min-width: 0;
  color: #f8fafc;
  font-size: 14px;
  line-height: 1.55;
  overflow-wrap: anywhere;
  word-break: break-word;
}

.wide {
  grid-column: 1 / -1;
}

.path-item {
  min-width: 0;
  overflow: hidden;
}

.path-item strong {
  max-width: 100%;
  white-space: normal;
  word-break: break-all;
  overflow-wrap: anywhere;
}

.muted-paragraph {
  margin: 0;
  color: #8b9bb3;
}

@media (max-width: 960px) {
  .card-head {
    flex-direction: column;
  }

  .overview-grid {
    grid-template-columns: 1fr;
  }

  .wide {
    grid-column: auto;
  }
}
</style>
