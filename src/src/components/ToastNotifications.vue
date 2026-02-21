<script setup lang="ts">
import { useToast } from "../composables";

const { toasts } = useToast();
</script>

<template>
  <div class="fixed bottom-4 left-1/2 -translate-x-1/2 flex flex-col items-center space-y-2">
    <div
      v-for="toast in toasts"
      :key="toast.id"
      :class="[
        'px-4 py-2 rounded-md shadow-material text-white whitespace-nowrap',
        toast.type === 'success' ? 'bg-green-600' : 'bg-red-600',
      ]"
    >
      {{ toast.message }}
    </div>
  </div>
</template>
