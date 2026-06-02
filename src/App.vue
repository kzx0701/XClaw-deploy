<template>
  <RouterView />
  <ConfirmDialogHost />
  <ToastViewport />
</template>

<script setup lang="ts">
import { RouterView } from 'vue-router'

import ConfirmDialogHost from '@/components/ui/confirm/ConfirmDialogHost.vue'
import ToastViewport from '@/components/ui/toast/ToastViewport.vue'
</script>
