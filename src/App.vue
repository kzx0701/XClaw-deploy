<template>
  <RouterView />
  <AppUpdater />
  <ConfirmDialogHost />
  <ToastViewport />
</template>

<script setup lang="ts">
import { RouterView } from 'vue-router'

import AppUpdater from '@/components/AppUpdater.vue'
import ConfirmDialogHost from '@/components/ui/confirm/ConfirmDialogHost.vue'
import ToastViewport from '@/components/ui/toast/ToastViewport.vue'
</script>
