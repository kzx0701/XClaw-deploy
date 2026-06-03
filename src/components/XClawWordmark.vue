<template>
  <button
    type="button"
    class="xclaw-wordmark"
    :style="wordmarkStyle"
    :data-text="text"
    :aria-label="text"
  >
    <span class="xclaw-wordmark-actual">&nbsp;{{ text }}&nbsp;</span>
    <span aria-hidden="true" class="xclaw-wordmark-hover">&nbsp;{{ text }}&nbsp;</span>
  </button>
</template>

<script setup lang="ts">
import { computed } from 'vue'

const props = withDefaults(defineProps<{
  accentColor?: string
  fontSize?: string
  text?: string
}>(), {
  accentColor: '#60a5fa',
  fontSize: '1.18rem',
  text: 'XCLAW',
})

const wordmarkStyle = computed(() => ({
  '--animation-color': props.accentColor,
  '--fs-size': props.fontSize,
}))
</script>

<style scoped>
.xclaw-wordmark {
  --border-right: 3px;
  margin: 0;
  padding: 0;
  height: auto;
  border: none;
  background: transparent;
  cursor: default;
  letter-spacing: 0.26em;
  text-decoration: none;
  font-size: var(--fs-size);
  font-family: var(--font-sans);
  font-weight: 700;
  line-height: 1;
  position: relative;
  text-transform: uppercase;
  color: rgba(241, 245, 249, 0.9);
  text-shadow: 0 0 12px rgba(148, 163, 184, 0.08);
}

.xclaw-wordmark-actual,
.xclaw-wordmark-hover {
  display: block;
}

.xclaw-wordmark-hover {
  position: absolute;
  inset: 0;
  box-sizing: border-box;
  width: 0%;
  color: var(--animation-color);
  border-right: var(--border-right) solid var(--animation-color);
  overflow: hidden;
  transition: width 0.45s ease, filter 0.45s ease;
  white-space: nowrap;
  -webkit-text-stroke: 1px var(--animation-color);
}

.xclaw-wordmark:hover .xclaw-wordmark-hover {
  width: 100%;
  filter: drop-shadow(0 0 18px color-mix(in srgb, var(--animation-color) 68%, transparent));
}
</style>
