import { ref } from "vue";
import type { Toast } from "../types";

const toasts = ref<Toast[]>([]);

export function useToast() {
  const showToast = (
    message: string,
    type: "success" | "error" = "success",
  ) => {
    const id = Date.now();
    toasts.value.push({ id, message, type });
    setTimeout(() => {
      toasts.value = toasts.value.filter((t) => t.id !== id);
    }, 3000);
  };

  return {
    toasts,
    showToast,
  };
}
