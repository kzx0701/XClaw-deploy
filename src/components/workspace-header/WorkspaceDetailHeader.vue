<template>
  <div class="workspace-detail-header">
    <div class="workspace-detail-header-copy">
      <h2>{{ title }}</h2>
    </div>

    <div class="workspace-detail-header-actions">
      <Button
        v-if="showDelete"
        variant="ghost"
        size="icon"
        class="workspace-detail-header-button workspace-detail-header-button-danger"
        :aria-label="deleteLabel"
        :title="deleteLabel"
        @click="$emit('delete')"
      >
        <Trash2 class="h-4 w-4" />
      </Button>

      <Button
        v-if="showBack"
        variant="ghost"
        size="icon"
        class="workspace-detail-header-button"
        :aria-label="backLabel"
        :title="backLabel"
        @click="$emit('back')"
      >
        <ArrowLeft class="h-4 w-4" />
      </Button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ArrowLeft, Trash2 } from 'lucide-vue-next'

import { Button } from '@/components/ui/button'

withDefaults(defineProps<{
  backLabel?: string
  deleteLabel?: string
  showBack?: boolean
  showDelete?: boolean
  title: string
}>(), {
  backLabel: '返回列表',
  deleteLabel: '删除',
  showBack: true,
  showDelete: true,
})

defineEmits<{
  back: []
  delete: []
}>()
</script>

<style scoped>
.workspace-detail-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 20px;
  width: 100%;
}

.workspace-detail-header-copy {
  min-width: 0;
}

.workspace-detail-header-copy h2 {
  margin: 0;
  color: #f8fafc;
  font-size: 22px;
  font-weight: 600;
  letter-spacing: -0.02em;
  line-height: 1.2;
}

.workspace-detail-header-actions {
  display: flex;
  align-items: center;
  gap: 8px;
  flex: 0 0 auto;
}

.workspace-detail-header-button {
  color: #94a3b8;
}

.workspace-detail-header-button:hover {
  background: rgba(59, 130, 246, 0.1);
  color: #bfdbfe;
}

.workspace-detail-header-button-danger:hover {
  background: rgba(239, 68, 68, 0.1);
  color: #fca5a5;
}
</style>
