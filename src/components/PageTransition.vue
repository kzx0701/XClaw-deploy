<template>
  <Transition name="page-panel" mode="out-in" appear>
    <div :key="transitionKey" class="page-transition-panel">
      <slot />
    </div>
  </Transition>
</template>

<script setup lang="ts">
defineProps<{
  transitionKey: string
}>()
</script>

<style>
.page-transition-panel {
  width: 100%;
  min-width: 0;
}

.page-panel-enter-active,
.page-panel-leave-active {
  transition:
    opacity 190ms ease,
    transform 190ms ease,
    filter 190ms ease;
}

.page-panel-enter-from {
  opacity: 0;
  transform: translateY(8px);
  filter: blur(1px);
}

.page-panel-leave-to {
  opacity: 0;
  transform: translateY(-4px);
  filter: blur(1px);
}

@media (prefers-reduced-motion: reduce) {
  .page-panel-enter-active,
  .page-panel-leave-active {
    transition: none;
  }

  .page-panel-enter-from,
  .page-panel-leave-to {
    opacity: 1;
    transform: none;
    filter: none;
  }
}
</style>
