<template>
  <div class="status-pill" :data-status="status">
    <span class="status-pill-dot" aria-hidden="true" />
    <span class="status-pill-text">{{ label }}</span>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  label: string;
  status: "disconnected" | "connecting" | "connected";
}>();
</script>

<style scoped>
.status-pill {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
}

.status-pill-dot {
  width: 8px;
  height: 8px;
  border-radius: 999px;
  background: rgba(148, 163, 184, 0.55);
  box-shadow: 0 0 0 4px rgba(148, 163, 184, 0.08);
  flex: 0 0 auto;
}

.status-pill-text {
  color: #cbd5e1;
  font-size: 11px;
  font-weight: 600;
  line-height: 1;
  white-space: nowrap;
}

.status-pill[data-status="connected"] .status-pill-dot {
  background: #10b981;
  box-shadow: 0 0 0 4px rgba(16, 185, 129, 0.12);
}

.status-pill[data-status="connecting"] .status-pill-dot {
  background: #f97316;
  box-shadow: 0 0 0 4px rgba(249, 115, 22, 0.12);
}

.status-pill[data-status="disconnected"] .status-pill-dot {
  background: #64748b;
  box-shadow: 0 0 0 4px rgba(100, 116, 139, 0.12);
}

.status-pill[data-status="disconnected"] .status-pill-text {
  color: #94a3b8;
}
</style>
