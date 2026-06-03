<template>
  <article class="resource-card" @click="$emit('select')">
    <div class="resource-card-top">
      <div class="resource-card-main">
        <span class="resource-card-icon">
          <slot name="icon" />
        </span>

        <div class="resource-card-body">
          <strong>{{ title }}</strong>
          <p :title="description">{{ description }}</p>
        </div>
      </div>

      <ChevronRight class="resource-card-enter-icon" aria-hidden="true" />
    </div>

    <div class="resource-card-foot">
      <slot name="meta" />
      <div class="resource-card-actions">
        <slot name="actions" />
      </div>
    </div>
  </article>
</template>

<script setup lang="ts">
import { ChevronRight } from 'lucide-vue-next'

defineProps<{
  description: string
  title: string
}>()

defineEmits<{
  select: []
}>()
</script>

<style scoped>
.resource-card {
  display: flex;
  flex-direction: column;
  gap: 16px;
  min-height: 132px;
  padding: 18px 18px 14px;
  border: 1px solid transparent;
  border-radius: 8px;
  background:
    linear-gradient(180deg, rgba(31, 42, 61, 0.98), rgba(24, 34, 51, 0.98)),
    #182233;
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.045),
    0 18px 34px rgba(2, 6, 23, 0.3);
  color: #e2e8f0;
  cursor: pointer;
  transition:
    border-color 160ms ease,
    box-shadow 160ms ease,
    background-color 160ms ease;
}

.resource-card:hover {
  border-color: transparent;
  background:
    linear-gradient(180deg, rgba(36, 49, 71, 0.98), rgba(27, 39, 59, 0.98)),
    #1d2a40;
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.05),
    0 20px 38px rgba(2, 6, 23, 0.34);
}

.resource-card-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
}

.resource-card-main {
  display: flex;
  align-items: center;
  gap: 12px;
  min-width: 0;
  flex: 1;
}

.resource-card-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 38px;
  height: 38px;
  border-radius: 8px;
  background: #101722;
  color: #93c5fd;
  flex: 0 0 auto;
}

.resource-card-body {
  display: grid;
  gap: 6px;
  min-width: 0;
}

.resource-card-body strong,
.resource-card-body p {
  margin: 0;
}

.resource-card-body strong {
  color: #e2e8f0;
  font-size: 13px;
  line-height: 1.2;
  letter-spacing: -0.02em;
}

.resource-card-body p {
  color: #94a3b8;
  font-size: 11px;
  line-height: 1.45;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.resource-card-enter-icon {
  color: #64748b;
  flex: 0 0 auto;
}

.resource-card-foot {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  min-height: 34px;
  padding-top: 12px;
  border-top: 1px solid rgba(148, 163, 184, 0.08);
}

.resource-card-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}
</style>
