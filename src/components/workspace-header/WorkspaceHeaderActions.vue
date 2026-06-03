<template>
  <div class="workspace-header-actions">
    <Button
      v-if="showDelete"
      :icon="Trash2"
      severity="danger"
      text
      rounded
      class="workspace-delete-button"
      :aria-label="deleteLabel"
      :title="deleteLabel"
      @click="$emit('delete')"
    />
    <Button
      v-if="showBack"
      :icon="ArrowLeft"
      severity="secondary"
      text
      rounded
      class="workspace-back-button"
      :aria-label="backLabel"
      :title="backLabel"
      @click="$emit('back')"
    />
  </div>
</template>

<script setup lang="ts">
import { ArrowLeft, Trash2 } from 'lucide-vue-next'

import Button from '@/components/ui/button/Button.vue'

withDefaults(defineProps<{
  backLabel?: string
  deleteLabel?: string
  showBack?: boolean
  showDelete?: boolean
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
.workspace-header-actions {
  display: flex;
  align-items: center;
  gap: 8px;
  flex: 0 0 auto;
}

.workspace-delete-button,
.workspace-back-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex: 0 0 auto;
  width: 28px;
  height: 28px;
  padding: 0;
  border: 1px solid transparent;
  border-radius: 999px;
  background: transparent;
  cursor: pointer;
  transition:
    background-color 150ms ease,
    border-color 150ms ease,
    color 150ms ease,
    transform 150ms ease;
}

.workspace-delete-button {
  color: #94a3b8;
}

.workspace-delete-button:hover {
  background: rgba(239, 68, 68, 0.1);
  border-color: rgba(239, 68, 68, 0.18);
  color: #fca5a5;
}

.workspace-back-button {
  color: #94a3b8;
}

.workspace-back-button:hover {
  background: rgba(59, 130, 246, 0.1);
  border-color: rgba(59, 130, 246, 0.18);
  color: #bfdbfe;
}

.workspace-delete-button:active,
.workspace-back-button:active {
  transform: scale(0.98);
}
</style>
