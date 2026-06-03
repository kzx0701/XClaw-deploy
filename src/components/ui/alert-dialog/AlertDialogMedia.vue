<script setup lang="ts">
import type { HTMLAttributes } from "vue"
import { cn } from "@/lib/utils"

const props = defineProps<{
  class?: HTMLAttributes["class"]
}>()
</script>

<template>
  <div
    data-slot="alert-dialog-media"
    :class="cn(
      'mx-auto flex size-9 items-center justify-center rounded-lg',
      props.class,
    )"
  >
    <slot />
  </div>
</template>
